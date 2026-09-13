// Step 8 (revised for performance): wires everything together.
//   settings.js       -> where the GitHub config lives (localStorage)
//   github-storage.js -> loading/saving goals
//   logic.js          -> checkIn, deleteNode, findActiveLeaf
//   screens/*         -> pure UI, called here with real callbacks
//
// Performance notes (this revision): every GitHub API call is a real
// network round trip, so avoiding redundant ones matters a lot for
// perceived speed.
//   - The index (goal list) is cached in memory (`indexCache`) after
//     first load. saveGoal/deleteGoal return the updated index, so we
//     update the cache locally instead of re-fetching it.
//   - After a check-in or add-section inside the tree view, we already
//     have the fully up-to-date goal object and its new sha in memory —
//     we re-render from that directly instead of calling loadGoal again.
//
// initApp() is exported (not auto-run) so this file can be unit tested
// in Node with jsdom. The bottom of the file auto-runs it in a real
// browser, where `window` exists but Node's `process` global doesn't.

import { getStoredConfig, saveStoredConfig } from './settings.js';
import { loadIndex, loadGoal, saveGoal, deleteGoal } from './github-storage.js';
import { checkIn, findActiveLeaf, addChildNode } from './logic.js';
import { createGoal, createNode } from './models.js';
import { renderHomeScreen } from './screens/home.js';
import { renderTreeScreen } from './screens/tree.js';
import { openCheckInModal } from './screens/checkin-modal.js';
import { openSettingsModal } from './screens/settings-modal.js';
import { openCreateGoalModal } from './screens/create-goal-modal.js';
import { openAddSectionModal } from './screens/add-section-modal.js';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function initApp(root) {
  let config = getStoredConfig();
  let indexCache = null; // { goals, sha } — populated on first load, kept in sync locally after that

  function ensureConfigThen(next) {
    if (config) {
      next();
      return;
    }
    openSettingsModal(root, null, {
      onSave: (newConfig) => {
        config = newConfig;
        saveStoredConfig(config);
        next();
      },
    });
  }

  async function showHome() {
    if (!indexCache) {
      indexCache = await loadIndex(config); // only ever hits the network once per session
    }
    renderHomeScreen(root, indexCache.goals, {
      onCreateGoal: handleCreateGoal,
      onCheckIn: handleQuickCheckIn,
      onViewTree: showTree,
      onEdit: handleEdit,
      onDelete: handleDelete,
    });
  }

  function handleCreateGoal() {
    openCreateGoalModal(root, {
      onSave: async (title) => {
        const goal = createGoal({ title });
        // first section starts unlocked so there's something to check in on
        const firstSection = createNode({ title: 'Getting started', unlocked: true });
        goal.children.push(firstSection);
        const result = await saveGoal(config, goal, undefined, indexCache);
        indexCache = { goals: result.indexGoals, sha: result.indexSha };
        showHome(); // renders from the cache we just updated — no extra fetch
      },
    });
  }

  async function showTree(goalId) {
    const result = await loadGoal(config, goalId);
    if (!result) return showHome();
    let { goal, sha } = result; // `sha` is reassigned after each save below

    function render() {
      renderTreeScreen(root, goal, {
        onBack: showHome,
        onCheckIn: handleCheckIn,
        onAddTopLevelSection: () => handleAddSection(goal),
        onAddChild: (parentNodeId) => {
          const parent = findNodeById(goal, parentNodeId);
          if (parent) handleAddSection(parent);
        },
      });
    }

    function handleAddSection(parentNode) {
      openAddSectionModal(root, {
        onSave: async (title) => {
          addChildNode(parentNode, title);
          const result = await saveGoal(config, goal, sha, indexCache);
          sha = result.goalSha;
          indexCache = { goals: result.indexGoals, sha: result.indexSha };
          render(); // re-render from the goal object we already have — no re-fetch
        },
      });
    }

    function handleCheckIn(nodeId) {
      const node = findNodeById(goal, nodeId);
      if (!node) return;
      openCheckInModal(root, node, {
        onCancel: render,
        onSave: async (comfort, note) => {
          checkIn(goal, nodeId, comfort, note, todayISO());
          const result = await saveGoal(config, goal, sha, indexCache);
          sha = result.goalSha;
          indexCache = { goals: result.indexGoals, sha: result.indexSha };
          render(); // re-render with fresh state (unlock, comfort, streak) — no re-fetch
        },
      });
    }

    render();
  }

  async function handleQuickCheckIn(goalId) {
    const result = await loadGoal(config, goalId); // unavoidable: home only has the summary
    if (!result) return;
    const { goal, sha } = result;
    const activeLeaf = findActiveLeaf(goal);
    if (!activeLeaf) return showHome();

    openCheckInModal(root, activeLeaf, {
      onCancel: showHome,
      onSave: async (comfort, note) => {
        checkIn(goal, activeLeaf.id, comfort, note, todayISO());
        const saveResult = await saveGoal(config, goal, sha, indexCache);
        indexCache = { goals: saveResult.indexGoals, sha: saveResult.indexSha };
        showHome();
      },
    });
  }

  function handleEdit(goalId) {
    // Minimal for now: renaming/restructuring isn't a designed screen
    // yet — flagged as a follow-up. For now, "edit" just opens the tree.
    showTree(goalId);
  }

  async function handleDelete(goalId) {
    const confirmed = confirm('Delete this goal? This cannot be undone.');
    if (!confirmed) return;
    const result = await deleteGoal(config, goalId, indexCache);
    if (result) indexCache = { goals: result.indexGoals, sha: result.indexSha };
    showHome();
  }

  function findNodeById(goal, nodeId) {
    if (goal.id === nodeId) return goal;
    function walk(node) {
      for (const child of node.children) {
        if (child.id === nodeId) return child;
        const found = walk(child);
        if (found) return found;
      }
      return null;
    }
    return walk(goal);
  }

  ensureConfigThen(showHome);
}

// Auto-run in the browser only. `process` exists in Node (where we run
// unit tests importing this module) but not in a real browser, so this
// skips the real DOM/network calls during testing without needing a
// separate test-only entry point.
if (typeof process === 'undefined') {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js').catch(console.error);
    });
  }
  initApp(document.getElementById('app'));
}

export { initApp };
