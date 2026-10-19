/* الخريطة الحيّة — قسم تجريبي منفصل عن عمل مكتب التسليم
   تقرا نفس بيانات النظام (قيد التسليم، المسلّمة، المراجعات) وتلوّن كل دار على خريطة القطاعات.
   تعديلات توزيع المقاولين على الخريطة تنحفظ بمسار منفصل (amirat2/mapTrial) وما تأثر على أي حساب بالنظام لحين الاعتماد.
   Design by: Montather Ali */
(function () {
'use strict';
var X = window.A2X; if (!X || !X.VIEWS) return;
var V = '2.1.0';
var S = X.S, esc = X.esc;
var MD = null, MDerr = '', loading = false;
var ST = { sec: X.lsGet('mx_sec', 'all'), mode: X.lsGet('mx_mode', 'status'), con: 'all', flt: 'all', year: String(new Date().getFullYear()), q: '', sel: null, edit: false, vb: {}, zoomed: false };
var COLORS = { del: '#2ecc71', ready: '#3fa9f5', not: '#f5a623', late: '#ff4d5e', rev: '#a77bff', nw: '#22d3c5', none: null };
var ST_LBL = { del: 'مسلّمة', ready: 'قيد التسليم · جاهزة', not: 'قيد التسليم · غير جاهزة', late: 'عابر موعدها وغير جاهزة', rev: 'قيد المراجعة', nw: 'جديدة بانتظار التبليغ', none: 'بعدها ما وصلت' };
var ST_ORD = ['del', 'ready', 'not', 'late', 'rev', 'nw', 'none'];
var PAL = ['#4FD8E8', '#8E7CFF', '#E2C47A', '#38E2A0', '#FF7AA8', '#68B6FF', '#F2B23E', '#FF8A5B', '#9BE15D', '#D77BFF', '#5BC0BE', '#F6E05E', '#E36B6B', '#7FD1AE'];
var DIRECT = 'تنفيذ مباشر';
var CO_LBL = 'الشركة — تنفيذ مباشر';

/* ---------- تسجيل القسم ---------- */
// MAPAPP = نظام الخريطة المستقل (map.html): نفس البيانات، والخريطة هي الواجهة الوحيدة
var MAPAPP = window.A2_MODE === 'map';
X.ICONS.map = 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14';
X.HUB_LBL.map = 'الخريطة';
if (MAPAPP) {
  X.TITLES.map = 'خريطة مجمع الأميرات 2 · تجريبي';
  X.NAV.splice(0, X.NAV.length, ['map', 'الخريطة'], ['settings', 'الإعدادات']);
  var og = X.ACT.go; X.ACT.go = function (d, el, ev) { if (d && d.v === 'hub') d = { v: 'map' }; return og(d, el, ev); };
} else {
  if (X.HUB.indexOf('map') < 0) X.HUB.push('map');
  X.TITLES.map = 'الخريطة الحيّة · تجريبي';
  if (!X.NAV.some(function (n) { return n[0] === 'map'; })) X.NAV.splice(X.NAV.length - 1, 0, ['map', 'الخريطة · تجريبي']);
  X.hubStats = function () { return { map: { c: 'تجريبي', p: null } }; };
}
X.VIEWS.map = function () { return '<div id="mxroot" class="mx"></div>'; };
X.afterRender = function (view) { if (view === 'map') build(); };

/* ---------- أدوات ---------- */
function mk(h) { return String(h == null ? '' : h).toUpperCase().replace(/\s+/g, '').replace(/[-_]/g, '.'); }
function arTok(n) { return X.arN(n).split(' ').filter(Boolean); }
function sameCon(a, b) { // "اوات" = "اوات جمال" ، "علي الكوفي" = "علي محمد الكوفي"
  var A = arTok(a), B = arTok(b); if (!A.length || !B.length) return false;
  if (A.join('') === B.join('')) return true; // "عبدالله" = "عبد الله"
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
    '.mx .mapbox{position:relative;border:1px solid var(--line);border-radius:16px;overflow:hidden;background:var(--card-solid,var(--card));height:calc(100vh - 330px);min-height:420px;touch-action:none}',
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
    '.mx .kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px}',
    '.mx .kpi{display:flex;flex-direction:column;align-items:flex-start;gap:2px;padding:10px 12px;border-radius:14px;border:1px solid var(--line);background:var(--card);color:var(--muted);font:inherit;font-size:12px;cursor:pointer;text-align:right}',
    '.mx .kpi b{font-family:"Readex Pro";font-size:22px;color:var(--ink);font-variant-numeric:tabular-nums}',
    '.mx .kpi.g b{color:#2ecc71}.mx .kpi.b b{color:#3fa9f5}.mx .kpi.r b{color:#ff4d5e}.mx .kpi.p b{color:#a77bff}',
    '.mx .mxlist button{align-items:center}',
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
function trialBar() { return '<div class="trial">🧪 ' + (MAPAPP ? 'نظام الخريطة التجريبي — نفس بيانات مكتب التسليم. أي إجراء على دار (جاهز، مراجعة…) ينحفظ بالنظام نفسه؛ وتعديل توزيع المقاولين ينحفظ بشكل منفصل لحين الاعتماد.' : 'قسم تجريبي — يقرا بيانات النظام بس، وتعديل توزيع المقاولين هنا ينحفظ بشكل منفصل وما يأثر على أي حساب لحين الاعتماد.') + '</div>'; }
var MODES = [['status', 'الحالة'], ['con', 'المقاولين'], ['eff', 'الكفاءة'], ['alert', 'التنبيهات'], ['rev', 'المراجعات'], ['period', 'التسليم بالأشهر'], ['wait', 'مدة الانتظار'], ['today', 'حركات اليوم']];
function toolbar() {
  var secs = [['all', 'الكل']].concat([1, 2, 3, 4, 5, 6].map(function (s) { return [String(s), sectorName(s).replace('القطاع ', '')]; }));
  return '<div class="kpis" id="mxkpi"></div>' +
    '<div class="bar" id="mxbar"><div class="seg" role="group" aria-label="القطاع">' + secs.map(function (s) { return '<button data-mx="sec" data-v="' + s[0] + '" class="' + (String(ST.sec) === s[0] ? 'on' : '') + '">' + esc(s[1]) + '</button>'; }).join('') + '</div>' +
    '<input class="inp grow" id="mxq" type="search" placeholder="🔍 رقم الدار مثل B40.2" value="' + esc(ST.q) + '" enterkeyhint="search">' +
    '<button class="btn sm" data-mx="check">🔎 فحص التطابق</button><button class="btn sm" data-mx="count">📊 الحصر</button><button class="btn sm" data-mx="print">🖨️ طباعة</button>' +
    '<button class="btn sm" data-mx="edit" id="mxedit">' + (ST.edit ? '✅ إنهاء التعديل' : '✏️ تعديل التوزيع') + '</button>' +
    (MAPAPP ? '' : '<a class="btn sm" href="map.html" title="نفس البيانات، والخريطة هي الواجهة">🗺️ فتح كنظام مستقل</a>') + '</div>' +
    '<div class="bar"><span class="muted" style="font-size:12.5px">الطبقة:</span><div class="seg" role="group" aria-label="الطبقة" id="mxmodes">' + MODES.map(function (m) { return '<button data-mx="mode" data-v="' + m[0] + '" class="' + (ST.mode === m[0] ? 'on' : '') + '">' + m[1] + '</button>'; }).join('') + '</div></div>';
}
function syncToolbar() {
  var root = document.getElementById('mxroot'); if (!root) return;
  root.querySelectorAll('[data-mx="sec"]').forEach(function (b) { b.classList.toggle('on', b.dataset.v === String(ST.sec)); });
  root.querySelectorAll('[data-mx="mode"]').forEach(function (b) { b.classList.toggle('on', b.dataset.v === ST.mode); });
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

/* ---------- الطبقات: كل قسم من النظام على الخريطة ---------- */
var conColor = {};
function colorForCon(name) { if (name === CO_LBL) return '#6E7891'; if (name === 'غير محدد') return '#ffffff'; if (!conColor[name]) conColor[name] = PAL[Object.keys(conColor).length % PAL.length]; return conColor[name]; }
var EFF = [['ex', 'ممتاز (90٪ فما فوق)', '#38E2A0'], ['vg', 'جيد جداً (80–90)', '#5BE3A8'], ['gd', 'جيد (70–80)', '#4FD8E8'], ['md', 'متوسط (60–70)', '#F2C14E'], ['ok', 'مقبول (50–60)', '#FF9F5A'], ['bad', 'دون المستوى (أقل من 50)', '#FF5A72'], ['na', 'ماكو دور قيد التسليم', null]];
function effKey(p) { return p == null ? 'na' : p >= 90 ? 'ex' : p >= 80 ? 'vg' : p >= 70 ? 'gd' : p >= 60 ? 'md' : p >= 50 ? 'ok' : 'bad'; }
var MON = ['', 'كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'];
function monCol(m) { var t = (m - 1) / 11; return 'hsl(' + Math.round(200 - t * 170) + ',75%,' + Math.round(62 - t * 12) + '%)'; }
var LD = {
  status: { t: 'حالة الدور', k: ST_ORD.map(function (k) { return [k, ST_LBL[k], COLORS[k]]; }) },
  alert: { t: 'التنبيهات', list: true, k: [['ov10', 'قيد التسليم — متجاوزة 10 أيام فأكثر', '#ff3b55'], ['late', 'عابر موعدها وغير جاهزة (أقل من 10 أيام)', '#ff8a3d'], ['cd', 'موعد التسليم خلال 0–3 أيام', '#f5d142'], ['rvov', 'مراجعة — تجاوزت موعد إكمال الملاحظات', '#c04cff'], ['rvcd', 'مراجعة — موعد الإكمال خلال يومين', '#ff7ad9'], ['none', 'ماكو تنبيه', null]] },
  rev: { t: 'المراجعات', list: true, k: [['rlate', 'تجاوزت مدة الملاحظات', '#ff4d5e'], ['r3', '3 مراجعات فأكثر', '#7b3fe4'], ['r2', 'مراجعتين', '#a77bff'], ['r1', 'مراجعة وحدة', '#d4c2ff'], ['rdone', 'أُكملت الملاحظات', '#2ecc71'], ['none', 'ماكو مراجعة', null]] },
  wait: { t: 'مدة الانتظار من تاريخ الوارد (قيد التسليم)', list: true, k: [['w0', '0–10 أيام', '#9be7ff'], ['w1', '11–20 يوم', '#4fb3ff'], ['w2', '21–30 يوم', '#f5d142'], ['w3', '31–60 يوم', '#ff8a3d'], ['w4', 'أكثر من 60 يوم', '#ff3b55'], ['wn', 'تاريخ الوارد غير معروف', '#b8c4e0'], ['none', 'مو قيد التسليم', null]] },
  today: { t: 'حركات جدول الأعمال', list: true, k: [['d0', 'اليوم', '#38E2A0'], ['d1', 'أمس', '#4FD8E8'], ['d7', 'آخر 7 أيام', '#8E7CFF'], ['none', 'ماكو حركة', null]] }
};
function pre(I, list) { // حسابات مسبقة للطبقات اللي تحتاج نظرة شاملة
  var P = { eff: {}, alert: {}, agenda: {}, ydates: {} };
  var g = {};
  list.forEach(function (s) { (MD.byS[s] || []).forEach(function (h) { var k = mk(h.id), u = I.ws[k]; if (!u) return; var grp = effCon(h).group, o = g[grp] = g[grp] || { all: 0, late: 0 }; o.all++;
    var dd = X.daysDiff(u.deliveryDate); if (!X.isReady(u.unit) && dd !== null && dd <= 0) o.late++; }); });
  Object.keys(g).forEach(function (grp) { var o = g[grp]; o.ratio = Math.round(o.late * 100 / o.all); o.eff = 100 - o.ratio; P.eff[grp] = o; });
  var t = X.todayStr(), y = new Date(); y.setDate(y.getDate() - 1); var ys = y.toISOString().slice(0, 10), w = new Date(); w.setDate(w.getDate() - 7); var ws = w.toISOString().slice(0, 10);
  if (ST.mode === 'today') { if (!Array.isArray(S.agenda)) { if (!S.agenda && X.loadAgenda) X.loadAgenda(); } else S.agenda.forEach(function (it) { var k = mk(it.houseNo), d = it.date || ''; if (!k || !d) return; var key = d === t ? 'd0' : d === ys ? 'd1' : d >= ws ? 'd7' : null; if (!key) return; var cur = P.agenda[k]; if (!cur || key < cur.key || (key === cur.key && false)) P.agenda[k] = { key: key, last: it }; if (!P.agenda[k].acts) P.agenda[k].acts = []; P.agenda[k].acts.push(it); }); }
  return P;
}
function delDate(h, I) { var k = mk(h.id), d = I.del[k]; var v = (d && d.date) || X.getSheetDate(h.id) || ''; var m = String(v).match(/^(\d{4})-(\d{2})/); return m ? { y: m[1], m: +m[2], raw: v } : null; }
function keyOf(h, I, P) {
  var k = mk(h.id), u = I.ws[k], r = I.rv[k], st = statusOf(h, I);
  switch (ST.mode) {
    case 'status': return st;
    case 'con': return effCon(h).group;
    case 'eff': { var o = P.eff[effCon(h).group]; return o ? effKey(o.eff) : 'na'; }
    case 'alert': {
      if (u) { var dd = X.daysDiff(u.deliveryDate), rd = X.isReady(u.unit); if (dd !== null) { if (dd <= -10) return 'ov10'; if (dd <= 0 && !rd) return 'late'; if (dd >= 0 && dd <= 3) return 'cd'; } }
      if (r && st !== 'del' && r.notesCompleted !== true) { var rr = X.rvRounds(r)[0], dl = rr ? X.daysDiff(rr.completionDate) : null; if (dl !== null) { if (dl < 0) return 'rvov'; if (dl <= 2) return 'rvcd'; } }
      return 'none'; }
    case 'rev': {
      if (!r) return 'none'; if (r.notesCompleted === true) return 'rdone';
      var n = X.rvRounds(r).length, f = X.rvRounds(r)[0], dl2 = f ? X.daysDiff(f.completionDate) : null;
      if (dl2 !== null && dl2 < 0 && st !== 'del') return 'rlate'; return n >= 3 ? 'r3' : n === 2 ? 'r2' : 'r1'; }
    case 'period': { var dd2 = delDate(h, I); if (!dd2) return st === 'del' ? 'other' : 'none'; return dd2.y === ST.year ? 'm' + dd2.m : 'other'; }
    case 'wait': { if (!u || st === 'del') return 'none'; var inc = X.daysDiff(u.incomingDate); if (inc === null) return 'wn'; var a = -inc; return a <= 10 ? 'w0' : a <= 20 ? 'w1' : a <= 30 ? 'w2' : a <= 60 ? 'w3' : 'w4'; }
    case 'today': { var ag = P.agenda[k]; return ag ? ag.key : 'none'; }
  }
  return 'none';
}
function layerKeys(P) {
  if (ST.mode === 'con') return Object.keys(ST.cnt).sort(function (a, b) { return ST.cnt[b] - ST.cnt[a]; }).map(function (n) { return [n, n, colorForCon(n)]; });
  if (ST.mode === 'eff') return EFF.slice();
  if (ST.mode === 'period') { var a = []; for (var m = 1; m <= 12; m++) a.push(['m' + m, MON[m] + ' ' + ST.year, monCol(m)]); a.push(['other', 'مسلّمة بسنة ثانية', '#8a94ab']); a.push(['none', 'مو مسلّمة', null]); return a; }
  return LD[ST.mode] ? LD[ST.mode].k : [];
}
function colorOfKey(key, P) {
  if (ST.mode === 'con') return colorForCon(key);
  var ks = layerKeys(P); for (var i = 0; i < ks.length; i++) if (ks[i][0] === key) return ks[i][2];
  return null;
}
function paint() {
  var svg = document.getElementById('mxsvg'); if (!svg) return;
  var I = index(), list = secList(), cnt = {}, ccnt = {}, byKey = {};
  ST.I = I; var P = ST.P = pre(I, list);
  list.forEach(function (s) { (MD.byS[s] || []).forEach(function (h) { colorForCon(effCon(h).group); }); });
  var keys = {};
  svg.querySelectorAll('rect.hs').forEach(function (r) {
    var h = MD.H[r.getAttribute('data-k')]; if (!h) return;
    var key = keyOf(h, I, P), ec = effCon(h); keys[r.getAttribute('data-k')] = key;
    cnt[key] = (cnt[key] || 0) + 1; ccnt[ec.group] = (ccnt[ec.group] || 0) + 1; (byKey[key] = byKey[key] || []).push(h);
  });
  ST.cnt = cnt; ST.ccnt = ccnt; ST.byKey = byKey;
  var cmap = {}; layerKeys(P).forEach(function (x) { cmap[x[0]] = x[2]; });
  svg.querySelectorAll('rect.hs').forEach(function (r) {
    var k = r.getAttribute('data-k'), h = MD.H[k]; if (!h) return; var key = keys[k], ec = effCon(h);
    r.style.fill = (ST.mode === 'con' ? colorForCon(key) : cmap[key]) || 'var(--mx-none)';
    var dim = (ST.flt !== 'all' && key !== ST.flt) || (ST.con !== 'all' && ec.group !== ST.con);
    r.classList.toggle('dim', !!dim);
    r.classList.toggle('rvm', ST.mode === 'status' && !!I.rv[k] && key !== 'del' && key !== 'rev');
    r.classList.toggle('sel', ST.sel === k);
  });
  kpis(I, list); side();
}
function kpis(I, list) {
  var el = document.getElementById('mxkpi'); if (!el) return;
  var c = { all: 0, ws: 0, ready: 0, late: 0, del: 0, rev: 0, al: 0, none: 0 };
  list.forEach(function (s) { (MD.byS[s] || []).forEach(function (h) { var st = statusOf(h, I), k = mk(h.id), u = I.ws[k]; c.all++;
    if (st === 'del') c.del++; else if (u) { c.ws++; if (st === 'ready') c.ready++; if (st === 'late') c.late++; } else if (st === 'none') c.none++;
    if (I.rv[k] && st !== 'del') c.rev++; }); });
  function k(lbl, n, mode, flt, cls) { return '<button class="kpi ' + (cls || '') + '" data-mx="kpi" data-v="' + mode + '|' + flt + '"><b>' + n + '</b><span>' + lbl + '</span></button>'; }
  el.innerHTML = k('دار بالخريطة', c.all, 'status', 'all') + k('مسلّمة', c.del, 'status', 'del', 'g') + k('قيد التسليم', c.ws, 'status', 'all', 'b') + k('جاهزة', c.ready, 'status', 'ready', 'b') +
    k('عابر وغير جاهزة', c.late, 'status', 'late', 'r') + k('بالمراجعة', c.rev, 'rev', 'all', 'p') + k('ما وصلت', c.none, 'status', 'none');
}
function side() {
  var el = document.getElementById('mxside'); if (!el) return;
  var h = '', P = ST.P || {};
  if (ST.sel && MD.H[ST.sel]) h += housePanel(MD.H[ST.sel]);
  var tot = 0; Object.keys(ST.cnt).forEach(function (k) { tot += ST.cnt[k]; });
  var title = ST.mode === 'con' ? 'توزيع المقاولين' : ST.mode === 'eff' ? 'كفاءة المقاولين' : ST.mode === 'period' ? 'التسليم بالأشهر' : (LD[ST.mode] || {}).t;
  h += '<div class="card"><h2 style="margin:0 0 8px;font-size:15px">' + esc(title || '') + ' <small>' + esc(ST.sec === 'all' ? 'كل القطاعات' : sectorName(+ST.sec)) + ' · ' + tot + ' دار</small></h2>';
  if (ST.mode === 'period') {
    var ys = {}; Object.keys(MD.H).forEach(function (k) { var d = delDate(MD.H[k], ST.I); if (d) ys[d.y] = 1; });
    h += '<div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:8px">' + Object.keys(ys).sort().map(function (y) { return '<button class="secchip' + (y === ST.year ? ' on' : '') + '" data-mx="year" data-v="' + y + '">' + y + '</button>'; }).join('') + '</div>';
  }
  if (ST.mode === 'today' && !Array.isArray(S.agenda)) h += '<p class="muted" style="font-size:12.5px">' + (S.agenda === 'err' ? '⚠️ تعذّر تحميل جدول الأعمال' : '⏳ جاري تحميل جدول الأعمال…') + '</p>';
  var keys = layerKeys(P);
  h += '<div class="lg">' + (ST.mode === 'con' ? '<button data-mx="flt" data-v="all" class="' + (ST.flt === 'all' ? 'on' : '') + '"><i style="background:transparent"></i><span>الكل</span><b>' + tot + '</b></button>' : '') +
    keys.map(function (x) { var n = ST.cnt[x[0]] || 0; if (!n && (ST.mode === 'period' || ST.mode === 'eff')) return '';
      var extra = ''; if (ST.mode === 'eff') { var gs = Object.keys(P.eff).filter(function (g) { return effKey(P.eff[g].eff) === x[0]; }); if (gs.length) extra = '<small class="muted" style="grid-column:2/4;font-size:11.5px">' + gs.map(function (g) { return esc(g) + ' ' + P.eff[g].eff + '٪'; }).join(' · ') + '</small>'; }
      return '<button data-mx="flt" data-v="' + esc(x[0]) + '" class="' + (ST.flt === x[0] ? 'on' : '') + '"><i class="' + (x[2] ? '' : 'none-sw') + '" style="' + (x[2] ? 'background:' + x[2] : '') + '"></i><span>' + esc(x[1]) + '</span><b>' + n + '</b>' + extra + '</button>'; }).join('') + '</div>';
  if (ST.mode === 'status') h += '<p class="muted" style="font-size:12px;margin:8px 0 0">الإطار البنفسجي = الدار بيها مراجعة. اضغط أي بند حتى تبيّنه بس.</p>';
  if (ST.mode === 'eff') h += '<p class="muted" style="font-size:12px;margin:8px 0 0">الكفاءة = 100 − (العابر موعدها وغير الجاهزة ÷ كل قيد التسليم)، لكل مقاول ضمن القطاع المعروض.</p>';
  if (ST.mode !== 'con') h += conFilter();
  h += '</div>';
  // قائمة الدور للطبقات اللي إلها قائمة
  if ((LD[ST.mode] || {}).list) {
    var ks = ST.flt !== 'all' ? [ST.flt] : keys.map(function (x) { return x[0]; }).filter(function (k) { return k !== 'none'; });
    var items = []; ks.forEach(function (k) { (ST.byKey[k] || []).forEach(function (hh) { if (ST.con === 'all' || effCon(hh).group === ST.con) items.push([k, hh]); }); });
    if (items.length) h += '<div class="card"><b style="font-size:14px">الدور (' + items.length + ')</b><div class="mxlist" style="margin-top:8px">' + items.slice(0, 200).map(function (x) {
      var hh = x[1], kk = mk(hh.id), u = ST.I.ws[kk], sub = sectorName(hh.s).replace('القطاع ', '') + ' · ' + effCon(hh).label;
      if (ST.mode === 'today' && P.agenda[kk]) sub += ' · ' + (P.agenda[kk].last.action || '');
      else if (u) sub += ' · 📤 ' + (u.deliveryDate || '-');
      return '<button data-mx="go2" data-v="' + esc(kk) + '"><b class="ltr">' + esc(hh.id) + '</b><small>' + esc(sub) + '</small><i style="width:10px;height:10px;border-radius:3px;display:inline-block;background:' + (colorOfKey(x[0], P) || 'var(--mx-none)') + '"></i></button>'; }).join('') + (items.length > 200 ? '<p class="muted" style="font-size:12px">يطلع أول 200</p>' : '') + '</div></div>';
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
  var dd = u ? X.daysDiff(u.deliveryDate) : null, inc = u ? X.daysDiff(u.incomingDate) : null, dl = delDate(h, I);
  var nh = (X.nhStatusMap() || {})[X.normH(sysNo)];
  var rounds = r ? X.rvRounds(r).filter(function (x, i) { return i === 0 || x.reviewDate || x.completionDate; }) : [];
  var ag = ST.P && ST.P.agenda && ST.P.agenda[k];
  return '<div class="card"><div class="row" style="justify-content:space-between"><h2 style="margin:0;font-size:18px" class="ltr">' + esc(h.id) + '</h2><button class="iconbtn" data-mx="unsel" aria-label="إغلاق">' + X.ico('close') + '</button></div>' +
    '<span class="pill" style="background:' + (COLORS[st] || 'var(--mx-none)') + ';color:#06121f;margin-top:6px;display:inline-block">' + esc(ST_LBL[st]) + '</span>' +
    '<div class="kv2"><span>القطاع</span><b>' + esc(sectorName(h.s)) + '</b><span>البلوك</span><b class="ltr" style="text-align:right">' + esc(h.b) + '</b>' +
    '<span>الجهة المنفذة</span><b>' + esc(ec.label) + (ec.direct && ec.orig ? ' <small class="muted">(المقاول الأصلي: ' + esc(ec.orig) + ')</small>' : '') + (ec.edited ? ' <small style="color:var(--gold)">· معدّل تجريبياً</small>' : '') + '</b>' +
    (sheetCon ? '<span>حسب الشيت</span><b>' + esc(sheetCon) + '</b>' : '') +
    (u ? '<span>تاريخ الوارد</span><b>' + esc(u.incomingDate || '-') + (inc !== null ? ' <small class="muted">(' + (-inc) + ' يوم)</small>' : '') + '</b>' +
      '<span>موعد التسليم</span><b>' + esc(u.deliveryDate || '-') + (dd !== null ? ' <small class="' + (dd <= 0 ? 'warnl' : 'muted') + '">(' + (dd > 0 ? 'باقي ' + dd + ' يوم' : dd === 0 ? 'اليوم' : 'متجاوز ' + (-dd) + ' يوم') + ')</small>' : '') + '</b>' +
      '<span>الجاهزية</span><b>' + (X.isReady(u.unit) ? '✅ جاهزة' : '⛔ غير جاهزة') + '</b>' : '') +
    (nh && nh.status === 'confirmed' && !nh.seed ? '<span>التبليغ</span><b>📨 تم تبليغ شعبة الإنهاءات</b>' : '') +
    (dl ? '<span>تاريخ الاستلام</span><b>' + esc(dl.raw) + '</b>' : (d ? '<span>تاريخ الاستلام</span><b>' + esc(d.date || '-') + '</b>' : '')) + '</div>' +
    (rounds.length ? '<div style="font-size:13px;margin:4px 0 8px"><b>🔍 المراجعات (' + rounds.length + ')' + (r.notesCompleted === true ? ' · ✅ أُكملت الملاحظات' : '') + '</b>' + rounds.map(function (x) { return '<div class="muted" style="font-size:12.5px">م' + x.n + ': حضور <span class="ltr">' + esc(x.reviewDate || '-') + '</span> ← إنهاء <span class="ltr">' + esc(x.completionDate || '-') + '</span></div>'; }).join('') + '</div>' : '') +
    (ag ? '<div style="font-size:12.5px;margin-bottom:6px"><b>📅 آخر حركة:</b> ' + esc((ag.last.action || '') + ' · ' + (ag.last.date || '') + (ag.last.by ? ' · ' + ag.last.by : '')) + '</div>' : '') +
    (mism ? '<div class="warnl">⚠️ المقاول بالشيت يختلف عن الخريطة</div>' : '') +
    (u && u.sector && u.sector !== sectorName(h.s) ? '<div class="warnl">⚠️ القطاع بالشيت (' + esc(u.sector) + ') يختلف عن الخريطة</div>' : '') +
    '<div class="row" style="margin-top:10px;gap:8px;flex-wrap:wrap">' + (known ? '<button class="btn pri sm" data-mx="open" data-v="' + esc(sysNo) + '">📋 كل التفاصيل والإجراءات</button>' : '<span class="muted" style="font-size:12.5px">الدار بعدها ما مسجّلة بأي شيت بالنظام.</span>') +
    (ST.edit ? '<button class="btn sm" data-mx="eblock" data-v="' + esc(k) + '">✏️ مقاول البلوك</button>' : '') + '</div></div>';
}

/* ---------- التكبير والسحب ---------- */
function curVB() { var k = String(ST.sec); return ST.vb[k] || ST.full.slice(); }
function applyVB() {
  var svg = document.getElementById('mxsvg'); if (!svg || !ST.full) return;
  var v = curVB(); svg.setAttribute('viewBox', v.map(function (n) { return n.toFixed(2); }).join(' '));
  var box = svg.getBoundingClientRect(), upp = Math.max(v[2] / (box.width || 1), v[3] / (box.height || 1));
  svg.classList.toggle('zoomed', upp < 0.3);
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
  ST.sel = k; ST.flt = 'all'; ST.con = 'all'; paint();
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
  else if (a === 'mode') { ST.mode = v; ST.flt = 'all'; X.lsSet('mx_mode', v); syncToolbar(); paint(); }
  else if (a === 'flt') { ST.flt = ST.flt === v ? 'all' : v; paint(); }
  else if (a === 'kpi') { var kv = v.split('|'); ST.mode = kv[0]; ST.flt = kv[1]; X.lsSet('mx_mode', ST.mode); syncToolbar(); paint(); }
  else if (a === 'year') { ST.year = v; ST.flt = 'all'; paint(); }
  else if (a === 'go2') focusHouse(v);
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
    if (/VIP/i.test(sec || '') || /VIP/i.test(k)) { vip++; return; }
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
    // الألوان معتمدة (قرار المستخدم) — ما نقارن ويه أرقام مفتاح الألوان المكتوبة بالرسم
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
  var I = ST.I || index(), P = ST.P || pre(I, secList()), pr = document.getElementById('mxprint');
  if (!pr) { pr = document.createElement('div'); pr.id = 'mxprint'; document.body.appendChild(pr); }
  var svg = svgHTML(true).replace('id="mxsvg"', '').replace('class="mxs"', '');
  var tmp = document.createElement('div'); tmp.innerHTML = svg;
  var cnt = {}, cmap = {}; layerKeys(P).forEach(function (x) { cmap[x[0]] = x[2]; });
  tmp.querySelectorAll('rect.hs').forEach(function (r) { var h = MD.H[r.getAttribute('data-k')]; if (!h) return; var key = keyOf(h, I, P); cnt[key] = (cnt[key] || 0) + 1;
    var f = (ST.mode === 'con' ? colorForCon(key) : cmap[key]) || '#ffffff'; r.setAttribute('fill', f); if (f === '#ffffff') r.setAttribute('class', 'hs none-p'); });
  var keys = ST.mode === 'con' ? Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a]; }).map(function (n) { return [n, n, colorForCon(n)]; }) : layerKeys(P);
  var lg = keys.filter(function (x) { return cnt[x[0]]; }).map(function (x) { return '<span><i style="background:' + (x[2] || '#fff') + '"></i>' + esc(x[1]) + ': <b>' + cnt[x[0]] + '</b></span>'; }).join('');
  var mt = (MODES.filter(function (m) { return m[0] === ST.mode; })[0] || ['', ''])[1];
  pr.innerHTML = '<h2>مجمع الأميرات السكني 2 — ' + esc(ST.sec === 'all' ? 'كل القطاعات' : sectorName(+ST.sec)) + ' — ' + esc(mt) + (ST.mode === 'period' ? ' ' + ST.year : '') + ' — ' + X.todayStr() + '</h2>' + tmp.innerHTML + '<div class="pl">' + lg + '</div>';
  document.body.classList.add('mxprinting');
  setTimeout(function () { window.print(); setTimeout(function () { document.body.classList.remove('mxprinting'); }, 500); }, 80);
}

// لو النظام رسم قبل تحميل هذا الملف
try { X.scheduleRender(); } catch (e) {}
window.__MX = { ST: ST, md: function () { return MD; }, checks: function () { return checks(); }, counts: function (l) { return counts(l || [1, 2, 3, 4, 5, 6]); }, focus: focusHouse };
})();
