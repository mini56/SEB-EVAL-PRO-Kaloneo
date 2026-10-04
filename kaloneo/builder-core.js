(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  if(root) root.KaloneoBuilderCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const VERSION='2.0.0';
  const SUPPORTED_FEATURES=new Set([
    'runtime.basic','questionnaire.basic','questionnaire.table','questionnaire.duration-fr',
    'questionnaire.supplemental-fields','questionnaire.inline-gaps','questionnaire.single-choice-table',
    'questionnaire.grid','layout.single','layout.split','calculator.host','host.calculator','host.chrono',
    'host.admin-intervention','host.autoevaluation','host.external-material','media.image','media.audio',
    'media.video','content.html','content.html-js','bilan.bindings'
  ]);
  const RESPONSE_TYPES=new Set([
    'text','number','number-unit','duration','single-choice','multiple-choice','boolean','select'
  ]);
  const LAYOUTS=new Set(['single','50-50','40-60','60-40','chars-rest']);

  function clone(value){ return JSON.parse(JSON.stringify(value==null?null:value)); }
  function cleanId(value){
    return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').replace(/_+/g,'_');
  }
  function splitValues(value){
    if(Array.isArray(value)) return value.map(v=>String(v)).filter(Boolean);
    return String(value||'').split(';').map(v=>v.trim()).filter(Boolean);
  }
  function layoutFromDefinition(def){
    const ratio=def?.presentation?.kaloneoLayout?.ratio||def?.presentation?.layout?.ratio;
    if(ratio==='50/50') return '50-50';
    if(ratio==='40/60') return '40-60';
    if(ratio==='60/40') return '60-40';
    return 'single';
  }
  function questionToBlock(q,zone='left'){
    return {
      uid:'q_'+String(q.id||cleanId(q.prompt)||Math.random().toString(36).slice(2)),
      type:'question',
      zone,
      question:{
        id:String(q.id||''),
        prompt:String(q.prompt||''),
        responseType:String(q.response?.type||'text'),
        normalizer:q.response?.normalizer||'',
        acceptedAnswers:(q.acceptedAnswers||[]).join('; '),
        units:(q.acceptedUnits||q.units||[]).join('; '),
        points:Number(q.points==null?1:q.points),
        example:Boolean(q.example),
        options:(q.response?.options||[]).join('; '),
        unitInput:q.unitInput===true,
        unitScored:q.unitScored===true,
        supplementalFields:clone(q.supplementalFields||[])
      }
    };
  }
  function makeGridCell(kind='empty',value=''){
    return {kind,value,questionId:'',acceptedAnswers:'',responseType:'text',points:1,rowSpan:1,colSpan:1};
  }
  function createGridBlock(rows=6,cols=6){
    rows=Math.max(1,Number(rows)||1); cols=Math.max(1,Number(cols)||1);
    return {
      uid:'grid_'+Math.random().toString(36).slice(2,10),
      type:'table-grid',
      zone:'left',
      table:{
        title:'',
        rows,
        cols,
        columns:Array.from({length:cols},(_,i)=>({id:'c'+(i+1),widthChars:'',align:'center',remainder:i===cols-1})),
        cells:Array.from({length:rows},()=>Array.from({length:cols},()=>makeGridCell()))
      }
    };
  }
  function cellFromSchedule(cell){
    if(typeof cell==='string') return makeGridCell(cell?'fixed-text':'empty',cell);
    if(cell&&cell.questionId){
      const out=makeGridCell('candidate-answer','');
      out.questionId=cell.questionId;
      return out;
    }
    return makeGridCell();
  }
  function scheduleToGrid(def){
    const t=def.presentation.table;
    const rows=(t.rows||[]).map(row=>(row.cells||[]).map(cellFromSchedule));
    const cols=Math.max((t.headers||[]).length,...rows.map(r=>r.length),1);
    while(rows.length===0) rows.push(Array.from({length:cols},()=>makeGridCell()));
    rows.forEach(r=>{while(r.length<cols)r.push(makeGridCell());});
    return {
      uid:'grid_schedule',
      type:'table-grid',
      zone:def.presentation?.kaloneoLayout?.type==='visual-schedule'?'right':'left',
      table:{
        title:'',
        headers:clone(t.headers||[]),
        rows:rows.length,
        cols,
        columns:Array.from({length:cols},(_,i)=>({id:'c'+(i+1),widthChars:'',align:i===0?'left':'center',remainder:i===cols-1})),
        cells:rows
      }
    };
  }
  function inlineToBlock(def){
    return {
      uid:'inline_flow',
      type:'inline-flow',
      zone:def.presentation?.kaloneoLayout?.type==='visual-inline-gaps'?'right':'left',
      wordBank:clone(def.presentation?.wordBank||[]),
      flow:clone(def.presentation?.inlineFlow||[])
    };
  }
  function choiceToGrid(def){
    const questions=def.questions||[];
    const headers=def.presentation?.choiceTable?.columns||['Mot','Proposition 1'];
    const cols=headers.length;
    const cells=questions.map(q=>{
      const row=[makeGridCell('fixed-text',String(q.prompt||'').replace(/^.*?«\s*([^»]+)\s*».*$/,'$1'))];
      const opts=q.response?.options||[];
      for(let i=1;i<cols;i++){
        const cell=makeGridCell('choice-option',String(opts[i-1]||''));
        cell.questionId=q.id;
        cell.acceptedAnswers=(q.acceptedAnswers||[]).join('; ');
        cell.responseType='single-choice';
        cell.points=Number(q.points==null?1:q.points);
        row.push(cell);
      }
      return row;
    });
    return {
      uid:'grid_choice',
      type:'table-grid',
      zone:'left',
      table:{
        title:'',
        headers:clone(headers),
        rows:cells.length||1,
        cols,
        columns:Array.from({length:cols},(_,i)=>({id:'c'+(i+1),widthChars:'',align:i===0?'left':'center',remainder:i===cols-1})),
        cells:cells.length?cells:[Array.from({length:cols},()=>makeGridCell())],
        mode:'single-choice-table'
      }
    };
  }
  function tablesToBlocks(def){
    return (def.presentation?.tables||[]).map((table,index)=>({
      uid:'multi_table_'+index,
      type:'multiple-tables',
      zone:index===0?'left':'right',
      tableDefinition:clone(table)
    }));
  }
  function responseTableBlock(def){
    return {
      uid:'response_table',
      type:'response-table',
      zone:'left',
      responseTable:clone(def.presentation?.responseTable||{
        headers:['Question N°','Réponse','Unités'],
        columns:[]
      })
    };
  }
  function visualBlock(def){
    const k=def.presentation?.kaloneoLayout;
    if(!k) return null;
    const side=k.left?.type==='image'?'left':k.right?.type==='image'?'right':null;
    const visual=side==='left'?k.left:k.right;
    if(!side||!visual) return null;
    return {
      uid:'visual',
      type:'image',
      zone:side,
      mediaName:visual.src||'',
      mediaType:'image/*',
      mediaData:visual.src||'',
      mediaAlt:visual.alt||'',
      mediaPlaceholder:visual.placeholder||'Image'
    };
  }

  function definitionToModel(definition){
    const def=clone(definition);
    const blocks=[];
    const visual=visualBlock(def);
    if(visual) blocks.push(visual);

    if(Array.isArray(def.presentation?.inlineFlow)){
      blocks.push(inlineToBlock(def));
    } else if(def.presentation?.choiceTable){
      blocks.push(choiceToGrid(def));
    } else if(def.presentation?.table?.rows){
      blocks.push(scheduleToGrid(def));
      const averageIds=new Set(def.presentation?.averages||[]);
      (def.questions||[]).filter(q=>averageIds.has(q.id)).forEach(q=>blocks.push(questionToBlock(q,'right')));
    } else if(Array.isArray(def.presentation?.tables)){
      blocks.push(...tablesToBlocks(def));
    } else {
      (def.questions||[]).forEach(q=>blocks.push(questionToBlock(q,'left')));
      if(def.presentation?.responseTable) blocks.push(responseTableBlock(def));
    }

    return {
      idLocked:Boolean(def.id),
      sourceDefinition:def,
      meta:{
        title:def.title||'',
        id:def.id||'',
        version:def.version||'1.0.0',
        category:def.category||'mathematiques',
        scored:def.scored!==false,
        layout:layoutFromDefinition(def),
        scenario:def.scenario||'',
        instruction:def.instruction||'',
        calculatorCompatible:def.calculator?.compatible===true,
        calculatorDefaultEnabled:def.calculator?.defaultEnabled===true,
        chronoEnabled:def.chrono?.enabled===true||def.features?.includes('host.chrono'),
        adminIntervention:Boolean(def.adminIntervention)||def.features?.includes('host.admin-intervention'),
        autoevaluation:Boolean(def.autoevaluation)||def.features?.includes('host.autoevaluation'),
        externalMaterial:Boolean(def.externalMaterial)||def.features?.includes('host.external-material'),
        template:def.presentation?.kaloneoLayout?.type||(
          def.presentation?.choiceTable?'full-width-choice-table':
          def.presentation?.tables?'two-tables-50-50':
          def.presentation?.table?'schedule-table':
          def.presentation?.inlineFlow?'inline-flow':
          'generic'
        ),
        block1WidthChars:'',
        block2WidthChars:'',
        lastBlockRemainder:true
      },
      blocks
    };
  }

  function blockQuestion(block,index){
    const q=block.question||{};
    const id=String(q.id||('ID'+(index+1)+'_'+cleanId(q.prompt||'question')));
    const response={type:q.responseType||'text'};
    const options=splitValues(q.options);
    if(options.length) response.options=options;
    if(q.normalizer) response.normalizer=q.normalizer;
    const out={
      id,
      prompt:q.prompt||'',
      response,
      acceptedAnswers:splitValues(q.acceptedAnswers),
      points:q.example?0:Math.max(0,Number(q.points)||0),
      example:Boolean(q.example)
    };
    const units=splitValues(q.units);
    if(units.length) out.acceptedUnits=units;
    if(q.unitInput===true) out.unitInput=true;
    if(q.unitScored===true) out.unitScored=true;
    if(Array.isArray(q.supplementalFields)&&q.supplementalFields.length) out.supplementalFields=clone(q.supplementalFields);
    return out;
  }

  function gridQuestions(block,startIndex){
    const out=[];
    const seen=new Set();
    const table=block.table||{};
    for(const row of table.cells||[]){
      for(const cell of row||[]){
        if(!cell||!['candidate-answer','select','choice-option','unit'].includes(cell.kind)) continue;
        const id=String(cell.questionId||('ID'+(startIndex+out.length+1)+'_grille'));
        if(seen.has(id)) continue;
        seen.add(id);
        const response={type:cell.responseType||((cell.kind==='select'||cell.kind==='choice-option')?'single-choice':'text')};
        if(Array.isArray(cell.options)&&cell.options.length) response.options=clone(cell.options);
        out.push({
          id,
          prompt:cell.prompt||('Réponse '+id),
          response,
          acceptedAnswers:splitValues(cell.acceptedAnswers),
          points:Math.max(0,Number(cell.points)||0)
        });
      }
    }
    return out;
  }

  function updateImportedQuestions(def,model){
    const byId=new Map((def.questions||[]).map(q=>[q.id,q]));
    let index=0;
    for(const block of model.blocks||[]){
      if(block.type==='question'){
        const built=blockQuestion(block,index++);
        const target=byId.get(built.id);
        if(target) Object.assign(target,built);
      }
      if(block.type==='table-grid'){
        for(const q of gridQuestions(block,index)){
          index++;
          const target=byId.get(q.id);
          if(target) Object.assign(target,q);
        }
      }
    }
  }

  function genericPresentation(model){
    const m=model.meta||{};
    const content=(model.blocks||[]).map((block,index)=>{
      if(block.type==='question'){
        const q=blockQuestion(block,index);
        return {type:'question',zone:block.zone||'left',questionId:q.id};
      }
      if(block.type==='text') return {type:'text',zone:block.zone||'left',text:block.text||''};
      if(block.type==='html') return {type:'html',zone:block.zone||'left',html:block.html||''};
      if(block.type==='html-js') return {type:'html-js',zone:block.zone||'left',html:block.html||'',script:block.js||''};
      if(['image','audio','video'].includes(block.type)) return {
        type:block.type,zone:block.zone||'left',
        resource:{name:block.mediaName||'',mime:block.mediaType||'',data:block.mediaData||'',alt:block.mediaAlt||''}
      };
      if(block.type==='response-table') return {type:'response-table',zone:block.zone||'left',definition:clone(block.responseTable||{})};
      if(block.type==='inline-flow') return {type:'inline-flow',zone:block.zone||'left',wordBank:clone(block.wordBank||[]),flow:clone(block.flow||[])};
      if(block.type==='multiple-tables') return {type:'table-definition',zone:block.zone||'left',definition:clone(block.tableDefinition||{})};
      if(block.type==='table-grid') return {type:'table-grid',zone:block.zone||'left',table:clone(block.table||{})};
      return {type:block.type,zone:block.zone||'left'};
    });
    return {
      layout:m.layout||'single',
      blockSizing:m.layout==='chars-rest'?{
        mode:'characters-and-remainder',
        blocks:[
          {widthChars:Number(m.block1WidthChars)||null},
          {widthChars:Number(m.block2WidthChars)||null,remainder:Boolean(m.lastBlockRemainder)}
        ]
      }:undefined,
      builderContent:content
    };
  }

  function modelToDefinition(model){
    const m=model.meta||{};
    if(model.sourceDefinition){
      const def=clone(model.sourceDefinition);
      def.title=m.title||def.title;
      def.id=m.id||def.id;
      def.version=m.version||def.version;
      def.category=m.category||def.category;
      def.scored=m.scored!==false;
      def.scenario=m.scenario||'';
      def.instruction=m.instruction||'';
      def.calculator=Object.assign({},def.calculator||{},{
        compatible:Boolean(m.calculatorCompatible),
        defaultEnabled:Boolean(m.calculatorCompatible&&m.calculatorDefaultEnabled)
      });
      if(m.chronoEnabled||def.chrono) def.chrono={enabled:Boolean(m.chronoEnabled),engine:m.chronoEnabled?'seb-common':null};
      if(m.adminIntervention||Object.prototype.hasOwnProperty.call(def,'adminIntervention')) def.adminIntervention=Boolean(m.adminIntervention);
      if(m.autoevaluation||Object.prototype.hasOwnProperty.call(def,'autoevaluation')) def.autoevaluation=Boolean(m.autoevaluation);
      if(m.externalMaterial||Object.prototype.hasOwnProperty.call(def,'externalMaterial')) def.externalMaterial=Boolean(m.externalMaterial);
      updateImportedQuestions(def,model);
      return def;
    }

    const questions=[];
    let index=0;
    for(const block of model.blocks||[]){
      if(block.type==='question') questions.push(blockQuestion(block,index++));
      if(block.type==='table-grid'){
        const qs=gridQuestions(block,index);
        questions.push(...qs);
        index+=qs.length;
      }
    }
    const features=['runtime.basic'];
    if(questions.length) features.push('questionnaire.basic');
    if((model.blocks||[]).some(b=>['table-grid','response-table','multiple-tables'].includes(b.type))) features.push('questionnaire.table');
    if((model.blocks||[]).some(b=>b.type==='table-grid')) features.push('questionnaire.grid');
    if((model.blocks||[]).some(b=>b.type==='inline-flow')) features.push('questionnaire.inline-gaps');
    if((model.blocks||[]).some(b=>b.type==='html')) features.push('content.html');
    if((model.blocks||[]).some(b=>b.type==='html-js')) features.push('content.html-js');
    for(const type of ['image','audio','video']) if((model.blocks||[]).some(b=>b.type===type)) features.push('media.'+type);
    if(m.calculatorCompatible) features.push('host.calculator');
    if(m.chronoEnabled) features.push('host.chrono');
    if(m.adminIntervention) features.push('host.admin-intervention');
    if(m.autoevaluation) features.push('host.autoevaluation');
    if(m.externalMaterial) features.push('host.external-material');
    if(m.layout==='single') features.push('layout.single'); else features.push('layout.split');

    return {
      kaltestFormat:1,
      minSebEvalPro:'0.3.10',
      builderVersion:'kaloneo-test-builder-2.0.0',
      id:m.id||cleanId(m.title),
      version:m.version||'1.0.0',
      title:m.title||'',
      category:m.category||'',
      kind:'exercise',
      scored:m.scored!==false,
      features:[...new Set(features)],
      scenario:m.scenario||'',
      instruction:m.instruction||'',
      calculator:{compatible:Boolean(m.calculatorCompatible),defaultEnabled:Boolean(m.calculatorCompatible&&m.calculatorDefaultEnabled)},
      chrono:{enabled:Boolean(m.chronoEnabled),engine:m.chronoEnabled?'seb-common':null},
      adminIntervention:Boolean(m.adminIntervention),
      autoevaluation:Boolean(m.autoevaluation),
      externalMaterial:Boolean(m.externalMaterial),
      presentation:genericPresentation(model),
      navigation:{next:'host',abandon:'host-common'},
      runtime:{start:true,save:true,restore:true,finish:true},
      questions,
      outputs:[
        {id:'score',type:'number'},{id:'score_max',type:'number'},{id:'pourcentage',type:'number'},{id:'status',type:'string'}
      ]
    };
  }

  function analyzeDefinition(def){
    const errors=[];
    if(Number(def?.kaltestFormat)!==1) errors.push('kaltestFormat non supporté');
    for(const feature of def?.features||[]){
      if(!SUPPORTED_FEATURES.has(feature)) errors.push('fonction non supportée: '+feature);
    }
    for(const q of def?.questions||[]){
      const type=q?.response?.type||'text';
      if(!RESPONSE_TYPES.has(type)) errors.push('type de réponse non supporté: '+type);
    }
    const ratio=def?.presentation?.kaloneoLayout?.ratio||def?.presentation?.layout?.ratio;
    if(ratio&&!['50/50','40/60','60/40','100/100'].includes(ratio)) errors.push('ratio non supporté: '+ratio);
    const ktype=def?.presentation?.kaloneoLayout?.type;
    if(ktype&&![
      'questions-table-visual','visual-inline-gaps','work-visual','visual-schedule',
      'full-width-choice-table','visual-choice-table'
    ].includes(ktype)) errors.push('gabarit KALONÉO non supporté: '+ktype);
    const columns=def?.presentation?.responseTable?.columns||[];
    columns.forEach((col,index)=>{
      if(col.widthChars!=null&&Number(col.widthChars)<3) errors.push('colonne '+(index+1)+': widthChars < 3');
      if(col.align&&!['left','center'].includes(col.align)) errors.push('colonne '+(index+1)+': alignement non supporté');
    });
    return {ok:errors.length===0,errors};
  }

  function canRoundTrip(def){
    const analysis=analyzeDefinition(def);
    if(!analysis.ok) return analysis;
    const model=definitionToModel(def);
    const rebuilt=modelToDefinition(model);
    const stable=JSON.stringify(rebuilt)===JSON.stringify(def);
    return {ok:stable,errors:stable?[]:['aller-retour Builder non fidèle'],model,rebuilt};
  }

  return Object.freeze({
    VERSION,SUPPORTED_FEATURES:[...SUPPORTED_FEATURES],RESPONSE_TYPES:[...RESPONSE_TYPES],LAYOUTS:[...LAYOUTS],
    clone,cleanId,splitValues,createGridBlock,definitionToModel,modelToDefinition,analyzeDefinition,canRoundTrip
  });
});
