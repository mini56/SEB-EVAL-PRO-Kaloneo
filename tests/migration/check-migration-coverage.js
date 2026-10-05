'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const registryPath = path.join(root, 'seb-evalpro/source/js/seb-parcours.js');
const matrixPath = path.join(__dirname, 'legacy-parcours-build20.json');

const registrySource = fs.readFileSync(registryPath, 'utf8');
const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));

const legacyStart = registrySource.indexOf('const legacySteps');
const legacyEnd = registrySource.indexOf('function legacyStep', legacyStart);
if (legacyStart < 0 || legacyEnd < 0) throw new Error('Bloc legacySteps introuvable dans seb-parcours.js');
const legacyRegistrySource = registrySource.slice(legacyStart, legacyEnd);
const ids = [...legacyRegistrySource.matchAll(/\bid\s*:\s*'([^']+)'/g)].map(match => match[1]);
const uniqueRegistryIds = [...new Set(ids)];
const matrixIds = (matrix.steps || []).map(step => step.id);

if (uniqueRegistryIds.length !== 24) {
  throw new Error(`Le registre Build #20 devrait contenir 24 étapes, trouvé : ${uniqueRegistryIds.length}`);
}

const missing = uniqueRegistryIds.filter(id => !matrixIds.includes(id));
const extra = matrixIds.filter(id => !uniqueRegistryIds.includes(id));
const duplicates = matrixIds.filter((id, index) => matrixIds.indexOf(id) !== index);

if (missing.length) throw new Error('Étapes absentes de la matrice : ' + missing.join(', '));
if (extra.length) throw new Error('Étapes inconnues dans la matrice : ' + extra.join(', '));
if (duplicates.length) throw new Error('Étapes dupliquées dans la matrice : ' + [...new Set(duplicates)].join(', '));

const migrated = (matrix.steps || []).filter(step => step.status === 'contract-fixture-ready');
const migratedIds = migrated.map(step => step.id);
const expectedMigrated = [
  'qcm-2',
  'qcm-2_1',
  'qcm-3',
  'qcm-texte-trous',
  'qcm-4',
  'qcm-5',
  'qcm-5_1',
  'qcm-6',
  'autoeval1',
  'stock',
  'planning',
  'genrenombres',
  'autoeval2',
  'paronymes',
  'carre'
];
if (JSON.stringify(migratedIds) !== JSON.stringify(expectedMigrated)) {
  throw new Error(
    'Migrations contractuelles attendues : ' + expectedMigrated.join(', ') +
    ' ; trouvé : ' + migratedIds.join(', ')
  );
}

for (const step of migrated) {
  if (!step.targetTestId) throw new Error('targetTestId manquant pour ' + step.id);
  if (!step.fixturePath) throw new Error('fixturePath manquant pour ' + step.id);
  const fixture = path.join(root, step.fixturePath);
  if (!fs.existsSync(fixture)) throw new Error('Fixture KALTEST absente pour ' + step.id + ' : ' + fixture);

  const fixtureJson = JSON.parse(fs.readFileSync(fixture, 'utf8'));
  if (fixtureJson.id !== step.targetTestId) {
    throw new Error(
      'Fixture KALTEST incohérente pour ' + step.id +
      ' : id attendu ' + step.targetTestId + ', trouvé ' + fixtureJson.id
    );
  }
}

console.log('LEGACY_PARCOURS_BUILD20_COVERAGE: OK — 24/24 étapes historiques suivies');
console.log('MIGRATED_CONTRACTS: ' + migrated.map(step => step.id + ' -> ' + step.targetTestId).join(' | '));
