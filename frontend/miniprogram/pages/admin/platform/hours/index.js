const { getAllPendingForL1, resolveHoursRequest } = require("../../../../utils/hoursReviewStore");
const { mergeFromStorageIntoApp } = require("../../../../utils/userProfileStore");
const { checkOnboardingOrRedirect } = require("../../../../utils/onboardingGuard");

const PAGE_PATH = "pages/admin/platform/hours/index";

Page({
  data: {
    pendingHours: []
  },
  onShow() {
    checkOnboardingOrRedirect(PAGE_PATH);
    mergeFromStorageIntoApp();
    const h = getAllPendingForL1() || [];
    this.setData({ pendingHours: h });
  },
  onPullDownRefresh() {
    this.onShow();
    wx.stopPullDownRefresh();
  },
  onHoursApprove(e) {
    this._resolveHours(e.currentTarget.dataset.id, true);
  },
  onViewHours(e) {
    const id = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id;
    if (!id) {
      return;
    }
    wx.navigateTo({ url: "/pages/common/review-submission-detail/index?type=hours&id=" + encodeURIComponent(String(id)) });
  },
  onHoursReject(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: "驳回",
      content: "确认驳回此条认定义务时长？",
      success: (r) => {
        if (r.confirm) {
          this._resolveHours(id, false);
        }
      }
    });
  },
  _resolveHours(id, ok) {
    const appU = getApp().globalData.userInfo || {};
    const res = resolveHoursRequest(id, ok, { role: "admin_level_1", phone: appU.phone, nickname: appU.nickname });
    if (!res.ok) {
      wx.showToast({ title: res.message || "操作失败", icon: "none" });
      return;
    }
    wx.showToast({ title: ok ? "已通过" : "已驳回", icon: "success" });
    this.onShow();
  }
});
