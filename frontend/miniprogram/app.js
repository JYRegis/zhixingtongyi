// 知行同驿支教小程序：全局登录态（数据走后端 HTTP，见 utils/env.js）
const { getByPhone, saveProfile } = require("./utils/userProfileStore");

App({
  globalData: {
    userInfo: null,
    role: "",
    token: "",
    /** HTTP 接口环境：dev / test / prod，见 utils/env.js */
    env: "dev"
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
      if (savedRole) {
        this.globalData.role = savedRole;
        const base = savedUserInfo || { nickname: "缓存用户", role: savedRole };
        const p = base.phone && getByPhone(String(base.phone));
        this.globalData.userInfo = p ? { ...p, ...base } : base;
        wx.setStorageSync("userInfo", this.globalData.userInfo);
      }
    } catch (e) {
      if (console && console.error) {
        console.error("[app] onLaunch: 恢复角色/用户缓存失败", e);
      }
    }
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
    const u = { ...userInfo, role, userId: phone || userInfo.userId || "" };
    if (phone) {
      const prev = getByPhone(phone) || {};
      const merged = { ...prev, ...u, role, phone, userId: phone };
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
  },
  logout() {
    this.globalData.role = "";
    this.globalData.userInfo = null;
    this.globalData.token = "";
    wx.removeStorageSync("role");
    wx.removeStorageSync("userInfo");
  }
});
