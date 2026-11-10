/**
 * Dummy firmware (plan P1-07). Drives store.machine once per second (docx §8: continuously
 * updated values have a defined refresh rate) and answers the runtime commands 1–7.
 *
 * Machine states (runtime params 8–13):  offline · online · pause · run · alarm · warning
 * Commands (runtime params 1–7):          Alarm_Reset, Start_Trigger, Offline, Online, Pause, Run, Manual_Feed_Trigger
 *
 * Counters tick on the Information/Counters params while running; the encoder value (730)
 * follows SpeedSelection (118); IO inputs toggle to look alive; errors and warnings can be
 * injected from the dev panel. Nothing here touches the DOM.
 */
export const STATES = ['offline', 'online', 'pause', 'run', 'alarm', 'warning'];

/** Dummy error catalogue (Error History seed and injection). */
/**
 * Dummy error catalogue (the real texts come from the firmware). `help` is the "what to do" text
 * shown when a row in the Error History is opened (P3-09).
 */
export const ERROR_CATALOGUE = {
  'E-114': {
    severity: 'high',
    text: 'Label roll empty',
    textDe: 'Etikettenrolle leer',
    help: 'The label roll is used up. Insert a new roll, thread the web along the path label on the machine and press Reset alarm.',
    helpDe: 'Die Etikettenrolle ist aufgebraucht. Neue Rolle einlegen, die Bahn entlang des Bahnverlaufs-Etiketts einfädeln und Alarm zurücksetzen drücken.',
  },
  'E-207': {
    severity: 'high',
    text: 'Missing label at dispensing edge',
    textDe: 'Fehlendes Etikett an der Spendekante',
    help: 'The label sensor did not see a label when one was expected. Check the label roll and the gap on the web, clean the label sensor and teach it again if the error repeats.',
    helpDe: 'Der Etikettensensor hat kein Etikett erkannt, obwohl eines erwartet wurde. Etikettenrolle und Lücke auf der Bahn prüfen, Etikettensensor reinigen und bei Wiederholung neu einlernen.',
  },
  'E-031': {
    severity: 'mid',
    text: 'Printer busy timeout',
    textDe: 'Drucker-Busy-Zeitüberschreitung',
    help: 'The printer did not release its busy signal in time. Check the printer for errors and the cable on the MIO card (X1.4).',
    helpDe: 'Der Drucker hat sein Busy-Signal nicht rechtzeitig freigegeben. Drucker auf Fehler und das Kabel an der MIO-Karte (X1.4) prüfen.',
  },
  'E-402': {
    severity: 'high',
    text: 'Applicator touch-down timeout',
    textDe: 'Applikator Touch-down Zeitüberschreitung',
    help: 'The applicator did not reach the product in time. Check the air pressure, the cylinder and the touch-down sensor (X1.5); run the applicator test at level 3.',
    helpDe: 'Der Applikator hat das Produkt nicht rechtzeitig erreicht. Luftdruck, Zylinder und Touch-down-Sensor (X1.5) prüfen; Applikatortest auf Ebene 3 ausführen.',
  },
  'E-055': {
    severity: 'low',
    text: 'Encoder signal lost',
    textDe: 'Encodersignal verloren',
    help: 'No pulses from the external encoder. Check the encoder cable and run the speed test.',
    helpDe: 'Keine Impulse vom externen Encoder. Encoder-Kabel prüfen und den Geschwindigkeitstest ausführen.',
  },
  'W-012': {
    severity: 'low',
    text: 'Roll end warning diameter reached',
    textDe: 'Warn-Durchmesser Rollenende erreicht',
    help: 'The roll is close to its end. Have a new roll ready; production continues until the roll is empty.',
    helpDe: 'Die Rolle ist fast aufgebraucht. Neue Rolle bereithalten; die Produktion läuft weiter, bis die Rolle leer ist.',
  },
  'W-020': {
    severity: 'low',
    text: 'Service interval due',
    textDe: 'Serviceintervall fällig',
    help: 'The service interval has been reached. Plan the service and record it under Service › Reporting.',
    helpDe: 'Das Serviceintervall ist erreicht. Service planen und unter Service › Reporting eintragen.',
  },
};

const COUNTER_IDS = {
  totalLabels: 709,
  totalDistance: 718,
  distanceSinceService: 719,
  timeSinceService: 720,
  labelsSinceService: 721,
  labelsDispensed: 710,
  opTime: 714,
  timeRun: 715,
  timeAlarm: 716,
  timeWarning: 717,
  goodCam: 711,
  rejectCam: 712,
  rejectCode: 713,
  missing: 708,
};

/** A forced output goes back to normal after this long (docx §8.5 "reset after a timeout"). */
export const FORCE_TIMEOUT_MS = 60_000;

export function createSimulator(store, { machine, now = () => Date.now(), interval = 1000 } = {}) {
  let timer = null;
  let tick = 0;
  let testCycles = 0; // fractional test-mode cycles (727 counts whole ones)
  let listeners = new Set();

  const initial = {
    state: 'online',
    prevState: null,
    booted: false,
    bootProgress: 0,
    bootStartedAt: null,
    errors: [], // active errors [{code, severity, at}]
    warnings: [], // active warnings
    encoder: { mmin: 0, hz: 0, signal: true },
    io: Object.fromEntries(
      (machine?.io?.groups ?? []).flatMap((g) =>
        g.pins.map((p) => [p.pin, { ...p, group: g.id, state: false, forced: null }]),
      ),
    ),
    speedTest: { running: false, result: null },
    applicator: { cylinder: false, supportAir: false, vacuum: false, blow: false, step: 0 },
    standby: false,
    usb: true, // a USB drive is plugged in (P3-11); the dev panel pulls it
    lastActivityAt: now(),
    options: machine?.options ?? {},
    identity: {
      type: machine?.type,
      serial: machine?.serial,
      firmware: machine?.firmware,
      firmwareDate: machine?.firmwareDate,
    },
  };
  if (!store.get('machine')) store.replace('machine', initial);

  const m = () => store.get('machine');
  const setM = (patch) => store.set('machine', patch);
  const emit = (evt, data) => listeners.forEach((fn) => fn(evt, data, m()));

  function transition(next, reason) {
    const cur = m();
    if (cur.state === next) return;
    setM({ state: next, prevState: cur.state });
    emit('state', { from: cur.state, to: next, reason });
  }

  const sim = {
    get state() {
      return m().state;
    },
    on(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    start() {
      if (timer) return sim;
      timer = setInterval(sim.tick, interval);
      return sim;
    },
    stop() {
      clearInterval(timer);
      timer = null;
    },

    /** Runtime command by name (matches params 1–7). */
    command(name) {
      const cur = m();
      switch (name) {
        case 'Run':
          if (cur.errors.length) return false;
          transition('run', 'cmd');
          return true;
        case 'Pause':
          if (cur.state === 'run') transition('pause', 'cmd');
          return true;
        case 'Online':
          if (cur.state === 'offline') transition('online', 'cmd');
          return true;
        case 'Offline':
          transition('offline', 'cmd');
          return true;
        case 'Alarm_Reset':
          return sim.resetAlarm();
        case 'Start_Trigger':
          if (cur.state === 'run') sim._dispense();
          return cur.state === 'run';
        case 'Manual_Feed_Trigger':
          sim._dispense();
          return true;
        default:
          return false;
      }
    },

    /** Toggle run/pause from the home button. */
    toggleRun() {
      return m().state === 'run' ? sim.command('Pause') : sim.command('Run');
    },

    injectError(code = 'E-114') {
      const cat = ERROR_CATALOGUE[code] ?? { severity: 'mid', text: code };
      const entry = { code, severity: cat.severity, text: cat.text, at: now() };
      const cur = m();
      const isWarning = code.startsWith('W-');
      if (isWarning) {
        setM({ warnings: [...cur.warnings, entry] });
        if (cur.state !== 'alarm') transition('warning', 'inject');
      } else {
        setM({ errors: [...cur.errors, entry] });
        transition('alarm', 'inject');
      }
      emit('error', entry);
      return entry;
    },
    acknowledgeWarnings() {
      const cur = m();
      if (!cur.warnings.length) return false;
      setM({ warnings: [] });
      if (cur.state === 'warning') transition(cur.errors.length ? 'alarm' : 'online', 'ack');
      return true;
    },
    resetAlarm() {
      const cur = m();
      if (!cur.errors.length && !cur.warnings.length) return false;
      setM({ errors: [], warnings: [] });
      transition('online', 'reset');
      emit('alarmReset');
      return true;
    },

    // ---- boot --------------------------------------------------------------
    boot({ durationMs, fail = false, hang = false } = {}) {
      // progress runs against the average of previous boot durations (docx §8.17), never in steps
      const prev = machine?.boot?.previousDurationsMs ?? [];
      const expected =
        durationMs ??
        (prev.length
          ? Math.round(prev.reduce((a, b) => a + b, 0) / prev.length)
          : (machine?.boot?.simulatedDurationMs ?? 6500));
      setM({
        booted: false,
        bootProgress: 0,
        bootStartedAt: now(),
        bootFail: fail,
        bootHang: hang,
        bootDurationMs: expected,
      });
      return new Promise((resolve) => {
        const step = () => {
          const cur = m();
          const elapsed = now() - cur.bootStartedAt;
          const expected = cur.bootDurationMs;
          let p = Math.min(elapsed / expected, cur.bootHang ? 0.99 : 1);
          if (cur.bootFail && p > 0.6) {
            setM({ bootProgress: 0.6, bootError: 'E-900 Firmware image signature invalid' });
            emit('bootFailed');
            return resolve(false);
          }
          setM({ bootProgress: p, bootLong: elapsed > expected * 1.2 });
          if (p >= 1) {
            setM({ booted: true, bootProgress: 1 });
            emit('booted');
            resolve(true);
          } else setTimeout(step, 100);
        };
        step();
      });
    },
    skipBoot() {
      setM({ booted: true, bootProgress: 1 });
    },

    // ---- live values -------------------------------------------------------
    touch() {
      const cur = m();
      if (cur.standby) setM({ standby: false, lastActivityAt: now() });
      else setM({ lastActivityAt: now() });
    },
    enterStandby() {
      setM({ standby: true });
    },
    forceOutput(pin, value) {
      const cur = m();
      const io = cur.io[pin];
      if (!io || io.dir !== 'out') return false;
      setM({ io: { ...cur.io, [pin]: { ...io, forced: value, forcedAt: now() } } });
      return true;
    },
    resetForced() {
      const cur = m();
      const io = Object.fromEntries(
        Object.entries(cur.io).map(([k, v]) => [k, { ...v, forced: null }]),
      );
      setM({ io });
    },
    /**
     * Applicator test buttons (P3-07): 803–806 switch an actuator on or off; 807 runs a full test cycle
     * and writes its four times (722–725, ms); 808 runs the next step of the cycle and writes that
     * step's time. Returns { ok, on? , step? }.
     */
    applicator(pid) {
      const cur = m();
      const a = { ...cur.applicator };
      const key = { 803: 'cylinder', 804: 'supportAir', 805: 'vacuum', 806: 'blow' }[pid];
      if (key) {
        a[key] = !a[key];
        setM({ applicator: a });
        return { ok: true, on: a[key] };
      }
      const speed = Math.max(1, Number(store.getParam(122) ?? 30)); // m/min
      const label = Number(store.getParam(117) ?? 100); // mm
      const jitter = (ms) => Math.round(ms * (0.95 + Math.random() * 0.1));
      const times = {
        722: jitter((label / ((speed * 1000) / 60)) * 1000), // dispensing
        723: jitter(180), // applicator apply
        724: jitter(60), // start to apply
      };
      times[725] = times[722] + times[723] + times[724] + jitter(40); // full cycle
      if (pid === 807) {
        store.setParams(times);
        setM({ applicator: { ...a, step: 0 } });
        return { ok: true };
      }
      if (pid === 808) {
        const ids = [722, 723, 724, 725];
        const id = ids[a.step % ids.length];
        store.setParam(id, times[id]);
        setM({ applicator: { ...a, step: (a.step + 1) % ids.length } });
        return { ok: true, step: (a.step % ids.length) + 1 };
      }
      return { ok: false };
    },
    /** Encoder cable in or out (P3-05 "no encoder signal" state). */
    setEncoderSignal(on) {
      const cur = m();
      setM({ encoder: { ...cur.encoder, signal: !!on, ...(on ? {} : { mmin: 0, hz: 0 }) } });
    },
    /** USB drive plugged in or pulled (P3-11). */
    setUsb(on) {
      setM({ usb: !!on });
    },
    /** Stop a running speed test without a result (leaving the screen, docx §8.4). */
    abortSpeedTest() {
      const cur = m();
      if (cur.speedTest.running) setM({ speedTest: { ...cur.speedTest, running: false } });
    },
    startSpeedTest() {
      setM({ speedTest: { running: true, result: null, startedAt: now() } });
    },
    stopSpeedTest() {
      const cur = m();
      if (!cur.speedTest.running) return;
      const mmin = cur.encoder.mmin;
      const labelLen = Number(store.getParam(117) ?? 100);
      const nextLabelMs = mmin > 0 ? (labelLen / ((mmin * 1000) / 60)) * 1000 : null;
      const rate = mmin > 0 ? Math.round(((mmin * 1000) / 60 / labelLen) * 60) : null;
      setM({ speedTest: { running: false, result: { nextLabelMs, ratePerMin: rate, at: now() } } });
      if (rate != null) store.setParam(728, rate);
    },

    _dispense() {
      const inc = (id, by = 1) => store.setParam(id, Number(store.getParam(id) ?? 0) + by);
      const labelLen = Number(store.getParam(117) ?? 100);
      inc(COUNTER_IDS.totalLabels);
      inc(COUNTER_IDS.labelsDispensed);
      inc(COUNTER_IDS.labelsSinceService);
      inc(COUNTER_IDS.totalDistance, labelLen / 1000);
      inc(COUNTER_IDS.distanceSinceService, labelLen / 1000);
      if (store.getParam(177)) {
        if (Math.random() < 0.03) inc(COUNTER_IDS.rejectCam);
        else inc(COUNTER_IDS.goodCam);
      }
      if (store.getParam(187) && Math.random() < 0.02) inc(COUNTER_IDS.rejectCode);
      if (Math.random() < 0.01) inc(COUNTER_IDS.missing);
    },

    /** One second of machine life. Exposed for tests. */
    tick() {
      tick++;
      const cur = m();
      if (!cur.booted) return;
      const inc = (id, by = 1) => store.setParam(id, Number(store.getParam(id) ?? 0) + by);

      // time counters (minutes stored as fractional minutes)
      inc(COUNTER_IDS.opTime, 1 / 60);
      inc(COUNTER_IDS.timeSinceService, 1 / 60);
      if (cur.state === 'run') inc(COUNTER_IDS.timeRun, 1 / 60);
      if (cur.state === 'alarm') inc(COUNTER_IDS.timeAlarm, 1 / 60);
      if (cur.state === 'warning') inc(COUNTER_IDS.timeWarning, 1 / 60);

      // encoder: fixed speed or tracked external encoder with jitter
      const sel = Number(store.getParam(118));
      const base = sel === 119 ? Number(store.getParam(122) ?? 30) : 24 + Math.sin(tick / 7) * 3;
      const running = cur.state === 'run';
      const signal = cur.encoder.signal !== false; // cable out: nothing measured in any speed mode
      const mmin =
        signal && (running || cur.speedTest.running)
          ? Math.max(0, base + (Math.random() - 0.5) * 0.4)
          : 0;
      const ppr = Number(store.getParam(125) ?? 500);
      const dia = Number(store.getParam(124) ?? 36);
      const hz = mmin > 0 ? Math.round(((mmin * 1000) / 60 / (Math.PI * dia)) * ppr) : 0;
      store.setParam(730, Number(mmin.toFixed(2)));

      // dispensing while running: one label per cycle depending on speed and label length
      if (running) {
        const labelLen = Number(store.getParam(117) ?? 100);
        const perSec = (mmin * 1000) / 60 / Math.max(labelLen, 5);
        const n = Math.floor(perSec) + (Math.random() < perSec % 1 ? 1 : 0);
        for (let i = 0; i < n; i++) sim._dispense();
        // roll diameter shrinks slowly
        const d = Number(store.getParam(141) ?? 300);
        if (d > 80) store.setParam(141, Number((d - 0.05).toFixed(2)));
      }

      // IO inputs flicker to look alive; outputs follow state unless forced
      const io = { ...cur.io };
      for (const [pin, p] of Object.entries(io)) {
        let state = p.state;
        if (p.dir === 'in')
          state = running ? Math.random() < 0.5 : pin.endsWith('.2') ? true : false;
        else {
          const fnl = p.fn.toLowerCase();
          const ap = cur.applicator;
          state = fnl.includes('ready')
            ? cur.state === 'online' || running
            : fnl.includes('alarm')
              ? cur.state === 'alarm'
              : fnl.includes('warning')
                ? cur.state === 'warning'
                : fnl.includes('apply')
                  ? ap.cylinder || (running && Math.random() < 0.5)
                  : fnl.includes('vacuum')
                    ? ap.vacuum
                    : fnl.includes('blow')
                      ? ap.blow
                      : running && Math.random() < 0.5;
        }
        // forced outputs reset after 60 s
        const forced =
          p.forced != null && now() - (p.forcedAt ?? 0) > FORCE_TIMEOUT_MS ? null : p.forced;
        io[pin] = { ...p, state, forced };
      }

      // stand-by after HMI_Standby_Timer minutes of inactivity (0 = never)
      // test mode (296): duration in seconds (726) and whole cycles (727) from on + off time (298/299)
      if (store.getParam(296)) {
        inc(726, 1);
        const period = Number(store.getParam(298) ?? 100) + Number(store.getParam(299) ?? 500);
        testCycles += period > 0 ? 1000 / period : 0;
        const whole = Math.floor(testCycles);
        if (whole) {
          inc(727, whole);
          testCycles -= whole;
        }
      }

      const standbyMin = Number(store.getParam(613) ?? 0);
      const idle = now() - cur.lastActivityAt;
      const standby = cur.standby || (standbyMin > 0 && idle > standbyMin * 60_000);

      setM({
        encoder: { mmin: Number(mmin.toFixed(1)), hz, signal },
        io,
        standby,
        uptimeS: (cur.uptimeS ?? 0) + 1,
      });
      emit('tick', tick);
    },
  };
  return sim;
}

export { COUNTER_IDS };
