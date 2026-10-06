(() => {
  'use strict';

  const $=id=>document.getElementById(id);

  async function ready() {
    const result=await window.sebEvalPro?.kaloneoGetMaskPreview?.();
    if(!result||result.ok!==true) {
      document.body.textContent=result?.error||'Aperçu indisponible.';
      return;
    }

    const value=result.definition||{};
    const content=value.content||{};
    const text=String(content.text||'');
    const image=String(content.image||'');

    const textNode=$('mask-preview-text');
    const imageNode=$('mask-preview-image');

    textNode.textContent=text;
    textNode.hidden=!text.trim();

    if(image) {
      imageNode.src=image;
      imageNode.alt=String(value.name||'Écran de masquage');
      imageNode.hidden=false;
    } else {
      imageNode.hidden=true;
      imageNode.removeAttribute('src');
    }

    $('mask-preview-close').addEventListener('click',async()=>{
      await window.sebEvalPro?.kaloneoCloseMaskPreview?.();
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});
  else ready();
})();
