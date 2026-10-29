import { describe, it, expect } from 'vitest';
import { createStore } from '../../src/core/store.js';
import { createSimulator } from '../../src/core/simulator.js';
import machine from '../../src/data/seed/machine.json';

function setup() {
  const store = createStore({ params: { 117: 100, 118: 119, 122: 30, 124: 36, 125: 500, 613: 0, 709: 0, 710: 0, 714: 0 } });
  let clock = 1_000_000;
  const sim = createSimulator(store, { machine, now: () => clock });
  sim.skipBoot();
  return { store, sim, advance: (ms) => (clock += ms) };
}

describe('simulator', () => {
  it('starts online; Run → run; Pause → pause; Offline/Online', () => {
    const { sim } = setup();
    expect(sim.state).toBe('online');
    expect(sim.command('Run')).toBe(true);
    expect(sim.state).toBe('run');
    sim.command('Pause');
    expect(sim.state).toBe('pause');
    sim.command('Offline');
    expect(sim.state).toBe('offline');
    sim.command('Online');
    expect(sim.state).toBe('online');
  });

  it('errors put the machine in alarm; Run is refused until reset', () => {
    const { sim, store } = setup();
    sim.command('Run');
    sim.injectError('E-114');
    expect(sim.state).toBe('alarm');
    expect(store.get('machine').errors).toHaveLength(1);
    expect(sim.command('Run')).toBe(false);
    expect(sim.resetAlarm()).toBe(true);
    expect(sim.state).toBe('online');
    expect(sim.command('Run')).toBe(true);
  });

  it('warnings are acknowledged separately and do not block Run', () => {
    const { sim } = setup();
    sim.injectError('W-012');
    expect(sim.state).toBe('warning');
    expect(sim.command('Run')).toBe(true);
    sim.acknowledgeWarnings();
  });

  it('counters and encoder tick only while running', () => {
    const { sim, store } = setup();
    for (let i = 0; i < 5; i++) sim.tick();
    expect(store.getParam(709)).toBe(0);
    expect(store.get('machine').encoder.mmin).toBe(0);
    sim.command('Run');
    for (let i = 0; i < 5; i++) sim.tick();
    expect(store.getParam(709)).toBeGreaterThan(0);
    expect(store.get('machine').encoder.mmin).toBeGreaterThan(25);
    expect(store.get('machine').encoder.hz).toBeGreaterThan(0);
    expect(store.getParam(714)).toBeGreaterThan(0); // operational time runs always
  });

  it('forced outputs reset after 60 s and resetForced clears all', () => {
    const { sim, store, advance } = setup();
    expect(sim.forceOutput('X2.1', true)).toBe(true);
    expect(sim.forceOutput('X1.1', true)).toBe(false); // input cannot be forced
    sim.tick();
    expect(store.get('machine').io['X2.1'].forced).toBe(true);
    advance(61_000);
    sim.tick();
    expect(store.get('machine').io['X2.1'].forced).toBeNull();
    sim.forceOutput('X2.2', false);
    sim.resetForced();
    expect(store.get('machine').io['X2.2'].forced).toBeNull();
  });

  it('stand-by after the configured idle time', () => {
    const { sim, store, advance } = setup();
    store.setParam(613, 1);
    sim.tick();
    expect(store.get('machine').standby).toBe(false);
    advance(61_000);
    sim.tick();
    expect(store.get('machine').standby).toBe(true);
    sim.touch();
    expect(store.get('machine').standby).toBe(false);
  });

  it('speed test stores a product rate', () => {
    const { sim, store } = setup();
    sim.startSpeedTest();
    sim.tick();
    sim.stopSpeedTest();
    const r = store.get('machine').speedTest.result;
    expect(r.ratePerMin).toBeGreaterThan(0);
    expect(store.getParam(728)).toBe(r.ratePerMin);
  });

  it('boot resolves and reports a failed start', async () => {
    const store = createStore({ params: {} });
    const sim = createSimulator(store, { machine });
    await expect(sim.boot({ durationMs: 150 })).resolves.toBe(true);
    expect(store.get('machine').booted).toBe(true);
    const sim2 = createSimulator(createStore({ params: {} }), { machine });
    await expect(sim2.boot({ durationMs: 150, fail: true })).resolves.toBe(false);
  });
});
