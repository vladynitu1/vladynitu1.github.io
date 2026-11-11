/* ===== Luni fișe: luna se ia din PRIMUL CUVÂNT din numele fișei =====
   Ex.: „Noiembrie 2026 sefi tren.pdf”, „Decembrie_mecanici.pdf”, „noi sefi.pdf”.
   Dacă numele nu începe cu o lună, se folosește eticheta „Lună / an”, apoi data încărcării.
   Anul se ia din nume dacă apare (20xx); altfel se deduce din data încărcării. */
(function(){
  'use strict';
  var MN = ['Ianuarie','Februarie','Martie','Aprilie','Mai','Iunie','Iulie','August','Septembrie','Octombrie','Noiembrie','Decembrie'];
  var FULL = ['ianuarie','februarie','martie','aprilie','mai','iunie','iulie','august','septembrie','octombrie','noiembrie','decembrie'];
  var ABBR = { ian:0, feb:1, mar:2, apr:3, iun:4, iul:5, aug:7, sep:8, sept:8, oct:9, noi:10, nov:10, dec:11 };

  function norm(s){
    return String(s == null ? '' : s).toLowerCase()
      .replace(/[ăâ]/g,'a').replace(/î/g,'i').replace(/[șş]/g,'s').replace(/[țţ]/g,'t');
  }
  function monthOfText(t){
    t = norm(t).trim();
    var m = t.match(/^[^a-z0-9]*([a-z]+|\d{1,2})(?![0-9])/);
    if (!m) return null;
    var tok = m[1];
    if (/^\d+$/.test(tok)){ var n = parseInt(tok, 10); return (n >= 1 && n <= 12) ? n - 1 : null; }
    if (ABBR.hasOwnProperty(tok)) return ABBR[tok];
    for (var i = 0; i < FULL.length; i++) if (tok.indexOf(FULL[i]) === 0) return i;
    return null;
  }
  function yearOfText(t){
    var m = norm(t).match(/(?:^|[^0-9])(20\d\d)(?![0-9])/);
    return m ? parseInt(m[1], 10) : null;
  }
  function keyOf(y, m){ return y * 12 + m; }
  function labelOf(key){ return MN[key % 12] + ' ' + Math.floor(key / 12); }

  // {m, y, key, label, src: 'nume' | 'eticheta' | 'incarcare'}
  function info(doc){
    doc = doc || {};
    var m = monthOfText(doc.filename), y = yearOfText(doc.filename), src = 'nume';
    if (m == null && doc.month){ m = monthOfText(doc.month); if (y == null) y = yearOfText(doc.month); src = 'eticheta'; }
    var up = new Date(doc.uploadedAt); if (isNaN(up)) up = new Date();
    if (m == null){ m = up.getMonth(); y = up.getFullYear(); src = 'incarcare'; }
    if (y == null){
      var Y = up.getFullYear(), um = up.getMonth(), best = Y, bd = 1e9;
      [Y - 1, Y, Y + 1].forEach(function(cy){
        var d = Math.abs(keyOf(cy, m) - keyOf(Y, um));
        if (d < bd || (d === bd && cy > best)){ bd = d; best = cy; }
      });
      y = best;
    }
    var key = keyOf(y, m);
    return { m:m, y:y, key:key, label:labelOf(key), src:src };
  }
  function currentKey(now){ now = now || new Date(); return keyOf(now.getFullYear(), now.getMonth()); }

  // lunile disponibile în lista de fișe (cele mai noi întâi); luna curentă apare mereu
  function months(docs, now){
    var seen = {}, out = [];
    (docs || []).forEach(function(d){ var k = info(d).key; if (!seen[k]){ seen[k] = 1; out.push({ key:k, label:labelOf(k), has:true }); } });
    var cur = currentKey(now);
    if (!seen[cur]) out.push({ key:cur, label:labelOf(cur), has:false });
    out.sort(function(a, b){ return b.key - a.key; });
    return out;
  }
  function filter(docs, key){ return (docs || []).filter(function(d){ return info(d).key === key; }); }
  // ms până la 00:00:00 în prima zi a lunii următoare (= imediat după 23:59:59 din ultima zi)
  function msToNextMonth(now){
    now = now || new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0) - now;
  }

  window.EMXLuni = { MN:MN, info:info, currentKey:currentKey, labelOf:labelOf, months:months, filter:filter, msToNextMonth:msToNextMonth, monthOfText:monthOfText };
})();
