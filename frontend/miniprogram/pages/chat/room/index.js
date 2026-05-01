const {
  loadThread,
  saveThread,
  mapThreadForL1View,
  getL1ThreadTitleLine,
  isRecipientL2ObserverAllowed,
  isVolunteerL2ObserverAllowed
} = require("../../../utils/chatPartners");
const { ROLE_DISPLAY_NAME } = require("../../../utils/roleLabels");
const { checkOnboardingOrRedirect } = require("../../../utils/onboardingGuard");
const { getByPhone, mergeFromStorageIntoApp } = require("../../../utils/userProfileStore");
const { chatApi } = require("../../../utils/api");

function isRemotePairId(value) {
  return /^\d+$/.test(String(value || ""));
}

function formatRemoteTime(v) {
  if (!v) {
    return "";
  }
  const t = Date.parse(String(v).replace(" ", "T"));
  if (isNaN(t)) {
    return String(v);
  }
  const d = new Date(t);
  const z = (n) => (n < 10 ? "0" : "") + n;
  return z(d.getHours()) + ":" + z(d.getMinutes());
}

function mapRemoteMessage(row, selfUserId) {
  const isSelf = String(row.senderId) === String(selfUserId);
  return {
    id: row.id,
    from: isSelf ? "我" : "对方",
    text: row.content || "",
    time: formatRemoteTime(row.sendTime),
    isSelf,
    avatarChar: isSelf ? "我" : "对"
  };
}

Page({
  data: {
    partnerId: "",
    partnerName: "",
    role: "",
    roleName: "",
    myAvatarUrl: "",
    myAvatarChar: "我",
    inputFocused: false,
    message: "",
    canSend: false,
    l1ViewOnly: false,
    messages: [],
    scrollInto: ""
  },
  onLoad(query) {
    const partnerId = (query.partnerId || "").trim();
    const rawName = query.partnerName || "";
    const partnerName = rawName ? decodeURIComponent(rawName) : "聊天";
    if (!partnerId) {
      wx.showToast({ title: "请从列表选择联系人", icon: "none" });
      setTimeout(() => {
        const pages = getCurrentPages();
        if (pages.length > 1) {
          wx.navigateBack();
        } else {
          wx.switchTab({ url: "/pages/chat/list/index" });
        }
      }, 600);
      return;
    }
    this.partnerId = partnerId;
    mergeFromStorageIntoApp();
    const app0 = getApp();
    const u0 = (app0.globalData && app0.globalData.userInfo) || {};
    const prof0 = (u0.phone && getByPhone(String(u0.phone))) || u0;
    const r0 = ((app0.globalData && app0.globalData.role) || (prof0 && prof0.role) || "").trim();
    const isRecipientObserver =
      r0 === "admin_level_2" && prof0.l2Scope === "recipient_side" && u0.phone
        ? isRecipientL2ObserverAllowed(String(u0.phone), partnerId, prof0)
        : false;
    const isVolunteerObserver =
      r0 === "admin_level_2" && prof0.l2Scope === "volunteer_side" && u0.phone
        ? isVolunteerL2ObserverAllowed(String(u0.phone), partnerId, prof0)
        : false;
    if (r0 === "admin_level_2" && u0.phone) {
      if (prof0.l2Scope === "recipient_side" && !isRecipientObserver) {
        wx.showToast({ title: "无权查看此会话，请从聊天列表进入", icon: "none" });
        setTimeout(() => {
          wx.switchTab({ url: "/pages/chat/list/index" });
        }, 800);
        this.partnerId = "";
        return;
      }
      if (prof0.l2Scope === "volunteer_side" && !isVolunteerObserver) {
        wx.showToast({ title: "无权查看此会话，请从聊天列表进入", icon: "none" });
        setTimeout(() => {
          wx.switchTab({ url: "/pages/chat/list/index" });
        }, 800);
        this.partnerId = "";
        return;
      }
    }
    const isObserverTitle =
      r0 === "admin_level_1" || isRecipientObserver || isVolunteerObserver;
    const title = isObserverTitle ? getL1ThreadTitleLine(partnerId) : partnerName;
    wx.setNavigationBarTitle({ title: title || partnerName });
    this.setData({ partnerId, partnerName: title || partnerName });
    this.reloadMessages();
  },
  onShow() {
    checkOnboardingOrRedirect("pages/chat/room/index");
    mergeFromStorageIntoApp();
    const app = getApp();
    const userInfo = app.globalData.userInfo || {};
    const prof = (userInfo.phone && getByPhone(String(userInfo.phone))) || userInfo;
    const role = ((app.globalData && app.globalData.role) || (prof && prof.role) || "").trim();
    const isRecipientObserver =
      role === "admin_level_2" && prof.l2Scope === "recipient_side" && userInfo.phone
        ? isRecipientL2ObserverAllowed(String(userInfo.phone), this.partnerId, prof)
        : false;
    const isVolunteerObserver =
      role === "admin_level_2" && prof.l2Scope === "volunteer_side" && userInfo.phone
        ? isVolunteerL2ObserverAllowed(String(userInfo.phone), this.partnerId, prof)
        : false;
    const l1 = role === "admin_level_1";
    const nickname = (userInfo.nickname || "").trim();
    this.setData({
      role,
      roleName: ROLE_DISPLAY_NAME[role] || "学员",
      myAvatarUrl: (userInfo.avatarUrl || "").trim(),
      myAvatarChar: nickname ? nickname.charAt(0) : "我"
    });
    if (this.partnerId) {
      this.reloadMessages();
      if (l1 || isRecipientObserver || isVolunteerObserver) {
        try {
          wx.setNavigationBarTitle({ title: getL1ThreadTitleLine(this.partnerId) });
        } catch (e) {
          // ignore
        }
      }
    }
  },
  reloadMessages() {
    if (!this.partnerId) {
      return;
    }
    mergeFromStorageIntoApp();
    const raw = loadThread(this.partnerId);
    const app0 = getApp();
    const u0 = (app0.globalData && app0.globalData.userInfo) || {};
    const p0 = (u0.phone && getByPhone(String(u0.phone))) || u0;
    const role0 =
      ((app0.globalData && app0.globalData.role) || (p0 && p0.role) || "").trim();
    const isRecipientObserver =
      role0 === "admin_level_2" && p0.l2Scope === "recipient_side" && u0.phone
        ? isRecipientL2ObserverAllowed(String(u0.phone), this.partnerId, p0)
        : false;
    const isVolunteerObserver =
      role0 === "admin_level_2" && p0.l2Scope === "volunteer_side" && u0.phone
        ? isVolunteerL2ObserverAllowed(String(u0.phone), this.partnerId, p0)
        : false;
    const isL1 = role0 === "admin_level_1";
    const observer = isL1 || isRecipientObserver || isVolunteerObserver;
    const token = (app0.globalData && app0.globalData.token) || wx.getStorageSync("token") || "";
    const selfUserId = (u0 && (u0.backendUserId || u0.id || u0.userId)) || "";
    if (token && !observer && (role0 === "student" || role0 === "teacher") && isRemotePairId(this.partnerId)) {
      chatApi
        .messages({ matchPairId: Number(this.partnerId), limit: 50 })
        .then((rows) => {
          const messages = (Array.isArray(rows) ? rows : [])
            .slice()
            .reverse()
            .map((row) => mapRemoteMessage(row, selfUserId));
          const last = messages.length ? messages[messages.length - 1] : null;
          this.setData({
            l1ViewOnly: false,
            messages,
            scrollInto: last ? `msg-${last.id}` : ""
          });
        })
        .catch(() => {
          this._reloadLocalMessages(observer);
        });
      return;
    }
    this._reloadLocalMessages(observer);
  },
  _reloadLocalMessages(observer) {
    const raw = loadThread(this.partnerId);
    const messages = observer
      ? mapThreadForL1View(this.partnerId, raw)
      : raw.map(function (m) {
          return {
            id: m.id,
            from: m.from,
            text: m.text,
            time: m.time,
            isSelf: m.isSelf,
            avatarChar: (m.from || "").charAt(0) || "?"
          };
        });
    const last = messages.length ? messages[messages.length - 1] : null;
    this.setData({
      l1ViewOnly: observer,
      messages,
      scrollInto: last ? `msg-${last.id}` : ""
    });
  },
  onInputFocus() {
    this.setData({ inputFocused: true });
  },
  onInputBlur() {
    this.setData({ inputFocused: false });
  },
  onInput(e) {
    const message = e.detail.value;
    this.setData({
      message,
      canSend: !!message.trim()
    });
  },
  onSend() {
    if (this.data.l1ViewOnly) {
      const role0 = (getApp().globalData && getApp().globalData.role) || "";
      wx.showToast({
        title: "本会话中不可发消息",
        icon: "none"
      });
      return;
    }
    const text = this.data.message.trim();
    if (!text || !this.partnerId) {
      return;
    }
    const app = getApp();
    const role = (app.globalData && app.globalData.role) || "";
    const token = (app.globalData && app.globalData.token) || wx.getStorageSync("token") || "";
    const userInfo = (app.globalData && app.globalData.userInfo) || {};
    const selfUserId = userInfo.backendUserId || userInfo.id || userInfo.userId || "";
    if (token && (role === "student" || role === "teacher") && isRemotePairId(this.partnerId)) {
      chatApi
        .sendMessage({
          matchPairId: Number(this.partnerId),
          messageType: "TEXT",
          content: text
        })
        .then((row) => {
          const one = mapRemoteMessage(row || {}, selfUserId);
          const next = this.data.messages.concat(one);
          this.setData({
            messages: next,
            message: "",
            canSend: false,
            scrollInto: `msg-${one.id}`
          });
        })
        .catch((err) => {
          wx.showToast({ title: (err && err.message) || "发送失败", icon: "none" });
        });
      return;
    }
    const nick = (getApp().globalData.userInfo && getApp().globalData.userInfo.nickname) || "我";
    const id = Date.now();
    const next = this.data.messages.concat({
      id,
      from: nick,
      text,
      time: "刚刚",
      isSelf: true
    });
    saveThread(this.partnerId, next);
    this.setData({
      messages: next,
      message: "",
      canSend: false,
      scrollInto: `msg-${id}`
    });
  },
  onMockImage() {
    wx.showToast({ title: "图片功能即将上线", icon: "none" });
  },
  onMockVoice() {
    wx.showToast({ title: "语音功能即将上线", icon: "none" });
  },
  onMoreAction() {
    wx.showActionSheet({
      itemList: ["拍照", "相册", "文件"],
      success: function () {
        wx.showToast({ title: "更多功能即将上线", icon: "none" });
      }
    });
  }
});
