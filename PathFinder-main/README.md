# PathFinder: Akinator-style Person Guessing Game

Pure front-end (HTML + CSS + JS) binary decision tree that learns new people when it guesses wrong. Runs 100% in the browser (localStorage), perfect for GitHub Pages.

## Features
- Yes / No / Probably / Probably Not / I don’t know
- Learn-as-you-go: add a new person + distinguishing question
- Undo & Restart
- Export / Import JSON
- No backend or build step required

## How to run locally
Just open `index.html` in a browser.

## Deploy on GitHub Pages
1. Create a new repo (e.g., `pathfinder`).
2. Add these files to the repo: `index.html`, `styles.css`, `app.js`.
3. Commit & push.
4. In the repo settings, enable **Pages** → Deploy from `main` branch, `/ (root)`.
5. Wait for the green check, then visit the Pages URL.

## Add more people
- Play until the guess is wrong.
- The app will ask you for the correct person and a yes/no question that distinguishes them from the wrong guess.
- Your changes are saved locally (localStorage). Use **Export** to save a JSON copy.

## License
MIT
