'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');

function fail(message) {
  console.error('KALTEST_BILAN_LEVELS_GUARD: FAIL — ' + message);
  process.exit(2);
}
function read(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) fail('fichier absent : ' + rel);
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
}
function json(rel) {
  return JSON.parse(read(rel));
}

const catalog = json('kaltest-contract/catalog/bilan-seb-v1.json');
const lineIds = new Set();
for (const definition of catalog.definitions || []) {
  for (const line of definition.lines || []) {
    if (!line.id) fail('ligne Bilan sans identifiant');
    lineIds.add(line.id);
    const comments = line.comments || {};
    for (const level of ['NE','I','II','III']) {
      if (!Object.prototype.hasOwnProperty.call(comments, level)) {
        fail('niveau ' + level + ' absent de ' + line.id);
      }
    }
    if (line.mode === 'automatic' && !line.evaluation) {
      fail('règle d’évaluation absente de ' + line.id);
    }
  }
}

const html = read('seb-evalpro/overrides/admin-bilan.html');
for (const token of ['>NE<','>I<','>II<','>III<','data-l="NE"','data-l="I"','data-l="II"','data-l="III"']) {
  if (!html.includes(token)) fail('niveau Bilan absent de la page admin : ' + token);
}

const runtime = read('seb-evalpro/source/js/admin-bilan-runtime.js');
for (const token of [
  "const colours={NE:['#CCFFFF','#000000'],I:['#92D050','#000000'],II:['#ED7D31','#FFFFFF'],III:['#C00000','#FFFFFF']}",
  "if(Object.hasOwn(sc,'page4')){hp=true;pr+=+sc.page4||0}",
  "const p=Math.round(pr/27*100);apply('math-problemes',p>=70?'I':p>=45?'II':'III'",
  "combined>=20?'I':combined>=17?'II':'III'",
  'errors=23-combined'
]) {
  if (!runtime.includes(token)) fail('règle historique du Bilan modifiée ou absente : ' + token);
}

const matrix = json('tests/migration/legacy-parcours-build20.json');
for (const step of matrix.steps || []) {
  if (step.status !== 'contract-fixture-ready') continue;
  const fixture = json(step.fixturePath);
  for (const contribution of fixture.bilanContributions || []) {
    if (!lineIds.has(contribution.lineId)) {
      fail('contribution Bilan inconnue dans ' + step.targetTestId + ' : ' + contribution.lineId);
    }
  }
}

const expected = {
  fractions_preparation_lots:'bilan.savoirs_fondamentaux.mathematiques.resoudre_problemes',
  organisation_demenagement:'bilan.competences_techniques.planning.repartition_taches',
  ranger_stock:'bilan.competences_techniques.gestion_logistique.classement_multicritere',
  planning_cantine:'bilan.competences_techniques.planning.repartition_taches',
  redaction_email:'bilan.tic.messagerie.echanger',
  gratte_ciel:'bilan.competences_techniques.carre_magique.resolution_contraintes'
};
for (const [testId,lineId] of Object.entries(expected)) {
  const step = (matrix.steps || []).find(item => item.targetTestId === testId);
  if (!step) fail('test migré absent de la matrice : ' + testId);
  const fixture = json(step.fixturePath);
  if (!(fixture.bilanContributions || []).some(item => item.lineId === lineId)) {
    fail('raccordement Bilan perdu pour ' + testId + ' -> ' + lineId);
  }
}

for (const testId of ['gestes_postures','autoevaluation_savoirs','autoevaluation_tic']) {
  const step = (matrix.steps || []).find(item => item.targetTestId === testId);
  if (!step) fail('test migré absent de la matrice : ' + testId);
  const fixture = json(step.fixturePath);
  if ((fixture.bilanContributions || []).length !== 0) {
    fail('contribution Bilan inventée pour ' + testId);
  }
}

console.log('KALTEST_BILAN_LEVELS_GUARD: OK — NE / I / II / III conservés');
console.log('KALTEST_BILAN_DEPENDENCIES: OK — contributions migrées raccordées aux lignes existantes');
console.log('KALTEST_BILAN_THRESHOLDS: OK — Mathématiques 70/45, Planning 20/17 et total 23 conservés');
