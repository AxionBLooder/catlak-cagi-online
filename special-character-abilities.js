(function(){
'use strict';
if(window.__catlakSpecialCharacterAbilitiesV1)return;
window.__catlakSpecialCharacterAbilitiesV1=true;

const S=window.__catlakSupabase;
const APP=document.querySelector('#app');
if(!S||!APP)return;

const norm=x=>String(x??'').trim().toLocaleLowerCase('tr-TR');
const num=(x,d=0)=>Number.isFinite(Number(x))?Number(x):d;
const isGM=()=>String(APP.querySelector('.role')?.textContent||'').trim()==='GM';

const presets=new Map();
presets.set('eeliot',[
  {name:'Kırık İşaret',ability_type:'special',effect_type:'damage',target_type:'enemy',formula:'1d6+2',requires_attack:true,attack_bonus:4,description:'Eeliot’un kırık işaret saldırısı.',uses:3},
  {name:'Wakfu Bağı',ability_type:'special',effect_type:'utility',target_type:'ally',formula:'',requires_attack:false,attack_bonus:0,description:'Eeliot’un Wakfu bağıyla bir müttefiki desteklemesi.',uses:2},
  {name:'Mühürleme',ability_type:'special',effect_type:'utility',target_type:'enemy',formula:'',requires_attack:false,attack_bonus:0,description:'Eeliot’un hedef üzerindeki Çatlak etkisini mühürleme girişimi.',uses:2},
  {name:'Acil Müdahale',ability_type:'special',effect_type:'heal',target_type:'ally',formula:'1d6+3',requires_attack:false,attack_bonus:0,description:'Eeliot’un acil iyileştirme müdahalesi.',uses:1},
  {name:'Çatlak Sezgisi',ability_type:'special',effect_type:'utility',target_type:'self',formula:'',requires_attack:false,attack_bonus:0,description:'Çatlak ve Wakfu izlerini sezmek için kullanılan keşif yeteneği.',uses:null}
]);

let busy=false,timer=null;

function normalizeDef(x){
  if(!x||!String(x.name||'').trim())return null;
  return{
    name:String(x.name).trim(),
    ability_type:['spell','skill','special'].includes(x.ability_type)?x.ability_type:'special',
    effect_type:['damage','heal','utility'].includes(x.effect_type)?x.effect_type:'utility',
    target_type:['enemy','ally','self'].includes(x.target_type)?x.target_type:'self',
    formula:String(x.formula||'').trim(),
    requires_attack:!!x.requires_attack,
    attack_bonus:num(x.attack_bonus),
    description:String(x.description||'').trim(),
    uses:x.uses==null||num(x.uses)<=0?null:num(x.uses)
  };
}

function characterDefs(c){
  const out=[];
  const fixed=presets.get(norm(c?.name));
  if(Array.isArray(fixed))out.push(...fixed);
  const raw=c?.data?.special_abilities;
  if(Array.isArray(raw))out.push(...raw);
  const seen=new Set();
  return out.map(normalizeDef).filter(Boolean).filter(x=>{const k=norm(x.name);if(seen.has(k))return false;seen.add(k);return true});
}

async function state(){
  const [cr,ar,xr]=await Promise.all([
    S.from('catlak_characters').select('id,name,data,play_status').in('play_status',['prepared','active']),
    S.from('catlak_abilities').select('*'),
    S.from('catlak_character_abilities').select('id,character_id,ability_id,uses_per_combat,uses_remaining')
  ]);
  for(const r of [cr,ar,xr])if(r.error)throw r.error;
  return{chars:cr.data||[],abilities:ar.data||[],assignments:xr.data||[]};
}

async function createAbility(def){
  const r=await S.rpc('catlak_gm_save_ability',{
    p_name:def.name,
    p_ability_type:def.ability_type,
    p_effect_type:def.effect_type,
    p_target_type:def.target_type,
    p_formula:def.formula,
    p_requires_attack:def.requires_attack,
    p_attack_bonus:def.attack_bonus,
    p_description:def.description
  });
  if(r.error)throw r.error;
}

async function assignAbility(characterId,abilityId,uses){
  const r=await S.rpc('catlak_gm_assign_ability',{
    p_character_id:characterId,
    p_ability_id:abilityId,
    p_uses_per_combat:uses==null?null:uses
  });
  if(r.error)throw r.error;
}

async function sync(){
  if(busy||!isGM())return false;
  busy=true;
  let changed=false;
  try{
    let d=await state();
    const targets=d.chars.map(c=>({c,defs:characterDefs(c)})).filter(x=>x.defs.length);
    if(!targets.length)return false;

    for(const row of targets){
      for(const def of row.defs){
        let ability=d.abilities.find(a=>norm(a.name)===norm(def.name));
        if(!ability){
          await createAbility(def);changed=true;
          const ar=await S.from('catlak_abilities').select('*');if(ar.error)throw ar.error;d.abilities=ar.data||[];
          ability=d.abilities.find(a=>norm(a.name)===norm(def.name));
          if(!ability)throw new Error(def.name+' oluşturuldu ancak tekrar bulunamadı.');
        }
        const exists=d.assignments.some(x=>String(x.character_id)===String(row.c.id)&&String(x.ability_id)===String(ability.id));
        if(!exists){
          await assignAbility(row.c.id,ability.id,def.uses);changed=true;
          d.assignments.push({character_id:row.c.id,ability_id:ability.id,uses_per_combat:def.uses,uses_remaining:def.uses});
        }
      }
    }
    if(changed){
      try{window.__catlakGmCleanRouter?.renderAbility?.(true)}catch(_){}
      console.info('CATLAK_SPECIAL_CHARACTER_ABILITIES_SYNCED');
    }
    return changed;
  }catch(e){
    console.warn('CATLAK_SPECIAL_CHARACTER_ABILITIES',e);
    return false;
  }finally{busy=false}
}

function soon(ms=120){clearTimeout(timer);timer=setTimeout(sync,ms)}
function register(characterName,defs){
  if(!String(characterName||'').trim()||!Array.isArray(defs))return false;
  presets.set(norm(characterName),defs);soon(0);return true;
}

setTimeout(()=>soon(0),180);
S.channel('cc-special-character-ability-sync')
 .on('postgres_changes',{event:'INSERT',schema:'public',table:'catlak_characters'},()=>soon(250))
 .subscribe();

window.__catlakSpecialCharacterAbilities={sync,register,presets};
})();
