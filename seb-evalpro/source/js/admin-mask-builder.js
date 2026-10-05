(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const state = { image:'', imageName:'', editing:null, masks:[] };

  function cleanId(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'') || 'ecran-masquage';
  }

  function setStatus(message, error=false) {
    const node=$('mask-status');
    node.textContent=String(message||'');
    node.style.color=error?'#a00000':'#1b6b31';
  }

  function updatePreview() {
    const text=String($('mask-text').value||'');
    const textNode=$('mask-preview-text');
    const image=$('mask-preview-image');
    textNode.textContent=text;
    textNode.hidden=!text.trim();
    if(state.image) {
      image.src=state.image;
      image.hidden=false;
    } else {
      image.removeAttribute('src');
      image.hidden=true;
    }
    $('mask-image-name').textContent=state.imageName||'';
  }

  function reset() {
    state.editing=null;
    state.image='';
    state.imageName='';
    $('mask-name').value='';
    $('mask-id').value='';
    $('mask-version').value='1.0.0';
    $('mask-text').value='';
    $('mask-name').readOnly=false;
    $('mask-version').readOnly=false;
    $('mask-text').readOnly=false;
    $('mask-image-file').disabled=false;
    $('remove-mask-image').disabled=false;
    $('save-mask').disabled=false;
    setStatus('');
    updatePreview();
    requestAnimationFrame(()=>$('mask-name').focus());
  }

  async function openMask(meta) {
    const result=await window.sebEvalPro?.kaloneoGetMaskScreen?.({id:meta.id,version:meta.version});
    if(!result||result.ok!==true) return setStatus(result?.error||'Lecture impossible.',true);
    const value=result.maskScreen||{};
    state.editing={id:value.id,version:value.version,systemProvided:value.systemProvided===true};
    state.image=String(value.content?.image||'');
    state.imageName=state.image?'Image embarquée':'';
    $('mask-name').value=String(value.name||'');
    $('mask-id').value=String(value.id||'');
    $('mask-version').value=String(value.version||'1.0.0');
    $('mask-text').value=String(value.content?.text||'');
    const locked=value.systemProvided===true;
    $('mask-name').readOnly=locked;
    $('mask-version').readOnly=locked;
    $('mask-text').readOnly=locked;
    $('mask-image-file').disabled=locked;
    $('remove-mask-image').disabled=locked;
    $('save-mask').disabled=locked;
    setStatus(locked?'Écran KALONÉO par défaut — protégé':'Écran ouvert');
    updatePreview();
  }

  function renderList() {
    const root=$('mask-list');
    root.replaceChildren();
    for(const meta of state.masks) {
      const button=document.createElement('button');
      button.type='button';
      button.className='mask-item'+(meta.systemProvided?' system':'');
      const title=document.createElement('strong');
      title.textContent=meta.name;
      const info=document.createElement('span');
      const modes=[];
      if(meta.hasText)modes.push('texte');
      if(meta.hasImage)modes.push('image');
      info.textContent='v'+meta.version+' • '+modes.join(' + ')+(meta.systemProvided?' • par défaut':'');
      button.append(title,info);
      button.addEventListener('click',()=>openMask(meta));
      root.appendChild(button);
    }
  }

  async function refreshList() {
    const result=await window.sebEvalPro?.kaloneoListMaskScreens?.();
    if(!result||result.ok!==true) throw new Error(result?.error||'Lecture de la bibliothèque impossible.');
    state.masks=Array.isArray(result.maskScreens)?result.maskScreens:[];
    renderList();
  }

  async function loadImage(file) {
    if(!file)return;
    if(!String(file.type||'').startsWith('image/')) throw new Error('Le fichier choisi doit être une image.');
    const data=await new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>resolve(String(reader.result||''));
      reader.onerror=()=>reject(reader.error||new Error('Lecture image impossible.'));
      reader.readAsDataURL(file);
    });
    state.image=data;
    state.imageName=file.name;
    updatePreview();
  }

  async function save() {
    const name=String($('mask-name').value||'').trim();
    const version=String($('mask-version').value||'1.0.0').trim();
    const text=String($('mask-text').value||'');
    if(!name)return setStatus('Le nom est obligatoire.',true);
    if(!text.trim()&&!state.image)return setStatus('Ajoutez un texte, une image, ou les deux.',true);

    const id=String($('mask-id').value||cleanId(name));
    $('mask-id').value=id;
    const payload={id,version,name,content:{text,image:state.image}};

    let result=await window.sebEvalPro?.kaloneoSaveMaskScreen?.(payload,false);
    if(result&&result.ok===false&&result.code==='EXISTS') {
      if(!confirm('Cette version existe déjà. La remplacer ?')) return;
      result=await window.sebEvalPro?.kaloneoSaveMaskScreen?.(payload,true);
    }
    if(!result||result.ok!==true)return setStatus(result?.error||'Enregistrement impossible.',true);

    setStatus('Écran enregistré dans la bibliothèque.');
    state.editing={id,version,systemProvided:false};
    await refreshList();
  }

  function ready() {
    $('back-tests-parcours').addEventListener('click',()=>{window.location.href='admin-tests-parcours.html';});
    $('new-mask').addEventListener('click',reset);
    $('mask-name').addEventListener('input',()=>{
      if(!state.editing)$('mask-id').value=cleanId($('mask-name').value);
      updatePreview();
    });
    $('mask-text').addEventListener('input',updatePreview);
    $('mask-image-file').addEventListener('change',async()=>{
      try{await loadImage($('mask-image-file').files?.[0]);}
      catch(error){setStatus(error?.message||String(error),true);}
      finally{$('mask-image-file').value='';}
    });
    $('remove-mask-image').addEventListener('click',()=>{state.image='';state.imageName='';updatePreview();});
    $('save-mask').addEventListener('click',()=>{save().catch(error=>setStatus(error?.message||String(error),true));});
    reset();
    refreshList().catch(error=>setStatus(error?.message||String(error),true));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
