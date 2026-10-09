'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

function fail(message, detail) {
  console.error('KALTEST_ELEVEN_IMAGES_GUARD: FAIL — ' + message);
  if (detail) console.error(typeof detail === 'string' ? detail : JSON.stringify(detail, null, 2));
  process.exit(2);
}
function read(folder) {
  return JSON.parse(fs.readFileSync(path.join(root,'source','kaltest','tests',folder,'1.0.0','test.json'),'utf8'));
}
function get(obj, pathParts) {
  return pathParts.reduce((value,key)=>value?.[key], obj);
}
const expected = [
  ['calculs-commandes-atelier',['presentation','kaloneoLayout','right','src'],'imageqcm/kaloneo-calculs-commandes-atelier.webp'],
  ['calculs-poids-volumes',['presentation','kaloneoLayout','right','src'],'imageqcm/kaloneo-calculs-poids-volumes.webp'],
  ['horaires-reception-controle',['presentation','kaloneoLayout','left','src'],'imageqcm/kaloneo-reception-controle-horaires.webp'],
  ['conversions-atelier-expedition',['presentation','kaloneoLayout','right','src'],'imageqcm/kaloneo-conversions-atelier-expedition.webp'],
  ['texte-a-trous-stage-logistique',['presentation','kaloneoLayout','left','src'],'imageqcm/kaloneo-texte-trous-stage-logistique.webp'],
  ['fractions-preparation-lots',['presentation','fractionSelection','visual','src'],'imageqcm/kaloneo-fractions-proportions.webp'],
  ['organisation-demenagement',['presentation','organisationList','visual','src'],'imageqcm/kaloneo-organisation-demenagement.webp'],
  ['planning-cantine',['presentation','planningGrid','backgroundImage'],'imageqcm/kaloneo-planning-restaurant.webp'],
  ['autoevaluation-savoirs',['presentation','autoevaluationForm','visual','src'],'imageqcm/kaloneo-autoevaluation-savoirs.webp'],
  ['autoevaluation-tic',['presentation','autoevaluationForm','visual','src'],'imageqcm/kaloneo-autoevaluation-tic.webp'],
  ['construction-briques',['presentation','bricksStation','image'],'imageqcm/kaloneo-lego-f1-orange.webp']
];
for (const [folder, fieldPath, src] of expected) {
  const test = read(folder);
  const actual = get(test, fieldPath);
  if (actual !== src) fail(folder + ' : image non raccordée.', {expected:src,actual});
  const asset = path.join(root,'source',...src.split('/'));
  if (!fs.existsSync(asset)) fail(folder + ' : fichier image absent.', asset);
  if (fs.statSync(asset).size < 3000) fail(folder + ' : fichier image anormalement petit.', fs.statSync(asset).size);
}
for (const folder of expected.map(item=>item[0])) {
  const generator = fs.readFileSync(path.join(root,'scripts','build-kaltest-pilot2-data.js'),'utf8');
  const canonical = "'seb-evalpro/source/kaltest/tests/" + folder + "/1.0.0/test.json'";
  if (!generator.includes(canonical)) fail(folder + ' : le générateur candidat ne lit pas la définition canonique.');
}
for (const folder of ['calculs-commandes-atelier','calculs-poids-volumes']) {
  const test=read(folder);
  const layout=test.presentation?.kaloneoLayout;
  if (layout?.type !== 'questions-table-visual' || layout?.ratio !== '60/40' ||
      JSON.stringify(layout?.left?.order) !== JSON.stringify(['questions','responseTable'])) {
    fail(folder + ' : le gabarit texte/questions/tableau à gauche + image à droite n’est pas verrouillé.');
  }
}
console.log('KALTEST_ELEVEN_IMAGES_GENERATOR=CANONICAL');
console.log('KALTEST_ELEVEN_IMAGES_LAYOUTS=OK');
console.log('KALTEST_ELEVEN_IMAGES_GUARD=OK');
