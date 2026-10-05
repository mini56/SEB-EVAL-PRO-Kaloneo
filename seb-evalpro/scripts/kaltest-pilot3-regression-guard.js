const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function fail(message) {
  console.error('KALTEST PILOTE 3 guard: ' + message);
  process.exit(2);
}
function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}
function must(text, needle, label) {
  if (!text.includes(needle)) fail(label + ' absent: ' + needle);
}

const runtime = read('source/js/kaltest-pilot2-runtime.js');
const preload = read('src/preload.js');
const replay = read('src/replay-navigation-capture.js');
const html = read('source/kaltest-pilot2.html');
const css = read('source/css/kaltest-pilot2.css');

for (const [needle,label] of [
  ['syncLegacyCompatibility(test, testState)', 'pont Résultats/Bilan'],
  ["sessionStorage.setItem('paronymes_score'", 'score Paronymes'],
  ["sessionStorage.setItem('erreurs_exercice'", 'score Genre/Nombre'],
  ["window.closeCalculator?.()", 'fermeture calculatrice'],
  ["window.dispatchEvent(new CustomEvent('seb-kaltest-final'))", 'signal fin KALTEST'],
  ["input.placeholder = ''", 'suppression exemples horaires'],
  ["className = 'kaltest-table kaltest-grammar-table'", 'deux tableaux Genre/Nombre'],
  ["test.id === 'fractions_preparation_lots'", 'pont Fractions Résultats/Bilan'],
  ["test.id === 'organisation_demenagement'", 'pont Organisation Résultats/Bilan'],
  ["test.id === 'gestes_postures'", 'pont Postures Résultats'],
  ["function renderFractions(test, host)", 'rendu Fractions KALTEST'],
  ["function renderOrganisation(test, host)", 'rendu Organisation KALTEST'],
  ["function renderPostures(test, host)", 'rendu Postures KALTEST']
]) must(runtime, needle, label);

for (const [needle,label] of [
  ["document.getElementById('pageFinale') || document.getElementById('page-final')", 'fin commune'],
  ["id=\"seb-evalpro-open-candidate\"", 'barre Admin contextuelle'],
  ['closeSessionButton.hidden = true', 'masquage fermeture session redondante'],
  ['const hasActiveJourney = !!active', 'contexte parcours actif'],
  ['overflow:hidden;background:#004E70', 'barre Admin sans dépassement'],
  ["window.addEventListener('seb-kaltest-final'", 'écoute fin KALTEST']
]) must(preload, needle, label);

for (const [needle,label] of [
  ["lower === 'kaltest-pilot2.html'", 'Replay KALTEST'],
  ['pageKey: `${file}#test:${testId}`', 'clé Replay par exercice'],
  ['terminer le parcours', 'capture navigation finale']
]) must(replay, needle, label);

for (const [needle,label] of [
  ['Félicitations pour votre parcours !', 'page finale Build #20'],
  ['pilot2-calculator-guide', 'explications calculatrice'],
  ['Ouvrir la calculatrice', 'test calculatrice introduction']
]) must(html, needle, label);

for (const [needle,label] of [
  ['.kaltest-choice-table {', 'style Paronymes'],
  ['font-size: 15px;', 'police lisible'],
  ['.kaltest-two-tables {', 'deux tableaux Genre/Nombre'],
  ['grid-template-columns: 1fr;', 'Scénario / Consigne pleine largeur']
]) must(css, needle, label);

const scenarioLower = path.join(__dirname, '..', 'source/imageqcm/scenario.png');
const scenarioUpper = path.join(__dirname, '..', 'source/imageqcm/scenario.PNG');
if (!fs.existsSync(scenarioLower) || !fs.existsSync(scenarioUpper)) fail('icône Scénario manquante');
const lowerBytes = fs.readFileSync(scenarioLower);
const upperBytes = fs.readFileSync(scenarioUpper);
if (!lowerBytes.equals(upperBytes)) fail('scenario.png et scenario.PNG divergent');
const hash = crypto.createHash('sha256').update(lowerBytes).digest('hex');
if (hash !== '501daecabf564f9afca0da4f39d609841f65c341bf4d2a6d3069999b7f4b4fd6') {
  fail('icône Scénario validée remplacée ou altérée: ' + hash);
}

console.log('KALTEST_PILOT3_REGRESSION_GUARD: OK');
