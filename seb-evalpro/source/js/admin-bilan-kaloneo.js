(()=>{'use strict';

const MANIFEST_KEY='seb_kaloneo_results_manifest';
const STATE_PREFIX='seb_kaltest_pilot2_state_v1';
const EXCLUDED_IDS=new Set(['fin_parcours','transition_video_f1']);

const LEGACY_GROUPS={
  'briques-identification':['construction_briques'],
  'briques-manipulation':['construction_briques'],
  'carre':['gratte_ciel'],
  'organisation':['organisation_demenagement','ranger_stock'],
  'planning':['planning_cantine'],
  'tri-temps':['tri_chevilles'],
  'tri-erreurs':['tri_chevilles'],
  'texte':['traitement_texte_bureautique'],
  'mail':['redaction_email'],
  'expression':['texte_a_trous_stage_logistique','genre_nombre','paronymes_rapport','dictee_professionnelle'],
  'math-enonce':['calculs_commandes_atelier','calculs_poids_volumes'],
  'math-problemes':['horaires_reception_controle','fractions_preparation_lots','conversions_atelier_expedition']
};

const CATEGORY_LABELS={
  mathematiques:'Mathématiques',
  math:'Mathématiques',
  maths:'Mathématiques',
  francais:'Français',
  'expression ecrite':'Expression écrite',
  dictee:'Dictée',
  organisation:'Organisation',
  planification:'Planification',
  raisonnement:'Raisonnement',
  technique:'Compétences techniques',
  techniques:'Compétences techniques',
  'competences techniques':'Compétences techniques',
  tic:'TIC / Bureautique',
  bureautique:'TIC / Bureautique',
  communication:'Communication',
  autoevaluation:'Autoévaluation',
  autres:'Autres'
};

const LEVEL_RANK={I:1,II:2,III:3,NE:4};

function clean(value){return String(value==null?'':value).replace(/\s+/g,' ').trim()}
function norm(value){
  let s=clean(value).toLocaleLowerCase('fr-FR');
  try{s=s.normalize('NFD').replace(/[\u0300-\u036f]/g,'')}catch(_){}
  return s;
}
function json(key,fallback){try{return JSON.parse(sessionStorage.getItem(key)||'null')??fallback}catch(_){return fallback}}
function categoryFor(id,value){
  if(String(id)==='planning_cantine')return'planification';
  return norm(value)||'autres';
}
function categoryLabel(value){
  const n=norm(value);
  return CATEGORY_LABELS[n]||clean(value).replace(/[_-]+/g,' ').replace(/^./,c=>c.toUpperCase())||'Autres';
}
function catalog(){
  try{
    const payload=window.sebEvalPro?.kaloneoTestMetadataSync?.();
    const tests=payload&&payload.ok===true&&Array.isArray(payload.tests)?payload.tests:[];
    return new Map(tests.map(test=>[String(test.id||''),test]).filter(([id])=>id));
  }catch(_){return new Map()}
}
function canonicalState(){
  const keys=[];
  try{
    for(let i=0;i<sessionStorage.length;i+=1){
      const key=sessionStorage.key(i);
      if(key&&key.startsWith(STATE_PREFIX))keys.push(key);
    }
  }catch(_){}
  if(!keys.length)keys.push(STATE_PREFIX);
  for(const key of keys){
    const state=json(key,null);
    if(state&&state.tests&&typeof state.tests==='object')return state;
  }
  return null;
}
function buildContext(){
  const manifest=json(MANIFEST_KEY,null);
  const state=canonicalState();
  const states=state&&state.tests&&typeof state.tests==='object'?state.tests:{};
  const meta=catalog();
  const byId=new Map();
  const order=[];

  const add=(rawTest)=>{
    if(!rawTest||!rawTest.id)return;
    const id=String(rawTest.id);
    if(EXCLUDED_IDS.has(id))return;
    const m=meta.get(id)||{};
    const cat=categoryFor(id,m.category||rawTest.category||'autres');
    if(cat==='transition'||cat==='fin'||cat==='introduction')return;
    const test={
      id,
      title:clean(m.title||rawTest.title||id),
      category:cat,
      categoryLabel:categoryLabel(cat),
      scored:m.scored!==undefined?m.scored!==false:rawTest.scored!==false,
      version:clean(m.version||rawTest.version||'')
    };
    if(!byId.has(id))order.push(id);
    byId.set(id,test);
  };

  if(manifest&&Array.isArray(manifest.tests))manifest.tests.forEach(add);

  // Compatibilité des candidats R8/R9 : le manifeste pouvait être incomplet.
  Object.keys(states).forEach(id=>{
    if(EXCLUDED_IDS.has(String(id)))return;
    const m=meta.get(String(id))||{};
    add({id:String(id),title:m.title||id,category:m.category||'autres',scored:m.scored});
  });

  const tests=order.map(id=>byId.get(id)).filter(Boolean);
  return{
    enabled:tests.length>0,
    parcoursTitle:clean(manifest?.parcoursTitle||''),
    tests,
    byId,
    ids:new Set(tests.map(test=>test.id)),
    states
  };
}

const context=buildContext();

function stateFor(id){return context.states&&context.states[id]?context.states[id]:null}
function resultFor(id){const s=stateFor(id);return s&&s.result&&typeof s.result==='object'?s.result:null}
function statusFor(id){return String(stateFor(id)?.status||'').toUpperCase()}
function has(id){return context.ids.has(String(id))}
function hasAny(ids){return (ids||[]).some(has)}
function fmtSeconds(value){
  const sec=Math.max(0,Math.round(Number(value)||0));
  return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');
}
function scoreDetail(result){
  if(!result)return'';
  const score=Number(result.score),max=Number(result.scoreMax),pct=Number(result.percentage);
  if(Number.isFinite(score)&&Number.isFinite(max)&&max>0){
    const pc=Number.isFinite(pct)?Math.round(pct*100)/100:Math.round((score/max)*10000)/100;
    return 'Score : '+score+'/'+max+' — '+pc+' %';
  }
  return'';
}
function genericLevel(pct){
  const p=Number(pct);
  if(!Number.isFinite(p))return'';
  if(p>=70)return'I';
  if(p>=45)return'II';
  return'III';
}
function scoredLevel(id,result){
  if(!result)return'';
  const score=Number(result.score),max=Number(result.scoreMax);
  if(!Number.isFinite(score)||!Number.isFinite(max)||max<=0)return'';

  if(id==='traitement_texte_bureautique')return score>=7?'I':score>=3?'II':'III';
  if(id==='redaction_email')return score>=5?'I':score>=3?'II':'III';
  if(id==='planning_cantine')return score>=13?'I':score>=11?'II':'III';
  if(id==='organisation_demenagement')return score>=7?'I':score>=6?'II':'III';
  if(id==='ranger_stock'){
    const errors=Math.max(0,max-score);
    return errors<=2?'I':errors<=4?'II':'III';
  }
  if(id==='gratte_ciel'){
    const details=result.details&&typeof result.details==='object'?Object.values(result.details):[];
    const answered=details.filter(x=>x&&typeof x==='object'&&x.correct!=null);
    const errors=answered.filter(x=>x.correct===false).length;
    if(answered.length)return errors<=2?'I':errors<=4?'II':'III';
  }
  return genericLevel((score/max)*100);
}
function triInfo(result){
  const tri=result?.tri;
  if(!tri||typeof tri!=='object')return null;
  const t=Number(tri.temps_moyen)||0;
  const e=Number(tri.moyenne_erreurs)||0;
  const timeLevel=t<=720?'I':t<=840?'II':'III';
  const errorLevel=e<=1.6?'I':e<=3.2?'II':'III';
  const overall=(LEVEL_RANK[timeLevel]>=LEVEL_RANK[errorLevel])?timeLevel:errorLevel;
  return{
    level:overall,
    timeLevel,
    errorLevel,
    detail:(Number(tri.completedCount)||0)+' tri(s) — temps moyen '+fmtSeconds(t)+' — moyenne erreurs '+(Math.round(e*100)/100)
  };
}
function bricksInfo(result){
  const b=result?.bricks;
  if(!b||typeof b!=='object')return null;
  const errors=Math.max(0,Math.floor(Number(b.erreurs)||0));
  return{
    level:errors<=2?'I':errors<=4?'II':'III',
    detail:'Temps '+fmtSeconds(b.temps||0)+' — '+errors+' erreur'+(errors===1?'':'s')
  };
}
function selfEvalDetail(testState){
  if(!testState)return'';
  const parts=[];
  const answers=testState.answers&&typeof testState.answers==='object'?testState.answers:{};
  for(const value of Object.values(answers)){
    if(Array.isArray(value)&&value.length)parts.push(value.map(clean).filter(Boolean).join(', '));
    else if(clean(value))parts.push(clean(value));
  }
  const supplemental=testState.supplemental&&typeof testState.supplemental==='object'?testState.supplemental:{};
  for(const fields of Object.values(supplemental)){
    if(!fields||typeof fields!=='object')continue;
    for(const value of Object.values(fields))if(clean(value))parts.push(clean(value));
  }
  return[...new Set(parts)].join(' — ');
}
function evaluationFor(test){
  const id=test.id,status=statusFor(id),state=stateFor(id),result=resultFor(id);
  if(status==='ABANDONED_NE')return{level:'NE',detail:'Exercice abandonné — non évalué.'};
  if(status.startsWith('ABANDONED')&&!result)return{level:'NE',detail:'Exercice abandonné.'};

  if(id==='tri_chevilles'){
    const info=triInfo(result);
    if(info)return info;
  }
  if(id==='construction_briques'){
    const info=bricksInfo(result);
    if(info)return info;
  }

  if(result){
    const level=scoredLevel(id,result);
    const detail=scoreDetail(result);
    if(level)return{level,detail:detail+(status.startsWith('ABANDONED')?' — exercice abandonné':'')};
  }

  const auto=selfEvalDetail(state);
  if(auto)return{level:'',detail:'Autoévaluation du candidat : '+auto};
  if(status==='COMPLETED')return{level:'',detail:'Exercice terminé — aucun niveau automatique.'};
  return{level:'',detail:'Aucun résultat exploitable enregistré.'};
}

function createLevelCell(level){
  const td=document.createElement('td');
  td.className='level';
  td.dataset.l=level;
  td.title='Attribuer le niveau '+level;
  return td;
}
function createSelect(){
  const select=document.createElement('select');
  select.className='csel';
  const options=[
    ['', 'Choisissez un élément.'],
    ['NE','Non évalué.'],
    ['I','I. Résultat satisfaisant au regard de l’exercice.'],
    ['II','II. Résultat intermédiaire ; des repères ou vérifications restent utiles.'],
    ['III','III. Des difficultés importantes apparaissent dans cet exercice.']
  ];
  options.forEach(([level,text])=>{
    const o=document.createElement('option');
    o.value=text;
    o.textContent=text;
    if(level)o.dataset.l=level;
    select.appendChild(o);
  });
  return select;
}
function createTestRow(test,index){
  const row=document.createElement('tr');
  row.dataset.r='kaloneo-test-'+test.id;
  row.dataset.kaloneoTestId=test.id;
  row.dataset.kaloneoCategory=test.category;
  if(index%2)row.classList.add('alt');

  const module=document.createElement('td');
  const strong=document.createElement('b');
  strong.textContent=test.title||test.id;
  module.appendChild(strong);
  row.appendChild(module);
  ['NE','I','II','III'].forEach(level=>row.appendChild(createLevelCell(level)));

  const comments=document.createElement('td');
  const select=createSelect();
  const textarea=document.createElement('textarea');
  textarea.className='ctxt';
  textarea.placeholder='Commentaire Administrateur (facultatif)';
  const detail=document.createElement('div');
  detail.className='detail';
  comments.append(select,textarea,detail);
  row.appendChild(comments);
  return row;
}
function setRowLevel(row,level,detail,comment){
  if(!row)return;
  row.dataset.level=level||'';
  row.querySelectorAll('.level').forEach(cell=>cell.classList.toggle('on',cell.dataset.l===level));
  const select=row.querySelector('.csel');
  if(select&&level){
    const option=[...select.options].find(o=>o.dataset.l===level);
    if(option)select.value=option.value;
  }
  if(detail!==undefined){
    const node=row.querySelector('.detail');
    if(node)node.textContent=detail||'';
  }
  if(comment!==undefined){
    const node=row.querySelector('.ctxt');
    if(node)node.value=comment||'';
  }
}
function createSection(label){
  const tr=document.createElement('tr');
  tr.className='section2 seb-kaloneo-dynamic-section';
  tr.dataset.kaloneoSection='1';
  const td=document.createElement('td');
  td.colSpan=6;
  td.textContent=label;
  tr.appendChild(td);
  return tr;
}
function markLegacyRows(tbody){
  [...tbody.children].forEach(node=>{
    if(node.matches?.('tr[data-r]')&&!node.dataset.kaloneoTestId&&!node.dataset.kaltestManual){
      node.hidden=true;
      node.dataset.sebKaloneoCompat='1';
    }else if(node.matches?.('tr.section,tr.section2')){
      node.hidden=true;
      node.dataset.sebKaloneoCompat='1';
    }
  });
}
function installDynamicRows(){
  if(!context.enabled)return false;
  const table=document.getElementById('bilan');
  const tbody=table?.querySelector('tbody');
  if(!tbody)return false;

  markLegacyRows(tbody);

  const anchor=tbody.firstChild;
  const groups=new Map();
  context.tests.forEach(test=>{
    if(!groups.has(test.categoryLabel))groups.set(test.categoryLabel,[]);
    groups.get(test.categoryLabel).push(test);
  });

  let stripe=0;
  for(const [label,tests] of groups){
    tbody.insertBefore(createSection(label),anchor);
    for(const test of tests){
      const row=createTestRow(test,stripe++);
      tbody.insertBefore(row,anchor);
      const ev=evaluationFor(test);
      // Le détail du résultat est visible immédiatement ; le niveau I/II/III
      // n'est appliqué qu'au clic sur « Compléter automatiquement le bilan ».
      setRowLevel(row,'',ev.detail,'');
    }
  }

  const info=document.createElement('p');
  info.id='seb-kaloneo-bilan-parcours';
  info.className='note';
  info.textContent='Parcours réalisé : '+(context.parcoursTitle||'KALONÉO')+' — '+context.tests.length+' test(s) pris en compte dans ce bilan.';
  table.insertAdjacentElement('beforebegin',info);
  return true;
}

function rowsForTest(id){
  return [...document.querySelectorAll('tr[data-kaloneo-test-id="'+CSS.escape(String(id))+'"]')];
}
function dynamicLevel(id){
  const row=rowsForTest(id)[0];
  return String(row?.dataset.level||'');
}
function dynamicComment(id){
  const row=rowsForTest(id)[0];
  if(!row)return'';
  return clean([row.querySelector('.ctxt')?.value,row.querySelector('.detail')?.textContent].filter(Boolean).join(' '));
}
function groupLevel(ids){
  const values=(ids||[]).filter(has).map(id=>dynamicLevel(id)).filter(Boolean);
  const evaluated=values.filter(v=>['I','II','III'].includes(v));
  if(evaluated.length){
    return evaluated.sort((a,b)=>(LEVEL_RANK[b]||0)-(LEVEL_RANK[a]||0))[0];
  }
  return values.includes('NE')?'NE':'';
}
function groupComment(ids){
  return(ids||[]).filter(has).map(id=>{
    const test=context.byId.get(id);
    const comment=dynamicComment(id);
    return comment?((test?.title||id)+' : '+comment):'';
  }).filter(Boolean).join(' | ');
}
function applyCompat(key,level,comment){
  const row=document.querySelector('tr[data-r="'+key+'"]');
  if(!row)return;
  row.dataset.level=level||'';
  row.querySelectorAll('.level').forEach(cell=>cell.classList.toggle('on',cell.dataset.l===level));
  const select=row.querySelector('.csel');
  if(select&&level){
    const option=[...select.options].find(o=>o.dataset.l===level);
    if(option)select.value=option.value;
  }
  const textarea=row.querySelector('.ctxt');
  if(textarea)textarea.value=comment||'';
}
function syncCompatibility(){
  if(!context.enabled)return;
  for(const [key,ids] of Object.entries(LEGACY_GROUPS)){
    let level=groupLevel(ids),comment=groupComment(ids);
    if(key==='tri-temps'&&has('tri_chevilles')){
      const info=triInfo(resultFor('tri_chevilles'));
      if(info){level=info.timeLevel;comment=info.detail}
    }else if(key==='tri-erreurs'&&has('tri_chevilles')){
      const info=triInfo(resultFor('tri_chevilles'));
      if(info){level=info.errorLevel;comment=info.detail}
    }
    applyCompat(key,level,comment);
  }
}
function persistDynamic(){
  let data=json('admin_bilan_state',{rows:{}});
  if(!data||typeof data!=='object')data={rows:{}};
  if(!data.rows)data.rows={};
  document.querySelectorAll('tr[data-r]').forEach(row=>{
    data.rows[row.dataset.r]={
      level:row.dataset.level||'',
      select:row.querySelector('.csel')?.value||'',
      comment:row.querySelector('.ctxt')?.value||'',
      detail:row.querySelector('.detail')?.textContent||''
    };
  });
  const avg=document.getElementById('triAvg'),err=document.getElementById('triErr'),times=document.getElementById('triTimes');
  if(avg)data.triAvg=avg.textContent;
  if(err)data.triErr=err.textContent;
  if(times)data.triTimes=times.innerHTML;
  sessionStorage.setItem('admin_bilan_state',JSON.stringify(data));
  try{window.sebEvalPro?.save?.()}catch(_){}
}
function auto(){
  if(!context.enabled)return false;
  for(const test of context.tests){
    const row=rowsForTest(test.id)[0];
    if(!row)continue;
    const ev=evaluationFor(test);
    setRowLevel(row,ev.level,ev.detail,'');
  }
  syncCompatibility();
  persistDynamic();
  const status=document.getElementById('status');
  if(status)status.textContent='Bilan complété à partir des tests réellement présents dans le parcours.';
  return true;
}
function stripExcludedFromClone(root){
  root?.querySelectorAll?.('[data-seb-kaloneo-compat="1"]').forEach(node=>node.remove());
}

window.SEB_KALONEO_BILAN=Object.freeze({
  enabled:context.enabled,
  context,
  hasTest:has,
  hasAny,
  evaluationFor,
  auto,
  syncCompatibility,
  stripExcludedFromClone,
  visibleTestIds:()=>context.tests.map(test=>test.id)
});

if(context.enabled){
  installDynamicRows();

  document.addEventListener('click',event=>{
    if(event.target?.closest?.('tr[data-kaloneo-test-id] .level'))setTimeout(()=>{syncCompatibility();persistDynamic()},0);
  },true);
  document.addEventListener('change',event=>{
    if(event.target?.closest?.('tr[data-kaloneo-test-id]'))setTimeout(()=>{syncCompatibility();persistDynamic()},0);
  },true);
  document.addEventListener('input',event=>{
    if(event.target?.closest?.('tr[data-kaloneo-test-id]'))setTimeout(()=>{syncCompatibility();persistDynamic()},0);
  },true);
}
})();
