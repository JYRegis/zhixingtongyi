const { mergeFromStorageIntoApp } = require("../../../utils/userProfileStore");
const { checkOnboardingOrRedirect } = require("../../../utils/onboardingGuard");
const { adminApi } = require("../../../utils/api");

function pageRecords(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.records)) return payload.records;
  if (payload && Array.isArray(payload.list)) return payload.list;
  return [];
}

function mapRemoteHour(row) {
  const minutes = Number(row && row.duration ? row.duration : 0);
  return {
    id: row.id,
    hours: minutes ? Math.round((minutes / 60) * 10) / 10 : 0,
    week: row.meetingDate || "—",
    studentName: row.studentName || "学员",
    volunteerName: row.teacherName || "志愿者",
    schoolName: row.schoolName || "",
    _remote: true
  };
}

Page({
  data: { list: [], loading: false },
  onShow() {
    checkOnboardingOrRedirect("pages/admin/region-hours/index");
    this.refresh();
  },
  refresh() {
    mergeFromStorageIntoApp();
    const token = (getApp().globalData && getApp().globalData.token) || wx.getStorageSync("token") || "";
    if (!token) { this.setData({ list: [] }); return; }
    this.setData({ loading: true });
    adminApi.pendingVolunteerRecords({ page: 1, size: 50 }).then((res) => {
      if (console && console.log) console.log("[region-hours] response:", JSON.stringify(res));
      const records = pageRecords(res);
      if (console && console.log) console.log("[region-hours] records:", records.length);
      const list = records.map(mapRemoteHour);
      this.setData({ list, _remote: true, loading: false });
    }).catch((err) => {
      if (console && console.warn) console.warn("[region-hours] failed", err);
      this.setData({ list: [], loading: false });
    });
  },
  onPullDownRefresh() { this.refresh(); wx.stopPullDownRefresh(); },
  onViewHours(e) {
    const id = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: "/pages/common/review-submission-detail/index?type=hours&id=" + encodeURIComponent(String(id)) });
  },
  onApproveHours(e) {
    const id = e.currentTarget.dataset.id;
    adminApi.auditVolunteerRecord(id, { action: "approve", rejectReason: "" }).then(() => {
      wx.showToast({ title: "已通过", icon: "success" });
      this.refresh();
    }).catch((err) => wx.showToast({ title: (err && err.message) || "失败", icon: "none" }));
  },
  onRejectHours(e) {
    const id = e.currentTarget.dataset.id;
    adminApi.auditVolunteerRecord(id, { action: "reject", rejectReason: "二级管理员驳回" }).then(() => {
      wx.showToast({ title: "已驳回", icon: "none" });
      this.refresh();
    }).catch((err) => wx.showToast({ title: (err && err.message) || "失败", icon: "none" }));
  }
});
