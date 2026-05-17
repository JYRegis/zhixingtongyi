const { adminApi } = require("../../../utils/api");
const { checkOnboardingOrRedirect } = require("../../../utils/onboardingGuard");

Page({
  data: { name: "", regionCode: "", address: "", contactPerson: "", contactPhone: "" },
  onShow() { checkOnboardingOrRedirect("pages/admin/schools/index"); },
  onInput(e) { this.setData({ [e.currentTarget.dataset.k]: e.detail.value }); },
  onSubmit() {
    adminApi.createSchool(this.data).then(() => wx.showToast({ title: "已创建", icon: "success" })).catch((err) => wx.showToast({ title: (err && err.message) || "失败", icon: "none" }));
  }
});
