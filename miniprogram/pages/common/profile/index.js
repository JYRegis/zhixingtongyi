const { ROLE_DISPLAY_NAME } = require("../../../utils/roleLabels");

const roleFieldMap = {
  teacher: ["name", "school", "grade", "subjects", "personality", "availableTime"],
  student: ["name", "school", "grade", "subjects", "guardianContact", "learningGoal"],
  admin_level_2: ["name", "school", "region", "managedStudents"],
  admin_level_1: ["name", "organization", "permissionNote"]
};

Page({
  data: {
    role: "",
    roleLabel: "",
    visibleFields: [],
    fieldVisible: {},
    form: {
      name: "",
      school: "",
      grade: "",
      subjects: "",
      personality: "",
      availableTime: "",
      guardianContact: "",
      learningGoal: "",
      region: "",
      managedStudents: "",
      organization: "",
      permissionNote: ""
    }
  },
  onLoad() {
    const role = getApp().globalData.role || "student";
    const visibleFields = roleFieldMap[role] || roleFieldMap.student;
    const fieldVisible = visibleFields.reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {});
    this.setData({
      role,
      roleLabel: ROLE_DISPLAY_NAME[role] || "访客",
      visibleFields,
      fieldVisible
    });
  },
  onInput(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({
      [`form.${field}`]: value
    });
  },
  onSubmit() {
    const { form, visibleFields } = this.data;
    if (!form.name || !form.name.trim()) {
      wx.showToast({ title: "请填写姓名", icon: "none" });
      return;
    }
    if (visibleFields.includes("school") && !form.school.trim()) {
      wx.showToast({ title: "请填写学校", icon: "none" });
      return;
    }
    if (visibleFields.includes("grade") && !form.grade.trim()) {
      wx.showToast({ title: "请填写年级", icon: "none" });
      return;
    }
    wx.showToast({
      title: "资料已提交",
      icon: "success"
    });
  }
});
