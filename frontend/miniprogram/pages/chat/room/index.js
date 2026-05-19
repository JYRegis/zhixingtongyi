const { getL1ThreadTitleLine, isRecipientL2ObserverAllowed, isVolunteerL2ObserverAllowed } = require("../../../utils/chatPartners");
const { ROLE_DISPLAY_NAME } = require("../../../utils/roleLabels");
const { checkOnboardingOrRedirect } = require("../../../utils/onboardingGuard");
const { getByPhone, mergeFromStorageIntoApp } = require("../../../utils/userProfileStore");
const { chatApi } = require("../../../utils/api");
const { markPairSeen } = require("../../../utils/chatReadStore");
const stompClient = require("../../../utils/stompClient");
const notificationCenter = require("../../../utils/notificationCenter");

function isRemotePairId(value) { return /^\d+$/.test(String(value || "")); }
function formatRemoteTime(v) { const t = Date.parse(String(v || "").replace(" ", "T")); if (isNaN(t)) return String(v || ""); const d = new Date(t); const z = (n) => (n < 10 ? "0" : "") + n; return z(d.getHours()) + ":" + z(d.getMinutes()); }
function mapRemoteMessage(row, selfUserId, participants, participantRoles) {
  const sid = String(row.senderId || "");
  const self = String(selfUserId || "");
  const isSelf = sid !== "" && self !== "" && sid === self;
  // 优先使用后端返回的 senderName，其次用 participants 映射，最后兜底
  var fromLabel = isSelf ? "我" : "对方";
  if (row.senderName) {
    fromLabel = isSelf ? "我" : row.senderName;
  } else if (participants && participants[sid]) {
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
  onShow() { checkOnboardingOrRedirect("pages/chat/room/index"); mergeFromStorageIntoApp(); const app = getApp(); const userInfo = app.globalData.userInfo || {}; const role = ((app.globalData && app.globalData.role) || "").trim(); const nickname = (userInfo.nickname || "").trim(); const isAdmin = role === "admin_level_1" || role === "admin_level_2"; this.setData({ role, roleName: ROLE_DISPLAY_NAME[role] || "学员", myAvatarUrl: (userInfo.avatarUrl || "").trim(), myAvatarChar: nickname ? nickname.charAt(0) : "我", l1ViewOnly: isAdmin }); if (this.partnerId) { this.reloadMessages(); this._connectWebSocket(); } },
  onHide() { this._disconnectWebSocket(); },
  onUnload() { this._disconnectWebSocket(); },
  _connectWebSocket() {
    try {
      const app0 = getApp();
      const token = (app0.globalData && app0.globalData.token) || wx.getStorageSync("token") || "";
      const role0 = ((app0.globalData && app0.globalData.role) || "").trim();
      if (!token || role0 === "admin_level_1" || role0 === "admin_level_2") return;
      if (stompClient.isConnected()) return;
      const self = this;
      stompClient.connect(token, function () {
        self._chatSubId = stompClient.subscribe("/user/queue/chat", function (msg) {
          if (msg && String(msg.matchPairId) === String(self.partnerId)) {
            const app1 = getApp();
            const u1 = (app1.globalData && app1.globalData.userInfo) || {};
            const selfUserId = String(u1.backendUserId || u1.id || u1.userId || "");
            const mapped = mapRemoteMessage(msg, selfUserId, self._participants || {}, self._participantRoles || {});
            const next = self.data.messages.concat(mapped);
            self.setData({ messages: next, scrollInto: "msg-" + mapped.id });
            // 当前正在房间内查看，视为即时已读：刷新本地 seen + Tab 徽标
            try { markPairSeen(self.partnerId); } catch (_) {}
            // 对方新消息立即调 read，避免出现 Tab "+1" 再消失的闪烁
            if (msg && msg.id && String(msg.senderId || "") !== selfUserId) {
              chatApi.read(msg.id)
                .then(function () { try { notificationCenter.refreshChatUnread(); } catch (_) {} })
                .catch(function () { try { notificationCenter.refreshChatUnread(); } catch (_) {} });
            } else {
              try { notificationCenter.refreshChatUnread(); } catch (_) {}
            }
          }
        });
      });
    } catch (e) {
      if (console && console.warn) console.warn("[chat-room] WebSocket connect failed, using REST only", e);
    }
  },
  _disconnectWebSocket() {
    try {
      if (this._chatSubId) {
        stompClient.unsubscribe(this._chatSubId);
        this._chatSubId = null;
      }
      stompClient.disconnect();
    } catch (e) {}
  },
  reloadMessages() { if (!this.partnerId) return; const app0 = getApp(); const u0 = (app0.globalData && app0.globalData.userInfo) || {}; const role0 = ((app0.globalData && app0.globalData.role) || "").trim(); const isAdmin = role0 === "admin_level_1" || role0 === "admin_level_2"; const token = (app0.globalData && app0.globalData.token) || wx.getStorageSync("token") || ""; const selfUserId = (u0 && (u0.backendUserId || u0.id || u0.userId)) || ""; const participants = this._participants || {}; const participantRoles = this._participantRoles || {}; if (token && isRemotePairId(this.partnerId)) { chatApi.messages({ matchPairId: Number(this.partnerId), limit: 50 }).then((rows) => { const messages = (Array.isArray(rows) ? rows : []).slice().reverse().map((row) => mapRemoteMessage(row, selfUserId, participants, participantRoles)); const last = messages.length ? messages[messages.length - 1] : null; this.setData({ l1ViewOnly: isAdmin, messages, scrollInto: last ? `msg-${last.id}` : "" }); this._markAllRead(rows, selfUserId, isAdmin); }).catch(() => { this.setData({ l1ViewOnly: isAdmin, messages: [], scrollInto: "" }); }); return; } this.setData({ l1ViewOnly: isAdmin, messages: [], scrollInto: "" }); },
  /**
   * 进入聊天室时把对方发来的未读消息逐条调用 `chatApi.read`，并在本地写入 seen 时间戳，
   * 让聊天列表立刻清掉红圈数。
   */
  _markAllRead(rows, selfUserId, isAdmin) {
    // 无论身份都先记 seen，列表会乐观清零未读红圈
    try { markPairSeen(this.partnerId); } catch (_) {}
    // 立即刷新一次 Tab 徽标：进入聊天室即视为已读，让 Tab 立刻反映
    try { notificationCenter.refreshChatUnread(); } catch (_) {}
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
    let pending = unreadByOthers.length;
    const done = function () {
      pending--;
      if (pending === 0) {
        // 后端标记完成后再刷一次，确保数据回写后 Tab 也同步
        try { notificationCenter.refreshChatUnread(); } catch (_) {}
      }
    };
    unreadByOthers.forEach(function (r) {
      chatApi.read(r.id).then(done).catch(done);
    });
  },
  onInputFocus() { this.setData({ inputFocused: true }); },
  onInputBlur() { this.setData({ inputFocused: false }); },
  onInput(e) { const message = e.detail.value; this.setData({ message, canSend: !!message.trim() }); },
  onSend() { if (this.data.l1ViewOnly) { wx.showToast({ title: "本会话中不可发消息", icon: "none" }); return; } const text = this.data.message.trim(); if (!text || !this.partnerId) return; const app = getApp(); const role = (app.globalData && app.globalData.role) || ""; const token = (app.globalData && app.globalData.token) || wx.getStorageSync("token") || ""; const userInfo = (app.globalData && app.globalData.userInfo) || {}; const selfUserId = userInfo.backendUserId || userInfo.id || userInfo.userId || ""; if (token && (role === "student" || role === "teacher") && isRemotePairId(this.partnerId)) { const payload = { matchPairId: Number(this.partnerId), messageType: "TEXT", content: text }; if (stompClient.isConnected()) { stompClient.send("/app/chat.send", payload); const optimistic = mapRemoteMessage({ id: "tmp_" + Date.now(), matchPairId: Number(this.partnerId), senderId: Number(selfUserId), content: text, sendTime: new Date().toISOString(), messageType: 0 }, selfUserId, this._participants || {}, this._participantRoles || {}); const next = this.data.messages.concat(optimistic); this.setData({ messages: next, message: "", canSend: false, scrollInto: "msg-" + optimistic.id }); } else { chatApi.sendMessage(payload).then((row) => { const one = mapRemoteMessage(row || {}, selfUserId); const next = this.data.messages.concat(one); this.setData({ messages: next, message: "", canSend: false, scrollInto: `msg-${one.id}` }); }).catch((err) => { wx.showToast({ title: (err && err.message) || "发送失败", icon: "none" }); }); } return; } wx.showToast({ title: "当前仅支持后端会话发送", icon: "none" }); },
  onMockImage() {
    const self = this;
    if (this.data.l1ViewOnly) { wx.showToast({ title: "本会话中不可发消息", icon: "none" }); return; }
    const { chooseAndUploadImages } = require("../../../utils/ossUpload");
    chooseAndUploadImages({ businessType: "CHAT_IMAGE", count: 1 }).then(function (urls) {
      if (!urls || !urls.length) return;
      const imageUrl = urls[0];
      const app = getApp();
      const token = (app.globalData && app.globalData.token) || wx.getStorageSync("token") || "";
      const userInfo = (app.globalData && app.globalData.userInfo) || {};
      const selfUserId = userInfo.backendUserId || userInfo.id || userInfo.userId || "";
      if (!token || !self.partnerId) return;
      const payload = { matchPairId: Number(self.partnerId), messageType: "IMAGE", content: imageUrl };
      chatApi.sendMessage(payload).then(function (row) {
        const one = mapRemoteMessage(row || { id: "img_" + Date.now(), senderId: Number(selfUserId), content: imageUrl, sendTime: new Date().toISOString(), messageType: 1 }, selfUserId, self._participants || {}, self._participantRoles || {});
        const next = self.data.messages.concat(one);
        self.setData({ messages: next, scrollInto: "msg-" + one.id });
      }).catch(function (err) {
        wx.showToast({ title: (err && err.message) || "发送失败", icon: "none" });
      });
    }).catch(function (err) {
      if (err && err.message === "用户取消") return;
      wx.showToast({ title: (err && err.message) || "上传失败", icon: "none" });
    });
  },
  onMockVoice() { },
  onMoreAction() {
    const self = this;
    if (this.data.l1ViewOnly) { wx.showToast({ title: "本会话中不可发消息", icon: "none" }); return; }
    wx.showActionSheet({
      itemList: ["拍照", "相册", "文件"],
      success: function (res) {
        if (res.tapIndex === 0) {
          // 拍照
          const { chooseAndUploadImages } = require("../../../utils/ossUpload");
          chooseAndUploadImages({ businessType: "CHAT_IMAGE", count: 1, sourceType: ["camera"] }).then(function (urls) {
            if (!urls || !urls.length) return;
            self._sendFileMessage(urls[0], "IMAGE");
          }).catch(function (err) {
            if (err && err.message === "用户取消") return;
            wx.showToast({ title: (err && err.message) || "上传失败", icon: "none" });
          });
        } else if (res.tapIndex === 1) {
          // 相册
          const { chooseAndUploadImages } = require("../../../utils/ossUpload");
          chooseAndUploadImages({ businessType: "CHAT_IMAGE", count: 9, sourceType: ["album"] }).then(function (urls) {
            if (!urls || !urls.length) return;
            // 逐张发送
            urls.forEach(function (url) { self._sendFileMessage(url, "IMAGE"); });
          }).catch(function (err) {
            if (err && err.message === "用户取消") return;
            wx.showToast({ title: (err && err.message) || "上传失败", icon: "none" });
          });
        } else if (res.tapIndex === 2) {
          // 文件
          const { chooseAndUploadFiles } = require("../../../utils/ossUpload");
          chooseAndUploadFiles({ businessType: "CHAT_IMAGE", count: 1 }).then(function (urls) {
            if (!urls || !urls.length) return;
            self._sendFileMessage(urls[0], "FILE");
          }).catch(function (err) {
            if (err && err.message === "用户取消") return;
            wx.showToast({ title: (err && err.message) || "上传失败", icon: "none" });
          });
        }
      }
    });
  },
  _sendFileMessage(url, type) {
    const app = getApp();
    const token = (app.globalData && app.globalData.token) || wx.getStorageSync("token") || "";
    const userInfo = (app.globalData && app.globalData.userInfo) || {};
    const selfUserId = userInfo.backendUserId || userInfo.id || userInfo.userId || "";
    if (!token || !this.partnerId) return;
    const payload = { matchPairId: Number(this.partnerId), messageType: type, content: url };
    const self = this;
    chatApi.sendMessage(payload).then(function (row) {
      const one = mapRemoteMessage(row || { id: "file_" + Date.now(), senderId: Number(selfUserId), content: url, sendTime: new Date().toISOString() }, selfUserId, self._participants || {}, self._participantRoles || {});
      const next = self.data.messages.concat(one);
      self.setData({ messages: next, scrollInto: "msg-" + one.id });
    }).catch(function (err) {
      wx.showToast({ title: (err && err.message) || "发送失败", icon: "none" });
    });
  }
});
