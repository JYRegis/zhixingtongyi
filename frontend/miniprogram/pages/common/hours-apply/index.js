const { getActivePairList } = require("../../../utils/pairingStore");
const { getSchoolName } = require("../../../utils/schoolsMock");
const { submitHoursRequest, getMyHoursRequests } = require("../../../utils/hoursReviewStore");
const { checkOnboardingOrRedirect } = require("../../../utils/onboardingGuard");
const { mergeFromStorageIntoApp, getByPhone } = require("../../../utils/userProfileStore");
const { matchApi, volunteerRecordApi } = require("../../../utils/api");

const PAGE = "pages/common/hours-apply/index";
const STATUS_LABEL = { pending: "待审", approved: "已通过", rejected: "已驳回" };
function suggestWeekString() { const now = new Date(); const y = now.getFullYear(); const start = new Date(y, 0, 1); const dayOfYear = Math.floor((now - start) / 86400000) + 1; const week = Math.min(53, Math.max(1, Math.ceil(dayOfYear / 7))); return y + "-W" + String(week).padStart(2, "0"); }
function todayString() { const d = new Date(); const z = (n) => (n < 10 ? "0" : "") + n; return d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate()); }
function buildPairList() { return getActivePairList().filter((p) => p && p.status === "结对中").map((p) => ({ ...p, label: (p.studentName || "—") + " · " + (p.partnerName || "—") + " · " + (getSchoolName(p.schoolId) || p.schoolId) })); }
function buildPairListFromRemote(pairs) {
  const role = (getApp().globalData && getApp().globalData.role) || "";
  return (Array.isArray(pairs) ? pairs : []).map((p) => {
    const id = p && p.id != null ? p.id : p.pairId;
    const studentName = p.studentName || "学员";
    const teacherName = p.teacherName || "志愿者";
    // 只显示对方名字
    const label = role === "teacher" ? studentName : role === "student" ? teacherName : studentName + " · " + teacherName;
    return { pairId: String(id), studentName: studentName, partnerName: teacherName, schoolId: "", label: label, _remote: true };
  });
}
function mapMyList(phone) { return (getMyHoursRequests(phone) || []).map((h) => ({ ...h, statusLabel: STATUS_LABEL[h.status] || h.status || "—", statusClass: h.status === "approved" ? "hours-status--approved" : h.status === "rejected" ? "hours-status--rejected" : "hours-status--pending" })); }
function mapRemoteRecords(records) { const list = Array.isArray(records) ? records : (records && records.records) || (records && records.list) || []; const statusMap = { 0: "待学员确认", 1: "待管理员审核", 2: "已通过", 3: "已驳回", 4: "学员已驳回" }; return list.map((h) => { const minutes = Number(h.duration || 0); const hours = minutes ? Math.round((minutes / 60) * 10) / 10 : ""; const status = h.status; return { id: h.id, matchPairId: h.matchPairId || h.match_pair_id || "", studentName: h.studentName || (h.studentId != null ? "学员 " + h.studentId : "—"), volunteerName: h.teacherName || (h.teacherId != null ? "志愿者 " + h.teacherId : "—"), hours, week: h.meetingDate || "—", schoolName: h.schoolName || "—", statusLabel: statusMap[status] || "状态 " + status, statusClass: status === 2 ? "hours-status--approved" : status === 3 || status === 4 ? "hours-status--rejected" : "hours-status--pending" }; }); }

Page({
  data: { pairList: [], pairIndex: 0, hoursInput: "", dateInput: "", serviceDesc: "", evidenceImages: [], myList: [] },
  onLoad() { const r = (getApp().globalData && getApp().globalData.role) || ""; if (r !== "teacher") { wx.showToast({ title: "仅支教志愿者可申请时长", icon: "none" }); setTimeout(() => wx.navigateBack(), 500); return; } this.setData({ dateInput: todayString() }); },
  onShow() { const r = (getApp().globalData && getApp().globalData.role) || ""; if (r !== "teacher") return; checkOnboardingOrRedirect(PAGE); mergeFromStorageIntoApp(); this.syncData(); },
  syncData() {
    const app = getApp(); const u = (app.globalData && app.globalData.userInfo) || {}; const phone = u.phone ? String(u.phone) : ""; const token = (app.globalData && app.globalData.token) || wx.getStorageSync("token") || "";
    if (token) {
      Promise.all([matchApi.myPairs(1), volunteerRecordApi.list({ page: 1, size: 20 })]).then(([pairs, records]) => { this._applyData(buildPairListFromRemote(pairs), mapRemoteRecords(records)); }).catch(() => { this._applyData(buildPairList(), mapMyList(phone)); });
      return;
    }
    this._applyData(buildPairList(), mapMyList(phone));
  },
  _applyData(pairList, myList) {
    const { pairIndex } = this.data;
    const nextIndex = pairList.length ? Math.min(Math.max(0, pairIndex), pairList.length - 1) : 0;
    this._allRecords = myList || [];
    const filtered = this._filterByPair(pairList, nextIndex, myList);
    this.setData({ pairList, pairIndex: nextIndex, myList: filtered });
  },
  _filterByPair(pairList, pairIndex, allRecords) {
    const list = allRecords || this._allRecords || [];
    if (!pairList || !pairList.length) return list;
    const pair = pairList[pairIndex];
    if (!pair || !pair.pairId) return list;
    const pairId = String(pair.pairId);
    return list.filter(function (r) {
      // 匹配 matchPairId 或 pairId 字段
      var rid = String(r.matchPairId || r.pairId || "");
      return rid === pairId;
    });
  },
  onPairChange(e) {
    const idx = e.detail && e.detail.value != null ? Number(e.detail.value) : 0;
    const filtered = this._filterByPair(this.data.pairList, idx, this._allRecords);
    this.setData({ pairIndex: idx, myList: filtered });
  },
  onHoursInput(e) { this.setData({ hoursInput: (e.detail && e.detail.value) || "" }); },
  onDateChange(e) { this.setData({ dateInput: (e.detail && e.detail.value) || "" }); },
  onServiceDescInput(e) { this.setData({ serviceDesc: (e.detail && e.detail.value) || "" }); },
  onAddEvidence() {
    const self = this;
    const current = this.data.evidenceImages || [];
    if (current.length >= 6) { wx.showToast({ title: "最多上传6张凭证", icon: "none" }); return; }
    const { chooseAndUploadImages } = require("../../../utils/ossUpload");
    const remaining = 6 - current.length;
    chooseAndUploadImages({ businessType: "EVIDENCE", count: remaining }).then(function (urls) {
      if (!urls || !urls.length) return;
      self.setData({ evidenceImages: current.concat(urls).slice(0, 6) });
    }).catch(function (err) {
      if (err && err.message === "用户取消") return;
      wx.showToast({ title: (err && err.message) || "上传失败", icon: "none" });
    });
  },
  onRemoveEvidence(e) {
    const idx = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.index;
    if (idx == null) return;
    const list = (this.data.evidenceImages || []).slice();
    list.splice(Number(idx), 1);
    this.setData({ evidenceImages: list });
  },
  onPreviewEvidence(e) {
    const url = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.url;
    if (!url) return;
    wx.previewImage({ current: url, urls: this.data.evidenceImages || [url] });
  },
  onSubmit() {
    const { pairList, pairIndex, hoursInput, dateInput, serviceDesc } = this.data; if (!pairList.length) { wx.showToast({ title: "没有可选结对", icon: "none" }); return; }
    const pair = pairList[pairIndex]; if (!pair) { wx.showToast({ title: "请重新选择结对", icon: "none" }); return; }
    const hours = parseFloat(String(hoursInput).trim().replace(/,/g, "")); if (!hours || hours <= 0) { wx.showToast({ title: "请填写有效时长", icon: "none" }); return; }
    const meetingDate = (dateInput || "").trim() || todayString();
    const r = (getApp().globalData && getApp().globalData.role) || ""; const u = (getApp().globalData && getApp().globalData.userInfo) || {}; const phone = u.phone ? String(u.phone) : ""; const prof = phone ? getByPhone(phone) : null; const nick = (prof && prof.nickname) || u.nickname || "";
    let studentName = pair.studentName || "—"; let volunteerName = pair.partnerName || "—"; if (r === "student") studentName = (nick && nick.trim()) || studentName; else volunteerName = (nick && nick.trim()) || volunteerName;
    const app = getApp(); const token = (app.globalData && app.globalData.token) || wx.getStorageSync("token") || "";
    if (token && pair._remote) { if (!String(serviceDesc || "").trim()) { wx.showToast({ title: "请填写服务说明", icon: "none" }); return; } wx.showLoading({ title: "提交中", mask: true }); const evidenceImages = (this.data.evidenceImages || []).length ? this.data.evidenceImages : undefined; volunteerRecordApi.submit({ matchPairId: Number(pair.pairId), duration: Math.round(hours * 60), meetingDate, serviceDesc: String(serviceDesc || "").trim(), evidenceImages: evidenceImages }).then(() => { wx.hideLoading(); wx.showToast({ title: "已提交", icon: "success" }); this.setData({ hoursInput: "", serviceDesc: "", evidenceImages: [] }); this.syncData(); }).catch((err) => { wx.hideLoading(); wx.showToast({ title: (err && err.message) || "提交失败", icon: "none" }); }); return; }
    const res = submitHoursRequest({ schoolId: pair.schoolId || "", schoolName: getSchoolName(pair.schoolId) || pair.schoolId, studentName, volunteerName, hours, week: meetingDate, applicantPhone: phone, applicantRole: r, pairId: pair.pairId });
    if (!res || !res.ok) { wx.showToast({ title: (res && res.message) || "提交失败", icon: "none" }); return; }
    wx.showToast({ title: "已提交", icon: "success" }); this.setData({ hoursInput: "", serviceDesc: "" }); this.syncData();
  },
  onViewItem() { /* 已禁用跳转 */ }
});
