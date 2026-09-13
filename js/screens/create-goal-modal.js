// Small addition for step 8: a minimal way to create a goal (title only).
// Not one of the originally planned screens — flagged separately since
// it wasn't explicitly designed. Easy to replace with something richer
// (description field, first section name, etc.) later.

function openCreateGoalModal(container, callbacks) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div class="modal-backdrop" id="create-goal-backdrop">
      <div class="modal" role="dialog" aria-label="Create a new goal">
        <p class="modal__title">New goal</p>
        <input class="modal__input" id="create-goal-title" placeholder="e.g. Learn public speaking" />
        <div class="modal__actions">
          <button class="btn-secondary" id="create-goal-cancel-btn">Cancel</button>
          <button class="btn-primary" id="create-goal-save-btn">Create</button>
        </div>
      </div>
    </div>`;

  const modalEl = wrapper.firstElementChild;
  container.appendChild(modalEl);

  function close() {
    modalEl.remove();
  }

  modalEl.querySelector('#create-goal-cancel-btn').addEventListener('click', () => {
    close();
    callbacks.onCancel?.();
  });

  modalEl.querySelector('#create-goal-save-btn').addEventListener('click', () => {
    const title = modalEl.querySelector('#create-goal-title').value.trim();
    if (!title) return;
    close();
    callbacks.onSave(title);
  });
}

export { openCreateGoalModal };
