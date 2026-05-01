const { getAllPendingForUI, resolveApplication } = require("../../../../utils/onboardingStore");
const { mapApplicationRow, ROLE_TITLES } = require("../../../../utils/platformPendingMap");
const { mergeFromStorageIntoApp } = require("../../../../utils/userProfileStore");
const { checkOnboardingOrRedirect } = require("../../../../utils/onboardingGuard");
const { getSchoolsByKind, SCHOOLS } = require("../../../../utils/schoolsMock");
const { SCOPE_OPTIONS, applyL2ScopeToTeacher } = require("../../../../utils/l2ScopeAssign");
const { adminApi } = require("../../../../utils/api");

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
  const name = row.username || row.phone || ("用户 " + row.id);
  return mapApplicationRow({
    id: row.id,
    applicantId: row.id,
    role,
    schoolName: "—",
    extra: { name }
  });
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
      pendingList: []
    },
    L2_PICKER_INIT
  ),
  onLoad(q) {
    const r = (q && q.role) || "student";
    this._role = VALID.has(r) ? r : "student";
    this.setData(
      Object.assign(
        {
          roleFilter: this._role,
          sectionTitle: (ROLE_TITLES[this._role] || "用户") + "待审"
        },
        L2_PICKER_INIT
      )
    );
    try {
      wx.setNavigationBarTitle({ title: (ROLE_TITLES[this._role] || "用户") + "待审" });
    } catch (e) {
      // ignore
    }
  },
  onShow() {
    checkOnboardingOrRedirect(PAGE_PATH);
    mergeFromStorageIntoApp();
    const app = getApp();
    const u = app.globalData.userInfo || {};
    const token = (app.globalData && app.globalData.token) || wx.getStorageSync("token") || "";
    if (token && (this._role === "student" || this._role === "teacher")) {
      adminApi
        .users({ role: ROLE_CODE[this._role], page: 1, size: 50 })
        .then((res) => {
          this.setData({ pendingList: pageRecords(res).map((row) => mapRemoteUser(row, this._role)), _remote: true });
        })
        .catch(() => {
          const pending = (getAllPendingForUI("admin_level_1", u.phone) || [])
            .filter((a) => a.role === this._role)
            .map(mapApplicationRow);
          this.setData({ pendingList: pending, _remote: false });
        });
      return;
    }
    const pending = (getAllPendingForUI("admin_level_1", u.phone) || [])
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
    this._resolve(id, true, "");
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
    wx.showModal({
      title: "驳回",
      content: "确认驳回此条？",
      success: (r) => {
        if (r.confirm) {
          this._resolve(id, false, "");
        }
      }
    });
  },
  onViewOnboarding(e) {
    const id = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id;
    if (!id) {
      return;
    }
    wx.navigateTo({ url: "/pages/common/review-submission-detail/index?type=onboarding&id=" + encodeURIComponent(String(id)) });
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
