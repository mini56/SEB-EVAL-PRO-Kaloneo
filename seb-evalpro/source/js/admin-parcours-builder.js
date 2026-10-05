(() => {
  'use strict';

  const MIME = 'application/x-kaloneo-parcours-card';
  const state = {
    library: [],
    saved: [],
    introduction: null,
    fin: null,
    tests: [],
    draggingIndex: null,
    pointerDrag: null
  };

  const $ = id => document.getElementById(id);

  function api() {
    return window.sebEvalPro || {};
  }

  function refOf(item) {
    return item ? { id:String(item.id), version:String(item.version) } : null;
  }

  function keyOf(item) {
    return item ? String(item.id) + '@' + String(item.version) : '';
  }

  function setStatus(message, type = '') {
    const target = $('builder-status');
    if (!target) return;
    target.textContent = String(message || '');
    target.classList.toggle('ok', type === 'ok');
    target.classList.toggle('error', type === 'error');
  }

  function categoryLabel(value) {
    const labels = {
      introduction:'Introduction de parcours',
      fin:'Pages de fin',
      mathematiques:'Mathématiques',
      francais:'Français',
      organisation:'Organisation',
      numerique:'Numérique',
      technique:'Technique',
      planification:'Planification',
      transition:'Transition',
      systeme:'Système'
    };
    const raw = String(value || 'Autres');
    return labels[raw] || raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  function libraryItem(id, version) {
    return state.library.find(item => String(item.id) === String(id) && String(item.version) === String(version)) || null;
  }

  function usedTestIds() {
    return new Set(state.tests.map(item => String(item.id)));
  }

  function addLibraryItem(item) {
    if (!item) return;
    if (item.role === 'introduction') {
      state.introduction = item;
    } else if (item.role === 'fin') {
      state.fin = item;
    } else {
      if (state.tests.some(test => test.id === item.id)) return;
      state.tests.push(item);
    }
    render();
  }

  function removeTest(index) {
    if (index < 0 || index >= state.tests.length) return;
    state.tests.splice(index, 1);
    render();
  }

  function moveTest(from, to) {
    if (from < 0 || from >= state.tests.length) return;
    const bounded = Math.max(0, Math.min(to, state.tests.length - 1));
    if (from === bounded) return;
    const [item] = state.tests.splice(from, 1);
    state.tests.splice(bounded, 0, item);
    render();
  }

  function dragPayload(event, payload) {
    if (!event.dataTransfer) return;
    event.dataTransfer.effectAllowed = payload.source === 'sequence' ? 'move' : 'copy';
    event.dataTransfer.setData(MIME, JSON.stringify(payload));
    event.dataTransfer.setData('text/plain', payload.id || '');
  }

  function readDragPayload(event) {
    try {
      const raw = event.dataTransfer && event.dataTransfer.getData(MIME);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function clearPointerDropTargets() {
    document.querySelectorAll('.pointer-drop-target').forEach(node => node.classList.remove('pointer-drop-target'));
  }

  function pointerDropTargetAt(x, y, payload) {
    const node = document.elementFromPoint(x, y);
    if (!node) return null;
    if (payload.source === 'library' && payload.role === 'introduction') {
      return node.closest('#intro-slot');
    }
    if (payload.source === 'library' && payload.role === 'fin') {
      return node.closest('#fin-slot');
    }
    if (payload.role === 'test') {
      return node.closest('.sequence-card') || node.closest('#tests-dropzone') || node.closest('.library-panel');
    }
    return null;
  }

  function applyPointerDrop(payload, target) {
    if (!payload || !target) return false;

    if (payload.source === 'library') {
      const item = libraryItem(payload.id, payload.version);
      if (!item) return false;
      if (payload.role === 'introduction' && target.id === 'intro-slot') {
        state.introduction = item;
        return true;
      }
      if (payload.role === 'fin' && target.id === 'fin-slot') {
        state.fin = item;
        return true;
      }
      if (payload.role === 'test') {
        if (state.tests.some(test => test.id === item.id)) return false;
        const targetCard = target.closest?.('.sequence-card');
        if (targetCard) {
          const index = Math.max(0, Math.min(Number(targetCard.dataset.index) || 0, state.tests.length));
          state.tests.splice(index, 0, item);
        } else if (target.id === 'tests-dropzone' || target.closest?.('#tests-dropzone')) {
          state.tests.push(item);
        } else {
          return false;
        }
        return true;
      }
      return false;
    }

    if (payload.source === 'sequence' && payload.role === 'test') {
      const from = state.tests.findIndex(test => String(test.id) === String(payload.id));
      if (from < 0) return false;

      if (target.classList?.contains('library-panel') || target.closest?.('.library-panel')) {
        state.tests.splice(from, 1);
        return true;
      }

      const targetCard = target.closest?.('.sequence-card');
      if (targetCard) {
        const targetId = String(targetCard.dataset.testId || '');
        const to = state.tests.findIndex(test => String(test.id) === targetId);
        if (to < 0 || to === from) return false;
        const [moved] = state.tests.splice(from, 1);
        const adjusted = from < to ? to - 1 : to;
        state.tests.splice(Math.max(0, adjusted), 0, moved);
        return true;
      }

      if (target.id === 'tests-dropzone' || target.closest?.('#tests-dropzone')) {
        const [moved] = state.tests.splice(from, 1);
        state.tests.push(moved);
        return true;
      }
    }
    return false;
  }

  function armMouseDrag(event, payload, source, label) {
    if (!event || event.button !== 0) return;
    if (event.target?.closest?.('button,input,select,textarea,a')) return;

    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    let active = false;
    let ghost = null;

    const pointTarget = (x, y) => pointerDropTargetAt(x, y, payload);

    const activate = () => {
      if (active) return;
      active = true;
      state.pointerDrag = { payload, source };
      source.classList.add('pointer-dragging');
      ghost = document.createElement('div');
      ghost.className = 'pointer-drag-ghost';
      ghost.textContent = label || payload.id || 'Élément';
      document.body.appendChild(ghost);
    };

    const paint = (x, y) => {
      if (!ghost) return;
      ghost.style.left = Math.min(window.innerWidth - 250, Math.max(8, x + 14)) + 'px';
      ghost.style.top = Math.min(window.innerHeight - 48, Math.max(8, y + 14)) + 'px';
      clearPointerDropTargets();
      const target = pointTarget(x, y);
      if (target) target.classList.add('pointer-drop-target');

      const panel = target?.closest?.('.library-sections,.sequence-scroll,.saved-parcours');
      if (panel) {
        const rect = panel.getBoundingClientRect();
        const edge = 34;
        if (y < rect.top + edge) panel.scrollTop -= 18;
        else if (y > rect.bottom - edge) panel.scrollTop += 18;
      }
    };

    const cleanup = () => {
      clearPointerDropTargets();
      source.classList.remove('pointer-dragging');
      if (ghost) ghost.remove();
      ghost = null;
      state.pointerDrag = null;
      document.removeEventListener('mousemove', move, true);
      document.removeEventListener('mouseup', finish, true);
      window.removeEventListener('blur', cancel, true);
    };

    const move = moveEvent => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      if (!active && Math.hypot(dx, dy) < 5) return;
      activate();
      moveEvent.preventDefault();
      paint(moveEvent.clientX, moveEvent.clientY);
    };

    const finish = endEvent => {
      if (!active) {
        cleanup();
        return;
      }
      endEvent.preventDefault();
      const target = pointTarget(endEvent.clientX, endEvent.clientY);
      const changed = applyPointerDrop(payload, target);
      cleanup();
      if (changed) render();
    };

    const cancel = () => cleanup();

    document.addEventListener('mousemove', move, { capture:true, passive:false });
    document.addEventListener('mouseup', finish, { capture:true, passive:false });
    window.addEventListener('blur', cancel, { capture:true, once:true });
  }

  function renderLibraryCard(item) {
    const template = $('library-card-template');
    const card = template.content.firstElementChild.cloneNode(true);
    card.dataset.id = item.id;
    card.dataset.version = item.version;
    card.dataset.role = item.role;

    card.querySelector('.card-title').textContent = item.title;
    card.querySelector('.card-category').textContent = categoryLabel(item.category);

    const details = ['v' + item.version];
    if (item.role === 'test') {
      details.push(item.scored ? 'noté' : 'non noté');
      if (item.questionCount) details.push(item.questionCount + ' question' + (item.questionCount > 1 ? 's' : ''));
    } else if (item.role === 'introduction') {
      details.push('page d’introduction');
    } else {
      details.push('page de fin');
    }
    card.querySelector('.card-meta').textContent = details.join(' • ');

    card.addEventListener('mousedown', event => {
      armMouseDrag(event, { source:'library', id:item.id, version:item.version, role:item.role }, card, item.title);
    });
    card.addEventListener('dragstart', event => {
      card.classList.add('dragging');
      dragPayload(event, { source:'library', id:item.id, version:item.version, role:item.role });
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
    card.querySelector('.card-add').addEventListener('click', () => addLibraryItem(item));
    return card;
  }

  function renderLibrary() {
    const root = $('library-sections');
    root.replaceChildren();

    const search = String($('library-search').value || '').trim().toLocaleLowerCase('fr-FR');
    const used = usedTestIds();
    const groups = [];

    const introductions = state.library.filter(item =>
      item.role === 'introduction' &&
      (!state.introduction || keyOf(item) !== keyOf(state.introduction))
    );
    if (introductions.length) groups.push(['Introduction de parcours', introductions]);

    const testGroups = new Map();
    for (const item of state.library) {
      if (item.role !== 'test' || used.has(item.id)) continue;
      const haystack = (item.title + ' ' + item.category + ' ' + item.description).toLocaleLowerCase('fr-FR');
      if (search && !haystack.includes(search)) continue;
      const label = categoryLabel(item.category);
      if (!testGroups.has(label)) testGroups.set(label, []);
      testGroups.get(label).push(item);
    }
    for (const [label, items] of [...testGroups.entries()].sort((a,b) => a[0].localeCompare(b[0], 'fr'))) {
      groups.push([label, items]);
    }

    const fins = state.library.filter(item =>
      item.role === 'fin' &&
      (!state.fin || keyOf(item) !== keyOf(state.fin))
    );
    if (fins.length) groups.push(['Pages de fin', fins]);

    if (search) {
      for (const group of groups) {
        group[1] = group[1].filter(item => {
          const haystack = (item.title + ' ' + item.category + ' ' + item.description).toLocaleLowerCase('fr-FR');
          return haystack.includes(search);
        });
      }
    }

    let count = 0;
    for (const [label, items] of groups) {
      if (!items.length) continue;
      count += items.length;
      const section = document.createElement('section');
      section.className = 'library-group';
      const title = document.createElement('h3');
      title.textContent = label;
      const grid = document.createElement('div');
      grid.className = 'library-grid';
      items.forEach(item => grid.appendChild(renderLibraryCard(item)));
      section.append(title, grid);
      root.appendChild(section);
    }

    if (!count) {
      const empty = document.createElement('div');
      empty.className = 'no-results';
      empty.textContent = search ? 'Aucun test disponible pour cette recherche.' : 'Tous les tests disponibles sont déjà dans le parcours.';
      root.appendChild(empty);
    }
  }

  function renderSpecialSlot(id, item, role) {
    const slot = $(id);
    slot.replaceChildren();
    if (!item) {
      const empty = document.createElement('div');
      empty.className = 'no-results';
      empty.textContent = role === 'introduction'
        ? 'Glissez ici une page d’introduction.'
        : 'Glissez ici une page de fin.';
      slot.appendChild(empty);
      return;
    }

    const card = document.createElement('article');
    card.className = 'special-card';
    const text = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = item.title;
    const meta = document.createElement('span');
    meta.textContent = categoryLabel(item.category) + ' • v' + item.version;
    text.append(title, meta);
    const badge = document.createElement('div');
    badge.className = 'role-badge';
    badge.textContent = role === 'introduction' ? 'INTRODUCTION' : 'FIN';
    card.append(text, badge);
    slot.appendChild(card);
  }

  function renderSequence() {
    const dropzone = $('tests-dropzone');
    dropzone.replaceChildren();
    $('empty-tests').hidden = state.tests.length > 0;

    state.tests.forEach((item, index) => {
      const template = $('sequence-card-template');
      const card = template.content.firstElementChild.cloneNode(true);
      card.dataset.index = String(index);
      card.dataset.testId = String(item.id);
      card.querySelector('.sequence-index').textContent = String(index + 2);
      card.querySelector('.sequence-title').textContent = item.title;
      card.querySelector('.sequence-meta').textContent =
        categoryLabel(item.category) + ' • v' + item.version + ' • ' + (item.scored ? 'noté' : 'non noté');

      const up = card.querySelector('.move-up');
      const down = card.querySelector('.move-down');
      up.disabled = index === 0;
      down.disabled = index === state.tests.length - 1;
      up.addEventListener('click', () => moveTest(index, index - 1));
      down.addEventListener('click', () => moveTest(index, index + 1));
      card.querySelector('.remove-test').addEventListener('click', () => removeTest(index));

      card.addEventListener('mousedown', event => {
        armMouseDrag(event, { source:'sequence', role:'test', id:item.id, version:item.version }, card, item.title);
      });
      card.addEventListener('dragstart', event => {
        state.draggingIndex = index;
        card.classList.add('dragging');
        dragPayload(event, { source:'sequence', role:'test', index, id:item.id, version:item.version });
      });
      card.addEventListener('dragend', () => {
        state.draggingIndex = null;
        card.classList.remove('dragging');
      });
      card.addEventListener('dragover', event => {
        const payload = readDragPayload(event);
        if (!payload || payload.role !== 'test') return;
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = payload.source === 'sequence' ? 'move' : 'copy';
      });
      card.addEventListener('drop', event => {
        const payload = readDragPayload(event);
        if (!payload || payload.role !== 'test') return;
        event.preventDefault();
        if (payload.source === 'sequence') {
          const from = Number(payload.index);
          const [moved] = state.tests.splice(from, 1);
          const to = Math.max(0, Math.min(index, state.tests.length));
          state.tests.splice(to, 0, moved);
        } else {
          const itemToAdd = libraryItem(payload.id, payload.version);
          if (itemToAdd && !state.tests.some(test => test.id === itemToAdd.id)) state.tests.splice(index, 0, itemToAdd);
        }
        render();
      });

      dropzone.appendChild(card);
    });

    renderSpecialSlot('intro-slot', state.introduction, 'introduction');
    renderSpecialSlot('fin-slot', state.fin, 'fin');
  }

  function renderSaved() {
    const root = $('saved-parcours');
    root.replaceChildren();
    if (!state.saved.length) {
      const empty = document.createElement('div');
      empty.className = 'no-results';
      empty.textContent = 'Aucun parcours enregistré.';
      root.appendChild(empty);
      return;
    }
    for (const item of state.saved) {
      const card = document.createElement('article');
      card.className = 'saved-card' + (item.systemProvided ? ' system' : '');
      const title = document.createElement('strong');
      title.textContent = item.name;
      const creator = document.createElement('span');
      creator.textContent = 'Créateur : ' + (item.creator || '—');
      const meta = document.createElement('span');
      meta.textContent = item.testCount + ' test' + (item.testCount > 1 ? 's' : '') + (item.systemProvided ? ' • modèle fourni' : '');
      card.append(title, creator, meta);
      root.appendChild(card);
    }
  }

  function render() {
    renderLibrary();
    renderSequence();
    renderSaved();
  }

  function installSpecialDrop(slotId, role) {
    const slot = $(slotId);
    slot.addEventListener('dragover', event => {
      const payload = readDragPayload(event);
      if (!payload || payload.source !== 'library' || payload.role !== role) return;
      event.preventDefault();
      slot.classList.add('dragover');
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    });
    slot.addEventListener('dragleave', () => slot.classList.remove('dragover'));
    slot.addEventListener('drop', event => {
      slot.classList.remove('dragover');
      const payload = readDragPayload(event);
      if (!payload || payload.source !== 'library' || payload.role !== role) return;
      event.preventDefault();
      const item = libraryItem(payload.id, payload.version);
      if (item) addLibraryItem(item);
    });
  }

  function installTestsDropzone() {
    const dropzone = $('tests-dropzone');
    dropzone.addEventListener('dragover', event => {
      const payload = readDragPayload(event);
      if (!payload || payload.role !== 'test') return;
      event.preventDefault();
      dropzone.classList.add('dragover');
      if (event.dataTransfer) event.dataTransfer.dropEffect = payload.source === 'sequence' ? 'move' : 'copy';
    });
    dropzone.addEventListener('dragleave', event => {
      if (!dropzone.contains(event.relatedTarget)) dropzone.classList.remove('dragover');
    });
    dropzone.addEventListener('drop', event => {
      dropzone.classList.remove('dragover');
      const payload = readDragPayload(event);
      if (!payload || payload.role !== 'test') return;
      event.preventDefault();

      if (payload.source === 'sequence') {
        const from = Number(payload.index);
        if (Number.isInteger(from) && from >= 0 && from < state.tests.length) {
          const [moved] = state.tests.splice(from, 1);
          state.tests.push(moved);
        }
      } else {
        const item = libraryItem(payload.id, payload.version);
        if (item && !state.tests.some(test => test.id === item.id)) state.tests.push(item);
      }
      render();
    });
  }

  async function refreshSaved() {
    const result = await api().kaloneoListParcours?.();
    if (!result || result.ok === false) {
      throw new Error(result && result.error ? result.error : 'Lecture des parcours impossible.');
    }
    state.saved = Array.isArray(result.parcours) ? result.parcours : [];
  }

  async function initialize() {
    try {
      const result = await api().kaloneoListTests?.();
      if (!result || result.ok === false) {
        throw new Error(result && result.error ? result.error : 'Lecture de la bibliothèque impossible.');
      }
      state.library = Array.isArray(result.tests) ? result.tests : [];
      state.introduction = state.library.find(item => item.role === 'introduction') || null;
      state.fin = state.library.find(item => item.role === 'fin') || null;
      await refreshSaved();
      render();
      setStatus('Bibliothèque chargée : ' + state.library.filter(item => item.role === 'test').length + ' tests disponibles.');
    } catch (error) {
      setStatus(error && error.message ? error.message : String(error), 'error');
    }
  }

  async function saveParcours() {
    const button = $('save-parcours');
    if (button.disabled) return;

    const name = String($('parcours-name').value || '').trim();
    const creator = String($('parcours-creator').value || '').trim();
    if (!name) return setStatus('Le nom du parcours est obligatoire.', 'error');
    if (!creator) return setStatus('Le nom du créateur est obligatoire.', 'error');
    if (!state.introduction) return setStatus('Une page d’introduction est obligatoire.', 'error');
    if (!state.fin) return setStatus('Une page de fin est obligatoire.', 'error');

    button.disabled = true;
    setStatus('Enregistrement du parcours…');
    try {
      const result = await api().kaloneoSaveParcours?.({
        name,
        creator,
        introduction:refOf(state.introduction),
        tests:state.tests.map(refOf),
        fin:refOf(state.fin)
      });
      if (!result || result.ok === false) {
        throw new Error(result && result.error ? result.error : 'Enregistrement impossible.');
      }
      await refreshSaved();
      renderSaved();
      setStatus('Parcours « ' + name + ' » enregistré.', 'ok');
    } catch (error) {
      setStatus(error && error.message ? error.message : String(error), 'error');
    } finally {
      button.disabled = false;
    }
  }

  function ready() {
    $('back-tests-parcours').addEventListener('click', () => { window.location.href = 'admin-tests-parcours.html'; });
    $('cancel-parcours').addEventListener('click', () => { window.location.href = 'admin-tests-parcours.html'; });
    $('save-parcours').addEventListener('click', saveParcours);
    $('library-search').addEventListener('input', renderLibrary);
    installSpecialDrop('intro-slot', 'introduction');
    installSpecialDrop('fin-slot', 'fin');
    installTestsDropzone();
    const libraryPanel=document.querySelector('.library-panel');
    libraryPanel?.addEventListener('dragover', event => {
      const payload=readDragPayload(event);
      if(payload?.source==='sequence'&&payload.role==='test') event.preventDefault();
    });
    libraryPanel?.addEventListener('drop', event => {
      const payload=readDragPayload(event);
      if(payload?.source!=='sequence'||payload.role!=='test') return;
      event.preventDefault();
      const index=state.tests.findIndex(test=>String(test.id)===String(payload.id));
      if(index>=0){state.tests.splice(index,1);render();}
    });
    initialize();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once:true });
  else ready();
})();
