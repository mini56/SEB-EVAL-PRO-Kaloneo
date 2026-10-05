'use strict';

const INITIAL_ROUTE='kaltest-pilot2.html?fullParcours=1';
const KALTEST_FILE='kaltest-pilot2.html';
const KALTEST_SEGMENTS=new Set(['','initial','fractions','organisation','postures','conversions','autoeval1','transition-video-f1','brique','stock','planning','genre-nombre','dictee','tri','nwtexte','mail','autoeval2','paronymes','carre','fin']);

function fileName(value){
  return String(value||'').replace(/\\/g,'/').split('/').pop().toLowerCase();
}

function parseRelative(value){
  try{return new URL(String(value||''),'file:///');}
  catch(_){return null;}
}


function normalizeCandidateRoute(value){
  const url=parseRelative(value);
  if(!url)return INITIAL_ROUTE;
  const file=fileName(decodeURIComponent(url.pathname||''));

  if(file===KALTEST_FILE){
    const segment=String(url.searchParams.get('segment')||'').trim();
    if(!KALTEST_SEGMENTS.has(segment))return INITIAL_ROUTE;
    const params=new URLSearchParams();
    params.set('fullParcours','1');
    if(segment&&segment!=='initial')params.set('segment',segment);
    return KALTEST_FILE+'?'+params.toString();
  }


  return INITIAL_ROUTE;
}

function routeFromNavigationUrl(value){
  const url=parseRelative(value);
  if(!url)return INITIAL_ROUTE;
  const file=fileName(decodeURIComponent(url.pathname||''));
  return normalizeCandidateRoute(file+url.search+url.hash);
}

function resolveStateRoute(state){
  const source=state&&typeof state==='object'?state:{};
  const explicit=String(source.lastEvaluationRoute||source.lastRoute||'').trim();
  if(explicit)return normalizeCandidateRoute(explicit);

  const oldPage=fileName(source.lastEvaluationPage||source.lastPage||'');
  if(!oldPage)return INITIAL_ROUTE;
  return normalizeCandidateRoute(oldPage);
}

function toLoadOptions(value){
  const route=normalizeCandidateRoute(value);
  const url=parseRelative(route);
  const query={};
  for(const [key,val] of url.searchParams.entries())query[key]=val;
  return {
    route,
    file:fileName(decodeURIComponent(url.pathname||'')),
    query,
    hash:String(url.hash||'').replace(/^#/,'')
  };
}

module.exports=Object.freeze({
  INITIAL_ROUTE,
  KALTEST_FILE,
  normalizeCandidateRoute,
  routeFromNavigationUrl,
  resolveStateRoute,
  toLoadOptions
});
