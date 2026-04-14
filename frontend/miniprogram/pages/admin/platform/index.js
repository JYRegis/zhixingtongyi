Page({
  data: {
    stats: {
      volunteerCount: 128,
      studentCount: 246,
      pairCount: 92,
      pendingAlerts: 6
    },
    summaryCards: [],
    exceptionPairs: [
      { id: "P20250501", reason: "连续 14 天无沟通记录", risk: "中" },
      { id: "P20250418", reason: "多次会议缺席", risk: "高" }
    ]
  },
  onShow() {
    this.setData({
      summaryCards: [
        {
          label: "志愿者总数",
          value: this.data.stats.volunteerCount,
          note: "当前已入库的志愿者人数"
        },
        {
          label: "有效结对",
          value: this.data.stats.pairCount,
          note: "当前仍在持续中的有效结对"
        },
        {
          label: "待处理预警",
          value: this.data.stats.pendingAlerts,
          note: "建议优先跟进的异常提醒数量"
        }
      ]
    });
  },
  onPullDownRefresh() {
    this.onShow();
    wx.stopPullDownRefresh();
  },
  onAssignPermission() {
    wx.showToast({
      title: "权限已变更",
      icon: "none"
    });
  },
  onForceUnbind(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: "确认干预",
      content: `是否对 ${id} 发起强制解绑流程？`,
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: "干预已记录", icon: "success" });
        }
      }
    });
  }
});
