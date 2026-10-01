'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const sourceTest = JSON.parse(fs.readFileSync(
  path.join(root, 'source/kaltest/tests/calculs-commandes-atelier/1.0.0/test.json'),
  'utf8'
));
const sourceCatalog = JSON.parse(fs.readFileSync(
  path.join(root, 'source/kaltest/catalog/bilan-seb-v1.json'),
  'utf8'
));
const embeddedSource = fs.readFileSync(
  path.join(root, 'source/js/kaltest-pilot-data.js'),
  'utf8'
);

const sandbox = { window:{} };
vm.createContext(sandbox);
vm.runInContext(embeddedSource, sandbox);

assert.deepStrictEqual(
  JSON.parse(JSON.stringify(sandbox.window.sebKaltestPilotDefinitions.test)),
  sourceTest
);
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(sandbox.window.sebKaltestPilotDefinitions.bilanCatalog)),
  sourceCatalog
);

console.log('KALTEST_PILOT_DATA_CONSISTENCY: OK');
