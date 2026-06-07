const { getAllPendingForUI } = require("../../../utils/onboardingStore");
const { getAllPendingForL1 } = require("../../../utils/hoursReviewStore");
const { mergeFromStorageIntoApp } = require("../../../utils/userProfileStore");
const { checkOnboardingOrRedirect } = require("../../../utils/onboardingGuard");
const { to } = require("../../../utils/nav");
const { adminApi, dashboardApi } = require("../../../utils/api");

function pageTotal(payload) { if (payload && payload.total != null) return Number(payload.total) || 0; if (payload && Array.isArray(payload.records)) return payload.records.length; if (payload && Array.isArray(payload.list)) return payload.list.length; return Array.isArray(payload) ? payload.length : 0; }
function safe(p) { return p.catch(() => null); }
function buildStatRow(title, value, hint) { return { title, value: String(value != null ? value : 0), hint: hint || "" }; }

Page({
  data: { stats: { volunteerCount: 0, studentCount: 0, pairCount: 0, pendingAlerts: 0, totalServiceHours: 0 }, cStudent: 0, cTeacher: 0, cL1: 0, cL2: 0, cHours: 0, cRisk: 0, dashboardRows: [], statRows: [] },
  onShow() {
    checkOnboardingOrRedirect("pages/admin/platform/index");
    mergeFromStorageIntoApp();
    try { const t = this.selectComponent("#custom-tab-bar"); if (t && typeof t.sync === "function") t.sync(); } catch (e) {}
    const app = getApp(); const u = app.globalData.userInfo || {}; const token = (app.globalData && app.globalData.token) || wx.getStorageSync("token") || "";
    if (token) {
      this._setLocalCounts(u);
      Promise.all([
        safe(adminApi.users({ role: 3, page: 1, size: 1 })),
        safe(adminApi.users({ role: 2, page: 1, size: 1 })),
        safe(adminApi.users({ role: 1, page: 1, size: 1 })),
        safe(adminApi.users({ role: 0, page: 1, size: 1 })),
        safe(adminApi.pendingStudents({ page: 1, size: 1 })),
        safe(adminApi.pendingTeachers({ page: 1, size: 1 })),
        safe(adminApi.pendingVolunteerRecords({ page: 1, size: 1 })),
        safe(dashboardApi.overview()),
        safe(dashboardApi.regionDistribution()),
        safe(dashboardApi.subjectDistribution()),
        safe(dashboardApi.matchSuccessRate({})),
      ]).then(([students, teachers, l2s, l1s, pStudents, pTeachers, hours, overview, region, subject, matchRate]) => {
        const next = { ...this.data.stats };
        if (students) next.studentCount = pageTotal(students);
        if (teachers) next.volunteerCount = pageTotal(teachers);
        if (overview && overview.matchedPairs != null) next.pairCount = overview.matchedPairs;
        if (overview && overview.totalServiceHours != null) next.totalServiceHours = Math.round(overview.totalServiceHours / 60 * 10) / 10;
        const patch = { stats: next, dashboardRows: [] };
        patch.cStudent = pStudents ? pageTotal(pStudents) : (students ? pageTotal(students) : 0);
        patch.cTeacher = pTeachers ? pageTotal(pTeachers) : (teachers ? pageTotal(teachers) : 0);
        patch.cL2 = l2s ? pageTotal(l2s) : 0;
        patch.cL1 = l1s ? pageTotal(l1s) : 0;
        if (hours) patch.cHours = pageTotal(hours);
        const rows = [];
        if (region && Array.isArray(region)) rows.push(buildStatRow("区域分布", region.length, "后端统计"));
        if (subject && Array.isArray(subject)) rows.push(buildStatRow("科目分布", subject.length, "后端统计"));
        if (matchRate && Array.isArray(matchRate)) rows.push(buildStatRow("匹配成功率", matchRate.length, "后端统计"));
        if (pStudents) rows.push(buildStatRow("待审学生", pageTotal(pStudents), "待处理"));
        if (pTeachers) rows.push(buildStatRow("待审教师", pageTotal(pTeachers), "待处理"));
        patch.dashboardRows = rows;
        patch.statRows = [
          buildStatRow("学员总数", next.studentCount),
          buildStatRow("志愿者总数", next.volunteerCount),
          buildStatRow("结对总数", next.pairCount),
          buildStatRow("平台告警", next.pendingAlerts)
        ];
        this.setData(patch);
      });
      return;
    }
    this._setLocalCounts(u);
  },
  _setLocalCounts(u) { const pending = getAllPendingForUI("admin_level_1", u.phone) || []; const by = (r) => pending.filter((a) => a.role === r).length; const h = (getAllPendingForL1() || []).length; this.setData({ cStudent: by("student"), cTeacher: by("teacher"), cL1: by("admin_level_1"), cL2: by("admin_level_2"), cHours: h, statRows: [buildStatRow("待审学生", by("student")), buildStatRow("待审志愿者", by("teacher")), buildStatRow("待审二级管理员", by("admin_level_2")), buildStatRow("待审时长", h)] }); },
  onPullDownRefresh() { this.onShow(); wx.stopPullDownRefresh(); },
  goReviewStudent() { to("/pages/admin/platform/review/index", { role: "student" }); },
  goReviewTeacher() { to("/pages/admin/platform/review/index", { role: "teacher" }); },
  goReviewL2() { to("/pages/admin/platform/review/index", { role: "admin_level_2" }); },
  goReviewL1() { to("/pages/admin/platform/review/index", { role: "admin_level_1" }); },
  goHours() { to("/pages/admin/platform/hours/index"); },
  goSecondaryAdmins() { to("/pages/admin/secondary-admins/index"); },
  goSchools() { to("/pages/admin/schools/index"); }
});
