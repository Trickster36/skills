// Step 3: core logic. Pure functions operating on the goal/node shape
// from models.js. No UI, no storage — just the rules we finalized:
//   - comfort: leaf value is authoritative; parent = average of rated
//     children (unrated children excluded)
//   - unlock: sticky — set once, never re-derived from current comfort
//   - check-in: leaf-only, rejected if locked; updates node + every
//     ancestor's streak; may unlock the next sibling (comfort >= 4)
//   - delete: cascades to children (implicit — removing a subtree
//     removes everything under it)

import { createNode } from './models.js';

/**
 * Recursively computes a node's effective comfort.
 * Leaves return their own stored value. Parents average their
 * children's effective comfort, excluding any child whose comfort
 * is still 0 (unrated) so an untouched section doesn't drag the
 * average down.
 */
function getComfort(node) {
  if (node.children.length === 0) {
    return node.comfort;
  }
  const rated = node.children
    .map(getComfort)
    .filter((c) => c > 0);
  if (rated.length === 0) return 0;
  return rated.reduce((sum, c) => sum + c, 0) / rated.length;
}

/**
 * Adds a new child node to `parent`, always appended at the end.
 * The new node is born unlocked only if it's the first child (a
 * parent you can add to is already accessible), or if the current
 * last sibling has already reached the unlock threshold. After
 * creation, unlock state is sticky like everything else — this is a
 * one-time snapshot at creation, not re-evaluated later.
 */
function addChildNode(parent, title) {
  const COMFORT_UNLOCK_THRESHOLD = 4;
  let unlocked;
  if (parent.children.length === 0) {
    unlocked = true;
  } else {
    const lastSibling = parent.children[parent.children.length - 1];
    unlocked = getComfort(lastSibling) >= COMFORT_UNLOCK_THRESHOLD;
  }
  const node = createNode({ title, unlocked });
  parent.children.push(node);
  return node;
}

/**
 * Finds the path from the goal (root) down to the target node id.
 * Returns an array [goal, ...ancestors, targetNode], or null if not found.
 * The goal itself is included so callers can update its streak/comfort
 * the same way as any ancestor.
 */
function findPath(goal, nodeId) {
  if (goal.id === nodeId) return [goal];

  function walk(node, path) {
    for (const child of node.children) {
      const nextPath = [...path, child];
      if (child.id === nodeId) return nextPath;
      const found = walk(child, nextPath);
      if (found) return found;
    }
    return null;
  }

  const rest = walk(goal, [goal]);
  return rest;
}

/**
 * Updates a streak object in place for a check-in on `date` (ISO
 * "YYYY-MM-DD" string). Shared logic for goal-level and node-level streaks.
 */
function updateStreak(streak, date) {
  const yesterday = (d) => {
    const dt = new Date(d + 'T00:00:00Z');
    dt.setUTCDate(dt.getUTCDate() - 1);
    return dt.toISOString().slice(0, 10);
  };

  if (streak.lastCheckIn === date) {
    // already checked in today on this node/goal — no change
  } else if (streak.lastCheckIn === yesterday(date)) {
    streak.current += 1;
  } else {
    streak.current = 1;
  }
  streak.longest = Math.max(streak.longest, streak.current);
  streak.lastCheckIn = date;
}

/**
 * After a check-in, unlocks the next sibling if this node's effective
 * comfort has reached the threshold and the next sibling isn't already
 * unlocked. Sticky: only ever sets unlocked from false -> true.
 */
function maybeUnlockNextSibling(parent, node, date) {
  const COMFORT_UNLOCK_THRESHOLD = 4;
  if (getComfort(node) < COMFORT_UNLOCK_THRESHOLD) return;

  const idx = parent.children.findIndex((c) => c.id === node.id);
  if (idx === -1 || idx + 1 >= parent.children.length) return;

  const next = parent.children[idx + 1];
  if (!next.unlocked) {
    next.unlocked = true;
    next.unlockedAt = date;
  }
}

/**
 * Records a check-in on a leaf node. Mutates the tree in place.
 * Returns { ok: true } on success, or { ok: false, reason } on failure.
 *
 * @param {Object} goal - the root goal object
 * @param {string} nodeId - id of the node being checked in on
 * @param {number} comfortValue - 1-5
 * @param {string} note
 * @param {string} date - ISO "YYYY-MM-DD"
 */
function checkIn(goal, nodeId, comfortValue, note, date) {
  const path = findPath(goal, nodeId);
  if (!path) return { ok: false, reason: 'node not found' };

  const node = path[path.length - 1];
  const parent = path.length >= 2 ? path[path.length - 2] : null;

  if (node.children.length > 0) {
    return { ok: false, reason: 'check-in only allowed on leaf nodes' };
  }
  if (!node.unlocked) {
    return { ok: false, reason: 'node is locked' };
  }

  node.comfort = comfortValue;
  node.checkIns.push({ date, note, comfort: comfortValue });

  // update this node's own streak, plus every ancestor's (goal included)
  updateStreak(node.streak, date);
  for (let i = 0; i < path.length - 1; i++) {
    updateStreak(path[i].streak, date);
  }

  if (parent) {
    // Walk from the checked-in leaf up through every ancestor (stopping
    // before the goal, which has no "next sibling" of its own). At each
    // level, check whether that node/ancestor has now reached the unlock
    // threshold — if so, unlock ITS next sibling. Without this loop,
    // finishing every leaf in a section would never cascade up to
    // unlock the next section; only the immediate parent got checked.
    for (let i = path.length - 1; i >= 1; i--) {
      const current = path[i];
      const currentParent = path[i - 1];
      maybeUnlockNextSibling(currentParent, current, date);
    }
  }

  return { ok: true };
}

/**
 * Deletes a node (and, implicitly, everything beneath it) from the tree.
 * Returns { ok: true } or { ok: false, reason }.
 */
function deleteNode(goal, nodeId) {
  if (goal.id === nodeId) {
    return { ok: false, reason: 'cannot delete the goal itself here' };
  }
  const path = findPath(goal, nodeId);
  if (!path || path.length < 2) return { ok: false, reason: 'node not found' };

  const parent = path[path.length - 2];
  const idx = parent.children.findIndex((c) => c.id === nodeId);
  if (idx === -1) return { ok: false, reason: 'node not found in parent' };

  const deletedWasUnlocked = parent.children[idx].unlocked;
  parent.children.splice(idx, 1); // subtree goes with it

  // Sticky unlock is a stored flag, not derived — so deleting an unlocked
  // node no longer "naturally" unlocks the next one via recomputation.
  // Carry that intent forward explicitly instead.
  const next = parent.children[idx]; // shifted into the deleted slot, if any
  if (deletedWasUnlocked && next && !next.unlocked) {
    next.unlocked = true;
    next.unlockedAt = new Date().toISOString().slice(0, 10);
  }

  return { ok: true };
}

/**
 * Collects all leaf nodes under `node` in depth-first order.
 */
function getLeaves(node) {
  if (node.children.length === 0) return [node];
  return node.children.flatMap(getLeaves);
}

/**
 * Finds the leaf currently being worked on: the first unlocked leaf
 * (in tree order) that hasn't yet crossed the unlock threshold.
 * Returns null if nothing is unlocked yet, or everything unlocked
 * has already reached comfort >= 4 (fully progressed).
 */
function findActiveLeaf(goal) {
  const COMFORT_UNLOCK_THRESHOLD = 4;
  const leaves = getLeaves(goal);
  return leaves.find((leaf) => leaf.unlocked && leaf.comfort < COMFORT_UNLOCK_THRESHOLD) || null;
}

export { getComfort, addChildNode, findPath, updateStreak, maybeUnlockNextSibling, checkIn, deleteNode, getLeaves, findActiveLeaf };
