const { checkOnboardingOrRedirect } = require("../../../utils/onboardingGuard");
const { USE_BACKEND_NOTIFICATION } = require("../../../config/demoBackend");
const { notificationApi } = require("../../../utils/api");

function formatTime(v) {
  if (v == null) {
    return "—";
  }
  const t = typeof v === "string" ? Date.parse(v.replace(" ", "T")) : Date.parse(String(v));
  if (isNaN(t)) {
    return "—";
  }
  const d = new Date(t);
  const z = (n) => (n < 10 ? "0" : "") + n;
  return d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate()) + " " + z(d.getHours()) + ":" + z(d.getMinutes());
}

function mapRow(n) {
  const id = n && n.id != null ? n.id : 0;
  const readTime = n && (n.readTime != null ? n.readTime : n.read_time);
  return {
    id: id,
    titleText: (n && n.title) || "通知",
    contentText: (n && n.content) || "",
    timeText: formatTime(n && (n.sentTime != null ? n.sentTime : n.sent_time)),
    isRead: readTime != null && readTime !== ""
  };
}

Page({
  data: {
    loggedIn: false,
    useApi: false,
    loading: false,
    list: []
  },
  onShow() {
    checkOnboardingOrRedirect("pages/common/notifications/index");
    const app = getApp();
    const role = (app.globalData && app.globalData.role) || "";
    const token = (app.globalData && app.globalData.token) || wx.getStorageSync("token") || "";
    const loggedIn = !!role && !!token;
    const useApi = USE_BACKEND_NOTIFICATION && !!token;
    this.setData({ loggedIn, useApi, loading: useApi });
    if (!useApi) {
      this.setData({ list: [], loading: false });
      return;
    }
    const self = this;
    notificationApi
      .list({ page: 1, size: 50, unreadOnly: false })
      .then(function (rows) {
        const list = (rows || []).map(mapRow);
        self.setData({ list: list, loading: false });
      })
      .catch(function () {
        self.setData({ list: [], loading: false });
        wx.showToast({ title: "通知加载失败", icon: "none" });
      });
  },
  onPullDownRefresh() {
    this.onShow();
    wx.stopPullDownRefresh();
  },
  onRowTap(e) {
    const id = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id;
    if (!id) {
      return;
    }
    const self = this;
    const row = (this.data.list || []).find(function (x) {
      return x.id == id;
    });
    if (row && row.isRead) {
      return;
    }
    notificationApi
      .read(id)
      .then(function () {
        const list = (self.data.list || []).map(function (x) {
          if (x.id == id) {
            return { ...x, isRead: true };
          }
          return x;
        });
        self.setData({ list: list });
      })
      .catch(function () {
        wx.showToast({ title: "标记已读失败", icon: "none" });
      });
  },
  onMarkAllRead() {
    const ids = (this.data.list || [])
      .filter(function (x) {
        return x && !x.isRead;
      })
      .map(function (x) {
        return x.id;
      });
    if (!ids.length) {
      wx.showToast({ title: "没有未读", icon: "none" });
      return;
    }
    const self = this;
    wx.showLoading({ title: "处理中", mask: true });
    notificationApi
      .batchRead(ids)
      .then(function () {
        wx.hideLoading();
        const list = (self.data.list || []).map(function (x) {
          return { ...x, isRead: true };
        });
        self.setData({ list: list });
        wx.showToast({ title: "已更新", icon: "success" });
      })
      .catch(function () {
        wx.hideLoading();
        wx.showToast({ title: "操作失败", icon: "none" });
      });
  }
});
