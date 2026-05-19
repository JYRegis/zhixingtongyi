const { matchApi } = require("../../../utils/api");
const { matchStatusLine } = require("../../../utils/unbindDtoMappers");

function safeDecode(s) {
  if (!s) return "";
  try { return decodeURIComponent(s); } catch (_) { return s; }
}

const INIT_KEY = "unbindInitiators"; // { [pairId]: userId } — legacy, kept for backward compat

function readInitiators() {
  try {
    const v = wx.getStorageSync(INIT_KEY);
    return v && typeof v === "object" ? v : {};
  } catch (_) { return {}; }
}
function markInitiator(pairId, userId) {
  // 后端 unbindRequest 现在自动确认发起人，本地标记仅作兜底
  if (!pairId || !userId) return;
  const all = readInitiators();
  all[String(pairId)] = String(userId);
  try { wx.setStorageSync(INIT_KEY, all); } catch (_) {}
}
function getInitiator(pairId) {
  const all = readInitiators();
  return all[String(pairId)] || "";
}
function getMyUserId() {
  const u = (getApp() && getApp().globalData && getApp().globalData.userInfo) || {};
  return String(u.backendUserId || u.id || "");
}

Page({
  data: {
    pairId: "",
    partnerName: "",
    statusText: "",
    loading: true,
    hasUnbind: false,
    canSubmitUnbind: false,
    notPaired: false,
    reason: "",
    studentName: "",
    teacherName: "",
    initiatorLabel: "",
    isInitiator: false,
    unbindReason: "",
    studentConfirm: false,
    teacherConfirm: false,
    adminConfirm: false,
    rejectReason: "",
    canConfirm: false
  },
  onLoad(q) {
    const pairId = (q && q.pairId) || "";
    const partnerName = safeDecode(q && q.partnerName);
    const urlStudentName = safeDecode(q && q.studentName);
    const urlTeacherName = safeDecode(q && q.teacherName);
    // 兜底：URL 上携带的 status 仅用作首屏占位，最终以 progress.matchStatus 为准
    const fallbackStatus = safeDecode(q && q.status);
    this._pairId = pairId;
    this._role = (getApp().globalData && getApp().globalData.role) || "";
    this._urlStudentName = urlStudentName;
    this._urlTeacherName = urlTeacherName;
    this.setData({
      pairId,
      partnerName,
      statusText: fallbackStatus,
      studentName: urlStudentName || "",
      teacherName: urlTeacherName || ""
    });
  },
  onShow() {
    if (!this._pairId) {
      this.setData({ loading: false });
      return;
    }
    this._loadAll();
  },
  _loadAll() {
    this.setData({ loading: true });
    Promise.all([
      matchApi.pairDetail(this._pairId).catch(() => null),
      matchApi.unbindProgress(this._pairId).catch(() => null),
      matchApi.myPairs().catch(() => [])
    ]).then(([pair, progress, myPairs]) => {
      // myPairs 兜底：pairDetail 后端目前不返回 studentName/teacherName
      const myPair = (Array.isArray(myPairs) ? myPairs : []).find((p) => String(p && (p.id || p.pairId)) === String(this._pairId)) || {};
      const studentName = (pair && (pair.studentName || pair.student_name))
        || myPair.studentName
        || this._urlStudentName
        || "学员";
      const teacherName = (pair && (pair.teacherName || pair.teacher_name))
        || myPair.teacherName
        || this._urlTeacherName
        || "志愿者";
      const studentId = (pair && (pair.studentId || pair.student_id)) || myPair.studentId;
      const teacherId = (pair && (pair.teacherId || pair.teacher_id)) || myPair.teacherId;

      // 状态以 progress.matchStatus 为准，未拿到则用 pair / myPair 的 matchStatus
      const ms = (progress && progress.matchStatus != null)
        ? progress.matchStatus
        : (pair && pair.matchStatus != null ? pair.matchStatus : myPair.matchStatus);
      const statusText = matchStatusLine(ms).status;

      // 仅 matchStatus=1（结对中）允许发起解绑
      const isPaired = Number(ms) === 1;
      const notPaired = !isPaired && (Number(ms) === 0 || Number(ms) === 2 || Number(ms) === 4 || Number(ms) === 5);

      let hasUnbind = false;
      let initiatorLabel = "—";
      let unbindReason = "";
      let studentConfirm = false;
      let teacherConfirm = false;
      let adminConfirm = false;
      let rejectReason = "";
      let canConfirm = false;
      let isInitiator = false;

      if (progress && progress.matchStatus != null) {
        const isUnbinding = progress.matchStatus === 3;
        hasUnbind = isUnbinding || progress.matchStatus === 4 || progress.matchStatus === 5;
        // 优先用后端 unbindRequestBy，缺失则用本地标记
        const requesterId = progress.unbindRequestBy
          || (pair && pair.unbindRequestBy)
          || myPair.unbindRequestBy
          || getInitiator(this._pairId);
        const sConfirm = !!progress.studentUnbindConfirm;
        const tConfirm = !!progress.teacherUnbindConfirm;
        const aConfirm = !!progress.adminUnbindConfirm;
        if (requesterId != null && studentId != null && String(requesterId) === String(studentId)) {
          initiatorLabel = studentName + "（学员）";
        } else if (requesterId != null && teacherId != null && String(requesterId) === String(teacherId)) {
          initiatorLabel = teacherName + "（志愿者）";
        } else if (sConfirm && !tConfirm && !aConfirm) {
          initiatorLabel = studentName + "（学员）";
        } else if (tConfirm && !sConfirm && !aConfirm) {
          initiatorLabel = teacherName + "（志愿者）";
        } else if (requesterId != null && String(requesterId) !== "") {
          initiatorLabel = "用户 " + requesterId;
        } else {
          initiatorLabel = "—";
        }
        unbindReason = progress.unbindReason || (pair && pair.unbindReason) || "";
        studentConfirm = sConfirm;
        teacherConfirm = tConfirm;
        adminConfirm = aConfirm;
        rejectReason = progress.unbindRejectReason || "";

        const role = this._role;
        const myId = getMyUserId();
        // 当前用户是否就是发起人：后端字段 / 本地标记 / 当前角色对应的 id 匹配 requesterId
        if (myId && requesterId && String(myId) === String(requesterId)) {
          isInitiator = true;
        }
        let myConfirmed = false;
        if (role === "student") myConfirmed = studentConfirm;
        else if (role === "teacher") myConfirmed = teacherConfirm;
        else myConfirmed = adminConfirm;
        canConfirm = isUnbinding && !myConfirmed && !isInitiator;

        // 后端 unbindRequest 已自动确认发起人，无需前端再调 accept
        // isInitiator 的确认位应该已经是 1
      }

      this.setData({
        loading: false,
        studentName,
        teacherName,
        statusText,
        hasUnbind,
        canSubmitUnbind: isPaired,
        notPaired,
        initiatorLabel,
        isInitiator,
        unbindReason,
        studentConfirm,
        teacherConfirm,
        adminConfirm,
        rejectReason,
        canConfirm
      });
    });
  },
  onReasonInput(e) {
    this.setData({ reason: (e.detail && e.detail.value) || "" });
  },
  onSubmitUnbind() {
    const reason = (this.data.reason || "").trim();
    if (!reason) {
      wx.showToast({ title: "请填写解绑原因", icon: "none" });
      return;
    }
    matchApi.unbindRequest(this._pairId).then(() => {
      // 本地标记当前用户为发起人，并重置自动确认标志使下次进入会自动同意
      markInitiator(this._pairId, getMyUserId());
      this._autoAcceptTried = false;
      wx.showToast({ title: "已提交解绑申请", icon: "success" });
      this._loadAll();
    }).catch((err) => {
      wx.showToast({ title: (err && err.message) || "提交失败", icon: "none" });
    });
  },
  onConfirm() {
    const role = this._role;
    const roleParam = role === "student" ? "STUDENT" : role === "teacher" ? "TEACHER" : "SECONDARY_ADMIN";
    matchApi.unbindConfirm(this._pairId, { role: roleParam, action: "accept" }).then(() => {
      wx.showToast({ title: "已确认", icon: "success" });
      this._loadAll();
    }).catch((err) => {
      wx.showToast({ title: (err && err.message) || "操作失败", icon: "none" });
    });
  },
  onReject() {
    const role = this._role;
    const roleParam = role === "student" ? "STUDENT" : role === "teacher" ? "TEACHER" : "SECONDARY_ADMIN";
    matchApi.unbindConfirm(this._pairId, { role: roleParam, action: "reject", rejectReason: "不同意解绑" }).then(() => {
      wx.showToast({ title: "已拒绝", icon: "none" });
      this._loadAll();
    }).catch((err) => {
      wx.showToast({ title: (err && err.message) || "操作失败", icon: "none" });
    });
  }
});
