const { to } = require("../../../utils/nav");
const { ROLE_DISPLAY_NAME } = require("../../../utils/roleLabels");

const roleMenuMap = {
  student: [
    { title: "匹配中心", desc: "查看推荐教师并发起结对", action: "toMatch" },
    { title: "聊天沟通", desc: "与已结对志愿者交流", action: "toChat" },
    { title: "会议安排", desc: "查看腾讯会议课程计划", action: "toMeeting" }
  ],
  teacher: [
    { title: "申请处理", desc: "接受或拒绝结对申请", action: "toRequests" },
    { title: "聊天沟通", desc: "已结对后开启聊天", action: "toChat" },
    { title: "会议安排", desc: "查看课程预约提醒", action: "toMeeting" }
  ],
  admin_level_2: [
    { title: "区域管理", desc: "管理所辖学员与代管账号", action: "toRegionAdmin" },
    { title: "匹配中心", desc: "代学员发起结对申请", action: "toMatch" },
    { title: "解绑处理", desc: "查看并处理解绑申请", action: "toUnbind" },
    { title: "会议安排", desc: "协助课程会议管理", action: "toMeeting" }
  ],
  admin_level_1: [
    { title: "平台管理", desc: "查看全局数据与异常干预", action: "toPlatformAdmin" },
    { title: "申请处理", desc: "巡查关键申请处理状态", action: "toRequests" },
    { title: "解绑处理", desc: "干预异常解绑工单", action: "toUnbind" },
    { title: "会议安排", desc: "巡查会议监督状态", action: "toMeeting" }
  ]
};

Page({
  data: {
    roleName: "未登录",
    role: "",
    menuList: []
  },
  onShow() {
    const role = getApp().globalData.role;
    this.setData({
      role,
      roleName: ROLE_DISPLAY_NAME[role] || "未登录",
      menuList: roleMenuMap[role] || []
    });
  },
  onTapMenu(e) {
    const action = e.currentTarget.dataset.action;
    if (action && this[action]) {
      this[action]();
    }
  },
  toMatch() {
    wx.switchTab({ url: "/pages/match/center/index" });
  },
  toChat() {
    wx.switchTab({ url: "/pages/chat/list/index" });
  },
  toMeeting() {
    wx.switchTab({ url: "/pages/meeting/index" });
  },
  toRequests() {
    to("/pages/match/requests/index");
  },
  toUnbind() {
    to("/pages/match/unbind/index");
  },
  toRegionAdmin() {
    to("/pages/admin/region/index");
  },
  toPlatformAdmin() {
    to("/pages/admin/platform/index");
  },
});
