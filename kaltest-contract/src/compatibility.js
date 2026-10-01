'use strict';

const SEMVER_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

const MEDIA_WARNING_BYTES = 250 * 1024 * 1024;
const MEDIA_MAX_BYTES = 500 * 1024 * 1024;
const PACKAGE_MAX_BYTES = 1024 * 1024 * 1024;

const DEFAULT_SUPPORTED_FEATURES = Object.freeze([
  'runtime.basic',
  'questionnaire.basic',
  'layout.single',
  'layout.split',
  'layout.nested-one-level',
  'image.auto-fit',
  'calculator.host',
  'media.audio-player',
  'media.video-player',
  'transition.manual',
  'transition.auto-media',
  'bilan.bindings'
]);

const AUDIO_CONTAINERS = Object.freeze({
  mp3: new Set(['mp3']),
  wav: new Set(['pcm']),
  ogg: new Set(['opus', 'vorbis']),
  webm: new Set(['opus', 'vorbis']),
  flac: new Set(['flac'])
});

const VIDEO_CONTAINERS = Object.freeze({
  webm: {
    video: new Set(['vp8', 'vp9']),
    audio: new Set(['opus', 'vorbis', ''])
  }
});

const LAYOUT_TYPES = new Set(['single-block', 'split', 'lateral']);
const SPLIT_RATIOS = new Set(['50/50', '40/60', '60/40']);
const TRANSITION_MODES = new Set(['manual', 'automatic']);

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function error(path, message) {
  return { path, message };
}

function parseSemver(value) {
  if (typeof value !== 'string' || !SEMVER_RE.test(value)) return null;
  const [core, pre = ''] = value.split('-', 2);
  const [major, minor, patch] = core.split('.').map(Number);
  return { major, minor, patch, pre };
}

function compareSemver(left, right) {
  const a = parseSemver(left);
  const b = parseSemver(right);
  if (!a || !b) throw new Error('Version sémantique invalide');

  for (const key of ['major', 'minor', 'patch']) {
    if (a[key] !== b[key]) return a[key] < b[key] ? -1 : 1;
  }

  if (a.pre === b.pre) return 0;
  if (!a.pre) return 1;
  if (!b.pre) return -1;

  const pa = a.pre.split('.');
  const pb = b.pre.split('.');
  const length = Math.max(pa.length, pb.length);
  for (let i = 0; i < length; i += 1) {
    if (pa[i] === undefined) return -1;
    if (pb[i] === undefined) return 1;
    if (pa[i] === pb[i]) continue;
    const na = /^\d+$/.test(pa[i]) ? Number(pa[i]) : null;
    const nb = /^\d+$/.test(pb[i]) ? Number(pb[i]) : null;
    if (na !== null && nb !== null) return na < nb ? -1 : 1;
    if (na !== null) return -1;
    if (nb !== null) return 1;
    return pa[i] < pb[i] ? -1 : 1;
  }
  return 0;
}

function validateManifest(manifest) {
  const errors = [];

  if (!isObject(manifest)) return { ok: false, errors: [error('', 'manifeste obligatoire')] };

  if (!Number.isInteger(manifest.kaltestFormat) || manifest.kaltestFormat < 1) {
    errors.push(error('kaltestFormat', 'entier de format KALTEST obligatoire'));
  }

  for (const field of ['minSebEvalPro', 'builderVersion']) {
    if (typeof manifest[field] !== 'string' || !SEMVER_RE.test(manifest[field])) {
      errors.push(error(field, 'version sémantique attendue (x.y.z)'));
    }
  }

  if (manifest.features !== undefined) {
    if (!Array.isArray(manifest.features)) {
      errors.push(error('features', 'tableau attendu'));
    } else {
      const seen = new Set();
      manifest.features.forEach((feature, index) => {
        if (typeof feature !== 'string' || !feature.trim()) {
          errors.push(error(`features[${index}]`, 'identifiant de fonction non vide attendu'));
          return;
        }
        if (seen.has(feature)) errors.push(error(`features[${index}]`, 'fonction dupliquée'));
        seen.add(feature);
      });
    }
  }

  return { ok: errors.length === 0, errors };
}

function checkSebCompatibility(manifest, runtime = {}) {
  const validation = validateManifest(manifest);
  if (!validation.ok) return validation;

  const errors = [];
  const sebVersion = runtime.sebVersion || '0.0.0';
  const formats = new Set(runtime.supportedKaltestFormats || [1]);
  const features = new Set(runtime.supportedFeatures || DEFAULT_SUPPORTED_FEATURES);

  if (!formats.has(manifest.kaltestFormat)) {
    errors.push(error('kaltestFormat', `format KALTEST non pris en charge : ${manifest.kaltestFormat}`));
  }

  if (!parseSemver(sebVersion)) {
    errors.push(error('sebVersion', 'version SEB EvalPro invalide'));
  } else if (compareSemver(sebVersion, manifest.minSebEvalPro) < 0) {
    errors.push(error('minSebEvalPro', `SEB EvalPro ${manifest.minSebEvalPro} minimum requis ; version installée : ${sebVersion}`));
  }

  for (const feature of manifest.features || []) {
    if (!features.has(feature)) {
      errors.push(error('features', `fonction KALTEST inconnue de SEB EvalPro : ${feature}`));
    }
  }

  return { ok: errors.length === 0, errors };
}

function isLocalRelativePath(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  const path = value.trim();
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(path)) return false;
  if (/^(?:[a-zA-Z]:[\\/]|[\\/]{1,2})/.test(path)) return false;
  const parts = path.replace(/\\/g, '/').split('/');
  if (parts.includes('..')) return false;
  return true;
}

function validateMediaDescriptor(media, path = 'media') {
  const errors = [];
  const warnings = [];

  if (!isObject(media)) return { ok: false, errors: [error(path, 'descripteur média obligatoire')], warnings };

  if (!['image', 'audio', 'video'].includes(media.kind)) {
    errors.push(error(`${path}.kind`, 'type média attendu : image, audio ou video'));
  }

  if (!isLocalRelativePath(media.path)) {
    errors.push(error(`${path}.path`, 'le média doit être un fichier local embarqué avec un chemin relatif'));
  }

  if (!Number.isFinite(media.sizeBytes) || media.sizeBytes < 0) {
    errors.push(error(`${path}.sizeBytes`, 'taille du média obligatoire en octets'));
  } else {
    if (media.sizeBytes > MEDIA_MAX_BYTES) {
      errors.push(error(`${path}.sizeBytes`, 'média supérieur à la limite de 500 Mo'));
    } else if (media.sizeBytes >= MEDIA_WARNING_BYTES) {
      warnings.push(error(`${path}.sizeBytes`, 'média volumineux : importation et copie potentiellement plus longues'));
    }
  }

  if (media.kind === 'image') {
    if (media.fit !== undefined && media.fit !== 'contain') {
      errors.push(error(`${path}.fit`, 'une image doit utiliser contain afin de ne jamais être déformée ou recadrée'));
    }
    if (media.allowUpscale === true) {
      errors.push(error(`${path}.allowUpscale`, 'l’agrandissement au-delà de la taille réelle est interdit'));
    }
  }

  if (media.kind === 'audio') {
    const container = String(media.container || '').toLowerCase();
    const codec = String(media.codec || '').toLowerCase();
    const allowed = AUDIO_CONTAINERS[container];
    if (!allowed || !allowed.has(codec)) {
      errors.push(error(`${path}.codec`, 'format audio non garanti commun Windows/Linux'));
    }
  }

  if (media.kind === 'video') {
    const container = String(media.container || '').toLowerCase();
    const videoCodec = String(media.videoCodec || '').toLowerCase();
    const audioCodec = String(media.audioCodec || '').toLowerCase();
    const allowed = VIDEO_CONTAINERS[container];
    if (!allowed || !allowed.video.has(videoCodec) || !allowed.audio.has(audioCodec)) {
      errors.push(error(`${path}.videoCodec`, 'format vidéo non garanti commun Windows/Linux ; WebM VP8/VP9 + Opus/Vorbis attendu'));
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

function validateLayoutDefinition(layout, path = 'presentation.layout') {
  const errors = [];

  if (typeof layout === 'string') {
    if (!LAYOUT_TYPES.has(layout)) errors.push(error(path, 'type de mise en page inconnu'));
    return { ok: errors.length === 0, errors };
  }

  if (!isObject(layout)) return { ok: false, errors: [error(path, 'mise en page obligatoire')] };

  if (!LAYOUT_TYPES.has(layout.type)) errors.push(error(`${path}.type`, 'type de mise en page inconnu'));
  if (layout.type === 'split' || layout.type === 'lateral') {
    if (!SPLIT_RATIOS.has(layout.ratio)) errors.push(error(`${path}.ratio`, 'ratio attendu : 50/50, 40/60 ou 60/40'));
  }

  function visitBlocks(blocks, depth, blockPath) {
    if (!Array.isArray(blocks)) return;
    blocks.forEach((block, index) => {
      const currentPath = `${blockPath}[${index}]`;
      if (!isObject(block)) {
        errors.push(error(currentPath, 'bloc obligatoire'));
        return;
      }
      const children = block.blocks || block.children;
      if (children !== undefined) {
        if (!Array.isArray(children)) {
          errors.push(error(`${currentPath}.blocks`, 'tableau de sous-blocs attendu'));
        } else if (depth >= 1) {
          errors.push(error(`${currentPath}.blocks`, 'un seul niveau de sous-blocs est autorisé'));
        } else {
          visitBlocks(children, depth + 1, `${currentPath}.blocks`);
        }
      }
    });
  }

  visitBlocks(layout.blocks, 0, `${path}.blocks`);
  return { ok: errors.length === 0, errors };
}

function validateTransitionDefinition(transition) {
  const errors = [];
  const warnings = [];

  if (!isObject(transition)) return { ok: false, errors: [error('', 'transition obligatoire')], warnings };

  if (transition.kind !== 'transition') errors.push(error('kind', 'kind attendu : transition'));
  if (typeof transition.id !== 'string' || !transition.id.trim()) errors.push(error('id', 'identifiant obligatoire'));
  if (typeof transition.version !== 'string' || !SEMVER_RE.test(transition.version)) errors.push(error('version', 'version sémantique attendue'));
  if (typeof transition.title !== 'string' || !transition.title.trim()) errors.push(error('title', 'titre obligatoire'));
  if (!TRANSITION_MODES.has(transition.mode)) errors.push(error('mode', 'mode attendu : manual ou automatic'));

  if (transition.scored === true || transition.outputs !== undefined || transition.bilanContributions !== undefined) {
    errors.push(error('scored', 'une transition ne produit ni score, ni sortie de bilan'));
  }

  if (transition.presentation?.layout !== undefined) {
    const layout = validateLayoutDefinition(transition.presentation.layout);
    errors.push(...layout.errors);
  }

  const media = Array.isArray(transition.media) ? transition.media : [];
  media.forEach((descriptor, index) => {
    const result = validateMediaDescriptor(descriptor, `media[${index}]`);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  });

  if (transition.mode === 'automatic') {
    if (transition.advanceOn !== 'media-ended') {
      errors.push(error('advanceOn', 'une transition automatique doit avancer sur media-ended'));
    }
    if (!media.some(item => item && (item.kind === 'audio' || item.kind === 'video'))) {
      errors.push(error('media', 'une transition automatique doit contenir un média audio ou vidéo'));
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

function validatePackageSize(totalBytes) {
  if (!Number.isFinite(totalBytes) || totalBytes < 0) {
    return { ok: false, errors: [error('packageSizeBytes', 'taille du paquet obligatoire en octets')] };
  }
  if (totalBytes > PACKAGE_MAX_BYTES) {
    return { ok: false, errors: [error('packageSizeBytes', 'paquet supérieur à la limite de 1 Go')] };
  }
  return { ok: true, errors: [] };
}

module.exports = {
  MEDIA_WARNING_BYTES,
  MEDIA_MAX_BYTES,
  PACKAGE_MAX_BYTES,
  DEFAULT_SUPPORTED_FEATURES,
  parseSemver,
  compareSemver,
  validateManifest,
  checkSebCompatibility,
  validateMediaDescriptor,
  validateLayoutDefinition,
  validateTransitionDefinition,
  validatePackageSize
};
