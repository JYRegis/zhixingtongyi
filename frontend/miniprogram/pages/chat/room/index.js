const { loadThread, saveThread } = require("../../../utils/chatPartners");

Page({
  data: {
    partnerId: "",
    partnerName: "",
    role: "",
    inputFocused: false,
    message: "",
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
    wx.setNavigationBarTitle({ title: partnerName });
    this.setData({ partnerId, partnerName });
    this.reloadMessages();
  },
  onShow() {
    this.setData({ role: getApp().globalData.role || "student" });
    if (this.partnerId) {
      this.reloadMessages();
    }
  },
  reloadMessages() {
    if (!this.partnerId) {
      return;
    }
    const messages = loadThread(this.partnerId);
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
    this.setData({ message: e.detail.value });
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
      scrollInto: `msg-${id}`
    });
  },
  onMockImage() {
    wx.showToast({
      title: "图片上传待接入",
      icon: "none"
    });
  },
  onMockVoice() {
    wx.showToast({
      title: "语音录制待接入",
      icon: "none"
    });
  }
});
