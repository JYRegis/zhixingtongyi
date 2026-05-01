const { ROLE_HOME_CARDS } = require("../../../utils/roleLabels");
const { authApi } = require("../../../utils/api");
const { appRoleToRoleApplyTarget, isAdminRole, isLearnerRole } = require("../../../utils/backendRole");

Page({
  data: {
    cards: ROLE_HOME_CARDS,
    submitting: false
  },
  async onChooseRole(e) {
    if (this.data.submitting) {
      return;
    }
    const role = e.currentTarget.dataset.role;
    if (!role) {
      return;
    }
    const app = getApp();
    const userInfo = (app.globalData && app.globalData.userInfo) || null;
    if (!userInfo || !userInfo.phone) {
      wx.showToast({ title: "请先登录", icon: "none" });
      setTimeout(() => {
        wx.reLaunch({ url: "/pages/common/home/index" });
      }, 400);
      return;
    }
    const token = (app.globalData && app.globalData.token) || wx.getStorageSync("token") || "";
    if (isLearnerRole(role) && token) {
      const target = appRoleToRoleApplyTarget(role);
      this.setData({ submitting: true });
      wx.showLoading({ title: "同步身份", mask: true });
      try {
        await authApi.roleApply(target);
      } catch (err) {
        wx.hideLoading();
        this.setData({ submitting: false });
        wx.showToast({ title: (err && err.message) || "身份同步失败", icon: "none" });
        return;
      }
      wx.hideLoading();
    }
    if (isAdminRole(role)) {
      wx.showToast({ title: "开发测试身份，不向后端申请", icon: "none" });
    }
    app.setLogin(role, {
      ...userInfo,
      role: role,
      roleApplied: isLearnerRole(role) ? true : userInfo.roleApplied
    });
    this.setData({ submitting: false });
    if (isAdminRole(role)) {
      wx.reLaunch({ url: "/pages/common/workbench/index" });
      return;
    }
    wx.redirectTo({
      url: `/pages/common/onboarding-apply/index?role=${encodeURIComponent(role)}`
    });
  }
});
