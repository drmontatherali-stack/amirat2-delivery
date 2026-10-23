/* الخريطة الحيّة — قسم من نظام مكتب التسليم
   انعكاس حي للنظام: تقرا نفس البيانات (قيد التسليم، المسلّمة، المراجعات) وتلوّن كل دار على مخطط المجمع.
   للعرض فقط — الإجراء الوحيد من الخريطة هو إضافة مراجعة، وكل التعديلات من خانة البحث.
   Design by: Montather Ali */
(function () {
'use strict';
var X = window.A2X; if (!X || !X.VIEWS) return;
var V = '2.7.2';
var S = X.S, esc = X.esc;
var MD = null, MDerr = '', loading = false;
var ST = { lgc: +X.lsGet('mx_lgc', innerWidth < 640 ? 1 : 0) === 1, side: false, sec: X.lsGet('mx_sec', 'all'), mode: X.lsGet('mx_mode', 'status'), con: 'all', flt: 'all', year: String(new Date().getFullYear()), q: '', sel: null, edit: false, vb: {}, zoomed: false };
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
  X.TITLES.map = 'خريطة مجمع الأميرات 2';
  // كل شاشات مكتب التسليم متوفرة داخل نظام الخريطة، والخريطة هي الرئيسية
  X.NAV.unshift(['map', 'الخريطة']);
  var og = X.ACT.go; X.ACT.go = function (d, el, ev) { if (d && d.v === 'hub') d = { v: 'map' }; return og(d, el, ev); };
} else {
  if (X.HUB.indexOf('map') < 0) X.HUB.push('map');
  X.TITLES.map = 'الخريطة الحيّة';
  if (!X.NAV.some(function (n) { return n[0] === 'map'; })) X.NAV.splice(X.NAV.length - 1, 0, ['map', 'الخريطة']);
  X.hubStats = function () { return { map: { c: 'كل الدور على المخطط', p: null } }; };
}
X.VIEWS.map = function () { return '<div id="mxroot" class="mx"></div>'; };
// أي تعديل على البيانات من نظام الخريطة يسأل «هل أنت متأكد؟» قبل الحفظ
var CONFIRM = { setReady: 'تغيير جاهزية الدار', toggleReady: 'تغيير جاهزية الدار', saveRec: 'حفظ بيانات المراجعة', saveNewRound: 'إضافة جولة مراجعة', delRound: 'حذف جولة مراجعة', delChoice: 'حذف سجل المراجعة',
  toggleNotes: 'تغيير حالة إكمال الملاحظات', reopenNew: 'إرجاع الدار لقائمة الدور الجديدة', nhSave: 'حفظ تبليغ الدار الجديدة', waSend: 'إرسال/تسجيل رسالة الواتساب', waMark: 'تأشير الرسالة كمرسلة', waDrop: 'إلغاء الرسالة',
  snooze: 'تأجيل التنبيه', saveUrl: 'حفظ روابط الشيتات', importOld: 'نسخ البيانات من النظام القديم', bkRestore: 'استرجاع نسخة احتياطية', setPw: 'تغيير الرمز', revokeAcc: 'إلغاء صلاحية' };
function askSure(what, onYes) {
  var old = document.getElementById('mxsure'); if (old) old.remove();
  var d = document.createElement('div'); d.id = 'mxsure'; d.setAttribute('role', 'alertdialog'); d.setAttribute('aria-modal', 'true');
  d.innerHTML = '<div class="box"><div class="ic">⚠️</div><h3>هل أنت متأكد؟</h3><p>' + esc(what) + '</p><div class="row" style="gap:8px;justify-content:center"><button class="btn pri" id="mxsureY">نعم، احفظ</button><button class="btn" id="mxsureN">لا، رجوع</button></div></div>';
  document.body.appendChild(d);
  d.querySelector('#mxsureY').onclick = function (e) { e.stopPropagation(); d.remove(); onYes(); };
  d.querySelector('#mxsureN').onclick = function (e) { e.stopPropagation(); d.remove(); };
  d.onclick = function (e) { if (e.target === d) d.remove(); e.stopPropagation(); };
  setTimeout(function () { var y = document.getElementById('mxsureY'); if (y) y.focus(); }, 30);
}
if (MAPAPP) Object.keys(CONFIRM).forEach(function (n) {
  var f = X.ACT[n]; if (typeof f !== 'function') return;
  X.ACT[n] = function (d, el, ev) { var a = arguments, self = this; askSure(CONFIRM[n] + (d && (d.h || d.k) ? ' — ' + (d.h || '') : ''), function () { f.apply(self, a); }); };
});
X.afterRender = function (view) { document.body.classList.toggle('mxon', view === 'map'); if (view === 'map') build(); };

/* ---------- أدوات ---------- */
function mk(h) { return String(h == null ? '' : h).toUpperCase().replace(/\s+/g, '').replace(/[-_]/g, '.').replace(/^AV\.?VIP/, 'VIP'); } // AVVIP بالشيتات = VIP
function arTok(n) { return X.arN(n).split(' ').filter(Boolean); }
function sameCon(a, b) { // "اوات" = "اوات جمال" ، "علي الكوفي" = "علي محمد الكوفي"
  var A = arTok(a), B = arTok(b); if (!A.length || !B.length) return false;
  if (A.join('') === B.join('')) return true; // "عبدالله" = "عبد الله"
  var s = A.length <= B.length ? A : B, l = A.length <= B.length ? B : A;
  return s.every(function (w) { return l.indexOf(w) >= 0; });
}
function allSecs() { return MD ? Object.keys(MD.sectors).map(Number).sort(function (a, b) { return a - b; }) : [1, 2, 3, 4, 5, 6]; }
function sectorName(s) { return MD && MD.sectors[s] ? MD.sectors[s].name : 'القطاع ' + s; }
function bKey(s, b) { return 's' + s + '_' + b; }
// جهات تُعتبر تنفيذ مباشر حتى لو الشيت كاتب اسمها كمقاول (طلب المستخدم: دياري كريم) + اللي المخطط يعتبرها مباشر
var DIRECT_NAMES = ['دياري كريم'];
function directNames() { if (ST.dn) return ST.dn; var a = DIRECT_NAMES.slice(); if (MD && MD.directRules) Object.keys(MD.directRules).forEach(function (s) { var r = MD.directRules[s]; if (Array.isArray(r)) a = a.concat(r); }); return ST.dn = a; }
function isDirectCon(n) { return !!n && (X.isDirectExec(n) || directNames().some(function (d) { return sameCon(d, n); })); }
function canonCon(n) { // نفس المقاول بكتابة الشيت أو المخطط ينجمع تحت اسم واحد
  if (!n || !MD) return n; ST.cc = ST.cc || {}; if (ST.cc[n]) return ST.cc[n];
  var m = MD.cons.filter(function (c) { return c && sameCon(c, n); }); return ST.cc[n] = m.length === 1 ? m[0] : n; }
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
    loading = false; ST.built = false; build(); setTimeout(wave, 60); if (X.S.view !== 'map') X.scheduleRender();
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
function sheetConOf(h, I) { var k = mk(h.id), u = I.ws[k], r = I.rv[k]; return u ? X.unitCon(u) : (r ? X.recCon(r) : ''); }
function effCon(h) { // الجهة المنفذة حسب النظام (الشيت)، وإذا الدار مو بالشيت حسب المخطط
  var I = ST.I || index(), sc = sheetConOf(h, I), con, dir, src;
  if (sc) { dir = isDirectCon(sc); con = dir ? '' : canonCon(sc); src = 'sheet'; }
  else { dir = h.dir0 || isDirectCon(h.con0); con = dir ? '' : h.con0; src = 'draw'; }
  var drawLbl = (h.dir0 || isDirectCon(h.con0)) ? DIRECT : (h.con0 || 'غير محدد');
  return { con: con, direct: dir, label: dir ? DIRECT : (con || 'غير محدد'), group: dir ? CO_LBL : (con || 'غير محدد'), src: src, orig: h.con0, draw: drawLbl, sheet: sc };
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
    '.mx .bar{display:flex;flex-wrap:wrap;gap:10px;align-items:center}',
    '.mx .secs{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;max-width:100%}',
    '.mx .sc{display:flex;flex-direction:column;align-items:stretch;gap:3px;min-width:74px;padding:7px 10px;border-radius:14px;border:1px solid var(--line);background:var(--card);color:var(--ink);font:inherit;cursor:pointer;transition:transform .2s,border-color .2s,background .2s}',
    '.mx .sc{flex:none}.mx .sc:hover{transform:translateY(-2px)}',
    '.mx .sc b{font-size:13.5px;white-space:nowrap}.mx .sc small{font-size:10.5px;color:var(--muted);white-space:nowrap}',
    '.mx .sc.on{border-color:var(--brand);background:color-mix(in srgb,var(--brand) 16%,var(--card));box-shadow:0 6px 22px -10px var(--brand)}',
    '.mx .pb{display:block;height:4px;border-radius:4px;background:var(--soft2);overflow:hidden}.mx .pb i{display:block;height:100%;width:0;background:linear-gradient(90deg,#2ecc71,#4FD8E8);border-radius:4px;transition:width .9s cubic-bezier(.2,.8,.2,1)}',
    '.mx .srch{flex:1 1 200px;display:flex;align-items:center;gap:6px;border:1px solid var(--line);border-radius:14px;padding:0 12px;background:var(--card);min-width:160px}',
    '.mx .srch input{flex:1;border:0;background:transparent;color:var(--ink);font:inherit;font-size:14px;padding:11px 0;outline:none;direction:ltr;text-align:right}',
    '.mx .srch:focus-within{border-color:var(--brand);box-shadow:0 0 0 3px color-mix(in srgb,var(--brand) 25%,transparent)}',
    '.mx .tools{display:flex;gap:6px}',
    '.mx .tb{display:flex;flex-direction:column;align-items:center;gap:1px;min-width:58px;padding:6px 8px;border-radius:12px;border:1px solid var(--line);background:var(--card);color:var(--ink);font:inherit;font-size:17px;cursor:pointer;text-decoration:none;transition:transform .2s,background .2s}',
    '.mx .tb span{font-size:10.5px;color:var(--muted)}.mx .tb:hover{transform:translateY(-2px);background:var(--soft)}.mx .tb.on{border-color:var(--gold,#E2C47A);background:color-mix(in srgb,var(--gold,#E2C47A) 14%,var(--card))}',
    '.mx .mxlayers{position:absolute;top:8px;inset-inline-end:8px;display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;z-index:3;padding:4px;border-radius:16px;background:color-mix(in srgb,var(--card-solid,#0b1430) 94%,transparent);border:1px solid var(--line);width:max-content;max-width:calc(100% - 20px)}',
    '.mx .mxlayers button{display:flex;align-items:center;gap:3px;white-space:nowrap;border:0;border-radius:9px;padding:4px 7px;background:transparent;color:var(--muted);font:inherit;font-size:11px;cursor:pointer;transition:background .25s,color .25s}',
    '.mx .mxlayers button em{font-style:normal}.mx .mxlayers button span{font-size:12px}.mx .mxlayers{gap:2px;padding:3px}',
    '.mx .mxlayers button.on{background:var(--brand);color:#06121f;font-weight:700;box-shadow:0 4px 14px -6px var(--brand)}',
    '.mx .mxtip{position:absolute;z-index:4;pointer-events:none;min-width:150px;max-width:220px;padding:8px 10px;border-radius:12px;background:color-mix(in srgb,var(--card-solid,#0b1430) 92%,transparent);border:1px solid var(--line);box-shadow:0 10px 30px -10px #000;display:flex;flex-direction:column;gap:2px;font-size:12.5px;color:var(--ink)}',
    '.mx .mxtip span{display:flex;align-items:center;gap:6px}.mx .mxtip i{width:10px;height:10px;border-radius:3px;display:inline-block}.mx .mxtip small{color:var(--muted);font-size:11px}',
    '.mx svg.mxs{transform-origin:0 0;will-change:transform}',
    '.mx svg.mxs .hs{transform-box:fill-box;transform-origin:center}',
    '.mx svg.mxs.wave:not(.big) .hs{animation:mxw .7s cubic-bezier(.2,.9,.3,1.25) both;animation-delay:var(--d,0ms)}',
    '.mx svg.mxs.big.wave #mxh{animation:mxf2 .6s ease both}@keyframes mxf2{from{opacity:0}}',
    '@keyframes mxw{from{opacity:0;transform:scale(.15)}to{opacity:1;transform:none}}',
    '.mx svg.mxs .ctx{fill:none;stroke:var(--muted);stroke-width:.45;opacity:.32}',
    '.mx svg.mxs .fac{font:600 6.5px "IBM Plex Sans Arabic",sans-serif;fill:var(--muted);opacity:.85;text-anchor:middle;pointer-events:none;paint-order:stroke;stroke:var(--card-solid,#0b1430);stroke-width:1.6px}',
    '.mx svg.mxs .hs.vip{stroke:#E2C47A;stroke-width:1.4}',
    '.mx svg.mxs.zoomed .snb{opacity:.35}',
    '.mx svg.mxs .hs:hover{stroke:#fff;stroke-width:1.6}',
    '.mx svg.mxs .snb{cursor:pointer}.mx svg.mxs .snb rect{fill:color-mix(in srgb,var(--brand) 30%,var(--card-solid,#0b1430));fill-opacity:.92;stroke:var(--brand);stroke-width:1;vector-effect:non-scaling-stroke}',
    '#mxsure{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;background:rgba(3,6,18,.55);backdrop-filter:blur(3px);animation:mxf .18s ease}',
    '#mxsure .box{width:min(92vw,380px);padding:22px;border-radius:20px;background:var(--card-solid,#101a3a);border:1px solid var(--line);box-shadow:0 30px 80px -20px #000;text-align:center;animation:mxpop .25s cubic-bezier(.2,.9,.3,1.2)}',
    '#mxsure .ic{font-size:34px}#mxsure h3{margin:6px 0 4px;font-size:19px}#mxsure p{margin:0 0 16px;color:var(--muted);font-size:14px}',
    '@keyframes mxf{from{opacity:0}}@keyframes mxpop{from{transform:scale(.85);opacity:0}}',
    '@media (prefers-reduced-motion:reduce){.mx svg.mxs.wave .hs,#mxsure,#mxsure .box{animation:none}}',
    '.mx .bar .grow{flex:1 1 180px;min-width:150px}',
    '.mx .seg{display:inline-flex;border:1px solid var(--line);border-radius:12px;overflow-x:auto;max-width:100%;scrollbar-width:none}',
    '.mx .seg button{white-space:nowrap}',
    '.mx .seg button{border:0;background:transparent;color:var(--muted);padding:8px 12px;font:inherit;font-size:13px;cursor:pointer}',
    '.mx .seg button.on{background:var(--brand);color:#06121f;font-weight:700}',
    '.mx .main{position:relative}',
    '.mx .side{position:absolute;z-index:5;top:54px;inset-inline-start:10px;width:min(300px,calc(100% - 20px));max-height:calc(100% - 64px);overflow:auto;scrollbar-width:thin;transition:transform .3s cubic-bezier(.2,.8,.2,1),opacity .3s}',
    '.mx .side .card{background:var(--card-solid,var(--card));box-shadow:0 18px 40px -18px #000}',
    '.mx.sidehid .side{transform:translateX(-12px);opacity:0;pointer-events:none}[dir=rtl] .mx.sidehid .side{transform:translateX(12px)}',
    '.mx .sidetg{position:absolute;z-index:6;top:8px;inset-inline-start:8px;border:1px solid var(--line);border-radius:12px;padding:7px 11px;background:color-mix(in srgb,var(--card-solid,#0b1430) 94%,transparent);color:var(--ink);font:inherit;font-size:12.5px;cursor:pointer}',
    '.mx.compact{gap:8px}',
    '.mx.compact .kpis{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding-bottom:2px}.mx.compact .kpis::-webkit-scrollbar{display:none}',
    '.mx.compact .kpi{flex:none;min-width:104px;padding:6px 10px;grid-template-areas:"i n" "l l";gap:0 8px}.mx.compact .kpi .kb{display:none}.mx.compact .kpi b{font-size:17px}.mx.compact .kpi .ki{font-size:14px}.mx.compact .kpi .kl{font-size:11px;white-space:nowrap}',
    '.mx.compact .sc{flex-direction:row;align-items:center;gap:5px;padding:5px 9px;min-width:0;border-radius:11px}.mx.compact .sc b{font-size:12.5px}.mx.compact .sc small{font-size:10px}.mx.compact .sc .pb{display:none}.mx.compact .tb{min-width:40px}.mx.compact .tb span{display:none}.mx.compact .bar{gap:6px}.mx.compact .srch input{padding:8px 0}.mx.compact .tb{padding:4px 6px}',
    'body.mxon #topbar .credit{display:none}body.mxon #topbar h1 small{display:none}body.mxon #topbar{padding-block:6px}',
    '@media (max-width:640px){.mx .mxlayers{inset-inline:8px;max-width:none;width:auto}.mx .sidetg{top:50px}.mx .side{top:92px;max-height:calc(100% - 100px)}.mx .bar .srch{flex-basis:100%}body.mxon #topbar .chip.net{display:none}}',
    /* دليل الألوان على الخريطة نفسها */
    '.mx .mxlg{position:absolute;z-index:4;bottom:10px;inset-inline-end:10px;width:min(290px,calc(100% - 76px));max-height:min(52%,420px);display:flex;flex-direction:column;border:1px solid var(--line);border-radius:14px;background:var(--card-solid,var(--card));box-shadow:0 14px 34px -16px #000;overflow:hidden}',
    '.mx .mxlg>.hd{display:flex;align-items:center;gap:6px;border:0;background:transparent;color:var(--ink);font:inherit;font-size:12.5px;font-weight:700;padding:8px 10px;cursor:pointer;text-align:right}.mx .mxlg>.hd small{color:var(--muted);font-weight:400;flex:1}.mx .mxlg>.hd i{font-style:normal;transition:transform .25s}',
    '.mx .mxlg .bdy{overflow:auto;padding:0 6px 8px;scrollbar-width:thin}.mx .mxlg.cl .bdy{display:none}.mx .mxlg.cl>.hd i{transform:rotate(180deg)}.mx .mxlg.cl{width:auto}',
    '.mx .mxlg .lg button{font-size:12.5px;padding:4px 6px;grid-template-columns:14px 1fr auto}',
    '.mx .mxlg .fr{display:grid;grid-template-columns:14px 1fr;gap:8px;align-items:center;font-size:12px;color:var(--ink);padding:3px 6px}.mx .mxlg .fr i{width:12px;height:12px;border-radius:3px;display:inline-block;box-sizing:border-box}',
    '.mx .mxlg h4{margin:8px 6px 4px;font-size:11.5px;color:var(--muted);font-weight:600}',
    '.mx .mxlg p{margin:6px 6px 0;font-size:11.5px;color:var(--muted);line-height:1.6}',
    '@media (max-width:640px){.mx .mxlg{inset-inline-end:8px;bottom:8px;width:calc(100% - 70px)}}',
    '.mx .mapbox{position:relative;border:1px solid var(--line);border-radius:18px;overflow:hidden;background:radial-gradient(1200px 600px at 50% 0%,color-mix(in srgb,var(--brand) 7%,transparent),transparent 60%),var(--card-solid,var(--card));height:calc(100vh - 300px);min-height:440px;touch-action:none;box-shadow:inset 0 0 0 1px rgba(255,255,255,.02),0 20px 50px -30px #000}',
    '.mx svg.mxs{width:100%;height:100%;margin-top:0;display:block;user-select:none;-webkit-user-select:none;cursor:grab}',
    '.mx svg.mxs .geo{fill:none;stroke:var(--muted);stroke-width:.4;opacity:.55}',
    '.mx svg.mxs .hs{stroke:rgba(0,0,0,.38);stroke-width:.3}.mx svg.mxs:not(.big) .hs{transition:opacity .35s,fill .45s ease}',
    '.mx svg.mxs .hs.dim{opacity:.12}',
    '.mx svg.mxs .hs.rvm{stroke:#a77bff;stroke-width:1.6}',
    '.mx svg.mxs .hs.sel{stroke:#fff;stroke-width:2.4;paint-order:stroke}',
    '.mx svg.mxs .hs.pulse{animation:mxp 1s ease-in-out 4}',
    '@keyframes mxp{50%{opacity:.2}}',
    '.mx svg.mxs .blg rect{fill:var(--brand);fill-opacity:.92;stroke:#0b1430;stroke-width:.6;pointer-events:none}',
    '.mx svg.mxs .bl{font:800 7.2px "Readex Pro","IBM Plex Sans Arabic",sans-serif;fill:#06121f;pointer-events:none;text-anchor:middle;dominant-baseline:central;letter-spacing:.2px}',
    '.mx svg.mxs:not(.nums) .hn{display:none}',
    '.mx svg.mxs .hn{text-rendering:optimizeSpeed;font-family:"Readex Pro","IBM Plex Sans Arabic",sans-serif;font-weight:700;fill:#1b2440;fill-opacity:.85;pointer-events:none;text-anchor:middle;dominant-baseline:central}',
    '.mx svg.mxs .sn{font:800 19px "IBM Plex Sans Arabic",sans-serif;fill:var(--ink);text-anchor:middle;pointer-events:none}',
    '.mx .zbtn{position:absolute;inset-inline-start:10px;bottom:10px;display:flex;flex-direction:column;gap:6px}',
    '.mx .zbtn{z-index:3}.mx .zbtn button{width:42px;height:42px;border-radius:14px;border:1px solid var(--line);background:color-mix(in srgb,var(--card-solid,#0b1430) 94%,transparent);color:var(--ink);font-size:20px;cursor:pointer;transition:transform .15s}.mx .zbtn button:active{transform:scale(.92)}',
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
    '@media (max-width:900px){.mx .mapbox{height:64vh}.mx .tb span{display:none}.mx .tb{min-width:44px}}',
    '.mx .side .card{animation:mxin .3s ease both}@keyframes mxin{from{opacity:0;transform:translateY(6px)}}',
    '.mxt{width:100%;border-collapse:collapse;font-size:13px}.mxt th,.mxt td{border:1px solid var(--line);padding:6px 8px;text-align:center}.mxt th{background:var(--soft2);color:var(--muted);font-weight:600}.mxt td:first-child,.mxt th:first-child{text-align:right}.mxt tr.tot td{font-weight:700;background:var(--soft)}.mxt .bad{color:#ff6b7d;font-weight:700}',
    '.mxlist{display:flex;flex-direction:column;gap:4px;max-height:46vh;overflow:auto}.mxlist button{display:flex;justify-content:space-between;gap:10px;border:1px solid var(--line);background:var(--soft2);color:var(--ink);border-radius:10px;padding:8px 10px;font:inherit;font-size:13px;cursor:pointer;text-align:right}.mxlist button small{color:var(--muted)}',
    '.mxsec{margin:14px 0 6px;font-size:15px}',
    '.mx .kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(118px,1fr));gap:8px}',
    '.mx .kpi{position:relative;display:grid;grid-template-columns:auto 1fr;grid-template-areas:"i n" "l l" "b b";align-items:center;gap:2px 8px;padding:10px 12px 9px;border-radius:16px;border:1px solid var(--line);background:linear-gradient(160deg,color-mix(in srgb,var(--card) 92%,#fff 8%),var(--card));color:var(--muted);font:inherit;font-size:12px;cursor:pointer;text-align:right;transition:transform .2s,box-shadow .2s,border-color .2s;overflow:hidden}',
    '.mx .kpi:hover{transform:translateY(-2px);box-shadow:0 10px 26px -14px #000}.mx .kpi.on{border-color:var(--brand);box-shadow:0 0 0 2px color-mix(in srgb,var(--brand) 35%,transparent)}',
    '.mx .kpi .ki{grid-area:i;font-size:18px}.mx .kpi .kl{grid-area:l}',
    '.mx .kpi b{grid-area:n;font-family:"Readex Pro";font-size:22px;color:var(--ink);font-variant-numeric:tabular-nums;text-align:left}',
    '.mx .kpi .kb{grid-area:b;display:block;height:3px;border-radius:3px;background:var(--soft2);overflow:hidden;margin-top:4px}.mx .kpi .kb i{display:block;height:100%;width:0;border-radius:3px;background:var(--muted);transition:width .9s cubic-bezier(.2,.8,.2,1)}',
    '.mx .kpi.g .kb i{background:#2ecc71}.mx .kpi.b .kb i{background:#3fa9f5}.mx .kpi.r .kb i{background:#ff4d5e}.mx .kpi.p .kb i{background:#a77bff}.mx .kpi.t .kb i,.mx .kpi.t b{background:none;color:#22d3c5}.mx .kpi.t .kb i{background:#22d3c5}',
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
    root.innerHTML = '<div class="card empty">' + (MDerr ? '⚠️ تعذّر تحميل الخريطة: ' + esc(MDerr) : '⏳ جاري تحميل خريطة القطاعات…') + '</div>';
    if (!MDerr) load(); return;
  }
  if (!root.querySelector('.mapbox') || ST.built !== true) {
    root.innerHTML = toolbar() + '<div class="main"><div class="mapbox" id="mxbox">' + svgHTML(false) +
      '<div class="mxlayers" role="group" aria-label="الطبقة">' + MODES.map(function (m) { return '<button data-mx="mode" data-v="' + m[0] + '" class="' + (ST.mode === m[0] ? 'on' : '') + '"><span>' + m[2] + '</span><em>' + m[1] + '</em></button>'; }).join('') + '</div>' +
      '<div class="mxtip" id="mxtip" hidden></div><button class="sidetg" data-mx="side">☰ التفاصيل</button><div class="mxlg' + (ST.lgc ? ' cl' : '') + '" id="mxlg"></div>' +
      '<div class="zbtn"><button data-mx="zin" aria-label="تكبير">+</button><button data-mx="zout" aria-label="تصغير">−</button><button data-mx="zfit" aria-label="عرض القطاع كامل">⤢</button></div></div><div class="side" id="mxside"></div></div>';
    ST.built = true; ST.base = null; ST.rects = null; root.classList.add('compact'); root.classList.toggle('sidehid', !ST.side); wire();
    paint(); fitMap(); applyVB(); return;
  } else syncToolbar();
  paint();
}
function fitMap() { var b = document.getElementById('mxbox'); if (!b) return; var t = b.getBoundingClientRect().top + (window.scrollY || 0); var h = Math.max(380, Math.round((window.visualViewport ? visualViewport.height : innerHeight) - t - 12)); b.style.height = h + 'px'; }
window.addEventListener('resize', function () { if (document.getElementById('mxbox')) { fitMap(); applyVB(); } });
var MODES = [['status', 'الحالة', '🏠'], ['alert', 'التنبيهات', '🔔'], ['rev', 'المراجعات', '🔍'], ['wait', 'الانتظار', '⏳'], ['con', 'المقاولين', '👷'], ['eff', 'الكفاءة', '📈'], ['period', 'بالأشهر', '📅'], ['today', 'اليوم', '🕘']];
var MODE_VIEW = { status: 'ws', con: 'weekly', eff: 'weekly', alert: 'today', rev: 'rvsum', period: 'annual', wait: 'ws', today: 'agenda' };
function toolbar() {
  var secs = [['all', 'الكل']].concat(allSecs().map(function (s) { return [String(s), sectorName(s).replace('القطاع ', '')]; }));
  return '<div class="kpis" id="mxkpi"></div>' +
    '<div class="bar" id="mxbar"><div class="secs" role="group" aria-label="القطاع">' + secs.map(function (s) { return '<button data-mx="sec" data-v="' + s[0] + '" class="sc' + (String(ST.sec) === s[0] ? ' on' : '') + '"><b>' + esc(s[1]) + '</b><i class="pb"><i></i></i><small></small></button>'; }).join('') + '</div>' +
    '<label class="srch"><span>🔍</span><input id="mxq" type="search" placeholder="رقم الدار مثل B40.2" value="' + esc(ST.q) + '" enterkeyhint="search"></label>' +
    '<div class="tools"><button class="tb" data-mx="check" title="الفرق بين الشيت والمخطط">🔎<span>الفرق</span></button><button class="tb" data-mx="count" title="الحصر">📊<span>الحصر</span></button><button class="tb" data-mx="print" title="طباعة">🖨️<span>طباعة</span></button>' +
    (MAPAPP ? '' : '<a class="tb" href="map.html" title="نظام الخريطة المستقل">🗺️<span>نظام الخريطة</span></a>') + '</div></div>';
}
function syncToolbar() {
  var root = document.getElementById('mxroot'); if (!root) return;
  root.querySelectorAll('[data-mx="sec"]').forEach(function (b) { b.classList.toggle('on', b.dataset.v === String(ST.sec)); });
  root.querySelectorAll('[data-mx="mode"]').forEach(function (b) { b.classList.toggle('on', b.dataset.v === ST.mode); });
}
function secList() { return ST.sec === 'all' || !MD || !MD.sectors[ST.sec] ? allSecs() : [+ST.sec]; }
function extOf(list) {
  var e = [1e9, 1e9, -1e9, -1e9];
  list.forEach(function (s) { var x = MD.sectors[s].ext; e = [Math.min(e[0], x[0]), Math.min(e[1], x[1]), Math.max(e[2], x[2]), Math.max(e[3], x[3])]; });
  return e;
}
function svgHTML(forPrint) {
  var list = secList(), e = extOf(list), g = '', hs = '', hn = '', bl = '', sn = '', fc = '', all = list.length > 1;
  var cx = (e[0] + e[2]) / 2, cy = (e[1] + e[3]) / 2, R = Math.hypot(e[2] - e[0], e[3] - e[1]) / 2 || 1;
  // سياق المجمع الحقيقي: الشوارع والخدمات (من الخريطة الموحّدة)
  if (MD.ctx && MD.ctx.length) g += '<path class="ctx" d="' + MD.ctx.join(' ') + '"/>';
  list.forEach(function (s) {
    g += '<path class="geo" d="' + MD.sectors[s].geo.join(' ') + '"/>';
    var L = MD.byS[s] || [];
    if (all && L.length) { var ax = 0, ay = 0; L.forEach(function (h) { ax += h.x; ay += h.y; }); ax /= L.length; ay /= L.length; var w = s === 7 ? 96 : 150;
      sn += '<g class="snb" data-mx="sec" data-v="' + s + '"><rect x="' + (ax - w / 2).toFixed(1) + '" y="' + (-ay - 17).toFixed(1) + '" width="' + w + '" height="34" rx="17"/><text class="sn" x="' + ax.toFixed(1) + '" y="' + (-ay + 6.5).toFixed(1) + '">' + esc(sectorName(s)) + '</text></g>'; }
    L.forEach(function (h) {
      var dly = Math.round(Math.hypot(h.x - cx, h.y - cy) / R * 900);
      hs += '<rect class="hs' + (h.s === 7 ? ' vip' : '') + '" data-k="' + esc(mk(h.id)) + '" rx="0.6" x="' + (h.x - h.w / 2 + 0.35).toFixed(1) + '" y="' + (-h.y - h.h / 2 + 0.35).toFixed(1) + '" width="' + Math.max(1, h.w - 0.7).toFixed(1) + '" height="' + Math.max(1, h.h - 0.7).toFixed(1) + '"' + (forPrint || all ? '' : ' style="--d:' + dly + 'ms"') + '/>';
      if (!forPrint) hn += '<text class="hn" font-size="' + Math.max(3, Math.min(h.w, h.h) * 0.46).toFixed(1) + '" x="' + h.x.toFixed(1) + '" y="' + (-h.y + 0.3).toFixed(1) + '">' + esc(h.id.split('.')[1]) + '</text>';
    });
  });
  var bb = {}; list.forEach(function (s) { (MD.byS[s] || []).forEach(function (h) { var o = bb[h.b] = bb[h.b] || [1e9, 1e9, -1e9, -1e9]; o[0] = Math.min(o[0], h.x - h.w / 2); o[1] = Math.min(o[1], h.y - h.h / 2); o[2] = Math.max(o[2], h.x + h.w / 2); o[3] = Math.max(o[3], h.y + h.h / 2); }); });
  MD.blocks.forEach(function (b) { if (list.indexOf(b[1]) < 0) return; var o = bb[b[0]], t = esc(b[0].replace(/^(\D+)/, '$1.')); if (!o) return; var vert = (o[3] - o[1]) > (o[2] - o[0]) * 1.6, x = vert ? (o[0] + o[2]) / 2 : (o[0] + o[2]) / 2, y = vert ? o[1] - 4.2 : o[1] - 4.2, w = t.length * 5.6 + 8;
    bl += '<g class="blg"><rect x="' + (x - w / 2).toFixed(1) + '" y="' + (-y - 4.6).toFixed(1) + '" width="' + w.toFixed(1) + '" height="9.2" rx="4.6"/><text class="bl" x="' + x.toFixed(1) + '" y="' + (-y + 0.2).toFixed(1) + '">' + t + '</text></g>'; });
  if (!forPrint && MD.fac) MD.fac.forEach(function (f) { if (f[1] < e[0] - 40 || f[1] > e[2] + 40 || f[2] < e[1] - 40 || f[2] > e[3] + 40) return; fc += '<text class="fac" x="' + f[1] + '" y="' + (-f[2]) + '">' + esc(f[0]) + '</text>'; });
  if (!forPrint) { var cs = []; list.forEach(function (s) { (MD.byS[s] || []).forEach(function (h) { cs.push(Math.min(h.w, h.h)); }); }); cs.sort(function (a, b) { return a - b; }); ST.cell = cs[Math.floor(cs.length / 2)] || 6; }
  var pad = all ? 16 : 10, vb = [e[0] - pad, -e[3] - pad, e[2] - e[0] + pad * 2, e[3] - e[1] + pad * 2];
  if (!forPrint) ST.full = vb;
  var sweep = '';
  return '<svg class="mxs' + (all ? ' big' : '') + '" id="mxsvg" xmlns="http://www.w3.org/2000/svg" viewBox="' + vb.join(' ') + '" preserveAspectRatio="xMidYMid meet"><defs><filter id="mxglow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>' + g + fc + '<g id="mxh">' + hs + '</g>' + sweep + hn + bl + sn + '</svg>';
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
function labelOfKey(key) {
  if (ST.mode === 'con') return key;
  var ks = layerKeys(ST.P || {}); for (var i = 0; i < ks.length; i++) if (ks[i][0] === key) return ks[i][1];
  return '';
}
function wave() { var svg = document.getElementById('mxsvg'); if (!svg) return; svg.classList.remove('wave'); requestAnimationFrame(function () { svg.classList.add('wave'); }); clearTimeout(ST.wt); ST.wt = setTimeout(function () { svg.classList.remove('wave'); }, 1400); }
function colorOfKey(key, P) {
  if (ST.mode === 'con') return colorForCon(key);
  var ks = layerKeys(P); for (var i = 0; i < ks.length; i++) if (ks[i][0] === key) return ks[i][2];
  return null;
}
function paint() {
  var svg = document.getElementById('mxsvg'); if (!svg) return;
  var I = index(); ST.I = I; ST.cc = null; var list = secList(), cnt = {}, ccnt = {}, byKey = {}, stc = {};
  var P = ST.P = pre(I, list);
  if (!ST.rects) { ST.rects = []; svg.querySelectorAll('rect.hs').forEach(function (r) { var k = r.getAttribute('data-k'); if (MD.H[k]) ST.rects.push([r, MD.H[k], '', '']); }); }
  // حالة كل دار تنحسب مرة وحدة (كل القطاعات) وتنستخدم للأرقام وأزرار القطاعات
  allSecs().forEach(function (s) { (MD.byS[s] || []).forEach(function (h) { stc[mk(h.id)] = statusOf(h, I); }); });
  ST.stc = stc;
  var keys = {}, ecs = {};
  ST.rects.forEach(function (x) { var h = x[1], k = mk(h.id), ec = ecs[k] = effCon(h), key = keyOf(h, I, P); keys[k] = key; colorForCon(ec.group);
    cnt[key] = (cnt[key] || 0) + 1; ccnt[ec.group] = (ccnt[ec.group] || 0) + 1; (byKey[key] = byKey[key] || []).push(h); });
  ST.cnt = cnt; ST.ccnt = ccnt; ST.byKey = byKey; ST.ecs = ecs;
  var cmap = {}; layerKeys(P).forEach(function (x) { cmap[x[0]] = x[2]; }); ST.keys = keys; ST.cmap = cmap;
  ST.rects.forEach(function (x) {
    var r = x[0], h = x[1], k = mk(h.id), key = keys[k], ec = ecs[k];
    var fill = (ST.mode === 'con' ? colorForCon(key) : cmap[key]) || 'var(--mx-none)';
    if (x[2] !== fill) { r.style.fill = fill; x[2] = fill; }
    var dim = (ST.flt !== 'all' && key !== ST.flt) || (ST.con !== 'all' && ec.group !== ST.con);
    var cls = 'hs' + (h.s === 7 ? ' vip' : '') + (dim ? ' dim' : '') + (ST.mode === 'status' && I.rv[k] && key !== 'del' && key !== 'rev' ? ' rvm' : '') + (ST.sel === k ? ' sel' : '');
    if (x[3] !== cls) { r.setAttribute('class', cls); x[3] = cls; }
  });
  kpis(I, list); side(); legend();
}
function kpis(I, list) {
  var el = document.getElementById('mxkpi'); if (!el) return;
  var c = { all: 0, ws: 0, ready: 0, late: 0, del: 0, rev: 0, nw: 0, none: 0 };
  list.forEach(function (s) { (MD.byS[s] || []).forEach(function (h) { var k = mk(h.id), st = ST.stc[k], u = I.ws[k]; c.all++;
    if (st === 'del') c.del++; else if (u) { c.ws++; if (st === 'ready') c.ready++; if (st === 'late') c.late++; } else if (st === 'nw') c.nw++; else if (st === 'none') c.none++;
    if (I.rv[k] && st !== 'del') c.rev++; }); });
  var defs = [['all', 'دار بالخريطة', '🗺️', 'status', 'all', '', c.all], ['del', 'مسلّمة', '✅', 'status', 'del', 'g', c.all], ['ws', 'قيد التسليم', '🏗️', 'status', 'all', 'b', c.all], ['ready', 'جاهزة', '🔑', 'status', 'ready', 'b', c.ws],
    ['late', 'عابر وغير جاهزة', '⏰', 'status', 'late', 'r', c.ws], ['rev', 'بالمراجعة', '🔍', 'rev', 'all', 'p', c.all], ['nw', 'بانتظار التبليغ', '📨', 'status', 'nw', 't', c.all], ['none', 'ما وصلت', '⌛', 'status', 'none', '', c.all]];
  if (!el.firstChild) el.innerHTML = defs.filter(function (d) { return d[0] !== 'nw' || c.nw; }).map(function (d) { return '<button class="kpi ' + d[5] + '" data-mx="kpi" data-v="' + d[3] + '|' + d[4] + '" data-k="' + d[0] + '"><span class="ki">' + d[2] + '</span><b data-n="0">0</b><span class="kl">' + d[1] + '</span><i class="kb"><i></i></i></button>'; }).join('');
  el.querySelectorAll('.kpi').forEach(function (b) { var d = defs.filter(function (x) { return x[0] === b.dataset.k; })[0]; if (!d) return; var n = c[d[0]], base = d[6] || 1;
    countTo(b.querySelector('b'), n); b.querySelector('.kb i').style.width = (d[0] === 'all' ? 100 : Math.round(n * 100 / base)) + '%';
    b.classList.toggle('on', ST.mode === d[3] && ST.flt === d[4] && d[0] !== 'all' && d[0] !== 'ws'); });
  // تقدّم كل قطاع (نسبة المسلّم) على أزرار القطاعات
  document.querySelectorAll('#mxbar .sc').forEach(function (b) { var v = b.dataset.v, L = v === 'all' ? allSecs() : [+v], t = 0, dl = 0;
    L.forEach(function (s) { (MD.byS[s] || []).forEach(function (h) { t++; if (ST.stc[mk(h.id)] === 'del') dl++; }); });
    var p = t ? Math.round(dl * 100 / t) : 0; b.querySelector('.pb i').style.width = p + '%'; b.querySelector('small').textContent = 'مسلّم ' + p + '٪'; });
}
function countTo(el, n) { // عدّاد متحرك
  var from = +el.getAttribute('data-n') || 0; el.setAttribute('data-n', n); if (from === n) { el.textContent = n; return; }
  var t0 = performance.now(), d = 700; (function step(now) { var p = Math.min(1, (now - t0) / d), e = 1 - Math.pow(1 - p, 3); el.textContent = Math.round(from + (n - from) * e); if (p < 1) requestAnimationFrame(step); })(t0);
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
  if (false) h += '<div class="lg">' + (ST.mode === 'con' ? '<button data-mx="flt" data-v="all" class="' + (ST.flt === 'all' ? 'on' : '') + '"><i style="background:transparent"></i><span>الكل</span><b>' + tot + '</b></button>' : '') +
    keys.map(function (x) { var n = ST.cnt[x[0]] || 0; if (!n && (ST.mode === 'period' || ST.mode === 'eff')) return '';
      var extra = ''; if (ST.mode === 'eff') { var gs = Object.keys(P.eff).filter(function (g) { return effKey(P.eff[g].eff) === x[0]; }); if (gs.length) extra = '<small class="muted" style="grid-column:2/4;font-size:11.5px">' + gs.map(function (g) { return esc(g) + ' ' + P.eff[g].eff + '٪'; }).join(' · ') + '</small>'; }
      return '<button data-mx="flt" data-v="' + esc(x[0]) + '" class="' + (ST.flt === x[0] ? 'on' : '') + '"><i class="' + (x[2] ? '' : 'none-sw') + '" style="' + (x[2] ? 'background:' + x[2] : '') + '"></i><span>' + esc(x[1]) + '</span><b>' + n + '</b>' + extra + '</button>'; }).join('') + '</div>';
  h += '<p class="muted" style="font-size:12.5px;margin:0">' + esc(LAYER_HELP[ST.mode] || '') + '</p>';
  if (ST.mode === 'eff') h += '<p class="muted" style="font-size:12px;margin:8px 0 0">الكفاءة = 100 − (العابر موعدها وغير الجاهزة ÷ كل قيد التسليم)، لكل مقاول ضمن القطاع المعروض.</p>';
  if (ST.mode !== 'con') h += conFilter();
  if (MODE_VIEW[ST.mode]) h += '<button class="btn sm" style="margin-top:10px;width:100%" data-mx="view" data-v="' + MODE_VIEW[ST.mode] + '">📋 فتح الشاشة الكاملة (' + esc({ ws: 'قيد التسليم', weekly: 'كفاءة المقاولين', today: 'التنبيهات', rvsum: 'ملخص المراجعات', annual: 'الجرد السنوي', agenda: 'جدول الأعمال' }[MODE_VIEW[ST.mode]]) + ')</button>';
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
  el.innerHTML = h;
}
var LAYER_HELP = {
  status: 'لون كل دار = حالتها بالنظام الآن (من شيت قيد التسليم والمسلّمة والمراجعات).',
  alert: 'نفس تنبيهات النظام: الدور العابرة موعدها أو القريبة، والمراجعات المتأخرة.',
  rev: 'الدور اللي راجع عليها المستفيد، حسب عدد المراجعات وموقف الملاحظات.',
  wait: 'كم يوم صارلها الدار قيد التسليم من تاريخ الوارد.',
  con: 'الجهة المنفذة حسب الشيت. الدار اللي مو بالشيت تاخذ مقاولها من المخطط.',
  eff: 'كفاءة كل مقاول = 100 − نسبة دوره العابرة موعدها وغير الجاهزة.',
  period: 'الدور المسلّمة ملوّنة حسب شهر الاستلام.',
  today: 'الدور اللي صارت عليها حركة بجدول الأعمال.'
};
function legend() { // دليل الألوان والإطارات — دايماً ظاهر على الخريطة
  var el = document.getElementById('mxlg'); if (!el) return;
  var keys = layerKeys(ST.P || {}), tot = 0, list = secList(); Object.keys(ST.cnt).forEach(function (k) { tot += ST.cnt[k]; });
  var title = ST.mode === 'con' ? 'توزيع المقاولين' : ST.mode === 'eff' ? 'كفاءة المقاولين' : ST.mode === 'period' ? 'التسليم بالأشهر ' + ST.year : (LD[ST.mode] || {}).t;
  var rows = keys.map(function (x) { var n = ST.cnt[x[0]] || 0; if (!n) return '';
    return '<button data-mx="flt" data-v="' + esc(x[0]) + '" class="' + (ST.flt === x[0] ? 'on' : '') + '"><i class="' + (x[2] ? '' : 'none-sw') + '" style="' + (x[2] ? 'background:' + x[2] : '') + '"></i><span>' + esc(x[1]) + '</span><b>' + n + '</b></button>'; }).join('');
  var fr = '';
  function f(style, t) { fr += '<div class="fr"><i style="' + style + '"></i><span>' + t + '</span></div>'; }
  if (ST.mode === 'status' && ST.rects && ST.rects.some(function (x) { return x[3].indexOf('rvm') >= 0; })) f('border:2px solid #a77bff;background:transparent', 'إطار بنفسجي: الدار بيها مراجعة (وهي بعدها قيد التسليم أو ما وصلت)');
  if (list.indexOf(7) >= 0) f('border:2px solid #E2C47A;background:transparent', 'إطار ذهبي: دور VIP');
  if (ST.sel) f('border:2px solid #fff;background:transparent;box-shadow:0 0 0 1px #000', 'إطار أبيض عريض: الدار اللي اخترتها');
  if (ST.flt !== 'all' || ST.con !== 'all') f('background:var(--mx-none);opacity:.25', 'باهتة: خارج الاختيار الحالي (اضغط البند مرة ثانية حتى ترجع الكل)');
  f('background:var(--brand);border-radius:6px', 'شريط أزرق فوق الدور: رقم البلوك');
  if (list.length > 1) f('background:color-mix(in srgb,var(--brand) 30%,#0b1430);border:1px solid var(--brand);border-radius:6px', 'اسم القطاع: اضغطه حتى تفتح القطاع');
  f('border-top:1px solid var(--muted);background:transparent;border-radius:0;height:6px', 'خطوط رفيعة: حدود البلوكات والشوارع من المخطط');
  el.innerHTML = '<button class="hd" data-mx="lgt">🎨 ' + esc(title || '') + ' <small>' + tot + ' دار</small><i>▾</i></button><div class="bdy"><div class="lg">' + rows + '</div><h4>الإطارات والإشارات</h4>' + fr +
    (ST.mode === 'con' ? '<p>الألوان = الجهة المنفذة حسب الشيت؛ الدار اللي مو بالشيت حسب المخطط. «غير محدد» = ماكو مقاول لا بالشيت ولا بالمخطط.</p>' : '<p>اضغط أي لون حتى تبيّن دوره بس.</p>') + '</div>';
}
function conFilter() {
  var names = Object.keys(ST.ccnt).sort();
  return '<label class="fld" style="margin-top:10px">بيّن مقاول معيّن<select class="inp" id="mxcon"><option value="all">كل المقاولين</option>' + names.map(function (n) { return '<option' + (ST.con === n ? ' selected' : '') + ' value="' + esc(n) + '">' + esc(n) + ' (' + ST.ccnt[n] + ')</option>'; }).join('') + '</select></label>';
}
function housePanel(h) {
  var I = ST.I || index(), k = mk(h.id), u = I.ws[k], r = I.rv[k], d = I.del[k], st = statusOf(h, I), ec = effCon(h);
  var mism = ec.src === 'sheet' && conDiffers(h, ec.sheet);
  var known = !!(u || r || d || I.nw[k] || X.getSheetDate(h.id));
  var sysNo = u ? u.unit : (r ? r.houseNo : (d ? d.houseNo : h.id));
  var dd = u ? X.daysDiff(u.deliveryDate) : null, inc = u ? X.daysDiff(u.incomingDate) : null, dl = delDate(h, I);
  var nh = (X.nhStatusMap() || {})[X.normH(sysNo)];
  var rounds = r ? X.rvRounds(r).filter(function (x, i) { return i === 0 || x.reviewDate || x.completionDate; }) : [];
  var ag = ST.P && ST.P.agenda && ST.P.agenda[k];
  return '<div class="card"><div class="row" style="justify-content:space-between"><h2 style="margin:0;font-size:18px" class="ltr">' + esc(h.id) + '</h2><button class="iconbtn" data-mx="unsel" aria-label="إغلاق">' + X.ico('close') + '</button></div>' +
    '<span class="pill" style="background:' + (COLORS[st] || 'var(--mx-none)') + ';color:#06121f;margin-top:6px;display:inline-block">' + esc(ST_LBL[st]) + '</span>' +
    '<div class="kv2"><span>القطاع</span><b>' + esc(sectorName(h.s)) + '</b><span>البلوك</span><b class="ltr" style="text-align:right">' + esc(h.b) + '</b>' +
    '<span>الجهة المنفذة</span><b>' + esc(ec.label) + ' <small class="muted">(' + (ec.src === 'sheet' ? 'من الشيت' : 'من المخطط') + ')</small></b>' +
    (ec.src === 'sheet' && ec.draw !== ec.label ? '<span>بالمخطط</span><b>' + esc(ec.draw) + '</b>' : '') +
    (u ? '<span>تاريخ الوارد</span><b>' + esc(u.incomingDate || '-') + (inc !== null ? ' <small class="muted">(' + (-inc) + ' يوم)</small>' : '') + '</b>' +
      '<span>موعد التسليم</span><b>' + esc(u.deliveryDate || '-') + (dd !== null ? ' <small class="' + (dd <= 0 ? 'warnl' : 'muted') + '">(' + (dd > 0 ? 'باقي ' + dd + ' يوم' : dd === 0 ? 'اليوم' : 'متجاوز ' + (-dd) + ' يوم') + ')</small>' : '') + '</b>' +
      '<span>الجاهزية</span><b>' + (X.isReady(u.unit) ? '✅ جاهزة' : '⛔ غير جاهزة') + '</b>' : '') +
    (nh && nh.status === 'confirmed' && !nh.seed ? '<span>التبليغ</span><b>📨 تم تبليغ شعبة الإنهاءات</b>' : '') +
    (dl ? '<span>تاريخ الاستلام</span><b>' + esc(dl.raw) + '</b>' : (d ? '<span>تاريخ الاستلام</span><b>' + esc(d.date || '-') + '</b>' : '')) + '</div>' +
    (rounds.length ? '<div style="font-size:13px;margin:4px 0 8px"><b>🔍 المراجعات (' + rounds.length + ')' + (r.notesCompleted === true ? ' · ✅ أُكملت الملاحظات' : '') + '</b>' + rounds.map(function (x) { return '<div class="muted" style="font-size:12.5px">م' + x.n + ': حضور <span class="ltr">' + esc(x.reviewDate || '-') + '</span> ← إنهاء <span class="ltr">' + esc(x.completionDate || '-') + '</span></div>'; }).join('') + '</div>' : '') +
    (ag ? '<div style="font-size:12.5px;margin-bottom:6px"><b>📅 آخر حركة:</b> ' + esc((ag.last.action || '') + ' · ' + (ag.last.date || '') + (ag.last.by ? ' · ' + ag.last.by : '')) + '</div>' : '') +
    (mism ? '<div class="warnl">⚠️ المقاول بالشيت يختلف عن المخطط — المعتمد هو الشيت</div>' : '') +
    (u && u.sector && u.sector !== sectorName(h.s) ? '<div class="warnl">⚠️ القطاع بالشيت (' + esc(u.sector) + ') يختلف عن الخريطة</div>' : '') +
    (known ? '' : '<p class="muted" style="font-size:12.5px;margin:4px 0 0">الدار بعدها ما مسجّلة بأي شيت بالنظام.</p>') +
    '<div class="row" style="margin-top:10px;gap:8px;flex-wrap:wrap">' +
    (r ? '<button class="btn pri sm" data-act="newRound" data-id="' + esc(r.id) + '">➕ إضافة مراجعة</button>' : (known ? '<button class="btn pri sm" data-act="startReview" data-h="' + esc(sysNo) + '">➕ إضافة مراجعة</button>' : '')) +
    (known ? '<button class="btn sm" data-mx="srch" data-v="' + esc(sysNo) + '">🔍 فتح بالبحث (للتعديل)</button>' : '') + '</div>' +
    '<p class="muted" style="font-size:11.5px;margin:8px 0 0">الخريطة للعرض. أي تعديل على الدار من خانة البحث.</p></div>';
}

/* ---------- التكبير والسحب ---------- */
function curVB() { var k = String(ST.sec); return ST.vb[k] || ST.full.slice(); }
function boxSz() { var b = document.getElementById('mxbox'); return b ? { w: b.clientWidth || 1, h: b.clientHeight || 1 } : { w: 1, h: 1 }; }
function fitK(v, z) { return Math.min(z.w / v[2], z.h / v[3]); }
// السحب والتكبير يتحرك كصورة وحدة (سريع جداً)، وبعد ما توكف ينرسم المخطط من جديد بدقة كاملة
function applyVB() {
  var svg = document.getElementById('mxsvg'); if (!svg || !ST.full) return;
  var v = curVB(), z = boxSz(); clearTimeout(ST.cT); ST.cT = null;
  svg.style.transform = ''; svg.setAttribute('viewBox', v.map(function (n) { return n.toFixed(2); }).join(' ')); ST.base = v.slice();
  var k = fitK(v, z); svg.classList.toggle('zoomed', 1 / k < 0.3);
  // أرقام الدور تطلع كلما صار حجمها مقروء على الشاشة (بعرض المجمع كامل تكون أصغر من نقطة فتنخفي حتى ما تثقّل)
  svg.classList.toggle('nums', k * (ST.cell || 6) * 0.46 >= 4.2);
}
function showVB(v) {
  var svg = document.getElementById('mxsvg'); if (!svg) return; var b = ST.base; if (!b) { applyVB(); return; }
  var z = boxSz(), k0 = fitK(b, z), k1 = fitK(v, z), sc = k1 / k0;
  var ox0 = (z.w - b[2] * k0) / 2, oy0 = (z.h - b[3] * k0) / 2, ox1 = (z.w - v[2] * k1) / 2, oy1 = (z.h - v[3] * k1) / 2;
  var tx = k1 * (b[0] - v[0]) + ox1 - sc * ox0, ty = k1 * (b[1] - v[1]) + oy1 - sc * oy0;
  svg.style.transform = 'translate(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px) scale(' + sc.toFixed(4) + ')';
}
function setVB(v, now) { ST.vb[String(ST.sec)] = v; if (now) { applyVB(); return; } showVB(v); clearTimeout(ST.cT); ST.cT = setTimeout(function () { if (!ST.held) applyVB(); else setVB(curVB()); }, 180); }
function animVB(t, ms) { // حركة ناعمة للتكبير والتنقل
  var a = curVB(), t0 = performance.now(), d = ms || 420; cancelAnimationFrame(ST.raf);
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) { setVB(t, true); return; }
  (function step(now) { var p = Math.min(1, (now - t0) / d), e = 1 - Math.pow(1 - p, 3);
    var v = [0, 1, 2, 3].map(function (i) { return a[i] + (t[i] - a[i]) * e; }); if (p < 1) { setVB(v); ST.raf = requestAnimationFrame(step); } else setVB(v, true); })(t0);
}
function zoomAt(f, cx, cy) {
  var v = curVB(), nw = Math.min(ST.full[2] * 1.2, Math.max(25, v[2] * f)), k = nw / v[2], nh = v[3] * k;
  if (cx == null) { cx = v[0] + v[2] / 2; cy = v[1] + v[3] / 2; }
  var t = [cx - (cx - v[0]) * k, cy - (cy - v[1]) * k, nw, nh];
  if (ST.wheeling) setVB(t); else animVB(t, 300);
}
function toSVG(svg, px, py) { var b = document.getElementById('mxbox'), r = b.getBoundingClientRect(), v = curVB(), z = boxSz(), k = fitK(v, z);
  return { x: v[0] + (px - r.left - b.clientLeft - (z.w - v[2] * k) / 2) / k, y: v[1] + (py - r.top - b.clientTop - (z.h - v[3] * k) / 2) / k }; }
function focusHouse(k) {
  var h = MD.H[k]; if (!h) return false;
  if (ST.sec !== 'all' && +ST.sec !== h.s) { ST.sec = String(h.s); X.lsSet('mx_sec', ST.sec); ST.built = false; build(); }
  var w = 240, svg = document.getElementById('mxsvg'), box = boxSz(), hh = w * (box.h / box.w);
  animVB([h.x - w / 2, -h.y - hh / 2, w, hh], 650);
  ST.sel = k; ST.flt = 'all'; ST.con = 'all'; if (!ST.side) { ST.side = true; var rt = document.getElementById('mxroot'); if (rt) rt.classList.remove('sidehid'); } paint();
  var r = svg.querySelector('rect[data-k="' + k.replace(/"/g, '') + '"]'); if (r) { r.classList.remove('pulse'); void r.getBoundingClientRect(); r.classList.add('pulse'); }
  return true;
}
function wire() {
  var svg = document.getElementById('mxsvg'), box = document.getElementById('mxbox'); if (!svg) return;
  var P = {}, start = null, moved = 0, pinch = null;
  svg.addEventListener('pointerdown', function (e) { try { svg.setPointerCapture(e.pointerId); } catch (x) {} ST.held = true; P[e.pointerId] = { x: e.clientX, y: e.clientY }; moved = 0; start = { x: e.clientX, y: e.clientY, vb: curVB(), t: e.target };
    var ids = Object.keys(P); if (ids.length === 2) { var a = P[ids[0]], b = P[ids[1]]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), vb: curVB(), c: toSVG(svg, (a.x + b.x) / 2, (a.y + b.y) / 2) }; } });
  svg.addEventListener('pointermove', function (e) {
    if (!P[e.pointerId]) return; P[e.pointerId] = { x: e.clientX, y: e.clientY };
    var ids = Object.keys(P);
    if (ids.length >= 2 && pinch) { var a = P[ids[0]], b = P[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y); if (d < 5) return; var f = pinch.d / d, v = pinch.vb, nw = Math.min(ST.full[2] * 1.2, Math.max(25, v[2] * f)), k = nw / v[2];
      setVB([pinch.c.x - (pinch.c.x - v[0]) * k, pinch.c.y - (pinch.c.y - v[1]) * k, nw, v[3] * k]); moved = 99; return; }
    if (!start) return;
    var dx = e.clientX - start.x, dy = e.clientY - start.y; moved = Math.max(moved, Math.abs(dx) + Math.abs(dy));
    if (moved < 4) return;
    var v = start.vb, upp = 1 / fitK(v, boxSz());
    setVB([v[0] - dx * upp, v[1] - dy * upp, v[2], v[3]]);
  });
  function up(e) {
    var t = start && start.t, wasPinch = !!pinch; delete P[e.pointerId]; if (Object.keys(P).length < 2) pinch = null; if (!Object.keys(P).length) { ST.held = false; if (ST.cT) applyVB(); }
    // بعد التكبير بإصبعين: الإصبع الباقي يكمل من الزوم الجديد (ما يرجع للقديم)
    var rest = Object.keys(P); if (wasPinch && rest.length === 1) { var q = P[rest[0]]; start = { x: q.x, y: q.y, vb: curVB(), t: null }; moved = 99; return; }
    if (Object.keys(P).length === 0) { if (moved < 6 && t && t.closest) { var sb = t.closest('.snb'); if (sb) { ST.sec = sb.getAttribute('data-v'); X.lsSet('mx_sec', ST.sec); ST.built = false; build(); wave(); start = null; return; } }
      if (moved < 6 && t && t.getAttribute && t.getAttribute('data-k')) tapHouse(t.getAttribute('data-k')); start = null; }
  }
  svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', function (e) { delete P[e.pointerId]; pinch = null; if (!Object.keys(P).length) { ST.held = false; if (ST.cT) applyVB(); } var rest = Object.keys(P); start = rest.length ? { x: P[rest[0]].x, y: P[rest[0]].y, vb: curVB(), t: null } : null; });
  svg.addEventListener('wheel', function (e) { e.preventDefault(); var p = toSVG(svg, e.clientX, e.clientY); ST.wheeling = true; zoomAt(e.deltaY > 0 ? 1.18 : 1 / 1.18, p.x, p.y); ST.wheeling = false; }, { passive: false });
  // بطاقة صغيرة فوق الدار عند المرور عليها
  var tip = document.getElementById('mxtip');
  svg.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse' || !tip) return; var k = e.target.getAttribute && e.target.getAttribute('data-k'); if (!k || !MD.H[k]) { tip.hidden = true; return; }
    var h = MD.H[k], key = ST.keys && ST.keys[k], bx = box.getBoundingClientRect();
    tip.innerHTML = '<b class="ltr">' + esc(h.id) + '</b><span><i style="background:' + ((ST.mode === 'con' ? colorForCon(key) : (ST.cmap || {})[key]) || 'var(--mx-none)') + '"></i>' + esc(labelOfKey(key)) + '</span><small>' + esc(sectorName(h.s) + ' · ' + effCon(h).label) + '</small>';
    tip.hidden = false; tip.style.left = Math.min(bx.width - 200, e.clientX - bx.left + 14) + 'px'; tip.style.top = Math.max(8, e.clientY - bx.top - 70) + 'px';
  });
  svg.addEventListener('pointerleave', function () { if (tip) tip.hidden = true; });
}
function tapHouse(k) {
  ST.sel = ST.sel === k ? null : k; if (ST.sel && !ST.side) { ST.side = true; var rt = document.getElementById('mxroot'); if (rt) rt.classList.remove('sidehid'); } paint();
}

/* ---------- الأحداث ---------- */
document.addEventListener('click', function (e) {
  var b = e.target.closest && e.target.closest('[data-mx]'); if (!b || !MD) return;
  var a = b.dataset.mx, v = b.dataset.v;
  if (a === 'sec') { ST.sec = v; X.lsSet('mx_sec', v); ST.built = false; ST.sel = null; build(); wave(); }
  else if (a === 'mode') { ST.mode = v; ST.flt = 'all'; X.lsSet('mx_mode', v); syncToolbar(); paint(); wave(); }
  else if (a === 'view') X.ACT.go({ v: v });
  else if (a === 'flt') { ST.flt = ST.flt === v ? 'all' : v; paint(); }
  else if (a === 'kpi') { var kv = v.split('|'); ST.mode = kv[0]; ST.flt = kv[1]; X.lsSet('mx_mode', ST.mode); syncToolbar(); paint(); wave(); }
  else if (a === 'year') { ST.year = v; ST.flt = 'all'; paint(); }
  else if (a === 'go2') focusHouse(v);
  else if (a === 'zin') zoomAt(1 / 1.4); else if (a === 'zout') zoomAt(1.4); else if (a === 'zfit') animVB(ST.full.slice(), 450);
  else if (a === 'unsel') { ST.sel = null; paint(); }
  else if (a === 'side') { ST.side = !ST.side; var rt = document.getElementById('mxroot'); if (rt) rt.classList.toggle('sidehid', !ST.side); }
  else if (a === 'open') X.openHouse(v);
  else if (a === 'srch') { S.q = v; S.sel = null; X.ACT.go({ v: 'search' }); }
  else if (a === 'lgt') { ST.lgc = !ST.lgc; X.lsSet('mx_lgc', ST.lgc ? 1 : 0); var lg = document.getElementById('mxlg'); if (lg) lg.classList.toggle('cl', ST.lgc); }
  else if (a === 'check') checkModal();
  else if (a === 'count') countModal();
  else if (a === 'print') printMap();
  else if (a === 'go') { X.closeModal(); setTimeout(function () { focusHouse(v); }, 60); }
  else if (a === 'xcheck') exportCheck();
  else if (a === 'xcount') exportCount();
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

/* ---------- فحص التطابق ---------- */
function checks() {
  var I = index(), notOnMap = [], conDiff = [], secDiff = [], vip = 0, seen = {};
  function chk(no, src, sec) {
    var k = mk(no); if (!k || seen[k + src]) return; seen[k + src] = 1;
    if (MD.H[k]) return;
    notOnMap.push({ h: no, src: src, sec: sec || '' });
  }
  S.wsAll.forEach(function (u) { chk(u.unit, 'الموقف الأسبوعي', u.sector); });
  S.del.forEach(function (x) { chk(x.houseNo, 'شيت تواريخ الاستلام', x.sector); });
  X.oldRecs().forEach(function (r) { chk(r.houseNo, 'المراجعات', r.sectorNo); });
  ST.I = I; ST.dn = null;
  X.wsUnits().forEach(function (u) {
    var h = MD.H[mk(u.unit)]; if (!h) return;
    var sc = X.unitCon(u);
    if (conDiffers(h, sc)) conDiff.push({ h: u.unit, k: mk(u.unit), map: effCon(h).draw, sheet: sc || '-' });
    if (u.sector && u.sector !== sectorName(h.s)) secDiff.push({ h: u.unit, k: mk(u.unit), map: sectorName(h.s), sheet: u.sector });
  });
  // ملاحظات الرسم نفسه
  var draw = [];
  allSecs().filter(function (s) { return s <= 6; }).forEach(function (s) {
    var c = {}; (MD.byS[s] || []).forEach(function (h) { var n = h.con0 || ''; c[n] = (c[n] || 0) + 1; });
    // الألوان معتمدة (قرار المستخدم) — ما نقارن ويه أرقام مفتاح الألوان المكتوبة بالرسم
    if (s > 2 && c['']) draw.push(sectorName(s) + ': ' + c[''] + ' دار بدون لون مقاول بالرسم (بلوكات: ' + uniq((MD.byS[s] || []).filter(function (h) { return !h.con0; }).map(function (h) { return h.b; })).join('، ') + ')');
  });
  MD.blocks.forEach(function (b) { if (b[0].indexOf('؟') === 0) draw.push(sectorName(b[1]) + ': بلوك مكتوب بالرسم بصيغة غير طبيعية (' + b[0].replace('؟', '') + ') ورقمه يتكرر ويه بلوك ثاني — يحتاج تأكيد'); });
  return { notOnMap: notOnMap, conDiff: conDiff, secDiff: secDiff, vip: vip, draw: draw };
}
function conDiffers(h, sc) { // هل مقاول الشيت غير مقاول المخطط؟
  if (!sc) return false; var dd = h.dir0 || isDirectCon(h.con0), ds = isDirectCon(sc);
  if (dd || ds) return dd !== ds; if (!h.con0) return true; return !sameCon(h.con0, sc); }
function uniq(a) { var o = {}; a.forEach(function (x) { o[x] = 1; }); return Object.keys(o); }
function checkModal() {
  var C = checks();
  function sec(t, n, body) { return '<h3 class="mxsec">' + t + ' <span class="pill ' + (n ? 'p-not' : 'p-ok') + '">' + n + '</span></h3>' + (n ? body : '<p class="muted" style="margin:0">✅ ماكو</p>'); }
  var h = '<p class="muted" style="margin:0 0 6px;font-size:13px;line-height:1.7">الخريطة تاخذ الحالة والمقاول من الشيت (النظام)، والمخطط يعطي مكان الدار ومقاولها الأصلي. هنا تطلع الأماكن اللي الاثنين ما متفقين بيها. اضغط أي دار حتى تروح عليها.</p>' +
    sec('أرقام دور بالشيتات ما موجودة بالمخطط (غلط كتابة بالشيت أو دار ناقصة بالمخطط) — هذي ما تطلع على الخريطة', C.notOnMap.length, '<div class="mxlist">' + C.notOnMap.map(function (x) { return '<button disabled><b class="ltr">' + esc(x.h) + '</b><small>' + esc(x.src) + (x.sec ? ' · ' + esc(x.sec) : '') + '</small></button>'; }).join('') + '</div>') +
    sec('دور قيد التسليم مقاولها بالشيت غير مقاولها بالمخطط — الخريطة تعتمد الشيت', C.conDiff.length, '<div class="mxlist">' + C.conDiff.map(function (x) { return '<button data-mx="go" data-v="' + esc(x.k) + '"><b class="ltr">' + esc(x.h) + '</b><small>الخريطة: ' + esc(x.map) + ' · الشيت: ' + esc(x.sheet) + '</small></button>'; }).join('') + '</div>') +
    sec('دور قطاعها بالشيت غير قطاعها بالمخطط', C.secDiff.length, '<div class="mxlist">' + C.secDiff.map(function (x) { return '<button data-mx="go" data-v="' + esc(x.k) + '"><b class="ltr">' + esc(x.h) + '</b><small>الخريطة: ' + esc(x.map) + ' · الشيت: ' + esc(x.sheet) + '</small></button>'; }).join('') + '</div>') +
    sec('ملاحظات على الرسم نفسه (تحتاج مراجعتك)', C.draw.length, '<ul style="margin:0;padding-inline-start:18px;font-size:13px;line-height:1.8">' + C.draw.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>') +
''; 
  X.openModal('<header><h3>🔎 الفرق بين الشيت والمخطط</h3><button class="iconbtn" data-act="closeModal" aria-label="إغلاق">' + X.ico('close') + '</button></header><div class="bd">' + h + '</div><footer><button class="btn wa" data-mx="xcheck">' + X.ico('xls', 16) + ' تصدير Excel</button><button class="btn" data-act="closeModal">إغلاق</button></footer>', true);
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
  var I = index(), T = {}; ST.I = I; ST.cc = null;
  list.forEach(function (s) {
    (MD.byS[s] || []).forEach(function (h) {
      var g = effCon(h).group, st = statusOf(h, I), key = s + '|' + g; // ST.I مضبوط بالأعلى
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
  X.openModal('<header><h3>📊 الحصر الحقيقي · ' + esc(ST.sec === 'all' ? 'كل القطاعات' : sectorName(+ST.sec)) + '</h3><button class="iconbtn" data-act="closeModal" aria-label="إغلاق">' + X.ico('close') + '</button></header><div class="bd">' + h + '</div><footer><button class="btn wa" data-mx="xcount">' + X.ico('xls', 16) + ' تصدير Excel</button><button class="btn" data-act="closeModal">إغلاق</button></footer>', true);
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

/* ---------- دائرة المقاولين ----------
   الكلي والمسلّمة والمتبقية وقيد التسليم: من شيت «موقف المقاولين»
   قيد التسليم بالتفصيل (غير عابر / عابر جاهز / عابر غير جاهز / مع مراجعات): من النظام (الموقف الأسبوعي + الجاهزية + المراجعات)
   المخطط: يعرض أماكن الدور على الخريطة بس */
var CX = { open: {} };
X.ICONS.cons = 'M4 20v-2a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v2M12 11a4 4 0 1 0 0-8a4 4 0 0 0 0 8z';
X.HUB_LBL.cons = 'المقاولين';
X.TITLES.cons = 'المقاولين';
if (X.HUB.indexOf('cons') < 0) X.HUB.splice(Math.max(0, X.HUB.indexOf('weekly')), 0, 'cons');
if (!X.NAV.some(function (n) { return n[0] === 'cons'; })) { var wi = X.NAV.map(function (n) { return n[0]; }).indexOf('weekly'); X.NAV.splice(wi >= 0 ? wi : X.NAV.length - 1, 0, ['cons', 'المقاولين']); }
(function () { var hs = X.hubStats; X.hubStats = function () { var o = hs ? hs() : {}; var n = {}; (X.S.cw || []).forEach(function (r) { if (r.contractor && !/المجموع/.test(r.contractor)) n[X.arN(r.contractor)] = 1; }); o.cons = { c: Object.keys(n).length ? Object.keys(n).length + ' مقاول' : 'موقف كل مقاول', p: null }; return o; }; })();
var CXK = [['all', 'عدد الدور الكلي'], ['del', 'المسلّمة'], ['rem', 'المتبقية'], ['ws', 'قيد التسليم'], ['wsOk', 'غير عابر موعدها'], ['wsOverR', 'عابر جاهز'], ['wsOverN', 'عابر غير جاهز (بدون مراجعات)'], ['wsOverNRev', 'عابر غير جاهز مع مراجعات']];
function cxLbl(k) { for (var i = 0; i < CXK.length; i++) if (CXK[i][0] === k) return CXK[i][1]; return k; }
var SECW = [['الاول', 1], ['الثاني', 2], ['الثالث', 3], ['الرابع', 4], ['الخامس', 5], ['السادس', 6]];
function secNo(t) { t = String(t || ''); if (/vip/i.test(t)) return 7; var a = X.arN(t); for (var i = 0; i < SECW.length; i++) if (a.indexOf(SECW[i][0]) >= 0) return SECW[i][1]; var m = t.match(/[1-7١-٧]/); return m ? (+m[0] || '١٢٣٤٥٦٧'.indexOf(m[0]) + 1) : 0; }
function secLbl(s) { return s ? sectorName(s) : 'قطاع غير معروف'; }
function cxMatch(name, cands) { // يطابق اسم الشيت الأسبوعي/المخطط ويّا اسم بموقف المقاولين (نفس القطاع)
  if (!name) return null; var a = X.arN(name), ex = cands.filter(function (c) { return X.arN(c).replace(/ /g, '') === a.replace(/ /g, ''); }); if (ex.length) return ex[0];
  var sub = cands.filter(function (c) { return sameCon(c, name); }); if (sub.length <= 1) return sub[0] || null;
  var last = arTok(name).pop(), l2 = sub.filter(function (c) { return arTok(c).pop() === last; }); if (l2.length === 1) return l2[0];
  var f2 = sub.filter(function (c) { return arTok(c)[0] === arTok(name)[0] && arTok(c).length === arTok(name).length; }); return f2.length === 1 ? f2[0] : sub[0];
}
// جهات التنفيذ المباشر (نفس التقسيم المعتمد بالنظام — المشالة من كفاءة المقاولين)
var DIRECT_CW = ['احمد عواد', 'عادل محمد عرار', 'يوسف حسن', 'دياري كريم', 'جاسم زراك'];
var DIRG = 'التنفيذ المباشر';
function cwDirect(n) { return DIRECT_CW.some(function (d) { return X.arN(d).replace(/ /g, '') === X.arN(n).replace(/ /g, '') || sameCon(d, n); }); }
function cxBlank(s) { return { s: s, cw: { all: 0, del: 0, ws: 0, rem: 0 }, cwHas: false, ws: [], wsOk: [], wsOverR: [], wsOverN: [], wsOverNRev: [], mAll: [], mDel: [], mRem: [] }; }
function conData() {
  var now = X.todayStr();
  if (CX.cache && CX.cache.t === now && CX.cache.n === X.S._metaT && CX.cache.db === X.S.db && CX.cache.ws === X.S.wsAll && CX.cache.del === X.S.del && CX.cache.cw === X.S.cw) return CX.cache.d;
  var I = index(); ST.I = I; var G = {}, bySec = {}, order = [];
  function grp(g) { if (!G[g]) { G[g] = cxBlank(0); G[g].g = g; G[g].sec = {}; order.push(g); } return G[g]; }
  function sec(g, s) { var o = grp(g); return o.sec[s] = o.sec[s] || cxBlank(s); }
  function n(v) { var x = Number(String(v == null ? '' : v).replace(/[^\d.-]/g, '')); return isNaN(x) ? 0 : x; }
  function rvN(r) { return r ? X.rvRounds(r).filter(function (x, i) { return i === 0 || x.reviewDate || x.completionDate; }).length : 0; }
  // 1) موقف المقاولين — المصدر للكلي والمسلّمة والمتبقية وقيد التسليم
  (X.S.cw || []).forEach(function (r) {
    var c = String(r.contractor || '').trim(); if (!c || /المجموع|مجموع/.test(c)) return;
    var known = order.filter(function (g) { return X.arN(g).replace(/ /g, '') === X.arN(c).replace(/ /g, ''); })[0], g = known || c, s = secNo(r.sector);
    var q = sec(g, s), o = G[g]; [o, q].forEach(function (z) { z.cwHas = true; z.cw.all += n(r.total); z.cw.del += n(r.delivered); z.cw.ws += n(r.inProgress); z.cw.rem += n(r.remaining); });
    (bySec[s] = bySec[s] || []).indexOf(g) < 0 && bySec[s].push(g);
  });
  // 2) قيد التسليم بالتفصيل من النظام
  X.wsUnits().forEach(function (u) {
    var s = secNo(u.sector), nm = u.sheetContractor || u.contractor || '', h = MD.H[mk(u.unit)];
    if (!s && h) s = h.s;
    var g = cxMatch(nm, bySec[s] || []) || (X.isDirectExec(u.executionType) ? 'تنفيذ مباشر (اسمه بالأسبوعي ما يطابق الموقف: ' + (nm || '—') + ')' : '⚠️ ' + (nm || 'بدون مقاول') + ' (بالموقف الأسبوعي وما موجود بموقف المقاولين)');
    var it = { id: u.unit, s: s, u: u, inc: u.incomingDate || '', dlv: u.deliveryDate || '', dd: X.daysDiff(u.deliveryDate), ready: X.isReady(u.unit), rv: rvN(I.rv[mk(u.unit)]), off: !h };
    var key = it.dd !== null && it.dd <= 0 ? (it.ready ? 'wsOverR' : (it.rv ? 'wsOverNRev' : 'wsOverN')) : 'wsOk';
    [grp(g), sec(g, s)].forEach(function (z) { z.ws.push(it); z[key].push(it); });
  });
  // 3) أماكن الدور من المخطط (للعرض والقوائم) — القطاعات اللي المخطط بيه توزيع مقاولينها
  allSecs().forEach(function (s) { (MD.byS[s] || []).forEach(function (h) {
    if (!h.con0) return; var g = cxMatch(h.con0, bySec[s] || []); if (!g) return;
    var k = mk(h.id), u = I.ws[k], dd = I.del[k] ? (I.del[k].date || '✓') : X.getSheetDate(h.id), it = { id: h.id, s: s, u: u || null, ddate: dd || '', rv: rvN(I.rv[k]), dlv: u ? u.deliveryDate || '' : '', dd: u ? X.daysDiff(u.deliveryDate) : null, ready: u ? X.isReady(u.unit) : false };
    [grp(g), sec(g, s)].forEach(function (z) { z.mAll.push(it); if (dd) z.mDel.push(it); else if (!u) z.mRem.push(it); });
  }); });
  // التنفيذ المباشر بخانة وحدها: كل جهاته تنجمع بكارت واحد
  var members = [], dir = cxBlank(0); dir.g = DIRG; dir.sec = {}; dir.isDir = true;
  order = order.filter(function (g) { if (!(cwDirect(g) || /^تنفيذ مباشر/.test(g))) return true; members.push(G[g]); return false; });
  function merge(a, b) { if (b.cwHas) a.cwHas = true; ['all', 'del', 'ws', 'rem'].forEach(function (k) { a.cw[k] += b.cw[k]; }); ['ws', 'wsOk', 'wsOverR', 'wsOverN', 'wsOverNRev', 'mAll', 'mDel', 'mRem'].forEach(function (k) { a[k] = a[k].concat(b[k]); }); }
  members.forEach(function (o) { merge(dir, o); Object.keys(o.sec).forEach(function (s) { dir.sec[s] = dir.sec[s] || cxBlank(+s); merge(dir.sec[s], o.sec[s]); }); });
  dir.members = members.sort(function (a, b) { return b.cw.all - a.cw.all; });
  var list = order.map(function (g) { return G[g]; }).sort(function (a, b) { return (a.cwHas === b.cwHas ? 0 : a.cwHas ? -1 : 1) || b.cw.all - a.cw.all; });
  if (members.length) list.push(dir);
  var tot = cxBlank(0); tot.cwHas = true; list.forEach(function (o) { ['all', 'del', 'ws', 'rem'].forEach(function (k) { tot.cw[k] += o.cw[k]; }); ['ws', 'wsOk', 'wsOverR', 'wsOverN', 'wsOverNRev', 'mAll', 'mDel', 'mRem'].forEach(function (k) { tot[k] = tot[k].concat(o[k]); }); });
  var d = { list: list, tot: tot }; CX.cache = { t: now, n: X.S._metaT, db: X.S.db, ws: X.S.wsAll, del: X.S.del, cw: X.S.cw, d: d }; return d;
}
function cxVal(z, k) { return k === 'all' || k === 'del' || k === 'rem' ? z.cw[k] : k === 'wsCw' ? z.cw.ws : z[k].length; }
function cxNum(g, s, k, z, cls) { var v = k === 'ws' ? z.cw.ws : cxVal(z, k), bad = k === 'ws' && z.cwHas && z.cw.ws !== z.ws.length;
  return '<button class="cxn ' + (cls || '') + (bad ? ' bad' : '') + '" data-cx="list" data-g="' + esc(g) + '" data-s="' + s + '" data-k="' + k + '"><b>' + v + '</b><span>' + esc(cxLbl(k)) + '</span>' + (k === 'ws' ? '<small>' + (bad ? '⚠️ بالأسبوعي ' + z.ws.length + ' (غير مطابق)' : '✓ يطابق الأسبوعي') + '</small>' : '') + '</button>'; }
function cxCss() {
  if (document.getElementById('cxcss')) return; var st = document.createElement('style'); st.id = 'cxcss';
  st.textContent = [
    '.cx{display:flex;flex-direction:column;gap:12px}',
    '.cx .cxtop{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.cx .cxtop .inp{flex:1 1 220px}',
    '.cx .cxc{padding:14px 16px;display:flex;flex-direction:column;gap:10px}',
    '.cx .cxh{display:flex;align-items:baseline;justify-content:space-between;gap:10px;flex-wrap:wrap}.cx .cxh b{font-size:17px}.cx .cxh small{color:var(--muted);font-size:12.5px}',
    '.cx .cxbar{display:flex;height:12px;border-radius:7px;overflow:hidden;background:var(--soft2)}.cx .cxbar i{display:block;height:100%;transition:width .8s cubic-bezier(.2,.8,.2,1)}',
    '.cx .cxbar .d{background:#2ecc71}.cx .cxbar .w{background:#3fa9f5}.cx .cxbar .y{background:#f5a623}.cx .cxbar .o{background:#ff4d5e}.cx .cxbar .p{background:#a77bff}.cx .cxbar .r{background:#b8c0d4}',
    '.cx .cxrow{display:flex;flex-wrap:wrap;gap:6px}',
    '.cx .cxn{display:flex;flex-direction:column;align-items:center;gap:1px;min-width:84px;padding:7px 10px;border-radius:12px;border:1px solid var(--line);background:var(--soft2);color:var(--ink);font:inherit;cursor:pointer;transition:transform .15s,border-color .2s}',
    '.cx .cxn:hover{transform:translateY(-2px);border-color:var(--brand)}.cx .cxn:disabled{opacity:.45;cursor:default;transform:none}',
    '.cx .cxn b{font-family:"Readex Pro";font-size:19px;font-variant-numeric:tabular-nums}.cx .cxn span{font-size:11.5px;color:var(--muted);white-space:nowrap}',
    '.cx .cxn.t b{color:var(--ink)}.cx .cxn.w b{color:#3fa9f5}.cx .cxn.g b{color:#2ecc71}.cx .cxn.y b{color:#f5a623}.cx .cxn.o b{color:#ff4d5e}.cx .cxn.p b{color:#a77bff}.cx .cxn.r b{color:var(--muted)}',
    '.cx .cxn small{font-size:10.5px;color:#2ecc71}.cx .cxn.bad{border-color:#ff4d5e}.cx .cxn.bad small{color:#ff6b7d}.cx .cxt button.bad{color:#ff6b7d;outline:1px solid #ff4d5e}',
    '.cx .cxn.tg{border-color:#3fa9f5}.cx .cxn.tg span::after{content:" ▾"}.cx .cxn.tg.on span::after{content:" ▴"}',
    '.cx .cxsub{display:flex;flex-wrap:wrap;gap:6px;padding:8px;border-radius:12px;background:color-mix(in srgb,#3fa9f5 8%,transparent);border:1px dashed color-mix(in srgb,#3fa9f5 45%,transparent)}',
    '.cx .cxt{width:100%;border-collapse:collapse;font-size:13px}.cx .cxt th,.cx .cxt td{border-top:1px solid var(--line);padding:5px 6px;text-align:center}.cx .cxt th{color:var(--muted);font-weight:600;font-size:12px}.cx .cxt td:first-child,.cx .cxt th:first-child{text-align:right}',
    '.cx .cxt button{border:0;background:transparent;color:inherit;font:inherit;font-family:"Readex Pro";font-weight:700;cursor:pointer;padding:2px 8px;border-radius:8px}.cx .cxt button:hover{background:var(--soft)}.cx .cxt button:disabled{color:var(--muted);font-weight:400;cursor:default;background:none}',
    '.cx .cxt tr.cwr td{color:var(--muted);font-size:11.5px;border-top:0;padding-top:0}.cx .cxt .y{color:#f5a623}.cx .cxt .o{color:#ff4d5e}.cx .cxt .p{color:#a77bff}.cx .cxt .w{color:#3fa9f5}.cx .cxt .g{color:#2ecc71}',
    '.cxl{display:flex;flex-direction:column;gap:4px;max-height:58vh;overflow:auto}.cxl button{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;border:1px solid var(--line);background:var(--soft2);color:var(--ink);border-radius:10px;padding:8px 10px;font:inherit;font-size:13px;cursor:pointer;text-align:right}.cxl small{color:var(--muted)}'
  ].join('\n'); document.head.appendChild(st);
}
X.VIEWS.cons = function () {
  cxCss();
  if (!MD) { if (!MDerr) load(); return '<div class="card empty">' + (MDerr ? '⚠️ تعذّر تحميل المخطط: ' + esc(MDerr) : '⏳ جاري التحميل…') + '</div>'; }
  if (!(X.S.cw || []).length) return '<div class="card empty">⏳ بعد ما انقرا شيت «موقف المقاولين» — اضغط تحديث من الشيتات.</div>';
  var D = conData(), q = X.arN(CX.q || ''), T = D.tot;
  var list = D.list.filter(function (o) { return !q || X.arN(o.g).indexOf(q) >= 0; });
  var h = '<div class="cx"><div class="card cxc"><div class="cxtop"><input class="inp" id="cxq" type="search" data-cxin="q" value="' + esc(CX.q || '') + '" placeholder="🔍 اسم المقاول"><button class="btn wa" data-cx="xsum">' + X.ico('xls', 16) + ' تصدير الملخص Excel</button></div>' +
    '<div class="cxrow">' + cxNum('*', 0, 'all', T, 't') + cxNum('*', 0, 'del', T, 'g') + cxNum('*', 0, 'rem', T, 'r') + cxNum('*', 0, 'ws', T, 'w') + '</div>' +
    '<div class="cxsub">' + cxNum('*', 0, 'wsOk', T, 'g') + cxNum('*', 0, 'wsOverR', T, 'y') + cxNum('*', 0, 'wsOverN', T, 'o') + cxNum('*', 0, 'wsOverNRev', T, 'p') + '</div>' +
    '<p class="muted" style="margin:0;font-size:12.5px;line-height:1.7">📄 <b>الكلي والمسلّمة والمتبقية وقيد التسليم</b> من شيت موقف المقاولين' + (X.S.cwLast ? ' (آخر مزامنة ' + esc(X.S.cwLast) + ')' : '') + ' · 🏗️ <b>تفصيل قيد التسليم</b> (عابر / جاهز / مراجعات) من النظام · ✓ قيد التسليم ينقارن ويّا الموقف الأسبوعي، وإذا ما تطابق يطلع ⚠️. اضغط أي رقم حتى تطلع دوره (أماكنها من المخطط) وتصدّرها Excel.</p></div>';
  h += list.map(function (o) {
    var N = o.cw.all || 1, open = !!CX.open[o.g], pd = Math.round(o.cw.del * 100 / N), secs = Object.keys(o.sec).map(Number).sort(function (a, b) { return a - b; });
    var sum = o.cw.del + o.cw.ws + o.cw.rem, sumBad = o.cwHas && sum !== o.cw.all;
    function cell(s, k, cls) { var z = o.sec[s], v = k === 'wsCw' ? z.cw.ws : cxVal(z, k), bad = k === 'ws' && z.cwHas && z.cw.ws !== z.ws.length;
      return '<td><button class="' + (cls || '') + (bad ? ' bad' : '') + '" data-cx="list" data-g="' + esc(o.g) + '" data-s="' + s + '" data-k="' + (k === 'wsCw' ? 'ws' : k) + '"' + (v ? '' : ' disabled') + '>' + v + '</button></td>'; }
    var wsw = function (k) { return (o[k].length * 100 / N) + '%'; };
    var mem = o.isDir ? '<div class="scroll"><table class="cxt"><thead><tr><th>الجهة</th><th>الكلي</th><th>المسلّمة</th><th>المتبقية</th><th>قيد التسليم (موقف المقاولين)</th><th>قيد التسليم (الأسبوعي)</th></tr></thead><tbody>' + o.members.map(function (m) { var bad = m.cwHas && m.cw.ws !== m.ws.length;
      return '<tr><td>' + esc(m.g) + '</td><td>' + m.cw.all + '</td><td class="g">' + m.cw.del + '</td><td>' + m.cw.rem + '</td><td class="w">' + m.cw.ws + '</td><td' + (bad ? ' class="o"' : '') + '>' + m.ws.length + (bad ? ' ⚠️' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>' : '';
    return (o.isDir ? '<h2 style="margin:10px 4px 0;font-size:17px">🏢 التنفيذ المباشر</h2>' : '') + '<div class="card cxc"><div class="cxh"><b>' + (o.isDir ? '🏢 ' : '👷 ') + esc(o.g) + '</b><small>' + (o.cwHas ? o.cw.all + ' دار · مسلّم ' + pd + '٪' : 'ما موجود بموقف المقاولين') + '</small></div>' +
      (o.cwHas ? '<div class="cxbar" title="أخضر مسلّمة · أزرق غير عابر · أصفر عابر جاهز · أحمر عابر غير جاهز · بنفسجي مع مراجعات · رمادي متبقية"><i class="d" style="width:' + (o.cw.del * 100 / N) + '%"></i><i class="w" style="width:' + wsw('wsOk') + '"></i><i class="y" style="width:' + wsw('wsOverR') + '"></i><i class="o" style="width:' + wsw('wsOverN') + '"></i><i class="p" style="width:' + wsw('wsOverNRev') + '"></i><i class="r" style="width:' + (o.cw.rem * 100 / N) + '%"></i></div>' : '') +
      '<div class="cxrow">' + (o.cwHas ? cxNum(o.g, 0, 'all', o, 't') + cxNum(o.g, 0, 'del', o, 'g') + cxNum(o.g, 0, 'rem', o, 'r') : '') +
      '<button class="cxn w tg' + (open ? ' on' : '') + (o.cwHas && o.cw.ws !== o.ws.length ? ' bad' : '') + '" data-cx="tog" data-g="' + esc(o.g) + '"><b>' + (o.cwHas ? o.cw.ws : o.ws.length) + '</b><span>قيد التسليم</span><small>' + (!o.cwHas ? 'بالأسبوعي بس' : o.cw.ws === o.ws.length ? '✓ يطابق الأسبوعي' : '⚠️ بالأسبوعي ' + o.ws.length + ' (غير مطابق)') + '</small></button></div>' +
      (sumBad ? '<div class="warnl" style="font-size:12.5px">⚠️ بموقف المقاولين: المسلّمة + قيد التسليم + المتبقية = ' + sum + ' مو ' + o.cw.all + '</div>' : '') +
      (open ? '<div class="cxsub">' + cxNum(o.g, 0, 'wsOk', o, 'g') + cxNum(o.g, 0, 'wsOverR', o, 'y') + cxNum(o.g, 0, 'wsOverN', o, 'o') + cxNum(o.g, 0, 'wsOverNRev', o, 'p') + '</div>' : '') +
      '<div class="scroll"><table class="cxt"><thead><tr><th>القطاع</th><th>الكلي</th><th>المسلّمة</th><th>المتبقية</th><th>قيد التسليم (موقف المقاولين)</th><th>قيد التسليم (الأسبوعي)</th><th>غير عابر</th><th>عابر جاهز</th><th>عابر غير جاهز</th><th>مع مراجعات</th></tr></thead><tbody>' +
      secs.map(function (s) { return '<tr><td>' + esc(secLbl(s)) + '</td>' + cell(s, 'all') + cell(s, 'del', 'g') + cell(s, 'rem') + cell(s, 'wsCw', 'w') + cell(s, 'ws', 'w') + cell(s, 'wsOk', 'g') + cell(s, 'wsOverR', 'y') + cell(s, 'wsOverN', 'o') + cell(s, 'wsOverNRev', 'p') + '</tr>'; }).join('') +
      '</tbody></table></div>' + (o.isDir ? '<b style="font-size:13px">حسب الجهة</b>' + mem : '') +
      '<p class="muted" style="margin:0;font-size:11.5px">🔴 رقم «قيد التسليم (الأسبوعي)» بالأحمر = عدد دور المقاول بشيت الموقف الأسبوعي مو نفس رقم قيد التسليم المكتوب بموقف المقاولين لنفس القطاع.</p></div>';
  }).join('');
  return h + '</div>';
};
function cxPick(g, s) { var D = conData(); if (g === '*') return s ? null : D.tot; var o = D.list.filter(function (x) { return x.g === g; })[0]; return o ? (s ? o.sec[s] : o) : null; }
function cxItems(g, s, k) { // الدور خلف كل رقم
  var D = conData(), out = [], src = { all: 'mAll', del: 'mDel', rem: 'mRem' }[k] || k;
  D.list.forEach(function (o) { if (g !== '*' && o.g !== g) return; var z = s ? o.sec[s] : o; ((z || {})[src] || []).forEach(function (it) { out.push([o.g, it]); }); });
  return out.sort(function (a, b) { return (k.indexOf('ws') === 0 ? ((a[1].dd == null ? 1e9 : a[1].dd) - (b[1].dd == null ? 1e9 : b[1].dd)) : 0) || a[1].s - b[1].s || String(a[1].id).localeCompare(String(b[1].id), 'en', { numeric: true }); });
}
function cxState(it) { if (it.ddate && !it.u) return 'مسلّمة' + (it.ddate ? ' · ' + it.ddate : ''); if (it.ddate && it.u) return 'مسلّمة وبعدها بقيد التسليم'; if (it.u) return (it.ready ? 'جاهزة' : 'غير جاهزة') + (it.dd == null ? '' : it.dd > 0 ? ' · باقي ' + it.dd + ' يوم' : it.dd === 0 ? ' · اليوم موعدها' : ' · متجاوز ' + (-it.dd) + ' يوم'); return 'بعدها ما وصلت'; }
function cxList(g, s, k) {
  var L = cxItems(g, s, k), z = cxPick(g, s), title = cxLbl(k) + ' — ' + (g === '*' ? 'كل المقاولين' : g) + (s ? ' — ' + secLbl(s) : '');
  CX.cur = { g: g, s: s, k: k, title: title };
  var note = '';
  if (k === 'all' || k === 'del' || k === 'rem') { var v = z ? cxVal(z, k) : null;
    note = L.length ? (v != null && v !== L.length ? '<p class="warnl" style="font-size:12.5px;margin:0 0 8px">الرقم بموقف المقاولين ' + v + '، والمخطط يحدد مكان ' + L.length + ' دار بس.</p>' : '') : '<p class="muted" style="font-size:13px">توزيع هذا المقاول بالبلوكات ما موجود بالمخطط لهالقطاع، فالرقم ' + (v || 0) + ' من موقف المقاولين بدون قائمة دور.</p>'; }
  else if (k === 'ws' && z && z.cwHas && z.cw.ws !== z.ws.length) note = '<p class="warnl" style="font-size:12.5px;margin:0 0 8px">موقف المقاولين يگول ' + z.cw.ws + ' والموقف الأسبوعي بيه ' + z.ws.length + ' — هذي دور الأسبوعي.</p>';
  X.openModal('<header><h3>' + esc(title) + ' <span class="pill">' + L.length + '</span></h3><button class="iconbtn" data-act="closeModal" aria-label="إغلاق">' + X.ico('close') + '</button></header><div class="bd">' + note + '<div class="cxl">' +
    L.slice(0, 400).map(function (x) { var it = x[1]; return '<button data-cx="house" data-v="' + esc(it.id) + '"><b class="ltr">' + esc(it.id) + '</b><small>' + esc(secLbl(it.s) + (g === '*' ? ' · ' + x[0] : '') + (it.dlv ? ' · 📤 ' + it.dlv : '') + (it.off ? ' · ⚠️ رقمها ما موجود بالمخطط' : '')) + '</small><small>' + esc(cxState(it)) + (it.rv ? ' · 🔍 ' + it.rv : '') + '</small></button>'; }).join('') +
    (L.length > 400 ? '<p class="muted" style="font-size:12px">يطلع أول 400 — التصدير بيه الكل</p>' : '') + '</div>' + (L.length ? '<p class="muted" style="font-size:12px;margin:8px 0 0">اضغط الدار حتى تفتحها بالبحث.</p>' : '') + '</div>' +
    '<footer>' + (L.length ? '<button class="btn wa" data-cx="xls">' + X.ico('xls', 16) + ' تصدير Excel</button>' : '') + '<button class="btn" data-act="closeModal">إغلاق</button></footer>', true);
}
function cxExport() {
  var c = CX.cur; if (!c) return; var L = cxItems(c.g, c.s, c.k);
  var rows = L.map(function (x, i) { var it = x[1]; return [i + 1, x[0], secLbl(it.s), it.id, it.inc || '—', it.dlv || it.ddate || '—', it.u ? (it.ready ? 'جاهزة' : 'غير جاهزة') : '—', it.dd == null ? '—' : it.dd > 0 ? 'باقي ' + it.dd : it.dd === 0 ? 'اليوم' : 'متجاوز ' + (-it.dd), it.rv || 0, cxState(it) + (it.off ? ' · رقمها ما موجود بالمخطط' : '')]; });
  X.xlsxPro([{ name: cxLbl(c.k).slice(0, 28), title: c.title + ' — ' + X.todayStr(), head: ['ت', 'المقاول', 'القطاع', 'رقم الدار', 'تاريخ الوارد', 'تاريخ التسليم / الاستلام', 'الجاهزية', 'الأيام', 'عدد المراجعات', 'الموقف'], cols: [6, 22, 14, 12, 13, 15, 11, 12, 10, 26], textCols: [1, 2, 3, 4, 5, 6, 7, 9], rows: rows }], 'Amirat2_Contractors_' + c.k + '_' + X.todayStr() + '.xlsx');
}
function cxExportSum() {
  var D = conData(), rows = [];
  function r(o, z, lbl) { return [o.g, lbl, z.cw.all, z.cw.del, z.cw.rem, z.cw.ws, z.ws.length, z.cw.ws === z.ws.length ? 'متطابق' : 'غير متطابق', z.wsOk.length, z.wsOverR.length, z.wsOverN.length, z.wsOverNRev.length]; }
  D.list.forEach(function (o) { Object.keys(o.sec).map(Number).sort(function (a, b) { return a - b; }).forEach(function (s) { rows.push(r(o, o.sec[s], secLbl(s))); }); rows.push(r(o, o, 'المجموع')); });
  var T = D.tot;
  X.xlsxPro([{ name: 'المقاولين', title: 'موقف المقاولين حسب القطاع — ' + X.todayStr(), head: ['المقاول', 'القطاع', 'الكلي', 'المسلّمة', 'المتبقية', 'قيد التسليم (موقف المقاولين)', 'قيد التسليم (الموقف الأسبوعي)', 'التطابق', 'غير عابر موعدها', 'عابر جاهز', 'عابر غير جاهز (بدون مراجعات)', 'عابر غير جاهز مع مراجعات'], cols: [24, 15, 9, 10, 10, 14, 14, 11, 12, 10, 14, 14], textCols: [0, 1, 7], rows: rows,
    total: ['المجموع الكلي', '', T.cw.all, T.cw.del, T.cw.rem, T.cw.ws, T.ws.length, T.cw.ws === T.ws.length ? 'متطابق' : 'غير متطابق', T.wsOk.length, T.wsOverR.length, T.wsOverN.length, T.wsOverNRev.length], totMerge: [[0, 1]] }], 'Amirat2_Contractors_' + X.todayStr() + '.xlsx');
}
document.addEventListener('click', function (e) {
  var b = e.target.closest && e.target.closest('[data-cx]'); if (!b || !MD) return; var a = b.dataset.cx;
  if (a === 'tog') { CX.open[b.dataset.g] = !CX.open[b.dataset.g]; X.scheduleRender(); }
  else if (a === 'list') cxList(b.dataset.g, +b.dataset.s || 0, b.dataset.k);
  else if (a === 'xls') cxExport();
  else if (a === 'xsum') cxExportSum();
  else if (a === 'house') { X.closeModal(); S.q = b.dataset.v; S.sel = null; X.ACT.go({ v: 'search' }); }
});
document.addEventListener('input', function (e) { if (e.target.dataset && e.target.dataset.cxin === 'q') { CX.q = e.target.value; clearTimeout(CX.t); CX.t = setTimeout(X.scheduleRender, 200); } });

// لو النظام رسم قبل تحميل هذا الملف
try { X.scheduleRender(); } catch (e) {}
window.__MX = { ST: ST, md: function () { return MD; }, checks: function () { return checks(); }, counts: function (l) { return counts(l || allSecs()); }, focus: focusHouse,
  load: load, index: index, delDate: delDate, statusOf: statusOf, effCon: effCon, mk: mk, pre: pre, sectorName: sectorName, housePanel: function (h) { ST.I = index(); return housePanel(h); } };
})();
