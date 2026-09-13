// Step 8: Settings persistence. Stores the GitHub config (owner, repo,
// branch, token) in localStorage so it survives across sessions without
// re-entering it every time. Traded off intentionally: convenient, but
// the token sits in plain text in this origin's localStorage.

const STORAGE_KEY = 'skill-tracker:github-config';

function getStoredConfig() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveStoredConfig(config) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

function clearStoredConfig() {
  localStorage.removeItem(STORAGE_KEY);
}

export { getStoredConfig, saveStoredConfig, clearStoredConfig };
