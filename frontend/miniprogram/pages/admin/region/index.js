const { PROXY_STUDENTS, getActingStudent, setActingStudent } = require("../../../utils/proxyStudents");

Page({
  data: {
    regionName: "云龙县龙兴村试点校",
    students: PROXY_STUDENTS,
    selectedStudentId: "",
    actingStudent: null,
    summaryCards: []
  },
  onShow() {
    const acting = getActingStudent();
    this.setData({
      actingStudent: acting,
      selectedStudentId: acting ? acting.id : "",
      summaryCards: this.buildSummaryCards(acting)
    });
  },
  onPullDownRefresh() {
    this.onShow();
    wx.stopPullDownRefresh();
  },
  buildSummaryCards(actingStudent) {
    const students = this.data.students || [];
    const pairedCount = students.filter((item) => item.binding === "已绑定").length;
    const matchingCount = students.filter((item) => item.progress === "结对中").length;
    return [
      {
        label: "所辖学员",
        value: `${students.length}人`,
        note: "当前区域内已录入的学生"
      },
      {
        label: "已绑定账号",
        value: `${pairedCount}人`,
        note: "已完成基础账号绑定的学生"
      },
      {
        label: "当前代操作",
        value: actingStudent ? actingStudent.name : "未选择",
        note: actingStudent ? "与匹配页联动使用同一学员" : "可从列表快速指定当前学生"
      }
    ];
  },
  onSelectStudent(e) {
    const id = e.currentTarget.dataset.id;
    const one = this.data.students.find((s) => s.id === id);
    if (!one) {
      return;
    }
    setActingStudent({ id: one.id, name: one.name, grade: one.grade });
    this.setData({
      selectedStudentId: id,
      actingStudent: getActingStudent(),
      summaryCards: this.buildSummaryCards(getActingStudent())
    });
    wx.showToast({ title: "已设为当前代操作学员", icon: "success" });
  },
  onCreateAccount() {
    wx.showToast({
      title: "已创建学员账号",
      icon: "success"
    });
  },
  onReviewIdentity() {
    wx.showToast({
      title: "已提交身份审核",
      icon: "success"
    });
  }
});
