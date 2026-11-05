/**
 * Login (plan P1-13, docx §4.1 "reached by user profile"): pick a profile, then enter the
 * password on the keyboard that unfolds below the field. Disabled accounts are listed greyed
 * (users are disabled, never deleted — docx §8.14). After login, back to where the user came from.
 */
import { icon } from '../components/Icon.js';
import { renderNumpad, mountNumpad, mountKeyboard } from '../components/Keyboard.js';
import { fmtDate } from '../format.js';
import { esc, onAction, cx } from '../html.js';

/** Profile row on the login screen (Figma ProfileRow · Level × Enabled). */
export function renderProfileRow(ctx, u) {
  return `
            <button type="button" class="${cx('card-border text-left pressable', !u.enabled && 'opacity-40')}" data-action="pick" data-id="${esc(u.id)}" ${!u.enabled ? 'aria-disabled="true"' : ''} data-cmp="ProfileRow" data-cmp-props="Level=${u.level},Enabled=${u.enabled ? 'yes' : 'no'}">
              <div class="flex items-center gap-4 px-4 min-h-[72px]">
                <span class="grid place-items-center size-12 rounded-pill bg-level-${u.level} text-black font-bold">${esc(`L${u.level}`)}</span>
                <span class="flex-1 min-w-0">
                  <span class="block text-body-lg font-semibold truncate">${esc(u.name)}</span>
                  <span class="block text-label text-muted truncate">${esc(ctx.t(`level.${u.level}`))} · ${esc(ctx.t('login.lastChange', { date: fmtDate(u.lastPasswordChange) }))}</span>
                </span>
                ${icon('chevron', { size: 24, class: 'text-faint' })}
              </div>
            </button>`;
}

export function render(ctx) {
  const users = ctx.store.get('users');
  showProfiles();

  function showProfiles() {
    ctx.shell.setScreen({
      title: ctx.t('login.title'),
      html: `
        <div class="flex-1 scroll-y p-4 flex flex-col gap-3" data-profiles>
          <div class="t-caption text-muted">${esc(ctx.t('login.choose'))}</div>
          ${users.map((u) => renderProfileRow(ctx, u)).join('')}
        </div>`,
      mount(el) {
        return onAction(el, {
          pick: (btn) => {
            const u = users.find((x) => x.id === btn.dataset.id);
            if (!u?.enabled) return ctx.toast.reject(ctx.t('login.disabled'));
            showPassword(u);
          },
        });
      },
    });
  }

  function showPassword(user) {
    let password = '';
    let show = false;
    let mode = 'num'; // 'num' | 'abc'
    const masked = () => (show ? password : '•'.repeat(password.length)) || ' ';

    ctx.shell.setScreen({
      title: ctx.t('login.title'),
      subtitle: `${user.name} · L${user.level} ${ctx.t(`level.${user.level}`)}`,
      html: `
        <div class="flex-1 min-h-0 flex flex-col" data-password data-user="${esc(user.id)}">
          <div class="px-3 pt-3">
            <div class="card-border card-border--strong">
              <div class="flex items-center gap-1 pl-4 pr-1 h-touch">
                <span class="flex-1 t-param text-title tracking-[0.3em] truncate" data-field aria-label="${esc(ctx.t('login.password'))}">${esc(masked())}</span>
                <button type="button" class="pressable size-touch-row grid place-items-center rounded-md text-chrome" data-action="toggleShow" aria-label="${esc(ctx.t('login.show'))}" data-show>${icon('lock', { size: 26 })}</button>
                <button type="button" class="pressable h-touch-row min-w-touch-row px-3 rounded-md bg-surface-2 text-label font-semibold" data-action="mode" data-mode>ABC</button>
              </div>
            </div>
            <div class="text-label text-status-error-ink font-semibold h-5 mt-1 px-1" data-error aria-live="polite"></div>
          </div>
          <div class="px-3 pb-8 mt-auto" data-keys></div>
        </div>`,
      mount(el) {
        const host = el.querySelector('[data-keys]');
        const field = el.querySelector('[data-field]');
        const error = el.querySelector('[data-error]');
        let keyDispose = null;
        const update = () => {
          field.textContent = masked();
          error.textContent = '';
        };
        const submit = () => {
          if (user.password === password) {
            ctx.login(user);
            ctx.router.back('home');
          } else {
            error.textContent = ctx.t('login.wrong');
            password = '';
            field.textContent = masked();
            ctx.log('loginFailed', user.name);
          }
        };
        const mountKeys = () => {
          keyDispose?.();
          host.innerHTML = '';
          el.querySelector('[data-mode]').textContent = mode === 'num' ? 'ABC' : '123';
          if (mode === 'num') {
            host.innerHTML = renderNumpad({ enterIcon: 'activate' });
            keyDispose = mountNumpad(host, {
              onInput: (k) => {
                password += k;
                update();
              },
              onBackspace: () => {
                password = password.slice(0, -1);
                update();
              },
              onClear: () => {
                password = '';
                update();
              },
              onEnter: submit,
            });
          } else {
            const kb = mountKeyboard(host, {
              onInput: (k) => {
                password += k;
                update();
              },
              onBackspace: () => {
                password = password.slice(0, -1);
                update();
              },
              onEnter: submit,
              enterIcon: 'activate',
            });
            keyDispose = kb.dispose;
          }
        };
        mountKeys();
        const dispose = onAction(el, {
          toggleShow: (btn) => {
            show = !show;
            btn.innerHTML = icon(show ? 'listeye' : 'lock', { size: 26 });
            btn.setAttribute('aria-label', ctx.t(show ? 'login.hide' : 'login.show'));
            field.textContent = masked();
          },
          mode: () => {
            mode = mode === 'num' ? 'abc' : 'num';
            mountKeys();
          },
        });
        return () => {
          dispose();
          keyDispose?.();
        };
      },
    });
  }
}
