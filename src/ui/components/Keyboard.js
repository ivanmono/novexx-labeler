/**
 * On-screen keyboards (docx §5.4 / §7.2).
 *  - Alphabetical keyboard: layouts lower · upper · numeric/symbols, unfolds below the field.
 *  - Numeric keypad: digits, decimal point, sign, clear, backspace, MIN / MAX (used by the
 *    numeric editor P2-07 and by login for PIN-style passwords).
 * Keys are ≥48 px tall (list-row minimum), action keys 60 px (primary minimum).
 */
import { icon } from './Icon.js';
import { esc, cx, onAction } from '../html.js';

const ROWS = {
  lower: [
    ['q', 'w', 'e', 'r', 't', 'z', 'u', 'i', 'o', 'p', 'ü'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ö', 'ä'],
    ['⇧', 'y', 'x', 'c', 'v', 'b', 'n', 'm', '-', '_', '⌫'],
    ['123', '.', '␣', '@', '↵'],
  ],
  upper: [
    ['Q', 'W', 'E', 'R', 'T', 'Z', 'U', 'I', 'O', 'P', 'Ü'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ö', 'Ä'],
    ['⇧', 'Y', 'X', 'C', 'V', 'B', 'N', 'M', '-', '_', '⌫'],
    ['123', '.', '␣', '@', '↵'],
  ],
  symbols: [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '%'],
    ['!', '?', '#', '$', '&', '*', '(', ')', '+', '=', '/'],
    ['€', ':', ';', ',', '"', "'", '<', '>', '[', ']', '⌫'],
    ['abc', '.', '␣', '@', '↵'],
  ],
};
const SPECIAL = new Set(['⇧', '⌫', '123', 'abc', '␣', '↵']);

export function renderKeyboard({
  layout = 'lower',
  enterLabel = '↵',
  enterIcon = null,
  compact = false,
} = {}) {
  const rows = ROWS[layout] ?? ROWS.lower;
  return `
  <div class="keyboard select-none flex flex-col gap-1.5 ${compact ? 'keyboard--compact' : ''}" data-keyboard data-layout="${layout}" role="group" aria-label="Keyboard">
    ${rows
      .map(
        (row, ri) =>
          `<div class="flex gap-1.5 ${ri === 3 ? '' : ''}">${row
            .map((k) => {
              const special = SPECIAL.has(k);
              const grow =
                k === '␣'
                  ? 'flex-[4]'
                  : k === '↵'
                    ? 'flex-[2]'
                    : k === '123' || k === 'abc'
                      ? 'flex-[1.6]'
                      : special
                        ? 'flex-[1.4]'
                        : 'flex-1';
              const label =
                k === '␣'
                  ? ''
                  : k === '⌫'
                    ? icon('back', { size: 24 })
                    : k === '↵'
                      ? enterIcon
                        ? icon(enterIcon, { size: 24 })
                        : esc(enterLabel)
                      : k === '⇧'
                        ? '⇧'
                        : esc(k);
              // enter gets the brand fill on its own: two bg-* utilities on one element would
              // leave the winner to the stylesheet order (seen as a grey key with a dark icon)
              const tone =
                k === '↵'
                  ? 'key--special bg-brand text-on-brand text-body-sm'
                  : special
                    ? 'key--special bg-surface-2 text-body-sm'
                    : 'bg-key text-body-lg';
              return `<button type="button" class="${cx('key pressable rounded-sm font-semibold grid place-items-center', grow, tone, k === '⇧' && layout === 'upper' && 'ring-2 ring-brand')}" data-action="key" data-key="${esc(k)}" aria-label="${esc(k === '␣' ? 'space' : k === '⌫' ? 'backspace' : k === '↵' ? 'enter' : k)}">${label}</button>`;
            })
            .join('')}</div>`,
      )
      .join('')}
  </div>`;
}

/**
 * Mount keyboard behaviour on a container that holds (or will hold) a rendered keyboard.
 * Handles shift / layout switching internally and calls `onInput(char)`, `onBackspace()`, `onEnter()`.
 */
export function mountKeyboard(
  container,
  { onInput, onBackspace, onEnter, layout = 'lower', enterLabel, enterIcon } = {},
) {
  let current = layout;
  const draw = () => {
    const kb = container.querySelector('[data-keyboard]');
    const html = renderKeyboard({ layout: current, enterLabel, enterIcon });
    if (kb) kb.outerHTML = html;
    else container.insertAdjacentHTML('beforeend', html);
  };
  draw();
  const dispose = onAction(container, {
    key: (btn) => {
      const k = btn.dataset.key;
      switch (k) {
        case '⇧':
          current = current === 'upper' ? 'lower' : 'upper';
          draw();
          break;
        case '123':
          current = 'symbols';
          draw();
          break;
        case 'abc':
          current = 'lower';
          draw();
          break;
        case '⌫':
          onBackspace?.();
          break;
        case '↵':
          onEnter?.();
          break;
        case '␣':
          onInput?.(' ');
          break;
        default:
          onInput?.(k);
          if (current === 'upper') {
            current = 'lower'; // one-shot shift
            draw();
          }
      }
    },
  });
  return {
    dispose,
    setLayout: (l) => {
      current = l;
      draw();
    },
    get layout() {
      return current;
    },
  };
}

/** Numeric keypad: 3×4 digits plus a column of actions. `allowDecimal`/`allowSign` for floats. */
export function renderNumpad({
  allowDecimal = false,
  allowSign = false,
  showMinMax = false,
  enterIcon = 'activate',
} = {}) {
  const NAMES = {
    '⌫': 'backspace',
    C: 'clear',
    '↵': 'enter',
    MIN: 'minimum',
    MAX: 'maximum',
    '-': 'minus',
    '.': 'decimal point',
  };
  const key = (k, extra = '', content = null) =>
    `<button type="button" class="${cx('key pressable rounded-sm grid place-items-center font-semibold', extra)}" data-action="key" data-key="${esc(k)}" aria-label="${esc(NAMES[k] ?? k)}">${content ?? esc(k)}</button>`;
  const dig = (k) => key(k, 'bg-key text-title t-param');
  return `
  <div class="numpad select-none grid grid-cols-4 gap-1.5" data-numpad role="group" aria-label="Numeric keypad">
    ${dig('7')}${dig('8')}${dig('9')}${key('⌫', 'bg-surface-2', icon('back', { size: 24 }))}
    ${dig('4')}${dig('5')}${dig('6')}${key('C', 'bg-surface-2 text-body-sm')}
    ${dig('1')}${dig('2')}${dig('3')}${showMinMax ? key('MIN', 'bg-surface-2 text-label') : key('', 'invisible')}
    ${allowSign ? key('-', 'bg-key text-title t-param') : showMinMax ? key('MAX', 'bg-surface-2 text-label') : key('', 'invisible')}${dig('0')}${allowDecimal ? key('.', 'bg-key text-title t-param') : key('', 'invisible')}${key('↵', 'bg-brand text-on-brand', icon(enterIcon, { size: 28 }))}
  </div>`;
}

export function mountNumpad(
  container,
  { onInput, onBackspace, onClear, onEnter, onMin, onMax } = {},
) {
  return onAction(container, {
    key: (btn) => {
      const k = btn.dataset.key;
      if (k === '⌫') onBackspace?.();
      else if (k === 'C') onClear?.();
      else if (k === '↵') onEnter?.();
      else if (k === 'MIN') onMin?.();
      else if (k === 'MAX') onMax?.();
      else if (k) onInput?.(k);
    },
  });
}
