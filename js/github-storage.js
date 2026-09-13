// Step 4: GitHub-backed storage. Talks to the GitHub Contents API.
// One JSON file per goal (goals/<id>.json) plus an index.json listing
// all goals for the home screen, so loading the list doesn't require
// fetching every goal file.
//
// No UI here — this is called by screens built in later steps.

import { getComfort, findActiveLeaf } from './logic.js';

const API_BASE = 'https://api.github.com';

/**
 * @typedef {Object} GitHubConfig
 * @property {string} owner
 * @property {string} repo
 * @property {string} branch - e.g. "main"
 * @property {string} token - Personal Access Token with repo contents scope
 */

function authHeaders(config) {
  return {
    Authorization: `Bearer ${config.token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

// btoa/atob only handle Latin1, so goal titles/notes with non-ASCII
// characters (emoji, accents, etc.) need proper UTF-8 encoding first.
function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function base64ToUtf8(b64) {
  const binary = atob(b64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * Reads a file's parsed JSON content and its git `sha` (needed for updates).
 * Returns { content, sha } or null if the file doesn't exist yet.
 */
async function readFile(config, path) {
  const url = `${API_BASE}/repos/${config.owner}/${config.repo}/contents/${path}?ref=${config.branch}`;
  const res = await fetch(url, { headers: authHeaders(config) });

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`GitHub read failed (${res.status}): ${path}`);
  }

  const body = await res.json();
  const content = JSON.parse(base64ToUtf8(body.content));
  return { content, sha: body.sha };
}

/**
 * Writes (creates or updates) a JSON file. Pass `sha` when updating an
 * existing file — GitHub requires it to avoid overwriting concurrent changes.
 */
async function writeFile(config, path, content, sha, message) {
  const url = `${API_BASE}/repos/${config.owner}/${config.repo}/contents/${path}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: authHeaders(config),
    body: JSON.stringify({
      message: message || `Update ${path}`,
      content: utf8ToBase64(JSON.stringify(content, null, 2)),
      branch: config.branch,
      ...(sha ? { sha } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub write failed (${res.status}): ${path} — ${body}`);
  }
  return res.json(); // includes new content.sha, useful for the next write
}

async function deleteFile(config, path, sha, message) {
  const url = `${API_BASE}/repos/${config.owner}/${config.repo}/contents/${path}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: authHeaders(config),
    body: JSON.stringify({
      message: message || `Delete ${path}`,
      sha,
      branch: config.branch,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub delete failed (${res.status}): ${path} — ${body}`);
  }
}

// --- Goal-level helpers -----------------------------------------------

/**
 * Loads the index (list of {id, title, comfort, streak} summaries).
 * Returns { goals: [], sha: null } if it doesn't exist yet.
 */
async function loadIndex(config) {
  const result = await readFile(config, 'index.json');
  if (!result) return { goals: [], sha: null };
  return { goals: result.content.goals, sha: result.sha };
}

async function saveIndex(config, goals, sha) {
  return writeFile(config, 'index.json', { goals }, sha, 'Update goal index');
}

/**
 * Loads a single goal's full tree. Returns { goal, sha } or null.
 */
async function loadGoal(config, goalId) {
  const result = await readFile(config, `goals/${goalId}.json`);
  if (!result) return null;
  return { goal: result.content, sha: result.sha };
}

/**
 * Saves a goal (single batched write — call this once per session/edit,
 * not per field change) and keeps the index summary in sync.
 * `existingSha` is the goal file's previous sha, if updating.
 */
async function saveGoal(config, goal, existingSha) {
  const goalResult = await writeFile(
    config,
    `goals/${goal.id}.json`,
    goal,
    existingSha,
    `Update goal: ${goal.title}`
  );

  const { goals, sha: indexSha } = await loadIndex(config);
  const activeLeaf = findActiveLeaf(goal);
  const summary = {
    id: goal.id,
    title: goal.title,
    comfort: getComfort(goal),
    streak: goal.streak,
    activeLeafTitle: activeLeaf ? activeLeaf.title : null,
  };
  const idx = goals.findIndex((g) => g.id === goal.id);
  if (idx === -1) {
    goals.push(summary);
  } else {
    goals[idx] = summary;
  }
  await saveIndex(config, goals, indexSha);

  return goalResult.content.sha; // new sha, keep for the next save
}

async function deleteGoal(config, goalId) {
  const existing = await loadGoal(config, goalId);
  if (!existing) return;

  const fileMeta = await readFile(config, `goals/${goalId}.json`);
  await deleteFile(config, `goals/${goalId}.json`, fileMeta.sha, `Delete goal: ${goalId}`);

  const { goals, sha: indexSha } = await loadIndex(config);
  const filtered = goals.filter((g) => g.id !== goalId);
  await saveIndex(config, filtered, indexSha);
}

export { loadIndex, saveIndex, loadGoal, saveGoal, deleteGoal };
