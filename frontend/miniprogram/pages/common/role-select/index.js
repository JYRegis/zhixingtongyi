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
    if (!userInfo) {
      wx.showToast({ title: "请先登录", icon: "none" });
      setTimeout(() => {
        wx.reLaunch({ url: "/pages/common/home/index" });
      }, 400);
      return;
    }
    // 微信登录的用户可能没有手机号，不再强制要求 phone
    const token = (app.globalData && app.globalData.token) || wx.getStorageSync("token") || "";
    if (!token && !userInfo.phone && !userInfo.backendUserId) {
      wx.showToast({ title: "请先登录", icon: "none" });
      setTimeout(() => {
        wx.reLaunch({ url: "/pages/common/home/index" });
      }, 400);
      return;
    }
    if (isLearnerRole(role)) {
      // 学员/志愿者：先通知后端设置角色，再跳转到申请页填资料
      const target = appRoleToRoleApplyTarget(role);
      const self = this;
      if (target) {
        authApi.roleApply(target).then(function () {
          self.setData({ submitting: false });
          wx.navigateTo({
            url: `/pages/common/onboarding-apply/index?role=${encodeURIComponent(role)}`
          });
        }).catch(function () {
          // roleApply 失败（如已选过该角色），仍跳转入驻页，由后端 saveDraft 处理
          self.setData({ submitting: false });
          wx.navigateTo({
            url: `/pages/common/onboarding-apply/index?role=${encodeURIComponent(role)}`
          });
        });
      } else {
        self.setData({ submitting: false });
        wx.navigateTo({
          url: `/pages/common/onboarding-apply/index?role=${encodeURIComponent(role)}`
        });
      }
      return;
    }
    if (role === "admin_level_2") {
      // 学校老师：不需要填申请单，跳转到邀请码页面
      // 不调 setLogin，避免污染全局状态（用户可能返回重新选择）
      this.setData({ submitting: false });
      // 优先从 globalData 取 backendUserId，兜底从 storage 恢复
      let uid = userInfo.backendUserId || userInfo.id || userInfo.userId || "";
      if (!uid) {
        try {
          const stored = wx.getStorageSync("userInfo");
          if (stored) {
            uid = stored.backendUserId || stored.id || stored.userId || "";
          }
        } catch (_) {}
      }
      if (!uid) {
        wx.showToast({ title: "未获取到用户ID，请重新登录", icon: "none" });
        return;
      }
      wx.navigateTo({ url: "/pages/common/invite-code/index?code=" + encodeURIComponent(String(uid)) });
      return;
    }
    // 其他情况：兜底
    app.setLogin(role, { ...userInfo, role: role });
    this.setData({ submitting: false });
    wx.reLaunch({ url: "/pages/common/workbench/index" });
  }
});
