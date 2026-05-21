const { authApi, studentApi, teacherApi } = require("../../../utils/api");
const { intToAppRole, appRoleToRoleApplyTarget, isLearnerRole, isAdminRole } = require("../../../utils/backendRole");

/** 后端审核状态数字 → 前端 onboardingStatus 字符串 */
function mapAuditStatus(code) {
  const n = Number(code);
  if (n === 0) return "pending";
  if (n === 1) return "approved";
  if (n === 2) return "rejected";
  return "";
}

Page({
  data: {
    fromProfile: false,
    manualPhone: "",
    submitting: false
  },
  onLoad(query) {
    this._returnTo = ((query && query.returnTo) || "").trim();
    const fromProfile = this._returnTo === "profile";
    this.setData({
      fromProfile: fromProfile
    });
    try {
      wx.setNavigationBarTitle({ title: "登录" });
    } catch (e) {
      // ignore
    }
  },
  onShow() {
    try {
      wx.setNavigationBarTitle({ title: "登录" });
    } catch (e) {
      // ignore
    }
  },
  async onWxIdentityLogin() {
    await this.submitLogin({ mode: "wechat" });
  },
  onManualPhoneInput(e) {
    const value = (e.detail.value || "").replace(/\D/g, "").slice(0, 11);
    this.setData({ manualPhone: value });
  },
  async onManualSubmit() {
    const phone = (this.data.manualPhone || "").replace(/\D/g, "").slice(0, 11);
    if (!/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: "请填写11位大陆手机号", icon: "none" });
      return;
    }
    await this.submitLogin({
      mode: "phone",
      phone: phone
    });
  },
  async submitLogin(options) {
    if (this.data.submitting) {
      return;
    }
    this.setData({ submitting: true });
    const app = getApp();
    const selectedRole = (app.globalData && app.globalData.role) || "";
    const appUser = (app.globalData && app.globalData.userInfo) || {};
    // 登录界面不再要求输入昵称/头像；首次登录时让后端使用默认昵称
    // 「微信用户」/「用户XXXX」，之后通过 auth-setup 页或资料页修改。
    const displayNick =
      (appUser.nickname && String(appUser.nickname).trim()) ||
      (appUser.name && String(appUser.name).trim()) ||
      (appUser.nickName && String(appUser.nickName).trim()) ||
      "微信用户";
    const displayAvatar = String(appUser.avatarUrl || appUser.avatar || "").trim();
    let token = "";
    let remoteUser = null;
    try {
      let loginRes = null;
      if (options.mode === "phone") {
        loginRes = await authApi.phoneLogin({
          phone: options.phone
        });
      } else {
        const loginCode = await this.fetchWxLoginCode();
        loginRes = await authApi.wxLogin({ code: loginCode });
      }
      token = loginRes && loginRes.token ? loginRes.token : "";
      remoteUser = loginRes && loginRes.user ? loginRes.user : null;
      if (token) {
        app.globalData.token = token;
        wx.setStorageSync("token", token);
      }
      // 始终以后端返回的 role 为权威：避免本地缓存的 selectedRole（用户曾在
      // role-select 选过「受援学员」）覆盖管理员/已注册老用户的真实身份。
      const backendRole = remoteUser && remoteUser.role != null ? intToAppRole(remoteUser.role) : "";
      const effectiveRole = backendRole || (isLearnerRole(selectedRole) ? selectedRole : "student");
      // 仅当 ① 用户在本地明确选择了「志愿者」② 后端当前角色仍是默认 student
      // ③ 还未填资料时，才调用 roleApply 把账号升级为 TEACHER。
      // 学员保持默认即可，无需调用；管理员账号 backendRole 已经是 admin_*，不会触发。
      const needRoleApply =
        selectedRole === "teacher" &&
        backendRole === "student" &&
        !(remoteUser && remoteUser.hasProfile);
      if (token && needRoleApply) {
        await authApi.roleApply("TEACHER");
      }
      remoteUser = {
        ...(remoteUser || {}),
        _effectiveRole: effectiveRole
      };
    } catch (e) {
      wx.showToast({
        title: (e && e.message) || "登录失败",
        icon: "none"
      });
      this.setData({ submitting: false });
      return;
    }
    const phoneFromBackend = (remoteUser && remoteUser.phone) || "";
    const finalPhone = /^1\d{10}$/.test(String(phoneFromBackend)) ? String(phoneFromBackend) : "";
    const finalRole = (remoteUser && remoteUser._effectiveRole) || "student";
    // 后端登录响应只含 hasProfile，不返回审核状态。这里对学员/志愿者额外拉一次资料，
    // 把 student_profile.auditStatus / teacher_profile.certificationStatus 映射成
    // 前端 onboardingGuard 认识的 onboardingStatus（pending/approved/rejected）。
    // 否则 guard 拿到默认空值会把已通过审核的用户误跳到入驻申请页。
    let onboardingStatus = "";
    if (remoteUser && remoteUser.hasProfile) {
      try {
        if (finalRole === "student") {
          const sp = await studentApi.getProfile();
          onboardingStatus = mapAuditStatus(sp && sp.auditStatus);
        } else if (finalRole === "teacher") {
          const tp = await teacherApi.getProfile();
          onboardingStatus = mapAuditStatus(tp && tp.certificationStatus);
        } else if (isAdminRole(finalRole)) {
          onboardingStatus = "approved";
        }
      } catch (err) {
        if (console && console.warn) {
          console.warn("[auth] getProfile after login failed", err);
        }
      }
    }
    app.setLogin(finalRole, {
      nickname: (remoteUser && remoteUser.username) || displayNick,
      avatarUrl: (remoteUser && remoteUser.avatar) || displayAvatar,
      phone: finalPhone,
      role: finalRole,
      backendRoleCode: remoteUser && remoteUser.role,
      backendUserId: remoteUser && remoteUser.id,
      hasProfile: !!(remoteUser && remoteUser.hasProfile),
      roleApplied: !!(remoteUser && remoteUser.roleApplied),
      onboardingStatus: onboardingStatus,
      userId: finalPhone || (remoteUser && remoteUser.id ? String(remoteUser.id) : "")
    });
    const backToProfile = this._returnTo === "profile";
    let okTitle = "完成";
    if (backToProfile) {
      okTitle = "已更新";
    } else {
      okTitle = "登录成功";
    }
    wx.showToast({ title: okTitle, icon: "success" });
    setTimeout(() => {
      if (backToProfile) {
        wx.navigateBack({
          fail: function () {
            wx.redirectTo({ url: "/pages/common/profile/index" });
          }
        });
        return;
      }
      // 全新用户（后端首次注册、还没填资料）：先让用户在 auth-setup 设置头像与昵称，
      // 之后再去 role-select / workbench。管理员账号或已有资料的老用户直接进工作台。
      const isNewUser = !(remoteUser && remoteUser.hasProfile);
      const isAdmin = isAdminRole(finalRole);
      if (isNewUser && !isAdmin) {
        wx.reLaunch({ url: "/pages/common/auth-setup/index" });
        return;
      }
      // 其它情况（管理员、已有资料的老用户）统一进工作台；
      // 工作台 onShow 里的 onboardingGuard 会处理未完成入驻 / 审核中的场景。
      wx.reLaunch({ url: "/pages/common/workbench/index" });
    }, 400);
    this.setData({ submitting: false });
  },
  fetchWxLoginCode() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: (res) => {
          const code = res && res.code;
          if (!code) {
            reject(new Error("微信登录 code 获取失败"));
            return;
          }
          resolve(code);
        },
        fail: () => reject(new Error("微信登录失败"))
      });
    });
  }
});
