const {
  getPairedList,
  getPairedListForUser,
  getPairedListForL1,
  getL1SchoolFilterOptions,
  getPairedListForRecipientL2,
  getPairedListForVolunteerL2
} = require("../../../utils/chatPartners");
const { ROLE_DISPLAY_NAME } = require("../../../utils/roleLabels");
const { checkOnboardingOrRedirect } = require("../../../utils/onboardingGuard");
const { syncCustomTabBar } = require("../../../utils/customTabBar");
const { mergeFromStorageIntoApp, getByPhone } = require("../../../utils/userProfileStore");

Page({
  data: {
    role: "",
    roleName: "未登录",
    pairs: [],
    l1FilterSchools: [],
    l1FilterIndex: 0,
    emptyHint: ""
  },
  onShow() {
    checkOnboardingOrRedirect("pages/chat/list/index");
    syncCustomTabBar();
    mergeFromStorageIntoApp();
    const u = (getApp().globalData && getApp().globalData.userInfo) || {};
    const profile = getByPhone(u.phone) || u;
    const role = getApp().globalData.role || "";
    if (role === "admin_level_1") {
      const l1FilterSchools = getL1SchoolFilterOptions();
      let l1FilterIndex = this.data.l1FilterIndex;
      if (l1FilterIndex < 0 || l1FilterIndex >= l1FilterSchools.length) {
        l1FilterIndex = 0;
      }
      const all = getPairedListForL1();
      const schoolId = (l1FilterSchools[l1FilterIndex] && l1FilterSchools[l1FilterIndex].id) || "";
      const pairs = schoolId ? all.filter((p) => p.schoolId === schoolId) : all;
      var emptyHint = "";
      if (!pairs.length) {
        emptyHint = schoolId
          ? "该学校下暂无演示会话，可在上方改选「全部学校」"
          : "暂无会话";
      }
      this.setData({
        role,
        roleName: ROLE_DISPLAY_NAME[role] || "未登录",
        pairs: pairs,
        l1FilterSchools: l1FilterSchools,
        l1FilterIndex: l1FilterIndex,
        emptyHint: emptyHint
      });
      return;
    }
    if (role === "admin_level_2" && profile.l2Scope === "recipient_side") {
      const pairs = u.phone ? getPairedListForRecipientL2(String(u.phone), profile) : [];
      var emptyHint2 = "";
      if (!u.phone) {
        emptyHint2 = "请先登录";
      } else if (!pairs.length) {
        emptyHint2 = "暂无由您通过审核的学员对话；在「区域管理」中通过学生注册后，会出现在此列表，加入后即可查看。";
      }
      this.setData({
        role,
        roleName: ROLE_DISPLAY_NAME[role] || "未登录",
        pairs: pairs,
        l1FilterSchools: [],
        l1FilterIndex: 0,
        emptyHint: emptyHint2
      });
      return;
    }
    if (role === "admin_level_2" && profile.l2Scope === "volunteer_side") {
      const pairs = u.phone ? getPairedListForVolunteerL2(String(u.phone), profile) : [];
      var emptyHintV = "";
      if (!u.phone) {
        emptyHintV = "请先登录";
      } else if (!pairs.length) {
        emptyHintV = "暂无可查看的志愿者会话；在「区域管理」中通过教师注册后，会出现在此列表，加入后即可查看与学员的聊天。";
      }
      this.setData({
        role,
        roleName: ROLE_DISPLAY_NAME[role] || "未登录",
        pairs: pairs,
        l1FilterSchools: [],
        l1FilterIndex: 0,
        emptyHint: emptyHintV
      });
      return;
    }
    const pairs =
      role && (role === "student" || role === "teacher")
        ? getPairedListForUser(String(u.phone || ""), role)
        : role
          ? getPairedList(role)
          : [];
    var emptyHint3 = "";
    if (!pairs.length) {
      if (!role) {
        emptyHint3 = "请先登录";
      } else {
        emptyHint3 = "请先在「匹配」中结对，或本角色暂无聊天演示";
      }
    }
    this.setData({
      role,
      roleName: ROLE_DISPLAY_NAME[role] || "未登录",
      pairs: pairs,
      l1FilterSchools: [],
      l1FilterIndex: 0,
      emptyHint: emptyHint3
    });
  },
  onL1SchoolFilterChange(e) {
    if ((getApp().globalData && getApp().globalData.role) !== "admin_level_1") {
      return;
    }
    const ix = Number((e && e.detail && e.detail.value) != null ? e.detail.value : 0);
    const l1FilterSchools = getL1SchoolFilterOptions();
    if (ix < 0 || ix >= l1FilterSchools.length) {
      return;
    }
    const all = getPairedListForL1();
    const schoolId = (l1FilterSchools[ix] && l1FilterSchools[ix].id) || "";
    const pairs = schoolId ? all.filter((p) => p.schoolId === schoolId) : all;
    var emptyHint3 = "";
    if (!pairs.length) {
      emptyHint3 = schoolId
        ? "该学校下暂无演示会话，可改选「全部学校」"
        : "暂无会话";
    }
    this.setData({
      l1FilterIndex: ix,
      l1FilterSchools: l1FilterSchools,
      pairs: pairs,
      emptyHint: emptyHint3
    });
  },
  onOpenRoom(e) {
    const { id, name } = e.currentTarget.dataset;
    if (!id) {
      return;
    }
    wx.navigateTo({
      url: `/pages/chat/room/index?partnerId=${encodeURIComponent(id)}&partnerName=${encodeURIComponent(name || "聊天")}`
    });
  },
  toMatch() {
    wx.switchTab({ url: "/pages/match/center/index" });
  }
});
