// 小程序欢迎页：作为默认启动页，仅做品牌展示，
// 点击「进入小程序」后再 reLaunch 到登录入口 /pages/common/home/index。

Page({
  data: {
    statusBarHeight: 20,
    submitting: false
  },
  onLoad() {
    try {
      const info =
        (wx.getWindowInfo && wx.getWindowInfo()) ||
        (wx.getSystemInfoSync && wx.getSystemInfoSync()) ||
        {};
      const h = Number(info.statusBarHeight);
      if (!isNaN(h) && h > 0) {
        this.setData({ statusBarHeight: h });
      }
    } catch (e) {
      // ignore: 仅影响顶部留白
    }
  },
  onEnter() {
    if (this.data.submitting) {
      return;
    }
    this.setData({ submitting: true });
    wx.reLaunch({
      url: "/pages/common/home/index",
      complete: () => {
        this.setData({ submitting: false });
      }
    });
  }
});
