const { platformForceUnbind } = require("../../../../utils/pairingStore");
const { mergeFromStorageIntoApp } = require("../../../../utils/userProfileStore");
const { checkOnboardingOrRedirect } = require("../../../../utils/onboardingGuard");

const PAGE_PATH = "pages/admin/platform/risk/index";

const MOCK_RISKS = [
  { reason: "连续 14 天无沟通记录", risk: "中" },
  { reason: "多次会议缺席", risk: "高" },
  { reason: "学员周活跃低于阈值", risk: "低" },
  { reason: "家长投诉沟通延迟", risk: "中" },
  { reason: "志愿者连续两周未发周报", risk: "中" },
  { reason: "会议设备异常 3 次", risk: "高" },
  { reason: "结对方时区/作息冲突", risk: "低" },
  { reason: "受援方反馈课堂纪律问题", risk: "高" },
  { reason: "解绑在途，结对冻结", risk: "中" },
  { reason: "志愿者临时支教点变更", risk: "低" }
];

Page({
  data: {
    exceptionPairs: MOCK_RISKS
  },
  onShow() {
    checkOnboardingOrRedirect(PAGE_PATH);
    mergeFromStorageIntoApp();
  },
  onPullDownRefresh() {
    this.onShow();
    wx.stopPullDownRefresh();
  },
  onForceUnbind() {
    wx.showModal({
      title: "平台处理",
      content: "对当前示警做「强制解绑」类处理（演示），将不经过三向确认。是否继续？",
      success: (r) => {
        if (r.confirm) {
          platformForceUnbind();
          wx.showToast({ title: "已处理", icon: "success" });
        }
      }
    });
  }
});
