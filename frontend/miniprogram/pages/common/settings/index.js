const { to } = require("../../../utils/nav");
const { ROLE_DISPLAY_NAME } = require("../../../utils/roleLabels");

Page({
  data: {
    loggedIn: false,
    role: "",
    roleName: "",
    nickname: "",
    avatarChar: "用",
    avatarUrl: "",
    heroTitle: "账号与资料中心",
    heroDesc: "",
    heroBadges: [],
    summaryCards: []
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
    const loggedIn = !!role;
    this.setData({
      loggedIn,
      role,
      roleName: ROLE_DISPLAY_NAME[role] || "",
      nickname,
      avatarChar,
      avatarUrl,
      heroDesc: loggedIn
        ? "当前账号信息、资料入口和退出操作都汇总在这里。"
        : "先完成身份选择和基础登录，再进入资料完善、头像昵称编辑等后续步骤。",
      heroBadges: loggedIn
        ? ["当前身份已激活", "支持头像昵称编辑", "资料页可继续完善"]
        : ["未登录状态", "支持多角色切换", "快速上手"],
      summaryCards: loggedIn
        ? [
            { label: "当前身份", value: ROLE_DISPLAY_NAME[role] || "用户", note: "入口内容会随角色切换" },
            { label: "资料状态", value: "可继续完善", note: "可前往资料页补充角色信息" },
            { label: "本机状态", value: "已缓存", note: "退出前会保留当前账号信息" }
          ]
        : [
            { label: "当前状态", value: "未登录", note: "需先选择身份" },
            { label: "支持角色", value: "4类", note: "学生、教师、学校老师、平台" },
            { label: "下一步", value: "去登录", note: "从首页重新选择身份进入" }
          ]
    });
  },
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
      content: "退出后将清除本机的登录状态，是否继续？",
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
