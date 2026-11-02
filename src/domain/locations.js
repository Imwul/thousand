import {defaultContext,normalizeContext} from './model.js';

function placeContext(campaign,context){
  const {crew,presentCrew,twist}=campaign.context;
  return normalizeContext({...context,crew,presentCrew,twist});
}

export function rememberLocation(campaign){
  const c=campaign.context;
  if(c.siteId==='unassigned'&&!c.siteName)return;
  campaign.locations??=[];
  const existing=campaign.locations.find(place=>place.id===c.siteId);
  const saved={id:c.siteId,name:c.siteName,context:normalizeContext(c),sourceId:existing?.sourceId??null};
  if(existing)Object.assign(existing,saved);else campaign.locations.push(saved);
}
export function adoptLocation(campaign,run,name){
  if(!run?.adopt)throw new Error('채택할 장소가 없습니다.');
  rememberLocation(campaign);
  const existing=campaign.locations?.find(place=>place.sourceId===run.id);
  if(existing){campaign.context=placeContext(campaign,existing.context);campaign.activeEnemy=null;return;}
  const {crew,presentCrew,twist}=campaign.context;
  const context=normalizeContext({...defaultContext(),crew,presentCrew,twist,...run.adopt,siteId:crypto.randomUUID(),siteName:name||run.generatedName||'이름 없는 탐사지'});
  campaign.context=context;
  campaign.locations??=[];
  campaign.locations.push({id:context.siteId,name:context.siteName,context:structuredClone(context),sourceId:run.id});
  campaign.activeEnemy=null;
}
export function restoreLocation(campaign,id){
  const place=campaign.locations?.find(place=>place.id===id);
  if(!place)throw new Error('저장된 장소가 없습니다.');
  rememberLocation(campaign);campaign.context=placeContext(campaign,place.context);campaign.activeEnemy=null;
}

// Following a result advances in that place's current context. Rerolls keep the old snapshot.
export function prepareContinuation(campaign,run,target){
  const placeTargets=['area','hex','biome-border','door','alternate','activity','creature','combat-start','behavior','hacking','site-name'];
  if(!placeTargets.includes(target))return;
  if(run.adopt&&['area','hex','biome-border','door','activity','site-name'].includes(target)){
    adoptLocation(campaign,run,run.generatedName||run.subline.split(' · ')[0]||run.headline);
  }else if(run.context.siteId!==campaign.context.siteId){
    const saved=campaign.locations?.find(place=>place.id===run.context.siteId);
    if(saved)restoreLocation(campaign,saved.id);
    else{rememberLocation(campaign);campaign.context=placeContext(campaign,run.context);campaign.activeEnemy=null;}
  }
  if(target==='hex'&&Number.isInteger(run.terrain)&&run.context.siteId===campaign.context.siteId)campaign.context.terrain=run.terrain;
  rememberLocation(campaign);
}
