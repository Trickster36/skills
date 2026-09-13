// Step 5 (revised in step 8): Home screen UI. Renders goal cards
// (comfort ring, active node, streak) or the empty state, and an
// options sheet when a card is tapped.
//
// Takes lightweight index SUMMARIES ({id, title, comfort, streak,
// activeLeafTitle}), not full goal trees — the whole point of the
// index file is that the home screen never needs to fetch every
// goal's full tree just to render the list.

function comfortRingColor(comfort) {
  if (comfort >= 4) return '#639922';
  if (comfort >= 2) return '#993C1D';
  if (comfort > 0) return '#A32D2D';
  return '#3a3a3a';
}

function renderRing(comfort) {
  const r = 20;
  const circumference = 2 * Math.PI * r;
  const pct = Math.min(comfort / 5, 1);
  const offset = circumference * (1 - pct);
  const color = comfortRingColor(comfort);
  return `
    <svg width="48" height="48" viewBox="0 0 48 48" class="comfort-ring" aria-hidden="true">
      <circle cx="24" cy="24" r="${r}" fill="none" stroke="var(--border)" stroke-width="4"/>
      <circle cx="24" cy="24" r="${r}" fill="none" stroke="${color}" stroke-width="4"
        stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
        transform="rotate(-90 24 24)"/>
      <text x="24" y="28" text-anchor="middle" font-size="13" font-weight="500" fill="var(--text-primary)">
        ${comfort.toFixed(1)}
      </text>
    </svg>`;
}

function renderGoalCard(summary) {
  const activeLabel = summary.activeLeafTitle || 'All sections mastered';

  return `
    <div class="goal-card" data-goal-id="${summary.id}" role="button" tabindex="0">
      ${renderRing(summary.comfort)}
      <div class="goal-card__info">
        <p class="goal-card__title">${escapeHtml(summary.title)}</p>
        <p class="goal-card__subtitle">Now on: ${escapeHtml(activeLabel)}</p>
      </div>
      <div class="goal-card__streak">
        <span aria-hidden="true">🔥</span>
        <span>${summary.streak.current}</span>
      </div>
    </div>`;
}

function renderEmptyState() {
  return `
    <div class="empty-state">
      <p class="empty-state__title">Start your first goal</p>
      <p class="empty-state__body">
        Break it into sections, then work through them one at a time.
        Each unlocks once you're comfortable with the last.
      </p>
      <button class="btn-primary" id="empty-state-create-btn">Create goal</button>
    </div>`;
}

function renderOptionsSheet(summary) {
  const checkInLabel = summary.activeLeafTitle
    ? `Check in on "${escapeHtml(summary.activeLeafTitle)}"`
    : 'Check in';

  return `
    <div class="sheet-backdrop" id="options-sheet-backdrop">
      <div class="sheet" role="dialog" aria-label="Options for ${escapeHtml(summary.title)}">
        <p class="sheet__title">${escapeHtml(summary.title)}</p>
        <button class="sheet__option" data-action="check-in" ${summary.activeLeafTitle ? '' : 'disabled'}>
          ${checkInLabel}
        </button>
        <button class="sheet__option" data-action="view-tree">View full tree</button>
        <button class="sheet__option" data-action="edit">Edit goal</button>
        <button class="sheet__option sheet__option--danger" data-action="delete">Delete goal</button>
      </div>
    </div>`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Renders the home screen into `container`.
 *
 * @param {HTMLElement} container
 * @param {Object[]} summaries - index summaries: {id, title, comfort, streak, activeLeafTitle}
 * @param {Object} callbacks
 * @param {(goalId: string) => void} callbacks.onCheckIn
 * @param {(goalId: string) => void} callbacks.onViewTree
 * @param {(goalId: string) => void} callbacks.onEdit
 * @param {(goalId: string) => void} callbacks.onDelete
 * @param {() => void} callbacks.onCreateGoal
 */
function renderHomeScreen(container, summaries, callbacks) {
  const listHtml = summaries.length
    ? `<div class="goal-list">${summaries.map(renderGoalCard).join('')}</div>`
    : renderEmptyState();

  container.innerHTML = `
    <div class="home-header">
      <p class="home-header__title">Your goals</p>
      <button class="btn-fab" id="create-goal-btn" aria-label="Add goal">+</button>
    </div>
    ${listHtml}
  `;

  const createBtn = container.querySelector('#create-goal-btn');
  if (createBtn) createBtn.addEventListener('click', callbacks.onCreateGoal);

  const emptyBtn = container.querySelector('#empty-state-create-btn');
  if (emptyBtn) emptyBtn.addEventListener('click', callbacks.onCreateGoal);

  container.querySelectorAll('.goal-card').forEach((card) => {
    card.addEventListener('click', () => {
      const summary = summaries.find((g) => g.id === card.dataset.goalId);
      openOptionsSheet(container, summary, callbacks);
    });
  });
}

function openOptionsSheet(container, summary, callbacks) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = renderOptionsSheet(summary);
  const sheetEl = wrapper.firstElementChild;
  container.appendChild(sheetEl);

  function close() {
    sheetEl.remove();
  }

  sheetEl.addEventListener('click', (e) => {
    if (e.target === sheetEl) close(); // tap outside the sheet card
  });

  sheetEl.querySelector('[data-action="check-in"]').addEventListener('click', () => {
    close();
    callbacks.onCheckIn(summary.id);
  });
  sheetEl.querySelector('[data-action="view-tree"]').addEventListener('click', () => {
    close();
    callbacks.onViewTree(summary.id);
  });
  sheetEl.querySelector('[data-action="edit"]').addEventListener('click', () => {
    close();
    callbacks.onEdit(summary.id);
  });
  sheetEl.querySelector('[data-action="delete"]').addEventListener('click', () => {
    close();
    callbacks.onDelete(summary.id);
  });
}

export { renderHomeScreen };