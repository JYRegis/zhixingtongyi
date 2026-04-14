const { to } = require("../../../utils/nav");
const {
  PROXY_STUDENTS,
  getActingStudent,
  setActingStudent,
  clearActingStudent
} = require("../../../utils/proxyStudents");

Page({
  data: {
    role: "",
    /** 学校老师须先选学员 */
    actingStudent: null,
    proxyStudents: [],
    filterSubject: "全部",
    subjectOptions: ["全部", "数学", "英语", "语文", "物理"],
    renderList: [],
    list: [
      { id: 1, teacher: "王同学", subject: "数学", time: "周六 19:00", score: 92, style: "温和耐心" },
      { id: 2, teacher: "李同学", subject: "英语", time: "周日 14:00", score: 88, style: "互动积极" },
      { id: 3, teacher: "赵同学", subject: "语文", time: "周三 20:00", score: 81, style: "阅读写作" }
    ]
  },
  onShow() {
    const role = getApp().globalData.role || "student";
    const actingStudent = role === "admin_level_2" ? getActingStudent() : null;
    this.setData({
      role,
      actingStudent,
      proxyStudents: role === "admin_level_2" ? PROXY_STUDENTS : [],
      renderList: this.getFilteredList()
    });
  },
  onSubjectChange(e) {
    const value = this.data.subjectOptions[Number(e.detail.value)];
    this.setData({
      filterSubject: value,
      renderList: this.getFilteredList(value)
    });
  },
  getFilteredList(subject) {
    const selected = subject || this.data.filterSubject;
    if (selected === "全部") {
      return this.data.list;
    }
    return this.data.list.filter((item) => item.subject === selected);
  },
  onPickProxyStudent(e) {
    const id = e.currentTarget.dataset.id;
    const one = PROXY_STUDENTS.find((s) => s.id === id);
    if (!one) {
      return;
    }
    setActingStudent({ id: one.id, name: one.name, grade: one.grade });
    this.setData({ actingStudent: getActingStudent() });
    wx.showToast({ title: `将为「${one.name}」发起匹配`, icon: "success" });
  },
  onChangeProxyStudent() {
    wx.showModal({
      title: "更换学员",
      content: "确定要更换当前代操作的学员吗？更换后请重新确认推荐列表。",
      success: (res) => {
        if (res.confirm) {
          clearActingStudent();
          this.setData({ actingStudent: null });
        }
      }
    });
  },
  onApply(e) {
    const id = e.currentTarget.dataset.id;
    const { role, actingStudent } = this.data;
    if (role === "admin_level_2") {
      if (!actingStudent || !actingStudent.id) {
        wx.showToast({ title: "请先选择要代操作的学员", icon: "none" });
        return;
      }
      wx.showToast({
        title: `已为「${actingStudent.name}」发起申请 #${id}`,
        icon: "success"
      });
      return;
    }
    wx.showToast({
      title: `已发起申请 #${id}`,
      icon: "success"
    });
  },
  toRequests() {
    to("/pages/match/requests/index");
  },
  toUnbind() {
    to("/pages/match/unbind/index");
  }
});
