const { ROLE_DISPLAY_NAME } = require("../../../utils/roleLabels");
const { getPairedListForUser } = require("../../../utils/chatPartners");
const {
  getActivePair,
  getPairById,
  getPairIdForRolePartner,
  getActivePairList,
  createUnbindRequest,
  getLatestPendingUnbind,
  recordUnbindAgree,
  rejectUnbind,
  getRecipientL2ForSchool,
  getUnbindListForRecipientL2,
  getUnbindById
} = require("../../../utils/pairingStore");
const { mergeFromStorageIntoApp, getByPhone } = require("../../../utils/userProfileStore");
const { checkOnboardingOrRedirect } = require("../../../utils/onboardingGuard");
const { matchApi } = require("../../../utils/api");
const { pairVosToUnbindList, unbindProgressToActiveRequest } = require("../../../utils/unbindDtoMappers");

function formatCreatedAt(ts) {
  if (!ts) {
    return "—";
  }
  const d = new Date(typeof ts === "number" ? ts : Number(ts));
  if (isNaN(d.getTime())) {
    return "—";
  }
  const z = (n) => (n < 10 ? "0" + n : String(n));
  return d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate()) + " " + z(d.getHours()) + ":" + z(d.getMinutes());
}

/**
 * 与「聊天」列表同源的结对行 + pairId（学员 / 志愿者端，仅与当前账号演示身份相关的结对）
 * @param {string} role
 * @param {string} phone
 * @returns {any[]}
 */
function buildStudentTeacherPairList(role, phone) {
  const pl = getPairedListForUser(phone, role) || [];
  return pl.map((row) => {
    const pairId = getPairIdForRolePartner(role, row.partnerId);
    const meta = (pairId && getPairById(pairId)) || null;
    const st = (meta && meta.status) || "结对中";
    return {
      pairId: pairId || row.partnerId,
      partnerId: row.partnerId,
      lineName:
        role === "student"
          ? (meta && meta.studentName + " — " + meta.partnerName) || (row.name + " · 结对")
          : (meta && meta.studentName + " — " + meta.partnerName) || row.name,
      tag: row.tag || "",
      name: row.name,
      status: st
    };
  });
}

Page({
  data: {
    canInitiateUnbind: false,
    role: "",
    roleName: "用户",
    /** 多结对：列表行（仅学员/志愿者） */
    pairList: [],
    isL2Recipient: false,
    /** 受援 L2：仅有「学员/志愿者已发起」的待办解绑单 */
    l2RequestList: [],
    l2SelectedId: "",
    l2L2Name: "—",
    selectedPairId: "",
    _unbindSource: "local",
    pairInfo: {
      partnerName: "",
      subject: "",
      startDate: "",
      status: "结对中",
      studentName: ""
    },
    reason: "",
    activeRequest: null,
    l2Name: "—",
    l2Phone: ""
  },
  onShow() {
    checkOnboardingOrRedirect("pages/match/unbind/index");
    mergeFromStorageIntoApp();
    const app = getApp();
    const r = app.globalData.role || "";
    const u = app.globalData.userInfo || {};
    if (r === "admin_level_1") {
      wx.showToast({ title: "平台运营不经过结对解绑，请用预警/管理侧", icon: "none" });
      setTimeout(function () {
        wx.navigateBack({ fail: function () { wx.switchTab({ url: "/pages/match/center/index" }); } });
      }, 200);
      return;
    }
    if (r === "admin_level_2") {
      const prof = (u && u.phone && getByPhone(String(u.phone))) || u || {};
      if (prof.l2Scope === "volunteer_side") {
        wx.showToast({ title: "支教方无此功能", icon: "none" });
        setTimeout(function () {
          wx.switchTab({ url: "/pages/common/workbench/index" });
        }, 400);
        return;
      }
    }
    if (r && r !== "student" && r !== "teacher" && r !== "admin_level_2") {
      wx.showToast({ title: "解绑需学员/志愿者/学校老师身份", icon: "none" });
      setTimeout(function () {
        wx.navigateBack({ fail: function () { wx.switchTab({ url: "/pages/match/center/index" }); } });
      }, 200);
      return;
    }
    const prof2 = (u && u.phone && getByPhone(String(u.phone))) || u || {};
    const isL2R = r === "admin_level_2" && prof2.l2Scope === "recipient_side";
    if (isL2R) {
      this._buildL2RecipientView(prof2, r, u);
      return;
    }
    const token = (app.globalData && app.globalData.token) || wx.getStorageSync("token") || "";
    const self = this;
    if (token && (r === "student" || r === "teacher")) {
      matchApi
        .myPairs()
        .then(function (pairs) {
          const pl = pairVosToUnbindList(pairs);
          let selectedPairId = self.data.selectedPairId || "";
          if (!selectedPairId && pl.length) {
            selectedPairId = pl[0].pairId;
          } else if (selectedPairId && !pl.some((x) => x.pairId === selectedPairId)) {
            selectedPairId = (pl[0] && pl[0].pairId) || "";
          }
          self.setData({ _unbindSource: "api" });
          self._applySelectionSt(
            {
              role: r,
              roleName: ROLE_DISPLAY_NAME[r] || "用户",
              canInitiateUnbind: r === "student" || r === "teacher",
              isL2Recipient: false,
              l2RequestList: [],
              l2SelectedId: "",
              pairList: pl
            },
            selectedPairId
          );
        })
        .catch(function () {
          const pairList = buildStudentTeacherPairList(r, u.phone || "");
          let selectedPairId = self.data.selectedPairId || "";
          if (!selectedPairId && pairList && pairList.length) {
            selectedPairId = pairList[0].pairId;
          } else if (selectedPairId && !pairList.some((x) => x.pairId === selectedPairId)) {
            selectedPairId = (pairList[0] && pairList[0].pairId) || "";
          }
          self.setData({ _unbindSource: "local" });
          self._applySelectionSt(
            {
              role: r,
              roleName: ROLE_DISPLAY_NAME[r] || "用户",
              canInitiateUnbind: r === "student" || r === "teacher",
              isL2Recipient: false,
              l2RequestList: [],
              l2SelectedId: "",
              pairList: pairList
            },
            selectedPairId
          );
        });
      return;
    }
    const pairList = buildStudentTeacherPairList(r, u.phone || "");
    let selectedPairId = this.data.selectedPairId || "";
    if (!selectedPairId && pairList && pairList.length) {
      selectedPairId = pairList[0].pairId;
    } else if (selectedPairId && !pairList.some((x) => x.pairId === selectedPairId)) {
      selectedPairId = (pairList[0] && pairList[0].pairId) || "";
    }
    this.setData({ _unbindSource: "local" });
    this._applySelectionSt(
      {
        role: r,
        roleName: ROLE_DISPLAY_NAME[r] || "用户",
        canInitiateUnbind: r === "student" || r === "teacher",
        isL2Recipient: false,
        l2RequestList: [],
        l2SelectedId: "",
        pairList: pairList
      },
      selectedPairId
    );
  },
  _buildL2RecipientView(prof, role, u) {
    const l2ListRaw = getUnbindListForRecipientL2(prof);
    const l2List = l2ListRaw.map((x) => ({
      ...x,
      _createdAtText: formatCreatedAt(x.createdAt)
    }));
    let sel = this.data.l2SelectedId || "";
    if (sel && !l2List.some((q) => q.id === sel)) {
      sel = "";
    }
    this._applyL2RequestSelection(
      {
        role: role,
        roleName: ROLE_DISPLAY_NAME[role] || "用户",
        canInitiateUnbind: false,
        isL2Recipient: true,
        l2RequestList: l2List,
        l2SelectedId: sel,
        pairList: []
      },
      sel
    );
  },
  onSelectL2Request(e) {
    const id = (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.rid) || "";
    if (!id) {
      return;
    }
    this.setData({ l2SelectedId: id });
    this._applyL2RequestSelection({ l2SelectedId: id }, id);
  },
  _applyL2RequestSelection(mergeData, selectedId) {
    const next = { ...(mergeData || {}) };
    if (selectedId) {
      next.l2SelectedId = selectedId;
    }
    const sid = String(next.l2SelectedId || this.data.l2SelectedId || "");
    const l2List = next.l2RequestList != null ? next.l2RequestList : this.data.l2RequestList;
    const req0 = sid ? l2List.find((x) => x && x.id === sid) : null;
    const req = req0 || (sid ? getUnbindById(sid) : null);
    const pairId = req && req.pairId;
    const p = (pairId && getPairById(String(pairId))) || null;
    const schoolId = p && p.schoolId;
    const l2Phone = getRecipientL2ForSchool(schoolId) || (req && req.l2UserId) || "";
    const isPending = req && req.status === "pending_approval";
    const ar =
      isPending && req
        ? {
            ...req,
            applicantPhoneTail: req.applicantPhone ? String(req.applicantPhone).slice(-4) : "",
            _createdAtText: (req && req._createdAtText) != null && req._createdAtText !== "" ? req._createdAtText : formatCreatedAt(req.createdAt)
          }
        : null;
    const app = getApp();
    const u = (app && app.globalData && app.globalData.userInfo) || {};
    const isCurrentL2 = l2Phone && u.phone && String(l2Phone) === String(u.phone);
    this.setData({
      ...next,
      selectedPairId: pairId || "",
      pairInfo: p
        ? {
            studentName: p.studentName,
            partnerName: p.partnerName,
            subject: p.subject,
            startDate: p.startDate,
            status: p.status
          }
        : {
            studentName: "",
            partnerName: "",
            subject: "",
            startDate: "",
            status: "—"
          },
      activeRequest: ar,
      l2Phone: l2Phone,
      l2Name: l2Phone ? (isCurrentL2 ? "我（本账号）" : "对口受援方老师（尾号 " + String(l2Phone).slice(-4) + "）") : "未配置对口"
    });
  },
  onSelectPair(e) {
    const id = (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.pairid) || "";
    if (!id) {
      return;
    }
    this._applySelectionSt({}, id);
  },
  _applySelectionSt(mergeData, selectedPairId) {
    if (this.data._unbindSource === "api") {
      this._applySelectionApi(mergeData, selectedPairId);
      return;
    }
    const next = { ...(mergeData || {}) };
    if (selectedPairId) {
      next.selectedPairId = selectedPairId;
    } else if (next.selectedPairId == null) {
      next.selectedPairId = this.data.selectedPairId;
    }
    const sid = String(next.selectedPairId || this.data.selectedPairId || "");
    const p = (sid && getPairById(sid)) || getActivePair();
    const schoolId = p.schoolId;
    const l2Phone = getRecipientL2ForSchool(schoolId) || "";
    const rawU = getLatestPendingUnbind(sid);
    const activeU =
      rawU && rawU.status === "pending_approval"
        ? {
            ...rawU,
            applicantPhoneTail: rawU.applicantPhone ? String(rawU.applicantPhone).slice(-4) : "",
            initiatorLabel:
              rawU.initiatorLabel ||
              (rawU.fromRole === "teacher" ? "志愿者 " + (rawU.partnerName || "（未知）") : "学员 " + (rawU.studentName || "（未知）")),
            _createdAtText: formatCreatedAt(rawU.createdAt)
          }
        : null;
    this.setData({
      ...next,
      pairInfo: {
        studentName: p.studentName,
        partnerName: p.partnerName,
        subject: p.subject,
        startDate: p.startDate,
        status: p.status
      },
      schoolId: schoolId,
      activeRequest: activeU,
      l2Phone: l2Phone,
      l2Name: l2Phone ? "学校老师（" + l2Phone.slice(-4) + "）" : "无对口 / 本端可略"
    });
  },
  _applySelectionApi(mergeData, selectedPairId) {
    const self = this;
    const next = { ...(mergeData || {}) };
    if (selectedPairId) {
      next.selectedPairId = selectedPairId;
    } else if (next.selectedPairId == null) {
      next.selectedPairId = this.data.selectedPairId;
    }
    const sid = String(next.selectedPairId || this.data.selectedPairId || "");
    const pl = (mergeData && mergeData.pairList) != null ? mergeData.pairList : this.data.pairList;
    const row = (pl || []).find(function (x) {
      return x && String(x.pairId) === sid;
    });
    const p = row || {};
    const pairInfo = {
      studentName: p._studentId != null ? "学员（ID " + p._studentId + "）" : "—",
      partnerName: p._teacherId != null ? "志愿者（ID " + p._teacherId + "）" : "—",
      subject: "—",
      startDate: "—",
      status: p.status != null ? p.status : "—"
    };
    const app = getApp();
    const u = (app && app.globalData && app.globalData.userInfo) || {};
    this.setData({
      ...next,
      selectedPairId: sid,
      pairInfo: pairInfo,
      schoolId: p.schoolId,
      l2Phone: "",
      l2Name: "（远程）",
      activeRequest: null
    });
    const pid = parseInt(sid, 10);
    if (isNaN(pid) || pid <= 0) {
      return;
    }
    matchApi
      .unbindProgress(pid)
      .then(function (prog) {
        if (prog && (prog.matchStatus === 3 || prog.matchStatus === 5)) {
          const ar = unbindProgressToActiveRequest(prog, {
            studentId: p._studentId,
            teacherId: p._teacherId
          });
          self.setData({ activeRequest: ar });
        } else {
          self.setData({ activeRequest: null });
        }
      })
      .catch(function () {
        self.setData({ activeRequest: null });
      });
  },
  onReasonInput(e) {
    this.setData({ reason: (e && e.detail && e.detail.value) || "" });
  },
  onSubmitApply() {
    const r = this.data.role;
    if (r !== "student" && r !== "teacher") {
      wx.showToast({ title: "仅学员或志愿者可发起解绑", icon: "none" });
      return;
    }
    if (!this.data.selectedPairId) {
      wx.showToast({ title: "请先在上方选择一条结对", icon: "none" });
      return;
    }
    if (!this.data.reason.trim()) {
      wx.showToast({ title: "请填写解绑原因", icon: "none" });
      return;
    }
    const self = this;
    if (this.data._unbindSource === "api") {
      const row = (this.data.pairList || []).find(function (x) {
        return x && String(x.pairId) === String(self.data.selectedPairId);
      });
      if (!row) {
        wx.showToast({ title: "数据异常", icon: "none" });
        return;
      }
      if (Number(row.matchStatus) === 3) {
        wx.showToast({ title: "该结对已在解绑流程中", icon: "none" });
        return;
      }
      if (Number(row.matchStatus) !== 1) {
        wx.showToast({ title: "仅生效中的结对可发起解绑", icon: "none" });
        return;
      }
      const pid = parseInt(self.data.selectedPairId, 10);
      wx.showLoading({ title: "提交中", mask: true });
      matchApi
        .unbindRequest(pid)
        .then(function () {
          wx.hideLoading();
          self.setData({ reason: "" });
          wx.showToast({ title: "已提交解绑", icon: "success" });
          self.onShow();
        })
        .catch(function (e) {
          wx.hideLoading();
          wx.showModal({
            title: "提交失败",
            content: (e && e.message) || "请稍后重试",
            showCancel: false
          });
        });
      return;
    }
    const app = getApp();
    const u = (app && app.globalData && app.globalData.userInfo) || {};
    const cur = getPairById(this.data.selectedPairId) || getActivePair();
    if (cur.status === "已解绑") {
      wx.showToast({ title: "该结对已解绑", icon: "none" });
      return;
    }
    if (getLatestPendingUnbind(this.data.selectedPairId)) {
      wx.showToast({ title: "该结对已有一条在途解绑，请先完成或等对方处理", icon: "none" });
      return;
    }
    createUnbindRequest({
      reason: this.data.reason,
      fromRole: this.data.role,
      pairId: this.data.selectedPairId,
      applicantPhone: u.phone || ""
    });
    this.setData({ reason: "" });
    wx.showToast({ title: "已提交解绑", icon: "success" });
    this.onShow();
  },
  onMyAgree() {
    this._agree("student");
  },
  onMyAgreeTeacher() {
    this._agree("teacher");
  },
  onMyAgreeL2() {
    this._agree("l2");
  },
  onRejectUnbind() {
    if (this.data._unbindSource === "api" && this.data.activeRequest && (this.data.role === "student" || this.data.role === "teacher")) {
      const pairId = parseInt(this.data.selectedPairId, 10);
      const r = this.data.role;
      const roleStr = r === "student" ? "STUDENT" : "TEACHER";
      const self = this;
      wx.showLoading({ title: "处理中", mask: true });
      matchApi
        .unbindConfirm(pairId, {
          action: "reject",
          role: roleStr,
          rejectReason: "有异议/暂不同意（小程序）"
        })
        .then(function () {
          wx.hideLoading();
          wx.showToast({ title: "已记录", icon: "none" });
          self.onShow();
        })
        .catch(function (e) {
          wx.hideLoading();
          wx.showToast({ title: (e && e.message) || "失败", icon: "none" });
        });
      return;
    }
    const re = this.data.activeRequest;
    if (!re || !re.id) {
      return;
    }
    rejectUnbind(re.id);
    this.setData({ l2SelectedId: "" });
    wx.showToast({ title: "已暂不同意/关闭", icon: "none" });
    this.onShow();
  },
  _agree(party) {
    const app = getApp();
    const r = this.data.role;
    if (this.data._unbindSource === "api" && (party === "student" || party === "teacher")) {
      if (party === "student" && r !== "student") {
        wx.showToast({ title: "请用学员端确认", icon: "none" });
        return;
      }
      if (party === "teacher" && r !== "teacher") {
        wx.showToast({ title: "请用志愿者端确认", icon: "none" });
        return;
      }
      const pairId = parseInt(this.data.selectedPairId, 10);
      if (isNaN(pairId)) {
        return;
      }
      const roleStr = r === "student" ? "STUDENT" : "TEACHER";
      const self = this;
      wx.showLoading({ title: "处理中", mask: true });
      matchApi
        .unbindConfirm(pairId, { action: "accept", role: roleStr })
        .then(function () {
          wx.hideLoading();
          wx.showToast({ title: "已记录你的确认", icon: "success" });
          self.onShow();
        })
        .catch(function (e) {
          wx.hideLoading();
          wx.showToast({ title: (e && e.message) || "失败", icon: "none" });
        });
      return;
    }
    if (party === "student" && r !== "student") {
      wx.showToast({ title: "请用学员端确认", icon: "none" });
      return;
    }
    if (party === "teacher" && r !== "teacher") {
      wx.showToast({ title: "请用志愿者端确认", icon: "none" });
      return;
    }
    if (party === "l2" && r !== "admin_level_2") {
      wx.showToast({ title: "请用学校老师（受援方）确认", icon: "none" });
      return;
    }
    const u = app.globalData.userInfo || {};
    const pairId = this.data.selectedPairId;
    let toUse = pairId ? getLatestPendingUnbind(pairId) : null;
    if (this.data.isL2Recipient && this.data.l2SelectedId) {
      toUse = getUnbindById(this.data.l2SelectedId) || toUse;
    }
    if (!toUse && this.data.activeRequest && this.data.activeRequest.status === "pending_approval") {
      toUse = this.data.activeRequest;
    }
    if (!toUse) {
      wx.showToast({ title: "暂无解绑待办，请先选择一条", icon: "none" });
      return;
    }
    if (toUse.pairId && pairId && toUse.pairId !== pairId) {
      this.setData({ selectedPairId: toUse.pairId, activeRequest: toUse });
    }
    const res = recordUnbindAgree(toUse.id, party, u.phone, r);
    if (!res.ok) {
      wx.showToast({ title: res.message, icon: "none" });
      return;
    }
    const sid = toUse.pairId || pairId;
    this.setData({ activeRequest: getLatestPendingUnbind(sid) || res.item });
    if (res.allAgreed) {
      wx.showModal({
        title: "解绑完成",
        content: "该结对上学生、志愿者与受援方老师已确认。",
        showCancel: false
      });
    } else {
      wx.showToast({ title: "已记录你的确认", icon: "success" });
    }
    this.onShow();
  }
});
