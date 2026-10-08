(function () {
  'use strict';

  const SOLUTION = Object.freeze([
    Object.freeze([4, 3, 1, 2]),
    Object.freeze([2, 4, 3, 1]),
    Object.freeze([3, 1, 2, 4]),
    Object.freeze([1, 2, 4, 3])
  ]);

  const EMBEDDED = new URLSearchParams(window.location.search || '').get('kaltestEmbed') === '1';
  const SHOW_CORRECTIONS = new URLSearchParams(window.location.search || '').get('showCorrections') === '1';

  let errorCount = 0;
  let isValidated = false;

  function postToKaltest(type, detail = {}) {
    if (!EMBEDDED || window.parent === window) return;
    try {
      window.parent.postMessage({
        source:'seb-kaltest-legacy',
        testId:'gratte_ciel',
        type,
        ...detail
      }, '*');
    } catch (_) {}
  }

  function questionId(row, col) {
    return 'gratte_r' + (row + 1) + 'c' + (col + 1);
  }

  function collectAnswers() {
    const answers = {};
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        answers[questionId(row, col)] = String(cellAt(row, col)?.value || '');
      }
    }
    return answers;
  }

  function cellAt(row, col) {
    return document.querySelector('[data-row="' + row + '"][data-col="' + col + '"]');
  }

  function getGrid() {
    const grid = [];
    for (let row = 0; row < 4; row += 1) {
      grid[row] = [];
      for (let col = 0; col < 4; col += 1) {
        const cell = cellAt(row, col);
        grid[row][col] = cell && cell.value ? parseInt(cell.value, 10) : 0;
      }
    }
    return grid;
  }

  function saveResult(errors) {
    const score = 16 - errors;
    sessionStorage.setItem('puzzleErrors', String(errors));
    sessionStorage.setItem('carre_magique_score', String(score));
    sessionStorage.setItem('carre_magique_erreurs', String(errors));
    if (window.sebEvalPro?.save) window.sebEvalPro.save();
    console.log('✅ Carré magique sauvegardé :', { score, erreurs:errors });
    return { score, erreurs:errors };
  }

  function lockAfterValidation() {
    // SEB_CARRE_LOCK95 : aucune seconde tentative après affichage des réponses.
    document.querySelectorAll('.cell').forEach((cell) => { cell.disabled = true; });
    const resetButton = document.querySelector('.btn-reset');
    if (resetButton) {
      resetButton.disabled = true;
      resetButton.style.display = 'none';
    }
    const validateButton = document.getElementById('btnValidate');
    if (validateButton) {
      validateButton.disabled = true;
      validateButton.style.display = 'none';
    }
    document.getElementById('btnNext')?.classList.add('show');
  }

  function validatePuzzle() {
    if (isValidated) return saveResult(errorCount);

    errorCount = 0;
    document.querySelectorAll('.cell').forEach((cell) => {
      const row = parseInt(cell.dataset.row, 10);
      const col = parseInt(cell.dataset.col, 10);
      const userValue = cell.value ? parseInt(cell.value, 10) : 0;
      cell.classList.remove('correct-answer', 'wrong-answer');
      const correct = userValue === SOLUTION[row][col];
      if (!correct) errorCount += 1;
      if (!EMBEDDED || SHOW_CORRECTIONS) {
        cell.classList.add(correct ? 'correct-answer' : 'wrong-answer');
      }
    });

    const result = saveResult(errorCount);
    isValidated = true;
    lockAfterValidation();
    if (EMBEDDED) postToKaltest('action', { action:'validate', answers:collectAnswers() });
    return result;
  }

  function resetPuzzle() {
    if (isValidated) return;
    document.querySelectorAll('.cell').forEach((cell) => {
      cell.value = '';
      cell.disabled = false;
      cell.classList.remove('correct-answer', 'wrong-answer');
    });
    errorCount = 0;
    document.getElementById('btnValidate')?.style.removeProperty('display');
    document.getElementById('btnNext')?.classList.remove('show');
    if (EMBEDDED) postToKaltest('puzzle-reset');
  }

  function showSolution() {
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        const cell = cellAt(row, col);
        if (cell) cell.value = String(SOLUTION[row][col]);
      }
    }
  }

  function navigateNext() {
    if (EMBEDDED) {
      postToKaltest('action', { action:'advance', answers:collectAnswers() });
      return;
    }
    if (!window.sebParcours?.goNext) throw new Error('Registre de parcours indisponible.');
    window.sebParcours.goNext('carre');
  }

  function installCellBehaviour() {
    document.querySelectorAll('.cell').forEach((cell) => {
      cell.addEventListener('input', (event) => {
        const value = event.target.value;
        if (value && (value < '1' || value > '4')) event.target.value = '';
        if (EMBEDDED) {
          const row = parseInt(event.target.dataset.row, 10);
          const col = parseInt(event.target.dataset.col, 10);
          postToKaltest('puzzle-answer', {
            questionId:questionId(row, col),
            value:String(event.target.value || '')
          });
        }
      });
      cell.addEventListener('keydown', function (event) {
        const row = parseInt(this.dataset.row, 10);
        const col = parseInt(this.dataset.col, 10);
        let newRow = row;
        let newCol = col;
        if (event.key === 'ArrowUp' && row > 0) newRow -= 1;
        else if (event.key === 'ArrowDown' && row < 3) newRow += 1;
        else if (event.key === 'ArrowLeft' && col > 0) newCol -= 1;
        else if (event.key === 'ArrowRight' && col < 3) newCol += 1;
        else return;
        event.preventDefault();
        cellAt(newRow, newCol)?.focus();
      });
    });
  }

  function applyEmbeddedState(message) {
    const answers = message?.answers && typeof message.answers === 'object' ? message.answers : {};
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        const cell = cellAt(row, col);
        if (!cell) continue;
        const value = String(answers[questionId(row, col)] || '');
        cell.value = /^[1-4]$/.test(value) ? value : '';
        cell.disabled = false;
        cell.classList.remove('correct-answer','wrong-answer');
      }
    }

    isValidated = String(message?.status || '') === 'COMPLETED';
    const resetButton = document.querySelector('.btn-reset');
    const validateButton = document.getElementById('btnValidate');
    const nextButton = document.getElementById('btnNext');

    if (isValidated) {
      if (SHOW_CORRECTIONS) {
        errorCount = 0;
        document.querySelectorAll('.cell').forEach(cell => {
          const row = parseInt(cell.dataset.row, 10);
          const col = parseInt(cell.dataset.col, 10);
          const correct = parseInt(cell.value || '0', 10) === SOLUTION[row][col];
          cell.classList.add(correct ? 'correct-answer' : 'wrong-answer');
          if (!correct) errorCount += 1;
        });
      }
      lockAfterValidation();
      return;
    }

    if (resetButton) {
      resetButton.disabled = false;
      resetButton.style.removeProperty('display');
    }
    if (validateButton) {
      validateButton.disabled = false;
      validateButton.style.removeProperty('display');
      validateButton.textContent = SHOW_CORRECTIONS ? '✔️ Valider' : '➡️ Suivant';
    }
    nextButton?.classList.remove('show');
  }

  function installEmbeddedBridge() {
    if (!EMBEDDED) return;
    window.addEventListener('message', event => {
      const message = event.data;
      if (!message || message.source !== 'seb-kaltest-host' || message.type !== 'restore' || message.testId !== 'gratte_ciel') return;
      applyEmbeddedState(message);
    });
    postToKaltest('ready');
  }

  function install() {
    // Comportement historique conservé : cette donnée d'affichage est recalculée
    // à chaque nouvelle entrée dans l'exercice.
    sessionStorage.removeItem('puzzleErrors');

    installCellBehaviour();
    document.querySelector('.btn-reset')?.addEventListener('click', resetPuzzle);
    if (EMBEDDED && !SHOW_CORRECTIONS) {
      const validateButton = document.getElementById('btnValidate');
      if (validateButton) validateButton.textContent = '➡️ Suivant';
      validateButton?.addEventListener('click', navigateNext);
    } else {
      document.getElementById('btnValidate')?.addEventListener('click', validatePuzzle);
    }
    document.getElementById('btnNext')?.addEventListener('click', navigateNext);
    installEmbeddedBridge();
  }

  const api = Object.freeze({
    solution:SOLUTION,
    getGrid,
    validatePuzzle,
    resetPuzzle,
    showSolution,
    navigateNext,
    saveResult
  });
  window.sebCarre = api;

  // Compatibilité transitoire avec les couches historiques.
  window.validate = validatePuzzle;
  window.reset = resetPuzzle;
  window.showSolution = showSolution;
  window.goToNextPage = navigateNext;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once:true });
  else install();
})();
