const { to } = require("../../../utils/nav");
const { ROLE_DISPLAY_NAME } = require("../../../utils/roleLabels");

const roleMenuMap = {
  student: [
    {
      title: "匹配中心",
      desc: "查看推荐志愿者、筛选学科，并快速发起结对申请。",
      action: "toMatch",
      badge: "优先开始",
      tip: "先挑合适的老师"
    },
    {
      title: "聊天沟通",
      desc: "与已结对志愿者交流需求、确认课程安排与学习节奏。",
      action: "toChat",
      badge: "持续沟通",
      tip: "消息保存在本机"
    },
    {
      title: "会议安排",
      desc: "查看腾讯会议课程计划，快速进入下一次辅导安排。",
      action: "toMeeting",
      badge: "本周课程",
      tip: "到时间自动提醒"
    }
  ],
  teacher: [
    {
      title: "申请处理",
      desc: "查看待处理的结对申请，快速接受或拒绝新匹配。",
      action: "toRequests",
      badge: "待处理",
      tip: "优先确认新申请"
    },
    {
      title: "聊天沟通",
      desc: "与已结对学员保持联系，及时同步作业与授课安排。",
      action: "toChat",
      badge: "高频使用",
      tip: "消息本地保存"
    },
    {
      title: "会议安排",
      desc: "查看课程预约提醒与近期会议链接，减少临开课前准备成本。",
      action: "toMeeting",
      badge: "课程管理",
      tip: "一页查看下一场"
    }
  ],
  admin_level_2: [
    {
      title: "区域管理",
      desc: "查看所辖学员、代管状态与基础账户信息，便于日常协助。",
      action: "toRegionAdmin",
      badge: "区域值守",
      tip: "先确认当前负责学生"
    },
    {
      title: "匹配中心",
      desc: "代学员浏览推荐志愿者，并以代理模式发起结对申请。",
      action: "toMatch",
      badge: "代操作",
      tip: "需先选择学生"
    },
    {
      title: "解绑处理",
      desc: "查看解绑申请与后续沟通说明，减少异常流程遗漏。",
      action: "toUnbind",
      badge: "异常处理",
      tip: "适合巡查与跟进"
    },
    {
      title: "会议安排",
      desc: "帮助区域内课程协调会议链接、时间与提醒说明。",
      action: "toMeeting",
      badge: "协调入口",
      tip: "课前信息集中查看"
    }
  ],
  admin_level_1: [
    {
      title: "平台管理",
      desc: "查看整体统计、异常结对情况，并进行必要的人工干预。",
      action: "toPlatformAdmin",
      badge: "全局视图",
      tip: "先看数据与风险"
    },
    {
      title: "申请处理",
      desc: "巡查关键申请处理状态，及时识别流程堵点与超时问题。",
      action: "toRequests",
      badge: "重点巡查",
      tip: "关注高优先事项"
    },
    {
      title: "解绑处理",
      desc: "针对异常解绑工单做二次确认，避免影响后续教学安排。",
      action: "toUnbind",
      badge: "风险干预",
      tip: "查看待确认工单"
    },
    {
      title: "会议安排",
      desc: "统一关注重要课程与会议执行情况，便于平台监督。",
      action: "toMeeting",
      badge: "监督排期",
      tip: "会议信息集中巡检"
    }
  ]
};

const roleHeroMap = {
  student: {
    eyebrow: "学习看板",
    title: "我的学习工作台",
    desc: "从寻找志愿者、保持沟通到安排课程，这里汇总了你最常用的支教入口。",
    badges: ["功能齐全", "匹配与聊天优先", "一站式入口"]
  },
  teacher: {
    eyebrow: "支教看板",
    title: "我的支教工作台",
    desc: "聚焦申请处理、沟通与授课安排，让支教志愿者能更快进入当天工作状态。",
    badges: ["申请处理优先", "课程安排集中查看", "沟通记录本地保存"]
  },
  admin_level_2: {
    eyebrow: "区域协同",
    title: "学校老师协同工作台",
    desc: "围绕代管学员、结对申请与课程协调，把区域内的关键动作统一管理起来。",
    badges: ["支持代操作模式", "适合区域协同", "会议与解绑集中处理"]
  },
  admin_level_1: {
    eyebrow: "平台总览",
    title: "平台运营工作台",
    desc: "用于巡查关键指标、处理异常结对与跟进会议监督，满足日常运营与监督需要。",
    badges: ["全局数据视角", "异常流程巡查", "平台干预入口"]
  },
  guest: {
    eyebrow: "欢迎使用",
    title: "先选择身份，再进入工作台",
    desc: "登录并选择身份后，即可使用与你角色匹配的常用功能与待办入口。",
    badges: ["支持多角色", "自动保存登录", "快速上手"]
  }
};

function formatMenuList(role) {
  const list = roleMenuMap[role] || [];
  return list.map((item, index) => ({
    ...item,
    mark: `0${index + 1}`.slice(-2),
    featured: index === 0
  }));
}

function buildSummaryCards(role, roleName, menuList) {
  if (!role) {
    return [
      { label: "当前状态", value: "未登录", note: "先去首页选择身份" },
      { label: "支持角色", value: "4类", note: "学生、教师、学校老师、平台" },
      { label: "准备动作", value: "1步", note: "完成身份选择即可进入" }
    ];
  }

  const commonCards = [
    {
      label: "可用入口",
      value: `${menuList.length}项`,
      note: "当前角色可直接使用的功能"
    },
    {
      label: "当前身份",
      value: roleName,
      note: "页面内容会随角色切换"
    }
  ];

  const lastCardMap = {
    student: { label: "建议动作", value: "去匹配", note: "先挑选合适的志愿者" },
    teacher: { label: "建议动作", value: "看申请", note: "优先处理新的结对请求" },
    admin_level_2: { label: "建议动作", value: "选学员", note: "匹配前先确认代操作对象" },
    admin_level_1: { label: "建议动作", value: "看全局", note: "先巡查重点数据与异常" }
  };

  return commonCards.concat(lastCardMap[role] || []);
}

function getSectionDesc(role) {
  if (!role) {
    return "登录后会按身份列出常用入口，你可按需切换账号查看各端功能。";
  }
  if (role === "admin_level_2") {
    return "优先围绕代管学员、结对申请和会议安排，形成一条清晰的协同链路。";
  }
  if (role === "admin_level_1") {
    return "从平台视角聚焦重点巡查和异常处理，让每个入口都更像真实运营后台。";
  }
  return "把最常用的入口直接放到首页，减少在多页之间来回查找。";
}

Page({
  data: {
    roleName: "未登录",
    role: "",
    nickname: "知行同驿",
    isLoggedIn: false,
    heroEyebrow: "",
    heroTitle: "",
    heroDesc: "",
    heroBadges: [],
    summaryCards: [],
    sectionDesc: "",
    menuList: []
  },
  onShow() {
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
    const menuList = formatMenuList(role);
    const hero = roleHeroMap[role] || roleHeroMap.guest;
    const userInfo = app.globalData.userInfo || {};
    const nickname = userInfo.nickname || (role ? roleName : "知行同驿");

    this.setData({
      role,
      roleName,
      nickname,
      isLoggedIn: !!role,
      heroEyebrow: hero.eyebrow,
      heroTitle: hero.title,
      heroDesc: hero.desc,
      heroBadges: hero.badges,
      summaryCards: buildSummaryCards(role, roleName, menuList),
      sectionDesc: getSectionDesc(role),
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
  }
});
