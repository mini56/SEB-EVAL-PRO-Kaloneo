(function () {
  'use strict';

  const KEY = 'seb_kaltest_pilot2_intro_video_played_v1';
  const DURATION_MS = 7000;
  let timer = null;

  function hasPlayed() {
    try { return sessionStorage.getItem(KEY) === '1'; } catch (_) { return false; }
  }

  function markPlayed() {
    try { sessionStorage.setItem(KEY, '1'); } catch (_) {}
    try { window.sebEvalPro?.save?.(); } catch (_) {}
  }

  function finish(scene) {
    if (!scene) return;
    scene.classList.remove('seb-video-playing');
    scene.classList.add('seb-video-finished');
    scene.dataset.playState = 'finished';
    if (timer) clearTimeout(timer);
    timer = null;
  }

  function playOnce() {
    const page = document.getElementById('page-intro');
    const scene = document.getElementById('pilot2-intro-video');
    if (!page || !scene || !page.classList.contains('visible')) return false;

    if (scene.dataset.playState === 'playing' || scene.dataset.playState === 'finished') return false;

    if (hasPlayed()) {
      finish(scene);
      return false;
    }

    markPlayed();
    scene.classList.remove('seb-video-finished');
    scene.classList.add('seb-video-playing');
    scene.dataset.playState = 'playing';

    timer = setTimeout(() => finish(scene), DURATION_MS);
    return true;
  }

  function install() {
    const page = document.getElementById('page-intro');
    const scene = document.getElementById('pilot2-intro-video');
    if (!page || !scene) return;

    const observer = new MutationObserver(() => {
      if (page.classList.contains('visible')) {
        setTimeout(playOnce, 0);
      }
    });
    observer.observe(page, { attributes:true, attributeFilter:['class'] });

    if (page.classList.contains('visible')) requestAnimationFrame(playOnce);
  }

  window.sebPilot2IntroVideo = Object.freeze({
    playOnce,
    finish() { finish(document.getElementById('pilot2-intro-video')); },
    get played() { return hasPlayed(); }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once:true });
  } else {
    install();
  }
})();