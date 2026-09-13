// Step 8: wires everything together.
//   settings.js       -> where the GitHub config lives (localStorage)
//   github-storage.js -> loading/saving goals
//   logic.js          -> checkIn, deleteNode, findActiveLeaf
//   screens/*         -> pure UI, called here with real callbacks
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
    const { goals: summaries } = await loadIndex(config);
    renderHomeScreen(root, summaries, {
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
        await saveGoal(config, goal);
        showHome();
      },
    });
  }

  async function showTree(goalId) {
    const result = await loadGoal(config, goalId);
    if (!result) return showHome();
    const { goal, sha } = result;

    renderTreeScreen(root, goal, {
      onBack: showHome,
      onCheckIn: (nodeId) => handleCheckIn(goal, sha, nodeId),
      onAddTopLevelSection: () => handleAddSection(goal, sha, goal),
      onAddChild: (parentNodeId) => {
        const parent = findNodeById(goal, parentNodeId);
        if (parent) handleAddSection(goal, sha, parent);
      },
    });
  }

  function handleAddSection(goal, sha, parentNode) {
    openAddSectionModal(root, {
      onSave: async (title) => {
        addChildNode(parentNode, title);
        await saveGoal(config, goal, sha);
        showTree(goal.id);
      },
    });
  }

  function handleCheckIn(goal, sha, nodeId) {
    const node = findNodeById(goal, nodeId);
    if (!node) return;
    openCheckInModal(root, node, {
      onCancel: () => showTree(goal.id),
      onSave: async (comfort, note) => {
        checkIn(goal, nodeId, comfort, note, todayISO());
        await saveGoal(config, goal, sha);
        showTree(goal.id); // re-render with fresh state (unlock, comfort, streak)
      },
    });
  }

  async function handleQuickCheckIn(goalId) {
    const result = await loadGoal(config, goalId);
    if (!result) return;
    const { goal, sha } = result;
    const activeLeaf = findActiveLeaf(goal);
    if (!activeLeaf) return showHome();
    handleCheckIn(goal, sha, activeLeaf.id);
  }

  async function handleEdit(goalId) {
    // Minimal for now: editing the tree structure (adding sections,
    // renaming) isn't a designed screen yet — flagged as a follow-up.
    // For now, "edit" just opens the tree view.
    showTree(goalId);
  }

  async function handleDelete(goalId) {
    const confirmed = confirm('Delete this goal? This cannot be undone.');
    if (!confirmed) return;
    await deleteGoal(config, goalId);
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
