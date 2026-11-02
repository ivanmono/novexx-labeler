/**
 * Group header inside a parameter list (docx §5.4 "Group header"): a caption that names the block
 * of rows under it. Items with `status: "header"` in menu-tree.json render as one.
 *
 * Figma component `GroupHeader`.
 */
import { esc } from '../html.js';

export function renderGroupHeader(label) {
  return `<div class="group-header px-4 pt-4 pb-1 t-caption text-muted" data-cmp="GroupHeader" data-cmp-props="State=default">${esc(label)}</div>`;
}
