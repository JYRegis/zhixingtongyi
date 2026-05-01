const { getSchoolName, getSchoolsByKind } = require("../../../utils/schoolsMock");
const { matchGradeToPicker } = require("../../../utils/gradeOptions");
const { matchClassTimeToForm, serializeTimeSelection, isValidTimeSelection } = require("../../../utils/classTimeOptions");
const { submitApplication, getApplications } = require("../../../utils/onboardingStore");
const { getByPhone, saveProfile, mergeFromStorageIntoApp } = require("../../../utils/userProfileStore");
const { checkOnboardingOrRedirect } = require("../../../utils/onboardingGuard");
const { USE_BACKEND_ONBOARDING } = require("../../../config/demoBackend");
const { studentApi, teacherApi } = require("../../../utils/api");
const { buildStudentProfileRequest, buildTeacherProfileRequest } = require("../../../utils/dtoMappers");

const ROLE_TITLES = {
  student: "乡村学员入驻",
  teacher: "支教志愿者入驻",
  admin_level_2: "学校老师入驻",
  admin_level_1: "平台运营入驻"
};

/** 下拉 `range` 仅含真实项时，未选仍用 0 作为 `picker` 的 `value`；显示文案另用 hasSchool 等覆盖 */
function indexInSchoolList(schoolId, list) {
  if (!schoolId) {
    return 0;
  }
  const j = (list || []).findIndex((s) => s.id == schoolId);
  return j >= 0 ? j : 0;
}

function indexInGradeList(mg) {
  if (!mg || mg.index == null || mg.index < 0) {
    return 0;
  }
  return mg.index;
}

function toggleInNum(arr, n) {
  const a = (arr || []).slice();
  const ix = a.indexOf(n);
  if (ix >= 0) {
    a.splice(ix, 1);
  } else {
    a.push(n);
  }
  return a.sort((x, y) => x - y);
}

function toggleInStr(arr, s) {
  const a = (arr || []).slice();
  const ix = a.indexOf(s);
  if (ix >= 0) {
    a.splice(ix, 1);
  } else {
    a.push(s);
  }
  return a;
}

Page({
  data: {
    role: "",
    name: "",
    studentNo: "",
    workNo: "",
    schoolList: [],
    schoolId: "",
    schoolName: "",
    schoolPickerValue: 0,
    hasSchool: false,
    grade: "",
    gradeList: [],
    gradePickerValue: 0,
    weekChips: [],
    slotChips: [],
    weekIds: [],
    slotIds: [],
    studentAvailableTime: "",
    availableTimeHint: "",
    l2Note: "",
    orgNote: "",
    applyNote: "",
    onboardingStatus: "none",
    showForm: true,
    showSchool: false,
    headerTitle: "",
    rejectNote: "",
    /** 志愿者：可授课时间；学校老师：方便联系/办公时间 */
    timeBlockTitle: ""
  },
  onLoad(query) {
    const app = getApp();
    const r = (query && query.role) || (app && app.globalData && app.globalData.role) || "";
    if (!r) {
      wx.showToast({ title: "请先选择角色", icon: "none" });
      setTimeout(() => {
        wx.redirectTo({ url: "/pages/common/role-select/index" });
      }, 400);
      return;
    }
    this.setData({
      role: r,
      headerTitle: ROLE_TITLES[r] || "身份入驻"
    });
  },
  onShow() {
    checkOnboardingOrRedirect("pages/common/onboarding-apply/index");
    this.syncFromUser();
  },
  syncFromUser() {
    mergeFromStorageIntoApp();
    const app = getApp();
    const u = app.globalData.userInfo || {};
    if (!u.phone) {
      return;
    }
    const phone = String(u.phone);
    const p = getByPhone(phone) || u;
    const st = p.onboardingStatus != null && p.onboardingStatus !== "" ? p.onboardingStatus : "none";
    if (st === "approved") {
      this.setData({
        onboardingStatus: "approved",
        showForm: false
      });
      return;
    }
    const role = this.data.role;
    const apps = getApplications().filter((a) => a.applicantId === phone);
    let rejectNote = "";
    for (let i = 0; i < apps.length; i += 1) {
      if (apps[i].status === "rejected" && (apps[i].rejectNote || apps[i].extra)) {
        rejectNote = apps[i].rejectNote || "";
        break;
      }
    }
    const name =
      (p.name && String(p.name).trim()) || (u.nickName && String(u.nickName).trim()) || (u.nickname && String(u.nickname).trim()) || "";
    const studentNo = (p.studentNo != null && p.studentNo !== "" ? String(p.studentNo) : "") || "";
    const workNo = (p.workNo != null && p.workNo !== "" ? String(p.workNo) : "") || "";

    let schoolList = [];
    let showSchool = role === "student" || role === "teacher" || role === "admin_level_2";
    if (role === "student") {
      schoolList = getSchoolsByKind("recipient");
    } else if (role === "teacher") {
      schoolList = getSchoolsByKind("support");
    } else if (role === "admin_level_2") {
      schoolList = getSchoolsByKind();
    }
    let schoolId = p.schoolId || u.schoolId || "";
    let schoolName = "";
    if (schoolId) {
      const hit = (schoolList || []).find((s) => s.id === schoolId);
      schoolName = hit ? hit.name : getSchoolName(schoolId);
    }
    const schoolPickerValue = indexInSchoolList(schoolId, schoolList);
    const hasSchool = !!schoolId;

    let grade = "";
    let gradeList = [];
    let gradePickerValue = 0;
    if (role === "student") {
      const mg = matchGradeToPicker(p.grade);
      grade = mg.label;
      gradeList = mg.list;
      gradePickerValue = indexInGradeList(mg);
    } else {
      gradeList = [];
    }

    let weekChips = [];
    let slotChips = [];
    let weekIds = [];
    let slotIds = [];
    let studentTimeStr = p.studentAvailableTime != null && p.studentAvailableTime !== "" ? p.studentAvailableTime : "";
    let teachTimeStr = p.availableTime != null && p.availableTime !== "" ? p.availableTime : "";
    if (role === "student") {
      const tm = matchClassTimeToForm(studentTimeStr);
      weekChips = tm.weekChips;
      slotChips = tm.slotChips;
      weekIds = tm.weekIds;
      slotIds = tm.slotIds;
      studentTimeStr = tm.composed;
    } else if (role === "teacher" || role === "admin_level_2") {
      const tm = matchClassTimeToForm(teachTimeStr);
      weekChips = tm.weekChips;
      slotChips = tm.slotChips;
      weekIds = tm.weekIds;
      slotIds = tm.slotIds;
      teachTimeStr = tm.composed;
    }

    const timeBlockTitle =
      role === "admin_level_2" ? "方便联系/办公时间" : role === "teacher" ? "可授课时间" : "";

    this.setData({
      onboardingStatus: st,
      showForm: st === "none" || st === "rejected",
      showSchool,
      schoolList,
      schoolId,
      schoolName,
      schoolPickerValue,
      hasSchool,
      name,
      studentNo,
      workNo,
      rejectNote: rejectNote || p.rejectNote || "",
      grade,
      gradeList,
      gradePickerValue,
      weekChips,
      slotChips,
      weekIds,
      slotIds,
      studentAvailableTime: role === "student" ? studentTimeStr : "",
      availableTimeHint: role === "teacher" || role === "admin_level_2" ? teachTimeStr : "",
      timeBlockTitle: timeBlockTitle,
      l2Note: p.l2Note || "",
      orgNote: p.organization || p.orgNote || ""
    });
  },
  onBackWorkbench() {
    wx.switchTab({ url: "/pages/common/workbench/index" });
  },
  onPickSchool(e) {
    const ix = Number(e.detail.value);
    const { schoolList, role } = this.data;
    const one = (schoolList || [])[ix];
    if (!one) {
      return;
    }
    this.setData({
      schoolId: one.id,
      schoolName: one.name || getSchoolName(one.id),
      schoolPickerValue: ix,
      hasSchool: !!one.id
    });
  },
  onPickGrade(e) {
    const ix = Number(e.detail.value);
    const { gradeList } = this.data;
    const g = (gradeList || [])[ix];
    if (!g) {
      return;
    }
    this.setData({
      grade: g.id ? g.name : "",
      gradePickerValue: ix
    });
  },
  onToggleWeek(e) {
    const id = +((e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id) || 0);
    if (id < 1 || id > 7) {
      return;
    }
    const { weekIds, slotIds, role } = this.data;
    const nextW = toggleInNum(weekIds, id);
    const t = serializeTimeSelection(nextW, slotIds);
    const tm = matchClassTimeToForm(t);
    if (role === "student") {
      this.setData({
        weekIds: nextW,
        weekChips: tm.weekChips,
        studentAvailableTime: t
      });
    } else if (role === "teacher" || role === "admin_level_2") {
      this.setData({
        weekIds: nextW,
        weekChips: tm.weekChips,
        availableTimeHint: t
      });
    }
  },
  onToggleSlot(e) {
    const id = (e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id) || "";
    if (!id || ["mor", "noon", "night"].indexOf(id) < 0) {
      return;
    }
    const { weekIds, slotIds, role } = this.data;
    const nextS = toggleInStr(slotIds, id);
    const t = serializeTimeSelection(weekIds, nextS);
    const tm = matchClassTimeToForm(t);
    if (role === "student") {
      this.setData({
        slotIds: nextS,
        slotChips: tm.slotChips,
        studentAvailableTime: t
      });
    } else if (role === "teacher" || role === "admin_level_2") {
      this.setData({
        slotIds: nextS,
        slotChips: tm.slotChips,
        availableTimeHint: t
      });
    }
  },
  onText(e) {
    const k = e.currentTarget.dataset.k;
    if (!k) {
      return;
    }
    const v = e.detail.value || "";
    this.setData({ [k]: v });
  },
  onSubmit() {
    const app = getApp();
    const u = app.globalData.userInfo;
    if (!u || !u.phone) {
      wx.showToast({ title: "请先登录", icon: "none" });
      return;
    }
    const phone = String(u.phone);
    const {
      role,
      schoolId,
      name,
      studentNo,
      workNo,
      applyNote,
      grade,
      weekIds,
      slotIds,
      l2Note,
      orgNote
    } = this.data;
    const tStudent = role === "student" ? serializeTimeSelection(weekIds, slotIds) : "";
    const tTeacher = role === "teacher" || role === "admin_level_2" ? serializeTimeSelection(weekIds, slotIds) : "";
    if ((role === "student" || role === "teacher" || role === "admin_level_2") && !String(name).trim()) {
      wx.showToast({ title: "请填写真实姓名", icon: "none" });
      return;
    }
    if (role === "student" && !String(studentNo).trim()) {
      wx.showToast({ title: "请填写学号", icon: "none" });
      return;
    }
    if (role === "teacher" && !String(workNo).trim()) {
      wx.showToast({ title: "请填写学工号", icon: "none" });
      return;
    }
    if (role === "admin_level_2" && !String(workNo).trim()) {
      wx.showToast({ title: "请填写学工号或工号", icon: "none" });
      return;
    }
    if (role === "student" && !schoolId) {
      wx.showToast({ title: "请选择学校", icon: "none" });
      return;
    }
    if (role === "teacher" && !schoolId) {
      wx.showToast({ title: "请选择学校", icon: "none" });
      return;
    }
    if (role === "admin_level_2" && !schoolId) {
      wx.showToast({ title: "请选择学校", icon: "none" });
      return;
    }
    if (role === "student" && !String(grade).trim()) {
      wx.showToast({ title: "请选择年级", icon: "none" });
      return;
    }
    if (role === "student" && !isValidTimeSelection(weekIds, slotIds)) {
      wx.showToast({ title: "请至少选择一天与一个时段", icon: "none" });
      return;
    }
    if (role === "teacher" && !isValidTimeSelection(weekIds, slotIds)) {
      wx.showToast({ title: "请至少选择一天与可授课时段", icon: "none" });
      return;
    }
    if (role === "admin_level_2" && !isValidTimeSelection(weekIds, slotIds)) {
      wx.showToast({ title: "请至少选择一天与可联系时段", icon: "none" });
      return;
    }
    const extra = {
      name: String(name || "").trim(),
      studentNo: String(studentNo || "").trim(),
      workNo: String(workNo || "").trim(),
      applyNote: String(applyNote || "").trim(),
      grade: String(grade || "").trim(),
      studentAvailableTime: String(tStudent || "").trim(),
      availableTime: String(tTeacher || "").trim(),
      l2Note: String(l2Note || "").trim(),
      orgNote: String(orgNote || "").trim()
    };
    const token = (app.globalData && app.globalData.token) || wx.getStorageSync("token") || "";
    const tryRemote = USE_BACKEND_ONBOARDING && token && (role === "student" || role === "teacher");
    if (tryRemote) {
      const self = this;
      const payload = {
        realName: extra.name,
        schoolId,
        grade: extra.grade,
        weekIds,
        slotIds,
        personalityDesc: (extra.applyNote || extra.l2Note || "").trim() || undefined
      };
      wx.showLoading({ title: "同步服务器", mask: true });
      this._syncProfileToBackend(role, payload)
        .then(function () {
          wx.hideLoading();
          self._afterOnboardingSubmitRemote(phone, role, schoolId, extra, u, orgNote);
        })
        .catch(function (err) {
          wx.hideLoading();
          const msg = (err && err.message) || "接口失败";
          wx.showModal({
            title: "后端保存失败",
            content: msg + "\n是否仍保存到本机演示数据？",
            confirmText: "本机保存",
            cancelText: "取消",
            success: function (res) {
              if (res.confirm) {
                self._afterOnboardingSubmitLocal(phone, role, schoolId, extra, u, orgNote);
              }
            }
          });
        });
      return;
    }
    this._afterOnboardingSubmitLocal(phone, role, schoolId, extra, u, orgNote);
  },
  _syncProfileToBackend(role, payload) {
    if (role === "student") {
      const body = buildStudentProfileRequest(payload, {});
      return studentApi
        .getProfile()
        .then(
          function (vo) {
            if (vo && (vo.id != null || vo.userId != null)) {
              return studentApi.updateProfile(body);
            }
            return studentApi.createProfile(body);
          },
          function (err) {
            if (err && err.statusCode === 404) {
              return studentApi.createProfile(body);
            }
            return Promise.reject(err);
          }
        )
        .then(function () {
          return studentApi.submitProfile();
        });
    }
    if (role === "teacher") {
      const body = buildTeacherProfileRequest(payload, {});
      return teacherApi.getProfile().then(
        function (vo) {
          if (vo && (vo.id != null || vo.userId != null)) {
            return teacherApi.updateProfile(body);
          }
          return teacherApi.createProfile(body);
        },
        function (err) {
          if (err && err.statusCode === 404) {
            return teacherApi.createProfile(body);
          }
          return Promise.reject(err);
        }
      );
    }
    return Promise.resolve();
  },
  _afterOnboardingSubmitRemote(phone, role, schoolId, extra, u, orgNote) {
    const patch = {
      name: extra.name,
      studentNo: extra.studentNo,
      workNo: extra.workNo,
      schoolId,
      school: schoolId ? getSchoolName(schoolId) : u.school,
      grade: extra.grade,
      studentAvailableTime: extra.studentAvailableTime,
      availableTime: extra.availableTime,
      l2Note: extra.l2Note,
      organization: extra.orgNote || orgNote,
      applicationNote: extra.applyNote,
      onboardingStatus: "approved"
    };
    Object.keys(patch).forEach((key) => {
      if (patch[key] === "" || patch[key] == null) {
        delete patch[key];
      }
    });
    saveProfile(phone, patch);
    wx.showToast({ title: "已同步", icon: "success" });
    setTimeout(() => {
      wx.reLaunch({ url: "/pages/common/workbench/index" });
    }, 500);
  },
  _afterOnboardingSubmitLocal(phone, role, schoolId, extra, u, orgNote) {
    const r = submitApplication({ applicantId: phone, role, schoolId, extra });
    if (!r || !r.ok) {
      wx.showToast({ title: (r && r.message) || "提交失败", icon: "none" });
      return;
    }
    if (role === "admin_level_1") {
      saveProfile(phone, {
        organization: orgNote,
        applicationNote: extra.applyNote
      });
    } else {
      const patch = {
        name: extra.name,
        studentNo: extra.studentNo,
        workNo: extra.workNo,
        schoolId,
        school: schoolId ? getSchoolName(schoolId) : u.school,
        grade: extra.grade,
        studentAvailableTime: extra.studentAvailableTime,
        availableTime: extra.availableTime,
        l2Note: extra.l2Note,
        organization: extra.orgNote,
        applicationNote: extra.applyNote
      };
      Object.keys(patch).forEach((key) => {
        if (patch[key] === "" || patch[key] == null) {
          delete patch[key];
        }
      });
      saveProfile(phone, patch);
    }
    wx.showToast({ title: "已提交", icon: "success" });
    setTimeout(() => {
      wx.reLaunch({ url: "/pages/common/workbench/index" });
    }, 500);
  }
});
