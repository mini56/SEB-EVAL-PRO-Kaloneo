'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { createKaloneoLibrary } = require('../src/kaloneo-library-main');

const root = path.resolve(__dirname, '..');
const seedTestsRoot = path.join(root, 'source', 'kaltest', 'tests');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kaloneo-seed-refresh-'));

function fail(message, detail) {
  console.error('KALONEO_SEED_REFRESH: FAIL — ' + message);
  if (detail) console.error(JSON.stringify(detail, null, 2));
  process.exit(2);
}

try {
  let library = createKaloneoLibrary({ dataRoot:tempRoot, seedTestsRoot });
  const stockFile = path.join(library.paths.testsRoot, 'ranger-stock', '1.0.0', 'test.json');
  const puzzleFile = path.join(library.paths.testsRoot, 'gratte-ciel', '1.0.0', 'test.json');

  const stock = JSON.parse(fs.readFileSync(stockFile, 'utf8'));
  stock.presentation = { layout:'single', stockBoard:stock.presentation.stockBoard };
  stock.__stale = true;
  fs.writeFileSync(stockFile, JSON.stringify(stock, null, 2));

  const puzzle = JSON.parse(fs.readFileSync(puzzleFile, 'utf8'));
  puzzle.presentation = { layout:'single' };
  puzzle.__stale = true;
  fs.writeFileSync(puzzleFile, JSON.stringify(puzzle, null, 2));

  const custom = {
    kaltestFormat:1,
    id:'test_admin_personnalise',
    version:'1.0.0',
    title:'Test admin personnalisé',
    category:'autres',
    kind:'questionnaire',
    scored:false,
    presentation:{marker:'PRESERVER'},
    questions:[]
  };
  const saved = library.saveTest(custom);
  if (!saved?.ok) fail('impossible de créer le test admin de contrôle', saved);

  library = createKaloneoLibrary({ dataRoot:tempRoot, seedTestsRoot });
  const refreshedStock = library.getTest('ranger_stock','1.0.0')?.definition;
  const refreshedPuzzle = library.getTest('gratte_ciel','1.0.0')?.definition;
  const preservedCustom = library.getTest('test_admin_personnalise','1.0.0')?.definition;

  if (!refreshedStock?.presentation?.legacyFullPage ||
      refreshedStock?.presentation?.builderContent?.[0]?.preset !== 'stock-legacy-v1' ||
      refreshedStock.__stale) {
    fail('Stock système existant non rafraîchi', refreshedStock);
  }
  if (!refreshedPuzzle?.presentation?.legacyFullPage ||
      refreshedPuzzle?.presentation?.builderContent?.[0]?.preset !== 'gratte-ciel-legacy-v1' ||
      refreshedPuzzle.__stale) {
    fail('Puzzle système existant non rafraîchi', refreshedPuzzle);
  }
  if (preservedCustom?.presentation?.marker !== 'PRESERVER') {
    fail('un test créé par l’admin a été écrasé', preservedCustom);
  }

  console.log('KALONEO_SEED_REFRESH=OK');
  fs.rmSync(tempRoot, { recursive:true, force:true });
} catch (error) {
  try { fs.rmSync(tempRoot, { recursive:true, force:true }); } catch (_) {}
  fail(error?.message || String(error), error?.stack || '');
}
