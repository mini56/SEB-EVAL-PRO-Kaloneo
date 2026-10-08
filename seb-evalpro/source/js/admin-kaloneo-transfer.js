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
    const [testsResult,parcoursResult,imagesResult]=await Promise.all([
      window.sebEvalPro?.kaloneoListTests?.(),
      window.sebEvalPro?.kaloneoListParcours?.(),
      window.sebEvalPro?.kaloneoListImages?.()
    ]);

    const testSelect=byId('test-select');
    const parcoursSelect=byId('parcours-select');
    const imageSelect=byId('image-select');
    testSelect.replaceChildren();
    parcoursSelect.replaceChildren();
    imageSelect.replaceChildren();

    const tests=Array.isArray(testsResult?.tests)?testsResult.tests.filter(item=>item.role==='test'):[];
    tests.forEach(item=>option(testSelect,item.id+'@@'+item.version,item.title+' — v'+item.version));
    if(!tests.length)option(testSelect,'','Aucun test disponible');

    const parcours=Array.isArray(parcoursResult?.parcours)?parcoursResult.parcours:[];
    parcours.forEach(item=>option(parcoursSelect,item.id,item.name+(item.systemProvided?' — fourni':'') ));
    if(!parcours.length)option(parcoursSelect,'','Aucun parcours disponible');

    const images=Array.isArray(imagesResult?.images)?imagesResult.images:[];
    images.forEach(item=>{
      const details=[item.theme||item.category||'',item.orientation||''].filter(Boolean).join(' • ');
      option(imageSelect,item.id,item.name+(details?' — '+details:''));
    });
    if(!images.length)option(imageSelect,'','Aucune image disponible');
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

  function readFileAsDataUrl(file){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>resolve(String(reader.result||''));
      reader.onerror=()=>reject(reader.error||new Error('Lecture impossible'));
      reader.readAsDataURL(file);
    });
  }

  async function exportImage(){
    const id=byId('image-select').value;
    if(!id){setStatus('image-status','Choisissez une image à exporter.','error');return;}
    setStatus('image-status','Export de l’image…');
    const result=await window.sebEvalPro?.kaloneoExportImage?.(id);
    if(result?.canceled){setStatus('image-status','Export annulé.');return;}
    if(!result?.ok){setStatus('image-status','Export impossible : '+String(result?.error||'erreur inconnue'),'error');return;}
    setStatus('image-status','Image exportée.','ok');
  }

  async function importImages(files){
    const list=[...(files||[])];
    if(!list.length)return;
    setStatus('image-status','Import de '+list.length+' image'+(list.length>1?'s':'')+'…');
    let added=0;
    let duplicates=0;
    let failed=0;
    for(const file of list){
      try{
        const data=await readFileAsDataUrl(file);
        const result=await window.sebEvalPro?.kaloneoSaveImage?.({
          name:file.name,
          mime:file.type,
          data,
          category:'Mes images KALONÉO'
        });
        if(result?.ok){
          if(result.duplicate)duplicates+=1;
          else added+=1;
        }else failed+=1;
      }catch(_){failed+=1;}
    }
    await loadLists();
    setStatus(
      'image-status',
      added+' image'+(added>1?'s':'')+' ajoutée'+(added>1?'s':'')+
        (duplicates?' • '+duplicates+' déjà présente'+(duplicates>1?'s':''):'')+
        (failed?' • '+failed+' échec'+(failed>1?'s':''):''),
      failed?'error':'ok'
    );
  }

  async function importImageZip(){
    setStatus('image-status','Import de l’archive ZIP…');
    const result=await window.sebEvalPro?.kaloneoImportImageZip?.();
    if(result?.canceled){setStatus('image-status','Import annulé.');return;}
    if(!result?.ok){setStatus('image-status','Import ZIP impossible : '+String(result?.error||'erreur inconnue'),'error');return;}
    await loadLists();
    setStatus(
      'image-status',
      result.added+' image'+(result.added>1?'s':'')+' ajoutée'+(result.added>1?'s':'')+
        (result.duplicates?' • '+result.duplicates+' déjà présente'+(result.duplicates>1?'s':''):''),
      result.failed?'error':'ok'
    );
  }

  async function ready(){
    byId('back-tests').addEventListener('click',()=>{window.location.href='admin-tests-parcours.html';});
    byId('export-test').addEventListener('click',()=>exportTest().catch(error=>setStatus('test-status','Export impossible : '+String(error?.message||error),'error')));
    byId('import-test').addEventListener('click',()=>importTest().catch(error=>setStatus('test-status','Import impossible : '+String(error?.message||error),'error')));
    byId('export-parcours').addEventListener('click',()=>exportParcours().catch(error=>setStatus('parcours-status','Export impossible : '+String(error?.message||error),'error')));
    byId('import-parcours').addEventListener('click',()=>importParcours().catch(error=>setStatus('parcours-status','Import impossible : '+String(error?.message||error),'error')));
    byId('export-image').addEventListener('click',()=>exportImage().catch(error=>setStatus('image-status','Export impossible : '+String(error?.message||error),'error')));
    byId('import-images').addEventListener('click',()=>byId('image-files').click());
    byId('image-files').addEventListener('change',async()=>{
      try{await importImages(byId('image-files').files);}
      catch(error){setStatus('image-status','Import impossible : '+String(error?.message||error),'error');}
      finally{byId('image-files').value='';}
    });
    byId('import-image-zip').addEventListener('click',()=>importImageZip().catch(error=>setStatus('image-status','Import ZIP impossible : '+String(error?.message||error),'error')));
    await loadLists();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{ready().catch(()=>{});},{once:true});
  else ready().catch(()=>{});
})();
