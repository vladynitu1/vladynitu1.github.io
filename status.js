/* ===== Membri + status site =====
   - La prima intrare, fiecare membru își scrie NUMELE și PRENUMELE (fără cont, fără parolă).
   - Jos: „N online | N total”. Adminul (conectat) apasă pe cifre și vede LISTA cu nume.
   Se încarcă pe fiecare pagină cu: <script src="status.js?v=6" defer></script>
   Lista permanentă (total) și numele celor online folosesc Firebase Realtime Database (gratuit).
   Completează DB_URL mai jos (vezi instrucțiunile). Fără DB_URL: merge doar numărătoarea + lista celor online. */
(function(){
  'use strict';

  var DB_URL = 'https://vlad-79c7d-default-rtdb.firebaseio.com/'; // <-- ÎNLOCUIEȘTE

  var BEAT_MS   = 20000;   // trimite „sunt aici” la 20s
  var ONLINE_MS = 50000;   // cine a dat semn în ultimele 50s e online
  var POLL_MS   = 15000;   // reîmprospătează cifrele la 15s
  var STALE_MS  = 300000;  // curăță intrările mai vechi de 5 minute
  var DEBUG = /[?&]statusdebug\b/.test(location.search) || (function(){ try { return !!localStorage.getItem('st_debug'); } catch(e){ return false; } })();

  var CONFIGURED = !!DB_URL && DB_URL.indexOf('PROIECTUL-TAU') === -1;
  DB_URL = DB_URL.replace(/\/+$/, '');

  /* ---------- stocare locală + id de dispozitiv ---------- */
  function store(kind){ try { var s = window[kind]; s.setItem('_t','1'); s.removeItem('_t'); return s; } catch(e){ return null; } }
  var LS = store('localStorage'), SS = store('sessionStorage'), mem = {};
  function get(k){ return (LS && LS.getItem(k)) || (SS && SS.getItem(k)) || mem[k] || null; }
  function set(k,v){ mem[k]=v; if (LS) LS.setItem(k,v); else if (SS) SS.setItem(k,v); }
  function isAdmin(){ try { return !!localStorage.getItem('emx_gh_token'); } catch(e){ return false; } }

  var id = get('st_id');
  if (!id) { id = 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2,8); set('st_id', id); }
  var PAGE = location.pathname.split('/').pop().replace(/\.html$/,'') || 'index';
  var PAGES = { index:'Acasă', fisalucru:'Fișă de lucru', salariu:'Calcul salariu', fisapontaj:'Pontaj', test:'Pontaj (test)', intarzieri:'Întârzieri', bani:'Bani de luat', cs2:'CS2', am:'AM', turnus:'Turnus' };

  /* ---------- nume ---------- */
  function clean(s){ return String(s||'').replace(/[^\p{L}\s'’-]/gu,'').replace(/\s+/g,' ').trim().slice(0,30); }
  function tcase(s){ return s.toLowerCase().replace(/(^|[\s'’-])(\p{L})/gu, function(m,a,b){ return a + b.toUpperCase(); }); }
  function letters(s){ return (s.match(/\p{L}/gu) || []).length; }
  function getMember(){ try { var m = JSON.parse(get('emx_member') || 'null'); return m && m.n ? m : null; } catch(e){ return null; } }
  var member = getMember();
  // cheia unui membru = numele normalizat: același nume pe mai multe dispozitive = aceeași persoană
  function nameKey(n){
    var t = String(n||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().split(' ').filter(Boolean).sort();
    return 'n_' + t.join('_');
  }
  function myKey(){ return nameKey(member && member.n); }

  /* ---------- stiluri ---------- */
  var css = document.createElement('style');
  css.textContent =
    '#st-pill{position:fixed;left:12px;bottom:12px;z-index:60;display:flex;align-items:center;gap:10px;padding:7px 13px;border-radius:999px;' +
      'font:600 12px/1 "Share Tech Mono",ui-monospace,Menlo,Consolas,monospace;letter-spacing:.04em;color:var(--txt,#eee);background:var(--surf,rgba(15,15,15,.92));' +
      'border:1px solid var(--bord2,rgba(255,255,255,.18));box-shadow:0 4px 18px rgba(0,0,0,.45);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);' +
      'user-select:none;opacity:0;transform:translateY(8px);transition:opacity .4s ease,transform .4s ease;pointer-events:none}' +
    '#st-pill.on{opacity:1;transform:none}' +
    '#st-pill.adm{pointer-events:auto}' +
    '#st-pill.adm [data-k]{cursor:pointer}#st-pill.adm [data-k]:hover b{text-decoration:underline}' +
    '#st-pill .st-sep{width:1px;height:12px;background:var(--bord2,rgba(255,255,255,.2))}' +
    '#st-pill .st-dot{width:8px;height:8px;border-radius:50%;background:#2ee66b;box-shadow:0 0 0 0 rgba(46,230,107,.6);animation:stPulse 1.8s infinite;flex:none}' +
    '#st-pill b{font-weight:700;color:var(--acc,#2ee66b)}#st-pill .st-lbl{color:var(--txtm,#aaa);font-weight:500}' +
    '#st-pill.err .st-dot{background:#ff3b30;animation:none}#st-pill.err{pointer-events:auto}' +
    '@keyframes stPulse{0%{box-shadow:0 0 0 0 rgba(46,230,107,.55)}70%{box-shadow:0 0 0 7px rgba(46,230,107,0)}100%{box-shadow:0 0 0 0 rgba(46,230,107,0)}}' +
    '@media(max-width:480px){#st-pill{left:8px;bottom:8px;font-size:11px;padding:6px 11px;gap:8px}}' +
    /* ferestre (formular nume + liste) */
    '.st-ov{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;background:rgba(0,0,0,.78);' +
      'backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);font-family:"Exo 2",system-ui,sans-serif}' +
    '#st-gate{z-index:99999}#st-list{z-index:9998}' +
    '.st-box{width:100%;max-width:420px;max-height:82vh;overflow-y:auto;box-sizing:border-box;padding:22px 20px;border-radius:14px;color:var(--txt,#eee);' +
      'background:var(--surf,#101010);border:1px solid var(--bord2,#2a2a2a);box-shadow:0 20px 60px rgba(0,0,0,.6)}' +
    '.st-box h2{margin:0 0 6px;font-size:19px;font-weight:700;letter-spacing:.02em}' +
    '.st-box p{margin:0 0 14px;font-size:13px;line-height:1.5;color:var(--txtm,#aaa)}' +
    '.st-box label{display:block;margin:10px 0 5px;font:600 11px/1 "Share Tech Mono",monospace;letter-spacing:.08em;text-transform:uppercase;color:var(--txtm,#aaa)}' +
    '.st-box input{width:100%;box-sizing:border-box;padding:11px 12px;border-radius:9px;border:1px solid var(--bord2,#333);background:var(--surf2,#181818);color:var(--txt,#eee);font-size:16px;outline:none}' +
    '.st-box input:focus{border-color:var(--acc,#ff1f3d)}' +
    '.st-btn{display:block;width:100%;margin-top:16px;padding:12px;border-radius:9px;border:1px solid var(--acc,#ff1f3d);background:var(--acc,#ff1f3d);color:#fff;font:700 14px "Exo 2",system-ui,sans-serif;cursor:pointer}' +
    '.st-err{min-height:16px;margin-top:8px;font-size:12px;color:#ff6b6b}' +
    '.st-top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}' +
    '.st-x{background:none;border:0;color:var(--txtm,#aaa);font-size:20px;cursor:pointer;line-height:1;padding:2px 6px}' +
    '.st-row{display:flex;flex-wrap:wrap;align-items:center;gap:2px 10px;padding:9px 2px;border-top:1px solid var(--bord,#222)}' +
    '.st-row:first-of-type{border-top:0}' +
    '.st-row .st-d{width:8px;height:8px;border-radius:50%;background:#555;flex:none}.st-row.on .st-d{background:#2ee66b}' +
    '.st-row .st-n{flex:1;min-width:0;font-size:14px;font-weight:600;word-break:break-word}' +
    '.st-row .st-s{flex:0 0 100%;box-sizing:border-box;padding-left:18px;font:11px/1.4 "Share Tech Mono",monospace;color:var(--txtm,#aaa);text-align:left;white-space:normal}' +
    '.st-note{font-size:12px;color:var(--txtm,#aaa);line-height:1.5}' +
    '.st-box input.st-q{margin-bottom:6px;padding:8px 10px;font-size:14px}';
  document.head.appendChild(css);

  function onReady(fn){ if (document.body) fn(); else document.addEventListener('DOMContentLoaded', fn, { once:true }); }
  function el(tag, attrs, text){ var e = document.createElement(tag); if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]); if (text != null) e.textContent = text; return e; }

  /* ---------- formularul de la prima intrare ---------- */
  function showGate(done){
    var ov = el('div', { 'class':'st-ov', id:'st-gate', role:'dialog', 'aria-modal':'true' });
    var box = el('div', { 'class':'st-box' });
    box.appendChild(el('h2', null, 'Bine ai venit!'));
    box.appendChild(el('p', null, 'Scrie numele și prenumele tău.'));
    box.appendChild(el('label', { 'for':'st-nume' }, 'Nume'));
    var iN = el('input', { id:'st-nume', type:'text', autocomplete:'family-name', maxlength:'30', placeholder:'ex. Nițu' });
    box.appendChild(iN);
    box.appendChild(el('label', { 'for':'st-prenume' }, 'Prenume'));
    var iP = el('input', { id:'st-prenume', type:'text', autocomplete:'given-name', maxlength:'30', placeholder:'ex. Ionuț-Vladuț' });
    box.appendChild(iP);
    var err = el('div', { 'class':'st-err' });
    box.appendChild(err);
    var btn = el('button', { 'class':'st-btn', type:'button' }, 'Continuă');
    box.appendChild(btn);
    ov.appendChild(box); document.body.appendChild(ov);
    var prevOv = document.documentElement.style.overflow; document.documentElement.style.overflow = 'hidden';
    setTimeout(function(){ iN.focus(); }, 50);

    function submit(){
      var a = clean(iN.value), b = clean(iP.value);
      if (letters(a) < 2 || letters(b) < 2) { err.textContent = 'Completează numele și prenumele .'; return; }
      var n = tcase(a) + ' ' + tcase(b);
      set('emx_member', JSON.stringify({ n:n, t:Date.now() }));
      member = { n:n };
      document.documentElement.style.overflow = prevOv;
      ov.parentNode.removeChild(ov);
      done();
    }
    btn.onclick = submit;
    [iN, iP].forEach(function(i){ i.addEventListener('keydown', function(e){ if (e.key === 'Enter') submit(); }); });
  }

  /* ---------- „pastila” de jos ---------- */
  var pill = el('div', { id:'st-pill', 'aria-live':'polite' });
  function pillHtml(){
    return '<span class="st-dot"></span>' +
      '<span data-k="on"><b id="st-on">–</b><span class="st-lbl"> online</span></span>' +
      '<span class="st-sep"></span>' +
      '<span data-k="tot"><b id="st-tot">–</b><span class="st-lbl"> total</span></span>';
  }
  pill.innerHTML = pillHtml();
  onReady(function(){ document.body.appendChild(pill); });

  var elOn, elTot, shown = { on:null, tot:null };
  function setNum(e, from, to){
    if (!e) return to;
    if (from == null || from === to) { e.textContent = to; return to; }
    var t0 = performance.now(), dur = 600;
    (function step(t){ var p = Math.min(1,(t-t0)/dur); e.textContent = Math.round(from + (to-from)*p); if (p < 1) requestAnimationFrame(step); })(t0);
    return to;
  }
  function render(on, tot){
    elOn = elOn || document.getElementById('st-on'); elTot = elTot || document.getElementById('st-tot');
    if (typeof on === 'number')  shown.on  = setNum(elOn,  shown.on,  on);
    if (typeof tot === 'number') shown.tot = setNum(elTot, shown.tot, tot);
    pill.classList.add('on');
    pill.classList.toggle('adm', isAdmin());
  }
  function showErr(msg){
    console.warn('[status.js] ' + msg);
    if (!DEBUG) return;
    pill.classList.add('err','on');
    pill.innerHTML = '<span class="st-dot"></span><span class="st-lbl">status: ' + String(msg).replace(/[<>&]/g,'') + '</span>';
    elOn = elTot = null; shown = { on:null, tot:null };
  }
  function clearErr(){ if (!pill.classList.contains('err')) return; pill.classList.remove('err'); pill.innerHTML = pillHtml(); }
  function explain(e){
    var m = String(e && e.message || e);
    if (m === '401' || m === '403') return 'Firebase refuză (verifică Rules)';
    if (m === '404') return 'URL Firebase greșit';
    if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return 'nu se poate conecta la Firebase (verifică DB_URL)';
    return 'eroare ' + m;
  }

  /* ---------- listele (doar pentru admin) ---------- */
  function fmt(ts){ try { return new Date(ts).toLocaleString('ro-RO', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }); } catch(e){ return String(ts); } }
  function ago(ts){ var s = Math.max(0, Math.round((Date.now() - ts)/1000)); return s < 60 ? 'acum ' + s + ' s' : s < 3600 ? 'acum ' + Math.round(s/60) + ' min' : fmt(ts); }

  function openList(title, build){
    var old = document.getElementById('st-list'); if (old) old.parentNode.removeChild(old);
    var ov = el('div', { 'class':'st-ov', id:'st-list' });
    var box = el('div', { 'class':'st-box' });
    var top = el('div', { 'class':'st-top' }); top.appendChild(el('h2', null, title));
    var x = el('button', { 'class':'st-x', type:'button', 'aria-label':'Închide' }, '✕'); top.appendChild(x);
    box.appendChild(top);
    var body = el('div'); body.appendChild(el('div', { 'class':'st-note' }, 'Se încarcă...')); box.appendChild(body);
    ov.appendChild(box); document.body.appendChild(ov);
    function close(){ if (ov.parentNode) ov.parentNode.removeChild(ov); }
    x.onclick = close; ov.addEventListener('click', function(e){ if (e.target === ov) close(); });
    Promise.resolve().then(function(){ return build(body, top.firstChild); }).catch(function(e){ body.textContent = ''; body.appendChild(el('div', { 'class':'st-note' }, 'Nu am putut încărca lista (' + (e && e.message || e) + ').')); });
  }
  function row(name, sub, on){
    var r = el('div', { 'class':'st-row' + (on ? ' on' : '') });
    r.appendChild(el('span', { 'class':'st-d' })); r.appendChild(el('span', { 'class':'st-n' }, name));
    r.appendChild(el('span', { 'class':'st-s' }, sub)); return r;
  }
  function pageLabel(p){ return PAGES[p] || p || ''; }

  function showOnline(){
    openList('Online acum', function(body, h){
      return provider.online().then(function(list){
        body.textContent = '';
        h.textContent = 'Online acum (' + list.length + ')';
        if (!list.length) body.appendChild(el('div', { 'class':'st-note' }, 'Nimeni.'));
        list.sort(function(a,b){ return (b.t||0) - (a.t||0); }).forEach(function(m){
          body.appendChild(row(m.n || 'Fără nume (vizită veche)', pageLabel(m.p) + ' · ' + ago(m.t), true));
        });
      });
    });
  }
  function showTotal(){
    openList('Toți membrii', function(body, h){
      if (!provider.members) { body.textContent = ''; body.appendChild(el('div', { 'class':'st-note' }, 'Lista completă cu nume se păstrează în baza de date Firebase. Completează DB_URL în status.js (instrucțiunile sunt în conversație) și lista va apărea aici. Până atunci se văd doar cei online acum (apasă pe „online”).')); return; }
      return Promise.all([provider.members(), provider.online()]).then(function(res){
        var all = res[0], onl = {}; res[1].forEach(function(m){ onl[m.id] = 1; });
        body.textContent = '';
        h.textContent = 'Toți membrii (' + all.length + ')';
        var q = el('input', { 'class':'st-q', type:'text', placeholder:'Caută după nume...' }); body.appendChild(q);
        var holder = el('div'); body.appendChild(holder);
        all.sort(function(a,b){ return (b.l||0) - (a.l||0); });
        function draw(){
          var t = clean(q.value).toLowerCase(); holder.textContent = '';
          all.filter(function(m){ return !t || (m.n||'').toLowerCase().indexOf(t) >= 0; }).forEach(function(m){
            holder.appendChild(row(m.n || 'Fără nume', 'prima dată: ' + fmt(m.f) + ' · ultima: ' + fmt(m.l), !!onl[m.id]));
          });
          if (!holder.firstChild) holder.appendChild(el('div', { 'class':'st-note' }, 'Niciun rezultat.'));
        }
        q.addEventListener('input', draw); draw();
      });
    });
  }
  pill.addEventListener('click', function(e){
    if (!isAdmin()) return;
    var t = e.target.closest('[data-k]'); if (!t) return;
    if (t.getAttribute('data-k') === 'on') showOnline(); else showTotal();
  });

  /* ---------- furnizor de date: Firebase ---------- */
  function api(path, opt){
    var q = path.indexOf('?'), url = DB_URL + (q < 0 ? path + '.json' : path.slice(0,q) + '.json' + path.slice(q));
    return fetch(url, opt).then(function(r){ if(!r.ok) throw new Error(r.status); return r.json(); });
  }
  function jput(path, body, method){ return api(path, { method:method || 'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body), keepalive:true }); }
  function fbOnlineList(){
    var now = Date.now();
    return api('/presence?orderBy=%22t%22&startAt=' + (now - STALE_MS)).then(function(list){
      list = list || []; var out = [];
      Object.keys(list).forEach(function(k){ var v = list[k]; if (v && typeof v.t === 'number' && now - v.t <= ONLINE_MS) out.push({ id:k, n:v.n, p:v.p, t:v.t }); });
      return out;
    });
  }
  var firebase = {
    beat: function(){ return jput('/presence/' + myKey(), { t:Date.now(), p:PAGE, n:member.n }).catch(function(e){ showErr(explain(e)); }); },
    register: function(){
      var key = myKey(), known = get('st_reg') === key, sv = { '.sv':'timestamp' };
      // prima dată pe acest dispozitiv: dacă numele există deja (înregistrat de alt dispozitiv), doar actualizez „ultima intrare”
      var p = known ? jput('/members/' + key, { l:sv }, 'PATCH')
                    : api('/members/' + key + '/f').then(function(f){
                        var body = { l:sv }; if (f == null) { body.n = member.n; body.f = sv; }
                        return jput('/members/' + key, body, 'PATCH');
                      });
      return p.then(function(){ set('st_reg', key); }).catch(function(e){ showErr(explain(e)); });
    },
    online: fbOnlineList,
    members: function(){ return api('/members').then(function(o){ o = o || {}; return Object.keys(o).map(function(k){ var v = o[k] || {}; return { id:k, n:v.n, f:v.f, l:v.l }; }); }); },
    total: function(){ return api('/members?shallow=true').then(function(o){ return o ? Object.keys(o).length : 0; }); },
    cleanup: function(){
      if (Math.random() > 0.15) return;
      api('/presence?orderBy=%22t%22&endAt=' + (Date.now() - STALE_MS)).then(function(old){
        if (!old) return; var patch = {}; Object.keys(old).slice(0,50).forEach(function(k){ patch[k] = null; });
        return jput('/presence', patch, 'PATCH');
      }).catch(function(){});
    }
  };

  /* ---------- furnizor de date: servicii publice, fără cont (doar „online” cu nume) ---------- */
  var NS = 'vladynitu1-github-io', TOPIC = NS + '-online-k7q2m9x4';
  var PUB_BEAT = 60000, PUB_ONLINE = 150000, PUB_POLL = 60000, PUB_TOTAL_EVERY = 600000;
  function pubBeat(force){
    if (document.hidden && !force) return Promise.resolve();
    return fetch('https://ntfy.sh/' + TOPIC, { method:'POST', body:JSON.stringify({ i:id, k:myKey(), n:member.n, p:PAGE }), keepalive:true })
      .then(function(r){ if(!r.ok) throw new Error('ntfy ' + r.status); })
      .catch(function(e){ console.warn('[status.js] ' + (e && e.message || e)); });
  }
  function pubOnlineList(){
    return fetch('https://ntfy.sh/' + TOPIC + '/json?poll=1&since=4m')
      .then(function(r){ if(!r.ok) throw new Error('ntfy ' + r.status); return r.text(); })
      .then(function(txt){
        var now = Date.now()/1000, seen = {};
        txt.split('\n').forEach(function(l){
          if(!l.trim()) return;
          try {
            var m = JSON.parse(l); if (m.event !== 'message' || now - m.time > PUB_ONLINE/1000 + 5) return;
            var d; try { d = JSON.parse(m.message); } catch(e){ d = { i:m.message }; }
            var kk = d && (d.k || d.i);
            if (kk && (!seen[kk] || seen[kk].t < m.time*1000)) seen[kk] = { id:kk, n:d.n, p:d.p, t:m.time*1000 };
          } catch(e){}
        });
        seen[myKey()] = { id:myKey(), n:member.n, p:PAGE, t:Date.now() };
        return Object.keys(seen).map(function(k){ return seen[k]; });
      });
  }
  function pubTotal(){
    var counted = !!get('st_counted');
    var a = 'https://api.counterapi.dev/v1/' + NS + '/vizitatori' + (counted ? '' : '/up');
    var b = 'https://abacus.jasoncameron.dev/' + (counted ? 'get' : 'hit') + '/' + NS + '/vizitatori';
    function num(j){ var n = j && (j.count != null ? j.count : j.value); if (typeof n !== 'number') throw new Error('format'); return n; }
    function ok(n){ set('st_counted','1'); return n; }
    return fetch(a).then(function(r){ if(!r.ok) throw new Error(r.status); return r.json(); }).then(num).then(ok)
      .catch(function(){ return fetch(b).then(function(r){ if(!r.ok) throw new Error(r.status); return r.json(); }).then(num).then(ok); });
  }
  var pubProv = { online: pubOnlineList, members: null, total: pubTotal };
  var provider = CONFIGURED ? firebase : pubProv;

  /* ---------- pornire ---------- */
  function startFirebase(){
    firebase.beat().then(firebase.register).then(function(){ refresh(); firebase.cleanup(); });
    function refresh(){
      Promise.all([ firebase.online(), firebase.total() ]).then(function(res){
        var on = Math.max(1, res[0].length), tot = Math.max(on, res[1] || 0);
        clearErr(); render(on, tot);
      }).catch(function(e){ showErr(explain(e)); });
    }
    setInterval(firebase.beat, BEAT_MS); setInterval(refresh, POLL_MS);
    document.addEventListener('visibilitychange', function(){ if (document.visibilityState === 'visible') firebase.beat().then(refresh); });
    window.addEventListener('pageshow', function(){ firebase.beat(); });
  }

  function startPublic(){
    var last = { on:null, tot:null }, fails = 0, lastTot = 0;
    pubBeat(true);
    function refresh(){
      var got = false;
      var a = pubOnlineList().then(function(l){ last.on = l.length; got = true; }).catch(function(e){ console.warn('[status.js] ' + (e && e.message || e)); });
      var needTot = last.tot == null || Date.now() - lastTot > PUB_TOTAL_EVERY;
      var b = needTot ? pubTotal().then(function(n){ last.tot = n; lastTot = Date.now(); got = true; }).catch(function(e){ console.warn('[status.js] ' + (e && e.message || e)); }) : Promise.resolve();
      return Promise.all([a, b]).then(function(){
        fails = got ? 0 : fails + 1;
        if (last.on == null && last.tot == null) { if (DEBUG) showErr('conexiune eșuată (verifică rețeaua)'); return; }
        clearErr();
        var on = last.on != null ? Math.max(1, last.on) : null, tot = last.tot;
        if (on != null && tot != null) tot = Math.max(on, tot);
        render(on, tot);
      });
    }
    (function loop(){ refresh().then(function(){ setTimeout(loop, PUB_POLL * (1 + Math.min(fails, 4)) + Math.random() * 5000); }); })();
    setInterval(pubBeat, PUB_BEAT);
    document.addEventListener('visibilitychange', function(){ if (document.visibilityState === 'visible') pubBeat(true); });
  }

  function boot(){ if (CONFIGURED) startFirebase(); else startPublic(); }
  onReady(function(){ if (member) boot(); else showGate(boot); });
})();
