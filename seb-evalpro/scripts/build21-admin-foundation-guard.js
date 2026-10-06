'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}
function gitBlobSha(rel) {
  const text = fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
  const data = Buffer.from(text, 'utf8');
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
assert(preload.includes("↑ Exporter dossiers"), 'flèche montante Exporter absente.');
assert(preload.includes("↓ Importer dossiers"), 'flèche descendante Importer absente.');
assert(preload.includes("finishCandidateButton.hidden = true"), 'ancien bouton Terminer le parcours du candidat non verrouillé en masqué.');
assert(preload.includes("closeSessionButton.hidden = !active"), 'Fermer la session active n’est pas piloté par la présence d’un parcours actif.');
assert(preload.includes("#seb-evalpro-topbar #seb-evalpro-quit-application,"), 'Quitter n’est pas inclus dans le style danger rouge.');
assert(preload.includes("height:36px!important"), 'hauteur compacte des boutons Admin absente.');
assert(preload.includes("font-size:15px!important"), 'texte de la barre Admin non remonté à 15 px.');
assert(preload.includes("padding:1px 4px!important"), 'padding compact de la barre Admin absent.');
assert(preload.includes("#seb-evalpro-topbar button[hidden]{display:none!important}"), 'les boutons masqués peuvent encore apparaître visuellement.');
assert(preload.includes("#seb-evalpro-topbar #seb-evalpro-bilan,") && preload.includes("#seb-evalpro-topbar #seb-evalpro-return,") && preload.includes("#seb-evalpro-topbar #seb-evalpro-finish-candidate{display:none!important}"), 'Bilan / Retour / ancien Terminer ne sont pas verrouillés hors barre globale.');
assert(preload.includes("overflow:hidden;background:#0070c0"), 'barre Admin ne masque pas les débordements.');
assert(!preload.includes("if (button.parentElement !== bar) bar.appendChild(button);"), 'bouton de confidentialité encore injecté dans la barre Admin.');
assert(preload.includes('id="seb-evalpro-tests-parcours"'), 'bouton Tests / Parcours absent de la barre Admin.');
assert(preload.includes('id="seb-evalpro-choose-parcours"'), 'bouton Choix du parcours absent de la barre Admin.');
assert(preload.includes("kaloneo-library:select-parcours"), 'sélection du parcours non câblée.');
assert(preload.includes("kaloneo-library:selected-runtime"), 'runtime du parcours sélectionné non vérifié avant verrouillage.');
assert(preload.includes('id="seb-evalpro-show-privacy"'), 'bouton Afficher l’écran d’accueil absent de la barre Admin.');
assert(preload.includes("window.dispatchEvent(new CustomEvent('seb-evalpro-show-privacy'))"), 'action écran d’accueil de la barre non câblée.');
assert(preload.includes("window.addEventListener('seb-evalpro-show-privacy'"), 'écran de confidentialité ne reçoit pas la commande de la barre.');
assert(preload.includes("ipcRenderer.invoke('admin:open-tests-parcours')"), 'navigation Tests / Parcours non câblée.');
assert(preload.includes("closeTestsParcours: () => ipcRenderer.invoke('admin:close-tests-parcours')"), 'retour Tests / Parcours non exposé.');
assert(preload.includes('const ADMIN_HELP_DELAY_MS = 650;'), 'temporisation des bulles d’aide absente.');
assert(preload.includes('const ADMIN_HELP_VISIBLE_MS = 2800;'), 'durée des bulles d’aide absente.');
assert(preload.includes("Ouvre la page de gestion des tests et des parcours KALONÉO."), 'aide Tests / Parcours absente.');
assert(preload.includes("Ferme SEB EvalPro. Un parcours encore actif est sauvegardé pour pouvoir être repris."), 'aide Quitter absente.');
assert(preload.includes("Termine définitivement le parcours candidat en cours et revient à l’espace Administrateur."), 'aide Fermer la session active absente.');
assert(preload.includes("Affiche l’écran d’accueil SEB EvalPro afin de masquer temporairement les informations affichées."), 'aide écran SEB EvalPro absente.');
assert(preload.includes("return label ? `Commande « ${label} ».` : '';"), 'repli d’aide pour tout bouton visible absent.');
assert(preload.includes("closeAdminBilan: () => closeAdminBilanPage()"), 'action interne Fermer du bilan non exposée.');

const sessionClose = read('src/session-close.js');
const closeSection = section(sessionClose, "ipcMain.handle('admin:close-session'", "});");
const quitSection = section(sessionClose, "ipcMain.handle('admin:quit-application'", "});");
assert(closeSection && !closeSection.includes('app.quit'), 'Fermer la session active ferme encore le programme.');
assert(quitSection && quitSection.includes('app.quit'), 'Quitter ne ferme plus le programme.');

const catalog = read('src/candidate-catalog-preload.js');
assert(catalog.includes("button.textContent = 'Lister les candidats'"), 'bouton Lister les candidats absent du catalogue stable.');
assert(catalog.includes('seb-cc-title">Liste des candidats'), 'titre Liste des candidats absent.');
assert(catalog.includes("ipcRenderer.invoke('admin:open-candidate-browser')"), 'navigation vers le catalogue candidat absente.');

const main = read('src/main.js');
assert(main.includes('function loadAdminCandidateBrowser'), 'route principale du catalogue candidat absente.');
assert(main.includes("ipcMain.handle('admin:open-candidate-browser'"), 'IPC Ouvrir un candidat absent.');
assert(main.includes("ipcMain.handle('admin:return-candidate-browser'"), 'IPC retour candidat absent.');
assert(main.includes("ipcMain.handle('admin:open-bilan'"), 'IPC Bilan absent.');
assert(main.includes("ipcMain.handle('admin:open-candidate-results'"), 'IPC Résultats absent.');
assert(main.includes("ipcMain.handle('admin:open-tests-parcours'"), 'IPC Tests / Parcours absent.');
assert(main.includes("ipcMain.handle('admin:close-tests-parcours'"), 'IPC Fermer Tests / Parcours absent.');
assert(main.includes("admin-tests-parcours.html"), 'page Tests / Parcours non référencée par le main.');
assert(main.includes("kaloneo-library:list-tests"), 'bibliothèque KALONÉO non exposée par le main.');
assert(main.includes("kaloneo-library:save-parcours"), 'enregistrement des parcours non exposé par le main.');
assert(main.includes("kaloneo-library:get-parcours-details"), 'détail des parcours non exposé par le main.');
assert(main.includes("kaloneo-library:select-parcours"), 'choix du parcours non exposé par le main.');
assert(main.includes("kaloneo-library:selected-runtime-sync"), 'runtime synchrone du parcours sélectionné absent.');

const testsPage = read('overrides/admin-tests-parcours.html');
const testsScript = read('source/js/admin-tests-parcours.js');
assert((testsPage.match(/<button\b/gi) || []).length === 4, 'la page Tests / Parcours doit contenir Test KALONÉO + Écrans de masquage + Parcours + Fermer.');
assert(testsPage.includes('id="open-kaloneo-builder"') && testsPage.includes('Créer / modifier un test'), 'bouton d’ouverture du Builder KALONÉO absent.');
assert(testsPage.includes('id="open-mask-builder"') && testsPage.includes('Écrans de masquage'), 'bouton de gestion des écrans de masquage absent.');
assert(testsPage.includes('id="open-parcours-builder"') && testsPage.includes('Créer / gérer un parcours'), 'bouton d’ouverture du créateur de parcours absent.');
assert(testsPage.includes('id="close-tests-parcours"') && testsPage.includes('>Fermer</button>'), 'bouton Fermer de Tests / Parcours absent.');
assert(!/Importer|Exporter|Dupliquer|Supprimer/i.test(testsPage), 'la page Tests / Parcours expose une fonction non validée hors Builder.');
assert(testsScript.includes("kaloneo-builder/test-builder.html"), 'navigation vers le Builder KALONÉO non câblée.');
assert(testsScript.includes("admin-mask-builder.html"), 'navigation vers les écrans de masquage non câblée.');
assert(testsScript.includes("admin-parcours-builder.html"), 'navigation vers le créateur de parcours non câblée.');
assert(testsScript.includes('closeTestsParcours'), 'action Fermer de Tests / Parcours non câblée.');

const bilanPage = read('overrides/admin-bilan.html');
const bilanClose = read('source/js/admin-bilan-close.js');
assert(bilanPage.includes('id="close-bilan-top"') && bilanPage.includes('id="close-bilan-bottom"'), 'les deux boutons Fermer du bilan sont absents.');
assert(bilanPage.includes('js/admin-bilan-close.js'), 'script de fermeture du bilan non chargé.');
assert(bilanClose.includes('closeAdminBilan'), 'les boutons Fermer du bilan ne sont pas câblés à la fermeture sécurisée.');

console.log('BUILD21_ADMIN_FOUNDATION: OK');
