const { checkOnboardingOrRedirect } = require("../../../utils/onboardingGuard");
const { USE_BACKEND_NOTIFICATION } = require("../../../config/demoBackend");
const { notificationApi } = require("../../../utils/api");
const notificationCenter = require("../../../utils/notificationCenter");

function formatTime(v) { if (v == null) return "—"; const t = typeof v === "string" ? Date.parse(v.replace(" ", "T")) : Date.parse(String(v)); if (isNaN(t)) return "—"; const d = new Date(t); const z = (n) => (n < 10 ? "0" : "") + n; return d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate()) + " " + z(d.getHours()) + ":" + z(d.getMinutes()); }
function mapRow(n) { const id = n && n.id != null ? n.id : 0; const readTime = n && (n.readTime != null ? n.readTime : n.read_time); return { id, titleText: (n && n.title) || "通知", contentText: (n && n.content) || "", timeText: formatTime(n && (n.sentTime != null ? n.sentTime : n.sent_time)), isRead: readTime != null && readTime !== "" }; }
function pageRecords(payload) { return Array.isArray(payload) ? payload : (payload && (payload.records || payload.list)) || []; }

Page({
  data: { loggedIn: false, useApi: false, loading: false, list: [], unreadOnly: false, keyword: "" },
  onShow() { checkOnboardingOrRedirect("pages/common/notifications/index"); const app = getApp(); const role = (app.globalData && app.globalData.role) || ""; const token = (app.globalData && app.globalData.token) || wx.getStorageSync("token") || ""; const loggedIn = !!role && !!token; const useApi = USE_BACKEND_NOTIFICATION && !!token; this.setData({ loggedIn, useApi }); this.load(); },
  load() { if (!this.data.useApi) { this.setData({ list: [], loading: false }); return; } this.setData({ loading: true }); notificationApi.list({ page: 1, size: 50, unreadOnly: this.data.unreadOnly ? 1 : 0, keyword: this.data.keyword || "" }).then((rows) => { this.setData({ list: pageRecords(rows).map(mapRow), loading: false }); }).catch(() => { this.setData({ list: [], loading: false }); wx.showToast({ title: "通知加载失败", icon: "none" }); }); },
  onPullDownRefresh() { this.onShow(); wx.stopPullDownRefresh(); },
  onRowTap(e) { const id = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id; if (!id) return; const self = this; const row = (this.data.list || []).find((x) => x.id == id); if (row && row.isRead) return; notificationApi.read(id).then(() => { const list = (self.data.list || []).map((x) => x.id == id ? { ...x, isRead: true } : x); self.setData({ list }); try { notificationCenter.decrement(1); } catch (_) {} }).catch(() => wx.showToast({ title: "标记已读失败", icon: "none" })); },
  onMarkAllRead() { const ids = (this.data.list || []).filter((x) => x && !x.isRead).map((x) => x.id); if (!ids.length) { wx.showToast({ title: "没有未读", icon: "none" }); return; } const self = this; wx.showLoading({ title: "处理中", mask: true }); notificationApi.batchRead(ids).then(() => { wx.hideLoading(); self.setData({ list: (self.data.list || []).map((x) => ({ ...x, isRead: true })) }); wx.showToast({ title: "已更新", icon: "success" }); try { notificationCenter.decrement(ids.length); } catch (_) {} }).catch(() => { wx.hideLoading(); wx.showToast({ title: "操作失败", icon: "none" }); }); },
  onUnreadToggle(e) { this.setData({ unreadOnly: !!(e.detail && e.detail.value) }, () => this.load()); },
  onKeywordInput(e) { this.setData({ keyword: e.detail.value || "" }); },
  onSearch() { this.load(); }
});
