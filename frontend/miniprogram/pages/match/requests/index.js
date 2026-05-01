const { formatSavedTimeForDisplay } = require("../../../utils/classTimeOptions");
const { checkOnboardingOrRedirect } = require("../../../utils/onboardingGuard");
const { matchApi } = require("../../../utils/api");

function formatApplyAt(ts) {
  if (ts == null) {
    return "—";
  }
  const d = new Date(typeof ts === "number" ? ts : Date.parse(String(ts)));
  if (isNaN(d.getTime())) {
    return "—";
  }
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const h = d.getHours();
  const min = d.getMinutes();
  function p2(n) {
    return (n < 10 ? "0" : "") + n;
  }
  return y + "-" + p2(m) + "-" + p2(day) + " " + p2(h) + ":" + p2(min);
}

/**
 * 与学员入驻表同构：W:1,2,3|S:mor,noon,night；展示为「周一、周二 · 早上、晚上」
 * 志愿者：首行=对方「学员」；学员：首行=对方「支教老师」，便于和本人身份区分。
 * @param {object} row
 * @param {string} viewerRole student|teacher
 */
function mapItem(row, viewerRole) {
  const isVolunteer = viewerRole === "teacher";
  const primaryName = isVolunteer ? (row.studentName || "—") : (row.volunteerName && String(row.volunteerName).trim()) || "待分配";
  return {
    ...row,
    primaryLabel: isVolunteer ? "学员" : "支教老师",
    primaryName: primaryName,
    avatarText: primaryName && primaryName !== "—" ? String(primaryName).slice(0, 1) : "待",
    preferredTimeDisplay: formatSavedTimeForDisplay(row.timeRaw),
    appliedAtText: formatApplyAt(row.appliedAt)
  };
}

const AT = 1712000000000;
const SEED = [
  { id: 101, studentName: "小林", volunteerName: "王志愿者", timeRaw: "W:6,7|S:night", appliedAt: AT + 1000000 },
  { id: 102, studentName: "小周", volunteerName: "李老师", timeRaw: "W:1,3,5|S:mor,noon", appliedAt: AT + 2000000 },
  { id: 103, studentName: "和晓红", volunteerName: "赵明志", timeRaw: "W:2,4|S:night", appliedAt: AT + 3000000 },
  { id: 104, studentName: "赵明", volunteerName: "孙支教", timeRaw: "W:1,2,3|S:mor", appliedAt: AT + 4000000 },
  { id: 105, studentName: "杨芳", volunteerName: "周可", timeRaw: "W:5,6|S:noon,night", appliedAt: AT + 5000000 },
  { id: 106, studentName: "白玛", volunteerName: "海城张师", timeRaw: "W:3,5,7|S:mor", appliedAt: AT + 6000000 },
  { id: 107, studentName: "丁勇", volunteerName: "云州刘老师", timeRaw: "W:1,2,3,4,5|S:night", appliedAt: AT + 7000000 },
  { id: 108, studentName: "方欣", volunteerName: "王老师", timeRaw: "W:6,7|S:noon", appliedAt: AT + 8000000 },
  { id: 109, studentName: "郭宇", volunteerName: "李老师", timeRaw: "W:2,4,6|S:mor,noon,night", appliedAt: AT + 9000000 },
  { id: 110, studentName: "金涛", volunteerName: "赵老师", timeRaw: "W:1,3,5,7|S:night", appliedAt: AT + 10000000 },
  { id: 111, studentName: "沈悦", volunteerName: "钱支教", timeRaw: "W:4,5|S:mor", appliedAt: AT + 11000000 },
  { id: 112, studentName: "冯凯", volunteerName: "吴可", timeRaw: "W:2,3|S:noon,night", appliedAt: AT + 12000000 },
  { id: 113, studentName: "陆晨", volunteerName: "郑明", timeRaw: "W:1,6,7|S:night", appliedAt: AT + 13000000 },
  { id: 114, studentName: "罗洁", volunteerName: "何芳", timeRaw: "W:3,4,5|S:mor,noon", appliedAt: AT + 14000000 },
  { id: 115, studentName: "韩雪", volunteerName: "高伟", timeRaw: "W:2,5|S:night", appliedAt: AT + 15000000 },
  { id: 116, studentName: "曹颖", volunteerName: "陈静", timeRaw: "W:1,2,3,4,5,6,7|S:mor,noon,night", appliedAt: AT + 16000000 }
];

Page({
  data: {
    pendingList: [],
    isVolunteer: true,
    rejectReason: "",
    activeRejectId: null
  },
  onLoad() {
    this._pending = SEED.map((r) => ({ ...r }));
  },
  async onShow() {
    checkOnboardingOrRedirect("pages/match/requests/index");
    const app0 = getApp();
    const r = (app0.globalData && app0.globalData.role) || "";
    if (r !== "student" && r !== "teacher") {
      wx.showToast({ title: "结对待办仅对学员/支教志愿者开放", icon: "none" });
      setTimeout(function () {
        wx.navigateBack({
          fail: function () {
            wx.switchTab({ url: "/pages/match/center/index" });
          }
        });
      }, 200);
      return;
    }
    this._viewerRole = r;
    if (r === "teacher") {
      try {
        const remote = await matchApi.pendingApplications();
        this._pending = (Array.isArray(remote) ? remote : []).map((row) => ({
          id: row.id,
          studentName: row.studentName || `学员${row.studentId || ""}`,
          volunteerName: "",
          timeRaw: row.timeRaw || "",
          appliedAt: row.applyTime
        }));
      } catch (e) {
        if (console && console.warn) {
          console.warn("[match-requests] getPendingApplications fallback to mock", e);
        }
      }
    }
    if (!this._pending) {
      this._pending = SEED.map((x) => ({ ...x }));
    }
    const sorted = this._pending
      .slice()
      .sort((a, b) => (a.appliedAt || 0) - (b.appliedAt || 0));
    this.setData({
      isVolunteer: r === "teacher",
      pendingList: sorted.map((x) => mapItem(x, r))
    });
  },
  async onAccept(e) {
    if (this._viewerRole !== "teacher") {
      return;
    }
    const id = e.currentTarget.dataset.id;
    if (!this._pending) {
      this._pending = SEED.map((r) => ({ ...r }));
    }
    try {
      await matchApi.process(id, { action: "accept", reason: "" });
      this._pending = this._pending.filter((item) => item.id !== id);
      const sorted = this._pending
        .slice()
        .sort((a, b) => (a.appliedAt || 0) - (b.appliedAt || 0));
      this.setData({ pendingList: sorted.map((x) => mapItem(x, this._viewerRole || "teacher")) });
      wx.showToast({
        title: "已接受",
        icon: "success"
      });
    } catch (err) {
      wx.showToast({
        title: (err && err.message) || "操作失败",
        icon: "none"
      });
    }
  },
  /** 蒙层滚动穿透占位 */
  preventScrollThrough() {},
  onStopRejectDialogBubble() {},

  onOpenReject(e) {
    if (this._viewerRole !== "teacher") {
      return;
    }
    this.setData({
      activeRejectId: e.currentTarget.dataset.id,
      rejectReason: ""
    });
  },
  onInputReason(e) {
    this.setData({
      rejectReason: e.detail.value
    });
  },
  async onRejectConfirm() {
    const { activeRejectId, rejectReason } = this.data;
    if (!activeRejectId) {
      return;
    }
    if (!rejectReason.trim()) {
      wx.showToast({
        title: "请填写拒绝理由",
        icon: "none"
      });
      return;
    }
    try {
      await matchApi.process(activeRejectId, { action: "reject", reason: rejectReason.trim() });
      if (!this._pending) {
        this._pending = SEED.map((r) => ({ ...r }));
      }
      this._pending = this._pending.filter((item) => item.id !== activeRejectId);
      wx.showToast({
        title: "已拒绝",
        icon: "none"
      });
      const sorted2 = this._pending
        .slice()
        .sort((a, b) => (a.appliedAt || 0) - (b.appliedAt || 0));
      this.setData({
        pendingList: sorted2.map((x) => mapItem(x, this._viewerRole || "teacher")),
        activeRejectId: null,
        rejectReason: ""
      });
    } catch (err) {
      wx.showToast({
        title: (err && err.message) || "操作失败",
        icon: "none"
      });
    }
  },
  onCancelReject() {
    this.setData({
      activeRejectId: null,
      rejectReason: ""
    });
  }
});
