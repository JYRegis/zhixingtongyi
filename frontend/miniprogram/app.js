// 知行同驿支教小程序：全局登录态（数据走后端 HTTP，见 utils/env.js）
App({
  globalData: {
    userInfo: null,
    role: "",
    token: "",
    /** HTTP 接口环境：dev / test / prod，见 utils/env.js */
    env: "dev"
  },
  onLaunch() {
    const savedRole = wx.getStorageSync("role");
    const savedUserInfo = wx.getStorageSync("userInfo");
    if (savedRole) {
      this.globalData.role = savedRole;
      this.globalData.userInfo = savedUserInfo || { nickname: "缓存用户", role: savedRole };
    }
  },
  setLogin(role, userInfo) {
    this.globalData.role = role;
    this.globalData.userInfo = userInfo;
    wx.setStorageSync("role", role);
    wx.setStorageSync("userInfo", userInfo);
  },
  logout() {
    this.globalData.role = "";
    this.globalData.userInfo = null;
    this.globalData.token = "";
    wx.removeStorageSync("role");
    wx.removeStorageSync("userInfo");
  }
});
