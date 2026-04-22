const { getRecipientStudentRegList } = require("../../../utils/regionL2Display");
const { resolveApplication } = require("../../../utils/onboardingStore");
const { mergeFromStorageIntoApp, getByPhone } = require("../../../utils/userProfileStore");
const { checkOnboardingOrRedirect } = require("../../../utils/onboardingGuard");

Page({
  data: { list: [] },
  onShow() {
    checkOnboardingOrRedirect("pages/admin/region-students/index");
    this.refresh();
  },
  refresh() {
    mergeFromStorageIntoApp();
    const u = (getApp().globalData && getApp().globalData.userInfo) || {};
    const p = getByPhone(u.phone) || u;
    if (!u.phone) {
      this.setData({ list: [] });
      return;
    }
    if (p.l2Scope !== "recipient_side") {
      wx.showToast({ title: "仅受援方老师可查看", icon: "none" });
      setTimeout(function () {
        wx.navigateBack();
      }, 500);
      return;
    }
    this.setData({ list: getRecipientStudentRegList(String(u.phone)) });
  },
  onPullDownRefresh() {
    this.refresh();
    wx.stopPullDownRefresh();
  },
  onViewOnboarding(e) {
    const id = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id;
    if (!id) {
      return;
    }
    wx.navigateTo({
      url: "/pages/common/review-submission-detail/index?type=onboarding&id=" + encodeURIComponent(String(id))
    });
  },
  onApproveL2(e) {
    const id = e.currentTarget.dataset.id;
    const u = getApp().globalData.userInfo || {};
    const res = resolveApplication(id, true, { role: "admin_level_2", phone: u.phone, nickname: u.nickname });
    if (!res.ok) {
      wx.showToast({ title: res.message || "失败", icon: "none" });
      return;
    }
    wx.showToast({ title: "已处理", icon: "success" });
    this.onShow();
  },
  onRejectL2(e) {
    const id = e.currentTarget.dataset.id;
    const u = getApp().globalData.userInfo || {};
    const res = resolveApplication(id, false, { role: "admin_level_2", phone: u.phone, nickname: u.nickname });
    if (!res.ok) {
      wx.showToast({ title: res.message || "失败", icon: "none" });
      return;
    }
    wx.showToast({ title: "已驳回", icon: "none" });
    this.onShow();
  }
});
