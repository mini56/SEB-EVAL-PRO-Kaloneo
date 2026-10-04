'use strict';

const fs=require('fs');
const path=require('path');

const sebRoot=path.resolve(__dirname,'..');
const repoRoot=path.resolve(sebRoot,'..');
const builderRoot=path.join(repoRoot,'kaloneo');
const capabilitiesPath=path.join(builderRoot,'kaloneo-capabilities.json');
const corePath=path.join(builderRoot,'builder-core.js');

function fail(message,detail){
  console.error('KALONEO_BUILDER_PARITY: FAIL — '+message);
  if(detail) console.error(detail);
  process.exit(2);
}
function read(file){
  if(!fs.existsSync(file)) fail('fichier absent: '+path.relative(repoRoot,file));
  return fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
}
function json(file){
  try{return JSON.parse(read(file));}catch(error){fail('JSON invalide: '+path.relative(repoRoot,file),error.message);}
}
function normalize(value){
  if(Array.isArray(value)) return value.map(normalize);
  if(value&&typeof value==='object'){
    const out={};
    Object.keys(value).sort().forEach(k=>{
      if(value[k]!==undefined) out[k]=normalize(value[k]);
    });
    return out;
  }
  return value;
}

const capabilities=json(capabilitiesPath);
const Core=require(corePath);

if(capabilities.compiledWithSebEvalPro!==true) fail('la compilation commune KALONÉO / SEB EvalPro n’est pas déclarée');
if(capabilities.tables?.gridMode!==true) fail('bloc Tableau / Grille absent');
if(capabilities.tables?.questionCellAcceptedAnswers!==true) fail('réponse attendue par cellule absente');
if(capabilities.tables?.columnWidthCharacters!==true) fail('largeur de colonne en caractères absente');
if(capabilities.tables?.lastColumnUsesRemainder!==true) fail('dernière colonne = reste disponible absent');
if(capabilities.chrono?.singleCommonEngine!=='js/kaloneo-chrono.js') fail('compteur commun KALONÉO non déclaré');
if(capabilities.chrono?.displayFontSizePx!==44) fail('taille commune du compteur différente de 44 px');
if(capabilities.navigation?.normalNextLabel!=='Suivant') fail('libellé Suivant non canonique');
if(capabilities.navigation?.stableBarGlobalRelabelingForbidden!==true) fail('protection de la barre stable absente');
if(capabilities.context?.textStartsOnSameLine!==true) fail('règle Scénario/Consigne sur la même ligne absente');

const builderHtml=read(path.join(builderRoot,'test-builder.html'));
const builderJs=read(path.join(builderRoot,'test-builder.js'));
const prepare=read(path.join(sebRoot,'scripts','prepare-web.js'));
const admin=read(path.join(sebRoot,'overrides','admin-tests-parcours.html'));
const adminJs=read(path.join(sebRoot,'source','js','admin-tests-parcours.js'));
const main=read(path.join(sebRoot,'src','main.js'));

for(const token of [
  'builder-core.js','Importer test.json','table-grid','Gratte-ciel 6 × 6',
  'Largeurs en caractères + reste disponible','Démarrer le compteur','Arrêter le compteur'
]) if(!builderHtml.includes(token)) fail('Builder UI incomplet: '+token);

for(const token of [
  "Core.createGridBlock(6,6)","acceptedAnswers=answers","response-table","inline-flow","multiple-tables",
  "Core.modelToDefinition","Core.analyzeDefinition"
]) if(!builderJs.includes(token)) fail('Builder V2 incomplet: '+token);

if(!prepare.includes("copyTree(kaloneoBuilderDir,path.join(outputDir,'kaloneo-builder'))")) {
  fail('prepare:web ne compile pas le générateur KALONÉO');
}
if(!admin.includes('open-kaloneo-builder')||!adminJs.includes("kaloneo-builder/test-builder.html")) {
  fail('Tests / Parcours n’ouvre pas KALONÉO');
}
if(!main.includes("isAdminKaloneoBuilderPage")||!main.includes("'test-builder.html'")) {
  fail('le Builder KALONÉO n’est pas protégé comme page Administrateur');
}

const fixtureRoot=path.join(repoRoot,'tests','fixtures','kaltests');
const fixtureFiles=[];
function walk(dir){
  if(!fs.existsSync(dir))return;
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())walk(full);
    else if(entry.name==='test.json')fixtureFiles.push(full);
  }
}
walk(fixtureRoot);
if(!fixtureFiles.length) fail('aucun fixture KALTEST trouvé');

const ids=new Set();
const report=[];
for(const file of fixtureFiles){
  const def=json(file);
  ids.add(def.id);
  const analysis=Core.analyzeDefinition(def);
  if(!analysis.ok) fail('test non réalisable par KALONÉO: '+def.id,analysis.errors.join('\n'));

  const round=Core.canRoundTrip(def);
  if(!round.ok){
    const before=JSON.stringify(normalize(def));
    const after=JSON.stringify(normalize(round.rebuilt));
    if(before!==after) fail('test importé puis regénéré avec perte: '+def.id,round.errors.join('\n'));
  }
  report.push(def.id);
}

for(const id of capabilities.fixtureIdsRequiredInCi||[]){
  if(!ids.has(id)) fail('fixture obligatoire absent de la CI: '+id);
}

const decisions=read(path.join(repoRoot,'docs','KALONEO-DECISIONS-VALIDEES.md'));
for(const section of [
  '## 23. Présentations disponibles dans Test Builder',
  '## 31. Contenus et types de questions du bloc Exercice',
  '## 33. Tableau insérable dans un exercice',
  '## 40. Calculatrice — compatibilité du test et activation par le parcours',
  '## 50. Socle contractuel des exercices',
  '## 60. PILOTE 13 — harmonisation Scénario / Consigne et layouts validés',
  '## 63. Retour réel PILOTE 16 — corrections PILOTE 17 et règles de construction',
  '## 66. Retour réel PILOTE 19 — corrections locales Gratte-ciel / Tri'
]) if(!decisions.includes(section)) fail('décision historique introuvable: '+section);

const requiredArchetypes=[
  'calculs_commandes_atelier','calculs_poids_volumes','horaires_reception_controle',
  'texte_a_trous_stage_logistique','conversions_atelier_expedition','genre_nombre',
  'paronymes_rapport','fractions_proportions','organisation_activite','gestes_postures',
  'autoevaluation','briques_lego','stock','planning','dictee','tri_chevilles',
  'traitement_texte','redaction_email','gratte_ciel'
];
for(const id of requiredArchetypes){
  if(!capabilities.validatedArchetypes?.[id]) fail('archétype validé absent de KALONÉO: '+id);
}

console.log('KALONEO_BUILDER_PARITY: OK');
console.log('KALONEO_COMPILED_WITH_SEB_EVALPRO=YES');
console.log('KALONEO_FIXTURES_REALISABLES='+report.length+'/'+fixtureFiles.length);
console.log('KALONEO_FIXTURE_IDS='+report.join(','));
console.log('KALONEO_VALIDATED_ARCHETYPES='+requiredArchetypes.length);
console.log('KALONEO_TABLE_GRID=FIXED_EMPTY_ANSWER_MEDIA_MERGE');
console.log('KALONEO_BUILD_BLOCKS_ON_UNSUPPORTED_TEST=YES');
