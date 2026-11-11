/* ===== Status site: online acum + total vizitatori =====
   Se încarcă pe fiecare pagină cu: <script src="status.js" defer></script>
   Backend: Firebase Realtime Database (gratuit), prin REST — fără SDK.
   Completează URL-ul bazei de date mai jos (vezi instrucțiunile). */
(function(){
  'use strict';

  var DB_URL = 'https://PROIECTUL-TAU-default-rtdb.europe-west1.firebasedatabase.app'; // <-- ÎNLOCUIEȘTE

  var BEAT_MS   = 20000;   // trimite "sunt aici" la 20s
  var ONLINE_MS = 50000;   // cine a dat semn în ultimele 50s e online
  var POLL_MS   = 15000;   // reîmprospătează cifrele la 15s
  var STALE_MS  = 300000;  // curăță intrările mai vechi de 5 minute
  // erorile se văd doar cu ?statusdebug în adresă (sau localStorage st_debug); altfel indicatorul rămâne liniștit
  var DEBUG = /[?&]statusdebug\b/.test(location.search) || (function(){ try { return !!localStorage.getItem('st_debug'); } catch(e){ return false; } })();

  var CONFIGURED = !!DB_URL && DB_URL.indexOf('PROIECTUL-TAU') === -1;
  DB_URL = DB_URL.replace(/\/+$/, '');

  // ---------- id de dispozitiv (1 dispozitiv = 1 membru, indiferent câte tab-uri/pagini) ----------
  function store(kind){ try { var s = window[kind]; s.setItem('_t','1'); s.removeItem('_t'); return s; } catch(e){ return null; } }
  var LS = store('localStorage'), SS = store('sessionStorage');
  var mem = {};
  function get(k){ return (LS && LS.getItem(k)) || (SS && SS.getItem(k)) || mem[k] || null; }
  function set(k,v){ mem[k]=v; if (LS) LS.setItem(k,v); else if (SS) SS.setItem(k,v); }

  var id = get('st_id');
  if (!id) {
    id = 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2,8);
    set('st_id', id);
  }

  // ---------- UI ----------
  var css = document.createElement('style');
  css.textContent =
    '#st-pill{position:fixed;left:12px;bottom:12px;z-index:60;display:flex;align-items:center;gap:10px;' +
    'padding:7px 13px;border-radius:999px;font:600 12px/1 "Share Tech Mono",ui-monospace,Menlo,Consolas,monospace;' +
    'letter-spacing:.04em;color:var(--txt,#eee);background:var(--surf,rgba(15,15,15,.92));' +
    'border:1px solid var(--bord2,rgba(255,255,255,.18));box-shadow:0 4px 18px rgba(0,0,0,.45);' +
    'backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);user-select:none;opacity:0;transform:translateY(8px);' +
    'transition:opacity .4s ease,transform .4s ease;pointer-events:none}' +
    '#st-pill.on{opacity:1;transform:none}' +
    '#st-pill .st-sep{width:1px;height:12px;background:var(--bord2,rgba(255,255,255,.2))}' +
    '#st-pill .st-dot{width:8px;height:8px;border-radius:50%;background:#2ee66b;box-shadow:0 0 0 0 rgba(46,230,107,.6);' +
    'animation:stPulse 1.8s infinite;flex:none}' +
    '#st-pill b{font-weight:700;color:var(--acc,#2ee66b)}' +
    '#st-pill .st-lbl{color:var(--txtm,#aaa);font-weight:500}' +
    '#st-pill.err .st-dot{background:#ff3b30;animation:none}#st-pill.err{pointer-events:auto}' +
    '@keyframes stPulse{0%{box-shadow:0 0 0 0 rgba(46,230,107,.55)}70%{box-shadow:0 0 0 7px rgba(46,230,107,0)}100%{box-shadow:0 0 0 0 rgba(46,230,107,0)}}' +
    '@media(max-width:480px){#st-pill{left:8px;bottom:8px;font-size:11px;padding:6px 11px;gap:8px}}';
  document.head.appendChild(css);

  var pill = document.createElement('div');
  pill.id = 'st-pill';
  pill.setAttribute('aria-live','polite');
  pill.innerHTML =
    '<span class="st-dot"></span>' +
    '<span><b id="st-on">–</b><span class="st-lbl"> online</span></span>' +
    '<span class="st-sep"></span>' +
    '<span><b id="st-tot">–</b><span class="st-lbl"> total</span></span>';

  function mount(){ document.body.appendChild(pill); }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);

  var elOn, elTot, shown = {on:null, tot:null};
  function setNum(el, from, to){
    if (!el) return to;
    if (from == null || from === to) { el.textContent = to; return to; }
    var t0 = performance.now(), dur = 600;
    (function step(t){
      var p = Math.min(1,(t-t0)/dur), v = Math.round(from + (to-from)*p);
      el.textContent = v;
      if (p < 1) requestAnimationFrame(step);
    })(t0);
    return to;
  }
  function render(on, tot){
    elOn = elOn || document.getElementById('st-on');
    elTot = elTot || document.getElementById('st-tot');
    if (typeof on === 'number')  shown.on  = setNum(elOn,  shown.on,  on);
    if (typeof tot === 'number') shown.tot = setNum(elTot, shown.tot, tot);
    pill.classList.add('on');
  }

  function showErr(msg){
    if (!DEBUG) { console.warn('[status.js] ' + msg); return; }
    pill.classList.add('err','on');
    pill.innerHTML = '<span class="st-dot"></span><span class="st-lbl">status: ' + msg + '</span>';
    elOn = elTot = null; shown = {on:null, tot:null};
    console.warn('[status.js] ' + msg);
  }
  function clearErr(){
    if (!pill.classList.contains('err')) return;
    pill.classList.remove('err');
    pill.innerHTML =
      '<span class="st-dot"></span>' +
      '<span><b id="st-on">–</b><span class="st-lbl"> online</span></span>' +
      '<span class="st-sep"></span>' +
      '<span><b id="st-tot">–</b><span class="st-lbl"> total</span></span>';
  }
  function explain(e){
    var m = String(e && e.message || e);
    if (m === '401' || m === '403') return 'Firebase refuză (verifică Rules)';
    if (m === '404') return 'URL Firebase greșit';
    if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return 'nu se poate conecta la Firebase (verifică DB_URL)';
    return 'eroare ' + m;
  }

  // ---------- rețea ----------
  function api(path, opt){ var q = path.indexOf('?'); var url = DB_URL + (q < 0 ? path + '.json' : path.slice(0,q) + '.json' + path.slice(q)); return fetch(url, opt).then(function(r){ if(!r.ok) throw new Error(r.status); return r.json(); }); }

  function beat(){
    return api('/presence/' + id, {
      method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ t: Date.now(), p: location.pathname.split('/').pop() || 'index' }),
      keepalive:true
    }).catch(function(e){ showErr(explain(e)); });
  }

  // total = dispozitive unice care au intrat vreodată (numărat o singură dată / dispozitiv)
  function countTotalOnce(){
    if (get('st_counted')) return Promise.resolve();
    return api('/stats/total', {
      method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({'.sv':{'increment':1}})
    }).then(function(){ set('st_counted','1'); }).catch(function(){});
  }

  function refresh(){
    var now = Date.now();
    var q = '/presence?orderBy=%22t%22&startAt=' + (now - STALE_MS);
    Promise.all([ api(q), api('/stats/total') ]).then(function(res){
      var list = res[0] || {}, tot = res[1];
      var online = 0;
      Object.keys(list).forEach(function(k){
        var t = list[k] && list[k].t;
        if (typeof t === 'number' && now - t <= ONLINE_MS) online++;
      });
      if (online < 1) online = 1; // tu ești aici
      if (typeof tot !== 'number' || tot < online) tot = Math.max(online, tot || 0);
      clearErr();
      render(online, tot);
    }).catch(function(e){ showErr(explain(e)); });
  }

  // curățenie ocazională: șterge intrările vechi (ca să nu se umple baza)
  function cleanup(){
    if (Math.random() > 0.15) return;
    api('/presence?orderBy=%22t%22&endAt=' + (Date.now() - STALE_MS)).then(function(old){
      if (!old) return;
      var patch = {}; Object.keys(old).slice(0,50).forEach(function(k){ patch[k] = null; });
      return api('/presence', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(patch) });
    }).catch(function(){});
  }

  // ---------- mod fără cont: servicii publice (ntfy.sh pentru "online", counterapi pentru "total") ----------
  // Cereri puține (serviciile gratuite limitează per adresă IP; într-o rețea de birou mai mulți colegi împart același IP).
  var NS = 'vladynitu1-github-io';          // nume unic pentru site-ul tău
  var TOPIC = NS + '-online-k7q2m9x4';      // canal public pentru "online"
  var PUB_BEAT = 60000, PUB_ONLINE = 150000, PUB_POLL = 60000, PUB_TOTAL_EVERY = 600000;
  var pubLast = { on:null, tot:null }, pubFails = 0, lastTotAt = 0;

  function pubBeat(force){
    if (document.hidden && !force) return Promise.resolve();
    return fetch('https://ntfy.sh/' + TOPIC, { method:'POST', body:id, keepalive:true })
      .then(function(r){ if(!r.ok) throw new Error('ntfy ' + r.status); })
      .catch(function(e){ console.warn('[status.js] ' + (e && e.message || e)); });
  }
  function pubOnline(){
    return fetch('https://ntfy.sh/' + TOPIC + '/json?poll=1&since=4m')
      .then(function(r){ if(!r.ok) throw new Error('ntfy ' + r.status); return r.text(); })
      .then(function(txt){
        var now = Date.now()/1000, seen = {};
        txt.split('\n').forEach(function(l){
          if(!l.trim()) return;
          try { var m = JSON.parse(l); if (m.event === 'message' && now - m.time <= PUB_ONLINE/1000 + 5) seen[m.message] = 1; } catch(e){}
        });
        seen[id] = 1;
        return Object.keys(seen).length;
      });
  }
  function pubTotal(){
    var counted = !!get('st_counted');
    var a = counted ? 'https://api.counterapi.dev/v1/' + NS + '/vizitatori'
                    : 'https://api.counterapi.dev/v1/' + NS + '/vizitatori/up';
    var b = counted ? 'https://abacus.jasoncameron.dev/get/' + NS + '/vizitatori'
                    : 'https://abacus.jasoncameron.dev/hit/' + NS + '/vizitatori';
    function num(j){ var n = j && (j.count != null ? j.count : j.value); if (typeof n !== 'number') throw new Error('format'); return n; }
    function ok(n){ set('st_counted','1'); return n; }
    return fetch(a).then(function(r){ if(!r.ok) throw new Error(r.status); return r.json(); }).then(num).then(ok)
      .catch(function(){ return fetch(b).then(function(r){ if(!r.ok) throw new Error(r.status); return r.json(); }).then(num).then(ok); });
  }
  // Fiecare cifră se actualizează independent; la eroare rămâne ultima valoare cunoscută, fără mesaje roșii.
  function pubRefresh(){
    var gotAny = false;
    var pOn = pubOnline().then(function(n){ pubLast.on = n; gotAny = true; }).catch(function(e){ console.warn('[status.js] ' + (e && e.message || e)); });
    var needTot = pubLast.tot == null || Date.now() - lastTotAt > PUB_TOTAL_EVERY;
    var pTot = needTot
      ? pubTotal().then(function(n){ pubLast.tot = n; lastTotAt = Date.now(); gotAny = true; }).catch(function(e){ console.warn('[status.js] ' + (e && e.message || e)); })
      : Promise.resolve();
    return Promise.all([pOn, pTot]).then(function(){
      pubFails = gotAny ? 0 : pubFails + 1;
      if (pubLast.on == null && pubLast.tot == null) { if (DEBUG) showErr('conexiune eșuată (verifică rețeaua)'); return; }
      clearErr();
      var on = pubLast.on != null ? Math.max(1, pubLast.on) : null, tot = pubLast.tot;
      if (on != null && tot != null) tot = Math.max(on, tot);
      render(on, tot);
    });
  }

  // ---------- pornire ----------
  if (!CONFIGURED) {
    var go = function(){
      mount();
      pubBeat(true);
      var loop = function(){
        pubRefresh().then(function(){ setTimeout(loop, PUB_POLL * (1 + Math.min(pubFails, 4)) + Math.random() * 5000); });
      };
      setTimeout(loop, 1500);
      setInterval(pubBeat, PUB_BEAT);
      document.addEventListener('visibilitychange', function(){ if (document.visibilityState === 'visible') pubBeat(true); });
    };
    if (document.body) go(); else document.addEventListener('DOMContentLoaded', go);
    return;
  }
  beat().then(countTotalOnce).then(function(){ refresh(); cleanup(); });
  setInterval(beat, BEAT_MS);
  setInterval(refresh, POLL_MS);
  document.addEventListener('visibilitychange', function(){
    if (document.visibilityState === 'visible') { beat().then(refresh); }
  });
  window.addEventListener('pageshow', function(){ beat(); });
})();
