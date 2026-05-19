const { mergeFromStorageIntoApp } = require("../../../utils/userProfileStore");
const { checkOnboardingOrRedirect } = require("../../../utils/onboardingGuard");
const { adminApi } = require("../../../utils/api");
const { formatSavedTimeForDisplay } = require("../../../utils/classTimeOptions");
const { freeTimeMapsToSerializedString } = require("../../../utils/dtoMappers");

function parseFreeTime(ft) {
  if (!ft) return "—";
  if (Array.isArray(ft)) return formatSavedTimeForDisplay(freeTimeMapsToSerializedString(ft));
  var str = String(ft).trim();
  if (str.charAt(0) === "[") {
    try { return formatSavedTimeForDisplay(freeTimeMapsToSerializedString(JSON.parse(str))); } catch (e) {}
  }
  return formatSavedTimeForDisplay(str);
}

function mapRemoteStudent(vo) {
  return {
    id: vo.userId || vo.id,
    displayName: vo.realName || vo.username || "学员",
    schoolName: vo.schoolName || "—",
    grade: vo.grade || "—",
    timeText: parseFreeTime(vo.freeTime),
    auditStatus: vo.auditStatus,
    _remote: true
  };
}

Page({
  data: { list: [], loading: false },
  onShow() {
    checkOnboardingOrRedirect("pages/admin/region-students/index");
    this.refresh();
  },
  refresh() {
    mergeFromStorageIntoApp();
    const token = (getApp().globalData && getApp().globalData.token) || wx.getStorageSync("token") || "";
    if (!token) { this.setData({ list: [] }); return; }
    this.setData({ loading: true });
    adminApi.managedStudents().then((rows) => {
      this.setData({ list: (Array.isArray(rows) ? rows : []).map(mapRemoteStudent), loading: false });
    }).catch(() => {
      this.setData({ list: [], loading: false });
    });
  },
  onPullDownRefresh() { this.refresh(); wx.stopPullDownRefresh(); },
  onViewOnboarding(e) {
    const id = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: "/pages/common/review-submission-detail/index?type=student&id=" + encodeURIComponent(String(id)) });
  },
  onApproveL2(e) {
    const id = e.currentTarget.dataset.id;
    const self = this;
    wx.showModal({
      title: "通过审核",
      editable: true,
      placeholderText: "审核备注（选填）",
      content: "",
      success(res) {
        if (!res.confirm) return;
        const notes = (res.content || "").trim();
        adminApi.auditStudent(id, { status: 1, notes }).then(() => {
          wx.showToast({ title: "已通过", icon: "success" });
          self.refresh();
        }).catch((err) => wx.showToast({ title: (err && err.message) || "失败", icon: "none" }));
      }
    });
  },
  onRejectL2(e) {
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
        if (!notes) { wx.showToast({ title: "请填写驳回原因", icon: "none" }); return; }
        adminApi.auditStudent(id, { status: 2, notes }).then(() => {
          wx.showToast({ title: "已驳回", icon: "none" });
          self.refresh();
        }).catch((err) => wx.showToast({ title: (err && err.message) || "失败", icon: "none" }));
      }
    });
  }
});
