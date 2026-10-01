'use strict';

const ID_RE = /^[a-z0-9][a-z0-9._-]*$/;
const SEMVER_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const OUTPUT_TYPES = new Set(['number', 'integer', 'string', 'boolean', 'duration']);
const MODES = new Set(['manual', 'automatic']);
const DIRECTIONS = new Set(['higher-is-better', 'lower-is-better']);

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

    const inputIds = new Set();
    const inputs = Array.isArray(line.inputs) ? line.inputs : [];
    inputs.forEach((input, inputIndex) => {
      const ip = `${p}.inputs[${inputIndex}]`;
      if (!isObject(input)) {
        push(errors, ip, 'objet obligatoire');
        return;
      }
      if (requireId(errors, input.id, `${ip}.id`)) {
        if (inputIds.has(input.id)) push(errors, `${ip}.id`, 'entrée dupliquée');
        inputIds.add(input.id);
      }
      if (!OUTPUT_TYPES.has(input.type)) {
        push(errors, `${ip}.type`, 'type d’entrée non reconnu');
      }
      if (input.required !== undefined && typeof input.required !== 'boolean') {
        push(errors, `${ip}.required`, 'booléen attendu');
      }
    });

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

        if (!requireId(errors, line.evaluation.sourceInput, `${p}.evaluation.sourceInput`)) {
          // erreur déjà ajoutée
        } else if (!inputIds.has(line.evaluation.sourceInput)) {
          push(errors, `${p}.evaluation.sourceInput`, 'entrée source absente de la ligne');
        }
      }
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

  requireId(errors, test.id, 'id');
  requireString(errors, test.version, 'version');
  if (typeof test.version === 'string' && !SEMVER_RE.test(test.version)) {
    push(errors, 'version', 'version sémantique attendue (x.y.z)');
  }
  requireString(errors, test.title, 'title');

  if (!isObject(test.runtime)) {
    push(errors, 'runtime', 'contrat runtime obligatoire');
  } else {
    for (const capability of ['start', 'save', 'restore', 'finish']) {
      if (test.runtime[capability] !== true) {
        push(errors, `runtime.${capability}`, 'capacité obligatoire');
      }
    }
  }

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

module.exports = {
  validateBilanDefinition,
  validateTestDefinition,
  bilanEffectOfExercise
};
