const { ROLE_DISPLAY_NAME } = require("../../../utils/roleLabels");
const { mergeFromStorageIntoApp } = require("../../../utils/userProfileStore");
const { ensureStatusFromApplications } = require("../../../utils/onboardingStore");

Page({
  data: {
    roleName: ""
  },
  onLoad(q) {
    const fromQuery = (q && q.role) || "";
    const app = getApp();
    const r = (fromQuery || (app && app.globalData && app.globalData.role) || "").trim();
    this.setData({
      roleName: (r && ROLE_DISPLAY_NAME[r]) || ""
    });
  },
  onShow() {
    mergeFromStorageIntoApp();
    const app = getApp();
    const r = (app && app.globalData && app.globalData.role) || "";
    let u = app && app.globalData && app.globalData.userInfo;
    if (u && u.phone) {
      ensureStatusFromApplications(String(u.phone));
      u = app.globalData.userInfo;
    }
    const st = (u && u.onboardingStatus) || "none";
    if (st === "approved" && r) {
      wx.switchTab({ url: "/pages/common/workbench/index" });
      return;
    }
    if ((st === "none" || st === "rejected") && r) {
      wx.redirectTo({
        url: "/pages/common/onboarding-apply/index?role=" + encodeURIComponent(r) + "&from=pending"
      });
    }
  },
  onReLaunchHome() {
    getApp().logout();
    wx.reLaunch({ url: "/pages/common/home/index" });
  },
  onChangeAccount() {
    const app = getApp();
    app.logout();
    wx.reLaunch({ url: "/pages/common/auth/index?flow=login" });
  }
});
