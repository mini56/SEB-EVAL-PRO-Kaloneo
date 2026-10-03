(function () {
  'use strict';

  function toElement(value) {
    if (!value) return null;
    if (typeof value === 'string') return document.getElementById(value);
    return value;
  }

  function normalizeSeconds(value) {
    const seconds = Number(value);
    if (!Number.isFinite(seconds) || seconds < 0) return 0;
    return Math.floor(seconds);
  }

  function format(seconds) {
    const value = normalizeSeconds(seconds);
    return String(Math.floor(value / 60)).padStart(2, '0') + ':' + String(value % 60).padStart(2, '0');
  }

  function create(options) {
    const config = options || {};
    const startButton = toElement(config.startButton);
    const stopButton = toElement(config.stopButton);
    const intervalMs = Math.max(100, Number(config.intervalMs) || 250);

    let seconds = normalizeSeconds(config.initialSeconds);
    let baseSeconds = seconds;
    let startedAt = 0;
    let interval = null;

    function isRunning() {
      return interval !== null;
    }

    function updateButtons() {
      if (startButton) startButton.disabled = isRunning();
      if (stopButton) stopButton.disabled = !isRunning();
    }

    function render() {
      if (typeof config.onRender === 'function') {
        config.onRender(seconds, format(seconds));
      }
    }

    function tick() {
      if (!isRunning()) return seconds;
      seconds = baseSeconds + Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
      render();
      if (typeof config.onTick === 'function') config.onTick(seconds);
      return seconds;
    }

    function start() {
      if (isRunning()) return false;
      if (config.resetOnStart) seconds = 0;
      baseSeconds = seconds;
      startedAt = Date.now();
      interval = setInterval(tick, intervalMs);
      render();
      updateButtons();
      if (typeof config.onStart === 'function') config.onStart(seconds);
      return true;
    }

    function stop() {
      if (!isRunning()) return false;
      tick();
      clearInterval(interval);
      interval = null;
      baseSeconds = seconds;
      startedAt = 0;
      updateButtons();
      if (typeof config.onStop === 'function') config.onStop(seconds);
      return true;
    }

    function setSeconds(value) {
      seconds = normalizeSeconds(value);
      baseSeconds = seconds;
      if (isRunning()) startedAt = Date.now();
      render();
      return seconds;
    }

    function destroy() {
      if (interval !== null) clearInterval(interval);
      interval = null;
      startedAt = 0;
      if (startButton) startButton.removeEventListener('click', start);
      if (stopButton) stopButton.removeEventListener('click', stop);
      updateButtons();
    }

    if (config.bindButtons !== false) {
      if (startButton) startButton.addEventListener('click', start);
      if (stopButton) stopButton.addEventListener('click', stop);
    }

    updateButtons();
    render();

    return Object.freeze({
      start,
      stop,
      setSeconds,
      getSeconds: () => seconds,
      isRunning,
      format: () => format(seconds),
      destroy
    });
  }

  window.KaloneoChrono = Object.freeze({ create, format });
})();
