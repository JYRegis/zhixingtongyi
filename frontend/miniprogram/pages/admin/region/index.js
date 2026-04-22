const { getApplicationsForL2, resolveApplication } = require("../../../utils/onboardingStore");
const { mergeFromStorageIntoApp, getByPhone } = require("../../../utils/userProfileStore");
const { checkOnboardingOrRedirect } = require("../../../utils/onboardingGuard");
const {
  getRecipientStudentRegList,
  getRecipientHoursList,
  getVolunteerRegList
} = require("../../../utils/regionL2Display");

Page({
  data: {
    l2Scope: "",
    hasScope: false,
    regionName: "—",
    volunteerReviewList: [],
    /** 受援方 hub：待审条数 */
    studentRegCount: 0,
    hoursCount: 0,
    noScopeTitle: "请等待平台分配"
  },
  onShow() {
    checkOnboardingOrRedirect("pages/admin/region/index");
    mergeFromStorageIntoApp();
    const u = (getApp().globalData && getApp().globalData.userInfo) || {};
    const p = getByPhone(u.phone) || u;
    const scope = p.l2Scope || "";
    const hasScope = scope === "volunteer_side" || scope === "recipient_side";
    const regionName = hasScope
      ? scope === "volunteer_side"
        ? "支教方"
        : "受援方"
      : "未分配";
    const phone = u.phone;
    let volList = [];
    let stuC = 0;
    let hC = 0;
    if (hasScope && scope === "volunteer_side" && phone) {
      volList = getVolunteerRegList(String(phone));
    } else if (hasScope && scope === "recipient_side" && phone) {
      stuC = getRecipientStudentRegList(String(phone)).length;
      hC = getRecipientHoursList(String(phone)).length;
    }
    this.setData({
      l2Scope: scope,
      hasScope,
      regionName,
      noScopeTitle: "请等待平台分配",
      volunteerReviewList: volList,
      studentRegCount: stuC,
      hoursCount: hC
    });
  },
  onPullDownRefresh() {
    this.onShow();
    wx.stopPullDownRefresh();
  },
  toRegionStudents() {
    wx.navigateTo({ url: "/pages/admin/region-students/index" });
  },
  toRegionHours() {
    wx.navigateTo({ url: "/pages/admin/region-hours/index" });
  },
  onViewOnboarding(e) {
    const id = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id;
    if (!id) {
      return;
    }
    wx.navigateTo({ url: "/pages/common/review-submission-detail/index?type=onboarding&id=" + encodeURIComponent(String(id)) });
  },
  onCreateAccount() {
    if (!this.data.hasScope || this.data.l2Scope !== "recipient_side") {
      wx.showToast({ title: "受援方老师可管学生注册", icon: "none" });
      return;
    }
    wx.showToast({ title: "已记录（Mock）", icon: "success" });
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
