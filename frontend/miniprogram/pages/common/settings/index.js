const { to } = require("../../../utils/nav");
const { ROLE_DISPLAY_NAME } = require("../../../utils/roleLabels");
const { checkOnboardingOrRedirect } = require("../../../utils/onboardingGuard");
const { syncCustomTabBar } = require("../../../utils/customTabBar");
const notificationCenter = require("../../../utils/notificationCenter");

Page({
  data: {
    loggedIn: false,
    role: "",
    roleName: "",
    nickname: "",
    avatarChar: "用",
    avatarUrl: "",
    heroTitle: "设置",
    unreadCount: 0
  },
  onShow() {
    checkOnboardingOrRedirect("pages/common/settings/index");
    syncCustomTabBar();
    this.refreshUser();
    // 订阅全局未读数；同时立即触发一次拉取
    if (typeof this._unsub !== "function") {
      const self = this;
      this._unsub = notificationCenter.subscribe(function (evt) {
        if (evt && evt.type === "unread-change") {
          self.setData({ unreadCount: (evt.payload && evt.payload.count) || 0 });
        }
      });
    }
    try { notificationCenter.refreshNow(); } catch (_) {}
  },
  onUnload() {
    if (typeof this._unsub === "function") {
      try { this._unsub(); } catch (_) {}
      this._unsub = null;
    }
  },
  refreshUser() {
    const app = getApp();
    const role = app.globalData.role || "";
    const userInfo = app.globalData.userInfo || {};
    const nickname = (userInfo.nickname || "").trim() || "未设置昵称";
    const avatarUrl = (userInfo.avatarUrl || "").trim();
    const avatarChar = nickname.length ? nickname.charAt(0) : "用";
    const loggedIn = !!role;
    this.setData({
      loggedIn,
      role,
      roleName: ROLE_DISPLAY_NAME[role] || "",
      nickname,
      avatarChar,
      avatarUrl
    });
  },
  onGoLogin() {
    wx.reLaunch({ url: "/pages/common/home/index" });
  },
  onGoAccountProfile() {
    if (!this.data.loggedIn || !this.data.role) {
      wx.showToast({ title: "请先登录", icon: "none" });
      return;
    }
    to("/pages/common/profile/index");
  },
  onGoNotifications() {
    if (!this.data.loggedIn) {
      wx.showToast({ title: "请先登录", icon: "none" });
      return;
    }
    to("/pages/common/notifications/index");
  },
  onLogout() {
    wx.showModal({
      title: "退出登录",
      content: "退出后将清除本机的登录状态，是否继续？",
      success: (res) => {
        if (res.confirm) {
          getApp().logout();
          wx.reLaunch({ url: "/pages/common/home/index" });
        }
      }
    });
  }
});
