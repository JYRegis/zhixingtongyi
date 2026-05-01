const { getActivePairList } = require("../../../utils/pairingStore");
const { getSchoolName } = require("../../../utils/schoolsMock");
const { submitHoursRequest, getMyHoursRequests } = require("../../../utils/hoursReviewStore");
const { checkOnboardingOrRedirect } = require("../../../utils/onboardingGuard");
const { mergeFromStorageIntoApp, getByPhone } = require("../../../utils/userProfileStore");

const PAGE = "pages/common/hours-apply/index";

const STATUS_LABEL = {
  pending: "待审",
  approved: "已通过",
  rejected: "已驳回"
};

/** 生成本周周次（演示用近似，可手改；格式 YYYY-Www） */
function suggestWeekString() {
  const now = new Date();
  const y = now.getFullYear();
  const start = new Date(y, 0, 1);
  const dayOfYear = Math.floor((now - start) / 86400000) + 1;
  const week = Math.min(53, Math.max(1, Math.ceil(dayOfYear / 7)));
  return y + "-W" + String(week).padStart(2, "0");
}

function buildPairList() {
  const all = getActivePairList().filter((p) => p && p.status === "结对中");
  return all.map((p) => ({
    ...p,
    label: (p.studentName || "—") + " · " + (p.partnerName || "—") + " · " + (getSchoolName(p.schoolId) || p.schoolId)
  }));
}

function mapMyList(phone) {
  return (getMyHoursRequests(phone) || []).map((h) => ({
    ...h,
    statusLabel: STATUS_LABEL[h.status] || h.status || "—",
    statusClass:
      h.status === "approved"
        ? "hours-status--approved"
        : h.status === "rejected"
          ? "hours-status--rejected"
          : "hours-status--pending"
  }));
}

Page({
  data: {
    pairList: [],
    pairIndex: 0,
    hoursInput: "",
    weekInput: "",
    myList: []
  },
  onLoad() {
    const r = (getApp().globalData && getApp().globalData.role) || "";
    if (r !== "student" && r !== "teacher") {
      wx.showToast({ title: "仅学员与支教志愿者可申请", icon: "none" });
      setTimeout(() => wx.navigateBack(), 500);
      return;
    }
    this.setData({ weekInput: suggestWeekString() });
  },
  onShow() {
    const r = (getApp().globalData && getApp().globalData.role) || "";
    if (r !== "student" && r !== "teacher") {
      return;
    }
    checkOnboardingOrRedirect(PAGE);
    mergeFromStorageIntoApp();
    this.syncData();
  },
  syncData() {
    const pairList = buildPairList();
    const app = getApp();
    const u = (app.globalData && app.globalData.userInfo) || {};
    const phone = u.phone ? String(u.phone) : "";
    const myList = mapMyList(phone);
    const { pairIndex } = this.data;
    const nextIndex = pairList.length
      ? Math.min(Math.max(0, pairIndex), pairList.length - 1)
      : 0;
    this.setData({
      pairList,
      pairIndex: nextIndex,
      myList
    });
  },
  onPairChange(e) {
    const idx = e.detail && e.detail.value != null ? Number(e.detail.value) : 0;
    this.setData({ pairIndex: idx });
  },
  onHoursInput(e) {
    this.setData({ hoursInput: (e.detail && e.detail.value) || "" });
  },
  onWeekInput(e) {
    this.setData({ weekInput: (e.detail && e.detail.value) || "" });
  },
  onSubmit() {
    const { pairList, pairIndex, hoursInput, weekInput } = this.data;
    if (!pairList.length) {
      wx.showToast({ title: "没有可选结对", icon: "none" });
      return;
    }
    const pair = pairList[pairIndex];
    if (!pair) {
      wx.showToast({ title: "请重新选择结对", icon: "none" });
      return;
    }
    const hours = parseFloat(String(hoursInput).trim().replace(/,/g, ""));
    if (!hours || hours <= 0) {
      wx.showToast({ title: "请填写有效时长", icon: "none" });
      return;
    }
    const week = (weekInput || "").trim() || suggestWeekString();
    const r = (getApp().globalData && getApp().globalData.role) || "";
    const u = (getApp().globalData && getApp().globalData.userInfo) || {};
    const phone = u.phone ? String(u.phone) : "";
    const prof = phone ? getByPhone(phone) : null;
    const nick = (prof && prof.nickname) || u.nickname || "";

    let studentName = pair.studentName || "—";
    let volunteerName = pair.partnerName || "—";
    if (r === "student") {
      studentName = (nick && nick.trim()) || studentName;
    } else {
      volunteerName = (nick && nick.trim()) || volunteerName;
    }

    const res = submitHoursRequest({
      schoolId: pair.schoolId,
      schoolName: getSchoolName(pair.schoolId) || pair.schoolId,
      studentName,
      volunteerName,
      hours,
      week,
      applicantPhone: phone,
      applicantRole: r,
      pairId: pair.pairId
    });
    if (!res || !res.ok) {
      wx.showToast({ title: (res && res.message) || "提交失败", icon: "none" });
      return;
    }
    wx.showToast({ title: "已提交", icon: "success" });
    this.setData({ hoursInput: "" });
    this.syncData();
  },
  onViewItem(e) {
    const id = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id;
    if (!id) {
      return;
    }
    wx.navigateTo({
      url: "/pages/common/review-submission-detail/index?type=hours&id=" + encodeURIComponent(String(id))
    });
  }
});
