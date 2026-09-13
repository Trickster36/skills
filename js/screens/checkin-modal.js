// Step 7: Check-in modal. Pure UI — takes a node (for its title and
// current comfort as the slider's starting point) and calls back with
// the chosen comfort value + note. Step 8 wires onSave to logic.js's
// checkIn() and a storage save.

const COMFORT_LABELS = ['Unrated', 'Shaky', 'Building', 'Ok', 'Solid', 'Second nature'];

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Opens the check-in modal, appended to `container`.
 *
 * @param {HTMLElement} container
 * @param {Object} node - the leaf node being checked in on
 * @param {Object} callbacks
 * @param {(comfort: number, note: string) => void} callbacks.onSave
 * @param {() => void} callbacks.onCancel
 */
function openCheckInModal(container, node, callbacks) {
  const startingComfort = node.comfort > 0 ? node.comfort : 1;

  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div class="modal-backdrop" id="checkin-backdrop">
      <div class="modal" role="dialog" aria-label="Check in on ${escapeHtml(node.title)}">
        <p class="modal__title">Check in: ${escapeHtml(node.title)}</p>
        <p class="modal__subtitle">How comfortable did that feel?</p>

        <div class="slider-labels">
          <span>Shaky</span>
          <span>Second nature</span>
        </div>
        <input type="range" min="1" max="5" step="1" value="${startingComfort}"
          class="comfort-slider" id="checkin-slider" />
        <p class="slider-current-label" id="checkin-slider-label">
          ${COMFORT_LABELS[startingComfort]}
        </p>

        <textarea class="modal__notes" id="checkin-note"
          placeholder="Any notes from this session?"></textarea>

        <div class="modal__actions">
          <button class="btn-secondary" id="checkin-cancel-btn">Cancel</button>
          <button class="btn-primary" id="checkin-save-btn">Save check-in</button>
        </div>
      </div>
    </div>`;

  const modalEl = wrapper.firstElementChild;
  container.appendChild(modalEl);

  const slider = modalEl.querySelector('#checkin-slider');
  const sliderLabel = modalEl.querySelector('#checkin-slider-label');
  slider.addEventListener('input', () => {
    sliderLabel.textContent = COMFORT_LABELS[Number(slider.value)];
  });

  function close() {
    modalEl.remove();
  }

  modalEl.addEventListener('click', (e) => {
    if (e.target === modalEl) close(); // tap outside the card
  });

  modalEl.querySelector('#checkin-cancel-btn').addEventListener('click', () => {
    close();
    callbacks.onCancel();
  });

  modalEl.querySelector('#checkin-save-btn').addEventListener('click', () => {
    const comfort = Number(slider.value);
    const note = modalEl.querySelector('#checkin-note').value.trim();
    close();
    callbacks.onSave(comfort, note);
  });
}

export { openCheckInModal };
