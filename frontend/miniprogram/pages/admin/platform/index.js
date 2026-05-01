const { getAllPendingForUI } = require("../../../utils/onboardingStore");
const { getAllPendingForL1 } = require("../../../utils/hoursReviewStore");
const { mergeFromStorageIntoApp } = require("../../../utils/userProfileStore");
const { checkOnboardingOrRedirect } = require("../../../utils/onboardingGuard");
const { to } = require("../../../utils/nav");
const { adminApi, dashboardApi } = require("../../../utils/api");

const RISK_MOCK_LEN = 10;

function pageTotal(payload) {
  if (payload && payload.total != null) {
    return Number(payload.total) || 0;
  }
  if (payload && Array.isArray(payload.records)) {
    return payload.records.length;
  }
  if (payload && Array.isArray(payload.list)) {
    return payload.list.length;
  }
  return Array.isArray(payload) ? payload.length : 0;
}

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
    const token = (app.globalData && app.globalData.token) || wx.getStorageSync("token") || "";
    if (token) {
      Promise.all([
        dashboardApi.overview(),
        adminApi.users({ role: 3, page: 1, size: 1 }),
        adminApi.users({ role: 2, page: 1, size: 1 }),
        adminApi.pendingVolunteerRecords({ page: 1, size: 1 })
      ])
        .then(([overview, students, teachers, hours]) => {
          this.setData({
            stats: {
              volunteerCount: pageTotal(teachers),
              studentCount: pageTotal(students),
              pairCount: overview && overview.matchedPairs != null ? overview.matchedPairs : this.data.stats.pairCount,
              pendingAlerts: overview && overview.totalServiceHours != null ? overview.totalServiceHours : this.data.stats.pendingAlerts
            },
            cStudent: pageTotal(students),
            cTeacher: pageTotal(teachers),
            cHours: pageTotal(hours)
          });
        })
        .catch(() => {
          this._setLocalCounts(u);
        });
      return;
    }
    this._setLocalCounts(u);
  },
  _setLocalCounts(u) {
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
