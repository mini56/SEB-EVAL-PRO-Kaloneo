(function () {
  'use strict';

  const ABANDON_KEY = 'seb_evalpro_abandons';
  const EXERCISE_FILES = new Set([
    'brique.html',
    'stock.html',
    'planning.html',
    'genrenombres.html',
    'dictee.html',
    'tri_de_cheville.html',
    'nwtexte.html',
    'nvmail.html',
    'paronymes.html',
    'carre.html'
  ]);

  const NEXT_BY_FILE = {
    'brique.html': 'stock.html',
    'stock.html': 'planning.html',
    'planning.html': 'genrenombres.html',
    'genrenombres.html': 'dictee.html',
    'dictee.html': 'tri_de_cheville.html',
    'tri_de_cheville.html': 'nwtexte.html',
    'nwtexte.html': 'nvmail.html',
    'nvmail.html': 'autoeval2.html',
    'paronymes.html': 'carre.html',
    'carre.html': 'qcmv1.0.html?page=11#page11'
  };

  const EXERCISE_LABELS = {
    'brique.html': 'Construction à base de briques',
    'stock.html': 'Gestion logistique — Ranger le stock produit',
    'planning.html': 'Planification — Le restaurant',
    'genrenombres.html': 'Genre et nombre',
    'dictee.html': 'Dictée',
    'tri_de_cheville.html': 'Tri de chevilles',
    'nwtexte.html': 'Traitement de texte',
    'nvmail.html': 'Messagerie électronique',
    'paronymes.html': 'Paronymes',
    'carre.html': 'Carré magique / Puzzle Gratte-ciel'
  };

  const QCM_LABELS = {
    page1: 'Exercice QCM',
    page2: 'Calculs',
    page2_1: 'Calculs — suite',
    page3: 'Réception / contrôle',
    page4: 'Fractions',
    page5: 'Ordonnancement',
    page5_1: 'Postures',
    page6: 'Conversions',
    pageTexteTrous: 'Texte à trous',
    page8: 'Messagerie',
    page9: 'Exercice QCM',
    page10: 'Exercice QCM',
    page11: 'Exercice QCM'
  };

  const QCM_EXCLUDED = new Set(['page0', 'pageFinale', 'bilanPage']);
  const QCM_EXERCISE_IDS = new Set(['page2','page2_1','page3','page4','page5','page5_1','page6','pageTexteTrous','page8']);
  let mutationScheduled = false;

  function pageName() {
    try {
      return decodeURIComponent((window.location.pathname.split('/').pop() || '').toLowerCase());
    } catch (_) {
      return '';
    }
  }

  function cleanText(value) {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .replace(/^[\s\u00a0]+|[\s\u00a0]+$/g, '');
  }

  function stripActionIcon(value) {
    return cleanText(value)
      .replace(/^(?:➡️|➡|➜|→|←|✓|✔|🔍|📊|🧮|💾|✉️|✉|📧|▶️|▶|⏹️|⏹|■|✕|❌|📂|⬇️|⬇)\s*/u, '')
      .replace(/\s*(?:->|→|➜)\s*$/u, '')
      .trim();
  }

  function ensureStyles() {
    if (document.getElementById('seb-evalpro-unified-buttons-style')) return;
    const style = document.createElement('style');
    style.id = 'seb-evalpro-unified-buttons-style';
    style.textContent = `
      .seb-action-btn{
        --seb-button-color:#004E70;
        min-height:42px!important;
        padding:10px 20px!important;
        border:1.5px solid var(--seb-button-color)!important;
        border-radius:10px!important;
        color:var(--seb-button-color)!important;
        background:linear-gradient(180deg,rgba(255,255,255,.96) 0%,rgba(245,248,252,.84) 100%)!important;
        font-family:Calibri,"Segoe UI",Arial,sans-serif!important;
        font-size:16px!important;
        font-weight:700!important;
        line-height:1.15!important;
        display:inline-flex!important;
        align-items:center!important;
        justify-content:center!important;
        gap:7px!important;
        box-sizing:border-box!important;
        cursor:pointer!important;
        text-decoration:none!important;
        box-shadow:0 4px 10px rgba(0,0,0,.12),inset 0 1px 0 rgba(255,255,255,.98)!important;
        transition:transform .15s ease,box-shadow .15s ease,background .15s ease!important;
        vertical-align:middle!important;
      }
      .seb-action-btn:hover:not(:disabled){
        transform:translateY(-1px)!important;
        background:linear-gradient(180deg,#fff 0%,rgba(240,244,249,.92) 100%)!important;
        box-shadow:0 7px 16px rgba(0,0,0,.16),inset 0 1px 0 #fff!important;
      }
      .seb-action-btn:active:not(:disabled){
        transform:translateY(1px)!important;
        box-shadow:0 2px 5px rgba(0,0,0,.14),inset 0 1px 2px rgba(0,0,0,.06)!important;
      }
      .seb-action-btn:disabled{opacity:.45!important;cursor:default!important;transform:none!important}
      .seb-btn-nav{--seb-button-color:#198754}
      .seb-btn-confirm,.seb-btn-tool,.seb-btn-functional{--seb-button-color:#004E70}
      .seb-btn-calculator{--seb-button-color:#F9B233}
      .seb-btn-danger{--seb-button-color:#C62828}
      .seb-btn-timer-start{--seb-button-color:#198754}
      .seb-btn-timer-stop{--seb-button-color:#C62828}
      .seb-action-btn.seb-btn-solid{
        color:#fff!important;
        border-color:var(--seb-button-color)!important;
        box-shadow:0 4px 10px rgba(0,0,0,.16),inset 0 1px 0 rgba(255,255,255,.30)!important;
      }
      .seb-action-btn.seb-btn-solid.seb-btn-timer-start{
        background:linear-gradient(180deg,#28a866 0%,#198754 100%)!important;
      }
      .seb-action-btn.seb-btn-solid.seb-btn-timer-stop{
        background:linear-gradient(180deg,#df4444 0%,#C62828 100%)!important;
      }
      .seb-action-btn.seb-btn-solid.seb-btn-timer-start:hover:not(:disabled){
        background:linear-gradient(180deg,#34b572 0%,#16794c 100%)!important;
      }
      .seb-action-btn.seb-btn-solid.seb-btn-timer-stop:hover:not(:disabled){
        background:linear-gradient(180deg,#e65656 0%,#ad2020 100%)!important;
      }
      .seb-action-btn.seb-btn-solid:disabled{opacity:.55!important}
      #seb-evalpro-abandon-fixed{
        position:fixed!important;
        left:16px!important;
        bottom:16px!important;
        z-index:2147483000!important;
        min-width:220px!important;
      }
      #seb-evalpro-abandon-layer{
        position:fixed;
        inset:0;
        z-index:2147483647;
        background:rgba(0,0,0,.46);
        display:flex;
        align-items:center;
        justify-content:center;
        padding:20px;
        box-sizing:border-box;
        font-family:Calibri,"Segoe UI",Arial,sans-serif;
      }
      #seb-evalpro-abandon-box{
        width:min(560px,94vw);
        background:#fff;
        border:1px solid #aaa;
        border-radius:12px;
        padding:22px;
        box-shadow:0 16px 48px rgba(0,0,0,.32);
        color:#202020;
      }
      #seb-evalpro-abandon-box h2{margin:0 0 8px;color:#c62828;font-size:22px}
      #seb-evalpro-abandon-box .seb-abandon-exercise{font-weight:700;margin-bottom:14px;color:#1a3a5f}
      #seb-evalpro-abandon-box .seb-abandon-help{margin:0 0 12px;font-size:14px;line-height:1.4}
      #seb-evalpro-abandon-box .seb-abandon-choice{display:flex;align-items:flex-start;gap:10px;padding:8px 4px;font-size:15px}
      #seb-evalpro-abandon-box .seb-abandon-choice input{margin-top:2px;transform:scale(1.15)}
      #seb-evalpro-abandon-comment{width:100%;min-height:78px;margin-top:10px;padding:8px;border:1px solid #aaa;border-radius:7px;box-sizing:border-box;font:14px Calibri,"Segoe UI",Arial,sans-serif;resize:vertical}
      .seb-abandon-admin{margin-top:14px;padding:11px;border:1px solid #d7dce5;border-radius:7px;background:#f7f9fc}.seb-abandon-admin label{display:block;font-weight:700;color:#1a3a5f;margin-bottom:6px}.seb-abandon-admin small{display:block;color:#666;margin-top:5px}.seb-abandon-admin input{width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid #999;border-radius:5px;font:16px Calibri,"Segoe UI",Arial,sans-serif}
      #seb-evalpro-abandon-error{min-height:19px;margin-top:6px;color:#c62828;font-size:13px;font-weight:700}
      #seb-evalpro-abandon-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:14px}
      .seb-admin-abandon-section td{background:#f7c8c8!important;color:#7c1111!important;font-weight:700!important}
      .seb-admin-abandon-row .seb-admin-abandon-state{background:#c62828!important;color:#fff!important;text-align:center!important;font-weight:700!important;vertical-align:middle!important}
      .seb-admin-abandon-row .seb-admin-abandon-comment{white-space:pre-line!important}
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function skipButton(button) {
    return !!button.closest(
      '#toolbar,.toolbar-row2,.ql-toolbar,#calc-container,#page-identification,' +
      '#page4 .fraction-title,#page4 .items-wrapper'
    );
  }

  function buttonKind(label) {
    const value = label.toLowerCase();
    if (/abandon|supprim|effacer|réinitial|reinitial|remise à zéro|remise a zero|annuler|fermer|quitter/.test(value)) return 'danger';
    if (/calculatrice/.test(value)) return 'calculator';
    if (/^suivant|^précédent|^precedent|^retour|^page suivante|^étape suivante|^etape suivante|^continuer|^commencer|^terminez?|^terminer/.test(value)) return 'nav';
    return 'functional';
  }

  function iconizedLabel(label) {
    const clean = stripActionIcon(label);
    const value = clean.toLowerCase();
    if (/^abandon/.test(value)) return '⏹ Abandonner l’exercice';
    if (/^démarrer|^demarrer/.test(value)) return '▶ ' + clean;
    if (/^valider|^vérifier|^verifier|^compléter automatiquement|^completer automatiquement/.test(value)) return '✓ ' + clean;
    if (/^envoyer/.test(value)) return '✉ ' + clean;
    if (/calculatrice/.test(value)) return '🧮 Ouvrir la calculatrice';
    if (/^enregistrer/.test(value)) return '💾 ' + clean;
    if (/^exporter/.test(value)) return '⬇ ' + clean;
    if (/^imprimer/.test(value)) return '⬇ ' + clean;
    if (/^voir les résultats|^voir les resultats/.test(value)) return '📊 Voir les résultats';
    if (/^retour/.test(value)) return '← ' + clean;
    if (/^suivant|^page suivante|^étape suivante|^etape suivante|^continuer/.test(value)) return '➜ ' + clean;
    if (/^stop|^arrêter|^arreter/.test(value)) return '■ ' + clean;
    if (/^fermer/.test(value)) return '✕ ' + clean;
    if (/^annuler/.test(value)) return '✕ ' + clean;
    return clean;
  }

  function normalizeButton(button) {
    if (!button || button.nodeType !== 1 || skipButton(button)) return;
    if (button.id === 'seb-evalpro-abandon-fixed') return;
    const raw = cleanText(button.textContent);
    if (!raw) return;
    const label = stripActionIcon(raw);
    const explicitTimerKind = button.classList.contains('seb-btn-timer-start')
      ? 'seb-btn-timer-start'
      : (button.classList.contains('seb-btn-timer-stop') ? 'seb-btn-timer-stop' : '');
    const kind = buttonKind(label);
    const desiredKind = explicitTimerKind || ('seb-btn-' + kind);
    for (const cls of ['seb-btn-nav', 'seb-btn-confirm', 'seb-btn-tool', 'seb-btn-functional', 'seb-btn-calculator', 'seb-btn-danger', 'seb-btn-timer-start', 'seb-btn-timer-stop']) {
      if (cls !== desiredKind && button.classList.contains(cls)) button.classList.remove(cls);
    }
    if (!button.classList.contains('seb-action-btn')) button.classList.add('seb-action-btn');
    if (!button.classList.contains(desiredKind)) button.classList.add(desiredKind);
    const nextLabel = explicitTimerKind ? label : iconizedLabel(label);
    if (nextLabel && cleanText(button.textContent) !== nextLabel) button.textContent = nextLabel;
  }

  function normalizeButtons(root) {
    const scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('button').forEach(normalizeButton);
  }

  function isPassButton(button) {
    const label = stripActionIcon(button.textContent).toLowerCase();
    return /^(passer|passez)\b/.test(label) || /^abandonner\b/.test(label) || /abandonner l['’]exercice/.test(label);
  }

  function headingLabel(scope, fallback) {
    if (!scope || !scope.querySelector) return fallback;
    const node = scope.querySelector('h1,h2');
    const value = cleanText(node && node.textContent);
    if (!value) return fallback;
    return value.length > 100 ? value.slice(0, 97) + '…' : value;
  }

  function visibleQcmPage() {
    const pages = Array.from(document.querySelectorAll('.page'));
    return pages.find((page) => page.classList.contains('visible')) || null;
  }

  function currentExerciseContext() {
    const file = pageName();

    if (document.body?.dataset?.sebKaltestExercise === '1') {
      const label = cleanText(document.body.dataset.sebKaltestLabel) || headingLabel(document.body, 'Exercice KALTEST');
      const testId = cleanText(document.body.dataset.sebKaltestId) || 'kaltest';
      return {
        file,
        qcmPage: '',
        scope: document.body,
        label,
        key: file + '#kaltest:' + testId,
        dynamicKaltest: true
      };
    }

    if (file === 'qcmv1.0.html') {
      const scope = visibleQcmPage();
      if (!scope || !scope.id || !QCM_EXERCISE_IDS.has(scope.id)) return null;
      const label = QCM_LABELS[scope.id] || headingLabel(scope, 'QCM — ' + scope.id);
      return { file, qcmPage: scope.id, scope, label, key: file + '#' + scope.id };
    }
    if (!EXERCISE_FILES.has(file)) return null;
    if (file === 'brique.html' || file === 'tri_de_cheville.html') {
      const auto = document.getElementById('autoEvalPart');
      if (auto) {
        let visible = auto.classList.contains('visible');
        try { visible = visible || window.getComputedStyle(auto).display !== 'none'; } catch (_) {}
        if (visible) return null;
      }
    }
    return {
      file,
      qcmPage: '',
      scope: document.body,
      label: EXERCISE_LABELS[file] || headingLabel(document.body, file),
      key: file
    };
  }

  function hideLegacyPassButtons() {
    const file = pageName();
    if (file === 'qcmv1.0.html') {
      document.querySelectorAll('.page').forEach((scope) => {
        if (!scope.id || !QCM_EXERCISE_IDS.has(scope.id)) return;
        scope.querySelectorAll('button').forEach((button) => {
          if (button.closest('#kaloneo-common-navigation') || button.dataset.kaloneoProxyFor) return;
          if (!isPassButton(button)) return;
          button.dataset.sebLegacyPasser = '1';
          button.hidden = true;
          button.style.setProperty('display', 'none', 'important');
        });
      });
      return;
    }
    if (!EXERCISE_FILES.has(file)) return;
    document.querySelectorAll('button').forEach((button) => {
      if (button.closest('#kaloneo-common-navigation') || button.dataset.kaloneoProxyFor) return;
      if (!isPassButton(button) || button.id === 'seb-evalpro-abandon-fixed') return;
      button.dataset.sebLegacyPasser = '1';
      button.hidden = true;
      button.style.setProperty('display', 'none', 'important');
    });
  }


  function autoEvalHasResponse(form) {
    if (!form) return false;
    const checked = form.querySelector('input[type="checkbox"]:checked');
    const text = Array.from(form.querySelectorAll('textarea,input[type="text"]')).some((el) => String(el.value || '').trim() !== '');
    return !!checked || text;
  }

  function protectAutoEvaluations() {
    const form = document.getElementById('autoEvalForm');
    if (!form) return;
    const file = pageName();
    const standalone = file === 'autoeval1.html' || file === 'autoeval2.html';
    document.querySelectorAll('button').forEach((button) => {
      if (skipButton(button)) return;
      const inAuto = standalone || !!button.closest('#autoEvalPart');
      if (!inAuto) return;
      const label = stripActionIcon(button.textContent).toLowerCase();
      if (/^(passer|passez|étape suivante|etape suivante|page suivante|suivant)\b/.test(label)) {
        button.hidden = true;
        button.style.setProperty('display', 'none', 'important');
      }
    });

    if (document.documentElement.dataset.sebAutoEvalGuard === '1') return;
    document.documentElement.dataset.sebAutoEvalGuard = '1';
    document.addEventListener('click', function (event) {
      const button = event.target && event.target.closest ? event.target.closest('button') : null;
      if (!button) return;
      const currentForm = document.getElementById('autoEvalForm');
      if (!currentForm) return;
      const currentFile = pageName();
      const inStandalone = currentFile === 'autoeval1.html' || currentFile === 'autoeval2.html';
      const inIntegrated = !!button.closest('#autoEvalPart');
      if (!inStandalone && !inIntegrated) return;
      const label = stripActionIcon(button.textContent).toLowerCase();
      const validatesAuto = button.id === 'autoEvalBtn' || (/valider/.test(label) && /autoévaluation|autoevaluation/.test(label));
      if (!validatesAuto) return;
      if (autoEvalHasResponse(currentForm)) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();
      window.alert('Merci de compléter cette autoévaluation avant de continuer : cochez au moins une proposition ou saisissez un commentaire.');
    }, true);
  }

  function readAbandons() {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(ABANDON_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function saveAbandon(context, reasons, comment, nonEvaluated = false) {
    const now = new Date();
    const record = {
      key: context.key,
      page: context.file,
      qcmPage: context.qcmPage || '',
      exercice: context.label,
      raisons: reasons.slice(),
      commentaire: String(comment || '').trim(),
      nonEvaluated: Boolean(nonEvaluated),
      horodatage: now.toLocaleString('fr-FR'),
      iso: now.toISOString()
    };
    const list = readAbandons();
    const index = list.findIndex((item) => item && item.key === record.key);
    if (index >= 0) list[index] = record;
    else list.push(record);
    sessionStorage.setItem(ABANDON_KEY, JSON.stringify(list));
    if (window.sebEvalPro && typeof window.sebEvalPro.save === 'function') window.sebEvalPro.save();
    return record;
  }

  function withConfirmedNavigation(action) {
    const originalConfirm = window.confirm;
    try {
      window.confirm = function () { return true; };
      action();
    } finally {
      window.confirm = originalConfirm;
    }
  }

  function invokeQcmNext(context) {
    const legacy = context.scope.querySelector('button[data-seb-legacy-passer="1"]');
    if (legacy) {
      withConfirmedNavigation(function () { legacy.click(); });
      return true;
    }

    const candidates = Array.from(context.scope.querySelectorAll('button')).filter((button) => {
      if (button.id === 'seb-evalpro-abandon-fixed') return false;
      const value = stripActionIcon(button.textContent).toLowerCase();
      return /suivant|étape suivante|etape suivante|page suivante|continuer/.test(value);
    });

    for (const button of candidates) {
      const source = button.getAttribute('onclick') || '';
      const match = source.match(/nextPage\(\s*(['"]?)([^'"\)]+)\1\s*\)/);
      if (match && typeof window.nextPage === 'function') {
        const raw = String(match[2]).trim();
        const target = /^\d+$/.test(raw) ? Number(raw) : raw;
        window.nextPage(target);
        return true;
      }
      const go = source.match(/goToPage\(\s*['"]([^'"]+)['"]\s*\)/);
      if (go) {
        window.location.href = go[1];
        return true;
      }
    }

    if (candidates[0]) {
      withConfirmedNavigation(function () { candidates[0].click(); });
      return true;
    }
    return false;
  }

  function advanceAfterAbandon(context, record) {
    if (context.dynamicKaltest && window.sebKaltestHost && typeof window.sebKaltestHost.onAbandon === 'function') {
      window.sebKaltestHost.onAbandon(record || null);
      return;
    }

    if (context.file === 'qcmv1.0.html') {
      if (!invokeQcmNext(context)) {
        window.alert('L’abandon a bien été enregistré. Utilisez le bouton Suivant pour poursuivre.');
      }
      return;
    }
    const target = NEXT_BY_FILE[context.file];
    if (target) {
      window.location.href = target;
      return;
    }
    window.alert('L’abandon a bien été enregistré. Utilisez le bouton Suivant pour poursuivre.');
  }

  function openAbandonDialog(context) {
    if (!context || document.getElementById('seb-evalpro-abandon-layer')) return;
    const layer = document.createElement('div');
    layer.id = 'seb-evalpro-abandon-layer';
    layer.innerHTML = `
      <div id="seb-evalpro-abandon-box" role="dialog" aria-modal="true" aria-label="Abandonner l’exercice">
        <h2>Abandonner l’exercice</h2>
        <div class="seb-abandon-exercise"></div>
        <p class="seb-abandon-help">Indiquez la ou les raisons de votre abandon. Au moins une proposition doit être cochée. L’abandon doit ensuite être validé par un administrateur.</p>
        <label class="seb-abandon-choice"><input type="checkbox" data-abandon-reason="1" value="Je ne comprends pas la consigne"><span>Je ne comprends pas la consigne.</span></label>
        <label class="seb-abandon-choice"><input type="checkbox" data-abandon-reason="1" value="L’exercice est trop difficile"><span>L’exercice est trop difficile.</span></label>
        <label class="seb-abandon-choice"><input type="checkbox" data-abandon-reason="1" value="Fatigue, gêne ou douleur"><span>Je ressens de la fatigue, une gêne ou une douleur.</span></label>
        <label class="seb-abandon-choice"><input type="checkbox" data-abandon-reason="1" value="Autre raison" data-other="1"><span>Autre raison.</span></label>
        <textarea id="seb-evalpro-abandon-comment" placeholder="Précisez si nécessaire. Si vous cochez « Autre raison », indiquez ici la raison."></textarea>
        <label class="seb-abandon-choice seb-abandon-ne-choice"><input type="checkbox" id="seb-evalpro-abandon-ne" data-abandon-ne="1"><span><strong>Exercice non évalué dans le bilan</strong><br><small>Les points obtenus et le barème de cet exercice seront exclus des calculs du bilan.</small></span></label>
        <div class="seb-abandon-admin"><label for="seb-evalpro-abandon-admin-password">Validation administrateur</label><input id="seb-evalpro-abandon-admin-password" type="password" autocomplete="off" placeholder="Mot de passe administrateur"><small>L’administrateur doit valider l’abandon avant de poursuivre.</small></div>
        <div id="seb-evalpro-abandon-error" aria-live="polite"></div>
        <div id="seb-evalpro-abandon-actions">
          <button type="button" id="seb-evalpro-abandon-cancel" class="seb-action-btn seb-btn-danger">✕ Annuler</button>
          <button type="button" id="seb-evalpro-abandon-confirm" class="seb-action-btn seb-btn-danger">⏹ Confirmer l’abandon</button>
        </div>
      </div>`;
    layer.querySelector('.seb-abandon-exercise').textContent = context.label;
    document.body.appendChild(layer);

    const error = layer.querySelector('#seb-evalpro-abandon-error');
    const comment = layer.querySelector('#seb-evalpro-abandon-comment');
    const adminPassword = layer.querySelector('#seb-evalpro-abandon-admin-password');
    const close = function () { layer.remove(); };

    layer.querySelector('#seb-evalpro-abandon-cancel').addEventListener('click', close);
    layer.querySelector('#seb-evalpro-abandon-confirm').addEventListener('click', async function () {
      const checked = Array.from(layer.querySelectorAll('input[data-abandon-reason="1"]:checked'));
      const nonEvaluated = !!layer.querySelector('#seb-evalpro-abandon-ne')?.checked;
      if (checked.length === 0) {
        error.textContent = 'Cochez au moins une raison avant de confirmer.';
        return;
      }
      const otherChecked = checked.some((input) => input.dataset.other === '1');
      if (otherChecked && !comment.value.trim()) {
        error.textContent = 'Précisez la raison dans la zone de commentaire.';
        comment.focus();
        return;
      }
      const password = String(adminPassword?.value || '').trim();
      if (!password) {
        error.textContent = 'Le mot de passe administrateur est obligatoire pour valider l’abandon.';
        adminPassword?.focus();
        return;
      }
      let adminOk = false;
      try {
        adminOk = !!(window.sebEvalPro?.verifyAdminPassword && await window.sebEvalPro.verifyAdminPassword(password));
      } catch (_) {}
      if (!adminOk) {
        error.textContent = 'Mot de passe administrateur incorrect. L’exercice reste actif.';
        if (adminPassword) { adminPassword.value = ''; adminPassword.focus(); }
        return;
      }
      const reasons = checked.map((input) => input.value);
      if (context.file === 'tri_de_cheville.html') {
        try { if (typeof window.calcMoyenne === 'function') window.calcMoyenne(); } catch (_) {}
        try { if (typeof window.saveTriResultsToQCM === 'function') window.saveTriResultsToQCM(); } catch (_) {}
      }
      if (context.file === 'dictee.html') {
        try {
          let state = {};
          try { state = JSON.parse(sessionStorage.getItem('dictee_data') || '{}') || {}; } catch (_) {}
          state.status = 'abandoned';
          state.scoreSur20 = 0;
          state.abandonne = true;
          sessionStorage.setItem('dictee_data', JSON.stringify(state));
          if (window.sebEvalPro && typeof window.sebEvalPro.save === 'function') window.sebEvalPro.save();
        } catch (_) {}
      }
      const record = saveAbandon(context, reasons, comment.value, nonEvaluated);
      close();
      setTimeout(function () { advanceAfterAbandon(context, record); }, 40);
    });

    layer.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') close();
    });
  }

  function ensureAbandonButton() {
    let button = document.getElementById('seb-evalpro-abandon-fixed');
    if (!button) {
      button = document.createElement('button');
      button.id = 'seb-evalpro-abandon-fixed';
      button.type = 'button';
      button.className = 'seb-action-btn seb-btn-danger';
      button.textContent = '⏹ Abandonner l’exercice';
      button.addEventListener('click', function () {
        const context = currentExerciseContext();
        if (context) openAbandonDialog(context);
      });
      document.body.appendChild(button);
    }
    return button;
  }

  function refreshAbandonButton() {
    const button = ensureAbandonButton();
    const context = currentExerciseContext();
    if (context) {
      button.style.setProperty('display', 'inline-flex', 'important');
      button.title = 'Abandonner : ' + context.label;
    } else {
      button.style.setProperty('display', 'none', 'important');
      button.title = '';
    }
  }

  function renderAdminAbandons() {
    if (pageName() !== 'admin-bilan.html') return;
    const tbody = document.querySelector('#bilan tbody');
    if (!tbody) return;
    tbody.querySelectorAll('.seb-admin-abandon-section,.seb-admin-abandon-row').forEach((node) => node.remove());
    const list = readAbandons();
    if (!list.length) return;

    const section = document.createElement('tr');
    section.className = 'section2 seb-admin-abandon-section';
    const sectionCell = document.createElement('td');
    sectionCell.colSpan = 6;
    sectionCell.textContent = 'Exercices abandonnés par le stagiaire';
    section.appendChild(sectionCell);
    tbody.appendChild(section);

    list.forEach((record) => {
      const row = document.createElement('tr');
      row.className = 'seb-admin-abandon-row';

      const exerciseCell = document.createElement('td');
      const strong = document.createElement('strong');
      strong.textContent = record.exercice || record.page || 'Exercice';
      exerciseCell.appendChild(strong);

      const stateCell = document.createElement('td');
      stateCell.colSpan = 4;
      stateCell.className = 'seb-admin-abandon-state';
      stateCell.textContent = 'EXERCICE ABANDONNÉ';

      const commentCell = document.createElement('td');
      commentCell.className = 'seb-admin-abandon-comment';
      const reasons = Array.isArray(record.raisons) ? record.raisons.join(' ; ') : '';
      let details = 'Motif(s) : ' + (reasons || 'Non renseigné');
      if (record.commentaire) details += '\nCommentaire : ' + record.commentaire;
      if (record.horodatage) details += '\nEnregistré le : ' + record.horodatage;
      details += '\nLes données déjà saisies avant l’abandon ont été conservées.';
      commentCell.textContent = details;

      row.appendChild(exerciseCell);
      row.appendChild(stateCell);
      row.appendChild(commentCell);
      tbody.appendChild(row);
    });
  }

  function refreshAll() {
    ensureStyles();
    normalizeButtons(document);
    hideLegacyPassButtons();
    protectAutoEvaluations();
    refreshAbandonButton();
    renderAdminAbandons();
  }

  function scheduleRefresh() {
    if (mutationScheduled) return;
    mutationScheduled = true;
    setTimeout(function () {
      mutationScheduled = false;
      refreshAll();
    }, 0);
  }

  function init() {
    refreshAll();
    const observer = new MutationObserver(scheduleRefresh);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();


// SEB_EXERCISE_NAVIGATION_GUARD98
(function(){
  'use strict';

  const TRUE_FILES = new Set([
    'brique.html','stock.html','planning.html','genrenombres.html',
    'tri_de_cheville.html','nwtexte.html','nvmail.html','paronymes.html','carre.html'
  ]);
  const QCM_IDS = new Set(['page2','page2_1','page3','page4','page5','page5_1','page6','pageTexteTrous','page8']);
  let scheduled = false;

  function fileName(){
    try { return decodeURIComponent((window.location.pathname.split('/').pop() || '').toLowerCase()); }
    catch (_) { return ''; }
  }

  function clean(value){
    return String(value || '')
      .replace(/\s+/g, ' ')
      .replace(/^(?:➡️|➡|➜|→|←|✓|✔|▶️|▶|⏹️|⏹|■|📊|🧮|💾|✉️|✉)\s*/u, '')
      .replace(/\s*(?:->|→|➜)\s*$/u, '')
      .trim();
  }

  function visibleQcmExercise(){
    const page = Array.from(document.querySelectorAll('.page')).find(function(node){ return node.classList.contains('visible'); });
    return page && QCM_IDS.has(page.id) ? page : null;
  }

  function context(){
    const file = fileName();
    if (file === 'qcmv1.0.html') {
      const scope = visibleQcmExercise();
      return scope ? { file:file, scope:scope, key:file + '#' + scope.id } : null;
    }
    if (!TRUE_FILES.has(file)) return null;
    return { file:file, scope:document.body, key:file };
  }

  function activityKey(ctx){ return 'seb_exercise_activity:' + ctx.key; }
  function hasActivityFlag(ctx){ return sessionStorage.getItem(activityKey(ctx)) === '1'; }
  function setActivity(ctx){
    if (!ctx) return;
    sessionStorage.setItem(activityKey(ctx), '1');
  }

  function hasMeaningfulValues(scope){
    if (!scope || !scope.querySelectorAll) return false;
    if (scope.querySelector('input[type="checkbox"]:checked,input[type="radio"]:checked,.item.selected,[aria-pressed="true"]')) return true;

    const fields = Array.from(scope.querySelectorAll('input,textarea,select'));
    for (const field of fields) {
      const type = String(field.type || '').toLowerCase();
      if (['hidden','button','submit','reset','file','checkbox','radio'].includes(type)) continue;
      if (field.tagName === 'SELECT') {
        const value = String(field.value == null ? '' : field.value).trim();
        if (field.selectedIndex > 0 && value !== '' && value !== '_') return true;
        continue;
      }
      if (String(field.value == null ? '' : field.value).trim() !== '') return true;
    }

    const editable = Array.from(scope.querySelectorAll('[contenteditable="true"],.ql-editor'));
    if (editable.some(function(node){
      const text = String(node.innerText || node.textContent || '').replace(/\u200B/g, '').trim();
      return text !== '' || !!node.querySelector('img');
    })) return true;

    const file = fileName();
    if (file === 'stock.html' && scope.querySelector('.case .pot,#zone-tri .pot,.etagere .pot')) return true;
    return false;
  }

  function storageExists(key){ return sessionStorage.getItem(key) !== null; }

  function ready(ctx){
    if (!ctx) return true;

    if (!hasActivityFlag(ctx) && hasMeaningfulValues(ctx.scope)) setActivity(ctx);
    const activity = hasActivityFlag(ctx);

    if (ctx.file === 'tri_de_cheville.html') {
      if (typeof window.sebEvalProTriNavigationReady === 'function') return !!window.sebEvalProTriNavigationReady();
      return sessionStorage.getItem('seb_tri_navigation_ready') === '1';
    }
    if (ctx.file === 'brique.html') return activity && storageExists('eval_brique') && storageExists('eval_brique_auto');
    if (ctx.file === 'stock.html') return activity && storageExists('stockTotal');
    if (ctx.file === 'planning.html') return activity && storageExists('planningScore');
    if (ctx.file === 'genrenombres.html') return activity && storageExists('erreurs_exercice');
    if (ctx.file === 'nvmail.html') return activity && storageExists('page8_data');
    if (ctx.file === 'paronymes.html') return activity && storageExists('paronymes_score');
    if (ctx.file === 'carre.html') return activity && storageExists('carre_magique_score');
    if (ctx.file === 'nwtexte.html') return activity;

    // Pages d'exercices QCM : le bouton Suivant n'est pas disponible tant
    // qu'aucune réponse / sélection n'a été effectuée sur la page visible.
    if (ctx.file === 'qcmv1.0.html') return activity;
    return activity;
  }

  function isNavigationButton(button){
    if (!button || button.id === 'seb-evalpro-abandon-fixed') return false;
    if (button.closest('#seb-evalpro-topbar,#seb-evalpro-admin-dialog,#seb-evalpro-session-close-dialog,#seb-evalpro-abandon-layer')) return false;
    const label = clean(button.textContent).toLowerCase();
    return /^(suivant|page suivante|étape suivante|etape suivante|continuer)\b/.test(label);
  }

  function belongsToContext(button, ctx){
    if (!ctx) return false;
    if (ctx.file === 'qcmv1.0.html') return ctx.scope.contains(button);
    return document.body.contains(button);
  }

  function ensureStyle(){
    if (document.getElementById('seb-exercise-navigation-guard-style')) return;
    const style = document.createElement('style');
    style.id = 'seb-exercise-navigation-guard-style';
    style.textContent = 'button.seb-exercise-nav-locked{display:none!important}';
    (document.head || document.documentElement).appendChild(style);
  }

  function enforce(){
    scheduled = false;
    ensureStyle();
    const ctx = context();
    if (!ctx) {
      document.querySelectorAll('.seb-exercise-nav-locked').forEach(function(button){ button.classList.remove('seb-exercise-nav-locked'); });
      return;
    }
    const unlocked = ready(ctx);
    document.querySelectorAll('button').forEach(function(button){
      if (!isNavigationButton(button) || !belongsToContext(button, ctx)) return;
      button.classList.toggle('seb-exercise-nav-locked', !unlocked);
      button.setAttribute('aria-hidden', unlocked ? 'false' : 'true');
      if (!unlocked) button.tabIndex = -1;
      else if (button.tabIndex < 0) button.removeAttribute('tabindex');
    });
  }

  function schedule(){
    if (scheduled) return;
    scheduled = true;
    setTimeout(enforce, 0);
  }

  function markFromEvent(event){
    const ctx = context();
    if (!ctx) return;
    const target = event.target;
    if (!target || (ctx.file === 'qcmv1.0.html' && !ctx.scope.contains(target))) return;

    if (event.type === 'input' || event.type === 'change' || event.type === 'drop' || event.type === 'dragstart') {
      setActivity(ctx);
      schedule();
      return;
    }

    if (event.type === 'click') {
      const interactive = target.closest && target.closest('.item,[aria-pressed],td:not(.paronyme),.pot,.case,[contenteditable="true"],.fake-file-input');
      if (interactive) {
        setActivity(ctx);
        schedule();
        return;
      }
      const button = target.closest && target.closest('button');
      if (button) {
        const label = clean(button.textContent).toLowerCase();
        if (/^(démarrer|demarrer)\b/.test(label)) {
          setActivity(ctx);
          schedule();
        }
      }
    }
  }

  document.addEventListener('click', function(event){
    const button = event.target && event.target.closest ? event.target.closest('button') : null;
    if (!button || !isNavigationButton(button)) return;
    const ctx = context();
    if (!ctx || !belongsToContext(button, ctx) || ready(ctx)) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    window.alert(ctx.file === 'tri_de_cheville.html'
      ? 'Terminez au moins 3 tris puis validez l’autoévaluation avant de passer à l’étape suivante.'
      : 'Vous devez réaliser l’exercice avant de passer à l’étape suivante. Si vous souhaitez arrêter cet exercice, utilisez « Abandonner l’exercice ».');
  }, true);

  ['input','change','click','drop','dragstart'].forEach(function(type){
    document.addEventListener(type, markFromEvent, true);
  });

  function init(){
    ensureStyle();
    enforce();
    new MutationObserver(schedule).observe(document.body, {
      childList:true,
      subtree:true,
      characterData:true,
      attributes:true,
      attributeFilter:['class','style','hidden','aria-pressed']
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();


// KALONEO_COMMON_NAVIGATION_AND_BULLETS
(function(){
  'use strict';

  const ACTION_SELECTORS = [
    '#seb-evalpro-abandon-fixed',
    '#identity-next','#intro-next','#kaltest-next',
    '#page2Next','#page2_1Next','#page3Next','#texteTrousNext','#page4Next','#page5Next','#page5_1Next','#page6Next',
    '#autoEvalBtn','#validBtn',
    '#stockActionBtn',
    '#btnValider','#btnSuivant',
    '[id="btnCheck"]','#btnNextGenreNombre',
    '#seb-dictee-action',
    '#calc','#seb-tri-auto-validate','#seb-tri-next',
    '#btn-score',
    '#nvmail-next',
    '#autoeval1-validate','#autoeval1-next',
    '#autoeval2-validate',
    '#carre-reset','#btnValidate','#btnNext',
    '[data-kaloneo-nav-slot]'
  ];

  const CENTER_IDS = new Set([
    'identity-next','intro-next','kaltest-next',
    'page2Next','page2_1Next','page3Next','texteTrousNext','page4Next','page5Next','page5_1Next','page6Next',
    'autoEvalBtn','validBtn','stockActionBtn','btnValider','btnSuivant','btnCheck','btnNextGenreNombre',
    'seb-dictee-action','calc','seb-tri-auto-validate','seb-tri-next','btn-score','nvmail-next',
    'autoeval1-validate','autoeval1-next','autoeval2-validate','carre-reset','btnValidate','btnNext'
  ]);

  const EXERCISE_SURFACES = new Set([
    'kaltest-pilot2.html','qcmv1.0.html','brique.html','stock.html','planning.html','genrenombres.html',
    'dictee.html','tri_de_cheville.html','nwtexte.html','nvmail.html','autoeval1.html','autoeval2.html',
    'paronymes.html','carre.html'
  ]);

  const sourceToProxy = new Map();
  const declared = new Map();
  let scheduled = false;

  function fileName(){
    try { return decodeURIComponent((window.location.pathname.split('/').pop() || '').toLowerCase()); }
    catch (_) { return ''; }
  }

  function clean(value){
    return String(value || '').replace(/\s+/g,' ').trim();
  }

  function ensureStyle(){
    if(document.getElementById('kaloneo-common-navigation-style')) return;
    const style=document.createElement('style');
    style.id='kaloneo-common-navigation-style';
    style.textContent=`
      :root{--kaloneo-nav-height:62px}
      #kaloneo-common-navigation{
        position:fixed!important;
        left:0!important;
        right:0!important;
        bottom:0!important;
        height:var(--kaloneo-nav-height)!important;
        z-index:2147482500!important;
        display:grid!important;
        grid-template-columns:minmax(220px,1fr) minmax(320px,2fr) minmax(220px,1fr)!important;
        align-items:center!important;
        gap:12px!important;
        padding:7px 18px 8px!important;
        box-sizing:border-box!important;
        border-top:1px solid rgba(0,78,112,.28)!important;
        background:rgba(248,251,253,.72)!important;
        backdrop-filter:blur(4px)!important;
        -webkit-backdrop-filter:blur(4px)!important;
        box-shadow:none!important;
        pointer-events:none!important;
      }
      #kaloneo-common-navigation[hidden]{display:none!important}
      .kaloneo-nav-slot{
        min-width:0;
        display:flex!important;
        align-items:center!important;
        gap:10px!important;
        pointer-events:none!important;
      }
      #kaloneo-nav-left{justify-content:flex-start!important}
      #kaloneo-nav-center{justify-content:center!important}
      #kaloneo-nav-right{justify-content:flex-end!important}
      .kaloneo-nav-slot>.seb-action-btn{
        pointer-events:auto!important;
        margin:0!important;
        position:static!important;
        transform:none;
        min-height:42px!important;
      }
      .kaloneo-nav-slot>.seb-action-btn:hover:not(:disabled){transform:translateY(-1px)!important}
      .kaloneo-nav-slot>.seb-action-btn:active:not(:disabled){transform:translateY(1px)!important}
      html body button.seb-kaloneo-nav-source{
        position:fixed!important;
        left:-10000px!important;
        right:auto!important;
        top:auto!important;
        bottom:-10000px!important;
        width:1px!important;
        min-width:0!important;
        max-width:1px!important;
        height:1px!important;
        min-height:0!important;
        max-height:1px!important;
        margin:0!important;
        padding:0!important;
        border:0!important;
        opacity:0!important;
        overflow:hidden!important;
        pointer-events:none!important;
        transform:none!important;
        box-shadow:none!important;
      }
      #seb-evalpro-abandon-fixed.seb-kaloneo-nav-source,
      #seb-dictee-action.seb-kaloneo-nav-source{
        position:fixed!important;
        left:-10000px!important;
        right:auto!important;
        top:auto!important;
        bottom:-10000px!important;
        transform:none!important;
      }
      .seb-kaloneo-legacy-actions-empty{
        min-height:0!important;
        height:0!important;
        padding:0!important;
        margin:0!important;
        border:0!important;
        background:transparent!important;
        box-shadow:none!important;
        overflow:visible!important;
      }
      body.seb-kaloneo-nav-active{
        padding-bottom:var(--kaloneo-nav-height)!important;
        box-sizing:border-box!important;
      }

      /* Une seule puce officielle KALONÉO : le gros point. */
      body.seb-kaloneo-bullet-scope ul:not(.seb-kaloneo-no-bullets){
        list-style-type:disc!important;
        list-style-position:outside!important;
        padding-left:1.45em!important;
      }
      body.seb-kaloneo-bullet-scope ul:not(.seb-kaloneo-no-bullets)>li{
        padding-left:.15em!important;
      }
      body.seb-kaloneo-bullet-scope ul:not(.seb-kaloneo-no-bullets)>li::marker{
        content:"•  ";
        font-size:1.32em;
        font-weight:900;
      }
      body.seb-kaloneo-bullet-scope #modalFichier ul,
      body.seb-kaloneo-bullet-scope #modalFichier ul>li{
        list-style:none!important;
        padding-left:0!important;
      }
    `;
    (document.head||document.documentElement).appendChild(style);
  }

  function ensureBar(){
    let bar=document.getElementById('kaloneo-common-navigation');
    if(bar) return bar;
    bar=document.createElement('nav');
    bar.id='kaloneo-common-navigation';
    bar.setAttribute('aria-label','Navigation du parcours');
    bar.innerHTML='<div id="kaloneo-nav-left" class="kaloneo-nav-slot"></div><div id="kaloneo-nav-center" class="kaloneo-nav-slot"></div><div id="kaloneo-nav-right" class="kaloneo-nav-slot"></div>';
    document.body.appendChild(bar);
    return bar;
  }

  function slotName(source){
    const declaredSlot=clean(source?.dataset?.kaloneoNavSlot).toLowerCase();
    if(['left','center','right'].includes(declaredSlot)) return declaredSlot;
    const manual=declared.get(source);
    if(manual && ['left','center','right'].includes(manual.slot)) return manual.slot;
    if(source?.id==='seb-evalpro-abandon-fixed') return 'left';
    if(CENTER_IDS.has(source?.id||'')) return 'center';
    return '';
  }

  function sourceVisible(source){
    if(!source || !source.isConnected || source.hidden) return false;
    if(source.getAttribute('aria-hidden')==='true' && source.classList.contains('seb-exercise-nav-locked')) return false;
    let node=source;
    try{
      while(node && node.nodeType===1){
        const style=getComputedStyle(node);
        if(style.display==='none' || style.visibility==='hidden') return false;
        if(node===document.body) break;
        node=node.parentElement;
      }
    }catch(_){return false}
    return true;
  }

  function copyButtonStyle(source,proxy){
    const keep=['seb-btn-nav','seb-btn-confirm','seb-btn-tool','seb-btn-functional','seb-btn-calculator','seb-btn-danger','seb-btn-timer-start','seb-btn-timer-stop','seb-btn-solid'];
    proxy.className='seb-action-btn';
    keep.forEach(cls=>{if(source.classList.contains(cls)) proxy.classList.add(cls)});
    const label=clean(source.textContent);
    if(!keep.some(cls=>proxy.classList.contains(cls))){
      const lower=label.toLowerCase();
      if(/abandon|annuler|quitter|fermer/.test(lower)) proxy.classList.add('seb-btn-danger');
      else if(/calculatrice/.test(lower)) proxy.classList.add('seb-btn-calculator');
      else if(/suivant|étape suivante|etape suivante|page suivante|continuer|commencer/.test(lower)) proxy.classList.add('seb-btn-nav');
      else proxy.classList.add('seb-btn-functional');
    }
  }

  function makeProxy(source,slot){
    let proxy=sourceToProxy.get(source);
    if(proxy) return proxy;
    proxy=document.createElement('button');
    proxy.type='button';
    proxy.className='seb-action-btn';
    proxy.dataset.kaloneoProxyFor=source.id||'anonymous';
    proxy.addEventListener('click',function(event){
      event.preventDefault();
      if(source.disabled || source.getAttribute('aria-disabled')==='true') return;
      try{source.click();}catch(_){}
      setTimeout(schedule,0);
    });
    sourceToProxy.set(source,proxy);
    source.classList.add('seb-kaloneo-nav-source');
    const target=document.getElementById('kaloneo-nav-'+slot);
    if(target) target.appendChild(proxy);
    return proxy;
  }

  function syncProxy(source,proxy,slot){
    const target=document.getElementById('kaloneo-nav-'+slot);
    if(target && proxy.parentElement!==target) target.appendChild(proxy);
    proxy.textContent=source.textContent;
    proxy.title=source.title||'';
    proxy.disabled=!!source.disabled || source.getAttribute('aria-disabled')==='true';
    proxy.hidden=!sourceVisible(source);
    copyButtonStyle(source,proxy);
    proxy.setAttribute('aria-hidden',proxy.hidden?'true':'false');
  }

  function findSources(){
    const found=[];
    ACTION_SELECTORS.forEach(selector=>{
      try{document.querySelectorAll(selector).forEach(node=>{if(node.tagName==='BUTTON' && !found.includes(node)) found.push(node)})}catch(_){}
    });
    declared.forEach((_,node)=>{if(node?.isConnected && !found.includes(node)) found.push(node)});
    return found;
  }

  function updateLegacyContainers(){
    const parents=new Set();
    sourceToProxy.forEach((_,source)=>{if(source?.parentElement) parents.add(source.parentElement)});
    parents.forEach(parent=>{
      if(parent.closest('#kaloneo-common-navigation')) return;
      const clone=parent.cloneNode(true);
      clone.querySelectorAll('button,script,style').forEach(node=>node.remove());
      const meaningful=clean(clone.textContent);
      const buttons=Array.from(parent.querySelectorAll('button'));
      const hasVisibleNonNav=buttons.some(button=>!button.classList.contains('seb-kaloneo-nav-source') && sourceVisible(button));
      parent.classList.toggle('seb-kaloneo-legacy-actions-empty',!meaningful && !hasVisibleNonNav);
    });
  }

  function normalizeBulletText(){
    document.querySelectorAll('body.seb-kaloneo-bullet-scope ul:not(.seb-kaloneo-no-bullets)>li').forEach(li=>{
      if(li.closest('#modalFichier')) return;
      for(const node of Array.from(li.childNodes)){
        if(node.nodeType!==Node.TEXT_NODE || !node.nodeValue || !node.nodeValue.trim()) continue;
        node.nodeValue=node.nodeValue.replace(/^\s*(?:[•●▪◦‣‧·]\s*)+/u,'');
        break;
      }
    });
  }

  function refresh(){
    scheduled=false;
    ensureStyle();
    const bar=ensureBar();
    const file=fileName();
    const candidateSurface=EXERCISE_SURFACES.has(file) || document.body?.dataset?.sebKaltestExercise==='1';
    document.body.classList.toggle('seb-kaloneo-bullet-scope',candidateSurface);

    const active=new Set();
    findSources().forEach(source=>{
      const slot=slotName(source);
      if(!slot) return;
      const proxy=makeProxy(source,slot);
      syncProxy(source,proxy,slot);
      active.add(source);
    });

    sourceToProxy.forEach((proxy,source)=>{
      if(!source.isConnected || !active.has(source)){
        proxy.remove();
        sourceToProxy.delete(source);
      }
    });

    normalizeBulletText();
    updateLegacyContainers();

    const visible=Array.from(bar.querySelectorAll('.kaloneo-nav-slot>button')).some(button=>!button.hidden);
    bar.hidden=!visible;
    document.body.classList.toggle('seb-kaloneo-nav-active',visible);
  }

  function schedule(){
    if(scheduled) return;
    scheduled=true;
    requestAnimationFrame(refresh);
  }

  function resolveSource(value){
    if(value instanceof Element) return value;
    if(typeof value==='string'){
      try{return document.querySelector(value)}catch(_){return null}
    }
    return null;
  }

  window.KaloneoNavigation=Object.freeze({
    declare(config){
      const entries=Array.isArray(config)?config:(config?.buttons||[config]);
      entries.filter(Boolean).forEach(entry=>{
        const source=resolveSource(entry.source||entry.selector||entry.element);
        if(!source) return;
        const slot=clean(entry.slot||'center').toLowerCase();
        declared.set(source,{slot:['left','center','right'].includes(slot)?slot:'center'});
        source.dataset.kaloneoNavSlot=declared.get(source).slot;
      });
      schedule();
    },
    refresh:schedule,
    bar(){return ensureBar()}
  });

  function init(){
    ensureStyle();
    ensureBar();
    refresh();
    new MutationObserver(schedule).observe(document.body,{
      childList:true,subtree:true,characterData:true,attributes:true,
      attributeFilter:['class','style','hidden','disabled','aria-hidden','aria-disabled']
    });
    ['click','input','change'].forEach(type=>document.addEventListener(type,schedule,true));
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
