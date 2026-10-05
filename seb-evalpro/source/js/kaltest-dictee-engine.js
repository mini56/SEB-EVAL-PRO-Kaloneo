(function () {
  'use strict';

  const REFERENCE = "Ce matin, un client a téléphoné au service commercial de l'entreprise. Il n'était pas content de sa dernière livraison de fournitures. En effet, plusieurs cartons étaient endommagés à l'arrivée. De plus, certains articles manquaient dans le colis. Le client a demandé un remboursement rapide ou un nouvel envoi complet. La secrétaire a noté sa réclamation avec précision. Elle lui a promis une réponse avant la fin de la semaine. Le responsable du magasin doit vérifier le stock disponible dès demain.";
  const TOTAL_WORDS = 80;

  function tokens(text) {
    const source = String(text == null ? '' : text).normalize('NFC');
    const out = [];
    const regex = /[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*(?:\s*[.,;:!?…]+)?/gu;
    let match;
    while ((match = regex.exec(source))) out.push(match[0].replace(/\s+([.,;:!?…]+)$/u, '$1'));
    return out;
  }

  function align(referenceTokens, userTokens) {
    function core(token) {
      return String(token || '')
        .normalize('NFC')
        .replace(/\s*[.,;:!?…]+$/u, '')
        .replace(/’/g, "'")
        .toLowerCase();
    }

    function distance(leftValue, rightValue) {
      const left = Array.from(leftValue || '');
      const right = Array.from(rightValue || '');
      let previous = Array.from({ length:right.length + 1 }, (_, index) => index);
      for (let i = 1; i <= left.length; i += 1) {
        const current = new Array(right.length + 1);
        current[0] = i;
        for (let j = 1; j <= right.length; j += 1) {
          current[j] = Math.min(
            current[j - 1] + 1,
            previous[j] + 1,
            previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1)
          );
        }
        previous = current;
      }
      return previous[right.length];
    }

    const gap = 1.6;
    const n = referenceTokens.length;
    const m = userTokens.length;
    const dp = Array.from({ length:n + 1 }, () => new Array(m + 1).fill(0));
    const op = Array.from({ length:n + 1 }, () => new Array(m + 1).fill(null));

    for (let i = 1; i <= n; i += 1) {
      dp[i][0] = i * gap;
      op[i][0] = 'delete';
    }
    for (let j = 1; j <= m; j += 1) {
      dp[0][j] = j * gap;
      op[0][j] = 'insert';
    }

    for (let i = 1; i <= n; i += 1) {
      for (let j = 1; j <= m; j += 1) {
        const left = core(referenceTokens[i - 1]);
        const right = core(userTokens[j - 1]);
        const same = left === right;
        const ratio = same ? 0 : distance(left, right) / Math.max(left.length, right.length, 1);
        const substitution = same ? 0 : Math.min(1.5, 0.5 + ratio);
        const candidates = [
          { value:dp[i - 1][j - 1] + substitution, type:same ? 'match' : 'substitute', priority:0 },
          { value:dp[i - 1][j] + gap, type:'delete', priority:1 },
          { value:dp[i][j - 1] + gap, type:'insert', priority:2 }
        ].sort((a, b) => (a.value - b.value) || (a.priority - b.priority));
        dp[i][j] = candidates[0].value;
        op[i][j] = candidates[0].type;
      }
    }

    const out = [];
    let i = n;
    let j = m;
    while (i || j) {
      const type = op[i][j];
      if ((type === 'match' || type === 'substitute') && i && j) {
        out.push({ type, expected:referenceTokens[i - 1], actual:userTokens[j - 1] });
        i -= 1;
        j -= 1;
      } else if (type === 'delete' && i) {
        out.push({ type:'delete', expected:referenceTokens[i - 1], actual:'' });
        i -= 1;
      } else if (j) {
        out.push({ type:'insert', expected:'', actual:userTokens[j - 1] });
        j -= 1;
      } else {
        out.push({ type:'delete', expected:referenceTokens[i - 1], actual:'' });
        i -= 1;
      }
    }
    return out.reverse();
  }

  function classifyAlignmentV3(alignment) {
    function core(token) {
      return String(token || '')
        .normalize('NFC')
        .replace(/\s*[.,;:!?…]+$/u, '')
        .replace(/’/g, "'")
        .toLowerCase();
    }

    function distance(leftValue, rightValue) {
      const left = Array.from(leftValue || '');
      const right = Array.from(rightValue || '');
      let previous = Array.from({ length:right.length + 1 }, (_, index) => index);
      for (let i = 1; i <= left.length; i += 1) {
        const current = new Array(right.length + 1);
        current[0] = i;
        for (let j = 1; j <= right.length; j += 1) {
          current[j] = Math.min(
            current[j - 1] + 1,
            previous[j] + 1,
            previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1)
          );
        }
        previous = current;
      }
      return previous[right.length];
    }

    const expected = [];
    const actual = [];
    const types = {};
    const assigned = new Map();

    alignment.forEach((item, index) => {
      types[index] = item.type;
      if (item.type === 'substitute' || item.type === 'delete') {
        expected.push({ index, token:item.expected, used:false });
      }
      if (item.type === 'substitute' || item.type === 'insert') {
        actual.push({ index, token:item.actual, used:false });
      }
    });

    const movedCandidates = [];
    actual.forEach((actualItem) => expected.forEach((expectedItem) => {
      const actualCore = core(actualItem.token);
      const expectedCore = core(expectedItem.token);
      const delta = Math.abs(actualItem.index - expectedItem.index);
      if (actualCore.length >= 4 && actualCore === expectedCore &&
          actualItem.index !== expectedItem.index && delta <= 16) {
        movedCandidates.push({ actualItem, expectedItem, delta });
      }
    }));

    movedCandidates
      .sort((left, right) =>
        (left.delta - right.delta) ||
        (left.actualItem.index - right.actualItem.index) ||
        (left.expectedItem.index - right.expectedItem.index)
      )
      .forEach(({ actualItem, expectedItem }) => {
        if (actualItem.used || expectedItem.used) return;
        actualItem.used = true;
        expectedItem.used = true;
        assigned.set(actualItem.index, { type:'moved', expected:expectedItem.token });
      });

    actual.forEach((actualItem) => {
      if (actualItem.used || types[actualItem.index] !== 'substitute') return;
      const expectedItem = expected.find((candidate) =>
        candidate.index === actualItem.index && !candidate.used
      );
      if (!expectedItem) return;
      actualItem.used = true;
      expectedItem.used = true;
      assigned.set(actualItem.index, { type:'substitute', expected:expectedItem.token });
    });

    actual.forEach((actualItem) => {
      if (actualItem.used) return;
      const actualCore = core(actualItem.token);
      const candidates = [];
      expected.forEach((expectedItem) => {
        if (expectedItem.used || Math.abs(expectedItem.index - actualItem.index) > 8) return;
        const expectedCore = core(expectedItem.token);
        const ratio = distance(actualCore, expectedCore) / Math.max(actualCore.length, expectedCore.length, 1);
        if (actualCore.length >= 3 && expectedCore.length >= 3 && ratio <= 0.35) {
          candidates.push({
            expectedItem,
            ratio,
            delta:Math.abs(expectedItem.index - actualItem.index)
          });
        }
      });
      candidates.sort((left, right) => (left.ratio - right.ratio) || (left.delta - right.delta));
      if (!candidates.length) return;
      actualItem.used = true;
      candidates[0].expectedItem.used = true;
      assigned.set(actualItem.index, {
        type:'substitute',
        expected:candidates[0].expectedItem.token
      });
    });

    actual.forEach((actualItem) => {
      if (actualItem.used) return;
      actualItem.used = true;
      assigned.set(actualItem.index, { type:'insert', expected:'' });
    });

    const missing = new Map(
      expected.filter((item) => !item.used).map((item) => [item.index, item.token])
    );
    const items = [];

    alignment.forEach((item, index) => {
      if (missing.has(index)) {
        items.push({ type:'delete', expected:missing.get(index), actual:'' });
      }
      if (item.type === 'match') {
        items.push({ type:'match', expected:item.expected, actual:item.actual });
        return;
      }
      if (!item.actual) return;
      const assignedItem = assigned.get(index) || { type:'insert', expected:'' };
      items.push({
        type:assignedItem.type,
        expected:assignedItem.expected || '',
        actual:item.actual
      });
    });

    return {
      items,
      substitutions:items.filter((item) => item.type === 'substitute').length,
      omissions:items.filter((item) => item.type === 'delete').length,
      additions:items.filter((item) => item.type === 'insert').length,
      moved:items.filter((item) => item.type === 'moved').length
    };
  }

  function evaluateText(text) {
    const referenceTokens = tokens(REFERENCE);
    const userTokens = tokens(text);
    const baseAlignment = align(referenceTokens, userTokens);
    let matches = 0;
    let substitutions = 0;
    let omissions = 0;
    let additions = 0;
    let punctuationErrors = 0;
    let capitalizationErrors = 0;

    const punctuation = (token) => {
      const match = String(token || '').trim().match(/([.,;:!?…]+)$/u);
      return match ? match[1] : '';
    };
    const capitalization = (token) =>
      String(token || '')
        .normalize('NFC')
        .replace(/\s*[.,;:!?…]+$/u, '')
        .replace(/’/g, "'");

    baseAlignment.forEach((item) => {
      if (item.type === 'match') {
        matches += 1;
        if (punctuation(item.expected) !== punctuation(item.actual)) punctuationErrors += 1;
        if (capitalization(item.expected) !== capitalization(item.actual)) capitalizationErrors += 1;
      } else if (item.type === 'substitute') {
        substitutions += 1;
        if (punctuation(item.expected) !== punctuation(item.actual)) punctuationErrors += 1;
      } else if (item.type === 'delete') {
        omissions += 1;
      } else if (item.type === 'insert') {
        additions += 1;
      }
    });

    const classified = classifyAlignmentV3(baseAlignment);
    return {
      texte:String(text == null ? '' : text),
      motsCorrects:matches,
      motsTotal:TOTAL_WORDS,
      substitutions:classified.substitutions,
      omissions:classified.omissions,
      ajouts:classified.additions,
      deplacements:classified.moved,
      erreursNotees:Math.max(0, TOTAL_WORDS - matches),
      erreursPonctuation:punctuationErrors,
      erreursMajuscules:capitalizationErrors,
      scoreSur20:Math.round(matches * 25) / 100,
      alignmentOriginal:baseAlignment,
      alignment:classified.items,
      classificationVersion:3
    };
  }



  window.sebKaltestDicteeEngine = Object.freeze({
    reference:REFERENCE,
    totalWords:TOTAL_WORDS,
    tokens,
    align,
    classifyAlignmentV3,
    evaluateText
  });
})();
