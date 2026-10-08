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

const DEFAULT_MASK_ID = 'kaloneo-default';
const DEFAULT_MASK_VERSION = '1.0.0';

function createKaloneoLibrary(options = {}) {
  const dataRoot = String(options.dataRoot || '').trim();
  const seedTestsRoot = String(options.seedTestsRoot || '').trim();
  const now = typeof options.now === 'function' ? options.now : () => new Date();

  if (!dataRoot) throw new Error('dataRoot KALONÉO requis.');

  const root = path.join(dataRoot, 'KALONEO');
  const testsRoot = path.join(root, 'Bibliotheque-tests');
  const parcoursRoot = path.join(root, 'Parcours');
  const maskScreensRoot = path.join(root, 'Ecrans-masquage');
  const selectedParcoursFile = path.join(root, 'selected-parcours.json');

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

  function isBundledMigratedTest(definition) {
    const id = String(definition?.id || '');
    return BASE_TEST_ORDER.includes(id) &&
      definition?.sourceMigration &&
      typeof definition.sourceMigration === 'object';
  }

  function syncBundledSeedTests(source, destination) {
    if (!source || !fs.existsSync(source)) return;
    copyMissingTree(source, destination);

    for (const seedFile of walkTestFiles(source)) {
      const seedDefinition = readJson(seedFile);
      if (!isBundledMigratedTest(seedDefinition)) continue;

      const relative = path.relative(source, seedFile);
      const targetFile = path.join(destination, relative);
      const currentDefinition = readJson(targetFile);
      if (!currentDefinition) {
        atomicWriteJson(targetFile, seedDefinition);
        continue;
      }

      const sameIdentity =
        String(currentDefinition.id || '') === String(seedDefinition.id || '') &&
        String(currentDefinition.version || '') === String(seedDefinition.version || '');

      // Les tests historiques fournis par SEB EvalPro/KALONÉO doivent suivre
      // les corrections livrées par l'application. Un test créé par l'admin
      // n'a pas sourceMigration et n'est donc jamais écrasé ici.
      if (sameIdentity && isBundledMigratedTest(currentDefinition)) {
        const currentJson = JSON.stringify(currentDefinition);
        const seedJson = JSON.stringify(seedDefinition);
        if (currentJson !== seedJson) atomicWriteJson(targetFile, seedDefinition);
      }
    }
  }

  function walkNamedFiles(directory, filename, out = []) {
    if (!fs.existsSync(directory)) return out;
    for (const entry of fs.readdirSync(directory, { withFileTypes:true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) walkNamedFiles(full, filename, out);
      else if (entry.isFile() && entry.name.toLowerCase() === filename.toLowerCase()) out.push(full);
    }
    return out;
  }

  function walkTestFiles(directory, out = []) {
    return walkNamedFiles(directory, 'test.json', out);
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

  function safeSegment(value, fallback = 'item') {
    const clean = String(value || '').trim().replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
    return clean || fallback;
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

    const rawCategory = String(definition.category || (role === 'introduction' ? 'introduction' : role === 'fin' ? 'fin' : 'autres'));
    const category = String(definition.id) === 'planning_cantine' ? 'planification' : rawCategory;

    return {
      id:String(definition.id),
      version:String(definition.version),
      title:String(definition.title || definition.id),
      category,
      role,
      kind:String(definition.kind || 'complex'),
      activityType:String(definition.activityType || ''),
      scored:definition.scored !== false,
      description:String(definition.description || ''),
      questionCount:questions,
      icon:definition.icon || null,
      tools:[...new Set(tools)]
    };
  }

  function validateTestDefinition(definition) {
    if (!definition || typeof definition !== 'object' || Array.isArray(definition)) return 'Définition KALTEST absente.';
    if (Number(definition.kaltestFormat) !== 1) return 'Format KALTEST non supporté.';
    if (!String(definition.id || '').trim()) return 'ID du test obligatoire.';
    if (!String(definition.version || '').trim()) return 'Version du test obligatoire.';
    if (!String(definition.title || '').trim()) return 'Titre du test obligatoire.';
    if (!['test','introduction','fin'].includes(roleOf(definition))) return 'Type de page KALTEST invalide.';
    return '';
  }

  function exactTestFile(id, version) {
    const wantedId = String(id || '');
    const wantedVersion = String(version || '');
    for (const file of walkTestFiles(testsRoot)) {
      const definition = readJson(file);
      if (definition && String(definition.id) === wantedId && String(definition.version) === wantedVersion) return file;
    }
    return '';
  }

  function getTest(id, version) {
    ensureSeed();
    const file = exactTestFile(id, version);
    if (!file) return { ok:false, error:'Test KALTEST introuvable.' };
    const definition = readJson(file);
    if (!definition) return { ok:false, error:'Test KALTEST illisible.' };
    return { ok:true, definition };
  }

  function saveTest(definition, options = {}) {
    ensureSeed();
    const error = validateTestDefinition(definition);
    if (error) return { ok:false, error };

    const value = JSON.parse(JSON.stringify(definition));
    value.id = String(value.id).trim();
    value.version = String(value.version).trim();
    value.title = String(value.title).trim();

    const existing = exactTestFile(value.id, value.version);
    if (existing && options.overwrite !== true) {
      return { ok:false, code:'EXISTS', error:'Cette version du test existe déjà dans la bibliothèque.' };
    }

    const target = existing || path.join(
      testsRoot,
      safeSegment(value.id, 'test'),
      safeSegment(value.version, '1.0.0'),
      'test.json'
    );
    atomicWriteJson(target, value);
    const record = { definition:value, file:target };
    return { ok:true, replaced:Boolean(existing), test:toTestMetadata(record) };
  }

  function defaultMaskScreen() {
    return {
      format:'kaloneo-mask-screen',
      schemaVersion:1,
      id:DEFAULT_MASK_ID,
      version:DEFAULT_MASK_VERSION,
      name:'KALONÉO',
      systemProvided:true,
      createdAt:'2026-10-05T00:00:00.000Z',
      updatedAt:'2026-10-05T00:00:00.000Z',
      content:{
        text:'KALONÉO\nAu cœur d’un nouvel élan',
        image:''
      }
    };
  }

  function maskFile(id, version) {
    return path.join(maskScreensRoot, safeSegment(id, 'masque'), safeSegment(version, '1.0.0'), 'mask.json');
  }

  function ensureDefaultMaskScreen() {
    const target = maskFile(DEFAULT_MASK_ID, DEFAULT_MASK_VERSION);
    if (!fs.existsSync(target)) atomicWriteJson(target, defaultMaskScreen());
  }

  function scanMaskScreens() {
    const out = [];
    for (const file of walkNamedFiles(maskScreensRoot, 'mask.json')) {
      const value = readJson(file);
      if (!value || value.format !== 'kaloneo-mask-screen' || !value.id || !value.version) continue;
      out.push({ value, file });
    }
    return out;
  }

  function toMaskMetadata(record) {
    const value = record.value;
    return {
      id:String(value.id),
      version:String(value.version),
      name:String(value.name || value.id),
      systemProvided:value.systemProvided === true,
      hasText:Boolean(String(value.content?.text || '').trim()),
      hasImage:Boolean(String(value.content?.image || '').trim())
    };
  }

  function listMaskScreens() {
    ensureSeed();
    return scanMaskScreens()
      .map(toMaskMetadata)
      .sort((a,b) => {
        if (a.systemProvided !== b.systemProvided) return a.systemProvided ? -1 : 1;
        return a.name.localeCompare(b.name, 'fr');
      });
  }

  function findMaskScreen(id, version) {
    const wantedId = String(id || DEFAULT_MASK_ID);
    const wantedVersion = String(version || DEFAULT_MASK_VERSION);
    return scanMaskScreens().find(record =>
      String(record.value.id) === wantedId && String(record.value.version) === wantedVersion
    ) || null;
  }

  function getMaskScreen(ref = null) {
    ensureSeed();
    const id = String(ref && ref.id || DEFAULT_MASK_ID);
    const version = String(ref && ref.version || DEFAULT_MASK_VERSION);
    let record = findMaskScreen(id, version);
    if (!record && (id !== DEFAULT_MASK_ID || version !== DEFAULT_MASK_VERSION)) {
      record = findMaskScreen(DEFAULT_MASK_ID, DEFAULT_MASK_VERSION);
    }
    if (!record) return { ok:false, error:'Écran de masquage KALONÉO introuvable.' };
    return { ok:true, maskScreen:JSON.parse(JSON.stringify(record.value)) };
  }

  function saveMaskScreen(payload = {}, options = {}) {
    ensureSeed();
    const id = String(payload.id || '').trim();
    const version = String(payload.version || '1.0.0').trim();
    const name = String(payload.name || '').trim();
    const text = String(payload.content?.text || '');
    const image = String(payload.content?.image || '');

    if (!id) return { ok:false, error:'ID de l’écran de masquage obligatoire.' };
    if (!version) return { ok:false, error:'Version de l’écran de masquage obligatoire.' };
    if (!name) return { ok:false, error:'Nom de l’écran de masquage obligatoire.' };
    if (!text.trim() && !image.trim()) return { ok:false, error:'Ajoutez un texte, une image, ou les deux.' };
    if (id === DEFAULT_MASK_ID) return { ok:false, error:'L’écran KALONÉO par défaut est protégé.' };
    if (image && !/^data:image\//i.test(image)) return { ok:false, error:'L’image de masquage doit être embarquée dans KALONÉO.' };

    const target = maskFile(id, version);
    const exists = fs.existsSync(target);
    if (exists && options.overwrite !== true) {
      return { ok:false, code:'EXISTS', error:'Cette version de l’écran de masquage existe déjà.' };
    }

    const previous = exists ? readJson(target) : null;
    const stamp = now().toISOString();
    const value = {
      format:'kaloneo-mask-screen',
      schemaVersion:1,
      id,
      version,
      name,
      systemProvided:false,
      createdAt:String(previous?.createdAt || stamp),
      updatedAt:stamp,
      content:{ text, image }
    };
    atomicWriteJson(target, value);
    return { ok:true, replaced:exists, maskScreen:toMaskMetadata({ value, file:target }) };
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

  function maskRefFor(value) {
    return { id:String(value.id), version:String(value.version) };
  }

  function defaultMaskRef() {
    return { id:DEFAULT_MASK_ID, version:DEFAULT_MASK_VERSION };
  }

  function ensureBaseParcours() {
    const existing = readAllParcours().find(item => item && item.id === 'parcours-de-base');
    if (existing) {
      if (!existing.maskScreen) {
        existing.maskScreen = defaultMaskRef();
        existing.schemaVersion = Math.max(2, Number(existing.schemaVersion) || 1);
        atomicWriteJson(path.join(parcoursRoot, existing.id + '.json'), existing);
      }
      return;
    }

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
      schemaVersion:2,
      id:'parcours-de-base',
      name:'Parcours de base',
      creator:'SEB EvalPro / KALONÉO',
      systemProvided:true,
      createdAt:stamp,
      updatedAt:stamp,
      maskScreen:defaultMaskRef(),
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
    ensureDirectory(maskScreensRoot);
    if (seedTestsRoot && fs.existsSync(seedTestsRoot)) syncBundledSeedTests(seedTestsRoot, testsRoot);
    ensureDefaultMaskScreen();
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

  function findParcours(id) {
    const wanted = String(id || '').trim();
    if (!wanted) return null;
    return readAllParcours().find(item => String(item.id || '') === wanted) || null;
  }

  function getParcours(id) {
    ensureSeed();
    const value = findParcours(id);
    if (!value) return { ok:false, error:'Parcours introuvable.' };
    return { ok:true, parcours:JSON.parse(JSON.stringify(value)) };
  }

  function describeRef(ref, expectedRole) {
    if (!ref) return null;
    const definitions = scanLatestDefinitions();
    try {
      const definition = resolveDefinition(definitions, ref, expectedRole);
      return toTestMetadata({ definition, file:'' });
    } catch (_) {
      return null;
    }
  }

  function describeMask(ref) {
    const record = findMaskScreen(ref?.id, ref?.version);
    return record ? toMaskMetadata(record) : null;
  }

  function parcoursDetails(item) {
    const value = item && item.format === 'kaloneo-parcours' ? item : null;
    if (!value) return null;
    return {
      id:String(value.id || ''),
      name:String(value.name || ''),
      creator:String(value.creator || ''),
      createdAt:String(value.createdAt || ''),
      updatedAt:String(value.updatedAt || ''),
      systemProvided:value.systemProvided === true,
      testCount:Array.isArray(value.tests) ? value.tests.length : 0,
      maskScreen:value.maskScreen || defaultMaskRef(),
      maskScreenMeta:describeMask(value.maskScreen || defaultMaskRef()),
      introduction:value.introduction || null,
      introductionMeta:describeRef(value.introduction, 'introduction'),
      tests:(Array.isArray(value.tests) ? value.tests : []).map(ref => ({
        ref:JSON.parse(JSON.stringify(ref)),
        meta:describeRef(ref, 'test')
      })),
      fin:value.fin || null,
      finMeta:describeRef(value.fin, 'fin')
    };
  }

  function getParcoursDetails(id) {
    ensureSeed();
    const value = findParcours(id);
    if (!value) return { ok:false, error:'Parcours introuvable.' };
    return { ok:true, details:parcoursDetails(value) };
  }

  function readSelectedParcoursSelection() {
    const saved = readJson(selectedParcoursFile) || {};
    const id = String(saved.id || '').trim();
    const selectedId = id && findParcours(id) ? id : 'parcours-de-base';
    return {
      id:selectedId,
      launchOptions:{
        // Règle KALONÉO : aucune correction pendant le parcours sauf choix explicite Admin.
        showCorrectionsDuringParcours:saved.launchOptions?.showCorrectionsDuringParcours === true
      }
    };
  }

  function readSelectedParcoursId() {
    return readSelectedParcoursSelection().id;
  }

  function getSelectedParcours() {
    ensureSeed();
    const selection = readSelectedParcoursSelection();
    const value = findParcours(selection.id) || findParcours('parcours-de-base');
    if (!value) return { ok:false, error:'Aucun parcours disponible.' };
    return {
      ok:true,
      selected:{
        ...parcoursDetails(value),
        launchOptions:JSON.parse(JSON.stringify(selection.launchOptions))
      }
    };
  }

  function selectParcours(id, options = {}) {
    ensureSeed();
    const value = findParcours(id);
    if (!value) return { ok:false, error:'Parcours introuvable.' };
    const launchOptions = {
      showCorrectionsDuringParcours:options.showCorrectionsDuringParcours === true
    };
    atomicWriteJson(selectedParcoursFile, {
      format:'kaloneo-selected-parcours',
      schemaVersion:2,
      id:String(value.id),
      launchOptions,
      selectedAt:now().toISOString()
    });
    return {
      ok:true,
      selected:{
        ...parcoursDetails(value),
        launchOptions:JSON.parse(JSON.stringify(launchOptions))
      }
    };
  }

  function resolveParcoursRuntime(id = '') {
    ensureSeed();
    const persistedSelection = readSelectedParcoursSelection();
    const selectedId = String(id || persistedSelection.id || 'parcours-de-base');
    const launchOptions = id
      ? {showCorrectionsDuringParcours:false}
      : persistedSelection.launchOptions;
    const value = findParcours(selectedId) || findParcours('parcours-de-base');
    if (!value) return { ok:false, error:'Parcours KALONÉO introuvable.' };

    const definitions = scanLatestDefinitions();
    try {
      const introduction = resolveDefinition(definitions, value.introduction, 'introduction');
      const tests = (Array.isArray(value.tests) ? value.tests : []).map(ref => {
        const definition = JSON.parse(JSON.stringify(resolveDefinition(definitions, ref, 'test')));
        if (String(definition.id) === 'planning_cantine') definition.category = 'planification';
        return definition;
      });
      const fin = resolveDefinition(definitions, value.fin, 'fin');
      const mask = getMaskScreen(value.maskScreen || defaultMaskRef());
      if (!mask.ok) throw new Error(mask.error || 'Écran de masquage introuvable.');
      return {
        ok:true,
        runtime:{
          id:String(value.id),
          title:String(value.name || value.id),
          creator:String(value.creator || ''),
          launchOptions:{
            showCorrectionsDuringParcours:launchOptions.showCorrectionsDuringParcours === true
          },
          maskScreen:value.maskScreen || defaultMaskRef(),
          maskScreenDefinition:mask.maskScreen,
          introduction:JSON.parse(JSON.stringify(introduction)),
          tests:JSON.parse(JSON.stringify(tests)),
          fin:JSON.parse(JSON.stringify(fin))
        }
      };
    } catch (error) {
      return { ok:false, error:error && error.message ? error.message : String(error) };
    }
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
        selected:String(item.id || '') === readSelectedParcoursId(),
        testCount:Array.isArray(item.tests) ? item.tests.length : 0,
        maskScreen:item.maskScreen || defaultMaskRef(),
        maskScreenMeta:describeMask(item.maskScreen || defaultMaskRef()),
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

  function resolveMaskRef(ref) {
    const requested = ref && typeof ref === 'object' ? ref : defaultMaskRef();
    const record = findMaskScreen(requested.id, requested.version);
    if (!record) throw new Error('Écran de masquage introuvable : ' + String(requested.id || '') + '.');
    return maskRefFor(record.value);
  }

  function saveParcours(payload = {}) {
    ensureSeed();

    const name = String(payload.name || '').trim();
    const creator = String(payload.creator || '').trim();
    if (!name) return { ok:false, error:'Le nom du parcours est obligatoire.' };
    if (!creator) return { ok:false, error:'Le nom du créateur est obligatoire.' };

    const existing = readAllParcours();
    const editingId = String(payload.id || '').trim();
    const editing = editingId ? existing.find(item => String(item.id || '') === editingId) : null;
    if (editingId && !editing) return { ok:false, error:'Le parcours à modifier est introuvable.' };
    if (editing && editing.systemProvided === true) {
      return { ok:false, error:'Le parcours fourni « Parcours de base » est protégé. Créez un nouveau parcours pour le modifier.' };
    }

    const key = safeNameKey(name);
    if (existing.some(item => String(item.id || '') !== editingId && safeNameKey(item.name) === key)) {
      return { ok:false, error:'Un parcours portant ce nom existe déjà.' };
    }

    const definitions = scanLatestDefinitions();

    let introduction;
    let fin;
    let maskScreen;
    try {
      introduction = resolveDefinition(definitions, payload.introduction, 'introduction');
      fin = resolveDefinition(definitions, payload.fin, 'fin');
      maskScreen = resolveMaskRef(payload.maskScreen);
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
    let id = editing ? String(editing.id) : 'parcours-' + slugify(name);
    let file = path.join(parcoursRoot, id + '.json');

    if (!editing) {
      let index = 2;
      while (fs.existsSync(file)) {
        id = 'parcours-' + slugify(name) + '-' + index;
        file = path.join(parcoursRoot, id + '.json');
        index += 1;
      }
    }

    const value = {
      format:'kaloneo-parcours',
      schemaVersion:2,
      id,
      name,
      creator,
      systemProvided:false,
      createdAt:String(editing?.createdAt || stamp),
      updatedAt:stamp,
      maskScreen,
      introduction:refFor(introduction),
      tests,
      fin:refFor(fin)
    };

    atomicWriteJson(file, value);
    return { ok:true, updated:Boolean(editing), parcours:value };
  }

  ensureSeed();

  return Object.freeze({
    paths:Object.freeze({ root, testsRoot, parcoursRoot, maskScreensRoot }),
    ensureSeed,
    listTests,
    getTest,
    saveTest,
    listMaskScreens,
    getMaskScreen,
    saveMaskScreen,
    listParcours,
    getParcours,
    getParcoursDetails,
    saveParcours,
    getSelectedParcours,
    selectParcours,
    resolveParcoursRuntime,
    defaultMaskRef
  });
}

module.exports = { createKaloneoLibrary };
