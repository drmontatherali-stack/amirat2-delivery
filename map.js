/* الخريطة الحيّة — قسم تجريبي منفصل عن عمل مكتب التسليم
   تقرا نفس بيانات النظام (قيد التسليم، المسلّمة، المراجعات) وتلوّن كل دار على خريطة القطاعات.
   تعديلات توزيع المقاولين على الخريطة تنحفظ بمسار منفصل (amirat2/mapTrial) وما تأثر على أي حساب بالنظام لحين الاعتماد.
   Design by: Montather Ali */
(function () {
'use strict';
var X = window.A2X; if (!X || !X.VIEWS) return;
var V = '2.0.0';
var S = X.S, esc = X.esc;
var MD = null, MDerr = '', loading = false;
var ST = { sec: X.lsGet('mx_sec', 'all'), mode: X.lsGet('mx_mode', 'status'), con: 'all', q: '', sel: null, edit: false, vb: {}, zoomed: false };
var COLORS = { del: '#2ecc71', ready: '#3fa9f5', not: '#f5a623', late: '#ff4d5e', rev: '#a77bff', nw: '#22d3c5', none: null };
var ST_LBL = { del: 'مسلّمة', ready: 'قيد التسليم · جاهزة', not: 'قيد التسليم · غير جاهزة', late: 'عابر موعدها وغير جاهزة', rev: 'قيد المراجعة', nw: 'جديدة بانتظار التبليغ', none: 'بعدها ما وصلت' };
var ST_ORD = ['del', 'ready', 'not', 'late', 'rev', 'nw', 'none'];
var PAL = ['#4FD8E8', '#8E7CFF', '#E2C47A', '#38E2A0', '#FF7AA8', '#68B6FF', '#F2B23E', '#FF8A5B', '#9BE15D', '#D77BFF', '#5BC0BE', '#F6E05E', '#E36B6B', '#7FD1AE'];
var DIRECT = 'تنفيذ مباشر';
var CO_LBL = 'الشركة — تنفيذ مباشر';

/* ---------- تسجيل القسم بالنظام ---------- */
X.ICONS.map = 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14';
if (X.HUB.indexOf('map') < 0) X.HUB.push('map');
X.HUB_LBL.map = 'الخريطة';
X.TITLES.map = 'الخريطة الحيّة · تجريبي';
if (!X.NAV.some(function (n) { return n[0] === 'map'; })) X.NAV.splice(X.NAV.length - 1, 0, ['map', 'الخريطة · تجريبي']);
X.hubStats = function () { return { map: { c: 'تجريبي', p: null } }; };
X.VIEWS.map = function () { return '<div id="mxroot" class="mx"></div>'; };
X.afterRender = function (view) { if (view === 'map') build(); };

/* ---------- أدوات ---------- */
function mk(h) { return String(h == null ? '' : h).toUpperCase().replace(/\s+/g, '').replace(/[-_]/g, '.'); }
function arTok(n) { return X.arN(n).split(' ').filter(Boolean); }
function sameCon(a, b) { // "اوات" = "اوات جمال" ، "علي الكوفي" = "علي محمد الكوفي"
  var A = arTok(a), B = arTok(b); if (!A.length || !B.length) return false;
  var s = A.length <= B.length ? A : B, l = A.length <= B.length ? B : A;
  return s.every(function (w) { return l.indexOf(w) >= 0; });
}
function sectorName(s) { return MD && MD.sectors[s] ? MD.sectors[s].name : 'القطاع ' + s; }
function trialBlocks() { var t = (X.D().mapTrial || {}).blocks || {}; return t; }
function bKey(s, b) { return 's' + s + '_' + b; }
function blockOf(id) { return id.split('.')[0]; }

/* ---------- تحميل بيانات الخريطة ---------- */
function load() {
  if (MD || loading) return; loading = true;
  fetch('mapdata.json?v=' + V).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(function (d) {
    var C = d.H; MD = d; MD.H = {}; MD.byS = {};
    var ids = C.id.split(' '), x = 0, y = 0;
    ids.forEach(function (id, i) { x += C.x[i]; y += C.y[i];
      var h = { id: id, s: +C.s[i], x: x / 2, y: y / 2, w: C.w[i] / 2, h: C.h[i] / 2, con0: d.cons[C.c.charCodeAt(i) - 48], dir0: C.d[i] === '1', b: blockOf(id) };
      MD.H[mk(h.id)] = h; (MD.byS[h.s] = MD.byS[h.s] || []).push(h); });
    loading = false; ST.built = false; build();
  }).catch(function (e) { loading = false; MDerr = String(e && e.message || e); build(); });
}

/* ---------- حالة كل دار من بيانات النظام ---------- */
function index() {
  var ws = {}, del = {}, rv = {}, nw = {};
  X.wsUnits().forEach(function (u) { ws[mk(u.unit)] = u; });
  try { X.pendingNew().forEach(function (u) { nw[mk(u.unit)] = u; }); } catch (e) {}
  S.del.forEach(function (x) { del[mk(x.houseNo)] = x; });
  X.oldRecs().forEach(function (r) { rv[mk(r.houseNo)] = r; });
  return { ws: ws, del: del, rv: rv, nw: nw };
}
function effCon(h) { // مقاول الدار حسب الخريطة + تعديل التوزيع التجريبي
  var o = trialBlocks()[bKey(h.s, h.b)];
  var con = o ? (o.con || '') : h.con0, dir = o ? !!o.direct : h.dir0;
  return { con: con, direct: dir, label: dir ? DIRECT : (con || 'غير محدد'), group: dir ? CO_LBL : (con || 'غير محدد'), edited: !!o, orig: h.con0, origDir: h.dir0 };
}
function statusOf(h, I) {
  var k = mk(h.id), u = I.ws[k], r = I.rv[k], d = I.del[k];
  if (d || (r && X.isDeliveredRec(r)) || X.getSheetDate(h.id)) return 'del';
  if (u) { if (X.isReady(u.unit)) return 'ready'; var dd = X.daysDiff(u.deliveryDate); return dd !== null && dd <= 0 ? 'late' : 'not'; }
  if (I.nw[k]) return 'nw';
  if (r) return 'rev';
  return 'none';
}

/* ---------- البناء ---------- */
function css() {
  if (document.getElementById('mxcss')) return;
  var st = document.createElement('style'); st.id = 'mxcss';
  st.textContent = [
    '.mx{display:flex;flex-direction:column;gap:12px}',
    '.mx .trial{display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--gold,#E2C47A);border:1px dashed color-mix(in srgb,var(--gold,#E2C47A) 60%,transparent);border-radius:12px;padding:8px 12px;background:color-mix(in srgb,var(--gold,#E2C47A) 8%,transparent)}',
    '.mx .bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center}',
    '.mx .bar .grow{flex:1 1 180px;min-width:150px}',
    '.mx .seg{display:inline-flex;border:1px solid var(--line);border-radius:12px;overflow-x:auto;max-width:100%;scrollbar-width:none}',
    '.mx .seg button{white-space:nowrap}',
    '.mx .seg button{border:0;background:transparent;color:var(--muted);padding:8px 12px;font:inherit;font-size:13px;cursor:pointer}',
    '.mx .seg button.on{background:var(--brand);color:#06121f;font-weight:700}',
    '.mx .main{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:12px;align-items:start}',
    '.mx .mapbox{position:relative;border:1px solid var(--line);border-radius:16px;overflow:hidden;background:var(--card-solid,var(--card));height:calc(100vh - 250px);min-height:380px;touch-action:none}',
    '.mx svg.mxs{width:100%;height:100%;display:block;user-select:none;-webkit-user-select:none;cursor:grab}',
    '.mx svg.mxs .geo{fill:none;stroke:var(--muted);stroke-width:.7;opacity:.55;vector-effect:non-scaling-stroke}',
    '.mx svg.mxs .hs{stroke:rgba(0,0,0,.45);stroke-width:.5;vector-effect:non-scaling-stroke;transition:opacity .25s}',
    '.mx svg.mxs .hs.dim{opacity:.12}',
    '.mx svg.mxs .hs.rvm{stroke:#a77bff;stroke-width:2}',
    '.mx svg.mxs .hs.sel{stroke:#fff;stroke-width:3;filter:drop-shadow(0 0 4px #fff)}',
    '.mx svg.mxs .hs.pulse{animation:mxp 1s ease-in-out 4}',
    '@keyframes mxp{50%{opacity:.2}}',
    '.mx svg.mxs .bl{font:700 7px "IBM Plex Sans Arabic",sans-serif;fill:var(--ink);paint-order:stroke;stroke:var(--card-solid,#0b1430);stroke-width:2px;pointer-events:none;text-anchor:middle}',
    '.mx svg.mxs .hn{font:600 4px "IBM Plex Sans Arabic",sans-serif;fill:#0b1430;pointer-events:none;text-anchor:middle;dominant-baseline:central;display:none}',
    '.mx svg.mxs.zoomed .hn{display:block}',
    '.mx svg.mxs .sn{font:700 26px "IBM Plex Sans Arabic",sans-serif;fill:var(--brand);text-anchor:middle;pointer-events:none;opacity:.9}',
    '.mx .zbtn{position:absolute;inset-inline-start:10px;bottom:10px;display:flex;flex-direction:column;gap:6px}',
    '.mx .zbtn button{width:40px;height:40px;border-radius:12px;border:1px solid var(--line);background:var(--card-solid,var(--card));color:var(--ink);font-size:20px;cursor:pointer}',
    '.mx .side{display:flex;flex-direction:column;gap:10px}',
    '.mx .side .card{padding:14px}',
    '.mx .lg{display:flex;flex-direction:column;gap:4px}',
    '.mx .lg button{display:grid;grid-template-columns:16px 1fr auto;gap:8px;align-items:center;border:0;background:transparent;color:var(--ink);font:inherit;font-size:13.5px;padding:6px 8px;border-radius:10px;cursor:pointer;text-align:right}',
    '.mx .lg button:hover,.mx .lg button.on{background:var(--soft)}',
    '.mx .lg i{width:14px;height:14px;border-radius:4px;display:inline-block;border:1px solid rgba(0,0,0,.25)}',
    '.mx .lg b{font-family:"Readex Pro";font-variant-numeric:tabular-nums}',
    '.mx .kv2{display:grid;grid-template-columns:auto 1fr;gap:6px 12px;font-size:13.5px;margin:8px 0}',
    '.mx .kv2 span{color:var(--muted)}',
    '.mx .warnl{color:#ff9a5b;font-size:12.5px}',
    '.mx .none-sw{background:var(--mx-none)}',
    ':root{--mx-none:#d9dee8}:root[data-mode="night"]{--mx-none:#2b3756}',
    '@media (max-width:900px){.mx .main{grid-template-columns:1fr}.mx .mapbox{height:62vh}}',
    '.mxt{width:100%;border-collapse:collapse;font-size:13px}.mxt th,.mxt td{border:1px solid var(--line);padding:6px 8px;text-align:center}.mxt th{background:var(--soft2);color:var(--muted);font-weight:600}.mxt td:first-child,.mxt th:first-child{text-align:right}.mxt tr.tot td{font-weight:700;background:var(--soft)}.mxt .bad{color:#ff6b7d;font-weight:700}',
    '.mxlist{display:flex;flex-direction:column;gap:4px;max-height:46vh;overflow:auto}.mxlist button{display:flex;justify-content:space-between;gap:10px;border:1px solid var(--line);background:var(--soft2);color:var(--ink);border-radius:10px;padding:8px 10px;font:inherit;font-size:13px;cursor:pointer;text-align:right}.mxlist button small{color:var(--muted)}',
    '.mxsec{margin:14px 0 6px;font-size:15px}',
    '#mxprint{display:none}',
    '@media print{html,body.mxprinting{background:#fff!important}body.mxprinting #app::before{display:none}body.mxprinting>*:not(#mxprint){display:none!important}body.mxprinting #mxprint{display:block!important;color:#000;background:#fff}@page{size:A3 landscape;margin:10mm}#mxprint svg{width:100%;height:auto;max-height:240mm}#mxprint .pl{display:flex;flex-wrap:wrap;gap:10px 18px;font:12px sans-serif;margin-top:6px}#mxprint .pl i{display:inline-block;width:12px;height:12px;border:1px solid #333;margin-inline-end:4px;vertical-align:middle}#mxprint h2{font:700 18px sans-serif;margin:0 0 4px}#mxprint .geo{fill:none;stroke:#555;stroke-width:.4}#mxprint .hs{stroke:#333;stroke-width:.25}#mxprint .bl{font:700 7px sans-serif;fill:#000;text-anchor:middle}#mxprint .none-p{fill:#fff}}'
  ].join('\n');
  document.head.appendChild(st);
}
function build() {
  css();
  var root = document.getElementById('mxroot'); if (!root) return;
  if (!MD) {
    root.innerHTML = trialBar() + '<div class="card empty">' + (MDerr ? '⚠️ تعذّر تحميل الخريطة: ' + esc(MDerr) : '⏳ جاري تحميل خريطة القطاعات…') + '</div>';
    if (!MDerr) load(); return;
  }
  if (!root.querySelector('.mapbox') || ST.built !== true) {
    root.innerHTML = trialBar() + toolbar() + '<div class="main"><div class="mapbox" id="mxbox">' + svgHTML(false) + '<div class="zbtn"><button data-mx="zin" aria-label="تكبير">+</button><button data-mx="zout" aria-label="تصغير">−</button><button data-mx="zfit" aria-label="ملء الشاشة">⤢</button></div></div><div class="side" id="mxside"></div></div>';
    ST.built = true; wire(); applyVB();
  } else syncToolbar();
  paint();
}
function trialBar() { return '<div class="trial">🧪 قسم تجريبي — يقرا بيانات النظام بس، وتعديل توزيع المقاولين هنا ينحفظ بشكل منفصل وما يأثر على أي حساب لحين الاعتماد.</div>'; }
function toolbar() {
  var secs = [['all', 'الكل']].concat([1, 2, 3, 4, 5, 6].map(function (s) { return [String(s), sectorName(s).replace('القطاع ', '')]; }));
  return '<div class="bar" id="mxbar"><div class="seg" role="group" aria-label="القطاع">' + secs.map(function (s) { return '<button data-mx="sec" data-v="' + s[0] + '" class="' + (String(ST.sec) === s[0] ? 'on' : '') + '">' + esc(s[1]) + '</button>'; }).join('') + '</div>' +
    '<div class="seg" role="group" aria-label="التلوين"><button data-mx="mode" data-v="status" class="' + (ST.mode === 'status' ? 'on' : '') + '">حسب الحالة</button><button data-mx="mode" data-v="con" class="' + (ST.mode === 'con' ? 'on' : '') + '">حسب المقاول</button></div>' +
    '<input class="inp grow" id="mxq" type="search" placeholder="🔍 رقم الدار مثل B40.2" value="' + esc(ST.q) + '" enterkeyhint="search">' +
    '<button class="btn sm" data-mx="check">🔎 فحص التطابق</button><button class="btn sm" data-mx="count">📊 الحصر</button><button class="btn sm" data-mx="print">🖨️ طباعة</button>' +
    '<button class="btn sm" data-mx="edit" id="mxedit">' + (ST.edit ? '✅ إنهاء التعديل' : '✏️ تعديل التوزيع') + '</button></div>';
}
function syncToolbar() {
  var bar = document.getElementById('mxbar'); if (!bar) return;
  bar.querySelectorAll('[data-mx="sec"]').forEach(function (b) { b.classList.toggle('on', b.dataset.v === String(ST.sec)); });
  bar.querySelectorAll('[data-mx="mode"]').forEach(function (b) { b.classList.toggle('on', b.dataset.v === ST.mode); });
  var e = document.getElementById('mxedit'); if (e) e.textContent = ST.edit ? '✅ إنهاء التعديل' : '✏️ تعديل التوزيع';
}
function secList() { return ST.sec === 'all' ? [1, 2, 3, 4, 5, 6] : [+ST.sec]; }
function extOf(list) {
  var e = [1e9, 1e9, -1e9, -1e9];
  list.forEach(function (s) { var x = MD.sectors[s].ext; e = [Math.min(e[0], x[0]), Math.min(e[1], x[1]), Math.max(e[2], x[2]), Math.max(e[3], x[3])]; });
  return e;
}
function svgHTML(forPrint) {
  var list = secList(), e = extOf(list), g = '', hs = '', hn = '', bl = '', sn = '';
  list.forEach(function (s) {
    g += '<path class="geo" d="' + MD.sectors[s].geo.join(' ') + '"/>';
    var x = MD.sectors[s].ext; if (list.length > 1) sn += '<text class="sn" x="' + ((x[0] + x[2]) / 2).toFixed(1) + '" y="' + (-x[3] - 6).toFixed(1) + '">' + esc(sectorName(s)) + '</text>';
    (MD.byS[s] || []).forEach(function (h) {
      hs += '<rect class="hs" data-k="' + esc(mk(h.id)) + '" x="' + (h.x - h.w / 2 + 0.6).toFixed(1) + '" y="' + (-h.y - h.h / 2 + 0.6).toFixed(1) + '" width="' + Math.max(1, h.w - 1.2).toFixed(1) + '" height="' + Math.max(1, h.h - 1.2).toFixed(1) + '"/>';
      if (!forPrint) hn += '<text class="hn" x="' + h.x.toFixed(1) + '" y="' + (-h.y).toFixed(1) + '">' + esc(h.id.split('.')[1]) + '</text>';
    });
  });
  MD.blocks.forEach(function (b) { if (list.indexOf(b[1]) >= 0) bl += '<text class="bl" x="' + b[2] + '" y="' + (-b[3] + 2.5).toFixed(1) + '">' + esc(b[0].replace(/^(\D+)/, '$1.')) + '</text>'; });
  var vb = [e[0], -e[3] - (list.length > 1 ? 40 : 0), e[2] - e[0], e[3] - e[1] + (list.length > 1 ? 40 : 0)];
  if (!forPrint) ST.full = vb;
  return '<svg class="mxs" id="mxsvg" xmlns="http://www.w3.org/2000/svg" viewBox="' + vb.join(' ') + '" preserveAspectRatio="xMidYMid meet">' + g + '<g id="mxh">' + hs + '</g>' + hn + bl + sn + '</svg>';
}

/* ---------- التلوين واللوحة الجانبية ---------- */
var conColor = {};
function colorForCon(name) { if (name === CO_LBL) return '#6E7891'; if (name === 'غير محدد') return '#ffffff'; if (!conColor[name]) conColor[name] = PAL[Object.keys(conColor).length % PAL.length]; return conColor[name]; }
function paint() {
  var svg = document.getElementById('mxsvg'); if (!svg) return;
  var I = index(), cnt = {}, ccnt = {}, list = secList();
  ST.I = I;
  // ثبات ألوان المقاولين
  Object.keys(MD.H).forEach(function (k) { var h = MD.H[k]; if (list.indexOf(h.s) >= 0) colorForCon(effCon(h).group); });
  svg.querySelectorAll('rect.hs').forEach(function (r) {
    var h = MD.H[r.getAttribute('data-k')]; if (!h) return;
    var st = statusOf(h, I), ec = effCon(h);
    cnt[st] = (cnt[st] || 0) + 1; ccnt[ec.group] = (ccnt[ec.group] || 0) + 1;
    var fill = ST.mode === 'con' ? colorForCon(ec.group) : (COLORS[st] || 'var(--mx-none)');
    r.style.fill = fill;
    var dim = ST.con !== 'all' && (ST.mode === 'con' ? ec.group !== ST.con : (ST.con.indexOf('st:') === 0 ? 'st:' + st !== ST.con : ec.group !== ST.con));
    r.classList.toggle('dim', !!dim);
    var rv = I.rv[mk(h.id)]; r.classList.toggle('rvm', !!rv && st !== 'del' && st !== 'rev' && ST.mode === 'status');
    r.classList.toggle('sel', ST.sel === mk(h.id));
  });
  ST.cnt = cnt; ST.ccnt = ccnt;
  side();
}
function side() {
  var el = document.getElementById('mxside'); if (!el) return;
  var h = '';
  if (ST.sel && MD.H[ST.sel]) h += housePanel(MD.H[ST.sel]);
  var tot = 0; Object.keys(ST.cnt).forEach(function (k) { tot += ST.cnt[k]; });
  if (ST.mode === 'status') {
    h += '<div class="card"><h2 style="margin:0 0 8px;font-size:15px">' + esc(ST.sec === 'all' ? 'كل القطاعات' : sectorName(+ST.sec)) + ' <small>' + tot + ' دار</small></h2><div class="lg">' +
      ST_ORD.map(function (k) { var n = ST.cnt[k] || 0; return '<button data-mx="flt" data-v="st:' + k + '" class="' + (ST.con === 'st:' + k ? 'on' : '') + '"><i class="' + (k === 'none' ? 'none-sw' : '') + '" style="' + (COLORS[k] ? 'background:' + COLORS[k] : '') + '"></i><span>' + esc(ST_LBL[k]) + '</span><b>' + n + '</b></button>'; }).join('') +
      '</div><p class="muted" style="font-size:12px;margin:8px 0 0">الإطار البنفسجي = الدار بيها مراجعة. اضغط أي حالة حتى تبيّنها بس.</p>' + conFilter() + '</div>';
  } else {
    var names = Object.keys(ST.ccnt).sort(function (a, b) { return ST.ccnt[b] - ST.ccnt[a]; });
    h += '<div class="card"><h2 style="margin:0 0 8px;font-size:15px">توزيع المقاولين <small>' + tot + ' دار</small></h2><div class="lg">' +
      '<button data-mx="flt" data-v="all" class="' + (ST.con === 'all' ? 'on' : '') + '"><i style="background:transparent"></i><span>الكل</span><b>' + tot + '</b></button>' +
      names.map(function (n) { return '<button data-mx="flt" data-v="' + esc(n) + '" class="' + (ST.con === n ? 'on' : '') + '"><i style="background:' + colorForCon(n) + '"></i><span>' + esc(n) + '</span><b>' + ST.ccnt[n] + '</b></button>'; }).join('') + '</div></div>';
  }
  if (ST.edit) h += '<div class="card"><b>✏️ وضع تعديل التوزيع</b><p class="muted" style="font-size:12.5px;margin:6px 0 0">اضغط أي دار حتى تغيّر مقاول بلوكها أو تأشره تنفيذ مباشر. التعديل تجريبي ومنفصل.</p></div>';
  el.innerHTML = h;
}
function conFilter() {
  var names = Object.keys(ST.ccnt).sort();
  return '<label class="fld" style="margin-top:10px">بيّن مقاول معيّن<select class="inp" id="mxcon"><option value="all">كل المقاولين</option>' + names.map(function (n) { return '<option' + (ST.con === n ? ' selected' : '') + ' value="' + esc(n) + '">' + esc(n) + ' (' + ST.ccnt[n] + ')</option>'; }).join('') + '</select></label>';
}
function housePanel(h) {
  var I = ST.I || index(), k = mk(h.id), u = I.ws[k], r = I.rv[k], d = I.del[k], st = statusOf(h, I), ec = effCon(h);
  var sheetCon = u ? X.unitCon(u) : (r ? X.recCon(r) : '');
  var mism = sheetCon && !((ec.direct && X.isDirectExec(sheetCon)) || (!ec.direct && !X.isDirectExec(sheetCon) && sameCon(ec.con, sheetCon)));
  var known = !!(u || r || d || I.nw[k] || X.getSheetDate(h.id));
  var sysNo = u ? u.unit : (r ? r.houseNo : (d ? d.houseNo : h.id));
  var rounds = r ? X.rvRounds(r).length : 0;
  return '<div class="card"><div class="row" style="justify-content:space-between"><h2 style="margin:0;font-size:18px" class="ltr">' + esc(h.id) + '</h2><button class="iconbtn" data-mx="unsel" aria-label="إغلاق">' + X.ico('close') + '</button></div>' +
    '<span class="pill" style="background:' + (COLORS[st] || 'var(--mx-none)') + ';color:#06121f;margin-top:6px;display:inline-block">' + esc(ST_LBL[st]) + '</span>' +
    '<div class="kv2"><span>القطاع</span><b>' + esc(sectorName(h.s)) + '</b><span>البلوك</span><b class="ltr" style="text-align:right">' + esc(h.b) + '</b>' +
    '<span>حسب الخريطة</span><b>' + esc(ec.label) + (ec.direct && ec.orig ? ' <small class="muted">(كان: ' + esc(ec.orig) + ')</small>' : '') + (ec.edited ? ' <small style="color:var(--gold)">· معدّل تجريبياً</small>' : '') + '</b>' +
    (sheetCon ? '<span>حسب الشيت</span><b>' + esc(sheetCon) + '</b>' : '') +
    (u ? '<span>تاريخ الوارد</span><b>' + esc(u.incomingDate || '-') + '</b><span>موعد التسليم</span><b>' + esc(u.deliveryDate || '-') + '</b>' : '') +
    (d ? '<span>تاريخ الاستلام</span><b>' + esc(d.date || '-') + '</b>' : '') +
    (r ? '<span>المراجعات</span><b>' + rounds + '</b>' : '') + '</div>' +
    (mism ? '<div class="warnl">⚠️ المقاول بالشيت يختلف عن الخريطة</div>' : '') +
    (u && u.sector && u.sector !== sectorName(h.s) ? '<div class="warnl">⚠️ القطاع بالشيت (' + esc(u.sector) + ') يختلف عن الخريطة</div>' : '') +
    '<div class="row" style="margin-top:10px;gap:8px">' + (known ? '<button class="btn pri sm" data-mx="open" data-v="' + esc(sysNo) + '">📋 فتح تفاصيل الدار بالنظام</button>' : '<span class="muted" style="font-size:12.5px">الدار بعدها ما مسجّلة بأي شيت بالنظام.</span>') +
    (ST.edit ? '<button class="btn sm" data-mx="eblock" data-v="' + esc(k) + '">✏️ مقاول البلوك</button>' : '') + '</div></div>';
}

/* ---------- التكبير والسحب ---------- */
function curVB() { var k = String(ST.sec); return ST.vb[k] || ST.full.slice(); }
function applyVB() {
  var svg = document.getElementById('mxsvg'); if (!svg || !ST.full) return;
  var v = curVB(); svg.setAttribute('viewBox', v.map(function (n) { return n.toFixed(2); }).join(' '));
  var box = svg.getBoundingClientRect(), upp = Math.max(v[2] / (box.width || 1), v[3] / (box.height || 1));
  svg.classList.toggle('zoomed', upp < 0.22);
}
function setVB(v) { ST.vb[String(ST.sec)] = v; applyVB(); }
function zoomAt(f, cx, cy) {
  var v = curVB(), nw = Math.min(ST.full[2] * 1.2, Math.max(25, v[2] * f)), k = nw / v[2], nh = v[3] * k;
  if (cx == null) { cx = v[0] + v[2] / 2; cy = v[1] + v[3] / 2; }
  setVB([cx - (cx - v[0]) * k, cy - (cy - v[1]) * k, nw, nh]);
}
function toSVG(svg, px, py) { var pt = svg.createSVGPoint(); pt.x = px; pt.y = py; var m = svg.getScreenCTM(); if (!m) return { x: 0, y: 0 }; var p = pt.matrixTransform(m.inverse()); return { x: p.x, y: p.y }; }
function focusHouse(k) {
  var h = MD.H[k]; if (!h) return false;
  if (ST.sec !== 'all' && +ST.sec !== h.s) { ST.sec = String(h.s); X.lsSet('mx_sec', ST.sec); ST.built = false; build(); }
  var w = 240, svg = document.getElementById('mxsvg'), box = svg.getBoundingClientRect(), hh = w * (box.height / (box.width || 1));
  setVB([h.x - w / 2, -h.y - hh / 2, w, hh]);
  ST.sel = k; paint();
  var r = svg.querySelector('rect[data-k="' + k.replace(/"/g, '') + '"]'); if (r) { r.classList.remove('pulse'); void r.getBoundingClientRect(); r.classList.add('pulse'); }
  return true;
}
function wire() {
  var svg = document.getElementById('mxsvg'), box = document.getElementById('mxbox'); if (!svg) return;
  var P = {}, start = null, moved = 0, pinch = null;
  svg.addEventListener('pointerdown', function (e) { svg.setPointerCapture(e.pointerId); P[e.pointerId] = { x: e.clientX, y: e.clientY }; moved = 0; start = { x: e.clientX, y: e.clientY, vb: curVB(), t: e.target };
    var ids = Object.keys(P); if (ids.length === 2) { var a = P[ids[0]], b = P[ids[1]]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), vb: curVB(), c: toSVG(svg, (a.x + b.x) / 2, (a.y + b.y) / 2) }; } });
  svg.addEventListener('pointermove', function (e) {
    if (!P[e.pointerId]) return; P[e.pointerId] = { x: e.clientX, y: e.clientY };
    var ids = Object.keys(P);
    if (ids.length >= 2 && pinch) { var a = P[ids[0]], b = P[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y); if (d < 5) return; var f = pinch.d / d, v = pinch.vb, nw = Math.min(ST.full[2] * 1.2, Math.max(25, v[2] * f)), k = nw / v[2];
      setVB([pinch.c.x - (pinch.c.x - v[0]) * k, pinch.c.y - (pinch.c.y - v[1]) * k, nw, v[3] * k]); moved = 99; return; }
    if (!start) return;
    var dx = e.clientX - start.x, dy = e.clientY - start.y; moved = Math.max(moved, Math.abs(dx) + Math.abs(dy));
    if (moved < 4) return;
    var rect = svg.getBoundingClientRect(), v = start.vb, upp = Math.max(v[2] / rect.width, v[3] / rect.height);
    setVB([v[0] - dx * upp, v[1] - dy * upp, v[2], v[3]]);
  });
  function up(e) {
    var t = start && start.t; delete P[e.pointerId]; if (Object.keys(P).length < 2) pinch = null;
    if (Object.keys(P).length === 0) { if (moved < 6 && t && t.getAttribute && t.getAttribute('data-k')) tapHouse(t.getAttribute('data-k')); start = null; }
  }
  svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', function (e) { delete P[e.pointerId]; pinch = null; start = null; });
  svg.addEventListener('wheel', function (e) { e.preventDefault(); var p = toSVG(svg, e.clientX, e.clientY); zoomAt(e.deltaY > 0 ? 1.18 : 1 / 1.18, p.x, p.y); }, { passive: false });
}
function tapHouse(k) {
  if (ST.edit) { ST.sel = k; paint(); editBlock(k); return; }
  ST.sel = ST.sel === k ? null : k; paint();
}

/* ---------- الأحداث ---------- */
document.addEventListener('click', function (e) {
  var b = e.target.closest && e.target.closest('[data-mx]'); if (!b || !MD) return;
  var a = b.dataset.mx, v = b.dataset.v;
  if (a === 'sec') { ST.sec = v; X.lsSet('mx_sec', v); ST.built = false; ST.sel = null; build(); }
  else if (a === 'mode') { ST.mode = v; ST.con = 'all'; X.lsSet('mx_mode', v); syncToolbar(); paint(); }
  else if (a === 'flt') { ST.con = ST.con === v ? 'all' : v; paint(); }
  else if (a === 'zin') zoomAt(1 / 1.4); else if (a === 'zout') zoomAt(1.4); else if (a === 'zfit') { delete ST.vb[String(ST.sec)]; applyVB(); }
  else if (a === 'unsel') { ST.sel = null; paint(); }
  else if (a === 'open') X.openHouse(v);
  else if (a === 'edit') { ST.edit = !ST.edit; syncToolbar(); paint(); }
  else if (a === 'eblock') editBlock(v);
  else if (a === 'check') checkModal();
  else if (a === 'count') countModal();
  else if (a === 'print') printMap();
  else if (a === 'go') { X.closeModal(); setTimeout(function () { focusHouse(v); }, 60); }
  else if (a === 'xcheck') exportCheck();
  else if (a === 'xcount') exportCount();
  else if (a === 'saveb') saveBlock(false);
  else if (a === 'resetb') saveBlock(true);
});
document.addEventListener('change', function (e) {
  if (e.target.id === 'mxcon') { ST.con = e.target.value; paint(); }
});
document.addEventListener('keydown', function (e) {
  if (e.target.id === 'mxq' && e.key === 'Enter') { search(e.target.value); }
});
document.addEventListener('input', function (e) {
  if (e.target.id === 'mxq') { ST.q = e.target.value; clearTimeout(ST.qt); ST.qt = setTimeout(function () { if (/\d+\.\d+$/.test(ST.q.trim())) search(ST.q, true); }, 500); }
});
function search(q, quiet) {
  var k = mk(q); if (!k) return;
  if (!MD.H[k]) { var alt = Object.keys(MD.H).filter(function (x) { return x.indexOf(k) === 0; }); if (alt.length === 1) k = alt[0]; }
  if (!focusHouse(k) && !quiet) X.toast('⚠️ الدار ' + q + ' ما موجودة بالخريطة', false);
}

/* ---------- تعديل التوزيع (تجريبي ومنفصل) ---------- */
function editBlock(k) {
  var h = MD.H[k]; if (!h) return;
  var ec = effCon(h), names = {};
  function addN(n) { if (!n) return; var k = X.arN(n); if (!Object.keys(names).some(function (m) { return X.arN(m) === k; })) names[n] = 1; }
  MD.legend.forEach(function (l) { addN(l.name); }); Object.keys(MD.H).forEach(function (x) { addN(MD.H[x].con0); }); (X.contractorsList() || []).forEach(addN);
  var n = (MD.byS[h.s] || []).filter(function (x) { return x.b === h.b; }).length;
  var cons = {}; (MD.byS[h.s] || []).forEach(function (x) { if (x.b === h.b) { var e2 = effCon(x); cons[e2.label] = (cons[e2.label] || 0) + 1; } });
  ST.eb = { s: h.s, b: h.b };
  X.openModal('<header><h3>✏️ مقاول البلوك ' + esc(h.b) + ' · ' + esc(sectorName(h.s)) + '</h3><button class="iconbtn" data-act="closeModal" aria-label="إغلاق">' + X.ico('close') + '</button></header><div class="bd">' +
    '<p class="muted" style="margin:0 0 10px;font-size:13px">البلوك بيه ' + n + ' دار. حالياً: ' + Object.keys(cons).map(function (c) { return esc(c) + ' (' + cons[c] + ')'; }).join('، ') + '. التعديل يطبق على كل دور البلوك وينحفظ كتجربة منفصلة.</p>' +
    '<label class="fld">المقاول<select class="inp" id="mxbcon"><option value="">غير محدد</option>' + Object.keys(names).sort().map(function (c) { return '<option' + (c === ec.con ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select></label>' +
    '<label class="row" style="gap:8px;margin-top:10px"><input type="checkbox" id="mxbdir"' + (ec.direct ? ' checked' : '') + '> تنفيذ مباشر (الشركة تنفذه)</label></div>' +
    '<footer><button class="btn pri" data-mx="saveb">💾 حفظ (تجريبي)</button>' + (trialBlocks()[bKey(h.s, h.b)] ? '<button class="btn" data-mx="resetb">↩️ إرجاع لأصل الخريطة</button>' : '') + '<button class="btn" data-act="closeModal">إلغاء</button></footer>');
}
function saveBlock(reset) {
  var e = ST.eb; if (!e) return;
  var path = X.ROOT + '/mapTrial/blocks/' + bKey(e.s, e.b);
  if (reset) X.W('remove', path, null);
  else X.W('set', path, { con: (document.getElementById('mxbcon') || {}).value || '', direct: !!(document.getElementById('mxbdir') || {}).checked, by: (S.user && S.user.name) || '', at: Date.now() });
  X.closeModal(); X.toast(reset ? '↩️ رجع البلوك لأصل الخريطة' : '✅ انحفظ التوزيع (تجريبي)'); paint();
}

/* ---------- فحص التطابق ---------- */
function checks() {
  var I = index(), notOnMap = [], conDiff = [], secDiff = [], vip = 0, seen = {};
  function chk(no, src, sec) {
    var k = mk(no); if (!k || seen[k + src]) return; seen[k + src] = 1;
    if (MD.H[k]) return;
    if (/VIP/i.test(sec || '') || /^VIP/i.test(k)) { vip++; return; }
    notOnMap.push({ h: no, src: src, sec: sec || '' });
  }
  S.wsAll.forEach(function (u) { chk(u.unit, 'الموقف الأسبوعي', u.sector); });
  S.del.forEach(function (x) { chk(x.houseNo, 'شيت تواريخ الاستلام', x.sector); });
  X.oldRecs().forEach(function (r) { chk(r.houseNo, 'المراجعات', r.sectorNo); });
  X.wsUnits().forEach(function (u) {
    var h = MD.H[mk(u.unit)]; if (!h) return;
    var ec = effCon(h), sc = X.unitCon(u);
    var ok = (ec.direct && X.isDirectExec(sc)) || (!ec.direct && !X.isDirectExec(sc) && sameCon(ec.con, sc));
    if (!ok) conDiff.push({ h: u.unit, k: mk(u.unit), map: ec.label, sheet: sc || '-' });
    if (u.sector && u.sector !== sectorName(h.s)) secDiff.push({ h: u.unit, k: mk(u.unit), map: sectorName(h.s), sheet: u.sector });
  });
  // ملاحظات الرسم نفسه
  var draw = [];
  [1, 2, 3, 4, 5, 6].forEach(function (s) {
    var c = {}; (MD.byS[s] || []).forEach(function (h) { var n = h.con0 || ''; c[n] = (c[n] || 0) + 1; });
    MD.legend.filter(function (l) { return l.sector === s; }).forEach(function (l) { var got = c[l.name] || 0; if (got !== l.count) draw.push(sectorName(s) + ': ' + l.name + ' — مفتاح الألوان ' + l.count + ' دار، والمعدود بالخريطة ' + got); });
    if (s > 2 && c['']) draw.push(sectorName(s) + ': ' + c[''] + ' دار بدون لون مقاول بالرسم (بلوكات: ' + uniq((MD.byS[s] || []).filter(function (h) { return !h.con0; }).map(function (h) { return h.b; })).join('، ') + ')');
  });
  MD.blocks.forEach(function (b) { if (b[0].indexOf('؟') === 0) draw.push(sectorName(b[1]) + ': بلوك مكتوب بالرسم بصيغة غير طبيعية (' + b[0].replace('؟', '') + ') ورقمه يتكرر ويه بلوك ثاني — يحتاج تأكيد'); });
  return { notOnMap: notOnMap, conDiff: conDiff, secDiff: secDiff, vip: vip, draw: draw };
}
function uniq(a) { var o = {}; a.forEach(function (x) { o[x] = 1; }); return Object.keys(o); }
function checkModal() {
  var C = checks();
  function sec(t, n, body) { return '<h3 class="mxsec">' + t + ' <span class="pill ' + (n ? 'p-not' : 'p-ok') + '">' + n + '</span></h3>' + (n ? body : '<p class="muted" style="margin:0">✅ ماكو</p>'); }
  var h = '<p class="muted" style="margin:0 0 6px;font-size:13px">مقارنة بيانات الشيتات بالنظام ويه خريطة القطاعات. اضغط أي دار حتى تروح عليها بالخريطة.</p>' +
    sec('أرقام دور بالشيتات ما موجودة بالخريطة (غلط كتابة أو بلوك ناقص بالرسم)', C.notOnMap.length, '<div class="mxlist">' + C.notOnMap.map(function (x) { return '<button disabled><b class="ltr">' + esc(x.h) + '</b><small>' + esc(x.src) + (x.sec ? ' · ' + esc(x.sec) : '') + '</small></button>'; }).join('') + '</div>') +
    sec('دور قيد التسليم مقاولها بالشيت غير مقاولها بالخريطة', C.conDiff.length, '<div class="mxlist">' + C.conDiff.map(function (x) { return '<button data-mx="go" data-v="' + esc(x.k) + '"><b class="ltr">' + esc(x.h) + '</b><small>الخريطة: ' + esc(x.map) + ' · الشيت: ' + esc(x.sheet) + '</small></button>'; }).join('') + '</div>') +
    sec('دور قطاعها بالشيت غير قطاعها بالخريطة', C.secDiff.length, '<div class="mxlist">' + C.secDiff.map(function (x) { return '<button data-mx="go" data-v="' + esc(x.k) + '"><b class="ltr">' + esc(x.h) + '</b><small>الخريطة: ' + esc(x.map) + ' · الشيت: ' + esc(x.sheet) + '</small></button>'; }).join('') + '</div>') +
    sec('ملاحظات على الرسم نفسه (تحتاج مراجعتك)', C.draw.length, '<ul style="margin:0;padding-inline-start:18px;font-size:13px;line-height:1.8">' + C.draw.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>') +
    (C.vip ? '<p class="muted" style="font-size:12.5px">' + C.vip + ' دار من دور VIP ما داخلة بالفحص لأن ماكو خريطة إلها بالملف.</p>' : '');
  X.openModal('<header><h3>🔎 فحص التطابق بين الشيتات والخريطة · تجريبي</h3><button class="iconbtn" data-act="closeModal" aria-label="إغلاق">' + X.ico('close') + '</button></header><div class="bd">' + h + '</div><footer><button class="btn wa" data-mx="xcheck">' + X.ico('xls', 16) + ' تصدير Excel</button><button class="btn" data-act="closeModal">إغلاق</button></footer>', true);
}
function exportCheck() {
  var C = checks(), rows = [];
  C.notOnMap.forEach(function (x) { rows.push(['رقم غير موجود بالخريطة', x.h, x.src, x.sec || '—', '—']); });
  C.conDiff.forEach(function (x) { rows.push(['اختلاف المقاول', x.h, 'الموقف الأسبوعي', 'الخريطة: ' + x.map, 'الشيت: ' + x.sheet]); });
  C.secDiff.forEach(function (x) { rows.push(['اختلاف القطاع', x.h, 'الموقف الأسبوعي', 'الخريطة: ' + x.map, 'الشيت: ' + x.sheet]); });
  C.draw.forEach(function (x) { rows.push(['ملاحظة على الرسم', '—', 'ملف الخريطة', x, '—']); });
  if (!rows.length) { X.toast('✅ ماكو اختلافات للتصدير'); return; }
  X.xlsxPro([{ name: 'فحص التطابق', title: 'فحص التطابق بين الشيتات والخريطة — ' + X.todayStr(), head: ['النوع', 'رقم الدار', 'المصدر', 'التفاصيل', 'التفاصيل 2'], cols: [22, 14, 22, 40, 30], textCols: [0, 2, 3, 4], rows: rows }], 'Amirat2_MapCheck_' + X.todayStr() + '.xlsx');
}

/* ---------- الحصر الحقيقي ---------- */
function counts(list) {
  var I = index(), T = {};
  list.forEach(function (s) {
    (MD.byS[s] || []).forEach(function (h) {
      var g = effCon(h).group, st = statusOf(h, I), key = s + '|' + g;
      var o = T[key] = T[key] || { s: s, g: g, all: 0, del: 0, ready: 0, not: 0, late: 0, rev: 0, nw: 0, none: 0 };
      o.all++; o[st]++;
    });
  });
  return Object.keys(T).map(function (k) { return T[k]; });
}
function cwTotal(s, g) { // العدد الكلي بملف موقف المقاولين لنفس القطاع والمقاول
  if (g === CO_LBL || g === 'غير محدد') return null;
  var t = 0, f = false; (S.cw || []).forEach(function (r) { if ((r.sector || '') === sectorName(s) && sameCon(r.contractor || '', g)) { t += Number(r.total) || 0; f = true; } });
  return f ? t : null;
}
function countModal() {
  var list = secList(), rows = counts(list);
  var h = '<p class="muted" style="margin:0 0 8px;font-size:13px">العدد الكلي من الخريطة، والحالة من بيانات النظام. «ما وصلت» = دور موجودة بالخريطة بس بعدها ما ظاهرة بأي شيت. عمود «ملف المقاولين» للمقارنة ويه العدد الكلي المكتوب بملف موقف المقاولين.</p>';
  list.forEach(function (s) {
    var R = rows.filter(function (r) { return r.s === s; }).sort(function (a, b) { return b.all - a.all; }); if (!R.length) return;
    var t = { all: 0, del: 0, ready: 0, not: 0, late: 0, rev: 0, nw: 0, none: 0 };
    h += '<h3 class="mxsec">' + esc(sectorName(s)) + '</h3><div class="scroll"><table class="mxt"><thead><tr><th>المقاول / الجهة</th><th>الكلي بالخريطة</th><th>مسلّمة</th><th>قيد التسليم جاهزة</th><th>غير جاهزة</th><th>عابر وغير جاهزة</th><th>مراجعة</th><th>ما وصلت</th><th>الإنجاز</th><th>ملف المقاولين</th></tr></thead><tbody>' +
      R.map(function (r) { Object.keys(t).forEach(function (k) { t[k] += r[k] || 0; }); var cw = cwTotal(s, r.g), diff = cw != null && cw !== r.all;
        return '<tr><td>' + esc(r.g) + '</td><td><b>' + r.all + '</b></td><td>' + r.del + '</td><td>' + r.ready + '</td><td>' + r.not + '</td><td>' + r.late + '</td><td>' + r.rev + '</td><td>' + (r.none + r.nw) + '</td><td>' + Math.round(r.del * 100 / r.all) + '٪</td><td' + (diff ? ' class="bad" title="يختلف عن الخريطة"' : '') + '>' + (cw == null ? '—' : cw) + '</td></tr>'; }).join('') +
      '<tr class="tot"><td>المجموع</td><td>' + t.all + '</td><td>' + t.del + '</td><td>' + t.ready + '</td><td>' + t.not + '</td><td>' + t.late + '</td><td>' + t.rev + '</td><td>' + (t.none + t.nw) + '</td><td>' + Math.round(t.del * 100 / (t.all || 1)) + '٪</td><td>—</td></tr></tbody></table></div>';
  });
  X.openModal('<header><h3>📊 الحصر الحقيقي · ' + esc(ST.sec === 'all' ? 'كل القطاعات' : sectorName(+ST.sec)) + ' · تجريبي</h3><button class="iconbtn" data-act="closeModal" aria-label="إغلاق">' + X.ico('close') + '</button></header><div class="bd">' + h + '</div><footer><button class="btn wa" data-mx="xcount">' + X.ico('xls', 16) + ' تصدير Excel</button><button class="btn" data-act="closeModal">إغلاق</button></footer>', true);
}
function exportCount() {
  var list = secList(), rows = counts(list).sort(function (a, b) { return a.s - b.s || b.all - a.all; }), T = { all: 0, del: 0, ready: 0, not: 0, late: 0, rev: 0, none: 0 };
  var body = rows.map(function (r) { Object.keys(T).forEach(function (k) { T[k] += k === 'none' ? (r.none + r.nw) : r[k]; }); var cw = cwTotal(r.s, r.g);
    return [sectorName(r.s), r.g, r.all, r.del, r.ready, r.not, r.late, r.rev, r.none + r.nw, Math.round(r.del * 100 / r.all) + '٪', cw == null ? '—' : cw]; });
  X.xlsxPro([{ name: 'الحصر', title: 'الحصر الحقيقي حسب الخريطة — ' + X.todayStr(), head: ['القطاع', 'المقاول / الجهة', 'الكلي بالخريطة', 'مسلّمة', 'جاهزة', 'غير جاهزة', 'عابر وغير جاهزة', 'مراجعة', 'ما وصلت', 'الإنجاز', 'ملف المقاولين'], cols: [14, 22, 10, 9, 9, 9, 11, 9, 9, 9, 11], textCols: [0, 1], rows: body, totMerge: [[0, 1]],
    total: ['المجموع', '', T.all, T.del, T.ready, T.not, T.late, T.rev, T.none, Math.round(T.del * 100 / (T.all || 1)) + '٪', '—'] }], 'Amirat2_MapCount_' + X.todayStr() + '.xlsx');
}

/* ---------- الطباعة ---------- */
function printMap() {
  var I = index(), list = secList(), pr = document.getElementById('mxprint');
  if (!pr) { pr = document.createElement('div'); pr.id = 'mxprint'; document.body.appendChild(pr); }
  var svg = svgHTML(true).replace('id="mxsvg"', '').replace('class="mxs"', '');
  var tmp = document.createElement('div'); tmp.innerHTML = svg;
  var cnt = {}, ccnt = {};
  tmp.querySelectorAll('rect.hs').forEach(function (r) { var h = MD.H[r.getAttribute('data-k')]; if (!h) return; var st = statusOf(h, I), g = effCon(h).group; cnt[st] = (cnt[st] || 0) + 1; ccnt[g] = (ccnt[g] || 0) + 1;
    var f = ST.mode === 'con' ? colorForCon(g) : (COLORS[st] || '#ffffff'); r.setAttribute('fill', f); if (ST.mode === 'status' && st === 'none') r.setAttribute('class', 'hs none-p'); });
  var lg = ST.mode === 'status' ? ST_ORD.map(function (k) { return '<span><i style="background:' + (COLORS[k] || '#fff') + '"></i>' + esc(ST_LBL[k]) + ': <b>' + (cnt[k] || 0) + '</b></span>'; }).join('')
    : Object.keys(ccnt).sort(function (a, b) { return ccnt[b] - ccnt[a]; }).map(function (g) { return '<span><i style="background:' + colorForCon(g) + '"></i>' + esc(g) + ': <b>' + ccnt[g] + '</b></span>'; }).join('');
  pr.innerHTML = '<h2>مجمع الأميرات السكني 2 — ' + esc(ST.sec === 'all' ? 'كل القطاعات' : sectorName(+ST.sec)) + ' — ' + (ST.mode === 'status' ? 'حالة الدور' : 'توزيع المقاولين') + ' — ' + X.todayStr() + '</h2>' + tmp.innerHTML + '<div class="pl">' + lg + '</div>';
  document.body.classList.add('mxprinting');
  setTimeout(function () { window.print(); setTimeout(function () { document.body.classList.remove('mxprinting'); }, 500); }, 80);
}

// لو النظام رسم قبل تحميل هذا الملف
try { X.scheduleRender(); } catch (e) {}
window.__MX = { ST: ST, md: function () { return MD; }, checks: function () { return checks(); }, counts: function (l) { return counts(l || [1, 2, 3, 4, 5, 6]); }, focus: focusHouse };
})();
