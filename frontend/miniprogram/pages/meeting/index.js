const { ROLE_DISPLAY_NAME } = require("../../utils/roleLabels");
const { checkOnboardingOrRedirect } = require("../../utils/onboardingGuard");
const { mergeFromStorageIntoApp, getByPhone } = require("../../utils/userProfileStore");
const {
  getMeetingsForUser,
  splitNextAndHistory,
  formatMeetingTime,
  canCreateMeetingRole
} = require("../../utils/meetingStore");

const { to } = require("../../utils/nav");
const { syncCustomTabBar } = require("../../utils/customTabBar");

Page({
  data: {
    role: "",
    roleName: "用户",
    canCreate: false,
    nextMeeting: null,
    history: [],
    empty: false
  },
  onShow() {
    checkOnboardingOrRedirect("pages/meeting/index");
    mergeFromStorageIntoApp();
    const app0 = getApp();
    const r = app0.globalData.role || "";
    const u = app0.globalData.userInfo || {};
    const p = (u && u.phone && getByPhone(String(u.phone))) || u || {};
    if (r !== "student" && r !== "teacher") {
      wx.switchTab({ url: "/pages/common/workbench/index" });
      return;
    }
    const phone = u && u.phone ? String(u.phone) : "";
    const list = getMeetingsForUser(phone, r, p);
    const { nextMeeting, history } = splitNextAndHistory(list, Date.now());
    let next2 = null;
    if (nextMeeting) {
      next2 = {
        ...nextMeeting,
        startTime: formatMeetingTime(nextMeeting.startTimeMs)
      };
    }
    const his = (history || []).map((h) => {
      return {
        ...h,
        startTime: formatMeetingTime(h.startTimeMs)
      };
    });
    const can = canCreateMeetingRole(r);
    this.setData({
      role: r,
      roleName: ROLE_DISPLAY_NAME[r] || "用户",
      canCreate: can,
      nextMeeting: next2,
      history: his,
      empty: !next2 && (!his || his.length === 0)
    });
    syncCustomTabBar();
  },
  onCreate() {
    to("/pages/meeting/create/index");
  },
  onPullDownRefresh() {
    this.onShow();
    wx.stopPullDownRefresh();
  },
  onCopyLink() {
    const m = this.data.nextMeeting;
    if (!m || !m.roomLink) {
      wx.showToast({ title: "暂无可复制链接，请在腾讯会议中复制后于「新建会议」填写", icon: "none" });
      return;
    }
    wx.setClipboardData({
      data: String(m.roomLink),
      success: () => wx.showToast({ title: "链接已复制", icon: "success" })
    });
  },
  onSubscribeNotice() {
    wx.showToast({
      title: "订阅提醒功能即将上线",
      icon: "none"
    });
  }
});
