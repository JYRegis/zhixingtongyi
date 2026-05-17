const { adminApi } = require("../../../utils/api");
const { checkOnboardingOrRedirect } = require("../../../utils/onboardingGuard");
const { fetchSchools } = require("../../../utils/schoolsMock");

const ROLE_TYPES = [
  {
    name: "受援方管理员",
    desc: "管理学生、审核教师、审核时长、管理结对",
    permissions: ["user_manage", "student_manage", "teacher_audit", "pair_manage", "volunteer_record_audit"]
  },
  {
    name: "支教方管理员",
    desc: "管理用户、审核志愿者",
    permissions: ["user_manage", "teacher_audit"]
  }
];

Page({
  data: {
    phone: "",
    foundUser: null,
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
    fetchSchools().then((list) => {
      const names = list.map((s) => s.name);
      this.setData({ schoolList: list, schoolNames: names });
    });
  },
  onPhone(e) {
    this.setData({ phone: e.detail.value });
  },
  onSearchUser() {
    const phone = (this.data.phone || "").trim();
    if (phone.length !== 11) {
      wx.showToast({ title: "请输入11位手机号", icon: "none" });
      return;
    }
    adminApi.users({ phone: phone, page: 1, size: 1 }).then((res) => {
      const records = (res && (res.records || res.list)) || (Array.isArray(res) ? res : []);
      if (records.length === 0) {
        wx.showToast({ title: "未找到该用户", icon: "none" });
        this.setData({ foundUser: null });
        return;
      }
      const user = records[0];
      this.setData({ foundUser: user });
      wx.showToast({ title: "已找到: " + (user.username || user.phone), icon: "none" });
    }).catch(() => {
      wx.showToast({ title: "查询失败", icon: "none" });
      this.setData({ foundUser: null });
    });
  },
  onSchoolChange(e) {
    this.setData({ schoolIndex: Number(e.detail.value) });
  },
  onRoleTypeChange(e) {
    this.setData({ roleTypeIndex: Number(e.detail.value) });
  },
  onSubmit() {
    if (!this.data.foundUser) {
      wx.showToast({ title: "请先查找用户", icon: "none" });
      return;
    }
    if (this.data.schoolIndex < 0) {
      wx.showToast({ title: "请选择学校", icon: "none" });
      return;
    }
    const school = this.data.schoolList[this.data.schoolIndex];
    const roleType = ROLE_TYPES[this.data.roleTypeIndex];
    const data = {
      userId: Number(this.data.foundUser.id),
      schoolId: Number(school.id),
      regionCode: school.regionCode || school.region_code || "",
      permissions: roleType.permissions
    };
    adminApi.assignSecondaryAdmin(data).then(() => {
      wx.showToast({ title: "分配成功", icon: "success" });
    }).catch((err) => {
      wx.showToast({ title: (err && err.message) || "分配失败", icon: "none" });
    });
  }
});
