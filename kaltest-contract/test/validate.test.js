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

const {
  DEFAULT_SUPPORTED_FEATURES,
  checkSebCompatibility,
  validateMediaDescriptor,
  validateTransitionDefinition,
  validatePackageSize
} = require('../src/compatibility');

const {
  parseDurationFr,
  evaluateQuestion,
  evaluateTest
} = require('../src/evaluate-questionnaire');

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

const migratedSecondMathTest = readJson('../../tests/fixtures/kaltests/calculs-poids-volumes/1.0.0/test.json');
assert.deepStrictEqual(
  validateTestDefinition(migratedSecondMathTest, catalog.definitions),
  { ok: true, errors: [] }
);
assert.deepStrictEqual(
  migratedSecondMathTest.questions.map(question => question.acceptedAnswers[0]),
  ['10', '75', '12', '24', '165']
);

const migratedTableTest = readJson('../../tests/fixtures/kaltests/genre-nombre/1.0.0/test.json');
assert.deepStrictEqual(
  validateTestDefinition(migratedTableTest, catalog.definitions),
  { ok: true, errors: [] }
);
assert.strictEqual(migratedTableTest.questions.length, 20);
assert.strictEqual(migratedTableTest.presentation.layout.ratio, '50/50');

const migratedHoraires = readJson('../../tests/fixtures/kaltests/horaires-reception-controle/1.0.0/test.json');
assert.deepStrictEqual(
  validateTestDefinition(migratedHoraires, catalog.definitions),
  { ok: true, errors: [] }
);
assert.strictEqual(migratedHoraires.questions.length, 14);
assert.strictEqual(parseDurationFr('9h15'), 555);
assert.strictEqual(parseDurationFr('9 heures 15 min'), 555);
assert.strictEqual(parseDurationFr('1 heure 03 minutes'), 63);
assert.strictEqual(evaluateQuestion(migratedHoraires.questions[0], '9:15'), true);
assert.strictEqual(evaluateQuestion(migratedHoraires.questions[12], '31 min'), true);
const horairesAnswers = Object.fromEntries(
  migratedHoraires.questions.map(question => [question.id, question.acceptedMinutes + ' min'])
);
const horairesPerfect = evaluateTest(migratedHoraires, horairesAnswers);
assert.strictEqual(horairesPerfect.score, 14);
assert.strictEqual(horairesPerfect.scoreMax, 14);

const migratedInlineText = readJson('../../tests/fixtures/kaltests/texte-a-trous-stage-logistique/1.0.0/test.json');
assert.deepStrictEqual(
  validateTestDefinition(migratedInlineText, catalog.definitions),
  { ok: true, errors: [] }
);
assert.strictEqual(migratedInlineText.questions.length, 15);
const inlinePerfect = evaluateTest(
  migratedInlineText,
  Object.fromEntries(migratedInlineText.questions.map(question => [question.id, question.acceptedAnswers[0]]))
);
assert.strictEqual(inlinePerfect.score, 15);
assert.strictEqual(inlinePerfect.scoreMax, 15);
assert.ok(migratedInlineText.presentation.inlineFlow.some(item => item.type === 'question'));

const migratedConversions = readJson('../../tests/fixtures/kaltests/conversions-atelier-expedition/1.0.0/test.json');
assert.deepStrictEqual(
  validateTestDefinition(migratedConversions, catalog.definitions),
  { ok: true, errors: [] }
);
assert.strictEqual(migratedConversions.questions.length, 10);
assert.ok(migratedConversions.questions.every(question =>
  Array.isArray(question.supplementalFields) &&
  question.supplementalFields.length === 1 &&
  question.supplementalFields[0].scored === false
));
const conversionPerfect = evaluateTest(
  migratedConversions,
  Object.fromEntries(migratedConversions.questions.map(question => [question.id, question.acceptedAnswers[0].replace('.', ',')]))
);
assert.strictEqual(conversionPerfect.score, 10);
assert.strictEqual(conversionPerfect.scoreMax, 10);

const migratedParonymes = readJson('../../tests/fixtures/kaltests/paronymes-rapport/1.0.0/test.json');
assert.deepStrictEqual(
  validateTestDefinition(migratedParonymes, catalog.definitions),
  { ok: true, errors: [] }
);
assert.strictEqual(migratedParonymes.questions.length, 20);
const paronymesPerfect = evaluateTest(
  migratedParonymes,
  Object.fromEntries(migratedParonymes.questions.map(question => [question.id, question.acceptedAnswers[0]]))
);
assert.strictEqual(paronymesPerfect.score, 20);
assert.strictEqual(paronymesPerfect.scoreMax, 20);
assert.strictEqual(migratedParonymes.questions[0].acceptedAnswers[0], 'Pitié');

const transitionFixture = readJson('../../tests/fixtures/transitions/observation-video/1.0.0/transition.json');
assert.deepStrictEqual(
  validateTransitionDefinition(transitionFixture),
  { ok: true, errors: [], warnings: [] }
);

const currentCompatibility = checkSebCompatibility(migratedTableTest, {
  sebVersion: '0.1.0-dev',
  supportedKaltestFormats: [1],
  supportedFeatures: DEFAULT_SUPPORTED_FEATURES
});
assert.deepStrictEqual(currentCompatibility, { ok: true, errors: [] });

const futureFeature = JSON.parse(JSON.stringify(migratedTableTest));
futureFeature.features.push('future.feature.not-supported');
const futureCompatibility = checkSebCompatibility(futureFeature, {
  sebVersion: '0.1.0-dev',
  supportedKaltestFormats: [1],
  supportedFeatures: DEFAULT_SUPPORTED_FEATURES
});
assert.strictEqual(futureCompatibility.ok, false);
assert.ok(futureCompatibility.errors.some(error => error.message.includes('fonction KALTEST inconnue')));

const tooOldSeb = checkSebCompatibility(migratedSecondMathTest, {
  sebVersion: '0.0.9',
  supportedKaltestFormats: [1],
  supportedFeatures: DEFAULT_SUPPORTED_FEATURES
});
assert.strictEqual(tooOldSeb.ok, false);
assert.ok(tooOldSeb.errors.some(error => error.message.includes('minimum requis')));

const remoteMedia = validateMediaDescriptor({
  kind: 'video',
  path: 'https://example.invalid/video.webm',
  sizeBytes: 1024,
  container: 'webm',
  videoCodec: 'vp9',
  audioCodec: 'opus'
});
assert.strictEqual(remoteMedia.ok, false);
assert.ok(remoteMedia.errors.some(error => error.message.includes('fichier local embarqué')));

const oversizedPackage = validatePackageSize((1024 * 1024 * 1024) + 1);
assert.strictEqual(oversizedPackage.ok, false);

const tooDeepTransition = JSON.parse(JSON.stringify(transitionFixture));
tooDeepTransition.presentation.layout.blocks[0].blocks[0].blocks = [{ id: 'forbidden-depth' }];
const tooDeepResult = validateTransitionDefinition(tooDeepTransition);
assert.strictEqual(tooDeepResult.ok, false);
assert.ok(tooDeepResult.errors.some(error => error.message.includes('un seul niveau de sous-blocs')));

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


const BuilderCore = require('../../kaloneo/builder-core.js');

const generatedGrid = BuilderCore.createGridBlock(6, 6);
const expectedGrid = [
  ['4','3','1','2'],
  ['2','4','3','1'],
  ['3','1','2','4'],
  ['1','2','4','3']
];
for (let row = 1; row <= 4; row += 1) {
  for (let col = 1; col <= 4; col += 1) {
    const cell = generatedGrid.table.cells[row][col];
    cell.kind = 'candidate-answer';
    cell.questionId = 'id' + (((row - 1) * 4) + col) + '_gratte_ciel';
    cell.acceptedAnswers = expectedGrid[row - 1][col - 1];
    cell.responseType = 'number';
    cell.points = 1;
  }
}
[
  ['', '1', '2', '3', '2', ''],
  ['1', '', '', '', '', '3'],
  ['2', '', '', '', '', '3'],
  ['2', '', '', '', '', '1'],
  ['3', '', '', '', '', '2'],
  ['', '3', '2', '1', '2', '']
].forEach((row,rowIndex) => row.forEach((value,colIndex) => {
  if (rowIndex >= 1 && rowIndex <= 4 && colIndex >= 1 && colIndex <= 4) return;
  const cell = generatedGrid.table.cells[rowIndex][colIndex];
  cell.kind = value ? 'fixed-text' : 'empty';
  cell.value = value;
}));

const generatedGridTest = BuilderCore.modelToDefinition({
  meta: {
    id:'gratte_ciel_builder',
    version:'1.0.0',
    title:'Puzzle Gratte-ciel',
    category:'raisonnement',
    scored:true,
    layout:'single',
    scenario:'Situation de cohésion.',
    instruction:'Complétez la grille.',
    calculatorCompatible:false,
    calculatorDefaultEnabled:false,
    chronoEnabled:false,
    adminIntervention:false,
    autoevaluation:false,
    externalMaterial:false,
    icon:null
  },
  blocks:[generatedGrid]
});
assert.deepStrictEqual(
  validateTestDefinition(generatedGridTest, catalog.definitions),
  { ok:true, errors:[] }
);
assert.strictEqual(generatedGridTest.questions.length, 16);
assert.strictEqual(generatedGridTest.presentation.builderContent[0].type, 'table-grid');

const generatedTypesTest = BuilderCore.modelToDefinition({
  meta: {
    id:'types_builder',
    version:'1.0.0',
    title:'Types Builder',
    category:'test',
    scored:true,
    layout:'single',
    scenario:'Test.',
    instruction:'Répondez.',
    calculatorCompatible:false,
    calculatorDefaultEnabled:false,
    chronoEnabled:false,
    adminIntervention:false,
    autoevaluation:false,
    externalMaterial:false,
    icon:null
  },
  blocks:[
    {uid:'n',type:'question',zone:'left',question:{id:'id1_types_builder',prompt:'Nombre et unité',responseType:'number-unit',acceptedAnswers:'2,5',units:'kg',points:1,example:false,options:'',unitInput:true,unitScored:false,supplementalFields:[]}},
    {uid:'s',type:'question',zone:'left',question:{id:'id2_types_builder',prompt:'Sélection',responseType:'select',acceptedAnswers:'B',points:1,example:false,options:'A; B; C',unitInput:false,unitScored:false,supplementalFields:[]}},
    {uid:'m',type:'question',zone:'left',question:{id:'id3_types_builder',prompt:'Choix multiples',responseType:'multiple-choice',acceptedAnswers:'A; C',points:1,example:false,options:'A; B; C',unitInput:false,unitScored:false,supplementalFields:[]}},
    {uid:'d',type:'question',zone:'left',question:{id:'id4_types_builder',prompt:'Durée',responseType:'duration',acceptedMinutes:75,normalizer:'duration-fr',points:1,example:false,options:'',unitInput:false,unitScored:false,supplementalFields:[]}}
  ]
});
assert.deepStrictEqual(validateTestDefinition(generatedTypesTest, catalog.definitions), {ok:true,errors:[]});
assert.strictEqual(evaluateQuestion(generatedTypesTest.questions[0], '2,5'), true);
assert.strictEqual(evaluateQuestion(generatedTypesTest.questions[1], 'B'), true);
assert.strictEqual(evaluateQuestion(generatedTypesTest.questions[2], ['C','A']), true);
assert.strictEqual(evaluateQuestion(generatedTypesTest.questions[3], '1h15'), true);

const unsupportedBuilderTest = JSON.parse(JSON.stringify(generatedGridTest));
unsupportedBuilderTest.presentation.builderContent[0].table.cells[0][0].kind = 'future-cell';
const unsupportedBuilderResult = validateTestDefinition(unsupportedBuilderTest, catalog.definitions);
assert.strictEqual(unsupportedBuilderResult.ok, false);
assert.ok(unsupportedBuilderResult.errors.some(error => error.message.includes('type de cellule KALONÉO inconnu')));

console.log('BILAN_CATALOG_BUILD20: OK — 10 définitions / 17 lignes');
console.log('KALTEST_FIRST_SIMPLE_MIGRATION: OK — calculs_commandes_atelier 1.0.0');
console.log('KALTEST_SECOND_SIMPLE_MIGRATION: OK — calculs_poids_volumes 1.0.0');
console.log('KALTEST_TABLE_MIGRATION: OK — genre_nombre 1.0.0');
console.log('KALTEST_DURATION_MIGRATION: OK — horaires_reception_controle 1.0.0');
console.log('KALTEST_INLINE_GAPS_MIGRATION: OK — texte_a_trous_stage_logistique 1.0.0');
console.log('KALTEST_SUPPLEMENTAL_FIELDS_MIGRATION: OK — conversions_atelier_expedition 1.0.0');
console.log('KALTEST_SINGLE_CHOICE_TABLE_MIGRATION: OK — paronymes_rapport 1.0.0');
console.log('KALTEST_SHARED_EVALUATOR: OK');
console.log('KALONEO_BUILDER_GRID_6X6: OK — 16 réponses attendues');
console.log('KALONEO_BUILDER_RESPONSE_TYPES: OK — number-unit/select/multiple-choice/duration');
console.log('KALONEO_UNSUPPORTED_COMPONENT_GATE: OK — build blocker');
console.log('KALTEST_TRANSITION_MEDIA_CONTRACT: OK');
console.log('KALTEST_SEB_COMPATIBILITY_GATE: OK');
console.log('MULTI_TEST_AGGREGATION: OK — sommes score / score_max');
console.log('DYNAMIC_BILAN_FIELDS: OK');
console.log('ABANDON_WITH_POINTS: OK');
console.log('ABANDON_NON_EVALUE_NE: OK');
