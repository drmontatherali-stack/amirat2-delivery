/* الرادار الحي + شبكة المقاولين — واجهة نظام الخريطة (map.html) · تجريبي
   كل دار نقطة ضوئية بمكانها الحقيقي من مخطط الأوتوكاد ولونها حسب حالتها بالنظام.
   يشتغل بس بنظام الخريطة؛ نظام مكتب التسليم ما يتأثر.
   Design by: Montather Ali */
(function () {
'use strict';
var X = window.A2X; if (!X || !X.VIEWS || window.A2_MODE !== 'map') return;
var RV = '2.4.0';
var S = X.S, esc = X.esc;
var M = function () { return window.__MX || null; };
var NEON = { del: '#38bdf8', ready: '#bae6fd', not: '#fbbf24', late: '#ff3b5c', rev: '#c084fc', nw: '#2dd4bf', none: '#3b5b73' };
var ORD = ['del', 'ready', 'not', 'late', 'rev', 'nw', 'none'];
var LBL = { del: 'مسلّمة', ready: 'جاهزة', not: 'غير جاهزة', late: 'عابر موعدها', rev: 'بالمراجعة', nw: 'بانتظار التبليغ', none: 'ما وصلت' };
var SN = ['', 'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس'];
var MONO = "'JetBrains Mono',ui-monospace,Menlo,monospace";
var DPR = Math.min(2, window.devicePixelRatio || 1);

/* ---------- تسجيل الشاشات ---------- */
X.ICONS.radar = 'M12 12 19 5M12 3a9 9 0 1 0 9 9M12 7a5 5 0 1 0 5 5M12 11a1 1 0 1 0 1 1';
X.ICONS.net = 'M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M5 5m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M19 5m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M5 19m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M19 19m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M6.5 6.5l4 4M17.5 6.5l-4 4M6.5 17.5l4-4M17.5 17.5l-4-4';
X.TITLES.radar = 'المجسّم الحي · تجريبي';
X.TITLES.net = 'شبكة المقاولين · تجريبي';
X.NAV.forEach(function (n) { if (n[0] === 'map') n[1] = 'المخطط'; });
X.NAV.unshift(['net', 'شبكة المقاولين']);
X.NAV.unshift(['radar', 'المجسّم الحي']);
X.VIEWS.radar = function () { return '<div id="rdslot" class="rdslot"></div>'; };
X.VIEWS.net = function () { return '<div id="ntslot" class="rdslot"></div>'; };
var og = X.ACT.go; X.ACT.go = function (d, el, ev) { if (d && d.v === 'hub') d = { v: 'radar' }; return og(d, el, ev); };
if (S.view === 'map' || S.view === 'hub') S.view = 'radar';
var prevAR = X.afterRender;
var homed = false;
X.afterRender = function (view) {
  if (!homed) { homed = true; if (view === 'map' || view === 'hub') { S.view = 'radar'; X.scheduleRender(); return; } }
  if (prevAR) try { prevAR(view); } catch (e) {}
  document.body.classList.toggle('rdfull', view === 'radar' || view === 'net');
  if (view === 'radar') RD.mount(); else RD.unmount();
  if (view === 'net') NT.mount(); else NT.unmount();
};

/* ---------- ستايل ---------- */
function css() {
  if (document.getElementById('rdcss')) return;
  var st = document.createElement('style'); st.id = 'rdcss';
  st.textContent = [
    '.rdslot{position:relative;margin:-6px -4px 0}',
    'body.rdfull #topbar{display:none!important}','body.rdfull #view{padding:0!important;gap:0!important;max-width:none!important}','body.rdfull .rdslot{margin:0}','body.rdfull .rd{border-radius:0;border:0;box-shadow:none}',
    '.rd .tbar{display:flex;align-items:center;gap:6px}','.rd .tbar button{all:unset;cursor:pointer;height:32px;min-width:32px;padding:0 8px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;gap:5px;color:#00ff9c;background:rgba(0,20,12,.7);border:1px solid rgba(0,255,156,.3);border-radius:9px;font-size:12px}','.rd .tbar h1{margin:0;font-size:15px;font-weight:700;color:#00ff9c;text-shadow:0 0 12px rgba(0,255,156,.6);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}','.rd .tbar h1 small{font:500 10px '+"'JetBrains Mono',monospace"+';color:#5f8f7d;margin-inline-start:6px}','.rd .tbar .dot{width:7px;height:7px;border-radius:50%;background:#00ff9c;box-shadow:0 0 8px #00ff9c}','.rd .tbar .dot.off{background:#ff3b5c;box-shadow:0 0 8px #ff3b5c}',
    '.rd{position:relative;width:100%;border-radius:18px;overflow:hidden;background:#020806;color:#d9fff0;border:1px solid rgba(0,255,156,.22);box-shadow:0 0 0 1px rgba(0,0,0,.4),0 20px 60px -30px #00ff9c55;touch-action:none;user-select:none;-webkit-user-select:none}',
    '.rd canvas{position:absolute;inset:0;width:100%;height:100%;display:block}',
    '.rd .scan{position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(0,0,0,.16) 0 1px,transparent 1px 3px);mix-blend-mode:multiply}',
    '.rd .brk{position:absolute;width:22px;height:22px;border:2px solid #00ff9c;pointer-events:none;opacity:.8}',
    '.rd .b1{top:6px;right:6px;border-left:0;border-bottom:0}.rd .b2{bottom:6px;left:6px;border-right:0;border-top:0}',
    '.rd .hud{position:absolute;top:10px;inset-inline:10px;display:flex;flex-direction:column;gap:8px;pointer-events:none;z-index:2}',
    '.rd .hud>*{pointer-events:auto}',
    '.rd .kp{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:5px}',
    '.rd .kp button{all:unset;cursor:pointer;text-align:center;padding:6px 2px 5px;background:rgba(0,20,12,.62);border:1px solid rgba(0,255,156,.2);border-radius:8px;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);transition:border-color .2s,background .2s}',
    '.rd .kp button.on{border-color:currentColor;background:rgba(0,40,24,.8)}',
    '.rd .kp b{display:block;font:700 16px ' + MONO + ';text-shadow:0 0 10px currentColor;line-height:1.2}',
    '.rd .kp small{display:block;font-size:10px;color:#9fd9c2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.rd .row2{display:flex;gap:6px;align-items:center}',
    '.rd .secs{display:flex;gap:4px;overflow-x:auto;scrollbar-width:none;flex:1}',
    '.rd .secs::-webkit-scrollbar{display:none}',
    '.rd .secs button{all:unset;cursor:pointer;white-space:nowrap;font-size:12px;padding:5px 9px;border-radius:7px;border:1px solid rgba(0,255,156,.2);background:rgba(0,20,12,.6);color:#bfeedd}',
    '.rd .secs button small{font:11px ' + MONO + ';color:#00ff9c;margin-inline-start:4px}',
    '.rd .secs button.on{background:#00ff9c;color:#021;font-weight:700}.rd .secs button.on small{color:#021}',
    '.rd .q{display:flex;align-items:center;gap:4px;background:rgba(0,20,12,.7);border:1px solid rgba(0,255,156,.25);border-radius:8px;padding:0 8px;width:118px}',
    '.rd .q input{all:unset;width:100%;font:12px ' + MONO + ';color:#d9fff0;direction:ltr;padding:6px 0}',
    '.rd .q input::placeholder{color:#5f8f7d}',
    '.rd .zb{position:absolute;inset-inline-start:10px;bottom:140px;display:flex;flex-direction:column;gap:5px;z-index:2}',
    '.rd .zb button{all:unset;cursor:pointer;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font:700 17px ' + MONO + ';color:#00ff9c;background:rgba(0,20,12,.7);border:1px solid rgba(0,255,156,.3);border-radius:9px}',
    '.rd .zb button.t{font:600 10px "IBM Plex Sans Arabic",sans-serif;height:34px}',
    '.rd .term{position:absolute;inset-inline:10px;bottom:10px;height:84px;overflow:hidden;z-index:2;background:rgba(0,8,4,.78);border:1px solid rgba(0,255,156,.22);border-radius:10px;padding:6px 10px;font:11.5px/1.6 ' + MONO + ';direction:ltr;text-align:left;color:#00ff9c;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}',
    '.rd .term .l{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.rd .term .r{color:#ff5a74}.rd .term .a{color:#ffb020}.rd .term .c{color:#5fe0ff}',
    '.rd .term button{all:unset;cursor:pointer;color:#ff5a74;text-decoration:underline dotted;margin-inline-end:10px}',
    '.rd .term .cur{display:inline-block;width:7px;height:12px;background:#00ff9c;vertical-align:-1px;animation:rdb 1s steps(1) infinite}',
    '@keyframes rdb{50%{opacity:0}}',
    '.rd .lg{position:absolute;inset-inline:10px;bottom:100px;z-index:2;display:flex;gap:4px;overflow-x:auto;scrollbar-width:none}','.rd .lg::-webkit-scrollbar{display:none}',
    '.rd .lg button{all:unset;cursor:pointer;flex:none;white-space:nowrap;font-size:11px;padding:4px 8px;border-radius:7px;background:rgba(0,16,10,.75);border:1px solid rgba(0,255,156,.12);color:#cfeee2;display:flex;gap:6px;align-items:center}',
    '.rd .lg button i{width:8px;height:8px;border-radius:50%;box-shadow:0 0 8px currentColor;background:currentColor}',
    '.rd .lg button.on{border-color:currentColor}.rd .lg button.off{opacity:.35}',
    '.rd .lg button b{font:600 11px ' + MONO + '}',
    '.rd .rdc{position:absolute;inset-inline:10px;bottom:10px;z-index:4;max-height:62%;overflow:auto;border-radius:14px;background:rgba(2,14,9,.95);border:1px solid #00ff9c66;box-shadow:0 0 30px -6px #00ff9c55;color:#e6fff5;transform:translateY(12px);opacity:0;transition:transform .22s,opacity .22s}',
    '.rd .rdc.show{transform:none;opacity:1}',
    '.rd .rdc .card{background:transparent;border:0;box-shadow:none;padding:12px 14px;margin:0}',
    '.rd .rdc .muted{color:#8fb9a8}','.rd .kv2{display:grid;grid-template-columns:auto 1fr;gap:5px 12px;font-size:13px;margin:8px 0}','.rd .kv2 span{color:#8fb9a8}','.rd .warnl{color:#ff9a5b;font-size:12.5px}','.rd .rdc h2{color:#00ff9c;font-family:'+"'JetBrains Mono',monospace"+'}','.rd .rdc:empty{display:none}',
    '.rd .tip{position:absolute;z-index:3;pointer-events:none;font-size:11px;background:rgba(2,12,8,.92);border:1px solid #00ff9c88;padding:4px 8px;border-radius:6px;white-space:nowrap}',
    '.rd .tip b{font-family:' + MONO + '}',
    '.rd .nt-card{position:absolute;inset-inline:10px;bottom:10px;z-index:4;max-height:60%;overflow:auto;border-radius:14px;background:rgba(2,14,9,.95);border:1px solid #22d3ee77;padding:12px 14px;box-shadow:0 0 30px -8px #22d3ee66}',
    '.rd .nt-card h3{margin:0 0 4px;font-size:16px}.rd .nt-card .g{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:8px 0}',
    '.rd .nt-card .g div{text-align:center;border:1px solid rgba(0,255,156,.2);border-radius:8px;padding:5px 2px;font-size:10.5px;color:#9fd9c2}.rd .nt-card .g b{display:block;font:700 15px ' + MONO + ';color:#fff}',
    '.rd .nt-card .hl{display:flex;flex-wrap:wrap;gap:5px}.rd .nt-card .hl button{all:unset;cursor:pointer;font:11.5px ' + MONO + ';padding:3px 7px;border-radius:6px;border:1px solid currentColor;direction:ltr}',
    '.rd .x{position:absolute;top:8px;left:8px;all:unset;cursor:pointer;color:#8fb9a8;font-size:18px;padding:4px 8px}',
    '#rdintro{position:fixed;inset:0;z-index:9999;background:#000;cursor:pointer;transition:opacity .4s}',
    '#rdintro canvas{width:100%;height:100%;display:block}',
    '#rdintro .t{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;color:#00ff9c;text-shadow:0 0 18px #00ff9c}',
    '#rdintro .t b{font:700 56px ' + MONO + '}#rdintro .t span{font:600 18px "IBM Plex Sans Arabic",sans-serif;color:#d9fff0;margin-top:6px}#rdintro .t small{font:12px ' + MONO + ';color:#5f8f7d;margin-top:18px;letter-spacing:2px}',
    '.rd.hg{background:#01060e;border-color:rgba(56,200,255,.25);color:#d9f6ff}',
    '.rd.hg .brk{border-color:#39d0ff}',
    '.rd.hg .tbar button{color:#7fe7ff;background:rgba(0,30,50,.6);border-color:rgba(80,210,255,.35)}','.rd.hg .tbar h1{color:#7fe7ff;text-shadow:0 0 12px #19c3ff}','.rd.hg .tbar h1 small{color:#4aa6c7}',
    '.rd.hg .kp button{background:linear-gradient(180deg,rgba(20,120,170,.18),rgba(0,20,40,.45));border-color:rgba(80,210,255,.28)}','.rd.hg .kp small{color:#8fd3ea}',
    '.rd.hg .secs button{border-color:rgba(80,210,255,.25);background:rgba(0,30,50,.55);color:#cdefff}','.rd.hg .secs button small{color:#38bdf8}','.rd.hg .secs button.on{background:#22d3ee;color:#011}','.rd.hg .secs button.on small{color:#011}',
    '.rd.hg .q{background:rgba(0,30,50,.6);border-color:rgba(80,210,255,.3)}','.rd.hg .q span{color:#7fe7ff}','.rd.hg .q input{color:#e2fbff}',
    '.rd.hg .zb{bottom:112px;top:auto;flex-direction:row;inset-inline-start:auto;inset-inline-end:10px}','.rd.hg .zb button{width:34px;height:34px}','.rd.hg .zb button{color:#7fe7ff;background:rgba(0,30,50,.6);border-color:rgba(80,210,255,.35)}','.rd.hg .zb button.on{background:#22d3ee;color:#011}',
    '.rd .hgbot{position:absolute;inset-inline:10px;bottom:10px;z-index:2}','.rd.hg .lg{position:static;margin-bottom:8px}','.rd.hg .lg button{background:rgba(0,24,40,.7);border-color:rgba(80,210,255,.15)}',
    '.rd .tl{display:flex;align-items:center;gap:8px;font:600 10px ' + MONO + ';color:#5fc6e8;direction:ltr;background:rgba(0,20,36,.6);border:1px solid rgba(80,210,255,.18);border-radius:10px;padding:6px 10px}',
    '.rd .tl input{flex:1;accent-color:#22d3ee;height:18px}','.rd .tl span{white-space:nowrap}',
    '.rd .hgtag{all:unset;cursor:pointer;position:absolute;z-index:1;transform:translate(-50%,-50%);width:150px;padding:4px 9px 5px;border-radius:9px;border:1px solid rgba(90,220,255,.5);background:linear-gradient(180deg,rgba(10,70,110,.6),rgba(0,20,40,.75));box-shadow:0 0 16px rgba(34,211,238,.18);white-space:nowrap;box-sizing:border-box}',
    '.rd .hgtag b{display:flex;align-items:baseline;justify-content:space-between;gap:4px;font-size:12px;color:#e2fbff}','.rd .hgtag em{font:700 12px ' + MONO + ';color:#38bdf8;font-style:normal}','.rd .hgtag .q{font-size:10px;color:#fbbf24;font-weight:500;display:inline;background:none;border:0;padding:0;width:auto}','.rd .hgtag .o{font-size:10px;color:#ff5a74;font-weight:500}',
    '.rd .hgtag i{display:block;height:3px;border-radius:3px;background:rgba(80,200,255,.2);margin-top:4px;overflow:hidden}','.rd .hgtag i u{display:block;height:100%;background:#22d3ee}',
    '.rd.hg .rdc{border-color:rgba(90,220,255,.55);background:rgba(2,16,30,.95);box-shadow:0 0 30px -6px #22d3ee66;bottom:96px}','.rd.hg .rdc h2{color:#7fe7ff}','.rd.hg .rdc .muted,.rd.hg .kv2 span{color:#8fbfd3}',
    '.rd.hg .tip{border-color:#39d0ff88;background:rgba(2,14,26,.92)}','.rd.hg canvas.co{cursor:grab}',
    '@media (prefers-reduced-motion:reduce){.rd .rdc{transition:none}}'
  ].join('\n');
  document.head.appendChild(st);
}
function tbar(title, other, otherLbl) {
  return '<div class="tbar"><button data-act="toggleRail" aria-label="كل الأقسام">' + X.ico('menu', 18) + '</button><h1>' + title + '<small>AMIRAT-2</small></h1><span class="dot' + (S.online ? '' : ' off') + '" title="' + (S.online ? 'متصل' : 'غير متصل') + '"></span>' +
    '<button data-act="syncAll" aria-label="تحديث من الشيتات">' + X.ico('refresh', 17) + '</button><button data-rdgo="' + other + '">' + otherLbl + '</button><button data-rdgo="map" aria-label="المخطط">المخطط</button></div>';
}
document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-rdgo]'); if (!b) return; X.ACT.go({ v: b.dataset.rdgo, plan: 1 }); });
function dot(el) { var d = el.querySelector('.tbar .dot'); if (d) d.className = 'dot' + (S.online ? '' : ' off'); }
function fitHeight(el) {
  var full = document.body.classList.contains('rdfull');
  var top = el.getBoundingClientRect().top + (window.scrollY || 0);
  var h = Math.max(420, Math.round((window.visualViewport ? visualViewport.height : innerHeight) - top - (full ? 0 : 10)));
  el.style.height = h + 'px';
}

/* ---------- بيانات ---------- */
var DATA = { ok: false, list: [], I: null, cnt: {}, sec: {}, late: [], t: 0 };
function refresh() {
  var mx = M(); if (!mx) return false; var md = mx.md(); if (!md) { mx.load(); return false; }
  var I = mx.index(), list = [], cnt = {}, sec = {}, late = [];
  Object.keys(md.H).forEach(function (k) {
    var h = md.H[k], st = mx.statusOf(h, I), ec = mx.effCon(h), u = I.ws[k];
    var o = { k: k, h: h, st: st, g: ec.group, wx: h.x, wy: -h.y, r: Math.max(2, Math.min(h.w, h.h) / 2), n: h.id.split('.').pop() };
    if (u) o.dd = X.daysDiff(u.deliveryDate);
    list.push(o); cnt[st] = (cnt[st] || 0) + 1;
    var sc = sec[h.s] = sec[h.s] || { all: 0, del: 0 }; sc.all++; if (st === 'del') sc.del++;
    if (st === 'late') late.push(o);
  });
  late.sort(function (a, b) { return (a.dd == null ? 0 : a.dd) - (b.dd == null ? 0 : b.dd); });
  DATA.ok = true; DATA.list = list; DATA.I = I; DATA.cnt = cnt; DATA.sec = sec; DATA.late = late; DATA.md = md; DATA.t = Date.now();
  try { DATA.P = mx.pre(I, [1, 2, 3, 4, 5, 6]); } catch (e) { DATA.P = { eff: {} }; }
  return true;
}
function waitData(cb) { if (refresh()) { cb(); return; } var n = 0; var iv = setInterval(function () { if (refresh() || ++n > 80) { clearInterval(iv); if (DATA.ok) cb(); } }, 150); }
function pct(a, b) { return b ? Math.round(a * 100 / b) : 0; }

/* =====================================================================
   المجسّم الحي (هولوغرام ثلاثي الأبعاد)
   ===================================================================== */
var HG = (function () {
  var el = null, cvB, cvS, cvO, xB, xS, xO, W = 0, H = 0, raf = 0, on = false, dirty = true;
  var CAM0 = { yaw: 0, tilt: 54, zoom: 1, px: 0, py: 0 };
  var cam = { yaw: CAM0.yaw, tilt: CAM0.tilt, zoom: 1, px: 0, py: 0 }, anim = null;
  var tlEnd = true, tagsVer = 0, autoing = false, lastMoving = false, auto = true, lastInt = 0, focus = null, flt = null, sel = null, tl = null, months = [], LY = null, PJ = null, pick = null;
  var ptrs = {}, drag = null, pinch = null, moved = 0, t0 = performance.now();
  auto = false; try { auto = localStorage.getItem('hg_auto') === '1'; } catch (e) {}
  var ZH = { del: 6, ready: 15, not: 15, late: 17, rev: 15, nw: 12, none: 2.5 };
  var CW = 560, CH = 500, GX = 90, GY = 250, TGT = { 1: [-1, 0], 2: [1, 0], 3: [-1, 1], 4: [1, 1], 5: [-1, 2], 6: [1, 2] };
  function rgb(hex) { var n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  var CR = {}; ORD.forEach(function (k) { CR[k] = rgb(NEON[k]); });

  function build() {
    css();
    el = document.createElement('div'); el.className = 'rd hg';
    el.innerHTML = '<canvas class="cb"></canvas><canvas class="cs"></canvas><canvas class="co"></canvas><i class="brk b1"></i><i class="brk b2"></i>' +
      '<div class="hud">' + tbar('المجسّم الحي', 'net', 'الشبكة') + '<div class="kp" id="hgkp"></div><div class="row2"><div class="secs" id="hgsecs"></div><label class="q"><span>⌕</span><input id="hgq" placeholder="B40.2" enterkeyhint="search" autocomplete="off"></label></div></div>' +
      '<div id="hgtags"></div>' +
      '<div class="zb"><button data-hg="zin" aria-label="تكبير">+</button><button data-hg="zout" aria-label="تصغير">−</button><button data-hg="reset" aria-label="إرجاع الزاوية">⤢</button><button data-hg="auto" id="hgauto" aria-label="دوران تلقائي">⟲</button><button data-hg="top" class="t" id="hgtop">أعلى</button></div>' +
      '<div class="hgbot"><div class="lg" id="hglg"></div><div class="tl"><span id="hgt0"></span><input type="range" id="hgtl" min="0" max="0" value="0" aria-label="شريط الزمن"><span id="hgtv">اليوم</span></div></div>' +
      '<div class="tip" id="hgtip" hidden></div><div class="rdc" id="hgcard"></div>';
    cvB = el.querySelector('.cb'); cvS = el.querySelector('.cs'); cvO = el.querySelector('.co');
    xB = cvB.getContext('2d'); xS = cvS.getContext('2d'); xO = cvO.getContext('2d');
    wire();
  }
  /* ---- إعادة ترتيب القطاعات بشبكة منتظمة ---- */
  function layout() {
    var sb = {}, off = {};
    DATA.list.forEach(function (o) { var s = o.h.s, b = sb[s] = sb[s] || [1e9, 1e9, -1e9, -1e9]; b[0] = Math.min(b[0], o.wx - o.h.w / 2); b[1] = Math.min(b[1], o.wy - o.h.h / 2); b[2] = Math.max(b[2], o.wx + o.h.w / 2); b[3] = Math.max(b[3], o.wy + o.h.h / 2); });
    Object.keys(sb).forEach(function (s) { var b = sb[s], t = TGT[s] || [0, 0]; off[s] = [t[0] * (CW + GX) / 2 - (b[0] + b[2]) / 2, (t[1] - 1) * (CH + GY) - (b[1] + b[3]) / 2]; sb[s] = [b[0] + off[s][0], b[1] + off[s][1], b[2] + off[s][0], b[3] + off[s][1]]; });
    var pts = DATA.list.map(function (o) { var f = off[o.h.s] || [0, 0]; return { o: o, x: o.wx + f[0], y: o.wy + f[1], w: o.h.w * 0.4, d: o.h.h * 0.4 }; });
    var geo = {};
    [1, 2, 3, 4, 5, 6].forEach(function (s) { var f = off[s]; if (!f || !DATA.md.sectors[s]) return; geo[s] = DATA.md.sectors[s].geo.map(function (p) { var n = (p.match(/-?\d+\.?\d*/g) || []).map(Number), r = []; for (var i = 0; i + 1 < n.length; i += 2) r.push(n[i] + f[0], n[i + 1] + f[1]); r.closed = /Z\s*$/.test(p); return r; }); });
    LY = { pts: pts, geo: geo, sb: sb };
    // أشهر التسليم لشريط الزمن
    var ms = {}; pts.forEach(function (p) { var dd = M().delDate ? M().delDate(p.o.h, DATA.I) : null; p.dm = dd ? dd.y + '-' + String(dd.m).padStart(2, '0') : null; if (p.dm) ms[p.dm] = 1; });
    months = Object.keys(ms).sort();
    var r = el.querySelector('#hgtl'); r.max = String(months.length); if (tlEnd || tl == null || tl > months.length) tl = months.length; r.value = String(tl);
    el.querySelector('#hgt0').textContent = months[0] ? months[0].slice(0, 4) : '';
    tlLabel();
  }
  function tlLabel() { var v = el.querySelector('#hgtv'); v.textContent = (tl >= months.length) ? 'اليوم' : months[tl] || ''; }
  function stOf(p) { if (tl != null && tl < months.length && p.o.st === 'del' && p.dm && p.dm > months[tl]) return 'not'; return p.o.st; }

  /* ---- الكاميرا والإسقاط ---- */
  function projector() {
    var secs = focus ? [focus] : [1, 2, 3, 4, 5, 6], X0 = 1e9, Y0 = 1e9, X1 = -1e9, Y1 = -1e9;
    secs.forEach(function (s) { var b = LY.sb[s]; if (!b) return; X0 = Math.min(X0, b[0]); Y0 = Math.min(Y0, b[1]); X1 = Math.max(X1, b[2]); Y1 = Math.max(Y1, b[3]); });
    var pad = focus ? 50 : 120; X0 -= pad; Y0 -= pad; X1 += pad; Y1 += pad;
    var cx = (X0 + X1) / 2, cy = (Y0 + Y1) / 2, R = Math.hypot(X1 - X0, Y1 - Y0) / 2;
    var ph = cam.tilt * Math.PI / 180, cs = Math.cos(ph), sn = Math.sin(ph), cY = Math.cos(cam.yaw), sY = Math.sin(cam.yaw), Dist = R * 3.4;
    var top = 150 * DPR, bot = H * 0.27, avH = Math.max(100, H - top - bot);
    // المقياس يتحسب من الزاوية الأمامية حتى ما يتغيّر الحجم وقت الدوران
    var ex0 = 1e9, ex1 = -1e9, ey0 = 1e9, ey1 = -1e9;
    [[X0, Y0, -22], [X1, Y0, -22], [X1, Y1, -22], [X0, Y1, -22], [X0, Y0, 40], [X1, Y0, 40]].forEach(function (q) { var dy = q[1] - cy, k = Dist / (Dist - dy * sn), u = (q[0] - cx) * k, v = (dy * cs - q[2] * sn) * k; ex0 = Math.min(ex0, u); ex1 = Math.max(ex1, u); ey0 = Math.min(ey0, v); ey1 = Math.max(ey1, v); });
    var S0 = Math.min(W * 0.96 / (ex1 - ex0), avH / (ey1 - ey0)), S = S0 * cam.zoom, mx = (ex0 + ex1) / 2, my = (ey0 + ey1) / 2;
    var free = Math.max(0, avH - (ey1 - ey0) * S0), oyc = top + avH / 2 - free * 0.42;
    var ox = W / 2 + cam.px, oy = oyc + cam.py;
    function P(wx, wy, z) { var dx = wx - cx, dy = wy - cy, rx = dx * cY - dy * sY, ry = dx * sY + dy * cY, k = Dist / (Dist - ry * sn); return [ox + (rx * k - mx) * S, oy + ((ry * cs - z * sn) * k - my) * S, ry]; }
    return { P: P, X0: X0, Y0: Y0, X1: X1, Y1: Y1, S: S, cs: cs, sn: sn, secs: secs, cY: cY, sY: sY, oyc: oyc };
  }
  function size() {
    var r = el.getBoundingClientRect(); if (!r.width) return;
    var w = Math.round(r.width * DPR), h = Math.round(r.height * DPR);
    if (w !== W || h !== H) { W = w; H = h; [cvB, cvS, cvO].forEach(function (c) { c.width = W; c.height = H; }); drawBg(); dirty = true; }
  }
  /* ---- الخلفية: شبكة سداسية + جهاز الإسقاط ---- */
  function drawBg() {
    var x = xB, g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#010712'); g.addColorStop(.55, '#031426'); g.addColorStop(1, '#04203a');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    var hr = 22 * DPR; for (var row = 0; row * hr * 1.5 < H + hr; row++) for (var col = 0; col * hr * 1.732 < W + hr; col++) {
      var hx = col * hr * 1.732 + (row % 2 ? hr * .866 : 0), hy = row * hr * 1.5, a = Math.max(0, hy / H - .45) * .22; if (a <= 0) continue;
      x.beginPath(); for (var k = 0; k < 6; k++) { var t = Math.PI / 3 * k + Math.PI / 6, px = hx + Math.cos(t) * hr * .92, py = hy + Math.sin(t) * hr * .92; if (k) x.lineTo(px, py); else x.moveTo(px, py); } x.closePath(); x.strokeStyle = 'rgba(60,190,255,' + a + ')'; x.lineWidth = 1; x.stroke(); }
    var bx = W / 2, by = H * 0.885;
    x.globalCompositeOperation = 'lighter';
    x.strokeStyle = 'rgba(60,200,255,.28)'; x.lineWidth = 2 * DPR;
    [[-1, .045], [1, .045], [-1, .02], [1, .02]].forEach(function (q, i) { var y0 = by + q[1] * H, len = W * (.22 + i * .04), d = q[0]; x.beginPath(); x.moveTo(bx + d * W * .12, y0); x.lineTo(bx + d * (W * .12 + len * .5), y0); x.lineTo(bx + d * (W * .12 + len * .5 + 24 * DPR), y0 + 24 * DPR); x.lineTo(bx + d * (W * .12 + len), y0 + 24 * DPR); x.stroke(); x.fillStyle = 'rgba(120,230,255,.7)'; x.beginPath(); x.arc(bx + d * (W * .12 + len), y0 + 24 * DPR, 3 * DPR, 0, 6.2832); x.fill(); });
    [[.2, .4], [.155, .6], [.11, .9], [.07, 1]].forEach(function (q, i) { x.beginPath(); x.ellipse(bx, by, W * q[0], W * q[0] * .26, 0, 0, 6.2832); x.strokeStyle = 'rgba(90,225,255,' + (q[1] * .7) + ')'; x.lineWidth = (i === 3 ? 3.5 : 1.8) * DPR; x.shadowColor = '#22d3ee'; x.shadowBlur = i === 3 ? 22 : 8; x.stroke(); });
    x.shadowBlur = 0; var c = x.createRadialGradient(bx, by, 0, bx, by, W * .07); c.addColorStop(0, 'rgba(220,255,255,.9)'); c.addColorStop(1, 'rgba(40,200,255,0)'); x.fillStyle = c; x.beginPath(); x.ellipse(bx, by, W * .07, W * .02, 0, 0, 6.2832); x.fill();
    for (var k2 = 0; k2 < 24; k2++) { var t2 = k2 / 24 * 6.2832; x.fillStyle = 'rgba(140,240,255,.8)'; x.beginPath(); x.arc(bx + Math.cos(t2) * W * .2, by + Math.sin(t2) * W * .052, 2 * DPR, 0, 6.2832); x.fill(); }
    x.globalCompositeOperation = 'source-over';
  }
  /* ---- رسم المجسّم ---- */
  function drawScene() {
    var x = xS, J = PJ = projector(), P = J.P;
    x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, W, H);
    var c4 = [[J.X0, J.Y0], [J.X1, J.Y0], [J.X1, J.Y1], [J.X0, J.Y1]], T = c4.map(function (q) { return P(q[0], q[1], -6); }), B = c4.map(function (q) { return P(q[0], q[1], -22); });
    // حزمة الضوء من الجهاز إلى المنصّة
    var bx = W / 2, by = H * 0.885, lo = T.concat().sort(function (a, b) { return b[1] - a[1]; }), xs = T.map(function (p) { return p[0]; }), mnx = Math.min.apply(null, xs), mxx = Math.max.apply(null, xs), my = Math.max(lo[0][1], lo[1][1]);
    var cone = x.createLinearGradient(0, by, 0, my); cone.addColorStop(0, 'rgba(80,220,255,.30)'); cone.addColorStop(1, 'rgba(80,220,255,0)');
    x.fillStyle = cone; x.beginPath(); x.moveTo(bx - W * .09, by); x.lineTo(mnx + 20, my); x.lineTo(mxx - 20, my); x.lineTo(bx + W * .09, by); x.closePath(); x.fill();
    x.globalCompositeOperation = 'lighter';
    for (var i = 0; i < 22; i++) { var t = i / 21 - .5, gg = x.createLinearGradient(0, by, 0, my); gg.addColorStop(0, 'rgba(140,240,255,.4)'); gg.addColorStop(1, 'rgba(140,240,255,0)'); x.strokeStyle = gg; x.lineWidth = (i % 5 ? 1 : 2) * DPR; x.beginPath(); x.moveTo(bx + t * W * .17, by); x.lineTo((mnx + mxx) / 2 + t * (mxx - mnx) * .9, my); x.stroke(); }
    x.globalCompositeOperation = 'source-over';
    // المنصّة السميكة
    for (var e = 0; e < 4; e++) { var f = (e + 1) % 4; x.beginPath(); x.moveTo(T[e][0], T[e][1]); x.lineTo(T[f][0], T[f][1]); x.lineTo(B[f][0], B[f][1]); x.lineTo(B[e][0], B[e][1]); x.closePath(); x.fillStyle = 'rgba(10,80,120,.30)'; x.fill(); x.strokeStyle = 'rgba(90,225,255,.45)'; x.lineWidth = 1.2 * DPR; x.stroke(); }
    x.beginPath(); T.forEach(function (p, i) { if (i) x.lineTo(p[0], p[1]); else x.moveTo(p[0], p[1]); }); x.closePath();
    x.fillStyle = 'rgba(14,90,140,.32)'; x.fill(); x.strokeStyle = 'rgba(90,225,255,.85)'; x.lineWidth = 2.2 * DPR; x.shadowColor = '#22d3ee'; x.shadowBlur = 16; x.stroke(); x.shadowBlur = 0;
    x.save(); x.clip(); x.strokeStyle = 'rgba(80,210,255,.09)'; x.lineWidth = 1;
    var gs = focus ? 25 : 40; for (var v = J.X0; v <= J.X1; v += gs) { var a = P(v, J.Y0, -6), b = P(v, J.Y1, -6); x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke(); }
    for (v = J.Y0; v <= J.Y1; v += gs) { a = P(J.X0, v, -6); b = P(J.X1, v, -6); x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke(); }
    x.restore();
    T.forEach(function (p) { x.fillStyle = '#bff6ff'; x.beginPath(); x.arc(p[0], p[1], 3 * DPR, 0, 6.2832); x.fill(); });
    // حدود البلوكات
    x.globalCompositeOperation = 'lighter';
    x.strokeStyle = 'rgba(70,210,255,.36)'; x.lineWidth = 1.1 * DPR;
    J.secs.forEach(function (s) { (LY.geo[s] || []).forEach(function (L) { x.beginPath(); for (var i = 0; i < L.length; i += 2) { var p = P(L[i], L[i + 1], 0); if (i) x.lineTo(p[0], p[1]); else x.moveTo(p[0], p[1]); } if (L.closed) x.closePath(); x.stroke(); }); });
    // الدور — كل حالة بمسار واحد (رسم سريع، ترتيبه ما يهم مع المزج الضوئي)
    // الوجهين الظاهرين للكاميرا فقط: الحافة اللي عمودها يتجه للكاميرا (ry موجب)
    var nrm = [[0, -1], [1, 0], [0, 1], [-1, 0]], FACES = [0, 1, 2, 3].filter(function (j) { var nx = nrm[j][0], ny = nrm[j][1]; return nx * J.sY + ny * J.cY > 0; }).slice(0, 2); while (FACES.length < 2) FACES.push(FACES[0] || 2);
    var lite = moving();
    var tops = {}, sides = {}, n = LY.pts.length, PX = new Float32Array(n), PY = new Float32Array(n), VIS = new Uint8Array(n);
    for (i = 0; i < n; i++) {
      var p = LY.pts[i]; if (J.secs.indexOf(p.o.h.s) < 0) continue;
      var st = stOf(p), dim = flt && st !== flt, key = dim ? '__dim' : st, z = dim ? 2 : ZH[st] || 4;
      var q = [P(p.x - p.w, p.y - p.d, 0), P(p.x + p.w, p.y - p.d, 0), P(p.x + p.w, p.y + p.d, 0), P(p.x - p.w, p.y + p.d, 0)];
      var u = [P(p.x - p.w, p.y - p.d, z), P(p.x + p.w, p.y - p.d, z), P(p.x + p.w, p.y + p.d, z), P(p.x - p.w, p.y + p.d, z)];
      var tp = tops[key] = tops[key] || new Path2D(); tp.moveTo(u[0][0], u[0][1]); tp.lineTo(u[1][0], u[1][1]); tp.lineTo(u[2][0], u[2][1]); tp.lineTo(u[3][0], u[3][1]); tp.closePath();
      if (!dim && !lite) { var arr = sides[key] = sides[key] || [], sd = arr.length && arr[arr.length - 1].n < 90 ? arr[arr.length - 1] : (arr.push({ p: new Path2D(), n: 0 }), arr[arr.length - 1]); sd.n++;
        for (var fi = 0; fi < 2; fi++) { var j = FACES[fi], k = (j + 1) % 4; sd.p.moveTo(q[j][0], q[j][1]); sd.p.lineTo(q[k][0], q[k][1]); sd.p.lineTo(u[k][0], u[k][1]); sd.p.lineTo(u[j][0], u[j][1]); sd.p.closePath(); } }
      var c = P(p.x, p.y, z); PX[i] = c[0]; PY[i] = c[1]; VIS[i] = 1;
    }
    pick = { PX: PX, PY: PY, VIS: VIS };
    if (tops.__dim) { x.fillStyle = 'rgba(60,120,150,.10)'; x.fill(tops.__dim); }
    ORD.forEach(function (st) {
      var cc = CR[st], strong = st !== 'del' && st !== 'none';
      if (sides[st]) { x.fillStyle = rgba(cc, strong ? .2 : .07); sides[st].forEach(function (c) { x.fill(c.p); }); }
      if (tops[st]) { x.fillStyle = rgba(cc, strong ? .55 : st === 'none' ? .18 : .22); x.fill(tops[st]); x.strokeStyle = rgba(cc, strong ? .95 : .4); x.lineWidth = 1; x.stroke(tops[st]); }
    });
    x.globalCompositeOperation = 'source-over';
    placeTags(J);
    dirty = false;
  }
  function placeTags(J) {
    var box = el.querySelector('#hgtags'), P = J.P, h = '', pos = [];
    // اتجاه «قدّام» حسب دوران الكاميرا
    var fx = Math.sin(-cam.yaw) * 0, fy = 1;
    J.secs.forEach(function (s) {
      var b = LY.sb[s]; if (!b) return; var o = DATA.sec[s] || { all: 0, del: 0 }, c = secCnt(s);
      var cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2, hw = (b[2] - b[0]) / 2, hh = (b[3] - b[1]) / 2;
      // أقرب نقطة للكاميرا من حافة القطاع
      var best = null; [[cx, b[3] + 70], [cx, b[1] - 70], [b[0] - 60, cy], [b[2] + 60, cy]].forEach(function (q) { var pp = P(q[0], q[1], 0); if (!best || pp[2] > best[2]) best = pp; });
      if (focus) best = P(cx, b[3] + 40, 0);
      var pc = pct(c.del, c.all), ws = c.ready + c.not + c.late;
      pos.push([s, best[0] / DPR, best[1] / DPR]);
      h += '<button class="hgtag" data-hg="sec" data-v="' + s + '" style="left:' + (best[0] / DPR) + 'px;top:' + (best[1] / DPR) + 'px"><b>' + SN[s] + '<em>' + pc + '%</em><span class="q">' + ws + ' قيد</span><span class="o">' + c.late + ' عابر</span></b><i><u style="width:' + pc + '%"></u></i></button>';
    });
    var key = J.secs.join(',') + '|' + tagsVer;
    if (box._k === key) { pos.forEach(function (q, i) { var b = box.children[i]; if (b) { b.style.left = q[1] + 'px'; b.style.top = q[2] + 'px'; } }); return; }
    box._k = key; box.innerHTML = h;
  }
  function secCnt(s) { var c = { all: 0, del: 0, ready: 0, not: 0, late: 0, rev: 0, nw: 0, none: 0 }; LY.pts.forEach(function (p) { if (p.o.h.s !== s) return; c.all++; c[stOf(p)]++; }); return c; }

  /* ---- الطبقة المتحركة: خط المسح وأعمدة التنبيه والدار المختارة ---- */
  function frame(now) {
    if (!on) return; if (!el.isConnected) { stop(); return; }
    if (document.hidden) { raf = requestAnimationFrame(frame); return; }
    if (anim) { var a = Math.min(1, (now - anim.t0) / anim.d), e = 1 - Math.pow(1 - a, 3); Object.keys(anim.b).forEach(function (k) { cam[k] = anim.a[k] + (anim.b[k] - anim.a[k]) * e; }); dirty = true; if (a >= 1) anim = null; }
    var wasMoving = lastMoving; autoing = auto && !drag && !pinch && !anim && now - lastInt > 3500;
    if (autoing) { cam.yaw += 0.0016; dirty = true; }
    lastMoving = moving(); if (wasMoving && !lastMoving) dirty = true;
    if (dirty) drawScene();
    var x = xO, J = PJ, P = J.P, t = (now - t0) / 1000;
    x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, W, H);
    x.globalCompositeOperation = 'lighter';
    // خط المسح يمشي على المنصّة
    var sp = (t * 0.12) % 1, sy = J.Y0 + (J.Y1 - J.Y0) * sp, a1 = P(J.X0, sy, 0), a2 = P(J.X1, sy, 0);
    x.strokeStyle = 'rgba(160,245,255,.75)'; x.lineWidth = 2 * DPR; x.shadowColor = '#7ff'; x.shadowBlur = 14; x.beginPath(); x.moveTo(a1[0], a1[1]); x.lineTo(a2[0], a2[1]); x.stroke(); x.shadowBlur = 0;
    // أعمدة الضوء للدور العابر موعدها
    var pul = (t * 1.2) % 1, big = !!focus;
    for (var i = 0; i < LY.pts.length; i++) {
      var p = LY.pts[i]; if (J.secs.indexOf(p.o.h.s) < 0 || stOf(p) !== 'late' || (flt && flt !== 'late')) continue;
      var od = p.o.dd != null ? -p.o.dd : 5, hgt = (big ? 70 : 90) * (0.35 + Math.min(45, od) / 45);
      var b = P(p.x, p.y, 0), tp = P(p.x, p.y, hgt), g = x.createLinearGradient(b[0], b[1], tp[0], tp[1]);
      g.addColorStop(0, 'rgba(255,60,90,.95)'); g.addColorStop(1, 'rgba(255,60,90,0)');
      x.strokeStyle = g; x.lineWidth = (big ? 6 : 3.4) * DPR; x.beginPath(); x.moveTo(b[0], b[1]); x.lineTo(tp[0], tp[1]); x.stroke();
      x.strokeStyle = 'rgba(255,210,220,.85)'; x.lineWidth = 1.1 * DPR; x.beginPath(); x.moveTo(b[0], b[1]); x.lineTo(tp[0], tp[1]); x.stroke();
      var rr = (big ? 9 : 5) * DPR * (1 + pul * 1.6); x.globalAlpha = 1 - pul; x.beginPath(); x.ellipse(b[0], b[1], rr, rr * J.cs, 0, 0, 6.2832); x.strokeStyle = 'rgba(255,80,110,.9)'; x.stroke(); x.globalAlpha = 1;
    }
    // الدار المختارة
    if (sel != null && LY.pts[sel] && pick.VIS[sel]) {
      var s = LY.pts[sel], c = P(s.x, s.y, 0), up = P(s.x, s.y, 110), r2 = (14 + 3 * Math.sin(t * 5)) * DPR;
      x.strokeStyle = '#e0faff'; x.lineWidth = 1.6 * DPR; x.beginPath(); x.ellipse(c[0], c[1], r2, r2 * J.cs, 0, 0, 6.2832); x.stroke();
      var g2 = x.createLinearGradient(c[0], c[1], up[0], up[1]); g2.addColorStop(0, 'rgba(220,250,255,.9)'); g2.addColorStop(1, 'rgba(220,250,255,0)'); x.strokeStyle = g2; x.lineWidth = 2 * DPR; x.beginPath(); x.moveTo(c[0], c[1]); x.lineTo(up[0], up[1]); x.stroke();
      x.globalCompositeOperation = 'source-over'; x.font = '700 ' + (13 * DPR) + 'px ' + MONO; x.textAlign = 'center'; x.fillStyle = '#fff'; x.shadowColor = '#22d3ee'; x.shadowBlur = 10; x.fillText(s.o.h.id, up[0], up[1] - 4 * DPR); x.shadowBlur = 0;
    }
    // أرقام الدور عند التكبير
    x.globalCompositeOperation = 'source-over';
    if (J.S * 8 > 18 * DPR) { x.font = '600 ' + Math.round(Math.min(12, J.S * 4 / DPR) * DPR) + 'px ' + MONO; x.textAlign = 'center'; x.textBaseline = 'middle';
      for (i = 0; i < LY.pts.length; i++) { if (!pick.VIS[i]) continue; var px = pick.PX[i], py = pick.PY[i]; if (px < 0 || py < 0 || px > W || py > H) continue; var st = stOf(LY.pts[i]); x.fillStyle = st === 'del' || st === 'none' ? 'rgba(200,240,255,.75)' : '#fff'; x.fillText(LY.pts[i].o.n, px, py); }
      x.textBaseline = 'alphabetic'; }
    raf = requestAnimationFrame(frame);
  }
  function moving() { return !!(drag || pinch || anim || autoing); }
  function start() { if (on) return; on = true; raf = requestAnimationFrame(frame); }
  function stop() { on = false; cancelAnimationFrame(raf); }

  /* ---- واجهة ---- */
  function hud() {
    var c = { all: 0, del: 0, ready: 0, not: 0, late: 0, rev: 0, nw: 0, none: 0 };
    LY.pts.forEach(function (p) { if (focus && p.o.h.s !== focus) return; c.all++; c[stOf(p)]++; });
    var ws = c.ready + c.not + c.late;
    var kp = [['all', c.all, 'دار', '#d9f6ff'], ['del', c.del, 'مسلّمة', NEON.del], ['ws', ws, 'قيد التسليم', NEON.not], ['ready', c.ready, 'جاهزة', NEON.ready], ['late', c.late, 'عابر موعدها', NEON.late], ['rev', c.rev, 'بالمراجعة', NEON.rev]];
    el.querySelector('#hgkp').innerHTML = kp.map(function (k) { return '<button data-hg="kp" data-v="' + k[0] + '" class="' + (flt === k[0] ? 'on' : '') + '" style="color:' + k[3] + '"><b>' + k[1] + '</b><small>' + k[2] + '</small></button>'; }).join('');
    el.querySelector('#hgsecs').innerHTML = '<button data-hg="sec" data-v="all" class="' + (!focus ? 'on' : '') + '">كل المجمع</button>' + [1, 2, 3, 4, 5, 6].map(function (s) { var o = secCnt(s); return '<button data-hg="sec" data-v="' + s + '" class="' + (focus === s ? 'on' : '') + '">' + SN[s] + '<small>' + pct(o.del, o.all) + '%</small></button>'; }).join('');
    el.querySelector('#hglg').innerHTML = ORD.filter(function (k) { return c[k]; }).map(function (k) { return '<button data-hg="flt" data-v="' + k + '" class="' + (flt === k ? 'on' : flt ? 'off' : '') + '" style="color:' + NEON[k] + '"><i></i><span style="color:#cfeef8">' + LBL[k] + '</span><b>' + c[k] + '</b></button>'; }).join('');
    tagsVer++; el.querySelector('#hgauto').classList.toggle('on', auto);
    el.querySelector('#hgtop').textContent = cam.tilt > 75 ? 'منظور' : 'أعلى';
  }
  function card(i) {
    var c = el.querySelector('#hgcard'), mx = M(), p = LY.pts[i]; if (!p) return;
    c.innerHTML = mx.housePanel(p.o.h); c.classList.add('show');
  }
  function closeCard() { var c = el.querySelector('#hgcard'); c.classList.remove('show'); c.innerHTML = ''; sel = null; }
  function goCam(b, d) { anim = { a: { yaw: cam.yaw, tilt: cam.tilt, zoom: cam.zoom, px: cam.px, py: cam.py }, b: Object.assign({ yaw: cam.yaw, tilt: cam.tilt, zoom: cam.zoom, px: cam.px, py: cam.py }, b), t0: performance.now(), d: d || 650 }; }
  function setFocus(s) { focus = s; closeCard(); hud(); goCam({ zoom: 1, px: 0, py: 0 }); dirty = true; }
  function focusHouse(k) {
    var i = -1; for (var j = 0; j < LY.pts.length; j++) if (LY.pts[j].o.k === k) { i = j; break; }
    if (i < 0) return false;
    var s = LY.pts[i].o.h.s; if (focus !== s) { focus = s; hud(); } if (flt && stOf(LY.pts[i]) !== flt) { flt = null; hud(); }
    sel = i; card(i); lastInt = performance.now(); anim = null; cam.zoom = 1; cam.px = 0; cam.py = 0; dirty = true; drawScene();
    var zf = 2.6, px = pick.PX[i], py = pick.PY[i];
    var oc = PJ.oyc; goCam({ zoom: zf, px: (W / 2 - px) * zf, py: H * 0.34 - oc - (py - oc) * zf }, 750);
    return true;
  }
  function hitHouse(px, py) {
    if (!pick) return -1; var best = -1, bd = (26 * DPR) * (26 * DPR);
    for (var i = 0; i < pick.PX.length; i++) { if (!pick.VIS[i]) continue; var dx = pick.PX[i] - px, dy = pick.PY[i] - py, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = i; } }
    return best;
  }
  function wire() {
    function pos(e) { var r = cvO.getBoundingClientRect(); return [(e.clientX - r.left) * DPR, (e.clientY - r.top) * DPR]; }
    var tgt = cvO;
    tgt.addEventListener('pointerdown', function (e) {
      try { tgt.setPointerCapture(e.pointerId); } catch (er) {}
      ptrs[e.pointerId] = pos(e); moved = 0; anim = null; lastInt = performance.now();
      var ids = Object.keys(ptrs);
      if (ids.length === 1) drag = { p: ptrs[ids[0]], yaw: cam.yaw, tilt: cam.tilt, px: cam.px, py: cam.py, pan: e.shiftKey || e.button === 2 };
      if (ids.length === 2) { var a = ptrs[ids[0]], b = ptrs[ids[1]]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), zoom: cam.zoom, m: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], px: cam.px, py: cam.py }; drag = null; }
    });
    tgt.addEventListener('pointermove', function (e) {
      var p = pos(e);
      if (!ptrs[e.pointerId]) { if (e.pointerType === 'mouse') hover(p); return; }
      ptrs[e.pointerId] = p; lastInt = performance.now(); var ids = Object.keys(ptrs);
      if (ids.length >= 2 && pinch) { var a = ptrs[ids[0]], b = ptrs[ids[1]], d = Math.hypot(a[0] - b[0], a[1] - b[1]), m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], z = Math.max(.6, Math.min(8, pinch.zoom * d / pinch.d)), f = z / pinch.zoom;
        var oc = PJ ? PJ.oyc : H / 2; cam.zoom = z; cam.px = (pinch.px - (pinch.m[0] - W / 2)) * f + (m[0] - W / 2); cam.py = (pinch.py - (pinch.m[1] - oc)) * f + (m[1] - oc); moved = 99; dirty = true; return; }
      if (drag) { var dx = p[0] - drag.p[0], dy = p[1] - drag.p[1]; moved = Math.max(moved, Math.abs(dx) + Math.abs(dy)); if (moved < 5 * DPR) return;
        if (drag.pan) { cam.px = drag.px + dx; cam.py = drag.py + dy; }
        else { cam.yaw = drag.yaw - dx / DPR * 0.008; cam.tilt = Math.max(20, Math.min(88, drag.tilt + dy / DPR * 0.25)); }
        dirty = true; }
    });
    function up(e) {
      var p = ptrs[e.pointerId]; delete ptrs[e.pointerId];
      if (Object.keys(ptrs).length < 2) pinch = null;
      if (!Object.keys(ptrs).length) { if (moved <= 5 * DPR && p) { var i = hitHouse(p[0], p[1]); if (i >= 0) { sel = i; card(i); } else closeCard(); } drag = null; hud(); }
    }
    tgt.addEventListener('pointerup', up);
    tgt.addEventListener('pointercancel', function (e) { delete ptrs[e.pointerId]; pinch = null; drag = null; });
    tgt.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    tgt.addEventListener('pointerleave', function () { var tp = el.querySelector('#hgtip'); if (tp) tp.hidden = true; });
    tgt.addEventListener('wheel', function (e) { e.preventDefault(); lastInt = performance.now(); var p = pos(e), f = e.deltaY > 0 ? 1 / 1.12 : 1.12, z = Math.max(.6, Math.min(8, cam.zoom * f)); f = z / cam.zoom; var oc = PJ ? PJ.oyc : H / 2; cam.px = (cam.px - (p[0] - W / 2)) * f + (p[0] - W / 2); cam.py = (cam.py - (p[1] - oc)) * f + (p[1] - oc); cam.zoom = z; dirty = true; }, { passive: false });
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-hg]'); if (b) {
        var a = b.dataset.hg, v = b.dataset.v; lastInt = performance.now();
        if (a === 'zin') goCam({ zoom: Math.min(8, cam.zoom * 1.5) }, 300);
        else if (a === 'zout') goCam({ zoom: Math.max(.6, cam.zoom / 1.5), px: cam.px / 1.5, py: cam.py / 1.5 }, 300);
        else if (a === 'reset') { closeCard(); goCam({ yaw: CAM0.yaw, tilt: CAM0.tilt, zoom: 1, px: 0, py: 0 }); }
        else if (a === 'top') { goCam({ tilt: cam.tilt > 75 ? CAM0.tilt : 88, yaw: cam.tilt > 75 ? cam.yaw : 0 }); setTimeout(hud, 700); }
        else if (a === 'auto') { auto = !auto; try { localStorage.setItem('hg_auto', auto ? '1' : '0'); } catch (er) {} hud(); }
        else if (a === 'sec') setFocus(v === 'all' ? null : +v);
        else if (a === 'flt') { flt = flt === v ? null : v; hud(); dirty = true; }
        else if (a === 'kp') { flt = (v === 'all' || v === 'ws' || flt === v) ? null : v; hud(); dirty = true; }
        return;
      }
      if (e.target.closest('[data-mx="unsel"]')) { e.stopPropagation(); closeCard(); }
    });
    el.addEventListener('input', function (e) { if (e.target.id === 'hgtl') { tl = +e.target.value; tlEnd = tl >= months.length; tlLabel(); hud(); dirty = true; } });
    el.addEventListener('keydown', function (e) { if (e.target.id === 'hgq' && e.key === 'Enter') search(e.target.value); });
    window.addEventListener('resize', function () { if (!el.isConnected) return; fitHeight(el); size(); });
  }
  function hover(p) {
    var tp = el.querySelector('#hgtip'), i = hitHouse(p[0], p[1]); if (i < 0) { tp.hidden = true; return; }
    var o = LY.pts[i].o, st = stOf(LY.pts[i]);
    tp.innerHTML = '<b>' + esc(o.h.id) + '</b> · <span style="color:' + NEON[st] + '">' + LBL[st] + '</span> · ' + esc(o.g);
    tp.hidden = false; tp.style.left = (p[0] / DPR + 14) + 'px'; tp.style.top = (p[1] / DPR - 30) + 'px';
  }
  function search(q) {
    var mx = M(), k = mx.mk(q); if (!k) return;
    if (!DATA.md.H[k]) { var alt = Object.keys(DATA.md.H).filter(function (x) { return x.indexOf(k) === 0; }); if (alt.length === 1) k = alt[0]; }
    if (!focusHouse(k)) X.toast('⚠️ الدار ' + q + ' ما موجودة بالخريطة', false);
  }
  function mount() {
    var slot = document.getElementById('rdslot'); if (!slot) return;
    if (!el) build();
    if (el.parentNode !== slot) slot.appendChild(el);
    fitHeight(el); size(); dot(el);
    waitData(function () {
      var keepSel = sel != null && LY ? LY.pts[sel].o.k : null;
      layout(); if (keepSel) { sel = null; LY.pts.forEach(function (p, i) { if (p.o.k === keepSel) sel = i; }); }
      hud(); dirty = true; if (sel != null) card(sel); start();
    });
  }
  return { mount: mount, unmount: stop, focusNow: function (k) { if (!el || !el.isConnected || !LY || !PJ) return false; return focusHouse(k); } };
})();
var RD = HG;

/* =====================================================================
   شبكة المقاولين
   ===================================================================== */
var NT = (function () {
  var el = null, cv, ctx, W = 0, H = 0, raf = 0, on = false, nodes = [], dots = [], t0 = performance.now(), sel = null;
  function build() {
    css();
    el = document.createElement('div'); el.className = 'rd';
    el.innerHTML = '<canvas></canvas><div class="scan"></div><i class="brk b1"></i><i class="brk b2"></i>' +
      '<div class="hud">' + tbar('شبكة المقاولين', 'radar', 'المجسّم') + '<div style="font:600 10px ' + MONO + ';color:#00ff9c;direction:ltr;text-align:left;opacity:.8" id="ntsum"></div></div>' +
      '<div class="lg" style="bottom:10px"><button style="color:#00ff9c"><span style="color:#cfeee2">الحلقة = الكفاءة</span><i></i></button><button style="color:#ffb020"><span style="color:#cfeee2">النقاط = قيد التسليم</span><i></i></button><button style="color:#ff3b5c"><span style="color:#cfeee2">الأحمر = عابر موعدها</span><i></i></button></div>' +
      '<div class="nt-card" id="ntcard" hidden></div>';
    cv = el.querySelector('canvas'); ctx = cv.getContext('2d', { alpha: false });
    cv.addEventListener('click', function (e) {
      var r = cv.getBoundingClientRect(), px = (e.clientX - r.left) * DPR, py = (e.clientY - r.top) * DPR, best = null, bd = 1e12;
      nodes.forEach(function (n) { var d = Math.hypot(n.x - px, n.y - py); if (d < n.R + 20 * DPR && d < bd) { bd = d; best = n; } });
      sel = best ? best.g : null; info();
    });
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-nt]'); if (!b) return;
      if (b.dataset.nt === 'x') { sel = null; info(); }
      else if (b.dataset.nt === 'go') { var k = b.dataset.v; X.ACT.go({ v: 'radar' }); setTimeout(function () { RD._f && RD._f(k); }, 120); }
    });
    window.addEventListener('resize', function () { if (!el.isConnected) return; fitHeight(el); size(); layout(); });
  }
  function size() { var r = el.getBoundingClientRect(); if (!r.width) return; W = Math.round(r.width * DPR); H = Math.round(r.height * DPR); if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; } }
  function layout() {
    var g = {};
    DATA.list.forEach(function (o) { var n = g[o.g] = g[o.g] || { g: o.g, all: 0, ws: [], c: {} }; n.all++; n.c[o.st] = (n.c[o.st] || 0) + 1; if (o.st === 'ready' || o.st === 'not' || o.st === 'late') n.ws.push(o); });
    var arr = Object.keys(g).map(function (k) { var n = g[k], e = (DATA.P.eff || {})[k]; n.eff = e ? e.eff : (n.ws.length ? 100 : null); n.late = n.c.late || 0; return n; }).filter(function (n) { return n.g !== 'غير محدد' || n.ws.length; });
    arr.sort(function (a, b) { return b.all - a.all; });
    var co = arr.filter(function (n) { return /تنفيذ مباشر/.test(n.g); })[0] || arr[0], rest = arr.filter(function (n) { return n !== co; });
    var cx = W / 2, cy = H / 2 + 10 * DPR, rx = W * .36, ry = (H - 160 * DPR) * .40;
    co.x = cx; co.y = cy; co.R = Math.min(W, H) * .085;
    rest.forEach(function (n, i) { var a = -Math.PI / 2 + i / rest.length * Math.PI * 2; n.x = cx + Math.cos(a) * rx; n.y = cy + Math.sin(a) * ry; n.R = Math.min(W, H) * (.042 + Math.min(.02, n.ws.length / 1500)); });
    nodes = [co].concat(rest); dots = [];
    nodes.forEach(function (n, j) { var m = n.ws.length; n.ws.forEach(function (o, i) { var a = i / m * Math.PI * 2 + j, r = n.R * (1.35 + Math.random() * .7); dots.push({ n: n, o: o, x: n.x + Math.cos(a) * r, y: n.y + Math.sin(a) * r, ph: Math.random() * 6.28 }); }); });
    var c = DATA.cnt; el.querySelector('#ntsum').textContent = nodes.length + ' NODES · ' + ((c.ready || 0) + (c.not || 0) + (c.late || 0)) + ' ACTIVE · ' + (c.late || 0) + ' ALERTS';
  }
  function info() {
    var c = el.querySelector('#ntcard'), n = nodes.filter(function (x) { return x.g === sel; })[0];
    if (!n) { c.hidden = true; return; }
    var late = n.ws.filter(function (o) { return o.st === 'late'; }).sort(function (a, b) { return (a.dd || 0) - (b.dd || 0); });
    var rdy = n.ws.filter(function (o) { return o.st === 'ready'; });
    c.hidden = false;
    c.innerHTML = '<button class="x" data-nt="x" aria-label="إغلاق">✕</button><h3>' + esc(n.g) + '</h3><div style="font-size:12px;color:#8fb9a8">الكفاءة ' + (n.eff == null ? '—' : n.eff + '٪') + ' · ' + n.all + ' دار بالخريطة</div>' +
      '<div class="g"><div><b>' + (n.c.del || 0) + '</b>مسلّمة</div><div><b>' + n.ws.length + '</b>قيد التسليم</div><div><b style="color:#3fb6ff">' + rdy.length + '</b>جاهزة</div><div><b style="color:#ff3b5c">' + late.length + '</b>عابر</div></div>' +
      (late.length ? '<div style="font-size:12px;margin-bottom:5px;color:#ff8a9c">الدور العابر موعدها — اضغط تروح عليها بالرادار:</div><div class="hl">' + late.map(function (o) { return '<button data-nt="go" data-v="' + esc(o.k) + '" style="color:#ff5a74">' + esc(o.h.id) + (o.dd != null ? ' · ' + (-o.dd) + 'd' : '') + '</button>'; }).join('') + '</div>' : '<div style="font-size:12px;color:#00ff9c">✓ ماكو دور عابر موعدها</div>');
  }
  function frame(now) {
    if (!on) return; if (!el.isConnected) { stop(); return; } if (document.hidden) { raf = requestAnimationFrame(frame); return; }
    var t = (now - t0) / 1000, x = ctx; x.setTransform(1, 0, 0, 1, 0, 0);
    x.fillStyle = '#020806'; x.fillRect(0, 0, W, H);
    var co = nodes[0]; if (!co) { raf = requestAnimationFrame(frame); return; }
    nodes.forEach(function (n, i) { if (!i) return; x.strokeStyle = sel && sel !== n.g ? 'rgba(34,211,238,.08)' : 'rgba(34,211,238,.28)'; x.lineWidth = 1.4 * DPR; x.beginPath(); x.moveTo(co.x, co.y); x.lineTo(n.x, n.y); x.stroke();
      var q = (t * .3 + i * .17) % 1; x.fillStyle = '#22d3ee'; x.shadowColor = '#22d3ee'; x.shadowBlur = 10 * DPR; x.beginPath(); x.arc(co.x + (n.x - co.x) * q, co.y + (n.y - co.y) * q, 2.6 * DPR, 0, 6.2832); x.fill(); x.shadowBlur = 0; });
    x.lineWidth = 1 * DPR;
    dots.forEach(function (d) { var c = NEON[d.o.st], dim = sel && sel !== d.n.g; var px = d.x + Math.sin(t + d.ph) * 2 * DPR, py = d.y + Math.cos(t * .8 + d.ph) * 2 * DPR;
      x.globalAlpha = dim ? .06 : .16; x.strokeStyle = c; x.beginPath(); x.moveTo(d.n.x, d.n.y); x.lineTo(px, py); x.stroke();
      x.globalAlpha = dim ? .15 : d.o.st === 'late' ? .55 + .45 * Math.sin(t * 6 + d.ph) : .9; x.fillStyle = c; x.beginPath(); x.arc(px, py, (d.o.st === 'late' ? 3.4 : 2.2) * DPR, 0, 6.2832); x.fill(); });
    x.globalAlpha = 1;
    nodes.forEach(function (n, i) {
      var dim = sel && sel !== n.g, R = n.R; x.globalAlpha = dim ? .35 : 1;
      x.fillStyle = 'rgba(2,14,12,.96)'; x.beginPath(); x.arc(n.x, n.y, R, 0, 6.2832); x.fill();
      x.strokeStyle = 'rgba(0,255,156,.18)'; x.lineWidth = 5 * DPR; x.beginPath(); x.arc(n.x, n.y, R, 0, 6.2832); x.stroke();
      var e = n.eff == null ? 100 : n.eff, col = n.eff == null ? '#3a5a50' : e >= 90 ? '#00ff9c' : e >= 75 ? '#ffb020' : '#ff3b5c';
      x.strokeStyle = col; x.shadowColor = col; x.shadowBlur = 12 * DPR; x.beginPath(); x.arc(n.x, n.y, R, -Math.PI / 2, -Math.PI / 2 + e / 100 * Math.PI * 2 * Math.min(1, t / 1.2)); x.stroke(); x.shadowBlur = 0;
      x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '700 ' + Math.round(R * .42) + 'px ' + MONO; x.fillText(n.eff == null ? '—' : n.eff + '%', n.x, n.y);
      var nm = n.g, fz = Math.round((i ? 11.5 : 13) * DPR); x.font = '600 ' + fz + 'px "IBM Plex Sans Arabic",sans-serif'; var tw = x.measureText(nm).width + 12 * DPR;
      x.fillStyle = 'rgba(1,8,8,.85)'; x.fillRect(n.x - tw / 2, n.y + R + 5 * DPR, tw, (n.late ? 32 : 18) * DPR);
      x.fillStyle = '#bff'; x.textBaseline = 'top'; x.fillText(nm, n.x, n.y + R + 6 * DPR);
      if (n.late) { x.fillStyle = '#ff5a74'; x.font = '600 ' + Math.round(10 * DPR) + 'px "IBM Plex Sans Arabic",sans-serif'; x.fillText('⚠ ' + n.late + ' عابر · ' + n.ws.length + ' قيد', n.x, n.y + R + 21 * DPR); }
    });
    x.globalAlpha = 1;
    raf = requestAnimationFrame(frame);
  }
  function start() { if (on) return; on = true; t0 = performance.now(); raf = requestAnimationFrame(frame); }
  function stop() { on = false; cancelAnimationFrame(raf); }
  return {
    mount: function () { var slot = document.getElementById('ntslot'); if (!slot) return; if (!el) build(); if (el.parentNode !== slot) slot.appendChild(el); fitHeight(el); size(); dot(el); waitData(function () { layout(); info(); start(); }); },
    unmount: stop
  };
})();

// ربط التركيز على دار من الشبكة → الرادار
RD._f = function (k) { var tries = 0; (function tryF() { if (RD.focusNow(k)) return; if (++tries < 40) setTimeout(tryF, 100); })(); };
try { X.scheduleRender(); } catch (e) {}
})();
