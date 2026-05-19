const { resolveApplication } = require("../../../../utils/onboardingStore");
const { mapApplicationRow, ROLE_TITLES } = require("../../../../utils/platformPendingMap");
const { mergeFromStorageIntoApp } = require("../../../../utils/userProfileStore");
const { checkOnboardingOrRedirect } = require("../../../../utils/onboardingGuard");
const { getSchoolsByKind, SCHOOLS } = require("../../../../utils/schoolsMock");
const { SCOPE_OPTIONS, applyL2ScopeToTeacher } = require("../../../../utils/l2ScopeAssign");
const { adminApi, schoolApi } = require("../../../../utils/api");

const PAGE_PATH = "pages/admin/platform/review/index";

const VALID = new Set(["student", "teacher", "admin_level_2", "admin_level_1"]);
const ROLE_CODE = {
  admin_level_1: 0,
  admin_level_2: 1,
  teacher: 2,
  student: 3
};

function pageRecords(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  return (payload && (payload.records || payload.list)) || [];
}

function mapRemoteUser(row, role) {
  const name = row.realName || row.real_name || row.username || row.phone || ("用户 " + (row.userId || row.user_id || row.id));
  const schoolName = row.schoolName || row.school_name || (row.school != null ? String(row.school) : "—");
  const mapped = mapApplicationRow({
    id: row.userId || row.user_id || row.id,
    applicantId: row.userId || row.user_id || row.id,
    role,
    schoolName: schoolName,
    extra: { name }
  });
  mapped.name = name;
  return mapped;
}

const L2_PICKER_INIT = {
  scopeOptions: SCOPE_OPTIONS,
  supportSchools: getSchoolsByKind("support"),
  recipientSchools: getSchoolsByKind("recipient"),
  l2ScopeIndex: 0,
  l2SupportIndex: 0,
  l2RecipientIndex: 0,
  showL2Modal: false,
  l2PendingId: "",
  l2ApplicantPhone: ""
};

Page({
  data: Object.assign(
    {
      roleFilter: "student",
      sectionTitle: "待审",
      pendingList: [],
      schoolFilterList: [],
      schoolFilterIndex: 0
    },
    L2_PICKER_INIT
  ),
  onLoad(q) {
    const r = (q && q.role) || "student";
    this._role = VALID.has(r) ? r : "student";
    this._schoolId = null;
    this.setData(
      Object.assign(
        {
          roleFilter: this._role,
          sectionTitle: (ROLE_TITLES[this._role] || "用户") + "待审",
          schoolFilterList: [],
          schoolFilterIndex: 0
        },
        L2_PICKER_INIT
      )
    );
    try {
      wx.setNavigationBarTitle({ title: (ROLE_TITLES[this._role] || "用户") + "待审" });
    } catch (e) {
      // ignore
    }
    // 加载学校列表用于筛选
    this._loadSchoolFilter();
  },
  _loadSchoolFilter() {
    const token = (getApp().globalData && getApp().globalData.token) || wx.getStorageSync("token") || "";
    if (!token) return;
    schoolApi.list().then((res) => {
      const schools = Array.isArray(res) ? res : (res && (res.records || res.list)) || [];
      const list = [{ id: "", name: "全部学校" }].concat(schools.map((s) => ({ id: s.id, name: s.name })));
      this.setData({ schoolFilterList: list });
    }).catch(() => {});
  },
  onSchoolFilterChange(e) {
    const idx = Number(e.detail.value) || 0;
    const selected = (this.data.schoolFilterList || [])[idx];
    this._schoolId = (selected && selected.id) || null;
    this.setData({ schoolFilterIndex: idx });
    this.onShow();
  },
  onShow() {
    checkOnboardingOrRedirect(PAGE_PATH);
    mergeFromStorageIntoApp();
    const app = getApp();
    const u = app.globalData.userInfo || {};
    const token = (app.globalData && app.globalData.token) || wx.getStorageSync("token") || "";
    if (token && (this._role === "student" || this._role === "teacher")) {
      const params = { page: 1, size: 50 };
      if (this._schoolId) params.schoolId = this._schoolId;
      const api = this._role === "student" ? adminApi.pendingStudents : adminApi.pendingTeachers;
      api(params)
        .then((res) => {
          const records = pageRecords(res);
          if (records.length > 0) {
            this.setData({ pendingList: records.map((row) => mapRemoteUser(row, this._role)), _remote: true });
          } else {
            this.setData({ pendingList: [], _remote: true });
          }
        })
        .catch(() => {
          this._fallbackToUsers();
        });
      return;
    }
    if (token && (this._role === "admin_level_2" || this._role === "admin_level_1")) {
      // 管理员待审：用 users 接口按角色查询
      this._fallbackToUsers();
      return;
    }
    const pending = (this._getFallbackPending(u.phone) || [])
      .filter((a) => a.role === this._role)
      .map(mapApplicationRow);
    this.setData({ pendingList: pending, _remote: false });
  },
  onPullDownRefresh() {
    this.onShow();
    wx.stopPullDownRefresh();
  },
  onReviewApprove(e) {
    const id = e.currentTarget.dataset.id;
    if (this._role === "admin_level_2") {
      const row = (this.data.pendingList || []).find((x) => x && x.id === id);
      const ph = row && row.applicantId ? String(row.applicantId) : "";
      if (!id || !ph) {
        wx.showToast({ title: "数据异常，请重进页面", icon: "none" });
        return;
      }
      this.setData({
        showL2Modal: true,
        l2PendingId: id,
        l2ApplicantPhone: ph,
        l2ScopeIndex: 0,
        l2SupportIndex: 0,
        l2RecipientIndex: 0
      });
      return;
    }
    const self = this;
    wx.showModal({
      title: "通过审核",
      editable: true,
      placeholderText: "审核备注（选填）",
      content: "",
      success(res) {
        if (!res.confirm) return;
        const notes = (res.content || "").trim();
        self._resolve(id, true, notes);
      }
    });
  },
  onL2ScopeIndexChange(e) {
    const ix = Number(e.detail.value);
    this.setData({ l2ScopeIndex: ix });
  },
  onL2SupportIndexChange(e) {
    this.setData({ l2SupportIndex: Number(e.detail.value) });
  },
  onL2RecipientIndexChange(e) {
    this.setData({ l2RecipientIndex: Number(e.detail.value) });
  },
  onL2ModalClose() {
    this.setData({
      showL2Modal: false,
      l2PendingId: "",
      l2ApplicantPhone: ""
    });
  },
  onL2ModalMaskTap() {
    this.onL2ModalClose();
  },
  noop() {},
  onL2ModalConfirm() {
    const id = this.data.l2PendingId;
    const phone = this.data.l2ApplicantPhone;
    if (!id || !phone) {
      this.onL2ModalClose();
      return;
    }
    const sc = SCOPE_OPTIONS[this.data.l2ScopeIndex] || SCOPE_OPTIONS[0];
    const sSup =
      (this.data.supportSchools && this.data.supportSchools[this.data.l2SupportIndex]) ||
      SCHOOLS.find((s) => s && s.kind === "support");
    const sRec =
      (this.data.recipientSchools && this.data.recipientSchools[this.data.l2RecipientIndex]) ||
      SCHOOLS.find((s) => s && s.kind === "recipient");
    if (sc && sc.value === "volunteer_side" && (!sSup || !sSup.id)) {
      wx.showToast({ title: "请选择支教点学校", icon: "none" });
      return;
    }
    if (sc && sc.value === "recipient_side" && (!sRec || !sRec.id)) {
      wx.showToast({ title: "请选择受援校", icon: "none" });
      return;
    }
    const appU = getApp().globalData.userInfo || {};
    const res = resolveApplication(
      id,
      true,
      { role: "admin_level_1", phone: appU.phone, nickname: appU.nickname },
      ""
    );
    if (!res.ok) {
      wx.showToast({ title: res.message || "通过失败", icon: "none" });
      return;
    }
    const applied = applyL2ScopeToTeacher(phone, {
      l2Scope: sc.value,
      supportSchool: sc.value === "volunteer_side" ? sSup : null,
      recipientSchool: sc.value === "recipient_side" ? sRec : null
    });
    if (!applied.ok) {
      wx.showModal({
        title: "已通过，管辖未保存",
        content: (applied.message || "未知原因") + "。可稍后再试，或通过其它渠道让管理员在后台补选学校。",
        showCancel: false
      });
    } else {
      wx.showToast({ title: "已通过并分配", icon: "success" });
    }
    this.onL2ModalClose();
    this.onShow();
  },
  onReviewReject(e) {
    const id = e.currentTarget.dataset.id;
    const self = this;
    wx.showModal({
      title: "驳回",
      editable: true,
      placeholderText: "请填写驳回原因",
      content: "",
      success(res) {
        if (!res.confirm) return;
        const notes = (res.content || "").trim();
        if (!notes) {
          wx.showToast({ title: "请填写驳回原因", icon: "none" });
          return;
        }
        self._resolve(id, false, notes);
      }
    });
  },
  onViewOnboarding(e) {
    const id = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id;
    if (!id) {
      return;
    }
    // 根据当前审核的角色类型传不同 type，让详情页走对应的数据源
    const typeMap = { student: "student", teacher: "teacher", admin_level_2: "onboarding", admin_level_1: "onboarding" };
    const type = typeMap[this._role] || "onboarding";
    wx.navigateTo({ url: "/pages/common/review-submission-detail/index?type=" + type + "&id=" + encodeURIComponent(String(id)) });
  },
  _fallbackToUsers() {
    const roleCode = ROLE_CODE[this._role];
    adminApi.users({ role: roleCode, page: 1, size: 50 })
      .then((res) => {
        const records = pageRecords(res);
        this.setData({ pendingList: records.map((row) => mapRemoteUser(row, this._role)), _remote: true });
      })
      .catch(() => {
        this.setData({ pendingList: [], _remote: false });
      });
  },
  _getFallbackPending(phone) {
    const app = getApp();
    const u = app.globalData.userInfo || {};
    const cache = this._fallbackPendingCache || [];
    const list = cache.length
      ? cache
      : (require("../../../../utils/onboardingStore").getAllPendingForUI("admin_level_1", phone) || []);
    return list;
  },
  _resolve(id, ok, note) {
    if (this.data._remote && (this._role === "student" || this._role === "teacher")) {
      const api = this._role === "student" ? adminApi.auditStudent : adminApi.auditTeacher;
      api(id, { status: ok ? 1 : 2, notes: note || (ok ? "" : "平台驳回") })
        .then(() => {
          wx.showToast({ title: ok ? "已通过" : "已驳回", icon: "success" });
          this.onShow();
        })
        .catch((err) => {
          wx.showToast({ title: (err && err.message) || "操作失败", icon: "none" });
        });
      return;
    }
    const appU = getApp().globalData.userInfo || {};
    const res = resolveApplication(
      id,
      ok,
      { role: "admin_level_1", phone: appU.phone, nickname: appU.nickname },
      note
    );
    if (!res.ok) {
      wx.showToast({ title: res.message || "操作失败", icon: "none" });
      return;
    }
    wx.showToast({ title: ok ? "已通过" : "已驳回", icon: "success" });
    this.onShow();
  }
});
