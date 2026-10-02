'use strict';

(function(){
  function ready() {
    const button = document.getElementById('close-tests-parcours');
    if (!button) return;

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
