/* مكتب التسليم الفني — مجمع الأميرات 2 — النظام الجديد
   نفس منطق النظام الحالي بالضبط (قيد التسليم من شيت "الموقف الاسبوعي"، المراجعات، الدور المسلّمة، الجرد السنوي،
   موقف المقاولين، التنبيهات، الدور الجديدة + واتساب، سجل الحركات) بواجهة جديدة + لوحة مؤشرات + بحث سريع.
   Design by: Montather Ali */
(function () {
'use strict';

/* ================= الإعدادات ================= */
var CFG = window.APP_CONFIG || {};
var ROOT = 'amirat2';
var LOGROOT = 'amirat2_logs';
var OLD = { db: 'https://drmontatherali-2000-default-rtdb.europe-west1.firebasedatabase.app', root: 'amirat_houses_db_zero' };
var DEFAULT_URLS = {
  weekly: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR-i0UZgy0e04HVijl7Pmc1l47pxcQlgLzl1H_-2ifnSU_GEBzf2OtwVah8hl5wBjHzN51r6e_D_FUG/pub?output=csv',
  dates: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSVw7EKmEyUmNWOtdBsrLOYtoY1sf8RZ7ZixgtDWMIONtFjEdV9psIetOotsObPeInKuuLXPtgtbS9d/pub?gid=466257668&single=true&output=csv',
  contractors: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR3MQYRtPk2Lw0QkUfEA2W9TlGYeRK659J36a-ivl1ZcZkX9QEvwHESlGXqq7ZnwSz6PqWwQ0e506B2/pub?output=csv'
};
var SECTOR_NAMES = ['القطاع الأول', 'القطاع الثاني', 'القطاع الثالث', 'القطاع الرابع', 'القطاع الخامس', 'القطاع السادس', 'دور VIP'];
var USERS = [
  { id: 'u1', name: 'محمد عبد الامير', h: '84da54d50e7e0572fcdc0f6d5bf0a008362fac5d4521da3e5ade9c09a7b74be5' },
  { id: 'u2', name: 'علي نعمان', h: '7aed75ed7c23b49f40f5b1a89f5563b984a6bae7ec85fd51f786913566f6fc79' },
  { id: 'u3', name: 'منتظر علي', h: 'c8b2be0a352830a21e481f4689bb73365c63c8ba750130a9b049492c13b5edc8' }
];
var DEFAULT_CONTRACTORS = ['أحمد عواد', 'عادل عرار', 'محمد عرار', 'جاسم زراك', 'دياري كريم', 'علي الكوفي', 'علي هويدي', 'علي محمد حسين', 'طه عبد الله', 'اكام بهاء', 'ثامر عطار', 'سمير حنون', 'عمر بولات', 'اسعد هادي', 'اوات جمال', 'يوسف حسن'];
var AR_MONTHS = ['', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
var AR_MONTHS_SHORT = ['', 'كانون٢', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين١', 'تشرين٢', 'كانون١'];
var VERSION = '1.0.0';

/* ================= أدوات ================= */
function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function cell(v) { return (v == null) ? '' : String(v).trim(); }
function normH(v) { return String(v == null ? '' : v).trim().replace(/\s+/g, ' ').toLowerCase(); }   // normHouseNo بالنظام الحالي
function normS(v) { return String(v == null ? '' : v).replace(/\s+/g, '').toLowerCase(); }           // norm بشيت المسلّمة
function enc(s) { return String(s).replace(/\./g, '_dot_'); }
function dec(s) { return String(s).replace(/_dot_/g, '.'); }
function stripBidi(s) { return String(s == null ? '' : s).replace(/[​-‏‪-‮⁦-⁩﻿]/g, ''); }
function arDigits(s) { return String(s).replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); }).replace(/[۰-۹]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.indexOf(d); }); }
function pad2(n) { return (n < 10 ? '0' : '') + n; }
function todayStr() { var d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
function addDays(dateStr, days) {
  if (!dateStr) return '';
  var p = String(dateStr).split('-');
  var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
  if (isNaN(d.getTime())) return '';
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}
// نفس parseArabicOrIsoDate بالنظام الحالي — قراءة فقط بدون أي تعديل على التاريخ المكتوب
function parseAny(s) {
  s = cell(s);
  if (!s) return null;
  var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  var d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
// الفرق الموقّع بالأيام: موجب = متبقي، سالب = تجاوز، null = تعذّرت القراءة
function daysDiff(s) {
  var d = parseAny(s);
  if (!d) return null;
  var t = new Date(); t.setHours(0, 0, 0, 0); d.setHours(0, 0, 0, 0);
  return Math.round((d - t) / 86400000);
}
function overdueText(s) {
  var d = daysDiff(s);
  if (d === null) return '';
  if (d === 0) return ' — متجاوز: اليوم موعد التسليم';
  if (d < 0) return ' — تجاوز ' + (-d) + ' يوم';
  return '';
}
function isAdminNote(v) { return /خاص/.test(String(v || '')); }
function adminPill(v) { return isAdminNote(v) ? ' <span class="pill p-admin">🏛 تبليغ إدارة</span>' : ''; }
function execLabel(type, contractor) {
  var et = type || 'غير محدد';
  if (et.indexOf('مباشر') >= 0) return et;
  return et + (contractor ? ' — ' + contractor : '');
}
function sha256(s) {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)).then(function (b) {
    return Array.from(new Uint8Array(b)).map(function (x) { return x.toString(16).padStart(2, '0'); }).join('');
  });
}
function lsGet(k, def) { try { var v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
function toArr(v) { if (Array.isArray(v)) return v.filter(function (x) { return x != null; }); if (v && typeof v === 'object') return Object.values(v); return []; }
function clean(o) { try { return JSON.parse(JSON.stringify(o)); } catch (e) { return {}; } }
function toast(msg, ok) {
  var box = document.getElementById('toast'); var t = document.createElement('div');
  t.textContent = msg; t.style.background = ok === false ? '#B91C1C' : (ok === 'info' ? '#3B2F8F' : '#15803D');
  box.appendChild(t); setTimeout(function () { t.remove(); }, ok === false ? 8000 : 3500);
}
var ICONS = {
  search: 'M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14zM20 20l-3.5-3.5',
  dash: 'M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z',
  ws: 'M4 21V9h5v12M10 21V4h5v17M16 21v-8h5v8M2 21h20',
  today: 'M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0',
  review: 'M9 3h6v4H9zM7 5H5v16h14V5h-2M9 13l2 2 4-4',
  delivered: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM9 15l2 2 4-4',
  weekly: 'M5 20V11M12 20V5M19 20v-6M3 20h18',
  annual: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  agenda: 'M12 7v5l3 2M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z',
  settings: 'M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1M15 4v4M9 10v4M17 16v4',
  sun: 'M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M12 7a5 5 0 1 0 0 10a5 5 0 1 0 0-10z',
  refresh: 'M20 11a8 8 0 0 0-14.9-4M4 4v4h4M4 13a8 8 0 0 0 14.9 4M20 20v-4h-4',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  close: 'M6 6l12 12M18 6 6 18',
  xls: 'M6 3h9l4 4v14H6zM14 3v5h5M9 12l5 6M14 12l-5 6',
  wa: 'M3.5 20.5l1.3-4A8.5 8.5 0 1 1 8 19.6z'
};
function ico(name, size) { return '<svg width="' + (size || 20) + '" height="' + (size || 20) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + ICONS[name] + '"></path></svg>'; }

/* ================= الحالة ================= */
var S = {
  user: lsGet('a2_user', null),
  view: (function (v) { return v === 'review' ? 'search' : v; })(lsGet('a2_view', 'search')),
  online: false, remoteReady: false,
  db: lsGet('a2_dbcache', null) || {},
  wsAll: lsGet('a2_ws', []), wsLast: lsGet('a2_wsLast', ''), wsErr: '',
  del: lsGet('a2_del', []), delMap: lsGet('a2_delMap', {}), delLast: lsGet('a2_delLast', ''), delErr: '',
  cw: lsGet('a2_cw', []), cwLast: lsGet('a2_cwLast', ''), cwErr: '',
  q: '', sel: null,
  wsF: { sector: 'all', contractor: 'all', sort: 'default', q: '', mode: 'towers' },
  openSectors: lsGet('a2_openSectors', {}),
  rvQ: '', rvSort: 'default', delQ: '', delShow: 150,
  snoozed: {},
  tiles: lsGet('a2_tiles', {}), panelShow: 150, panel: null,
  agenda: null,
  logsFor: {}
};
var fb = null, auth = null, R = null, LR = null;

/* ================= البيانات المشتقة ================= */
function D() { return S.db || {}; }
function readyMap() { var m = {}, r = D().readyMap || {}; Object.keys(r).forEach(function (k) { m[dec(k)] = r[k]; }); return m; }
function isReady(unit) { return !!readyMap()[normH(unit)]; }
function oldRecs() { return toArr(D().oldRecords).map(function (r) { return r; }); }
function reviewOf(unit) { var k = normH(unit); return oldRecs().find(function (r) { return normH(r.houseNo) === k; }) || null; }
function isDeliveredRec(r) { return !!(r && (r.alreadyDelivered || r.status === 'مستلم')); }
function dismissedMap() { var m = {}, x = D().dismissed || {}; Object.keys(x).forEach(function (k) { if (x[k]) m[dec(k)] = true; }); return m; }
function getSheetDate(h) { return S.delMap[normS(h)] || null; }
// حالة الدور الجديدة الموحّدة — نفس nhStatusMap بالنظام الحالي (القديم للتوافق ثم units يتقدّم)
function nhStatusMap() {
  var nh = D().newHouseState || {}, m = {};
  function dm(o) { var r = {}; Object.keys(o || {}).forEach(function (k) { r[dec(k)] = o[k]; }); return r; }
  var known = dm(nh.known), alerts = dm(nh.alerts), dismissed = dm(nh.dismissed), units = dm(nh.units);
  Object.keys(known).forEach(function (k) { m[k] = { status: 'confirmed', rev: 0 }; });
  Object.keys(alerts).forEach(function (k) { if (!dismissed[k]) m[k] = { status: 'pending', unit: alerts[k], detectedAt: (alerts[k] || {}).detectedAt, rev: 0 }; });
  Object.keys(dismissed).forEach(function (k) { m[k] = { status: 'confirmed', rev: 0 }; });
  Object.keys(units).forEach(function (k) { if (units[k]) m[k] = units[k]; });
  return m;
}
function pendingNew() {
  var m = nhStatusMap(), inSheet = {}, out = [];
  S.wsAll.forEach(function (u) { inSheet[normH(u.unit)] = u; });
  Object.keys(m).forEach(function (k) {
    var e = m[k];
    if (e.status !== 'pending') return;
    if (S.wsAll.length && !inSheet[k]) return; // انحذفت من الشيت = يختفي الإشعار
    var u = Object.assign({}, e.unit || {}, inSheet[k] || {});
    if (!u.unit) u.unit = k;
    u.detectedAt = e.detectedAt || (e.unit || {}).detectedAt || u.detectedAt;
    out.push(u);
  });
  return out;
}
function wsUnits() { // المعروض بالنظام = كل صفوف الشيت ناقص الدور التي تنتظر الموافقة وناقص المحذوفة
  var pend = {}, dis = dismissedMap();
  pendingNew().forEach(function (u) { pend[normH(u.unit)] = true; });
  return S.wsAll.filter(function (u) { var k = normH(u.unit); return !pend[k] && !dis[k]; });
}
function wsByKey(unit) { var k = normH(unit); return wsUnits().find(function (u) { return normH(u.unit) === k; }) || null; }
function notifiedBadge(unit) {
  var e = nhStatusMap()[normH(unit)];
  if (!e || e.status !== 'confirmed' || e.seed || !e.confirmedAt) return '';
  var d = new Date(e.confirmedAt), ds = d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  return '<span class="pill p-info" title="' + esc(e.confirmedBy || '') + '">📨 تم تبليغ شعبة الإنهاءات · ' + ds + '</span>';
}
function beneficiary(unit) {
  var k = normH(unit);
  var f = toArr(D().records).find(function (r) { return normH(r.houseNo) === k; }) || oldRecs().find(function (r) { return normH(r.houseNo) === k; });
  var d = S.del.find(function (x) { return normS(x.houseNo) === normS(unit); });
  return { name: (f && f.ownerName) || (d && d.name) || '', phone: (f && f.phoneNo) || '' };
}
function rvRounds(rec) {
  var rounds = [{ n: 1, reviewDate: rec.reviewDate || '', completionDate: rec.notesEndDate || '', notes: rec.notes || '' }];
  if (rec.round2ReviewDate || rec.round2EndDate || rec.round2Notes) rounds.push({ n: 2, reviewDate: rec.round2ReviewDate || '', completionDate: rec.round2EndDate || '', notes: rec.round2Notes || '' });
  toArr(rec.extraRounds).forEach(function (rr) { rounds.push({ n: rounds.length + 1, reviewDate: rr.reviewDate || '', completionDate: rr.completionDate || '', notes: rr.notes || '' }); });
  return rounds;
}
function rvStatus(rec) { // من تاريخ إكمال المراجعة الأولى دائماً
  var first = rvRounds(rec)[0];
  var dl = daysDiff(first ? first.completionDate : rec.notesEndDate);
  if (dl === null) return { t: '⏳ ضمن المدة', c: 'p-mut' };
  if (dl < 0) return { t: '⚠️ تجاوزت المدة بـ ' + (-dl) + ' يوم', c: 'p-not' };
  if (dl === 0) return { t: '⏰ اليوم آخر يوم', c: 'p-ready' };
  if (dl === 1) return { t: '⏳ باقي يوم', c: 'p-ready' };
  if (dl === 2) return { t: '⏳ باقي يومين', c: 'p-ready' };
  return { t: '🟢 ضمن المدة', c: 'p-ok' };
}
function rvDates(rec) {
  var inc = rec.incomingDate || '', dlv = rec.deliveryDate || '';
  if (!inc || !dlv) { var m = S.wsAll.find(function (u) { return normH(u.unit) === normH(rec.houseNo); }); if (m) { if (!inc) inc = m.incomingDate || ''; if (!dlv) dlv = m.deliveryDate || ''; } }
  if (!dlv) { var sd = getSheetDate(rec.houseNo); if (sd) dlv = sd; }
  return { incomingDate: inc, deliveryDate: dlv };
}
function rvDeliveredDate(rec) {
  var sd = getSheetDate(rec.houseNo); if (sd) return sd;
  var m = S.wsAll.find(function (u) { return normH(u.unit) === normH(rec.houseNo); });
  return rec.deliveryDate || (m && m.deliveryDate) || '';
}
// التنبيهات — نفس renderDeadlineAlerts بالنظام الحالي
function computeAlerts() {
  var dis = dismissedMap();
  var wsCountdown = [], wsOverdue10 = [], wsNotDue = [], rvCountdown = [], rvOverdue = [];
  wsUnits().forEach(function (u) {
    if (dis[normH(u.unit)]) return;
    var diff = daysDiff(u.deliveryDate);
    if (diff === null) return;
    var base = { houseNo: u.unit, contractor: u.contractor, sector: u.sector, incomingDate: u.incomingDate || '', deliveryDate: u.deliveryDate || '' };
    if (diff >= 0 && diff <= 3) wsCountdown.push(Object.assign({ days: diff, detail: diff === 0 ? 'اليوم موعد التسليم — يُعتبر متجاوزاً' : 'متبقي ' + diff + ' يوم' }, base));
    else if (diff <= -10) wsOverdue10.push(Object.assign({ days: -diff, detail: 'تجاوزت الموعد بـ ' + (-diff) + ' يوم' }, base));
    if (diff > 0) wsNotDue.push(Object.assign({ days: diff, detail: 'متبقي ' + diff + ' يوم (لم يحن الموعد بعد)' }, base));
  });
  oldRecs().forEach(function (rec) {
    if (rec.notesCompleted === true) return;
    var rd = rvDates(rec), notes = rec.notes ? stripBidi(rec.notes) : '';
    rvRounds(rec).slice(0, 1).forEach(function (round) {
      if (!round.completionDate) return;
      var dl = daysDiff(round.completionDate);
      if (dl === null) return;
      var base = { houseNo: rec.houseNo, contractor: rec.contractorName, sector: rec.sectorNo, incomingDate: rd.incomingDate, deliveryDate: rd.deliveryDate };
      var tag = 'مراجعة ' + round.n;
      if (dl >= 0 && dl <= 2) rvCountdown.push(Object.assign({ days: dl, detail: tag + ' — ' + (dl === 0 ? 'اليوم آخر يوم لإكمال الملاحظات' : 'متبقي ' + dl + ' يوم على إكمال الملاحظات') + (notes ? ' — ' + notes : '') }, base));
      else if (dl < 0) rvOverdue.push(Object.assign({ days: -dl, detail: tag + ' — تجاوزت موعد الإكمال بـ ' + (-dl) + ' يوم' + (notes ? ' — ' + notes : '') }, base));
    });
  });
  function by(a, b) { return (a.days || 0) - (b.days || 0); }
  [wsCountdown, wsOverdue10, wsNotDue, rvCountdown, rvOverdue].forEach(function (l) { l.sort(by); });
  return { wsCountdown: wsCountdown, wsOverdue10: wsOverdue10, wsNotDue: wsNotDue, rvCountdown: rvCountdown, rvOverdue: rvOverdue };
}
function crossovers() { // دور وقّعت محضر استلام وما زالت بقيد التسليم/المراجعة
  var seen = {}, out = [], dis = dismissedMap();
  wsUnits().forEach(function (u) { var k = normH(u.unit); if (seen[k] || dis[k] || S.snoozed[k]) return; var d = getSheetDate(u.unit); if (d) { seen[k] = 1; out.push({ houseNo: u.unit, date: d }); } });
  oldRecs().forEach(function (r) { if (isDeliveredRec(r)) return; var k = normH(r.houseNo); if (seen[k] || dis[k] || S.snoozed[k]) return; var d = getSheetDate(r.houseNo); if (d) { seen[k] = 1; out.push({ houseNo: r.houseNo, date: d }); } });
  return out;
}
function alertBadgeCount() { var a = computeAlerts(); return a.wsOverdue10.length + a.rvOverdue.length; }
function noticeCount() { return pendingNew().length + crossovers().length; }

/* ================= البحث الشامل ================= */
function matchQ(field, q, q2) { var f = normH(field); if (!q) return false; if (f.indexOf(q) >= 0) return true; return !!q2 && f.replace(/[.\-\/\s]/g, '').indexOf(q2) >= 0; }
function globalSearch(raw) {
  var q = normH(arDigits(raw || '')); if (!q) return [];
  var q2 = q.replace(/[.\-\/\s]/g, '');
  var res = {}, order = [];
  function get(h) { var k = normH(h); if (!k) return null; if (!res[k]) { res[k] = { houseNo: h, key: k }; order.push(k); } return res[k]; }
  wsUnits().forEach(function (u) {
    if (matchQ(u.unit, q, q2) || matchQ(u.contractor, q) || matchQ(u.sector, q)) {
      var r = get(u.unit); if (!r) return; r.inWS = true; r.ws = u;
      r.sector = r.sector || u.sector; r.contractor = r.contractor || u.contractor; r.executionType = r.executionType || u.executionType;
      r.incomingDate = r.incomingDate || u.incomingDate; r.deliveryDate = r.deliveryDate || u.deliveryDate;
    }
  });
  oldRecs().forEach(function (rec) {
    if (matchQ(rec.houseNo, q, q2) || matchQ(rec.contractorName, q) || matchQ(rec.sectorNo, q)) {
      var r = get(rec.houseNo); if (!r) return; r.inReview = true; r.rec = rec;
      r.sector = r.sector || rec.sectorNo; r.contractor = r.contractor || rec.contractorName; r.executionType = r.executionType || rec.executionType;
      r.incomingDate = r.incomingDate || rec.incomingDate; r.deliveryDate = r.deliveryDate || rec.deliveryDate;
    }
  });
  S.del.forEach(function (row) {
    if (matchQ(row.houseNo, q, q2) || matchQ(row.name, q) || matchQ(row.sector, q)) {
      var r = get(row.houseNo); if (!r) return; r.inDelivered = true; r.sector = r.sector || row.sector; r.deliveredDate = row.date; r.delName = row.name;
    }
  });
  return order.map(function (k) { return res[k]; });
}
function houseInfo(unit) { // كل ما يُعرف عن دار معينة (للكرت)
  var k = normH(unit), r = { houseNo: unit, key: k };
  var u = wsUnits().find(function (x) { return normH(x.unit) === k; });
  if (u) { r.inWS = true; r.ws = u; r.sector = u.sector; r.contractor = u.contractor; r.executionType = u.executionType; r.incomingDate = u.incomingDate; r.deliveryDate = u.deliveryDate; r.houseNo = u.unit; }
  var rec = reviewOf(unit);
  if (rec) { r.inReview = true; r.rec = rec; r.sector = r.sector || rec.sectorNo; r.contractor = r.contractor || rec.contractorName; r.executionType = r.executionType || rec.executionType; r.incomingDate = r.incomingDate || rec.incomingDate; r.deliveryDate = r.deliveryDate || rec.deliveryDate; }
  var dl = S.del.filter(function (x) { return normS(x.houseNo) === normS(unit); });
  if (dl.length) { r.inDelivered = true; r.deliveredDate = getSheetDate(unit) || dl[0].date; r.delName = dl[0].name; r.sector = r.sector || dl[0].sector; }
  return r;
}
function statusLabel(r) {
  if (r.inWS && !r.inReview) return { t: '📋 قيد التسليم — لم يراجع عليه', c: 'p-rev' };
  if (r.inWS && r.inReview) return { t: '📋 قيد التسليم — والمستفيد مراجع سابقاً', c: 'p-ready' };
  if (r.inDelivered && r.inReview) return { t: '🏠 مستلم — والمستفيد مراجع سابقاً', c: 'p-ok' };
  if (r.inDelivered) return { t: '🏠 الدار مستلمة', c: 'p-ok' };
  if (r.inReview) return { t: '🔍 قيد المراجعة', c: 'p-ready' };
  return { t: '—', c: 'p-mut' };
}

/* ================= Firebase ================= */
function initFirebase() {
  if (!CFG.firebase || !CFG.firebase.apiKey) return false;
  fb = firebase.initializeApp(CFG.firebase);
  auth = firebase.auth();
  R = firebase.database().ref(ROOT);
  LR = firebase.database().ref(LOGROOT);
  firebase.database().ref('.info/connected').on('value', function (s) { S.online = s.val() === true && navigator.onLine !== false; renderTop(); });
  window.addEventListener('offline', function () { S.online = false; renderTop(); });
  window.addEventListener('online', function () { toast('🟢 رجع الاتصال — جاري المزامنة', 'info'); syncAll(false); });
  return true;
}
var listening = false;
function listen() {
  if (listening) return; listening = true;
  R.on('value', function (snap) {
    S.db = snap.val() || {};
    S.remoteReady = true;
    lsSet('a2_dbcache', S.db);
    detectNew();
    scheduleRender();
  }, function (err) { toast('⚠️ تعذّر قراءة قاعدة البيانات: ' + (err.code || err.message), false); });
}
function logActivity(houseNo, action, notes) {
  try {
    var key = normH(houseNo); if (!key || !LR) return;
    var now = new Date();
    var e = { by: S.user ? S.user.name : 'غير معروف', action: action, notes: notes || '', date: todayStr(), time: now.toLocaleTimeString('ar-IQ'), ts: now.getTime() };
    LR.child('edit/' + enc(key)).push(e);
    LR.child('global').push(Object.assign({ houseNo: String(houseNo || '') }, e));
    S.agenda = null; delete S.logsFor[key];
  } catch (e) {}
}

/* ================= مزامنة الشيتات ================= */
function settingsUrl(k) { var s = D().settings || {}; return s[k + 'Url'] || DEFAULT_URLS[k]; }
function fetchSheet(url) {
  return fetch(url + (url.indexOf('?') >= 0 ? '&' : '?') + 't=' + Date.now(), { cache: 'no-store' }).then(function (res) {
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.text();
  }).then(function (txt) {
    var wb = XLSX.read(txt, { type: 'string', raw: true });
    return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: null });
  });
}
// يحلل صفوف شيت "الموقف الاسبوعي" — نفس parseWeeklySheet بالنظام الحالي حرفياً
function parseWeeklySheet(rows) {
  var out = [], curSector = null, curContractor = null, curExecutor = null, skip = false;
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i] || [];
    var A = cell(row[0]), Dd = cell(row[3]), G = cell(row[6]), H = cell(row[7]), I = row[8], J = row[9], K = cell(row[10]);
    if (A && SECTOR_NAMES.indexOf(A) >= 0) curSector = A;
    if (Dd === 'المقاول' || A === 'المجموع' || Dd === 'المجموع' || H === 'رقم الوحدة السكنية') continue;
    if (Dd !== '') { curContractor = Dd; skip = (G !== '' && isNaN(Number(G))); if (K !== '') curExecutor = K; }
    else if (K !== '') curExecutor = K;
    if (skip) continue;
    if (H !== '') out.push({ sector: curSector || '', contractor: curContractor || '', executionType: curExecutor || '', unit: H, incomingDate: cell(I), deliveryDate: cell(J) });
  }
  return out;
}
var syncing = {};
function syncWeekly(manual) {
  if (syncing.ws) return Promise.resolve(); syncing.ws = true;
  return waitRemote(6000).then(function () { return fetchSheet(settingsUrl('weekly')); }).then(function (rows) {
    var parsed = parseWeeklySheet(rows);
    if (!parsed.length) throw new Error('ما لكيت أي صفوف دور قيد التسليم — تأكد من رابط نشر تبويب "الموقف الاسبوعي"');
    S.wsAll = parsed; S.wsLast = new Date().toLocaleString('ar-IQ'); S.wsErr = '';
    lsSet('a2_ws', parsed); lsSet('a2_wsLast', S.wsLast);
    detectNew();
    if (manual) toast('✅ تم تحديث قيد التسليم: ' + parsed.length + ' دار');
  }).catch(function (e) { S.wsErr = e.message; if (manual) toast('⚠️ تعذّرت مزامنة الموقف الاسبوعي: ' + e.message, false); })
    .then(function () { syncing.ws = false; scheduleRender(); });
}
// شيت تواريخ الاستلام (الدور المسلّمة) — نفس منطق sync بالنظام الحالي
function parseDelDate(v) {
  if (v == null) return '';
  var s = String(v).trim(); if (!s) return '';
  var m = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
  if (m) return m[1] + '-' + m[2].padStart(2, '0') + '-' + m[3].padStart(2, '0');
  m = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if (m) { var a = parseInt(m[1], 10), b = parseInt(m[2], 10), y = m[3], mm, dd; if (a > 12 && b <= 12) { dd = a; mm = b; } else { mm = a; dd = b; } return y + '-' + pad2(mm) + '-' + pad2(dd); }
  return s;
}
function isIso(s) { return /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')); }
function syncDelivered(manual) {
  if (syncing.del) return Promise.resolve(); syncing.del = true;
  return fetchSheet(settingsUrl('dates')).then(function (rows) {
    var hdr = -1, cD = -1, cH = -1, cN = -1, cS = -1, cT = -1;
    for (var i = 0; i < Math.min(rows.length, 10) && hdr < 0; i++) {
      var r = rows[i] || [];
      var d = r.findIndex(function (c) { return typeof c === 'string' && c.indexOf('تاريخ الاستلام') >= 0; });
      var h = r.findIndex(function (c) { return typeof c === 'string' && c.indexOf('رقم البلوك') >= 0; });
      if (d >= 0 && h >= 0) {
        hdr = i; cD = d; cH = h;
        cN = r.findIndex(function (c) { return typeof c === 'string' && (c.indexOf('اسم المستفيد') >= 0 || c.indexOf('المستفيد') >= 0); });
        cS = r.findIndex(function (c) { return typeof c === 'string' && c.indexOf('القطاع') >= 0; });
        cT = r.findIndex(function (c) { if (typeof c !== 'string') return false; var t = c.trim(); return t === 'ت' || t === '#' || t.indexOf('تسلسل') >= 0; });
      }
    }
    if (hdr < 0) throw new Error('ما لكيت عمودي "تاريخ الاستلام" و"رقم البلوك والدار"');
    var map = {}, all = [], seenSer = {};
    for (var j = hdr + 1; j < rows.length; j++) {
      var row = rows[j] || [];
      var key = normS(row[cH]), raw = row[cD];
      if (raw == null || String(raw).trim() === '') continue;
      var iso = parseDelDate(raw);
      var ser = cT >= 0 && row[cT] != null ? String(row[cT]).trim() : '';
      var sk = ser || ('row' + j);
      if (!seenSer[sk]) { seenSer[sk] = 1; all.push({ serial: ser, houseNo: row[cH] == null ? '' : String(row[cH]).trim(), date: iso, name: cN >= 0 && row[cN] != null ? String(row[cN]).trim() : '', sector: cS >= 0 && row[cS] != null ? String(row[cS]).trim() : '' }); }
      if (!key) continue;
      var better = !map[key] || (!isIso(map[key]) && isIso(iso)) || (isIso(iso) && isIso(map[key]) && iso > map[key]);
      if (better) map[key] = iso;
    }
    S.del = all; S.delMap = map; S.delLast = new Date().toLocaleString('ar-IQ'); S.delErr = '';
    lsSet('a2_del', all); lsSet('a2_delMap', map); lsSet('a2_delLast', S.delLast);
    if (manual) toast('✅ تم تحديث الدور المسلّمة: ' + all.length + ' صف');
  }).catch(function (e) { S.delErr = e.message; if (manual) toast('⚠️ تعذّر تحديث شيت المسلّمة: ' + e.message, false); })
    .then(function () { syncing.del = false; scheduleRender(); });
}
function syncContractors(manual) {
  if (syncing.cw) return Promise.resolve(); syncing.cw = true;
  return fetchSheet(settingsUrl('contractors')).then(function (rows) {
    var hdr = -1, cC = -1, cSec = -1, cTot = -1, cDel = -1, cProg = -1, cRem = -1;
    for (var i = 0; i < Math.min(rows.length, 10) && hdr < 0; i++) {
      var r = rows[i] || [];
      var cc = r.findIndex(function (c) { return typeof c === 'string' && c.indexOf('المقاول') >= 0; });
      var cs = r.findIndex(function (c) { return typeof c === 'string' && c.indexOf('القطاع') >= 0; });
      if (cc >= 0 && cs >= 0) {
        hdr = i; cC = cc; cSec = cs;
        cTot = r.findIndex(function (c) { return typeof c === 'string' && c.indexOf('الكلي') >= 0; });
        cDel = r.findIndex(function (c) { return typeof c === 'string' && c.indexOf('المسلمة') >= 0; });
        cProg = r.findIndex(function (c) { return typeof c === 'string' && c.indexOf('قيد التسليم') >= 0; });
        cRem = r.findIndex(function (c) { return typeof c === 'string' && c.indexOf('المتبقية') >= 0; });
      }
    }
    if (hdr < 0) throw new Error('ما لكيت عمودي "اسم المقاول" و"رقم القطاع"');
    var out = [], last = '';
    for (var j = hdr + 1; j < rows.length; j++) {
      var row = rows[j]; if (!row) continue;
      var c = cC >= 0 && row[cC] != null ? String(row[cC]).trim() : '';
      var s = cSec >= 0 && row[cSec] != null ? String(row[cSec]).trim() : '';
      if (!c && !s) continue;
      if (c) last = c; else c = last;
      out.push({ contractor: c, sector: s, total: cTot >= 0 && row[cTot] != null ? row[cTot] : '-', delivered: cDel >= 0 && row[cDel] != null ? row[cDel] : '-', inProgress: cProg >= 0 && row[cProg] != null ? row[cProg] : '-', remaining: cRem >= 0 && row[cRem] != null ? row[cRem] : '-' });
    }
    S.cw = out; S.cwLast = new Date().toLocaleString('ar-IQ'); S.cwErr = '';
    lsSet('a2_cw', out); lsSet('a2_cwLast', S.cwLast);
    if (manual) toast('✅ تم تحديث موقف المقاولين');
  }).catch(function (e) { S.cwErr = e.message; if (manual) toast('⚠️ تعذّر تحديث موقف المقاولين: ' + e.message, false); })
    .then(function () { syncing.cw = false; scheduleRender(); });
}
function syncAll(manual) { return Promise.all([syncWeekly(manual), syncDelivered(manual), syncContractors(manual)]); }
function waitRemote(ms) { return new Promise(function (res) { var w = 0; (function c() { if (S.remoteReady || w >= ms) return res(); w += 150; setTimeout(c, 150); })(); }); }

/* ================= الدور الجديدة ================= */
var seeding = false;
function nhRef(k) { return R.child('newHouseState/units/' + enc(k)); }
function detectNew() {
  if (!S.remoteReady || !R || !S.user || !S.wsAll.length) return;
  if (!(D().meta && D().meta.importedAt)) return; // لا اكتشاف قبل استيراد بيانات النظام الحالي (حتى لا تُعتبر كل الدور جديدة)
  var m = nhStatusMap(), fresh = [];
  S.wsAll.forEach(function (u) { var k = normH(u.unit); if (k && !m[k]) fresh.push({ k: k, u: u }); });
  if (!fresh.length) return;
  var nh = D().newHouseState || {};
  if (!nh.migrated) {
    if (seeding) return; seeding = true;
    var left = fresh.length;
    fresh.forEach(function (f) { nhRef(f.k).transaction(function (cur) { return cur ? undefined : clean({ status: 'confirmed', unit: f.u, seed: true, rev: 1 }); }, function () { if (--left === 0) { R.child('newHouseState/migrated').set(true); seeding = false; } }); });
    return;
  }
  var by = S.user.name;
  fresh.forEach(function (f) { nhRef(f.k).transaction(function (cur) { return cur ? undefined : clean({ status: 'pending', unit: f.u, detectedAt: Date.now(), detectedBy: by, marked: true, rev: 1 }); }); });
}
function nhConfirm(key, u, how) {
  var cur = nhStatusMap()[key];
  if (cur && cur.status === 'confirmed') return;
  var obj = clean(Object.assign({}, cur || { unit: u || { unit: key } }, { status: 'confirmed', confirmedAt: Date.now(), confirmedBy: S.user.name, confirmedHow: how, rev: ((cur && cur.rev) || 0) + 1 }));
  nhRef(key).set(obj, function (err) { if (err) toast('⚠️ تعذّر حفظ تأكيد الدار ' + key + ': ' + (err.code || err.message), false); else toast('✅ تم تأكيد الدار ' + ((u && u.unit) || key) + ' ودخلت النظام'); });
  logActivity((u && u.unit) || key, how === 'whatsapp' ? 'أرسل تبليغ دار جديدة وأكّد دخولها للنظام' : 'ضغط "تم الإعلام" لدار جديدة (دخلت النظام)');
}
function nhReopen(unit) {
  var k = normH(unit), u = S.wsAll.find(function (x) { return normH(x.unit) === k; });
  if (!u) { toast('الدار غير موجودة بشيت الموقف الأسبوعي حالياً.', false); return; }
  confirmBox('إعادة الدار (' + u.unit + ') كإشعار "دار جديدة"؟', 'ستُسحب من قيد التسليم حتى تفتح بياناتها وتوافق وترسل الواتساب.', function () {
    var by = S.user.name, at = Date.now();
    nhRef(k).transaction(function (cur) { return clean(Object.assign({}, cur || {}, { status: 'pending', unit: u, detectedAt: at, marked: true, reopenedAt: at, reopenedBy: by, rev: ((cur && cur.rev) || 0) + 1 })); });
    logActivity(u.unit, 'أعاد الدار كإشعار "دار جديدة"');
    closeModal();
  });
}
function newHouseMsg(u) {
  return 'السلام عليكم ورحمة الله وبركاته\n🏠 بيت جديد انضاف لقائمة "قيد التسليم":\nرقم البلوك والدار: ' + u.unit +
    '\nتاريخ الوارد: ' + (u.incomingDate || '-') + '\nتاريخ التسليم: ' + (u.deliveryDate || '-') +
    (u.sector ? '\nالقطاع: ' + u.sector : '') + (u.contractor ? '\nالمقاول: ' + u.contractor : '');
}

/* ================= العمليات على البيانات ================= */
function toggleReady(unit, val) {
  var k = normH(unit), cur = isReady(unit), v = (typeof val === 'boolean') ? val : !cur;
  if (v === cur) return;
  var upd = {}; upd[enc(k)] = v;
  S.db.readyMap = Object.assign({}, S.db.readyMap || {}, upd);
  R.child('readyMap').update(upd, function (err) { if (err) toast('⚠️ ما انحفظ التغيير: ' + (err.code || err.message), false); });
  logActivity(unit, v ? 'بدّل حالة الدار إلى جاهز' : 'بدّل حالة الدار إلى غير جاهز');
  scheduleRender();
}
function saveRecFields(id, fields) { R.child('oldRecords/' + id).update(clean(fields)); }
function deleteRecDB(id) { R.child('oldRecords/' + id).remove(); }
function dismissHouse(unit) { R.child('dismissed/' + enc(normH(unit))).set(true); }
function blockReviewIfWithinPeriod(houseNo) {
  var u = wsByKey(houseNo); if (!u) return false;
  var diff = daysDiff(u.deliveryDate);
  if (diff === null || diff <= 0) return false;
  infoBox('عذراً', 'الدار ضمن فترة التسليم ولم تتجاوز المدة، يرجى إدخال المراجعة بعد انتهاء فترة التسليم 🙂🙂🙂');
  return true;
}

/* ================= الواتساب ================= */
function waDialog(msg, commitFn) {
  openModal('<header><h3>💬 إرسال إلى كروب الواتساب</h3><button class="iconbtn" data-act="closeModal" aria-label="إغلاق">' + ico('close') + '</button></header>' +
    '<div class="bd"><p class="muted" style="margin:0">يُفتح الواتساب والرسالة جاهزة، اختر الكروب من قائمة المحادثات ثم اضغط إرسال. ' + (commitFn ? '<b>الحفظ يصير بس بعد ما تضغط إرسال.</b>' : '') + '</p><div class="pre">' + esc(msg) + '</div></div>' +
    '<footer><button class="btn wa" data-act="waSend">📢 إرسال إلى كروب واتساب</button><button class="btn" data-act="closeModal">إلغاء</button></footer>');
  MODAL.wa = { msg: msg, commit: commitFn };
}
function waSend() {
  var st = MODAL.wa; if (!st) return;
  if (typeof st.commit === 'function') { try { st.commit(); } catch (e) { console.error(e); toast('⚠️ تعذّر الحفظ: ' + e.message, false); } }
  var msg = st.msg || '';
  try { if (navigator.clipboard) navigator.clipboard.writeText(msg).catch(function () {}); } catch (e) {}
  closeModal();
  var encd = encodeURIComponent(msg), hidden = false;
  var onVis = function () { if (document.hidden) hidden = true; };
  document.addEventListener('visibilitychange', onVis, { once: true });
  setTimeout(function () {
    window.location.href = 'whatsapp://send?text=' + encd;
    setTimeout(function () { document.removeEventListener('visibilitychange', onVis); if (!hidden) window.open('https://wa.me/?text=' + encd, '_blank'); }, 1200);
  }, 500);
}

/* ================= النوافذ ================= */
var MODAL = {};
function openModal(inner, wide) {
  var root = document.getElementById('modal-root');
  root.innerHTML = '<div class="modal" data-act="modalBg"><div class="box' + (wide ? ' wide' : '') + '" role="dialog" aria-modal="true">' + inner + '</div></div>';
  var f = root.querySelector('[autofocus]'); if (f) setTimeout(function () { f.focus(); }, 30);
}
function closeModal() { document.getElementById('modal-root').innerHTML = ''; MODAL = {}; }
function confirmBox(title, text, onYes, yesLabel, danger) {
  openModal('<header><h3>' + esc(title) + '</h3></header><div class="bd"><p style="margin:0">' + esc(text || '') + '</p></div><footer><button class="btn ' + (danger ? 'danger' : 'pri') + '" data-act="confirmYes">' + esc(yesLabel || 'نعم') + '</button><button class="btn" data-act="closeModal">إلغاء</button></footer>');
  MODAL.yes = onYes;
}
function infoBox(title, text) { openModal('<header><h3>' + esc(title) + '</h3></header><div class="bd"><p style="margin:0;font-size:16px">' + esc(text) + '</p></div><footer><button class="btn pri" data-act="closeModal">تمام</button></footer>'); }

// كرت الدار (يُستخدم بالبحث ونافذة الأبراج والتنبيهات)
function houseCardHTML(r) {
  var st = statusLabel(r), rec = r.rec, b = beneficiary(r.houseNo);
  var h = '<div class="hcard"><header><div><div class="row" style="gap:10px"><span class="no">' + esc(r.houseNo) + '</span><span class="pill ' + st.c + '">' + esc(st.t) + '</span>' +
    (r.inWS && rec ? '<span class="pill p-rev">📋 قيد المراجعة أيضاً</span>' : '') + adminPill(r.deliveredDate) + adminPill(r.deliveryDate) + '</div>' +
    '<small>' + esc(r.sector || '-') + ' · ' + esc(execLabel(r.executionType, r.contractor) || '-') + '</small></div>' +
    '<button class="btn sm" style="background:rgba(255,255,255,.12);color:#fff;border-color:transparent" data-act="loadLog" data-h="' + esc(r.houseNo) + '">📜 سجل الحركات</button></header><div class="bd">';
  if (r.inWS) {
    var rd = isReady(r.houseNo);
    h += '<div><div class="row" style="justify-content:space-between;margin-bottom:8px"><b>موقف الدار</b><span class="muted" style="font-size:13px">' + esc(rd ? '' : overdueText(r.deliveryDate).replace(' — ', '')) + '</span></div>' +
      '<div class="readyseg" role="radiogroup" aria-label="موقف الدار"><button role="radio" aria-checked="' + rd + '" class="r' + (rd ? ' on' : '') + '" data-act="setReady" data-h="' + esc(r.houseNo) + '" data-v="1">✅ جاهز</button>' +
      '<button role="radio" aria-checked="' + (!rd) + '" class="n' + (!rd ? ' on' : '') + '" data-act="setReady" data-h="' + esc(r.houseNo) + '" data-v="0">⛔ غير جاهز</button></div></div>';
  }
  h += '<dl class="kv">' +
    kv('القطاع', r.sector) + kv('الجهة المنفذة / المقاول', execLabel(r.executionType, r.contractor)) +
    (r.incomingDate ? kv('تاريخ الوارد', r.incomingDate) : '') + (r.deliveryDate ? kv('تاريخ التسليم', r.deliveryDate) : '') +
    (r.deliveredDate ? kv('تاريخ الاستلام الفعلي', r.deliveredDate) : '') +
    ((b.name || r.delName) ? kv('اسم المستفيد', b.name || r.delName) : '') + (b.phone ? kv('رقم الهاتف', b.phone) : '') +
    (isDeliveredRec(rec) ? kv('حالة الدار', 'مسلّمة') : '') + '</dl>';
  var nb = (!r.inReview) ? notifiedBadge(r.houseNo) : '';
  if (nb) h += '<div>' + nb + '</div>';
  if (r.inReview && rec) {
    var rounds = rvRounds(rec), rs = rvStatus(rec);
    h += '<div><div class="row" style="justify-content:space-between;margin-bottom:8px"><b>🔍 جولات المراجعة (' + rounds.length + ')</b><span class="pill ' + rs.c + '">حالة الدار: ' + esc(rs.t) + '</span></div>' +
      '<div style="margin-bottom:8px"><span class="pill p-info">📨 تم تبليغ شعبة الإنهاءات</span></div><div class="rounds">' +
      rounds.map(function (x) {
        return '<div class="round"><div class="h"><b>م' + x.n + '</b><span>📅 ' + esc(x.reviewDate || '-') + '</span><span>✅ ' + esc(x.completionDate || '-') + '</span>' +
          '<button class="btn sm danger" style="margin-inline-start:auto" data-act="delRound" data-id="' + rec.id + '" data-i="' + (x.n - 1) + '">🗑️ حذف</button></div>' +
          (x.notes ? '<div class="n">📝 ' + esc(stripBidi(x.notes)) + '</div>' : '') + '</div>';
      }).join('') + '</div></div>' +
      '<div class="row"><button class="btn" data-act="editRec" data-id="' + rec.id + '">✏️ تعديل</button>' +
      '<button class="btn" data-act="newRound" data-id="' + rec.id + '">🔁 إضافة مراجعة جديدة</button>' +
      notesBtn(rec) + '<button class="btn danger" data-act="delRec" data-id="' + rec.id + '">🗑️ حذف المراجعة</button></div>';
  } else {
    h += '<div class="row" style="justify-content:space-between;padding-top:6px;border-top:1px dashed var(--line)"><span class="muted">👁️ لم يراجع المستفيد هذه الدار بعد</span>' +
      '<button class="btn" style="color:var(--review)" data-act="startReview" data-h="' + esc(r.houseNo) + '">👁️ هل راجع المستفيد؟</button></div>';
  }
  if (r.inWS) h += '<div class="row"><button class="btn sm" data-act="reopenNew" data-h="' + esc(r.houseNo) + '">🔔 إعادة إشعار دار جديدة</button></div>';
  var lg = S.logsFor[r.key];
  if (lg) {
    h += '<div><b>📜 سجل الحركات</b><div class="alist" style="margin-top:8px">' + (lg.length ? lg.map(function (it) {
      return '<div class="aitem"><div class="m"><b>✏️ ' + esc(it.action || '-') + '</b>' + (it.notes ? '<small>📝 ' + esc(it.notes) + '</small>' : '') + '<small>👤 ' + esc(it.by || '-') + ' · 📅 ' + esc(it.date || '-') + ' 🕐 ' + esc(it.time || '-') + '</small></div></div>';
    }).join('') : '<div class="muted">لا يوجد سجل بعد لهذه الدار.</div>') + '</div></div>';
  }
  return h + '</div></div>';
}
function kv(k, v) { return '<div><dt>' + esc(k) + '</dt><dd>' + esc(v || '-') + '</dd></div>'; }
function notesBtn(rec) {
  var done = !!rec.notesCompleted;
  return '<button class="btn' + (done ? ' wa' : '') + '" data-act="toggleNotes" data-id="' + rec.id + '">' + (done ? '✅ الملاحظات مكتملة' : '⬜ تم إكمال الملاحظات؟') + '</button>';
}
function openHouse(unit) {
  MODAL.house = unit;
  openModal('<header><h3>تفاصيل الدار</h3><button class="iconbtn" data-act="closeModal" aria-label="إغلاق">' + ico('close') + '</button></header><div class="bd" id="house-modal-bd">' + houseCardHTML(houseInfo(unit)) + '</div>', true);
}
function refreshHouseModal() {
  var bd = document.getElementById('house-modal-bd');
  if (bd && MODAL.house) bd.innerHTML = houseCardHTML(houseInfo(MODAL.house));
}

/* ----- المراجعة: بدء/نموذج/جولة جديدة ----- */
function startReview(houseNo) {
  var existing = reviewOf(houseNo);
  if (existing) { recForm(existing); return; }
  if (blockReviewIfWithinPeriod(houseNo)) return;
  var u = wsByKey(houseNo);
  if (!u) {
    var dItem = S.del.find(function (d) { return normS(d.houseNo) === normS(houseNo); });
    u = { unit: houseNo, __delivered: !!(dItem || getSheetDate(houseNo)), sector: dItem ? dItem.sector : '', contractor: '', executionType: '', incomingDate: '', deliveryDate: '' };
  }
  MODAL.pendingReview = u;
  openModal('<header><h3>👁️ هل راجع المستفيد؟</h3></header><div class="bd"><p style="margin:0;font-size:16px">الدار رقم (<b class="ltr">' + esc(u.unit) + '</b>) — ' + esc(u.sector || '') + (u.contractor ? ' — المقاول: ' + esc(u.contractor) : '') + '</p></div>' +
    '<footer><button class="btn pri" data-act="reviewYes">✅ نعم</button><button class="btn" data-act="closeModal">❌ لا</button></footer>');
}
function mapExec(txt) { return cell(txt).indexOf('مباشر') >= 0 ? 'تنفيذ مباشر' : 'مقاولين'; }
function contractorsList() { var l = toArr(D().contractors); return l.length ? l : DEFAULT_CONTRACTORS; }
function recForm(rec, fromUnit) {
  // rec = سجل موجود للتعديل، أو null مع fromUnit لسجل جديد
  var isNew = !rec, u = fromUnit || {};
  var delivered = isNew ? !!u.__delivered : isDeliveredRec(rec);
  var base = isNew ? {
    id: '', houseNo: u.unit || '', incomingDate: delivered ? '' : (u.incomingDate || ''),
    deliveryDate: delivered ? (getSheetDate(u.unit) || u.deliveryDate || '') : (u.deliveryDate || ''),
    status: delivered ? 'مستلم' : 'قيد التسليم', executionType: mapExec(u.executionType),
    sectorNo: SECTOR_NAMES.indexOf(u.sector) >= 0 ? u.sector : 'القطاع الأول',
    contractorName: mapExec(u.executionType) === 'مقاولين' ? (u.contractor || '') : '', notes: ''
  } : Object.assign({}, rec);
  if (!isNew && delivered) base.deliveryDate = getSheetDate(rec.houseNo) || rec.deliveryDate || '';
  var rounds = isNew ? [{ reviewDate: todayStr(), completionDate: addDays(todayStr(), 5) }] : rvRounds(rec);
  MODAL.form = { isNew: isNew, rec: rec, baseline: rec ? clean(rec) : null, delivered: delivered, rounds: rounds.map(function (x) { return { reviewDate: x.reviewDate, completionDate: x.completionDate, notes: x.notes || '' }; }) };
  var cons = contractorsList();
  if (base.contractorName && cons.indexOf(base.contractorName) < 0) cons = cons.concat([base.contractorName]);
  openModal('<header><h3>📋 بيانات مراجعة الدار</h3><button class="iconbtn" data-act="closeModal" aria-label="إغلاق">' + ico('close') + '</button></header><div class="bd">' +
    '<label class="fld">رقم البلوك والدار<input class="inp ltr" id="f-houseNo" value="' + esc(base.houseNo) + '" required></label>' +
    (delivered ? '' : '<label class="fld">تاريخ الوارد (تلقائي من قيد التسليم، قابل للتعديل)<input class="inp" id="f-incoming" value="' + esc(base.incomingDate || '') + '" placeholder="2026-09-10"></label>') +
    '<label class="fld">' + (delivered ? 'تاريخ التسليم (تلقائي من شيت الدور المسلّمة — غير قابل للتعديل)' : 'تاريخ التسليم (تلقائي من قيد التسليم، قابل للتعديل)') + '<input class="inp" id="f-delivery" value="' + esc(base.deliveryDate || '') + '"' + (delivered ? ' readonly style="opacity:.7"' : '') + '></label>' +
    '<div class="grid" style="grid-template-columns:repeat(2,minmax(0,1fr))"><label class="fld">نوع التنفيذ<select class="inp" id="f-exec" data-in="execChange"><option' + (base.executionType === 'تنفيذ مباشر' ? ' selected' : '') + '>تنفيذ مباشر</option><option' + (base.executionType === 'مقاولين' ? ' selected' : '') + '>مقاولين</option></select></label>' +
    '<label class="fld">رقم القطاع<select class="inp" id="f-sector">' + SECTOR_NAMES.map(function (s) { return '<option' + (s === base.sectorNo ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('') + '</select></label></div>' +
    '<label class="fld' + (base.executionType === 'مقاولين' ? '' : ' hidden') + '" id="f-con-wrap">اسم المقاول<select class="inp" id="f-contractor">' + cons.map(function (c) { return '<option' + (c === base.contractorName ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '<option value="__new">+ إضافة مقاول جديد</option></select></label>' +
    '<label class="fld">الملاحظات<textarea class="inp" id="f-notes" rows="3">' + esc(base.notes || '') + '</textarea></label>' +
    '<div><b>🔁 جولات المراجعة</b> <span class="muted" style="font-size:13px">(العدد يُحسب تلقائياً)</span><div id="f-rounds" style="display:flex;flex-direction:column;gap:8px;margin-top:8px"></div>' +
    '<button class="btn sm" style="margin-top:8px" data-act="roundAdd">➕ إضافة جولة مراجعة</button></div>' +
    '</div><footer><button class="btn pri" data-act="saveRec">💾 حفظ بيانات المراجعة</button><button class="btn" data-act="closeModal">إلغاء</button></footer>', true);
  drawRoundsEditor();
}
function drawRoundsEditor() {
  var box = document.getElementById('f-rounds'); if (!box || !MODAL.form) return;
  box.innerHTML = MODAL.form.rounds.map(function (x, i) {
    return '<div class="round"><div class="row" style="align-items:flex-end"><b style="width:36px">م' + (i + 1) + '</b>' +
      '<label class="fld" style="flex:1;min-width:140px">تاريخ المراجعة<input type="date" class="inp" data-in="roundEdit" data-i="' + i + '" data-f="reviewDate" value="' + esc(x.reviewDate || '') + '"></label>' +
      '<label class="fld" style="flex:1;min-width:140px">تاريخ إنهاء الملاحظات<input type="date" class="inp" data-in="roundEdit" data-i="' + i + '" data-f="completionDate" value="' + esc(x.completionDate || '') + '"></label>' +
      '<button class="iconbtn" data-act="roundDel" data-i="' + i + '" aria-label="حذف الجولة" style="color:var(--notready)">🗑️</button></div></div>';
  }).join('');
}
function saveRec() {
  var F = MODAL.form; if (!F) return;
  var houseNo = document.getElementById('f-houseNo').value.trim();
  if (!houseNo) { toast('اكتب رقم الدار', false); return; }
  var inc = document.getElementById('f-incoming'), dlv = document.getElementById('f-delivery');
  var exec = document.getElementById('f-exec').value, sector = document.getElementById('f-sector').value;
  var con = exec === 'مقاولين' ? document.getElementById('f-contractor').value : '';
  if (con === '__new') con = '';
  var notes = document.getElementById('f-notes').value.trim();
  var rounds = F.rounds.length ? F.rounds : [{ reviewDate: todayStr(), completionDate: addDays(todayStr(), 5) }];
  var editId = F.rec ? F.rec.id : null;
  if (oldRecs().some(function (r) { return String(r.id) !== String(editId) && normH(r.houseNo) === normH(houseNo); })) { toast('⚠️ رقم الدار والبلوك هذا مسجل سابقاً ضمن قائمة المراجعة!', false); return; }
  var prevExtra = F.rec ? toArr(F.rec.extraRounds) : [];
  var rec = Object.assign({}, F.rec || { id: Date.now() }, {
    houseNo: houseNo, incomingDate: inc ? inc.value.trim() : (F.rec ? (F.rec.incomingDate || '') : ''), deliveryDate: dlv.value.trim(),
    status: F.delivered ? 'مستلم' : ((F.rec && F.rec.status) || 'قيد التسليم'), handoverDate: (F.rec && F.rec.handoverDate) || '',
    executionType: exec, sectorNo: sector, contractorName: con, notes: notes,
    reviewDate: rounds[0].reviewDate || todayStr(), notesEndDate: rounds[0].completionDate || addDays(todayStr(), 5),
    extraRounds: rounds.slice(1).map(function (x, i) { return { reviewDate: x.reviewDate || '', completionDate: x.completionDate || '', notes: x.notes || ((prevExtra[i] || {}).notes) || '' }; }),
    round2ReviewDate: '', round2EndDate: '', round2Notes: ''
  });
  var isDel = isDeliveredRec(rec);
  var dmsg = rec.deliveryDate || ''; if (isDel) { var sd = getSheetDate(rec.houseNo); if (sd) dmsg = sd; }
  var lines = rvRounds(rec).map(function (x) { return 'مراجعة ' + x.n + ' — تاريخ المراجعة: ' + (x.reviewDate || '-') + ' — موعد إنهاء الملاحظات: ' + (x.completionDate || '-'); }).join('\n');
  var msg = 'تسجيل مراجعة دار\nرقم الدار والبلوك: ' + rec.houseNo + '\nالقطاع: ' + (rec.sectorNo || '-') + ' | المقاول: ' + (rec.contractorName || rec.executionType || '-') +
    '\nحالة الدار: ' + (isDel ? 'مسلّمة' : 'قيد التسليم') + '\nتاريخ التسليم: ' + (dmsg || '-') + '\n' + lines + '\nالملاحظات: ' + (rec.notes || 'لا يوجد') + '\n\nمكتب التسليم الفني - مجمع الأميرات 2';
  var baseline = F.baseline, existed = !!F.rec;
  var commit = function () {
    if (!existed) logActivity(houseNo, 'أضاف الدار لقائمة المراجعة (دار جديدة)', rec.notes || '');
    else if (baseline && baseline.status !== rec.status) logActivity(houseNo, 'غيّر حالة الدار من "' + (baseline.status || '-') + '" إلى "' + (rec.status || '-') + '"', rec.notes || '');
    else logActivity(houseNo, 'عدّل بيانات الدار', rec.notes || '');
    if (!existed || !baseline) { R.child('oldRecords/' + rec.id).set(clean(rec)); }
    else {
      var changed = {}, keys = {};
      Object.keys(rec).concat(Object.keys(baseline)).forEach(function (k) { keys[k] = 1; });
      Object.keys(keys).forEach(function (k) { if (JSON.stringify(rec[k]) !== JSON.stringify(baseline[k])) changed[k] = rec[k] === undefined ? null : rec[k]; });
      if (Object.keys(changed).length) R.child('oldRecords/' + rec.id).update(clean(changed));
    }
    toast('✅ انحفظت بيانات المراجعة');
  };
  waDialog(msg, commit);
}
function newRoundForm(id) {
  var rec = oldRecs().find(function (r) { return String(r.id) === String(id); }); if (!rec) return;
  if (blockReviewIfWithinPeriod(rec.houseNo)) return;
  var rounds = rvRounds(rec), last = rounds[rounds.length - 1], t = todayStr();
  MODAL.nr = { id: rec.id };
  openModal('<header><h3>🔁 إضافة مراجعة جديدة (مراجعة ' + (rounds.length + 1) + ')</h3><button class="iconbtn" data-act="closeModal" aria-label="إغلاق">' + ico('close') + '</button></header><div class="bd">' +
    '<p style="margin:0">🏠 الدار: <b class="ltr">' + esc(rec.houseNo) + '</b></p><div class="rounds">' + rounds.map(function (x) {
      return '<div class="round"><div class="h"><b>مراجعة ' + x.n + '</b><span>📅 ' + esc(x.reviewDate || '-') + '</span><span>✅ ' + esc(x.completionDate || '-') + '</span></div>' + (x.notes ? '<div class="n">📝 ' + esc(stripBidi(x.notes)) + '</div>' : '') + '</div>';
    }).join('') + '</div>' +
    '<div class="grid" style="grid-template-columns:repeat(2,minmax(0,1fr))"><label class="fld">تاريخ المراجعة الجديد<input type="date" class="inp" id="nr-review" data-in="nrSync" value="' + t + '"></label>' +
    '<label class="fld">تاريخ إنهاء الملاحظات الجديد<input type="date" class="inp" id="nr-end" value="' + addDays(t, 5) + '"></label></div>' +
    '<label class="fld">الملاحظات<textarea class="inp" id="nr-notes" rows="3">' + esc((last && last.notes) || '') + '</textarea></label></div>' +
    '<footer><button class="btn pri" data-act="saveNewRound">💾 حفظ وإرسال واتساب</button><button class="btn" data-act="closeModal">إلغاء</button></footer>');
}
function saveNewRound() {
  var rec = oldRecs().find(function (r) { return String(r.id) === String(MODAL.nr.id); }); if (!rec) return;
  var rd = document.getElementById('nr-review').value || '', ed = document.getElementById('nr-end').value || '', notes = document.getElementById('nr-notes').value || '';
  var rounds = rvRounds(rec);
  var all = rounds.concat([{ n: rounds.length + 1, reviewDate: rd, completionDate: ed }]);
  var isDel = isDeliveredRec(rec), dd = rec.deliveryDate || ''; if (isDel) { var sd = getSheetDate(rec.houseNo); if (sd) dd = sd; }
  var msg = 'السلام عليكم ورحمة الله وبركاته\nالدار رقم: ' + (rec.houseNo || '-') + '\nالقطاع: ' + (rec.sectorNo || '-') + ' | المقاول: ' + (rec.contractorName || rec.executionType || '-') +
    '\nحالة الدار: ' + (isDel ? 'مسلّمة' : 'قيد التسليم') + '\nتاريخ التسليم: ' + (dd || '-') + '\n' +
    all.map(function (x) { return 'مراجعة ' + x.n + ' — تاريخ المراجعة: ' + (x.reviewDate || '-') + ' — تاريخ إكمال الملاحظات: ' + (x.completionDate || '-'); }).join('\n') +
    '\nالملاحظات: ' + (notes || rec.notes || 'لا توجد ملاحظات');
  waDialog(msg, function () {
    var extra = toArr(rec.extraRounds).concat([{ reviewDate: rd, completionDate: ed, notes: notes }]);
    var f = { extraRounds: extra }; if (notes) f.notes = notes;
    saveRecFields(rec.id, f);
    logActivity(rec.houseNo, 'أضاف مراجعة جديدة (مراجعة ' + all.length + ')', notes || '');
    toast('✅ انضافت المراجعة ' + all.length);
  });
}
function deleteRound(id, idx) {
  var rec = oldRecs().find(function (r) { return String(r.id) === String(id); }); if (!rec) return;
  var rounds = rvRounds(rec);
  if (rounds.length <= 1) { deleteRec(id); return; }
  confirmBox('🗑️ حذف مراجعة ' + (idx + 1) + ' نهائياً؟', 'الدار ' + rec.houseNo, function () {
    rounds.splice(idx, 1);
    var first = rounds[0] || { reviewDate: '', completionDate: '', notes: '' };
    saveRecFields(rec.id, { reviewDate: first.reviewDate || '', notesEndDate: first.completionDate || '', notes: first.notes || '',
      extraRounds: rounds.slice(1).map(function (x) { return { reviewDate: x.reviewDate || '', completionDate: x.completionDate || '', notes: x.notes || '' }; }), round2ReviewDate: '', round2EndDate: '', round2Notes: '' });
    logActivity(rec.houseNo, 'حذف مراجعة رقم ' + (idx + 1));
    closeModalOrRefresh();
  }, 'حذف', true);
}
function deleteRec(id) {
  var rec = oldRecs().find(function (r) { return String(r.id) === String(id); }); if (!rec) return;
  if (isDeliveredRec(rec)) {
    confirmBox('🗑️ حذف الدار رقم (' + rec.houseNo + ') من المراجعة نهائياً؟', '', function () { deleteRecDB(rec.id); logActivity(rec.houseNo, 'حذف سجل المراجعة'); closeModal(); }, 'حذف', true);
    return;
  }
  MODAL.delId = rec.id;
  openModal('<header><h3>🗑️ حذف سجل المراجعة</h3></header><div class="bd"><p style="margin:0">الدار رقم (<b class="ltr">' + esc(rec.houseNo) + '</b>) — اختر طريقة الحذف:</p></div>' +
    '<footer style="flex-direction:column"><button class="btn danger" data-act="delChoice" data-m="full">🗑️ حذف نهائي (من المراجعة وقيد التسليم)</button><button class="btn" data-act="delChoice" data-m="reviewOnly">📋 حذف من المراجعة فقط (تبقى بقيد التسليم)</button><button class="btn" data-act="closeModal">إلغاء</button></footer>');
}
function closeModalOrRefresh() { if (MODAL.house) { var h = MODAL.house; closeModal(); openHouse(h); } else closeModal(); }

/* ================= الرسم ================= */
var renderQueued = false;
function scheduleRender() { if (renderQueued) return; renderQueued = true; requestAnimationFrame(function () { renderQueued = false; renderAll(); }); }
function renderAll() {
  if (!S.user) return;
  renderRail(); renderTop();
  var ae = document.activeElement, aid = ae && ae.id, ss = null, se = null;
  if (aid && ae.setSelectionRange && /^(INPUT|TEXTAREA)$/.test(ae.tagName)) { try { ss = ae.selectionStart; se = ae.selectionEnd; } catch (e) {} }
  var view = document.getElementById('view');
  var fnc = VIEWS[S.view] || VIEWS.search;
  var wasInView = ae && view.contains(ae);
  view.innerHTML = fnc();
  if (aid && wasInView) { var el2 = document.getElementById(aid); if (el2) { el2.focus(); if (ss != null) try { el2.setSelectionRange(ss, se); } catch (e) {} } }
  if (MODAL.house) refreshHouseModal();
}
var NAV = [
  ['search', 'بحث سريع'], ['dash', 'لوحة المؤشرات'], ['ws', 'قيد التسليم (الأبراج)'], ['today', 'التنبيهات'],
  ['delivered', 'الدور المسلّمة'], ['weekly', 'الموقف الأسبوعي'], ['annual', 'الجرد السنوي'],
  ['agenda', 'جدول الأعمال'], ['settings', 'الإعدادات']
];
function renderRail() {
  var rail = document.getElementById('rail'), n = alertBadgeCount();
  rail.innerHTML = '<div class="logo"><button data-act="toggleRail" aria-label="' + (rail.classList.contains('open') ? 'تصغير القائمة' : 'توسيع القائمة') + '" aria-expanded="' + rail.classList.contains('open') + '"><img src="icon-192.webp" alt=""></button>' +
    '<div class="t"><b>مجمع الأميرات 2</b><small>مكتب التسليم الفني</small></div></div><nav>' +
    NAV.map(function (x) {
      var c = x[0] === 'today' ? n : (x[0] === 'search' ? noticeCount() : 0);
      var b = c ? '<span class="bdg">' + c + '</span>' : '';
      return '<button class="navbtn' + (S.view === x[0] ? ' on' : '') + '" data-act="go" data-v="' + x[0] + '" title="' + esc(x[1]) + '">' + ico(x[0] === 'ws' ? 'ws' : x[0], 22) + '<span class="lbl">' + esc(x[1]) + '</span>' + b + '</button>';
    }).join('') + '</nav><div class="foot">' + (rail.classList.contains('open') ? 'Design by: Montather Ali' : 'MA') + '</div>';
}
var TITLES = { search: 'ابحث عن دار', dash: 'لوحة المؤشرات', ws: 'قيد التسليم', today: 'التنبيهات وشغل اليوم', delivered: 'الدور المسلّمة', weekly: 'الموقف الأسبوعي للمقاولين', annual: 'الجرد السنوي', agenda: 'جدول الأعمال', settings: 'الإعدادات' };
function renderTop() {
  var top = document.getElementById('topbar'); if (!S.user) return;
  var n = alertBadgeCount();
  top.innerHTML = '<h1>' + esc(TITLES[S.view] || '') + '<small>' + todayStr() + ' · آخر مزامنة للشيت: ' + esc(S.wsLast || 'لم تتم بعد') + '</small></h1>' +
    '<span class="chip net' + (S.online ? ' on' : ' off') + '" role="status"><span class="dot' + (S.online ? '' : ' off') + '"></span>' + (S.online ? '🟢 متصل بالسحابة (مزامنة فورية)' : '🔴 غير متصل حالياً — البيانات محفوظة بالجهاز وتنرفع أول ما يرجع النت') + '</span>' +
    '<span class="credit ltr">✨ Design by: <b>Montather Ali</b></span>' +
    '<button class="iconbtn" data-act="syncAll" aria-label="تحديث من الشيتات" title="تحديث من الشيتات">' + ico('refresh') + '</button>' +
    '<button class="iconbtn" data-act="go" data-v="today" aria-label="التنبيهات" title="التنبيهات">' + ico('today') + (n ? '<span class="bdg">' + n + '</span>' : '') + '</button>' +
    '<button class="iconbtn" data-act="theme" aria-label="تبديل الوضع الليلي" title="الوضع الليلي">' + ico('sun') + '</button>' +
    '<button class="chip" data-act="logout" title="تسجيل خروج">👤 ' + esc(S.user.name) + ' ' + ico('logout', 16) + '</button>';
}

/* ----- عرض: البحث السريع ----- */
var VIEWS = {};
VIEWS.search = function () {
  var res = globalSearch(S.q), sel = null;
  if (res.length) { sel = res.find(function (r) { return r.key === S.sel; }) || res[0]; S.sel = sel.key; }
  var h = '<label class="bigsearch">' + ico('search', 24) + '<input id="q" type="search" data-in="q" value="' + esc(S.q) + '" placeholder="رقم الدار (مثلاً B12.6) أو المقاول أو القطاع أو اسم المستفيد" aria-label="بحث عن دار" autocomplete="off"></label>';
  h += noticesHTML();
  if (!S.q) {
    var defs = baseDefs(['ws', 'ready', 'notready', 'review', 'delivered']);
    h += tilesHTML('search', defs) + (panelHTML('search', defs) || '<div class="card empty">اكتب رقم الدار فوق، أو اضغط أي مربع حتى تطلع دوره بس.</div>');
    return h;
  }
  if (!res.length) return h + '<div class="card empty">لا نتائج مطابقة ضمن أي قائمة (قيد التسليم / المراجعة / المسلّمة).</div>';
  h += '<div class="split"><div class="l"><div class="muted" style="font-size:13px">' + res.length + ' نتيجة</div>' + res.map(function (r) {
    var st = statusLabel(r), rd = r.inWS ? (isReady(r.houseNo) ? '<span class="pill p-ready">جاهز</span>' : '<span class="pill p-not">غير جاهز</span>') : '<span class="pill ' + st.c + '">' + (r.inDelivered ? 'مستلمة' : 'مراجعة') + '</span>';
    return '<button class="res' + (r.key === S.sel ? ' on' : '') + '" data-act="pick" data-k="' + esc(r.key) + '"><span><span class="no">' + esc(r.houseNo) + '</span><small>' + esc(r.sector || '-') + ' · ' + esc(r.contractor || r.executionType || r.delName || '-') + '</small></span>' + rd + '</button>';
  }).join('') + '</div><div class="r">' + houseCardHTML(Object.assign(houseInfo(sel.houseNo), { key: sel.key })) + '</div></div>';
  return h;
};
/* ----- إشعارات خانة البحث: دور جديدة + وقّعت محضر استلام ----- */
function noticesHTML() {
  var pend = pendingNew(), cr = crossovers(), h = '';
  if (pend.length) {
    h += '<div class="banner new"><h3>🏠 ' + pend.length + ' دار جديدة انضافت بشيت "الموقف الاسبوعي" — افتح بياناتها وأرسل التبليغ حتى تدخل النظام:</h3><div class="plist">' + pend.map(function (u) {
      return '<button class="aitem" data-act="newHouse" data-h="' + esc(u.unit) + '"><span class="m"><b class="ltr" style="text-align:right">' + esc(u.unit) + '</b><small>📥 ' + esc(u.incomingDate || '-') + ' · 📤 ' + esc(u.deliveryDate || '-') + (u.sector ? ' · 📍 ' + esc(u.sector) : '') + (u.detectedAt ? ' · 🕒 ' + esc(new Date(u.detectedAt).toLocaleString('ar-IQ')) : '') + '</small></span><span class="btn sm pri">📋 فتح بيانات الدار</span></button>';
    }).join('') + '</div></div>';
  }
  if (cr.length) {
    h += '<div class="banner del"><h3>🔔 ' + cr.length + ' دار وقّعت محضر استلام (انضافت لشيت "تواريخ التسليم") وما زالت ظاهرة بقيد التسليم و/أو المراجعة — تحذف النسختين؟</h3><div class="plist">' + cr.map(function (a) {
      return '<div class="aitem"><span class="m"><b class="ltr" style="text-align:right">' + esc(a.houseNo) + '</b><small>تاريخ الاستلام: ' + esc(a.date) + (isAdminNote(a.date) ? ' · 🏛 تبليغ إدارة' : '') + '</small></span><button class="btn sm danger" data-act="delBoth" data-h="' + esc(a.houseNo) + '">🗑️ حذف النسختين</button><button class="btn sm" data-act="snooze" data-h="' + esc(a.houseNo) + '">🙈 تجاهل الآن</button></div>';
    }).join('') + '</div></div>';
  }
  return h;
}
/* ----- المربعات: الضغط على أي مربع يعرض دوره بس ----- */
function wsItem(u) {
  var r = isReady(u.unit), rv = !!reviewOf(u.unit);
  return { h: u.unit, sub: (u.sector || '-') + ' · ' + execLabel(u.executionType, u.contractor) + ' · 📥 ' + (u.incomingDate || '-') + ' · 📤 ' + (u.deliveryDate || '-') + (rv ? ' · 📋 قيد المراجعة أيضاً' : ''),
    pill: r ? ['p-ready', '✅ جاهز'] : ['p-not', '⛔ غير جاهز' + overdueText(u.deliveryDate)],
    xl: [u.unit, u.sector, execLabel(u.executionType, u.contractor), u.incomingDate, u.deliveryDate, r ? 'جاهز' : 'غير جاهز'] };
}
function recItem(rec) {
  var st = rvStatus(rec), n = rvRounds(rec).length, dl = isDeliveredRec(rec) ? rvDeliveredDate(rec) : rvDates(rec).deliveryDate;
  return { h: rec.houseNo, sub: (rec.sectorNo || '-') + ' · ' + (rec.contractorName || rec.executionType || '-') + ' · 📤 ' + (dl || '-') + ' · ' + n + ' مراجعة', pill: [st.c, st.t],
    xl: [rec.houseNo, rec.sectorNo, rec.contractorName || rec.executionType, dl, n, st.t] };
}
function delItem(x) { return { h: x.houseNo, sub: (x.name || '-') + (x.sector ? ' · ' + x.sector : ''), pill: ['p-ok', x.date + (isAdminNote(x.date) ? ' 🏛 تبليغ إدارة' : '')], xl: [x.houseNo, x.name, x.sector, x.date] }; }
function alItem(x, cls) { return { h: x.houseNo, sub: '🛠️ ' + stripBidi(x.contractor || '-') + ' · 📍 ' + stripBidi(x.sector || '-') + ' · 📥 ' + (x.incomingDate || '-') + ' · 📤 ' + (x.deliveryDate || '-'), pill: [cls, stripBidi(x.detail)], xl: [x.houseNo, x.contractor, x.sector, x.incomingDate, x.deliveryDate, x.detail] }; }
var HEAD = {
  ws: ['رقم البلوك والدار', 'القطاع', 'الجهة المنفذة', 'تاريخ الوارد', 'تاريخ التسليم', 'الحالة'],
  rec: ['رقم البلوك والدار', 'القطاع', 'المقاول', 'تاريخ التسليم', 'عدد المراجعات', 'الحالة'],
  del: ['رقم البلوك والدار', 'اسم المستفيد', 'القطاع', 'تاريخ الاستلام'],
  al: ['رقم البلوك والدار', 'المقاول', 'القطاع', 'تاريخ الوارد', 'تاريخ التسليم', 'التفاصيل']
};
function byDue(a, b) { var x = daysDiff(a.deliveryDate), y = daysDiff(b.deliveryDate); return (x == null ? 9e9 : x) - (y == null ? 9e9 : y); }
function baseDefs(keys) {
  var ws = wsUnits(), rdy = ws.filter(function (u) { return isReady(u.unit); });
  var nrd = ws.filter(function (u) { return !isReady(u.unit); });
  var near = ws.filter(function (u) { var d = daysDiff(u.deliveryDate); return d !== null && d >= 1 && d <= 3; });
  var late = ws.filter(function (u) { var d = daysDiff(u.deliveryDate); return d !== null && d <= 0; });
  var rev = oldRecs().filter(function (r) { return !isDeliveredRec(r); });
  var all = {
    ws: { label: 'قيد التسليم', n: ws.length, sub: 'بشيت الموقف الأسبوعي', color: 'var(--brand)', list: function () { return { head: HEAD.ws, items: ws.slice().sort(byDue).map(wsItem) }; } },
    ready: { label: 'جاهزة', n: rdy.length, sub: ws.length ? Math.round(rdy.length / ws.length * 100) + '٪ من قيد التسليم' : '', color: 'var(--ready)', list: function () { return { head: HEAD.ws, items: rdy.slice().sort(byDue).map(wsItem) }; } },
    notready: { label: 'غير جاهزة', n: nrd.length, sub: '', color: 'var(--notready)', list: function () { return { head: HEAD.ws, items: nrd.slice().sort(byDue).map(wsItem) }; } },
    near: { label: 'قريبة', n: near.length, sub: 'موعدها خلال ١–٣ أيام', color: 'var(--ready)', list: function () { return { head: HEAD.ws, items: near.slice().sort(byDue).map(wsItem) }; } },
    late: { label: 'متجاوزة الموعد', n: late.length, sub: 'يوم الموعد نفسه يُحسب متجاوز', color: 'var(--notready)', list: function () { return { head: HEAD.ws, items: late.slice().sort(byDue).map(wsItem) }; } },
    review: { label: 'قيد المراجعة', n: rev.length, sub: 'مراجع عليها وما مسلّمة', color: 'var(--review)', list: function () { return { head: HEAD.rec, items: rev.map(recItem) }; } },
    delivered: { label: 'المسلّمة', n: S.del.length, sub: 'بشيت تواريخ الاستلام', color: 'var(--ok)', list: function () { return { head: HEAD.del, items: S.del.slice().sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); }).map(delItem) }; } }
  };
  return keys.map(function (k) { return Object.assign({ k: k }, all[k]); });
}
function tilesHTML(view, defs) {
  var sel = S.tiles[view];
  return '<div class="kpis">' + defs.map(function (d) {
    var on = sel === d.k;
    return '<button class="kpi' + (on ? ' on' : '') + '" data-act="tile" data-g="' + view + '" data-k="' + d.k + '" aria-pressed="' + on + '"><span class="k"><i style="background:' + d.color + '"></i>' + esc(d.label) + '</span><span class="v">' + d.n + '</span><span class="s">' + esc(d.sub || '') + '</span></button>';
  }).join('') + '</div>';
}
function panelHTML(view, defs) {
  var sel = S.tiles[view], d = defs.find(function (x) { return x.k === sel; });
  if (!d) return '';
  var close = '<button class="btn sm" data-act="tile" data-g="' + view + '" data-k="' + d.k + '">✕ إغلاق</button>';
  if (d.html) return '<section class="card" id="panel"><h2><span>' + esc(d.label) + ' <small>' + d.n + '</small></span>' + close + '</h2>' + d.html() + '</section>';
  var data = d.list(), items = data.items, shown = items.slice(0, S.panelShow);
  S.panel = { title: d.label, head: data.head, rows: items.map(function (i) { return i.xl; }) };
  return '<section class="card" id="panel"><h2><span>' + esc(d.label) + ' <small>' + items.length + ' دار</small></span><span class="row" style="gap:8px"><button class="btn sm" data-act="panelXl">' + ico('xls', 16) + ' Excel</button>' + close + '</span></h2>' +
    (items.length ? '<div class="plist">' + shown.map(function (it) {
      return '<button class="aitem" data-act="house" data-h="' + esc(it.h) + '"><span class="m"><b class="ltr" style="text-align:right">' + esc(it.h) + '</b><small>' + esc(it.sub) + '</small></span><span class="pill ' + it.pill[0] + '" style="white-space:normal">' + esc(it.pill[1]) + '</span></button>';
    }).join('') + '</div>' + (items.length > shown.length ? '<div class="row" style="justify-content:center;margin-top:12px"><button class="btn" data-act="panelMore">⬇️ عرض المزيد (' + shown.length + ' من ' + items.length + ')</button></div>' : '')
      : '<div class="empty">لا توجد دور ضمن هذا المربع حالياً.</div>') + '</section>';
}
function kpi(label, val, sub, color, go, extra) {
  return '<button class="kpi" data-act="go" data-v="' + go + '"' + (extra || '') + '><span class="k"><i style="background:' + color + '"></i>' + esc(label) + '</span><span class="v">' + val + '</span><span class="s">' + esc(sub || '') + '</span></button>';
}

/* ----- عرض: لوحة المؤشرات ----- */
VIEWS.dash = function () {
  var ws = wsUnits(), rdy = 0, timing = { late: 0, near: 0, ok: 0, none: 0 }, byCon = {}, bySec = {}, conOrder = [], secOrder = [];
  ws.forEach(function (u) {
    var r = isReady(u.unit), d = daysDiff(u.deliveryDate);
    if (r) rdy++;
    var t = d === null ? 'none' : (d <= 0 ? 'late' : (d <= 3 ? 'near' : 'ok')); timing[t]++;
    var ck = execLabel(u.executionType, u.contractor);
    if (!byCon[ck]) { byCon[ck] = { n: ck, r: 0, nr: 0, late: 0, delaySum: 0, delayN: 0 }; conOrder.push(ck); }
    byCon[ck][r ? 'r' : 'nr']++; if (d !== null && d <= 0) { byCon[ck].late++; byCon[ck].delaySum += -d; byCon[ck].delayN++; }
    var sk = u.sector || 'غير محدد';
    if (!bySec[sk]) { bySec[sk] = { n: sk, r: 0, nr: 0 }; secOrder.push(sk); }
    bySec[sk][r ? 'r' : 'nr']++;
  });
  var total = ws.length || 1, A = computeAlerts();
  var revOpen = oldRecs().filter(function (r) { return !isDeliveredRec(r); }).length;
  var ddefs = baseDefs(['ws', 'ready', 'notready', 'near', 'late', 'review', 'delivered']);
  var h = tilesHTML('dash', ddefs) + panelHTML('dash', ddefs);
  // دائرة المواعيد
  var C = 2 * Math.PI * 70, acc = 0;
  var parts = [['ضمن المدة', timing.ok, 'var(--brand)'], ['قريبة (١–٣ أيام)', timing.near, 'var(--ready)'], ['متجاوزة الموعد', timing.late, 'var(--notready)'], ['بدون تاريخ مقروء', timing.none, 'var(--muted)']];
  var circ = parts.map(function (p) { var len = p[1] / total * C; var s = '<circle cx="95" cy="95" r="70" fill="none" stroke="' + p[2] + '" stroke-width="26" stroke-dasharray="' + len.toFixed(1) + ' ' + C.toFixed(1) + '" stroke-dashoffset="' + (-acc).toFixed(1) + '"></circle>'; acc += len; return s; }).join('');
  h += '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(min(330px,100%),1fr))">' +
    '<div class="card"><h2>مواعيد دور قيد التسليم <small>حسب تاريخ التسليم بالشيت</small></h2><div class="row" style="gap:22px">' +
    '<div style="position:relative;width:190px;height:190px"><svg width="190" height="190" viewBox="0 0 190 190" role="img" aria-label="توزيع مواعيد التسليم"><g transform="rotate(-90 95 95)"><circle cx="95" cy="95" r="70" fill="none" stroke="var(--soft)" stroke-width="26"></circle>' + circ + '</g></svg>' +
    '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center"><b class="disp" style="font-size:32px">' + Math.round(rdy / total * 100) + '٪</b><span class="muted" style="font-size:12.5px">جاهزة</span></div></div>' +
    '<div style="display:flex;flex-direction:column;gap:8px;flex:1;min-width:150px">' + parts.map(function (p) { return '<button class="aitem" data-act="go" data-v="ws" style="padding:8px 10px"><span class="bar" style="background:' + p[2] + '"></span><span class="m"><b style="font-size:14px">' + p[0] + '</b></span><b>' + p[1] + '</b></button>'; }).join('') + '</div></div></div>';
  // المسلّم شهرياً — آخر 12 شهر من شيت تواريخ الاستلام
  var months = [], now = new Date();
  for (var i = 11; i >= 0; i--) { var dt = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push({ k: dt.getFullYear() + '-' + pad2(dt.getMonth() + 1), m: dt.getMonth() + 1, y: dt.getFullYear(), n: 0 }); }
  var mIdx = {}; months.forEach(function (m, i) { mIdx[m.k] = i; });
  S.del.forEach(function (x) { var k = String(x.date || '').slice(0, 7); if (mIdx[k] != null) months[mIdx[k]].n++; });
  var mMax = Math.max.apply(null, months.map(function (m) { return m.n; }).concat([1]));
  h += '<div class="card"><h2>المسلّم شهرياً <small>آخر ١٢ شهر — من شيت تواريخ الاستلام</small></h2><div class="bars">' +
    months.map(function (m, i) { return '<button class="b" data-act="go" data-v="annual" title="' + AR_MONTHS[m.m] + ' ' + m.y + ': ' + m.n + '"><span>' + m.n + '</span><i style="height:' + (m.n / mMax * 100).toFixed(0) + '%;background:' + (i === 11 ? 'var(--gold)' : 'var(--brand)') + '"></i></button>'; }).join('') +
    '</div><div class="bars-x">' + months.map(function (m) { return '<span>' + AR_MONTHS_SHORT[m.m] + '</span>'; }).join('') + '</div></div></div>';
  // حسب المقاول + حسب القطاع
  var cons = conOrder.map(function (k) { return byCon[k]; }).sort(function (a, b) { return (b.r + b.nr) - (a.r + a.nr); });
  var cMax = Math.max.apply(null, cons.map(function (c) { return c.r + c.nr; }).concat([1]));
  h += '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(min(420px,100%),1fr))"><div class="card"><h2>قيد التسليم حسب المقاول <small>جاهز / غير جاهز · متوسط التأخير</small></h2><div style="display:flex;flex-direction:column;gap:6px;max-height:430px;overflow:auto">' +
    cons.map(function (c) {
      var tot = c.r + c.nr, avg = c.delayN ? Math.round(c.delaySum / c.delayN) : 0;
      return '<button class="hbar" data-act="wsFilter" data-con="' + esc(c.n) + '" style="grid-template-columns:minmax(90px,170px) minmax(0,1fr) 40px 74px"><span class="nm" title="' + esc(c.n) + '">' + esc(c.n) + '</span><span class="tr" style="width:' + (tot / cMax * 100).toFixed(0) + '%"><i style="width:' + (c.r / tot * 100) + '%;background:var(--ready)"></i><i style="width:' + (c.nr / tot * 100) + '%;background:var(--notready)"></i></span><b>' + tot + '</b><span class="muted" style="font-size:12px">' + (c.late ? 'متجاوزة ' + c.late + (avg ? ' · ' + avg + ' يوم' : '') : '—') + '</span></button>';
    }).join('') + '</div><div class="legend" style="margin-top:10px"><span><i style="background:var(--ready)"></i>جاهز</span><span><i style="background:var(--notready)"></i>غير جاهز</span></div></div>';
  var secs = secOrder.map(function (k) { return bySec[k]; });
  var sMax = Math.max.apply(null, secs.map(function (s) { return s.r + s.nr; }).concat([1]));
  h += '<div class="card"><h2>قيد التسليم حسب القطاع <small>اضغط القطاع لفتح أبراجه</small></h2><div class="bars" style="height:230px">' +
    secs.map(function (s) { var t = s.r + s.nr; return '<button class="b" data-act="openSector" data-s="' + esc(s.n) + '"><span>' + s.r + '/' + t + '</span><i style="height:' + (t / sMax * 100).toFixed(0) + '%;background:linear-gradient(to top,var(--ready) ' + (s.r / t * 100).toFixed(0) + '%,var(--notready) ' + (s.r / t * 100).toFixed(0) + '%)"></i></button>'; }).join('') +
    '</div><div class="bars-x">' + secs.map(function (s) { return '<span title="' + esc(s.n) + '">' + esc(s.n.replace('القطاع ', '')) + '</span>'; }).join('') + '</div><div class="legend" style="margin-top:10px"><span><i style="background:var(--ready)"></i>جاهز</span><span><i style="background:var(--notready)"></i>غير جاهز</span></div></div></div>';
  // إنجاز المقاولين من ملف موقف المقاولين
  if (S.cw.length) {
    var agg = {}, ord = [];
    S.cw.forEach(function (r) { var k = r.contractor || 'غير محدد'; if (!agg[k]) { agg[k] = { n: k, t: 0, d: 0, p: 0 }; ord.push(k); } agg[k].t += Number(r.total) || 0; agg[k].d += Number(r.delivered) || 0; agg[k].p += Number(r.inProgress) || 0; });
    var rows = ord.map(function (k) { return agg[k]; }).filter(function (a) { return a.t > 0; }).sort(function (a, b) { return b.d / b.t - a.d / a.t; });
    h += '<div class="card"><h2>نسبة إنجاز المقاولين <small>من ملف موقف المقاولين — مسلّمة من الكلي</small></h2><div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(min(330px,100%),1fr));gap:6px 22px">' +
      rows.map(function (a) { var pc = Math.round(a.d / a.t * 100); return '<button class="hbar" data-act="go" data-v="weekly"><span class="nm">' + esc(a.n) + '</span><span class="tr"><i style="width:' + pc + '%;background:var(--ok)"></i><i style="width:' + (a.p / a.t * 100) + '%;background:var(--ready)"></i></span><b>' + pc + '٪</b></button>'; }).join('') +
      '</div><div class="legend" style="margin-top:10px"><span><i style="background:var(--ok)"></i>مسلّمة</span><span><i style="background:var(--ready)"></i>قيد التسليم</span><span><i style="background:var(--soft)"></i>متبقية</span></div></div>';
  }
  return h;
};

/* ----- عرض: قيد التسليم (الأبراج / جدول) ----- */
function wsFiltered() {
  var f = S.wsF, q = normH(arDigits(f.q)), q2 = q.replace(/[.\-\/\s]/g, '');
  var list = wsUnits().filter(function (u) {
    if (f.sector !== 'all' && u.sector !== f.sector) return false;
    if (f.contractor !== 'all' && u.contractor !== f.contractor) return false;
    if (f.label && execLabel(u.executionType, u.contractor) !== f.label) return false;
    if (q &&!matchQ(u.unit, q, q2) && !matchQ(u.contractor, q) && !matchQ(u.sector, q)) return false;
    return true;
  });
  var arr = list.slice();
  if (f.sort === 'execution') arr.sort(function (a, b) { return cell(a.executionType).localeCompare(cell(b.executionType), 'ar'); });
  else if (f.sort === 'contractor') arr.sort(function (a, b) { return cell(a.contractor).localeCompare(cell(b.contractor), 'ar'); });
  else if (f.sort === 'sector') arr.sort(function (a, b) { return cell(a.sector).localeCompare(cell(b.sector), 'ar'); });
  else if (f.sort === 'due') arr.sort(function (a, b) { var x = daysDiff(a.deliveryDate), y = daysDiff(b.deliveryDate); return (x == null ? 9e9 : x) - (y == null ? 9e9 : y); });
  else if (f.sort === 'ready') arr.sort(function (a, b) { return (isReady(b.unit) ? 1 : 0) - (isReady(a.unit) ? 1 : 0); });
  else if (f.sort === 'notready') arr.sort(function (a, b) { return (isReady(a.unit) ? 1 : 0) - (isReady(b.unit) ? 1 : 0); });
  return arr;
}
VIEWS.ws = function () {
  var all = wsUnits(), f = S.wsF, sectors = [], cons = [];
  all.forEach(function (u) { if (u.sector && sectors.indexOf(u.sector) < 0) sectors.push(u.sector); if (u.contractor && cons.indexOf(u.contractor) < 0) cons.push(u.contractor); });
  var list = wsFiltered(), rdy = list.filter(function (u) { return isReady(u.unit); }).length;
  var towersMode = f.mode === 'towers' && f.sort === 'default';
  var h = '<div class="card" style="padding:14px 16px"><div class="row">' +
    '<input class="inp" id="wsq" type="search" data-in="wsq" value="' + esc(f.q) + '" placeholder="بحث داخل قيد التسليم (رقم الدار، المقاول، القطاع)" style="flex:1 1 260px">' +
    '<select class="inp" data-in="wsSector" aria-label="القطاع"><option value="all">جميع القطاعات</option>' + sectors.map(function (s) { return '<option' + (s === f.sector ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('') + '</select>' +
    '<select class="inp" data-in="wsCon" aria-label="المقاول"><option value="all">جميع المقاولين</option>' + cons.map(function (s) { return '<option' + (s === f.contractor ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('') + '</select>' +
    '<select class="inp" data-in="wsSort" aria-label="فرز حسب">' + [['default', 'الترتيب الافتراضي (القطاع)'], ['execution', 'نوع التنفيذ'], ['sector', 'القطاع'], ['contractor', 'المقاول'], ['due', 'الأقرب موعد تسليم'], ['ready', 'الجاهزة أولاً'], ['notready', 'غير الجاهزة أولاً']].map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === f.sort ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>' +
    '<div class="row" role="group" aria-label="طريقة العرض"><button class="btn sm' + (towersMode ? ' pri' : '') + '" data-act="wsMode" data-v="towers">🏢 أبراج</button><button class="btn sm' + (!towersMode ? ' pri' : '') + '" data-act="wsMode" data-v="table">📋 جدول</button></div>' +
    '</div><div class="row muted" style="font-size:13px;margin-top:10px;gap:16px">' + (f.label ? '<button class="pill p-rev" style="border:0" data-act="clearLabel">🛠️ ' + esc(f.label) + ' ✕</button>' : '') + '<span>' + list.length + ' دار</span><span class="pill p-ready">جاهز ' + rdy + '</span><span class="pill p-not">غير جاهز ' + (list.length - rdy) + '</span><span>آخر تحديث: ' + esc(S.wsLast || '—') + '</span>' + (S.wsErr ? '<span class="pill p-not">' + esc(S.wsErr) + '</span>' : '') + '</div></div>';
  if (!list.length) return h + '<div class="card empty">' + (S.wsAll.length ? 'لا توجد دور قيد تسليم مطابقة.' : '⏳ لا توجد بيانات محمّلة بعد — اضغط زر التحديث.') + '</div>';
  if (!towersMode) {
    var rows = '', last = null;
    list.forEach(function (u, i) {
      var ck = (u.executionType || '') + '||' + (u.contractor || '');
      if (ck !== last) { last = ck; rows += '<tr class="grp"><td colspan="7">🛠️ ' + esc(execLabel(u.executionType, u.contractor)) + ' — ' + esc(u.sector || '') + '</td></tr>'; }
      var r = isReady(u.unit), rec = reviewOf(u.unit);
      rows += '<tr><td class="muted">' + (i + 1) + '</td><td><button class="btn sm" style="font-weight:700" data-act="house" data-h="' + esc(u.unit) + '"><span class="ltr">' + esc(u.unit) + '</span></button>' + notifiedBadge(u.unit) + '</td><td>' + esc(u.incomingDate || '-') + adminPill(u.incomingDate) + '</td><td>' + esc(u.deliveryDate || '-') + adminPill(u.deliveryDate) + '</td>' +
        '<td><button class="btn sm ' + (r ? '' : 'danger') + '" style="' + (r ? 'background:var(--ready-bg);color:var(--ready-fg)' : '') + '" data-act="toggleReady" data-h="' + esc(u.unit) + '">' + (r ? '✅ جاهز' : '⛔ غير جاهز' + esc(overdueText(u.deliveryDate))) + '</button></td>' +
        '<td><button class="btn sm" style="color:var(--review)" data-act="startReview" data-h="' + esc(u.unit) + '">' + (rec ? '📋 قيد المراجعة أيضاً (فتح)' : '👁️ هل راجع المستفيد؟') + '</button></td>' +
        '<td><button class="btn sm" data-act="reopenNew" data-h="' + esc(u.unit) + '" title="إعادة إشعار دار جديدة">🔔</button></td></tr>';
    });
    return h + '<div class="scroll" style="max-height:calc(100vh - 260px)"><table class="tbl"><thead><tr><th>ت</th><th>رقم البلوك والدار</th><th>تاريخ الوارد</th><th>تاريخ التسليم</th><th>الحالة</th><th>المراجعة</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }
  // الأبراج: كل قطاع → كل مقاول/جهة تنفيذ برج → كل دار طابق
  var secMap = {}, secOrd = [];
  list.forEach(function (u) { var s = u.sector || 'غير محدد'; if (!secMap[s]) { secMap[s] = { cons: {}, ord: [], n: 0, r: 0 }; secOrd.push(s); } var g = secMap[s]; var ck = (u.executionType || '') + '||' + (u.contractor || ''); if (!g.cons[ck]) { g.cons[ck] = { label: execLabel(u.executionType, u.contractor), floors: [] }; g.ord.push(ck); } g.cons[ck].floors.push(u); g.n++; if (isReady(u.unit)) g.r++; });
  var allOpen = secOrd.every(function (s) { return S.openSectors[s]; });
  h += '<div class="row" style="justify-content:space-between"><div class="sector-chips">' + secOrd.map(function (s) { return '<button class="secchip' + (S.openSectors[s] ? ' on' : '') + '" data-act="secToggle" data-s="' + esc(s) + '">📍 ' + esc(s) + ' <b>' + secMap[s].n + '</b></button>'; }).join('') + '</div>' +
    '<button class="btn sm" data-act="secAll" data-v="' + (allOpen ? '0' : '1') + '">' + (allOpen ? '🙈 طي كل القطاعات' : '👁️ فتح كل القطاعات') + '</button></div>' +
    '<div class="legend"><span><i style="background:var(--ready)"></i>جاهز</span><span><i style="background:var(--notready)"></i>غير جاهز</span><span><i style="background:transparent;box-shadow:inset 0 0 0 2px var(--review)"></i>قيد المراجعة أيضاً</span><span>اضغط أي طابق (دار) لفتح تفاصيلها</span></div>';
  secOrd.forEach(function (s) {
    if (!S.openSectors[s]) return;
    var g = secMap[s];
    h += '<section class="sector"><header><h3>📍 ' + esc(s) + '</h3><span class="row" style="gap:8px"><span class="pill p-mut">' + g.n + ' دار</span><span class="pill p-ready">جاهز ' + g.r + '</span><span class="pill p-not">غير جاهز ' + (g.n - g.r) + '</span><button class="btn sm" data-act="secToggle" data-s="' + esc(s) + '">طي</button></span></header><div class="towers">' +
      g.ord.map(function (ck) {
        var t = g.cons[ck];
        return '<div class="tower"><div class="stack">' + t.floors.map(function (u) {
          var r = isReady(u.unit), rv = !!reviewOf(u.unit);
          var tip = u.unit + ' | ' + (r ? 'جاهز' : 'غير جاهز' + overdueText(u.deliveryDate)) + (rv ? ' | قيد المراجعة أيضاً' : '');
          return '<button class="floor ' + (r ? 'r' : 'n') + (rv ? ' rv' : '') + '" data-act="house" data-h="' + esc(u.unit) + '" title="' + esc(tip) + '" aria-label="' + esc(tip) + '">' + esc(u.unit) + '</button>';
        }).join('') + '</div><div class="nm">' + esc(t.label) + '</div><div class="ct">' + t.floors.length + ' دار</div></div>';
      }).join('') + '</div></section>';
  });
  if (!secOrd.some(function (s) { return S.openSectors[s]; })) h += '<div class="card empty">اضغط على أي قطاع فوق حتى تنفتح أبراجه.</div>';
  return h;
};

/* ----- عرض: التنبيهات ----- */
VIEWS.today = function () {
  var A = computeAlerts();
  function al(k, label, sub, color, cls, list) { return { k: k, label: label, n: list.length, sub: sub, color: color, list: function () { return { head: HEAD.al, items: list.map(function (x) { return alItem(x, cls); }) }; } }; }
  var defs = [
    al('a2', '⚠️ قيد التسليم — تجاوزت 10 أيام', 'من تاريخ التسليم بالشيت', 'var(--notready)', 'p-not', A.wsOverdue10),
    al('a5', '⚠️ المراجعة — تجاوزت موعد الإكمال', 'المراجعة الأولى', 'var(--notready)', 'p-not', A.rvOverdue),
    al('a1', '⏳ قيد التسليم — اقترب الموعد', '٠–٣ أيام', 'var(--ready)', 'p-ready', A.wsCountdown),
    al('a4', '⏳ المراجعة — اقترب الموعد', '٠–٢ يوم', 'var(--ready)', 'p-ready', A.rvCountdown),
    al('a3', '📋 قيد التسليم — لم يحن الموعد', 'باقي عليها أيام', 'var(--info)', 'p-info', A.wsNotDue)
  ];
  return tilesHTML('today', defs) + (panelHTML('today', defs) || '<div class="card empty">اضغط أي مربع حتى تطلع تفاصيله.</div>');
};

/* ----- عرض: الدور المسلّمة ----- */
VIEWS.delivered = function () {
  var q = normS(arDigits(S.delQ)), items = S.del.slice();
  if (q) items = items.filter(function (x) { return normS(x.houseNo).indexOf(q) >= 0 || normS(x.name).indexOf(q) >= 0 || normS(x.sector).indexOf(q) >= 0; });
  items.sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
  var shown = items.slice(0, S.delShow);
  var h = '<div class="card" style="padding:14px 16px"><div class="row"><input class="inp" id="delq" type="search" data-in="delq" value="' + esc(S.delQ) + '" placeholder="🔍 بحث برقم الدار / الاسم / القطاع" style="flex:1 1 260px"><span class="muted" style="font-size:13px">' +
    (S.delErr ? '❌ ' + esc(S.delErr) : '✅ آخر تحديث من الشيت: ' + esc(S.delLast || 'لم يتم بعد') + ' — ' + S.del.length + ' دار مسلَّمة بالشيت') + '</span></div></div>';
  if (!S.del.length) return h + '<div class="card empty">لا توجد بيانات بعد — بانتظار مزامنة الشيت.</div>';
  if (!items.length) return h + '<div class="card empty">لا نتائج مطابقة للبحث.</div>';
  h += '<div class="scroll" style="max-height:calc(100vh - 250px)"><table class="tbl"><thead><tr><th>ت</th><th>رقم البلوك والدار</th><th>اسم المستفيد</th><th>القطاع</th><th>تاريخ الاستلام</th></tr></thead><tbody>' +
    shown.map(function (x) { return '<tr><td class="muted">' + esc(x.serial || '') + '</td><td><button class="btn sm" style="font-weight:700" data-act="house" data-h="' + esc(x.houseNo) + '"><span class="ltr">' + esc(x.houseNo) + '</span></button></td><td>' + esc(x.name || '-') + '</td><td>' + esc(x.sector || '-') + '</td><td>' + esc(x.date) + adminPill(x.date) + '</td></tr>'; }).join('') +
    '</tbody></table></div><div class="row" style="justify-content:space-between"><span class="muted">معروض: ' + shown.length + ' من ' + items.length + ' مطابق (الإجمالي الكلي: ' + S.del.length + ' دار)</span>' +
    (items.length > shown.length ? '<button class="btn" data-act="delMore">⬇️ تحميل المزيد</button>' : '') + '</div>';
  return h;
};

/* ----- عرض: الموقف الأسبوعي (موقف المقاولين) ----- */
VIEWS.weekly = function () {
  var h = '<div class="card" style="padding:14px 16px"><div class="row" style="justify-content:space-between"><span class="muted" style="font-size:13px">' + (S.cwErr ? '❌ ' + esc(S.cwErr) : '✅ آخر تحديث: ' + esc(S.cwLast || 'لم يتم بعد') + ' — ' + S.cw.length + ' صف') + ' · المصدر: ملف موقف المقاولين</span>' +
    '<button class="btn sm" data-act="syncCw">🔄 تحديث</button></div></div>';
  if (!S.cw.length) return h + '<div class="card empty">لا توجد بيانات بعد — بانتظار أول مزامنة.</div>';
  var T = { t: 0, d: 0, p: 0, r: 0 };
  var rows = S.cw.map(function (r) {
    var t = Number(r.total) || 0, d = Number(r.delivered) || 0, p = Number(r.inProgress) || 0, rm = Number(r.remaining) || 0; T.t += t; T.d += d; T.p += p; T.r += rm;
    var pc = t ? Math.round(d / t * 100) : 0;
    return '<tr><td style="font-weight:700;color:var(--brand)">' + esc(r.contractor || 'غير محدد') + '</td><td>' + esc(r.sector) + '</td><td>' + esc(r.total) + '</td><td style="color:var(--ok);font-weight:700">' + esc(r.delivered) + '</td><td style="color:var(--ready-fg)">' + esc(r.inProgress) + '</td><td style="color:var(--notready-fg)">' + esc(r.remaining) + '</td>' +
      '<td style="min-width:170px"><span class="row" style="gap:8px;flex-wrap:nowrap"><span class="tr" style="flex:1;display:flex;height:9px;border-radius:5px;overflow:hidden;background:var(--soft)"><i style="width:' + pc + '%;background:var(--ok)"></i></span><b style="font-size:13px;min-width:38px">' + (t ? pc + '٪' : '-') + '</b></span></td></tr>';
  }).join('');
  h += '<div class="kpis">' + kpi('الكلي', T.t, 'كل المقاولين', 'var(--brand)', 'weekly') + kpi('المسلّمة', T.d, (T.t ? Math.round(T.d / T.t * 100) : 0) + '٪', 'var(--ok)', 'weekly') + kpi('قيد التسليم', T.p, '', 'var(--ready)', 'weekly') + kpi('المتبقية', T.r, '', 'var(--notready)', 'weekly') + '</div>';
  h += '<div class="scroll" style="max-height:calc(100vh - 330px)"><table class="tbl"><thead><tr><th>المقاول</th><th>القطاع</th><th>الكلي</th><th>مسلّمة</th><th>قيد التسليم</th><th>متبقية</th><th>الإنجاز</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  return h;
};

/* ----- عرض: الجرد السنوي ----- */
function catOf(h) { var m = String(h == null ? '' : h).trim().match(/[A-Za-zأ-ي]/); return m ? m[0].toUpperCase() : 'غير محدد'; }
function annualGroups() {
  var groups = {}, cats = {}, U = '9999-99';
  S.del.forEach(function (x) { var m = String(x.date || '').match(/^(\d{4})-(\d{2})/); var key = m ? m[1] + '-' + m[2] : U; var c = catOf(x.houseNo); cats[c] = 1; if (!groups[key]) groups[key] = { y: m ? m[1] : '', m: m ? m[2] : '', unknown: !m, cats: {}, total: 0 }; groups[key].cats[c] = (groups[key].cats[c] || 0) + 1; groups[key].total++; });
  var keys = Object.keys(groups).sort(); if (keys.indexOf(U) >= 0) { keys.splice(keys.indexOf(U), 1); keys.push(U); }
  return { groups: groups, keys: keys, cats: Object.keys(cats).sort() };
}
function annualLabel(g) { return g.unknown ? 'تاريخ غير محدد بالشيت' : (AR_MONTHS[parseInt(g.m, 10)] || g.m) + ' ' + g.y; }
VIEWS.annual = function () {
  if (!S.del.length) return '<div class="card empty">لا توجد بيانات بعد — بانتظار مزامنة الشيت.</div>';
  var A = annualGroups(), gt = 0, gc = {};
  var rows = A.keys.slice().reverse().map(function (k) { var g = A.groups[k]; gt += g.total; return '<tr><td><b>' + esc(annualLabel(g)) + '</b></td>' + A.cats.map(function (c) { gc[c] = (gc[c] || 0) + (g.cats[c] || 0); return '<td>' + (g.cats[c] || 0) + '</td>'; }).join('') + '<td><b>' + g.total + '</b></td></tr>'; }).join('');
  return '<div class="row" style="justify-content:space-between"><span class="muted">كل صف بشيت تواريخ الاستلام كما هو — الفئة = أول حرف من رقم الدار</span><button class="btn wa" data-act="exportAnnual">' + ico('xls', 16) + ' تصدير Excel</button></div>' +
    '<div class="scroll" style="max-height:calc(100vh - 220px)"><table class="tbl"><thead><tr><th>الشهر/السنة</th>' + A.cats.map(function (c) { return '<th>فئة ' + esc(c) + '</th>'; }).join('') + '<th>الإجمالي</th></tr></thead><tbody>' +
    '<tr style="font-weight:800;background:var(--soft)"><td>الإجمالي الكلي</td>' + A.cats.map(function (c) { return '<td>' + (gc[c] || 0) + '</td>'; }).join('') + '<td>' + gt + '</td></tr>' + rows + '</tbody></table></div>';
};

/* ----- عرض: جدول الأعمال ----- */
VIEWS.agenda = function () {
  if (!S.agenda) { loadAgenda(); return '<div class="card empty">⏳ جاري التحميل...</div>'; }
  if (S.agenda === 'err') return '<div class="card empty">تعذّر تحميل جدول الأعمال.</div>';
  var items = S.agenda, t = todayStr(), y = addDays(t, -1), byDay = {};
  items.forEach(function (it) { (byDay[it.date] = byDay[it.date] || []).push(it); });
  var days = Object.keys(byDay).sort().reverse(); if (days.indexOf(t) < 0) days.unshift(t);
  return '<div class="row" style="justify-content:flex-end"><button class="btn sm" data-act="reloadAgenda">🔄 تحديث</button></div>' + days.slice(0, 60).map(function (d) {
    var arr = (byDay[d] || []).sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
    var lbl = d === t ? '📅 اليوم' : (d === y ? '🕘 أمس' : '🗓️ ' + d);
    return '<details class="sec"' + (d === t || d === y ? ' open' : '') + '><summary>' + lbl + ' <span class="muted" style="font-weight:500;font-size:13px">— ' + d + '</span><span class="c p-mut">' + arr.length + ' حركة</span></summary><div class="in"><div class="alist">' +
      (arr.length ? arr.map(function (it) { return '<button class="aitem" data-act="house" data-h="' + esc(it.houseNo) + '"><span class="bar" style="background:var(--brand)"></span><span class="m"><b><span class="ltr">' + esc(it.houseNo) + '</span> — ' + esc(it.action || '-') + '</b>' + (it.notes ? '<small>📝 ' + esc(it.notes) + '</small>' : '') + '<small>👤 ' + esc(it.by || '-') + '</small></span><span class="w muted">🕐 ' + esc(it.time || '-') + '</span></button>'; }).join('') : '<div class="muted" style="padding:8px">لا توجد أي حركة بالنظام اليوم حتى الآن.</div>') + '</div></div></details>';
  }).join('');
};
function loadAgenda() {
  if (S.agendaLoading) return; S.agendaLoading = true;
  Promise.all([LR.child('global').limitToLast(5000).once('value'), LR.child('edit').once('value').catch(function () { return null; })]).then(function (res) {
    var items = [], seen = {};
    function add(v, h) { if (!v || !v.date) return; var hn = h || v.houseNo || '-'; var k = (v.ts || '') + '|' + (v.action || '') + '|' + String(hn).toLowerCase(); if (seen[k]) return; seen[k] = 1; items.push(Object.assign({}, v, { houseNo: hn })); }
    res[0].forEach(function (c) { add(c.val()); });
    if (res[1]) res[1].forEach(function (hn) { var h = dec(hn.key); hn.forEach(function (c) { add(c.val(), h); }); });
    S.agenda = items;
  }).catch(function () { S.agenda = 'err'; }).then(function () { S.agendaLoading = false; scheduleRender(); });
}
function loadHouseLog(h) {
  var k = normH(h);
  LR.child('edit/' + enc(k)).limitToLast(15).once('value').then(function (snap) {
    var items = []; snap.forEach(function (c) { items.push(c.val()); }); items.reverse();
    S.logsFor[k] = items; scheduleRender();
  }).catch(function () { toast('تعذّر تحميل السجل', false); });
}

/* ----- عرض: الإعدادات + الاستيراد ----- */
VIEWS.settings = function () {
  var meta = D().meta || {}, st = D().settings || {};
  return '<div class="card"><h2>🔄 بيانات النظام الحالي <small>نسخ فقط — النظام الحالي ما يتغيّر بيه أي شي</small></h2>' +
    '<p style="margin:0 0 12px">' + (meta.importedAt ? '✅ آخر نسخ للبيانات: <b>' + esc(new Date(meta.importedAt).toLocaleString('ar-IQ')) + '</b> بواسطة ' + esc(meta.importedBy || '-') + (meta.counts ? ' — ' + esc(meta.counts) : '') : '⚠️ لم يتم نسخ بيانات النظام الحالي بعد.') + '</p>' +
    '<div class="row"><button class="btn pri" data-act="importOld">⬇️ نسخ البيانات من النظام الحالي الآن</button></div>' +
    '<p class="muted" style="font-size:13px;margin:10px 0 0">ينسخ: حالة جاهز/غير جاهز، المراجعات وجولاتها، حالة الدور الجديدة، المقاولين، وسجل الحركات. استخدمه قبل يوم التبديل حتى تكون آخر نسخة.</p></div>' +
    '<div class="card"><h2>🔗 روابط ملفات الشيت <small>كل الأجهزة تستخدم نفس الروابط</small></h2><div style="display:flex;flex-direction:column;gap:12px">' +
    urlField('weekly', 'الموقف الاسبوعي (قيد التسليم)', st) + urlField('dates', 'تواريخ الاستلام (الدور المسلّمة)', st) + urlField('contractors', 'موقف المقاولين', st) + '</div></div>' +
    '<div class="card"><h2>عن النظام</h2><dl class="kv">' + kv('الإصدار', VERSION) + kv('المستخدم', S.user.name) + kv('قيد التسليم', S.wsAll.length + ' دار') + kv('المسلّمة', S.del.length + ' صف') + kv('المراجعات', oldRecs().length) + '</dl><p class="muted ltr" style="margin:14px 0 0;text-align:center">Design by: Montather Ali</p></div>';
};
function urlField(k, label, st) { return '<label class="fld">' + esc(label) + '<div class="row"><input class="inp ltr" id="url-' + k + '" value="' + esc(st[k + 'Url'] || DEFAULT_URLS[k]) + '" style="flex:1"><button class="btn sm" data-act="saveUrl" data-k="' + k + '">حفظ</button></div></label>'; }
function importOld() {
  confirmBox('نسخ البيانات من النظام الحالي؟', 'راح أقرأ البيانات من النظام الحالي (قراءة فقط) وأكتبها بالنظام الجديد. أي تغييرات سويتها بالنظام الجديد على نفس الدور راح تنستبدل بنسخة النظام الحالي.', function () {
    closeModal(); toast('⏳ جاري النسخ...', 'info');
    var base = OLD.db + '/';
    Promise.all([
      fetch(base + OLD.root + '.json').then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }),
      fetch(base + 'amirat_edit_logs.json').then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
      fetch(base + 'amirat_global_log.json').then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
    ]).then(function (res) {
      var d = res[0] || {};
      var counts = 'مراجعات ' + Object.keys(d.oldRecords || {}).length + ' · جاهزية ' + Object.keys(d.readyMap || {}).length + ' · دور جديدة ' + Object.keys((d.newHouseState || {}).units || {}).length;
      var upd = {
        readyMap: d.readyMap || null, oldRecords: d.oldRecords || null, newHouseState: d.newHouseState || null,
        records: d.records || null, contractors: d.contractors || null, teamList: d.teamList || null,
        meta: { importedAt: Date.now(), importedBy: S.user.name, counts: counts, source: OLD.root }
      };
      return R.update(clean(upd)).then(function () {
        var lu = {}; if (res[1]) lu.edit = res[1]; if (res[2]) lu.global = res[2];
        return Object.keys(lu).length ? LR.update(lu) : null;
      }).then(function () { S.agenda = null; toast('✅ تم نسخ البيانات: ' + counts); });
    }).catch(function (e) { toast('⚠️ فشل النسخ: ' + e.message, false); });
  }, 'نسخ الآن');
}

/* ================= تصدير Excel ================= */
function xlsx(aoa, sheet, file, cols) {
  var wb = XLSX.utils.book_new(), ws = XLSX.utils.aoa_to_sheet(aoa);
  if (cols) ws['!cols'] = cols.map(function (w) { return { wch: w }; });
  ws['!views'] = [{ rightToLeft: true }];
  XLSX.utils.book_append_sheet(wb, ws, sheet); XLSX.writeFile(wb, file);
}
function exportAlert(id) {
  var d = (S.alertData || {})[id]; if (!d || !d[1].length) { toast('لا توجد دور ضمن هذا التنبيه حالياً.', false); return; }
  var aoa = [['رقم البلوك والدار', 'المقاول', 'القطاع', 'تاريخ الوارد', 'تاريخ التسليم', 'التفاصيل']];
  d[1].forEach(function (x) { aoa.push([x.houseNo || '', x.contractor || '-', x.sector || '-', x.incomingDate || '-', x.deliveryDate || '-', x.detail || '']); });
  xlsx(aoa, 'تنبيه', 'تنبيه_' + d[0].replace(/[^؀-ۿa-zA-Z0-9]+/g, '_') + '_' + todayStr() + '.xlsx', [14, 22, 14, 14, 14, 50]);
}
function exportReviews() {
  var aoa = [['رقم البلوك والدار', 'الحالة', 'المقاول', 'القطاع', 'رقم الجولة', 'تاريخ المراجعة', 'تاريخ إكمال الملاحظات', 'الملاحظات', 'تم إكمال الملاحظات']], n = 0;
  oldRecs().slice().sort(function (a, b) { return String(a.houseNo || '').localeCompare(String(b.houseNo || ''), undefined, { numeric: true }); }).forEach(function (rec) {
    var del = isDeliveredRec(rec);
    rvRounds(rec).forEach(function (x) { if (x.n > 1 && !x.reviewDate && !x.completionDate && !x.notes) return; aoa.push([stripBidi(rec.houseNo || ''), del ? 'مسلّمة' : 'قيد التسليم', rec.contractorName || '', rec.sectorNo || '', x.n, x.reviewDate || '', x.completionDate || '', stripBidi(x.notes || ''), rec.notesCompleted === true ? 'نعم' : 'لا']); n++; });
  });
  if (!n) { toast('لا توجد دور مراجع عليها للتصدير.', false); return; }
  xlsx(aoa, 'المراجعات', 'الدور_المراجع_عليها_' + todayStr() + '.xlsx', [14, 12, 22, 12, 10, 16, 18, 60, 14]);
}
function exportAnnual() {
  var A = annualGroups(), aoa = [['الشهر', 'السنة'].concat(A.cats.map(function (c) { return 'فئة ' + c; })).concat(['الإجمالي'])], gt = 0, gc = {};
  A.keys.forEach(function (k) { var g = A.groups[k]; gt += g.total; var row = g.unknown ? ['تاريخ غير محدد بالشيت', ''] : [AR_MONTHS[parseInt(g.m, 10)] || g.m, g.y]; A.cats.forEach(function (c) { gc[c] = (gc[c] || 0) + (g.cats[c] || 0); row.push(g.cats[c] || 0); }); row.push(g.total); aoa.push(row); });
  aoa.push(['الإجمالي الكلي', ''].concat(A.cats.map(function (c) { return gc[c] || 0; })).concat([gt]));
  xlsx(aoa, 'الجرد السنوي', 'الجرد_السنوي_' + todayStr() + '.xlsx');
}

/* ================= الأحداث ================= */
var ACT = {
  go: function (d) { S.view = d.v; lsSet('a2_view', d.v); document.getElementById('rail').classList.remove('open'); closeModal(); scheduleRender(); window.scrollTo(0, 0); },
  toggleRail: function () { document.getElementById('rail').classList.toggle('open'); renderRail(); },
  theme: function () { var r = document.documentElement, cur = r.getAttribute('data-theme'); var dark = cur ? cur === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; r.setAttribute('data-theme', dark ? 'light' : 'dark'); lsSet('a2_theme', dark ? 'light' : 'dark'); },
  logout: function () { confirmBox('🚪 تسجيل الخروج من النظام بهذا الجهاز؟', '', function () { lsSet('a2_user', null); auth.signOut().then(function () { location.reload(); }); }, 'خروج'); },
  syncAll: function () { toast('⏳ جاري التحديث من الشيتات...', 'info'); syncAll(true); },
  syncCw: function () { syncContractors(true); },
  pick: function (d) { S.sel = d.k; scheduleRender(); },
  house: function (d) { openHouse(d.h); },
  setReady: function (d) { toggleReady(d.h, d.v === '1'); },
  toggleReady: function (d) { toggleReady(d.h); },
  startReview: function (d) { startReview(d.h); },
  reviewYes: function () { var u = MODAL.pendingReview; closeModal(); if (!u) return; var dup = reviewOf(u.unit); if (dup) recForm(dup); else recForm(null, u); },
  editRec: function (d) { var rec = oldRecs().find(function (r) { return String(r.id) === String(d.id); }); if (rec) recForm(rec); },
  newRound: function (d) { newRoundForm(d.id); },
  saveNewRound: saveNewRound,
  delRound: function (d) { deleteRound(d.id, +d.i); },
  delRec: function (d) { deleteRec(d.id); },
  delChoice: function (d) {
    var rec = oldRecs().find(function (r) { return String(r.id) === String(MODAL.delId); }); closeModal(); if (!rec) return;
    deleteRecDB(rec.id); if (d.m === 'full') dismissHouse(rec.houseNo);
    logActivity(rec.houseNo, d.m === 'full' ? 'حذف الدار نهائياً (من المراجعة وقيد التسليم)' : 'حذف سجل المراجعة (بقيت بقيد التسليم)');
  },
  toggleNotes: function (d) {
    var rec = oldRecs().find(function (r) { return String(r.id) === String(d.id); }); if (!rec) return;
    var v = !rec.notesCompleted; saveRecFields(rec.id, { notesCompleted: v });
    logActivity(rec.houseNo, v ? 'أكّد إكمال الملاحظات' : 'ألغى تأكيد إكمال الملاحظات');
  },
  reopenNew: function (d) { nhReopen(d.h); },
  newHouse: function (d) {
    var u = pendingNew().find(function (x) { return normH(x.unit) === normH(d.h); }); if (!u) return;
    MODAL.nh = u;
    openModal('<header><h3>🏠 بيانات الدار الجديدة</h3><button class="iconbtn" data-act="closeModal" aria-label="إغلاق">' + ico('close') + '</button></header><div class="bd"><dl class="kv">' +
      kv('رقم البلوك والدار', u.unit) + kv('المقاول / نوع التنفيذ', execLabel(u.executionType, u.contractor)) + kv('القطاع', u.sector) + kv('تاريخ الوارد', u.incomingDate) + kv('تاريخ التسليم', u.deliveryDate) + '</dl>' +
      '<p class="muted" style="margin:0">الدار تدخل النظام (قيد التسليم والبحث والتنبيهات) بس بعد ما ترسل التبليغ بالواتساب.</p></div>' +
      '<footer><button class="btn pri" data-act="nhSave">💾 حفظ</button><button class="btn" data-act="closeModal">إلغاء</button></footer>');
  },
  nhSave: function () { var u = MODAL.nh; if (!u) return; var key = normH(u.unit); waDialog(newHouseMsg(u), function () { nhConfirm(key, u, 'whatsapp'); }); },
  delBoth: function (d) {
    confirmBox('حذف النسختين للدار ' + d.h + '؟', 'تنشال من قيد التسليم ومن المراجعة (الدار مسجّلة مستلمة بشيت تواريخ الاستلام).', function () {
      dismissHouse(d.h); var rec = reviewOf(d.h); if (rec) deleteRecDB(rec.id);
      logActivity(d.h, 'حذف النسختين بعد توقيع محضر الاستلام'); closeModal();
    }, 'حذف', true);
  },
  snooze: function (d) { S.snoozed[normH(d.h)] = true; scheduleRender(); },
  exportAlert: function (d) { exportAlert(d.id); },
  tile: function (d) {
    S.tiles[d.g] = (S.tiles[d.g] === d.k) ? null : d.k; S.panelShow = 150; lsSet('a2_tiles', S.tiles); renderAll();
    if (S.tiles[d.g]) { var p = document.getElementById('panel'); if (p && p.scrollIntoView) p.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  },
  panelMore: function () { S.panelShow += 150; scheduleRender(); },
  panelXl: function () { var p = S.panel; if (!p || !p.rows.length) { toast('القائمة فارغة', false); return; } xlsx([p.head].concat(p.rows), 'قائمة', p.title.replace(/[^؀-ۿa-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') + '_' + todayStr() + '.xlsx'); },
  exportReviews: exportReviews, exportAnnual: exportAnnual,
  wsMode: function (d) { S.wsF.mode = d.v; if (d.v === 'towers') S.wsF.sort = 'default'; else if (S.wsF.sort === 'default') S.wsF.sort = 'contractor'; scheduleRender(); },
  wsFilter: function (d) { S.wsF = { sector: 'all', contractor: 'all', sort: 'default', q: '', mode: 'towers', label: d.con }; S.openSectors = {}; wsUnits().forEach(function (x) { if (execLabel(x.executionType, x.contractor) === d.con) S.openSectors[x.sector || 'غير محدد'] = true; }); S.view = 'ws'; scheduleRender(); },
  clearLabel: function () { S.wsF.label = ''; scheduleRender(); },
  openSector: function (d) { S.openSectors = {}; S.openSectors[d.s] = true; lsSet('a2_openSectors', S.openSectors); S.view = 'ws'; S.wsF = { sector: 'all', contractor: 'all', sort: 'default', q: '', mode: 'towers', label: '' }; scheduleRender(); },
  secToggle: function (d) { S.openSectors[d.s] = !S.openSectors[d.s]; lsSet('a2_openSectors', S.openSectors); scheduleRender(); },
  secAll: function (d) { var v = d.v === '1'; S.openSectors = {}; if (v) wsFiltered().forEach(function (u) { S.openSectors[u.sector || 'غير محدد'] = true; }); lsSet('a2_openSectors', S.openSectors); scheduleRender(); },
  delMore: function () { S.delShow += 150; scheduleRender(); },
  reloadAgenda: function () { S.agenda = null; scheduleRender(); },
  loadLog: function (d) { loadHouseLog(d.h); },
  importOld: importOld,
  saveUrl: function (d) { var v = document.getElementById('url-' + d.k).value.trim(); if (v && !/^https:\/\/docs\.google\.com\/spreadsheets\//.test(v)) { toast('⚠️ الرابط لازم يبدأ بـ https://docs.google.com/spreadsheets/', false); return; } R.child('settings/' + d.k + 'Url').set(v || null).then(function () { toast('✅ انحفظ الرابط'); ({ weekly: syncWeekly, dates: syncDelivered, contractors: syncContractors })[d.k](true); }); },
  closeModal: closeModal,
  modalBg: function (d, el, ev) { if (ev.target === el) closeModal(); },
  confirmYes: function () { var f = MODAL.yes; if (typeof f === 'function') f(); else closeModal(); },
  waSend: waSend,
  saveRec: saveRec,
  roundAdd: function () { collectRounds(); var t = todayStr(); MODAL.form.rounds.push({ reviewDate: t, completionDate: addDays(t, 5), notes: '' }); drawRoundsEditor(); },
  roundDel: function (d) { collectRounds(); if (MODAL.form.rounds.length <= 1) { toast('⚠️ لازم تبقى جولة مراجعة واحدة على الأقل.', false); return; } MODAL.form.rounds.splice(+d.i, 1); drawRoundsEditor(); },
  loginPick: function (d) { LOGIN.user = USERS.find(function (u) { return u.id === d.id; }); renderLogin(); },
  loginBack: function () { LOGIN.user = null; LOGIN.err = ''; renderLogin(); },
  loginGo: function () { doLogin(); }
};
function collectRounds() { /* القيم تتحدث مباشرة عبر data-in=roundEdit */ }
var INP = {
  q: function (el) { S.q = el.value; S.sel = null; scheduleRender(); },
  wsq: function (el) { S.wsF.q = el.value; if (el.value) { wsFiltered().forEach(function (u) { S.openSectors[u.sector || 'غير محدد'] = true; }); } scheduleRender(); },
  wsSector: function (el) { S.wsF.sector = el.value; if (el.value !== 'all') { S.openSectors[el.value] = true; } scheduleRender(); },
  wsCon: function (el) { S.wsF.contractor = el.value; scheduleRender(); },
  wsSort: function (el) { S.wsF.sort = el.value; S.wsF.mode = el.value === 'default' ? 'towers' : 'table'; scheduleRender(); },
  rvq: function (el) { S.rvQ = el.value; scheduleRender(); },
  rvSort: function (el) { S.rvSort = el.value; scheduleRender(); },
  delq: function (el) { S.delQ = el.value; S.delShow = 150; clearTimeout(INP._t); INP._t = setTimeout(scheduleRender, 200); },
  roundEdit: function (el) { if (MODAL.form) MODAL.form.rounds[+el.dataset.i][el.dataset.f] = el.value; },
  execChange: function (el) { var w = document.getElementById('f-con-wrap'); if (w) w.classList.toggle('hidden', el.value !== 'مقاولين'); },
  nrSync: function (el) { var e = document.getElementById('nr-end'); if (el.value && e) e.value = addDays(el.value, 5); },
  pin: function (el) { el.value = el.value.replace(/\D/g, '').slice(0, 4); if (el.value.length === 4) doLogin(); }
};
document.addEventListener('click', function (ev) {
  var rail = document.getElementById('rail');
  if (rail.classList.contains('open') && !rail.contains(ev.target)) { rail.classList.remove('open'); renderRail(); }
  var el = ev.target.closest('[data-act]'); if (!el) return;
  var fn = ACT[el.dataset.act]; if (!fn) return;
  if (el.dataset.act !== 'modalBg') ev.preventDefault();
  fn(el.dataset, el, ev);
});
document.addEventListener('input', function (ev) { var el = ev.target.closest('[data-in]'); if (el && INP[el.dataset.in] && el.tagName !== 'SELECT') INP[el.dataset.in](el); });
document.addEventListener('change', function (ev) {
  var el = ev.target.closest('[data-in]'); if (!el) return;
  if (el.tagName === 'SELECT' && INP[el.dataset.in]) INP[el.dataset.in](el);
  if (el.id === 'f-contractor' && el.value === '__new') {
    var nm = prompt('أدخل اسم المقاول الجديد:'); nm = nm && nm.trim();
    if (nm) { var l = contractorsList().slice(); if (l.indexOf(nm) < 0) { l.push(nm); R.child('contractors').set(l); } var o = document.createElement('option'); o.textContent = nm; el.insertBefore(o, el.lastElementChild); el.value = nm; } else el.selectedIndex = 0;
  }
});
document.addEventListener('keydown', function (ev) {
  if (ev.key === 'Escape' && document.getElementById('modal-root').innerHTML) closeModal();
  if (ev.key === 'Escape') document.getElementById('rail').classList.remove('open');
  if (ev.key === 'Enter' && ev.target && ev.target.id === 'pin') doLogin();
});

/* ================= تسجيل الدخول ================= */
var LOGIN = { user: null, err: '', busy: false };
function renderLogin() {
  var box = document.getElementById('login');
  box.classList.remove('hidden');
  var u = LOGIN.user;
  box.innerHTML = '<div class="box"><img src="icon-192.webp" alt="شعار مجمع الأميرات 2"><div><h2>مجمع الأميرات 2</h2><div class="muted">مكتب التسليم الفني</div></div>' +
    (!CFG.firebase || !CFG.firebase.apiKey ? '<div class="pill p-not" style="justify-content:center">⚠️ لم تُضبط إعدادات قاعدة البيانات بعد</div>' : '') +
    (u ? '<b style="font-size:18px">' + esc(u.name) + '</b><input class="pin" id="pin" type="password" inputmode="numeric" maxlength="4" placeholder="••••" data-in="pin" aria-label="رمز الدخول" autocomplete="off" autofocus>' +
      '<div class="err">' + esc(LOGIN.err) + '</div><button class="btn pri" style="height:52px" data-act="loginGo"' + (LOGIN.busy ? ' disabled' : '') + '>' + (LOGIN.busy ? '⏳ جاري الدخول...' : 'دخول') + '</button><button class="btn" data-act="loginBack">⬅️ رجوع لاختيار الاسم</button>'
      : '<div class="muted">اختر اسمك</div><div class="users">' + USERS.map(function (x) { return '<button data-act="loginPick" data-id="' + x.id + '">' + esc(x.name) + '</button>'; }).join('') + '</div>') +
    '<div class="credit">Design by: Montather Ali</div></div>';
  var p = document.getElementById('pin'); if (p) setTimeout(function () { p.focus(); }, 50);
}
function doLogin() {
  var u = LOGIN.user, el = document.getElementById('pin'); if (!u || !el || LOGIN.busy) return;
  var pin = el.value;
  sha256('amirat2|' + pin).then(function (h) {
    if (h !== u.h) { LOGIN.err = '❌ رمز غير صحيح، حاول مرة أخرى'; renderLogin(); return; }
    LOGIN.busy = true; LOGIN.err = ''; renderLogin();
    var email = u.id + '@amirat2-delivery.app', pass = 'Am2#' + pin + '#tslim-office';
    auth.signInWithEmailAndPassword(email, pass).catch(function (e) {
      if (/user-not-found|invalid-credential|invalid-login/.test(e.code || '')) return auth.createUserWithEmailAndPassword(email, pass);
      throw e;
    }).then(function () {
      S.user = { id: u.id, name: u.name }; lsSet('a2_user', S.user);
      document.getElementById('login').classList.add('hidden'); LOGIN = { user: null, err: '', busy: false };
      start();
    }).catch(function (e) { LOGIN.busy = false; LOGIN.err = '⚠️ تعذّر الدخول: ' + (e.code || e.message); renderLogin(); });
  });
}

/* ================= التشغيل ================= */
var started = false;
function start() {
  if (started) return; started = true;
  listen();
  renderAll();
  setTimeout(function () { syncAll(false); }, 600);
  setInterval(function () { syncAll(false); }, 10 * 60 * 1000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { syncDelivered(false); scheduleRender(); } });
  setInterval(scheduleRender, 60 * 1000); // تحديث العدّادات بتغيّر اليوم
  setTimeout(function () { if (S.remoteReady && !(D().meta && D().meta.importedAt)) { S.view = 'settings'; scheduleRender(); toast('أول تشغيل: انسخ بيانات النظام الحالي من الإعدادات', 'info'); } }, 4000);
}
(function boot() {
  var th = lsGet('a2_theme', null); if (th) document.documentElement.setAttribute('data-theme', th);
  if (!initFirebase()) { renderLogin(); return; }
  auth.onAuthStateChanged(function (fu) {
    if (fu && S.user) { document.getElementById('login').classList.add('hidden'); start(); }
    else if (!fu) { S.user = null; renderLogin(); }
    else { // مستخدم Firebase موجود بس الاسم مو محفوظ
      var u = USERS.find(function (x) { return fu.email && fu.email.indexOf(x.id + '@') === 0; });
      if (u) { S.user = { id: u.id, name: u.name }; lsSet('a2_user', S.user); start(); } else { auth.signOut(); }
    }
  });
  if ('serviceWorker' in navigator) window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
})();

// للاختبار
window.__A = { S: S, parseWeeklySheet: parseWeeklySheet, computeAlerts: computeAlerts, globalSearch: globalSearch, wsUnits: wsUnits, pendingNew: pendingNew };
})();
