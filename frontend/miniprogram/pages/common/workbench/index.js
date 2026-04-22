const { to } = require("../../../utils/nav");
const { ROLE_DISPLAY_NAME } = require("../../../utils/roleLabels");
const { checkOnboardingOrRedirect } = require("../../../utils/onboardingGuard");
const { mergeFromStorageIntoApp, getByPhone } = require("../../../utils/userProfileStore");
const { syncCustomTabBar } = require("../../../utils/customTabBar");

const roleHeroMap = {
  student: { title: "我的学习" },
  teacher: { title: "我的支教" },
  admin_level_2: { title: "学校工作" },
  admin_level_1: { title: "平台工作" },
  guest: { title: "请选择身份" }
};

/**
 * 与 `custom-tab-bar` 规则一致：学员/教师五栏；平台一级在「聊天」前多「平台」(reLaunch 到 platform/index，该页自嵌条)；支教/受援方二级为三无匹配/会议。
 */
function isMatchTabVisible(role) {
  if (role === "admin_level_1") {
    return false;
  }
  const u = (getApp().globalData && getApp().globalData.userInfo) || {};
  const p = getByPhone(u.phone) || u;
  if (role === "admin_level_2" && (p.l2Scope === "recipient_side" || p.l2Scope === "volunteer_side")) {
    return false;
  }
  return role === "student" || role === "teacher" || role === "admin_level_2";
}

/**
 * 顺序：与底部可 switchTab 的项一致时，先「匹配」（若有 tab）、再「聊天」；再各角色功能（会议在学员/志愿者底栏，不在此列表）。
 * 与底部 Tab 对应：工作台(当前页) / 匹配[可选] / 聊天 / 会议[仅学员·志愿者] / 设置
 */
function getMenuListForCurrentRole(role) {
  const u = (getApp().globalData && getApp().globalData.userInfo) || {};
  const p = getByPhone(u.phone) || u;
  const l2 = p.l2Scope || "";
  const list = [];

  if (isMatchTabVisible(role)) {
    let badge = "开始";
    if (role === "teacher") {
      badge = "待办";
    } else if (role === "admin_level_2") {
      badge = "结对";
    }
    list.push({ title: "匹配", action: "toMatch", badge: badge });
  }
  list.push({ title: "聊天", action: "toChat", badge: "沟通" });
  if (role === "student" || role === "teacher") {
    list.push({ title: "志愿时长", action: "toHoursApply", badge: "申请" });
  }

  if (role === "admin_level_1") {
    list.push({ title: "平台管理", action: "toPlatformAdmin", badge: "管理" });
  } else if (role === "admin_level_2" && l2 === "recipient_side") {
    list.push({ title: "区域管理", action: "toRegionAdmin", badge: "管理" });
    list.push({ title: "解绑", action: "toUnbind", badge: "处理" });
  } else if (role === "admin_level_2" && l2 === "volunteer_side") {
    list.push({ title: "区域管理", action: "toRegionAdmin", badge: "审核" });
  } else if (role === "admin_level_2" && isMatchTabVisible(role) && l2 !== "recipient_side" && l2 !== "volunteer_side") {
    list.push({ title: "区域管理", action: "toRegionAdmin", badge: "管理" });
    list.push({ title: "解绑", action: "toUnbind", badge: "处理" });
  }
  return list;
}

function formatMenuList(role) {
  const raw = getMenuListForCurrentRole(role);
  return raw.map((item, index) => ({ ...item, featured: index === 0 }));
}

Page({
  data: {
    roleName: "未登录",
    role: "",
    nickname: "知行同驿",
    isLoggedIn: false,
    heroTitle: "",
    menuList: []
  },
  onShow() {
    checkOnboardingOrRedirect("pages/common/workbench/index");
    syncCustomTabBar();
    mergeFromStorageIntoApp();
    this.syncPageData();
  },
  onPullDownRefresh() {
    this.syncPageData();
    wx.stopPullDownRefresh();
  },
  syncPageData() {
    const app = getApp();
    const role = app.globalData.role || "";
    const roleName = ROLE_DISPLAY_NAME[role] || "未登录";
    const userInfo = app.globalData.userInfo || {};
    const menuList = formatMenuList(role);
    let hero = roleHeroMap[role] || roleHeroMap.guest;
    if (role === "admin_level_2") {
      const pr = (userInfo.phone && getByPhone(String(userInfo.phone))) || userInfo;
      if (pr.l2Scope === "volunteer_side") {
        hero = { title: "审核管理" };
      }
    }
    const nickname = userInfo.nickname || (role ? roleName : "知行同驿");

    this.setData({
      role,
      roleName,
      nickname,
      isLoggedIn: !!role,
      heroTitle: hero.title,
      menuList
    });
  },
  onTapMenu(e) {
    const action = e.currentTarget.dataset.action;
    if (action && this[action]) {
      this[action]();
    }
  },
  onGoLogin() {
    to("/pages/common/home/index");
  },
  toMatch() {
    if ((getApp().globalData && getApp().globalData.role) === "admin_level_1") {
      wx.showToast({ title: "平台运营不进入「匹配」", icon: "none" });
      return;
    }
    wx.switchTab({ url: "/pages/match/center/index" });
  },
  toChat() {
    wx.switchTab({ url: "/pages/chat/list/index" });
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
  toHoursApply() {
    wx.navigateTo({ url: "/pages/common/hours-apply/index" });
  }
});
