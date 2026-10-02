'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}
function gitBlobSha(rel) {
  const data = fs.readFileSync(path.join(ROOT, rel));
  const header = Buffer.from('blob ' + data.length + '\0', 'utf8');
  return crypto.createHash('sha1').update(header).update(data).digest('hex');
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
  'src/candidate-catalog-main.js': '0b9573e5691a136b2a74b44ea2bfee796108fcb8',
  'src/replay-preload.js': 'a26aba2415935793382d76857bdd2fe24454c7b7',
  'src/replay-main.js': '004baf83051d805bdd47c3fe865d5ffd6175f38c',
  'src/bilan-history-preload.js': '7f53efab6addbf19a1cb8b42aff5233ff4db5416',
  'src/bilan-history-main.js': '2e5f549fa0623c64029eb0e6f29cb6af5a9c6848',
  'src/candidate-store-main.js': '48e47a9047b4cd303c8b80956665808cbb674165',
  'src/candidate-data-crypto.js': '7344aee00420552443543fd03ac33f85dc987fdb',
  'src/candidate-folder-utils.js': 'bd3c06186a83384552416d5a1f9126f036935c2f'
};

for (const [rel, expected] of Object.entries(exactBuild21)) {
  assert(gitBlobSha(rel) === expected, rel + ' ne correspond plus au module de référence Build #21.');
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
