const { getAllPendingForUI } = require("../../../utils/onboardingStore");
const { getAllPendingForL1 } = require("../../../utils/hoursReviewStore");
const { mergeFromStorageIntoApp } = require("../../../utils/userProfileStore");
const { checkOnboardingOrRedirect } = require("../../../utils/onboardingGuard");
const { to } = require("../../../utils/nav");

const RISK_MOCK_LEN = 10;

Page({
  data: {
    stats: {
      volunteerCount: 328,
      studentCount: 612,
      pairCount: 198,
      pendingAlerts: 24
    },
    cStudent: 0,
    cTeacher: 0,
    cL1: 0,
    cL2: 0,
    cHours: 0,
    cRisk: RISK_MOCK_LEN
  },
  onShow() {
    checkOnboardingOrRedirect("pages/admin/platform/index");
    mergeFromStorageIntoApp();
    try {
      const t = this.selectComponent("#custom-tab-bar");
      if (t && typeof t.sync === "function") {
        t.sync();
      }
    } catch (e) {
      // 非本页无组件时忽略
    }
    const app = getApp();
    const u = app.globalData.userInfo || {};
    const pending = getAllPendingForUI("admin_level_1", u.phone) || [];
    const by = (r) => pending.filter((a) => a.role === r).length;
    const h = (getAllPendingForL1() || []).length;
    this.setData({
      cStudent: by("student"),
      cTeacher: by("teacher"),
      cL1: by("admin_level_1"),
      cL2: by("admin_level_2"),
      cHours: h
    });
  },
  onPullDownRefresh() {
    this.onShow();
    wx.stopPullDownRefresh();
  },
  goReviewStudent() {
    to("/pages/admin/platform/review/index", { role: "student" });
  },
  goReviewTeacher() {
    to("/pages/admin/platform/review/index", { role: "teacher" });
  },
  goReviewL2() {
    to("/pages/admin/platform/review/index", { role: "admin_level_2" });
  },
  goReviewL1() {
    to("/pages/admin/platform/review/index", { role: "admin_level_1" });
  },
  goHours() {
    to("/pages/admin/platform/hours/index");
  },
  goRisk() {
    to("/pages/admin/platform/risk/index");
  }
});
