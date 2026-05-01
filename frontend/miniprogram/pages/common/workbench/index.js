const { to } = require("../../../utils/nav");
const { ROLE_DISPLAY_NAME } = require("../../../utils/roleLabels");
const { checkOnboardingOrRedirect } = require("../../../utils/onboardingGuard");
const { getByPhone } = require("../../../utils/userProfileStore");
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
  const iconMap = {
    toMatch: "配",
    toChat: "聊",
    toHoursApply: "时",
    toPlatformAdmin: "管",
    toRegionAdmin: "校",
    toUnbind: "解"
  };
  const descMap = {
    toMatch: "查看推荐结对与待处理申请",
    toChat: "进入结对沟通与消息列表",
    toHoursApply: "登记与提交公益服务时长",
    toPlatformAdmin: "处理平台审核、风险与数据",
    toRegionAdmin: "管理学校侧学生与志愿者事务",
    toUnbind: "处理结对解绑与异常申请"
  };
  return raw.map((item, index) => ({
    ...item,
    featured: index === 0,
    iconText: iconMap[item.action] || "驿",
    desc: descMap[item.action] || "进入对应工作入口"
  }));
}

Page({
  data: {
    roleName: "未登录",
    role: "",
    nickname: "知行同驿",
    isLoggedIn: false,
    heroTitle: "",
    menuList: [],
    loading: false,
    _roleThemeClass: ""
  },
  onShow() {
    // checkOnboardingOrRedirect 内已 mergeFromStorageIntoApp；此处勿再于 check 后二次 merge，避免旧版 {remote,u} 合并覆盖档案里的 onboardingStatus
    checkOnboardingOrRedirect("pages/common/workbench/index");
    syncCustomTabBar();
    this.syncPageData();
    // 确保页面显示时更新主题颜色
    const app = getApp();
    const role = app.globalData.role || "";
    const themeClass = require("../../../utils/roleTheme").getRoleThemeClass(role);
    if (this.data._roleThemeClass !== themeClass) {
      this.setData({ _roleThemeClass: themeClass });
    }
  },
  onPullDownRefresh() {
    this.setData({ loading: true });
    this.syncPageData();
    setTimeout(() => {
      this.setData({ loading: false });
      try {
        wx.stopPullDownRefresh();
      } catch (e) {
        // ignore
      }
    }, 220);
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
