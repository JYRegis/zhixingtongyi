Page({
  // TODO: 后续恢复“已登录自动重定向到工作台”逻辑；当前为避免影响开发测试先关闭。
  onGoLogin() {
    wx.navigateTo({
      url: "/pages/common/auth/index?flow=login"
    });
  }
});
