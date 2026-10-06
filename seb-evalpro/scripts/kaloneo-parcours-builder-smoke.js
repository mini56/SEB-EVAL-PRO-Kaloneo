'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createKaloneoLibrary } = require('../src/kaloneo-library-main');

const root = path.resolve(__dirname, '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'seb-kaloneo-parcours-'));

try {
  const library = createKaloneoLibrary({
    dataRoot: temp,
    seedTestsRoot: path.join(root, 'source', 'kaltest', 'tests'),
    now: () => new Date('2026-10-05T12:00:00.000Z')
  });

  const tests = library.listTests();
  const intro = tests.filter(item => item.role === 'introduction');
  const normal = tests.filter(item => item.role === 'test');
  const fins = tests.filter(item => item.role === 'fin');

  assert.strictEqual(tests.length, 23, '23 éléments attendus : 1 introduction + 21 tests + 1 fin');
  assert.strictEqual(intro.length, 1, 'une introduction de base attendue');
  assert.strictEqual(normal.length, 21, '21 tests intermédiaires attendus');
  assert.strictEqual(fins.length, 1, 'une page de fin attendue');

  assert.ok(fs.existsSync(path.join(temp, 'KALONEO', 'Bibliotheque-tests')), 'bibliothèque interne absente');
  assert.ok(fs.existsSync(path.join(temp, 'KALONEO', 'Parcours')), 'dossier interne Parcours absent');
  assert.ok(fs.existsSync(path.join(temp, 'KALONEO', 'Ecrans-masquage')), 'dossier interne Écrans de masquage absent');

  const masks = library.listMaskScreens();
  assert.ok(masks.some(item => item.id === 'kaloneo-default' && item.systemProvided), 'écran KALONÉO par défaut absent');

  const customMask = library.saveMaskScreen({
    id:'masque-smoke',
    version:'1.0.0',
    name:'Masque smoke',
    content:{text:'Écran de test',image:''}
  });
  assert.strictEqual(customMask.ok, true, customMask.error || 'écran de masquage refusé');

  const sourceDefinition = library.getTest(normal[0].id, normal[0].version);
  assert.strictEqual(sourceDefinition.ok, true, 'lecture d’un test source impossible');
  const generated = JSON.parse(JSON.stringify(sourceDefinition.definition));
  generated.id = 'test_genere_smoke';
  generated.version = '1.0.0';
  generated.title = 'Test généré smoke';
  const savedTest = library.saveTest(generated);
  assert.strictEqual(savedTest.ok, true, savedTest.error || 'nouveau test non enregistré');
  assert.ok(library.listTests().some(item => item.id === generated.id), 'nouveau test absent de la bibliothèque');
  const duplicateTestVersion = library.saveTest(generated);
  assert.strictEqual(duplicateTestVersion.ok, false, 'une version existante ne doit pas être remplacée silencieusement');
  assert.strictEqual(duplicateTestVersion.code, 'EXISTS');
  const overwrittenTest = library.saveTest(generated, {overwrite:true});
  assert.strictEqual(overwrittenTest.ok, true, overwrittenTest.error || 'remplacement explicite impossible');

  const base = library.listParcours().find(item => item.id === 'parcours-de-base');
  assert.ok(base, 'Parcours de base absent');
  assert.strictEqual(base.testCount, 21, 'le parcours de base doit contenir 21 tests intermédiaires');
  assert.strictEqual(base.creator, 'SEB EvalPro / KALONÉO');

  const selected = normal.slice(0, 3);
  const payload = {
    name:'Parcours long',
    creator:'Test automatisé',
    maskScreen:{ id:'masque-smoke', version:'1.0.0' },
    introduction:{ id:intro[0].id, version:intro[0].version },
    tests:selected.map(item => ({ id:item.id, version:item.version })),
    fin:{ id:fins[0].id, version:fins[0].version }
  };

  const saved = library.saveParcours(payload);
  assert.strictEqual(saved.ok, true, saved.error || 'enregistrement refusé');
  assert.strictEqual(saved.parcours.name, 'Parcours long');
  assert.strictEqual(saved.parcours.creator, 'Test automatisé');
  assert.strictEqual(saved.parcours.tests.length, 3);
  assert.deepStrictEqual(saved.parcours.maskScreen, {id:'masque-smoke',version:'1.0.0'});

  const opened = library.getParcours(saved.parcours.id);
  assert.strictEqual(opened.ok, true, opened.error || 'réouverture du parcours impossible');
  assert.strictEqual(opened.parcours.tests.length, 3);

  const details = library.getParcoursDetails(saved.parcours.id);
  assert.strictEqual(details.ok, true, details.error || 'détail du parcours impossible');
  assert.strictEqual(details.details.maskScreenMeta.name, 'Masque smoke');
  assert.strictEqual(details.details.tests.length, 3);
  assert.strictEqual(details.details.tests[0].meta.title, selected[0].title);

  const selectedResult = library.selectParcours(saved.parcours.id);
  assert.strictEqual(selectedResult.ok, true, selectedResult.error || 'sélection du parcours impossible');
  assert.strictEqual(library.getSelectedParcours().selected.id, saved.parcours.id);
  assert.strictEqual(
    library.getSelectedParcours().selected.launchOptions.showCorrectionsDuringParcours,
    false,
    'les corrections doivent être masquées par défaut'
  );

  let runtime = library.resolveParcoursRuntime();
  assert.strictEqual(runtime.ok, true, runtime.error || 'résolution runtime impossible');
  assert.strictEqual(runtime.runtime.title, 'Parcours long');
  assert.strictEqual(runtime.runtime.tests.length, 3);
  assert.strictEqual(runtime.runtime.fin.id, fins[0].id);
  assert.strictEqual(runtime.runtime.maskScreenDefinition.name, 'Masque smoke');
  assert.strictEqual(runtime.runtime.launchOptions.showCorrectionsDuringParcours, false);

  const selectedWithCorrections = library.selectParcours(saved.parcours.id, {showCorrectionsDuringParcours:true});
  assert.strictEqual(selectedWithCorrections.ok, true, selectedWithCorrections.error || 'sélection avec corrections impossible');
  assert.strictEqual(selectedWithCorrections.selected.launchOptions.showCorrectionsDuringParcours, true);
  runtime = library.resolveParcoursRuntime();
  assert.strictEqual(runtime.runtime.launchOptions.showCorrectionsDuringParcours, true, 'le choix Admin Oui doit arriver au runtime');

  library.selectParcours(saved.parcours.id, {showCorrectionsDuringParcours:false});
  runtime = library.resolveParcoursRuntime();
  assert.strictEqual(runtime.runtime.launchOptions.showCorrectionsDuringParcours, false, 'le choix Admin Non doit être restauré');

  const updated = library.saveParcours({
    ...payload,
    id:saved.parcours.id,
    name:'Parcours long modifié',
    tests:selected.slice(0,2).map(item=>({id:item.id,version:item.version}))
  });
  assert.strictEqual(updated.ok, true, updated.error || 'mise à jour du parcours refusée');
  assert.strictEqual(updated.updated, true);
  assert.strictEqual(updated.parcours.tests.length, 2);
  assert.strictEqual(library.getParcours(saved.parcours.id).parcours.name, 'Parcours long modifié');

  const protectedBaseUpdate = library.saveParcours({
    ...payload,
    id:'parcours-de-base',
    name:'Parcours de base',
    creator:'SEB EvalPro / KALONÉO'
  });
  assert.strictEqual(protectedBaseUpdate.ok, false, 'le parcours de base doit rester protégé');

  const duplicateName = library.saveParcours({ ...payload, name:'  PARCOURS   LONG   MODIFIÉ  ' });
  assert.strictEqual(duplicateName.ok, false, 'le nom de parcours doit être unique');
  assert.match(duplicateName.error, /existe déjà/i);

  const duplicateTest = library.saveParcours({
    ...payload,
    name:'Parcours doublon',
    tests:[payload.tests[0], payload.tests[0]]
  });
  assert.strictEqual(duplicateTest.ok, false, 'un test dupliqué doit être refusé');
  assert.match(duplicateTest.error, /une seule fois/i);

  const wrongIntro = library.saveParcours({
    ...payload,
    name:'Parcours intro invalide',
    introduction:payload.tests[0]
  });
  assert.strictEqual(wrongIntro.ok, false, 'un test normal ne peut pas remplacer l’introduction');

  const missingCreator = library.saveParcours({ ...payload, name:'Sans créateur', creator:'' });
  assert.strictEqual(missingCreator.ok, false, 'le créateur est obligatoire');

  console.log('KALONEO_PARCOURS_BUILDER_SMOKE=OK');
} finally {
  fs.rmSync(temp, { recursive:true, force:true });
}
