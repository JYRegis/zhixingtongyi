const { to } = require("../../../utils/nav");
const {
  PROXY_STUDENTS,
  getActingStudent,
  setActingStudent,
  clearActingStudent
} = require("../../../utils/proxyStudents");
const { ROLE_DISPLAY_NAME } = require("../../../utils/roleLabels");

var subjectSummaryMap = {
  "数学": "函数、几何与基础题型梳理",
  "英语": "口语陪练、单词与句型强化",
  "语文": "阅读表达、作文与积累训练",
  "物理": "概念理解与题型拆解"
};

var matchHeroMap = {
  student: {
    eyebrow: "智能推荐",
    title: "为你匹配合适的志愿者",
    desc: "根据学科、时间和陪伴风格推荐合适的志愿者老师，帮助你更快找到适合自己的支教伙伴。",
    badges: ["学科筛选", "在线申请", "操作便捷"]
  },
  teacher: {
    eyebrow: "匹配协同",
    title: "查看当前匹配建议",
    desc: "从教师视角快速了解推荐关系与申请流转，便于处理申请与沟通衔接。",
    badges: ["匹配列表清晰", "申请入口集中", "流程清晰"]
  },
  admin_level_2: {
    eyebrow: "代操作模式",
    title: "代学员发起结对申请",
    desc: "学校老师可先选择当前学员，再查看推荐教师与发起申请，保证每一步代理操作都清晰可见。",
    badges: ["先选学员", "状态条可见", "推荐卡更清晰"]
  },
  admin_level_1: {
    eyebrow: "平台巡查",
    title: "巡看推荐与申请状态",
    desc: "从平台视角查看匹配流程，可快速查看推荐结果与后续处理入口。",
    badges: ["管理端可用", "入口集中", "便于巡查"]
  }
};

var rawList = [
  { id: 1, teacher: "王同学", subject: "数学", time: "周六 19:00", score: 92, style: "温和耐心" },
  { id: 2, teacher: "李同学", subject: "英语", time: "周日 14:00", score: 88, style: "互动积极" },
  { id: 3, teacher: "赵同学", subject: "语文", time: "周三 20:00", score: 81, style: "阅读写作" }
];

function enrichItem(item) {
  var scoreTag = "可继续观察";
  if (item.score >= 90) {
    scoreTag = "优先推荐";
  } else if (item.score >= 85) {
    scoreTag = "较高匹配";
  }
  return {
    id: item.id,
    teacher: item.teacher,
    subject: item.subject,
    time: item.time,
    score: item.score,
    style: item.style,
    scoreTag: scoreTag,
    summary: subjectSummaryMap[item.subject] || "适合持续跟进学习节奏",
    highlight: item.score >= 90
  };
}

var fullList = [];
for (var i = 0; i < rawList.length; i++) {
  fullList.push(enrichItem(rawList[i]));
}

Page({
  data: {
    role: "",
    roleName: "学员",
    heroEyebrow: "",
    heroTitle: "",
    heroDesc: "",
    heroBadges: [],
    actingHint: "",
    actingSummary: "",
    selectedSubjectIndex: 0,
    selectedCountText: "",
    actingStudent: null,
    proxyStudents: [],
    filterSubject: "全部",
    subjectOptions: ["全部", "数学", "英语", "语文", "物理"],
    renderList: [],
    list: fullList
  },
  onShow: function () {
    var role = getApp().globalData.role || "";
    var actingStudent = role === "admin_level_2" ? getActingStudent() : null;
    var renderList = this.getFilteredList(this.data.filterSubject);
    var hero = matchHeroMap[role] || matchHeroMap.student;

    var actingHint = "可直接浏览推荐列表并发起申请";
    var actingSummary = "";
    if (role === "admin_level_2") {
      if (actingStudent) {
        actingHint = "当前正在替「" + actingStudent.name + "」浏览推荐与发起申请";
        actingSummary = actingStudent.name + " · " + actingStudent.grade;
      } else {
        actingHint = "当前为学校老师代操作模式，请先选择学员后继续";
        actingSummary = "尚未选择代操作学员";
      }
    }

    this.setData({
      role: role,
      roleName: ROLE_DISPLAY_NAME[role] || "学员",
      heroEyebrow: hero.eyebrow,
      heroTitle: hero.title,
      heroDesc: hero.desc,
      heroBadges: hero.badges,
      actingStudent: actingStudent,
      proxyStudents: role === "admin_level_2" ? PROXY_STUDENTS : [],
      renderList: renderList,
      selectedCountText: "当前共 " + renderList.length + " 位推荐教师",
      actingHint: actingHint,
      actingSummary: actingSummary
    });
  },
  onPullDownRefresh: function () {
    this.onShow();
    wx.stopPullDownRefresh();
  },
  onSubjectChange: function (e) {
    var index = Number(e.detail.value);
    var value = this.data.subjectOptions[index];
    var renderList = this.getFilteredList(value);
    this.setData({
      selectedSubjectIndex: index,
      filterSubject: value,
      renderList: renderList,
      selectedCountText: "当前共 " + renderList.length + " 位推荐教师"
    });
  },
  getFilteredList: function (subject) {
    var selected = subject || this.data.filterSubject;
    if (selected === "全部") {
      return this.data.list;
    }
    return this.data.list.filter(function (item) {
      return item.subject === selected;
    });
  },
  onPickProxyStudent: function (e) {
    var id = e.currentTarget.dataset.id;
    var one = PROXY_STUDENTS.find(function (s) { return s.id === id; });
    if (!one) {
      return;
    }
    setActingStudent({ id: one.id, name: one.name, grade: one.grade });
    this.onShow();
    wx.showToast({ title: "将为「" + one.name + "」发起匹配", icon: "success" });
  },
  onChangeProxyStudent: function () {
    var self = this;
    wx.showModal({
      title: "更换学员",
      content: "确定要更换当前代操作的学员吗？更换后请重新确认推荐列表。",
      success: function (res) {
        if (res.confirm) {
          clearActingStudent();
          self.onShow();
        }
      }
    });
  },
  onApply: function (e) {
    var id = e.currentTarget.dataset.id;
    var one = this.data.list.find(function (item) { return item.id === id; });
    var role = this.data.role;
    var actingStudent = this.data.actingStudent;
    if (role === "admin_level_2") {
      if (!actingStudent || !actingStudent.id) {
        wx.showToast({ title: "请先选择要代操作的学员", icon: "none" });
        return;
      }
      wx.showToast({
        title: "已为「" + actingStudent.name + "」发起申请",
        icon: "success"
      });
      return;
    }
    wx.showToast({
      title: "已申请 " + (one ? one.teacher : "#" + id),
      icon: "success"
    });
  },
  toRequests: function () {
    to("/pages/match/requests/index");
  },
  toUnbind: function () {
    to("/pages/match/unbind/index");
  }
});
