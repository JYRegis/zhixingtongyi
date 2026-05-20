const { getL1ThreadTitleLine, isRecipientL2ObserverAllowed, isVolunteerL2ObserverAllowed } = require("../../../utils/chatPartners");
const { ROLE_DISPLAY_NAME } = require("../../../utils/roleLabels");
const { checkOnboardingOrRedirect } = require("../../../utils/onboardingGuard");
const { getByPhone, mergeFromStorageIntoApp } = require("../../../utils/userProfileStore");
const { chatApi } = require("../../../utils/api");
const { markPairSeen } = require("../../../utils/chatReadStore");
const stompClient = require("../../../utils/stompClient");
const notificationCenter = require("../../../utils/notificationCenter");

function isRemotePairId(value) { return /^\d+$/.test(String(value || "")); }
function formatRemoteTime(v) { const t = Date.parse(String(v || "").replace(" ", "T")); if (isNaN(t)) return String(v || ""); const d = new Date(t); const now = new Date(); const z = (n) => (n < 10 ? "0" : "") + n; const time = z(d.getHours()) + ":" + z(d.getMinutes()); if (d.toDateString() === now.toDateString()) return time; if (d.getFullYear() === now.getFullYear()) return (d.getMonth() + 1) + "/" + d.getDate() + " " + time; return d.getFullYear() + "/" + (d.getMonth() + 1) + "/" + d.getDate() + " " + time; }
function mapRemoteMessage(row, selfUserId, participants, participantRoles, participantAvatars) {
  const sid = String(row.senderId || "");
  const self = String(selfUserId || "");
  const isSelf = sid !== "" && self !== "" && sid === self;
  var fromLabel = isSelf ? "\u6211" : "\u5bf9\u65b9";
  if (row.senderName) {
    fromLabel = isSelf ? "\u6211" : row.senderName;
  } else if (participants && participants[sid]) {
    fromLabel = participants[sid];
  }
  const senderRole = participantRoles && participantRoles[sid];
  const l1IsStudent = senderRole === 3;
  const partyLabel = senderRole === 3 ? "\u5b66\u5458" : senderRole === 2 ? "\u5fd7\u613f\u8005" : senderRole === 1 ? "\u7ba1\u7406\u5458" : "";
  const avatarUrl = (participantAvatars && participantAvatars[sid]) || "";
  // messageType: 0=TEXT, 1=IMAGE, 2=VOICE；也兼容字符串 "TEXT"/"IMAGE"/"FILE"
  const rawType = row.messageType;
  let isImage = false, isFile = false, isVoice = false;
  if (typeof rawType === "number") {
    isImage = rawType === 1; isVoice = rawType === 2;
  } else if (typeof rawType === "string") {
    const t = rawType.toUpperCase();
    isImage = t === "IMAGE"; isVoice = t === "VOICE"; isFile = t === "FILE";
  }
  const content = row.content || "";
  // 文件名：从 OSS URL 末段提取
  var fileName = "";
  if (isFile) {
    const seg = content.split("/").pop() || "";
    fileName = seg.split("?")[0] || "文件";
  }
  return {
    id: row.id,
    from: fromLabel,
    text: content,
    isImage: isImage,
    isFile: isFile,
    isVoice: isVoice,
    fileName: fileName,
    time: formatRemoteTime(row.sendTime),
    isSelf,
    avatarChar: fromLabel.charAt(0) || "\u804a",
    avatarUrl: avatarUrl,
    l1IsStudent,
    partyLabel
  };
}
Page({
  data: { partnerId: "", partnerName: "", role: "", roleName: "", myAvatarUrl: "", myAvatarChar: "\u6211", inputFocused: false, message: "", canSend: false, l1ViewOnly: false, messages: [], scrollInto: "" },
  onLoad(query) { const partnerId = (query.partnerId || "").trim(); const rawName = query.partnerName || ""; const partnerName = rawName ? decodeURIComponent(rawName) : "\u804a\u5929"; if (!partnerId) { wx.showToast({ title: "\u8bf7\u4ece\u5217\u8868\u9009\u62e9\u8054\u7cfb\u4eba", icon: "none" }); setTimeout(() => wx.switchTab({ url: "/pages/chat/list/index" }), 600); return; } this.partnerId = partnerId; this._participants = {}; this._participantRoles = {}; this._participantAvatars = {}; this._loadedByOnLoad = true; mergeFromStorageIntoApp(); const app0 = getApp(); const u0 = (app0.globalData && app0.globalData.userInfo) || {}; const r0 = ((app0.globalData && app0.globalData.role) || "").trim(); const selfUserId = String(u0.backendUserId || u0.id || u0.userId || ""); if (selfUserId) this._participants[selfUserId] = "\u6211"; const token = (app0.globalData && app0.globalData.token) || wx.getStorageSync("token") || ""; if (token && isRemotePairId(partnerId)) { chatApi.participants(partnerId).then((list) => { (Array.isArray(list) ? list : []).forEach((p) => { if (!p || !p.userId) return; const uid = String(p.userId); this._participantRoles[uid] = p.participantRole; if (p.avatar) this._participantAvatars[uid] = p.avatar; if (uid !== selfUserId) { this._participants[uid] = p.realName || p.username || (p.participantRole === 3 ? "\u5b66\u5458" : p.participantRole === 2 ? "\u5fd7\u613f\u8005" : "\u7ba1\u7406\u5458"); } }); this.reloadMessages(); }).catch(() => { this.reloadMessages(); }); } else { this.reloadMessages(); } wx.setNavigationBarTitle({ title: partnerName }); this.setData({ partnerId, partnerName }); },
  onShow() { checkOnboardingOrRedirect("pages/chat/room/index"); mergeFromStorageIntoApp(); const app = getApp(); const userInfo = app.globalData.userInfo || {}; const role = ((app.globalData && app.globalData.role) || "").trim(); const nickname = (userInfo.nickname || "").trim(); const isAdmin = role === "admin_level_1" || role === "admin_level_2"; this.setData({ role, roleName: ROLE_DISPLAY_NAME[role] || "\u5b66\u5458", myAvatarUrl: (userInfo.avatarUrl || "").trim(), myAvatarChar: nickname ? nickname.charAt(0) : "\u6211", l1ViewOnly: isAdmin }); if (this.partnerId) { if (this._loadedByOnLoad) { this._loadedByOnLoad = false; this._lastShowTs = Date.now(); this._connectWebSocket(); return; } var now = Date.now(); if (!this._lastShowTs || now - this._lastShowTs > 5000) { this._lastShowTs = now; this.reloadMessages(); this._connectWebSocket(); } } },
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
            const mapped = mapRemoteMessage(msg, selfUserId, self._participants || {}, self._participantRoles || {}, self._participantAvatars || {});
            // 鍘婚噸锛氬鏋滄槸鑷繁鍙戠殑娑堟伅涓斿瓨鍦?tmp_ 涔愯娑堟伅锛屾浛鎹㈠畠鑰屼笉鏄拷鍔?            const isSelfMsg = String(msg.senderId || "") === selfUserId;
            const current = self.data.messages || [];
            let next;
            if (isSelfMsg) {
              const tmpIdx = current.findIndex(function (m) {
                return m && typeof m.id === "string" && m.id.indexOf("tmp_") === 0 && m.text === mapped.text;
              });
              if (tmpIdx >= 0) {
                next = current.slice();
                next[tmpIdx] = mapped;
              } else {
                next = current.concat(mapped);
              }
            } else {
              next = current.concat(mapped);
            }
            self.setData({ messages: next, scrollInto: "msg-" + mapped.id });
            // 褰撳墠姝ｅ湪鎴块棿鍐呮煡鐪嬶紝瑙嗕负鍗虫椂宸茶锛氬埛鏂版湰鍦?seen + Tab 寰芥爣
            try { markPairSeen(self.partnerId); } catch (_) {}
            // 瀵规柟鏂版秷鎭珛鍗宠皟 read锛岄伩鍏嶅嚭鐜?Tab "+1" 鍐嶆秷澶辩殑闂儊
            if (msg && msg.id && !isSelfMsg) {
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
  reloadMessages() { if (!this.partnerId) return; const app0 = getApp(); const u0 = (app0.globalData && app0.globalData.userInfo) || {}; const role0 = ((app0.globalData && app0.globalData.role) || "").trim(); const isAdmin = role0 === "admin_level_1" || role0 === "admin_level_2"; const token = (app0.globalData && app0.globalData.token) || wx.getStorageSync("token") || ""; const selfUserId = (u0 && (u0.backendUserId || u0.id || u0.userId)) || ""; const participants = this._participants || {}; const participantRoles = this._participantRoles || {}; if (token && isRemotePairId(this.partnerId)) { chatApi.messages({ matchPairId: Number(this.partnerId), limit: 50 }).then((rows) => { const arr = Array.isArray(rows) ? rows : (rows && (rows.records || rows.list)) || []; const messages = arr.slice().reverse().map((row) => mapRemoteMessage(row, selfUserId, participants, participantRoles, this._participantAvatars || {})); const last = messages.length ? messages[messages.length - 1] : null; this.setData({ l1ViewOnly: isAdmin, messages, scrollInto: last ? `msg-${last.id}` : "" }); this._markAllRead(arr, selfUserId, isAdmin); }).catch((err) => { if (console && console.warn) console.warn("[chat-room] reloadMessages failed", err); if (!this.data.messages || !this.data.messages.length) { this.setData({ l1ViewOnly: isAdmin, messages: [], scrollInto: "" }); } }); return; } this.setData({ l1ViewOnly: isAdmin, messages: [], scrollInto: "" }); },
  /**
   * 杩涘叆鑱婂ぉ瀹ゆ椂鎶婂鏂瑰彂鏉ョ殑鏈娑堟伅閫愭潯璋冪敤 `chatApi.read`锛屽苟鍦ㄦ湰鍦板啓鍏?seen 鏃堕棿鎴筹紝
   * 璁╄亰澶╁垪琛ㄧ珛鍒绘竻鎺夌孩鍦堟暟銆?   */
  _markAllRead(rows, selfUserId, isAdmin) {
    // 鏃犺韬唤閮藉厛璁?seen锛屽垪琛ㄤ細涔愯娓呴浂鏈绾㈠湀
    try { markPairSeen(this.partnerId); } catch (_) {}
    // 绔嬪嵆鍒锋柊涓€娆?Tab 寰芥爣锛氳繘鍏ヨ亰澶╁鍗宠涓哄凡璇伙紝璁?Tab 绔嬪埢鍙嶆槧
    try { notificationCenter.refreshChatUnread(); } catch (_) {}
    if (isAdmin) return; // 绠＄悊鍛橀€氬父涓嶆槸浼氳瘽鍙備笌鑰咃紝markRead 浼氳鍚庣鎷掔粷
    if (!Array.isArray(rows) || !rows.length) return;
    const self = String(selfUserId || "");
    const unreadByOthers = rows.filter(function (r) {
      if (!r || !r.id) return false;
      if (String(r.senderId || "") === self) return false; // 鑷繁鍙戠殑涓嶉渶瑕佹爣璁?      const readTime = r.readTime != null ? r.readTime : r.read_time;
      return readTime == null || readTime === "";
    });
    if (!unreadByOthers.length) return;
    let pending = unreadByOthers.length;
    const done = function () {
      pending--;
      if (pending === 0) {
        // 鍚庣鏍囪瀹屾垚鍚庡啀鍒蜂竴娆★紝纭繚鏁版嵁鍥炲啓鍚?Tab 涔熷悓姝?        try { notificationCenter.refreshChatUnread(); } catch (_) {}
      }
    };
    unreadByOthers.forEach(function (r) {
      chatApi.read(r.id).then(done).catch(done);
    });
  },
  onInputFocus() { this.setData({ inputFocused: true }); },
  onInputBlur() { this.setData({ inputFocused: false }); },
  onInput(e) { const message = e.detail.value; this.setData({ message, canSend: !!message.trim() }); },
  onSend() { if (this.data.l1ViewOnly) { wx.showToast({ title: "\u672c\u4f1a\u8bdd\u4e2d\u4e0d\u53ef\u53d1\u6d88\u606f", icon: "none" }); return; } const text = this.data.message.trim(); if (!text || !this.partnerId) return; const app = getApp(); const role = (app.globalData && app.globalData.role) || ""; const token = (app.globalData && app.globalData.token) || wx.getStorageSync("token") || ""; const userInfo = (app.globalData && app.globalData.userInfo) || {}; const selfUserId = userInfo.backendUserId || userInfo.id || userInfo.userId || ""; if (token && (role === "student" || role === "teacher") && isRemotePairId(this.partnerId)) { const payload = { matchPairId: Number(this.partnerId), messageType: "TEXT", content: text }; if (stompClient.isConnected()) { stompClient.send("/app/chat.send", payload); const optimistic = mapRemoteMessage({ id: "tmp_" + Date.now(), matchPairId: Number(this.partnerId), senderId: Number(selfUserId), content: text, sendTime: new Date().toISOString(), messageType: 0 }, selfUserId, this._participants || {}, this._participantRoles || {}, this._participantAvatars || {}); const next = this.data.messages.concat(optimistic); this.setData({ messages: next, message: "", canSend: false, scrollInto: "msg-" + optimistic.id }); } else { chatApi.sendMessage(payload).then((row) => { const one = mapRemoteMessage(row || {}, selfUserId); const next = this.data.messages.concat(one); this.setData({ messages: next, message: "", canSend: false, scrollInto: `msg-${one.id}` }); }).catch((err) => { wx.showToast({ title: (err && err.message) || "\u53d1\u9001\u5931\u8d25", icon: "none" }); }); } return; } wx.showToast({ title: "\u5f53\u524d\u4ec5\u652f\u6301\u540e\u7aef\u4f1a\u8bdd\u53d1\u9001", icon: "none" }); },
  onMockImage() {
    const self = this;
    if (this.data.l1ViewOnly) { wx.showToast({ title: "\u672c\u4f1a\u8bdd\u4e2d\u4e0d\u53ef\u53d1\u6d88\u606f", icon: "none" }); return; }
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
        const one = mapRemoteMessage(row || { id: "img_" + Date.now(), senderId: Number(selfUserId), content: imageUrl, sendTime: new Date().toISOString(), messageType: 1 }, selfUserId, self._participants || {}, self._participantRoles || {}, self._participantAvatars || {});
        const next = self.data.messages.concat(one);
        self.setData({ messages: next, scrollInto: "msg-" + one.id });
      }).catch(function (err) {
        wx.showToast({ title: (err && err.message) || "\u53d1\u9001\u5931\u8d25", icon: "none" });
      });
    }).catch(function (err) {
      if (err && err.message === "\u7528\u6237\u53d6\u6d88") return;
      wx.showToast({ title: (err && err.message) || "\u4e0a\u4f20\u5931\u8d25", icon: "none" });
    });
  },
  onMockVoice() { },
  onMoreAction() {
    const self = this;
    if (this.data.l1ViewOnly) { wx.showToast({ title: "\u672c\u4f1a\u8bdd\u4e2d\u4e0d\u53ef\u53d1\u6d88\u606f", icon: "none" }); return; }
    wx.showActionSheet({
      itemList: ["\u62cd\u7167", "\u76f8\u518c", "\u6587\u4ef6"],
      success: function (res) {
        if (res.tapIndex === 0) {
          // 鎷嶇収
          const { chooseAndUploadImages } = require("../../../utils/ossUpload");
          chooseAndUploadImages({ businessType: "CHAT_IMAGE", count: 1, sourceType: ["camera"] }).then(function (urls) {
            if (!urls || !urls.length) return;
            self._sendFileMessage(urls[0], "IMAGE");
          }).catch(function (err) {
            if (err && err.message === "\u7528\u6237\u53d6\u6d88") return;
            wx.showToast({ title: (err && err.message) || "\u4e0a\u4f20\u5931\u8d25", icon: "none" });
          });
        } else if (res.tapIndex === 1) {
          // 鐩稿唽
          const { chooseAndUploadImages } = require("../../../utils/ossUpload");
          chooseAndUploadImages({ businessType: "CHAT_IMAGE", count: 9, sourceType: ["album"] }).then(function (urls) {
            if (!urls || !urls.length) return;
            // 閫愬紶鍙戦€?            urls.forEach(function (url) { self._sendFileMessage(url, "IMAGE"); });
          }).catch(function (err) {
            if (err && err.message === "\u7528\u6237\u53d6\u6d88") return;
            wx.showToast({ title: (err && err.message) || "\u4e0a\u4f20\u5931\u8d25", icon: "none" });
          });
        } else if (res.tapIndex === 2) {
          // 鏂囦欢
          const { chooseAndUploadFiles } = require("../../../utils/ossUpload");
          chooseAndUploadFiles({ businessType: "CHAT_IMAGE", count: 1 }).then(function (urls) {
            if (!urls || !urls.length) return;
            self._sendFileMessage(urls[0], "FILE");
          }).catch(function (err) {
            if (err && err.message === "\u7528\u6237\u53d6\u6d88") return;
            wx.showToast({ title: (err && err.message) || "\u4e0a\u4f20\u5931\u8d25", icon: "none" });
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
      const one = mapRemoteMessage(row || { id: "file_" + Date.now(), senderId: Number(selfUserId), content: url, sendTime: new Date().toISOString() }, selfUserId, self._participants || {}, self._participantRoles || {}, self._participantAvatars || {});
      const next = self.data.messages.concat(one);
      self.setData({ messages: next, scrollInto: "msg-" + one.id });
    }).catch(function (err) {
      wx.showToast({ title: (err && err.message) || "\u53d1\u9001\u5931\u8d25", icon: "none" });
    });
  },
  onPreviewImage(e) {
    const url = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.url;
    if (!url) return;
    const imageUrls = (this.data.messages || []).filter(function (m) { return m.isImage && m.text; }).map(function (m) { return m.text; });
    wx.previewImage({ current: url, urls: imageUrls.length ? imageUrls : [url] });
  },
  onOpenFile(e) {
    const url = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.url;
    if (!url) return;
    wx.showLoading({ title: "下载中" });
    wx.downloadFile({
      url: url,
      success: function (res) {
        wx.hideLoading();
        if (res.statusCode === 200) {
          wx.openDocument({ filePath: res.tempFilePath, showMenu: true });
        }
      },
      fail: function () {
        wx.hideLoading();
        wx.showToast({ title: "下载失败", icon: "none" });
      }
    });
  }
});
