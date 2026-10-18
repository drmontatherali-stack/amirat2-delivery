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
var VERSION = '1.4.0';
var ADMIN_UID = 'PsrknBOyOxUU3PM0xqXZvBhRaul1'; // حساب منتظر علي (مدير النظام)
var BAKROOT = 'amirat2_logs/backups'; // داخل مسار مسموح بقواعد قاعدة البيانات الحالية
var ACLROOT = 'amirat2_acl';
function acctEmail(id) { return id + '@amirat2-delivery.app'; }
function legacyPass(pin) { return 'Am2#' + pin + '#tslim-office'; } // كلمة السر القديمة — تُستخدم بس لنقل الحساب لكلمة سر قوية

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
  wa: 'M3.5 20.5l1.3-4A8.5 8.5 0 1 1 8 19.6z',
  home: 'M3 11l9-7 9 7M5 9.5V20h5v-6h4v6h5V9.5',
  menu: 'M4 7h16M4 12h16M4 17h16'
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
  tiles: {}, // ولا مربع مفتوح لحد ما المستخدم يختار panelShow: 150, panel: null,
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
function noticeCount() { return noticeCountAll(); }

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
    setTimeout(autoBackup, 3000);
    detectNew();
    scheduleRender();
  }, function (err) { toast(/permission|denied/i.test(String(err.code || err.message)) ? '⛔ هذا الحساب مو مفعّل للوصول للبيانات — المدير يفعّله من الإعدادات' : '⚠️ تعذّر قراءة قاعدة البيانات: ' + (err.code || err.message), false); });
}
function logActivity(houseNo, action, notes) {
  try {
    var key = normH(houseNo); if (!key || !LR) return;
    var now = new Date();
    var e = { by: S.user ? S.user.name : 'غير معروف', action: action, notes: notes || '', date: todayStr(), time: now.toLocaleTimeString('ar-IQ'), ts: now.getTime() };
    W('set', LOGROOT + '/edit/' + enc(key) + '/' + LR.child('edit/' + enc(key)).push().key, e);
    W('set', LOGROOT + '/global/' + LR.child('global').push().key, Object.assign({ houseNo: String(houseNo || '') }, e));
    S.agenda = null; delete S.logsFor[key];
  } catch (e) {}
}

/* ================= طابور الحفظ: كل تعديل ينحفظ بالجهاز أولاً ويبقى لحد ما السحابة تأكّد استلامه
   (حتى لو انقطع النت وانسدّ التطبيق — أول ما ينفتح وفيه نت يرفع الباقي) ================= */
var OB = lsGet('a2_outbox', []);
function obSave() { lsSet('a2_outbox', OB); }
function localApply(op, path, val) {
  var ps = String(path).split('/').filter(Boolean); if (ps[0] !== ROOT) return;
  ps = ps.slice(1);
  if (op === 'update') { Object.keys(val || {}).forEach(function (k) { localApply('set', path + '/' + k, val[k]); }); return; }
  var v = op === 'remove' ? null : (val == null ? null : clean(val));
  if (!ps.length) { S.db = v || {}; return; }
  var o = S.db = S.db || {};
  for (var i = 0; i < ps.length - 1; i++) { if (o[ps[i]] == null || typeof o[ps[i]] !== 'object') { if (v === null) return; o[ps[i]] = {}; } o = o[ps[i]]; }
  if (v === null) delete o[ps[ps.length - 1]]; else o[ps[ps.length - 1]] = v;
}
function W(op, path, val, onDone) {
  var it = { i: Date.now().toString(36) + Math.random().toString(36).slice(2, 8), op: op, p: path, v: val === undefined ? null : clean(val), t: Date.now() };
  OB.push(it); obSave();
  localApply(op, path, it.v); lsSet('a2_dbcache', S.db);
  obSend(it, onDone);
  renderTopSafe();
  return it.i;
}
function obSend(it, onDone) {
  if (!fb) return;
  var ref = firebase.database().ref(it.p);
  var pr = it.op === 'set' ? ref.set(it.v) : (it.op === 'update' ? ref.update(it.v || {}) : ref.remove());
  pr.then(function () { obDrop(it.i); if (onDone) onDone(null); }, function (err) {
    var m = String((err && (err.code || err.message)) || '');
    if (/permission|denied|invalid|validation/i.test(m)) { obDrop(it.i); toast('⚠️ ما انحفظ التعديل بالسحابة: ' + m, false); }
    if (onDone) onDone(err);
  });
}
function obDrop(id) { var n = OB.length; OB = OB.filter(function (x) { return x.i !== id; }); if (OB.length !== n) { obSave(); renderTopSafe(); } }
var replayed = false;
function obReplay() { if (replayed) return; replayed = true; var list = OB.slice(); if (list.length) toast('⏫ جاري رفع ' + list.length + ' تعديل محفوظ بالجهاز من قبل', 'info'); list.forEach(function (it) { localApply(it.op, it.p, it.v); obSend(it); }); }
function renderTopSafe() { try { if (S.user) renderTop(); } catch (e) {} }

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
  W('set', ROOT + '/newHouseState/units/' + enc(key), obj);
  toast('✅ تم تأكيد الدار ' + ((u && u.unit) || key) + ' ودخلت النظام' + (S.online ? '' : ' (محفوظ بالجهاز — ينرفع أول ما يرجع النت)'));
  logActivity((u && u.unit) || key, how === 'whatsapp' ? 'أرسل تبليغ دار جديدة وأكّد دخولها للنظام' : 'ضغط "تم الإعلام" لدار جديدة (دخلت النظام)');
}
function nhReopen(unit) {
  var k = normH(unit), u = S.wsAll.find(function (x) { return normH(x.unit) === k; });
  if (!u) { toast('الدار غير موجودة بشيت الموقف الأسبوعي حالياً.', false); return; }
  confirmBox('إعادة الدار (' + u.unit + ') كإشعار "دار جديدة"؟', 'ستُسحب من قيد التسليم حتى تفتح بياناتها وتوافق وترسل الواتساب.', function () {
    var by = S.user.name, at = Date.now();
    var cur = ((D().newHouseState || {}).units || {})[enc(k)];
    W('set', ROOT + '/newHouseState/units/' + enc(k), Object.assign({}, cur || {}, { status: 'pending', unit: u, detectedAt: at, marked: true, reopenedAt: at, reopenedBy: by, rev: ((cur && cur.rev) || 0) + 1 }));
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
  W('update', ROOT + '/readyMap', upd);
  logActivity(unit, v ? 'بدّل حالة الدار إلى جاهز' : 'بدّل حالة الدار إلى غير جاهز');
  scheduleRender();
}
function saveRecFields(id, fields) { W('update', ROOT + '/oldRecords/' + id, fields); }
function deleteRecDB(id) { W('remove', ROOT + '/oldRecords/' + id); }
function dismissHouse(unit) { W('set', ROOT + '/dismissed/' + enc(normH(unit)), true); }
function blockReviewIfWithinPeriod(houseNo) {
  var u = wsByKey(houseNo); if (!u) return false;
  var diff = daysDiff(u.deliveryDate);
  if (diff === null || diff <= 0) return false;
  infoBox('عذراً', 'الدار ضمن فترة التسليم ولم تتجاوز المدة، يرجى إدخال المراجعة بعد انتهاء فترة التسليم 🙂🙂🙂');
  return true;
}

/* ================= الواتساب ================= */
function waDialog(msg, commitFn, meta) {
  openModal('<header><h3>💬 إرسال إلى كروب الواتساب</h3><button class="iconbtn" data-act="closeModal" aria-label="إغلاق">' + ico('close') + '</button></header>' +
    '<div class="bd"><p class="muted" style="margin:0">يُفتح الواتساب والرسالة جاهزة، اختر الكروب من قائمة المحادثات ثم اضغط إرسال. ' + (commitFn ? '<b>الحفظ يصير بس بعد ما تضغط إرسال.</b>' : '') + '</p><div class="pre">' + esc(msg) + '</div></div>' +
    '<footer><button class="btn wa" data-act="waSend">📢 إرسال إلى كروب واتساب</button><button class="btn" data-act="closeModal">إلغاء</button></footer>');
  MODAL.wa = { msg: msg, commit: commitFn, meta: meta || {} };
}
var WA_KIND = { newHouse: 'تبليغ دار جديدة', review: 'تسجيل مراجعة', round: 'مراجعة جديدة', other: 'رسالة' };
function waList() { var o = D().waOutbox || {}; return Object.keys(o).map(function (k) { return Object.assign({ id: k }, o[k]); }); }
function waUnsent() { var lim = Date.now() - 30 * 86400000; return waList().filter(function (x) { return x.status === 'opened' && (x.at || 0) > lim; }).sort(function (a, b) { return (b.at || 0) - (a.at || 0); }); }
function waOpen(msg) {
  var encd = encodeURIComponent(msg), hidden = false;
  try { if (navigator.clipboard) navigator.clipboard.writeText(msg).catch(function () {}); } catch (e) {}
  var onVis = function () { if (document.hidden) hidden = true; };
  document.addEventListener('visibilitychange', onVis, { once: true });
  setTimeout(function () {
    window.location.href = 'whatsapp://send?text=' + encd;
    setTimeout(function () { document.removeEventListener('visibilitychange', onVis); if (!hidden) window.open('https://wa.me/?text=' + encd, '_blank'); }, 1200);
  }, 500);
}
var WA_AWAIT = null;
function waArmConfirm(id) {
  WA_AWAIT = id; var shown = false, armedAt = Date.now();
  function ask() { if (shown || WA_AWAIT !== id || document.hidden) return; shown = true; document.removeEventListener('visibilitychange', onv); window.removeEventListener('focus', onf); waConfirmBox(id); }
  function onv() { if (!document.hidden && Date.now() - armedAt > 1500) setTimeout(ask, 400); }
  function onf() { if (Date.now() - armedAt > 2500) setTimeout(ask, 400); }
  document.addEventListener('visibilitychange', onv); window.addEventListener('focus', onf);
  setTimeout(function () { if (!document.hidden) ask(); }, 6000); // إذا انفتح الواتساب بتبويب ثاني
}
function waConfirmBox(id) {
  var x = (D().waOutbox || {})[id]; if (!x || x.status !== 'opened') return;
  openModal('<header><h3>📲 هل انرسلت الرسالة للكروب؟</h3></header><div class="bd"><p style="margin:0">' + esc(WA_KIND[x.kind] || 'رسالة') + (x.house ? ' — الدار <b class="ltr">' + esc(x.house) + '</b>' : '') + '</p><p class="muted" style="margin:8px 0 0;font-size:13px">إذا ما انرسلت تبقى بقائمة "رسائل ما تأكد إرسالها" بالبحث السريع وتگدر تعيد إرسالها.</p></div>' +
    '<footer><button class="btn pri" data-act="waMark" data-id="' + esc(id) + '">✅ إي، انرسلت</button><button class="btn wa" data-act="waResend" data-id="' + esc(id) + '">🔁 لا، افتح الواتساب مرة ثانية</button><button class="btn" data-act="closeModal">بعدين</button></footer>');
}
function waSend() {
  var st = MODAL.wa; if (!st) return;
  if (typeof st.commit === 'function') { try { st.commit(); } catch (e) { console.error(e); toast('⚠️ تعذّر الحفظ: ' + e.message, false); } }
  var msg = st.msg || '', meta = st.meta || {};
  var id = R.child('waOutbox').push().key;
  W('set', ROOT + '/waOutbox/' + id, { text: msg, kind: meta.kind || 'other', house: meta.house || '', by: S.user.name, at: Date.now(), status: 'opened' });
  closeModal();
  waOpen(msg);
  waArmConfirm(id);
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
    (!r.inWS && (b.name || r.delName) ? kv('اسم المستفيد', b.name || r.delName) : '') + (!r.inWS && b.phone ? kv('رقم الهاتف', b.phone) : '') +
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
    if (!existed || !baseline) { W('set', ROOT + '/oldRecords/' + rec.id, rec); }
    else {
      var changed = {}, keys = {};
      Object.keys(rec).concat(Object.keys(baseline)).forEach(function (k) { keys[k] = 1; });
      Object.keys(keys).forEach(function (k) { if (JSON.stringify(rec[k]) !== JSON.stringify(baseline[k])) changed[k] = rec[k] === undefined ? null : rec[k]; });
      if (Object.keys(changed).length) W('update', ROOT + '/oldRecords/' + rec.id, changed);
    }
    toast('✅ انحفظت بيانات المراجعة');
  };
  waDialog(msg, commit, { kind: 'review', house: houseNo });
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
  }, { kind: 'round', house: rec.houseNo });
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
  var fnc = VIEWS[S.view] || VIEWS.search; S._metaT = (S._metaT || 0) + 1;
  var wasInView = ae && view.contains(ae);
  if (S.view === 'hub' && !S.hubAnim && S.hubBusyUntil && Date.now() < S.hubBusyUntil) { setTimeout(scheduleRender, S.hubBusyUntil - Date.now() + 20); return; } // لا تقطع حركة الانبثاق
  var html = fnc();
  if (S.view === 'hub' && html.replace(/ anim"/, '"') === view.getAttribute('data-h')) return;
  if (S.view !== 'hub' && view._last === html && view._lastView === S.view) { if (MODAL.house) refreshHouseModal(); return; }
  view._last = html; view._lastView = S.view;
  view.setAttribute('data-h', S.view === 'hub' ? html.replace(/ anim"/, '"') : '');
  view.innerHTML = html;
  document.getElementById('app').classList.toggle('hubmode', S.view === 'hub');
  if (S.lastView !== S.view) { if (S.lastView && S.view !== 'hub') { view.classList.remove('enter'); void view.offsetWidth; view.classList.add('enter'); } S.lastView = S.view; }
  if (aid && wasInView) { var el2 = document.getElementById(aid); if (el2) { el2.focus(); if (ss != null) try { el2.setSelectionRange(ss, se); } catch (e) {} } }
  if (MODAL.house) refreshHouseModal();
}
var NAV = [
  ['search', 'بحث سريع'], ['dash', 'لوحة المؤشرات'], ['ws', 'قيد التسليم (الأبراج)'], ['today', 'التنبيهات'],
  ['delivered', 'الدور المسلّمة'], ['weekly', 'كفاءة المقاولين'], ['annual', 'الجرد السنوي'],
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
var TITLES = { hub: '', search: 'ابحث عن دار', dash: 'لوحة المؤشرات', ws: 'قيد التسليم', today: 'التنبيهات وشغل اليوم', delivered: 'الدور المسلّمة', weekly: 'كفاءة المقاولين', annual: 'الجرد السنوي', agenda: 'جدول الأعمال', settings: 'الإعدادات' };
function renderTop() {
  var top = document.getElementById('topbar'); if (!S.user) return;
  var n = alertBadgeCount();
  var inHub = S.view === 'hub';
  top.innerHTML = (inHub ? '' : '<button class="iconbtn" data-act="go" data-v="hub" aria-label="الرئيسية" title="الرئيسية">' + ico('home') + '</button><button class="iconbtn" data-act="toggleRail" aria-label="كل الأقسام" title="كل الأقسام">' + ico('menu') + '</button>') +
    '<h1>' + esc(inHub ? 'أهلاً، ' + S.user.name : (TITLES[S.view] || '')) + '<small>' + todayStr() + ' · آخر مزامنة للشيت: ' + esc(S.wsLast || 'لم تتم بعد') + '</small></h1>' +
    '<span class="chip net' + (S.online ? ' on' : ' off') + '" role="status"><span class="dot' + (S.online ? '' : ' off') + '"></span>' + (S.online ? 'متصل' : 'غير متصل — محفوظ بالجهاز') + '</span>' +
    (OB.length ? '<span class="chip warn" role="status" title="محفوظة بالجهاز وتنرفع تلقائياً">⏫ ' + OB.length + ' تعديل بانتظار الرفع للسحابة</span>' : '') +
    '<span class="credit ltr">✨ Design by: <b>Montather Ali</b></span>' +
    '<button class="iconbtn" data-act="syncAll" aria-label="تحديث من الشيتات" title="تحديث من الشيتات">' + ico('refresh') + '</button>' +
    '<button class="iconbtn" data-act="theme" aria-label="تبديل الوضع الليلي" title="الوضع الليلي">' + ico('sun') + '</button>' +
    '<button class="chip" data-act="logout" title="تبديل المستخدم">👤 ' + esc(S.user.name) + ' ' + ico('logout', 16) + '</button>';
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
  h += '<div class="split"><div class="l"><div class="muted" style="font-size:13px">' + res.length + ' نتيجة</div>' + (res.length > 1 ? grpBar('srch') : '') + groupedHTML('srch', res.map(function (r) {
    var st = statusLabel(r), rd = r.inWS ? (isReady(r.houseNo) ? '<span class="pill p-ready">جاهز</span>' : '<span class="pill p-not">غير جاهز</span>') : '<span class="pill ' + st.c + '">' + (r.inDelivered ? 'مستلمة' : 'مراجعة') + '</span>';
    return { h: r.houseNo, html: '<button class="res' + (r.key === S.sel ? ' on' : '') + '" data-act="pick" data-k="' + esc(r.key) + '"><span><span class="no">' + esc(r.houseNo) + '</span><small>' + esc(r.sector || '-') + ' · ' + esc(r.contractor || r.executionType || r.delName || '-') + '</small></span>' + rd + '</button>' };
  }), 'rlist') + '</div><div class="r">' + houseCardHTML(Object.assign(houseInfo(sel.houseNo), { key: sel.key })) + '</div></div>';
  return h;
};
/* ----- إشعارات خانة البحث: دور جديدة + وقّعت محضر استلام ----- */
function noticeCountAll() { return pendingNew().length + crossovers().length + waUnsent().length; }
function noticesHTML() {
  var pend = pendingNew(), cr = crossovers(), wu = waUnsent(), h = '';
  if (wu.length) {
    h += '<div class="banner wa"><h3>📲 ' + wu.length + ' رسالة واتساب ما تأكد إرسالها للكروب:</h3><div class="plist">' + wu.map(function (x) {
      return '<div class="aitem"><span class="m"><b>' + esc(WA_KIND[x.kind] || 'رسالة') + (x.house ? ' — <span class="ltr">' + esc(x.house) + '</span>' : '') + '</b><small>👤 ' + esc(x.by || '-') + ' · 🕒 ' + esc(new Date(x.at || 0).toLocaleString('ar-IQ')) + '</small></span><button class="btn sm wa" data-act="waResend" data-id="' + esc(x.id) + '">🔁 إعادة إرسال</button><button class="btn sm pri" data-act="waMark" data-id="' + esc(x.id) + '">✅ انرسلت</button><button class="btn sm" data-act="waView" data-id="' + esc(x.id) + '">👁️ النص</button><button class="btn sm" data-act="waDrop" data-id="' + esc(x.id) + '">🙈</button></div>';
    }).join('') + '</div></div>';
  }
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
/* ----- الشبكة الرئيسية (مستقبلية): 8 أقسام متساوية على مدار واحد، نواة أكبر، حلقات تقدّم، نبض، شرارات تسري ----- */
var HUB = ['search', 'today', 'ws', 'delivered', 'dash', 'weekly', 'annual', 'agenda'];
var HUB_LBL = { search: 'البحث السريع', dash: 'لوحة المؤشرات', ws: 'قيد التسليم', today: 'التنبيهات', delivered: 'الدور المسلّمة', weekly: 'كفاءة المقاولين', annual: 'الجرد السنوي', agenda: 'جدول الأعمال' };
function hubStats() {
  var ws = wsUnits(), wsN = ws.length, rdy = ws.filter(function (u) { return isReady(u.unit); }).length, al = alertBadgeCount();
  var A = computeAlerts(), cwT = 0, cwD = 0; (S.cw || []).forEach(function (r) { cwT += Number(r.total) || 0; cwD += Number(r.delivered) || 0; });
  var dn = S.del.length, nowY = new Date().getFullYear(), yN = S.del.filter(function (x) { return String(x.date || '').indexOf(String(nowY)) === 0; }).length;
  var today = todayStr(), mv = 0; try { mv = (Array.isArray(S.agenda) ? S.agenda : []).filter(function (x) { return x.date === today; }).length; } catch (e) {}
  return {
    search: { c: 'ابحث عن أي دار', p: null },
    today: { c: al ? al + ' متجاوزة' : 'ماكو متجاوز', p: wsN ? (A.wsOverdue10.length / wsN) : 0, alert: al > 0 },
    ws: { c: wsN + ' دار', p: wsN ? rdy / wsN : 0 },
    delivered: { c: dn + ' دار', p: cwT ? cwD / cwT : null },
    dash: { c: wsN ? 'جاهزة ' + Math.round(rdy * 100 / wsN) + '٪' : '—', p: wsN ? rdy / wsN : 0 },
    weekly: { c: cwT ? 'منجز ' + Math.round(cwD * 100 / cwT) + '٪' : 'حسب المقاول', p: cwT ? cwD / cwT : null },
    annual: { c: yN + ' دار بـ' + nowY, p: null },
    agenda: { c: mv ? mv + ' حركة اليوم' : 'حركات اليوم', p: null }
  };
}
VIEWS.hub = function () {
  var tb = document.getElementById('topbar');
  var W = Math.max(300, document.documentElement.clientWidth);
  var H = Math.max(460, window.innerHeight - (tb ? tb.offsetHeight : 64));
  var R = Math.min((W / 2 - 14) / 1.3, (H / 2 - 28) / 1.3, 320), k = Math.max(0.5, Math.min(1.25, R / 250));
  var cx = W / 2, cy = H / 2 - 6, d = R * 0.56, dC = R * 0.98;
  var st = hubStats(), cnt = { search: noticeCount(), today: alertBadgeCount() };
  var pts = HUB.map(function (v, i) { var a = -Math.PI / 2 + i * Math.PI / 4; return { v: v, i: i, x: cx + R * Math.cos(a), y: cy + R * Math.sin(a), a: a }; });
  function f(n) { return n.toFixed(1); }
  function poly(step, cls) { var ps = [], i = 0, n = 0, L = 0; do { ps.push(pts[i]); i = (i + step) % 8; n++; } while (i !== 0 && n < 9); for (var q = 0; q < ps.length; q++) { var A = ps[q], B = ps[(q + 1) % ps.length]; L += Math.hypot(B.x - A.x, B.y - A.y); } return '<polygon class="' + cls + '" points="' + ps.map(function (p) { return f(p.x) + ',' + f(p.y); }).join(' ') + '" style="--len:' + Math.round(L) + '"/>'; }
  function circ(r, cls) { return '<circle class="orbit ' + cls + '" cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(r) + '" style="--len:' + Math.round(2 * Math.PI * r) + '"/>'; }
  var ticks = ''; for (var t = 0; t < 48; t++) { var ta = t * Math.PI / 24, r1 = R * 1.3, r2 = R * (t % 6 ? 1.33 : 1.38); ticks += '<line class="tick" x1="' + f(cx + r1 * Math.cos(ta)) + '" y1="' + f(cy + r1 * Math.sin(ta)) + '" x2="' + f(cx + r2 * Math.cos(ta)) + '" y2="' + f(cy + r2 * Math.sin(ta)) + '"/>'; }
  var sparks = pts.map(function (p, i) { var bg = (1.6 + i * 0.45).toFixed(2); return '<circle class="spark" opacity="0" r="' + f(2.2 * k) + '"><set attributeName="opacity" to="1" begin="' + bg + 's"/><animateMotion dur="' + (3.2 + (i % 3) * 0.6).toFixed(1) + 's" begin="' + (1.6 + i * 0.45).toFixed(2) + 's" repeatCount="indefinite" path="M' + f(cx) + ',' + f(cy) + ' L' + f(p.x) + ',' + f(p.y) + '"/></circle>'; }).join('');
  var web = '<defs><linearGradient id="hg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4FD8E8"/><stop offset=".55" stop-color="#8E7CFF"/><stop offset="1" stop-color="#E2C47A"/></linearGradient>' +
    '<linearGradient id="ag" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4FD8E8"/><stop offset="1" stop-color="#8E7CFF"/></linearGradient></defs>' +
    circ(R, '') + circ(R * 1.3, 'o2') + circ(dC / 2 + R * 0.12, 'o3') + ticks + poly(3, 'star') + poly(2, 'star s2') +
    pts.map(function (p) { return '<line class="spoke" data-i="' + p.v + '" x1="' + f(cx) + '" y1="' + f(cy) + '" x2="' + f(p.x) + '" y2="' + f(p.y) + '"/>'; }).join('') + sparks;
  var rr = d / 2 - 2, full = 2 * Math.PI * rr;
  var nodes = pts.map(function (p, i) {
    var s2 = st[p.v] || {}, c = cnt[p.v] || 0, pc = s2.p == null ? null : Math.max(0, Math.min(1, s2.p));
    var ring = '<svg class="rg" viewBox="0 0 ' + f(d) + ' ' + f(d) + '" aria-hidden="true"><circle class="trk" cx="' + f(d / 2) + '" cy="' + f(d / 2) + '" r="' + f(rr) + '"/>' +
      (pc == null ? '' : '<circle class="arc" cx="' + f(d / 2) + '" cy="' + f(d / 2) + '" r="' + f(rr) + '" style="--full:' + full.toFixed(1) + ';stroke-dasharray:' + full.toFixed(1) + ';stroke-dashoffset:' + (full * (1 - pc)).toFixed(1) + '"/>') + '</svg>';
    return '<button class="node' + (s2.alert ? ' alert' : '') + (S.hubFrom === p.v ? ' from' : '') + '" data-act="hubGo" data-v="' + p.v + '" style="left:' + f(p.x) + 'px;top:' + f(p.y) + 'px;width:' + d.toFixed(0) + 'px;height:' + d.toFixed(0) + 'px;animation-delay:' + (0.15 + i * 0.07).toFixed(2) + 's;--bd:' + (i * 0.5).toFixed(1) + 's">' + ring +
      ico(p.v).replace('<svg ', '<svg class="i" ') + '<span class="l">' + esc(HUB_LBL[p.v]) + '</span><span class="c">' + esc(s2.c || '') + '</span>' + (c ? '<span class="bdg">' + c + '</span>' : '') + '</button>';
  }).join('');
  var anim = S.hubAnim, back = !anim && S.hubFrom; if (anim) { S.hubAnim = false; S.hubBusyUntil = Date.now() + 1700; } if (back) S.hubBusyUntil = Date.now() + 600; S.hubFrom = null;
  if (anim || back) setTimeout(function () { var h = document.querySelector('.hub'); if (h) h.classList.remove('anim', 'back'); }, anim ? 1650 : 550); // بعد الحركة: تمتلئ حلقات التقدّم
  return '<div class="hub' + (anim ? ' anim' : (back ? ' back' : '')) + '" style="--hubh:' + H + 'px;--k:' + k.toFixed(3) + ';--cx:' + f(cx) + 'px;--cy:' + f(cy) + 'px;--R:' + f(R) + 'px">' +
    '<svg class="web" aria-hidden="true">' + web + '</svg>' +
    '<div class="core" style="left:' + f(cx) + 'px;top:' + f(cy) + 'px;width:' + dC.toFixed(0) + 'px;height:' + dC.toFixed(0) + 'px"><span class="seal"><img src="icon-192.webp" alt=""></span><b>مجمع الأميرات 2</b><small>مكتب التسليم الفني</small></div>' +
    nodes + '<button class="gear" data-act="go" data-v="settings">' + ico('settings') + 'الإعدادات</button></div>';
};
// لمسة على دائرة: يتضوّى طريقها للمركز
document.addEventListener('pointerover', function (e) { var n = e.target.closest && e.target.closest('.hub .node'); hubHot(n); });
document.addEventListener('pointerdown', function (e) { var n = e.target.closest && e.target.closest('.hub .node'); hubHot(n); });
document.addEventListener('pointerout', function (e) { if (e.target.closest && e.target.closest('.hub .node') && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.hub .node'))) hubHot(null); });
function hubHot(n) {
  var hub = document.querySelector('.hub'); if (!hub) return;
  hub.querySelectorAll('.spoke.hot').forEach(function (x) { x.classList.remove('hot'); });
  if (n) { var sp = hub.querySelector('.spoke[data-i="' + n.dataset.v + '"]'); if (sp) sp.classList.add('hot'); hub.classList.add('focus'); } else hub.classList.remove('focus');
}
window.addEventListener('resize', function () { if (S.view === 'hub') scheduleRender(); });

/* ----- فرز القوائم: بدون / المقاول / القطاع / الفئة — بكل مكان تنعرض بيه الدور ----- */
S.grp = lsGet('a2_grp', {}); S.grpC = {};
function houseMeta(h) {
  var g = S._metaGen; if (!g || g.t !== S._metaT) { g = S._metaGen = { t: S._metaT, ws: {}, rec: {}, del: {} }; wsUnits().forEach(function (u) { g.ws[normH(u.unit)] = u; }); oldRecs().forEach(function (r) { g.rec[normH(r.houseNo)] = r; }); S.del.forEach(function (x) { g.del[normS(x.houseNo)] = x; }); g.nh = nhStatusMap(); }
  var k = normH(h), u = g.ws[k], r = g.rec[k], e = g.nh[k], d = g.del[normS(h)], eu = e && e.unit;
  var con = (u && (u.contractor || u.executionType)) || (r && (r.contractorName || r.executionType)) || (eu && (eu.contractor || eu.executionType)) || '';
  var sec = (u && u.sector) || (r && r.sectorNo) || (eu && eu.sector) || (d && d.sector) || '';
  return { con: conDisplay(con), sec: sec || 'قطاع غير محدد', cat: catOf(h) };
}
function conDisplay(n) {
  if (!n) return 'مقاول غير معروف';
  var k = conResolve(n), hit = (S.cw || []).find(function (r) { return conKey(r.contractor) === k; });
  return hit ? hit.contractor : n;
}
var GRP_OPTS = [['none', 'بدون فرز'], ['con', 'المقاول'], ['sec', 'القطاع'], ['cat', 'الفئة']];
function grpBar(id) {
  var g = S.grp[id] || 'none';
  return '<div class="grpbar" role="group" aria-label="فرز القائمة"><span class="muted">فرز:</span>' + GRP_OPTS.map(function (o) { return '<button class="gopt' + (g === o[0] ? ' on' : '') + '" data-act="grp" data-id="' + esc(id) + '" data-g="' + o[0] + '" aria-pressed="' + (g === o[0]) + '">' + o[1] + '</button>'; }).join('') + '</div>';
}
// items: [{h, html}] — html هو شكل العنصر نفسه
function groupedHTML(id, items, cls) {
  var g = S.grp[id] || 'none', wrap = cls || 'plist';
  function it(x, i) { return x.html.replace(/^<(\w+) /, '<$1 style="--i:' + Math.min(i, 18) + '" '); }
  if (g === 'none' || !items.length) return '<div class="' + wrap + ' glist">' + items.map(it).join('') + '</div>';
  var groups = {}, ord = [];
  items.forEach(function (x) { var m = houseMeta(x.h), k = g === 'con' ? m.con : (g === 'sec' ? m.sec : 'فئة ' + m.cat); if (!groups[k]) { groups[k] = []; ord.push(k); } groups[k].push(x); });
  ord.sort(function (a, b) {
    if (g === 'sec') { var ia = SECTOR_NAMES.indexOf(a), ib = SECTOR_NAMES.indexOf(b); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b); }
    if (g === 'cat') return a.localeCompare(b);
    return groups[b].length - groups[a].length || a.localeCompare(b);
  });
  var max = Math.max.apply(null, ord.map(function (k) { return groups[k].length; })), big = items.length > 200;
  return '<div class="groups">' + ord.map(function (k, gi) {
    var ck = id + '|' + g + '|' + k, col = S.grpC[ck] != null ? S.grpC[ck] : (big && gi > 0), n = groups[k].length;
    return '<section class="grp' + (col ? ' col' : '') + '" style="--gi:' + Math.min(gi, 12) + '"><button class="ghead" data-act="grpTog" data-k="' + esc(ck) + '" aria-expanded="' + !col + '"><span class="gt">' + esc(k) + '</span><span class="gc">' + n + '</span><span class="gbar"><i style="--w:' + (n * 100 / max).toFixed(1) + '%"></i></span><svg class="chev" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>' +
      (col ? '' : '<div class="gbody ' + wrap + '">' + groups[k].map(it).join('') + '</div>') + '</section>';
  }).join('') + '</div>';
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
  var data = d.list(), items = data.items, shown = items.slice(0, S.panelShow), gid = 'p:' + view + ':' + d.k, grouped = (S.grp[gid] || 'none') !== 'none';
  S.panel = { title: d.label, head: data.head, rows: items.map(function (i) { return i.xl; }) };
  return '<section class="card" id="panel"><h2><span>' + esc(d.label) + ' <small>' + items.length + ' دار</small></span><span class="row" style="gap:8px"><button class="btn sm" data-act="panelXl">' + ico('xls', 16) + ' Excel</button>' + close + '</span></h2>' +
    (items.length ? grpBar(gid) + groupedHTML(gid, (grouped ? items : shown).map(function (it) {
      return { h: it.h, html: '<button class="aitem" data-act="house" data-h="' + esc(it.h) + '"><span class="m"><b class="ltr" style="text-align:right">' + esc(it.h) + '</b><small>' + esc(it.sub) + '</small></span><span class="pill ' + it.pill[0] + '" style="white-space:normal">' + esc(it.pill[1]) + '</span></button>' };
    })) + (!grouped && items.length > shown.length ? '<div class="row" style="justify-content:center;margin-top:12px"><button class="btn" data-act="panelMore">⬇️ عرض المزيد (' + shown.length + ' من ' + items.length + ')</button></div>' : '')
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
  var shown = items.slice(0, S.delShow), dg = (S.grp.del || 'none') !== 'none';
  var h = '<div class="card" style="padding:14px 16px"><div class="row"><input class="inp" id="delq" type="search" data-in="delq" value="' + esc(S.delQ) + '" placeholder="🔍 بحث برقم الدار / الاسم / القطاع" style="flex:1 1 260px"><span class="muted" style="font-size:13px">' +
    (S.delErr ? '❌ ' + esc(S.delErr) : '✅ آخر تحديث من الشيت: ' + esc(S.delLast || 'لم يتم بعد') + ' — ' + S.del.length + ' دار مسلَّمة بالشيت') + '</span></div></div>';
  if (!S.del.length) return h + '<div class="card empty">لا توجد بيانات بعد — بانتظار مزامنة الشيت.</div>';
  if (!items.length) return h + '<div class="card empty">لا نتائج مطابقة للبحث.</div>';
  h += grpBar('del');
  if (dg) return h + groupedHTML('del', items.map(function (x) { return { h: x.houseNo, html: '<button class="aitem" data-act="house" data-h="' + esc(x.houseNo) + '"><span class="m"><b class="ltr" style="text-align:right">' + esc(x.houseNo) + '</b><small>' + esc(x.name || '-') + ' · ' + esc(x.sector || '-') + '</small></span><span class="pill p-ok">🏠 ' + esc(x.date || '-') + '</span></button>' }; }));
  h += '<div class="scroll" style="max-height:calc(100vh - 250px)"><table class="tbl"><thead><tr><th>ت</th><th>رقم البلوك والدار</th><th>اسم المستفيد</th><th>القطاع</th><th>تاريخ الاستلام</th></tr></thead><tbody>' +
    shown.map(function (x) { return '<tr><td class="muted">' + esc(x.serial || '') + '</td><td><button class="btn sm" style="font-weight:700" data-act="house" data-h="' + esc(x.houseNo) + '"><span class="ltr">' + esc(x.houseNo) + '</span></button></td><td>' + esc(x.name || '-') + '</td><td>' + esc(x.sector || '-') + '</td><td>' + esc(x.date) + adminPill(x.date) + '</td></tr>'; }).join('') +
    '</tbody></table></div><div class="row" style="justify-content:space-between"><span class="muted">معروض: ' + shown.length + ' من ' + items.length + ' مطابق (الإجمالي الكلي: ' + S.del.length + ' دار)</span>' +
    (items.length > shown.length ? '<button class="btn" data-act="delMore">⬇️ تحميل المزيد</button>' : '') + '</div>';
  return h;
};

/* ----- عرض: الموقف الأسبوعي (موقف المقاولين) ----- */
/* ----- عرض: كفاءة المقاولين ----- */
function arN(n) { return String(n || '').replace(/^(مقاولين|مقاول)\s*[—-]\s*/, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/\s+/g, ' ').trim().toLowerCase(); }
function conKey(n) { return arN(n).replace(/ /g, ''); }
// اسم المقاول بشيت "الموقف الاسبوعي" أحياناً مختصر (اوات، عادل، اكام) — نطابقه ويه الاسم الكامل بشيت المقاولين
function conResolve(name) {
  var n = arN(name); if (!n) return '';
  var full = []; (S.cw || []).forEach(function (r) { var f = arN(r.contractor); if (f && full.indexOf(f) < 0) full.push(f); });
  if (full.indexOf(n) >= 0) return n.replace(/ /g, '');
  var nz = n.replace(/ /g, '');
  if (full.some(function (f) { return f.replace(/ /g, '') === nz; })) return nz;
  var c = full.filter(function (f) { return (f + ' ').indexOf(n + ' ') === 0 || (n + ' ').indexOf(f + ' ') === 0; });
  return (c.length === 1 ? c[0] : n).replace(/ /g, '');
}
function effRate(p) {
  if (p == null) return { t: 'ماكو دور قيد التسليم', c: 'ok2' };
  if (p < 50) return { t: 'دون المستوى', c: 'bad' };
  if (p < 60) return { t: 'مقبول', c: 'ok1' };
  if (p < 70) return { t: 'متوسط', c: 'ok2' };
  if (p < 80) return { t: 'جيد', c: 'gd' };
  if (p < 90) return { t: 'جيد جداً', c: 'vg' };
  return { t: 'ممتاز', c: 'ex' };
}
// الدور الحالية (قيد التسليم) والمسلّمة المعروف مقاولها، مجمّعة حسب المقاول
function conIndex() {
  var ws = {}, del = {}, nh = nhStatusMap();
  var memo = {}; function R(n) { return memo[n] != null ? memo[n] : (memo[n] = conResolve(n)); }
  wsUnits().forEach(function (u) { var k = R(u.contractor || u.executionType); if (!k) return; (ws[k] = ws[k] || []).push(u); });
  S.del.forEach(function (x) {
    var e = nh[normH(x.houseNo)], c = e && e.unit && (e.unit.contractor || e.unit.executionType);
    if (!c) { var r = reviewOf(x.houseNo); c = r && (r.contractorName || r.executionType); }
    var k = c ? R(c) : ''; if (!k) return; (del[k] = del[k] || []).push(x);
  });
  return { ws: ws, del: del };
}
function conStats(units) {
  var o = { all: units, ready: [], notready: [] };
  units.forEach(function (u) { (isReady(u.unit) ? o.ready : o.notready).push(u); });
  o.eff = units.length ? Math.round(o.ready.length * 100 / units.length) : null; // نسبة الجاهز من دور قيد التسليم
  return o;
}
VIEWS.weekly = function () {
  var h = '<div class="card" style="padding:14px 16px"><div class="row" style="justify-content:space-between"><span class="muted" style="font-size:13px">' + (S.cwErr ? '❌ ' + esc(S.cwErr) : '✅ آخر تحديث: ' + esc(S.cwLast || 'لم يتم بعد') + ' — ' + S.cw.length + ' صف') + ' · المصدر: ملف موقف المقاولين + قيد التسليم</span>' +
    '<button class="btn sm" data-act="syncCw">🔄 تحديث</button></div></div>';
  if (!S.cw.length) return h + '<div class="card empty">لا توجد بيانات بعد — بانتظار أول مزامنة.</div>';
  function N(v) { return Number(v) || 0; }
  var IX = conIndex(); S.cwIX = IX;
  var by = {}, ord = [], T = { t: 0, d: 0, p: 0, r: 0 };
  S.cw.forEach(function (r) {
    var k = r.contractor || 'غير محدد';
    if (!by[k]) { by[k] = { n: k, t: 0, d: 0, p: 0, r: 0, secs: [] }; ord.push(k); }
    var t = N(r.total), d = N(r.delivered), p = N(r.inProgress), rm = N(r.remaining), g = by[k];
    g.t += t; g.d += d; g.p += p; g.r += rm; g.secs.push({ s: r.sector || '-', t: t, d: d, p: p, r: rm });
    T.t += t; T.d += d; T.p += p; T.r += rm;
  });
  var list = ord.map(function (k) { var g = by[k]; g.k = conKey(k); g.units = IX.ws[g.k] || []; g.st = conStats(g.units); return g; });
  var all = conStats(wsUnits()), allR = effRate(all.eff);
  var sort = S.cwSort || 'eff';
  function effv(g) { return g.st.eff == null ? 101 : g.st.eff; }
  list.sort(function (a, b) { return sort === 'eff' ? effv(b) - effv(a) : (sort === 'pct' ? (b.t ? b.d / b.t : 0) - (a.t ? a.d / a.t : 0) : (sort === 'rem' ? b.r - a.r : (sort === 'prog' ? b.p - a.p : b.t - a.t))); });
  function pc(x, t) { return t ? Math.round(x * 100 / t) : 0; }
  function bar(o, big) { var t = o.t || 1; return '<div class="cwbar' + (big ? ' big' : '') + '" role="img" aria-label="مسلّمة ' + o.d + '، قيد التسليم ' + o.p + '، متبقية ' + o.r + '"><i class="d" style="--w:' + (o.d * 100 / t).toFixed(2) + '%"></i><i class="p" style="--w:' + (o.p * 100 / t).toFixed(2) + '%"></i><i class="r" style="--w:' + (o.r * 100 / t).toFixed(2) + '%"></i></div>'; }
  function ring(p) { var r = 30, c = 2 * Math.PI * r; return '<span class="rw"><svg class="cwring" viewBox="0 0 72 72" aria-hidden="true"><circle cx="36" cy="36" r="' + r + '" class="tk"/><circle cx="36" cy="36" r="' + r + '" class="ar" style="stroke-dasharray:' + c.toFixed(1) + ';--off:' + (c * (1 - p / 100)).toFixed(1) + ';--full:' + c.toFixed(1) + '"/></svg><b class="cwpct">' + p + '<small>٪</small></b></span>'; }
  function nb(cls, n, lbl, con, t) { return '<button class="' + cls + '" data-act="cwList" data-c="' + esc(con) + '" data-t="' + t + '"' + (n ? '' : ' disabled') + '><b>' + n + '</b>' + lbl + '</button>'; }
  h += '<div class="card cwsum"><div class="cwhead"><div><h2 style="margin:0">كفاءة المقاولين <small>' + list.length + ' مقاول</small></h2></div>' +
    '<div class="cwnums"><span><b>' + T.t + '</b>الكلي</span><span class="d"><b>' + T.d + '</b>مسلّمة · ' + pc(T.d, T.t) + '٪</span><span class="p"><b>' + T.p + '</b>قيد التسليم</span><span class="r"><b>' + T.r + '</b>متبقية</span>' +
    '<span class="eff ' + allR.c + '"><b>' + (all.eff == null ? '—' : all.eff + '٪') + '</b>الكفاءة العامة · ' + allR.t + '</span></div></div>' + bar(T, true) +
    '<div class="row cwsort" role="group" aria-label="ترتيب">' + [['eff', 'الأعلى كفاءة'], ['pct', 'الأعلى إنجازاً'], ['total', 'الأكبر'], ['prog', 'الأكثر قيد التسليم'], ['rem', 'الأكثر متبقي']].map(function (x) { return '<button class="secchip' + (sort === x[0] ? ' on' : '') + '" data-act="cwSort" data-k="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
    '<p class="muted" style="margin:0;font-size:12.5px">الكفاءة = عدد دور قيد التسليم الجاهزة ÷ كل دور قيد التسليم. دون 50٪ دون المستوى · 50–60 مقبول · 60–70 متوسط · 70–80 جيد · 80–90 جيد جداً · 90 فما فوق ممتاز. اضغط أي رقم حتى تطلع دوره.</p></div>';
  h += '<div class="cwgrid">' + list.map(function (g, i) {
    var p = pc(g.d, g.t), st = g.st, R = effRate(st.eff), dk = (IX.del[g.k] || []).length;
    return '<article class="cwcard" style="--i:' + i + '"><header>' + ring(p) + '<div class="nm"><h3>' + esc(g.n) + '</h3><span class="muted">نسبة الإنجاز ' + p + '٪ · ' + g.secs.length + (g.secs.length === 1 ? ' قطاع' : ' قطاعات') + ' · ' + g.t + ' دار</span></div>' +
      '<span class="effb ' + R.c + '"><b>' + (st.eff == null ? '—' : st.eff + '٪') + '</b>' + R.t + '</span></header>' +
      '<div class="cwnums sm">' + nb('d', g.d, 'مسلّمة', g.n, 'd') + nb('p', g.units.length || g.p, 'قيد التسليم', g.n, 'p') + '<span class="r"><b>' + g.r + '</b>متبقية</span></div>' + bar(g) +
      '<div class="cwk">' + nb('k od', st.all.length, 'قيد التسليم', g.n, 'p') + nb('k odr', st.ready.length, 'جاهزة', g.n, 'ready') + nb('k odn', st.notready.length, 'غير جاهزة', g.n, 'notready') + '<span class="k ratio"><b>' + (st.eff == null ? '—' : st.eff + '٪') + '</b>نسبة الجاهز</span></div>' +
      (st.all.length ? '<div class="effline" title="جاهزة ' + st.ready.length + ' من ' + st.all.length + '"><span style="--w:' + st.eff + '%"></span></div>' : '') +
      '<ul class="cwsecs">' + g.secs.map(function (x) { return '<li><span class="s">' + esc(x.s) + '</span>' + bar(x) + '<span class="v">' + x.d + '<small>/' + x.t + '</small></span></li>'; }).join('') + '</ul></article>';
  }).join('') + '</div>';
  h += '<div class="legend" style="justify-content:center"><span><i style="background:var(--ok)"></i>مسلّمة</span><span><i style="background:var(--ready)"></i>قيد التسليم</span><span><i style="background:var(--notready)"></i>متبقية</span></div>';
  return h;
};
function cwList(con, t) {
  var IX = S.cwIX || conIndex(), k = conKey(con), units = IX.ws[k] || [], st = conStats(units), title, items;
  var T = { d: 'المسلّمة', p: 'قيد التسليم', ready: 'قيد التسليم الجاهزة', notready: 'قيد التسليم غير الجاهزة' };
  title = T[t] + ' — ' + con;
  if (t === 'd') {
    var dl = (IX.del[k] || []).slice().sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')); });
    var tot = 0; (S.cw || []).forEach(function (r) { if (conKey(r.contractor) === k) tot += Number(r.delivered) || 0; });
    items = dl.length ? grpBar('cw') + groupedHTML('cw', dl.map(function (x) { return { h: x.houseNo, html: '<button class="aitem" data-act="house" data-h="' + esc(x.houseNo) + '"><span class="m"><b class="ltr" style="text-align:right">' + esc(x.houseNo) + '</b><small>تاريخ الاستلام: ' + esc(x.date || '-') + (x.sector ? ' · ' + esc(x.sector) : '') + '</small></span><span class="pill p-ok">🏠 مسلّمة</span></button>' }; }), 'alist') : '';
    items = (dl.length < tot ? '<p class="muted" style="margin:0 0 8px;font-size:13px">يطلع ' + dl.length + ' من ' + tot + ' دار — الباقي انسلّم قبل ما يبدأ النظام يسجّل مقاول كل دار، فما معروف مقاوله بشيت تواريخ الاستلام.</p>' : '') + (items || '<div class="empty">ما أكو دور معروفة لهذا المقاول.</div>');
  } else {
    var src = t === 'p' ? units : st[t] || [];
    src = src.slice().sort(function (a, b) { return (daysDiff(a.deliveryDate) || 0) - (daysDiff(b.deliveryDate) || 0); });
    items = src.length ? grpBar('cw') + groupedHTML('cw', src.map(function (u) { var r = isReady(u.unit); return { h: u.unit, html: '<button class="aitem" data-act="house" data-h="' + esc(u.unit) + '"><span class="m"><b class="ltr" style="text-align:right">' + esc(u.unit) + '</b><small>' + esc(u.sector || '-') + ' · 📥 ' + esc(u.incomingDate || '-') + ' · 📤 ' + esc(u.deliveryDate || '-') + '</small></span><span class="pill ' + (r ? 'p-ready">✅ جاهز' : 'p-not">⛔ غير جاهز') + esc(overdueText(u.deliveryDate)) + '</span></button>' }; }), 'alist') : '<div class="empty">ماكو دور.</div>';
  }
  openModal('<header><h3>' + esc(title) + '</h3><button class="iconbtn" data-act="closeModal" aria-label="إغلاق">' + ico('close') + '</button></header><div class="bd">' + items + '</div>', true);
  MODAL.cw = { con: con, t: t };
}

/* ----- عرض: الجرد السنوي ----- */
function catOf(h) { var m = String(h == null ? '' : h).trim().match(/[A-Za-zأ-ي]/); return m ? m[0].toUpperCase() : 'غير محدد'; }
function annualGroups() {
  var groups = {}, cats = {}, U = '9999-99';
  S.del.forEach(function (x) { var m = String(x.date || '').match(/^(\d{4})-(\d{2})/); var key = m ? m[1] + '-' + m[2] : U; var c = catOf(x.houseNo); cats[c] = 1; if (!groups[key]) groups[key] = { y: m ? m[1] : '', m: m ? m[2] : '', unknown: !m, cats: {}, total: 0 }; groups[key].cats[c] = (groups[key].cats[c] || 0) + 1; groups[key].total++; });
  var keys = Object.keys(groups).sort(); if (keys.indexOf(U) >= 0) { keys.splice(keys.indexOf(U), 1); keys.push(U); }
  return { groups: groups, keys: keys, cats: Object.keys(cats).sort() };
}
function annualLabel(g) { return g.unknown ? 'تاريخ غير محدد بالشيت' : (AR_MONTHS[parseInt(g.m, 10)] || g.m) + ' ' + g.y; }
var AN_MN = ['', 'كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'];
var AN_COL = ['#4FD8E8', '#8E7CFF', '#E2C47A', '#38E2A0', '#FF7AA8', '#68B6FF', '#F2B23E', '#B8C4E0'];
VIEWS.annual = function () {
  if (!S.del.length) return '<div class="card empty">لا توجد بيانات بعد — بانتظار مزامنة الشيت.</div>';
  var A = annualGroups(), cats = A.cats, col = {}; cats.forEach(function (c, i) { col[c] = AN_COL[i % AN_COL.length]; });
  var years = []; A.keys.forEach(function (k) { var g = A.groups[k]; if (!g.unknown && years.indexOf(g.y) < 0) years.push(g.y); }); years.sort();
  var cy = String(new Date().getFullYear()), Y = S.anY && years.indexOf(S.anY) >= 0 ? S.anY : (years.indexOf(cy) >= 0 ? cy : years[years.length - 1]);
  var unk = A.groups['9999-99'] ? A.groups['9999-99'].total : 0;
  function yr(y) { var m = [], t = 0, cc = {}; for (var i = 1; i <= 12; i++) { var g = A.groups[y + '-' + pad2(i)] || { total: 0, cats: {} }; m.push(g); t += g.total; cats.forEach(function (c) { cc[c] = (cc[c] || 0) + (g.cats[c] || 0); }); } return { m: m, t: t, cc: cc }; }
  var cur = yr(Y), prev = years.indexOf(String(+Y - 1)) >= 0 ? yr(String(+Y - 1)) : null;
  var nowM = new Date().getMonth() + 1, isCur = Y === cy, monthsN = isCur ? nowM : 12;
  var best = 0; cur.m.forEach(function (g, i) { if (g.total > cur.m[best].total) best = i; });
  var avg = monthsN ? Math.round(cur.t / monthsN) : 0;
  var prevSame = 0; if (prev) prev.m.forEach(function (g, i) { if (!isCur || i < nowM) prevSame += g.total; });
  var delta = prev && prevSame ? Math.round((cur.t - prevSame) * 100 / prevSame) : null;
  var max = Math.max(1, Math.max.apply(null, cur.m.map(function (g) { return g.total; })));
  var sel = S.anM && S.anM.y === Y ? S.anM.m : null;
  var h = '<div class="row" style="justify-content:space-between"><div class="row cwsort" role="group" aria-label="السنة">' + years.map(function (y) { return '<button class="secchip' + (y === Y ? ' on' : '') + '" data-act="anYear" data-y="' + y + '">' + y + '</button>'; }).join('') + '</div>' +
    '<button class="btn wa" data-act="exportAnnual">' + ico('xls', 16) + ' تصدير Excel</button></div>';
  // الملخص
  h += '<div class="card anhero"><div class="big"><span class="muted">المسلّم بسنة ' + Y + (isCur ? ' لحد هسه' : '') + '</span><b>' + cur.t + '</b>' +
    (delta == null ? '' : '<span class="dl ' + (delta >= 0 ? 'up' : 'dn') + '">' + (delta >= 0 ? '▲ ' : '▼ ') + Math.abs(delta) + '٪ عن نفس الفترة بـ' + (+Y - 1) + '</span>') + '</div>' +
    '<div class="stats"><span><b>' + avg + '</b>معدل الشهر</span><span><b>' + (cur.m[best].total ? AN_MN[best + 1] : '—') + '</b>أفضل شهر · ' + cur.m[best].total + '</span><span><b>' + cats.length + '</b>فئات</span></div>' +
    '<div class="cats">' + cats.map(function (c) { var n = cur.cc[c] || 0, p = cur.t ? n * 100 / cur.t : 0; return '<div class="cat"><span class="sw" style="background:' + col[c] + '"></span><span class="nm">فئة ' + esc(c) + '</span><b>' + n + '</b><span class="pc">' + Math.round(p) + '٪</span><span class="ln"><i style="width:' + p.toFixed(1) + '%;background:' + col[c] + '"></i></span></div>'; }).join('') + '</div></div>';
  // المخطط الشهري (أعمدة مكدّسة حسب الفئة)
  h += '<div class="card"><h2>التسليم شهرياً <small>اضغط أي شهر حتى تشوف دوره</small></h2><div class="anchart">' + cur.m.map(function (g, i) {
    var fut = isCur && i + 1 > nowM, hgt = g.total * 100 / max;
    return '<button class="col' + (sel === i + 1 ? ' on' : '') + (fut ? ' fut' : '') + '" data-act="anMonth" data-y="' + Y + '" data-m="' + (i + 1) + '" style="--i:' + i + '" aria-label="' + AN_MN[i + 1] + ' ' + g.total + ' دار"' + (g.total ? '' : ' disabled') + '>' +
      '<span class="v">' + (g.total || '') + '</span><span class="stk" style="height:' + hgt.toFixed(1) + '%">' + cats.map(function (c) { var n = g.cats[c] || 0; return n ? '<i style="flex:' + n + ';background:' + col[c] + '"></i>' : ''; }).join('') + '</span>' +
      (prev ? '<span class="pv" style="bottom:calc(' + (prev.m[i].total * 100 / max).toFixed(1) + '% + 24px)" title="' + (+Y - 1) + ': ' + prev.m[i].total + '"></span>' : '') + '<span class="x">' + AR_MONTHS_SHORT[i + 1] + '</span></button>';
  }).join('') + '</div>' + (prev ? '<div class="legend" style="margin-top:10px"><span><i style="background:transparent;border-top:2px dashed var(--gold);height:0;border-radius:0;width:14px"></i>نفس الشهر بـ' + (+Y - 1) + '</span></div>' : '') + '</div>';
  // تفاصيل الشهر المختار
  if (sel) {
    var key = Y + '-' + pad2(sel), list = S.del.filter(function (x) { return String(x.date || '').slice(0, 7) === key; }).sort(function (a, b) { return String(a.houseNo).localeCompare(String(b.houseNo), undefined, { numeric: true }); });
    h += '<div class="card" id="panel"><h2>' + AN_MN[sel] + ' ' + Y + ' <small>' + list.length + ' دار مسلّمة</small><button class="btn sm" data-act="anMonth" data-y="' + Y + '" data-m="0">✕ إغلاق</button></h2>' + grpBar('an') +
      groupedHTML('an', list.map(function (x) { var c = catOf(x.houseNo); return { h: x.houseNo, html: '<button class="hchip" data-act="house" data-h="' + esc(x.houseNo) + '" style="--c:' + (col[c] || 'var(--brand)') + '"><b class="ltr">' + esc(x.houseNo) + '</b><small>' + esc(String(x.date || '').slice(8, 10)) + '</small></button>' }; }), 'anlist') + '</div>';
  }
  if (unk) h += '<div class="muted" style="font-size:13px">ملاحظة: ' + unk + ' دار بشيت تواريخ الاستلام تاريخها مو مقروء (مثلاً "خاص") وما داخلة بالأشهر.</div>';
  return h;
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
    '<p class="muted" style="font-size:13px;margin:10px 0 0">ينسخ كل شي: حالة جاهز/غير جاهز، المراجعات وجولاتها، الدور الجديدة، الدور القديمة المضافة يدوياً، المقاولين، فريق العمل، روابط الشيتات، وسجل الحركات كامل — وتنحفظ نسخة أصلية كاملة من النظام الحالي بالنسخ الاحتياطي. استخدمه قبل يوم التبديل حتى تكون آخر نسخة.</p></div>' +
    '<div class="card"><h2>🔗 روابط ملفات الشيت <small>كل الأجهزة تستخدم نفس الروابط</small></h2><div style="display:flex;flex-direction:column;gap:12px">' +
    urlField('weekly', 'الموقف الاسبوعي (قيد التسليم)', st) + urlField('dates', 'تواريخ الاستلام (الدور المسلّمة)', st) + urlField('contractors', 'موقف المقاولين', st) + '</div></div>' +
    securityCard() + backupCard() +
    '<div class="card"><h2>عن النظام</h2><dl class="kv">' + kv('الإصدار', VERSION) + kv('المستخدم', S.user.name) + kv('قيد التسليم', S.wsAll.length + ' دار') + kv('المسلّمة', S.del.length + ' صف') + kv('المراجعات', oldRecs().length) + '</dl><p class="muted ltr" style="margin:14px 0 0;text-align:center">Design by: Montather Ali</p></div>';
};
function urlField(k, label, st) { return '<label class="fld">' + esc(label) + '<div class="row"><input class="inp ltr" id="url-' + k + '" value="' + esc(st[k + 'Url'] || DEFAULT_URLS[k]) + '" style="flex:1"><button class="btn sm" data-act="saveUrl" data-k="' + k + '">حفظ</button></div></label>'; }
function importOld() {
  confirmBox('نسخ البيانات من النظام الحالي؟', 'راح أقرأ البيانات من النظام الحالي (قراءة فقط) وأكتبها بالنظام الجديد. أي تغييرات سويتها بالنظام الجديد على نفس الدور راح تنستبدل بنسخة النظام الحالي.', function () {
    closeModal(); if (!S.online) { toast('⚠️ النسخ يحتاج نت', false); return; } toast('⏳ جاري النسخ...', 'info');
    var base = OLD.db + '/';
    Promise.all([
      fetch(base + OLD.root + '.json').then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }),
      fetch(base + 'amirat_edit_logs.json').then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
      fetch(base + 'amirat_global_log.json').then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
    ]).then(function (res) {
      var d = res[0] || {};
      var nLog = Object.keys(res[2] || {}).length, nEdit = Object.keys(res[1] || {}).length;
      var counts = 'مراجعات ' + toArr(d.oldRecords).length + ' · جاهزية ' + Object.keys(d.readyMap || {}).length + ' · دور جديدة ' + Object.keys((d.newHouseState || {}).units || {}).length + ' · دور مضافة يدوياً ' + toArr(d.records).length + ' · سجل ' + nLog + ' حركة (' + nEdit + ' دار)';
      var upd = {
        readyMap: d.readyMap || null, oldRecords: d.oldRecords || null, newHouseState: d.newHouseState || null,
        records: d.records || null, contractors: d.contractors || null, teamList: d.teamList || null,
        meta: { importedAt: Date.now(), importedBy: S.user.name, counts: counts, source: OLD.root, oldKeys: Object.keys(d).join(',') }
      };
      if (/^https:\/\/docs\.google\.com\//.test(d.datesSheetUrl || '')) upd['settings/datesUrl'] = d.datesSheetUrl;
      if (/^https:\/\/docs\.google\.com\//.test(d.contractorsSheetUrl || '')) upd['settings/contractorsUrl'] = d.contractorsSheetUrl;
      var raw = { at: Date.now(), by: S.user.name, root: d, edit_logs: res[1] || null, global_log: res[2] || null };
      // نسخة من الوضع الحالي بالنظام الجديد قبل الاستبدال + النسخة الأصلية الكاملة من النظام الحالي (بيها حتى المنظّفة مسبقاً)
      // النسخ الاحتياطية هنا اختيارية: إذا فشلت ما توقف النسخ
      return (D().meta ? bkSnapshot(bkKey('before-import_'), { note: 'قبل نسخ بيانات النظام الحالي' }).catch(function (e) { console.warn('pre-import backup', e); }) : Promise.resolve())
        .then(function () { return BK().child('oldSystemRaw').set(clean(raw)).catch(function (e) { console.warn('raw archive', e); }); })
        .then(function () { return R.update(clean(upd)); })
        .then(function () {
          // السجل: دمج بدون مسح الحركات اللي انسجلت بالنظام الجديد
          var lu = {};
          Object.keys(res[2] || {}).forEach(function (k) { lu['global/' + k] = res[2][k]; });
          Object.keys(res[1] || {}).forEach(function (h) { var o = res[1][h] || {}; Object.keys(o).forEach(function (k) { lu['edit/' + h + '/' + k] = o[k]; }); });
          return Object.keys(lu).length ? LR.update(clean(lu)) : null;
        }).then(function () { S.agenda = null; S.bkIndex = null; toast('✅ تم نسخ البيانات: ' + counts); });
    }).catch(function (e) { toast('⚠️ فشل النسخ: ' + ((e && (e.code || e.message)) || e), false); });
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
  hubGo: function (d, el) {
    var hub = el.closest('.hub'), rm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!hub || rm) { ACT.go(d); return; }
    hubHot(el);
    setTimeout(function () { hub.classList.add('leaving'); el.classList.add('go'); }, 120);
    setTimeout(function () { ACT.go(d); }, 450);
  },
  go: function (d) {
    var rm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches, vw = document.getElementById('view');
    if (d.v === 'hub' && S.view !== 'hub' && !d._x && !rm) { S.hubFrom = S.view; vw.classList.remove('enter'); vw.classList.add('exit'); setTimeout(function () { vw.classList.remove('exit'); ACT.go({ v: 'hub', _x: 1 }); }, 240); return; }
    if (d.v === 'hub' && S.view !== 'hub' && rm) S.hubFrom = null;
    S.view = d.v; lsSet('a2_view', d.v); S.tiles[d.v] = null; document.getElementById('rail').classList.remove('open'); closeModal(); scheduleRender(); window.scrollTo(0, 0); },
  toggleRail: function () { document.getElementById('rail').classList.toggle('open'); renderRail(); },
  theme: function () { var order = ['auto', 'day', 'night'], cur = modePref(), nx = order[(order.indexOf(cur) + 1) % 3]; lsSet('a2_mode', nx); applyMode(); toast(nx === 'auto' ? '🕒 الخلفية تلقائية حسب الوقت' : (nx === 'day' ? '☀️ خلفية النهار' : '🌙 خلفية الليل'), 'info'); },
  logout: function () { confirmBox('👤 تبديل المستخدم؟', 'يرجع لشاشة اختيار الاسم والرمز. الجهاز يبقى مربوط بالسحابة.', function () { lsSet('a2_user', null); location.reload(); }, 'تبديل'); },
  deviceSignOut: function () { confirmBox('🚪 فصل هذا الجهاز عن السحابة؟', 'حتى يرجع يشتغل لازم تكتب كلمة سر السحابة مرة ثانية.' + (OB.length ? ' ⚠️ عندك ' + OB.length + ' تعديل لسه ما انرفع — انتظر يرجع النت أولاً.' : ''), function () { lsSet('a2_user', null); auth.signOut().then(function () { location.reload(); }); }, 'فصل الجهاز', true); },
  syncAll: function () { toast('⏳ جاري التحديث من الشيتات...', 'info'); syncAll(true); },
  anYear: function (d) { S.anY = d.y; S.anM = null; scheduleRender(); },
  anMonth: function (d) { S.anM = +d.m ? { y: d.y, m: +d.m } : null; scheduleRender(); if (+d.m) setTimeout(function () { var p = document.getElementById('panel'); if (p) p.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 80); },
  cwList: function (d) { cwList(d.c, d.t); },
  grp: function (d) { S.grp[d.id] = d.g; lsSet('a2_grp', S.grp); if (MODAL.cw && d.id === 'cw') { var m = MODAL.cw; cwList(m.con, m.t); return; } renderAll(); },
  grpTog: function (d, el) { var sec = el.closest('.grp'); S.grpC[d.k] = !sec.classList.contains('col'); if (MODAL.cw && el.closest('.modal')) { var m = MODAL.cw; cwList(m.con, m.t); return; } renderAll(); },
  cwSort: function (d) { S.cwSort = d.k; scheduleRender(); },
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
  nhSave: function () { var u = MODAL.nh; if (!u) return; var key = normH(u.unit); waDialog(newHouseMsg(u), function () { nhConfirm(key, u, 'whatsapp'); }, { kind: 'newHouse', house: u.unit }); },
  waMark: function (d) { W('update', ROOT + '/waOutbox/' + d.id, { status: 'sent', sentAt: Date.now(), sentBy: S.user.name }); if (WA_AWAIT === d.id) WA_AWAIT = null; closeModal(); toast('✅ تم تأكيد الإرسال'); scheduleRender(); },
  waResend: function (d) { var x = (D().waOutbox || {})[d.id]; if (!x) return; closeModal(); W('update', ROOT + '/waOutbox/' + d.id, { resentAt: Date.now() }); waOpen(x.text || ''); waArmConfirm(d.id); },
  waDrop: function (d) { confirmBox('إخفاء هذه الرسالة من القائمة؟', 'ما راح تنرسل. (البيانات نفسها محفوظة)', function () { W('update', ROOT + '/waOutbox/' + d.id, { status: 'dismissed', dismissedAt: Date.now(), dismissedBy: S.user.name }); closeModal(); }, 'إخفاء'); },
  waView: function (d) { var x = (D().waOutbox || {})[d.id]; if (!x) return; openModal('<header><h3>💬 ' + esc(WA_KIND[x.kind] || 'رسالة') + '</h3><button class="iconbtn" data-act="closeModal" aria-label="إغلاق">' + ico('close') + '</button></header><div class="bd"><div class="pre">' + esc(x.text || '') + '</div></div><footer><button class="btn wa" data-act="waResend" data-id="' + esc(d.id) + '">🔁 إعادة إرسال</button><button class="btn pri" data-act="waMark" data-id="' + esc(d.id) + '">✅ انرسلت</button><button class="btn" data-act="closeModal">إغلاق</button></footer>'); },
  delBoth: function (d) {
    confirmBox('حذف النسختين للدار ' + d.h + '؟', 'تنشال من قيد التسليم ومن المراجعة (الدار مسجّلة مستلمة بشيت تواريخ الاستلام).', function () {
      dismissHouse(d.h); var rec = reviewOf(d.h); if (rec) deleteRecDB(rec.id);
      logActivity(d.h, 'حذف النسختين بعد توقيع محضر الاستلام'); closeModal();
    }, 'حذف', true);
  },
  snooze: function (d) { S.snoozed[normH(d.h)] = true; scheduleRender(); },
  exportAlert: function (d) { exportAlert(d.id); },
  tile: function (d) {
    S.tiles[d.g] = (S.tiles[d.g] === d.k) ? null : d.k; S.panelShow = 150; renderAll();
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
  saveUrl: function (d) { var v = document.getElementById('url-' + d.k).value.trim(); if (v && !/^https:\/\/docs\.google\.com\/spreadsheets\//.test(v)) { toast('⚠️ الرابط لازم يبدأ بـ https://docs.google.com/spreadsheets/', false); return; } W('set', ROOT + '/settings/' + d.k + 'Url', v || null); toast('✅ انحفظ الرابط'); ({ weekly: syncWeekly, dates: syncDelivered, contractors: syncContractors })[d.k](true); },
  closeModal: closeModal,
  modalBg: function (d, el, ev) { if (ev.target === el) closeModal(); },
  confirmYes: function () { var f = MODAL.yes; if (typeof f === 'function') f(); else closeModal(); },
  waSend: waSend,
  saveRec: saveRec,
  roundAdd: function () { collectRounds(); var t = todayStr(); MODAL.form.rounds.push({ reviewDate: t, completionDate: addDays(t, 5), notes: '' }); drawRoundsEditor(); },
  roundDel: function (d) { collectRounds(); if (MODAL.form.rounds.length <= 1) { toast('⚠️ لازم تبقى جولة مراجعة واحدة على الأقل.', false); return; } MODAL.form.rounds.splice(+d.i, 1); drawRoundsEditor(); },
  loginPick: function (d) { LOGIN.user = USERS.find(function (u) { return u.id === d.id; }); renderLogin(); },
  loginBack: function () { if (LOGIN.step === 'pw') { LOGIN.step = 'pin'; } else LOGIN.user = null; LOGIN.err = ''; renderLogin(); },
  loginGo: function () { doLogin(); },
  loginPw: function () { doLoginPw(); },
  setPw: function (d) { setAccountPw(d.id); },
  revokeAcc: function (d) { revokeAcc(d.id); },
  bkNow: function () { if (!S.online) { toast('⚠️ يحتاج نت', false); return; } bkSnapshot(bkKey('manual_'), { note: 'يدوية' }).then(function () { toast('✅ انعملت نسخة بالسحابة'); scheduleRender(); }).catch(function (e) { toast('⚠️ ' + (e.code || e.message), false); }); },
  bkDownload: function () { bkDownloadAll(); },
  bkExcel: function () { bkExcel(); },
  bkGet: function (d) { BK().child('snap/' + d.k).once('value').then(function (sn) { downloadText(JSON.stringify({ app: 'amirat2-delivery', snapshot: d.k, amirat2: sn.val() || {} }), 'amirat2-backup-' + d.k + '.json'); }).catch(function (e) { toast('⚠️ ' + (e.code || e.message), false); }); },
  bkRestore: function (d) { BK().child('snap/' + d.k).once('value').then(function (sn) { bkRestoreData(sn.val(), null, 'النسخة ' + d.k); }).catch(function (e) { toast('⚠️ ' + (e.code || e.message), false); }); }
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
    if (nm) { var l = contractorsList().slice(); if (l.indexOf(nm) < 0) { l.push(nm); W('set', ROOT + '/contractors', l); } var o = document.createElement('option'); o.textContent = nm; el.insertBefore(o, el.lastElementChild); el.value = nm; } else el.selectedIndex = 0;
  }
});
document.addEventListener('keydown', function (ev) {
  if (ev.key === 'Escape' && document.getElementById('modal-root').innerHTML) closeModal();
  if (ev.key === 'Escape') document.getElementById('rail').classList.remove('open');
  if (ev.key === 'Enter' && ev.target && ev.target.id === 'pin') doLogin();
  if (ev.key === 'Enter' && ev.target && ev.target.id === 'cpw') doLoginPw();
});

/* ================= تسجيل الدخول =================
   الجهاز ينربط بالسحابة مرة وحدة بكلمة سر قوية (Firebase)، وبعدها كل مستخدم يدخل بالاسم + رمزه (PIN) فقط. */
var LOGIN = { user: null, err: '', busy: false, step: 'pin', pin: '' };
function renderLogin() {
  var box = document.getElementById('login');
  box.classList.remove('hidden');
  var u = LOGIN.user, body;
  if (!u) body = '<div class="muted">اختر اسمك</div><div class="users">' + USERS.map(function (x) { return '<button data-act="loginPick" data-id="' + x.id + '">' + esc(x.name) + '</button>'; }).join('') + '</div>';
  else if (LOGIN.step === 'pw') body = '<b style="font-size:18px">' + esc(u.name) + '</b>' +
    '<div class="muted" style="font-size:13.5px">🔐 هذا الجهاز مو مربوط بالسحابة بعد. اكتب <b>كلمة سر السحابة</b> مالتك (تنكتب مرة وحدة بس بهذا الجهاز).</div>' +
    '<input class="inp ltr" id="cpw" type="password" placeholder="كلمة سر السحابة" aria-label="كلمة سر السحابة" autocomplete="current-password" style="height:52px;font-size:17px" autofocus>' +
    '<div class="err">' + esc(LOGIN.err) + '</div><button class="btn pri" style="height:52px" data-act="loginPw"' + (LOGIN.busy ? ' disabled' : '') + '>' + (LOGIN.busy ? '⏳ جاري الربط...' : '🔗 ربط الجهاز ودخول') + '</button><button class="btn" data-act="loginBack">⬅️ رجوع</button>';
  else body = '<b style="font-size:18px">' + esc(u.name) + '</b><input class="pin" id="pin" type="password" inputmode="numeric" maxlength="4" placeholder="••••" data-in="pin" aria-label="رمز الدخول" autocomplete="off" autofocus>' +
    '<div class="err">' + esc(LOGIN.err) + '</div><button class="btn pri" style="height:52px" data-act="loginGo"' + (LOGIN.busy ? ' disabled' : '') + '>' + (LOGIN.busy ? '⏳ جاري الدخول...' : 'دخول') + '</button><button class="btn" data-act="loginBack">⬅️ رجوع لاختيار الاسم</button>';
  box.innerHTML = '<div class="box"><img src="icon-192.webp" alt="شعار مجمع الأميرات 2"><div><h2>مجمع الأميرات 2</h2><div class="muted">مكتب التسليم الفني</div></div>' +
    (!CFG.firebase || !CFG.firebase.apiKey ? '<div class="pill p-not" style="justify-content:center">⚠️ لم تُضبط إعدادات قاعدة البيانات بعد</div>' : '') + body +
    '<div class="credit">Design by: Montather Ali</div></div>';
  var p = document.getElementById('pin') || document.getElementById('cpw'); if (p) setTimeout(function () { p.focus(); }, 50);
}
function authErr(e) {
  var c = (e && e.code) || '';
  if (/network/.test(c)) return '⚠️ ماكو نت — أول ربط للجهاز يحتاج نت';
  if (/too-many/.test(c)) return '⚠️ محاولات كثيرة، انتظر دقائق وحاول مرة ثانية';
  if (/invalid-credential|wrong-password|user-not-found|invalid-login/.test(c)) return '❌ كلمة السر غير صحيحة، أو حسابك ما تفعّل بعد (المدير يفعّله من الإعدادات)';
  if (/weak-password/.test(c)) return '⚠️ كلمة السر ضعيفة';
  if (/requires-recent-login/.test(c)) return '⚠️ اكتب كلمة السر الحالية (أو رمز PIN القديم) وأعد المحاولة';
  if (/email-already-in-use/.test(c)) return '⚠️ الحساب موجود مسبقاً — اكتب كلمة سره الحالية (أو رمز PIN القديم مالته)';
  return '⚠️ ' + (c || (e && e.message) || 'خطأ غير معروف');
}
function enterAs(u) {
  S.user = { id: u.id, name: u.name }; lsSet('a2_user', S.user);
  document.getElementById('login').classList.add('hidden'); LOGIN = { user: null, err: '', busy: false, step: 'pin', pin: '' };
  start();
}
function doLogin() {
  var u = LOGIN.user, el = document.getElementById('pin'); if (!u || !el || LOGIN.busy) return;
  var pin = el.value;
  sha256('amirat2|' + pin).then(function (h) {
    if (h !== u.h) { LOGIN.err = '❌ رمز غير صحيح، حاول مرة أخرى'; renderLogin(); return; }
    if (auth.currentUser) { enterAs(u); return; } // الجهاز مربوط بالسحابة
    LOGIN.busy = true; LOGIN.err = ''; LOGIN.pin = pin; renderLogin();
    // حساب ما انتقل بعد لكلمة سر قوية: يدخل بالطريقة القديمة لحد ما المدير يأمّنه
    var email = acctEmail(u.id), pass = legacyPass(pin);
    auth.signInWithEmailAndPassword(email, pass).catch(function (e) {
      if (/user-not-found|invalid-credential|invalid-login/.test(e.code || '')) return auth.createUserWithEmailAndPassword(email, pass);
      throw e;
    }).then(function () { enterAs(u); }).catch(function (e) {
      if (/email-already-in-use/.test(e.code || '')) { LOGIN.busy = false; LOGIN.step = 'pw'; LOGIN.err = ''; renderLogin(); return; }
      LOGIN.busy = false; LOGIN.err = authErr(e); renderLogin();
    });
  });
}
function doLoginPw() {
  var u = LOGIN.user, el = document.getElementById('cpw'); if (!u || !el || LOGIN.busy) return;
  var pw = el.value; if (!pw) { LOGIN.err = 'اكتب كلمة السر'; renderLogin(); return; }
  LOGIN.busy = true; LOGIN.err = ''; renderLogin();
  auth.signInWithEmailAndPassword(acctEmail(u.id), pw).then(function () { enterAs(u); }).catch(function (e) { LOGIN.busy = false; LOGIN.err = authErr(e); renderLogin(); });
}

/* ================= أمان الحسابات (المدير فقط) ================= */
function isAdmin() { return !!(auth && auth.currentUser && auth.currentUser.uid === ADMIN_UID); }
function accountsSecured() { var a = D().accounts || {}; return USERS.every(function (u) { return a[u.id] && a[u.id].pwSetAt; }); }
function secAuth() {
  var app = firebase.apps.filter(function (x) { return x.name === 'sec'; })[0] || firebase.initializeApp(CFG.firebase, 'sec');
  var au = app.auth();
  return au.setPersistence(firebase.auth.Auth.Persistence.NONE).then(function () { return au; }, function () { return au; });
}
function signInAny(a, email, cp) { return a.signInWithEmailAndPassword(email, cp).catch(function () { return a.signInWithEmailAndPassword(email, legacyPass(cp)); }); }
function reauthAny(user, email, cp) {
  var C = firebase.auth.EmailAuthProvider;
  return user.reauthenticateWithCredential(C.credential(email, cp)).catch(function () { return user.reauthenticateWithCredential(C.credential(email, legacyPass(cp))); });
}
function securityCard() {
  var fu = auth && auth.currentUser;
  var dev = '<p style="margin:0 0 10px">هذا الجهاز مربوط بالسحابة بحساب: <b class="ltr">' + esc(fu ? fu.email : '-') + '</b></p><div class="row"><button class="btn" data-act="deviceSignOut">🚪 فصل هذا الجهاز عن السحابة</button></div>';
  return '<div class="card"><h2>🔗 ربط الجهاز</h2>' + dev + '</div>';
  var acc = D().accounts || {};
  return '<div class="card"><h2>🔐 أمان حسابات السحابة <small>المدير فقط</small></h2>' +
    '<p class="muted" style="margin:0 0 12px;font-size:13.5px">لكل مستخدم كلمة سر سحابة قوية (10 أحرف أو أكثر). تنكتب مرة وحدة بكل جهاز عند ربطه، وبعدها الدخول اليومي بالرمز (PIN) فقط. بعد التأمين الطريقة القديمة توقف ومحد يگدر يدخل للبيانات غير الحسابات المفعّلة.</p>' +
    '<div style="display:flex;flex-direction:column;gap:12px">' + USERS.map(function (u) {
      var a = acc[u.id] || {}, ok = !!a.pwSetAt && !a.revokedAt;
      return '<div class="round" style="padding:12px"><div class="row" style="justify-content:space-between"><b>' + esc(u.name) + '</b>' +
        (ok ? '<span class="pill p-ok">✅ مؤمّن · ' + esc(new Date(a.pwSetAt).toLocaleDateString('ar-IQ')) + '</span>' : (a.revokedAt ? '<span class="pill p-not">⛔ موقوف</span>' : '<span class="pill p-not">⚠️ غير مؤمّن</span>')) + '</div>' +
        '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));margin-top:10px">' +
        '<input class="inp ltr" type="password" id="np-' + u.id + '" placeholder="كلمة السر الجديدة" autocomplete="new-password">' +
        '<input class="inp ltr" type="password" id="np2-' + u.id + '" placeholder="تأكيد كلمة السر" autocomplete="new-password">' +
        '<input class="inp ltr" type="password" id="cp-' + u.id + '" placeholder="الحالية أو PIN القديم (إذا الحساب موجود)" autocomplete="off"></div>' +
        '<div class="row" style="margin-top:10px"><button class="btn pri sm" data-act="setPw" data-id="' + u.id + '">💾 تعيين كلمة السر وتفعيل الحساب</button>' +
        (a.uid && !a.revokedAt && a.uid !== ADMIN_UID ? '<button class="btn sm danger" data-act="revokeAcc" data-id="' + u.id + '">⛔ إيقاف الحساب</button>' : '') + '</div></div>';
    }).join('') + '</div><hr style="border:0;border-top:1px dashed var(--line);margin:14px 0">' + dev + '</div>';
}
function setAccountPw(id) {
  var u = USERS.find(function (x) { return x.id === id; }); if (!u) return;
  function v(k) { var e = document.getElementById(k + '-' + id); return e ? e.value : ''; }
  var np = v('np'), np2 = v('np2'), cp = v('cp');
  if (np.length < 10) { toast('⚠️ كلمة السر لازم 10 أحرف أو أكثر (خليها أرقام وحروف)', false); return; }
  if (np !== np2) { toast('⚠️ كلمة السر والتأكيد مو متطابقة', false); return; }
  if (!S.online) { toast('⚠️ هذا الإجراء يحتاج نت', false); return; }
  var email = acctEmail(id), me = auth.currentUser, p;
  toast('⏳ جاري تأمين حساب ' + u.name + '...', 'info');
  // تأكد إن قواعد الحماية الجديدة منشورة (قائمة الحسابات المفعّلة) قبل أي تغيير
  firebase.database().ref(ACLROOT).once('value').then(function () { doSetPw(); }, function () { toast('⛔ قواعد الحماية الجديدة لسه ما انتشرت بقاعدة البيانات — انشرها أولاً ثم أعد المحاولة', false); });
  function doSetPw() {
  if (me && me.email === email) {
    p = me.updatePassword(np).catch(function (e) {
      if (!/requires-recent-login/.test(e.code || '') || !cp) throw e;
      return reauthAny(me, email, cp).then(function () { return me.updatePassword(np); });
    }).then(function () { return me.uid; });
  } else {
    p = secAuth().then(function (sa) {
      return sa.createUserWithEmailAndPassword(email, np).then(function (c) { return c.user.uid; }).catch(function (e) {
        if (!/email-already-in-use/.test(e.code || '') || !cp) throw e;
        return signInAny(sa, email, cp).then(function (c) { return c.user.updatePassword(np).then(function () { return c.user.uid; }); });
      }).then(function (uid) { return sa.signOut().then(function () { return uid; }, function () { return uid; }); }, function (e) { sa.signOut().catch(function () {}); throw e; });
    });
  }
  p.then(function (uid) {
    return firebase.database().ref(ACLROOT + '/' + uid).set(true).then(function () {
      W('set', ROOT + '/accounts/' + id, { uid: uid, pwSetAt: Date.now(), pwSetBy: S.user.name });
      ['np', 'np2', 'cp'].forEach(function (k) { var e = document.getElementById(k + '-' + id); if (e) e.value = ''; });
      toast('✅ تم تأمين حساب ' + u.name + ' — بلّغه بكلمة السر الجديدة حتى يربط جهازه');
      scheduleRender();
    });
  }).catch(function (e) { toast(authErr(e), false); });
  }
}
function revokeAcc(id) {
  var a = (D().accounts || {})[id], u = USERS.find(function (x) { return x.id === id; }); if (!a || !a.uid) return;
  confirmBox('⛔ إيقاف حساب ' + u.name + '؟', 'أي جهاز مربوط بهذا الحساب يوقف وصوله للبيانات فوراً. ترجع تفعّله بتعيين كلمة سر جديدة.', function () {
    firebase.database().ref(ACLROOT + '/' + a.uid).remove().then(function () { W('update', ROOT + '/accounts/' + id, { revokedAt: Date.now(), pwSetAt: null }); closeModal(); toast('⛔ انوقف الحساب'); }).catch(function (e) { toast(authErr(e), false); });
  }, 'إيقاف', true);
}

/* ================= النسخ الاحتياطي ================= */
function BK() { return firebase.database().ref(BAKROOT); }
function bkKey(prefix) { var d = new Date(); return prefix + todayStr() + '_' + pad2(d.getHours()) + pad2(d.getMinutes()) + pad2(d.getSeconds()); }
function bkSnapshot(key, extra) {
  var data = clean(S.db), size = JSON.stringify(data).length;
  return BK().child('snap/' + key).set(data).then(function () { return BK().child('index/' + key).set(Object.assign({ at: Date.now(), by: S.user ? S.user.name : '-', size: size }, extra || {})); }).then(function () { S.bkIndex = null; });
}
var bkDoneDay = '';
function autoBackup() {
  var day = todayStr();
  if (bkDoneDay === day || !S.remoteReady || !S.online || !S.user || !(D().meta && D().meta.importedAt)) return;
  bkDoneDay = day;
  BK().child('index/' + day).once('value').then(function (sn) {
    if (sn.exists()) return;
    return bkSnapshot(day, { auto: true }).then(function () { return BK().child('index').once('value'); }).then(function (ix) {
      var keys = Object.keys(ix.val() || {}).filter(function (k) { return /^\d{4}-\d{2}-\d{2}$/.test(k); }).sort();
      var old = keys.slice(0, Math.max(0, keys.length - 30)), upd = {};
      old.forEach(function (k) { upd['index/' + k] = null; upd['snap/' + k] = null; });
      if (old.length) return BK().update(upd);
    });
  }).catch(function () { bkDoneDay = ''; });
}
function downloadText(text, name, type) {
  var b = new Blob([text], { type: type || 'application/json' }), a = document.createElement('a');
  a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
function bkDownloadAll() {
  if (!S.online) { toast('⚠️ التنزيل الكامل يحتاج نت (حتى يجيب آخر نسخة من السحابة)', false); return; }
  toast('⏳ جاري تجهيز النسخة...', 'info');
  Promise.all([R.once('value'), LR.child('global').once('value'), LR.child('edit').once('value')]).then(function (r) {
    downloadText(JSON.stringify({ app: 'amirat2-delivery', version: VERSION, at: new Date().toISOString(), by: S.user.name, amirat2: r[0].val() || {}, amirat2_logs: { global: r[1].val() || null, edit: r[2].val() || null } }), 'amirat2-backup-full-' + todayStr() + '.json');
    toast('✅ تنزّلت النسخة الاحتياطية — احفظها بمكان آمن');
  }).catch(function (e) { toast('⚠️ ' + (e.code || e.message), false); });
}
function bkExcel() {
  var wb = XLSX.utils.book_new();
  function add(name, aoa, cols) { var ws = XLSX.utils.aoa_to_sheet(aoa); if (cols) ws['!cols'] = cols.map(function (w) { return { wch: w }; }); ws['!views'] = [{ rightToLeft: true }]; XLSX.utils.book_append_sheet(wb, ws, name); }
  var a1 = [['رقم البلوك والدار', 'القطاع', 'الجهة المنفذة / المقاول', 'تاريخ الوارد', 'تاريخ التسليم', 'الجاهزية', 'قيد المراجعة']];
  wsUnits().forEach(function (u) { a1.push([u.unit, u.sector || '', execLabel(u.executionType, u.contractor), u.incomingDate || '', u.deliveryDate || '', isReady(u.unit) ? 'جاهز' : 'غير جاهز', reviewOf(u.unit) ? 'نعم' : 'لا']); });
  add('قيد التسليم', a1, [14, 14, 26, 14, 14, 12, 12]);
  var a2 = [['رقم البلوك والدار', 'الحالة', 'المقاول', 'القطاع', 'رقم الجولة', 'تاريخ المراجعة', 'تاريخ إكمال الملاحظات', 'الملاحظات', 'تم إكمال الملاحظات']];
  oldRecs().forEach(function (rec) { var del = isDeliveredRec(rec); rvRounds(rec).forEach(function (x) { a2.push([stripBidi(rec.houseNo || ''), del ? 'مسلّمة' : 'قيد التسليم', rec.contractorName || '', rec.sectorNo || '', x.n, x.reviewDate || '', x.completionDate || '', stripBidi(x.notes || ''), rec.notesCompleted === true ? 'نعم' : 'لا']); }); });
  add('المراجعات', a2, [14, 12, 22, 12, 10, 16, 18, 60, 14]);
  var rm = readyMap(), a3 = [['رقم البلوك والدار', 'الجاهزية']]; Object.keys(rm).sort().forEach(function (k) { a3.push([k, rm[k] ? 'جاهز' : 'غير جاهز']); });
  add('الجاهزية', a3, [16, 12]);
  var nh = nhStatusMap(), a4 = [['رقم البلوك والدار', 'الحالة', 'تاريخ الاكتشاف', 'أكّدها', 'تاريخ التأكيد']];
  Object.keys(nh).sort().forEach(function (k) { var e = nh[k]; a4.push([k, e.status === 'pending' ? 'بانتظار التبليغ' : 'مؤكدة', e.detectedAt ? new Date(e.detectedAt).toLocaleString('ar-IQ') : '', e.confirmedBy || '', e.confirmedAt ? new Date(e.confirmedAt).toLocaleString('ar-IQ') : '']); });
  add('الدور الجديدة', a4, [16, 16, 22, 18, 22]);
  var a5 = [['النوع', 'الدار', 'بواسطة', 'الوقت', 'الحالة']]; waList().forEach(function (x) { a5.push([WA_KIND[x.kind] || 'رسالة', x.house || '', x.by || '', new Date(x.at || 0).toLocaleString('ar-IQ'), x.status === 'sent' ? 'انرسلت' : (x.status === 'dismissed' ? 'مخفية' : 'ما تأكد إرسالها')]); });
  add('رسائل الواتساب', a5, [18, 14, 18, 22, 16]);
  XLSX.writeFile(wb, 'مكتب_التسليم_كل_البيانات_' + todayStr() + '.xlsx');
}
function backupCard() {
  if (S.bkIndex === undefined || S.bkIndex === null) { S.bkIndex = 'loading'; BK().child('index').once('value').then(function (sn) { S.bkIndex = sn.val() || {}; scheduleRender(); }).catch(function () { S.bkIndex = 'err'; scheduleRender(); }); }
  var ix = S.bkIndex, rows = '';
  if (ix === 'loading') rows = '<div class="muted">⏳ جاري تحميل قائمة النسخ...</div>';
  else if (ix === 'err') rows = '<div class="muted">تعذّر تحميل قائمة النسخ (يحتاج نت).</div>';
  else {
    var keys = Object.keys(ix).sort().reverse();
    rows = keys.length ? '<div class="scroll" style="max-height:320px"><table class="tbl"><thead><tr><th>النسخة</th><th>بواسطة</th><th>الحجم</th><th>إجراءات</th></tr></thead><tbody>' + keys.map(function (k) {
      var e = ix[k] || {};
      return '<tr><td class="ltr">' + esc(k) + (e.auto ? ' <span class="pill p-info">تلقائية</span>' : '') + (e.note ? '<br><small class="muted">' + esc(e.note) + '</small>' : '') + '</td><td>' + esc(e.by || '-') + '</td><td>' + Math.round((e.size || 0) / 1024) + ' KB</td><td><button class="btn sm" data-act="bkGet" data-k="' + esc(k) + '">⬇️ تنزيل</button>' + (isAdmin() ? ' <button class="btn sm danger" data-act="bkRestore" data-k="' + esc(k) + '">♻️ استرجاع</button>' : '') + '</td></tr>';
    }).join('') + '</tbody></table></div>' : '<div class="muted">لسه ماكو نسخ — أول نسخة تلقائية تنعمل اليوم.</div>';
  }
  return '<div class="card"><h2>💾 النسخ الاحتياطي <small>نسخة تلقائية كل يوم بالسحابة (تنحفظ آخر 30 يوم) + تنزيل للجهاز</small></h2>' +
    '<div class="row" style="margin-bottom:12px"><button class="btn pri" data-act="bkNow">📸 نسخة بالسحابة الآن</button><button class="btn" data-act="bkDownload">⬇️ تنزيل نسخة كاملة للجهاز (JSON)</button><button class="btn wa" data-act="bkExcel">' + ico('xls', 16) + ' تنزيل كل البيانات Excel</button>' +
    (isAdmin() ? '<label class="btn danger" style="cursor:pointer">♻️ استرجاع من ملف<input type="file" id="bk-file" accept=".json,application/json" hidden></label>' : '') + '</div>' + rows + '</div>';
}
function bkRestoreData(data, logs, label) {
  if (!data || typeof data !== 'object' || !(data.oldRecords || data.readyMap || data.newHouseState)) { toast('⚠️ الملف مو نسخة احتياطية صحيحة لهذا النظام', false); return; }
  confirmBox('♻️ استرجاع ' + label + '؟', 'راح تنستبدل كل بيانات النظام الحالية بهذه النسخة. قبلها تنعمل نسخة من الوضع الحالي حتى تگدر ترجع لها.', function () {
    closeModal(); if (!S.online) { toast('⚠️ الاسترجاع يحتاج نت', false); return; }
    toast('⏳ جاري الاسترجاع...', 'info');
    data = clean(data); data.accounts = D().accounts || null; // حالة الحسابات تبقى مثل ما هي
    bkSnapshot(bkKey('before-restore_'), { note: 'قبل استرجاع ' + label }).then(function () { return R.set(data); }).then(function () { return logs ? LR.update({ global: logs.global || null, edit: logs.edit || null }) : null; })
      .then(function () { logActivity('-', 'استرجع نسخة احتياطية: ' + label); toast('✅ تم الاسترجاع'); }).catch(function (e) { toast('⚠️ فشل الاسترجاع: ' + (e.code || e.message), false); });
  }, 'استرجاع', true);
}
document.addEventListener('change', function (ev) {
  if (!ev.target || ev.target.id !== 'bk-file' || !ev.target.files[0]) return;
  var f = ev.target.files[0], rd = new FileReader();
  rd.onload = function () { try { var j = JSON.parse(rd.result); bkRestoreData(j.amirat2 || j, j.amirat2_logs || null, 'الملف ' + f.name); } catch (e) { toast('⚠️ تعذّر قراءة الملف', false); } };
  rd.readAsText(f); ev.target.value = '';
});

/* ================= الخلفية حسب الوقت + شاشة الافتتاح ================= */
function modePref() { var p = lsGet('a2_mode', 'auto'); return /^(auto|day|night)$/.test(p) ? p : 'auto'; }
function applyMode() {
  var p = modePref(), h = new Date().getHours(), m = p === 'auto' ? (h >= 6 && h < 18 ? 'day' : 'night') : p;
  var r = document.documentElement; r.removeAttribute('data-theme'); r.setAttribute('data-mode', m);
  var mt = document.querySelector('meta[name=theme-color]'); if (mt) mt.setAttribute('content', m === 'day' ? '#0E1B3E' : '#060A18');
}
function showSplash() {
  var rm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var el = document.createElement('div'); el.id = 'splash'; el.setAttribute('role', 'presentation');
  el.innerHTML = '<div class="emb"><svg viewBox="0 0 168 168" aria-hidden="true"><defs><linearGradient id="spg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4FD8E8"/><stop offset=".6" stop-color="#8E7CFF"/><stop offset="1" stop-color="#E2C47A"/></linearGradient></defs><circle class="r2" cx="84" cy="84" r="82"/><circle class="r1" cx="84" cy="84" r="80"/></svg><span class="seal"><img src="icon-192.webp" alt=""></span></div><b>مجمع الأميرات 2</b><small>مكتب التسليم الفني</small>';
  document.body.appendChild(el);
  var done = false;
  function finish() { if (done) return; done = true; el.classList.add('out'); S.hubAnim = true; var v = document.getElementById('view'); if (v) v.setAttribute('data-h', ''); S.hubBusyUntil = 0; scheduleRender(); setTimeout(function () { el.remove(); }, 600); }
  el.addEventListener('click', finish);
  setTimeout(finish, rm ? 300 : 2100);
}

/* ================= التشغيل ================= */
var started = false;
function start() {
  if (started) return; started = true;
  S.view = 'hub'; S.hubAnim = false; // كل فتح للتطبيق يبدأ من الشبكة الرئيسية، بعد شاشة الافتتاح
  showSplash();
  obReplay();
  listen();
  renderAll();
  setTimeout(function () { syncAll(false); }, 600);
  setInterval(function () { syncAll(false); autoBackup(); }, 10 * 60 * 1000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { syncDelivered(false); scheduleRender(); } });
  setInterval(scheduleRender, 60 * 1000); // تحديث العدّادات بتغيّر اليوم
  setTimeout(function () { if (S.remoteReady && !(D().meta && D().meta.importedAt)) { S.view = 'settings'; scheduleRender(); toast('أول تشغيل: انسخ بيانات النظام الحالي من الإعدادات', 'info'); } }, 4000);
}
(function boot() {
  applyMode(); setInterval(applyMode, 5 * 60 * 1000);
  if (!initFirebase()) { renderLogin(); return; }
  auth.onAuthStateChanged(function (fu) {
    if (started) { if (!fu) location.reload(); return; }
    if (fu && S.user) { document.getElementById('login').classList.add('hidden'); start(); }
    else { if (!fu) { S.user = null; lsSet('a2_user', null); } renderLogin(); } // الجهاز مربوط بس لازم يختار الاسم ويكتب الرمز
  });
  if ('serviceWorker' in navigator) window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
})();

// للاختبار
window.__A = { S: S, parseWeeklySheet: parseWeeklySheet, computeAlerts: computeAlerts, globalSearch: globalSearch, wsUnits: wsUnits, pendingNew: pendingNew };
})();
