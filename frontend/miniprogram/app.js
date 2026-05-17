// 知行同驿支教小程序：全局登录态（数据走后端 HTTP，见 utils/env.js）
const { getByPhone, saveProfile } = require("./utils/userProfileStore");
const notificationCenter = require("./utils/notificationCenter");

App({
  globalData: {
    userInfo: null,
    role: "",
    token: "",
    /** HTTP 接口环境：dev / test / prod，见 utils/env.js */
    env: "dev",
    /** 全局未读消息数，由 notificationCenter 维护 */
    unreadCount: 0
  },
  onLaunch() {
    // 主线程/存储异常勿阻断启动
    try {
      if (wx.getStorageSync("zhixing_run_mock_seed") === "1") {
        const { runFullMockSeed } = require("./utils/mockDataSeed");
        runFullMockSeed();
        wx.removeStorageSync("zhixing_run_mock_seed");
        if (console && console.log) {
          console.log("[mock] mockDataSeed 已写入，见 docs/MOCK_DATA.md");
        }
      }
    } catch (e) {
      if (console && console.error) {
        console.error("[app] mock seed 失败", e);
      }
    }
    try {
      const savedRole = wx.getStorageSync("role");
      const savedUserInfo = wx.getStorageSync("userInfo");
      const savedToken = wx.getStorageSync("token");
      const base = savedUserInfo || null;
      if (savedRole) {
        this.globalData.role = savedRole;
      }
      if (savedToken) {
        this.globalData.token = savedToken;
      }
      if (base) {
        const p = base.phone && getByPhone(String(base.phone));
        this.globalData.userInfo = p ? { ...p, ...base } : base;
        wx.setStorageSync("userInfo", this.globalData.userInfo);
      } else if (savedRole) {
        this.globalData.userInfo = { nickname: "缓存用户", role: savedRole };
      }
    } catch (e) {
      if (console && console.error) {
        console.error("[app] onLaunch: 恢复角色/用户缓存失败", e);
      }
    }
    // 启动通知轮询（仅当已登录）
    if (this.globalData.token) {
      try { notificationCenter.start(); } catch (_) {}
    }
  },
  onShow() {
    // 进入前台：若已登录则恢复轮询并立即拉一次
    if (this.globalData.token) {
      try { notificationCenter.start(); notificationCenter.refreshNow(); } catch (_) {}
    }
  },
  onHide() {
    // 切到后台：停轮询省流量
    try { notificationCenter.stop(); } catch (_) {}
  },
  setLogin(role, userInfo) {
    if (!userInfo) {
      this.globalData.role = role;
      this.globalData.userInfo = null;
      wx.setStorageSync("role", role);
      wx.setStorageSync("userInfo", null);
      return;
    }
    const phone = userInfo.phone != null && String(userInfo.phone).length === 11 ? String(userInfo.phone) : "";
    const backendUserId = userInfo.backendUserId != null ? userInfo.backendUserId : userInfo.id;
    const u = {
      ...userInfo,
      role,
      backendUserId: backendUserId != null ? backendUserId : userInfo.backendUserId,
      userId: userInfo.userId || phone || (backendUserId != null ? String(backendUserId) : "")
    };
    if (phone) {
      const prev = getByPhone(phone) || {};
      const merged = { ...prev, ...u, role, phone, userId: u.userId || phone };
      this.globalData.role = role;
      this.globalData.userInfo = merged;
      wx.setStorageSync("role", role);
      wx.setStorageSync("userInfo", merged);
      saveProfile(phone, merged);
    } else {
      this.globalData.role = role;
      this.globalData.userInfo = u;
      wx.setStorageSync("role", role);
      wx.setStorageSync("userInfo", u);
    }
    // 登录后立即启动通知轮询
    try { notificationCenter.start(); } catch (_) {}
  },
  logout() {
    this.globalData.role = "";
    this.globalData.userInfo = null;
    this.globalData.token = "";
    wx.removeStorageSync("role");
    wx.removeStorageSync("userInfo");
    wx.removeStorageSync("token");
    try { notificationCenter.stop(); notificationCenter.reset(); } catch (_) {}
  }
});
