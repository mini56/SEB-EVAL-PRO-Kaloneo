'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const registryPath = path.join(root, 'seb-evalpro/source/js/seb-parcours.js');
const matrixPath = path.join(__dirname, 'legacy-parcours-build20.json');

const registrySource = fs.readFileSync(registryPath, 'utf8');
const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));

const ids = [...registrySource.matchAll(/\bid\s*:\s*'([^']+)'/g)].map(match => match[1]);
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
if (migrated.length !== 1 || migrated[0].id !== 'qcm-2') {
  throw new Error('La première migration attendue doit être qcm-2 uniquement à ce stade.');
}

console.log('LEGACY_PARCOURS_BUILD20_COVERAGE: OK — 24/24 étapes suivies');
console.log('FIRST_MIGRATED_CONTRACT: qcm-2 -> calculs_commandes_atelier');
