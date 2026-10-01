'use strict';

const assert = require('assert');
const {
  validateBilanDefinition,
  validateTestDefinition,
  bilanEffectOfExercise
} = require('../src/validate');

const triBilan = {
  id: 'bilan.competences_techniques.tri',
  version: '1.0.0',
  section: {
    id: 'competences_techniques',
    label: 'Compétences techniques'
  },
  subsection: {
    id: 'tri_de_chevilles',
    label: 'Tri de chevilles'
  },
  lines: [
    {
      id: 'bilan.competences_techniques.tri.temps',
      label: 'Temps de réalisation',
      mode: 'automatic',
      inputs: [
        { id: 'temps_moyen', type: 'duration', required: true }
      ],
      evaluation: {
        sourceInput: 'temps_moyen',
        direction: 'lower-is-better',
        levelIThreshold: 720,
        levelIIThreshold: 840
      },
      comments: {
        I: '',
        II: '',
        III: '',
        NE: 'Non évalué.'
      }
    },
    {
      id: 'bilan.competences_techniques.tri.erreurs',
      label: 'Précision du tri',
      mode: 'automatic',
      inputs: [
        { id: 'moyenne_erreurs', type: 'number', required: true }
      ],
      evaluation: {
        sourceInput: 'moyenne_erreurs',
        direction: 'lower-is-better',
        levelIThreshold: 1,
        levelIIThreshold: 3
      },
      comments: {
        I: '',
        II: '',
        III: '',
        NE: 'Non évalué.'
      }
    }
  ]
};

const triTest = {
  id: 'tri_de_chevilles',
  version: '1.0.0',
  title: 'Tri de chevilles',
  runtime: {
    start: true,
    save: true,
    restore: true,
    finish: true
  },
  outputs: [
    { id: 'temps_moyen', type: 'duration' },
    { id: 'moyenne_erreurs', type: 'number' },
    { id: 'nombre_essais', type: 'integer' }
  ],
  bilanContributions: [
    {
      lineId: 'bilan.competences_techniques.tri.temps',
      bindings: {
        temps_moyen: 'temps_moyen'
      }
    },
    {
      lineId: 'bilan.competences_techniques.tri.erreurs',
      bindings: {
        moyenne_erreurs: 'moyenne_erreurs'
      }
    }
  ]
};

assert.deepStrictEqual(validateBilanDefinition(triBilan), { ok: true, errors: [] });
assert.deepStrictEqual(validateTestDefinition(triTest, [triBilan]), { ok: true, errors: [] });

const broken = JSON.parse(JSON.stringify(triTest));
delete broken.bilanContributions[0].bindings.temps_moyen;
const brokenResult = validateTestDefinition(broken, [triBilan]);
assert.strictEqual(brokenResult.ok, false);
assert.ok(brokenResult.errors.some(e => e.message.includes('liaison obligatoire manquante')));

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

console.log('KALTEST_CONTRACT_VALIDATION: OK');
console.log('ABANDON_WITH_POINTS: OK');
console.log('ABANDON_NON_EVALUE_NE: OK');
