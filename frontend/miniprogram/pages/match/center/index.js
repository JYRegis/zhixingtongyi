const { to } = require("../../../utils/nav");
const { ROLE_DISPLAY_NAME } = require("../../../utils/roleLabels");
const { checkOnboardingOrRedirect } = require("../../../utils/onboardingGuard");
const { formatSavedTimeForDisplay } = require("../../../utils/classTimeOptions");
const { syncCustomTabBar } = require("../../../utils/customTabBar");
const { mergeFromStorageIntoApp, getByPhone } = require("../../../utils/userProfileStore");
const { getRecommendations, applyMatch } = require("../../../utils/backendApi");

var matchHeroMap = {
  student: { title: "志愿者推荐" },
  teacher: { title: "推荐与申请" },
  admin_level_2: { title: "结对申请" },
  admin_level_1: { title: "匹配" }
};

/**
 * 学员：看「支教志愿者」；志愿者：看「结对学生」
 * 每条含 学科，用于筛选
 */
var rawList = [
  { id: 1, asVolunteer: "王志愿", asStudent: "陈一", timeRaw: "W:6|S:night", score: 92, style: "温和耐心", subject: "数学" },
  { id: 2, asVolunteer: "李志愿", asStudent: "和晓", timeRaw: "W:7|S:mor,noon", score: 88, style: "互动积极", subject: "英语" },
  { id: 3, asVolunteer: "赵志教", asStudent: "周小花", timeRaw: "W:3,5|S:night", score: 81, style: "阅读与写作", subject: "语文" },
  { id: 4, asVolunteer: "孙一教", asStudent: "高翔", timeRaw: "W:1,2,3|S:night", score: 86, style: "理科较强", subject: "数学" },
  { id: 5, asVolunteer: "周二教", asStudent: "何敏", timeRaw: "W:4,5|S:noon,night", score: 90, style: "口语流利", subject: "英语" },
  { id: 6, asVolunteer: "吴可教", asStudent: "江雨", timeRaw: "W:2,6|S:mor", score: 79, style: "耐心细致", subject: "科学" },
  { id: 7, asVolunteer: "郑晨", asStudent: "方宁", timeRaw: "W:1,3,5|S:night", score: 84, style: "作文与阅读", subject: "语文" },
  { id: 8, asVolunteer: "冯立", asStudent: "陆诚", timeRaw: "W:5,6,7|S:mor,noon", score: 91, style: "理综辅导", subject: "理综" },
  { id: 9, asVolunteer: "程悦", asStudent: "苏梅", timeRaw: "W:2,4|S:noon,night", score: 88, style: "互动积极", subject: "英语" },
  { id: 10, asVolunteer: "何敏", asStudent: "赵凡", timeRaw: "W:1,2,3,4,5|S:mor", score: 82, style: "基础补差", subject: "数学" },
  { id: 11, asVolunteer: "胡凯", asStudent: "黄琳", timeRaw: "W:6,7|S:night", score: 87, style: "物化生", subject: "物理" },
  { id: 12, asVolunteer: "朱琳", asStudent: "杨帆", timeRaw: "W:3,4|S:night", score: 80, style: "语法强化", subject: "英语" },
  { id: 13, asVolunteer: "高翔", asStudent: "董洋", timeRaw: "W:1,2|S:mor,noon", score: 93, style: "竞赛辅导", subject: "数学" },
  { id: 14, asVolunteer: "谢薇", asStudent: "金悦", timeRaw: "W:2,3,4|S:noon,night", score: 78, style: "陪伴式", subject: "综合" },
  { id: 15, asVolunteer: "董洋", asStudent: "于航", timeRaw: "W:1,2,3|S:night", score: 90, style: "语文阅读", subject: "语文" }
];

var subjectOptions = ["全部", "数学", "英语", "语文", "科学", "物理", "理综", "综合"];

function applySubjectFilter(list, subjectIndex) {
  if (!list || !list.length) {
    return [];
  }
  if (subjectIndex <= 0) {
    return list;
  }
  const want = subjectOptions[subjectIndex];
  return list.filter(function (row) {
    return row && row.subject === want;
  });
}

function pickDisplayName(item, role) {
  if (role === "student") {
    return item.asVolunteer || "志愿者";
  }
  if (role === "teacher") {
    return item.asStudent || "结对学生";
  }
  return item.asVolunteer || item.asStudent || "—";
}

function enrichItem(item, role) {
  var displayName = pickDisplayName(item, role);
  var scoreTag = "可继续观察";
  if (item.score >= 90) {
    scoreTag = "优先推荐";
  } else if (item.score >= 85) {
    scoreTag = "较高匹配";
  }
  var timeDisplay = formatSavedTimeForDisplay(item.timeRaw);
  return {
    id: item.id,
    subject: item.subject,
    /** 列表主标题：按身份为「志愿者名」或「结对学生名」 */
    teacher: displayName,
    timeDisplay: timeDisplay,
    timeRaw: item.timeRaw,
    score: item.score,
    style: item.style,
    scoreTag: scoreTag,
    summary:
      role === "student"
        ? "与「希望上课时间」对碰时，以学科与可授课时间为准（演示）。"
        : "可对照学员的学科需求与可上课时间发起结对（演示）。",
    highlight: item.score >= 90
  };
}

function buildListForRole(role) {
  var out = [];
  for (var i = 0; i < rawList.length; i++) {
    out.push(enrichItem(rawList[i], role));
  }
  return out;
}

function isVolunteerSideL2() {
  var u = (getApp().globalData && getApp().globalData.userInfo) || {};
  var p = getByPhone(u.phone) || u;
  return p.l2Scope === "volunteer_side";
}

Page({
  data: {
    canPairTodo: true,
    canUnbind: true,
    showSubjectFilter: false,
    subjectOptions: subjectOptions,
    subjectIndex: 0,
    subjectLineText: "全部",
    role: "",
    roleName: "学员",
    heroTitle: "",
    selectedCountText: "",
    renderList: [],
    list: []
  },
  onShow: async function () {
    const role0 = (getApp().globalData && getApp().globalData.role) || "";
    mergeFromStorageIntoApp();
    if (role0 === "admin_level_1") {
      wx.switchTab({ url: "/pages/common/workbench/index" });
      return;
    }
    if (role0 === "admin_level_2") {
      const u = (getApp().globalData && getApp().globalData.userInfo) || {};
      const p = getByPhone(u.phone) || u;
      if (p.l2Scope === "recipient_side" || p.l2Scope === "volunteer_side") {
        wx.switchTab({ url: "/pages/common/workbench/index" });
        return;
      }
    }
    checkOnboardingOrRedirect("pages/match/center/index");
    syncCustomTabBar();
    var role = getApp().globalData.role || "";
    var fullList = buildListForRole(role);
    if (role === "student") {
      try {
        const remote = await getRecommendations();
        fullList = (Array.isArray(remote) ? remote : []).map(function (row, idx) {
          return {
            id: row.teacherId || idx + 1,
            teacherId: row.teacherId,
            asVolunteer: row.realName || "志愿者",
            asStudent: "",
            timeRaw: row.freeTime || "",
            score: 90,
            style: row.school || "",
            subject: (row.grade || "综合")
          };
        });
      } catch (e) {
        if (console && console.warn) {
          console.warn("[match-center] getRecommendations fallback to mock", e);
        }
      }
    }
    var idx = typeof this.data.subjectIndex === "number" ? this.data.subjectIndex : 0;
    var renderList = applySubjectFilter(fullList, idx);
    var hero = matchHeroMap[role] || matchHeroMap.student;
    var showSubjectFilter = role === "student" || role === "teacher";

    var canUnbind =
      role === "student" || role === "teacher" || (role === "admin_level_2" && isVolunteerSideL2());
    var canPairTodo = role === "student" || role === "teacher" || (role === "admin_level_2" && isVolunteerSideL2());
    this.setData({
      role: role,
      canUnbind: canUnbind,
      canPairTodo: canPairTodo,
      showSubjectFilter: showSubjectFilter,
      roleName: ROLE_DISPLAY_NAME[role] || "学员",
      heroTitle: hero.title,
      list: fullList,
      renderList: renderList,
      selectedCountText: renderList.length + " 人",
      subjectLineText: subjectOptions[idx] != null ? subjectOptions[idx] : "全部"
    });
  },
  onPullDownRefresh: function () {
    this.onShow();
    wx.stopPullDownRefresh();
  },
  onSubjectChange: function (e) {
    var idx = parseInt(e.detail.value, 10) || 0;
    var list = this.data.list || [];
    var renderList = applySubjectFilter(list, idx);
    this.setData({
      subjectIndex: idx,
      renderList: renderList,
      selectedCountText: renderList.length + " 人",
      subjectLineText: subjectOptions[idx] != null ? subjectOptions[idx] : "全部"
    });
  },
  onApply: async function (e) {
    var id = e.currentTarget.dataset.id;
    var one = this.data.renderList.find(function (item) {
      return item.id === id;
    });
    try {
      if (one && one.teacherId) {
        await applyMatch(one.teacherId);
      }
      wx.showToast({
        title: "已申请" + (one && one.teacher ? " " + one.teacher : ""),
        icon: "success"
      });
    } catch (err) {
      wx.showToast({
        title: (err && err.message) || "申请失败",
        icon: "none"
      });
    }
  },
  toRequests: function () {
    to("/pages/match/requests/index");
  },
  toUnbind: function () {
    to("/pages/match/unbind/index");
  }
});
