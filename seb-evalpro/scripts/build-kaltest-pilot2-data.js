'use strict';

const fs = require('fs');
const path = require('path');

const sebRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(sebRoot, '..');
const output = path.join(sebRoot, 'source', 'js', 'kaltest-pilot2-data.js');

const fixturePaths = [
  'tests/fixtures/kaltests/calculs-commandes-atelier/1.0.0/test.json',
  'tests/fixtures/kaltests/calculs-poids-volumes/1.0.0/test.json',
  'tests/fixtures/kaltests/horaires-reception-controle/1.0.0/test.json',
  'tests/fixtures/kaltests/texte-a-trous-stage-logistique/1.0.0/test.json',
  'tests/fixtures/kaltests/conversions-atelier-expedition/1.0.0/test.json',
  'tests/fixtures/kaltests/genre-nombre/1.0.0/test.json',
  'tests/fixtures/kaltests/paronymes-rapport/1.0.0/test.json'
];

const tests = fixturePaths.map(relative => {
  const file = path.join(repoRoot, relative);
  if (!fs.existsSync(file)) throw new Error('Fixture Pilot 2 absente : ' + relative);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
});

const ids = tests.map(test => test.id);
if (new Set(ids).size !== ids.length) throw new Error('Identifiant KALTEST dupliqué dans le Pilot 2.');

const payload = {
  format: 'seb-kaltest-pilot2-data',
  generatedFrom: fixturePaths,
  parcours: {
    id: 'pilot2-migrations-simples',
    title: 'Parcours pilote KALTEST — migrations simples',
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

console.log('KALTEST_PILOT2_DATA: OK — ' + tests.length + ' tests');
