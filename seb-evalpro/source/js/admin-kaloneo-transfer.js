'use strict';

(function(){
  const byId=id=>document.getElementById(id);

  function setStatus(id,text,type=''){
    const node=byId(id);
    if(!node)return;
    node.textContent=text||'';
    node.className='status'+(type?' '+type:'');
  }

  function option(select,value,label){
    const node=document.createElement('option');
    node.value=value;
    node.textContent=label;
    select.appendChild(node);
  }

  async function loadLists(){
    const [testsResult,parcoursResult]=await Promise.all([
      window.sebEvalPro?.kaloneoListTests?.(),
      window.sebEvalPro?.kaloneoListParcours?.()
    ]);

    const testSelect=byId('test-select');
    const parcoursSelect=byId('parcours-select');
    testSelect.replaceChildren();
    parcoursSelect.replaceChildren();

    const tests=Array.isArray(testsResult?.tests)?testsResult.tests.filter(item=>item.role==='test'):[];
    tests.forEach(item=>option(testSelect,item.id+'@@'+item.version,item.title+' — v'+item.version));
    if(!tests.length)option(testSelect,'','Aucun test disponible');

    const parcours=Array.isArray(parcoursResult?.parcours)?parcoursResult.parcours:[];
    parcours.forEach(item=>option(parcoursSelect,item.id,item.name+(item.systemProvided?' — fourni':'') ));
    if(!parcours.length)option(parcoursSelect,'','Aucun parcours disponible');
  }

  async function exportTest(){
    const value=byId('test-select').value;
    if(!value){setStatus('test-status','Choisissez un test à exporter.','error');return;}
    const [id,version]=value.split('@@');
    setStatus('test-status','Export du test…');
    const result=await window.sebEvalPro?.kaloneoExportTest?.(id,version);
    if(result?.canceled){setStatus('test-status','Export annulé.');return;}
    if(!result?.ok){setStatus('test-status','Export impossible : '+String(result?.error||'erreur inconnue'),'error');return;}
    setStatus('test-status','Test exporté.','ok');
  }

  async function importTest(){
    setStatus('test-status','Import du test…');
    let result=await window.sebEvalPro?.kaloneoImportTest?.();
    if(result?.canceled){setStatus('test-status','Import annulé.');return;}
    if(result?.code==='EXISTS'&&result.definition){
      const replace=confirm('Cette version du test existe déjà. La remplacer dans la bibliothèque ?');
      if(!replace){setStatus('test-status','Import annulé : version déjà présente.');return;}
      result=await window.sebEvalPro?.kaloneoSaveTest?.(result.definition,true);
    }
    if(!result?.ok){setStatus('test-status','Import impossible : '+String(result?.error||'erreur inconnue'),'error');return;}
    setStatus('test-status','Test importé dans la bibliothèque.','ok');
    await loadLists();
  }

  async function exportParcours(){
    const id=byId('parcours-select').value;
    if(!id){setStatus('parcours-status','Choisissez un parcours à exporter.','error');return;}
    setStatus('parcours-status','Création du paquet de parcours…');
    const result=await window.sebEvalPro?.kaloneoExportParcours?.(id);
    if(result?.canceled){setStatus('parcours-status','Export annulé.');return;}
    if(!result?.ok){setStatus('parcours-status','Export impossible : '+String(result?.error||'erreur inconnue'),'error');return;}
    setStatus('parcours-status','Parcours exporté avec ses ressources.','ok');
  }

  async function importParcours(){
    setStatus('parcours-status','Import du paquet de parcours…');
    const result=await window.sebEvalPro?.kaloneoImportParcours?.();
    if(result?.canceled){setStatus('parcours-status','Import annulé.');return;}
    if(!result?.ok){setStatus('parcours-status','Import impossible : '+String(result?.error||'erreur inconnue'),'error');return;}
    setStatus('parcours-status','Parcours importé dans KALONÉO.','ok');
    await loadLists();
  }

  async function ready(){
    byId('back-tests').addEventListener('click',()=>{window.location.href='admin-tests-parcours.html';});
    byId('export-test').addEventListener('click',()=>exportTest().catch(error=>setStatus('test-status','Export impossible : '+String(error?.message||error),'error')));
    byId('import-test').addEventListener('click',()=>importTest().catch(error=>setStatus('test-status','Import impossible : '+String(error?.message||error),'error')));
    byId('export-parcours').addEventListener('click',()=>exportParcours().catch(error=>setStatus('parcours-status','Export impossible : '+String(error?.message||error),'error')));
    byId('import-parcours').addEventListener('click',()=>importParcours().catch(error=>setStatus('parcours-status','Import impossible : '+String(error?.message||error),'error')));
    await loadLists();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{ready().catch(()=>{});},{once:true});
  else ready().catch(()=>{});
})();
