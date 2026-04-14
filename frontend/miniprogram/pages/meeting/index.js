const { ROLE_DISPLAY_NAME } = require("../../utils/roleLabels");

Page({
  data: {
    role: "",
    roleName: "学员",
    nextMeeting: {
      title: "数学辅导第 3 次",
      startTime: "2025-06-03 19:00",
      roomLink: "https://meeting.tencent.com/example"
    },
    history: [
      { id: 1, title: "英语口语练习", startTime: "2025-05-28 19:30", status: "已完成" },
      { id: 2, title: "数学函数专题", startTime: "2025-05-31 20:00", status: "已完成" }
    ]
  },
  onShow() {
    this.setData({
      role: getApp().globalData.role || "",
      roleName: ROLE_DISPLAY_NAME[getApp().globalData.role || ""] || "学员"
    });
  },
  onPullDownRefresh() {
    this.onShow();
    wx.stopPullDownRefresh();
  },
  onCopyLink() {
    wx.setClipboardData({
      data: this.data.nextMeeting.roomLink,
      success: () => wx.showToast({ title: "链接已复制", icon: "success" })
    });
  },
  onSubscribeNotice() {
    wx.showToast({
      title: "订阅提醒功能即将上线",
      icon: "none"
    });
  }
});
