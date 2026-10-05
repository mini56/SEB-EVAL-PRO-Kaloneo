'use strict';

(function(){
  function ready() {
    const button = document.getElementById('close-tests-parcours');
    const builder = document.getElementById('open-kaloneo-builder');
    const parcoursBuilder = document.getElementById('open-parcours-builder');
    if (!button) return;

    if (builder) {
      builder.addEventListener('click', () => {
        window.location.href = 'kaloneo-builder/test-builder.html';
      });
    }

    if (parcoursBuilder) {
      parcoursBuilder.addEventListener('click', () => {
        window.location.href = 'admin-parcours-builder.html';
      });
    }

    button.addEventListener('click', async () => {
      if (button.disabled) return;
      button.disabled = true;
      try {
        const ok = await window.sebEvalPro?.closeTestsParcours?.();
        if (!ok) button.disabled = false;
      } catch (_) {
        button.disabled = false;
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ready, { once:true });
  } else {
    ready();
  }
})();
