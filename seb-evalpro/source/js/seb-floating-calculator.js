(function () {
  'use strict';

  const container = document.getElementById('calc-container');
  const display = document.getElementById('calc-display');
  if (!container || !display) return;

  let tokens = [];
  let current = '';
  let justEvaluated = false;
  let errorState = false;

  function render(value) {
    display.textContent = value;
  }

  function reset(renderZero = true) {
    tokens = [];
    current = '';
    justEvaluated = false;
    errorState = false;
    if (renderZero) render('0');
  }

  function isOperator(value) {
    return ['+','-','*','/'].includes(value);
  }

  function normalizeOperator(value) {
    return value === 'x' ? '*' : value;
  }

  function formatNumber(value) {
    if (!Number.isFinite(value)) return 'ERR';
    if (Object.is(value, -0) || Math.abs(value) < 1e-12) return '0';
    return String(Number.parseFloat(value.toPrecision(12)));
  }

  function calculate(source) {
    if (!Array.isArray(source) || source.length === 0) return NaN;
    const list = source.slice();
    const firstPass = [list[0]];

    for (let i = 1; i < list.length; i += 2) {
      const op = list[i];
      const value = list[i + 1];
      if (typeof value !== 'number' || !Number.isFinite(value)) return NaN;

      if (op === '*' || op === '/') {
        const left = firstPass.pop();
        const result = op === '*' ? left * value : (value === 0 ? NaN : left / value);
        if (!Number.isFinite(result)) return NaN;
        firstPass.push(result);
      } else {
        firstPass.push(op, value);
      }
    }

    let result = firstPass[0];
    for (let i = 1; i < firstPass.length; i += 2) {
      result = firstPass[i] === '+' ? result + firstPass[i + 1] : result - firstPass[i + 1];
    }
    return result;
  }

  function prepareNumberEntry() {
    if (justEvaluated || errorState) reset(false);
  }

  function inputDigit(value) {
    prepareNumberEntry();
    if (current === '' || current === '0') current = value;
    else if (current === '-0') current = '-' + value;
    else current += value;
    render(current);
  }

  function inputDecimal() {
    prepareNumberEntry();
    if (current === '') current = '0.';
    else if (current === '-') current = '-0.';
    else if (!current.includes('.')) current += '.';
    render(current);
  }

  function inputOperator(raw) {
    const op = normalizeOperator(raw);
    if (errorState) return reset();

    if (justEvaluated) {
      const previous = Number(display.textContent);
      tokens = Number.isFinite(previous) ? [previous] : [];
      current = '';
      justEvaluated = false;
    }

    if (op === '-' && current === '' && (tokens.length === 0 || isOperator(tokens[tokens.length - 1]))) {
      current = '-';
      render('-');
      return;
    }

    if (current !== '' && current !== '-') {
      const value = Number(current);
      if (!Number.isFinite(value)) return;
      tokens.push(value);
      current = '';
    } else if (current === '-') {
      return;
    }

    if (!tokens.length) return;
    if (isOperator(tokens[tokens.length - 1])) tokens[tokens.length - 1] = op;
    else tokens.push(op);
  }

  function evaluate() {
    if (errorState) return reset();

    if (current !== '' && current !== '-') {
      const value = Number(current);
      if (!Number.isFinite(value)) return;
      tokens.push(value);
      current = '';
    }

    if (!tokens.length) return;
    if (isOperator(tokens[tokens.length - 1])) tokens.pop();
    if (!tokens.length) return;

    const result = calculate(tokens);
    const text = formatNumber(result);
    render(text);
    tokens = [];

    if (text === 'ERR') {
      current = '';
      errorState = true;
      justEvaluated = false;
      return;
    }

    current = text;
    justEvaluated = true;
  }

  container.addEventListener('click', function (event) {
    const button = event.target.closest('.calc-btn');
    if (!button) return;
    const value = String(button.textContent || '').trim();

    if (/^\d$/.test(value)) return inputDigit(value);
    if (value === '.') return inputDecimal();
    if (['+','-','/','x'].includes(value)) return inputOperator(value);
    if (value === '=') return evaluate();
    if (value === 'C') return reset();
  }, true);

  document.getElementById('close')?.addEventListener('click', function () {
    container.style.display = 'none';
  });

  window.openCalculator = function () {
    container.style.display = 'block';
    reset();
    requestAnimationFrame(placeInitial);
  };

  let dragbar = container.querySelector('.seb-calc-dragbar');
  if (!dragbar) {
    dragbar = document.createElement('div');
    dragbar.className = 'seb-calc-dragbar';
    dragbar.innerHTML = '<span>Calculatrice</span><span class="seb-calc-grip" aria-hidden="true">•••</span>';
    container.insertBefore(dragbar, container.firstChild);
  }

  let brand = container.querySelector('.seb-calc-brand');
  if (!brand) {
    brand = document.createElement('div');
    brand.className = 'seb-calc-brand';
    brand.textContent = 'Sauvegarde 56';
    container.appendChild(brand);
  }

  function setPosition(left, top) {
    const margin = 10;
    const rect = container.getBoundingClientRect();
    const maxLeft = Math.max(margin, window.innerWidth - (rect.width || 258) - margin);
    const maxTop = Math.max(margin, window.innerHeight - (rect.height || 360) - margin);
    const x = Math.min(Math.max(margin, left), maxLeft);
    const y = Math.min(Math.max(margin, top), maxTop);
    container.style.setProperty('left', x + 'px', 'important');
    container.style.setProperty('top', y + 'px', 'important');
    container.style.setProperty('right', 'auto', 'important');
    container.style.setProperty('bottom', 'auto', 'important');
  }

  function placeInitial() {
    if (container.dataset.sebPositioned === '1') return;
    const rect = container.getBoundingClientRect();
    const left = Math.round(window.innerWidth * .72 - (rect.width || 258) / 2);
    const top = Math.round((window.innerHeight - (rect.height || 360)) / 2);
    setPosition(left, top);
    container.dataset.sebPositioned = '1';
  }

  let dragging = false;
  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;

  dragbar.addEventListener('pointerdown', function (event) {
    if (event.button !== undefined && event.button !== 0) return;
    const rect = container.getBoundingClientRect();
    dragging = true;
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    startLeft = rect.left;
    startTop = rect.top;
    try { dragbar.setPointerCapture(pointerId); } catch (_) {}
    event.preventDefault();
  });

  dragbar.addEventListener('pointermove', function (event) {
    if (!dragging || (pointerId !== null && event.pointerId !== pointerId)) return;
    setPosition(startLeft + event.clientX - startX, startTop + event.clientY - startY);
  });

  function stopDrag(event) {
    if (!dragging) return;
    if (event && pointerId !== null && event.pointerId !== pointerId) return;
    dragging = false;
    try { dragbar.releasePointerCapture(pointerId); } catch (_) {}
    pointerId = null;
  }

  dragbar.addEventListener('pointerup', stopDrag);
  dragbar.addEventListener('pointercancel', stopDrag);

  document.addEventListener('click', function (event) {
    const button = event.target.closest('[data-seb-action="open-calculator"]');
    if (!button) return;
    event.preventDefault();
    window.openCalculator();
  });
})();
