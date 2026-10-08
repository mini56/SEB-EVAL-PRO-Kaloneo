const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function fail(message) {
  console.error('SEB EvalPro garde contexte KALONÉO: ' + message);
  process.exit(2);
}
function read(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) fail('fichier introuvable: ' + rel);
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
}

const css = read('app/web/css/kaloneo-context.css');
for (const token of [
  '.kaloneo-context-card',
  '.kaloneo-context-scenario',
  '.kaloneo-context-consigne',
  '.kaloneo-context-label',
  '--kaloneo-context-blue',
  'font-family:var(--kaloneo-context-font)',
  'font-weight:700'
]) if (!css.includes(token)) fail('règle commune absente: ' + token);

// Stock est volontairement une page historique pleine page dans KALTEST.
// Son visuel Build #20 est protégé séparément : on ne lui impose plus
// le composant de contexte moderne qui avait provoqué la régression visuelle.
const pages = [
  'kaltest-pilot2.html',
  'brique.html',
  'dictee.html',
  'tri_de_cheville.html',
  'planning.html',
  'qcmv1.0.html',
  'nwtexte.html',
  'nvmail.html'
];

for (const page of pages) {
  const html = read('app/web/' + page);
  if (!html.includes('css/kaloneo-context.css')) fail('composant contexte non chargé dans ' + page);
}

for (const page of ['kaltest-pilot2.html','brique.html','dictee.html','qcmv1.0.html','nwtexte.html','nvmail.html']) {
  const html = read('app/web/' + page);
  if (!html.includes('kaloneo-context-scenario')) fail('bloc Scénario commun absent dans ' + page);
  if (!html.includes('kaloneo-context-consigne')) fail('bloc Consigne commun absent dans ' + page);
}

const stock = read('app/web/stock.html');
for (const token of [
  '<title>Jeu de Rangement de Pots</title>',
  'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);',
  'id="pots-source"',
  'id="zone-tri"',
  'id="stockActionBtn"',
  '🔍 Vérifier'
]) {
  if (!stock.includes(token)) fail('visuel historique Stock modifié: ' + token);
}
if (stock.includes('css/kaloneo-context.css') || stock.includes('kaloneo-context-scenario')) {
  fail('habillage contexte moderne réintroduit dans Stock historique');
}

const forbidden = [
  /<strong[^>]*style=["'][^"']*color\s*:\s*#1a73e8[^"']*["'][^>]*>Scénario\s*:/i,
  /<strong[^>]*style=["'][^"']*color\s*:\s*#1a73e8[^"']*["'][^>]*>Consigne/i
];
for (const page of pages.filter(name => name !== 'qcmv1.0.html')) {
  const html = read('app/web/' + page);
  for (const re of forbidden) if (re.test(html)) fail('ancien style local Scénario/Consigne réintroduit dans ' + page);
}

console.log('SEB EvalPro garde contexte KALONÉO: composant partagé conservé, Stock historique explicitement protégé — OK.');
