const { ROLE_DISPLAY_NAME } = require("../../utils/roleLabels");
const { checkOnboardingOrRedirect } = require("../../utils/onboardingGuard");
const { mergeFromStorageIntoApp, getByPhone } = require("../../utils/userProfileStore");
const {
  getMeetingsForUser,
  splitNextAndHistory,
  formatMeetingTime,
  canCreateMeetingRole
} = require("../../utils/meetingStore");
const { meetingItemVoToListRow } = require("../../utils/meetingDtoMappers");
const { USE_BACKEND_MEETING } = require("../../config/demoBackend");
const { meetingApi } = require("../../utils/api");

const { to } = require("../../utils/nav");
const { syncCustomTabBar } = require("../../utils/customTabBar");

function renderMeetingPage(self, r, p, u, useServerList) {
  const phone = u && u.phone ? String(u.phone) : "";
  const list = useServerList
    ? self._serverMeetingRows || []
    : getMeetingsForUser(phone, r, p);
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
  self.setData({
    role: r,
    roleName: ROLE_DISPLAY_NAME[r] || "用户",
    canCreate: can,
    nextMeeting: next2,
    history: his,
    empty: !next2 && (!his || his.length === 0)
  });
  syncCustomTabBar();
}

Page({
  data: {
    role: "",
    roleName: "用户",
    canCreate: false,
    nextMeeting: null,
    history: [],
    empty: false
  },
  _serverMeetingRows: null,
  onShow() {
    const self = this;
    checkOnboardingOrRedirect("pages/meeting/index");
    mergeFromStorageIntoApp();
    const app0 = getApp();
    const r = app0.globalData.role || "";
    const u = app0.globalData.userInfo || {};
    const p = (u && u.phone && getByPhone(String(u.phone))) || u || {};
    const token = (app0.globalData && app0.globalData.token) || wx.getStorageSync("token") || "";
    const tryRemote = USE_BACKEND_MEETING && token;
    if (tryRemote) {
      const req = r === "student" || r === "teacher" ? meetingApi.myMeetings() : meetingApi.list();
      req
        .then(function (rows) {
          const list = (rows || []).map(function (vo) {
            return meetingItemVoToListRow(vo);
          });
          self._serverMeetingRows = list;
          renderMeetingPage(self, r, p, u, true);
        })
        .catch(function () {
          self._serverMeetingRows = null;
          renderMeetingPage(self, r, p, u, false);
        });
      return;
    }
    this._serverMeetingRows = null;
    renderMeetingPage(this, r, p, u, false);
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
