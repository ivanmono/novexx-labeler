// Phase 3 shared pieces (P3-01): list row, table row, confirmation, progress, placeholder, file browser
import { describe, it, expect, vi } from 'vitest';
import { renderListRow, renderListEnd, mountScrollHint } from '../../src/ui/components/ListRow.js';
import { renderTableRow } from '../../src/ui/components/TableRow.js';
import { confirmAction } from '../../src/ui/components/ConfirmDialog.js';
import { renderProgressResult, updateProgress } from '../../src/ui/components/ProgressResult.js';
import { renderPlaceholder } from '../../src/ui/components/Placeholder.js';
import { renderFileBrowser, mountFileBrowser } from '../../src/ui/components/FileBrowser.js';

const dom = (html) => {
  const d = document.createElement('div');
  d.innerHTML = html;
  return d;
};

describe('ListRow', () => {
  it('tags kind, state, icon and divider for Figma', () => {
    const el = dom(
      renderListRow({ kind: 'select', title: 'A', icon: 'recipe', state: 'selected', last: true }),
    ).firstElementChild;
    expect(el.dataset.cmpProps).toBe('Kind=select,State=selected,Icon=yes,Divider=no');
    expect(el.getAttribute('aria-selected')).toBe('true');
  });
  it('disabled rows are aria-disabled; value rows are not buttons', () => {
    expect(
      dom(renderListRow({ title: 'A', state: 'disabled' })).querySelector('[aria-disabled="true"]'),
    ).not.toBeNull();
    expect(
      dom(renderListRow({ kind: 'value', title: 'A', value: '5' })).querySelector('button'),
    ).toBeNull();
  });
  it('escapes titles', () => {
    expect(renderListRow({ title: '<b>x</b>' })).toContain('&lt;b&gt;');
  });
  it('end marker and scroll hint', () => {
    expect(dom(renderListEnd()).querySelector('[data-list-end]')).not.toBeNull();
    const host = dom('<div class="scroll-hint"><div data-s></div></div>').firstElementChild;
    const sc = host.querySelector('[data-s]');
    Object.defineProperties(sc, {
      scrollHeight: { value: 500 },
      clientHeight: { value: 200 },
      scrollTop: { value: 0, writable: true },
    });
    const off = mountScrollHint(sc);
    expect(host.hasAttribute('data-more')).toBe(true);
    sc.scrollTop = 300;
    sc.dispatchEvent(new Event('scroll'));
    expect(host.hasAttribute('data-more')).toBe(false);
    off();
  });
});

describe('TableRow', () => {
  it('only outputs can be forced and carry a switch', () => {
    const input = dom(
      renderTableRow({ pin: 'IN 1', label: 'S', kind: 'input', high: true, forced: true }),
    );
    expect(input.querySelector('[data-forced]')).toBeNull();
    expect(input.querySelector('[role="switch"]')).toBeNull();
    const out = dom(
      renderTableRow({
        pin: 'OUT 1',
        label: 'P',
        kind: 'output',
        high: false,
        forced: true,
        canForce: true,
      }),
    );
    expect(out.querySelector('[data-forced="true"]')).not.toBeNull();
    expect(out.querySelector('[role="switch"]').getAttribute('aria-checked')).toBe('true');
  });
  it('the switch is disabled without the level to force', () => {
    const out = dom(renderTableRow({ pin: 'OUT 2', label: 'P', kind: 'output', high: false }));
    expect(out.querySelector('[role="switch"]').getAttribute('aria-disabled')).toBe('true');
  });
});

describe('confirmAction', () => {
  const ctx = (state) => ({
    store: { get: () => ({ state }) },
    toast: { reject: vi.fn() },
    t: (k) => k,
    modal: { confirm: vi.fn(async () => true) },
  });
  it('refuses while running when the action needs a stopped machine', async () => {
    const c = ctx('run');
    expect(await confirmAction(c, { title: 'Load', whenStopped: true })).toBe(false);
    expect(c.modal.confirm).not.toHaveBeenCalled();
    expect(c.toast.reject).toHaveBeenCalledWith('toast.machineRunning');
  });
  it('passes destructive and escapes plain text', async () => {
    const c = ctx('online');
    expect(await confirmAction(c, { title: 'Del', text: '<x>', destructive: true })).toBe(true);
    const arg = c.modal.confirm.mock.calls[0][0];
    expect(arg.destructive).toBe(true);
    expect(arg.body).toBe('<p>&lt;x&gt;</p>');
  });
});

describe('ProgressResult and Placeholder', () => {
  it('running view updates in place', () => {
    const el = dom(renderProgressResult({ state: 'running', title: 'T', phase: 'a', value: 0.1 }));
    updateProgress(el, { value: 0.555, phase: 'b' });
    expect(el.querySelector('[data-pct]').textContent).toBe('56 %');
    expect(el.querySelector('[data-bar]').style.width).toBe('56%');
    expect(el.querySelector('[data-phase]').textContent).toBe('b');
  });
  it('failure lists the next steps', () => {
    const el = dom(renderProgressResult({ state: 'failure', title: 'F', steps: ['one', 'two'] }));
    expect([...el.querySelectorAll('li')].map((l) => l.textContent)).toEqual(['one', 'two']);
  });
  it('error placeholder offers a retry', () => {
    expect(
      dom(renderPlaceholder({ kind: 'error' })).querySelector('[data-action="retry"]'),
    ).not.toBeNull();
  });
});

describe('FileBrowser', () => {
  const entries = [
    { type: 'file', name: 'b.fw', size: '1 MB' },
    { type: 'folder', name: 'z' },
    { type: 'file', name: 'a.txt', allowed: false },
    { type: 'folder', name: 'a' },
  ];
  it('no USB drive is an empty state, not an error', () => {
    const el = dom(renderFileBrowser({ path: ['USB'], entries: [], usb: false }));
    expect(el.querySelector('[data-placeholder="empty"]')).not.toBeNull();
  });
  it('folders first, then files; up row below the root; foreign files disabled', () => {
    const el = dom(renderFileBrowser({ path: ['USB', 'fw'], entries, selected: 'b.fw' }));
    const ids = [...el.querySelectorAll('[data-id]')].map((b) => b.dataset.id);
    expect(ids).toEqual(['..', 'a', 'z', 'a.txt', 'b.fw']);
    expect(el.querySelector('[data-id="a.txt"]').getAttribute('aria-disabled')).toBe('true');
    expect(el.querySelector('[data-id="b.fw"]').getAttribute('aria-selected')).toBe('true');
    const root = dom(renderFileBrowser({ path: ['USB'], entries }));
    expect(root.querySelector('[data-id=".."]')).toBeNull();
  });
  it('taps open folders, pick files and ignore disabled ones', () => {
    const el = dom(renderFileBrowser({ path: ['USB', 'fw'], entries }));
    const h = { onUp: vi.fn(), onOpen: vi.fn(), onPick: vi.fn() };
    const off = mountFileBrowser(el, h);
    el.querySelector('[data-id="z"]').click();
    el.querySelector('[data-id="b.fw"]').click();
    el.querySelector('[data-id="a.txt"]').click();
    el.querySelector('[data-id=".."]').click();
    expect(h.onOpen).toHaveBeenCalledWith('z');
    expect(h.onPick).toHaveBeenCalledTimes(1);
    expect(h.onPick).toHaveBeenCalledWith('b.fw');
    expect(h.onUp).toHaveBeenCalled();
    off();
  });
  it('null entries = still reading', () => {
    expect(
      dom(renderFileBrowser({ path: ['USB'], entries: null })).querySelector(
        '[data-placeholder="loading"]',
      ),
    ).not.toBeNull();
  });
});
