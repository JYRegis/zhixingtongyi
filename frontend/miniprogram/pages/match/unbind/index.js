const { ROLE_DISPLAY_NAME } = require("../../../utils/roleLabels");
const { checkOnboardingOrRedirect } = require("../../../utils/onboardingGuard");
const { mergeFromStorageIntoApp, getByPhone } = require("../../../utils/userProfileStore");
const { matchApi } = require("../../../utils/api");
const { pairVosToUnbindList } = require("../../../utils/unbindDtoMappers");

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
      const raw = Array.isArray(res) ? res : (res && res.records) || [];
      const list = raw.map((item) => ({
        id: String(item.pairId || item.id),
        studentName: item.studentName || "学员",
        partnerName: item.teacherName || "志愿者",
        _createdAtText: item.unbindRequestTime || "",
        _myConfirmed: !!(item.adminUnbindConfirm)
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
      // 只展示已结对及之后的状态（排除 matchStatus=0 待审核、2 已拒绝）
      const filtered = (Array.isArray(pairs) ? pairs : []).filter((p) => {
        const ms = p && p.matchStatus;
        return ms === 1 || ms === 3 || ms === 4 || ms === 5;
      });
      const list = pairVosToUnbindList(filtered, role);
      this.setData({ pairList: list });
      // 对解绑流程中的 pair，额外查确认进度来更新状态显示
      const unbinding = list.filter((item) => item.matchStatus === 3);
      if (!unbinding.length) return;
      const self = this;
      const myId = String(((getApp().globalData.userInfo || {}).backendUserId) || (getApp().globalData.userInfo || {}).id || "");
      Promise.all(unbinding.map((item) => matchApi.unbindProgress(item.pairId).catch(() => null))).then((progList) => {
        const updated = self.data.pairList.slice();
        progList.forEach((prog, i) => {
          if (!prog) return;
          const idx = updated.findIndex((p) => p.pairId === unbinding[i].pairId);
          if (idx < 0) return;
          // 判断当前用户是否已确认
          let myConfirmed = false;
          if (role === "student") myConfirmed = !!(prog.studentUnbindConfirm);
          else if (role === "teacher") myConfirmed = !!(prog.teacherUnbindConfirm);
          else myConfirmed = !!(prog.adminUnbindConfirm);
          if (myConfirmed) {
            updated[idx] = { ...updated[idx], status: "已确认，等待对方", _myConfirmed: true };
          }
        });
        self.setData({ pairList: updated });
      });
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
