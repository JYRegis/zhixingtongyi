const { getApplicationById } = require("../../../utils/onboardingStore");
const { getHoursRequestById } = require("../../../utils/hoursReviewStore");
const { buildOnboardingRows, buildHoursRows } = require("../../../utils/reviewDetailRows");
const { canViewOnboardingSubmission, canViewHoursSubmission } = require("../../../utils/reviewAccess");
const { mergeFromStorageIntoApp } = require("../../../utils/userProfileStore");
const { checkOnboardingOrRedirect } = require("../../../utils/onboardingGuard");
const { adminApi, volunteerRecordApi } = require("../../../utils/api");
const { freeTimeMapsToSerializedString } = require("../../../utils/dtoMappers");
const { formatSavedTimeForDisplay } = require("../../../utils/classTimeOptions");

function fmtDateTime(v) {
  if (!v) return "—";
  const t = Date.parse(String(v).replace(" ", "T"));
  if (isNaN(t)) return String(v);
  const d = new Date(t);
  const z = (n) => (n < 10 ? "0" : "") + n;
  return d.getFullYear() + "年" + (d.getMonth() + 1) + "月" + d.getDate() + "日 " + z(d.getHours()) + ":" + z(d.getMinutes());
}

function formatFreeTime(ft) {
  if (!ft) return "—";
  if (Array.isArray(ft) && ft.length) {
    const serialized = freeTimeMapsToSerializedString(ft);
    const display = formatSavedTimeForDisplay(serialized);
    return display || "—";
  }
  if (typeof ft === "string" && ft.trim()) {
    return formatSavedTimeForDisplay(ft) || ft;
  }
  return "—";
}

const PAGE = "pages/common/review-submission-detail/index";
function pageRecords(payload) { return Array.isArray(payload) ? payload : (payload && (payload.records || payload.list)) || []; }

Page({
  data: { type: "onboarding", pageTitle: "详情", rows: [], denied: false },
  onLoad(q) { this._id = (q && q.id) || ""; const t = (q && q.type) || "onboarding"; this._type = t; },
  onShow() { checkOnboardingOrRedirect(PAGE); this._load(); },
  _remoteUserRows(user) {
    const roleMap = { 0: "平台管理员", 1: "学校管理员", 2: "支教志愿者", 3: "乡村学员" };
    const statusMap = { 0: "已禁用", 1: "正常" };
    return { pageTitle: "用户信息", rows: [
      { label: "用户名", value: user.username || "—" },
      { label: "手机号", value: user.phone || "—" },
      { label: "角色", value: roleMap[user.role] || ("未知角色(" + user.role + ")") },
      { label: "账号状态", value: statusMap[user.status] || ("状态" + user.status) },
      { label: "注册时间", value: fmtDateTime(user.createTime) },
      { label: "最近更新", value: fmtDateTime(user.updateTime) }
    ] };
  },
  _remoteTeacherRows(t) {
    const certMap = { 0: "待审核", 1: "已通过", 2: "已拒绝" };
    const subjects = Array.isArray(t.skilledSubjects) ? t.skilledSubjects.join("、") : (t.skilledSubjects || "—");
    const freeTimeDisplay = formatFreeTime(t.freeTime);
    const contMatch = t.continuousMatch != null ? (t.continuousMatch ? "是" : "否") : "—";
    const totalDur = t.totalServiceDuration != null ? Math.round(t.totalServiceDuration / 60 * 10) / 10 + " 小时" : "—";
    const rows = [
      { label: "真实姓名", value: t.realName || "—" },
      { label: "学校", value: t.schoolName || t.school || "—" },
      { label: "年级", value: t.grade || "—" },
      { label: "擅长科目", value: subjects },
      { label: "可授课时间", value: freeTimeDisplay },
      { label: "个人特长", value: t.personalSkills || "—" },
      { label: "性格描述", value: t.personalityDesc || "—" }
    ];
    return { pageTitle: "志愿者资料", rows };
  },
  _remoteStudentRows(s) {
    const auditMap = { 0: "待审核", 1: "已通过", 2: "已拒绝" };
    const subjects = Array.isArray(s.subjectsNeeded) ? s.subjectsNeeded.join("、") : (s.subjectsNeeded || "—");
    const freeTimeDisplay = formatFreeTime(s.freeTime);
    const profileStatusMap = { 0: "草稿", 1: "已提交（可配对）" };
    const rows = [
      { label: "真实姓名", value: s.realName || "—" },
      { label: "用户名", value: s.username || "—" },
      { label: "手机号", value: s.phone || "—" },
      { label: "学校", value: s.schoolName || s.school || "—" },
      { label: "年级", value: s.grade || "—" },
      { label: "需要辅导科目", value: subjects },
      { label: "希望上课时间", value: freeTimeDisplay },
      { label: "性格描述", value: s.personalityDesc || "—" }
    ];
    return { pageTitle: "学生资料", rows };
  },
  _remoteHoursRows(row) {
    const minutes = Number(row && row.duration ? row.duration : 0);
    const hours = minutes ? Math.round((minutes / 60) * 10) / 10 : "—";
    var evidenceImages = [];
    if (row.evidenceImages) {
      try {
        var parsed = typeof row.evidenceImages === "string" ? JSON.parse(row.evidenceImages) : row.evidenceImages;
        if (Array.isArray(parsed)) evidenceImages = parsed;
      } catch (_) {}
    }
    var rows = [
      { label: "志愿者", value: row.teacherName || "—" },
      { label: "学员", value: row.studentName || "—" },
      { label: "服务日期", value: row.meetingDate || "—" },
      { label: "服务时长", value: hours + " 小时（" + minutes + " 分钟）" },
      { label: "服务说明", value: row.serviceDesc || "—" }
    ];
    if (evidenceImages.length) {
      rows.push({ label: "志愿凭证", value: "", type: "images", images: evidenceImages });
    }
    return { pageTitle: "认定义务时长", rows: rows };
  },
  _loadRemote(id, type) {
    if (type === "hours") { return volunteerRecordApi.detail(id).then((row) => { if (!row) throw new Error("记录不存在"); return this._remoteHoursRows(row); }).catch(() => { return volunteerRecordApi.list({ page: 1, size: 200 }).then((res) => { const row = pageRecords(res).find((x) => x && String(x.id) === String(id)); if (!row) throw new Error("记录不存在"); return this._remoteHoursRows(row); }); }); }
    if (type === "teacher") { return adminApi.teacherDetail(id).then((t) => this._remoteTeacherRows(t || {})); }
    if (type === "student") { return adminApi.studentDetail(id).then((s) => this._remoteStudentRows(s || {})); }
    return adminApi.userDetail(id).then((user) => this._remoteUserRows(user || {}));
  },
  _load() {
    mergeFromStorageIntoApp();
    const app0 = getApp(); const r = app0.globalData && app0.globalData.role; const u = (app0.globalData && app0.globalData.userInfo) || {}; const phone = u.phone || "";
    if (r !== "admin_level_1" && r !== "admin_level_2") { this.setData({ denied: true, rows: [], pageTitle: "无权限" }); return; }
    const id = this._id; if (!id) { this.setData({ denied: true, rows: [] }); return; }
    const token = (app0.globalData && app0.globalData.token) || wx.getStorageSync("token") || "";
    if (token) { this._loadRemote(id, this._type).then(({ pageTitle, rows }) => { this.setData({ type: this._type, pageTitle, rows, denied: false }); }).catch(() => { this._loadLocal(r, phone, id); }); return; }
    this._loadLocal(r, phone, id);
  },
  _loadLocal(r, phone, id) {
    if (this._type === "hours") { const row = getHoursRequestById(id); if (!row || !canViewHoursSubmission(r, phone, row)) { this.setData({ denied: true, rows: [] }); wx.showToast({ title: "无权限或记录不存在", icon: "none" }); return; } const { pageTitle, rows } = buildHoursRows(row); this.setData({ type: "hours", pageTitle, rows, denied: false }); return; }
    const a = getApplicationById(id); if (!a || !canViewOnboardingSubmission(r, phone, a)) { this.setData({ denied: true, rows: [] }); wx.showToast({ title: "无权限或记录不存在", icon: "none" }); return; }
    const { pageTitle, rows } = buildOnboardingRows(a); this.setData({ type: "onboarding", pageTitle, rows, denied: false });
  },
  onPreviewEvidence(e) {
    const url = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.url;
    const urls = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.urls;
    if (!url) return;
    wx.previewImage({ current: url, urls: Array.isArray(urls) ? urls : [url] });
  }
});
