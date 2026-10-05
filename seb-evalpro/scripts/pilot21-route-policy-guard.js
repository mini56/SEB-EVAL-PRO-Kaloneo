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
expect(policy.normalizeCandidateRoute('autoeval2.html'),policy.INITIAL_ROUTE,'ancienne Autoévaluation 2 doit être refusée');
expect(policy.normalizeCandidateRoute('kaltest-pilot2.html?segment=autoeval2'),'kaltest-pilot2.html?fullParcours=1&segment=autoeval2','segment Autoévaluation 2 KALTEST');
expect(policy.normalizeCandidateRoute('qcmv1.0.html?fullParcours=1&page=finale#pageFinale'),'qcmv1.0.html?fullParcours=1&page=finale#pageFinale','page finale KALONÉO');
expect(policy.normalizeCandidateRoute('brique.html'),'brique.html?fullParcours=1','page pratique doit rester dans le parcours KALONÉO');
expect(policy.normalizeCandidateRoute('kaltest-pilot2.html?segment=genre-nombre'),'kaltest-pilot2.html?fullParcours=1&segment=genre-nombre','segment KALTEST doit forcer fullParcours');
expect(policy.normalizeCandidateRoute('kaltest-pilot2.html?segment=inconnu'),policy.INITIAL_ROUTE,'segment inconnu doit revenir à l’entrée KALONÉO');
expect(policy.normalizeCandidateRoute('page-inconnue.html'),policy.INITIAL_ROUTE,'page inconnue doit revenir à l’entrée KALONÉO');

expect(policy.resolveStateRoute({lastEvaluationPage:'qcmv1.0.html'}),policy.INITIAL_ROUTE,'ancienne reprise qcm sans page doit être neutralisée');
expect(policy.resolveStateRoute({lastEvaluationPage:'brique.html'}),'brique.html?fullParcours=1','ancienne reprise d’une page unique reste possible');
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

console.log('PILOT21_ROUTE_POLICY: OK');
console.log('LEGACY_STANDALONE_PARCOURS=DISABLED_IN_PILOT21');
console.log('KALONEO_EXACT_RESUME_ROUTE=FILE_QUERY_HASH');
