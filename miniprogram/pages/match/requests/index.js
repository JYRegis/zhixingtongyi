Page({
  data: {
    pendingList: [
      {
        id: 101,
        studentName: "小林",
        subject: "数学",
        preferredTime: "周六 19:00",
        urgentLevel: "高"
      },
      {
        id: 102,
        studentName: "小周",
        subject: "英语",
        preferredTime: "周日 15:00",
        urgentLevel: "中"
      }
    ],
    rejectReason: "",
    activeRejectId: null
  },
  onAccept(e) {
    const id = e.currentTarget.dataset.id;
    const updated = this.data.pendingList.filter((item) => item.id !== id);
    this.setData({ pendingList: updated });
    wx.showToast({
      title: `已接受 #${id}`,
      icon: "success"
    });
  },
  onOpenReject(e) {
    this.setData({
      activeRejectId: e.currentTarget.dataset.id,
      rejectReason: ""
    });
  },
  onInputReason(e) {
    this.setData({
      rejectReason: e.detail.value
    });
  },
  onRejectConfirm() {
    const { activeRejectId, rejectReason } = this.data;
    if (!activeRejectId) {
      return;
    }
    if (!rejectReason.trim()) {
      wx.showToast({
        title: "请填写拒绝理由",
        icon: "none"
      });
      return;
    }
    const updated = this.data.pendingList.filter((item) => item.id !== activeRejectId);
    wx.showToast({
      title: `已拒绝 #${activeRejectId}`,
      icon: "none"
    });
    this.setData({
      pendingList: updated,
      activeRejectId: null,
      rejectReason: ""
    });
  },
  onCancelReject() {
    this.setData({
      activeRejectId: null,
      rejectReason: ""
    });
  }
});
