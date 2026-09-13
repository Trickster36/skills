// Step 6: Tree view screen. Renders a goal's node tree.
// - Locked nodes show only as a generic "Locked" row (title stays hidden,
//   and we don't recurse into their children — those are locked too).
// - The active leaf (from findActiveLeaf) and every ancestor on the way
//   down to it get an "active" highlight, so it's obvious at a glance
//   where you left off.
// - Tapping an unlocked leaf triggers onCheckIn; tapping the back
//   button triggers onBack. Both are callbacks wired up in step 8.

import { getComfort, findActiveLeaf, findPath } from '../logic.js';

const COMFORT_LABELS = ['Unrated', 'Shaky', 'Building', 'Ok', 'Solid', 'Second nature'];

function comfortBadge(comfort) {
  const level = Math.round(comfort);
  return `<span class="comfort-badge" data-level="${level}">${COMFORT_LABELS[level]}</span>`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Computes the set of node ids that are "active": the current active
 * leaf plus every ancestor between it and the goal (exclusive of the
 * goal itself, which isn't rendered as a row).
 */
function getActiveChainIds(goal) {
  const activeLeaf = findActiveLeaf(goal);
  if (!activeLeaf) return new Set();
  const path = findPath(goal, activeLeaf.id); // [goal, ...ancestors, leaf]
  return new Set(path.slice(1).map((n) => n.id));
}

function renderLockedRow(depth) {
  return `
    <div class="tree-node" style="margin-left:${depth * 16}px">
      <div class="tree-row tree-row--locked">
        <span aria-hidden="true">🔒</span>
        <span class="tree-row__label">Locked</span>
      </div>
    </div>`;
}

function renderNode(node, depth, activeChainIds) {
  if (!node.unlocked) {
    return renderLockedRow(depth);
  }

  const isActive = activeChainIds.has(node.id);
  const isLeaf = node.children.length === 0;
  const rowClasses = ['tree-row'];
  if (isActive) rowClasses.push('tree-row--active');

  let html = `
    <div class="tree-node" style="margin-left:${depth * 16}px">
      <div class="${rowClasses.join(' ')}" data-node-id="${node.id}" data-is-leaf="${isLeaf}">
        ${isActive ? '<span class="tree-row__active-icon" aria-hidden="true">▶</span>' : ''}
        <span class="tree-row__label">${escapeHtml(node.title)}</span>
        ${comfortBadge(getComfort(node))}
        <button class="tree-row__add-btn" data-add-child-to="${node.id}" aria-label="Add sub-section under ${escapeHtml(node.title)}">+</button>
      </div>
    </div>`;

  html += node.children.map((child) => renderNode(child, depth + 1, activeChainIds)).join('');
  return html;
}

/**
 * Renders the tree view into `container`.
 *
 * @param {HTMLElement} container
 * @param {Object} goal
 * @param {Object} callbacks
 * @param {() => void} callbacks.onBack
 * @param {(nodeId: string) => void} callbacks.onCheckIn - called when an
 *   unlocked leaf row is tapped
 * @param {() => void} callbacks.onAddTopLevelSection - '+' in the header
 * @param {(parentNodeId: string) => void} callbacks.onAddChild - '+' on a row
 */
function renderTreeScreen(container, goal, callbacks) {
  const activeChainIds = getActiveChainIds(goal);
  const goalComfort = getComfort(goal);

  container.innerHTML = `
    <div class="tree-header">
      <button class="btn-back" id="tree-back-btn" aria-label="Back">←</button>
      <div class="tree-header__text">
        <p class="tree-header__title">${escapeHtml(goal.title)}</p>
        <p class="tree-header__subtitle">
          Comfort ${goalComfort.toFixed(1)} · streak ${goal.streak.current}
          <span aria-hidden="true">🔥</span>
        </p>
      </div>
      <button class="btn-fab" id="tree-add-section-btn" aria-label="Add top-level section">+</button>
    </div>
    <div class="tree-list">
      ${goal.children.map((child) => renderNode(child, 0, activeChainIds)).join('')}
    </div>
  `;

  container.querySelector('#tree-back-btn').addEventListener('click', callbacks.onBack);
  container.querySelector('#tree-add-section-btn').addEventListener('click', callbacks.onAddTopLevelSection);

  container.querySelectorAll('.tree-row[data-is-leaf="true"]').forEach((row) => {
    row.addEventListener('click', () => {
      callbacks.onCheckIn(row.dataset.nodeId);
    });
  });

  container.querySelectorAll('.tree-row__add-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); // don't also trigger the row's check-in click
      callbacks.onAddChild(btn.dataset.addChildTo);
    });
  });
}

export { renderTreeScreen };
