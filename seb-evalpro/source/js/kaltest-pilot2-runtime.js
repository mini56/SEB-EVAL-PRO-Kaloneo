(function () {
  'use strict';

  const DATA = window.sebKaltestPilot2Data;
  const PARAMS = new URLSearchParams(window.location.search);
  const FULL_PARCOURS_MODE = PARAMS.get('fullParcours') === '1';
  const REQUESTED_SEGMENT = String(PARAMS.get('segment') || '').trim();

  if (!DATA || !Array.isArray(DATA.tests) || !DATA.tests.length) {
    throw new Error('Données KALTEST du PILOTE 2 absentes.');
  }

  const testById = new Map(DATA.tests.map(test => [test.id, test]));
  const SEGMENTS = Object.freeze({
    initial:Object.freeze({
      stepId:'kaltest-initial',
      startPhase:'identification',
      ids:Object.freeze([
        'calculs_commandes_atelier',
        'calculs_poids_volumes',
        'horaires_reception_controle',
        'texte_a_trous_stage_logistique'
      ])
    }),
    fractions:Object.freeze({
      stepId:'qcm-4',
      startPhase:'exercise',
      ids:Object.freeze(['fractions_preparation_lots'])
    }),
    organisation:Object.freeze({
      stepId:'qcm-5',
      startPhase:'exercise',
      ids:Object.freeze(['organisation_demenagement'])
    }),
    postures:Object.freeze({
      stepId:'qcm-5_1',
      startPhase:'exercise',
      ids:Object.freeze(['gestes_postures'])
    }),
    conversions:Object.freeze({
      stepId:'qcm-6',
      startPhase:'exercise',
      ids:Object.freeze(['conversions_atelier_expedition'])
    }),
    autoeval1:Object.freeze({
      stepId:'autoeval1',
      startPhase:'exercise',
      ids:Object.freeze(['autoevaluation_savoirs'])
    }),
    stock:Object.freeze({
      stepId:'stock',
      startPhase:'exercise',
      ids:Object.freeze(['ranger_stock'])
    }),
    planning:Object.freeze({
      stepId:'planning',
      startPhase:'exercise',
      ids:Object.freeze(['planning_cantine'])
    }),
    'genre-nombre':Object.freeze({
      stepId:'genrenombres',
      startPhase:'exercise',
      ids:Object.freeze(['genre_nombre'])
    }),
    mail:Object.freeze({
      stepId:'nvmail',
      startPhase:'exercise',
      ids:Object.freeze(['redaction_email'])
    }),
    autoeval2:Object.freeze({
      stepId:'autoeval2',
      startPhase:'exercise',
      ids:Object.freeze(['autoevaluation_tic'])
    }),
    paronymes:Object.freeze({
      stepId:'paronymes',
      startPhase:'exercise',
      ids:Object.freeze(['paronymes_rapport'])
    }),
    carre:Object.freeze({
      stepId:'carre',
      startPhase:'exercise',
      ids:Object.freeze(['gratte_ciel'])
    })
  });

  const SEGMENT_KEY = REQUESTED_SEGMENT || (FULL_PARCOURS_MODE ? 'initial' : 'all');
  if (SEGMENT_KEY !== 'all' && !SEGMENTS[SEGMENT_KEY]) {
    throw new Error('Segment KALTEST PILOTE 11 inconnu : ' + SEGMENT_KEY);
  }

  const SEGMENT = SEGMENT_KEY === 'all' ? null : SEGMENTS[SEGMENT_KEY];
  const ACTIVE_TESTS = SEGMENT
    ? SEGMENT.ids.map(id => {
        const test = testById.get(id);
        if (!test) throw new Error('Test KALTEST absent du segment ' + SEGMENT_KEY + ' : ' + id);
        return test;
      })
    : DATA.tests.slice();
  const PILOT11_MODE = Boolean(SEGMENT);
  const DEFAULT_PHASE = SEGMENT?.startPhase || 'identification';
  const STATE_KEY = 'seb_kaltest_pilot2_state_v1' +
    ((SEGMENT_KEY === 'all' || SEGMENT_KEY === 'initial') ? '' : ':' + SEGMENT_KEY);

  if (PILOT11_MODE) {
    try { sessionStorage.setItem('seb_kaltest_full_parcours', '1'); } catch (_) {}
  }

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
    for (const test of ACTIVE_TESTS) tests[test.id] = emptyTestState();
    return {
      phase: DEFAULT_PHASE,
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
      for (const test of ACTIVE_TESTS) {
        merged.tests[test.id] = Object.assign(emptyTestState(), merged.tests[test.id] || {});
      }
      merged.testIndex = Math.max(0, Math.min(Number(merged.testIndex) || 0, ACTIVE_TESTS.length - 1));
      if (DEFAULT_PHASE === 'exercise' && !['exercise','handoff'].includes(merged.phase)) {
        merged.phase = 'exercise';
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
    return ACTIVE_TESTS[state.testIndex] || null;
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

    if (type === 'number' || type === 'number-unit') {
      const actual = normalizeNumber(value);
      return actual !== null && (question.acceptedAnswers || []).some(answer => {
        const expected = normalizeNumber(answer);
        return expected !== null && Math.abs(actual - expected) < 1e-9;
      });
    }

    if (type === 'multiple-choice') {
      const actual = Array.isArray(value) ? value.map(normalizeText).sort() : [];
      if (Number.isInteger(Number(question.acceptedCount))) {
        return actual.length === Number(question.acceptedCount);
      }
      return (question.acceptedAnswers || []).some(answer => {
        const expected = Array.isArray(answer) ? answer.map(normalizeText).sort() : [];
        return JSON.stringify(actual) === JSON.stringify(expected);
      });
    }

    const actual = normalizeText(value);
    return (question.acceptedAnswers || []).some(answer => actual === normalizeText(answer));
  }

  function evaluateTest(test, testState) {
    let scoreMax = 0;
    const details = {};

    for (const question of test.questions || []) {
      const points = Number(question.points) || 0;
      const value = testState.answers[question.id];
      const correct = evaluateQuestion(question, value);
      if (question.example !== true && test.scored !== false) scoreMax += points;
      details[question.id] = { value:value ?? '', correct, points };
    }

    for (const group of test.evaluation?.uniqueGroups || []) {
      const allowed = new Set((group.allowedValues || []).map(normalizeText));
      const seen = new Set();
      for (const questionId of group.questionIds || []) {
        const detail = details[questionId];
        if (!detail) continue;
        const value = normalizeText(testState.answers?.[questionId]);
        const correct = allowed.has(value) && !seen.has(value);
        detail.correct = correct;
        if (correct) seen.add(value);
      }
    }

    if (test.evaluation?.mailRules === true) {
      const normalizeIdentity = value => String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('fr-FR')
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      let candidate = {};
      try { candidate = JSON.parse(sessionStorage.getItem('candidat_data') || '{}') || {}; } catch (_) {}
      const prenom = normalizeIdentity(candidate.prenom || candidate['prénom'] || '');
      const nom = normalizeIdentity(candidate.nom || '');
      const message = String(testState.answers?.mail_signature ?? testState.answers?.mail_phone ?? '');
      const messageNorm = normalizeIdentity(message);
      const subjectNorm = normalizeIdentity(testState.answers?.mail_subject);
      const prenomNom = (prenom + ' ' + nom).trim();
      const nomPrenom = (nom + ' ' + prenom).trim();

      if (details.mail_to) details.mail_to.correct =
        String(testState.answers?.mail_to || '').trim() === 'conseil.perso@sauvegarde56.org';
      if (details.mail_cc) details.mail_cc.correct =
        String(testState.answers?.mail_cc || '').trim() === 'stage-pro@sauvegarde56.org';
      if (details.mail_subject) details.mail_subject.correct =
        Boolean(prenom) && subjectNorm === (prenom + ' mail seb').trim();
      if (details.mail_file) details.mail_file.correct =
        String(testState.answers?.mail_file || '') === 'Rapport_stage.docx';
      if (details.mail_signature) details.mail_signature.correct =
        Boolean(prenom && nom && messageNorm) && (messageNorm.includes(prenomNom) || messageNorm.includes(nomPrenom));
      if (details.mail_phone) details.mail_phone.correct =
        /(^|[^\d])0\d(?:[\s.,\/-]?\d{2}){4}(?!\d)/.test(message);
    }

    let score = 0;
    if (test.scored !== false) {
      for (const question of test.questions || []) {
        if (question.example === true) continue;
        if (details[question.id]?.correct) score += Number(question.points) || 0;
      }
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
    const type = question.response?.type || 'text';

    if (type === 'single-choice' || type === 'select' || type === 'boolean') {
      const select = document.createElement('select');
      select.className = 'step';
      select.dataset.questionId = question.id;
      const empty = document.createElement('option');
      empty.value = '';
      empty.textContent = 'Choisir…';
      select.appendChild(empty);
      const values = type === 'boolean' ? ['Vrai','Faux'] : (question.response?.options || []);
      for (const value of values) {
        const option = document.createElement('option');
        option.value = String(value);
        option.textContent = String(value);
        select.appendChild(option);
      }
      select.value = String(testState.answers[question.id] ?? '');
      select.addEventListener('change', () => saveAnswer(test, question.id, select.value));
      return select;
    }

    if (type === 'multiple-choice') {
      const group = document.createElement('div');
      group.className = 'kaltest-multiple-choice';
      const selected = new Set(Array.isArray(testState.answers[question.id]) ? testState.answers[question.id] : []);
      for (const value of question.response?.options || []) {
        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = String(value);
        checkbox.checked = selected.has(String(value));
        checkbox.addEventListener('change', () => {
          const values = Array.from(group.querySelectorAll('input[type="checkbox"]:checked')).map(input => input.value);
          saveAnswer(test, question.id, values);
        });
        label.append(checkbox, document.createTextNode(' ' + String(value)));
        group.appendChild(label);
      }
      return group;
    }

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'step';
    input.dataset.questionId = question.id;
    input.value = String(testState.answers[question.id] ?? '');
    if (type === 'number' || type === 'number-unit') input.inputMode = 'decimal';
    input.placeholder = '';
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

  function renderVisualPanel(visual = {}) {
    const panel = document.createElement('aside');
    panel.className = 'kaltest-visual-panel';
    panel.setAttribute('aria-label', visual.alt || 'Illustration de l’exercice');

    const frame = document.createElement('div');
    frame.className = 'kaltest-visual-frame';

    if (visual.src) {
      const img = document.createElement('img');
      img.src = visual.src;
      img.alt = visual.alt || '';
      frame.appendChild(img);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'kaltest-visual-placeholder';
      const badge = document.createElement('span');
      badge.className = 'kaltest-visual-placeholder-icon';
      badge.textContent = '▧';
      const label = document.createElement('strong');
      label.textContent = visual.placeholder || 'Image verticale';
      placeholder.append(badge, label);
      frame.appendChild(placeholder);
    }

    panel.appendChild(frame);
    return panel;
  }

  function renderQuestionnaireVisual(test) {
    return renderVisualPanel(test.presentation?.kaloneoLayout?.right || {});
  }

  function renderBasic(test, host) {
    const configured = test.presentation?.kaloneoLayout;
    if (configured?.type === 'questions-table-visual' && configured?.ratio === '60/40') {
      const layout = document.createElement('div');
      layout.className = 'kaltest-questionnaire-visual-layout';

      const left = document.createElement('section');
      left.className = 'kaltest-questionnaire-left';
      left.appendChild(renderQuestionList(test));
      left.appendChild(renderBasicResponseTable(test));

      layout.append(left, renderQuestionnaireVisual(test));
      host.appendChild(layout);
      return;
    }

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

    const configured = test.presentation?.kaloneoLayout;
    if (configured?.type === 'visual-schedule' && configured?.ratio === '40/60') {
      const layout = document.createElement('div');
      layout.className = 'kaltest-schedule-visual-layout';

      const work = document.createElement('section');
      work.className = 'kaltest-schedule-work';
      work.append(wrap, averages);

      layout.append(renderVisualPanel(configured.left || {}), work);
      host.appendChild(layout);
      return;
    }

    const layout = document.createElement('div');
    layout.className = 'kaltest-split-layout kaltest-split-60';
    layout.append(wrap, averages);
    host.appendChild(layout);
  }

  function renderInlineGaps(test, host) {
    const wrapper = document.createElement('div');
    wrapper.className = 'kaltest-inline-work';

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
        if (item.breakAfterSentence === true) {
          flow.appendChild(document.createElement('br'));
          flow.appendChild(document.createElement('br'));
        }
      } else if (item.type === 'question') {
        const question = questionById(test, item.questionId);
        if (question) flow.appendChild(makeInput(test, question, { compact:true }));
      }
    }
    wrapper.appendChild(flow);

    const configured = test.presentation?.kaloneoLayout;
    if (configured?.type === 'visual-inline-gaps' && configured?.ratio === '40/60') {
      const layout = document.createElement('div');
      layout.className = 'kaltest-inline-visual-layout';
      layout.append(renderVisualPanel(configured.left || {}), wrapper);
      host.appendChild(layout);
      return;
    }

    host.appendChild(wrapper);
  }

  function applyTableColumnPresentation(cell, definition) {
    if (!cell || !definition) return;
    const widthChars = Number(definition.widthChars);
    if (Number.isFinite(widthChars) && widthChars >= 3) {
      cell.style.width = widthChars + 'ch';
      cell.style.minWidth = widthChars + 'ch';
      cell.style.maxWidth = widthChars + 'ch';
    }
    if (definition.align === 'center') cell.style.textAlign = 'center';
    if (definition.align === 'left') cell.style.textAlign = 'left';
  }

  function renderConversions(test, host) {
    const questions = renderQuestionList(test);

    const wrapper = document.createElement('div');
    wrapper.className = 'kaltest-table-wrap';
    const table = document.createElement('table');
    table.className = 'kaltest-table kaltest-conversions-table';

    const thead = document.createElement('thead');
    const head = document.createElement('tr');
    const columnPresentation = test.presentation?.responseTable?.columns || [];
    (test.presentation?.responseTable?.headers || ['N°','Réponses','Unités','Opérations effectuées']).forEach((label, columnIndex) => {
      const th = document.createElement('th');
      th.textContent = label;
      applyTableColumnPresentation(th, columnPresentation[columnIndex]);
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
      applyTableColumnPresentation(number, columnPresentation[0]);
      tr.appendChild(number);

      const answer = document.createElement('td');
      answer.appendChild(makeInput(test, question, { compact:true }));
      applyTableColumnPresentation(answer, columnPresentation[1]);
      tr.appendChild(answer);

      const unit = document.createElement('td');
      unit.appendChild(makeUnitInput(test, question));
      applyTableColumnPresentation(unit, columnPresentation[2]);
      tr.appendChild(unit);

      const operation = document.createElement('td');
      const field = question.supplementalFields?.[0];
      if (field) operation.appendChild(makeSupplementalInput(test, question, field));
      applyTableColumnPresentation(operation, columnPresentation[3]);
      tr.appendChild(operation);

      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrapper.appendChild(table);

    const configured = test.presentation?.kaloneoLayout;
    if (configured?.type === 'work-visual' && configured?.ratio === '60/40') {
      const layout = document.createElement('div');
      layout.className = 'kaltest-conversions-visual-layout';

      const work = document.createElement('section');
      work.className = 'kaltest-conversions-work';
      work.append(questions, wrapper);

      layout.append(work, renderVisualPanel(configured.right || {}));
      host.appendChild(layout);
      return;
    }

    const layout = document.createElement('div');
    layout.className = 'kaltest-split-layout kaltest-split-50';
    layout.append(questions, wrapper);
    host.appendChild(layout);
  }

  function extractQuotedSource(prompt) {
    const match = String(prompt || '').match(/«\s*([^»]+?)\s*»/);
    return match ? match[1].trim() : '';
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

      const table = document.createElement('table');
      table.className = 'kaltest-table kaltest-grammar-table';

      const thead = document.createElement('thead');
      const trh = document.createElement('tr');
      for (const header of definition.headers || []) {
        const th = document.createElement('th');
        th.textContent = header;
        trh.appendChild(th);
      }
      thead.appendChild(trh);
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      for (const id of definition.questionIds || []) {
        const question = questionById(test, id);
        if (!question) continue;

        const prompt = normalizeText(question.prompt);
        const source = extractQuotedSource(question.prompt);
        const headers = definition.headers || [];
        const targetLeft = headers.length > 1 && prompt.includes(normalizeText(headers[0]));
        const tr = document.createElement('tr');
        const left = document.createElement('td');
        const right = document.createElement('td');

        if (targetLeft) {
          left.appendChild(makeInput(test, question, { compact:true }));
          right.textContent = source;
          right.className = 'kaltest-grammar-source';
        } else {
          left.textContent = source;
          left.className = 'kaltest-grammar-source';
          right.appendChild(makeInput(test, question, { compact:true }));
        }

        tr.append(left, right);
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      card.appendChild(table);
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

    const configured = test.presentation?.kaloneoLayout;

    if (configured?.type === 'full-width-choice-table') {
      const outer = document.createElement('section');
      outer.className = 'kaltest-choice-fullwidth-outer';
      const inner = document.createElement('div');
      inner.className = 'kaltest-choice-fullwidth-inner';
      inner.appendChild(table);
      outer.appendChild(inner);
      host.appendChild(outer);
      return;
    }

    if (configured?.type === 'visual-choice-table' && configured?.ratio === '40/60') {
      const layout = document.createElement('div');
      layout.className = 'kaltest-choice-visual-layout';

      const tableWrap = document.createElement('div');
      tableWrap.className = 'kaltest-choice-table-wrap';
      tableWrap.appendChild(table);

      layout.append(renderVisualPanel(configured.left || {}), tableWrap);
      host.appendChild(layout);
      return;
    }

    host.appendChild(table);
  }



  function renderBuilderMedia(item) {
    const wrap = document.createElement('div');
    wrap.className = 'kaltest-builder-media';
    const resource = item.resource || {};
    if (item.type === 'image') {
      if (resource.data || resource.name) {
        const img = document.createElement('img');
        img.src = resource.data || resource.name;
        img.alt = resource.alt || resource.name || '';
        img.className = 'seb-media-image';
        wrap.appendChild(img);
      }
      return wrap;
    }
    if (item.type === 'audio') {
      const audio = document.createElement('audio');
      audio.controls = true;
      audio.src = resource.data || resource.name || '';
      wrap.appendChild(audio);
      return wrap;
    }
    if (item.type === 'video') {
      const video = document.createElement('video');
      video.controls = true;
      video.src = resource.data || resource.name || '';
      video.className = 'seb-media-video';
      wrap.appendChild(video);
      return wrap;
    }
    return wrap;
  }

  function applyBuilderColumn(cell, definition) {
    if (!cell || !definition) return;
    const widthChars = Number(definition.widthChars);
    if (Number.isFinite(widthChars) && widthChars >= 3) {
      cell.style.width = widthChars + 'ch';
      cell.style.minWidth = widthChars + 'ch';
      cell.style.maxWidth = widthChars + 'ch';
    }
    if (definition.align === 'left' || definition.align === 'center') {
      cell.style.textAlign = definition.align;
    }
  }

  function renderBuilderGrid(test, item) {
    const definition = item.table || {};
    const wrapper = document.createElement('div');
    wrapper.className = 'kaltest-table-wrap kaltest-builder-grid-wrap';

    if (definition.title) {
      const title = document.createElement('h3');
      title.textContent = definition.title;
      wrapper.appendChild(title);
    }

    const table = document.createElement('table');
    table.className = 'kaltest-table kaltest-builder-grid';

    if (Array.isArray(definition.headers) && definition.headers.length) {
      const thead = document.createElement('thead');
      const row = document.createElement('tr');
      definition.headers.forEach((label, index) => {
        const th = document.createElement('th');
        th.textContent = String(label || '');
        applyBuilderColumn(th, definition.columns?.[index]);
        row.appendChild(th);
      });
      thead.appendChild(row);
      table.appendChild(thead);
    }

    const tbody = document.createElement('tbody');
    const testState = testStateFor(test);

    for (const rowDefinition of definition.cells || []) {
      const tr = document.createElement('tr');

      for (let columnIndex = 0; columnIndex < rowDefinition.length; columnIndex += 1) {
        const cellDefinition = rowDefinition[columnIndex] || {};
        const td = document.createElement('td');
        applyBuilderColumn(td, definition.columns?.[columnIndex]);

        const rowSpan = Math.max(1, Number(cellDefinition.rowSpan) || 1);
        const colSpan = Math.max(1, Number(cellDefinition.colSpan) || 1);
        if (rowSpan > 1) td.rowSpan = rowSpan;
        if (colSpan > 1) td.colSpan = colSpan;

        if (cellDefinition.kind === 'fixed-text') {
          td.textContent = String(cellDefinition.value || '');
        } else if (cellDefinition.kind === 'candidate-answer' ||
                   cellDefinition.kind === 'select' ||
                   cellDefinition.kind === 'unit') {
          const question = questionById(test, cellDefinition.questionId);
          if (question) {
            const input = makeInput(test, question, { compact:true });
            if (testState.status === 'COMPLETED') {
              input.disabled = true;
              const detail = testState.result?.details?.[question.id];
              td.classList.add(detail?.correct ? 'kaltest-answer-correct' : 'kaltest-answer-incorrect');
            }
            td.appendChild(input);
          }
        } else if (cellDefinition.kind === 'choice-option') {
          const question = questionById(test, cellDefinition.questionId);
          const option = String(cellDefinition.value || '');
          td.className = 'kaltest-choice';
          td.textContent = option;
          if (question && normalizeText(testState.answers[question.id]) === normalizeText(option)) td.classList.add('selected');
          if (question) {
            td.tabIndex = 0;
            td.setAttribute('role', 'button');
            const choose = () => {
              Array.from(tr.querySelectorAll('.kaltest-choice')).forEach(node => node.classList.remove('selected'));
              td.classList.add('selected');
              saveAnswer(test, question.id, option);
            };
            td.addEventListener('click', choose);
            td.addEventListener('keydown', event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                choose();
              }
            });
          }
        } else if (cellDefinition.kind === 'image') {
          const img = document.createElement('img');
          img.src = String(cellDefinition.value || '');
          img.alt = cellDefinition.alt || '';
          img.className = 'seb-media-image';
          td.appendChild(img);
        } else if (cellDefinition.kind === 'audio') {
          const audio = document.createElement('audio');
          audio.controls = true;
          audio.src = String(cellDefinition.value || '');
          td.appendChild(audio);
        } else if (cellDefinition.kind === 'video') {
          const video = document.createElement('video');
          video.controls = true;
          video.src = String(cellDefinition.value || '');
          video.className = 'seb-media-video';
          td.appendChild(video);
        }

        tr.appendChild(td);
      }

      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    wrapper.appendChild(table);
    return wrapper;
  }

  function renderBuilderInlineFlow(test, item) {
    const wrapper = document.createElement('div');
    wrapper.className = 'kaltest-inline-work';

    const bank = document.createElement('div');
    bank.className = 'kaltest-word-bank';
    for (const word of item.wordBank || []) {
      const span = document.createElement('span');
      span.textContent = String(word);
      bank.appendChild(span);
    }
    wrapper.appendChild(bank);

    const flow = document.createElement('div');
    flow.className = 'kaltest-inline-flow';
    for (const part of item.flow || []) {
      if (part.type === 'text') {
        flow.appendChild(document.createTextNode(part.text || ''));
        if (part.breakAfterSentence === true) {
          flow.appendChild(document.createElement('br'));
          flow.appendChild(document.createElement('br'));
        }
      } else if (part.type === 'question') {
        const question = questionById(test, part.questionId);
        if (question) flow.appendChild(makeInput(test, question, { compact:true }));
      }
    }
    wrapper.appendChild(flow);
    return wrapper;
  }

  function renderBuilderResponseTable(test, item) {
    const definition = item.definition || {};
    const wrapper = document.createElement('div');
    wrapper.className = 'kaltest-table-wrap';

    const table = document.createElement('table');
    table.className = 'kaltest-table';

    const headers = definition.headers || ['Question N°','Réponse','Unités'];
    const columns = definition.columns || [];
    const thead = document.createElement('thead');
    const head = document.createElement('tr');

    headers.forEach((label, index) => {
      const th = document.createElement('th');
      th.textContent = label;
      applyBuilderColumn(th, columns[index]);
      head.appendChild(th);
    });
    thead.appendChild(head);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    (test.questions || []).forEach((question, index) => {
      const tr = document.createElement('tr');
      headers.forEach((_header, columnIndex) => {
        const td = document.createElement('td');
        applyBuilderColumn(td, columns[columnIndex]);
        if (columnIndex === 0) {
          td.textContent = String(index + 1);
        } else if (columnIndex === 1) {
          td.appendChild(makeInput(test, question, { compact:true }));
        } else if (columnIndex === 2) {
          td.appendChild(makeUnitInput(test, question));
        } else {
          const field = question.supplementalFields?.[columnIndex - 3];
          if (field) td.appendChild(makeSupplementalInput(test, question, field));
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    wrapper.appendChild(table);
    return wrapper;
  }

  function renderAutoevaluation(test, host) {
    const definition = test.presentation?.autoevaluationForm;
    if (!definition || !definition.questionId) return false;
    const question = questionById(test, definition.questionId);
    if (!question) return false;

    const layout = document.createElement('div');
    layout.className = 'kaltest-autoeval-layout';
    const form = document.createElement('section');
    form.className = 'kaltest-autoeval-form';
    const statements = new Map((definition.statements || []).map(item => [String(item.value), item]));

    function appendStatement(value) {
      const item = statements.get(String(value));
      if (!item) return;
      const label = document.createElement('label');
      label.className = 'kaltest-autoeval-choice';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = String(value);
      const selected = new Set(Array.isArray(testStateFor(test).answers?.[question.id]) ? testStateFor(test).answers[question.id].map(String) : []);
      input.checked = selected.has(String(value));
      input.addEventListener('change', () => {
        const current = new Set(Array.isArray(testStateFor(test).answers?.[question.id]) ? testStateFor(test).answers[question.id].map(String) : []);
        if (input.checked) current.add(String(value)); else current.delete(String(value));
        saveAnswer(test, question.id, Array.from(current));
      });
      const span = document.createElement('span');
      span.textContent = item.label || String(value);
      label.append(input, span);
      form.appendChild(label);
    }

    if (Array.isArray(definition.groups) && definition.groups.length) {
      for (const group of definition.groups) {
        const title = document.createElement('h3');
        title.textContent = group.title || '';
        form.appendChild(title);
        for (const value of group.values || []) appendStatement(value);
      }
    } else {
      for (const item of definition.statements || []) appendStatement(item.value);
    }

    const comment = document.createElement('label');
    comment.className = 'kaltest-autoeval-comment';
    const caption = document.createElement('span');
    caption.textContent = definition.commentLabel || 'Commentaire :';
    const textarea = document.createElement('textarea');
    textarea.rows = 5;
    const fieldId = definition.commentFieldId || 'commentaire';
    textarea.value = String(testStateFor(test).supplemental?.[question.id]?.[fieldId] ?? '');
    textarea.addEventListener('input', () => saveSupplemental(test, question.id, fieldId, textarea.value));
    comment.append(caption, textarea);
    form.appendChild(comment);

    layout.append(form, renderVisualPanel(definition.visual || {}));
    host.appendChild(layout);
    return true;
  }

  function renderMail(test, host) {
    const definition = test.presentation?.mailComposer;
    if (!definition || !definition.fields) return false;
    const testState = testStateFor(test);
    const fields = definition.fields;
    const completed = testState.status === 'COMPLETED';

    const layout = document.createElement('div');
    layout.className = 'kaltest-mail-layout';

    const left = document.createElement('section');
    left.className = 'kaltest-mail-instructions';
    const heading = document.createElement('h3');
    heading.textContent = 'Consignes';
    left.appendChild(heading);
    const list = document.createElement('div');
    list.className = 'kaltest-mail-instruction-list';
    for (const line of definition.instructions || []) {
      const p = document.createElement('p');
      p.textContent = line;
      list.appendChild(p);
    }
    left.appendChild(list);

    const form = document.createElement('section');
    form.className = 'kaltest-mail-composer';
    const title = document.createElement('h3');
    title.textContent = 'Nouveau message ✉';
    form.appendChild(title);

    function textField(labelText, questionId) {
      const label = document.createElement('label');
      label.className = 'kaltest-mail-field';
      const span = document.createElement('span');
      span.textContent = labelText;
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'step';
      input.dataset.questionId = questionId;
      input.value = String(testState.answers?.[questionId] ?? '');
      input.disabled = completed;
      input.addEventListener('input', () => saveAnswer(test, questionId, input.value));
      label.append(span, input);
      form.appendChild(label);
      return input;
    }

    textField('À :', fields.to);
    textField('Cc :', fields.cc);
    textField('Objet :', fields.subject);

    const messageLabel = document.createElement('label');
    messageLabel.className = 'kaltest-mail-field kaltest-mail-message';
    const messageTitle = document.createElement('span');
    messageTitle.textContent = 'Message :';
    const textarea = document.createElement('textarea');
    textarea.className = 'step';
    textarea.rows = 7;
    textarea.disabled = completed;
    textarea.value = String(testState.answers?.[fields.signature] ?? testState.answers?.[fields.phone] ?? '');
    textarea.addEventListener('input', () => {
      saveAnswer(test, fields.signature, textarea.value);
      saveAnswer(test, fields.phone, textarea.value);
    });
    messageLabel.append(messageTitle, textarea);
    form.appendChild(messageLabel);

    const attachment = document.createElement('div');
    attachment.className = 'kaltest-mail-attachment';
    const attachmentLabel = document.createElement('strong');
    attachmentLabel.textContent = 'Pièce jointe :';
    const browse = document.createElement('button');
    browse.type = 'button';
    browse.className = 'kaltest-mail-browse';
    browse.textContent = '📂 Parcourir…';
    browse.disabled = completed;
    const selected = document.createElement('span');
    selected.className = 'kaltest-mail-selected';
    selected.textContent = String(testState.answers?.[fields.file] || 'Aucun fichier sélectionné');
    attachment.append(attachmentLabel, browse, selected);
    form.appendChild(attachment);

    const overlay = document.createElement('div');
    overlay.className = 'kaltest-mail-overlay';
    overlay.hidden = true;
    const modal = document.createElement('div');
    modal.className = 'kaltest-mail-modal';
    const modalTitle = document.createElement('h3');
    modalTitle.textContent = 'Sélectionnez un fichier';
    modal.appendChild(modalTitle);
    for (const file of definition.files || []) {
      const choice = document.createElement('button');
      choice.type = 'button';
      choice.textContent = '📄 ' + file;
      choice.addEventListener('click', () => {
        saveAnswer(test, fields.file, String(file));
        selected.textContent = String(file);
        overlay.hidden = true;
      });
      modal.appendChild(choice);
    }
    overlay.appendChild(modal);
    browse.addEventListener('click', () => { overlay.hidden = false; });
    overlay.addEventListener('click', event => { if (event.target === overlay) overlay.hidden = true; });
    layout.append(left, form, overlay);
    host.appendChild(layout);
    return true;
  }

  function renderStock(test, host) {
    const definition = test.presentation?.stockBoard;
    if (!definition || !Array.isArray(definition.pots) || !Array.isArray(definition.shelves)) return false;

    const testState = testStateFor(test);
    const completed = testState.status === 'COMPLETED';
    const shell = document.createElement('div');
    shell.className = 'kaltest-stock-layout';

    const left = document.createElement('section');
    left.className = 'kaltest-stock-left';

    const sourceCard = document.createElement('div');
    sourceCard.className = 'kaltest-stock-zone';
    const sourceTitle = document.createElement('h3');
    sourceTitle.textContent = 'Pots à ranger';
    const source = document.createElement('div');
    source.className = 'kaltest-stock-pots';
    source.dataset.stockDrop = 'source';
    sourceCard.append(sourceTitle, source);

    const triCard = document.createElement('div');
    triCard.className = 'kaltest-stock-zone';
    const triTitle = document.createElement('h3');
    triTitle.textContent = 'Zone de tri';
    const tri = document.createElement('div');
    tri.className = 'kaltest-stock-pots kaltest-stock-tri';
    tri.dataset.stockDrop = 'tri';
    triCard.append(triTitle, tri);
    left.append(sourceCard, triCard);

    const shelves = document.createElement('section');
    shelves.className = 'kaltest-stock-shelves';

    const caseByValue = new Map();
    for (const shelf of definition.shelves) {
      const shelfNode = document.createElement('div');
      shelfNode.className = 'kaltest-stock-shelf shelf-' + shelf.id;
      const title = document.createElement('div');
      title.className = 'kaltest-stock-shelf-title';
      title.textContent = shelf.title || ('Casier ' + shelf.id);
      shelfNode.appendChild(title);

      for (const level of shelf.levels || []) {
        const levelNode = document.createElement('div');
        levelNode.className = 'kaltest-stock-level';
        const label = document.createElement('div');
        label.className = 'kaltest-stock-level-label';
        label.textContent = level.label || '';
        const cases = document.createElement('div');
        cases.className = 'kaltest-stock-cases';

        for (let index = 1; index <= Number(level.cases || 0); index += 1) {
          const value = 'case:' + shelf.id + ':' + level.id + ':' + index;
          const cell = document.createElement('div');
          cell.className = 'kaltest-stock-case';
          cell.dataset.stockDrop = value;
          cell.dataset.stockCase = value;
          cases.appendChild(cell);
          caseByValue.set(value, cell);
        }
        levelNode.append(label, cases);
        shelfNode.appendChild(levelNode);
      }
      shelves.appendChild(shelfNode);
    }

    function potNode(pot) {
      const node = document.createElement('div');
      node.className = 'kaltest-stock-pot';
      node.dataset.potId = String(pot.id);
      node.dataset.questionId = pot.questionId || '';
      node.draggable = !completed && !pot.example;
      node.style.backgroundImage = 'url("flacon/flacon_' + String(pot.color || '') + '.png")';

      const code = document.createElement('strong');
      code.textContent = String(pot.code || '');
      const pct = document.createElement('span');
      pct.textContent = String(pot.percentage ?? '') + '%';
      node.append(code, pct);

      if (pot.example) {
        node.classList.add('example');
        node.setAttribute('aria-label', 'Exemple ' + code.textContent + ' ' + pct.textContent);
      } else if (completed) {
        const detail = testState.result?.details?.[pot.questionId];
        node.classList.add(detail?.correct ? 'correct' : 'incorrect');
      }
      return node;
    }

    const nodes = new Map();
    for (const pot of definition.pots) nodes.set(String(pot.id), potNode(pot));

    const exampleId = String(definition.examplePotId ?? '');
    for (const pot of definition.pots) {
      const id = String(pot.id);
      const node = nodes.get(id);
      if (!node) continue;

      if (id === exampleId) {
        const target = caseByValue.get(String(definition.examplePlacement || ''));
        (target || source).appendChild(node);
        continue;
      }

      const answer = String(testState.answers?.[pot.questionId] ?? '');
      if (answer.startsWith('case:')) {
        const target = caseByValue.get(answer);
        if (target && !target.querySelector('.kaltest-stock-pot')) target.appendChild(node);
        else source.appendChild(node);
      } else if (answer === 'tri') {
        tri.appendChild(node);
      } else {
        source.appendChild(node);
      }
    }

    function move(node, destination) {
      if (!node || completed || node.classList.contains('example')) return false;
      const questionId = node.dataset.questionId;
      if (!questionId) return false;
      if (destination.startsWith('case:')) {
        const cell = caseByValue.get(destination);
        if (!cell || cell.querySelector('.kaltest-stock-pot')) return false;
        cell.appendChild(node);
      } else if (destination === 'tri') {
        tri.appendChild(node);
      } else {
        source.appendChild(node);
        destination = 'source';
      }
      saveAnswer(test, questionId, destination);
      return true;
    }

    if (!completed) {
      shell.addEventListener('dragstart', event => {
        const node = event.target?.closest?.('.kaltest-stock-pot');
        if (!node || node.classList.contains('example')) return;
        event.dataTransfer?.setData('text/plain', node.dataset.potId || '');
        if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
        node.classList.add('dragging');
      });
      shell.addEventListener('dragend', event => {
        event.target?.closest?.('.kaltest-stock-pot')?.classList.remove('dragging');
      });
      shell.addEventListener('dragover', event => {
        const target = event.target?.closest?.('[data-stock-drop]');
        if (!target) return;
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
      });
      shell.addEventListener('drop', event => {
        const target = event.target?.closest?.('[data-stock-drop]');
        if (!target) return;
        event.preventDefault();
        const id = event.dataTransfer?.getData('text/plain') || '';
        const node = nodes.get(String(id));
        move(node, String(target.dataset.stockDrop || 'source'));
      });
    }

    shell.append(left, shelves);
    host.appendChild(shell);
    return true;
  }

  function renderPlanning(test, host) {
    const definition = test.presentation?.planningGrid;
    if (!definition || !Array.isArray(definition.rows)) return false;

    const layout = document.createElement('div');
    layout.className = 'kaltest-planning-layout';
    if (definition.backgroundImage) layout.style.setProperty('--kaltest-planning-bg', 'url("' + definition.backgroundImage + '")');

    const work = document.createElement('section');
    work.className = 'kaltest-planning-work';

    const table = document.createElement('table');
    table.className = 'kaltest-table kaltest-planning-table';
    const thead = document.createElement('thead');
    const head = document.createElement('tr');
    for (const header of definition.headers || []) {
      const th = document.createElement('th');
      th.textContent = header;
      head.appendChild(th);
    }
    thead.appendChild(head);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    const testState = testStateFor(test);
    for (const rowDefinition of definition.rows) {
      const tr = document.createElement('tr');
      const label = document.createElement('th');
      label.textContent = rowDefinition.label || '';
      tr.appendChild(label);
      for (const questionId of rowDefinition.questionIds || []) {
        const td = document.createElement('td');
        const question = questionById(test, questionId);
        if (question) {
          const input = makeInput(test, question, { compact:true });
          if (testState.status === 'COMPLETED') {
            input.disabled = true;
            const detail = testState.result?.details?.[question.id];
            td.classList.add(detail?.correct ? 'kaltest-answer-correct' : 'kaltest-answer-incorrect');
          }
          td.appendChild(input);
        }
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    work.appendChild(table);

    const lists = document.createElement('div');
    lists.className = 'kaltest-planning-lists';
    const dish = document.createElement('p');
    dish.innerHTML = '<strong>Liste des plats :</strong> ' + (definition.dishList || []).join(', ');
    const dessert = document.createElement('p');
    dessert.innerHTML = '<strong>Liste des desserts :</strong> ' + (definition.dessertList || []).join(', ');
    lists.append(dish, dessert);
    work.appendChild(lists);

    const guide = document.createElement('aside');
    guide.className = 'kaltest-planning-guide';
    const title = document.createElement('h3');
    title.textContent = 'Indications';
    guide.appendChild(title);
    const ol = document.createElement('ol');
    for (const item of definition.guide || []) {
      const li = document.createElement('li');
      li.textContent = item;
      ol.appendChild(li);
    }
    guide.appendChild(ol);

    layout.append(work, guide);
    host.appendChild(layout);
    return true;
  }

  function renderFractions(test, host) {
    const definition = test.presentation?.fractionSelection;
    if (!definition || !Array.isArray(definition.groups)) return false;

    const layout = document.createElement('div');
    layout.className = 'kaltest-fractions-layout';
    layout.appendChild(renderVisualPanel(definition.visual || {}));

    const work = document.createElement('section');
    work.className = 'kaltest-fractions-work';
    const testState = testStateFor(test);

    for (const group of definition.groups) {
      const question = questionById(test, group.questionId);
      if (!question) continue;
      const row = document.createElement('section');
      row.className = 'kaltest-fraction-row';

      const title = document.createElement('div');
      title.className = 'kaltest-fraction-title';
      const label = document.createElement('strong');
      label.textContent = group.label || question.prompt || '';
      title.appendChild(label);
      if (group.itemImage) {
        const icon = document.createElement('img');
        icon.src = group.itemImage;
        icon.alt = '';
        title.appendChild(icon);
      }

      const items = document.createElement('div');
      items.className = 'kaltest-fraction-items' + (group.cloud ? ' cloud' : '');
      const selected = new Set(Array.isArray(testState.answers?.[question.id]) ? testState.answers[question.id].map(String) : []);
      const count = Math.max(1, Number(group.totalItems) || 1);
      for (let index = 1; index <= count; index += 1) {
        const value = String(index);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'kaltest-fraction-item';
        button.setAttribute('aria-label', (group.label || 'Fraction') + ' — objet ' + index);
        button.setAttribute('aria-pressed', selected.has(value) ? 'true' : 'false');
        if (selected.has(value)) button.classList.add('selected');
        if (group.itemImage) button.style.backgroundImage = 'url("' + group.itemImage + '")';
        button.addEventListener('click', () => {
          const stateNow = testStateFor(test);
          const current = new Set(Array.isArray(stateNow.answers?.[question.id]) ? stateNow.answers[question.id].map(String) : []);
          if (current.has(value)) current.delete(value); else current.add(value);
          const active = current.has(value);
          button.classList.toggle('selected', active);
          button.setAttribute('aria-pressed', active ? 'true' : 'false');
          saveAnswer(test, question.id, Array.from(current));
        });
        items.appendChild(button);
      }
      row.append(title, items);
      work.appendChild(row);
    }

    layout.appendChild(work);
    host.appendChild(layout);
    return true;
  }

  function renderOrganisation(test, host) {
    const definition = test.presentation?.organisationList;
    if (!definition || !Array.isArray(definition.rows)) return false;

    const layout = document.createElement('div');
    layout.className = 'kaltest-organisation-layout';
    layout.appendChild(renderVisualPanel(definition.visual || {}));

    const work = document.createElement('section');
    work.className = 'kaltest-organisation-work';
    for (const rowDefinition of definition.rows) {
      const question = questionById(test, rowDefinition.questionId);
      if (!question) continue;
      const row = document.createElement('label');
      row.className = 'kaltest-organisation-row';
      const input = makeInput(test, question, { compact:true });
      input.maxLength = 1;
      input.inputMode = 'numeric';
      const text = document.createElement('span');
      text.textContent = rowDefinition.text || question.prompt || '';
      row.append(input, text);
      work.appendChild(row);
    }
    layout.appendChild(work);
    host.appendChild(layout);
    return true;
  }

  function renderPostures(test, host) {
    const definition = test.presentation?.postureSelection;
    if (!definition || !Array.isArray(definition.questionIds)) return false;

    const wrap = document.createElement('div');
    wrap.className = 'kaltest-postures-layout';

    if (definition.imageSrc) {
      const frame = document.createElement('div');
      frame.className = 'kaltest-postures-image';
      const img = document.createElement('img');
      img.src = definition.imageSrc;
      img.alt = definition.imageAlt || '';
      frame.appendChild(img);
      wrap.appendChild(frame);
    }

    const answers = document.createElement('div');
    answers.className = 'kaltest-postures-answers';
    definition.questionIds.forEach((questionId, index) => {
      const question = questionById(test, questionId);
      if (!question) return;
      const label = document.createElement('label');
      label.className = 'kaltest-postures-answer';
      const span = document.createElement('span');
      span.textContent = (definition.labels || [])[index] || question.prompt || '';
      const input = makeInput(test, question, { compact:true });
      input.maxLength = 1;
      input.inputMode = 'numeric';
      label.append(span, input);
      answers.appendChild(label);
    });
    wrap.appendChild(answers);
    host.appendChild(wrap);
    return true;
  }

  function renderBuilderContentItem(test, item) {
    const wrap = document.createElement('div');
    wrap.className = 'kaltest-builder-content-item';

    if (item.type === 'text') {
      wrap.textContent = item.text || '';
      return wrap;
    }
    if (item.type === 'html' || item.type === 'html-js') {
      const frame = document.createElement('iframe');
      frame.className = 'kaltest-builder-html';
      frame.setAttribute('sandbox', item.type === 'html-js' ? 'allow-scripts' : '');
      const script = item.type === 'html-js' && item.script
        ? '<script>' + String(item.script).replace(/<\/script/gi, '<\\/script') + '<\/script>'
        : '';
      frame.srcdoc = '<!doctype html><html><body>' + (item.html || '') + script + '</body></html>';
      wrap.appendChild(frame);
      return wrap;
    }
    if (['image','audio','video'].includes(item.type)) return renderBuilderMedia(item);
    if (item.type === 'question') {
      const question = questionById(test, item.questionId);
      if (question) {
        const label = document.createElement('label');
        label.className = 'kaltest-builder-question';
        const title = document.createElement('span');
        title.textContent = question.prompt || '';
        label.append(title, makeInput(test, question));
        wrap.appendChild(label);
      }
      return wrap;
    }
    if (item.type === 'response-table') return renderBuilderResponseTable(test, item);
    if (item.type === 'inline-flow') return renderBuilderInlineFlow(test, item);
    if (item.type === 'table-grid') return renderBuilderGrid(test, item);
    if (item.type === 'table-definition') {
      const definition = item.definition || {};
      const title = document.createElement('h3');
      title.textContent = definition.title || '';
      wrap.appendChild(title);
      for (const id of definition.questionIds || []) {
        const question = questionById(test, id);
        if (!question) continue;
        const row = document.createElement('div');
        row.className = 'kaltest-builder-question';
        const label = document.createElement('span');
        label.textContent = question.prompt || id;
        row.append(label, makeInput(test, question, { compact:true }));
        wrap.appendChild(row);
      }
      return wrap;
    }

    return wrap;
  }

  function renderBuilderContent(test, host) {
    const content = test.presentation?.builderContent;
    if (!Array.isArray(content)) return false;

    const layout = String(test.presentation?.layout || 'single');
    const shell = document.createElement('div');
    shell.className = 'kaltest-builder-runtime-layout';

    if (layout === 'single') {
      shell.style.gridTemplateColumns = 'minmax(0,1fr)';
    } else if (layout === '50-50') {
      shell.style.gridTemplateColumns = 'minmax(0,1fr) minmax(0,1fr)';
    } else if (layout === '40-60') {
      shell.style.gridTemplateColumns = 'minmax(0,40fr) minmax(0,60fr)';
    } else if (layout === '60-40') {
      shell.style.gridTemplateColumns = 'minmax(0,60fr) minmax(0,40fr)';
    } else if (layout === 'chars-rest') {
      const sizing = test.presentation?.blockSizing?.blocks || [];
      const first = Number(sizing[0]?.widthChars);
      const second = Number(sizing[1]?.widthChars);
      shell.style.gridTemplateColumns =
        (Number.isFinite(first) && first >= 3 ? first + 'ch' : 'minmax(0,1fr)') + ' ' +
        (sizing[1]?.remainder === true ? 'minmax(0,1fr)' :
          (Number.isFinite(second) && second >= 3 ? second + 'ch' : 'minmax(0,1fr)'));
    }

    const left = document.createElement('section');
    left.className = 'kaltest-builder-runtime-zone';
    const right = document.createElement('section');
    right.className = 'kaltest-builder-runtime-zone';

    for (const item of content) {
      const node = renderBuilderContentItem(test, item);
      (item.zone === 'right' ? right : left).appendChild(node);
    }

    shell.appendChild(left);
    if (layout !== 'single') shell.appendChild(right);
    host.appendChild(shell);
    return true;
  }

  function parseStorageObject(key) {
    try {
      const value = JSON.parse(sessionStorage.getItem(key) || '{}');
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch (_) {
      return {};
    }
  }

  function syncLegacyCompatibility(test, testState) {
    if (!test || !testState || !testState.result) return;

    const responses = parseStorageObject('reponses_data');
    const scores = parseStorageObject('scores_data');
    const result = testState.result;
    const questions = test.questions || [];

    const copyRange = (responsePrefix, scorePrefix, startIndex, includeUnits, includeSupplemental) => {
      questions.forEach((question, offset) => {
        const index = startIndex + offset;
        const detail = result.details?.[question.id] || {};
        responses[responsePrefix + index] = String(testState.answers?.[question.id] ?? '');
        scores[scorePrefix + index] = detail.correct ? 1 : 0;
        if (includeUnits) {
          responses[responsePrefix.replace(/_q$/, '_unite') + index] = String(testState.units?.[question.id] ?? '');
          scores[scorePrefix.replace(/_q$/, '_unite') + index] = 0;
        }
        if (includeSupplemental) {
          const supplemental = testState.supplemental?.[question.id] || {};
          const first = Object.values(supplemental)[0];
          if (first !== undefined) {
            responses[responsePrefix + index + '_operation'] = String(first ?? '');
            scores[scorePrefix + index + '_operation'] = 0;
          }
        }
      });
    };

    if (test.id === 'calculs_commandes_atelier') {
      copyRange('page2_q', 'page2_q', 1, true, false);
    } else if (test.id === 'calculs_poids_volumes') {
      copyRange('page2_1_q', 'page2_1_q', 6, true, false);
    } else if (test.id === 'horaires_reception_controle') {
      questions.forEach((question, offset) => {
        const index = offset + 1;
        const key = 'page3_q' + index;
        const detail = result.details?.[question.id] || {};
        responses[key] = String(testState.answers?.[question.id] ?? '');
        scores[key] = detail.correct ? 1 : 0;
      });
      const dedicatedResponses = {};
      const dedicatedScores = {};
      for (let index = 1; index <= questions.length; index += 1) {
        dedicatedResponses['page3_q' + index] = responses['page3_q' + index] || '';
        dedicatedScores['page3_q' + index] = scores['page3_q' + index] || 0;
      }
      sessionStorage.setItem('page3_resultats', JSON.stringify({
        reponses: dedicatedResponses,
        scores: dedicatedScores,
        savedAt: Date.now()
      }));
    } else if (test.id === 'texte_a_trous_stage_logistique') {
      responses.pageTexteTrous = questions.map(question => ({
        user: String(testState.answers?.[question.id] ?? ''),
        correct: String(Array.isArray(question.acceptedAnswers) && question.acceptedAnswers.length ? question.acceptedAnswers[0] : '')
      }));
      scores.pageTexteTrous = Number(result.score) || 0;
    } else if (test.id === 'fractions_preparation_lots') {
      responses.page4 = String(Number(result.score) || 0) + '/' + String(Number(result.scoreMax) || questions.length || 3);
      scores.page4 = Number(result.score) || 0;
    } else if (test.id === 'organisation_demenagement') {
      const snapshot = {};
      const values = {};
      questions.forEach((question, offset) => {
        const index = offset + 1;
        const key = 'page5_q' + index;
        const value = String(testState.answers?.[question.id] ?? '');
        const detail = result.details?.[question.id] || {};
        responses[key] = value;
        scores[key] = detail.correct ? 1 : 0;
        values[index] = value;
        snapshot[index] = { reponse:value, score:scores[key] };
      });
      sessionStorage.setItem('page5_organisation_data', JSON.stringify(snapshot));
      sessionStorage.setItem('seb_evalpro_qcm_page5_state', JSON.stringify({ values, savedAt:Date.now(), source:'kaltest' }));
    } else if (test.id === 'gestes_postures') {
      const values = {};
      questions.forEach((question, offset) => {
        const index = offset + 1;
        const key = 'page5_1_q' + index;
        const value = String(testState.answers?.[question.id] ?? '');
        const detail = result.details?.[question.id] || {};
        responses[key] = value;
        scores[key] = detail.correct ? 1 : 0;
        values[index] = value;
      });
      sessionStorage.setItem('seb_evalpro_qcm_page5_1_state', JSON.stringify({ values, savedAt:Date.now(), source:'kaltest' }));
    } else if (test.id === 'conversions_atelier_expedition') {
      copyRange('page6_q', 'page6_q', 1, true, true);
    } else if (test.id === 'autoevaluation_savoirs') {
      const question = questions[0];
      sessionStorage.setItem('autoEval1_resultats', JSON.stringify({
        selections:Array.isArray(testState.answers?.[question?.id]) ? testState.answers[question.id] : [],
        commentaire:String(testState.supplemental?.[question?.id]?.commentaire ?? '')
      }));
    } else if (test.id === 'ranger_stock') {
      const correct = Number(result.score) || 0;
      const total = Number(result.scoreMax) || 33;
      const errors = Math.max(0, total - correct);
      sessionStorage.setItem('stockCorrect', String(correct));
      sessionStorage.setItem('stockErrors', String(errors));
      sessionStorage.setItem('stockTotal', String(total));
      sessionStorage.setItem('seb_evalpro_stock_state', JSON.stringify({
        answers:Object.assign({}, testState.answers || {}),
        validated:true,
        savedAt:Date.now(),
        source:'kaltest'
      }));
      sessionStorage.setItem('seb_exercise_activity:stock.html', '1');
    } else if (test.id === 'planning_cantine') {
      const correction = {};
      const answers = {};
      questions.forEach((question, offset) => {
        const index = offset + 1;
        const key = 'q' + index;
        const value = String(testState.answers?.[question.id] ?? '');
        const detail = result.details?.[question.id] || {};
        const expected = String(Array.isArray(question.acceptedAnswers) && question.acceptedAnswers.length ? question.acceptedAnswers[0] : '');
        answers[key] = value || '_';
        correction[key] = { reponse:value || '_', attendu:expected, correct:Boolean(detail.correct) };
      });
      sessionStorage.setItem('planningScore', String(Number(result.score) || 0));
      sessionStorage.setItem('planningCorrection', JSON.stringify(correction));
      sessionStorage.setItem('seb_planning_validated', '1');
      sessionStorage.setItem('seb_evalpro_planning_state', JSON.stringify({
        answers,
        validated:true,
        savedAt:Date.now(),
        source:'kaltest'
      }));
    } else if (test.id === 'redaction_email') {
      const value = id => String(testState.answers?.[id] ?? '');
      const detail = id => testState.result?.details?.[id]?.correct ? 1 : 0;
      const data = {
        page8_to:value('mail_to'),
        page8_cc:value('mail_cc'),
        page8_subject:value('mail_subject'),
        page8_message:value('mail_signature') || value('mail_phone'),
        page8_file:value('mail_file'),
        score_to:detail('mail_to'),
        score_cc:detail('mail_cc'),
        score_subject:detail('mail_subject'),
        score_file:detail('mail_file'),
        score_signature:detail('mail_signature'),
        score_telephone:detail('mail_phone'),
        score_total:Number(result.score) || 0
      };
      sessionStorage.setItem('page8_data', JSON.stringify(data));
      sessionStorage.setItem('seb_exercise_activity:nvmail.html', '1');
    } else if (test.id === 'autoevaluation_tic') {
      const question = questions[0];
      sessionStorage.setItem('autoEval2_resultats', JSON.stringify({
        selections:Array.isArray(testState.answers?.[question?.id]) ? testState.answers[question.id] : [],
        commentaire:String(testState.supplemental?.[question?.id]?.commentaire ?? '')
      }));
    } else if (test.id === 'genre_nombre') {
      const answers = questions.map(question => String(testState.answers?.[question.id] ?? ''));
      const errors = Math.max(0, questions.length - (Number(result.score) || 0));
      sessionStorage.setItem('user_genrenombres', JSON.stringify(answers));
      sessionStorage.setItem('erreurs_exercice', String(errors));
      sessionStorage.setItem('seb_genrenombres_validated', '1');
      sessionStorage.setItem('seb_evalpro_genrenombres_state', JSON.stringify({
        answers,
        validated:true,
        savedAt:Date.now()
      }));
    } else if (test.id === 'paronymes_rapport') {
      const detailRows = questions.map(question => {
        const answer = String(testState.answers?.[question.id] ?? '');
        const detail = result.details?.[question.id] || {};
        return {
          paronyme: question.prompt,
          mot: question.prompt,
          reponseUtilisateur: answer || '(non repondu)',
          bonnesReponses: Array.isArray(question.acceptedAnswers) ? question.acceptedAnswers : [],
          correct: Boolean(detail.correct)
        };
      });
      sessionStorage.setItem('paronymes_score', String(Number(result.score) || 0));
      sessionStorage.setItem('paronymes_total', String(Number(result.scoreMax) || questions.length));
      sessionStorage.setItem('paronymes_reponses', JSON.stringify(detailRows));
      sessionStorage.setItem('paronymes_erreurs_detail', JSON.stringify(detailRows.filter(row => !row.correct)));
      sessionStorage.setItem('seb_paronymes_validated', '1');
      sessionStorage.setItem('seb_exercise_activity:paronymes.html', '1');
    } else if (test.id === 'gratte_ciel') {
      const score = Number(result.score) || 0;
      const scoreMax = Number(result.scoreMax) || 16;
      const errors = Math.max(0, scoreMax - score);
      sessionStorage.setItem('puzzleErrors', String(errors));
      sessionStorage.setItem('carre_magique_score', String(score));
      sessionStorage.setItem('carre_magique_erreurs', String(errors));
      sessionStorage.setItem('seb_exercise_activity:carre.html', '1');
    }

    sessionStorage.setItem('reponses_data', JSON.stringify(responses));
    sessionStorage.setItem('scores_data', JSON.stringify(scores));
  }

  function renderCurrentTest() {
    try { window.closeCalculator?.(); } catch (_) {}
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
      'Exercice ' + (state.testIndex + 1) + ' / ' + ACTIVE_TESTS.length;
    document.getElementById('kaltest-scenario').textContent = test.scenario || '';
    document.getElementById('kaltest-instruction').textContent = test.instruction || '';

    const calculator = document.getElementById('kaltest-calculator');
    const calculatorEnabled = test.calculator?.compatible === true && test.calculator?.defaultEnabled !== false;
    calculator.hidden = !calculatorEnabled;
    if (calculatorEnabled) {
      calculator.style.removeProperty('display');
    } else {
      calculator.style.setProperty('display', 'none', 'important');
      try { window.closeCalculator?.(); } catch (_) {}
      requestAnimationFrame(() => {
        try { window.closeCalculator?.(); } catch (_) {}
      });
    }

    const next = document.getElementById('kaltest-next');
    const isLastActiveTest = state.testIndex === ACTIVE_TESTS.length - 1;
    const testState = currentTestState();
    if (test.behavior?.validateBeforeAdvance === true && testState?.status !== 'COMPLETED') {
      next.textContent = test.behavior.validationLabel || 'Valider';
    } else {
      next.textContent = isLastActiveTest && !PILOT11_MODE ? 'Terminer le parcours' : 'Suivant';
    }

    const status = document.getElementById('exercise-status');
    status.textContent = '';

    const host = document.getElementById('kaltest-content');
    host.innerHTML = '';

    if (renderAutoevaluation(test, host)) {
      // Autoévaluations migrées dans le moteur KALTEST commun.
    } else if (renderMail(test, host)) {
      // Rédaction e-mail migrée dans le moteur KALTEST commun.
    } else if (renderStock(test, host)) {
      // Ranger le stock migré dans le moteur KALTEST commun.
    } else if (renderPlanning(test, host)) {
      // Planning cantine migré dans le moteur KALTEST commun.
    } else if (renderFractions(test, host)) {
      // Migration KALTEST de l'ancienne page 4.
    } else if (renderOrganisation(test, host)) {
      // Migration KALTEST de l'ancienne page 5.
    } else if (renderPostures(test, host)) {
      // Migration KALTEST de l'ancienne page 5_1.
    } else if (renderBuilderContent(test, host)) {
      // Les tests générés par KALONÉO passent par le rendu générique commun.
    } else if (Array.isArray(test.presentation?.inlineFlow)) {
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

  async function captureReplayPage() {
    try {
      if (window.sebEvalPro?.captureReplay) {
        await window.sebEvalPro.captureReplay();
      }
    } catch (_) {}
  }

  async function finishCurrentTest() {
    const test = currentTest();
    const testState = currentTestState();
    const status = document.getElementById('exercise-status');
    if (!test || !testState) return;

    if (test.behavior?.validateBeforeAdvance === true && testState.status === 'COMPLETED') {
      await captureReplayPage();
      advance();
      return;
    }

    if (!hasActivity(test, testState) && test.allowEmptyCompletion !== true) {
      status.textContent = 'Vous devez réaliser l’exercice avant de continuer. Si vous souhaitez l’arrêter, utilisez « Abandonner l’exercice ».';
      return;
    }

    testState.result = evaluateTest(test, testState);
    testState.status = 'COMPLETED';
    testState.abandon = null;
    syncLegacyCompatibility(test, testState);

    if (test.behavior?.validateBeforeAdvance === true) {
      replay('EXERCISE_VALIDATED', {
        testId:test.id,
        version:test.version,
        score:testState.result.score,
        scoreMax:testState.result.scoreMax
      });
      renderCurrentTest();
      status.textContent = test.behavior?.validationSuccessMessage ||
        ('Exercice validé : ' + testState.result.score + '/' + testState.result.scoreMax + '. Cliquez sur « Suivant » pour continuer.');
      return;
    }

    replay('EXERCISE_COMPLETED', {
      testId:test.id,
      version:test.version,
      score:testState.result.score,
      scoreMax:testState.result.scoreMax
    });

    await captureReplayPage();
    advance();
  }

  function handoffPilot11() {
    if (!PILOT11_MODE || !SEGMENT?.stepId) {
      throw new Error('Handoff PILOTE 11 demandé sans segment actif.');
    }
    if (!window.sebParcours?.goNext) {
      throw new Error('Registre central du parcours indisponible pour le handoff PILOTE 11.');
    }
    try { window.dispatchEvent(new CustomEvent('seb-kaltest-handoff', { detail:{ segment:SEGMENT_KEY } })); } catch (_) {}
    window.sebParcours.goNext(SEGMENT.stepId);
  }

  function advance() {
    try { window.closeCalculator?.(); } catch (_) {}
    if (state.testIndex + 1 >= ACTIVE_TESTS.length) {
      if (PILOT11_MODE) {
        state.phase = 'handoff';
        persist();
        handoffPilot11();
        return;
      }

      state.phase = 'final';
      persist();
      showPhase('final');
      try { window.dispatchEvent(new CustomEvent('seb-kaltest-final')); } catch (_) {}
      return;
    }

    state.testIndex += 1;
    state.phase = 'exercise';
    persist();
    renderCurrentTest();
    showPhase('exercise');
  }

  async function onAbandon(record) {
    const test = currentTest();
    const testState = currentTestState();
    if (!test || !testState) return;

    testState.result = evaluateTest(test, testState);
    testState.status = record?.nonEvaluated ? 'ABANDONED_NE' : 'ABANDONED_EVALUATED';
    testState.abandon = record || null;
    syncLegacyCompatibility(test, testState);

    replay('EXERCISE_ABANDONED', {
      testId:test.id,
      nonEvaluated:Boolean(record?.nonEvaluated),
      score:testState.result.score,
      scoreMax:testState.result.scoreMax
    });

    await captureReplayPage();
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
      const candidateData = {
        ...validation.values,
        'prénom': validation.values.prenom,
        date: validation.values.dateEvaluation,
        dateTest: validation.values.dateEvaluation
      };
      state.identity = candidateData;
      state.personId = state.personId || crypto.randomUUID();
      state.evaluationId = state.evaluationId || crypto.randomUUID();
      sessionStorage.setItem('candidat_data', JSON.stringify(candidateData));
      replay('IDENTITY_VALIDATED', {
        fields:['nom','prenom','naissance','ss7','lieu','groupe','dateEvaluation','parcours']
      });
      showPhase('intro');
    });

    document.getElementById('intro-next').addEventListener('click', () => {
      state.testIndex = Math.max(0, Math.min(state.testIndex, ACTIVE_TESTS.length - 1));
      state.phase = 'exercise';
      renderCurrentTest();
      showPhase('exercise');
    });

    document.getElementById('kaltest-next').addEventListener('click', finishCurrentTest);

    installKeyboardNavigation();

    if (PILOT11_MODE && state.phase === 'handoff') {
      handoffPilot11();
      return;
    }

    if (state.phase === 'exercise') renderCurrentTest();
    showPhase(state.phase || DEFAULT_PHASE, false);

    replay('PILOT2_READY', {
      tests:DATA.tests.map(test => test.id),
      activeTests:ACTIVE_TESTS.map(test => test.id),
      segment:SEGMENT_KEY,
      parcours:DATA.parcours?.id || ''
    });
  }

  window.sebKaltestHost = Object.freeze({
    onAbandon
  });

  window.sebKaltestPilot2 = Object.freeze({
    get state() { return JSON.parse(JSON.stringify(state)); },
    get data() { return JSON.parse(JSON.stringify(DATA)); },
    get activeTests() { return ACTIVE_TESTS.map(test => test.id); },
    get segment() { return SEGMENT_KEY; },
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
      if (state.phase === 'exercise') renderCurrentTest();
      showPhase(state.phase || DEFAULT_PHASE, false);
      persist();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once:true });
  } else {
    install();
  }
})();
