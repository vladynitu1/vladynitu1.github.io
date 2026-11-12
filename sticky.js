/* ===== Antet fix: bannerul EMX + butoanele de sub el rămân sus la scroll =====
   Încarcă-l pe fiecare pagină interioară: <script src="sticky.js?v=1" defer></script> */
(function(){
  'use strict';
  function css(){
    var s = document.createElement('style');
    s.textContent =
      '#emx-sticky{position:sticky;top:0;z-index:90;width:100%;box-sizing:border-box;background:var(--bg,#050505)}' +
      /* banner: fără sticky propriu, fără margini (le ia containerul) */
      '#emx-sticky>.board,#emx-sticky>.hdr,#emx-sticky>.banner{position:relative !important;top:auto !important;margin:0 !important;width:100%;box-sizing:border-box}' +
      /* rândul de butoane: pe toată lățimea, sub banner; butoanele trec pe mai multe rânduri după lățimea ecranului */
      '#emx-sticky>.page-nav,#emx-sticky>.nav,#emx-sticky>.emx-nav{display:flex !important;flex-wrap:wrap !important;justify-content:center !important;gap:6px;overflow:visible !important;' +
        'margin:0 !important;max-width:none !important;width:100%;box-sizing:border-box;padding:7px 10px !important;border-radius:0 !important;border-left:0 !important;border-right:0 !important;' +
        'background:var(--surf,var(--s1,#0d0d0d));border-bottom:1px solid var(--bord2,var(--b2,#2a2a2a))}' +
      '#emx-sticky>.page-nav>*,#emx-sticky>.nav>*,#emx-sticky>.emx-nav>*{flex:0 0 auto !important;white-space:nowrap;margin:0 !important}' +
      /* butoane create de noi (am / turnus) */
      '.emx-nav a{display:inline-block;padding:7px 13px;border-radius:8px;border:1px solid var(--bord2,var(--b2,#2a2a2a));background:var(--surf2,var(--s2,#161616));' +
        'color:var(--txtm,var(--tx2,#aaa));font:600 12px/1 "Exo 2",system-ui,sans-serif;text-decoration:none;letter-spacing:.02em}' +
      '.emx-nav a:hover{border-color:var(--acc,var(--ac,#ff1f3d));color:var(--acc,var(--ac,#ff1f3d))}' +
      /* fără cadre rotunjite în antetul fix */
      '#emx-sticky>.board,#emx-sticky>.hdr,#emx-sticky>.banner{border-radius:0 !important;border-left:0 !important;border-right:0 !important;border-top:0 !important}' +
      /* ecrane mici: antet mai compact */
      '@media(max-width:640px){#emx-sticky>.board,#emx-sticky>.hdr,#emx-sticky>.banner{zoom:.72}' +
        '#emx-sticky>.page-nav>*,#emx-sticky>.nav>*,#emx-sticky>.emx-nav>*{padding:5px 9px !important;font-size:11px !important}' +
        '#emx-sticky>.page-nav,#emx-sticky>.nav,#emx-sticky>.emx-nav{padding:5px 6px !important;gap:5px}}' +
      /* am / turnus: butoanele paginii stau SUB logo */
      '#emx-sticky>.banner{flex-direction:column !important;align-items:center !important;gap:8px !important;height:auto !important;padding-top:8px !important;padding-bottom:8px !important}' +
      '#emx-sticky>.banner .bnav,#emx-sticky>.banner .bacts{justify-content:center !important;flex-wrap:wrap}';
    document.head.appendChild(s);
  }

  function run(){
    if (document.getElementById('emx-sticky')) return;
    var banner = document.querySelector('header.banner') || document.querySelector('.board') || document.querySelector('.hdr');
    if (!banner || !banner.parentNode) return;
    var nav = document.querySelector('.page-nav') || document.querySelector('.nav');
    css();

    var cs = getComputedStyle(banner), ns = nav ? getComputedStyle(nav) : null;
    var w = document.createElement('div'); w.id = 'emx-sticky';
    // containerul preia marginile bannerului (sus/lateral) și ale rândului de butoane (jos), ca aspectul paginii să rămână la fel
    var mt = parseFloat(cs.marginTop) > 0 ? '0px' : cs.marginTop;      // lipit de marginea de sus a ecranului
    w.style.margin = mt + ' ' + cs.marginRight + ' ' + (ns ? ns.marginBottom : cs.marginBottom) + ' ' + cs.marginLeft;
    banner.parentNode.insertBefore(w, banner);
    w.appendChild(banner);

    if (!nav){                                   // am.html / turnus.html: nu au rând de butoane → îl creez
      nav = document.createElement('div'); nav.className = 'emx-nav';
      var items = [['index.html','🏠 Acasă'],['fisalucru.html','📋 Fișă de lucru'],['salariu.html','💰 Calcul salariu'],['intarzieri.html','🚆 Întârzieri'],['fisapontaj.html','📅 Pontaj']];
      nav.innerHTML = items.map(function(i){ return '<a href="' + i[0] + '">' + i[1] + '</a>'; }).join('');
      w.appendChild(nav);
    } else { w.appendChild(nav); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
