// Step 8: Settings modal. Collects GitHub config on first launch (or
// when the user wants to change it). Pure UI, calls back with the
// entered values.

function openSettingsModal(container, existingConfig, callbacks) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div class="modal-backdrop" id="settings-backdrop">
      <div class="modal" role="dialog" aria-label="GitHub connection settings">
        <p class="modal__title">Connect your GitHub repo</p>
        <p class="modal__subtitle">Your goals are stored as JSON files in a repo you own.</p>

        <input class="modal__input" id="settings-owner" placeholder="GitHub username or org"
          value="${existingConfig?.owner || ''}" />
        <input class="modal__input" id="settings-repo" placeholder="Repository name"
          value="${existingConfig?.repo || ''}" />
        <input class="modal__input" id="settings-branch" placeholder="Branch (e.g. main)"
          value="${existingConfig?.branch || 'main'}" />
        <input class="modal__input" id="settings-token" type="password"
          placeholder="Personal Access Token" value="${existingConfig?.token || ''}" />

        <div class="modal__actions">
          <button class="btn-secondary" id="settings-cancel-btn">Cancel</button>
          <button class="btn-primary" id="settings-save-btn">Save</button>
        </div>
      </div>
    </div>`;

  const modalEl = wrapper.firstElementChild;
  container.appendChild(modalEl);

  function close() {
    modalEl.remove();
  }

  modalEl.querySelector('#settings-cancel-btn').addEventListener('click', () => {
    close();
    callbacks.onCancel?.();
  });

  modalEl.querySelector('#settings-save-btn').addEventListener('click', () => {
    const config = {
      owner: modalEl.querySelector('#settings-owner').value.trim(),
      repo: modalEl.querySelector('#settings-repo').value.trim(),
      branch: modalEl.querySelector('#settings-branch').value.trim() || 'main',
      token: modalEl.querySelector('#settings-token').value.trim(),
    };
    if (!config.owner || !config.repo || !config.token) {
      alert('Owner, repo, and token are all required.');
      return;
    }
    close();
    callbacks.onSave(config);
  });
}

export { openSettingsModal };
