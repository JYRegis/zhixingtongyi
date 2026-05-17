const { mergeFromStorageIntoApp } = require("../../../utils/userProfileStore");
const { checkOnboardingOrRedirect } = require("../../../utils/onboardingGuard");
const { adminApi } = require("../../../utils/api");

function pageRecords(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.records)) return payload.records;
  if (payload && Array.isArray(payload.list)) return payload.list;
  return [];
}

function mapRemoteTeacher(vo) {
  return {
    id: vo.userId || vo.id,
    displayName: vo.realName || vo.username || "志愿者",
    school: vo.school || vo.schoolName || "—",
    grade: vo.grade || "—"
  };
}

Page({
  data: { list: [], loading: false },
  onShow() {
    checkOnboardingOrRedirect("pages/admin/region-teachers/index");
    this.refresh();
  },
  refresh() {
    mergeFromStorageIntoApp();
    const token = (getApp().globalData && getApp().globalData.token) || wx.getStorageSync("token") || "";
    if (!token) { this.setData({ list: [] }); return; }
    this.setData({ loading: true });
    adminApi.pendingTeachers({ page: 1, size: 50 }).then((res) => {
      this.setData({ list: pageRecords(res).map(mapRemoteTeacher), loading: false });
    }).catch(() => {
      this.setData({ list: [], loading: false });
    });
  },
  onPullDownRefresh() { this.refresh(); wx.stopPullDownRefresh(); },
  onView(e) {
    const id = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: "/pages/common/review-submission-detail/index?type=teacher&id=" + encodeURIComponent(String(id)) });
  },
  onApprove(e) {
    const id = e.currentTarget.dataset.id;
    adminApi.auditTeacher(id, { status: 1, notes: "" }).then(() => {
      wx.showToast({ title: "已通过", icon: "success" });
      this.refresh();
    }).catch((err) => wx.showToast({ title: (err && err.message) || "失败", icon: "none" }));
  },
  onReject(e) {
    const id = e.currentTarget.dataset.id;
    adminApi.auditTeacher(id, { status: 2, notes: "二级管理员驳回" }).then(() => {
      wx.showToast({ title: "已驳回", icon: "none" });
      this.refresh();
    }).catch((err) => wx.showToast({ title: (err && err.message) || "失败", icon: "none" }));
  }
});
