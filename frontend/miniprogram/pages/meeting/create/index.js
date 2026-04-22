const { mergeFromStorageIntoApp, getByPhone } = require("../../../utils/userProfileStore");
const { addMeeting, canCreateMeetingRole, getPairOptionsForForm } = require("../../../utils/meetingStore");
const { checkOnboardingOrRedirect } = require("../../../utils/onboardingGuard");

function pad2(n) {
  return (n < 10 ? "0" : "") + n;
}

function defaultDate() {
  const d = new Date();
  return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
}

Page({
  data: {
    role: "",
    title: "",
    dateStr: "",
    timeStr: "20:00",
    roomLink: "",
    pairIndex: 0,
    pairOptions: [],
    pairLineDisplay: "",
    pairRequired: false,
    submitDisabled: false
  },
  onShow() {
    checkOnboardingOrRedirect("pages/meeting/create/index");
    mergeFromStorageIntoApp();
    const app = getApp();
    const r = (app && app.globalData && app.globalData.role) || "";
    const u = (app && app.globalData && app.globalData.userInfo) || {};
    const p = (u && u.phone && getByPhone(String(u.phone))) || u || {};
    if (!canCreateMeetingRole(r)) {
      wx.showToast({ title: "当前身份不可新建会议", icon: "none" });
      setTimeout(function () {
        wx.navigateBack({ fail: function () { wx.switchTab({ url: "/pages/meeting/index" }); } });
      }, 400);
      return;
    }
    const options = getPairOptionsForForm(r, p) || [];
    if ((r === "student" || r === "teacher") && !options.length) {
      this.setData({
        role: r,
        pairOptions: [],
        pairLineDisplay: "",
        pairRequired: true,
        submitDisabled: true,
        dateStr: this.data.dateStr || defaultDate()
      });
      return;
    }
    if ((r === "admin_level_2" && (p.l2Scope === "recipient_side" || p.l2Scope === "volunteer_side")) && !options.length) {
      wx.showToast({ title: "本账号管辖范围内没有结对数据", icon: "none" });
      setTimeout(function () {
        wx.navigateBack();
      }, 500);
      return;
    }
    const pairIndex = 0;
    const first = options[pairIndex] || {};
    const pairLineDisplay = first && first.name != null ? first.name : "选择结对";
    const pr = r === "student" || r === "teacher";
    this.setData({
      role: r,
      pairOptions: options,
      pairIndex: pairIndex,
      pairLineDisplay: pairLineDisplay,
      pairRequired: pr,
      dateStr: this.data.dateStr || defaultDate(),
      submitDisabled: pr && !options.length
    });
  },
  onText(e) {
    const k = (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.k) || "";
    if (!k) {
      return;
    }
    this.setData({ [k]: (e && e.detail && e.detail.value) != null ? e.detail.value : "" });
  },
  onPickDate(e) {
    this.setData({ dateStr: (e && e.detail && e.detail.value) || "" });
  },
  onPickTime(e) {
    this.setData({ timeStr: (e && e.detail && e.detail.value) || "" });
  },
  onPickPair(e) {
    const ix = +((e && e.detail && e.detail.value) || 0);
    const opt = (this.data.pairOptions || [])[ix];
    this.setData({
      pairIndex: ix,
      pairLineDisplay: (opt && opt.name) || "选择结对"
    });
  },
  onSubmit() {
    const app = getApp();
    const r = (app && app.globalData && app.globalData.role) || "";
    const u = (app && app.globalData && app.globalData.userInfo) || {};
    const p = (u && u.phone && getByPhone(String(u.phone))) || u || {};
    const phone = u && u.phone ? String(u.phone) : "";
    if (!phone) {
      wx.showToast({ title: "请先登录", icon: "none" });
      return;
    }
    const title = String(this.data.title || "").trim();
    if (!title) {
      wx.showToast({ title: "请填写主题", icon: "none" });
      return;
    }
    const d = this.data.dateStr;
    const tm = this.data.timeStr;
    if (!d || !tm) {
      wx.showToast({ title: "请选择日期和时间", icon: "none" });
      return;
    }
    const parts = String(tm).split(":");
    const h = parseInt(parts[0] || 0, 10);
    const m = parseInt((parts[1] || "0"), 10);
    const dParts = String(d).split("-");
    const y = +dParts[0];
    const mon = +dParts[1] - 1;
    const day = +dParts[2];
    const st = new Date(y, mon, day, h, m, 0, 0).getTime();
    if (isNaN(st)) {
      wx.showToast({ title: "时间无效", icon: "none" });
      return;
    }
    const opts = this.data.pairOptions || [];
    const ix = this.data.pairIndex || 0;
    const pick = opts[ix] || { id: "", name: "" };
    const pairId = pick && pick.id != null && pick.id !== "" ? String(pick.id) : "";
    if (this.data.pairRequired && !pairId) {
      wx.showToast({ title: "请选择结对口", icon: "none" });
      return;
    }
    addMeeting({
      title: title,
      startTimeMs: st,
      roomLink: this.data.roomLink,
      pairId: pairId,
      pairLine: (pick && pick.name) || (pairId ? "结对" : "不指定结对"),
      createdByPhone: phone,
      creatorRole: r
    });
    wx.showToast({ title: "已保存", icon: "success" });
    setTimeout(function () {
      wx.navigateBack();
    }, 500);
  }
});
