'use strict';

const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const policy=require('../src/kaloneo-full-parcours-route');

function fail(message){
  console.error('PILOT21_ROUTE_POLICY: FAIL — '+message);
  process.exit(2);
}
function expect(actual,expected,label){
  if(actual!==expected)fail(label+' | obtenu='+actual+' | attendu='+expected);
}

expect(policy.normalizeCandidateRoute('qcmv1.0.html'),policy.INITIAL_ROUTE,'ancien point d’entrée QCM doit être refusé');
expect(policy.normalizeCandidateRoute('qcmv1.0.html?page=1#page1'),policy.INITIAL_ROUTE,'ancienne page 1 doit être refusée');
expect(policy.normalizeCandidateRoute('qcmv1.0.html?page=4#page4'),policy.INITIAL_ROUTE,'ancienne page 4 doit être refusée après migration KALTEST');
expect(policy.normalizeCandidateRoute('kaltest-pilot2.html?segment=fractions'),'kaltest-pilot2.html?fullParcours=1&segment=fractions','segment Fractions KALTEST');
expect(policy.normalizeCandidateRoute('kaltest-pilot2.html?segment=organisation'),'kaltest-pilot2.html?fullParcours=1&segment=organisation','segment Organisation KALTEST');
expect(policy.normalizeCandidateRoute('kaltest-pilot2.html?segment=postures'),'kaltest-pilot2.html?fullParcours=1&segment=postures','segment Postures KALTEST');
expect(policy.normalizeCandidateRoute('planning.html'),policy.INITIAL_ROUTE,'ancienne page Planning doit être refusée après migration KALTEST');
expect(policy.normalizeCandidateRoute('kaltest-pilot2.html?segment=planning'),'kaltest-pilot2.html?fullParcours=1&segment=planning','segment Planning KALTEST');
expect(policy.normalizeCandidateRoute('autoeval1.html'),policy.INITIAL_ROUTE,'ancienne Autoévaluation 1 doit être refusée');
expect(policy.normalizeCandidateRoute('kaltest-pilot2.html?segment=autoeval1'),'kaltest-pilot2.html?fullParcours=1&segment=autoeval1','segment Autoévaluation 1 KALTEST');
expect(policy.normalizeCandidateRoute('stock.html'),policy.INITIAL_ROUTE,'ancienne page Stock doit être refusée');
expect(policy.normalizeCandidateRoute('kaltest-pilot2.html?segment=stock'),'kaltest-pilot2.html?fullParcours=1&segment=stock','segment Stock KALTEST');
expect(policy.normalizeCandidateRoute('autoeval2.html'),policy.INITIAL_ROUTE,'ancienne Autoévaluation 2 doit être refusée');
expect(policy.normalizeCandidateRoute('nvmail.html'),policy.INITIAL_ROUTE,'ancienne page Mail doit être refusée');
expect(policy.normalizeCandidateRoute('kaltest-pilot2.html?segment=mail'),'kaltest-pilot2.html?fullParcours=1&segment=mail','segment Mail KALTEST');
expect(policy.normalizeCandidateRoute('kaltest-pilot2.html?segment=autoeval2'),'kaltest-pilot2.html?fullParcours=1&segment=autoeval2','segment Autoévaluation 2 KALTEST');
expect(policy.normalizeCandidateRoute('carre.html'),policy.INITIAL_ROUTE,'ancienne page Gratte-ciel doit être refusée');
expect(policy.normalizeCandidateRoute('kaltest-pilot2.html?segment=carre'),'kaltest-pilot2.html?fullParcours=1&segment=carre','segment Gratte-ciel KALTEST');
expect(policy.normalizeCandidateRoute('qcmv1.0.html?fullParcours=1&page=finale#pageFinale'),policy.INITIAL_ROUTE,'ancienne page finale QCM doit être refusée');
expect(policy.normalizeCandidateRoute('introbrique.html'),policy.INITIAL_ROUTE,'ancienne page introbrique doit être refusée');
expect(policy.normalizeCandidateRoute('brique.html'),policy.INITIAL_ROUTE,'ancienne page Briques doit être refusée');
expect(policy.normalizeCandidateRoute('qcmv1.0.html?page=11#page11'),policy.INITIAL_ROUTE,'ancienne page 11 doit être refusée');
expect(policy.normalizeCandidateRoute('kaltest-pilot2.html?segment=transition-video-f1'),'kaltest-pilot2.html?fullParcours=1&segment=transition-video-f1','segment Transition vidéo F1 KALTEST');
expect(policy.normalizeCandidateRoute('kaltest-pilot2.html?segment=brique'),'kaltest-pilot2.html?fullParcours=1&segment=brique','segment Briques KALTEST');
expect(policy.normalizeCandidateRoute('kaltest-pilot2.html?segment=fin'),'kaltest-pilot2.html?fullParcours=1&segment=fin','segment fin de parcours KALTEST');
expect(policy.normalizeCandidateRoute('kaltest-pilot2.html?segment=genre-nombre'),'kaltest-pilot2.html?fullParcours=1&segment=genre-nombre','segment KALTEST doit forcer fullParcours');
expect(policy.normalizeCandidateRoute('dictee.html'),policy.INITIAL_ROUTE,'ancienne page Dictée doit être refusée');
expect(policy.normalizeCandidateRoute('kaltest-pilot2.html?segment=dictee'),'kaltest-pilot2.html?fullParcours=1&segment=dictee','segment Dictée KALTEST');
expect(policy.normalizeCandidateRoute('tri_de_cheville.html'),policy.INITIAL_ROUTE,'ancienne page Tri doit être refusée');
expect(policy.normalizeCandidateRoute('kaltest-pilot2.html?segment=tri'),'kaltest-pilot2.html?fullParcours=1&segment=tri','segment Tri KALTEST');
expect(policy.normalizeCandidateRoute('nwtexte.html'),policy.INITIAL_ROUTE,'ancienne page Traitement de texte doit être refusée');
expect(policy.normalizeCandidateRoute('kaltest-pilot2.html?segment=nwtexte'),'kaltest-pilot2.html?fullParcours=1&segment=nwtexte','segment Traitement de texte KALTEST');
expect(policy.normalizeCandidateRoute('kaltest-pilot2.html?segment=inconnu'),policy.INITIAL_ROUTE,'segment inconnu doit revenir à l’entrée KALONÉO');
expect(policy.normalizeCandidateRoute('page-inconnue.html'),policy.INITIAL_ROUTE,'page inconnue doit revenir à l’entrée KALONÉO');

expect(policy.resolveStateRoute({lastEvaluationPage:'qcmv1.0.html'}),policy.INITIAL_ROUTE,'ancienne reprise qcm sans page doit être neutralisée');
expect(policy.resolveStateRoute({lastEvaluationPage:'brique.html'}),policy.INITIAL_ROUTE,'ancienne reprise Briques doit être neutralisée');
expect(policy.resolveStateRoute({lastEvaluationPage:'nwtexte.html'}),policy.INITIAL_ROUTE,'ancienne reprise Traitement de texte doit être neutralisée');
expect(policy.resolveStateRoute({lastEvaluationRoute:'qcmv1.0.html?page=5#page5'}),policy.INITIAL_ROUTE,'ancienne reprise page 5 doit être neutralisée après migration KALTEST');
expect(policy.resolveStateRoute({lastEvaluationRoute:'kaltest-pilot2.html?segment=postures'}),'kaltest-pilot2.html?fullParcours=1&segment=postures','reprise exacte segment Postures');

const parcours=fs.readFileSync(path.join(root,'source','js','seb-parcours.js'),'utf8');
const pilotStart=parcours.indexOf('const pilot11Steps');
const pilotEnd=parcours.indexOf('function pilot11Enabled',pilotStart);
const pilot=parcours.slice(pilotStart,pilotEnd);
if(!pilot.includes('fullParcoursStep'))fail('le parcours KALONÉO ne force pas fullParcours sur toutes ses étapes');
if(/\n\s*legacyStep\(/.test(pilot))fail('une étape du nouveau parcours utilise encore directement legacyStep sans marqueur KALONÉO');

const preload=fs.readFileSync(path.join(root,'src','preload.js'),'utf8');
if(!preload.includes('lastEvaluationRoute'))fail('la reprise exacte page + query + hash n’est pas sauvegardée');
if(!preload.includes('isAdminKaloneoBuilderPage'))fail('le Builder Admin peut encore écraser la reprise candidat');

const main=fs.readFileSync(path.join(root,'src','main.js'),'utf8');
if(!main.includes('loadSavedCandidateEvaluation'))fail('le démarrage n’utilise pas la politique de reprise KALONÉO');
if(!main.includes('kaloneoFullParcoursRoute.resolveStateRoute'))fail('l’ancien point d’entrée peut encore être restauré sans filtrage');
if(!main.includes("const initialPage = 'kaltest-pilot2.html'"))fail('le démarrage candidat par défaut n’est pas KALTEST');
if(!main.includes('const initialRoute = kaloneoFullParcoursRoute.INITIAL_ROUTE'))fail('la route candidat initiale n’est pas la route KALONÉO');
if(main.includes("loadEvaluationFile(existingWebPage(state.lastEvaluationPage || state.lastPage))"))fail('un fallback candidat vers les anciennes pages est encore actif');

console.log('PILOT21_ROUTE_POLICY: OK');
console.log('LEGACY_STANDALONE_PARCOURS=DISABLED');
console.log('KALONEO_EXACT_RESUME_ROUTE=FILE_QUERY_HASH');
