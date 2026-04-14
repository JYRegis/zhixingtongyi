const { getPairedList } = require("../../../utils/chatPartners");

Page({
  data: {
    role: "",
    pairs: [],
    emptyHint: ""
  },
  onShow() {
    const role = getApp().globalData.role || "";
    const pairs = getPairedList(role);
    let emptyHint = "";
    if (!pairs.length) {
      if (role === "admin_level_1") {
        emptyHint = "平台运营账号暂无结对会话；可在工作台进入「申请处理」等模块。";
      } else {
        emptyHint = "暂无已结对对象，请先在「匹配」里完成结对。";
      }
    }
    this.setData({ role, pairs, emptyHint });
  },
  onOpenRoom(e) {
    const { id, name } = e.currentTarget.dataset;
    if (!id) {
      return;
    }
    wx.navigateTo({
      url: `/pages/chat/room/index?partnerId=${encodeURIComponent(id)}&partnerName=${encodeURIComponent(name || "聊天")}`
    });
  },
  toMatch() {
    wx.switchTab({ url: "/pages/match/center/index" });
  }
});
