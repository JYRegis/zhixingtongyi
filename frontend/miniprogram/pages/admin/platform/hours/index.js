const { getAllPendingForL1, resolveHoursRequest } = require("../../../../utils/hoursReviewStore");
const { mergeFromStorageIntoApp } = require("../../../../utils/userProfileStore");
const { checkOnboardingOrRedirect } = require("../../../../utils/onboardingGuard");
const { adminApi } = require("../../../../utils/api");

const PAGE_PATH = "pages/admin/platform/hours/index";

function pageRecords(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  return (payload && (payload.records || payload.list)) || [];
}

function mapRemoteHour(row) {
  const minutes = Number(row && row.duration ? row.duration : 0);
  const hours = minutes ? Math.round((minutes / 60) * 10) / 10 : "";
  return {
    id: row.id,
    hours,
    week: row.meetingDate || "—",
    studentName: row.studentName || (row.studentId != null ? "学员 " + row.studentId : "—"),
    volunteerName: row.teacherName || (row.teacherId != null ? "志愿者 " + row.teacherId : "—"),
    schoolName: row.schoolName || "—"
  };
}

Page({
  data: {
    pendingHours: []
  },
  onShow() {
    checkOnboardingOrRedirect(PAGE_PATH);
    mergeFromStorageIntoApp();
    const token = (getApp().globalData && getApp().globalData.token) || wx.getStorageSync("token") || "";
    if (token) {
      adminApi
        .pendingVolunteerRecords({ page: 1, size: 50 })
        .then((res) => {
          this.setData({ pendingHours: pageRecords(res).map(mapRemoteHour), _remote: true });
        })
        .catch(() => {
          const h = getAllPendingForL1() || [];
          this.setData({ pendingHours: h, _remote: false });
        });
      return;
    }
    const h = getAllPendingForL1() || [];
    this.setData({ pendingHours: h, _remote: false });
  },
  onPullDownRefresh() {
    this.onShow();
    wx.stopPullDownRefresh();
  },
  onHoursApprove(e) {
    this._resolveHours(e.currentTarget.dataset.id, true);
  },
  onViewHours(e) {
    const id = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id;
    if (!id) {
      return;
    }
    wx.navigateTo({ url: "/pages/common/review-submission-detail/index?type=hours&id=" + encodeURIComponent(String(id)) });
  },
  onHoursReject(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: "驳回",
      content: "确认驳回此条认定义务时长？",
      success: (r) => {
        if (r.confirm) {
          this._resolveHours(id, false);
        }
      }
    });
  },
  _resolveHours(id, ok) {
    if (this.data._remote) {
      adminApi
        .auditVolunteerRecord(id, { action: ok ? "accept" : "reject", rejectReason: ok ? "" : "管理员驳回" })
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
    const res = resolveHoursRequest(id, ok, { role: "admin_level_1", phone: appU.phone, nickname: appU.nickname });
    if (!res.ok) {
      wx.showToast({ title: res.message || "操作失败", icon: "none" });
      return;
    }
    wx.showToast({ title: ok ? "已通过" : "已驳回", icon: "success" });
    this.onShow();
  }
});
