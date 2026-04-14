const { PROXY_STUDENTS, getActingStudent, setActingStudent } = require("../../../utils/proxyStudents");

Page({
  data: {
    regionName: "云龙县龙兴村试点校",
    students: PROXY_STUDENTS,
    selectedStudentId: "",
    actingStudent: null
  },
  onShow() {
    const acting = getActingStudent();
    this.setData({
      actingStudent: acting,
      selectedStudentId: acting ? acting.id : ""
    });
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
      actingStudent: getActingStudent()
    });
    wx.showToast({ title: "已设为当前代操作学员", icon: "success" });
  },
  onCreateAccount() {
    wx.showToast({
      title: "已创建学员账号（示例）",
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
