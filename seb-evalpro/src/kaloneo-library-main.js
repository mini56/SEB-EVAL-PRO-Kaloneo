'use strict';

const fs = require('fs');
const path = require('path');

const BASE_TEST_ORDER = Object.freeze([
  'calculs_commandes_atelier',
  'calculs_poids_volumes',
  'horaires_reception_controle',
  'texte_a_trous_stage_logistique',
  'fractions_preparation_lots',
  'organisation_demenagement',
  'gestes_postures',
  'conversions_atelier_expedition',
  'autoevaluation_savoirs',
  'transition_video_f1',
  'construction_briques',
  'ranger_stock',
  'planning_cantine',
  'genre_nombre',
  'dictee_professionnelle',
  'tri_chevilles',
  'traitement_texte_bureautique',
  'redaction_email',
  'autoevaluation_tic',
  'paronymes_rapport',
  'gratte_ciel'
]);

function createKaloneoLibrary(options = {}) {
  const dataRoot = String(options.dataRoot || '').trim();
  const seedTestsRoot = String(options.seedTestsRoot || '').trim();
  const now = typeof options.now === 'function' ? options.now : () => new Date();

  if (!dataRoot) throw new Error('dataRoot KALONÉO requis.');

  const root = path.join(dataRoot, 'KALONEO');
  const testsRoot = path.join(root, 'Bibliotheque-tests');
  const parcoursRoot = path.join(root, 'Parcours');

  function ensureDirectory(directory) {
    fs.mkdirSync(directory, { recursive:true });
    return directory;
  }

  function readJson(file) {
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (_) {
      return null;
    }
  }

  function atomicWriteJson(file, value) {
    ensureDirectory(path.dirname(file));
    const temp = file + '.' + process.pid + '.tmp';
    fs.writeFileSync(temp, JSON.stringify(value, null, 2) + '\n', 'utf8');
    fs.renameSync(temp, file);
  }

  function copyMissingTree(source, destination) {
    if (!source || !fs.existsSync(source)) return;
    ensureDirectory(destination);
    for (const entry of fs.readdirSync(source, { withFileTypes:true })) {
      const from = path.join(source, entry.name);
      const to = path.join(destination, entry.name);
      if (entry.isDirectory()) {
        copyMissingTree(from, to);
      } else if (!fs.existsSync(to)) {
        fs.copyFileSync(from, to);
      }
    }
  }

  function walkTestFiles(directory, out = []) {
    if (!fs.existsSync(directory)) return out;
    for (const entry of fs.readdirSync(directory, { withFileTypes:true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) walkTestFiles(full, out);
      else if (entry.isFile() && entry.name.toLowerCase() === 'test.json') out.push(full);
    }
    return out;
  }

  function compareVersion(a, b) {
    const parse = value => String(value || '0.0.0').split('-')[0].split('.').map(part => Number(part) || 0);
    const av = parse(a);
    const bv = parse(b);
    for (let i = 0; i < Math.max(av.length, bv.length, 3); i += 1) {
      const delta = (av[i] || 0) - (bv[i] || 0);
      if (delta) return delta;
    }
    return String(a || '').localeCompare(String(b || ''));
  }

  function roleOf(definition) {
    const explicit = String(definition && definition.pageRole || '').toLowerCase();
    if (explicit === 'introduction' || explicit === 'fin' || explicit === 'test') return explicit;
    if (definition && definition.behavior && definition.behavior.terminal === true) return 'fin';
    return 'test';
  }

  function scanLatestDefinitions() {
    const byId = new Map();
    for (const file of walkTestFiles(testsRoot)) {
      const definition = readJson(file);
      if (!definition || !definition.id || !definition.version) continue;
      const current = byId.get(definition.id);
      if (!current || compareVersion(definition.version, current.definition.version) > 0) {
        byId.set(definition.id, { definition, file });
      }
    }
    return byId;
  }

  function toTestMetadata(record) {
    const definition = record.definition;
    const role = roleOf(definition);
    const questions = Array.isArray(definition.questions) ? definition.questions.length : 0;
    const tools = [];
    if (definition.pageTools && Array.isArray(definition.pageTools.enabled)) tools.push(...definition.pageTools.enabled);
    if (definition.calculator && definition.calculator.compatible) tools.push('calculator');
    if (definition.chrono && definition.chrono.enabled) tools.push('chrono');

    return {
      id:String(definition.id),
      version:String(definition.version),
      title:String(definition.title || definition.id),
      category:String(definition.category || (role === 'introduction' ? 'introduction' : role === 'fin' ? 'fin' : 'autres')),
      role,
      kind:String(definition.kind || 'complex'),
      scored:definition.scored !== false,
      description:String(definition.description || ''),
      questionCount:questions,
      icon:definition.icon || null,
      tools:[...new Set(tools)]
    };
  }

  function safeNameKey(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLocaleLowerCase('fr-FR')
      .replace(/\s+/g, ' ');
  }

  function slugify(value) {
    const slug = safeNameKey(value)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return slug || 'parcours';
  }

  function parcoursFiles() {
    ensureDirectory(parcoursRoot);
    return fs.readdirSync(parcoursRoot, { withFileTypes:true })
      .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith('.json'))
      .map(entry => path.join(parcoursRoot, entry.name));
  }

  function readAllParcours() {
    const out = [];
    for (const file of parcoursFiles()) {
      const value = readJson(file);
      if (!value || value.format !== 'kaloneo-parcours') continue;
      out.push(value);
    }
    return out;
  }

  function refFor(definition) {
    return { id:String(definition.id), version:String(definition.version) };
  }

  function ensureBaseParcours() {
    if (readAllParcours().length) return;
    const definitions = scanLatestDefinitions();
    const introRecord = [...definitions.values()].find(record => roleOf(record.definition) === 'introduction');
    const finRecord = [...definitions.values()].find(record => roleOf(record.definition) === 'fin');
    if (!introRecord || !finRecord) return;

    const tests = BASE_TEST_ORDER
      .map(id => definitions.get(id))
      .filter(record => record && roleOf(record.definition) === 'test')
      .map(record => refFor(record.definition));

    const stamp = now().toISOString();
    const base = {
      format:'kaloneo-parcours',
      schemaVersion:1,
      id:'parcours-de-base',
      name:'Parcours de base',
      creator:'SEB EvalPro / KALONÉO',
      systemProvided:true,
      createdAt:stamp,
      updatedAt:stamp,
      introduction:refFor(introRecord.definition),
      tests,
      fin:refFor(finRecord.definition)
    };
    atomicWriteJson(path.join(parcoursRoot, base.id + '.json'), base);
  }

  function ensureSeed() {
    ensureDirectory(root);
    ensureDirectory(testsRoot);
    ensureDirectory(parcoursRoot);
    if (seedTestsRoot && fs.existsSync(seedTestsRoot)) copyMissingTree(seedTestsRoot, testsRoot);
    ensureBaseParcours();
    return true;
  }

  function listTests() {
    ensureSeed();
    return [...scanLatestDefinitions().values()]
      .map(toTestMetadata)
      .sort((a, b) => {
        const roleOrder = { introduction:0, test:1, fin:2 };
        const roleDelta = (roleOrder[a.role] ?? 1) - (roleOrder[b.role] ?? 1);
        if (roleDelta) return roleDelta;
        const categoryDelta = a.category.localeCompare(b.category, 'fr');
        if (categoryDelta) return categoryDelta;
        return a.title.localeCompare(b.title, 'fr');
      });
  }

  function listParcours() {
    ensureSeed();
    return readAllParcours()
      .map(item => ({
        id:String(item.id || ''),
        name:String(item.name || ''),
        creator:String(item.creator || ''),
        createdAt:String(item.createdAt || ''),
        updatedAt:String(item.updatedAt || ''),
        systemProvided:item.systemProvided === true,
        testCount:Array.isArray(item.tests) ? item.tests.length : 0,
        introduction:item.introduction || null,
        fin:item.fin || null
      }))
      .sort((a, b) => {
        if (a.systemProvided !== b.systemProvided) return a.systemProvided ? -1 : 1;
        return a.name.localeCompare(b.name, 'fr');
      });
  }

  function resolveDefinition(definitions, ref, expectedRole) {
    if (!ref || typeof ref !== 'object') throw new Error('Référence de page invalide.');
    const record = definitions.get(String(ref.id || ''));
    if (!record) throw new Error('Page KALTEST introuvable : ' + String(ref.id || ''));
    if (String(record.definition.version) !== String(ref.version || '')) {
      throw new Error('Version KALTEST introuvable : ' + String(ref.id || '') + ' ' + String(ref.version || ''));
    }
    const role = roleOf(record.definition);
    if (role !== expectedRole) {
      throw new Error('Type de page invalide pour ' + String(ref.id || '') + ' : ' + role + ' au lieu de ' + expectedRole + '.');
    }
    return record.definition;
  }

  function saveParcours(payload = {}) {
    ensureSeed();

    const name = String(payload.name || '').trim();
    const creator = String(payload.creator || '').trim();
    if (!name) return { ok:false, error:'Le nom du parcours est obligatoire.' };
    if (!creator) return { ok:false, error:'Le nom du créateur est obligatoire.' };

    const existing = readAllParcours();
    const key = safeNameKey(name);
    if (existing.some(item => safeNameKey(item.name) === key)) {
      return { ok:false, error:'Un parcours portant ce nom existe déjà.' };
    }

    const definitions = scanLatestDefinitions();

    let introduction;
    let fin;
    try {
      introduction = resolveDefinition(definitions, payload.introduction, 'introduction');
      fin = resolveDefinition(definitions, payload.fin, 'fin');
    } catch (error) {
      return { ok:false, error:error.message };
    }

    const refs = Array.isArray(payload.tests) ? payload.tests : [];
    const seen = new Set();
    const tests = [];
    for (const ref of refs) {
      const id = String(ref && ref.id || '');
      if (!id) return { ok:false, error:'Un test du parcours est invalide.' };
      if (seen.has(id)) return { ok:false, error:'Un même test ne peut apparaître qu’une seule fois dans un parcours.' };
      seen.add(id);
      try {
        const definition = resolveDefinition(definitions, ref, 'test');
        tests.push(refFor(definition));
      } catch (error) {
        return { ok:false, error:error.message };
      }
    }

    const stamp = now().toISOString();
    let id = 'parcours-' + slugify(name);
    let file = path.join(parcoursRoot, id + '.json');
    let index = 2;
    while (fs.existsSync(file)) {
      id = 'parcours-' + slugify(name) + '-' + index;
      file = path.join(parcoursRoot, id + '.json');
      index += 1;
    }

    const value = {
      format:'kaloneo-parcours',
      schemaVersion:1,
      id,
      name,
      creator,
      systemProvided:false,
      createdAt:stamp,
      updatedAt:stamp,
      introduction:refFor(introduction),
      tests,
      fin:refFor(fin)
    };

    atomicWriteJson(file, value);
    return { ok:true, parcours:value };
  }

  ensureSeed();

  return Object.freeze({
    paths:Object.freeze({ root, testsRoot, parcoursRoot }),
    ensureSeed,
    listTests,
    listParcours,
    saveParcours
  });
}

module.exports = { createKaloneoLibrary };
