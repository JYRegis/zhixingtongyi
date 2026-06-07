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

// Removed rawList and local subject filters

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
    avatar: item.avatar || "",
    avatarText: avatarText,
    timeDisplay: timeDisplay,
    timeRaw: item.timeRaw,
    score: item.score,
    style: item.style,
    scoreTag: scoreTag,
    summary:
      role === "student"
        ? ""
        : "可对照学员的学科需求与可上课时间发起结对（演示）。",
    highlight: item.score >= 90
  };
}

// Removed buildListForRole since mock list is removed
function isVolunteerSideL2() {
  return false;
}

Page({
  data: {
    canPairTodo: true,
    canUnbind: true,
    role: "",
    roleName: "学员",
    heroTitle: "",
    renderList: [],
    list: [],
    page: 1,
    pageSize: 10,
    hasMore: true
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
      // 不应停留在那「匹配」Tab。原先依赖本地 l2Scope 区分支教/受援方的拦截
      // 在后端联调下永远拿不到值，导致二级管理员能进此页并点「申请结对」。
      // 这里一律踢回工作台。
      wx.switchTab({ url: "/pages/common/workbench/index" });
      return;
    }
    checkOnboardingOrRedirect("pages/match/center/index");
    syncCustomTabBar();
    var role = getApp().globalData.role || "";
    try {
    // 产品规则：仅学员可发起结对申请，志愿者只能在「结对待办」中接受/拒绝。
    // 因此志愿者侧不再展示推荐列表 + 「申请结对」按钮，避免出现走不通的流程。
    var fullList = [];
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
              avatar: row.avatar || "",
              timeRaw: parseFreeTimeField(row.freeTime),
              score: row.matchScore != null ? Math.round(row.matchScore) : 90,
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
    const pageSize = 10;
    var renderList = fullList.slice(0, pageSize);
    var hero = matchHeroMap[role] || matchHeroMap.student;

    var canUnbind =
      role === "student" || role === "teacher" || (role === "admin_level_2" && isVolunteerSideL2());
    var canPairTodo = role === "student" || role === "teacher" || (role === "admin_level_2" && isVolunteerSideL2());
    this.setData({
      role: role,
      canUnbind: canUnbind,
      canPairTodo: canPairTodo,
      roleName: ROLE_DISPLAY_NAME[role] || "学员",
      heroTitle: hero.title,
      list: fullList,
      renderList: renderList,
      page: 1,
      pageSize: pageSize,
      hasMore: fullList.length > pageSize
    });
  } catch (outerErr) {
    if (console && console.error) {
      console.error("[match-center] onShow unexpected error", outerErr);
    }
    this.setData({ role: role || "", renderList: [], list: [], page: 1, hasMore: false });
  }
  },
  onReachBottom: function () {
    if (this.data.renderList.length < this.data.list.length) {
      wx.showLoading({ title: "加载中...", mask: true });
      const self = this;
      setTimeout(() => {
        wx.hideLoading();
        const nextPage = self.data.page + 1;
        const nextRenderList = self.data.list.slice(0, nextPage * self.data.pageSize);
        self.setData({
          page: nextPage,
          renderList: nextRenderList,
          hasMore: self.data.list.length > nextRenderList.length
        });
      }, 250);
    }
  },
  onPullDownRefresh: function () {
    this.onShow();
    wx.stopPullDownRefresh();
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
      var newRenderList = newList.slice(0, this.data.page * this.data.pageSize);
      this.setData({
        list: newList,
        renderList: newRenderList,
        hasMore: newList.length > newRenderList.length
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
