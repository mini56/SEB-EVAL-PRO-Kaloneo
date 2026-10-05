const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

function fail(message) {
  console.error('SEB EvalPro garde parcours: ' + message);
  process.exit(2);
}

function read(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) fail('fichier introuvable: ' + rel);
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
}

const source = read('app/web/js/seb-parcours.js');
const sandbox = { window:{ location:{ href:'' } }, encodeURIComponent };
vm.runInNewContext(source, sandbox, { filename:'seb-parcours.js' });

const api = sandbox.window.sebParcours;
if (!api || !Array.isArray(api.steps) || !Array.isArray(api.legacySteps) || !Array.isArray(api.pilot11Steps)) {
  fail('API sebParcours absente ou invalide');
}
if (api.mode !== 'legacy') fail('mode par défaut du registre différent de legacy');

const expectedIds = [
  'qcm-1','qcm-2','qcm-2_1','qcm-3','qcm-texte-trous','qcm-4','qcm-5','qcm-5_1','qcm-6',
  'autoeval1','introbrique','brique','stock','planning','genrenombres','dictee','tri-de-cheville',
  'nwtexte','nvmail','autoeval2','paronymes','carre','qcm-11','qcm-finale'
];

const ids = Array.from(api.steps, (step) => String(step.id));
if (JSON.stringify(ids) !== JSON.stringify(expectedIds)) {
  fail('ordre du parcours historique validé modifié: ' + JSON.stringify(ids));
}
if (new Set(ids).size !== ids.length) fail('identifiant de parcours historique dupliqué');

const pilot11ExpectedIds = [
  'kaltest-initial','qcm-4','qcm-5','qcm-5_1','qcm-6',
  'autoeval1','introbrique','brique','stock','planning','genrenombres','dictee',
  'tri-de-cheville','nwtexte','nvmail','autoeval2','paronymes','carre','qcm-11','qcm-finale'
];
const pilot11Ids = Array.from(api.pilot11Steps, (step) => String(step.id));
if (JSON.stringify(pilot11Ids) !== JSON.stringify(pilot11ExpectedIds)) {
  fail('ordre PILOTE 11 incorrect: ' + JSON.stringify(pilot11Ids));
}
if (new Set(pilot11Ids).size !== pilot11Ids.length) fail('identifiant PILOTE 11 dupliqué');

const pilot11ById = new Map(Array.from(api.pilot11Steps, step => [String(step.id), step]));
const expectedPilotRoutes = {
  'kaltest-initial':'kaltest-pilot2.html?fullParcours=1',
  'qcm-4':'kaltest-pilot2.html?fullParcours=1&segment=fractions',
  'qcm-5':'kaltest-pilot2.html?fullParcours=1&segment=organisation',
  'qcm-5_1':'kaltest-pilot2.html?fullParcours=1&segment=postures',
  'qcm-6':'kaltest-pilot2.html?fullParcours=1&segment=conversions',
  'autoeval1':'kaltest-pilot2.html?fullParcours=1&segment=autoeval1',
  'stock':'kaltest-pilot2.html?fullParcours=1&segment=stock',
  'planning':'kaltest-pilot2.html?fullParcours=1&segment=planning',
  'genrenombres':'kaltest-pilot2.html?fullParcours=1&segment=genre-nombre',
  'nvmail':'kaltest-pilot2.html?fullParcours=1&segment=mail',
  'autoeval2':'kaltest-pilot2.html?fullParcours=1&segment=autoeval2',
  'paronymes':'kaltest-pilot2.html?fullParcours=1&segment=paronymes',
  'carre':'kaltest-pilot2.html?fullParcours=1&segment=carre'
};
for (const [id, expectedUrl] of Object.entries(expectedPilotRoutes)) {
  const step = pilot11ById.get(id);
  if (!step) fail('étape PILOTE 11 absente: ' + id);
  const query = Object.entries(step.query || {})
    .map(([key,value]) => encodeURIComponent(key) + '=' + encodeURIComponent(String(value)))
    .join('&');
  const url = step.file + (query ? '?' + query : '');
  if (url !== expectedUrl) fail('route PILOTE 11 incorrecte pour ' + id + ': ' + url);
}
for (const removed of ['qcm-1','qcm-2','qcm-2_1','qcm-3','qcm-texte-trous']) {
  if (pilot11Ids.includes(removed)) fail('ancienne page dupliquée dans PILOTE 11: ' + removed);
}

for (const step of [...api.legacySteps, ...api.pilot11Steps]) {
  if (!step.file || !/\.html(?:$|[?#])/i.test(String(step.file))) {
    fail('fichier de parcours invalide pour ' + step.id);
  }
  const localFile = path.join(root, 'app', 'web', String(step.file).split(/[?#]/)[0]);
  if (!fs.existsSync(localFile)) fail('page de parcours absente: ' + step.file);
}

// Dictée obligatoire entre Genre/Nombre et Tri.
if (api.nextFile('genrenombres') !== 'dictee.html') fail('genrenombres -> dictee modifié');
if (api.nextFile('dictee') !== 'tri_de_cheville.html') fail('dictee -> tri modifié');
const dicteeContract = api.resultContractFor('dictee');
if (!dicteeContract || dicteeContract.storage !== 'dictee_data') fail('contrat Résultats dictée modifié');

// Ordre actuellement validé autour du traitement de texte.
if (api.nextFile('tri-de-cheville') !== 'nwtexte.html') fail('tri -> nwtexte modifié');
if (api.nextUrl('nwtexte') !== 'kaltest-pilot2.html?fullParcours=1&segment=mail') fail('nwtexte -> mail KALTEST modifié');
if (api.nextUrl('nvmail') !== 'kaltest-pilot2.html?fullParcours=1&segment=autoeval2') fail('mail KALTEST -> autoeval2 modifié');

// Retour du carré vers la page 11 du QCM, puis page de fin.
if (api.nextUrl('carre') !== 'qcmv1.0.html?fullParcours=1&page=11#page11') fail('carre KALTEST -> QCM page 11 modifié');
if (api.nextUrl('qcm-11') !== 'qcmv1.0.html?page=finale#pageFinale') fail('QCM page 11 -> fin modifié');

// Le contrat Résultats historique nwtexte doit rester lisible sans renommage.
const nw = api.resultContractFor('nwtexte');
if (!nw || nw.scoreStorage !== 'scores_data' || nw.scoreKey !== 'page7' ||
    nw.responseStorage !== 'reponses_data' || nw.responseKey !== 'page7_analyse') {
  fail('contrat Résultats nwtexte modifié');
}
const mail = api.resultContractFor('nvmail');
if (!mail || mail.storage !== 'page8_data' || mail.scoreKey !== 'score_total') {
  fail('contrat Résultats nvmail modifié');
}

// Vérification directe de la page Résultats générée.
const qcm = read('app/web/qcmv1.0.html') + '\n' + read('app/web/js/qcm-runtime.js') + '\n' + read('app/web/js/qcm-runtime-ui.js') + '\n' + read('app/web/js/qcm-runtime-tail.js');
for (const token of [
  "if (reponses['page7_analyse'])",
  "scores['page7']",
  'const scoreMax = 8;',
  'Enregistrement conforme',
  "sessionStorage.getItem('page8_data')"
]) {
  if (!qcm.includes(token)) fail('récupération Résultats absente: ' + token);
}

// Le pilote nwtexte doit continuer à naviguer par identifiant et jamais connaître nvmail.
const nwPage = read('app/web/js/nwtexte-page.js');
if (!nwPage.includes("sebParcours.goNext('nwtexte')")) fail('nwtexte ne passe plus par le registre');
if (/nvmail\.html/i.test(nwPage)) fail('couplage direct nwtexte -> nvmail réintroduit');

console.log('SEB EvalPro garde parcours: parcours historique + PILOTE 11 ordonné sans doublons, destinations et contrats Résultats — OK.');
