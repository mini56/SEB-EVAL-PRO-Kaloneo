'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const Core = require('../../kaloneo/builder-core');
const { createKaloneoLibrary } = require('../src/kaloneo-library-main');

const root = path.resolve(__dirname, '..');
const seedTestsRoot = path.join(root, 'source', 'kaltest', 'tests');
const organisationFile = path.join(seedTestsRoot, 'organisation-demenagement', '1.0.0', 'test.json');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kaloneo-edit-existing-'));

function fail(message, detail) {
  console.error('KALONEO_EDIT_EXISTING_TEST: FAIL — ' + message);
  if (detail) console.error(JSON.stringify(detail, null, 2));
  process.exit(2);
}

function makeV2(definition) {
  const model = Core.definitionToModel(definition);
  if (model.meta.layout !== '50-50') fail('la V1 Organisation ne remonte pas son ratio 50/50', model.meta);

  const image = model.blocks.find(block => block.type === 'image');
  const questions = model.blocks.filter(block => block.type === 'question');
  if (!image || questions.length !== 8) {
    fail('la V1 Organisation doit être reconstruite en 1 image + 8 questions dans le Builder', {
      blocks:model.blocks.map(block => ({type:block.type,zone:block.zone,uid:block.uid}))
    });
  }
  if (image.zone !== 'left' || questions.some(block => block.zone !== 'right')) {
    fail('la composition V1 historique doit être fidèle avant modification', {
      imageZone:image.zone,
      questionZones:questions.map(block => block.zone)
    });
  }

  model.meta.version = '2.0.0';
  model.meta.layout = '60-40';

  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#f4b44b"/><circle cx="200" cy="150" r="80" fill="#1b6c8e"/></svg>';
  image.zone = 'right';
  image.mediaName = 'organisation-v2.svg';
  image.mediaType = 'image/svg+xml';
  image.mediaData = 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
  image.mediaAlt = 'Illustration ajoutée dans la V2';
  questions.forEach(block => { block.zone = 'left'; });

  const v2 = Core.modelToDefinition(model);
  return { model, v2 };
}

try {
  const v1 = JSON.parse(fs.readFileSync(organisationFile, 'utf8'));
  const { v2 } = makeV2(v1);

  if (v2.version !== '2.0.0') fail('la nouvelle version n’est pas conservée', v2.version);
  if (v2.presentation?.layout !== '60-40') fail('le layout V2 60/40 n’est pas enregistré', v2.presentation);
  if (!Array.isArray(v2.presentation?.builderContent)) fail('builderContent absent de la V2', v2.presentation);
  if (v2.presentation?.organisationList) fail('l’ancien renderer organisationList reste dans la V2', v2.presentation);

  const imageItem = v2.presentation.builderContent.find(item => item.type === 'image');
  const questionItems = v2.presentation.builderContent.filter(item => item.type === 'question');
  if (!imageItem || imageItem.zone !== 'right' || !String(imageItem.resource?.data || '').startsWith('data:image/svg+xml;base64,')) {
    fail('l’image V2 droite n’est pas réellement embarquée dans le test.json', imageItem);
  }
  if (questionItems.length !== 8 || questionItems.some(item => item.zone !== 'left')) {
    fail('les 8 questions ne sont pas enregistrées à gauche dans la V2', questionItems);
  }
  if ((v2.questions || []).length !== 8 || v2.questions.some(q => !Array.isArray(q.acceptedAnswers) || !q.acceptedAnswers.length)) {
    fail('les réponses/corrections historiques ont été perdues pendant la modification', v2.questions);
  }

  let library = createKaloneoLibrary({ dataRoot:tempRoot, seedTestsRoot });
  const savedV2 = library.saveTest(v2);
  if (!savedV2?.ok) fail('enregistrement V2 impossible', savedV2);

  const overwriteV1 = library.saveTest(v1, { overwrite:true });
  if (overwriteV1?.ok || overwriteV1?.code !== 'PROTECTED_VERSION') {
    fail('la V1 système doit refuser tout écrasement, même avec overwrite=true', overwriteV1);
  }

  // Simule une ancienne version de l'application qui avait déjà corrompu
  // localement la V1 en y enregistrant une modification admin/V2.
  const localV1File = path.join(library.paths.testsRoot, 'organisation-demenagement', '1.0.0', 'test.json');
  const corruptedV1 = JSON.parse(JSON.stringify(v2));
  corruptedV1.version = '1.0.0';
  corruptedV1.scenario = 'ANCIENNE V1 LOCALE MODIFIEE PAR ERREUR';
  corruptedV1.kaloneoLibrary = { adminModified:true, modifiedAt:'2026-10-09T00:00:00.000Z' };
  fs.writeFileSync(localV1File, JSON.stringify(corruptedV1, null, 2));

  library = createKaloneoLibrary({ dataRoot:tempRoot, seedTestsRoot });
  const persistedV2 = library.getTest('organisation_demenagement', '2.0.0')?.definition;
  const persistedV1 = library.getTest('organisation_demenagement', '1.0.0')?.definition;

  const organisationVersions = library.listTests()
    .filter(item => item.id === 'organisation_demenagement')
    .map(item => item.version);
  if (!organisationVersions.includes('1.0.0') || !organisationVersions.includes('2.0.0')) {
    fail('la bibliothèque masque une version Organisation quand V1 et V2 coexistent', organisationVersions);
  }
  const v1Meta = library.listTests().find(item => item.id === 'organisation_demenagement' && item.version === '1.0.0');
  if (!v1Meta?.protectedVersion) {
    fail('la V1 Organisation fournie doit rester visible et protégée', v1Meta);
  }

  const baseRuntime = library.resolveParcoursRuntime('parcours-de-base');
  if (!baseRuntime?.ok) fail('le Parcours de base ne se résout plus après création de la V2', baseRuntime);
  const baseOrganisation = baseRuntime.runtime.tests.find(item => item.id === 'organisation_demenagement');
  if (baseOrganisation?.version !== '1.0.0') {
    fail('le Parcours de base doit rester verrouillé sur Organisation V1', baseOrganisation);
  }

  const baseDetails = library.getParcoursDetails('parcours-de-base');
  const detailOrganisation = baseDetails?.details?.tests?.find(entry => entry.ref?.id === 'organisation_demenagement');
  if (!baseDetails?.ok || detailOrganisation?.meta?.version !== '1.0.0') {
    fail('les détails du Parcours de base doivent encore retrouver Organisation V1', baseDetails);
  }

  if (!persistedV2?.kaloneoLibrary?.adminModified ||
      persistedV2.presentation?.builderContent?.find(item => item.type === 'image')?.zone !== 'right') {
    fail('la V2 admin ne survit pas à la resynchronisation de bibliothèque', persistedV2);
  }
  if (persistedV1?.scenario !== v1.scenario ||
      persistedV1?.version !== '1.0.0' ||
      persistedV1?.kaloneoLibrary?.adminModified === true ||
      persistedV1?.presentation?.builderContent ||
      persistedV1?.presentation?.organisationList?.visual?.src !== v1.presentation?.organisationList?.visual?.src) {
    fail('la vraie V1 système Organisation n’est pas restaurée depuis le seed', persistedV1);
  }

  const deleteV1 = library.deleteTest('organisation_demenagement', '1.0.0');
  if (deleteV1?.ok || deleteV1?.code !== 'PROTECTED') {
    fail('la V1 système Organisation doit rester impossible à supprimer', deleteV1);
  }
  const deleteV2 = library.deleteTest('organisation_demenagement', '2.0.0');
  if (!deleteV2?.ok) {
    fail('une V2 admin inutilisée doit pouvoir être supprimée', deleteV2);
  }
  if (library.getTest('organisation_demenagement', '2.0.0')?.ok) {
    fail('la V2 admin supprimée est encore présente');
  }
  if (!library.getTest('organisation_demenagement', '1.0.0')?.ok) {
    fail('la suppression de V2 ne doit jamais toucher la V1 système');
  }

  console.log('KALONEO_EDIT_EXISTING_TEST=OK');
  console.log('KALONEO_VERSIONED_LIBRARY_V1_V2=OK');
  console.log('KALONEO_BASE_PARCOURS_PINNED_V1=OK');
  console.log('KALONEO_V1_PROTECTED_V2_DELETABLE=OK');
  console.log('KALONEO_SYSTEM_V1_SELF_RESTORED=OK');
  console.log('KALONEO_SYSTEM_V1_IMMUTABLE=OK');
  console.log(JSON.stringify({
    v1:{version:v1.version,layout:v1.presentation?.layout?.ratio},
    v2:{
      version:persistedV2.version,
      layout:persistedV2.presentation?.layout,
      imageZone:persistedV2.presentation?.builderContent?.find(item=>item.type==='image')?.zone,
      questions:persistedV2.presentation?.builderContent?.filter(item=>item.type==='question').length,
      adminModified:persistedV2.kaloneoLibrary?.adminModified
    }
  }));
} finally {
  try { fs.rmSync(tempRoot, { recursive:true, force:true }); } catch (_) {}
}
