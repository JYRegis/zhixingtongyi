const { getL1ThreadTitleLine, isRecipientL2ObserverAllowed, isVolunteerL2ObserverAllowed } = require("../../../utils/chatPartners");
const { ROLE_DISPLAY_NAME } = require("../../../utils/roleLabels");
const { checkOnboardingOrRedirect } = require("../../../utils/onboardingGuard");
const { getByPhone, mergeFromStorageIntoApp } = require("../../../utils/userProfileStore");
const { chatApi } = require("../../../utils/api");
const { markPairSeen } = require("../../../utils/chatReadStore");

function isRemotePairId(value) { return /^\d+$/.test(String(value || "")); }
function formatRemoteTime(v) { const t = Date.parse(String(v || "").replace(" ", "T")); if (isNaN(t)) return String(v || ""); const d = new Date(t); const z = (n) => (n < 10 ? "0" : "") + n; return z(d.getHours()) + ":" + z(d.getMinutes()); }
function mapRemoteMessage(row, selfUserId, participants, participantRoles) {
  const sid = String(row.senderId || "");
  const self = String(selfUserId || "");
  const isSelf = sid !== "" && self !== "" && sid === self;
  // 如果有参与者信息，用姓名显示；否则用 我/对方
  var fromLabel = isSelf ? "我" : "对方";
  if (participants && participants[sid]) {
    fromLabel = participants[sid];
  }
  // 管理员视角下用于区分学员/志愿者气泡
  const senderRole = participantRoles && participantRoles[sid];
  const l1IsStudent = senderRole === 3;
  const partyLabel = senderRole === 3 ? "学员" : senderRole === 2 ? "志愿者" : senderRole === 1 ? "管理员" : "";
  return {
    id: row.id,
    from: fromLabel,
    text: row.content || "",
    time: formatRemoteTime(row.sendTime),
    isSelf,
    avatarChar: fromLabel.charAt(0) || "聊",
    l1IsStudent,
    partyLabel
  };
}

Page({
  data: { partnerId: "", partnerName: "", role: "", roleName: "", myAvatarUrl: "", myAvatarChar: "我", inputFocused: false, message: "", canSend: false, l1ViewOnly: false, messages: [], scrollInto: "" },
  onLoad(query) { const partnerId = (query.partnerId || "").trim(); const rawName = query.partnerName || ""; const partnerName = rawName ? decodeURIComponent(rawName) : "聊天"; if (!partnerId) { wx.showToast({ title: "请从列表选择联系人", icon: "none" }); setTimeout(() => wx.switchTab({ url: "/pages/chat/list/index" }), 600); return; } this.partnerId = partnerId; this._participants = {}; this._participantRoles = {}; mergeFromStorageIntoApp(); const app0 = getApp(); const u0 = (app0.globalData && app0.globalData.userInfo) || {}; const r0 = ((app0.globalData && app0.globalData.role) || "").trim(); const selfUserId = String(u0.backendUserId || u0.id || u0.userId || ""); if (selfUserId) this._participants[selfUserId] = "我"; const token = (app0.globalData && app0.globalData.token) || wx.getStorageSync("token") || ""; if (token && isRemotePairId(partnerId)) { chatApi.participants(partnerId).then((list) => { (Array.isArray(list) ? list : []).forEach((p) => { if (!p || !p.userId) return; const uid = String(p.userId); this._participantRoles[uid] = p.participantRole; if (uid !== selfUserId) { this._participants[uid] = p.realName || p.username || (p.participantRole === 3 ? "学员" : p.participantRole === 2 ? "志愿者" : "管理员"); } }); this.reloadMessages(); }).catch(() => { this.reloadMessages(); }); } else { this.reloadMessages(); } wx.setNavigationBarTitle({ title: partnerName }); this.setData({ partnerId, partnerName }); },
  onShow() { checkOnboardingOrRedirect("pages/chat/room/index"); mergeFromStorageIntoApp(); const app = getApp(); const userInfo = app.globalData.userInfo || {}; const role = ((app.globalData && app.globalData.role) || "").trim(); const nickname = (userInfo.nickname || "").trim(); const isAdmin = role === "admin_level_1" || role === "admin_level_2"; this.setData({ role, roleName: ROLE_DISPLAY_NAME[role] || "学员", myAvatarUrl: (userInfo.avatarUrl || "").trim(), myAvatarChar: nickname ? nickname.charAt(0) : "我", l1ViewOnly: isAdmin }); if (this.partnerId) { this.reloadMessages(); } },
  reloadMessages() { if (!this.partnerId) return; const app0 = getApp(); const u0 = (app0.globalData && app0.globalData.userInfo) || {}; const role0 = ((app0.globalData && app0.globalData.role) || "").trim(); const isAdmin = role0 === "admin_level_1" || role0 === "admin_level_2"; const token = (app0.globalData && app0.globalData.token) || wx.getStorageSync("token") || ""; const selfUserId = (u0 && (u0.backendUserId || u0.id || u0.userId)) || ""; const participants = this._participants || {}; const participantRoles = this._participantRoles || {}; if (token && isRemotePairId(this.partnerId)) { chatApi.messages({ matchPairId: Number(this.partnerId), limit: 50 }).then((rows) => { const messages = (Array.isArray(rows) ? rows : []).slice().reverse().map((row) => mapRemoteMessage(row, selfUserId, participants, participantRoles)); const last = messages.length ? messages[messages.length - 1] : null; this.setData({ l1ViewOnly: isAdmin, messages, scrollInto: last ? `msg-${last.id}` : "" }); this._markAllRead(rows, selfUserId, isAdmin); }).catch(() => { this.setData({ l1ViewOnly: isAdmin, messages: [], scrollInto: "" }); }); return; } this.setData({ l1ViewOnly: isAdmin, messages: [], scrollInto: "" }); },
  /**
   * 进入聊天室时把对方发来的未读消息逐条调用 `chatApi.read`，并在本地写入 seen 时间戳，
   * 让聊天列表立刻清掉红圈数。
   */
  _markAllRead(rows, selfUserId, isAdmin) {
    // 无论身份都先记 seen，列表会乐观清零未读红圈
    try { markPairSeen(this.partnerId); } catch (_) {}
    if (isAdmin) return; // 管理员通常不是会话参与者，markRead 会被后端拒绝
    if (!Array.isArray(rows) || !rows.length) return;
    const self = String(selfUserId || "");
    const unreadByOthers = rows.filter(function (r) {
      if (!r || !r.id) return false;
      if (String(r.senderId || "") === self) return false; // 自己发的不需要标记
      const readTime = r.readTime != null ? r.readTime : r.read_time;
      return readTime == null || readTime === "";
    });
    if (!unreadByOthers.length) return;
    unreadByOthers.forEach(function (r) {
      chatApi.read(r.id).catch(function () {}); // 静默失败：列表会在下次拉取时获得真实未读数
    });
  },
  onInputFocus() { this.setData({ inputFocused: true }); },
  onInputBlur() { this.setData({ inputFocused: false }); },
  onInput(e) { const message = e.detail.value; this.setData({ message, canSend: !!message.trim() }); },
  onSend() { if (this.data.l1ViewOnly) { wx.showToast({ title: "本会话中不可发消息", icon: "none" }); return; } const text = this.data.message.trim(); if (!text || !this.partnerId) return; const app = getApp(); const role = (app.globalData && app.globalData.role) || ""; const token = (app.globalData && app.globalData.token) || wx.getStorageSync("token") || ""; const userInfo = (app.globalData && app.globalData.userInfo) || {}; const selfUserId = userInfo.backendUserId || userInfo.id || userInfo.userId || ""; if (token && (role === "student" || role === "teacher") && isRemotePairId(this.partnerId)) { chatApi.sendMessage({ matchPairId: Number(this.partnerId), messageType: "TEXT", content: text }).then((row) => { const one = mapRemoteMessage(row || {}, selfUserId); const next = this.data.messages.concat(one); this.setData({ messages: next, message: "", canSend: false, scrollInto: `msg-${one.id}` }); }).catch((err) => { wx.showToast({ title: (err && err.message) || "发送失败", icon: "none" }); }); return; } wx.showToast({ title: "当前仅支持后端会话发送", icon: "none" }); },
  onMockImage() { wx.showToast({ title: "图片功能即将上线", icon: "none" }); },
  onMockVoice() { wx.showToast({ title: "语音功能即将上线", icon: "none" }); },
  onMoreAction() { wx.showActionSheet({ itemList: ["拍照", "相册", "文件"], success: function () { wx.showToast({ title: "更多功能即将上线", icon: "none" }); } }); }
});
