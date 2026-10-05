(() => {
  'use strict';

  const SECTION_ID='seb-kaltest-manual-bilan-section';

  function clean(value) {
    return String(value == null ? '' : value).replace(/\s+/g,' ').trim();
  }

  function stableId(value) {
    return clean(value)
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'') || 'manuel';
  }

  function stateCandidates() {
    const out=[];
    for(let i=0;i<sessionStorage.length;i+=1) {
      const key=sessionStorage.key(i);
      if(!key || !/^seb_kaltest_/i.test(key)) continue;
      try {
        const value=JSON.parse(sessionStorage.getItem(key)||'null');
        if(value && typeof value==='object' && value.tests && typeof value.tests==='object') out.push(value);
      } catch (_) {}
    }
    return out;
  }

  function manualItems() {
    const out=[];
    const seen=new Set();
    for(const state of stateCandidates()) {
      for(const [testId,testState] of Object.entries(state.tests||{})) {
        const manual=testState?.result?.manualEvaluation;
        if(!manual || manual.required!==true || !Array.isArray(manual.items)) continue;
        const testTitle=clean(manual.testTitle||testId);
        for(const item of manual.items) {
          const questionId=clean(item?.questionId);
          const key=testId+'@'+questionId;
          if(seen.has(key)) continue;
          seen.add(key);
          out.push({
            testId:clean(manual.testId||testId),
            testTitle,
            questionId,
            prompt:clean(item?.prompt),
            response:String(item?.response == null ? '' : item.response),
            levels:Array.isArray(item?.levels)&&item.levels.length?item.levels:['NE','I','II','III']
          });
        }
      }
    }
    return out;
  }

  function levelCell(level) {
    const td=document.createElement('td');
    td.className='level';
    td.dataset.l=level;
    td.title='Attribuer le niveau '+level;
    return td;
  }

  function install() {
    const table=document.getElementById('bilan');
    const tbody=table?.querySelector('tbody');
    if(!tbody || document.getElementById(SECTION_ID)) return;

    const items=manualItems();
    if(!items.length) return;

    const section=document.createElement('tr');
    section.id=SECTION_ID;
    section.className='section2 seb-kaltest-manual-section';
    const heading=document.createElement('td');
    heading.colSpan=6;
    heading.textContent='Évaluations manuelles KALONÉO';
    section.appendChild(heading);
    tbody.appendChild(section);

    items.forEach((item,index)=>{
      const row=document.createElement('tr');
      row.className=index%2?'alt seb-kaltest-manual-row':'seb-kaltest-manual-row';
      row.dataset.r='kaltest-manuel-'+stableId(item.testId)+'-'+stableId(item.questionId||String(index+1));
      row.dataset.kaltestManual='1';

      const module=document.createElement('td');
      const title=document.createElement('b');
      title.textContent=item.testTitle||item.testId||'Test KALONÉO';
      module.appendChild(title);
      if(item.prompt) {
        module.appendChild(document.createElement('br'));
        const prompt=document.createElement('i');
        prompt.textContent=item.prompt;
        module.appendChild(prompt);
      }
      row.appendChild(module);

      ['NE','I','II','III'].forEach(level=>row.appendChild(levelCell(level)));

      const comment=document.createElement('td');
      const answerLabel=document.createElement('strong');
      answerLabel.textContent='Réponse du candidat :';
      const answer=document.createElement('div');
      answer.className='detail seb-kaltest-free-answer';
      answer.textContent=item.response || '—';
      answer.style.whiteSpace='pre-wrap';
      answer.style.margin='5px 0 8px';
      const help=document.createElement('div');
      help.className='seb-kaltest-manual-help';
      help.textContent='Cliquez sur NE, I, II ou III puis ajoutez, si nécessaire, un commentaire Administrateur.';
      help.style.fontSize='9pt';
      help.style.color='#555';
      help.style.marginBottom='5px';
      const textarea=document.createElement('textarea');
      textarea.className='ctxt';
      textarea.placeholder='Commentaire Administrateur (facultatif)';
      comment.append(answerLabel,answer,help,textarea);
      row.appendChild(comment);

      tbody.appendChild(row);
    });
  }

  // Le script est chargé avant le runtime historique du bilan : les lignes doivent
  // exister avant son DOMContentLoaded afin de bénéficier de ses clics, sauvegarde,
  // restauration et export Word sans dupliquer ces mécanismes.
  if(document.readyState==='loading') install();
  else install();
})();
