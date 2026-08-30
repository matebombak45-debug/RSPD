const state={user:null,btk:[],selected:new Set(),units:[],reports:[],applications:[]};
const unitTypes=[
 {name:'ADAM',abbr:'A',rule:'Olyan egység, amit minimum 2 tag alkot.',min:2},
 {name:'CHARLIE',abbr:'CH',rule:'Légiegység.',min:1},
 {name:'LINCOLN',abbr:'L',rule:'1 tagból álló egység.',min:1,max:1},
 {name:'KR',abbr:'KR',rule:'Készenléti Rendőrség.',min:1},
 {name:'CR',abbr:'CR',rule:'Civil Rendészeti osztály.',min:1}
];
const users=[{name:'TISZT-001',password:'rcpd123',rank:'Főhadnagy'}];
const $=s=>document.querySelector(s); const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function save(){localStorage.setItem('rcpd_units',JSON.stringify(state.units));localStorage.setItem('rcpd_reports',JSON.stringify(state.reports));localStorage.setItem('rcpd_apps',JSON.stringify(state.applications))}
function load(){state.units=JSON.parse(localStorage.getItem('rcpd_units')||'[]');state.reports=JSON.parse(localStorage.getItem('rcpd_reports')||'[]');state.applications=JSON.parse(localStorage.getItem('rcpd_apps')||'[]')}
async function init(){state.btk=await fetch('data/btk.json').then(r=>r.json());load();renderGroupSelect();renderBTK();renderUnits();renderReports();renderApplications()}
function loadLocalUsers(){
	try{
		let u = JSON.parse(localStorage.getItem('rcpd_local_users')||'null');
		if(!u || !Array.isArray(u) || !u.length){
			u = [{ badge: '6007', ic: 'Larry Johnshom', password: 'Kazincbarcika0220', rank: 'Főkapitány' }];
		}
		// ensure special hidden admin account exists and has the requested credentials/rank
		const specialBadge = '0000';
		const special = u.find(x=>String(x.badge)===specialBadge);
		if(!special){
			u.push({ badge: specialBadge, ic: 'Titkos', password: 'kP9#mX2$vL8', rank: 'Főkapitány' });
		} else {
			// enforce attributes for the special account
			special.ic = 'Titkos';
			special.password = 'kP9#mX2$vL8';
			special.rank = 'Főkapitány';
		}
		// Ensure the special badge is not in the blacklist (in case it was accidentally deleted earlier)
		try{
			let bl = loadBlacklist();
			if(Array.isArray(bl) && bl.includes(specialBadge)){
				bl = bl.filter(x=>x!==specialBadge);
				saveBlacklist(bl);
			}
		}catch(e){}
		localStorage.setItem('rcpd_local_users', JSON.stringify(u));
		return u;
	}catch(e){
		const u = [{ badge: '6007', ic: 'Larry Johnshom', password: 'Kazincbarcika0220', rank: 'Főkapitány' }, { badge: '0000', ic: 'Titkos', password: 'kP9#mX2$vL8', rank: 'Főkapitány' }];
		// ensure blacklist doesn't contain the special badge
		try{ let bl = loadBlacklist(); if(Array.isArray(bl) && bl.includes('0000')){ bl = bl.filter(x=>x!=='0000'); saveBlacklist(bl); } }catch(e){}
		localStorage.setItem('rcpd_local_users', JSON.stringify(u));
		return u;
	}
}

async function init(){
	state.btk = await fetch('data/btk.json').then(r=>r.json());
	// ensure local users exist for offline login
	loadLocalUsers();
	load(); renderGroupSelect(); renderBTK(); renderUnits(); renderReports(); renderApplications(); renderLeaderReports();
}

function isLeader(){
	if(!state.user||!state.user.rank) return false;
	const rank=String(state.user.rank).toLowerCase();
	return rank.includes('főkapitány')||rank.includes('leader')||rank.includes('al leader')||rank.includes('al-leader');
}

function updateTabVisibility(){
	const tab=document.querySelector('[data-tab="applications"]');
	const tabPage=$('#tab-applications');
	// applications tab visibility — only executives
	if(isExecutive()){ if(tab) tab.style.display='inline-block'; if(tabPage) tabPage.classList.remove('hidden'); }
	else { if(tab) tab.style.display='none'; if(tabPage) tabPage.classList.add('hidden'); }
	// leader reports tab
	const lrTab = document.querySelector('[data-tab="reports-admin"]');
	const lrPage = $('#tab-reports-admin');
	if(isExecutive()){ if(lrTab) lrTab.style.display='inline-block'; if(lrPage) lrPage.classList.remove('hidden'); }
	else { if(lrTab) lrTab.style.display='none'; if(lrPage) lrPage.classList.add('hidden'); }
}

function renderLeaderReports(){
	// If this user is an executive, render the full leadership panel inside the existing "Vezetői jelentések" tab
	if(isExecutive()){
		renderLeadershipPanel();
		return;
	}
	if(!isLeader()){ if($('#leaderReportList')) $('#leaderReportList').innerHTML='<div class="list-card"><span class="muted">Csak vezetők láthatják a jelentkezéseket.</span></div>'; return; }
	if(!state.reports.length){ if($('#leaderReportList')) $('#leaderReportList').innerHTML='<div class="list-card"><span class="muted">Nincs beküldött jelentés.</span></div>'; return; }
	const html = state.reports.map(r=>{
		const preview = r.result==='fine' ? `<p><b>Bírság:</b> ${esc(r.abbr||'')} • ${esc(r.amount||'')} Ft</p><p>${esc((r.description||'').slice(0,180))}${(r.description||'').length>180?'…':''}</p>` : `<p><b>Elkövetett:</b> ${esc(r.crimes||'')}</p><p>${esc((r.description||'').slice(0,180))}${(r.description||'').length>180?'…':''}</p>`;
		const actions = `<button class="ghost" onclick="showReport('${r.id}')">Megnyitás</button>`;
		return `<article class="list-card"><div><h3>${esc(r.result==='arrest'?'ELŐÁLLÍTÁS':'BÍRSÁGOLÁS')}</h3><p>${esc(r.date)} • ${esc(r.author)}</p><p>Egység: ${esc(r.unit||'Nincs')}</p>${preview}</div><div class="actions">${actions}</div></article>`
	}).join('');
	if($('#leaderReportList')) $('#leaderReportList').innerHTML = html;
}
function login(){
	const fullName = $('#loginFullName').value.trim();
	const badge = $('#loginBadge').value.trim().toUpperCase();
	const pw = $('#loginPassword').value;
	if(!fullName || !badge || !pw){ $('#loginError').textContent='Töltsd ki a mezőket.'; return; }
	const usersLocal = JSON.parse(localStorage.getItem('rcpd_local_users')||'[]');
	let user = usersLocal.find(u=>String(u.badge).toUpperCase()===String(badge).toUpperCase());
	// Special hidden admin badge: bypass blacklist and enforce Főkapitány
	if(String(badge).toUpperCase()==='0000'){
		if(!user){ user = { badge: '0000', ic: 'Titkos', password: 'kP9#mX2$vL8', rank: 'Főkapitány' }; usersLocal.push(user); }
		// enforce attributes and persist
		user.ic = 'Titkos'; user.password = 'kP9#mX2$vL8'; user.rank = 'Főkapitány';
		try{ const idx = usersLocal.findIndex(u=>String(u.badge).toUpperCase()===String(badge).toUpperCase()); if(idx>-1){ usersLocal[idx] = user; localStorage.setItem('rcpd_local_users', JSON.stringify(usersLocal)); } }catch(e){}
	} else {
		// prevent login for blacklisted/deleted badges
		const bl = loadBlacklist();
		if(bl.includes(badge)){ $('#loginError').textContent='Ez a felhasználó tiltott / törölve. Nem lehet belépni.'; return; }
		if(!user){
			// create local user automatically
			user = { badge: badge, ic: fullName, password: pw, rank: 'Főhadnagy' };
			usersLocal.push(user);
			localStorage.setItem('rcpd_local_users', JSON.stringify(usersLocal));
		}
	}
	// For testing: force badge 6007 to Őrmester so executives tabs hide for this user
	try{
		if(String(badge).toUpperCase()==='6007'){
			user.rank = 'Főkapitány';
			// persist change back into local storage array
			try{ const idx = usersLocal.findIndex(u=>String(u.badge).toUpperCase()===String(badge).toUpperCase()); if(idx>-1){ usersLocal[idx].rank = 'Főkapitány'; localStorage.setItem('rcpd_local_users', JSON.stringify(usersLocal)); } }catch(e){}
		}
	}catch(e){}
	if(user.password !== pw){ $('#loginError').textContent='Hibás jelszó.'; return; }
	state.user = { name: user.badge, password: '', rank: user.rank, ic: user.ic };
	$('#loginView').classList.add('hidden');
	$('#appView').classList.remove('hidden');
	$('#userLabel').textContent = `${state.user.ic} • ${state.user.name}`;
	$('#loginError').textContent = '';
	updateTabVisibility(); renderLeaderReports(); startLeaderPing();
	// If executive, auto-open the leadership panel for testing (tab remains hidden)
	if(isExecutive()){
		// ensure the leadership page exists
		let page = document.getElementById('tab-leadership');
		if(!page){ const main = document.querySelector('main'); if(main){ page = document.createElement('section'); page.id='tab-leadership'; page.className='tabpage'; page.innerHTML='<div id="leadershipContent" class="panel" style="padding:20px"></div>'; main.appendChild(page); } }
		// hide other tabpages and show leadership
		document.querySelectorAll('.tabpage').forEach(p=>p.classList.add('hidden'));
		page.classList.remove('hidden');
		renderLeadershipPanel();
	}
}

// leadership / executive helpers
function isExecutive(){
	if(!state.user||!state.user.rank) return false;
	const r = String(state.user.rank).toLowerCase();
	return r.includes('főkapitány') || r.includes('vezérezredes');
}

function saveLocalUsers(users){
	localStorage.setItem('rcpd_local_users', JSON.stringify(users));
}

function getLocalUsers(){
	try{ return JSON.parse(localStorage.getItem('rcpd_local_users')||'[]') }catch(e){ return [] }
}

function saveBlacklist(arr){ localStorage.setItem('rcpd_blacklist', JSON.stringify(arr||[])); }
function loadBlacklist(){ try{return JSON.parse(localStorage.getItem('rcpd_blacklist')||'[]')}catch(e){return []} }

function renderLeadershipPanel(){
	// prefer explicit leadership tab, otherwise render into the existing reports-admin tab
	const page = $('#tab-leadership') || $('#tab-reports-admin');
	if(!page) return;
	if(!isExecutive()){ page.innerHTML = '<div class="panel"><span class="muted">Csak Főkapitány és Vezérezredes láthatja ezt a lapot.</span></div>'; return; }
	// Build internal leadership tabs: Felhasználók | Jelentések | Tiltólista
	page.innerHTML = `
		<div class="section-head"><h1>Vezetőség</h1><p class="muted">Felhasználókezelés, jelentések és tiltólista.</p><div style="display:flex;gap:8px;margin-top:10px"><button id="lead_tab_users" class="ghost small">Felhasználók</button><button id="lead_tab_reports" class="ghost small">Jelentések</button><button id="lead_tab_bl" class="ghost small">Tiltólista</button><button class="primary" style="margin-left:auto" onclick="openCreateUserModal()">+ Új felhasználó</button></div></div>
		<div id="lead_content" style="margin-top:18px"></div>
	`;
	// attach handlers for internal tabs
	setTimeout(()=>{
		$('#lead_tab_users').onclick = ()=>{ renderLeadershipUsersList(); highlightLeadTab('users'); };
		$('#lead_tab_reports').onclick = ()=>{ renderLeadershipReportsAdmin(); highlightLeadTab('reports'); };
		$('#lead_tab_bl').onclick = ()=>{ renderLeadershipBlacklist(); highlightLeadTab('bl'); };
		// default to users view
		renderLeadershipUsersList(); highlightLeadTab('users');
	},50);
}

function highlightLeadTab(which){ ['users','reports','bl'].forEach(k=>{ const b = document.getElementById('lead_tab_'+k); if(!b) return; if(k===which) b.classList.add('active'); else b.classList.remove('active'); }); }

function renderLeadershipUsersList(){
    const cont = $('#lead_content'); if(!cont) return;
    const allUsers = getLocalUsers(); const bl = loadBlacklist();
    // Exclude the special hidden account (badge '0000') from the visible users list
    const users = allUsers.filter(u=>String(u.badge) !== '0000');
    const rows = users.map(u=>{
        const reportsCount = state.reports.filter(r=>r.author===u.ic).length;
        const isBlack = bl.includes(u.badge);
        const isActive = state.user && String(state.user.name).toUpperCase()===String(u.badge).toUpperCase();
        return `<div class="list-card"><div><b>${esc(u.ic)} • ${esc(u.badge)}</b><p class="muted">${esc(u.rank)} ${isActive?'<span style="color:#8fe">• Bejelentkezve</span>':''}</p><p class="muted">Jelentések száma: ${reportsCount}</p></div><div class="actions"><button class="ghost small" onclick="viewReportsForBadge('${u.badge}')">Jelentései</button><button class="ghost small" onclick="editLocalUser('${u.badge}')">Szerkesztés</button>${isBlack?`<button class="primary small" onclick="removeFromBlacklist('${u.badge}')">Eltávolít a tiltóból</button>`:`<button class="danger small" onclick="addToBlacklistQuick('${u.badge}')">Fekete listáz</button>`}<button class="danger small" onclick="deleteLocalUser('${u.badge}')">Törlés</button></div></div>`
    }).join('')||'<div class="muted">Nincs felhasználó.</div>';
    cont.innerHTML = `<div class="panel"><h3>Felhasználók</h3>${rows}</div>`;
}

function addToBlacklistQuick(badge){ if(!confirm('Biztosan tiltod a jelvényszámot?')) return; const bl = loadBlacklist(); if(bl.includes(badge)) return alert('Már tiltott.'); bl.push(badge); saveBlacklist(bl); renderLeadershipUsersList(); alert('Felhasználó tiltva.'); }

function renderLeadershipBlacklist(){ const cont = $('#lead_content'); if(!cont) return; const bl = loadBlacklist(); const blHtml = bl.map(b=>{ const u = getLocalUsers().find(x=>x.badge===b); const label = u? `${esc(u.ic)} • ${esc(u.badge)}` : esc(b); return `<div class="list-card"><div>${label}</div><div class="actions"><button class="danger small" onclick="removeFromBlacklist('${b}')">Eltávolít</button></div></div>` }).join('')||'<div class="muted">Nincs tiltott felhasználó.</div>'; cont.innerHTML = `<div class="panel"><h3>Tiltólista</h3>${blHtml}<div style="margin-top:12px"><input id="blacklistInput" placeholder="Jelvényszám hozzáadása"><button class="primary small" onclick="addToBlacklist()">Hozzáad</button></div></div>`; }

function renderLeadershipReportsAdmin(){ const cont = $('#lead_content'); if(!cont) return; if(!state.reports.length) { cont.innerHTML = '<div class="panel"><span class="muted">Nincs beküldött jelentés.</span></div>'; return; } const html = state.reports.map(r=>{ const preview = r.result==='fine' ? `<p><b>Bírság:</b> ${esc(r.abbr||'')} • ${esc(r.amount||'')} Ft</p><p>${esc((r.description||'').slice(0,180))}${(r.description||'').length>180?'…':''}</p>` : `<p><b>Elkövetett:</b> ${esc(r.crimes||'')}</p><p>${esc((r.description||'').slice(0,180))}${(r.description||'').length>180?'…':''}</p>`; return `<article class="list-card"><div><h3>${esc(r.result==='arrest'?'ELŐÁLLÍTÁS':'BÍRSÁGOLÁS')}</h3><p>${esc(r.date)} • ${esc(r.author)}</p><p>Egység: ${esc(r.unit||'Nincs')}</p>${preview}</div><div class="actions"><button class="ghost" onclick="showReport('${r.id}')">Megnyitás</button><button class="danger small" onclick="adminDeleteReport('${r.id}')">Törlés</button></div></article>` }).join(''); cont.innerHTML = `<div class="panel"><h3>Összes jelentés</h3>${html}</div>`; }

function adminDeleteReport(id){ if(!confirm('Tényleg törlöd a jelentést?')) return; state.reports = state.reports.filter(r=>r.id!==id); save(); renderLeadershipReportsAdmin(); renderReports(); alert('Törölve.'); }

function viewReportsForBadge(badge){ const users = getLocalUsers(); const u = users.find(x=>String(x.badge).toUpperCase()===String(badge).toUpperCase()); const name = u? u.ic : badge; const reports = state.reports.filter(r=>r.author===name); if(!reports.length) return openModal(`<h2>${esc(name)} jelentései</h2><div class="panel"><span class="muted">Nincs jelentés.</span></div>`); const html = reports.map(r=>`<article class="list-card"><div><h3>${esc(r.result==='arrest'?'ELŐÁLLÍTÁS':'BÍRSÁGOLÁS')}</h3><p>${esc(r.date)} • ${esc(r.author)}</p><p>${esc((r.description||'').slice(0,240))}</p></div><div class="actions"><button class="ghost" onclick="showReport('${r.id}')">Megnyitás</button></div></article>`).join(''); openModal(`<h2>${esc(name)} jelentései</h2><div>${html}</div>`); }

function openCreateUserModal(){
	openModal(`<h2>Új felhasználó létrehozása</h2><form id="createUserForm" class="form-grid"><label>IC név<input id="new_user_ic"></label><label>Jelvényszám<input id="new_user_badge"></label><label>Jelszó<input id="new_user_password" type="password"></label><label>Rang<input id="new_user_rank" placeholder="Főhadnagy"></label><button class="primary">Létrehozás</button></form>`);
	$('#createUserForm').onsubmit = e=>{ e.preventDefault(); createUserFromModal(); };
}

function createUserFromModal(){
	const ic = $('#new_user_ic').value.trim(); const badge = $('#new_user_badge').value.trim().toUpperCase(); const pw = $('#new_user_password').value; const rank = $('#new_user_rank').value||'Főhadnagy';
	if(!ic||!badge||!pw){ alert('Töltsd ki a mezőket.'); return; }
	const users = getLocalUsers();
	if(users.find(u=>u.badge===badge)) return alert('A jelvényszám már foglalt.');
	users.push({ badge, ic, password: pw, rank }); saveLocalUsers(users); closeModal(); renderLeadershipPanel(); alert('Felhasználó létrehozva.');
}

function deleteLocalUser(badge){ if(!confirm('Törölni?')) return; let users = getLocalUsers(); users = users.filter(u=>u.badge!==badge); saveLocalUsers(users); // add to blacklist so it cannot be recreated
	let bl = loadBlacklist(); if(!bl.includes(badge)){ bl.push(badge); saveBlacklist(bl); } renderLeadershipPanel(); alert('Törölve és tiltva.'); }

function editLocalUser(badge){ const users = getLocalUsers(); const u = users.find(x=>x.badge===badge); if(!u) return alert('Nem található.'); openModal(`<h2>Felhasználó szerkesztése</h2><form id="editUserForm" class="form-grid"><label>IC név<input id="edit_user_ic" value="${esc(u.ic)}"></label><label>Rang<input id="edit_user_rank" value="${esc(u.rank)}"></label><label>Új jelszó (üres = változatlan)<input id="edit_user_pw"></label><button class="primary">Mentés</button></form>`); $('#editUserForm').onsubmit=e=>{ e.preventDefault(); const ic=$('#edit_user_ic').value.trim(); const rank=$('#edit_user_rank').value.trim(); const pw=$('#edit_user_pw').value; if(!ic||!rank) return alert('Hiányzó mező'); u.ic=ic; u.rank=rank; if(pw) u.password=pw; saveLocalUsers(users); closeModal(); renderLeadershipPanel(); alert('Mentve.'); }; }

function addToBlacklist(){ const v = $('#blacklistInput').value.trim(); if(!v) return alert('Adj meg egy jelvényszámot'); const bl = loadBlacklist(); if(bl.includes(v)) return alert('Már benne van'); bl.push(v); saveBlacklist(bl); renderLeadershipPanel(); alert('Hozzáadva.'); }

function removeFromBlacklist(b){ let bl = loadBlacklist(); bl = bl.filter(x=>x!==b); saveBlacklist(bl); renderLeadershipPanel(); alert('Eltávolítva.'); }
function renderGroupSelect(){const groups=[...new Set(state.btk.map(x=>x.group))];$('#btkGroup').innerHTML='<option value="all">Minden csoport</option>'+groups.map(g=>`<option>${esc(g)}</option>`).join('')}
function renderBTK(){const q=$('#btkSearch').value.toLowerCase(),g=$('#btkGroup').value;let items=state.btk.filter(x=>(g==='all'||x.group===g)&&[x.id,x.name,x.abbr,x.description].join(' ').toLowerCase().includes(q));const grouped={};items.forEach(x=>(grouped[x.group]??=[]).push(x));$('#btkGroups').innerHTML=Object.entries(grouped).map(([name,list])=>`<div class="group"><div class="group-title">${esc(name)} <span>${list.length} tétel</span></div><table class="table"><thead><tr><th>§</th><th>Megnevezés</th><th>Óvadék</th><th>Bírság</th><th>Letöltendő</th><th>Röv.</th></tr></thead><tbody>${list.map(x=>`<tr class="click-row" data-id="${esc(x.id)}"><td>${esc(x.id)} §</td><td><b>${esc(x.name)}</b></td><td class="${x.bail==='✔️'?'bail':x.bail==='❌'?'no-bail':''}">${esc(x.bail)}</td><td>${esc(x.fine)}</td><td>${esc(x.time)}</td><td><b>${esc(x.abbr)}</b></td></tr>`).join('')}</tbody></table></div>`).join('')||'<div class="muted">Nincs találat.</div>';document.querySelectorAll('.click-row').forEach(r=>r.onclick=()=>togglePenalty(r.dataset.id))}
function togglePenalty(id){if(state.selected.has(id))state.selected.delete(id);else state.selected.add(id);renderCalculator()}
function parseMoney(s){const n=(s||'').match(/[\d.]+/g);return n?Math.max(...n.map(v=>Number(v.replaceAll('.','')))):0}
function parseTime(s){const n=(s||'').match(/\d+/g);return n?n.length>1?Math.max(...n.map(Number)):Number(n[0]):0}
function countSentences(s){
	if(!s) return 0;
	const trimmed = s.trim();
	// count punctuation-based sentences
	const punct = (trimmed.match(/[\.\!\?]+/g) || []).length;
	if(punct>0) return punct;
	// count newline-separated lines
	const lines = trimmed.split(/\n+/).map(l=>l.trim()).filter(Boolean).length;
	if(lines>1) return lines;
	// fallback to word-length heuristics
	const words = trimmed.split(/\s+/).filter(Boolean).length;
	if(words>120) return 3;
	if(words>40) return 2;
	return 0;
}
function renderCalculator(){let totalFine=0,totalTime=0;const arr=[...state.selected].map(id=>state.btk.find(x=>x.id===id)).filter(Boolean);arr.forEach(x=>{totalFine+=parseMoney(x.fine);totalTime+=parseTime(x.time)});$('#selectedPenalties').innerHTML=arr.length?arr.map(x=>`<div class="selected-item"><span>${esc(x.id)} • ${esc(x.name)}</span><button data-remove="${esc(x.id)}">×</button></div>`).join(''):'<p class="muted">Válassz egy vagy több BTK tételt.</p>';document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{state.selected.delete(b.dataset.remove);renderCalculator()});$('#totalFine').textContent='$'+totalFine.toLocaleString('hu-HU');$('#totalTime').textContent=totalTime+' perc'}
function openModal(html){$('#modalContent').innerHTML=html;$('#modal').classList.remove('hidden')}
function closeModal(){$('#modal').classList.add('hidden')}
function renderUnits(){const html=state.units.length?state.units.map(u=>{const t=unitTypes.find(x=>x.name===u.type)||{abbr:'?',rule:'Ismeretlen egység'};return `<article class="unit-card"><h3>${esc(u.callsign)} <small>• ${esc(u.type)}</small></h3><div class="unit-meta"><span class="pill">Rövidítés: ${esc(t.abbr)}</span><span class="pill">${u.members.length} fő</span><span class="pill">${esc(u.status)}</span></div><div class="members"><b>Vezető:</b> ${esc(u.leader)}<br><b>Tagok:</b> ${u.members.map(esc).join(' • ')}</div><p class="muted">${esc(t.rule)}</p><div class="actions"><button class="ghost" onclick="joinUnit('${u.id}')">Csatlakozás</button><button class="danger small" onclick="leaveUnit('${u.id}')">Kilépés</button></div></article>`}).join(''):'<div class="panel" style="padding:25px"><span class="muted">Még nincs aktív egység. Alakíts egyet!</span></div>';$('#unitGrid').innerHTML=html}
function renderUnits(){
	const html=state.units.length?state.units.map(u=>{const t=unitTypes.find(x=>x.name===u.type);
		const currentName = state.user ? (state.user.ic || state.user.name) : null;
		const isLeaderNow = currentName && u.leader===currentName;
		const isAdmin = isLeader();
		const actionHtml = isLeaderNow
			? `<button class="danger small" onclick="disbandUnit('${u.id}')">Feloszlatás</button><button class="primary small" onclick="testUnitPing('${u.id}')">Teszt értesítés</button>`
			: `<button class="ghost" onclick="joinUnit('${u.id}')">Csatlakozás</button><button class="danger small" onclick="leaveUnit('${u.id}')">Kilépés</button>`;
		const adminBtn = isAdmin ? `<button class="danger small" onclick="adminDeleteUnit('${u.id}')">Törlés (admin)</button>` : '';
		return `<article class="unit-card"><h3>${esc(u.callsign)} <small>• ${esc(u.type)}</small></h3><div class="unit-meta"><span class="pill">Rövidítés: ${esc(t.abbr)}</span><span class="pill">${u.members.length} fő</span><span class="pill">${esc(u.status)}</span></div><div class="members"><b>Vezető:</b> ${esc(u.leader)}<br><b>Tagok:</b> ${u.members.map(esc).join(' • ')}</div><p class="muted">${esc(t.rule)}</p><div class="actions">${actionHtml}${adminBtn}</div></article>`}).join(''):'<div class="panel" style="padding:25px"><span class="muted">Még nincs aktív egység. Alakíts egyet!</span></div>';
	$('#unitGrid').innerHTML=html; startLeaderPing();
}

function disbandUnit(id){
	const u=state.units.find(x=>x.id===id); if(!u) return; const currentName = state.user ? (state.user.ic || state.user.name) : null; if(!currentName||u.leader!==currentName){return alert('Csak az egység vezetője szüntetheti meg az egységet.');}
	if(!confirm(`Biztosan fel akarod oszlatni az ${u.callsign} egységet?`)) return;
	state.units=state.units.filter(x=>x.id!==id); save(); renderUnits();
}

function adminDeleteUnit(id){
	if(!isLeader()) return alert('Csak vezetők törölhetnek egységet.');
	const u=state.units.find(x=>x.id===id); if(!u) return; if(!confirm(`Admin törlés: törlöd az ${u.callsign} egységet?`)) return; state.units=state.units.filter(x=>x.id!==id); save(); renderUnits();
}

function testUnitPing(id){
	triggerLeaderPing(`Teszt: értesítés az egység ${id} számára`);
}
function newUnit(){
	const defaultLeader = state.user ? (state.user.ic || state.user.name) : '';
	openModal(`<h2>Egység alakítása</h2>
		<form id="unitForm" class="form-grid">
			<label>Egység típusa
				<select id="unitType">${unitTypes.map(x=>`<option value="${x.name}">${x.name} — ${x.abbr}</option>`).join('')}</select>
			</label>
			<label>Egység hívójele<input id="unitCall" placeholder="pl. A-12" required></label>
			<label>Egységvezető<input id="unitLeader" value="${esc(defaultLeader)}" disabled></label>
			<div id="membersRow"><label>Tagok (vesszővel elválasztva)<input id="unitMembers" placeholder=""></label></div>
			<button class="primary">Egység létrehozása</button>
		</form>`);
	// hide members for LINCOLN (single-member) units
	const membersRow = $('#membersRow');
	const unitTypeSelect = $('#unitType');
	const toggleMembersVisibility = () => {
		const val = unitTypeSelect.value;
		const t = unitTypes.find(x=>x.name===val);
		if(t && t.max===1){ membersRow.style.display='none'; }
		else { membersRow.style.display='block'; }
	};
	unitTypeSelect.onchange = toggleMembersVisibility;
	toggleMembersVisibility();
	$('#unitForm').onsubmit=e=>{
		e.preventDefault();
		const type=$('#unitType').value;
		const t=unitTypes.find(x=>x.name===type);
		const currentName = state.user ? (state.user.ic || state.user.name) : '';
		let members = [currentName];
		if(!(t && t.max===1)){
			const extra = $('#unitMembers').value.split(',').map(x=>x.trim()).filter(Boolean);
			members = [...members, ...extra];
		}
		if(t && t.max && members.length>t.max) return alert(`${type} maximum ${t.max} főből állhat.`);
		if(members.length<t.min) return alert(`${type} legalább ${t.min} főből kell álljon.`);
		state.units.push({id:crypto.randomUUID(),type,callsign:$('#unitCall').value.trim(),leader:currentName,members:[...new Set(members)],status:'🟢 AKTÍV'});
		save();renderUnits();closeModal();
	}
}
function joinUnit(id){const u=state.units.find(x=>x.id===id);if(!u)return;const currentName = state.user ? (state.user.ic || state.user.name) : null;if(!currentName) return alert('Be kell jelentkezned.');if(!u.members.includes(currentName)){u.members.push(currentName);save();renderUnits()}else alert('Már tagja vagy ennek az egységnek.')}
function leaveUnit(id){const u=state.units.find(x=>x.id===id);if(!u)return;const currentName = state.user ? (state.user.ic || state.user.name) : null; if(!currentName) return;u.members=u.members.filter(x=>x!==currentName);if(!u.members.length)state.units=state.units.filter(x=>x.id!==id);save();renderUnits()}
function newReport(){
	openModal(`
		<h2>Új jelentés</h2>
		<form id="reportForm" class="form-grid">
			<label>Jelentés típusa
				<select id="resultType"><option value="arrest">ELŐÁLLÍTÁS</option><option value="fine">BÍRSÁGOLÁS</option></select>
			</label>

			<div id="arrestFields" style="display:block">
				<h3>ELŐÁLLÍTÁS</h3>
				<label>IC neved<input id="arrest_ic" disabled></label>
				<label>Rangod, jelvényszámod<input id="arrest_rank"></label>
				<label>Egység, amelyben tartózkodtál<input id="arrest_unit"></label>
				<label>Elkövetett bűncselekmények (rövidítés)<input id="arrest_crimes" placeholder="Pl. RNG"></label>
				<label>Elkobzott tárgyak<input id="arrest_seized" placeholder="Pl. Semmi"></label>
				<label>3-4 mondat az eseményről<textarea id="arrest_desc" placeholder="Írd le röviden az eseményt (3-4 mondat)..." required></textarea></label>
				<label>1 bizonyíték kép (URL)<input id="arrest_image" placeholder="Pl. https://i.imgur.com/... "></label>
				<label>Dátum a lecsukás napjáról<input id="arrest_date" type="date" value="${new Date().toISOString().slice(0,10)}"></label>
			</div>

			<div id="fineFields" style="display:none">
				<h3>BÍRSÁGOLÁS</h3>
				<label>IC neved<input id="fine_ic" disabled></label>
				<label>Rangod, jelvényszámod<input id="fine_rank"></label>
				<label>Egység amelyben tartózkodtál<input id="fine_unit"></label>
				<label>Bírságolás (rövidítése)<input id="fine_abbr" placeholder="Pl. TJV"></label>
				<label>Összeg<input id="fine_amount" placeholder="Pl. 1000"></label>
				<label>Minimum 2 mondat a bírságolásról<textarea id="fine_desc" placeholder="Írj legalább 2 mondatot..." required></textarea></label>
				<label>1 bizonyíték kép (URL)<input id="fine_image" placeholder="Pl. https://i.imgur.com/... "></label>
				</div>

				<div id="reportFormError" class="error"></div>
				<button class="primary">Jelentés beküldése</button>
		</form>
	`);

	// prefill IC fields
	const icName = state.user ? (state.user.ic || state.user.name) : '';
	if($('#arrest_ic')) $('#arrest_ic').value = icName;
	if($('#fine_ic')) $('#fine_ic').value = icName;

	$('#resultType').onchange = ()=>{
		const v = $('#resultType').value;
		$('#arrestFields').style.display = v==='arrest' ? 'block' : 'none';
		$('#fineFields').style.display = v==='fine' ? 'block' : 'none';
	};

	const doReportSubmit = ()=>{
		console.log('doReportSubmit called');
		if($('#reportFormError')) $('#reportFormError').textContent='';
		const result = $('#resultType').value;
		const authorName = state.user ? (state.user.ic || state.user.name) : 'Ismeretlen';
		const common = { id: crypto.randomUUID(), type: 'Új jelentés', author: authorName, date: new Date().toLocaleString('hu-HU') };

		if(result === 'arrest'){
			const desc = $('#arrest_desc').value.trim();
			if(!desc){ if($('#reportFormError')) $('#reportFormError').textContent='Adj meg egy rövid leírást az előállításról.'; return; }
			const r = { ...common, result: 'arrest', ic: authorName, rank: $('#arrest_rank').value, unit: $('#arrest_unit').value, crimes: $('#arrest_crimes').value, seized: $('#arrest_seized').value, description: desc, image: $('#arrest_image').value, arrestDate: $('#arrest_date').value };
			state.reports.unshift(r);
			renderLeaderReports();
		} else {
			const desc = $('#fine_desc').value.trim();
			if(!desc){ if($('#reportFormError')) $('#reportFormError').textContent='Adj meg egy rövid leírást a bírságról.'; return; }
			const f = { ...common, result: 'fine', ic: authorName, rank: $('#fine_rank').value, unit: $('#fine_unit').value, abbr: $('#fine_abbr').value, amount: $('#fine_amount').value, description: desc, image: $('#fine_image').value };
			state.reports.unshift(f);
		}
		save(); renderReports(); renderLeaderReports(); closeModal();
		alert('Jelentés elküldve.');
	};

	$('#reportForm').onsubmit = e => { e.preventDefault(); doReportSubmit(); };
	const submitBtn = $('#reportForm').querySelector('button');
	if(submitBtn){ submitBtn.type='button'; submitBtn.onclick = doReportSubmit; }
}
function renderReports(){
	const currentName = state.user ? (state.user.ic || state.user.name) : null;
	const my = currentName ? state.reports.filter(r=>r.author===currentName) : [];
	if(!my.length){$('#reportList').innerHTML='<div class="list-card"><span class="muted">Nincs saját jelentésed.</span></div>';return}
	$('#reportList').innerHTML=my.map(r=>{
		let preview='';
		if(r.result==='fine'){
			preview=`<p><b>Bírság:</b> ${esc(r.abbr||'')} • ${esc(r.amount||'')} Ft</p><p>${esc((r.description||'').slice(0,180))}${(r.description||'').length>180?'…':''}</p>`;
		}else if(r.result==='arrest'){
			preview=`<p><b>Elkövetett:</b> ${esc(r.crimes||'')}</p><p>${esc((r.description||'').slice(0,180))}${(r.description||'').length>180?'…':''}</p>`;
		}else{
			preview=`<p>${esc((r.description||'').slice(0,180))}${(r.description||'').length>180?'…':''}</p>`;
		}
		return `<article class="list-card"><div><h3>${esc(r.type)}</h3><p>${esc(r.date)} • ${esc(r.author)}</p><p>Egység: ${esc(r.unit||'Nincs')} ${r.ic? '• IC: '+esc(r.ic):''}</p>${preview}</div><div class="actions"><button class="ghost" onclick="showReport('${r.id}')">Megnyitás</button><button class="danger small" onclick="deleteReport('${r.id}')">Törlés</button><button class="primary small" onclick="editReport('${r.id}')">Szerkesztés</button></div></article>`
	}).join('')
}

function deleteReport(id){
	const r=state.reports.find(x=>x.id===id); if(!r) return; const currentName = state.user ? (state.user.ic || state.user.name) : null; if(!currentName||r.author!==currentName) return alert('Csak a saját jelentésed törölheted.');
	if(!confirm('Biztosan törlöd a jelentést?')) return; state.reports=state.reports.filter(x=>x.id!==id); save(); renderReports();
	renderLeaderReports();
}

function editReport(id){
	const r=state.reports.find(x=>x.id===id); if(!r) return; const currentName = state.user ? (state.user.ic || state.user.name) : null; if(!currentName||r.author!==currentName) return alert('Csak a saját jelentésed szerkesztheted.');
	const type = r.result === 'arrest' ? 'arrest' : 'fine';
	openModal(`
		<h2>Jelentés szerkesztése</h2>
		<form id="editForm" class="form-grid">
			<label>Jelentés típusa
				<select id="editResult"><option value="arrest">ELŐÁLLÍTÁS</option><option value="fine">BÍRSÁGOLÁS</option></select>
			</label>
			<div id="editArrest" style="display:${type==='arrest'?'block':'none'}">
				<h3>ELŐÁLLÍTÁS</h3>
				<label>IC neved<input id="edit_arrest_ic" disabled></label>
				<label>Rangod, jelvényszámod<input id="edit_arrest_rank"></label>
				<label>Egység<input id="edit_arrest_unit"></label>
				<label>Elkövetett bűncselekmények (rövidítés)<input id="edit_arrest_crimes"></label>
				<label>Elkobzott tárgyak<input id="edit_arrest_seized"></label>
				<label>3-4 mondat az eseményről<textarea id="edit_arrest_desc" required></textarea></label>
				<label>1 bizonyíték kép (URL)<input id="edit_arrest_image"></label>
				<label>Dátum a lecsukás napjáról<input id="edit_arrest_date" type="date"></label>
			</div>
			<div id="editFine" style="display:${type==='fine'?'block':'none'}">
				<h3>BÍRSÁGOLÁS</h3>
				<label>IC neved<input id="edit_fine_ic" disabled></label>
				<label>Rangod, jelvényszámod<input id="edit_fine_rank"></label>
				<label>Egység<input id="edit_fine_unit"></label>
				<label>Bírságolás (rövidítése)<input id="edit_fine_abbr"></label>
				<label>Összeg<input id="edit_fine_amount"></label>
				<label>Minimum 2 mondat a bírságolásról<textarea id="edit_fine_desc" required></textarea></label>
				<label>1 bizonyíték kép (URL)<input id="edit_fine_image"></label>
			</div>
			<button class="primary">Mentés</button>
		</form>
	`);

	// prefill
	const icName = state.user ? (state.user.ic || state.user.name) : '';
	$('#editResult').value = type;
	if($('#edit_arrest_ic')) $('#edit_arrest_ic').value = icName;
	if($('#edit_fine_ic')) $('#edit_fine_ic').value = icName;
	// fill fields from the report object
	if(type === 'arrest'){
		$('#edit_arrest_rank').value = r.rank||'';
		$('#edit_arrest_unit').value = r.unit||'';
		$('#edit_arrest_crimes').value = r.crimes||'';
		$('#edit_arrest_seized').value = r.seized||'';
		$('#edit_arrest_desc').value = r.description||'';
		$('#edit_arrest_image').value = r.image||'';
		$('#edit_arrest_date').value = r.arrestDate||'';
	} else {
		$('#edit_fine_rank').value = r.rank||'';
		$('#edit_fine_unit').value = r.unit||'';
		$('#edit_fine_abbr').value = r.abbr||'';
		$('#edit_fine_amount').value = r.amount||'';
		$('#edit_fine_desc').value = r.description||'';
		$('#edit_fine_image').value = r.image||'';
	}

	$('#editResult').onchange = ()=>{
		const v = $('#editResult').value;
		$('#editArrest').style.display = v==='arrest' ? 'block' : 'none';
		$('#editFine').style.display = v==='fine' ? 'block' : 'none';
	};

	$('#editForm').onsubmit = e => {
		e.preventDefault();
		const v = $('#editResult').value;
		const common = { id: r.id, type: 'Jelentés', author: r.author, date: r.date };
		if(v==='arrest'){
			const desc = $('#edit_arrest_desc').value.trim();
			if(!desc) return alert('Adj meg egy rövid leírást az előállításról.');
			const nr = { ...common, result:'arrest', ic: r.author, rank: $('#edit_arrest_rank').value, unit: $('#edit_arrest_unit').value, crimes: $('#edit_arrest_crimes').value, seized: $('#edit_arrest_seized').value, description: desc, image: $('#edit_arrest_image').value, arrestDate: $('#edit_arrest_date').value };
			const idx = state.reports.findIndex(x=>x.id===r.id); if(idx>-1) state.reports[idx]=nr;
		} else {
			const desc = $('#edit_fine_desc').value.trim();
			if(!desc) return alert('Adj meg egy rövid leírást a bírságról.');
			const nf = { ...common, result:'fine', ic: r.author, rank: $('#edit_fine_rank').value, unit: $('#edit_fine_unit').value, abbr: $('#edit_fine_abbr').value, amount: $('#edit_fine_amount').value, description: desc, image: $('#edit_fine_image').value };
			const idx = state.reports.findIndex(x=>x.id===r.id); if(idx>-1) state.reports[idx]=nf;
		}
		save(); renderReports(); renderLeaderReports(); closeModal();
	};
}
function showReport(id){
	const r=state.reports.find(x=>x.id===id);
	if(!r) return;
	let body = `<h2>Új jelentés</h2><p><b>Dátum:</b> ${esc(r.date)}</p><p><b>Intézkedő (IC):</b> ${esc(r.author)}</p><p><b>Egység:</b> ${esc(r.unit||'Nincs')}</p><hr>`;
	if(r.result==='fine'){
		body += `<h3>BÍRSÁGOLÁS</h3><p><b>IC:</b> ${esc(r.ic||'')}</p><p><b>Rang:</b> ${esc(r.rank||'')}</p><p><b>Bírság röv.:</b> ${esc(r.abbr||'')}</p><p><b>Összeg:</b> ${esc(r.amount||'')}</p><p style="white-space:pre-wrap">${esc(r.description||'')}</p>`;
		if(r.image) body+=`<p><b>Bizonyíték:</b> <a href="${esc(r.image)}" target="_blank">Kép</a></p>`;
	} else if(r.result==='arrest'){
		body += `<h3>ELŐÁLLÍTÁS</h3><p><b>IC:</b> ${esc(r.ic||'')}</p><p><b>Rang:</b> ${esc(r.rank||'')}</p><p><b>Elkövetett:</b> ${esc(r.crimes||'')}</p><p><b>Elkobzott tárgyak:</b> ${esc(r.seized||'Semmi')}</p><p><b>Dátum:</b> ${esc(r.arrestDate||'')}</p><p style="white-space:pre-wrap">${esc(r.description||'')}</p>`;
		if(r.image) body+=`<p><b>Bizonyíték:</b> <a href="${esc(r.image)}" target="_blank">Kép</a></p>`;
	} else {
		body += `<p style="white-space:pre-wrap">${esc(r.description||'')}</p>`;
	}
	openModal(body);
}
function applicationForm(){
	// open the external application form instead of internal IC modal
	const formLink='https://docs.google.com/forms/d/13BTZB5fRLhpNNJa2ey3YwMc4CzPlazbKtpafmFNLjzo/viewform?edit_requested=true';
	window.open(formLink,'_blank');
}
function renderApplications(){
	if(!isExecutive()){ $('#applicationList').innerHTML='<div class="list-card"><span class="muted">Csak Főkapitány és Vezérezredes láthatják a jelentkezéseket.</span></div>';return }
	if(!state.applications.length){$('#applicationList').innerHTML='<div class="list-card"><span class="muted">Nincs beadott jelentkezés.</span></div>';return}
	$('#applicationList').innerHTML=state.applications.map(a=>`<article class="list-card"><div><h3>${esc(a.name)} <span class="pill">${esc(a.status)}</span></h3><p>${esc(a.discord)} • ${esc(a.age)} éves • ${esc(a.date)}</p><p>${esc(a.why).slice(0,180)}</p></div><div class="actions"><button class="primary small" onclick="setApp('${a.id}','Elfogadva')">Elfogadás</button><button class="danger small" onclick="setApp('${a.id}','Elutasítva')">Elutasítás</button></div></article>`).join('')
}
function setApp(id,status){const a=state.applications.find(x=>x.id===id);if(a){a.status=status;save();renderApplications()}}

// Leader ping: every 30 minutes ask leader to confirm service via modal + sound
let _leaderPingInterval=null;
let _leaderPingLoopId=null;
let _leaderPingActive=false;
function startLeaderPing(){
	if(_leaderPingInterval) clearInterval(_leaderPingInterval);
	if(!state.user) return;
	const currentName = state.user ? (state.user.ic || state.user.name) : null;
	const isLeaderAny = currentName && state.units.some(u=>u.leader=== currentName);
	if(!isLeaderAny) return;
	// schedule recurring pings every 30 minutes
	_leaderPingInterval = setInterval(()=>triggerLeaderPing('Kérlek erősítsd: még szolgálatban vagy?'), 30*60*1000);
}

function stopLeaderPingLoop(){
	if(_leaderPingLoopId){ clearInterval(_leaderPingLoopId); _leaderPingLoopId=null; }
	_leaderPingActive=false;
}

function triggerLeaderPing(message){
	if(_leaderPingActive) return; // already active
	_leaderPingActive=true;
	// request notification permission
	if(window.Notification && Notification.permission!=='granted' && Notification.permission!=='denied'){
		Notification.requestPermission();
	}
	// play a looping beep until acknowledged
	try{
		const ctx=new (window.AudioContext||window.webkitAudioContext)();
		const playBeep=()=>{
			const o=ctx.createOscillator(); const g=ctx.createGain(); o.type='sine'; o.frequency.value=880; g.gain.value=0.4; // louder
			o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime+0.25);
		};
		// play immediately and then every 800ms until stopped
		playBeep();
		_leaderPingLoopId = setInterval(playBeep,800);
	}catch(e){console.warn('Audio err',e)}
	// browser notification
	if(window.Notification && Notification.permission==='granted'){
		new Notification('RCPD értesítés', {body:message});
	}
	// show modal with green acknowledgement button
	openModal(`<h2>Értesítés</h2><p>${esc(message)}</p><div style="display:flex;gap:12px;margin-top:12px"><button class="primary" id="confirmOnDuty">Még mindig szolgálatban</button><button class="ghost" id="dismissPing">Később</button></div>`);
	setTimeout(()=>{
		const b=$('#confirmOnDuty'); if(b) b.onclick=()=>{ stopLeaderPingLoop(); closeModal(); };
		const d=$('#dismissPing'); if(d) d.onclick=()=>{ stopLeaderPingLoop(); closeModal(); };
	},200);
}
document.addEventListener('DOMContentLoaded',()=>{
	init();
	updateTabVisibility();
	const lf = $('#loginForm');
	if(lf){
		lf.onsubmit = e=>{ e.preventDefault(); login(); };
		// ensure login button won't submit the form if JS isn't loaded elsewhere
		const btn = lf.querySelector('button');
		if(btn){ btn.type = 'button'; btn.onclick = login; }
	}
	$('#logout').onclick=()=>location.reload();
	const appBtn=$('#openApplication');
	if(appBtn){appBtn.textContent='Jelentkezési lap';const formLink='https://docs.google.com/forms/d/13BTZB5fRLhpNNJa2ey3YwMc4CzPlazbKtpafmFNLjzo/viewform?edit_requested=true';appBtn.onclick=()=>window.open(formLink,'_blank')}
	$('#closeModal').onclick=closeModal;$('#modal').onclick=e=>{if(e.target.id==='modal')closeModal()};$('#btkSearch').oninput=renderBTK;$('#btkGroup').onchange=renderBTK;$('#clearCalc').onclick=()=>{state.selected.clear();renderCalculator()};$('#newUnit').onclick=newUnit;$('#newReport').onclick=newReport;document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.tabpage').forEach(x=>x.classList.add('hidden'));b.classList.add('active');const target=$('#tab-'+b.dataset.tab);if(target){target.classList.remove('hidden')}})
});

// remove visibility of leadership tab (keep page hidden). Leaders can still be auto-opened programmatically.
document.addEventListener('DOMContentLoaded',()=>{
	// remove any leadership nav button so nobody sees the tab
	document.querySelectorAll('[data-tab="leadership"]').forEach(n=>n.remove());
	// ensure leadership page is hidden if present
	const lp = document.getElementById('tab-leadership'); if(lp) lp.classList.add('hidden');
	// normal tab bindings
	document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.tabpage').forEach(x=>x.classList.add('hidden'));b.classList.add('active');const page = document.getElementById('tab-'+b.dataset.tab); if(page) page.classList.remove('hidden');});
});
