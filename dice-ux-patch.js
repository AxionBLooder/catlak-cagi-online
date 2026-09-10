const DX_S=window.__catlakSupabase;
const DX_APP=document.querySelector('#app');
if(!DX_S||!DX_APP)throw new Error('Çatlak Çağı zar UX katmanı başlatılamadı.');

const dxTxt=e=>String(e?.textContent||'').trim();
const dxIsGM=()=>dxTxt(DX_APP.querySelector('.role'))==='GM';
const dxTab=()=>DX_APP.querySelector('.nav button.on[data-tab]')?.dataset.tab||'';
const dxH=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dxToast=x=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(x);t.classList.remove('hidden');clearTimeout(dxToast.t);dxToast.t=setTimeout(()=>t.classList.add('hidden'),4200)};
let dxBusy=false,dxGmBusy=false,dxKeepY=null,dxKeepUntil=0,dxPaintScheduled=false,dxGmPaintBusy=false;

const dxCss=`
.cc-critical-fail{display:inline-flex;align-items:center;margin-top:6px;padding:4px 8px;border-radius:999px;border:1px solid #8b3948;background:#2b1118;color:#ffb7c2;font-size:.72rem;font-weight:900;letter-spacing:.07em}.cc-gm-dice-box{margin:0 0 14px;padding:12px;border:1px solid var(--line);border-radius:14px;background:#08131f}.cc-gm-dice-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px}.cc-gm-dice-head h3{margin:2px 0 0}.cc-gm-dice-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.cc-gm-die-panel{border:1px solid var(--line);border-radius:12px;padding:10px;background:#0b1723}.cc-gm-die-panel button.primary{width:100%;font-weight:900}.cc-gm-die-results{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;min-height:30px}.cc-gm-die-result{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--line);border-radius:10px;padding:5px 7px;background:#07121d}.cc-gm-die-result b{font-size:1.05rem}.cc-gm-die-result button{padding:2px 6px;font-size:.72rem}.cc-gm-dice-note{font-size:.76rem;color:var(--muted);margin-top:8px}@media(max-width:640px){.cc-gm-dice-grid{grid-template-columns:1fr}}
`;
if(!document.querySelector('#cc-dice-ux-style')){const s=document.createElement('style');s.id='cc-dice-ux-style';s.textContent=dxCss;document.head.appendChild(s)}

function dxRememberScroll(){dxKeepY=window.scrollY;dxKeepUntil=Date.now()+1800}
function dxRestoreScroll(){if(dxKeepY==null||Date.now()>dxKeepUntil){dxKeepY=null;return}requestAnimationFrame(()=>window.scrollTo({top:dxKeepY,left:0,behavior:'auto'}))}

function dxCriticalize(){
  DX_APP.querySelectorAll('.roll,.cc-simple-roll').forEach(row=>{
    const n=Number.parseInt(dxTxt(row.querySelector('.die,.cc-simple-total')),10);
    const existing=row.querySelector('.cc-critical-fail');
    if(n===0){
      if(!existing){const badge=document.createElement('div');badge.className='cc-critical-fail';badge.textContent='KRİTİK BAŞARISIZLIK';const info=row.children?.[1]||row;info.appendChild(badge)}
    }else existing?.remove();
  });
}

async function dxPlayerRoll(btn){
  if(dxBusy||dxIsGM())return;
  const action=btn.dataset.a;if(action!=='stat'&&action!=='weapon')return;
  dxBusy=true;dxRememberScroll();btn.disabled=true;
  try{
    let data,error;
    if(action==='stat')({data,error}=await DX_S.rpc('catlak_roll_stat',{p_character_id:btn.dataset.id,p_stat:btn.dataset.stat}));
    else ({data,error}=await DX_S.rpc('catlak_roll_weapon',{p_inventory_id:btn.dataset.id,p_action:btn.dataset.k}));
    if(error)throw error;
    const total=data?.total;
    dxToast(total==null?`${data?.label||'Zar'}: sonuç yok`:`${data?.label||'Zar'}: ${total}${Number(total)===0?' • KRİTİK BAŞARISIZLIK':''}`);
    [40,140,320,650,1100,1650].forEach(ms=>setTimeout(dxRestoreScroll,ms));
  }catch(e){dxToast('Zar atılamadı: '+(e?.message||String(e)))}finally{btn.disabled=false;dxBusy=false}
}

async function dxLoadGmRolls(){
  const {data,error}=await DX_S.from('catlak_rolls').select('id,roll_kind,total,created_at').in('roll_kind',['gm_d20','gm_d100']).order('created_at',{ascending:false}).limit(20);
  if(error)throw error;return data||[];
}
function dxResultHtml(r){return `<span class="cc-gm-die-result" data-dx-gm-roll="${r.id}"><b>${r.total??'?'}</b><button type="button" class="danger" data-dx-gm-delete="${r.id}" title="Bu GM zarını sil">Sil</button></span>`}
async function dxPaintGmDice(force=false){
  if(dxGmPaintBusy||!dxIsGM()||dxTab()!=='gm')return;
  const live=DX_APP.querySelector('.cc-live-two');if(!live)return;
  const left=live.firstElementChild;if(!left)return;
  let box=left.querySelector('[data-dx-gm-dice]');
  if(box&&!force&&box.dataset.dxReady==='1')return;
  dxGmPaintBusy=true;
  try{
    const rolls=await dxLoadGmRolls();
    const d20=rolls.filter(r=>r.roll_kind==='gm_d20').slice(0,6),d100=rolls.filter(r=>r.roll_kind==='gm_d100').slice(0,6);
    const signature=rolls.map(r=>`${r.id}:${r.roll_kind}:${r.total}`).join('|');
    const html=`<div class="cc-gm-dice-head"><div><div class="eyebrow">GM • ÖZEL ZARLAR</div><h3>d20 & d100</h3></div><button type="button" class="danger small" data-dx-gm-clear>GM Zarlarını Temizle</button></div><div class="cc-gm-dice-grid"><div class="cc-gm-die-panel"><button type="button" class="primary" data-dx-gm-roll-kind="d20">🎲 d20 At</button><div class="cc-gm-die-results">${d20.length?d20.map(dxResultHtml).join(''):'<small class="muted">Henüz d20 yok.</small>'}</div></div><div class="cc-gm-die-panel"><button type="button" class="primary" data-dx-gm-roll-kind="d100">🎲 d100 At</button><div class="cc-gm-die-results">${d100.length?d100.map(dxResultHtml).join(''):'<small class="muted">Henüz d100 yok.</small>'}</div></div></div><div class="cc-gm-dice-note">Bu zarlar yalnız GM hesabında görünür; oyuncuların zar geçmişine düşmez.</div>`;
    if(!box){box=document.createElement('div');box.className='cc-gm-dice-box';box.dataset.dxGmDice='1';const title=left.querySelector('.section-title');title?.after(box)}
    if(box.dataset.dxSignature!==signature){box.innerHTML=html;box.dataset.dxSignature=signature}
    box.dataset.dxReady='1';
  }catch(e){}finally{dxGmPaintBusy=false}
}

async function dxGmRoll(kind){
  if(dxGmBusy||!dxIsGM())return;dxGmBusy=true;
  try{
    const fn=kind==='d100'?'catlak_gm_roll_d100':'catlak_gm_roll_d20';
    const {data,error}=await DX_S.rpc(fn);if(error)throw error;
    dxToast(`GM ${kind}: ${data?.total??'?'}`);const box=DX_APP.querySelector('[data-dx-gm-dice]');if(box)box.dataset.dxReady='';await dxPaintGmDice(true);
  }catch(e){dxToast('GM zarı atılamadı: '+(e?.message||String(e)))}finally{dxGmBusy=false}
}
async function dxGmDelete(id){
  if(dxGmBusy||!dxIsGM())return;dxGmBusy=true;
  try{const {data,error}=await DX_S.rpc('catlak_delete_roll',{p_roll_id:Number(id)});if(error)throw error;if(data!==true)throw new Error('Zar silinemedi.');dxToast('GM zarı silindi.');const box=DX_APP.querySelector('[data-dx-gm-dice]');if(box)box.dataset.dxReady='';await dxPaintGmDice(true)}catch(e){dxToast('GM zarı silinemedi: '+(e?.message||String(e)))}finally{dxGmBusy=false}
}
async function dxGmClear(){
  if(dxGmBusy||!dxIsGM())return;dxGmBusy=true;
  try{const {data,error}=await DX_S.rpc('catlak_gm_clear_private_rolls');if(error)throw error;dxToast(`${Number(data)||0} GM zarı temizlendi.`);const box=DX_APP.querySelector('[data-dx-gm-dice]');if(box)box.dataset.dxReady='';await dxPaintGmDice(true)}catch(e){dxToast('GM zarları temizlenemedi: '+(e?.message||String(e)))}finally{dxGmBusy=false}
}

document.addEventListener('click',e=>{
  const player=e.target.closest('#app button[data-a="stat"],#app button[data-a="weapon"]');
  if(player&&!dxIsGM()){
    e.preventDefault();e.stopImmediatePropagation();dxPlayerRoll(player);return;
  }
  const gr=e.target.closest('[data-dx-gm-roll-kind]');if(gr&&dxIsGM()){e.preventDefault();e.stopImmediatePropagation();dxGmRoll(gr.dataset.dxGmRollKind);return}
  const gd=e.target.closest('[data-dx-gm-delete]');if(gd&&dxIsGM()){e.preventDefault();e.stopImmediatePropagation();dxGmDelete(gd.dataset.dxGmDelete);return}
  const gc=e.target.closest('[data-dx-gm-clear]');if(gc&&dxIsGM()){e.preventDefault();e.stopImmediatePropagation();dxGmClear();return}
},true);

function dxPaint(){dxPaintScheduled=false;dxRestoreScroll();dxCriticalize();if(dxIsGM()&&dxTab()==='gm')dxPaintGmDice()}
function dxSchedule(){if(dxPaintScheduled)return;dxPaintScheduled=true;requestAnimationFrame(dxPaint)}
new MutationObserver(dxSchedule).observe(DX_APP,{childList:true,subtree:true});
DX_S.channel('cc-dice-ux-live').on('postgres_changes',{event:'*',schema:'public',table:'catlak_rolls'},()=>{const box=DX_APP.querySelector('[data-dx-gm-dice]');if(box)box.dataset.dxReady='';setTimeout(dxSchedule,60)}).subscribe();
dxSchedule();

window.__catlakDiceUxTest={criticalize:dxCriticalize,rememberScroll:dxRememberScroll,restoreScroll:dxRestoreScroll};
