const { adminApi } = require("../../../utils/api");
const { checkOnboardingOrRedirect } = require("../../../utils/onboardingGuard");

const roles = [
  { label: "全部", value: "" },
  { label: "学生", value: 3 },
  { label: "志愿者", value: 2 },
  { label: "二级管理员", value: 1 },
  { label: "一级管理员", value: 0 }
];

Page({
  data: { list: [], roleOptions: roles, roleIndex: 0, keyword: "" },
  onShow() {
    checkOnboardingOrRedirect("pages/admin/users/index");
    this.load();
  },
  load() {
    const role = roles[this.data.roleIndex] && roles[this.data.roleIndex].value;
    adminApi.users({ role, page: 1, size: 50, keyword: this.data.keyword || "" }).then((rows) => {
      const list = Array.isArray(rows) ? rows : (rows && rows.records) || [];
      this.setData({ list: list.map((r) => ({ ...r, roleName: r.roleName || r.role || "用户" })) });
    }).catch(() => this.setData({ list: [] }));
  },
  onRoleChange(e) { this.setData({ roleIndex: Number(e.detail.value) || 0 }, () => this.load()); },
  onKeyword(e) { this.setData({ keyword: e.detail.value || "" }); },
  onSearch() { this.load(); },
  onView(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: "/pages/admin/users/detail/index?id=" + encodeURIComponent(String(id)) });
  }
});
