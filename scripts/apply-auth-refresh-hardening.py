from pathlib import Path

p = Path('live_08.txt')
s = p.read_text(encoding='utf-8')
start_marker = "st.ses=session;let authRefreshTimer=null,catlakRefreshRun=null,catlakRefreshAgain=false;"
end_marker = "let liveRefreshTimer=null;"
start = s.find(start_marker)
end = s.find(end_marker, start)
if start < 0 or end < 0 or end <= start:
    raise SystemExit('auth/refresh block boundaries not found')

new_block = r'''st.ses=null;let authRefreshTimer=null,catlakRefreshRun=null,catlakRefreshAgain=false,catlakTableReady=false,catlakBootUser=null,catlakBootSeq=0;
function catlakShowLoading(){if(app.querySelector('[data-cc-auth-loading]'))return;app.innerHTML='<main class="auth" data-cc-auth-loading="1"><section class="card"><div class="mark bigmark">◇</div><div class="eyebrow">OTURUM AÇILDI</div><h2>Masa hazırlanıyor…</h2><p class="muted">Karakter ve oyun verileri yükleniyor.</p></section></main>'}
function catlakShowRefreshError(e,uid){if(st.ses?.user?.id!==uid)return;catlakTableReady=false;app.innerHTML='<main class="auth" data-cc-refresh-error="1"><section class="card"><div class="mark bigmark">◇</div><div class="eyebrow">BAĞLANTI KURULDU</div><h2>Oyun verileri yüklenemedi</h2><p class="muted">Oturum açık. Masa verileri zamanında alınamadı. Tekrar deneyebilir veya çıkış yapabilirsin.</p><button class="primary widebtn" id="catlak-refresh-retry">Masa Verilerini Yeniden Yükle</button><button class="widebtn" id="catlak-refresh-logout">Çıkış Yap</button></section></main>';document.querySelector('#catlak-refresh-retry')?.addEventListener('click',()=>{if(st.ses?.user?.id===uid)setTimeout(()=>catlakSafeRefresh('retry'),80)});document.querySelector('#catlak-refresh-logout')?.addEventListener('click',()=>S.auth.signOut());msg(e?.message||'Oyun verileri yüklenemedi.')}
async function catlakSafeRefresh(reason='manual'){if(!st.ses?.user){catlakTableReady=false;render();return}if(catlakRefreshRun){if(catlakTableReady)catlakRefreshAgain=true;return catlakRefreshRun}const uid=st.ses.user.id,seq=++catlakBootSeq;if(!catlakTableReady)catlakShowLoading();catlakRefreshRun=(async()=>{try{await Promise.race([refresh(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Oyun verileri zaman aşımına uğradı. Lütfen tekrar dene.')),10000))]);if(st.ses?.user?.id===uid&&seq===catlakBootSeq){catlakTableReady=true;catlakBootUser=uid}}catch(e){console.error('CATLAK_REFRESH_ERROR',reason,e);if(st.ses?.user?.id===uid&&seq===catlakBootSeq)catlakShowRefreshError(e,uid)}})();try{return await catlakRefreshRun}finally{catlakRefreshRun=null;if(catlakRefreshAgain&&catlakTableReady&&st.ses?.user?.id===uid){catlakRefreshAgain=false;setTimeout(()=>catlakSafeRefresh('queued'),250)}else catlakRefreshAgain=false}}
function catlakBeginSession(s,ev='AUTH'){clearTimeout(authRefreshTimer);if(!s){st.ses=null;catlakTableReady=false;catlakBootUser=null;catlakBootSeq++;render();return}const uid=s.user.id,changed=st.ses?.user?.id!==uid;st.ses=s;if(changed){catlakTableReady=false;catlakBootUser=null;catlakBootSeq++}if(catlakTableReady&&catlakBootUser===uid)return;if(catlakRefreshRun)return;catlakShowLoading();authRefreshTimer=setTimeout(()=>{if(st.ses?.user?.id===uid&&!catlakTableReady&&!catlakRefreshRun)catlakSafeRefresh(ev)},80)}
S.auth.onAuthStateChange((ev,s)=>{setTimeout(()=>catlakBeginSession(s,ev),0)});
if(authBootTimedOut){st.ses=null;render();const card=app.querySelector('.auth .card');if(card){const recovery=document.createElement('div');recovery.className='notice';recovery.innerHTML='<b>Oturum kontrolü yanıt vermedi.</b><p>Tarayıcıda eski veya kilitlenmiş bir oturum kalmış olabilir. Aşağıdaki düğme yalnızca bu siteye ait yerel oturum kaydını temizleyip sayfayı yeniden açar.</p><button type="button" id="catlak-auth-recover">Oturumu Temizle ve Yeniden Aç</button>';card.appendChild(recovery);const recover=document.querySelector('#catlak-auth-recover');if(recover)recover.addEventListener('click',()=>{try{Object.keys(localStorage).filter(k=>/^sb-.*-auth-token$/i.test(k)).forEach(k=>localStorage.removeItem(k))}catch{}location.reload()});}msg('Oturum kontrolü zaman aşımına uğradı.')}else if(session)catlakBeginSession(session,'BOOT');else render();catReady.catch(e=>console.warn('CATLAK_CATALOG_BACKGROUND',e));
'''

s = s[:start] + new_block + s[end:]
old_live = "let liveRefreshTimer=null;const liveRefresh=()=>{clearTimeout(liveRefreshTimer);liveRefreshTimer=setTimeout(()=>{if(st.ses)catlakSafeRefresh()},180)};"
new_live = "let liveRefreshTimer=null;const liveRefresh=()=>{if(!catlakTableReady||!st.ses?.user)return;clearTimeout(liveRefreshTimer);liveRefreshTimer=setTimeout(()=>{if(catlakTableReady&&st.ses?.user)catlakSafeRefresh('realtime')},250)};"
if old_live not in s:
    raise SystemExit('realtime refresh block not found')
s = s.replace(old_live, new_live, 1)
p.write_text(s, encoding='utf-8')
print('single-owner auth/refresh hardening applied')
