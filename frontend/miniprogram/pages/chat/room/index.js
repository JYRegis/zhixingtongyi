const { loadThread, saveThread } = require("../../../utils/chatPartners");
const { ROLE_DISPLAY_NAME } = require("../../../utils/roleLabels");

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
    messages: [],
    welcomeHint: "",
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
    wx.setNavigationBarTitle({ title: partnerName });
    this.setData({ partnerId, partnerName });
    this.reloadMessages();
  },
  onShow() {
    const app = getApp();
    const role = app.globalData.role || "";
    const userInfo = app.globalData.userInfo || {};
    const nickname = (userInfo.nickname || "").trim();
    this.setData({
      role,
      roleName: ROLE_DISPLAY_NAME[role] || "学员",
      myAvatarUrl: (userInfo.avatarUrl || "").trim(),
      myAvatarChar: nickname ? nickname.charAt(0) : "我",
      welcomeHint:
        role === "teacher"
          ? "可在这里和学员同步课程安排、作业反馈与会前提醒。"
          : "可在这里与志愿者确认课程安排、反馈学习进展。"
    });
    if (this.partnerId) {
      this.reloadMessages();
    }
  },
  reloadMessages() {
    if (!this.partnerId) {
      return;
    }
    const raw = loadThread(this.partnerId);
    const messages = raw.map(function (m) {
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
    const text = this.data.message.trim();
    if (!text || !this.partnerId) {
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
