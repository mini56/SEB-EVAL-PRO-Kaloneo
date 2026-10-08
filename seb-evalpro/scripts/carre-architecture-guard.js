const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function fail(message) {
  console.error('SEB EvalPro garde carré: ' + message);
  process.exit(2);
}
function read(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) fail('fichier introuvable: ' + rel);
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
}

const html = read('app/web/carre.html');
const page = read('app/web/js/carre-page.js');
const parcours = read('app/web/js/seb-parcours.js');
const qcm = read('app/web/qcmv1.0.html') + '\n' + read('app/web/js/qcm-runtime.js') + '\n' + read('app/web/js/qcm-runtime-ui.js') + '\n' + read('app/web/js/qcm-runtime-tail.js');

// Référence visuelle validée : PILOTE 20 (4 octobre 2026).
const protectedText = [
  '<title>Puzzle Gratte-ciel 4×4</title>',
  "background: url('imageqcm/gratteciel.png') center/cover no-repeat;",
  'data-kaloneo-page="carre"',
  'kaloneo-context-scenario carre-scenario',
  '📋 Règles du jeu',
  'Placez les chiffres <strong>1, 2, 3, 4</strong> dans chaque case',
  'Chaque chiffre doit apparaître <strong>une seule fois</strong> par ligne et par colonne',
  'Pour la rangée <strong>[2, 4, 3, 1]</strong>',
  'Cliquez sur <strong>"Valider"</strong> pour vérifier votre réponse',
  'Une fois terminé, cliquez sur <strong>"Suivant"</strong>',
  '<button class="btn btn-reset" id="carre-reset" type="button">🔄 Recommencer</button>',
  '<button class="btn btn-validate" id="btnValidate" type="button">✔️ Valider</button>',
  '<button class="btn btn-next" id="btnNext" type="button">Suivant</button>'
];
for (const token of protectedText) {
  if (!html.includes(token)) fail('contenu/visuel Puzzle PILOTE 20 modifié: ' + token);
}
if (!html.includes('css/kaloneo-context.css')) fail('contexte KALONÉO Puzzle absent');

if (!html.includes('<script src="js/seb-parcours.js"></script>') ||
    !html.includes('<script src="js/carre-page.js"></script>')) {
  fail('scripts modulaires Carré absents');
}
if (/onclick=["'][^"']*(?:validate|reset|goToNextPage)/i.test(html)) fail('ancien gestionnaire Carré inline réintroduit');
if (/function\s+(?:validate|reset|goToNextPage)\s*\(/.test(html)) fail('ancien moteur Carré réintroduit dans HTML');

for (const token of [
  'window.sebCarre = api;',
  'SEB_CARRE_LOCK95',
  "sessionStorage.setItem('puzzleErrors', String(errors));",
  "sessionStorage.setItem('carre_magique_score', String(score));",
  "sessionStorage.setItem('carre_magique_erreurs', String(errors));",
  "window.sebParcours.goNext('carre')",
  'Object.freeze([4, 3, 1, 2])',
  'Object.freeze([2, 4, 3, 1])',
  'Object.freeze([3, 1, 2, 4])',
  'Object.freeze([1, 2, 4, 3])',
  "testId:'gratte_ciel'",
  "postToKaltest('puzzle-answer'",
  "postToKaltest('action'"
]) {
  if (!page.includes(token)) fail('contrat Carré/KALTEST absent: ' + token);
}
if (/qcmv1\.0\.html/i.test(page)) fail('couplage direct Carré -> QCM réintroduit');

const carrePos = parcours.indexOf("id:'carre'");
const qcmPos = parcours.indexOf("id:'qcm-11'");
if (carrePos < 0 || qcmPos <= carrePos) fail('ordre Carré -> QCM page 11 absent');
for (const token of [
  "scoreStorage:'carre_magique_score'",
  "errorStorage:'carre_magique_erreurs'",
  "displayStorage:'puzzleErrors'"
]) {
  if (!parcours.includes(token)) fail('contrat Résultats Carré absent du registre: ' + token);
}

for (const token of [
  "sessionStorage.getItem('puzzleErrors')",
  "sessionStorage.setItem('carre_magique_score', score)",
  "sessionStorage.setItem('carre_magique_erreurs', erreurs)",
  "sessionStorage.getItem('carre_magique_erreurs')"
]) {
  if (!qcm.includes(token)) fail('page Résultats/Bilan ne récupère plus Carré: ' + token);
}

console.log('SEB EvalPro garde carré: visuel PILOTE 20, moteur /16, pont KALTEST et Résultats — OK.');
