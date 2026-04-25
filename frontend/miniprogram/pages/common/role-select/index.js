const { ROLE_HOME_CARDS } = require("../../../utils/roleLabels");

Page({
  data: {
    cards: ROLE_HOME_CARDS
  },
  onChooseRole(e) {
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
    app.setLogin(role, userInfo);
    wx.redirectTo({
      url: `/pages/common/onboarding-apply/index?role=${encodeURIComponent(role)}`
    });
  }
});
