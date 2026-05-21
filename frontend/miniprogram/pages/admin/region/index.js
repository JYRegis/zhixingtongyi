const { mergeFromStorageIntoApp } = require("../../../utils/userProfileStore");
const { checkOnboardingOrRedirect } = require("../../../utils/onboardingGuard");
const { adminApi } = require("../../../utils/api");
const { fetchSchoolDetail, isVolunteerSchool } = require("../../../utils/schoolsMock");

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
    const hasTeacherAuditPerm = hasPermission(perms, "teacher_audit");
    // 志愿者审核仅支教方 L2（学校 type=1）可见
    const schoolId = u.schoolId || u.school_id || "";
    var isSupportSide = isVolunteerSchool(schoolId);
    var canTeacherAudit = false;
    if (isSupportSide === true) {
      canTeacherAudit = hasTeacherAuditPerm;
    } else if (isSupportSide === null && schoolId) {
      // 缓存未命中：异步拉学校详情后重新 refresh（用标志位防止无限循环）
      var self = this;
      this.setData({ canStudentManage, canVolunteerRecordAudit, canTeacherAudit: false, loading: true });
      if (this._schoolDetailFetched) {
        // 已经拉过一次仍命中不到，停止重试，按受援方处理
        this.setData({ loading: false });
        return;
      }
      this._schoolDetailFetched = true;
      fetchSchoolDetail(schoolId).then(function () {
        self.refresh();
      }).catch(function () {
        self.setData({ loading: false });
      });
      return;
    }
    // isSupportSide === false 或无 schoolId：受援方，canTeacherAudit 保持 false
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
