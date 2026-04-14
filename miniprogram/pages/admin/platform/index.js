Page({
  data: {
    stats: {
      volunteerCount: 128,
      studentCount: 246,
      pairCount: 92,
      pendingAlerts: 6
    },
    exceptionPairs: [
      { id: "P20250501", reason: "连续 14 天无沟通记录", risk: "中" },
      { id: "P20250418", reason: "多次会议缺席", risk: "高" }
    ]
  },
  onAssignPermission() {
    wx.showToast({
      title: "权限变更示例",
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
