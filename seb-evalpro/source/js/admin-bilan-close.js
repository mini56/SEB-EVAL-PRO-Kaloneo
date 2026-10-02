'use strict';

(function(){
  function install() {
    const buttons = [
      document.getElementById('close-bilan-top'),
      document.getElementById('close-bilan-bottom')
    ].filter(Boolean);
    if (!buttons.length) return;

    let closing = false;

    const setDisabled = (value) => {
      buttons.forEach((button) => { button.disabled = !!value; });
    };

    const setStatus = (message) => {
      const status = document.getElementById('status');
      if (status) status.textContent = String(message || '');
    };

    const closeBilan = async () => {
      if (closing) return;
      closing = true;
      setDisabled(true);
      setStatus('Fermeture du bilan…');
      try {
        const result = await window.sebEvalPro?.closeAdminBilan?.();
        if (!result || result.ok !== true) {
          setStatus((result && result.error) || 'Impossible de fermer le bilan.');
          closing = false;
          setDisabled(false);
        }
      } catch (error) {
        setStatus(String(error && error.message ? error.message : error));
        closing = false;
        setDisabled(false);
      }
    };

    buttons.forEach((button) => button.addEventListener('click', closeBilan));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once:true });
  } else {
    install();
  }
})();
