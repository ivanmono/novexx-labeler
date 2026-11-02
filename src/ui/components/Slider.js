/**
 * Slider editor (docx §5.4 "Slider", plan P2-09) for the range parameters marked `control:
 * "slider"` (Fixed Speed, Manual Feed Speed, Encoder speed modification, Test speed, Stand-by
 * timer). The value sits above the track, never under the finger; stepper arrows at both ends
 * move one step; the value applies on release. States default · dragging · at min · at max.
 *
 * Figma component set `Slider · State=default|min|max`.
 */
import { icon } from './Icon.js';
import { snapToRange, stepFor } from '../../core/validate.js';
import { t, fmtNumber } from '../../core/i18n.js';
import { esc, cx, onAction } from '../html.js';

const fmt = (v, param) => fmtNumber(v, param.type === 'Float' && !Number.isInteger(v) ? 1 : 0);

export function renderSlider(param, value) {
  const step = stepFor(param);
  const state = value <= param.min ? 'min' : value >= param.max ? 'max' : 'default';
  const pct = ((value - param.min) / (param.max - param.min)) * 100;
  return `
    <div class="slider flex flex-col gap-3" data-slider data-state="${state}" data-cmp="Slider" data-cmp-props="State=${state}">
      <div class="flex items-baseline justify-center gap-2">
        <span class="t-param text-hero font-semibold" data-slider-value>${esc(fmt(value, param))}</span>
        ${param.unit ? `<span class="text-body-lg text-muted">${esc(param.unit)}</span>` : ''}
      </div>
      <div class="flex items-center gap-2">
        <button type="button" class="pressable size-touch grid place-items-center rounded-md bg-surface-2 text-chrome shrink-0" data-action="dec" ${value <= param.min ? 'aria-disabled="true"' : ''} aria-label="-${step}">${icon('chevron', { size: 24, class: 'rotate-180' })}</button>
        <div class="flex-1 relative h-touch flex items-center">
          <input type="range" class="slider__input w-full" min="${param.min}" max="${param.max}" step="${step}" value="${value}" style="--pct:${pct}%" aria-label="${esc(t(param.labelKey))}" />
        </div>
        <button type="button" class="pressable size-touch grid place-items-center rounded-md bg-surface-2 text-chrome shrink-0" data-action="inc" ${value >= param.max ? 'aria-disabled="true"' : ''} aria-label="+${step}">${icon('chevron', { size: 24 })}</button>
      </div>
      <div class="flex justify-between t-caption text-muted px-16">
        <span>${esc(fmt(param.min, param))}</span>
        <span class="${cx(value === param.default && 'text-brand')}">${esc(t('common.default'))} ${esc(fmt(param.default, param))}</span>
        <span>${esc(fmt(param.max, param))}</span>
      </div>
    </div>`;
}

/** Open the sheet; the value applies on every release / step, the sheet stays until closed. */
export function openSlider(ctx, param, { onChange } = {}) {
  const step = stepFor(param);
  let value = Number(ctx.store.getParam(param.id) ?? param.default ?? param.min);
  return ctx.sheet.open({
    title: t(param.labelKey),
    body: renderSlider(param, value),
    mount(body) {
      const apply = (v, { commit = true } = {}) => {
        value = snapToRange(param, v, step);
        const input = body.querySelector('input[type=range]');
        input.value = String(value);
        input.style.setProperty(
          '--pct',
          `${((value - param.min) / (param.max - param.min)) * 100}%`,
        );
        body.querySelector('[data-slider-value]').textContent = fmt(value, param);
        const root = body.querySelector('[data-slider]');
        root.dataset.state = value <= param.min ? 'min' : value >= param.max ? 'max' : 'default';
        const dis = (sel, on) => {
          const b = body.querySelector(sel);
          if (on) b.setAttribute('aria-disabled', 'true');
          else b.removeAttribute('aria-disabled');
        };
        dis('[data-action="dec"]', value <= param.min);
        dis('[data-action="inc"]', value >= param.max);
        if (commit) onChange?.(value);
      };
      const input = body.querySelector('input[type=range]');
      const onInput = () => {
        body.querySelector('[data-slider]').dataset.dragging = 'true';
        apply(Number(input.value), { commit: false });
      };
      const onCommit = () => {
        delete body.querySelector('[data-slider]').dataset.dragging;
        apply(Number(input.value));
      };
      input.addEventListener('input', onInput);
      input.addEventListener('change', onCommit);
      const dispose = onAction(body, {
        dec: () => apply(value - step),
        inc: () => apply(value + step),
      });
      return () => {
        dispose();
        input.removeEventListener('input', onInput);
        input.removeEventListener('change', onCommit);
      };
    },
  });
}
