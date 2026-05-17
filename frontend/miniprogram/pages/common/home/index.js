const { authApi, studentApi, teacherApi } = require("../../../utils/api");
const { intToAppRole, isAdminRole } = require("../../../utils/backendRole");

/** 后端审核状态数字 → 前端 onboardingStatus 字符串 */
function mapAuditStatus(code) {
  if (code == null) return "";
  const n = Number(code);
  if (isNaN(n)) return "";
  if (n === 0) return "pending";
  if (n === 1) return "approved";
  if (n === 2) return "rejected";
  return "";
}

Page({
  data: {
    manualPhone: "",
    submitting: false
  },
  onManualPhoneInput(e) {
    const value = (e.detail.value || "").replace(/\D/g, "").slice(0, 11);
    this.setData({ manualPhone: value });
  },
  async onWxIdentityLogin() {
    await this.submitLogin({ mode: "wechat" });
  },
  async onManualSubmit() {
    const phone = (this.data.manualPhone || "").replace(/\D/g, "").slice(0, 11);
    if (!/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: "请填写11位大陆手机号", icon: "none" });
      return;
    }
    await this.submitLogin({ mode: "phone", phone });
  },
  async submitLogin(options) {
    if (this.data.submitting) {
      return;
    }
    this.setData({ submitting: true });
    const app = getApp();
    const appUser = (app.globalData && app.globalData.userInfo) || {};
    const displayNick =
      (appUser.nickname && String(appUser.nickname).trim()) ||
      (appUser.name && String(appUser.name).trim()) ||
      "微信用户";
    const displayAvatar = String(appUser.avatarUrl || appUser.avatar || "").trim();
    let token = "";
    let remoteUser = null;
    try {
      let loginRes = null;
      if (options.mode === "phone") {
        loginRes = await authApi.phoneLogin({ phone: options.phone });
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
      const backendRole = remoteUser && remoteUser.role != null ? intToAppRole(remoteUser.role) : "";
      const effectiveRole = backendRole || "student";
      remoteUser = { ...(remoteUser || {}), _effectiveRole: effectiveRole };
    } catch (e) {
      wx.showToast({ title: (e && e.message) || "登录失败", icon: "none" });
      this.setData({ submitting: false });
      return;
    }
    const phoneFromBackend = (remoteUser && remoteUser.phone) || "";
    const finalPhone = /^1\d{10}$/.test(String(phoneFromBackend)) ? String(phoneFromBackend) : "";
    const finalRole = (remoteUser && remoteUser._effectiveRole) || "student";
    // 后端登录响应只含 hasProfile，不返回审核状态。这里对学员/志愿者额外拉一次资料，
    // 后端登录响应已包含 auditStatus 和 permissions，无需二次调用 getProfile
    let onboardingStatus = "";
    let auditStatusCode = remoteUser && remoteUser.auditStatus != null ? remoteUser.auditStatus : null;
    if (console && console.log) console.log("[login] remoteUser.auditStatus:", remoteUser && remoteUser.auditStatus, "auditStatusCode:", auditStatusCode);
    const permissions = (remoteUser && Array.isArray(remoteUser.permissions)) ? remoteUser.permissions : [];
    if (isAdminRole(finalRole)) {
      onboardingStatus = "approved";
      if (auditStatusCode == null) auditStatusCode = 1;
    } else if (auditStatusCode != null) {
      onboardingStatus = mapAuditStatus(auditStatusCode);
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
      auditStatus: auditStatusCode,
      permissions: permissions,
      userId: finalPhone || (remoteUser && remoteUser.id ? String(remoteUser.id) : "")
    });
    wx.showToast({ title: "登录成功", icon: "success" });
    setTimeout(() => {
      const isNewUser = !(remoteUser && remoteUser.hasProfile);
      const isAdmin = isAdminRole(finalRole);
      if (isNewUser && !isAdmin) {
        wx.reLaunch({ url: "/pages/common/auth-setup/index" });
        return;
      }
      if (onboardingStatus === "pending" || (!onboardingStatus && auditStatusCode === 0)) {
        wx.reLaunch({ url: "/pages/common/onboarding-pending/index?role=" + encodeURIComponent(finalRole) + "&status=pending" });
        return;
      }
      if (onboardingStatus === "rejected" || (!onboardingStatus && auditStatusCode === 2)) {
        wx.reLaunch({ url: "/pages/common/onboarding-pending/index?role=" + encodeURIComponent(finalRole) + "&status=rejected" });
        return;
      }
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
