/* ===== Sugestii de nume din fișele de lucru =====
   Scrii o literă (ex. „n”) într-un câmp de nume și apar toate numele din fișa lunii
   care încep cu ea (întâi după nume de familie, apoi după prenume).
   Numele se citesc din aceleași fișe salvate în data/mecanici și data/conductori.
   Funcționează și pe câmpuri create dinamic (se atașează la prima atingere). */
(function(){
  'use strict';

  var OWNER = 'vladynitu1', REPO = 'vladynitu1.github.io', BRANCH = 'main';
  var CAT = ['mecanici', 'conductori'];
  var MAX_SHOWN = 40;

  /* câmpurile cu nume: id -> { month: () => cheia lunii (sau null = luna curentă), pick: (item, input) => void } */
  function selVal(id){ var e = document.getElementById(id); var v = e && parseInt(e.value, 10); return isNaN(v) ? null : v; }
  function tcase(s){ return String(s || '').toLowerCase().replace(/(^|[\s'’-])(\p{L})/gu, function(m, a, b){ return a + b.toUpperCase(); }); }
  var TARGETS = {
    'team-name':   { month: function(){ return typeof window.activeMonthKey === 'function' ? window.activeMonthKey() : null; } },
    'q-code':      { month: function(){ return typeof window.activeMonthKey === 'function' ? window.activeMonthKey() : null; } },
    'preiaNume':   { month: function(){ return selVal('preiaLunaFisa'); } },
    'numeAngajat': { month: function(){ return selVal('lunaFisa'); } },
    'np-name':     { month: function(){ return null; } },
    'st-nume':     { month: function(){ return null; }, pick: function(it){
                      var a = document.getElementById('st-nume'), b = document.getElementById('st-prenume');
                      if (a) a.value = tcase(it.s || it.n);
                      if (b && it.f) b.value = tcase(it.f);
                      return true; } }
  };

  function norm(s){
    return String(s == null ? '' : s).toLowerCase()
      .replace(/[ăâ]/g, 'a').replace(/î/g, 'i').replace(/[șş]/g, 's').replace(/[țţ]/g, 't')
      .replace(/\s+/g, ' ').trim();
  }
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]; }); }
  function getToken(){ try { return localStorage.getItem('emx_gh_token') || ''; } catch(e){ return ''; } }

  /* ---------- citire date (API GitHub -> CDN -> fișier local) ---------- */
  function encPath(p){ return p.split('/').map(encodeURIComponent).join('/'); }
  async function ghJson(path){
    var tok = getToken(), headers = { Accept: 'application/vnd.github.raw' };
    if (tok) headers.Authorization = 'token ' + tok;
    try {
      var r = await fetch('https://api.github.com/repos/' + OWNER + '/' + REPO + '/contents/' + encPath(path) + '?ref=' + BRANCH, { cache: 'no-store', headers: headers });
      if (r.status === 404) return null;
      if (r.ok) { try { return JSON.parse(await r.text()); } catch(e){ return null; } }
    } catch(e){}
    try {
      var r2 = await fetch('https://raw.githubusercontent.com/' + OWNER + '/' + REPO + '/' + BRANCH + '/' + path + '?t=' + Date.now(), { cache: 'no-store' });
      if (r2.ok) return await r2.json();
    } catch(e){}
    try {
      var r3 = await fetch(path, { cache: 'no-store' });
      if (r3.ok) return await r3.json();
    } catch(e){}
    return null;
  }

  /* ---------- extragerea numelor dintr-o fișă (aceeași logică ca în Fișa de lucru) ---------- */
  var NON_NAME = new Set(['efect','Serv','Prenume','Nume','Data','ore','Total','crt','Nr','Sc','ASC','Reg','Reg.','Auto','Festive','Mecanic','Sef','tren','bilete','V','CO','L','ITS','SSM','SU','TL','CM','VPP','SMM']);
  function isHeaderRow(items){
    var strs = items.map(function(i){ return i.str; });
    return strs.indexOf('Data') >= 0 && strs.filter(function(s){ return /^\d{1,2}$/.test(s); }).length >= 15;
  }
  function isNameFragment(t){
    if (!t || /\d/.test(t)) return false;
    var words = t.split(/\s+/).filter(Boolean);
    if (words.length > 0 && words.every(function(w){ return NON_NAME.has(w); })) return false;
    return t.replace(/[^a-zA-ZăâîșțĂÂÎȘȚ]/g, '').length >= 1;
  }
  function namesFromRows(rows){
    var blocks = [], cur = null;
    rows.forEach(function(row){
      if (isHeaderRow(row.items)) {
        if (cur) blocks.push(cur);
        var days = row.items.filter(function(i){ return /^\d{1,2}$/.test(i.str); })
          .map(function(i){ return { x: i.x, w: i.w, day: parseInt(i.str, 10) }; })
          .filter(function(i){ return i.day >= 1 && i.day <= 31; });
        cur = { days: days, allRows: [] };
      } else if (cur) cur.allRows.push(row);
    });
    if (cur) blocks.push(cur);
    var out = [];
    blocks.forEach(function(b){
      var colX = b.days.map(function(t){ return t.x + (t.w || 0) / 2; }), n = colX.length;
      var gap = n > 1 ? (colX[n - 1] - colX[0]) / (n - 1) : 20;
      var maxX = (n > 1 && colX.length) ? (colX[0] - gap * 0.6) : 115;
      var roleIdx = b.allRows.length, i;
      for (i = 0; i < b.allRows.length; i++) {
        var t = b.allRows[i].items.map(function(it){ return it.str; }).join(' ');
        if (/Sef\s*tren/i.test(t) || /Mecanic/i.test(t) || /bilete/i.test(t)) { roleIdx = i; break; }
      }
      var fest = -1;
      for (i = 0; i < roleIdx; i++) if (b.allRows[i].items.some(function(it){ return it.str === 'Festive'; })) { fest = i; break; }
      var sf = [], ff = [];
      for (i = 0; i < roleIdx; i++) {
        var frags = b.allRows[i].items.filter(function(it){ return it.x < maxX; }).map(function(it){ return it.str; }).filter(isNameFragment);
        if (!frags.length) continue;
        if (fest === -1 || i <= fest) sf = sf.concat(frags); else ff = ff.concat(frags);
      }
      var s = sf.join(''), f = ff.join('');
      if (s || f) out.push({ n: (s + ' ' + f).trim(), s: s, f: f });
    });
    return out;
  }

  /* ---------- lista de nume pe lună ---------- */
  var metaP = null, metaAt = 0, byKey = {};
  function loadMeta(){
    if (metaP && Date.now() - metaAt < 5 * 60 * 1000) return metaP;
    metaAt = Date.now();
    metaP = Promise.all(CAT.map(function(c){
      return ghJson('data/' + c + '/index.json').then(function(a){
        return (Array.isArray(a) ? a : []).map(function(d){ return Object.assign({}, d, { _cat: c }); });
      });
    })).then(function(x){ return [].concat.apply([], x); });
    return metaP;
  }
  async function namesOfDoc(d){
    var ck = 'emx_nm1_' + d.id;
    try { var c = localStorage.getItem(ck); if (c) return JSON.parse(c); } catch(e){}
    var data = await ghJson('data/' + d._cat + '/' + d.id + '.json');
    if (!data || !Array.isArray(data.rows)) return [];
    var names = namesFromRows(data.rows);
    try { localStorage.setItem(ck, JSON.stringify(names)); } catch(e){}
    return names;
  }
  function namesForKey(key){
    var ck = String(key);
    if (byKey[ck] && Date.now() - byKey[ck].t < 5 * 60 * 1000) return byKey[ck].p;
    var p = loadMeta().then(async function(docs){
      var L = window.EMXLuni, use = docs;
      if (L) {
        var k = key == null ? L.currentKey() : key;
        use = L.filter(docs, k);
        if (!use.length && docs.length) {              // luna fără fișă: ia cea mai nouă lună care are
          var best = -1; docs.forEach(function(d){ var kk = L.info(d).key; if (kk > best) best = kk; });
          use = L.filter(docs, best);
        }
      }
      var lists = await Promise.all(use.map(function(d){ return namesOfDoc(d).catch(function(){ return []; }); }));
      var seen = {}, all = [];
      [].concat.apply([], lists).forEach(function(it){
        var nk = norm(it.n);
        if (!nk || seen[nk]) return;
        seen[nk] = 1; it.k = nk; it.w = nk.split(' '); all.push(it);
      });
      all.sort(function(a, b){ return a.k < b.k ? -1 : a.k > b.k ? 1 : 0; });
      return all;
    });
    byKey[ck] = { t: Date.now(), p: p };
    return p;
  }

  /* ---------- potrivire: „n” => nume care încep cu n, apoi prenume care încep cu n ---------- */
  function match(list, q){
    var toks = norm(q).split(' ').filter(Boolean);
    if (!toks.length) return [];
    var res = [];
    list.forEach(function(it){
      var ok = toks.every(function(t){ return it.w.some(function(w){ return w.indexOf(t) === 0; }); });
      if (!ok) return;
      res.push({ it: it, sc: it.w[0].indexOf(toks[0]) === 0 ? 0 : 1 });
    });
    res.sort(function(a, b){ return a.sc - b.sc || (a.it.k < b.it.k ? -1 : a.it.k > b.it.k ? 1 : 0); });
    return res.slice(0, MAX_SHOWN).map(function(r){ return r.it; });
  }

  /* ---------- listă derulantă ---------- */
  var box = null, cur = null, items = [], active = -1, seq = 0;
  function ensureBox(){
    if (box) return box;
    var st = document.createElement('style');
    st.textContent =
      '#emx-nm{position:fixed;z-index:2147483000;display:none;overflow-y:auto;-webkit-overflow-scrolling:touch;' +
      'background:var(--surf2,#1c2430);color:var(--txt,#e8eef5);border:1px solid var(--bord2,#2e3a4a);border-radius:8px;' +
      'box-shadow:0 8px 24px rgba(0,0,0,.45);font-family:inherit;font-size:.92rem}' +
      '#emx-nm div{padding:9px 12px;cursor:pointer;border-bottom:1px solid var(--bord,rgba(255,255,255,.06))}' +
      '#emx-nm div:last-child{border-bottom:0}#emx-nm div.on,#emx-nm div:hover{background:var(--surf,rgba(255,255,255,.09))}' +
      '#emx-nm b{color:var(--org,#ff9f43);font-weight:700}';
    document.head.appendChild(st);
    box = document.createElement('div'); box.id = 'emx-nm';
    box.addEventListener('mousedown', function(e){ e.preventDefault(); });          // nu pierde focusul câmpului
    box.addEventListener('click', function(e){
      var d = e.target.closest('div[data-i]'); if (d) pick(items[+d.getAttribute('data-i')]);
    });
    document.body.appendChild(box);
    return box;
  }
  function place(){
    if (!box || !cur) return;
    var r = cur.getBoundingClientRect(), vh = window.innerHeight, below = vh - r.bottom - 8, above = r.top - 8;
    var up = below < 160 && above > below, h = Math.min(Math.max(up ? above : below, 80), vh * 0.45);
    box.style.left = Math.max(4, r.left) + 'px';
    box.style.width = Math.max(r.width, 220) + 'px';
    box.style.maxHeight = h + 'px';
    if (up) { box.style.top = ''; box.style.bottom = (vh - r.top + 4) + 'px'; }
    else { box.style.bottom = ''; box.style.top = (r.bottom + 4) + 'px'; }
  }
  function close(){ if (box) box.style.display = 'none'; items = []; active = -1; }
  function hilite(q){
    var toks = norm(q).split(' ').filter(Boolean);
    return function(name){
      var out = '', words = name.split(/(\s+)/);
      words.forEach(function(w){
        var nw = norm(w), hit = 0;
        toks.forEach(function(t){ if (nw && nw.indexOf(t) === 0) hit = Math.max(hit, t.length); });
        out += hit ? '<b>' + esc(w.slice(0, hit)) + '</b>' + esc(w.slice(hit)) : esc(w);
      });
      return out;
    };
  }
  function show(list, q){
    ensureBox();
    items = list; active = -1;
    if (!list.length) { close(); return; }
    var h = hilite(q);
    box.innerHTML = list.map(function(it, i){ return '<div data-i="' + i + '">' + h(it.n) + '</div>'; }).join('');
    box.style.display = 'block'; place();
  }
  function setActive(i){
    if (!items.length) return;
    active = (i + items.length) % items.length;
    var ch = box.children;
    for (var k = 0; k < ch.length; k++) ch[k].classList.toggle('on', k === active);
    if (ch[active]) ch[active].scrollIntoView({ block: 'nearest' });
  }
  function pick(it){
    if (!it || !cur) return;
    var cfg = TARGETS[cur.id] || {}, input = cur;
    if (!(cfg.pick && cfg.pick(it, input))) input.value = it.n;
    close();
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.focus();
  }

  async function refresh(input){
    var cfg = TARGETS[input.id]; if (!cfg) return;
    var q = input.value, my = ++seq;
    // cod de tren / cifre (ex. în „cod / nume”): fără sugestii
    if (!/\p{L}/u.test(q) || /\d/.test(q)) { close(); return; }
    var list;
    try { list = await namesForKey(cfg.month()); } catch(e){ return; }
    if (my !== seq || document.activeElement !== input) return;
    cur = input; show(match(list, q), q);
  }

  document.addEventListener('input', function(e){
    var t = e.target;
    if (t && t.id && TARGETS[t.id] && t.tagName === 'INPUT') { cur = t; refresh(t); }
  });
  document.addEventListener('focusin', function(e){
    var t = e.target;
    if (t && t.id && TARGETS[t.id] && t.tagName === 'INPUT') {
      t.setAttribute('autocomplete', 'off');
      cur = t;
      namesForKey(TARGETS[t.id].month()).catch(function(){});      // încălzește lista
      if (t.value) refresh(t);
    }
  });
  document.addEventListener('focusout', function(e){
    if (e.target === cur) setTimeout(function(){ if (document.activeElement !== cur) close(); }, 150);
  });
  document.addEventListener('keydown', function(e){
    if (!box || box.style.display === 'none' || !items.length || e.target !== cur) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active < 0 ? items.length - 1 : active - 1); }
    else if ((e.key === 'Enter' || e.key === 'Tab') && active >= 0) { e.preventDefault(); e.stopImmediatePropagation(); pick(items[active]); }
    else if (e.key === 'Escape') { close(); }
  }, true);
  window.addEventListener('resize', place);
  window.addEventListener('scroll', place, true);
  document.addEventListener('click', function(e){ if (box && e.target !== cur && !box.contains(e.target)) close(); });

  window.EMXNume = { names: namesForKey, match: match };
})();
