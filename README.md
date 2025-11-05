# Pathfinder: Person Guessing Game (Binary Tree)

This is a lightweight, client‑side web app that mimics an Akinator‑style game using a **binary decision tree**.

## How it works
- Each **question node** is `{ q: "...", yes: Node, no: Node }`.
- Each **leaf node** is `{ a: "Person Name" }`.
- When the app guesses wrong, it asks you for:
  - the correct person
  - a distinguishing yes/no question
  - which side (`yes`/`no`) the correct person belongs to
- It then **replaces** the incorrect leaf with a new question node and **persists** to localStorage (if enabled).

## Files
- `index.html` — minimal UI & controls
- `styles.css` — simple dark theme
- `app.js` — core game logic + SVG path visualization
- `data/initial_tree.json` — starter dataset
- `README.md` — this file

## Run locally
Just open `index.html` in your browser. For stricter browsers you might prefer a tiny HTTP server:
```bash
# Python 3
python -m http.server 8080
# then visit http://localhost:8080
```

## Import/Export
- Use the buttons in the Dataset section to **export** the learned tree or **import** a saved JSON file.
- Toggle **Persist to this browser** to enable/disable localStorage.

## Notes
- Everything runs in the browser — no backend required.
- The visualization shows a small neighborhood of the tree and highlights your current path.
