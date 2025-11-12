// PathFinder — shared logic for index.html (game) and admin.html (manage)

// -------------------- Config --------------------
const STORAGE_KEY = 'pathfinder_tree_v1';
const ADMIN_PASSWORD = 'bobby!';          // <<< set your secret here
const ADMIN_SESSION_KEY = 'pathfinder_is_admin';

// Expose tiny helpers so admin.html can call them before game init
window.PathFinder_isAdmin = () => sessionStorage.getItem(ADMIN_SESSION_KEY) === '1';
window.PathFinder_setAdmin = (on) => {
  if (on) sessionStorage.setItem(ADMIN_SESSION_KEY, '1');
  else sessionStorage.removeItem(ADMIN_SESSION_KEY);
};
window.PathFinder_promptAdmin = () => {
  if (window.PathFinder_isAdmin()) return true;
  const pass = prompt('Admin password:');
  if (pass && pass === ADMIN_PASSWORD) {
    window.PathFinder_setAdmin(true);
    return true;
  }
  return false;
};

// -------------------- Seed Tree --------------------
const defaultTree = {
  type: 'q',
  text: 'Is the person real (not fictional)?',
  yes: {
    type: 'q',
    text: 'Is the person primarily known for science/technology?',
    yes: { type: 'a', name: 'Albert Einstein' },
    no: {
      type: 'q',
      text: 'Is the person a musician?',
      yes: { type: 'a', name: 'Taylor Swift' },
      no: { type: 'a', name: 'LeBron James' }
    }
  },
  no: {
    type: 'q',
    text: 'Is the character from a comic book universe?',
    yes: {
      type: 'q',
      text: 'Is the character associated with Marvel?',
      yes: { type: 'a', name: 'Spider-Man' },
      no: { type: 'a', name: 'Batman' }
    },
    no: { type: 'a', name: 'Mario' }
  }
};

// -------------------- State --------------------
let tree = loadTree() ?? defaultTree;
let path = [];                   // stack of { node, choice }
let current = tree;
let awaitingConfirmation = false;

const $ = (sel) => document.querySelector(sel);

// -------------------- Game Rendering --------------------
function render() {
  const promptEl = $('#prompt');
  const statusEl = $('#status');
  if (!promptEl) return; // we might be on admin.html

  if (current.type === 'q') {
    awaitingConfirmation = false;
    promptEl.textContent = current.text;
    if (statusEl) statusEl.textContent = `Question node • depth ${path.length}`;
  } else {
    awaitingConfirmation = true;
    promptEl.textContent = `Are you thinking of: ${current.name}?`;
    if (statusEl) statusEl.textContent = `Guess leaf • depth ${path.length}`;
  }
}

function choose(kind) {
  if (awaitingConfirmation) {
    if (kind === 'yes' || kind === 'prob') {
      alert('Nice! I guessed it 🎉');
      restart(false);
      return;
    }
    if (kind === 'no' || kind === 'pnot') {
      learnFlow();
      return;
    }
    if (kind === 'idk') {
      if (confirm('Not sure? Want to teach me the correct person?')) {
        learnFlow();
      } else {
        restart(false);
      }
      return;
    }
  } else {
    let branch;
    if (kind === 'yes' || kind === 'prob') branch = 'yes';
    else if (kind === 'no' || kind === 'pnot') branch = 'no';
    else branch = 'yes'; // idk heuristic
    path.push({ node: current, choice: branch });
    current = current[branch];
    render();
  }
}

function undo() {
  if (!path.length) return;
  const last = path.pop();
  current = last.node;
  render();
}

function restart(hard = false) {
  path = [];
  current = tree;
  if (hard) {
    localStorage.removeItem(STORAGE_KEY);
    tree = JSON.parse(JSON.stringify(defaultTree));
    current = tree;
  }
  render();
}

// -------------------- Learning --------------------
function learnFlow() {
  if (!current || current.type !== 'a') return;

  const correct = prompt("Who were you thinking of?");
  if (!correct) { alert('No changes made.'); restart(false); return; }

  let question = prompt(`Give me a yes/no question that distinguishes "${correct}" from "${current.name}".`);
  if (!question) { alert('No changes made.'); restart(false); return; }
  question = question.trim();

  const yesForNew = confirm(`For "${correct}", is the answer to:\n"${question}"\nYES? (OK = Yes, Cancel = No)`);

  const oldLeaf = { ...current };
  const newLeaf = { type: 'a', name: correct };
  const newQ = { type: 'q', text: question, yes: null, no: null };

  if (yesForNew) { newQ.yes = newLeaf; newQ.no = oldLeaf; }
  else { newQ.yes = oldLeaf; newQ.no = newLeaf; }

  if (path.length === 0) {
    tree = newQ; // replace root if we started at a leaf
  } else {
    const parent = path[path.length - 1].node;
    const branch = path[path.length - 1].choice;
    parent[branch] = newQ;
  }

  saveTree();
  alert('Thanks! I learned something new.');
  restart(false);
}

// -------------------- Persistence --------------------
function saveTree() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tree)); }
  catch (e) { console.error('Failed to save tree:', e); }
}
function loadTree() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// -------------------- Export / Import (admin only) --------------------
function exportTree() {
  if (!window.PathFinder_isAdmin()) { alert('Admin only.'); return; }
  const blob = new Blob([JSON.stringify(tree, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'pathfinder_tree.json';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
function importTree(file) {
  if (!window.PathFinder_isAdmin()) { alert('Admin only.'); return; }
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const obj = JSON.parse(reader.result);
      if (!obj || (obj.type !== 'q' && obj.type !== 'a')) throw new Error('Invalid root');
      tree = obj;
      saveTree();
      restart(false);
      alert('Import successful.');
    } catch (e) { alert('Import failed: ' + e.message); }
  };
  reader.readAsText(file);
}

// -------------------- Boot per-page --------------------
document.addEventListener('DOMContentLoaded', () => {
  const isAdminPage = !!document.getElementById('manage') && !!document.getElementById('fileImport');

  if (isAdminPage) {
    // Admin page: enforce login
    if (!window.PathFinder_isAdmin()) {
      const ok = window.PathFinder_promptAdmin();
      if (!ok) {
        alert('Admin required.');
        location.href = 'index.html';
        return;
      }
    }
    // Wire Import/Export buttons
    const btnExport = document.getElementById('btnExport');
    const fileImport = document.getElementById('fileImport');
    if (btnExport) btnExport.addEventListener('click', exportTree);
    if (fileImport) fileImport.addEventListener('change', (e) => {
      const f = e.target.files?.[0];
      if (f) importTree(f);
      e.target.value = '';
    });
  } else {
    // Game page
    const byId = (id) => document.getElementById(id);
    byId('btnYes')?.addEventListener('click', () => choose('yes'));
    byId('btnNo')?.addEventListener('click', () => choose('no'));
    byId('btnProb')?.addEventListener('click', () => choose('prob'));
    byId('btnPNot')?.addEventListener('click', () => choose('pnot'));
    byId('btnIDK')?.addEventListener('click', () => choose('idk'));
    byId('btnUndo')?.addEventListener('click', undo);
    byId('btnRestart')?.addEventListener('click', () => restart(false));

    // Footer Admin button: prompt then redirect to admin page
    const adminBtn = document.getElementById('btnAdminLogin');
    if (adminBtn) {
      adminBtn.addEventListener('click', () => {
        if (window.PathFinder_isAdmin() || window.PathFinder_promptAdmin()) {
          location.href = 'admin.html';
        }
      });
    }

    // Optional: URL hash shortcut
    if (location.hash.replace('#','') === 'admin') {
      if (window.PathFinder_isAdmin() || window.PathFinder_promptAdmin()) {
        location.href = 'admin.html';
      }
    }

    render(); // start game
  }
});
