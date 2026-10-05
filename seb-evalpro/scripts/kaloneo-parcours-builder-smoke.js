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

  const base = library.listParcours().find(item => item.id === 'parcours-de-base');
  assert.ok(base, 'Parcours de base absent');
  assert.strictEqual(base.testCount, 21, 'le parcours de base doit contenir 21 tests intermédiaires');
  assert.strictEqual(base.creator, 'SEB EvalPro / KALONÉO');

  const selected = normal.slice(0, 3);
  const payload = {
    name:'Parcours long',
    creator:'Test automatisé',
    introduction:{ id:intro[0].id, version:intro[0].version },
    tests:selected.map(item => ({ id:item.id, version:item.version })),
    fin:{ id:fins[0].id, version:fins[0].version }
  };

  const saved = library.saveParcours(payload);
  assert.strictEqual(saved.ok, true, saved.error || 'enregistrement refusé');
  assert.strictEqual(saved.parcours.name, 'Parcours long');
  assert.strictEqual(saved.parcours.creator, 'Test automatisé');
  assert.strictEqual(saved.parcours.tests.length, 3);

  const duplicateName = library.saveParcours({ ...payload, name:'  PARCOURS   LONG  ' });
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
