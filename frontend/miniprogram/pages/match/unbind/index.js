const { ROLE_DISPLAY_NAME } = require("../../../utils/roleLabels");
const { checkOnboardingOrRedirect } = require("../../../utils/onboardingGuard");
const { mergeFromStorageIntoApp, getByPhone } = require("../../../utils/userProfileStore");
const { matchApi } = require("../../../utils/api");
const { pairVosToUnbindList } = require("../../../utils/unbindDtoMappers");
const { syncCustomTabBar } = require("../../../utils/customTabBar");

Page({
  data: {
    role: "",
    isL2Recipient: false,
    pairList: [],
    l2RequestList: []
  },
  onShow() {
    checkOnboardingOrRedirect("pages/match/unbind/index");
    mergeFromStorageIntoApp();
    syncCustomTabBar();
    const app = getApp();
    const r = app.globalData.role || "";
    const u = app.globalData.userInfo || {};
    this.setData({ role: r });

    if (r === "admin_level_1") {
      wx.navigateBack();
      return;
    }
    if (r === "admin_level_2") {
      this._loadL2List();
      return;
    }
    if (r === "student" || r === "teacher") {
      this._loadPairList(r);
    }
  },
  _loadL2List() {
    this.setData({ isL2Recipient: true, l2RequestList: [] });
    const token = (getApp().globalData && getApp().globalData.token) || wx.getStorageSync("token") || "";
    if (!token) return;
    matchApi.pendingUnbindRequests().then((res) => {
      const list = (Array.isArray(res) ? res : (res && res.records) || []).map((item) => ({
        id: String(item.pairId || item.id),
        studentName: item.studentName || "学员",
        partnerName: item.teacherName || "志愿者",
        _createdAtText: item.unbindRequestTime || ""
      }));
      this.setData({ l2RequestList: list });
    }).catch(() => {
      this.setData({ l2RequestList: [] });
    });
  },
  _loadPairList(role) {
    this.setData({ isL2Recipient: false, pairList: [] });
    const token = (getApp().globalData && getApp().globalData.token) || wx.getStorageSync("token") || "";
    if (!token) return;
    matchApi.myPairs().then((pairs) => {
      const list = pairVosToUnbindList(pairs, role);
      this.setData({ pairList: list });
    }).catch(() => {
      this.setData({ pairList: [] });
    });
  },
  onGoDetail(e) {
    const pairId = e.currentTarget.dataset.pairid || "";
    const name = e.currentTarget.dataset.name || "";
    const status = e.currentTarget.dataset.status || "";
    if (!pairId) return;
    wx.navigateTo({
      url: "/pages/match/unbind-detail/index?pairId=" + encodeURIComponent(pairId) + "&partnerName=" + encodeURIComponent(name) + "&status=" + encodeURIComponent(status)
    });
  },
  onGoDetailL2(e) {
    const pairId = e.currentTarget.dataset.pairid || "";
    const studentName = e.currentTarget.dataset.student || "";
    const teacherName = e.currentTarget.dataset.teacher || "";
    if (!pairId) return;
    wx.navigateTo({
      url: "/pages/match/unbind-detail/index?pairId=" + encodeURIComponent(pairId)
        + "&studentName=" + encodeURIComponent(studentName)
        + "&teacherName=" + encodeURIComponent(teacherName)
    });
  },
  onPullDownRefresh() {
    this.onShow();
    wx.stopPullDownRefresh();
  }
});
