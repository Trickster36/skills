# Skill Tracker

A PWA for tracking skills and problems as trees of practice — break a goal
into sections and sub-sections (any depth), work through them in order,
and track your comfort level on each one. Data is stored as JSON files in
a GitHub repo you own via the GitHub Contents API.

## 1. Create a GitHub repo for your data

Create a new (can be private) repo, e.g. `skills-data`, with at least one
commit on its default branch (an initial README is fine) — the Contents
API needs the branch to already exist.

## 2. Create a Personal Access Token

GitHub → Settings → Developer settings → Personal access tokens →
Fine-grained tokens → Generate new token.

- Repository access: only the repo you just created
- Permissions: **Contents → Read and write**

Copy the token — you'll paste it into the app once.

## 3. Serve the app

Browsers require a proper origin (not `file://`) for service workers and
some fetch behavior, so serve the `skill-tracker/` folder rather than
opening `index.html` directly. Easiest options:

- **GitHub Pages**: push this folder to a repo and enable Pages
- **Local testing**: from inside the folder, run `npx serve` or
  `python3 -m http.server 8000`, then open `http://localhost:8000`

## 4. First launch

The app will ask for your GitHub username/org, repo name, branch (usually
`main`), and the token from step 2. This is saved in the browser's
localStorage so you won't need to re-enter it — note that means the token
sits in plain text in this browser's storage for this site.

## How it works

- **Goals** are top-level items (e.g. "Learn public speaking"). Each has
  a tree of **sections**, which can have their own sub-sections, to any
  depth.
- Only **leaf** nodes (sections with no sub-sections) get checked in on
  directly. A section's own comfort level is the average of its
  children's.
- **Progression is sequential**: within a set of siblings, each one
  unlocks only once the previous one reaches comfort ≥ 4 ("Solid").
  Locked nodes show only as a generic "Locked" row.
- Once a node unlocks, it **stays unlocked** even if you later revisit an
  earlier node and its comfort drops — going back to practice something
  never re-locks what came after it.
- **Comfort scale**: 1 Shaky → 2 Building → 3 Ok → 4 Solid → 5 Second
  nature, shown as a red → orange → yellow → light-green → green badge.
- **Streaks** are tracked at every level — each node, and the goal as a
  whole — based on daily check-ins.
- Use the **+** button in a goal's header to add a top-level section, or
  the **+** on any unlocked row to add a sub-section under it. New
  sections always append to the end.

## Known limitations

- No UI yet to rename or delete an individual section (deleting a whole
  **goal** works, from the home screen's options sheet).
- No icons other than the default ones included here — feel free to
  replace `icons/icon-192.png` / `icons/icon-512.png`.

## File structure

```
index.html            entry point
manifest.json         PWA manifest
service-worker.js     offline shell caching
css/main.css          all styles, incl. the comfort-level palette
js/
  models.js           goal/node data shapes
  logic.js            comfort averaging, locking, streaks, check-in
  github-storage.js    GitHub Contents API read/write
  settings.js          localStorage config persistence
  app.js                wires everything together
  screens/
    home.js                  goal list, empty state, options sheet
    tree.js                  node tree view
    checkin-modal.js         comfort slider + notes
    settings-modal.js        GitHub config form
    create-goal-modal.js     new goal form
    add-section-modal.js     new section/sub-section form
icons/                 app icons (+ icon-source.svg to re-generate them)
```
