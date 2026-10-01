'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const {
  validateBilanDefinition,
  validateBilanCatalog,
  validateTestDefinition,
  bilanEffectOfExercise,
  aggregateLine,
  resolveLevel
} = require('../src/validate');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.resolve(__dirname, relativePath), 'utf8'));
}

const catalog = readJson('../catalog/bilan-seb-v1.json');
const catalogResult = validateBilanCatalog(catalog);
assert.deepStrictEqual(catalogResult, { ok: true, errors: [] });

const allLines = catalog.definitions.flatMap(definition => definition.lines || []);
assert.strictEqual(catalog.definitions.length, 10);
assert.strictEqual(allLines.length, 17);
assert.strictEqual(allLines.filter(line => line.mode === 'manual').length, 5);
assert.strictEqual(allLines.filter(line => line.mode === 'automatic').length, 12);

for (const definition of catalog.definitions) {
  assert.deepStrictEqual(validateBilanDefinition(definition), { ok: true, errors: [] });
}

const lineById = new Map(allLines.map(line => [line.id, line]));

const migratedSimpleTest = readJson('../../tests/fixtures/kaltests/calculs-commandes-atelier/1.0.0/test.json');
assert.deepStrictEqual(
  validateTestDefinition(migratedSimpleTest, catalog.definitions),
  { ok: true, errors: [] }
);
assert.strictEqual(migratedSimpleTest.questions.length, 5);
assert.deepStrictEqual(
  migratedSimpleTest.questions.map(question => question.acceptedAnswers[0]),
  ['1020', '1250', '60', '525', '8']
);

const mathLine = lineById.get('bilan.savoirs_fondamentaux.mathematiques.comprendre_enonce_consigne');
assert.ok(mathLine);

const mathAggregate = aggregateLine(mathLine, [
  { nonEvaluated: false, values: { score: 3, score_max: 5 } },
  { nonEvaluated: false, values: { score: 4, score_max: 5 } }
]);
assert.strictEqual(mathAggregate.status, 'EVALUATED');
assert.strictEqual(mathAggregate.metrics.score, 7);
assert.strictEqual(mathAggregate.metrics.score_max, 10);
assert.strictEqual(mathAggregate.metrics.pourcentage, 70);
assert.strictEqual(resolveLevel(mathLine, mathAggregate), 'I');

const oneExerciseIgnored = aggregateLine(mathLine, [
  { nonEvaluated: false, values: { score: 3, score_max: 5 } },
  { nonEvaluated: true, values: { score: 5, score_max: 5 } }
]);
assert.strictEqual(oneExerciseIgnored.metrics.score, 3);
assert.strictEqual(oneExerciseIgnored.metrics.score_max, 5);
assert.strictEqual(oneExerciseIgnored.metrics.pourcentage, 60);
assert.strictEqual(resolveLevel(mathLine, oneExerciseIgnored), 'II');

const allIgnored = aggregateLine(mathLine, [
  { nonEvaluated: true, values: { score: 5, score_max: 5 } }
]);
assert.deepStrictEqual(allIgnored, { status: 'NE', metrics: {} });
assert.strictEqual(resolveLevel(mathLine, allIgnored), 'NE');

const triTimeLine = lineById.get('bilan.competences_techniques.tri_chevilles.temps');
const triAggregate = aggregateLine(triTimeLine, [
  { nonEvaluated: false, values: { temps_moyen: 730 } }
]);
assert.strictEqual(resolveLevel(triTimeLine, triAggregate), 'II');

const manualLine = lineById.get('bilan.competences_techniques.fabrication.plan');
assert.strictEqual(resolveLevel(manualLine, { status: 'EVALUATED', metrics: {} }), null);

const brokenTest = JSON.parse(JSON.stringify(migratedSimpleTest));
delete brokenTest.bilanContributions[0].bindings.score;
const brokenResult = validateTestDefinition(brokenTest, catalog.definitions);
assert.strictEqual(brokenResult.ok, false);
assert.ok(brokenResult.errors.some(error => error.message.includes('liaison obligatoire manquante')));

const brokenTemplateDefinition = JSON.parse(JSON.stringify(catalog.definitions.find(
  definition => definition.id === 'bilan.competences_techniques.tri_chevilles'
)));
brokenTemplateDefinition.lines[0].displayTemplates[0].template = 'Temps {{variable_inconnue}}';
const brokenTemplateResult = validateBilanDefinition(brokenTemplateDefinition);
assert.strictEqual(brokenTemplateResult.ok, false);
assert.ok(brokenTemplateResult.errors.some(error => error.message.includes('variable dynamique inconnue')));

assert.deepStrictEqual(
  bilanEffectOfExercise({ abandoned: true, nonEvaluated: false, earned: 4, maximum: 10 }),
  {
    status: 'ABANDON_EVALUE',
    includeInCalculation: true,
    earned: 4,
    maximum: 10
  }
);

assert.deepStrictEqual(
  bilanEffectOfExercise({ abandoned: true, nonEvaluated: true, earned: 4, maximum: 10 }),
  {
    status: 'NE',
    includeInCalculation: false,
    earned: 0,
    maximum: 0
  }
);

console.log('BILAN_CATALOG_BUILD20: OK — 10 définitions / 17 lignes');
console.log('KALTEST_FIRST_SIMPLE_MIGRATION: OK — calculs_commandes_atelier 1.0.0');
console.log('MULTI_TEST_AGGREGATION: OK — sommes score / score_max');
console.log('DYNAMIC_BILAN_FIELDS: OK');
console.log('ABANDON_WITH_POINTS: OK');
console.log('ABANDON_NON_EVALUE_NE: OK');
