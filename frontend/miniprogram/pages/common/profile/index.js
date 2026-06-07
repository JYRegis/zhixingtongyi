const { SUBJECT_OPTIONS } = require('../../../utils/subjectOptions');
const { ROLE_DISPLAY_NAME } = require("../../../utils/roleLabels");
const {
  getByPhone,
  saveProfile,
  mergeFromStorageIntoApp,
} = require("../../../utils/userProfileStore");
const {
  getSchoolsByKind,
  getSchoolName,
} = require("../../../utils/schoolsMock");
const { matchGradeToPicker } = require("../../../utils/gradeOptions");
const {
  matchClassTimeToForm,
  parseTimeSelection,
  serializeTimeSelection,
  serializeTimeGrid,
  isValidTimeSelection,
} = require("../../../utils/classTimeOptions");
const { checkOnboardingOrRedirect } = require("../../../utils/onboardingGuard");
const {
  studentApi,
  teacherApi,
  authApi,
  adminApi,
} = require("../../../utils/api");
const {
  freeTimeMapsToSerializedString,
  weekIdsSlotIdsToFreeTimeMaps,
} = require("../../../utils/dtoMappers");

const roleFieldMap = {
  teacher: [
    "name",
    "workNo",
    "schoolId",
    "grade",
    "subjects",
    "personality",
    "availableTime",
  ],
  student: [
    "name",
    "studentNo",
    "schoolId",
    "grade",
    "studentAvailableTime",
    "subjects",
    "guardianContact",
  ],
  admin_level_2: ["name", "schoolId"],
  admin_level_1: ["name"],
};
const roleMetaMap = {
  teacher: { title: "资料与账号" },
  student: { title: "资料与账号" },
  admin_level_2: { title: "资料与账号" },
  admin_level_1: { title: "资料与账号" },
};
const sectionMetaMap = {
  basic: { title: "基本信息", desc: "" },
  ability: { title: "教学信息", desc: "" },
  learning: { title: "学习信息", desc: "" },
  region: { title: "区域", desc: "" },
  platform: { title: "平台", desc: "" },
};
const fieldMetaMap = {
  name: {
    label: "姓名",
    placeholder: "请输入姓名",
    type: "input",
    section: "basic",
    hint: "",
  },
  studentNo: {
    label: "学号",
    placeholder: "请填写学号",
    type: "input",
    section: "basic",
    hint: "",
  },
  workNo: {
    label: "学号/学工号",
    placeholder: "请填写学号或学工号",
    type: "input",
    section: "basic",
    hint: "",
  },
  school: {
    label: "学校",
    placeholder: "请输入学校",
    type: "input",
    section: "basic",
    hint: "",
  },
  studentAvailableTime: {
    label: "可在线/希望上课时间",
    placeholder: "",
    type: "input",
    section: "learning",
    hint: "",
  },
  grade: {
    label: "年级",
    placeholder: "请输入年级",
    type: "input",
    section: "basic",
    hint: "",
  },
  subjects: {
    label: "科目",
    placeholder: "如：数学、英语",
    type: "input",
    section: "ability",
    hint: "",
  },
  personality: {
    label: "性格描述",
    placeholder: "选填",
    type: "textarea",
    section: "ability",
    hint: "",
  },
  availableTime: {
    label: "可授课时间",
    placeholder: "",
    type: "input",
    section: "ability",
    hint: "",
  },
  guardianContact: {
    label: "监护人联系方式",
    placeholder: "选填",
    type: "input",
    section: "learning",
    hint: "",
  },
  learningGoal: {
    label: "学习目标",
    placeholder: "选填",
    type: "textarea",
    section: "learning",
    hint: "",
  },
  region: {
    label: "管辖区域",
    placeholder: "选填",
    type: "input",
    section: "region",
    hint: "",
  },
  managedStudents: {
    label: "代管学员",
    placeholder: "选填",
    type: "textarea",
    section: "region",
    hint: "",
  },
  organization: {
    label: "所属机构",
    placeholder: "选填",
    type: "input",
    section: "platform",
    hint: "",
  },
  permissionNote: {
    label: "备注",
    placeholder: "选填",
    type: "textarea",
    section: "platform",
    hint: "",
  },
};
const roleSectionOrderMap = {
  teacher: ["basic", "ability"],
  student: ["basic", "learning"],
  admin_level_2: ["basic", "region"],
  admin_level_1: ["basic"],
};
var _cachedRemoteSchools = null;
function buildSections(role, form) {
  let fieldKeys = roleFieldMap[role] || roleFieldMap.student;
  if (role === "admin_level_2" && form.l2Scope === "recipient_side")
    fieldKeys = fieldKeys.filter((k) => k !== "managedStudents");
  const visibleFields = fieldKeys;
  const grouped = {};
  visibleFields.forEach((key) => {
    if (key === "schoolId" && role === "teacher") {
      const allSchools = _cachedRemoteSchools || getSchoolsByKind("support");
      const range = allSchools.filter(function (s) {
        return s.type === 1 || s.kind === "support";
      });
      if (!range.length && allSchools.length) {
        range.push.apply(range, getSchoolsByKind("support"));
      }
      const sid = (form.schoolId && String(form.schoolId)) || "";
      const sectionKey = "basic";
      if (!grouped[sectionKey])
        grouped[sectionKey] = {
          key: sectionKey,
          title: sectionMetaMap[sectionKey].title,
          desc: sectionMetaMap[sectionKey].desc,
          fields: [],
        };
      const byIndex = sid ? range.findIndex((s) => String(s.id) === sid) : -1;
      const lineText = !sid
        ? ""
        : byIndex >= 0
          ? (range[byIndex] && range[byIndex].name) || ""
          : getSchoolName(sid) || "";
      grouped[sectionKey].fields.push({
        key: "schoolId",
        label: "学校",
        type: "readonly_text",
        lineText: lineText || "未分配",
        hasValue: !!sid,
        hint: "如需修改请联系管理员",
      });
      return;
    }
    if (key === "schoolId" && role === "admin_level_2") {
      const allSchools = _cachedRemoteSchools || getSchoolsByKind();
      const sid = (form.schoolId && String(form.schoolId)) || "";
      const sectionKey = "basic";
      if (!grouped[sectionKey])
        grouped[sectionKey] = {
          key: sectionKey,
          title: sectionMetaMap[sectionKey].title,
          desc: sectionMetaMap[sectionKey].desc,
          fields: [],
        };
      const school = sid
        ? allSchools.find(function (s) {
            return String(s.id) === sid;
          })
        : null;
      const lineText = school
        ? school.name
        : sid
          ? getSchoolName(sid)
          : "\u672a\u5206\u914d";
      grouped[sectionKey].fields.push({
        key: "schoolId",
        label: "\u7ba1\u8f96\u5b66\u6821",
        type: "readonly_text",
        lineText: lineText,
        hasValue: !!sid,
        hint: "\u7531\u4e00\u7ea7\u7ba1\u7406\u5458\u5206\u914d",
      });
      return;
    }
    if (key === "schoolId" && role === "student") {
      const allSchools = _cachedRemoteSchools || getSchoolsByKind("recipient");
      const range = allSchools.filter(function (s) {
        return s.type === 0 || s.kind === "recipient";
      });
      if (!range.length && allSchools.length) {
        range.push.apply(range, getSchoolsByKind("recipient"));
      }
      const sid = (form.schoolId && String(form.schoolId)) || "";
      const sectionKey = "basic";
      if (!grouped[sectionKey])
        grouped[sectionKey] = {
          key: sectionKey,
          title: sectionMetaMap[sectionKey].title,
          desc: sectionMetaMap[sectionKey].desc,
          fields: [],
        };
      const byIndex = sid ? range.findIndex((s) => s.id === sid) : -1;
      const lineText = !sid
        ? ""
        : byIndex >= 0
          ? (range[byIndex] && range[byIndex].name) || ""
          : getSchoolName(sid) || "";
      grouped[sectionKey].fields.push({
        key: "schoolId",
        label: "学校",
        type: "readonly_text",
        lineText: lineText || "未分配",
        hasValue: !!sid,
        hint: "如需修改请联系管理员",
      });
      return;
    }
    if (key === "grade" && role === "student") {
      const mg = matchGradeToPicker(form.grade);
      const gRange = mg.list;
      const gix = mg.index >= 0 ? mg.index : 0;
      const sectionKey = "basic";
      if (!grouped[sectionKey])
        grouped[sectionKey] = {
          key: sectionKey,
          title: sectionMetaMap[sectionKey].title,
          desc: sectionMetaMap[sectionKey].desc,
          fields: [],
        };
      const hasG = mg.index >= 0 && gRange[mg.index] && gRange[mg.index].id;
      const lineG = hasG && gRange[mg.index] ? gRange[mg.index].name : "";
      grouped[sectionKey].fields.push({
        key: "grade",
        label: "年级",
        type: "picker_grade",
        range: gRange,
        lineText: lineG,
        hasValue: !!hasG,
        pickerValue: gix,
        hint: "",
      });
      return;
    }
    if (key === "studentAvailableTime" && role === "student") {
      const tm = matchClassTimeToForm(form.studentAvailableTime);
      const sectionKey = "learning";
      if (!grouped[sectionKey])
        grouped[sectionKey] = {
          key: sectionKey,
          title: sectionMetaMap[sectionKey].title,
          desc: sectionMetaMap[sectionKey].desc,
          fields: [],
        };
      grouped[sectionKey].fields.push({
        key: "studentAvailableTime",
        label: "可在线/希望上课时间",
        type: "time_chips",
        tfield: "studentAvailableTime",
        weekChips: tm.weekChips,
        slotChips: tm.slotChips,
        cells: tm.cells,
        grid: tm.grid,
        colWeeks: [
          { id: 1, name: "一" },
          { id: 2, name: "二" },
          { id: 3, name: "三" },
          { id: 4, name: "四" },
          { id: 5, name: "五" },
          { id: 6, name: "六" },
          { id: 7, name: "日" }
        ],
        hint: "",
      });
      return;
    }
    if (key === "availableTime" && role === "teacher") {
      const tm = matchClassTimeToForm(form.availableTime);
      const sectionKey = "ability";
      if (!grouped[sectionKey])
        grouped[sectionKey] = {
          key: sectionKey,
          title: sectionMetaMap[sectionKey].title,
          desc: sectionMetaMap[sectionKey].desc,
          fields: [],
        };
      grouped[sectionKey].fields.push({
        key: "availableTime",
        label: "可授课时间",
        type: "time_chips",
        tfield: "availableTime",
        weekChips: tm.weekChips,
        slotChips: tm.slotChips,
        cells: tm.cells,
        grid: tm.grid,
        colWeeks: [
          { id: 1, name: "一" },
          { id: 2, name: "二" },
          { id: 3, name: "三" },
          { id: 4, name: "四" },
          { id: 5, name: "五" },
          { id: 6, name: "六" },
          { id: 7, name: "日" }
        ],
        hint: "",
      });
      return;
    }
    if (key === "subjects") {
      const sectionKey = role === "student" ? "learning" : "ability";
      if (!grouped[sectionKey])
        grouped[sectionKey] = {
          key: sectionKey,
          title: sectionMetaMap[sectionKey].title,
          desc: sectionMetaMap[sectionKey].desc,
          fields: [],
        };
      const subjects = form.subjects || "";
      const selectedSubjects = subjects.split(/[,，、\s]+/).filter(Boolean);
      const subjectOpts = SUBJECT_OPTIONS.map(opt => ({
        ...opt,
        selected: selectedSubjects.indexOf(opt.name) >= 0
      }));
      grouped[sectionKey].fields.push({
        key: "subjects",
        label: "科目",
        type: "subjects_chips",
        options: subjectOpts,
        value: subjects,
        hint: "",
      });
      return;
    }
    const meta = fieldMetaMap[key];
    if (!meta) return;
    const sectionKey = meta.section;
    if (!grouped[sectionKey])
      grouped[sectionKey] = {
        key: sectionKey,
        title: sectionMetaMap[sectionKey].title,
        desc: sectionMetaMap[sectionKey].desc,
        fields: [],
      };
    grouped[sectionKey].fields.push({
      key,
      label: meta.label,
      placeholder: meta.placeholder,
      type: meta.type,
      hint: meta.hint,
      value: form[key] != null && form[key] !== undefined ? form[key] : "",
    });
  });
  return (roleSectionOrderMap[role] || ["basic"])
    .map((key) => grouped[key])
    .filter(Boolean);
}
function isFilledKey(key, form) {
  if (key === "schoolId")
    return !!(
      (form.schoolId && String(form.schoolId).trim()) ||
      (form.school && String(form.school).trim())
    );
  if (key === "grade") {
    const g = (form.grade && String(form.grade).trim()) || "";
    return g.length > 0 && g !== "请选择年级";
  }
  if (key === "studentAvailableTime") {
    const p = parseTimeSelection((form && form.studentAvailableTime) || "");
    return isValidTimeSelection(p.weekIds, p.slotIds);
  }
  if (key === "availableTime") {
    const p = parseTimeSelection((form && form.availableTime) || "");
    return isValidTimeSelection(p.weekIds, p.slotIds);
  }
  const v = form[key];
  if (v == null) return false;
  return String(v).trim().length > 0;
}

Page({
  data: {
    role: "",
    roleLabel: "",
    accAvatarUrl: "",
    accAvatarChar: "用",
    accNickname: "",
    accPhoneDisplay: "—",
    visibleFields: [],
    heroTitle: "",
    sections: [],
    form: {
      name: "",
      studentNo: "",
      l2Scope: "",
      workNo: "",
      school: "",
      schoolId: "",
      grade: "",
      studentAvailableTime: "",
      subjects: "",
      personality: "",
      availableTime: "",
      guardianContact: "",
      learningGoal: "",
      region: "",
      managedStudents: "",
      organization: "",
      permissionNote: "",
    },
  },
  onLoad() {
    this.syncPage();
  },
  async onShow() {
    checkOnboardingOrRedirect("pages/common/profile/index");
    mergeFromStorageIntoApp();
    this.syncPage();
    await this.trySyncProfileFromBackend();
  },
  onEditAccount() {
    const app = getApp();
    const r = (
      this.data.role ||
      (app.globalData && app.globalData.role) ||
      ""
    ).trim();
    const u = (app.globalData && app.globalData.userInfo) || {};
    if (!r || !u.phone) {
      wx.navigateTo({
        url: `/pages/common/auth/index?role=${encodeURIComponent(r || "")}&flow=register&prefill=1&returnTo=profile`,
      });
      return;
    }
    wx.showToast({ title: "点击头像/昵称/手机直接修改", icon: "none" });
  },
  async onAccChooseAvatar(e) {
    const url =
      e && e.detail && e.detail.avatarUrl
        ? String(e.detail.avatarUrl).trim()
        : "";
    if (!url) {
      wx.showToast({ title: "头像获取失败", icon: "none" });
      return;
    }
    // 上传头像到 OSS，再用 OSS URL 更新后端
    const { uploadFiles } = require("../../../utils/ossUpload");
    try {
      wx.showLoading({ title: "上传中", mask: true });
      const urls = await uploadFiles({
        businessType: "AVATAR",
        filePaths: [url],
      });
      wx.hideLoading();
      if (urls && urls.length) {
        await this._persistAccount({ avatarUrl: urls[0] }, "头像已更新");
      }
    } catch (err) {
      wx.hideLoading();
      if (err && err.message === "用户取消") return;
      wx.showToast({
        title: (err && err.message) || "头像上传失败",
        icon: "none",
      });
    }
  },
  onNicknameInlineInput(e) {
    const value = (e.detail.value || "").trim();
    this.setData({ accNickname: value });
  },
  onNicknameInlineBlur(e) {
    const value = (e.detail.value || "").trim();
    if (!value) return;
    if (value.length > 20) {
      wx.showToast({ title: "昵称最多 20 个字", icon: "none" });
      return;
    }
    this._persistAccount({ nickname: value }, "");
  },
  onEditNickname() {
    /* 保留兼容，不再使用弹窗 */
  },
  onEditPhone() {
    const current =
      this.data.accPhoneDisplay && this.data.accPhoneDisplay !== "未填写手机号"
        ? ""
        : "";
    wx.showModal({
      title: "修改手机号",
      editable: true,
      placeholderText: "请输入新手机号",
      content: current,
      success: async (res) => {
        if (!res.confirm) return;
        const v = (res.content || "").trim();
        if (!v) {
          wx.showToast({ title: "手机号不能为空", icon: "none" });
          return;
        }
        if (!/^1\d{10}$/.test(v)) {
          wx.showToast({ title: "手机号格式错误", icon: "none" });
          return;
        }
        try {
          await authApi.updateProfile({ phone: v });
          const app = getApp();
          const u = (app.globalData && app.globalData.userInfo) || {};
          app.setLogin(this.data.role || app.globalData.role, {
            ...u,
            phone: v,
          });
          this.syncPage();
          wx.showToast({ title: "手机号已更新", icon: "success" });
        } catch (err) {
          wx.showToast({
            title: (err && err.message) || "修改失败",
            icon: "none",
          });
        }
      },
    });
  },
  async _persistAccount(partial, okTitle) {
    const app = getApp();
    const u = (app.globalData && app.globalData.userInfo) || {};
    const nextNick =
      partial.nickname != null ? partial.nickname : u.nickname || "";
    const nextAvatar =
      partial.avatarUrl != null
        ? partial.avatarUrl
        : u.avatarUrl || u.avatar || "";
    // 调用后端 PUT /auth/me 持久化
    try {
      await authApi.updateProfile({ username: nextNick, avatar: nextAvatar });
    } catch (err) {
      wx.showToast({ title: (err && err.message) || "保存失败", icon: "none" });
      return;
    }
    // 只更新昵称/头像，不覆盖其他字段
    u.nickname = nextNick;
    u.avatarUrl = nextAvatar;
    app.globalData.userInfo = u;
    wx.setStorageSync("userInfo", u);
    // 同步到 userProfileStore，避免 mergeFromStorageIntoApp 用旧数据覆盖
    const { saveProfile } = require("../../../utils/userProfileStore");
    const profileKey = u.phone || u.backendUserId || u.id || u.userId || "";
    if (profileKey) {
      saveProfile(String(profileKey), {
        nickname: nextNick,
        avatarUrl: nextAvatar,
      });
    }
    // 保留当前表单数据，只刷新头部账号区域，避免清空后端拉回的字段
    // 头像加时间戳避免小程序 image 组件缓存旧图
    const displayAvatar = nextAvatar
      ? nextAvatar +
        (nextAvatar.indexOf("?") >= 0 ? "&" : "?") +
        "t=" +
        Date.now()
      : "";
    this.setData({
      accAvatarUrl: displayAvatar,
      accNickname: nextNick,
      accAvatarChar: nextNick ? nextNick.charAt(0) : "用",
    });
    if (okTitle) wx.showToast({ title: okTitle, icon: "success" });
  },
  _loadFormFromStore() {
    const u = getApp().globalData.userInfo || {};
    const uid = u.phone || u.backendUserId || u.id || u.userId || "";
    const p = (uid && getByPhone(String(uid))) || u;
    return {
      l2Scope: p.l2Scope != null && p.l2Scope !== "" ? String(p.l2Scope) : "",
      name:
        (p.name && String(p.name).trim()) ||
        (p.realName && String(p.realName).trim()) ||
        "",
      studentNo:
        p.studentNo != null && p.studentNo !== "" ? String(p.studentNo) : "",
      workNo: p.workNo != null && p.workNo !== "" ? String(p.workNo) : "",
      school: (p.school && String(p.school)) || "",
      schoolId: (p.schoolId && String(p.schoolId)) || "",
      grade: p.grade != null && p.grade !== "" ? String(p.grade) : "",
      studentAvailableTime:
        p.studentAvailableTime != null && p.studentAvailableTime !== ""
          ? String(p.studentAvailableTime)
          : "",
      subjects: p.subjects != null ? String(p.subjects) : "",
      personality: p.personality != null ? String(p.personality) : "",
      availableTime: p.availableTime != null ? String(p.availableTime) : "",
      guardianContact:
        p.guardianContact != null ? String(p.guardianContact) : "",
      learningGoal: p.learningGoal != null ? String(p.learningGoal) : "",
      region: p.region != null ? String(p.region) : "",
      managedStudents:
        p.managedStudents != null ? String(p.managedStudents) : "",
      organization: p.organization != null ? String(p.organization) : "",
      permissionNote: p.permissionNote != null ? String(p.permissionNote) : "",
    };
  },
  syncPage(mergeForm) {
    const fromStore = this._loadFormFromStore();
    const form = {
      ...fromStore,
      ...((mergeForm && typeof mergeForm === "object" && mergeForm) || {}),
    };
    const role = getApp().globalData.role || "";
    const visibleFields = roleFieldMap[role] || roleFieldMap.student;
    const roleMeta = roleMetaMap[role] || roleMetaMap.student;
    const u0 = (getApp().globalData && getApp().globalData.userInfo) || {};
    const nick0 = (u0.nickname || "").trim() || "未设置昵称";
    const dig = String(u0.phone || "")
      .replace(/\D/g, "")
      .slice(0, 11);
    const accPhoneDisplay =
      dig.length === 11
        ? dig.replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2")
        : dig.length > 0
          ? dig
          : "未填写手机号";
    this.setData({
      role,
      roleLabel: ROLE_DISPLAY_NAME[role] || "访客",
      visibleFields,
      heroTitle: roleMeta.title,
      sections: buildSections(role, form),
      form,
      accAvatarUrl: (u0.avatarUrl || "").trim(),
      accAvatarChar: nick0.length ? nick0.charAt(0) : "用",
      accNickname: nick0,
      accPhoneDisplay,
    });
  },
  async trySyncProfileFromBackend() {
    const role = this.data.role || "";
    if (
      role !== "student" &&
      role !== "teacher" &&
      role !== "admin_level_1" &&
      role !== "admin_level_2"
    )
      return; // 拉取后端学校列表刷新缓存（所有角色都需要）
    try {
      const { fetchSchools } = require("../../../utils/schoolsMock");
      const schools = await fetchSchools();
      _cachedRemoteSchools = schools;
    } catch (_) {}
    try {
      if (role === "admin_level_1" || role === "admin_level_2") {
        const remote = await adminApi.myProfile();
        if (!remote) return;
        const f = { ...this.data.form };
        f.name = remote.realName || f.name || "";
        f.schoolId =
          remote.schoolId != null ? String(remote.schoolId) : f.schoolId || "";
        f.region = remote.regionCode || f.region || "";
        if (remote.permissions) {
          const app = getApp();
          const u = (app.globalData && app.globalData.userInfo) || {};
          u.permissions = Array.isArray(remote.permissions)
            ? remote.permissions
            : [];
          u.schoolId = f.schoolId;
          app.globalData.userInfo = u;
        }
        this.syncPage(f);
        return;
      }
      const remote =
        role === "student"
          ? await studentApi.getProfile()
          : await teacherApi.getProfile();
      if (!remote) return;
      const f = { ...this.data.form };
      f.name = remote.realName || f.name || "";
      f.schoolId =
        remote.schoolId != null ? String(remote.schoolId) : f.schoolId || "";
      if (role === "teacher") f.school = remote.school || f.school || "";
      f.grade = remote.grade || f.grade || "";
      f.personality = remote.personalityDesc || f.personality || "";
      if (role === "student") {
        const sub = Array.isArray(remote.subjectsNeeded)
          ? remote.subjectsNeeded.join("、")
          : "";
        f.subjects = sub || f.subjects || "";
        f.studentAvailableTime = Array.isArray(remote.freeTime)
          ? freeTimeMapsToSerializedString(remote.freeTime)
          : f.studentAvailableTime || "";
      } else {
        const sub = Array.isArray(remote.skilledSubjects)
          ? remote.skilledSubjects.join("、")
          : "";
        f.subjects = sub || f.subjects || "";
        f.availableTime = Array.isArray(remote.freeTime)
          ? freeTimeMapsToSerializedString(remote.freeTime)
          : f.availableTime || "";
      }
      this.syncPage(f);
    } catch (e) {
      if (console && console.warn)
        console.warn("[profile] sync backend profile failed", e);
    }
  },
  onPickSchool(e) {
    if (this.data.role === "admin_level_2") return;
    const ix = Number(e.detail.value);
    const f = { ...this.data.form };
    const r = this.data.role;
    const allSchools = _cachedRemoteSchools || getSchoolsByKind();
    let range;
    if (r === "student") {
      range = allSchools.filter(function (s) {
        return s.type === 0 || s.kind === "recipient";
      });
    } else if (r === "teacher") {
      range = allSchools.filter(function (s) {
        return s.type === 1 || s.kind === "support";
      });
    } else if (r === "admin_level_2") {
      var currentSid = f.schoolId || "";
      var currentSchool = currentSid
        ? allSchools.find(function (s) {
            return String(s.id) === currentSid;
          })
        : null;
      var schoolType = currentSchool
        ? currentSchool.type != null
          ? Number(currentSchool.type)
          : currentSchool.kind === "support"
            ? 1
            : 0
        : null;
      if (schoolType === 1) {
        range = allSchools.filter(function (s) {
          return s.type === 1 || s.kind === "support";
        });
      } else if (schoolType === 0) {
        range = allSchools.filter(function (s) {
          return s.type === 0 || s.kind === "recipient";
        });
      } else {
        range = allSchools;
      }
    } else {
      range = allSchools;
    }
    const one = range[ix];
    if (one) {
      f.schoolId = String(one.id);
      f.school = one.name || getSchoolName(one.id) || "";
    }
    this.syncPage(f);
  },
  onPickGrade(e) {
    const ix = Number(e.detail.value);
    const f = { ...this.data.form };
    const mg0 = matchGradeToPicker(f.grade);
    const g = (mg0.list || [])[ix];
    f.grade = g && g.id ? g.name : "";
    this.syncPage(f);
  },
  onToggleProfileGridCell(e) {
    const tfield =
      (e.currentTarget &&
        e.currentTarget.dataset &&
        e.currentTarget.dataset.tfield) ||
      "";
    const week =
      (e.currentTarget &&
        e.currentTarget.dataset &&
        e.currentTarget.dataset.week) ||
      "";
    const slot =
      (e.currentTarget &&
        e.currentTarget.dataset &&
        e.currentTarget.dataset.slot) ||
      "";
    if (!tfield || !week || !slot) return;
    
    const weekId = Number(week);
    const slotId = String(slot);
    const f = { ...this.data.form };
    const { cells } = parseTimeSelection(f[tfield] || "");
    
    let nextCells = Array.isArray(cells) ? cells.slice() : [];
    const idx = nextCells.findIndex(c => c.week === weekId && c.slot === slotId);
    let isSelectedNow = false;
    if (idx >= 0) {
      nextCells.splice(idx, 1);
    } else {
      nextCells.push({ week: weekId, slot: slotId });
      isSelectedNow = true;
    }
    
    f[tfield] = serializeTimeGrid(nextCells);
    
    // Targeted update to avoid dynamic sections recreate
    const sections = this.data.sections || [];
    let cellPath = "";
    for (let sIdx = 0; sIdx < sections.length; sIdx++) {
      const sec = sections[sIdx];
      for (let fIdx = 0; fIdx < sec.fields.length; fIdx++) {
        const field = sec.fields[fIdx];
        if (field.tfield === tfield) {
          const grid = field.grid || [];
          for (let rIdx = 0; rIdx < grid.length; rIdx++) {
            const row = grid[rIdx];
            if (row.slotId === slotId) {
              const cellsList = row.cells || [];
              for (let cIdx = 0; cIdx < cellsList.length; cIdx++) {
                const cell = cellsList[cIdx];
                if (cell.weekId === weekId) {
                  cellPath = `sections[${sIdx}].fields[${fIdx}].grid[${rIdx}].cells[${cIdx}].on`;
                  break;
                }
              }
            }
          }
        }
      }
    }

    if (cellPath) {
      this.setData({
        [`form.${tfield}`]: f[tfield],
        [cellPath]: isSelectedNow
      });
    } else {
      this.syncPage(f);
    }
  },
  onToggleProfileTime(e) {
    const tfield =
      (e.currentTarget &&
        e.currentTarget.dataset &&
        e.currentTarget.dataset.tfield) ||
      "";
    const tkind =
      (e.currentTarget &&
        e.currentTarget.dataset &&
        e.currentTarget.dataset.tkind) ||
      "";
    const raw =
      (e.currentTarget &&
        e.currentTarget.dataset &&
        e.currentTarget.dataset.id) ||
      "";
    if (!tfield || (tkind !== "week" && tkind !== "slot")) return;
    const f = { ...this.data.form };
    const { weekIds, slotIds } = parseTimeSelection(f[tfield] || "");
    let wk = (weekIds || []).slice();
    let sk = (slotIds || []).slice();
    if (tkind === "week") {
      const n = +raw;
      if (n < 1 || n > 7) return;
      const ix = wk.indexOf(n);
      if (ix >= 0) wk.splice(ix, 1);
      else {
        wk.push(n);
        wk.sort((a, b) => a - b);
      }
    } else {
      const s = String(raw);
      if (["mor", "noon", "night"].indexOf(s) < 0) return;
      const j = sk.indexOf(s);
      if (j >= 0) sk.splice(j, 1);
      else sk.push(s);
    }
    f[tfield] = serializeTimeSelection(wk, sk);
    this.syncPage(f);
  },
  onToggleSubject(e) {
    const { subject } = e.currentTarget.dataset;
    if (!subject) return;
    const { form, sections } = this.data;
    const f = { ...form };
    let selected = (f.subjects || "").split(/[,，、\s]+/).filter(Boolean);
    const idx = selected.indexOf(subject);
    if (idx >= 0) {
      selected.splice(idx, 1);
    } else {
      selected.push(subject);
    }
    f.subjects = selected.join("、");
    this.syncPage(f);
  },
  onInput(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({
      [`form.${field}`]: value
    });
  },
  async onSubmit() {
    const { form, visibleFields, role } = this.data;
    if (!form.name || !form.name.trim()) {
      wx.showToast({ title: "请填写姓名", icon: "none" });
      return;
    }
    const u = getApp().globalData.userInfo || {};
    if (u.phone) {
      const name = (form.name || "").trim();
      const patch = {
        name,
        studentNo: (form.studentNo && String(form.studentNo).trim()) || "",
        workNo: (form.workNo && String(form.workNo).trim()) || "",
        school: (form.schoolId && getSchoolName(form.schoolId)) || form.school,
        schoolId: form.schoolId || u.schoolId,
        grade: form.grade,
        studentAvailableTime: form.studentAvailableTime,
        subjects: form.subjects,
        personality: form.personality,
        availableTime: form.availableTime,
        guardianContact: form.guardianContact,
        learningGoal: form.learningGoal,
        region: form.region,
        managedStudents: form.managedStudents,
        organization: form.organization,
        permissionNote: form.permissionNote,
      };
      Object.keys(patch).forEach((k) => {
        if (patch[k] === "" || patch[k] == null) delete patch[k];
      });
      this._pendingPatch = patch;
    }
    try {
      if (role === "student") {
        const t = parseTimeSelection(String(form.studentAvailableTime || ""));
        let freeTime;
        if (Array.isArray(t.cells)) {
          freeTime = t.cells.map(c => ({ week: Number(c.week), slot: String(c.slot) }));
        } else {
          freeTime = weekIdsSlotIdsToFreeTimeMaps(t.weekIds, t.slotIds);
        }
        const payload = {
          realName: String(form.name || "").trim(),
          schoolId: form.schoolId ? Number(form.schoolId) : null,
          grade: String(form.grade || "").trim(),
          subjectsNeeded: String(form.subjects || "")
            .split(/[，,\s]+/)
            .map((x) => x.trim())
            .filter(Boolean),
          freeTime,
          personalityDesc: String(form.personality || "").trim() || null,
        };
        await studentApi.updateProfile(payload);
        await studentApi.submitProfile();
      } else if (role === "teacher") {
        const t = parseTimeSelection(String(form.availableTime || ""));
        let freeTime;
        if (Array.isArray(t.cells)) {
          freeTime = t.cells.map(c => ({ week: Number(c.week), slot: String(c.slot) }));
        } else {
          freeTime = weekIdsSlotIdsToFreeTimeMaps(t.weekIds, t.slotIds);
        }
        const payload = {
          realName: String(form.name || "").trim(),
          schoolId: form.schoolId ? Number(form.schoolId) : null,
          grade: String(form.grade || "").trim(),
          freeTime,
          skilledSubjects: String(form.subjects || "")
            .split(/[，,\s]+/)
            .map((x) => x.trim())
            .filter(Boolean),
          personalSkills: "",
          personalityDesc: String(form.personality || "").trim() || null,
        };
        const appUser = getApp().globalData.userInfo || {};
        if (appUser.hasProfile) {
          await teacherApi.updateProfile(payload);
        } else {
          await teacherApi.createProfile(payload);
          appUser.hasProfile = true;
          getApp().globalData.userInfo = appUser;
          wx.setStorageSync("userInfo", appUser);
        }
      } else if (role === "admin_level_1" || role === "admin_level_2") {
        const payload = { realName: String(form.name || "").trim() };
        if (form.schoolId) payload.schoolId = Number(form.schoolId);
        if (form.region) payload.regionCode = String(form.region).trim();
        await adminApi.updateMyProfile(payload);
      }
      const _app = getApp();
      const _u = (_app.globalData && _app.globalData.userInfo) || {};
      _u.name = (form.name || "").trim();
      _u.realName = _u.name;
      _app.globalData.userInfo = _u;
      wx.setStorageSync("userInfo", _u);
      if (this._pendingPatch && _u.phone) {
        saveProfile(String(_u.phone), this._pendingPatch);
        this._pendingPatch = null;
      }
      wx.showToast({ title: "资料已保存", icon: "success" });
    } catch (err) {
      wx.showToast({ title: (err && err.message) || "保存失败", icon: "none" });
    }
  },
});
