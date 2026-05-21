const { adminApi } = require("../../../utils/api");
const { checkOnboardingOrRedirect } = require("../../../utils/onboardingGuard");
const { fetchSchools } = require("../../../utils/schoolsMock");

const ROLE_TYPES = [
  {
    name: "受援方管理员",
    desc: "管理学生、审核时长、管理结对",
    permissions: ["user_manage", "student_manage", "pair_manage", "volunteer_record_audit"],
    side: "recipient"
  },
  {
    name: "支教方管理员",
    desc: "管理用户、审核志愿者",
    permissions: ["user_manage", "teacher_audit"],
    side: "support"
  }
];

Page({
  data: {
    userId: "",
    schoolList: [],
    schoolNames: [],
    schoolIndex: -1,
    roleTypeNames: ROLE_TYPES.map((r) => r.name),
    roleTypeIndex: 0
  },
  onShow() {
    checkOnboardingOrRedirect("pages/admin/secondary-admins/index");
    this._loadSchools();
  },
  _loadSchools() {
    const self = this;
    const roleType = ROLE_TYPES[this.data.roleTypeIndex];
    const kind = roleType && roleType.side === "support" ? "support" : "recipient";
    fetchSchools({ kind: kind }).then((list) => {
      const names = list.map((s) => s.name);
      self.setData({ schoolList: list, schoolNames: names });
    });
  },
  onUserIdInput(e) { this.setData({ userId: e.detail.value }); },
  onSchoolChange(e) { this.setData({ schoolIndex: Number(e.detail.value) }); },
  onRoleTypeChange(e) {
    const idx = Number(e.detail.value);
    this.setData({ roleTypeIndex: idx, schoolIndex: -1 });
    this._loadSchools();
  },
  onSubmit() {
    const userId = (this.data.userId || "").trim();
    if (!userId || !/^\d+$/.test(userId) || userId.length > 20) {
      wx.showToast({ title: "请输入正确的邀请码（纯数字，不超过20位）", icon: "none" });
      return;
    }
    const roleType = ROLE_TYPES[this.data.roleTypeIndex];
    if (this.data.schoolIndex < 0) {
      wx.showToast({ title: "请选择管辖学校", icon: "none" });
      return;
    }
    const school = this.data.schoolList[this.data.schoolIndex];
    const schoolId = Number(school.id);
    const regionCode = school.regionCode || school.region_code || "";
    const data = {
      userId: Number(userId),
      schoolId: schoolId,
      regionCode: regionCode,
      permissions: roleType.permissions
    };
    wx.showLoading({ title: "提交中", mask: true });
    adminApi.assignSecondaryAdmin(data).then(() => {
      wx.hideLoading();
      const schoolText = (this.data.schoolList[this.data.schoolIndex] || {}).name || "";
      wx.showModal({
        title: "分配成功",
        content: "已分配「" + roleType.name + "」身份，管辖学校：" + schoolText + "。",
        showCancel: false
      });
      this.setData({ userId: "", schoolIndex: -1 });
    }).catch((err) => {
      wx.hideLoading();
      wx.showToast({ title: (err && err.message) || "分配失败", icon: "none" });
    });
  }
});
