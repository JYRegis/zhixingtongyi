const { mergeFromStorageIntoApp } = require("../../../utils/userProfileStore");
const { checkOnboardingOrRedirect } = require("../../../utils/onboardingGuard");
const { adminApi } = require("../../../utils/api");

const PAGE_PATH = "pages/admin/region/index";

function hasPermission(perms, key) {
  if (!Array.isArray(perms)) return false;
  return perms.indexOf(key) >= 0 || perms.indexOf("*") >= 0;
}

Page({
  data: {
    regionName: "区域管理",
    studentRegCount: 0,
    hoursCount: 0,
    teacherRegCount: 0,
    canStudentManage: false,
    canVolunteerRecordAudit: false,
    canTeacherAudit: false,
    loading: false
  },
  onShow() {
    checkOnboardingOrRedirect(PAGE_PATH);
    this.refresh();
  },
  refresh() {
    mergeFromStorageIntoApp();
    const app = getApp();
    const u = (app.globalData && app.globalData.userInfo) || {};
    const perms = Array.isArray(u.permissions) ? u.permissions : [];
    const canStudentManage = hasPermission(perms, "student_manage");
    const canVolunteerRecordAudit = hasPermission(perms, "volunteer_record_audit");
    const canTeacherAudit = hasPermission(perms, "teacher_audit");
    this.setData({ canStudentManage, canVolunteerRecordAudit, canTeacherAudit });

    const token = (app.globalData && app.globalData.token) || wx.getStorageSync("token") || "";
    if (!token) return;
    this.setData({ loading: true });
    const tasks = [];
    tasks.push(canStudentManage ? adminApi.pendingStudents({ page: 1, size: 50 }).catch(() => null) : Promise.resolve(null));
    tasks.push(canVolunteerRecordAudit ? adminApi.pendingVolunteerRecords({ page: 1, size: 50 }).catch(() => null) : Promise.resolve(null));
    tasks.push(canTeacherAudit ? adminApi.pendingTeachers({ page: 1, size: 50 }).catch(() => null) : Promise.resolve(null));
    Promise.all(tasks).then(([students, hours, teachers]) => {
      const sList = students && (students.records || students.list) || (Array.isArray(students) ? students : []);
      const hList = hours && (hours.records || hours.list) || (Array.isArray(hours) ? hours : []);
      const tList = teachers && (teachers.records || teachers.list) || (Array.isArray(teachers) ? teachers : []);
      this.setData({
        studentRegCount: sList.length || 0,
        hoursCount: hList.length || 0,
        teacherRegCount: tList.length || 0,
        loading: false
      });
    }).catch(() => this.setData({ loading: false }));
  },
  onPullDownRefresh() { this.refresh(); wx.stopPullDownRefresh(); },
  toRegionStudents() { wx.navigateTo({ url: "/pages/admin/region-students/index" }); },
  toRegionHours() { wx.navigateTo({ url: "/pages/admin/region-hours/index" }); },
  toRegionTeachers() { wx.navigateTo({ url: "/pages/admin/region-teachers/index" }); }
});
