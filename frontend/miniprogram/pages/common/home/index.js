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
    wx.navigateTo({
      url: `/pages/common/auth/index?role=${encodeURIComponent(role)}&flow=register`
    });
  },
  onQuickLogin() {
    wx.showActionSheet({
      itemList: ["乡村学员", "支教志愿者", "学校老师", "平台运营"],
      success: (res) => {
        if (res.tapIndex == null) {
          return;
        }
        const roles = ["student", "teacher", "admin_level_2", "admin_level_1"];
        const role = roles[res.tapIndex];
        if (!role) {
          return;
        }
        wx.navigateTo({
          url: `/pages/common/auth/index?role=${encodeURIComponent(role)}&flow=login`
        });
      }
    });
  }
});
