(function () {
  'use strict';

  const DATA = window.sebKaltestPilot2Data;
  const STATE_KEY = 'seb_kaltest_pilot2_state_v1';

  if (!DATA || !Array.isArray(DATA.tests) || !DATA.tests.length) {
    throw new Error('Données KALTEST du PILOTE 2 absentes.');
  }

  const testById = new Map(DATA.tests.map(test => [test.id, test]));

  function emptyTestState() {
    return {
      answers: {},
      units: {},
      supplemental: {},
      result: null,
      status: 'PENDING',
      abandon: null
    };
  }

  function emptyState() {
    const tests = {};
    for (const test of DATA.tests) tests[test.id] = emptyTestState();
    return {
      phase: 'identification',
      testIndex: 0,
      personId: null,
      evaluationId: null,
      identity: {},
      tests,
      replay: []
    };
  }

  function readState() {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(STATE_KEY) || 'null');
      if (!parsed || typeof parsed !== 'object') return emptyState();
      const merged = Object.assign(emptyState(), parsed);
      merged.tests = Object.assign({}, emptyState().tests, parsed.tests || {});
      for (const test of DATA.tests) {
        merged.tests[test.id] = Object.assign(emptyTestState(), merged.tests[test.id] || {});
      }
      return merged;
    } catch (_) {
      return emptyState();
    }
  }

  let state = readState();

  function persist() {
    sessionStorage.setItem(STATE_KEY, JSON.stringify(state));
    try { window.sebEvalPro?.save?.(); } catch (_) {}
  }

  function replay(type, detail) {
    state.replay.push({
      type,
      phase: state.phase,
      testIndex: state.testIndex,
      testId: currentTest()?.id || null,
      detail: detail || null,
      at: Date.now()
    });
    persist();
  }

  function currentTest() {
    return DATA.tests[state.testIndex] || null;
  }

  function currentTestState() {
    const test = currentTest();
    return test ? state.tests[test.id] : null;
  }

  function showPhase(phase, record = true) {
    state.phase = phase;
    document.querySelectorAll('.pilot2-page').forEach(page => {
      page.classList.toggle('visible', page.id === 'page-' + phase);
    });

    if (phase === 'exercise') {
      const test = currentTest();
      if (test) {
        document.body.dataset.sebKaltestExercise = '1';
        document.body.dataset.sebKaltestId = test.id;
        document.body.dataset.sebKaltestLabel = test.title;
      }
    } else {
      delete document.body.dataset.sebKaltestExercise;
      delete document.body.dataset.sebKaltestId;
      delete document.body.dataset.sebKaltestLabel;
      const calc = document.getElementById('calc-container');
      if (calc) calc.style.display = 'none';
    }

    persist();
    if (record) replay('PAGE_VIEW', { phase });
  }

  function normalizeText(value) {
    return String(value == null ? '' : value)
      .replace(/\u00A0/g, ' ')
      .replace(/[’‘]/g, "'")
      .trim()
      .replace(/\s+/g, ' ')
      .toLocaleLowerCase('fr-FR');
  }

  function normalizeNumber(value) {
    const raw = String(value == null ? '' : value)
      .replace(/\u00A0/g, ' ')
      .replace(/\s+/g, '')
      .replace(',', '.');
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw)) return null;
    const number = Number(raw);
    return Number.isFinite(number) ? number : null;
  }

  function normalizeDurationText(value) {
    let text = normalizeText(value);
    if (!text) return '';
    try { text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (_) {}
    return text
      .replace(/heures?/g, 'h')
      .replace(/heurs?/g, 'h')
      .replace(/hrs?/g, 'h')
      .replace(/minutes?/g, 'm')
      .replace(/mins?/g, 'm')
      .replace(/mn/g, 'm')
      .replace(/\bet\b/g, ' ')
      .replace(/[.;]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function parseDurationFr(value) {
    const text = normalizeDurationText(value);
    if (!text) return null;

    let match = text.match(/^(\d+)\s*m$/);
    if (match) return Number(match[1]);

    match = text.match(/^(\d+)\s*h$/);
    if (match) return Number(match[1]) * 60;

    match = text.match(/^(\d+)\s*(?:h|:)\s*(\d{1,2})\s*m?$/);
    if (!match) match = text.match(/^(\d+)\s+(\d{1,2})$/);
    if (!match) return null;

    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (!Number.isSafeInteger(hours) || hours < 0) return null;
    if (!Number.isSafeInteger(minutes) || minutes < 0 || minutes > 59) return null;
    return hours * 60 + minutes;
  }

  function evaluateQuestion(question, value) {
    const type = question?.response?.type || 'text';

    if (type === 'duration') {
      const actual = parseDurationFr(value);
      return actual !== null && actual === Number(question.acceptedMinutes);
    }

    if (type === 'number') {
      const actual = normalizeNumber(value);
      return actual !== null && (question.acceptedAnswers || []).some(answer => {
        const expected = normalizeNumber(answer);
        return expected !== null && Math.abs(actual - expected) < 1e-9;
      });
    }

    if (type === 'multiple-choice') {
      const actual = Array.isArray(value) ? value.map(normalizeText).sort() : [];
      return (question.acceptedAnswers || []).some(answer => {
        const expected = Array.isArray(answer) ? answer.map(normalizeText).sort() : [];
        return JSON.stringify(actual) === JSON.stringify(expected);
      });
    }

    const actual = normalizeText(value);
    return (question.acceptedAnswers || []).some(answer => actual === normalizeText(answer));
  }

  function evaluateTest(test, testState) {
    let score = 0;
    let scoreMax = 0;
    const details = {};

    for (const question of test.questions || []) {
      const points = Number(question.points) || 0;
      const value = testState.answers[question.id];
      const correct = evaluateQuestion(question, value);
      if (question.example !== true && test.scored !== false) {
        scoreMax += points;
        if (correct) score += points;
      }
      details[question.id] = {
        value: value ?? '',
        correct,
        points
      };
    }

    return {
      score,
      scoreMax,
      percentage: scoreMax > 0 ? (score / scoreMax) * 100 : 0,
      details
    };
  }

  function testStateFor(test) {
    if (!state.tests[test.id]) state.tests[test.id] = emptyTestState();
    return state.tests[test.id];
  }

  function questionById(test, id) {
    return (test.questions || []).find(question => question.id === id) || null;
  }

  function hasActivity(test, testState) {
    if (Object.values(testState.answers || {}).some(value => {
      if (Array.isArray(value)) return value.length > 0;
      return String(value == null ? '' : value).trim() !== '';
    })) return true;

    if (Object.values(testState.units || {}).some(value => String(value || '').trim() !== '')) return true;

    return Object.values(testState.supplemental || {}).some(fields =>
      fields && Object.values(fields).some(value => String(value || '').trim() !== '')
    );
  }

  function saveAnswer(test, questionId, value) {
    const testState = testStateFor(test);
    testState.answers[questionId] = value;
    testState.status = 'ACTIVE';
    replay('ANSWER_CHANGED', { questionId });
  }

  function saveUnit(test, questionId, value) {
    const testState = testStateFor(test);
    testState.units[questionId] = value;
    testState.status = 'ACTIVE';
    replay('UNIT_CHANGED', { questionId });
  }

  function saveSupplemental(test, questionId, fieldId, value) {
    const testState = testStateFor(test);
    if (!testState.supplemental[questionId]) testState.supplemental[questionId] = {};
    testState.supplemental[questionId][fieldId] = value;
    testState.status = 'ACTIVE';
    replay('SUPPLEMENTAL_CHANGED', { questionId, fieldId });
  }

  function makeInput(test, question, options = {}) {
    const testState = testStateFor(test);
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'step';
    input.dataset.questionId = question.id;
    input.value = String(testState.answers[question.id] ?? '');
    if (question.response?.type === 'number') input.inputMode = 'decimal';
    if (question.response?.type === 'duration') input.placeholder = options.compact ? 'ex. 1h15' : '';
    input.addEventListener('input', () => saveAnswer(test, question.id, input.value));
    return input;
  }

  function makeUnitInput(test, question) {
    const testState = testStateFor(test);
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'step';
    input.value = String(testState.units[question.id] ?? '');
    input.disabled = question.unitInput === false;
    input.addEventListener('input', () => saveUnit(test, question.id, input.value));
    return input;
  }

  function makeSupplementalInput(test, question, field) {
    const testState = testStateFor(test);
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'step';
    input.value = String(testState.supplemental?.[question.id]?.[field.id] ?? '');
    input.addEventListener('input', () => saveSupplemental(test, question.id, field.id, input.value));
    return input;
  }

  function renderQuestionList(test) {
    const list = document.createElement('ol');
    list.className = 'kaltest-question-list';
    for (const question of test.questions || []) {
      const li = document.createElement('li');
      li.textContent = question.prompt;
      list.appendChild(li);
    }
    return list;
  }

  function renderBasicResponseTable(test) {
    const wrapper = document.createElement('div');
    wrapper.className = 'kaltest-table-wrap';

    const table = document.createElement('table');
    table.className = 'kaltest-table';

    const headers = test.presentation?.responseTable?.headers || ['Question N°', 'Réponse', 'Unités'];
    const thead = document.createElement('thead');
    const trh = document.createElement('tr');
    headers.forEach(label => {
      const th = document.createElement('th');
      th.textContent = label;
      trh.appendChild(th);
    });
    thead.appendChild(trh);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    (test.questions || []).forEach((question, index) => {
      const tr = document.createElement('tr');
      const number = document.createElement('td');
      number.className = 'kaltest-row-label';
      number.textContent = 'Question N°' + (index + 1);
      tr.appendChild(number);

      const answer = document.createElement('td');
      answer.appendChild(makeInput(test, question));
      tr.appendChild(answer);

      const unit = document.createElement('td');
      unit.appendChild(makeUnitInput(test, question));
      tr.appendChild(unit);

      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrapper.appendChild(table);
    return wrapper;
  }

  function renderBasic(test, host) {
    const layout = document.createElement('div');
    layout.className = 'kaltest-simple-layout';
    layout.appendChild(renderQuestionList(test));
    layout.appendChild(renderBasicResponseTable(test));
    host.appendChild(layout);
  }

  function renderSchedule(test, host) {
    const wrap = document.createElement('div');
    wrap.className = 'kaltest-table-wrap';

    const table = document.createElement('table');
    table.className = 'kaltest-table';

    const thead = document.createElement('thead');
    const head = document.createElement('tr');
    (test.presentation?.table?.headers || []).forEach(label => {
      const th = document.createElement('th');
      th.textContent = label;
      head.appendChild(th);
    });
    thead.appendChild(head);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (const row of test.presentation?.table?.rows || []) {
      const tr = document.createElement('tr');
      for (const cell of row.cells || []) {
        const td = document.createElement('td');
        if (typeof cell === 'string') {
          td.textContent = cell;
          if (cell && (cell === 'Lundi' || cell === 'Mardi' || cell === 'Mercredi' || cell === 'Jeudi' || cell === 'Vendredi' || cell === 'Total')) {
            td.className = 'kaltest-row-label';
          }
        } else if (cell && cell.questionId) {
          const question = questionById(test, cell.questionId);
          if (question) td.appendChild(makeInput(test, question, { compact:true }));
        }
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    wrap.appendChild(table);

    const averages = document.createElement('div');
    averages.className = 'kaltest-averages';
    for (const id of test.presentation?.averages || []) {
      const question = questionById(test, id);
      if (!question) continue;
      const row = document.createElement('div');
      row.className = 'kaltest-average-row';
      const label = document.createElement('span');
      label.textContent = question.prompt;
      row.append(label, makeInput(test, question, { compact:true }));
      averages.appendChild(row);
    }

    const layout = document.createElement('div');
    layout.className = 'kaltest-split-layout kaltest-split-60';
    layout.append(wrap, averages);
    host.appendChild(layout);
  }

  function renderInlineGaps(test, host) {
    const wrapper = document.createElement('div');

    const bank = document.createElement('div');
    bank.className = 'kaltest-word-bank';
    for (const word of test.presentation?.wordBank || []) {
      const span = document.createElement('span');
      span.textContent = word;
      bank.appendChild(span);
    }
    wrapper.appendChild(bank);

    const flow = document.createElement('div');
    flow.className = 'kaltest-inline-flow';
    for (const item of test.presentation?.inlineFlow || []) {
      if (item.type === 'text') {
        flow.appendChild(document.createTextNode(item.text || ''));
      } else if (item.type === 'question') {
        const question = questionById(test, item.questionId);
        if (question) flow.appendChild(makeInput(test, question, { compact:true }));
      }
    }
    wrapper.appendChild(flow);
    host.appendChild(wrapper);
  }

  function renderConversions(test, host) {
    const layout = document.createElement('div');
    layout.className = 'kaltest-split-layout kaltest-split-50';

    layout.appendChild(renderQuestionList(test));

    const wrapper = document.createElement('div');
    wrapper.className = 'kaltest-table-wrap';
    const table = document.createElement('table');
    table.className = 'kaltest-table';

    const thead = document.createElement('thead');
    const head = document.createElement('tr');
    (test.presentation?.responseTable?.headers || ['N°','Réponses','Unités','Opérations effectuées']).forEach(label => {
      const th = document.createElement('th');
      th.textContent = label;
      head.appendChild(th);
    });
    thead.appendChild(head);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    (test.questions || []).forEach((question, index) => {
      const tr = document.createElement('tr');

      const number = document.createElement('td');
      number.className = 'kaltest-row-label';
      number.textContent = String(index + 1);
      tr.appendChild(number);

      const answer = document.createElement('td');
      answer.appendChild(makeInput(test, question, { compact:true }));
      tr.appendChild(answer);

      const unit = document.createElement('td');
      unit.appendChild(makeUnitInput(test, question));
      tr.appendChild(unit);

      const operation = document.createElement('td');
      const field = question.supplementalFields?.[0];
      if (field) operation.appendChild(makeSupplementalInput(test, question, field));
      tr.appendChild(operation);

      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrapper.appendChild(table);
    layout.appendChild(wrapper);
    host.appendChild(layout);
  }

  function renderGenreNombre(test, host) {
    const layout = document.createElement('div');
    layout.className = 'kaltest-two-tables';

    for (const definition of test.presentation?.tables || []) {
      const card = document.createElement('div');
      card.className = 'kaltest-table-card';

      const title = document.createElement('h3');
      title.textContent = definition.title || '';
      card.appendChild(title);

      for (const id of definition.questionIds || []) {
        const question = questionById(test, id);
        if (!question) continue;
        const row = document.createElement('div');
        row.className = 'kaltest-compact-question-row';
        const label = document.createElement('span');
        label.textContent = question.prompt;
        row.append(label, makeInput(test, question, { compact:true }));
        card.appendChild(row);
      }

      layout.appendChild(card);
    }

    host.appendChild(layout);
  }

  function renderChoiceTable(test, host) {
    const table = document.createElement('table');
    table.className = 'kaltest-table kaltest-choice-table';

    const thead = document.createElement('thead');
    const head = document.createElement('tr');
    (test.presentation?.choiceTable?.columns || []).forEach(label => {
      const th = document.createElement('th');
      th.textContent = label;
      head.appendChild(th);
    });
    thead.appendChild(head);
    table.appendChild(thead);

    const testState = testStateFor(test);
    const tbody = document.createElement('tbody');

    for (const question of test.questions || []) {
      const tr = document.createElement('tr');
      const word = document.createElement('td');
      word.className = 'kaltest-row-label';
      word.textContent = question.prompt;
      tr.appendChild(word);

      for (const option of question.response?.options || []) {
        const td = document.createElement('td');
        td.className = 'kaltest-choice';
        td.textContent = option;
        if (normalizeText(testState.answers[question.id]) === normalizeText(option)) td.classList.add('selected');
        td.addEventListener('click', () => {
          Array.from(tr.querySelectorAll('.kaltest-choice')).forEach(cell => cell.classList.remove('selected'));
          td.classList.add('selected');
          saveAnswer(test, question.id, option);
        });
        tr.appendChild(td);
      }

      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    host.appendChild(table);
  }

  function renderCurrentTest() {
    const test = currentTest();
    if (!test) {
      showPhase('final');
      return;
    }

    document.body.dataset.sebKaltestExercise = '1';
    document.body.dataset.sebKaltestId = test.id;
    document.body.dataset.sebKaltestLabel = test.title;

    document.getElementById('kaltest-title').textContent = test.title || 'Exercice';
    document.getElementById('kaltest-progress').textContent =
      'Exercice ' + (state.testIndex + 1) + ' / ' + DATA.tests.length;
    document.getElementById('kaltest-scenario').textContent = test.scenario || '';
    document.getElementById('kaltest-instruction').textContent = test.instruction || '';

    const calculator = document.getElementById('kaltest-calculator');
    calculator.hidden = !test.calculator?.compatible;

    const next = document.getElementById('kaltest-next');
    next.textContent = state.testIndex === DATA.tests.length - 1 ? 'Terminer le parcours' : 'Suivant';

    const status = document.getElementById('exercise-status');
    status.textContent = '';

    const host = document.getElementById('kaltest-content');
    host.innerHTML = '';

    if (Array.isArray(test.presentation?.inlineFlow)) {
      renderInlineGaps(test, host);
    } else if (test.presentation?.choiceTable) {
      renderChoiceTable(test, host);
    } else if (test.presentation?.table?.rows) {
      renderSchedule(test, host);
    } else if ((test.questions || []).some(question => Array.isArray(question.supplementalFields))) {
      renderConversions(test, host);
    } else if (Array.isArray(test.presentation?.tables)) {
      renderGenreNombre(test, host);
    } else {
      renderBasic(test, host);
    }
  }

  function validateIdentity() {
    const values = {
      nom: document.getElementById('nom').value.trim(),
      prenom: document.getElementById('prenom').value.trim(),
      naissance: document.getElementById('naissance').value,
      ss7: document.getElementById('ss7').value.trim(),
      lieu: document.getElementById('lieu').value.trim(),
      groupe: document.getElementById('groupe').value.trim(),
      dateEvaluation: document.getElementById('dateEvaluation').value,
      parcours: DATA.parcours?.title || 'Parcours KALTEST'
    };

    const required = ['nom','prenom','naissance','ss7','lieu','groupe','dateEvaluation'];
    if (required.some(key => !values[key])) {
      return { ok:false, message:'Veuillez remplir tous les champs avant de commencer.' };
    }
    if (!/^\d{7}$/.test(values.ss7)) {
      return { ok:false, message:'Les 7 premiers chiffres du n° de sécurité sociale doivent contenir exactement 7 chiffres.' };
    }
    return { ok:true, values };
  }

  function renderIdentity() {
    document.getElementById('parcours').value = DATA.parcours?.title || 'Parcours KALTEST';
    for (const [key, value] of Object.entries(state.identity || {})) {
      const input = document.getElementById(key);
      if (input && key !== 'parcours') input.value = value || '';
    }
    if (!document.getElementById('dateEvaluation').value) {
      document.getElementById('dateEvaluation').value = new Date().toISOString().slice(0,10);
    }
  }

  function finishCurrentTest() {
    const test = currentTest();
    const testState = currentTestState();
    const status = document.getElementById('exercise-status');
    if (!test || !testState) return;

    if (!hasActivity(test, testState)) {
      status.textContent = 'Vous devez réaliser l’exercice avant de continuer. Si vous souhaitez l’arrêter, utilisez « Abandonner l’exercice ».';
      return;
    }

    testState.result = evaluateTest(test, testState);
    testState.status = 'COMPLETED';
    testState.abandon = null;
    replay('EXERCISE_COMPLETED', {
      testId:test.id,
      version:test.version,
      score:testState.result.score,
      scoreMax:testState.result.scoreMax
    });

    advance();
  }

  function advance() {
    if (state.testIndex + 1 >= DATA.tests.length) {
      state.phase = 'final';
      persist();
      showPhase('final');
      return;
    }

    state.testIndex += 1;
    state.phase = 'exercise';
    persist();
    renderCurrentTest();
    showPhase('exercise');
  }

  function onAbandon(record) {
    const test = currentTest();
    const testState = currentTestState();
    if (!test || !testState) return;

    testState.result = evaluateTest(test, testState);
    testState.status = record?.nonEvaluated ? 'ABANDONED_NE' : 'ABANDONED_EVALUATED';
    testState.abandon = record || null;

    replay('EXERCISE_ABANDONED', {
      testId:test.id,
      nonEvaluated:Boolean(record?.nonEvaluated),
      score:testState.result.score,
      scoreMax:testState.result.scoreMax
    });

    advance();
  }

  function installKeyboardNavigation() {
    document.addEventListener('keydown', event => {
      const target = event.target;
      if (!target || !target.classList?.contains('step')) return;
      const fields = Array.from(document.querySelectorAll('.pilot2-page.visible .step:not(:disabled)'));
      const index = fields.indexOf(target);
      if (index < 0) return;

      let nextIndex = null;
      if (event.key === 'Enter' || event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = index + 1;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = index - 1;
      if (nextIndex === null) return;

      const next = fields[nextIndex];
      if (!next) return;
      event.preventDefault();
      next.focus();
    });
  }

  function install() {
    renderIdentity();

    document.getElementById('ss7').addEventListener('input', event => {
      event.target.value = event.target.value.replace(/\D/g, '').slice(0,7);
    });

    document.getElementById('identity-next').addEventListener('click', () => {
      const validation = validateIdentity();
      const status = document.getElementById('identity-status');
      if (!validation.ok) {
        status.textContent = validation.message;
        return;
      }

      status.textContent = '';
      state.identity = validation.values;
      state.personId = state.personId || crypto.randomUUID();
      state.evaluationId = state.evaluationId || crypto.randomUUID();
      sessionStorage.setItem('candidat_data', JSON.stringify(validation.values));
      replay('IDENTITY_VALIDATED', {
        fields:['nom','prenom','naissance','ss7','lieu','groupe','dateEvaluation','parcours']
      });
      showPhase('intro');
    });

    document.getElementById('intro-next').addEventListener('click', () => {
      state.testIndex = Math.max(0, Math.min(state.testIndex, DATA.tests.length - 1));
      state.phase = 'exercise';
      renderCurrentTest();
      showPhase('exercise');
    });

    document.getElementById('kaltest-next').addEventListener('click', finishCurrentTest);

    installKeyboardNavigation();

    if (state.phase === 'exercise') renderCurrentTest();
    showPhase(state.phase || 'identification', false);

    replay('PILOT2_READY', {
      tests:DATA.tests.map(test => test.id),
      parcours:DATA.parcours?.id || ''
    });
  }

  window.sebKaltestHost = Object.freeze({
    onAbandon
  });

  window.sebKaltestPilot2 = Object.freeze({
    get state() { return JSON.parse(JSON.stringify(state)); },
    get data() { return JSON.parse(JSON.stringify(DATA)); },
    currentTest,
    evaluateTest,
    parseDurationFr,
    renderCurrentTest,
    finishCurrentTest,
    onAbandon,
    reset() {
      sessionStorage.removeItem(STATE_KEY);
      state = emptyState();
      renderIdentity();
      showPhase('identification', false);
      persist();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once:true });
  } else {
    install();
  }
})();
