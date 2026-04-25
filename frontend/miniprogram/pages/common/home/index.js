Page({
  onGoLogin() {
    wx.navigateTo({
      url: "/pages/common/auth/index?flow=login"
    });
  }
});
