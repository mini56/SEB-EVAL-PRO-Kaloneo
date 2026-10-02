'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}
function sha256(rel) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, rel))).digest('hex');
}
function assert(condition, message) {
  if (!condition) {
    console.error('BUILD21_ADMIN_FOUNDATION: FAIL — ' + message);
    process.exit(1);
  }
}
function section(text, start, end) {
  const i = text.indexOf(start);
  if (i < 0) return '';
  const j = end ? text.indexOf(end, i + start.length) : -1;
  return text.slice(i, j < 0 ? text.length : j);
}

// Reference source validated by the user:
// mini56/SEB-EvalPro @ tmp-nvmail-empty-abandon-0310-build21
// commit ff12d5a7a1f51a68d336cc165d1583876b373275

const exactBuild21 = {
  'src/candidate-catalog-main.js': '5ee9e13c77f36d89f7e17f15200763f44bfef2a28af1a7e1cd124109bdba60b6',
  'src/replay-preload.js': '6ff79093a9cbb16891754f01f835f12cf7a17850889207b6fc4484722214b261',
  'src/replay-main.js': 'e406e6f0a90d05407bea31561537c1d4fd5bd4c36b17479d788f87cd2d022215',
  'src/bilan-history-preload.js': '2c3879ec6cc2e1a4533e5b355f897d81b89afc6f41eaa23b1f468e569db6c9d8',
  'src/bilan-history-main.js': '289b9b784286600f7d92a77ef9263641a73d1b76b5cba0b757b8885afca2202c',
  'src/candidate-store-main.js': 'f897b4fa74a4c412a55cf3a7805e35f500d7e699cd981c649000cde9b16c10ed',
  'src/candidate-data-crypto.js': '0420112986b6485a459f47c39815bd00f4c92ea569c3362828d2f3ed054db9fe',
  'src/candidate-folder-utils.js': '9a5542afcd3ea6127960ebc3fb6c97af1da80de20d1fa48a3fb37c66915f55b7'
};

for (const [rel, expected] of Object.entries(exactBuild21)) {
  assert(sha256(rel) === expected, rel + ' ne correspond plus au module de référence Build #21.');
}

const preload = read('src/preload.js');
assert(preload.includes('const BAR_HIDE_DELAY = 1000;'), 'temporisation de barre Admin différente de 1000 ms.');
assert(!preload.includes('openCandidateButton.addEventListener'), 'ancien gestionnaire doublon Ouvrir un candidat du PILOTE #3 détecté.');
assert(!preload.includes('Parcours actif : rester sur la page courante'), 'ancienne logique contextuelle instable PILOTE #3 détectée.');
assert(!preload.includes('bar.__sebUpdateButtons()'), 'ancien relais de boutons contextuels PILOTE #3 détecté.');
assert(preload.includes("await ipcRenderer.invoke('admin:open-candidate-browser').catch(() => false);"), 'déverrouillage Admin ne rejoint plus l’espace candidats.');
assert(preload.includes("document.getElementById('page-final')"), 'support de la fin KALTEST absent.');
assert(preload.includes("window.addEventListener('seb-kaltest-final'"), 'signal de fin KALTEST absent.');
assert(preload.includes("captureReplay: () => replayNavigationCapture.captureNow('kaltest-explicit')"), 'pont Replay KALTEST absent.');
assert(!preload.includes('Fermer la session active active'), 'libellé de session dupliqué.');
assert(!preload.includes('puis quitter.'), 'le dialogue Fermer la session active annonce encore une fermeture du programme.');
assert(preload.includes("await ipcRenderer.invoke('admin:open-candidate-browser').catch(() => false);"), 'retour espace candidats après fermeture de session absent.');

const sessionClose = read('src/session-close.js');
const closeSection = section(sessionClose, "ipcMain.handle('admin:close-session'", "});");
const quitSection = section(sessionClose, "ipcMain.handle('admin:quit-application'", "});");
assert(closeSection && !closeSection.includes('app.quit'), 'Fermer la session active ferme encore le programme.');
assert(quitSection && quitSection.includes('app.quit'), 'Quitter ne ferme plus le programme.');

const catalog = read('src/candidate-catalog-preload.js');
assert(catalog.includes("button.textContent = 'Ouvrir un candidat'"), 'bouton Ouvrir un candidat absent du catalogue stable.');
assert(catalog.includes("ipcRenderer.invoke('admin:open-candidate-browser')"), 'navigation vers le catalogue candidat absente.');

const main = read('src/main.js');
assert(main.includes('function loadAdminCandidateBrowser'), 'route principale du catalogue candidat absente.');
assert(main.includes("ipcMain.handle('admin:open-candidate-browser'"), 'IPC Ouvrir un candidat absent.');
assert(main.includes("ipcMain.handle('admin:return-candidate-browser'"), 'IPC retour candidat absent.');
assert(main.includes("ipcMain.handle('admin:open-bilan'"), 'IPC Bilan absent.');
assert(main.includes("ipcMain.handle('admin:open-candidate-results'"), 'IPC Résultats absent.');

console.log('BUILD21_ADMIN_FOUNDATION: OK');
