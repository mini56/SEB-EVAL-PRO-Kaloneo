'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { createKaloneoLibrary } = require('../src/kaloneo-library-main');

const root = path.resolve(__dirname, '..');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kaloneo-image-library-'));

function makeStoredZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(String(entry.name), 'utf8');
    const data = Buffer.from(entry.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt32LE(0, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    const localRecord = Buffer.concat([local, name, data]);
    localParts.push(localRecord);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt32LE(0, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(Buffer.concat([central, name]));
    offset += localRecord.length;
  }

  const localData = Buffer.concat(localParts);
  const centralData = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralData.length, 12);
  eocd.writeUInt32LE(localData.length, 16);
  return Buffer.concat([localData, centralData, eocd]);
}

function fail(message, detail) {
  console.error('KALONEO_IMAGE_LIBRARY: FAIL — ' + message);
  if (detail) console.error(JSON.stringify(detail, null, 2));
  process.exit(2);
}

try {
  const library = createKaloneoLibrary({
    dataRoot:tempRoot,
    seedTestsRoot:path.join(root, 'source', 'kaltest', 'tests'),
    seedImageRoots:[
      {root:path.join(root, 'source', 'imageqcm'), category:'Images exercices SEB EvalPro'},
      {root:path.join(root, 'source', 'flacon'), category:'Images Stock'},
      {root:path.join(root, 'source', 'assets'), category:'Images KALONÉO'}
    ]
  });

  const initial = library.listImages();
  if (initial.length < 10) fail('trop peu d’images système récupérées', {count:initial.length});
  for (const name of ['demenagement.png','gratteciel.png','flacon_bleu.png']) {
    if (!initial.some(item => item.name.toLowerCase() === name.toLowerCase())) {
      fail('image système absente de la bibliothèque : ' + name);
    }
  }

  const dem = initial.find(item => item.name.toLowerCase() === 'demenagement.png');
  const loaded = library.getImage(dem.id);
  if (!loaded?.ok || !/^data:image\//i.test(loaded.image?.data || '')) {
    fail('lecture réutilisable de demenagement.png impossible', loaded);
  }

  const customData = 'data:image/svg+xml;base64,' + Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="24"><rect width="32" height="24" fill="#123456"/></svg>'
  ).toString('base64');

  const first = library.saveImage({
    name:'mon-image-kaloneo.svg',
    mime:'image/svg+xml',
    data:customData,
    category:'Mes images KALONÉO'
  });
  if (!first?.ok || first.duplicate) fail('premier import personnel incorrect', first);

  const second = library.saveImage({
    name:'copie-identique.svg',
    mime:'image/svg+xml',
    data:customData,
    category:'Mes images KALONÉO'
  });
  if (!second?.ok || !second.duplicate || second.image?.id !== first.image?.id) {
    fail('anti-doublon par contenu incorrect', {first,second});
  }

  const after = library.listImages();
  const personal = after.filter(item => item.systemProvided !== true);
  if (personal.length !== 1 || personal[0].category !== 'Mes images KALONÉO') {
    fail('image personnelle non conservée correctement', personal);
  }
  if (!String(library.paths.imagesRoot).startsWith(path.join(tempRoot,'KALONEO'))) {
    fail('bibliothèque images hors stockage interne KALONÉO', library.paths);
  }

  const zipPath = path.join(tempRoot, 'KALONEO_BIBLIOTHEQUE_THEME.zip');
  fs.writeFileSync(zipPath, makeStoredZip([
    {
      name:'KALONEO_BIBLIOTHEQUE_THEME/01_Batiment_Travaux/Paysage/01_test_paysage.jpg',
      data:Buffer.from('kaloneo-zip-paysage-image')
    },
    {
      name:'KALONEO_BIBLIOTHEQUE_THEME/01_Batiment_Travaux/Portrait/02_test_portrait.jpg',
      data:Buffer.from('kaloneo-zip-portrait-image')
    }
  ]));

  const imported = library.importImageZip(zipPath);
  if (!imported?.ok || imported.added !== 2 || imported.failed !== 0 ||
      !imported.themes?.includes('Batiment Travaux')) {
    fail('import ZIP thématique incorrect', imported);
  }

  const themed = library.listImages().filter(item => item.sourceName.includes('KALONEO_BIBLIOTHEQUE_THEME/'));
  if (themed.length !== 2 ||
      !themed.every(item => item.theme === 'Batiment Travaux') ||
      !themed.some(item => item.orientation === 'Paysage') ||
      !themed.some(item => item.orientation === 'Portrait')) {
    fail('thème/orientation du ZIP non conservés', themed);
  }

  const importedAgain = library.importImageZip(zipPath);
  if (!importedAgain?.ok || importedAgain.duplicates !== 2 || importedAgain.added !== 0) {
    fail('anti-doublon ZIP incorrect', importedAgain);
  }

  console.log('KALONEO_IMAGE_LIBRARY=OK');
  console.log(JSON.stringify({
    systemImages:after.filter(item=>item.systemProvided).length,
    personalImages:personal.length,
    duplicateId:first.image.id
  }));
} finally {
  try { fs.rmSync(tempRoot, { recursive:true, force:true }); } catch (_) {}
}
