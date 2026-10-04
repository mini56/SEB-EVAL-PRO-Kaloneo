(() => {
  'use strict';

  const Core = window.KaloneoBuilderCore;
  if (!Core) throw new Error('KALONÉO Builder Core absent.');

  const DRAFT_KEY = 'kaloneo_test_builder_v2';
  const state = {
    idLocked: false,
    sourceDefinition: null,
    blocks: []
  };

  const $ = id => document.getElementById(id);

  function uid(prefix='b') {
    return prefix + '_' + Math.random().toString(36).slice(2, 10);
  }

  function baseQuestion() {
    return {
      id: '',
      prompt: '',
      responseType: 'text',
      normalizer: '',
      acceptedAnswers: '',
      units: '',
      points: 1,
      example: false,
      options: '',
      unitInput: false,
      unitScored: false,
      supplementalFields: []
    };
  }

  function baseBlock(type='text') {
    if (type === 'table-grid') return Core.createGridBlock(3, 3);
    if (type === 'response-table') {
      return {
        uid:uid('responses'),
        type,
        zone:'left',
        responseTable:{
          headers:['Question N°','Réponse','Unités'],
          columns:[
            {id:'number',widthChars:10,align:'center'},
            {id:'answer',widthChars:14,align:'center'},
            {id:'unit',align:'left'}
          ]
        }
      };
    }
    if (type === 'inline-flow') {
      return {uid:uid('inline'),type,zone:'left',wordBank:[],flow:[],flowText:''};
    }
    if (type === 'multiple-tables') {
      return {
        uid:uid('table'),
        type,
        zone:'left',
        tableDefinition:{id:uid('tabledef'),title:'',headers:['Colonne 1','Colonne 2'],questionIds:[]}
      };
    }
    return {
      uid:uid(),
      type,
      zone:'left',
      text:'',
      html:'',
      js:'',
      mediaName:'',
      mediaType:'',
      mediaData:'',
      mediaAlt:'',
      mediaPlaceholder:'',
      question:baseQuestion()
    };
  }

  function defaultMeta() {
    return {
      title:'',
      id:'',
      version:'1.0.0',
      category:'mathematiques',
      scored:true,
      layout:'single',
      template:'generic',
      scenario:'',
      instruction:'',
      calculatorCompatible:false,
      calculatorDefaultEnabled:false,
      chronoEnabled:false,
      chronoMode:'simple',
      chronoMinMeasures:1,
      chronoMaxMeasures:1,
      chronoAutoReset:false,
      chronoFocusAfterStop:false,
      chronoShowTime:true,
      adminIntervention:false,
      adminInstructions:'',
      autoevaluation:false,
      externalMaterial:false,
      externalMaterialText:'',
      block1WidthChars:'',
      block2WidthChars:'',
      lastBlockRemainder:true
    };
  }

  function collectMeta() {
    return {
      title:$('test-title').value.trim(),
      id:$('test-id').value.trim(),
      version:$('test-version').value.trim() || '1.0.0',
      category:$('test-category').value,
      scored:$('test-scored').value === 'true',
      layout:$('test-layout').value,
      template:$('test-template').value,
      scenario:$('test-scenario').value.trim(),
      instruction:$('test-instruction').value.trim(),
      calculatorCompatible:$('calculator-compatible').checked,
      calculatorDefaultEnabled:false,
      chronoEnabled:$('chrono-enabled').checked,
      chronoMode:$('chrono-mode').value,
      chronoMinMeasures:Math.max(1,Number($('chrono-min-measures').value)||1),
      chronoMaxMeasures:Math.max(1,Number($('chrono-max-measures').value)||1),
      chronoAutoReset:$('chrono-auto-reset').checked,
      chronoFocusAfterStop:$('chrono-focus-after-stop').checked,
      chronoShowTime:$('chrono-show-time').checked,
      adminIntervention:$('admin-intervention').checked,
      adminInstructions:$('admin-instructions').value.trim(),
      autoevaluation:$('autoevaluation-enabled').checked,
      externalMaterial:$('external-material').checked,
      externalMaterialText:$('external-material-text').value.trim(),
      block1WidthChars:$('block1-width-chars').value,
      block2WidthChars:$('block2-width-chars').value,
      lastBlockRemainder:$('last-block-remainder').checked
    };
  }

  function applyMeta(meta={}) {
    const m=Object.assign(defaultMeta(),meta);
    $('test-title').value=m.title;
    $('test-id').value=m.id;
    $('test-version').value=m.version;
    $('test-category').value=m.category;
    $('test-scored').value=String(m.scored !== false);
    $('test-layout').value=Core.LAYOUTS.includes(m.layout)?m.layout:'single';
    $('test-template').value=Array.from($('test-template').options).some(o=>o.value===m.template)?m.template:'generic';
    $('test-scenario').value=m.scenario;
    $('test-instruction').value=m.instruction;
    $('calculator-compatible').checked=Boolean(m.calculatorCompatible);
    $('chrono-enabled').checked=Boolean(m.chronoEnabled);
    $('chrono-mode').value=m.chronoMode||'simple';
    $('chrono-min-measures').value=Math.max(1,Number(m.chronoMinMeasures)||1);
    $('chrono-max-measures').value=Math.max(1,Number(m.chronoMaxMeasures)||1);
    $('chrono-auto-reset').checked=Boolean(m.chronoAutoReset);
    $('chrono-focus-after-stop').checked=Boolean(m.chronoFocusAfterStop);
    $('chrono-show-time').checked=m.chronoShowTime!==false;
    $('admin-intervention').checked=Boolean(m.adminIntervention);
    $('admin-instructions').value=m.adminInstructions||'';
    $('autoevaluation-enabled').checked=Boolean(m.autoevaluation);
    $('external-material').checked=Boolean(m.externalMaterial);
    $('external-material-text').value=m.externalMaterialText||'';
    $('block1-width-chars').value=m.block1WidthChars || '';
    $('block2-width-chars').value=m.block2WidthChars || '';
    $('last-block-remainder').checked=m.lastBlockRemainder !== false;
    $('custom-sizing-row').hidden=m.layout !== 'chars-rest';
    syncCapabilityOptions();
  }

  function syncCapabilityOptions() {
    $('chrono-options').hidden=!$('chrono-enabled').checked;
    $('admin-options').hidden=!$('admin-intervention').checked;
    $('material-options').hidden=!$('external-material').checked;
  }

  function currentModel() {
    return {
      idLocked:state.idLocked,
      sourceDefinition:state.sourceDefinition ? Core.clone(state.sourceDefinition) : null,
      meta:collectMeta(),
      blocks:Core.clone(state.blocks)
    };
  }

  function saveDraft(showStatus=true) {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(currentModel()));
    if (showStatus) {
      $('draft-status').textContent='Sauvegardé';
      setTimeout(()=>$('draft-status').textContent='Brouillon local',1200);
    }
  }

  function restoreDraft() {
    try {
      const data=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');
      if (!data || !data.meta) return false;
      state.idLocked=Boolean(data.idLocked);
      state.sourceDefinition=data.sourceDefinition||null;
      state.blocks=Array.isArray(data.blocks)?data.blocks:[];
      applyMeta(data.meta);
      return true;
    } catch (_) {
      return false;
    }
  }

  function normalizeIdFromTitle() {
    return Core.cleanId($('test-id').value || $('test-title').value || 'test');
  }

  function usedQuestionIds() {
    const ids=new Set();
    for(const block of state.blocks) {
      if(block.type==='question'&&block.question?.id) ids.add(block.question.id);
      if(block.type==='table-grid') {
        for(const cell of (block.table?.cells||[]).flat()) if(cell?.questionId) ids.add(cell.questionId);
      }
    }
    return ids;
  }

  function nextQuestionId() {
    const suffix=normalizeIdFromTitle();
    const used=usedQuestionIds();
    let n=1;
    while(used.has('ID'+n+'_'+suffix)) n++;
    return 'ID'+n+'_'+suffix;
  }

  function ensureQuestionId(question) {
    if(!question.id) question.id=nextQuestionId();
    return question.id;
  }

  function inputField(label,value,onInput,options={}) {
    const wrap=document.createElement('label');
    wrap.textContent=label;
    const el=options.multiline?document.createElement('textarea'):document.createElement('input');
    if (!options.multiline) el.type=options.type||'text';
    el.value=value == null ? '' : value;
    if (options.placeholder) el.placeholder=options.placeholder;
    if (options.title) { el.title=options.title; wrap.title=options.title; }
    if (options.min != null) el.min=String(options.min);
    if (options.max != null) el.max=String(options.max);
    if (options.readOnly) el.readOnly=true;
    const grow=()=>{
      if(el.tagName==='TEXTAREA'){
        el.style.height='auto';
        el.style.height=Math.max(42,el.scrollHeight)+'px';
      }
    };
    el.addEventListener('input',()=>{grow();onInput(el.value);});
    if(el.tagName==='TEXTAREA') requestAnimationFrame(grow);
    wrap.appendChild(el);
    return wrap;
  }

  function checkboxField(label,checked,onChange) {
    const wrap=document.createElement('label');
    wrap.className='inline-checkbox';
    const el=document.createElement('input');
    el.type='checkbox';
    el.checked=Boolean(checked);
    el.addEventListener('change',()=>onChange(el.checked));
    wrap.append(el,document.createTextNode(' '+label));
    return wrap;
  }

  function selectField(label,value,values,onChange) {
    const wrap=document.createElement('label');
    wrap.textContent=label;
    const sel=document.createElement('select');
    values.forEach(([v,text])=>{
      const opt=document.createElement('option');
      opt.value=v;
      opt.textContent=text;
      sel.appendChild(opt);
    });
    sel.value=value;
    sel.addEventListener('change',()=>onChange(sel.value));
    wrap.appendChild(sel);
    return wrap;
  }

  function splitValues(value) {
    return Core.splitValues(value);
  }

  function parseInlineFlowText(text) {
    const source=String(text||'');
    const parts=source.split(/(\[\[[A-Za-z0-9_-]+\]\])/g).filter(Boolean);
    return parts.map(part=>{
      const match=part.match(/^\[\[([A-Za-z0-9_-]+)\]\]$/);
      if (match) return {type:'question',questionId:match[1]};
      const lines=part.split(/\n\n/);
      const out=[];
      lines.forEach((segment,index)=>{
        if (segment) out.push({type:'text',text:segment,breakAfterSentence:index<lines.length-1});
      });
      return out;
    }).flat();
  }

  function flowToText(flow) {
    return (flow||[]).map(item=>{
      if (item.type==='question') return '[['+item.questionId+']]';
      if (item.type==='text') return String(item.text||'')+(item.breakAfterSentence?'\n\n':'');
      return '';
    }).join('');
  }

  async function readFileAsDataUrl(file) {
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>resolve(String(reader.result||''));
      reader.onerror=reject;
      reader.readAsDataURL(file);
    });
  }

  function renderQuestionEditor(block,body) {
    const q=block.question||(block.question=baseQuestion());
    ensureQuestionId(q);
    const row1=document.createElement('div');
    row1.className='field-row';
    row1.append(
      inputField('ID automatique / stable',q.id,()=>{},{readOnly:true,title:'Identifiant généré automatiquement. Il reste stable même si la question est déplacée ou reformulée.'}),
      inputField('Question',q.prompt,value=>{q.prompt=value;changed();},{multiline:true,title:'Entrez le texte de la question présenté au candidat.'})
    );
    body.appendChild(row1);

    const row2=document.createElement('div');
    row2.className='field-row cols-3';
    row2.append(
      selectField('Type de réponse',q.responseType,[
        ['text','Texte'],['number','Nombre'],['number-unit','Nombre + unité'],['duration','Durée / horaire'],
        ['single-choice','Choix unique'],['multiple-choice','Choix multiple'],['boolean','Vrai / Faux'],['select','Liste déroulante']
      ],value=>{q.responseType=value;changed();renderBlocks();}),
      inputField('Réponse(s) attendue(s)',q.acceptedAnswers,value=>{q.acceptedAnswers=value;changed();},{placeholder:'Séparer par ;',title:'Entrez la ou les réponses correctes. Séparez plusieurs réponses acceptées par un point-virgule ;'}),
      inputField('Points',q.example?0:q.points,value=>{if(!q.example)q.points=Math.max(0,Number(value)||0);changed();},{type:'number',min:0,readOnly:Boolean(q.example),title:'Nombre de points attribués. Une question d’exemple reste automatiquement à 0.'})
    );
    body.appendChild(row2);

    const row3=document.createElement('div');
    row3.className='field-row cols-3';
    row3.append(
      inputField('Unité(s)',q.units,value=>{q.units=value;changed();},{placeholder:'Séparer par ;',title:'Indiquez les écritures d’unité acceptées, séparées par ;. Laissez vide si aucune unité n’est demandée.'}),
      checkboxField('Champ unité affiché',q.unitInput,value=>{q.unitInput=value;changed();}),
      checkboxField('Unité notée',q.unitScored,value=>{q.unitScored=value;changed();})
    );
    body.appendChild(row3);

    if (['single-choice','multiple-choice','select'].includes(q.responseType)) {
      body.appendChild(inputField('Choix proposés',q.options,value=>{q.options=value;changed();},{placeholder:'Choix 1; Choix 2; Choix 3'}));
    }
    if (q.responseType==='duration') {
      body.appendChild(inputField('Normalisation',q.normalizer||'duration-fr',value=>{q.normalizer=value;changed();},{placeholder:'duration-fr'}));
    }

    body.appendChild(checkboxField('Question d’exemple — 0 point, hors score et hors Bilan',q.example,value=>{
      q.example=value;
      if(value) q.points=0;
      changed();
      renderBlocks();
    }));
  }

  function ensureResponseColumns(block) {
    const t=block.responseTable||(block.responseTable={headers:['Question N°','Réponse','Unités'],columns:[]});
    t.headers=Array.isArray(t.headers)?t.headers:['Question N°','Réponse','Unités'];
    t.columns=Array.isArray(t.columns)?t.columns:[];
    while(t.columns.length<t.headers.length) {
      const i=t.columns.length;
      t.columns.push({id:'col'+(i+1),widthChars:'',align:i===t.headers.length-1?'left':'center'});
    }
    if(t.columns.length>t.headers.length) t.columns.length=t.headers.length;
    return t;
  }

  function renderResponseTableEditor(block,body) {
    const t=ensureResponseColumns(block);
    body.appendChild(inputField('En-têtes du tableau',t.headers.join('; '),value=>{
      t.headers=splitValues(value);
      ensureResponseColumns(block);
      changed();
      renderBlocks();
    },{placeholder:'N°; Réponses; Unités; Opérations effectuées'}));

    const grid=document.createElement('div');
    grid.className='column-editor';
    t.headers.forEach((header,index)=>{
      const col=t.columns[index]||{};
      const row=document.createElement('div');
      row.className='column-editor-row';
      const name=document.createElement('strong');
      name.textContent=header||('Colonne '+(index+1));

      const width=document.createElement('input');
      width.type='number';
      width.min='3';
      width.placeholder=index===t.headers.length-1?'Reste':'caractères';
      width.value=col.widthChars==null?'':col.widthChars;
      width.addEventListener('input',()=>{
        col.widthChars=width.value?Math.max(3,Number(width.value)||3):'';
        changed();
      });

      const align=document.createElement('select');
      [['center','Centré'],['left','Gauche']].forEach(([v,l])=>{
        const o=document.createElement('option');o.value=v;o.textContent=l;align.appendChild(o);
      });
      align.value=col.align||'center';
      align.addEventListener('change',()=>{col.align=align.value;changed();});

      const rest=document.createElement('span');
      rest.className='muted';
      rest.textContent=index===t.headers.length-1&&!col.widthChars?'Reste de la place':'';
      row.append(name,width,align,rest);
      grid.appendChild(row);
    });
    body.appendChild(grid);
  }

  function resizeGrid(table,newRows,newCols) {
    newRows=Math.max(1,Math.min(30,Number(newRows)||1));
    newCols=Math.max(1,Math.min(20,Number(newCols)||1));
    const old=Array.isArray(table.cells)?table.cells:[];
    const cells=Array.from({length:newRows},(_,r)=>Array.from({length:newCols},(_,c)=>{
      const cell=old[r]&&old[r][c];
      return cell?cell:{kind:'empty',value:'',questionId:'',acceptedAnswers:'',responseType:'text',points:1,rowSpan:1,colSpan:1};
    }));
    table.rows=newRows;
    table.cols=newCols;
    table.cells=cells;
    table.columns=Array.isArray(table.columns)?table.columns:[];
    while(table.columns.length<newCols) {
      const i=table.columns.length;
      table.columns.push({id:'c'+(i+1),widthChars:'',align:'center',remainder:i===newCols-1});
    }
    table.columns.length=newCols;
    table.columns.forEach((col,i)=>col.remainder=i===newCols-1 && !col.widthChars);
  }

  function renderGridEditor(block,body) {
    const table=block.table||(block.table=Core.createGridBlock(3,3).table);
    resizeGrid(table,table.rows||3,table.cols||3);

    const dims=document.createElement('div');
    dims.className='field-row cols-3';
    dims.append(
      inputField('Titre du tableau',table.title||'',value=>{table.title=value;changed();}),
      inputField('Lignes',table.rows,value=>{resizeGrid(table,value,table.cols);changed();renderBlocks();},{type:'number',min:1,max:30}),
      inputField('Colonnes',table.cols,value=>{resizeGrid(table,table.rows,value);changed();renderBlocks();},{type:'number',min:1,max:20})
    );
    body.appendChild(dims);

    const columns=document.createElement('div');
    columns.className='grid-columns-editor';
    table.columns.forEach((col,index)=>{
      const row=document.createElement('div');
      row.className='column-editor-row';
      const label=document.createElement('strong');
      label.textContent='Colonne '+(index+1);
      const width=document.createElement('input');
      width.type='number';width.min='3';width.placeholder=index===table.columns.length-1?'Reste':'caractères';
      width.value=col.widthChars||'';
      width.addEventListener('input',()=>{
        col.widthChars=width.value?Math.max(3,Number(width.value)||3):'';
        col.remainder=index===table.columns.length-1&&!col.widthChars;
        changed();
      });
      const align=document.createElement('select');
      [['center','Centré'],['left','Gauche']].forEach(([v,l])=>{const o=document.createElement('option');o.value=v;o.textContent=l;align.appendChild(o);});
      align.value=col.align||'center';
      align.addEventListener('change',()=>{col.align=align.value;changed();});
      const rest=document.createElement('span');
      rest.className='muted';
      rest.textContent=index===table.columns.length-1&&!col.widthChars?'Reste disponible':'';
      row.append(label,width,align,rest);
      columns.appendChild(row);
    });
    body.appendChild(columns);

    const scroll=document.createElement('div');
    scroll.className='grid-editor-scroll';
    const editor=document.createElement('table');
    editor.className='cell-grid-editor';

    table.cells.forEach((rowCells,rowIndex)=>{
      const tr=document.createElement('tr');
      rowCells.forEach((cell,colIndex)=>{
        const td=document.createElement('td');
        const kind=document.createElement('select');
        [
          ['empty','Vide'],['fixed-text','Texte fixe'],['candidate-answer','Réponse candidat'],
          ['select','Liste déroulante'],['choice-option','Choix unique — option'],['unit','Unité'],
          ['image','Image'],['audio','Audio'],['video','Vidéo']
        ].forEach(([v,l])=>{const o=document.createElement('option');o.value=v;o.textContent=l;kind.appendChild(o);});
        kind.value=cell.kind||'empty';
        kind.addEventListener('change',()=>{
          cell.kind=kind.value;
          if(['candidate-answer','select','choice-option','unit'].includes(cell.kind)&&!cell.questionId) {
            cell.questionId=nextQuestionId();
          }
          changed();renderBlocks();
        });
        td.appendChild(kind);

        if(cell.kind==='fixed-text'||cell.kind==='choice-option') {
          const value=document.createElement('input');
          value.type='text';
          value.placeholder=cell.kind==='fixed-text'?'Texte affiché':'Option affichée';
          value.value=cell.value||'';
          value.addEventListener('input',()=>{cell.value=value.value;changed();});
          td.appendChild(value);
        }

        if(['image','audio','video'].includes(cell.kind)) {
          const media=document.createElement('input');
          media.type='file';
          media.accept=cell.kind==='image'?'image/*':cell.kind==='audio'?'audio/*':'video/*';
          media.title='La ressource est embarquée dans le test pour fonctionner hors ligne.';
          media.addEventListener('change',async()=>{
            const file=media.files&&media.files[0];
            if(!file)return;
            cell.mediaName=file.name;
            cell.mediaType=file.type||'';
            cell.value=await readFileAsDataUrl(file);
            changed();
            renderBlocks();
          });
          td.appendChild(media);
          const status=document.createElement('div');
          status.className='file-preview-name';
          status.textContent=cell.mediaName?'Embarqué : '+cell.mediaName:(cell.value?'Ressource embarquée':'Aucune ressource');
          td.appendChild(status);
          if(cell.kind==='image') {
            const alt=document.createElement('input');
            alt.type='text';
            alt.placeholder='Texte alternatif';
            alt.value=cell.alt||'';
            alt.addEventListener('input',()=>{cell.alt=alt.value;changed();});
            td.appendChild(alt);
          }
        }

        if(['candidate-answer','select','choice-option','unit'].includes(cell.kind)) {
          const qid=document.createElement('input');
          qid.type='text';qid.placeholder='ID réponse';qid.value=cell.questionId||'';
          qid.title='ID stable de la réponse. Pour un choix unique en ligne, les cellules options peuvent partager le même ID.';
          qid.addEventListener('input',()=>{cell.questionId=Core.cleanId(qid.value);changed();});
          td.appendChild(qid);

          const expected=document.createElement('input');
          expected.type='text';expected.placeholder='Réponse attendue';expected.value=cell.acceptedAnswers||'';
          expected.addEventListener('input',()=>{cell.acceptedAnswers=expected.value;changed();});
          td.appendChild(expected);

          if(cell.kind==='select'||cell.kind==='choice-option') {
            const options=document.createElement('input');
            options.type='text';options.placeholder='Choix séparés par ;';options.value=(cell.options||[]).join('; ');
            options.addEventListener('input',()=>{cell.options=splitValues(options.value);changed();});
            td.appendChild(options);
          }
        }

        const span=document.createElement('div');
        span.className='cell-span-editor';
        const rs=document.createElement('input');rs.type='number';rs.min='1';rs.value=cell.rowSpan||1;rs.title='Fusion verticale';
        const cs=document.createElement('input');cs.type='number';cs.min='1';cs.value=cell.colSpan||1;cs.title='Fusion horizontale';
        rs.addEventListener('input',()=>{cell.rowSpan=Math.max(1,Number(rs.value)||1);changed();});
        cs.addEventListener('input',()=>{cell.colSpan=Math.max(1,Number(cs.value)||1);changed();});
        span.append('Fusion ',rs,' × ',cs);
        td.appendChild(span);
        tr.appendChild(td);
      });
      editor.appendChild(tr);
    });
    scroll.appendChild(editor);
    body.appendChild(scroll);
  }

  function renderInlineEditor(block,body) {
    if(!block.flowText) block.flowText=flowToText(block.flow||[]);
    body.appendChild(inputField('Banque de mots', (block.wordBank||[]).join('; '), value=>{
      block.wordBank=splitValues(value);changed();
    },{placeholder:'mot 1; mot 2; mot 3'}));
    body.appendChild(inputField('Texte à trous — insérer [[ID_question]] à la place d’un champ',block.flowText,value=>{
      block.flowText=value;
      block.flow=parseInlineFlowText(value);
      changed();
    },{multiline:true,placeholder:'Je prépare des [[colis]].\\n\\nPuis je...'}));
    const info=document.createElement('div');
    info.className='question-help';
    info.textContent='Deux retours à la ligne créent la ligne vide validée entre les phrases.';
    body.appendChild(info);
  }

  function renderMultipleTableEditor(block,body) {
    const t=block.tableDefinition||(block.tableDefinition={id:uid('tabledef'),title:'',headers:['Colonne 1','Colonne 2'],questionIds:[]});
    const row=document.createElement('div');
    row.className='field-row cols-3';
    row.append(
      inputField('ID du tableau',t.id||'',value=>{t.id=Core.cleanId(value);changed();}),
      inputField('Titre',t.title||'',value=>{t.title=value;changed();}),
      inputField('En-têtes', (t.headers||[]).join('; '),value=>{t.headers=splitValues(value);changed();})
    );
    body.appendChild(row);
    body.appendChild(inputField('Questions utilisées — IDs séparés par ;',(t.questionIds||[]).join('; '),value=>{
      t.questionIds=splitValues(value);changed();
    },{placeholder:'question_1; question_2'}));
  }

  function renderMediaEditor(block,body) {
    const label=document.createElement('label');
    label.textContent=block.type==='image'?'Fichier image':block.type==='audio'?'Fichier audio':'Fichier vidéo';
    const input=document.createElement('input');
    input.type='file';
    input.accept=block.type==='image'?'image/*':block.type==='audio'?'audio/*':'video/*';
    input.addEventListener('change',async()=>{
      const file=input.files&&input.files[0];
      if(!file)return;
      block.mediaName=file.name;
      block.mediaType=file.type||'';
      block.mediaData=await readFileAsDataUrl(file);
      changed();renderBlocks();
    });
    label.appendChild(input);
    body.appendChild(label);
    body.appendChild(inputField('Texte alternatif',block.mediaAlt||'',value=>{block.mediaAlt=value;changed();}));
    const name=document.createElement('div');
    name.className='file-preview-name';
    name.textContent=block.mediaName?'Embarqué : '+block.mediaName:(block.mediaPlaceholder||'Aucun fichier sélectionné');
    body.appendChild(name);
  }

  function insertQuestionAtCursor(block,index,textarea) {
    const position=typeof textarea.selectionStart==='number'?textarea.selectionStart:String(block.text||'').length;
    const source=String(block.text||'');
    const before=source.slice(0,position);
    const after=source.slice(position);
    block.text=before;

    const questionBlock=baseBlock('question');
    questionBlock.zone=block.zone||'left';
    questionBlock.question.id=nextQuestionId();

    const additions=[questionBlock];
    if(after) {
      const tail=baseBlock('text');
      tail.zone=block.zone||'left';
      tail.text=after;
      additions.push(tail);
    }
    state.sourceDefinition=null;
    state.blocks.splice(index+1,0,...additions);
    changed();
    renderBlocks();

    requestAnimationFrame(()=>{
      const target=document.querySelector('[data-uid="'+questionBlock.uid+'"] textarea');
      target?.focus();
    });
  }

  function renderBlockBody(block,body,index) {
    body.innerHTML='';
    if(block.type==='text') {
      const field=inputField('Texte',block.text,value=>{block.text=value;changed();},{
        multiline:true,
        placeholder:'Texte affiché au candidat',
        title:'Écrivez le contenu librement. Placez le curseur puis utilisez « Insérer une Question au curseur ».'
      });
      body.appendChild(field);
      const textarea=field.querySelector('textarea');
      const insert=document.createElement('button');
      insert.type='button';
      insert.className='mini-btn insert-question-at-cursor';
      insert.textContent='+ Insérer une Question au curseur';
      insert.title='Coupe le texte à la position du curseur et insère ici un bloc Question avec un ID automatique stable.';
      insert.addEventListener('click',()=>insertQuestionAtCursor(block,index,textarea));
      body.appendChild(insert);
      return;
    }
    if(block.type==='html'||block.type==='html-js') {
      body.appendChild(inputField('HTML',block.html,value=>{block.html=value;changed();},{multiline:true,placeholder:'<div>...</div>'}));
      if(block.type==='html-js') body.appendChild(inputField('JavaScript associé',block.js,value=>{block.js=value;changed();},{multiline:true,placeholder:'Code local au bloc'}));
      return;
    }
    if(['image','audio','video'].includes(block.type)) {renderMediaEditor(block,body);return;}
    if(block.type==='question') {renderQuestionEditor(block,body);return;}
    if(block.type==='response-table') {renderResponseTableEditor(block,body);return;}
    if(block.type==='table-grid') {renderGridEditor(block,body);return;}
    if(block.type==='inline-flow') {renderInlineEditor(block,body);return;}
    if(block.type==='multiple-tables') {renderMultipleTableEditor(block,body);}
  }

  function renderBlocks() {
    const host=$('blocks-editor');
    host.innerHTML='';
    const split=$('test-layout').value!=='single';

    state.blocks.forEach((block,index)=>{
      const frag=$('block-template').content.cloneNode(true);
      const article=frag.querySelector('.exercise-block');
      article.dataset.uid=block.uid;
      frag.querySelector('.block-index').textContent=String(index+1);

      const type=frag.querySelector('.block-type');
      type.value=block.type;
      type.addEventListener('change',()=>{
        const replacement=baseBlock(type.value);
        replacement.uid=block.uid;
        replacement.zone=block.zone||'left';
        state.blocks[index]=replacement;
        changed();renderBlocks();
      });

      const zone=frag.querySelector('.block-zone');
      zone.value=block.zone||'left';
      zone.hidden=!split;
      zone.addEventListener('change',()=>{block.zone=zone.value;changed();});

      frag.querySelector('.move-up').disabled=index===0;
      frag.querySelector('.move-up').addEventListener('click',()=>{
        if(index<1)return;
        [state.blocks[index-1],state.blocks[index]]=[state.blocks[index],state.blocks[index-1]];
        changed();renderBlocks();
      });
      frag.querySelector('.move-down').disabled=index===state.blocks.length-1;
      frag.querySelector('.move-down').addEventListener('click',()=>{
        if(index>=state.blocks.length-1)return;
        [state.blocks[index+1],state.blocks[index]]=[state.blocks[index],state.blocks[index+1]];
        changed();renderBlocks();
      });
      frag.querySelector('.remove-block').addEventListener('click',()=>{
        state.blocks.splice(index,1);changed();renderBlocks();
      });

      renderBlockBody(block,frag.querySelector('.block-body'),index);
      host.appendChild(frag);
    });

    refreshPreview();
  }

  function createQuestionPreview(block) {
    const q=block.question||{};
    const wrap=document.createElement('div');
    wrap.className='preview-question';
    const label=document.createElement('label');
    label.textContent=q.prompt||'Question sans texte';
    wrap.appendChild(label);
    if(q.example) {
      const tag=document.createElement('span');
      tag.className='example-tag';
      tag.textContent='Exemple';
      label.appendChild(tag);
    }
    if(['single-choice','select','boolean'].includes(q.responseType)) {
      const select=document.createElement('select');
      const empty=document.createElement('option');empty.textContent='Choisir…';select.appendChild(empty);
      const values=q.responseType==='boolean'?['Vrai','Faux']:splitValues(q.options);
      values.forEach(v=>{const o=document.createElement('option');o.textContent=v;select.appendChild(o);});
      wrap.appendChild(select);
    } else if(q.responseType==='multiple-choice') {
      const choices=document.createElement('div');
      splitValues(q.options).forEach(v=>{const l=document.createElement('label');l.className='inline-checkbox';const cb=document.createElement('input');cb.type='checkbox';l.append(cb,document.createTextNode(' '+v));choices.appendChild(l);});
      wrap.appendChild(choices);
    } else {
      const input=document.createElement('input');
      input.type='text';
      input.placeholder=q.responseType==='duration'?'Ex. 9h15':'Votre réponse';
      wrap.appendChild(input);
    }
    return wrap;
  }

  function applyPreviewColumn(cell,col) {
    if(!cell||!col)return;
    if(Number(col.widthChars)>=3) {
      cell.style.width=Number(col.widthChars)+'ch';
      cell.style.minWidth=Number(col.widthChars)+'ch';
      cell.style.maxWidth=Number(col.widthChars)+'ch';
    }
    if(col.align) cell.style.textAlign=col.align;
  }

  function gridPreview(block) {
    const t=block.table||{};
    const wrap=document.createElement('div');
    wrap.className='preview-grid-wrap';
    if(t.title) {const h=document.createElement('h3');h.textContent=t.title;wrap.appendChild(h);}
    const table=document.createElement('table');
    table.className='preview-grid-table';
    if(Array.isArray(t.headers)&&t.headers.length) {
      const tr=document.createElement('tr');
      t.headers.forEach((h,i)=>{const th=document.createElement('th');th.textContent=h;applyPreviewColumn(th,t.columns?.[i]);tr.appendChild(th);});
      const thead=document.createElement('thead');thead.appendChild(tr);table.appendChild(thead);
    }
    const tbody=document.createElement('tbody');
    (t.cells||[]).forEach(row=>{
      const tr=document.createElement('tr');
      row.forEach((cell,i)=>{
        const td=document.createElement('td');
        applyPreviewColumn(td,t.columns?.[i]);
        if((cell.rowSpan||1)>1) td.rowSpan=cell.rowSpan;
        if((cell.colSpan||1)>1) td.colSpan=cell.colSpan;
        if(cell.kind==='fixed-text'||cell.kind==='choice-option') td.textContent=cell.value||'';
        else if(['candidate-answer','select','unit'].includes(cell.kind)) {
          const input=document.createElement(cell.kind==='select'?'select':'input');
          if(cell.kind!=='select') input.type='text';
          if(cell.kind==='select') {
            const o=document.createElement('option');o.textContent='Choisir…';input.appendChild(o);
            (cell.options||[]).forEach(v=>{const op=document.createElement('option');op.textContent=v;input.appendChild(op);});
          }
          td.appendChild(input);
        } else if(['image','audio','video'].includes(cell.kind)) td.textContent=cell.value||cell.kind;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    return wrap;
  }

  function responseTablePreview(block) {
    const t=ensureResponseColumns(block);
    const wrap=document.createElement('div');
    wrap.className='preview-grid-wrap';
    const table=document.createElement('table');
    table.className='preview-grid-table';
    const tr=document.createElement('tr');
    t.headers.forEach((h,i)=>{const th=document.createElement('th');th.textContent=h;applyPreviewColumn(th,t.columns[i]);tr.appendChild(th);});
    const thead=document.createElement('thead');thead.appendChild(tr);table.appendChild(thead);
    const tbody=document.createElement('tbody');
    const questions=state.blocks.filter(b=>b.type==='question');
    questions.forEach((q,index)=>{
      const row=document.createElement('tr');
      t.headers.forEach((h,i)=>{
        const td=document.createElement('td');applyPreviewColumn(td,t.columns[i]);
        if(i===0) td.textContent=String(index+1);
        else {const input=document.createElement('input');input.type='text';td.appendChild(input);}
        row.appendChild(td);
      });
      tbody.appendChild(row);
    });
    table.appendChild(tbody);wrap.appendChild(table);
    return wrap;
  }

  function inlinePreview(block) {
    const wrap=document.createElement('div');
    wrap.className='preview-inline-flow';
    const bank=document.createElement('div');bank.className='preview-word-bank';
    (block.wordBank||[]).forEach(w=>{const s=document.createElement('span');s.textContent=w;bank.appendChild(s);});
    wrap.appendChild(bank);
    const flow=document.createElement('div');
    (block.flow||[]).forEach(item=>{
      if(item.type==='text') {
        flow.appendChild(document.createTextNode(item.text||''));
        if(item.breakAfterSentence) {flow.appendChild(document.createElement('br'));flow.appendChild(document.createElement('br'));}
      } else if(item.type==='question') {
        const input=document.createElement('input');input.type='text';input.placeholder=item.questionId||'';flow.appendChild(input);
      }
    });
    wrap.appendChild(flow);
    return wrap;
  }

  function blockPreview(block) {
    const wrap=document.createElement('div');
    wrap.className='preview-content-block';
    if(block.type==='text') {wrap.textContent=block.text||'Bloc texte vide';return wrap;}
    if(block.type==='html'||block.type==='html-js') {
      const frame=document.createElement('iframe');
      frame.className='preview-html-frame';frame.sandbox='allow-scripts';
      frame.srcdoc='<!doctype html><html><body style="font-family:Calibri,Arial,sans-serif;margin:10px">'+
        (block.html||'<em>Bloc HTML vide</em>')+
        (block.type==='html-js'&&block.js?'<script>'+block.js.replace(/<\\/script/gi,'<\\\\/script')+'<\\/script>':'')+
        '</body></html>';
      wrap.appendChild(frame);return wrap;
    }
    if(block.type==='image'&&block.mediaData) {const img=document.createElement('img');img.className='preview-media';img.src=block.mediaData;img.alt=block.mediaAlt||block.mediaName||'Image';wrap.appendChild(img);return wrap;}
    if(block.type==='audio'&&block.mediaData) {const a=document.createElement('audio');a.controls=true;a.src=block.mediaData;a.style.width='100%';wrap.appendChild(a);return wrap;}
    if(block.type==='video'&&block.mediaData) {const v=document.createElement('video');v.controls=true;v.src=block.mediaData;v.className='preview-media';wrap.appendChild(v);return wrap;}
    if(['image','audio','video'].includes(block.type)) {wrap.textContent=block.mediaPlaceholder||'Aucun média sélectionné';return wrap;}
    if(block.type==='question') return createQuestionPreview(block);
    if(block.type==='table-grid') return gridPreview(block);
    if(block.type==='response-table') return responseTablePreview(block);
    if(block.type==='inline-flow') return inlinePreview(block);
    if(block.type==='multiple-tables') {
      const h=document.createElement('h3');h.textContent=block.tableDefinition?.title||'Tableau';
      wrap.appendChild(h);
      const p=document.createElement('div');p.textContent=(block.tableDefinition?.headers||[]).join(' | ');wrap.appendChild(p);
      return wrap;
    }
    return wrap;
  }

  function refreshPreview() {
    const m=collectMeta();
    $('preview-title').textContent=m.title||'Nouveau test';
    $('preview-version').textContent='v'+m.version;
    $('preview-scenario').textContent=m.scenario||'Le scénario apparaîtra ici.';
    $('preview-instruction').textContent=m.instruction||'Les consignes apparaîtront ici.';
    $('preview-calculator').hidden=!m.calculatorCompatible;
    $('preview-chrono').hidden=!m.chronoEnabled;

    const host=$('preview-exercise');
    host.className='preview-exercise layout-'+m.layout;
    host.innerHTML='';

    if(m.layout==='single') {
      const zone=document.createElement('div');zone.className='preview-zone';
      state.blocks.forEach(block=>zone.appendChild(blockPreview(block)));
      host.appendChild(zone);
    } else {
      const left=document.createElement('div');left.className='preview-zone';
      const right=document.createElement('div');right.className='preview-zone';
      if(m.layout==='chars-rest') {
        const a=Number(m.block1WidthChars);
        const b=Number(m.block2WidthChars);
        host.style.gridTemplateColumns=(a>=3?a+'ch':'minmax(0,1fr)')+' '+(m.lastBlockRemainder?'minmax(0,1fr)':(b>=3?b+'ch':'minmax(0,1fr)'));
      } else {
        host.style.removeProperty('grid-template-columns');
      }
      state.blocks.forEach(block=>(block.zone==='right'?right:left).appendChild(blockPreview(block)));
      host.append(left,right);
    }
    validate();
  }

  function validate() {
    const m=collectMeta();
    const items=[];
    const add=(ok,text)=>items.push({ok:Boolean(ok),text});
    add(Boolean(m.title),'Titre renseigné');
    add(Boolean(m.id),'Identifiant du test créé');
    add(Boolean(m.scenario),'Scénario renseigné');
    add(Boolean(m.instruction),'Consigne renseignée');
    add(state.blocks.length>0,'Au moins un bloc Exercice');

    if(m.layout==='chars-rest') {
      add(Number(m.block1WidthChars)>=3,'Bloc 1 : largeur en caractères ≥ 3');
      add(m.lastBlockRemainder||Number(m.block2WidthChars)>=3,'Dernier bloc : reste disponible ou largeur ≥ 3');
    }

    let qi=0;
    state.blocks.filter(b=>b.type==='question').forEach(block=>{
      qi++;
      const q=block.question||{};
      add(Boolean(String(q.prompt||'').trim()),'Question '+qi+' : texte renseigné');
      if(m.scored&&!q.example) {
        add((Number(q.points)||0)>0,'Question '+qi+' : points > 0');
        add(splitValues(q.acceptedAnswers).length>0,'Question '+qi+' : réponse attendue renseignée');
      }
    });

    state.blocks.filter(b=>b.type==='table-grid').forEach((block,bi)=>{
      const t=block.table||{};
      add(Number(t.rows)>0&&Number(t.cols)>0,'Grille '+(bi+1)+' : dimensions valides');
      (t.cells||[]).flat().filter(cell=>['candidate-answer','select','unit','choice-option'].includes(cell.kind)).forEach((cell,index)=>{
        add(Boolean(cell.questionId),'Grille '+(bi+1)+' réponse '+(index+1)+' : ID renseigné');
        if(m.scored) add(splitValues(cell.acceptedAnswers).length>0,'Grille '+(bi+1)+' réponse '+(index+1)+' : réponse attendue renseignée');
      });
    });

    state.blocks.filter(b=>['image','audio','video'].includes(b.type)).forEach((b,i)=>{
      add(Boolean(b.mediaData||b.mediaPlaceholder||state.sourceDefinition),'Média '+(i+1)+' embarqué ou emplacement défini');
    });

    const model=currentModel();
    const definition=Core.modelToDefinition(model);
    const analysis=Core.analyzeDefinition(definition);
    add(analysis.ok,'Contrat KALTEST compatible avec SEB EvalPro');
    analysis.errors.forEach(error=>add(false,error));

    const ul=$('validation-list');
    ul.innerHTML='';
    items.forEach(item=>{
      const li=document.createElement('li');
      li.className=item.ok?'ok':'error';
      li.textContent=(item.ok?'OK — ':'À corriger — ')+item.text;
      ul.appendChild(li);
    });
    return items.every(item=>item.ok);
  }

  function applyTemplate(name) {
    if(name==='generic') return;
    if(state.blocks.length&& !confirm('Appliquer ce modèle remplace les blocs actuels. Continuer ?')) {
      $('test-template').value='generic';
      return;
    }

    state.sourceDefinition=null;
    state.blocks=[];

    if(name==='questions-table-visual-60-40') {
      $('test-layout').value='60-40';
      const q=baseBlock('question');q.zone='left';
      const t=baseBlock('response-table');t.zone='left';
      const img=baseBlock('image');img.zone='right';img.mediaPlaceholder='Image verticale';
      state.blocks.push(q,t,img);
    } else if(name==='visual-inline-gaps-40-60') {
      $('test-layout').value='40-60';
      const img=baseBlock('image');img.zone='left';img.mediaPlaceholder='Image verticale';
      const flow=baseBlock('inline-flow');flow.zone='right';
      state.blocks.push(img,flow);
    } else if(name==='work-visual-60-40') {
      $('test-layout').value='60-40';
      const q=baseBlock('question');q.zone='left';
      const t=baseBlock('response-table');t.zone='left';
      t.responseTable.headers=['N°','Réponses','Unités','Opérations effectuées'];
      t.responseTable.columns=[
        {id:'number',widthChars:5,align:'center'},
        {id:'answer',widthChars:14,align:'center'},
        {id:'unit',widthChars:12,align:'center'},
        {id:'operation',align:'left'}
      ];
      const img=baseBlock('image');img.zone='right';img.mediaPlaceholder='Image verticale';
      state.blocks.push(q,t,img);
      $('calculator-compatible').checked=true;
    } else if(name==='two-tables-50-50') {
      $('test-layout').value='50-50';
      const a=baseBlock('multiple-tables');a.zone='left';a.tableDefinition.title='Tableau 1';
      const b=baseBlock('multiple-tables');b.zone='right';b.tableDefinition.title='Tableau 2';
      state.blocks.push(a,b);
    } else if(name==='visual-schedule-40-60') {
      $('test-layout').value='40-60';
      const img=baseBlock('image');img.zone='left';img.mediaPlaceholder='Image verticale';
      const grid=Core.createGridBlock(6,6);grid.zone='right';
      state.blocks.push(img,grid);
      $('calculator-compatible').checked=true;
    } else if(name==='full-width-choice-table') {
      $('test-layout').value='single';
      const grid=Core.createGridBlock(4,6);grid.zone='left';grid.table.mode='single-choice-table';
      state.blocks.push(grid);
    } else if(name==='practical-context-50-50') {
      $('test-layout').value='50-50';
      const img=baseBlock('image');img.zone='left';img.mediaPlaceholder='Image exercice';
      const text=baseBlock('text');text.zone='right';text.text='Commandes de l’exercice pratique';
      state.blocks.push(img,text);
      $('chrono-enabled').checked=true;
    } else if(name==='grid-full-width') {
      $('test-layout').value='single';
      state.blocks.push(Core.createGridBlock(6,6));
    } else if(name==='gratte-ciel-6x6') {
      $('test-layout').value='single';
      const grid=Core.createGridBlock(6,6);
      grid.table.title='Puzzle Gratte-ciel';
      const top=['', '1','2','3','2',''];
      const left=['1','2','2','3'];
      const right=['3','3','1','2'];
      const bottom=['','3','2','1','2',''];
      const answers=[
        ['4','3','1','2'],
        ['2','4','3','1'],
        ['3','1','2','4'],
        ['1','2','4','3']
      ];
      for(let c=0;c<6;c++) {
        grid.table.cells[0][c].kind=top[c]?'fixed-text':'empty';
        grid.table.cells[0][c].value=top[c];
        grid.table.cells[5][c].kind=bottom[c]?'fixed-text':'empty';
        grid.table.cells[5][c].value=bottom[c];
      }
      for(let r=1;r<=4;r++) {
        grid.table.cells[r][0].kind='fixed-text';grid.table.cells[r][0].value=left[r-1];
        grid.table.cells[r][5].kind='fixed-text';grid.table.cells[r][5].value=right[r-1];
        for(let c=1;c<=4;c++) {
          const cell=grid.table.cells[r][c];
          cell.kind='candidate-answer';
          cell.questionId='gratte_ciel_r'+r+'_c'+c;
          cell.acceptedAnswers=answers[r-1][c-1];
          cell.responseType='number';
          cell.points=1;
        }
      }
      state.blocks.push(grid);
    }

    $('custom-sizing-row').hidden=$('test-layout').value!=='chars-rest';
    changed();renderBlocks();
  }

  async function importJsonFile(file) {
    const text=await file.text();
    const definition=JSON.parse(text);
    const analysis=Core.analyzeDefinition(definition);
    if(!analysis.ok) throw new Error(analysis.errors.join('\\n'));

    const model=Core.definitionToModel(definition);
    state.idLocked=true;
    state.sourceDefinition=model.sourceDefinition;
    state.blocks=model.blocks;
    applyMeta(model.meta);
    $('test-template').value=model.meta.template && Array.from($('test-template').options).some(o=>o.value===model.meta.template)
      ? model.meta.template : 'generic';
    saveDraft(false);
    renderBlocks();
    $('draft-status').textContent='Test KALTEST importé sans perte';
    setTimeout(()=>$('draft-status').textContent='Brouillon local',1800);
  }

  function downloadJson() {
    refreshPreview();
    if(!validate()) {
      alert('Le test contient encore des éléments obligatoires à corriger.');
      return;
    }
    state.idLocked=true;
    $('test-id').value=$('test-id').value||normalizeIdFromTitle();
    const data=Core.modelToDefinition(currentModel());
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=data.id+'-'+data.version+'-test.json';
    document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
    saveDraft(false);
  }

  function changed() {
    saveDraft(false);
    refreshPreview();
  }

  function reset() {
    if(!confirm('Effacer le brouillon actuel et créer un nouveau test ?')) return;
    localStorage.removeItem(DRAFT_KEY);
    state.idLocked=false;
    state.sourceDefinition=null;
    state.blocks=[baseBlock('text')];
    applyMeta(defaultMeta());
    renderBlocks();
  }

  function install() {
    const restored=restoreDraft();
    if(!restored||state.blocks.length===0) {
      applyMeta(defaultMeta());
      state.blocks=[baseBlock('text')];
    }

    $('back-tests').addEventListener('click',()=>{ window.location.href='../admin-tests-parcours.html'; });
    $('import-json').addEventListener('click',()=>$('import-json-file').click());
    $('import-json-file').addEventListener('change',async()=>{
      const file=$('import-json-file').files&&$('import-json-file').files[0];
      if(!file)return;
      try {await importJsonFile(file);}
      catch(error){alert('Import refusé : '+(error?.message||String(error)));}
      finally {$('import-json-file').value='';}
    });

    $('make-id').addEventListener('click',()=>{
      if(state.idLocked&&$('test-id').value)return;
      $('test-id').value=normalizeIdFromTitle();
      state.idLocked=Boolean($('test-id').value);
      changed();
    });
    $('test-title').addEventListener('input',()=>{
      if(!state.idLocked)$('test-id').value=normalizeIdFromTitle();
      changed();
    });

    [
      'test-version','test-category','test-scored','test-layout',
      'test-scenario','test-instruction','calculator-compatible','chrono-enabled',
      'admin-intervention','autoevaluation-enabled','external-material',
      'block1-width-chars','block2-width-chars','last-block-remainder'
    ].forEach(id=>{
      $(id).addEventListener('input',()=>{
        if(id==='test-layout') {
          $('custom-sizing-row').hidden=$('test-layout').value!=='chars-rest';
          renderBlocks();
        } else changed();
      });
      $(id).addEventListener('change',()=>{
        if(id==='test-layout') {
          $('custom-sizing-row').hidden=$('test-layout').value!=='chars-rest';
          renderBlocks();
        } else changed();
      });
    });

    $('test-template').addEventListener('change',()=>applyTemplate($('test-template').value));
    $('add-block').addEventListener('click',()=>{
      state.blocks.push(baseBlock('text'));changed();renderBlocks();
    });
    $('refresh-preview').addEventListener('click',refreshPreview);
    $('save-draft').addEventListener('click',()=>saveDraft(true));
    $('download-json').addEventListener('click',downloadJson);
    $('new-test').addEventListener('click',reset);

    renderBlocks();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();