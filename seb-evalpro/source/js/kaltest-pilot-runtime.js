(function(){
'use strict';

const STATE_KEY='seb_kaltest_pilot_state_v1';
const PAGES=['identification','intro','exercise','final'];

let testDefinition=null;
let bilanCatalog=null;

function emptyState(){
  return {
    currentPage:'identification',
    identity:{},
    answers:{},
    units:{},
    status:'ACTIVE',
    result:null,
    bilan:null,
    bilanComment:'',
    replay:[]
  };
}

function readState(){
  try{
    const parsed=JSON.parse(localStorage.getItem(STATE_KEY)||'null');
    return parsed&&typeof parsed==='object'?Object.assign(emptyState(),parsed):emptyState();
  }catch(_){return emptyState();}
}

let state=readState();

function saveState(){
  localStorage.setItem(STATE_KEY,JSON.stringify(state));
  try{ window.sebEvalPro?.save?.(); }catch(_){}
}

function replay(type,detail){
  state.replay.push({type,step:state.currentPage,detail:detail||null,at:Date.now()});
  saveState();
}

function showPage(name,record=true){
  if(!PAGES.includes(name)) throw new Error('Page pilote inconnue: '+name);
  state.currentPage=name;
  document.querySelectorAll('.page').forEach(el=>el.classList.toggle('visible',el.id==='page-'+name));
  saveState();
  if(record) replay('PAGE_VIEW',{page:name});
}

function normalizeNumeric(value){
  const raw=String(value==null?'':value).replace(/\u00A0/g,' ').replace(/\s+/g,'').replace(',','.');
  if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw)) return null;
  const n=Number(raw);
  return Number.isFinite(n)?n:null;
}

function sameNumeric(a,b){
  const x=normalizeNumeric(a),y=normalizeNumeric(b);
  return x!==null&&y!==null&&Math.abs(x-y)<1e-9;
}

function findLine(lineId){
  for(const def of bilanCatalog?.definitions||[]){
    const line=(def.lines||[]).find(item=>item.id===lineId);
    if(line) return line;
  }
  return null;
}

function evaluate(){
  let score=0;
  let scoreMax=0;
  const details={};
  for(const q of testDefinition.questions||[]){
    const points=Number(q.points)||0;
    const value=String(state.answers[q.id]??'').trim();
    const accepted=q.acceptedAnswers||[];
    const correct=q.response?.type==='number'
      ? accepted.some(answer=>sameNumeric(value,answer))
      : accepted.some(answer=>String(answer)===value);
    if(q.example!==true){
      scoreMax+=points;
      if(correct) score+=points;
    }
    details[q.id]={value,correct,points};
  }
  const percentage=scoreMax>0?(score/scoreMax)*100:0;
  return {score,scoreMax,percentage,details};
}

function resolveLevel(line,percentage){
  if(!line||line.mode!=='automatic') return null;
  const e=line.evaluation||{};
  const value=Number(percentage);
  if(!Number.isFinite(value)) return 'NE';
  if(e.direction==='lower-is-better'){
    if(value<=e.levelIThreshold) return 'I';
    if(value<=e.levelIIThreshold) return 'II';
    return 'III';
  }
  if(value>=e.levelIThreshold) return 'I';
  if(value>=e.levelIIThreshold) return 'II';
  return 'III';
}

function buildBilan(result,{nonEvaluated=false}={}){
  const contribution=testDefinition.bilanContributions?.[0]||null;
  const line=contribution?findLine(contribution.lineId):null;
  if(nonEvaluated){
    return {
      lineId:contribution?.lineId||null,
      level:'NE',
      includeInCalculation:false,
      score:0,
      scoreMax:0,
      percentage:null,
      comment:state.bilanComment||''
    };
  }
  return {
    lineId:contribution?.lineId||null,
    level:resolveLevel(line,result.percentage),
    includeInCalculation:true,
    score:result.score,
    scoreMax:result.scoreMax,
    percentage:result.percentage,
    comment:state.bilanComment||''
  };
}

function validateIdentity(){
  const values={
    nom:document.getElementById('nom').value.trim(),
    prenom:document.getElementById('prenom').value.trim(),
    naissance:document.getElementById('naissance').value,
    ss7:document.getElementById('ss7').value.trim(),
    lieu:document.getElementById('lieu').value.trim(),
    groupe:document.getElementById('groupe').value.trim(),
    dateEvaluation:document.getElementById('dateEvaluation').value,
    parcours:'Parcours pilote KALTEST'
  };
  const missing=['nom','prenom','naissance','lieu','groupe','dateEvaluation'].filter(k=>!values[k]);
  if(missing.length) return {ok:false,message:'Tous les champs obligatoires doivent être renseignés.'};
  if(!/^\d{7}$/.test(values.ss7)) return {ok:false,message:'Les 7 premiers chiffres du n° de sécurité sociale doivent contenir exactement 7 chiffres.'};
  return {ok:true,values};
}

function renderIdentity(){
  for(const [key,value] of Object.entries(state.identity||{})){
    const el=document.getElementById(key);
    if(el&&key!=='parcours') el.value=value||'';
  }
}

function renderTest(){
  document.getElementById('test-title').textContent=testDefinition.title;
  document.getElementById('scenario').textContent=testDefinition.scenario||'';
  document.getElementById('instruction').textContent=testDefinition.instruction||'';

  const list=document.createElement('ol');
  list.className='question-list';
  for(const q of testDefinition.questions||[]){
    const li=document.createElement('li');
    li.textContent=q.prompt;
    list.appendChild(li);
  }
  const qHost=document.getElementById('questions');
  qHost.innerHTML='';
  qHost.appendChild(list);

  const table=document.createElement('table');
  const head=document.createElement('tr');
  for(const h of testDefinition.presentation?.responseTable?.headers||['Question N°','Réponse','Unités']){
    const th=document.createElement('th'); th.textContent=h; head.appendChild(th);
  }
  table.appendChild(head);

  (testDefinition.questions||[]).forEach((q,index)=>{
    const tr=document.createElement('tr');
    const tdN=document.createElement('td'); tdN.textContent='Question N°'+(index+1);
    const tdA=document.createElement('td');
    const input=document.createElement('input');
    input.id='answer-'+q.id;
    input.dataset.questionId=q.id;
    input.type=q.response?.type==='number'?'text':'text';
    input.inputMode=q.response?.type==='number'?'decimal':'text';
    input.value=state.answers[q.id]||'';
    input.addEventListener('input',()=>{
      state.answers[q.id]=input.value;
      replay('ANSWER_CHANGED',{questionId:q.id});
    });
    tdA.appendChild(input);
    const tdU=document.createElement('td');
    const unit=document.createElement('input');
    unit.id='unit-'+q.id;
    unit.dataset.questionId=q.id;
    unit.value=state.units[q.id]||'';
    unit.disabled=q.unitInput===false;
    unit.addEventListener('input',()=>{
      state.units[q.id]=unit.value;
      replay('UNIT_CHANGED',{questionId:q.id});
    });
    tdU.appendChild(unit);
    tr.append(tdN,tdA,tdU);
    table.appendChild(tr);
  });

  const host=document.getElementById('response-table');
  host.innerHTML='';
  host.appendChild(table);
  document.getElementById('calculator-open').hidden=!testDefinition.calculator?.compatible;
}

function finishExercise(){
  state.result=evaluate();
  state.bilan=buildBilan(state.result,{nonEvaluated:false});
  state.status='COMPLETED';
  replay('EXERCISE_COMPLETED',{score:state.result.score,scoreMax:state.result.scoreMax,bilanLevel:state.bilan.level});
  showPage('final');
}

function abandon(nonEvaluated){
  state.result=evaluate();
  state.bilan=buildBilan(state.result,{nonEvaluated:Boolean(nonEvaluated)});
  state.status=nonEvaluated?'ABANDONED_NE':'ABANDONED_EVALUATED';
  replay('EXERCISE_ABANDONED',{
    nonEvaluated:Boolean(nonEvaluated),
    score:state.result.score,
    scoreMax:state.result.scoreMax,
    bilanLevel:state.bilan.level
  });
  closeAbandon();
  showPage('final');
}

function openAbandon(){
  document.getElementById('abandon-ne').checked=false;
  const modal=document.getElementById('abandon-modal');
  modal.classList.add('visible');
  modal.setAttribute('aria-hidden','false');
}

function closeAbandon(){
  const modal=document.getElementById('abandon-modal');
  modal.classList.remove('visible');
  modal.setAttribute('aria-hidden','true');
}

function reset(){
  localStorage.removeItem(STATE_KEY);
  state=emptyState();
  renderIdentity();
  if(testDefinition) renderTest();
  showPage('identification',false);
}

async function loadDefinitions(){
  const definitions=window.sebKaltestPilotDefinitions;
  if(!definitions?.test) throw new Error('Test KALTEST introuvable.');
  if(!definitions?.bilanCatalog) throw new Error('Catalogue bilan introuvable.');
  testDefinition=JSON.parse(JSON.stringify(definitions.test));
  bilanCatalog=JSON.parse(JSON.stringify(definitions.bilanCatalog));
}

function install(){
  renderIdentity();

  document.getElementById('ss7').addEventListener('input',event=>{
    event.target.value=event.target.value.replace(/\D/g,'').slice(0,7);
  });

  document.getElementById('identity-next').addEventListener('click',()=>{
    const validation=validateIdentity();
    const status=document.getElementById('identity-status');
    if(!validation.ok){status.textContent=validation.message;return;}
    status.textContent='';
    state.identity=validation.values;
    replay('IDENTITY_VALIDATED',{fields:Object.keys(validation.values)});
    showPage('intro');
  });

  document.getElementById('intro-next').addEventListener('click',()=>showPage('exercise'));
  document.getElementById('pilot-restart')?.addEventListener('click',reset);
  document.getElementById('exercise-next').addEventListener('click',finishExercise);
  document.getElementById('abandon-open').addEventListener('click',openAbandon);
  document.getElementById('abandon-cancel').addEventListener('click',closeAbandon);
  document.getElementById('abandon-confirm').addEventListener('click',()=>abandon(document.getElementById('abandon-ne').checked));

  document.getElementById('calculator-open').addEventListener('click',()=>{
    document.getElementById('calculator').classList.add('visible');
  });
  document.getElementById('calc-close').addEventListener('click',()=>{
    document.getElementById('calculator').classList.remove('visible');
  });
  document.getElementById('calc-equals').addEventListener('click',()=>{
    const expression=document.getElementById('calc-expression').value.trim();
    const out=document.getElementById('calc-result');
    if(!/^[0-9+\-*/().\s]+$/.test(expression)){out.textContent='Expression invalide';return;}
    try{
      const value=Function('"use strict";return ('+expression+')')();
      out.textContent=Number.isFinite(value)?String(value):'Expression invalide';
    }catch(_){out.textContent='Expression invalide';}
  });

  loadDefinitions().then(()=>{
    renderTest();
    showPage(state.currentPage||'identification',false);
    replay('PILOT_READY',{testId:testDefinition.id,version:testDefinition.version});
  }).catch(error=>{
    document.getElementById('identity-status').textContent=error.message;
  });
}

window.sebKaltestPilot=Object.freeze({
  get state(){return JSON.parse(JSON.stringify(state));},
  get test(){return testDefinition?JSON.parse(JSON.stringify(testDefinition)):null;},
  get bilanCatalog(){return bilanCatalog?JSON.parse(JSON.stringify(bilanCatalog)):null;},
  evaluate,
  validateIdentity,
  buildBilan,
  finishExercise,
  abandon,
  showPage,
  reset,
  setBilanComment(comment){
    state.bilanComment=String(comment||'');
    if(state.bilan) state.bilan.comment=state.bilanComment;
    saveState();
    return state.bilanComment;
  },
  ready(){return Boolean(testDefinition&&bilanCatalog);}
});

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();