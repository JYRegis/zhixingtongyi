const { adminApi } = require("../../../utils/api");
const { checkOnboardingOrRedirect } = require("../../../utils/onboardingGuard");

Page({
  data: {
    name: "",
    regionCode: "",
    address: "",
    schoolTypes: [
      { value: 0, name: "乡村学校 (受援方)" },
      { value: 1, name: "高校 (支教方)" }
    ],
    typeIndex: 0
  },
  onShow() { checkOnboardingOrRedirect("pages/admin/schools/index"); },
  onInput(e) { this.setData({ [e.currentTarget.dataset.k]: e.detail.value }); },
  onPickType(e) { this.setData({ typeIndex: Number(e.detail.value) }); },
  onSubmit() {
    const { name, regionCode, address, schoolTypes, typeIndex } = this.data;
    if (!name || !name.trim()) {
      wx.showToast({ title: "请输入学校名称", icon: "none" });
      return;
    }
    if (!regionCode || !regionCode.trim()) {
      wx.showToast({ title: "请输入地区编码", icon: "none" });
      return;
    }
    if (!address || !address.trim()) {
      wx.showToast({ title: "请输入地址", icon: "none" });
      return;
    }
    const type = schoolTypes[typeIndex].value;
    const payload = {
      name: name.trim(),
      regionCode: regionCode.trim(),
      address: address.trim(),
      type: type
    };
    wx.showLoading({ title: "提交中", mask: true });
    adminApi.createSchool(payload)
      .then(() => {
        wx.hideLoading();
        wx.showToast({ title: "已创建", icon: "success" });
        setTimeout(() => {
          wx.navigateBack();
        }, 1000);
      })
      .catch((err) => {
        wx.hideLoading();
        wx.showToast({ title: (err && err.message) || "失败", icon: "none" });
      });
  }
});
