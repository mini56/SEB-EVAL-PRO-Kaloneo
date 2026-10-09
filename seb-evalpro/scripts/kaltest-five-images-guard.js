'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function fail(message, detail) {
  console.error('KALTEST_FIVE_IMAGES_GUARD: FAIL — ' + message);
  if (detail) console.error(typeof detail === 'string' ? detail : JSON.stringify(detail, null, 2));
  process.exit(2);
}

const expected = [
  ['calculs-poids-volumes','right','imageqcm/kaloneo-calculs-poids-volumes.webp'],
  ['calculs-commandes-atelier','right','imageqcm/kaloneo-calculs-commandes-atelier.webp'],
  ['horaires-reception-controle','left','imageqcm/kaloneo-reception-controle-horaires.webp'],
  ['conversions-atelier-expedition','right','imageqcm/kaloneo-conversions-atelier-expedition.webp'],
  ['texte-a-trous-stage-logistique','left','imageqcm/kaloneo-texte-trous-stage-logistique.webp']
];

for (const [folder, side, src] of expected) {
  const testFile = path.join(root, 'source', 'kaltest', 'tests', folder, '1.0.0', 'test.json');
  const test = JSON.parse(fs.readFileSync(testFile, 'utf8'));
  const configured = test.presentation?.kaloneoLayout;
  if (!configured) fail(folder + ' : kaloneoLayout absent.');
  if (configured?.[side]?.src !== src) {
    fail(folder + ' : image non raccordée au bon bloc.', { expected:src, actual:configured?.[side]?.src });
  }
  const asset = path.join(root, 'source', ...src.split('/'));
  if (!fs.existsSync(asset)) fail(folder + ' : fichier image absent.', asset);
  if (fs.statSync(asset).size < 3000) fail(folder + ' : fichier image anormalement petit.', fs.statSync(asset).size);
}

const orders = JSON.parse(fs.readFileSync(
  path.join(root,'source','kaltest','tests','calculs-commandes-atelier','1.0.0','test.json'),'utf8'
));
if (orders.presentation?.kaloneoLayout?.type !== 'questions-table-visual' ||
    orders.presentation?.kaloneoLayout?.ratio !== '60/40' ||
    JSON.stringify(orders.presentation?.kaloneoLayout?.left?.order) !== JSON.stringify(['questions','responseTable'])) {
  fail('Calculs de commandes : la mise en page cible questions + tableau / image n’est pas verrouillée.');
}

console.log('KALTEST_FIVE_IMAGES_GUARD=OK');
console.log('KALTEST_FIVE_IMAGES_LAYOUTS=OK');
