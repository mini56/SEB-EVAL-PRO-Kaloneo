'use strict';

const ID_RE = /^[a-z0-9][a-z0-9._-]*$/;
const SEMVER_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const OUTPUT_TYPES = new Set([
  'number',
  'integer',
  'string',
  'boolean',
  'duration',
  'number-list',
  'duration-list',
  'json'
]);
const MODES = new Set(['manual', 'automatic']);
const DIRECTIONS = new Set(['higher-is-better', 'lower-is-better']);
const AGGREGATIONS = new Set(['direct', 'sum-score', 'average']);
const QUESTION_TYPES = new Set(['number', 'text', 'single-choice', 'multiple-choice', 'boolean']);
const { validateManifest, validateMediaDescriptor, validateLayoutDefinition } = require('./compatibility');

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function push(errors, path, message) {
  errors.push({ path, message });
}

function requireString(errors, value, path) {
  if (typeof value !== 'string' || !value.trim()) {
    push(errors, path, 'chaîne non vide obligatoire');
    return false;
  }
  return true;
}

function requireId(errors, value, path) {
  if (!requireString(errors, value, path)) return false;
  if (!ID_RE.test(value)) {
    push(errors, path, 'identifiant stable invalide');
    return false;
  }
  return true;
}

function validateOutputs(outputs, errors, path = 'outputs') {
  if (!Array.isArray(outputs)) {
    push(errors, path, 'tableau obligatoire');
    return new Map();
  }

  const byId = new Map();
  outputs.forEach((output, index) => {
    const p = `${path}[${index}]`;
    if (!isObject(output)) {
      push(errors, p, 'objet obligatoire');
      return;
    }
    if (!requireId(errors, output.id, `${p}.id`)) return;
    if (byId.has(output.id)) {
      push(errors, `${p}.id`, 'identifiant de sortie dupliqué');
      return;
    }
    if (!OUTPUT_TYPES.has(output.type)) {
      push(errors, `${p}.type`, 'type de sortie non reconnu');
      return;
    }
    byId.set(output.id, output);
  });

  return byId;
}

function validateQuestions(test, errors) {
  if (test.kind !== 'questionnaire') return;

  if (!Array.isArray(test.questions) || test.questions.length === 0) {
    push(errors, 'questions', 'au moins une question est obligatoire pour un questionnaire');
    return;
  }

  const ids = new Set();
  test.questions.forEach((question, index) => {
    const p = `questions[${index}]`;
    if (!isObject(question)) {
      push(errors, p, 'objet obligatoire');
      return;
    }

    if (requireId(errors, question.id, `${p}.id`)) {
      if (ids.has(question.id)) push(errors, `${p}.id`, 'identifiant de question dupliqué');
      ids.add(question.id);
    }

    requireString(errors, question.prompt, `${p}.prompt`);

    if (!isObject(question.response) || !QUESTION_TYPES.has(question.response.type)) {
      push(errors, `${p}.response.type`, 'type de réponse non reconnu');
    }

    if (typeof question.points !== 'number' || question.points < 0) {
      push(errors, `${p}.points`, 'nombre positif ou nul obligatoire');
    }

    if (question.example === true && question.points !== 0) {
      push(errors, `${p}.points`, 'une question d’exemple doit valoir 0 point');
    }

    if (question.example !== true && test.scored !== false) {
      if (!Array.isArray(question.acceptedAnswers) || question.acceptedAnswers.length === 0) {
        push(errors, `${p}.acceptedAnswers`, 'au moins une réponse attendue est obligatoire');
      }
    }

    if (question.units !== undefined) {
      if (!Array.isArray(question.units) || question.units.some(unit => typeof unit !== 'string')) {
        push(errors, `${p}.units`, 'tableau de chaînes attendu');
      }
    }

    if (question.unitInput !== undefined && typeof question.unitInput !== 'boolean') {
      push(errors, `${p}.unitInput`, 'booléen attendu');
    }

    if (question.unitScored !== undefined && typeof question.unitScored !== 'boolean') {
      push(errors, `${p}.unitScored`, 'booléen attendu');
    }
  });
}

function validateTemplates(line, availableFields, errors, path) {
  if (line.displayTemplates === undefined) return;
  if (!Array.isArray(line.displayTemplates)) {
    push(errors, path, 'tableau attendu');
    return;
  }

  const ids = new Set();
  line.displayTemplates.forEach((item, index) => {
    const p = `${path}[${index}]`;
    if (!isObject(item)) {
      push(errors, p, 'objet obligatoire');
      return;
    }
    if (requireId(errors, item.id, `${p}.id`)) {
      if (ids.has(item.id)) push(errors, `${p}.id`, 'identifiant de modèle dupliqué');
      ids.add(item.id);
    }
    requireString(errors, item.label, `${p}.label`);
    if (!requireString(errors, item.template, `${p}.template`)) return;

    const placeholders = [...item.template.matchAll(/\{\{\s*([a-z0-9._-]+)\s*\}\}/g)].map(match => match[1]);
    for (const placeholder of placeholders) {
      if (!availableFields.has(placeholder)) {
        push(errors, `${p}.template`, `variable dynamique inconnue : ${placeholder}`);
      }
    }
  });
}

function validateAggregation(line, inputMap, errors, path) {
  if (line.mode !== 'automatic') return new Set(inputMap.keys());

  if (!isObject(line.aggregation)) {
    push(errors, `${path}.aggregation`, 'agrégation automatique obligatoire');
    return new Set(inputMap.keys());
  }

  const method = line.aggregation.method;
  if (!AGGREGATIONS.has(method)) {
    push(errors, `${path}.aggregation.method`, 'méthode d’agrégation non reconnue');
    return new Set(inputMap.keys());
  }

  const metrics = new Set(inputMap.keys());

  if (method === 'direct') {
    const sourceInput = line.aggregation.sourceInput;
    if (!requireId(errors, sourceInput, `${path}.aggregation.sourceInput`)) return metrics;
    if (!inputMap.has(sourceInput)) {
      push(errors, `${path}.aggregation.sourceInput`, 'entrée source absente de la ligne');
    }
    metrics.add(line.aggregation.resultMetric || sourceInput);
  }

  if (method === 'average') {
    const sourceInput = line.aggregation.sourceInput;
    if (!requireId(errors, sourceInput, `${path}.aggregation.sourceInput`)) return metrics;
    if (!inputMap.has(sourceInput)) {
      push(errors, `${path}.aggregation.sourceInput`, 'entrée source absente de la ligne');
    }
    metrics.add(line.aggregation.resultMetric || 'average');
  }

  if (method === 'sum-score') {
    const scoreInput = line.aggregation.scoreInput;
    const maxInput = line.aggregation.maxInput;
    if (requireId(errors, scoreInput, `${path}.aggregation.scoreInput`) && !inputMap.has(scoreInput)) {
      push(errors, `${path}.aggregation.scoreInput`, 'entrée score absente de la ligne');
    }
    if (requireId(errors, maxInput, `${path}.aggregation.maxInput`) && !inputMap.has(maxInput)) {
      push(errors, `${path}.aggregation.maxInput`, 'entrée score maximum absente de la ligne');
    }

    for (const [name, id] of [['score', scoreInput], ['score maximum', maxInput]]) {
      const input = inputMap.get(id);
      if (input && !['number', 'integer'].includes(input.type)) {
        push(errors, `${path}.aggregation`, `l’entrée ${name} doit être numérique`);
      }
    }

    metrics.add('score');
    metrics.add('score_max');
    metrics.add('pourcentage');
  }

  return metrics;
}

function validateBilanDefinition(definition) {
  const errors = [];

  if (!isObject(definition)) {
    return { ok: false, errors: [{ path: '', message: 'objet bilan obligatoire' }] };
  }

  requireId(errors, definition.id, 'id');
  requireString(errors, definition.version, 'version');
  if (typeof definition.version === 'string' && !SEMVER_RE.test(definition.version)) {
    push(errors, 'version', 'version sémantique attendue (x.y.z)');
  }

  if (!isObject(definition.section)) {
    push(errors, 'section', 'section obligatoire');
  } else {
    requireId(errors, definition.section.id, 'section.id');
    requireString(errors, definition.section.label, 'section.label');
  }

  if (definition.subsection !== undefined) {
    if (!isObject(definition.subsection)) {
      push(errors, 'subsection', 'objet attendu');
    } else {
      requireId(errors, definition.subsection.id, 'subsection.id');
      requireString(errors, definition.subsection.label, 'subsection.label');
    }
  }

  if (definition.family !== undefined && definition.family !== null) {
    if (!isObject(definition.family)) {
      push(errors, 'family', 'objet attendu');
    } else {
      requireId(errors, definition.family.id, 'family.id');
      requireString(errors, definition.family.label, 'family.label');
    }
  }

  if (!Array.isArray(definition.lines) || definition.lines.length === 0) {
    push(errors, 'lines', 'au moins une ligne de compétence est obligatoire');
    return { ok: errors.length === 0, errors };
  }

  const lineIds = new Set();

  definition.lines.forEach((line, index) => {
    const p = `lines[${index}]`;
    if (!isObject(line)) {
      push(errors, p, 'objet obligatoire');
      return;
    }

    if (requireId(errors, line.id, `${p}.id`)) {
      if (lineIds.has(line.id)) push(errors, `${p}.id`, 'identifiant de ligne dupliqué');
      lineIds.add(line.id);
    }

    requireString(errors, line.label, `${p}.label`);

    if (!MODES.has(line.mode)) {
      push(errors, `${p}.mode`, 'mode attendu : manual ou automatic');
    }

    if (!isObject(line.comments)) {
      push(errors, `${p}.comments`, 'commentaires I/II/III/NE obligatoires');
    } else {
      for (const level of ['I', 'II', 'III', 'NE']) {
        if (typeof line.comments[level] !== 'string') {
          push(errors, `${p}.comments.${level}`, 'chaîne obligatoire');
        }
      }
    }

    const inputMap = new Map();
    const inputs = Array.isArray(line.inputs) ? line.inputs : [];
    if (line.inputs !== undefined && !Array.isArray(line.inputs)) {
      push(errors, `${p}.inputs`, 'tableau attendu');
    }

    inputs.forEach((input, inputIndex) => {
      const ip = `${p}.inputs[${inputIndex}]`;
      if (!isObject(input)) {
        push(errors, ip, 'objet obligatoire');
        return;
      }
      if (requireId(errors, input.id, `${ip}.id`)) {
        if (inputMap.has(input.id)) push(errors, `${ip}.id`, 'entrée dupliquée');
        inputMap.set(input.id, input);
      }
      if (!OUTPUT_TYPES.has(input.type)) {
        push(errors, `${ip}.type`, 'type d’entrée non reconnu');
      }
      if (input.required !== undefined && typeof input.required !== 'boolean') {
        push(errors, `${ip}.required`, 'booléen attendu');
      }
    });

    const metrics = validateAggregation(line, inputMap, errors, p);

    if (line.mode === 'automatic') {
      if (!isObject(line.evaluation)) {
        push(errors, `${p}.evaluation`, 'règle automatique obligatoire');
      } else {
        if (!DIRECTIONS.has(line.evaluation.direction)) {
          push(errors, `${p}.evaluation.direction`, 'direction automatique invalide');
        }
        if (typeof line.evaluation.levelIThreshold !== 'number') {
          push(errors, `${p}.evaluation.levelIThreshold`, 'nombre obligatoire');
        }
        if (typeof line.evaluation.levelIIThreshold !== 'number') {
          push(errors, `${p}.evaluation.levelIIThreshold`, 'nombre obligatoire');
        }

        const sourceMetric = line.evaluation.sourceMetric;
        if (!requireId(errors, sourceMetric, `${p}.evaluation.sourceMetric`)) {
          // erreur déjà ajoutée
        } else if (!metrics.has(sourceMetric)) {
          push(errors, `${p}.evaluation.sourceMetric`, 'métrique calculée absente');
        }

        const i = line.evaluation.levelIThreshold;
        const ii = line.evaluation.levelIIThreshold;
        if (typeof i === 'number' && typeof ii === 'number') {
          if (line.evaluation.direction === 'higher-is-better' && i < ii) {
            push(errors, `${p}.evaluation`, 'pour higher-is-better, le seuil I doit être supérieur ou égal au seuil II');
          }
          if (line.evaluation.direction === 'lower-is-better' && i > ii) {
            push(errors, `${p}.evaluation`, 'pour lower-is-better, le seuil I doit être inférieur ou égal au seuil II');
          }
        }
      }
    }

    validateTemplates(line, metrics, errors, `${p}.displayTemplates`);
  });

  return { ok: errors.length === 0, errors };
}

function validateBilanCatalog(catalog) {
  const errors = [];
  if (!isObject(catalog)) {
    return { ok: false, errors: [{ path: '', message: 'catalogue bilan obligatoire' }] };
  }

  if (catalog.format !== 'seb-bilan-catalog') {
    push(errors, 'format', 'format attendu : seb-bilan-catalog');
  }

  requireString(errors, catalog.version, 'version');
  if (typeof catalog.version === 'string' && !SEMVER_RE.test(catalog.version)) {
    push(errors, 'version', 'version sémantique attendue (x.y.z)');
  }

  if (!Array.isArray(catalog.definitions) || catalog.definitions.length === 0) {
    push(errors, 'definitions', 'au moins une définition de bilan est obligatoire');
    return { ok: errors.length === 0, errors };
  }

  const definitionIds = new Set();
  const lineIds = new Set();

  catalog.definitions.forEach((definition, index) => {
    const p = `definitions[${index}]`;
    const result = validateBilanDefinition(definition);
    for (const error of result.errors) {
      push(errors, error.path ? `${p}.${error.path}` : p, error.message);
    }

    if (definition && definition.id) {
      if (definitionIds.has(definition.id)) push(errors, `${p}.id`, 'identifiant de définition dupliqué');
      definitionIds.add(definition.id);
    }

    for (const line of definition?.lines || []) {
      if (!line?.id) continue;
      if (lineIds.has(line.id)) push(errors, `${p}.lines`, `identifiant de ligne global dupliqué : ${line.id}`);
      lineIds.add(line.id);
    }
  });

  return { ok: errors.length === 0, errors };
}

function indexBilanLines(definitions) {
  const map = new Map();
  for (const definition of definitions || []) {
    if (!definition || !Array.isArray(definition.lines)) continue;
    for (const line of definition.lines) {
      if (line && line.id) map.set(line.id, line);
    }
  }
  return map;
}

function validateTestDefinition(test, bilanDefinitions = []) {
  const errors = [];

  if (!isObject(test)) {
    return { ok: false, errors: [{ path: '', message: 'objet test obligatoire' }] };
  }

  const manifestResult = validateManifest(test);
  for (const issue of manifestResult.errors) {
    push(errors, issue.path, issue.message);
  }

  if (test.presentation !== undefined) {
    if (!isObject(test.presentation)) {
      push(errors, 'presentation', 'objet de présentation attendu');
    } else if (test.presentation.layout !== undefined) {
      const layoutResult = validateLayoutDefinition(test.presentation.layout);
      for (const issue of layoutResult.errors) push(errors, issue.path, issue.message);
    }
  }

  if (test.media !== undefined) {
    if (!Array.isArray(test.media)) {
      push(errors, 'media', 'tableau de médias attendu');
    } else {
      test.media.forEach((descriptor, index) => {
        const mediaResult = validateMediaDescriptor(descriptor, `media[${index}]`);
        for (const issue of mediaResult.errors) push(errors, issue.path, issue.message);
      });
    }
  }

  requireId(errors, test.id, 'id');
  requireString(errors, test.version, 'version');
  if (typeof test.version === 'string' && !SEMVER_RE.test(test.version)) {
    push(errors, 'version', 'version sémantique attendue (x.y.z)');
  }
  requireString(errors, test.title, 'title');

  if (test.kind !== undefined && !['questionnaire', 'complex'].includes(test.kind)) {
    push(errors, 'kind', 'type attendu : questionnaire ou complex');
  }

  if (test.scored !== undefined && typeof test.scored !== 'boolean') {
    push(errors, 'scored', 'booléen attendu');
  }

  if (!isObject(test.runtime)) {
    push(errors, 'runtime', 'contrat runtime obligatoire');
  } else {
    for (const capability of ['start', 'save', 'restore', 'finish']) {
      if (test.runtime[capability] !== true) {
        push(errors, `runtime.${capability}`, 'capacité obligatoire');
      }
    }
  }

  validateQuestions(test, errors);
  const outputs = validateOutputs(test.outputs, errors);

  if (!Array.isArray(test.bilanContributions)) {
    push(errors, 'bilanContributions', 'tableau obligatoire, éventuellement vide');
  } else {
    const lineIndex = indexBilanLines(bilanDefinitions);

    test.bilanContributions.forEach((contribution, index) => {
      const p = `bilanContributions[${index}]`;
      if (!isObject(contribution)) {
        push(errors, p, 'objet obligatoire');
        return;
      }
      if (!requireId(errors, contribution.lineId, `${p}.lineId`)) return;

      if (!isObject(contribution.bindings)) {
        push(errors, `${p}.bindings`, 'objet de liaisons obligatoire');
        return;
      }

      for (const [inputId, outputId] of Object.entries(contribution.bindings)) {
        if (!ID_RE.test(inputId)) {
          push(errors, `${p}.bindings.${inputId}`, 'identifiant d’entrée invalide');
        }
        if (typeof outputId !== 'string' || !outputs.has(outputId)) {
          push(errors, `${p}.bindings.${inputId}`, 'sortie du test absente');
        }
      }

      const line = lineIndex.get(contribution.lineId);
      if (lineIndex.size > 0 && !line) {
        push(errors, `${p}.lineId`, 'destination de bilan inconnue');
        return;
      }
      if (!line) return;

      for (const input of line.inputs || []) {
        if (!input.required) continue;
        const outputId = contribution.bindings[input.id];
        if (!outputId) {
          push(errors, `${p}.bindings.${input.id}`, 'liaison obligatoire manquante');
          continue;
        }
        const output = outputs.get(outputId);
        if (output && output.type !== input.type) {
          push(errors, `${p}.bindings.${input.id}`, `type incompatible : ${output.type} au lieu de ${input.type}`);
        }
      }
    });
  }

  return { ok: errors.length === 0, errors };
}

function bilanEffectOfExercise({ abandoned = false, nonEvaluated = false, earned = 0, maximum = 0 } = {}) {
  if (nonEvaluated) {
    return {
      status: 'NE',
      includeInCalculation: false,
      earned: 0,
      maximum: 0
    };
  }

  return {
    status: abandoned ? 'ABANDON_EVALUE' : 'EVALUATED',
    includeInCalculation: true,
    earned,
    maximum
  };
}

function aggregateLine(line, contributions = []) {
  const included = contributions.filter(item => item && item.nonEvaluated !== true);
  if (included.length === 0) {
    return { status: 'NE', metrics: {} };
  }

  const aggregation = line?.aggregation || { method: 'direct' };

  if (aggregation.method === 'sum-score') {
    let score = 0;
    let scoreMax = 0;
    for (const contribution of included) {
      score += Number(contribution.values?.[aggregation.scoreInput]) || 0;
      scoreMax += Number(contribution.values?.[aggregation.maxInput]) || 0;
    }
    return {
      status: 'EVALUATED',
      metrics: {
        score,
        score_max: scoreMax,
        pourcentage: scoreMax > 0 ? (score / scoreMax) * 100 : null
      }
    };
  }

  if (aggregation.method === 'average') {
    const values = included
      .map(item => Number(item.values?.[aggregation.sourceInput]))
      .filter(Number.isFinite);
    return {
      status: values.length ? 'EVALUATED' : 'NE',
      metrics: values.length
        ? { [aggregation.resultMetric || 'average']: values.reduce((a, b) => a + b, 0) / values.length }
        : {}
    };
  }

  const sourceInput = aggregation.sourceInput;
  const first = included.find(item => item.values && item.values[sourceInput] !== undefined);
  if (!first) return { status: 'NE', metrics: {} };
  return {
    status: 'EVALUATED',
    metrics: {
      [aggregation.resultMetric || sourceInput]: first.values[sourceInput],
      ...first.values
    }
  };
}

function resolveLevel(line, aggregate) {
  if (!line || line.mode !== 'automatic') return null;
  if (!aggregate || aggregate.status === 'NE') return 'NE';

  const value = Number(aggregate.metrics?.[line.evaluation?.sourceMetric]);
  if (!Number.isFinite(value)) return 'NE';

  const i = line.evaluation.levelIThreshold;
  const ii = line.evaluation.levelIIThreshold;

  if (line.evaluation.direction === 'lower-is-better') {
    if (value <= i) return 'I';
    if (value <= ii) return 'II';
    return 'III';
  }

  if (value >= i) return 'I';
  if (value >= ii) return 'II';
  return 'III';
}

module.exports = {
  validateBilanDefinition,
  validateBilanCatalog,
  validateTestDefinition,
  bilanEffectOfExercise,
  aggregateLine,
  resolveLevel
};
