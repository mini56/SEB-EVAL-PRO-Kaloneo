(() => {
  'use strict';

  const DRAFT_KEY = 'kaloneo_test_builder_v1';
  const state = {
    idLocked: false,
    blocks: []
  };

  const $ = (id) => document.getElementById(id);

  function normalizeIdPart(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/_+/g, '_');
  }

  function makeTestId() {
    const title = $('test-title').value.trim();
    if (!title) return '';
    return normalizeIdPart(title);
  }

  function makeQuestionId(index, title) {
    return 'ID' + (index + 1) + '_' + (normalizeIdPart(title) || 'question');
  }

  function uid() {
    return 'b_' + Math.random().toString(36).slice(2, 10);
  }

  function baseBlock(type = 'text') {
    return {
      uid: uid(),
      type,
      zone: 'left',
      text: '',
      html: '',
      js: '',
      mediaName: '',
      mediaType: '',
      mediaData: '',
      question: {
        prompt: '',
        responseType: 'text',
        acceptedAnswers: '',
        units: '',
        points: 1,
        example: false,
        options: ''
      }
    };
  }

  function collectMeta() {
    return {
      title: $('test-title').value.trim(),
      id: $('test-id').value.trim(),
      version: $('test-version').value.trim() || '1.0.0',
      category: $('test-category').value,
      scored: $('test-scored').value === 'true',
      layout: $('test-layout').value,
      scenario: $('test-scenario').value.trim(),
      instruction: $('test-instruction').value.trim(),
      calculatorCompatible: $('calculator-compatible').checked,
      chronoEnabled: $('chrono-enabled').checked,
      adminIntervention: $('admin-intervention').checked,
      autoevaluation: $('autoevaluation-enabled').checked,
      externalMaterial: $('external-material').checked
    };
  }

  function saveDraft(showStatus = true) {
    const draft = {
      idLocked: state.idLocked,
      meta: collectMeta(),
      blocks: state.blocks
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    if (showStatus) {
      $('draft-status').textContent = 'Sauvegardé';
      setTimeout(() => $('draft-status').textContent = 'Brouillon local', 1200);
    }
  }

  function restoreDraft() {
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (!draft) return false;
      const m = draft.meta || {};
      $('test-title').value = m.title || '';
      $('test-id').value = m.id || '';
      $('test-version').value = m.version || '1.0.0';
      $('test-category').value = m.category || 'mathematiques';
      $('test-scored').value = String(m.scored !== false);
      $('test-layout').value = m.layout || 'single';
      $('test-scenario').value = m.scenario || '';
      $('test-instruction').value = m.instruction || '';
      $('calculator-compatible').checked = Boolean(m.calculatorCompatible);
      $('chrono-enabled').checked = Boolean(m.chronoEnabled);
      $('admin-intervention').checked = Boolean(m.adminIntervention);
      $('autoevaluation-enabled').checked = Boolean(m.autoevaluation);
      $('external-material').checked = Boolean(m.externalMaterial);
      state.idLocked = Boolean(draft.idLocked || m.id);
      state.blocks = Array.isArray(draft.blocks) ? draft.blocks : [];
      return true;
    } catch (_) {
      return false;
    }
  }

  function inputField(label, value, onInput, options = {}) {
    const wrap = document.createElement('label');
    wrap.textContent = label;
    const el = options.multiline ? document.createElement('textarea') : document.createElement('input');
    if (!options.multiline) el.type = options.type || 'text';
    el.value = value ?? '';
    if (options.placeholder) el.placeholder = options.placeholder;
    if (options.min != null) el.min = String(options.min);
    el.addEventListener('input', () => onInput(el.value));
    wrap.appendChild(el);
    return wrap;
  }

  function selectField(label, value, values, onChange) {
    const wrap = document.createElement('label');
    wrap.textContent = label;
    const sel = document.createElement('select');
    for (const [v, text] of values) {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = text;
      sel.appendChild(opt);
    }
    sel.value = value;
    sel.addEventListener('change', () => onChange(sel.value));
    wrap.appendChild(sel);
    return wrap;
  }

  async function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function renderBlockBody(block, body) {
    body.innerHTML = '';

    if (block.type === 'text') {
      body.appendChild(inputField('Texte', block.text, value => {
        block.text = value; changed();
      }, { multiline:true, placeholder:'Texte affiché au candidat' }));
      return;
    }

    if (block.type === 'html' || block.type === 'html-js') {
      body.appendChild(inputField('HTML', block.html, value => {
        block.html = value; changed();
      }, { multiline:true, placeholder:'<div>...</div>' }));

      if (block.type === 'html-js') {
        body.appendChild(inputField('JavaScript associé', block.js, value => {
          block.js = value; changed();
        }, { multiline:true, placeholder:'// code exécuté uniquement dans le bloc de prévisualisation isolé' }));
      }
      return;
    }

    if (['image','audio','video'].includes(block.type)) {
      const label = document.createElement('label');
      label.textContent = block.type === 'image' ? 'Fichier image' : block.type === 'audio' ? 'Fichier audio' : 'Fichier vidéo';
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = block.type === 'image' ? 'image/*' : block.type === 'audio' ? 'audio/*' : 'video/*';
      input.addEventListener('change', async () => {
        const file = input.files && input.files[0];
        if (!file) return;
        block.mediaName = file.name;
        block.mediaType = file.type || '';
        block.mediaData = await readFileAsDataUrl(file);
        changed();
        renderBlocks();
      });
      label.appendChild(input);
      body.appendChild(label);

      const name = document.createElement('div');
      name.className = 'file-preview-name';
      name.textContent = block.mediaName ? 'Embarqué : ' + block.mediaName : 'Aucun fichier sélectionné';
      body.appendChild(name);
      return;
    }

    if (block.type === 'question') {
      const q = block.question || (block.question = baseBlock('question').question);
      const row1 = document.createElement('div');
      row1.className = 'field-row';
      row1.append(
        inputField('Question', q.prompt, value => { q.prompt = value; changed(); }),
        selectField('Type de réponse', q.responseType, [
          ['text','Texte'],
          ['number','Nombre'],
          ['number-unit','Nombre + unité'],
          ['single-choice','Choix unique'],
          ['multiple-choice','Choix multiple'],
          ['boolean','Vrai / Faux'],
          ['select','Liste déroulante']
        ], value => { q.responseType = value; changed(); renderBlocks(); })
      );
      body.appendChild(row1);

      const row2 = document.createElement('div');
      row2.className = 'field-row cols-3';
      row2.append(
        inputField('Réponse(s) acceptée(s)', q.acceptedAnswers, value => { q.acceptedAnswers = value; changed(); }, { placeholder:'Séparer par ;' }),
        inputField('Unité(s)', q.units, value => { q.units = value; changed(); }, { placeholder:'Séparer par ;' }),
        inputField('Points', q.example ? 0 : q.points, value => {
          if (!q.example) q.points = Math.max(0, Number(value) || 0);
          changed();
        }, { type:'number', min:0 })
      );
      body.appendChild(row2);

      if (['single-choice','multiple-choice','select'].includes(q.responseType)) {
        body.appendChild(inputField('Choix proposés', q.options, value => {
          q.options = value; changed();
        }, { placeholder:'Choix 1; Choix 2; Choix 3' }));
      }

      const exampleLabel = document.createElement('label');
      exampleLabel.style.flexDirection = 'row';
      exampleLabel.style.alignItems = 'center';
      const example = document.createElement('input');
      example.type = 'checkbox';
      example.checked = Boolean(q.example);
      example.addEventListener('change', () => {
        q.example = example.checked;
        if (q.example) q.points = 0;
        changed();
        renderBlocks();
      });
      exampleLabel.append(example, document.createTextNode(' Question d’exemple — non notée, 0 point'));
      body.appendChild(exampleLabel);

      const help = document.createElement('div');
      help.className = 'question-help';
      help.textContent = 'Utiliser ; pour séparer plusieurs réponses, unités ou choix acceptés.';
      body.appendChild(help);
    }
  }

  function renderBlocks() {
    const host = $('blocks-editor');
    host.innerHTML = '';

    const layout = $('test-layout').value;
    const split = layout !== 'single';

    state.blocks.forEach((block, index) => {
      const frag = $('block-template').content.cloneNode(true);
      const article = frag.querySelector('.exercise-block');
      article.dataset.uid = block.uid;
      frag.querySelector('.block-index').textContent = String(index + 1);

      const type = frag.querySelector('.block-type');
      type.value = block.type;
      type.addEventListener('change', () => {
        block.type = type.value;
        changed();
        renderBlocks();
      });

      const zone = frag.querySelector('.block-zone');
      zone.value = block.zone || 'left';
      zone.hidden = !split;
      zone.addEventListener('change', () => {
        block.zone = zone.value;
        changed();
      });

      frag.querySelector('.move-up').disabled = index === 0;
      frag.querySelector('.move-up').addEventListener('click', () => {
        if (index < 1) return;
        [state.blocks[index - 1], state.blocks[index]] = [state.blocks[index], state.blocks[index - 1]];
        changed(); renderBlocks();
      });

      frag.querySelector('.move-down').disabled = index === state.blocks.length - 1;
      frag.querySelector('.move-down').addEventListener('click', () => {
        if (index >= state.blocks.length - 1) return;
        [state.blocks[index + 1], state.blocks[index]] = [state.blocks[index], state.blocks[index + 1]];
        changed(); renderBlocks();
      });

      frag.querySelector('.remove-block').addEventListener('click', () => {
        state.blocks.splice(index, 1);
        changed(); renderBlocks();
      });

      renderBlockBody(block, frag.querySelector('.block-body'));
      host.appendChild(frag);
    });

    refreshPreview();
  }

  function splitValues(value) {
    return String(value || '')
      .split(';')
      .map(v => v.trim())
      .filter(Boolean);
  }

  function questionModel(block, index) {
    const q = block.question || {};
    return {
      id: makeQuestionId(index, q.prompt),
      prompt: q.prompt || '',
      response: {
        type: q.responseType || 'text',
        options: splitValues(q.options)
      },
      acceptedAnswers: splitValues(q.acceptedAnswers),
      acceptedUnits: splitValues(q.units),
      points: q.example ? 0 : Math.max(0, Number(q.points) || 0),
      example: Boolean(q.example)
    };
  }

  function createQuestionPreview(block, index) {
    const q = questionModel(block, index);
    const wrap = document.createElement('div');
    wrap.className = 'preview-question';

    const label = document.createElement('label');
    label.textContent = q.prompt || 'Question sans texte';
    if (q.example) {
      const tag = document.createElement('span');
      tag.className = 'example-tag';
      tag.textContent = 'Exemple';
      label.appendChild(tag);
    }
    wrap.appendChild(label);

    if (q.response.type === 'boolean') {
      const select = document.createElement('select');
      select.innerHTML = '<option>Choisir…</option><option>Vrai</option><option>Faux</option>';
      wrap.appendChild(select);
    } else if (q.response.type === 'single-choice' || q.response.type === 'select') {
      const select = document.createElement('select');
      const empty = document.createElement('option');
      empty.textContent = 'Choisir…';
      select.appendChild(empty);
      q.response.options.forEach(v => {
        const opt = document.createElement('option');
        opt.textContent = v;
        select.appendChild(opt);
      });
      wrap.appendChild(select);
    } else if (q.response.type === 'multiple-choice') {
      const choices = document.createElement('div');
      q.response.options.forEach(v => {
        const l = document.createElement('label');
        l.style.flexDirection = 'row';
        l.style.alignItems = 'center';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        l.append(cb, document.createTextNode(v));
        choices.appendChild(l);
      });
      wrap.appendChild(choices);
    } else {
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = q.response.type === 'number-unit' ? 'Réponse + unité' : 'Votre réponse';
      wrap.appendChild(input);
    }

    return wrap;
  }

  function blockPreview(block, index) {
    const wrap = document.createElement('div');
    wrap.className = 'preview-content-block';

    if (block.type === 'text') {
      const p = document.createElement('div');
      p.textContent = block.text || 'Bloc texte vide';
      wrap.appendChild(p);
      return wrap;
    }

    if (block.type === 'html' || block.type === 'html-js') {
      const frame = document.createElement('iframe');
      frame.className = 'preview-html-frame';
      frame.sandbox = 'allow-scripts';
      frame.srcdoc = '<!doctype html><html><body style="font-family:Calibri,Arial,sans-serif;margin:10px">' +
        (block.html || '<em>Bloc HTML vide</em>') +
        (block.type === 'html-js' && block.js ? '<script>' + block.js.replace(/<\/script/gi, '<\\/script') + '<\/script>' : '') +
        '</body></html>';
      wrap.appendChild(frame);
      return wrap;
    }

    if (block.type === 'image' && block.mediaData) {
      const img = document.createElement('img');
      img.className = 'preview-media';
      img.src = block.mediaData;
      img.alt = block.mediaName || 'Image';
      wrap.appendChild(img);
      return wrap;
    }

    if (block.type === 'audio' && block.mediaData) {
      const audio = document.createElement('audio');
      audio.controls = true;
      audio.src = block.mediaData;
      audio.style.width = '100%';
      wrap.appendChild(audio);
      return wrap;
    }

    if (block.type === 'video' && block.mediaData) {
      const video = document.createElement('video');
      video.controls = true;
      video.src = block.mediaData;
      video.className = 'preview-media';
      wrap.appendChild(video);
      return wrap;
    }

    if (['image','audio','video'].includes(block.type)) {
      wrap.textContent = 'Aucun média sélectionné';
      return wrap;
    }

    if (block.type === 'question') {
      return createQuestionPreview(block, index);
    }

    return wrap;
  }

  function refreshPreview() {
    const m = collectMeta();
    $('preview-title').textContent = m.title || 'Nouveau test';
    $('preview-version').textContent = 'v' + m.version;
    $('preview-scenario').textContent = m.scenario || 'Le scénario apparaîtra ici.';
    $('preview-instruction').textContent = m.instruction || 'Les consignes apparaîtront ici.';
    $('preview-calculator').hidden = !m.calculatorCompatible;
    $('preview-chrono').hidden = !m.chronoEnabled;

    const host = $('preview-exercise');
    host.className = 'preview-exercise layout-' + m.layout;
    host.innerHTML = '';

    if (m.layout === 'single') {
      const zone = document.createElement('div');
      zone.className = 'preview-zone';
      state.blocks.forEach((block, index) => zone.appendChild(blockPreview(block, index)));
      host.appendChild(zone);
    } else {
      const left = document.createElement('div');
      left.className = 'preview-zone';
      const right = document.createElement('div');
      right.className = 'preview-zone';
      state.blocks.forEach((block, index) => {
        (block.zone === 'right' ? right : left).appendChild(blockPreview(block, index));
      });
      host.append(left, right);
    }

    validate();
  }

  function validate() {
    const m = collectMeta();
    const items = [];

    function add(ok, text) { items.push({ ok, text }); }

    add(Boolean(m.title), 'Titre renseigné');
    add(Boolean(m.id), 'Identifiant du test créé');
    add(Boolean(m.scenario), 'Scénario renseigné');
    add(Boolean(m.instruction), 'Consignes renseignées');
    add(state.blocks.length > 0, 'Au moins un bloc Exercice');

    const questions = state.blocks.filter(b => b.type === 'question');
    questions.forEach((block, i) => {
      const q = block.question || {};
      add(Boolean(String(q.prompt || '').trim()), 'Question ' + (i + 1) + ' : texte renseigné');
      if (m.scored && !q.example) {
        add((Number(q.points) || 0) > 0, 'Question ' + (i + 1) + ' : points > 0');
      }
    });

    state.blocks.filter(b => ['image','audio','video'].includes(b.type)).forEach((b, i) => {
      add(Boolean(b.mediaData), 'Média ' + (i + 1) + ' embarqué dans le test');
    });

    const ul = $('validation-list');
    ul.innerHTML = '';
    for (const item of items) {
      const li = document.createElement('li');
      li.className = item.ok ? 'ok' : 'error';
      li.textContent = (item.ok ? 'OK — ' : 'À corriger — ') + item.text;
      ul.appendChild(li);
    }

    return items.every(item => item.ok);
  }

  function buildKaltest() {
    const m = collectMeta();
    let questionIndex = 0;

    const content = state.blocks.map((block, index) => {
      if (block.type === 'question') {
        const q = questionModel(block, questionIndex++);
        return { type:'question', zone:block.zone || 'left', questionId:q.id };
      }

      if (block.type === 'text') {
        return { type:'text', zone:block.zone || 'left', text:block.text || '' };
      }

      if (block.type === 'html') {
        return { type:'html', zone:block.zone || 'left', html:block.html || '' };
      }

      if (block.type === 'html-js') {
        return { type:'html-js', zone:block.zone || 'left', html:block.html || '', script:block.js || '' };
      }

      if (['image','audio','video'].includes(block.type)) {
        return {
          type:block.type,
          zone:block.zone || 'left',
          resource:{
            name:block.mediaName || '',
            mime:block.mediaType || '',
            data:block.mediaData || ''
          }
        };
      }

      return { type:block.type, zone:block.zone || 'left' };
    });

    questionIndex = 0;
    const questions = state.blocks
      .filter(block => block.type === 'question')
      .map(block => questionModel(block, questionIndex++));

    const features = ['runtime.basic'];
    if (questions.length) features.push('questionnaire.basic');
    if (content.some(x => x.type === 'html')) features.push('content.html');
    if (content.some(x => x.type === 'html-js')) features.push('content.html-js');
    if (content.some(x => x.type === 'image')) features.push('media.image');
    if (content.some(x => x.type === 'audio')) features.push('media.audio');
    if (content.some(x => x.type === 'video')) features.push('media.video');
    if (m.calculatorCompatible) features.push('host.calculator');
    if (m.chronoEnabled) features.push('host.chrono');
    if (m.adminIntervention) features.push('host.admin-intervention');
    if (m.autoevaluation) features.push('host.autoevaluation');
    if (m.externalMaterial) features.push('host.external-material');

    return {
      kaltestFormat: 1,
      minSebEvalPro: '0.3.10',
      builderVersion: 'kaloneo-test-builder-prototype-1',
      id: m.id,
      version: m.version,
      title: m.title,
      category: m.category,
      kind: 'exercise',
      scored: m.scored,
      features,
      scenario: m.scenario,
      instruction: m.instruction,
      calculator: {
        compatible: m.calculatorCompatible,
        defaultEnabled: false
      },
      chrono: {
        enabled: m.chronoEnabled,
        engine: m.chronoEnabled ? 'seb-common' : null
      },
      adminIntervention: m.adminIntervention,
      autoevaluation: m.autoevaluation,
      externalMaterial: m.externalMaterial,
      presentation: {
        layout: m.layout,
        content
      },
      navigation: {
        next: 'host',
        abandon: 'host-common'
      },
      runtime: {
        start: true,
        save: true,
        restore: true,
        finish: true
      },
      questions,
      outputs: [
        { id:'score', type:'number' },
        { id:'score_max', type:'number' },
        { id:'pourcentage', type:'number' },
        { id:'status', type:'string' }
      ]
    };
  }

  function downloadJson() {
    refreshPreview();
    if (!validate()) {
      alert('Le test contient encore des éléments obligatoires à corriger.');
      return;
    }

    state.idLocked = true;
    $('test-id').value = $('test-id').value || makeTestId();
    const data = buildKaltest();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = data.id + '-' + data.version + '-test.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    saveDraft(false);
  }

  function changed() {
    saveDraft(false);
    refreshPreview();
  }

  function reset() {
    if (!confirm('Effacer le brouillon actuel et créer un nouveau test ?')) return;
    localStorage.removeItem(DRAFT_KEY);
    state.idLocked = false;
    state.blocks = [];
    $('test-title').value = '';
    $('test-id').value = '';
    $('test-version').value = '1.0.0';
    $('test-category').value = 'mathematiques';
    $('test-scored').value = 'true';
    $('test-layout').value = 'single';
    $('test-scenario').value = '';
    $('test-instruction').value = '';
    ['calculator-compatible','chrono-enabled','admin-intervention','autoevaluation-enabled','external-material']
      .forEach(id => $(id).checked = false);
    state.blocks.push(baseBlock('text'));
    renderBlocks();
  }

  function install() {
    const restored = restoreDraft();
    if (!restored || state.blocks.length === 0) state.blocks.push(baseBlock('text'));

    $('make-id').addEventListener('click', () => {
      if (state.idLocked && $('test-id').value) return;
      $('test-id').value = makeTestId();
      state.idLocked = Boolean($('test-id').value);
      changed();
    });

    $('test-title').addEventListener('input', () => {
      if (!state.idLocked) $('test-id').value = makeTestId();
      changed();
    });

    [
      'test-version','test-category','test-scored','test-layout',
      'test-scenario','test-instruction',
      'calculator-compatible','chrono-enabled','admin-intervention',
      'autoevaluation-enabled','external-material'
    ].forEach(id => {
      $(id).addEventListener('input', () => {
        if (id === 'test-layout') renderBlocks();
        else changed();
      });
      $(id).addEventListener('change', () => {
        if (id === 'test-layout') renderBlocks();
        else changed();
      });
    });

    $('add-block').addEventListener('click', () => {
      state.blocks.push(baseBlock('text'));
      changed();
      renderBlocks();
    });

    $('refresh-preview').addEventListener('click', refreshPreview);
    $('save-draft').addEventListener('click', () => saveDraft(true));
    $('download-json').addEventListener('click', downloadJson);
    $('new-test').addEventListener('click', reset);

    renderBlocks();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once:true });
  } else {
    install();
  }
})();
