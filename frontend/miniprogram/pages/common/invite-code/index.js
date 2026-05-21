Page({
  data: {
    inviteCode: ""
  },
  onLoad(query) {
    const code = query && query.code ? decodeURIComponent(query.code) : "";
    this.setData({ inviteCode: code || "—" });
  },
  onCopy() {
    const code = this.data.inviteCode;
    if (!code || code === "—") return;
    wx.setClipboardData({
      data: code,
      success: function () {
        wx.showToast({ title: "已复制", icon: "success" });
      }
    });
  },
  onBack() {
    wx.reLaunch({ url: "/pages/common/home/index" });
  }
});
