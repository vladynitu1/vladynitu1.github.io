/* ===== Teme site: Clasic / Crăciun / Paște / Anul Nou =====
   Se încarcă în <head> pe fiecare pagină. Tema aleasă de admin e salvată în data/theme.json
   și se aplică tuturor vizitatorilor. Culorile de stare (verde/roșu/galben) nu se schimbă. */
(function(){
  'use strict';
  var RAW  = 'https://raw.githubusercontent.com/vladynitu1/vladynitu1.github.io/main/data/theme.json';
  var KEY  = 'emx_theme';

  var THEMES = {
    clasic:  { label:'Clasic',   emoji:'🔴', sw:['#ff1f3d','#0d0808','#5c1c1c'], decor:null },
    craciun: { label:'Crăciun',  emoji:'🎄', sw:['#ff2d3f','#0a130b','#2f6b36'], decor:'snow', greet:'🎄 Crăciun Fericit! 🎅',
      main:{ bg:'#040805', s1:'#0a130b', s2:'#0f1c11', s3:'#152617', b1:'#1f4a24', b2:'#2f6b36', ac:'#ff2d3f', ac2:'#ff6b75', grid:'46,160,67' } },
    paste:   { label:'Paște',    emoji:'🐣', sw:['#b98cff','#130e1d','#55407f'], decor:'easter', greet:'🐰 Paște Fericit! 🥚',
      main:{ bg:'#08060f', s1:'#130e1d', s2:'#1b1428', s3:'#241a35', b1:'#3a2a57', b2:'#55407f', ac:'#b98cff', ac2:'#d3b6ff', grid:'185,140,255' } },
    anulnou: { label:'Anul Nou', emoji:'🎆', sw:['#ffc933','#19140a','#7a6120'], decor:'confetti', greet:'🎆 La mulți ani! 🥂',
      main:{ bg:'#050403', s1:'#100d06', s2:'#19140a', s3:'#221b0d', b1:'#4a3a12', b2:'#7a6120', ac:'#ffc933', ac2:'#ffe08a', grid:'255,201,51' } }
  };

  function rgba(hex, a){
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n>>16) + ',' + ((n>>8)&255) + ',' + (n&255) + ',' + a + ')';
  }

  function css(t){
    var m = t.main; if (!m) return '';
    var g = 'linear-gradient(rgba(' + m.grid + ',0.035) 1px,transparent 1px),linear-gradient(90deg,rgba(' + m.grid + ',0.035) 1px,transparent 1px)';
    return ':root:root{' +
      /* pagini cu --surf/--acc */
      '--bg:' + m.bg + ';--surf:' + m.s1 + ';--surf2:' + m.s2 + ';--surf3:' + m.s3 + ';--bord:' + m.b1 + ';--bord2:' + m.b2 + ';' +
      '--acc:' + m.ac + ';--acc2:' + rgba(m.ac, .14) + ';' +
      /* pagini cu --s1/--ac (am, turnus) */
      '--s1:' + m.s1 + ';--s2:' + m.s2 + ';--s3:' + m.s3 + ';--b1:' + m.b1 + ';--b2:' + m.b2 + ';' +
      '--ac:' + m.ac + ';--ac2:' + m.ac2 + ';--acd:' + rgba(m.ac, .14) + ';--acg:' + rgba(m.ac, .28) + ';}' +
      'body::before{background-image:' + g + ' !important}' +
      'body::after{background:radial-gradient(ellipse 900px 600px at 50% 40%,' + rgba(m.ac, .10) + ',transparent 65%) !important}';
  }

  var styleEl = null, cnv = null, raf = 0, cur = 'clasic', parts = [], kind = null;

  /* ---------- felicitare ---------- */
  var greetEl = null, greetTimer = 0;
  function showGreeting(text){
    if (greetEl && greetEl.parentNode) greetEl.parentNode.removeChild(greetEl);
    clearTimeout(greetTimer); greetEl = null;
    if (!text) return;
    function go(){
      greetEl = document.createElement('div');
      greetEl.id = 'emx-greet';
      greetEl.textContent = text;
      greetEl.style.cssText = 'position:fixed;bottom:58px;left:50%;transform:translate(-50%,14px);z-index:90;max-width:92vw;' +
        'padding:10px 22px;border-radius:999px;font:700 15px/1.2 "Exo 2",system-ui,sans-serif;letter-spacing:.03em;white-space:nowrap;' +
        'color:var(--txt,#fff);background:var(--surf,#111);border:1px solid var(--acc,#fff);box-shadow:0 6px 28px rgba(0,0,0,.5);' +
        'opacity:0;transition:opacity .6s ease,transform .6s ease;cursor:pointer';
      greetEl.onclick = function(){ greetEl.style.opacity = '0'; };
      document.body.appendChild(greetEl);
      var el = greetEl;
      setTimeout(function(){ el.style.opacity = '1'; el.style.transform = 'translate(-50%,0)'; }, 2200);
      greetTimer = setTimeout(function(){ el.style.opacity = '0'; el.style.transform = 'translate(-50%,14px)'; }, 10500);
    }
    if (document.body) go(); else document.addEventListener('DOMContentLoaded', go, { once:true });
  }

  /* ---------- decor ---------- */
  function stopDecor(){
    if (raf) cancelAnimationFrame(raf); raf = 0;
    if (cnv && cnv.parentNode) cnv.parentNode.removeChild(cnv);
    cnv = null; parts = [];
  }
  function startDecor(k){
    stopDecor(); kind = k;
    if (!k) return;
    if (!document.body) { document.addEventListener('DOMContentLoaded', function(){ if (kind === k) startDecor(k); }, {once:true}); return; }
    cnv = document.createElement('canvas');
    cnv.setAttribute('aria-hidden', 'true');
    cnv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:3;pointer-events:none';
    document.body.appendChild(cnv);
    var ctx = cnv.getContext('2d'), W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    function size(){ W = innerWidth; H = innerHeight; cnv.width = W*dpr; cnv.height = H*dpr; ctx.setTransform(dpr,0,0,dpr,0,0); }
    size(); addEventListener('resize', size);
    var N = Math.max(26, Math.min(64, Math.round(W / 24)));
    if (k === 'easter') N = Math.round(N * .5);
    var EG = ['🐰','🥚','🥚','🐰','🐣','🌷','🥚','🐇'], CF = ['#ffc933','#ffe08a','#ffffff','#ff9f1c','#ff4d6d','#4dd6f0'];
    var bursts = [], nextBurst = 600;

    function mk(init){
      var p = { x:Math.random()*W, y: init ? Math.random()*H : -30, ph:Math.random()*6.28 };
      if (k === 'snow'){
        p.flake = Math.random() < .55;
        p.r = p.flake ? 5 + Math.random()*7 : 1 + Math.random()*2.2;
        p.vy = .35 + (p.flake ? .25 : p.r*.25) + Math.random()*.3;
        p.a = .55 + Math.random()*.4; p.sw = .35 + Math.random()*.7;
        p.rot = Math.random()*6.28; p.vr = (Math.random()-.5)*.03;
      }
      if (k === 'confetti'){ p.w = 4 + Math.random()*5; p.h = 7 + Math.random()*6; p.vy = .8 + Math.random()*1.3; p.rot = Math.random()*6.28; p.vr = (Math.random()-.5)*.14; p.c = CF[(Math.random()*CF.length)|0]; p.sw = .5 + Math.random(); p.a = .9; }
      if (k === 'easter'){ p.s = 22 + Math.random()*16; p.vy = .4 + Math.random()*.55; p.rot = (Math.random()-.5)*.7; p.e = EG[(Math.random()*EG.length)|0]; p.sw = .5 + Math.random()*.8; p.a = .95; }
      return p;
    }
    function drawFlake(x, y, r, rot){
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.3; ctx.lineCap = 'round';
      for (var i = 0; i < 6; i++){
        ctx.rotate(Math.PI / 3);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -r);
        ctx.moveTo(0, -r*.55); ctx.lineTo(r*.28, -r*.8);
        ctx.moveTo(0, -r*.55); ctx.lineTo(-r*.28, -r*.8);
        ctx.stroke();
      }
      ctx.restore();
    }
    function spawnBurst(){
      var cx = W*.12 + Math.random()*W*.76, cy = H*.12 + Math.random()*H*.4, col = CF[(Math.random()*CF.length)|0];
      for (var i = 0; i < 34; i++){
        var ang = i / 34 * 6.2832 + Math.random()*.2, sp = 1.6 + Math.random()*2.2;
        bursts.push({ x:cx, y:cy, vx:Math.cos(ang)*sp, vy:Math.sin(ang)*sp, life:1, c:col });
      }
    }

    for (var i = 0; i < N; i++) parts.push(mk(true));
    var last = performance.now();
    (function loop(now){
      raf = requestAnimationFrame(loop);
      if (document.hidden) { last = now; return; }
      var dt = Math.min(2.5, (now - last) / 16.67); last = now;
      ctx.clearRect(0, 0, W, H);

      for (var i = 0; i < parts.length; i++){
        var p = parts[i];
        p.y += p.vy * dt; p.ph += .018 * dt;
        p.x += Math.sin(p.ph) * p.sw * dt;
        if (p.y > H + 30 || p.x < -40 || p.x > W + 40){ parts[i] = mk(false); continue; }
        ctx.globalAlpha = p.a;
        if (k === 'snow'){
          if (p.flake){ p.rot += p.vr * dt; drawFlake(p.x, p.y, p.r, p.rot); }
          else { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill(); }
        }
        else if (k === 'confetti'){ p.rot += p.vr * dt; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, Math.abs(Math.cos(p.ph*2)) * .9 + .1); ctx.fillStyle = p.c; ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h); ctx.restore(); }
        else { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.sin(p.ph) * p.rot); ctx.font = p.s + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(p.e, 0, 0); ctx.restore(); }
      }

      if (k === 'confetti'){
        nextBurst -= dt * 16.67;
        if (nextBurst <= 0){ spawnBurst(); nextBurst = 1300 + Math.random()*1500; }
        for (var j = bursts.length - 1; j >= 0; j--){
          var b = bursts[j];
          b.x += b.vx * dt; b.y += b.vy * dt; b.vy += .035 * dt; b.vx *= .992; b.life -= .011 * dt;
          if (b.life <= 0){ bursts.splice(j, 1); continue; }
          ctx.globalAlpha = Math.max(0, b.life); ctx.fillStyle = b.c;
          ctx.beginPath(); ctx.arc(b.x, b.y, 2.2, 0, 6.2832); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    })(last);
  }

  /* ---------- aplicare ---------- */
  function apply(name){
    if (!THEMES[name]) name = 'clasic';
    cur = name;
    var t = THEMES[name];
    if (!styleEl){ styleEl = document.createElement('style'); styleEl.id = 'emx-theme'; (document.head || document.documentElement).appendChild(styleEl); }
    styleEl.textContent = css(t);
    startDecor(t.decor);
    showGreeting(t.greet);
    document.documentElement.setAttribute('data-theme', name);
    try { window.dispatchEvent(new CustomEvent('emx-theme', { detail:name })); } catch(e){}
  }

  // cache local: tema în KEY (text simplu, compatibil cu versiunile vechi), data salvării în KEY_u
  function cached(){
    try {
      var v = localStorage.getItem(KEY); if (!v) return null;
      var u = localStorage.getItem(KEY + '_u') || '';
      if (v.charAt(0) === '{') { var o = JSON.parse(v); return { t:o.t, u:o.u || u }; }   // format intermediar
      return { t:v, u:u };
    } catch(e){ return null; }
  }
  function remember(n, u){ try { localStorage.setItem(KEY, n); localStorage.setItem(KEY + '_u', u || new Date().toISOString()); } catch(e){} }
  function ts(x){ var d = Date.parse(x || ''); return isNaN(d) ? 0 : d; }

  window.EMXTheme = {
    list: THEMES,
    current: function(){ return cur; },
    preview: apply,                              // aplică local, fără a salva
    remember: remember
  };

  var c = cached();
  if (c && THEMES[c.t]) apply(c.t);

  // citește din două surse (raw GitHub + chiar site-ul) și o ia pe cea mai nouă
  function get(url){
    return fetch(url + (url.indexOf('?') < 0 ? '?' : '&') + 't=' + Date.now(), { cache:'no-store' })
      .then(function(r){ return r.ok ? r.json() : null; }).catch(function(){ return null; });
  }
  Promise.all([ get(RAW), get('data/theme.json') ]).then(function(res){
    var best = null;
    res.forEach(function(j){ if (j && THEMES[j.theme] && (!best || ts(j.updated) > ts(best.updated))) best = j; });
    if (!best) return;                                   // nimic în repo → rămâne ce are
    var loc = cached();
    // dacă ai salvat tu mai recent decât ce vede CDN-ul, păstrează varianta ta
    if (loc && THEMES[loc.t] && ts(loc.u) > ts(best.updated)) { if (loc.t !== cur) apply(loc.t); return; }
    remember(best.theme, best.updated);
    if (best.theme !== cur) apply(best.theme);
  });

  function sync(){ var c2 = cached(); if (c2 && THEMES[c2.t] && c2.t !== cur) apply(c2.t); }
  window.addEventListener('pageshow', function(e){ if (e.persisted) sync(); });
  document.addEventListener('visibilitychange', function(){ if (document.visibilityState === 'visible') sync(); });
  window.addEventListener('storage', function(e){ if (e.key === KEY) sync(); });
})();
