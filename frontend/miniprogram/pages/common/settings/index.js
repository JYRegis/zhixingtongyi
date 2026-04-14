const { to } = require("../../../utils/nav");
const { ROLE_DISPLAY_NAME } = require("../../../utils/roleLabels");

Page({
  data: {
    loggedIn: false,
    role: "",
    roleName: "",
    nickname: "",
    avatarChar: "用",
    avatarUrl: ""
  },
  onShow() {
    this.refreshUser();
  },
  refreshUser() {
    const app = getApp();
    const role = app.globalData.role || "";
    const userInfo = app.globalData.userInfo || {};
    const nickname = (userInfo.nickname || "").trim() || "未设置昵称";
    const avatarUrl = (userInfo.avatarUrl || "").trim();
    const avatarChar = nickname.length ? nickname.charAt(0) : "用";
    this.setData({
      loggedIn: !!role,
      role,
      roleName: ROLE_DISPLAY_NAME[role] || "",
      nickname,
      avatarChar,
      avatarUrl
    });
  },
  /** 演示：跳转首页选择身份（等同登录） */
  onGoLogin() {
    wx.reLaunch({ url: "/pages/common/home/index" });
  },
  onEditLoginProfile() {
    if (!this.data.loggedIn || !this.data.role) {
      wx.showToast({ title: "请先登录", icon: "none" });
      return;
    }
    wx.navigateTo({
      url: `/pages/common/auth/index?role=${encodeURIComponent(this.data.role)}&prefill=1`
    });
  },
  onGoProfile() {
    if (!this.data.loggedIn) {
      wx.showToast({ title: "请先登录", icon: "none" });
      return;
    }
    to("/pages/common/profile/index");
  },
  onLogout() {
    wx.showModal({
      title: "退出登录",
      content: "退出后将清除本机的演示登录状态，是否继续？",
      success: (res) => {
        if (res.confirm) {
          getApp().logout();
          this.refreshUser();
          wx.showToast({ title: "已退出", icon: "success" });
        }
      }
    });
  }
});
