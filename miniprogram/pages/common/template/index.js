Page({
  data: {
    pageTitle: "标准页面模板",
    loading: false,
    empty: false
  },
  onLoad() {},
  onPullDownRefresh() {
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 300);
  }
});
