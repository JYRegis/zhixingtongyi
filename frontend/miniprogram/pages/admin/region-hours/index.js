const { getRecipientHoursList } = require("../../../utils/regionL2Display");
const { resolveHoursRequest } = require("../../../utils/hoursReviewStore");
const { mergeFromStorageIntoApp, getByPhone } = require("../../../utils/userProfileStore");
const { checkOnboardingOrRedirect } = require("../../../utils/onboardingGuard");
const { adminApi } = require("../../../utils/api");

function pageRecords(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  return (payload && (payload.records || payload.list)) || [];
}

function mapRemoteHour(row) {
  const minutes = Number(row && row.duration ? row.duration : 0);
  return {
    id: row.id,
    hours: minutes ? Math.round((minutes / 60) * 10) / 10 : "",
    week: row.meetingDate || "—",
    studentName: row.studentName || (row.studentId != null ? "学员 " + row.studentId : "—"),
    volunteerName: row.teacherName || (row.teacherId != null ? "志愿者 " + row.teacherId : "—"),
    schoolName: "—"
  };
}

Page({
  data: { list: [] },
  onShow() {
    checkOnboardingOrRedirect("pages/admin/region-hours/index");
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
        .pendingVolunteerRecords({ page: 1, size: 50 })
        .then((res) => {
          this.setData({ list: pageRecords(res).map(mapRemoteHour), _remote: true });
        })
        .catch(() => {
          this.setData({ list: getRecipientHoursList(String(u.phone)), _remote: false });
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
    this.setData({ list: getRecipientHoursList(String(u.phone)) });
  },
  onPullDownRefresh() {
    this.refresh();
    wx.stopPullDownRefresh();
  },
  onViewHours(e) {
    const id = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id;
    if (!id) {
      return;
    }
    wx.navigateTo({ url: "/pages/common/review-submission-detail/index?type=hours&id=" + encodeURIComponent(String(id)) });
  },
  onApproveHours(e) {
    const id = e.currentTarget.dataset.id;
    if (this.data._remote) {
      this._auditRemote(id, true);
      return;
    }
    const u = getApp().globalData.userInfo || {};
    const res = resolveHoursRequest(id, true, { role: "admin_level_2", phone: u.phone, nickname: u.nickname });
    if (!res.ok) {
      wx.showToast({ title: res.message || "失败", icon: "none" });
      return;
    }
    wx.showToast({ title: "已通过", icon: "success" });
    this.onShow();
  },
  onRejectHours(e) {
    const id = e.currentTarget.dataset.id;
    if (this.data._remote) {
      this._auditRemote(id, false);
      return;
    }
    const u = getApp().globalData.userInfo || {};
    const res = resolveHoursRequest(id, false, { role: "admin_level_2", phone: u.phone, nickname: u.nickname });
    if (!res.ok) {
      wx.showToast({ title: res.message || "失败", icon: "none" });
      return;
    }
    wx.showToast({ title: "已驳回", icon: "none" });
    this.onShow();
  },
  _auditRemote(id, ok) {
    adminApi
      .auditVolunteerRecord(id, { action: ok ? "accept" : "reject", rejectReason: ok ? "" : "二级管理员驳回" })
      .then(() => {
        wx.showToast({ title: ok ? "已通过" : "已驳回", icon: ok ? "success" : "none" });
        this.onShow();
      })
      .catch((err) => {
        wx.showToast({ title: (err && err.message) || "失败", icon: "none" });
      });
  }
});
