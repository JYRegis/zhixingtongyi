const { ROLE_DISPLAY_NAME } = require("../../utils/roleLabels");
const { checkOnboardingOrRedirect } = require("../../utils/onboardingGuard");
const { mergeFromStorageIntoApp, getByPhone } = require("../../utils/userProfileStore");
const { splitNextAndHistory, formatMeetingTime, canCreateMeetingRole } = require("../../utils/meetingStore");
const { meetingItemVoToListRow } = require("../../utils/meetingDtoMappers");
const { meetingApi, matchApi } = require("../../utils/api");
const { to } = require("../../utils/nav");
const { syncCustomTabBar } = require("../../utils/customTabBar");

function applyPairNames(rows, pairMap, role) {
  return (rows || []).map((row) => {
    const pair = pairMap[String(row.pairId)];
    if (pair) {
      const sName = pair.studentName || "学员";
      const tName = pair.teacherName || "志愿者";
      let line;
      if (role === "student") line = tName;
      else if (role === "teacher") line = sName;
      else line = sName + " — " + tName;
      return { ...row, pairLine: line };
    }
    return row;
  });
}

function renderMeetingPage(self, r, p, u, useServerList) {
  const list = useServerList ? self._serverMeetingRows || [] : [];
  const { upcoming, history } = splitNextAndHistory(list, Date.now());
  const upcomingList = (upcoming || []).map((m) => ({ ...m, startTime: formatMeetingTime(m.startTimeMs) }));
  const his = (history || []).map((h) => ({ ...h, startTime: formatMeetingTime(h.startTimeMs) }));
  self.setData({
    role: r,
    roleName: ROLE_DISPLAY_NAME[r] || "用户",
    canCreate: canCreateMeetingRole(r),
    upcomingList,
    history: his,
    empty: upcomingList.length === 0 && his.length === 0
  });
  syncCustomTabBar();
}

Page({
  data: { role: "", roleName: "用户", canCreate: false, upcomingList: [], history: [], empty: false },
  _serverMeetingRows: null,
  onShow() {
    checkOnboardingOrRedirect("pages/meeting/index");
    mergeFromStorageIntoApp();
    const app0 = getApp();
    const r = app0.globalData.role || "";
    const u = app0.globalData.userInfo || {};
    const p = (u && u.phone && getByPhone(String(u.phone))) || u || {};
    const token = (app0.globalData && app0.globalData.token) || wx.getStorageSync("token") || "";
    if (token) {
      const isStuOrTea = r === "student" || r === "teacher";
      const meetingReq = isStuOrTea ? meetingApi.myMeetings() : meetingApi.list();
      const pairReq = isStuOrTea ? matchApi.myPairs(1).catch(() => []) : Promise.resolve([]);
      Promise.all([meetingReq.catch(() => null), pairReq]).then(([rows, pairs]) => {
        const pairMap = {};
        (Array.isArray(pairs) ? pairs : []).forEach((pp) => {
          const id = pp && (pp.id != null ? pp.id : pp.pairId);
          if (id != null) pairMap[String(id)] = pp;
        });
        let mapped = (rows || []).map((vo) => meetingItemVoToListRow(vo));
        mapped = applyPairNames(mapped, pairMap, r);
        this._serverMeetingRows = mapped;
        renderMeetingPage(this, r, p, u, true);
      });
      return;
    }
    this._serverMeetingRows = null;
    renderMeetingPage(this, r, p, u, false);
  },
  onCreate() { to("/pages/meeting/create/index"); },
  onPullDownRefresh() { this.onShow(); wx.stopPullDownRefresh(); },
  onCopyLink(e) {
    const link = e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.link;
    if (!link) {
      wx.showToast({ title: "暂无可复制链接", icon: "none" });
      return;
    }
    wx.setClipboardData({ data: String(link), success: () => wx.showToast({ title: "链接已复制", icon: "success" }) });
  },
  onSubscribeNotice() { wx.showToast({ title: "订阅提醒功能即将上线", icon: "none" }); }
});
