'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { createKaloneoLibrary } = require('../src/kaloneo-library-main');

const root = path.resolve(__dirname, '..');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kaloneo-image-library-'));

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

  console.log('KALONEO_IMAGE_LIBRARY=OK');
  console.log(JSON.stringify({
    systemImages:after.filter(item=>item.systemProvided).length,
    personalImages:personal.length,
    duplicateId:first.image.id
  }));
} finally {
  try { fs.rmSync(tempRoot, { recursive:true, force:true }); } catch (_) {}
}
