Page({
  data: {
    pairInfo: {
      partnerName: "王同学",
      subject: "数学",
      startDate: "2025-04-20",
      status: "结对中"
    },
    reason: "",
    pendingRequest: {
      id: 301,
      from: "学员端",
      reason: "近期课业安排变化，建议改为新老师匹配。",
      status: "待你确认"
    }
  },
  onReasonInput(e) {
    this.setData({
      reason: e.detail.value
    });
  },
  onSubmitApply() {
    if (!this.data.reason.trim()) {
      wx.showToast({
        title: "请填写解绑原因",
        icon: "none"
      });
      return;
    }
    wx.showToast({
      title: "解绑申请已提交",
      icon: "success"
    });
  },
  onAgree() {
    wx.showToast({
      title: "已同意解绑",
      icon: "success"
    });
  },
  onReject() {
    wx.showToast({
      title: "已拒绝解绑",
      icon: "none"
    });
  }
});
