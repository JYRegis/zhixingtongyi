const { ROLE_DISPLAY_NAME } = require("../../../utils/roleLabels");
const { mergeFromStorageIntoApp } = require("../../../utils/userProfileStore");
const { studentApi, teacherApi } = require("../../../utils/api");

Page({
  data: {
    roleName: "",
    status: "pending",
    rejectReason: ""
  },
  onLoad(q) {
    const fromQuery = (q && q.role) || "";
    const statusQuery = (q && q.status) || "pending";
    const app = getApp();
    const r = (fromQuery || (app && app.globalData && app.globalData.role) || "").trim();
    this._role = r;
    this.setData({
      roleName: (r && ROLE_DISPLAY_NAME[r]) || "",
      status: statusQuery
    });
    try {
      wx.setNavigationBarTitle({ title: statusQuery === "rejected" ? "已驳回" : "审核中" });
    } catch (e) {}
    if (statusQuery === "rejected") {
      this._fetchRejectReason(r);
    }
  },
  onShow() {
    mergeFromStorageIntoApp();
  },
  _fetchRejectReason(role) {
    const token = (getApp().globalData && getApp().globalData.token) || wx.getStorageSync("token") || "";
    if (!token) return;
    const req = role === "teacher" ? teacherApi.getProfile() : studentApi.getProfile();
    req.then((res) => {
      const notes = (res && (res.auditNotes || res.audit_notes)) || "";
      if (notes) {
        this.setData({ rejectReason: notes });
      }
    }).catch(() => {});
  },
  onReApply() {
    const r = this._role || "student";
    wx.redirectTo({ url: "/pages/common/onboarding-apply/index?role=" + encodeURIComponent(r) + "&from=rejected" });
  },
  onReLaunchHome() {
    getApp().logout();
    wx.reLaunch({ url: "/pages/common/home/index" });
  }
});
