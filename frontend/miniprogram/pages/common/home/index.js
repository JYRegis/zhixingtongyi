const { ROLE_HOME_CARDS } = require("../../../utils/roleLabels");
const { getPageRoleThemeClass } = require("../../../utils/roleTheme");

Page({
  data: {
    cards: ROLE_HOME_CARDS,
    // 首页固定为访客蓝色主题
    _roleThemeClass: "theme-guest"
  },
  onChooseRole(e) {
    const t = e && e.currentTarget;
    const role = (t && t.dataset && t.dataset.role) || (e && e.target && e.target.dataset && e.target.dataset.role);
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
