'use strict';

const fs = require('fs');
const path = require('path');

const sebRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(sebRoot, '..');
const output = path.join(sebRoot, 'source', 'js', 'kaltest-pilot2-data.js');
const {syncFromMainInCi,loadOfficialOverrides}=require('./kaloneo-testsv1');
syncFromMainInCi(repoRoot);
const officialV1=loadOfficialOverrides(repoRoot,path.join(sebRoot,'source','kaltest','tests')).overrides;

const testPaths = [
  'seb-evalpro/source/kaltest/tests/calculs-commandes-atelier/1.0.0/test.json',
  'seb-evalpro/source/kaltest/tests/calculs-poids-volumes/1.0.0/test.json',
  'seb-evalpro/source/kaltest/tests/horaires-reception-controle/1.0.0/test.json',
  'seb-evalpro/source/kaltest/tests/texte-a-trous-stage-logistique/1.0.0/test.json',
  'seb-evalpro/source/kaltest/tests/fractions-preparation-lots/1.0.0/test.json',
  'seb-evalpro/source/kaltest/tests/organisation-demenagement/1.0.0/test.json',
  'seb-evalpro/source/kaltest/tests/gestes-postures/1.0.0/test.json',
  'seb-evalpro/source/kaltest/tests/conversions-atelier-expedition/1.0.0/test.json',
  'seb-evalpro/source/kaltest/tests/autoevaluation-savoirs/1.0.0/test.json',
  'seb-evalpro/source/kaltest/tests/transition-video-f1/1.0.0/test.json',
  'seb-evalpro/source/kaltest/tests/construction-briques/1.0.0/test.json',
  'seb-evalpro/source/kaltest/tests/ranger-stock/1.0.0/test.json',
  'seb-evalpro/source/kaltest/tests/planning-cantine/1.0.0/test.json',
  'tests/fixtures/kaltests/genre-nombre/1.0.0/test.json',
  'seb-evalpro/source/kaltest/tests/dictee-professionnelle/1.0.0/test.json',
  'seb-evalpro/source/kaltest/tests/tri-chevilles/1.0.0/test.json',
  'seb-evalpro/source/kaltest/tests/traitement-texte-bureautique/1.0.0/test.json',
  'seb-evalpro/source/kaltest/tests/redaction-email/1.0.0/test.json',
  'seb-evalpro/source/kaltest/tests/autoevaluation-tic/1.0.0/test.json',
  'tests/fixtures/kaltests/paronymes-rapport/1.0.0/test.json',
  'seb-evalpro/source/kaltest/tests/gratte-ciel/1.0.0/test.json',
  'seb-evalpro/source/kaltest/tests/fin-parcours/1.0.0/test.json'
];

const tests = testPaths.map(relative => {
  const file = path.join(repoRoot, relative);
  if (!fs.existsSync(file)) throw new Error('KALTEST absent : ' + relative);
  const baseline=JSON.parse(fs.readFileSync(file, 'utf8'));
  return officialV1.get(baseline.id)?.definition || baseline;
});

const ids = tests.map(test => test.id);
if (new Set(ids).size !== ids.length) throw new Error('Identifiant KALTEST dupliqué.');

const payload = {
  format: 'seb-kaltest-pilot2-data',
  generatedFrom: testPaths,
  parcours: {
    id: 'kaloneo-parcours-migre',
    title: 'Parcours KALONÉO',
    tests: tests.map(test => ({ id:test.id, version:test.version }))
  },
  tests
};

fs.mkdirSync(path.dirname(output), { recursive:true });
fs.writeFileSync(
  output,
  'window.sebKaltestPilot2Data = Object.freeze(' + JSON.stringify(payload, null, 2) + ');\n',
  'utf8'
);

console.log('KALTEST_PILOT2_DATA: OK — ' + tests.length + ' tests, TESTS_V1: '+officialV1.size);
