'use strict';

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
  if (match) {
    const minutes = Number(match[1]);
    return Number.isSafeInteger(minutes) && minutes >= 0 ? minutes : null;
  }

  match = text.match(/^(\d+)\s*h$/);
  if (match) {
    const hours = Number(match[1]);
    return Number.isSafeInteger(hours) && hours >= 0 ? hours * 60 : null;
  }

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
    const expected = Number(question.acceptedMinutes);
    return actual !== null && Number.isInteger(expected) && actual === expected;
  }

  if (type === 'number') {
    const actual = normalizeNumber(value);
    return actual !== null && (question.acceptedAnswers || []).some(answer => {
      const expected = normalizeNumber(answer);
      return expected !== null && Math.abs(actual - expected) < 1e-9;
    });
  }

  if (type === 'boolean') {
    const actual = typeof value === 'boolean' ? value : normalizeText(value);
    return (question.acceptedAnswers || []).some(answer => {
      if (typeof actual === 'boolean') return actual === Boolean(answer);
      return actual === normalizeText(answer);
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

function evaluateTest(testDefinition, answers = {}) {
  let score = 0;
  let scoreMax = 0;
  const details = {};

  for (const question of testDefinition?.questions || []) {
    const points = Number(question.points) || 0;
    const correct = evaluateQuestion(question, answers[question.id]);

    if (question.example !== true && testDefinition.scored !== false) {
      scoreMax += points;
      if (correct) score += points;
    }

    details[question.id] = {
      correct,
      points,
      value: answers[question.id] ?? ''
    };
  }

  return {
    score,
    scoreMax,
    percentage: scoreMax > 0 ? (score / scoreMax) * 100 : 0,
    details
  };
}

module.exports = {
  normalizeText,
  normalizeNumber,
  normalizeDurationText,
  parseDurationFr,
  evaluateQuestion,
  evaluateTest
};
