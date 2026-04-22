const { getApplicationById } = require("../../../utils/onboardingStore");
const { getHoursRequestById } = require("../../../utils/hoursReviewStore");
const { buildOnboardingRows, buildHoursRows } = require("../../../utils/reviewDetailRows");
const { canViewOnboardingSubmission, canViewHoursSubmission } = require("../../../utils/reviewAccess");
const { mergeFromStorageIntoApp } = require("../../../utils/userProfileStore");
const { checkOnboardingOrRedirect } = require("../../../utils/onboardingGuard");

const PAGE = "pages/common/review-submission-detail/index";

Page({
  data: {
    type: "onboarding",
    pageTitle: "详情",
    rows: [],
    denied: false
  },
  onLoad(q) {
    this._id = (q && q.id) || "";
    this._type = (q && q.type) === "hours" ? "hours" : "onboarding";
  },
  onShow() {
    checkOnboardingOrRedirect(PAGE);
    this._load();
  },
  _load() {
    mergeFromStorageIntoApp();
    const app0 = getApp();
    const r = app0.globalData && app0.globalData.role;
    const u = (app0.globalData && app0.globalData.userInfo) || {};
    const phone = u.phone || "";
    if (r !== "admin_level_1" && r !== "admin_level_2") {
      this.setData({ denied: true, rows: [], pageTitle: "无权限" });
      return;
    }
    const id = this._id;
    if (!id) {
      this.setData({ denied: true, rows: [] });
      return;
    }
    if (this._type === "hours") {
      const row = getHoursRequestById(id);
      if (!row || !canViewHoursSubmission(r, phone, row)) {
        this.setData({ denied: true, rows: [] });
        wx.showToast({ title: "无权限或记录不存在", icon: "none" });
        return;
      }
      const { pageTitle, rows } = buildHoursRows(row);
      this.setData({
        type: "hours",
        pageTitle: pageTitle,
        rows: rows,
        denied: false
      });
      try {
        wx.setNavigationBarTitle({ title: "时长详情" });
      } catch (e) {
        // ignore
      }
      return;
    }
    const a = getApplicationById(id);
    if (!a || !canViewOnboardingSubmission(r, phone, a)) {
      this.setData({ denied: true, rows: [] });
      wx.showToast({ title: "无权限或记录不存在", icon: "none" });
      return;
    }
    const { pageTitle, rows } = buildOnboardingRows(a);
    this.setData({
      type: "onboarding",
      pageTitle: pageTitle,
      rows: rows,
      denied: false
    });
    try {
      wx.setNavigationBarTitle({ title: "申请信息" });
    } catch (e) {
      // ignore
    }
  }
});
