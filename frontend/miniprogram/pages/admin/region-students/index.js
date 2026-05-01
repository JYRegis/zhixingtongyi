const { getRecipientStudentRegList } = require("../../../utils/regionL2Display");
const { resolveApplication } = require("../../../utils/onboardingStore");
const { mergeFromStorageIntoApp, getByPhone } = require("../../../utils/userProfileStore");
const { checkOnboardingOrRedirect } = require("../../../utils/onboardingGuard");
const { adminApi } = require("../../../utils/api");
const { formatSavedTimeForDisplay } = require("../../../utils/classTimeOptions");
const { freeTimeMapsToSerializedString } = require("../../../utils/dtoMappers");

function mapRemoteStudent(vo) {
  return {
    id: vo.userId || vo.id,
    displayName: vo.realName || vo.username || "学员",
    schoolName: vo.schoolName || (vo.schoolId != null ? "学校 " + vo.schoolId : "—"),
    grade: vo.grade || "—",
    timeText: Array.isArray(vo.freeTime) ? formatSavedTimeForDisplay(freeTimeMapsToSerializedString(vo.freeTime)) : String(vo.freeTime || "—"),
    _remote: true
  };
}

Page({
  data: { list: [] },
  onShow() {
    checkOnboardingOrRedirect("pages/admin/region-students/index");
    this.refresh();
  },
  refresh() {
    mergeFromStorageIntoApp();
    const u = (getApp().globalData && getApp().globalData.userInfo) || {};
    const p = getByPhone(u.phone) || u;
    if (!u.phone) {
      this.setData({ list: [] });
      return;
    }
    const token = (getApp().globalData && getApp().globalData.token) || wx.getStorageSync("token") || "";
    if (token) {
      adminApi
        .managedStudents()
        .then((rows) => {
          this.setData({ list: (Array.isArray(rows) ? rows : []).map(mapRemoteStudent), _remote: true });
        })
        .catch(() => {
          this.setData({ list: getRecipientStudentRegList(String(u.phone)), _remote: false });
        });
      return;
    }
    if (p.l2Scope !== "recipient_side") {
      wx.showToast({ title: "仅受援方老师可查看", icon: "none" });
      setTimeout(function () {
        wx.navigateBack();
      }, 500);
      return;
    }
    this.setData({ list: getRecipientStudentRegList(String(u.phone)) });
  },
  onPullDownRefresh() {
    this.refresh();
    wx.stopPullDownRefresh();
  },
  onViewOnboarding(e) {
    const id = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id;
    if (!id) {
      return;
    }
    wx.navigateTo({
      url: "/pages/common/review-submission-detail/index?type=onboarding&id=" + encodeURIComponent(String(id))
    });
  },
  onApproveL2(e) {
    const id = e.currentTarget.dataset.id;
    if (this.data._remote) {
      adminApi
        .auditStudent(id, { status: 1, notes: "" })
        .then(() => {
          wx.showToast({ title: "已处理", icon: "success" });
          this.onShow();
        })
        .catch((err) => {
          wx.showToast({ title: (err && err.message) || "失败", icon: "none" });
        });
      return;
    }
    const u = getApp().globalData.userInfo || {};
    const res = resolveApplication(id, true, { role: "admin_level_2", phone: u.phone, nickname: u.nickname });
    if (!res.ok) {
      wx.showToast({ title: res.message || "失败", icon: "none" });
      return;
    }
    wx.showToast({ title: "已处理", icon: "success" });
    this.onShow();
  },
  onRejectL2(e) {
    const id = e.currentTarget.dataset.id;
    if (this.data._remote) {
      adminApi
        .auditStudent(id, { status: 2, notes: "二级管理员驳回" })
        .then(() => {
          wx.showToast({ title: "已驳回", icon: "none" });
          this.onShow();
        })
        .catch((err) => {
          wx.showToast({ title: (err && err.message) || "失败", icon: "none" });
        });
      return;
    }
    const u = getApp().globalData.userInfo || {};
    const res = resolveApplication(id, false, { role: "admin_level_2", phone: u.phone, nickname: u.nickname });
    if (!res.ok) {
      wx.showToast({ title: res.message || "失败", icon: "none" });
      return;
    }
    wx.showToast({ title: "已驳回", icon: "none" });
    this.onShow();
  }
});
