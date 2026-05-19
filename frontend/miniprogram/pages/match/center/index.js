const { to } = require("../../../utils/nav");
const { ROLE_DISPLAY_NAME } = require("../../../utils/roleLabels");
const { checkOnboardingOrRedirect } = require("../../../utils/onboardingGuard");
const { formatSavedTimeForDisplay } = require("../../../utils/classTimeOptions");
const { freeTimeMapsToSerializedString } = require("../../../utils/dtoMappers");

/**
 * 后端 freeTime 可能是：
 * 1. JSON 字符串 '[{"week":6,"slot":"night"}]'
 * 2. 已解析的数组 [{week:6, slot:"night"}]
 * 3. 前端格式字符串 'W:6|S:night'
 * 统一转为前端可识别的 'W:x|S:y' 格式
 */
function parseFreeTimeField(freeTime) {
  if (!freeTime) return "";
  // 已经是数组
  if (Array.isArray(freeTime)) {
    return freeTimeMapsToSerializedString(freeTime);
  }
  var str = String(freeTime).trim();
  // 已经是前端格式
  if (str.indexOf("W:") === 0 && str.indexOf("|S:") > 0) {
    return str;
  }
  // 尝试 JSON 解析
  if (str.charAt(0) === "[") {
    try {
      var arr = JSON.parse(str);
      if (Array.isArray(arr)) {
        return freeTimeMapsToSerializedString(arr);
      }
    } catch (e) {
      // ignore
    }
  }
  return str;
}
const { syncCustomTabBar } = require("../../../utils/customTabBar");
const { mergeFromStorageIntoApp, getByPhone } = require("../../../utils/userProfileStore");
const { matchApi } = require("../../../utils/api");

var matchHeroMap = {
  student: { title: "志愿者推荐" },
  teacher: { title: "结对管理" },
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
    if (!row || !row.subject) return false;
    // 支持多学科（如 "数学、物理"）中包含目标学科
    return row.subject.indexOf(want) >= 0;
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
  var avatarText = displayName && displayName !== "—" ? String(displayName).slice(0, 1) : "驿";
  var scoreTag = "可继续观察";
  if (item.score >= 90) {
    scoreTag = "优先推荐";
  } else if (item.score >= 85) {
    scoreTag = "较高匹配";
  }
  var timeDisplay = formatSavedTimeForDisplay(item.timeRaw);
  return {
    id: item.id,
    teacherId: item.teacherId,
    subject: item.subject,
    /** 列表主标题：按身份为「志愿者名」或「结对学生名」 */
    teacher: displayName,
    avatarText: avatarText,
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

// 旧的「支教方 L2」判定依赖本地 Storage Mock 的 l2Scope 字段，后端联调下永远拿不到，
// 因此目前 L2 在 onShow 已经被无条件踢回工作台，这里固定返回 false 以彻底移除本地兜底。
function isVolunteerSideL2() {
  return false;
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
      // 二级管理员的工作场景在工作台 + 学生/教师审核 + 解绑确认等管理子页，
      // 不应停留在「匹配」Tab。原先依赖本地 l2Scope 区分支教/受援方的拦截
      // 在后端联调下永远拿不到值，导致二级管理员能进此页并点「申请结对」。
      // 这里一律踢回工作台。
      wx.switchTab({ url: "/pages/common/workbench/index" });
      return;
    }
    checkOnboardingOrRedirect("pages/match/center/index");
    syncCustomTabBar();
    var role = getApp().globalData.role || "";
    // 产品规则：仅学员可发起结对申请，志愿者只能在「结对待办」中接受/拒绝。
    // 因此志愿者侧不再展示推荐列表 + 「申请结对」按钮，避免出现走不通的流程。
    var fullList = role === "student" ? buildListForRole(role) : [];
    if (role === "student") {
      try {
        const remote = await matchApi.recommendations();
        // 拉取当前学员所有结对，构造「已锁定」teacherId 集合。
        // 后端 apply 拦截规则：status IN (0 已申请, 1 已接受, 3 解绑确认中)，
        // 这三类的志愿者在匹配中心不再展示，避免点了 toast「已存在待处理或生效中的结对关系」。
        // status=2 已拒绝 / 4 已解绑 / 5 解绑被拒 仍可重新申请，保留在列表里。
        var lockedTeacherIds = {};
        try {
          const myPairs = await matchApi.myPairs();
          (Array.isArray(myPairs) ? myPairs : []).forEach(function (p) {
            var st = Number(p && p.matchStatus);
            if (p && p.teacherId != null && (st === 0 || st === 1 || st === 3)) {
              lockedTeacherIds[String(p.teacherId)] = true;
            }
          });
        } catch (errPairs) {
          if (console && console.warn) {
            console.warn("[match-center] myPairs fetch failed, skip locked filter", errPairs);
          }
        }
        fullList = (Array.isArray(remote) ? remote : [])
          .filter(function (row) {
            return row && row.teacherId != null && !lockedTeacherIds[String(row.teacherId)];
          })
          .map(function (row, idx) {
            // 后端 TeacherRecommendationVO 里：
            //   skilledSubjects -> 擅长科目（"数学,物理" 字符串）
            //   grade           -> 年级（"大三/研三"），不能当学科展示
            //   school          -> 所在学校，作为附属信息
            var subjects = "";
            if (Array.isArray(row.skilledSubjects)) {
              subjects = row.skilledSubjects.filter(Boolean).join("、");
            } else if (row.skilledSubjects != null && row.skilledSubjects !== "") {
              subjects = String(row.skilledSubjects).split(/[,，、]/).map(function (s) { return s.trim(); }).filter(Boolean).join("、");
            }
            return enrichItem({
              id: row.teacherId || idx + 1,
              teacherId: row.teacherId,
              asVolunteer: row.realName || "志愿者",
              asStudent: "",
              timeRaw: parseFreeTimeField(row.freeTime),
              score: 90,
              style: row.schoolName || row.school || row.grade || "",
              subject: subjects || "综合"
            }, role);
          });
      } catch (e) {
        if (console && console.warn) {
          console.warn("[match-center] matchApi.recommendations fallback to mock", e);
        }
      }
    }
    var idx = typeof this.data.subjectIndex === "number" ? this.data.subjectIndex : 0;
    var renderList = applySubjectFilter(fullList, idx);
    var hero = matchHeroMap[role] || matchHeroMap.student;
    // 学科筛选只面向学员（志愿者无推荐列表，无需筛选）
    var showSubjectFilter = role === "student";

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
        await matchApi.apply({ teacherId: one.teacherId });
      }
      // 立即从本地列表移除，无需重新请求后端
      var newList = this.data.list.filter(function (item) { return item.id !== id; });
      var idx = this.data.subjectIndex || 0;
      var newRenderList = applySubjectFilter(newList, idx);
      this.setData({
        list: newList,
        renderList: newRenderList,
        selectedCountText: newRenderList.length + " 人"
      });
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
