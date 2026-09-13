// Modal for adding a new section or sub-section. Same shape as
// create-goal-modal.js but kept separate since goal creation and
// section creation trigger different downstream logic in app.js.

function openAddSectionModal(container, callbacks) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div class="modal-backdrop" id="add-section-backdrop">
      <div class="modal" role="dialog" aria-label="Add a new section">
        <p class="modal__title">New section</p>
        <input class="modal__input" id="add-section-title" placeholder="Section name" />
        <div class="modal__actions">
          <button class="btn-secondary" id="add-section-cancel-btn">Cancel</button>
          <button class="btn-primary" id="add-section-save-btn">Add</button>
        </div>
      </div>
    </div>`;

  const modalEl = wrapper.firstElementChild;
  container.appendChild(modalEl);

  function close() {
    modalEl.remove();
  }

  modalEl.querySelector('#add-section-cancel-btn').addEventListener('click', () => {
    close();
    callbacks.onCancel?.();
  });

  modalEl.querySelector('#add-section-save-btn').addEventListener('click', () => {
    const title = modalEl.querySelector('#add-section-title').value.trim();
    if (!title) return;
    close();
    callbacks.onSave(title);
  });
}

export { openAddSectionModal };
