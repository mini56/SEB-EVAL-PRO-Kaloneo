(function () {
  'use strict';

  const STORAGE_KEY = 'seb_kaltest_pilot2_onboarding_v1';
  const DEFAULT_STATE = Object.freeze({
    housePlaced:false,
    carPlaced:false,
    chronoTested:false,
    chronoSeconds:0,
    calculatorTested:false,
    audioPlayed:false,
    audioHeard:false
  });

  let state = readState();
  let chronoController = null;

  function byId(id) {
    return document.getElementById(id);
  }

  function readState() {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
      return parsed && typeof parsed === 'object'
        ? Object.assign({}, DEFAULT_STATE, parsed)
        : Object.assign({}, DEFAULT_STATE);
    } catch (_) {
      return Object.assign({}, DEFAULT_STATE);
    }
  }

  function persist() {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    try { window.sebEvalPro?.save?.(); } catch (_) {}
  }

  function setStatus(id, text, ok) {
    const el = byId(id);
    if (!el) return;
    el.textContent = text;
    el.classList.toggle('ok', Boolean(ok));
  }

  function sceneGeometry(element, target) {
    const scene = byId('pilot2-mouse-scene');
    if (!scene || !element || !target) return null;
    const sr = scene.getBoundingClientRect();
    const er = element.getBoundingClientRect();
    const tr = target.getBoundingClientRect();
    return { scene, sr, er, tr };
  }

  function moveToTarget(element, target) {
    const geometry = sceneGeometry(element, target);
    if (!geometry) return false;
    const { sr, er, tr } = geometry;
    const left = tr.left - sr.left + (tr.width - er.width) / 2;
    const top = tr.top - sr.top + (tr.height - er.height) / 2;
    element.style.left = Math.round(left) + 'px';
    element.style.top = Math.round(top) + 'px';
    element.style.right = 'auto';
    element.style.bottom = 'auto';
    return true;
  }

  function centerInside(rect, targetRect) {
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const tolerance = 12;
    return x >= targetRect.left - tolerance &&
      x <= targetRect.right + tolerance &&
      y >= targetRect.top - tolerance &&
      y <= targetRect.bottom + tolerance;
  }

  function updateMouseStatus() {
    setStatus(
      'pilot2-house-status',
      state.housePlaced ? 'Maison bien placée ✓' : 'Maison à placer',
      state.housePlaced
    );
    setStatus(
      'pilot2-car-status',
      state.carPlaced ? 'Voiture bien placée ✓' : 'Voiture à placer',
      state.carPlaced
    );
  }

  function installDrag(objectId, targetId, stateKey) {
    const object = byId(objectId);
    const target = byId(targetId);
    const scene = byId('pilot2-mouse-scene');
    if (!object || !target || !scene) return;

    let dragging = false;
    let pointerId = null;
    let offsetX = 0;
    let offsetY = 0;
    let origin = null;

    function rememberOrigin() {
      const sr = scene.getBoundingClientRect();
      const er = object.getBoundingClientRect();
      return {
        left: er.left - sr.left,
        top: er.top - sr.top
      };
    }

    object.addEventListener('pointerdown', (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      const sr = scene.getBoundingClientRect();
      const er = object.getBoundingClientRect();
      dragging = true;
      pointerId = event.pointerId;
      origin = rememberOrigin();
      offsetX = event.clientX - er.left;
      offsetY = event.clientY - er.top;
      object.style.left = Math.round(er.left - sr.left) + 'px';
      object.style.top = Math.round(er.top - sr.top) + 'px';
      object.style.right = 'auto';
      object.style.bottom = 'auto';
      try { object.setPointerCapture(pointerId); } catch (_) {}
      event.preventDefault();
    });

    object.addEventListener('pointermove', (event) => {
      if (!dragging || (pointerId !== null && event.pointerId !== pointerId)) return;
      const sr = scene.getBoundingClientRect();
      const er = object.getBoundingClientRect();
      const maxLeft = Math.max(0, sr.width - er.width);
      const maxTop = Math.max(0, sr.height - er.height);
      const left = Math.min(Math.max(0, event.clientX - sr.left - offsetX), maxLeft);
      const top = Math.min(Math.max(0, event.clientY - sr.top - offsetY), maxTop);
      object.style.left = Math.round(left) + 'px';
      object.style.top = Math.round(top) + 'px';
    });

    function finish(event) {
      if (!dragging) return;
      if (event && pointerId !== null && event.pointerId !== pointerId) return;
      dragging = false;
      try { object.releasePointerCapture(pointerId); } catch (_) {}
      pointerId = null;

      const er = object.getBoundingClientRect();
      const tr = target.getBoundingClientRect();
      const success = centerInside(er, tr);

      if (success) {
        moveToTarget(object, target);
        state[stateKey] = true;
      } else {
        state[stateKey] = false;
        if (origin) {
          object.style.left = Math.round(origin.left) + 'px';
          object.style.top = Math.round(origin.top) + 'px';
        }
      }
      updateMouseStatus();
      persist();
    }

    object.addEventListener('pointerup', finish);
    object.addEventListener('pointercancel', finish);
    object.addEventListener('keydown', (event) => {
      if (!['Enter',' '].includes(event.key)) return;
      event.preventDefault();
      moveToTarget(object, target);
      state[stateKey] = true;
      updateMouseStatus();
      persist();
    });
  }

  function renderChrono() {
    const min = byId('pilot2-chrono-min');
    const sec = byId('pilot2-chrono-sec');
    if (min) min.textContent = String(Math.floor(state.chronoSeconds / 60)).padStart(2, '0');
    if (sec) sec.textContent = String(state.chronoSeconds % 60).padStart(2, '0');
  }

  function installChronoController() {
    if (!window.KaloneoChrono?.create) {
      throw new Error('Chronomètre commun KALONÉO indisponible.');
    }
    if (chronoController?.destroy) chronoController.destroy();
    chronoController = window.KaloneoChrono.create({
      startButton: 'pilot2-chrono-start',
      stopButton: 'pilot2-chrono-stop',
      initialSeconds: state.chronoSeconds,
      resetOnStart: true,
      intervalMs: 250,
      onRender(seconds) {
        state.chronoSeconds = seconds;
        renderChrono();
      },
      onStart() {
        const status = byId('pilot2-chrono-status');
        if (status) status.textContent = 'Compteur en cours…';
      },
      onStop(seconds) {
        state.chronoSeconds = seconds;
        state.chronoTested = true;
        const status = byId('pilot2-chrono-status');
        if (status) status.textContent = 'Compteur testé ✓';
        persist();
      }
    });
    return chronoController;
  }

  function startChrono() {
    return chronoController ? chronoController.start() : false;
  }

  function stopChrono() {
    return chronoController ? chronoController.stop() : false;
  }

  function playTestTone() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) throw new Error('Audio indisponible');
      const context = new AudioContextClass();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 523.25;
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.45);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.47);
      oscillator.addEventListener('ended', () => {
        try { context.close(); } catch (_) {}
      }, { once:true });
      state.audioPlayed = true;
      const status = byId('pilot2-audio-status');
      if (status) status.textContent = 'Son joué. Cochez « Son entendu » si vous l’avez entendu.';
      persist();
      return true;
    } catch (_) {
      const status = byId('pilot2-audio-status');
      if (status) status.textContent = 'Le son de test n’a pas pu être joué.';
      return false;
    }
  }

  function restore() {
    updateMouseStatus();
    renderChrono();

    if (state.housePlaced) moveToTarget(byId('pilot2-drag-house'), byId('pilot2-house-target'));
    if (state.carPlaced) moveToTarget(byId('pilot2-drag-car'), byId('pilot2-car-target'));

    if (state.chronoTested) {
      const status = byId('pilot2-chrono-status');
      if (status) status.textContent = 'Chronomètre testé ✓';
    }
    if (state.calculatorTested) {
      const status = byId('pilot2-calculator-status');
      if (status) status.textContent = 'Calculatrice ouverte ✓';
    }

    const heard = byId('pilot2-audio-heard');
    if (heard) heard.checked = Boolean(state.audioHeard);
    if (state.audioHeard) {
      const status = byId('pilot2-audio-status');
      if (status) status.textContent = 'Son entendu ✓';
    }
  }

  function install() {
    installDrag('pilot2-drag-house', 'pilot2-house-target', 'housePlaced');
    installDrag('pilot2-drag-car', 'pilot2-car-target', 'carPlaced');

    installChronoController();

    byId('pilot2-calculator-test-open')?.addEventListener('click', () => {
      state.calculatorTested = true;
      const status = byId('pilot2-calculator-status');
      if (status) status.textContent = 'Calculatrice ouverte ✓';
      persist();
    });

    byId('pilot2-audio-play')?.addEventListener('click', playTestTone);
    byId('pilot2-audio-heard')?.addEventListener('change', (event) => {
      state.audioHeard = Boolean(event.target.checked);
      const status = byId('pilot2-audio-status');
      if (status) status.textContent = state.audioHeard ? 'Son entendu ✓' : (state.audioPlayed ? 'Son joué.' : '');
      persist();
    });

    window.addEventListener('resize', () => {
      if (state.housePlaced) moveToTarget(byId('pilot2-drag-house'), byId('pilot2-house-target'));
      if (state.carPlaced) moveToTarget(byId('pilot2-drag-car'), byId('pilot2-car-target'));
    });

    restore();
    if (chronoController) chronoController.setSeconds(state.chronoSeconds);
  }

  window.sebPilot2Onboarding = Object.freeze({
    startChrono,
    stopChrono,
    playTestTone,
    placeHouse() {
      const ok = moveToTarget(byId('pilot2-drag-house'), byId('pilot2-house-target'));
      if (ok) {
        state.housePlaced = true;
        updateMouseStatus();
        persist();
      }
      return ok;
    },
    placeCar() {
      const ok = moveToTarget(byId('pilot2-drag-car'), byId('pilot2-car-target'));
      if (ok) {
        state.carPlaced = true;
        updateMouseStatus();
        persist();
      }
      return ok;
    },
    get state() {
      return JSON.parse(JSON.stringify(state));
    }
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once:true });
  else install();
})();
