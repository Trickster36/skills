// Step 2: data model only. Pure object shapes + factory functions.
// No comfort averaging, locking, streak, or check-in logic here —
// that's step 3 (core logic module).

/**
 * Creates a fresh streak tracker object.
 */
function createStreak() {
  return {
    current: 0,
    longest: 0,
    lastCheckIn: null, // ISO date string, e.g. "2026-09-12"
  };
}

/**
 * Creates a node. A node is the recursive unit for both a goal's
 * top-level sections and any depth of sub-section beneath them.
 *
 * @param {Object} opts
 * @param {string} opts.title
 * @param {boolean} [opts.unlocked=false] - whether this node starts unlocked
 *   (e.g. true for the very first node under a goal)
 */
function createNode({ title, unlocked = false }) {
  return {
    id: `node_${crypto.randomUUID()}`,
    title,
    comfort: 0, // 0 = unrated, 1-5 = shaky..second nature. Authoritative only for leaves.
    unlocked,
    unlockedAt: unlocked ? new Date().toISOString().slice(0, 10) : null,
    streak: createStreak(),
    checkIns: [], // { date, note, comfort }
    children: [],
  };
}

/**
 * Creates a goal — the root of a node tree. Shares the same shape as a
 * node (so goal-level streak/comfort work through the same functions
 * later), plus a description field for context.
 *
 * @param {Object} opts
 * @param {string} opts.title
 * @param {string} [opts.description]
 */
function createGoal({ title, description = '' }) {
  return {
    id: `goal_${crypto.randomUUID()}`,
    title,
    description,
    createdAt: new Date().toISOString().slice(0, 10),
    comfort: 0, // derived once children exist — see step 3
    streak: createStreak(),
    children: [],
  };
}

export { createStreak, createNode, createGoal };
