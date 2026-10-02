(function(){
  'use strict';

  const DEF = window.KALONEO_PAGE_DEFINITION;
  const root = document.getElementById('kaloneo-page-root');
  if(!DEF || !root) throw new Error('KALONÉO: définition de page absente.');

  const state = { timers:new Map(), calculators:new Map(), dragTasks:new Map() };

  function el(tag, cls, text){
    const node=document.createElement(tag);
    if(cls) node.className=cls;
    if(text!==undefined && text!==null) node.textContent=text;
    return node;
  }

  function svgHouse(roof,wall,door){
    return '<svg viewBox="0 0 82 84" aria-hidden="true">'
      +'<polygon points="5,32 41,2 77,32" fill="'+roof+'"/>'
      +'<rect x="12" y="30" width="58" height="49" rx="3" fill="'+wall+'" stroke="#D0B178" stroke-width="2"/>'
      +'<rect x="20" y="41" width="14" height="14" fill="#DDF6FF" stroke="#4B88A3" stroke-width="2"/>'
      +'<rect x="48" y="41" width="14" height="14" fill="#DDF6FF" stroke="#4B88A3" stroke-width="2"/>'
      +'<rect x="35" y="54" width="14" height="25" rx="2" fill="'+door+'"/>'
      +'<rect x="59" y="11" width="8" height="17" fill="#96664A"/>'
      +'</svg>';
  }

  function svgCar(){
    return '<svg viewBox="0 0 94 54" aria-hidden="true">'
      +'<path d="M10 29 L23 15 Q26 11 31 11 H61 Q67 11 71 16 L80 29 H86 Q91 29 91 34 V42 H4 V34 Q4 29 10 29Z" fill="#2E8DD0" stroke="#0D5E9D" stroke-width="2"/>'
      +'<path d="M27 15 H43 V28 H18Z" fill="#CBEFFF" stroke="#0D5E9D" stroke-width="1.5"/>'
      +'<path d="M47 15 H61 Q65 15 68 19 L73 28 H47Z" fill="#A9DCF2" stroke="#0D5E9D" stroke-width="1.5"/>'
      +'<rect x="8" y="31" width="77" height="7" rx="3" fill="#56A9DF" opacity=".75"/>'
      +'<circle cx="22" cy="43" r="9" fill="#202830"/><circle cx="22" cy="43" r="4" fill="#C4D0D6"/>'
      +'<circle cx="72" cy="43" r="9" fill="#202830"/><circle cx="72" cy="43" r="4" fill="#C4D0D6"/>'
      +'</svg>';
  }

  function applyTypography(def){
    const t=def.typography||{};
    const r=document.documentElement.style;
    if(t.pageTitle) r.setProperty('--k-page-title',t.pageTitle+'px');
    if(t.sectionTitle) r.setProperty('--k-section-title',t.sectionTitle+'px');
    if(t.blockTitle) r.setProperty('--k-block-title',t.blockTitle+'px');
    if(t.body) r.setProperty('--k-body',t.body+'px');
    if(t.control) r.setProperty('--k-control',t.control+'px');
    if(t.secondary) r.setProperty('--k-secondary',t.secondary+'px');
    if(t.field) r.setProperty('--k-field',t.field+'px');
  }

  function renderHeader(def){
    const h=el('header','k-header');
    const left=el('div');
    left.append(el('h1','',def.title||''));
    if(def.subtitle) left.append(el('p','',def.subtitle));
    const brand=el('div','k-brand');
    if(def.brand){
      brand.append(el('strong','',def.brand.name||''));
      brand.append(el('span','',def.brand.baseline||''));
    }
    h.append(left,brand);
    return h;
  }

  function renderFormGrid(section){
    const wrap=el('section','k-card k-form-section');
    wrap.append(el('h2','',section.title||''));
    const grid=el('div','k-form-grid');
    for(const f of section.fields||[]){
      const row=el('div','k-field');
      const label=el('label','',f.label||f.id);
      label.htmlFor='k-'+f.id;
      const input=el('input');
      input.id='k-'+f.id;
      input.dataset.kaloneoField=f.id;
      input.type=f.inputType||'text';
      if(f.inputMode) input.inputMode=f.inputMode;
      if(f.maxLength) input.maxLength=f.maxLength;
      if(f.required) input.required=true;
      if(f.readonly) input.readOnly=true;
      if(f.value!==undefined) input.value=f.value;
      row.append(label,input);
      grid.append(row);
    }
    wrap.append(grid);
    return wrap;
  }

  function toolHead(block){
    const head=el('div','k-tool-head');
    const badge=el('span','k-step '+(block.tone||'blue'),String(block.step||''));
    const txt=el('div');
    txt.append(el('h3','',block.title||''));
    if(block.instruction) txt.append(el('p','',block.instruction));
    head.append(badge,txt);
    return head;
  }

  function makeSceneAsset(kind, variant){
    const node=el('div','k-asset');
    if(kind==='house'){
      node.classList.add('k-house',variant||'');
      if(variant==='left') node.innerHTML=svgHouse('#E56A31','#FFF2C9','#2F8CAF');
      else if(variant==='right') node.innerHTML=svgHouse('#406D91','#F9E9C2','#2F8CAF');
      else node.innerHTML=svgHouse('#F28A45','#FFF7D7','#277FA4');
    }else{
      node.classList.add('k-car');
      node.innerHTML=svgCar();
    }
    return node;
  }

  function installDrag(scene,obj,target,status,success){
    let active=false,pid=null,dx=0,dy=0,origin=null,placed=false;
    const toScene=r=>{const q=scene.getBoundingClientRect();return {left:r.left-q.left,top:r.top-q.top}};

    function snapNow(){
      const sr=scene.getBoundingClientRect(),er=obj.getBoundingClientRect(),tr=target.getBoundingClientRect();
      obj.style.left=(tr.left-sr.left+(tr.width-er.width)/2)+'px';
      obj.style.top=(tr.top-sr.top+(tr.height-er.height)/2)+'px';
      obj.style.right='auto';obj.style.bottom='auto';
      status.textContent=success;status.classList.add('ok');
    }

    function snap(){
      placed=true;
      snapNow();
      requestAnimationFrame(()=>{ if(placed) snapNow(); });
      setTimeout(()=>{ if(placed) snapNow(); },80);
    }

    obj.addEventListener('pointerdown',ev=>{
      if(ev.button!==undefined&&ev.button!==0)return;
      placed=false;
      status.classList.remove('ok');
      const r=obj.getBoundingClientRect();
      origin=toScene(r);dx=ev.clientX-r.left;dy=ev.clientY-r.top;
      obj.style.left=origin.left+'px';obj.style.top=origin.top+'px';obj.style.right='auto';obj.style.bottom='auto';
      active=true;pid=ev.pointerId;try{obj.setPointerCapture(pid)}catch(_){}
      ev.preventDefault();
    });
    obj.addEventListener('pointermove',ev=>{
      if(!active||ev.pointerId!==pid)return;
      const sr=scene.getBoundingClientRect(),er=obj.getBoundingClientRect();
      obj.style.left=Math.min(Math.max(0,ev.clientX-sr.left-dx),sr.width-er.width)+'px';
      obj.style.top=Math.min(Math.max(0,ev.clientY-sr.top-dy),sr.height-er.height)+'px';
    });
    obj.addEventListener('pointerup',ev=>{
      if(!active||ev.pointerId!==pid)return;
      active=false;
      const er=obj.getBoundingClientRect(),tr=target.getBoundingClientRect();
      const cx=er.left+er.width/2,cy=er.top+er.height/2;
      if(cx>=tr.left-12&&cx<=tr.right+12&&cy>=tr.top-12&&cy<=tr.bottom+12) snap();
      else if(origin){obj.style.left=origin.left+'px';obj.style.top=origin.top+'px'}
    });
    obj.addEventListener('keydown',ev=>{
      if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();snap()}
    });

    if(typeof ResizeObserver!=='undefined'){
      const observer=new ResizeObserver(()=>{ if(placed) requestAnimationFrame(snapNow); });
      observer.observe(scene);
    }
    window.addEventListener('resize',()=>{ if(placed) requestAnimationFrame(snapNow); });

    return {snap,get placed(){return placed;}};
  }

  function renderDragPlacement(block){
    const card=el('article','k-tool k-drag-card');
    card.append(toolHead(block));
    const scene=el('div','k-scene');
    scene.append(el('div','k-scene-grass'));
    const road=el('div','k-road');road.append(el('span'),el('span'),el('span'));scene.append(road);
    const parking=el('div','k-parking');
    parking.append(el('div','k-parking-line one'),el('div','k-parking-line two'));
    scene.append(parking);

    const left=makeSceneAsset('house','left');
    const right=makeSceneAsset('house','right');
    scene.append(left,right);

    const statuses=el('div','k-task-statuses');
    const taskMap={};

    for(const task of block.tasks||[]){
      const target=el('div','k-target '+task.target);
      target.dataset.targetId=task.id;
      scene.append(target);

      let obj;
      if(task.object==='house-orange'){
        obj=makeSceneAsset('house','drag');
      }else{
        obj=makeSceneAsset('car');
      }
      obj.classList.add('k-draggable');
      obj.tabIndex=0;
      obj.dataset.objectId=task.id;
      scene.append(obj);

      const st=el('span','k-chip',task.pending||'À réaliser');
      st.dataset.statusId=task.id;
      statuses.append(st);
      taskMap[task.id]={obj,target,status:st,task};
    }

    card.append(scene,statuses);

    requestAnimationFrame(()=>{
      for(const [id,x] of Object.entries(taskMap)){
        state.dragTasks.set(id,installDrag(scene,x.obj,x.target,x.status,x.task.success||'Réussi ✓'));
      }
    });
    return card;
  }

  function renderTimer(block){
    const card=el('article','k-tool k-timer');
    card.append(toolHead(block));
    const time=el('div','k-time','00:00');
    const row=el('div','k-button-row');
    const start=el('button','k-btn start',block.startLabel||'Démarrer');
    const stop=el('button','k-btn stop',block.stopLabel||'Arrêter');
    stop.disabled=true;
    const status=el('div','k-status');
    let timer=null,startAt=0;

    function tick(){
      const sec=Math.floor((Date.now()-startAt)/1000);
      time.textContent=String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');
    }
    start.onclick=()=>{
      if(timer)return;
      startAt=Date.now();tick();timer=setInterval(tick,250);
      start.disabled=true;stop.disabled=false;status.textContent=block.statusRunning||'En cours…';
    };
    stop.onclick=()=>{
      if(!timer)return;
      tick();clearInterval(timer);timer=null;
      start.disabled=false;stop.disabled=true;status.textContent=block.statusDone||'Terminé ✓';
    };

    row.append(start,stop);card.append(time,row,status);
    state.timers.set(block.title||'timer',{start,stop,status});
    return card;
  }

  function calculatorMarkup(id){
    const calc=el('div','k-calculator');
    calc.dataset.calculatorId=id;
    const head=el('div','k-calc-head');head.append(el('span','','Calculatrice'),el('span','','•••'));calc.append(head);
    const display=el('div','k-calc-display','0');calc.append(display);
    const keys=el('div','k-calc-keys');
    ['7','8','9','/','4','5','6','x','1','2','3','-','0','.','=','+'].forEach(v=>keys.append(el('button','',v)));
    calc.append(keys);
    const bottom=el('div','k-calc-bottom');
    const clear=el('button','','C'),close=el('button','close','Fermer');
    bottom.append(clear,close);calc.append(bottom);
    calc.append(el('div','k-calc-brand','Sauvegarde 56'));

    let expr='';
    clear.onclick=()=>{expr='';display.textContent='0'};
    keys.querySelectorAll('button').forEach(b=>b.onclick=()=>{
      const v=b.textContent;
      if(v==='='){
        try{
          const safe=expr.replace(/x/g,'*');
          if(!/^[0-9+\-*/.() ]+$/.test(safe)) throw new Error();
          const out=Function('"use strict";return ('+safe+')')();
          display.textContent=Number.isFinite(out)?String(out):'ERR';
          expr=Number.isFinite(out)?String(out):'';
        }catch(_){display.textContent='ERR';expr=''}
      }else{expr+=v;display.textContent=expr||'0'}
    });

    return {calc,close,reset:()=>{expr='';display.textContent='0'}};
  }

  function renderCalculatorDock(block){
    const dock=el('aside','k-dock');
    dock.dataset.dockId=block.id;
    const ph=el('div','k-dock-placeholder');
    ph.append(el('strong','',block.title||'Calculatrice'),el('span','',block.help||''));
    dock.append(ph);
    const c=calculatorMarkup(block.id);
    dock.append(c.calc);
    const api={
      open(){ph.style.display='none';c.calc.classList.add('open');},
      close(){c.calc.classList.remove('open');ph.style.display='flex';c.reset();}
    };
    c.close.onclick=api.close;
    state.calculators.set(block.id,api);
    return dock;
  }

  function renderCalculatorLauncher(block){
    const card=el('article','k-tool k-calculator-launcher');
    card.append(toolHead(block));
    const btn=el('button','k-btn calc',block.buttonLabel||'Ouvrir la calculatrice');
    const status=el('div','k-status');
    btn.onclick=()=>{
      const api=state.calculators.get(block.targetDock);
      if(api) api.open();
      status.textContent=block.statusDone||'Calculatrice ouverte ✓';
    };
    card.append(btn,status);
    return card;
  }

  function renderAudio(block){
    const card=el('article','k-tool k-audio');
    card.append(toolHead(block));
    const controls=el('div','k-audio-controls');
    const btn=el('button','k-btn',block.buttonLabel||'▶ Écouter le son');
    const label=el('label');
    const cb=el('input');cb.type='checkbox';
    label.append(cb,document.createTextNode(' '+(block.confirmLabel||'Son entendu')));
    const status=el('div','k-status');
    btn.onclick=()=>{
      try{
        const C=window.AudioContext||window.webkitAudioContext;
        const c=new C(),o=c.createOscillator(),g=c.createGain();
        o.frequency.value=523.25;g.gain.setValueAtTime(.0001,c.currentTime);
        g.gain.exponentialRampToValueAtTime(.18,c.currentTime+.02);
        g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+.45);
        o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+.48);
        o.onended=()=>c.close();
      }catch(_){}
    };
    cb.onchange=()=>{status.textContent=cb.checked?(block.statusDone||'Son entendu ✓'):''};
    controls.append(btn,label);card.append(controls,status);
    return card;
  }

  function renderPractice(section){
    const wrap=el('section','k-card k-practice');
    const title=el('div','k-practice-title');
    title.append(el('h2','',section.title||''),el('p','',section.help||''));
    wrap.append(title);

    const grid=el('div','k-practice-grid');
    const layout=section.layout||{};
    if(layout.left||layout.middle||layout.right){
      grid.style.gridTemplateColumns='minmax(520px,'+(layout.left||'1.45fr')+') minmax(430px,'+(layout.middle||'1.12fr')+') '+(layout.right||'280px');
    }

    grid.append(renderDragPlacement(section.left));

    const middle=el('section','k-middle');
    for(const block of section.middle||[]){
      if(block.type==='timer') middle.append(renderTimer(block));
      else if(block.type==='calculator-launcher') middle.append(renderCalculatorLauncher(block));
      else if(block.type==='audio-check') middle.append(renderAudio(block));
    }
    grid.append(middle);

    // Dock must exist before launcher interaction. Rendering now also registers its API.
    grid.append(renderCalculatorDock(section.right));
    wrap.append(grid);
    return wrap;
  }


  function renderTextBlock(block){
    const wrap=el('div','k-content-text'+(block.role==='closing'?' k-content-closing':''));
    if(block.align) wrap.style.textAlign=block.align;
    if(block.title) wrap.append(el('h2','',block.title));
    for(const paragraph of block.paragraphs||[]) wrap.append(el('p','',paragraph));
    return wrap;
  }

  function renderImageMessage(block){
    const wrap=el('div','k-image-message');
    const img=el('img');
    img.src=block.image||'';
    img.alt=block.alt||'';
    wrap.append(img,el('p','',block.text||''));
    return wrap;
  }

  function renderFactoryArrival(block, sceneIndex){
    const card=el('section','k-card k-animation-card');
    const heading=el('div','k-animation-heading');
    heading.append(el('span','k-animation-symbol','▶'));
    const headingText=el('div');
    headingText.append(el('strong','',block.title||'Animation'));
    if(block.help) headingText.append(el('p','',block.help));
    heading.append(headingText);
    card.append(heading);

    const scene=el('div','k-factory-scene');
    scene.setAttribute('role','img');
    scene.setAttribute('aria-label',block.ariaLabel||'Animation');
    scene.append(el('div','k-factory-sky'));
    scene.append(el('div','k-factory-tree left'));
    scene.append(el('div','k-factory-tree right'));

    const factory=el('div','k-factory-building');
    factory.append(el('div','k-factory-wing'));
    factory.append(el('div','k-factory-sign','KALONÉO'));
    const door=el('div','k-factory-door'); door.append(el('span')); factory.append(door);
    scene.append(factory);
    scene.append(el('div','k-factory-gate left'));
    scene.append(el('div','k-factory-gate right'));
    scene.append(el('div','k-factory-path'));
    scene.append(el('div','k-factory-road'));
    scene.append(el('div','k-factory-road-line a'));
    scene.append(el('div','k-factory-road-line b'));
    scene.append(el('div','k-factory-road-line c'));

    const person=el('div','k-factory-person');
    ['head','body','backpack','arm left','arm right','leg left','leg right'].forEach(cls=>{
      person.append(el('span','k-person-'+cls.replace(' ',' k-person-')));
    });
    scene.append(person);
    scene.append(el('div','k-factory-end',block.finalMessage||'Bienvenue'));
    card.append(scene);

    const duration=Math.max(1000,Number(block.durationMs)||7000);
    const storageKey='kaloneo_scene_played_'+(DEF.id||'page')+'_'+sceneIndex;
    function finish(){
      scene.classList.remove('playing');
      scene.classList.add('finished');
      scene.dataset.playState='finished';
    }
    function play(){
      if(scene.dataset.playState) return;
      let played=false;
      try{played=sessionStorage.getItem(storageKey)==='1'}catch(_){}
      if(block.playMode==='once' && played){finish();return}
      try{if(block.playMode==='once')sessionStorage.setItem(storageKey,'1')}catch(_){}
      scene.classList.add('playing');
      scene.dataset.playState='playing';
      setTimeout(finish,duration);
    }
    requestAnimationFrame(play);
    return card;
  }

  function renderContentStack(section){
    const wrap=el('section','k-content-stack');
    if(section.maxWidth) wrap.style.maxWidth=section.maxWidth+'px';
    let sceneIndex=0;
    for(const block of section.blocks||[]){
      if(block.type==='text') wrap.append(renderTextBlock(block));
      else if(block.type==='image-message') wrap.append(renderImageMessage(block));
      else if(block.type==='animated-scene' && block.scene==='factory-arrival'){
        wrap.append(renderFactoryArrival(block,sceneIndex++));
      }
    }
    return wrap;
  }

  function renderNavigation(nav){
    const foot=el('footer','k-footer');
    if(nav?.next){
      const b=el('button','k-btn next',nav.next.label||'Suivant');
      b.id='k-'+(nav.next.id||'next');
      foot.append(b);
    }
    return foot;
  }

  function render(){
    applyTypography(DEF);
    root.innerHTML='';
    const hasHeader=!!DEF.header;
    const isContentPage=(DEF.sections||[]).some(section=>section.type==='content-stack');
    const page=el('div','k-page'+(isContentPage?' k-page-content':''));
    page.dataset.kaloneoGenerated='1';
    page.dataset.kaloneoPageId=DEF.id||'';
    if(hasHeader) page.append(renderHeader(DEF.header));
    for(const section of DEF.sections||[]){
      if(section.type==='form-grid') page.append(renderFormGrid(section));
      else if(section.type==='practice-grid') page.append(renderPractice(section));
      else if(section.type==='content-stack') page.append(renderContentStack(section));
    }
    page.append(renderNavigation(DEF.navigation||{}));
    root.append(page);

    window.KaloneoPageRuntime = Object.freeze({
      definition:DEF,
      generated:true,
      place(id){const api=state.dragTasks.get(id);if(api)api.snap();},
      openCalculator(id){state.calculators.get(id)?.open();},
      closeCalculator(id){state.calculators.get(id)?.close();}
    });
  }

  render();
})();