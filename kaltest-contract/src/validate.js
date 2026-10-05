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
const QUESTION_TYPES = new Set(['number', 'number-unit', 'text', 'duration', 'single-choice', 'multiple-choice', 'boolean', 'select']);
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
    } else {
      if (question.response.type === 'single-choice' || question.response.type === 'multiple-choice' || question.response.type === 'select') {
        if (!Array.isArray(question.response.options) || question.response.options.length < 2 ||
            question.response.options.some(option => typeof option !== 'string' || !option.trim())) {
          push(errors, `${p}.response.options`, 'au moins deux choix texte sont obligatoires');
        }
      }
      if (question.response.type === 'duration') {
        if (!Number.isInteger(question.acceptedMinutes) || question.acceptedMinutes < 0) {
          push(errors, `${p}.acceptedMinutes`, 'durée attendue obligatoire en minutes');
        }
        if (question.response.normalizer !== undefined && question.response.normalizer !== 'duration-fr') {
          push(errors, `${p}.response.normalizer`, 'normaliseur de durée attendu : duration-fr');
        }
      }
    }

    if (typeof question.points !== 'number' || question.points < 0) {
      push(errors, `${p}.points`, 'nombre positif ou nul obligatoire');
    }

    if (question.example === true && question.points !== 0) {
      push(errors, `${p}.points`, 'une question d’exemple doit valoir 0 point');
    }

    if (question.example !== true && test.scored !== false && question.response?.type !== 'duration') {
      if (!Array.isArray(question.acceptedAnswers) || question.acceptedAnswers.length === 0) {
        push(errors, `${p}.acceptedAnswers`, 'au moins une réponse attendue est obligatoire');
      } else if (question.response?.type === 'multiple-choice') {
        if (!question.acceptedAnswers.every(set => Array.isArray(set) && set.length > 0 && set.every(value => typeof value === 'string' && value.trim()))) {
          push(errors, `${p}.acceptedAnswers`, 'pour choix multiple, chaque réponse attendue doit être un ensemble de choix texte');
        }
      }
    }

    if (question.supplementalFields !== undefined) {
      if (!Array.isArray(question.supplementalFields)) {
        push(errors, `${p}.supplementalFields`, 'tableau attendu');
      } else {
        const supplementalIds = new Set();
        question.supplementalFields.forEach((field, fieldIndex) => {
          const fp = `${p}.supplementalFields[${fieldIndex}]`;
          if (!isObject(field)) {
            push(errors, fp, 'objet obligatoire');
            return;
          }
          if (requireId(errors, field.id, `${fp}.id`)) {
            if (supplementalIds.has(field.id)) push(errors, `${fp}.id`, 'identifiant de champ complémentaire dupliqué');
            supplementalIds.add(field.id);
          }
          requireString(errors, field.label, `${fp}.label`);
          if (!['text', 'number', 'duration'].includes(field.type)) {
            push(errors, `${fp}.type`, 'type de champ complémentaire non reconnu');
          }
          if (field.scored !== false) {
            push(errors, `${fp}.scored`, 'un champ complémentaire doit être explicitement non noté');
          }
        });
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

function validateEmbeddedResource(resource, errors, path) {
  if (!isObject(resource)) {
    push(errors, path, 'ressource embarquée obligatoire');
    return;
  }
  if (typeof resource.data !== 'string' || !resource.data.startsWith('data:')) {
    push(errors, `${path}.data`, 'ressource hors-ligne embarquée attendue sous forme data:');
  }
  if (resource.name !== undefined && typeof resource.name !== 'string') {
    push(errors, `${path}.name`, 'nom de ressource invalide');
  }
}

function validateBuilderContent(test, errors) {
  const BUILDER_CONTENT_TYPES = new Set([
    'text','html','html-js','image','audio','video','question',
    'response-table','inline-flow','table-definition','table-grid','text-editor'
  ]);
  const GRID_CELL_TYPES = new Set([
    'empty','fixed-text','candidate-answer','select','choice-option','unit','image','audio','video'
  ]);
  const content = test.presentation?.builderContent;
  if (content === undefined) return;
  if (!Array.isArray(content) || content.length === 0) {
    push(errors, 'presentation.builderContent', 'au moins un bloc généré est obligatoire');
    return;
  }
  const questions = new Set((test.questions || []).map(question => question.id));
  const layout = test.presentation?.layout;
  if (layout === 'chars-rest') {
    const sizing = test.presentation?.blockSizing;
    if (!isObject(sizing) || sizing.mode !== 'characters-and-remainder' || !Array.isArray(sizing.blocks)) {
      push(errors, 'presentation.blockSizing', 'largeurs en caractères + reste disponibles obligatoires');
    } else {
      const first = Number(sizing.blocks[0]?.widthChars);
      if (!Number.isFinite(first) || first < 3) push(errors, 'presentation.blockSizing.blocks[0].widthChars', 'largeur minimale : 3 caractères');
      const second = sizing.blocks[1] || {};
      if (second.remainder !== true) {
        const width = Number(second.widthChars);
        if (!Number.isFinite(width) || width < 3) push(errors, 'presentation.blockSizing.blocks[1]', 'largeur ≥ 3 ou remainder=true obligatoire');
      }
    }
  }
  content.forEach((item,index) => {
    const p = `presentation.builderContent[${index}]`;
    if (!isObject(item) || !BUILDER_CONTENT_TYPES.has(item.type)) {
      push(errors, `${p}.type`, 'type de bloc KALONÉO inconnu');
      return;
    }
    if (item.zone !== undefined && !['left','right'].includes(item.zone)) push(errors, `${p}.zone`, 'zone attendue : left ou right');
    if (['image','audio','video'].includes(item.type)) validateEmbeddedResource(item.resource, errors, `${p}.resource`);
    if (item.type === 'question') {
      if (!requireId(errors, item.questionId, `${p}.questionId`)) return;
      if (!questions.has(item.questionId)) push(errors, `${p}.questionId`, 'question référencée absente');
    }
    if (item.type === 'text-editor') {
      const config = item.config || {};
      if (!isObject(config)) push(errors, `${p}.config`, 'configuration éditeur attendue');
      else {
        if (config.scoringProfile !== undefined && !['none','seb-bureautique-v1'].includes(config.scoringProfile)) {
          push(errors, `${p}.config.scoringProfile`, 'profil éditeur inconnu');
        }
        for (const flag of ['fileSimulation','imageSimulation']) {
          if (config[flag] !== undefined && typeof config[flag] !== 'boolean') push(errors, `${p}.config.${flag}`, 'booléen attendu');
        }
      }
    }
    if (item.type === 'response-table') {
      const definition = item.definition;
      if (!isObject(definition) || !Array.isArray(definition.headers) || definition.headers.length < 2) {
        push(errors, `${p}.definition`, 'tableau de réponses invalide');
      } else if (definition.columns !== undefined) {
        if (!Array.isArray(definition.columns)) push(errors, `${p}.definition.columns`, 'tableau de colonnes attendu');
        else definition.columns.forEach((column,columnIndex) => {
          const cp = `${p}.definition.columns[${columnIndex}]`;
          if (!isObject(column)) return push(errors, cp, 'colonne obligatoire');
          if (column.widthChars !== undefined && column.widthChars !== '' &&
              (!Number.isFinite(Number(column.widthChars)) || Number(column.widthChars) < 3)) push(errors, `${cp}.widthChars`, 'largeur minimale : 3 caractères');
          if (column.align !== undefined && !['left','center'].includes(column.align)) push(errors, `${cp}.align`, 'alignement attendu : left ou center');
        });
      }
    }
    if (item.type === 'inline-flow') {
      if (!Array.isArray(item.flow)) push(errors, `${p}.flow`, 'flux texte obligatoire');
      else item.flow.forEach((part,partIndex) => {
        const pp = `${p}.flow[${partIndex}]`;
        if (!isObject(part) || !['text','question'].includes(part.type)) push(errors, `${pp}.type`, 'type attendu : text ou question');
        else if (part.type === 'question' && !questions.has(part.questionId)) push(errors, `${pp}.questionId`, 'question référencée absente');
      });
    }
    if (item.type === 'table-definition') {
      const definition = item.definition;
      if (!isObject(definition) || !Array.isArray(definition.questionIds)) push(errors, `${p}.definition`, 'définition de tableau invalide');
      else definition.questionIds.forEach((id,qIndex) => {
        if (!questions.has(id)) push(errors, `${p}.definition.questionIds[${qIndex}]`, 'question référencée absente');
      });
    }
    if (item.type === 'table-grid') {
      const table = item.table;
      if (!isObject(table) || !Number.isInteger(Number(table.rows)) || Number(table.rows) < 1 ||
          !Number.isInteger(Number(table.cols)) || Number(table.cols) < 1) {
        push(errors, `${p}.table`, 'dimensions de grille invalides');
        return;
      }
      if (!Array.isArray(table.cells) || table.cells.length !== Number(table.rows)) {
        push(errors, `${p}.table.cells`, 'nombre de lignes incohérent');
        return;
      }
      table.cells.forEach((row,rowIndex) => {
        if (!Array.isArray(row) || row.length !== Number(table.cols)) {
          push(errors, `${p}.table.cells[${rowIndex}]`, 'nombre de colonnes incohérent');
          return;
        }
        row.forEach((cell,columnIndex) => {
          const cp = `${p}.table.cells[${rowIndex}][${columnIndex}]`;
          if (!isObject(cell) || !GRID_CELL_TYPES.has(cell.kind)) {
            push(errors, `${cp}.kind`, 'type de cellule KALONÉO inconnu');
            return;
          }
          const rowSpan = Number(cell.rowSpan || 1);
          const colSpan = Number(cell.colSpan || 1);
          if (!Number.isInteger(rowSpan) || rowSpan < 1 || !Number.isInteger(colSpan) || colSpan < 1) push(errors, cp, 'fusion de cellule invalide');
          if (['candidate-answer','select','choice-option','unit'].includes(cell.kind)) {
            if (!requireId(errors, cell.questionId, `${cp}.questionId`)) return;
            if (!questions.has(cell.questionId)) push(errors, `${cp}.questionId`, 'question de cellule absente');
          }
          if (['image','audio','video'].includes(cell.kind) && (typeof cell.value !== 'string' || !cell.value.startsWith('data:'))) {
            push(errors, `${cp}.value`, 'média de cellule hors-ligne non embarqué');
          }
        });
      });
      if (table.columns !== undefined) {
        if (!Array.isArray(table.columns) || table.columns.length !== Number(table.cols)) push(errors, `${p}.table.columns`, 'définition des colonnes incohérente');
        else table.columns.forEach((column,columnIndex) => {
          const cp = `${p}.table.columns[${columnIndex}]`;
          if (column.widthChars !== undefined && column.widthChars !== '' &&
              (!Number.isFinite(Number(column.widthChars)) || Number(column.widthChars) < 3)) push(errors, `${cp}.widthChars`, 'largeur minimale : 3 caractères');
          if (column.align !== undefined && !['left','center'].includes(column.align)) push(errors, `${cp}.align`, 'alignement attendu : left ou center');
        });
      }
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
  validateBuilderContent(test, errors);

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
