const { switchTab } = require("../../../utils/nav");
const { ROLE_HOME_CARDS } = require("../../../utils/roleLabels");

Page({
  data: {
    cards: ROLE_HOME_CARDS
  },
  onShow() {
    if (getApp().globalData.role) {
      switchTab("/pages/common/workbench/index");
    }
  },
  onChooseRole(e) {
    const role = e.currentTarget.dataset.role;
    if (!role) {
      return;
    }
    wx.navigateTo({
      url: `/pages/common/auth/index?role=${encodeURIComponent(role)}`
    });
  }
});
