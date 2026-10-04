const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function fail(message){
  console.error('SEB EvalPro garde navigation KALONÉO: ' + message);
  process.exit(2);
}
function read(rel){
  const file=path.join(root,rel);
  if(!fs.existsSync(file)) fail('fichier introuvable: '+rel);
  return fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
}

const runtime=read('app/web/js/seb-ui-runtime.js');

for(const token of [
  '// KALONEO_COMMON_NAVIGATION_AND_BULLETS',
  "window.KaloneoNavigation=Object.freeze",
  "id='kaloneo-common-navigation'",
  "Navigation du parcours",
  "grid-template-columns:minmax(220px,1fr) minmax(320px,2fr) minmax(220px,1fr)",
  "border-top:1px solid rgba(0,78,112,.28)",
  "background:rgba(248,251,253,.72)",
  "box-shadow:none!important",
  "source.click()",
  "data-kaloneo-nav-slot",
  "content:\"•  \""
]) if(!runtime.includes(token)) fail('contrat commun absent: '+token);

for(const id of [
  'stockActionBtn','btnValider','btnSuivant','btnNextGenreNombre','seb-dictee-action',
  'seb-tri-auto-validate','seb-tri-next','btn-score','nvmail-next',
  'autoeval1-validate','autoeval2-validate','btnValidate','btnNext'
]) if(!runtime.includes("'"+id+"'") && !runtime.includes('"'+id+'"')) fail('bouton courant non déclaré: '+id);

if(!runtime.includes("if(source?.id==='seb-evalpro-abandon-fixed') return 'left'")) {
  fail('Abandonner n’est pas fixé dans la zone gauche');
}
if(!runtime.includes("return 'center'")) fail('zone centrale absente');
if(!runtime.includes("['left','center','right']")) fail('déclaration des trois zones absente');

const protectedButtons = {
  'app/web/stock.html':['id="stockActionBtn"','Vérifier'],
  'app/web/planning.html':['id="btnValider"','id="btnSuivant"'],
  'app/web/genrenombres.html':['id="btnCheck"','id="btnNextGenreNombre"'],
  'app/web/dictee.html':['id="verifyBtn"','id="nextBtn"'],
  'app/web/tri_de_cheville.html':['id="calc"','id="seb-tri-next"'],
  'app/web/nwtexte.html':['id="btn-score"'],
  'app/web/nvmail.html':['id="nvmail-next"'],
  'app/web/carre.html':['id="btnValidate"','id="btnNext"']
};
for(const [file,tokens] of Object.entries(protectedButtons)){
  const html=read(file);
  for(const token of tokens) if(!html.includes(token)) fail('fonction de parcours supprimée dans '+file+': '+token);
}

console.log('SEB EvalPro garde navigation KALONÉO: barre commune, fonctions conservées et puce unique — OK.');
