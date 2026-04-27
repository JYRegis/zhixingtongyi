const { authWxLogin, authPhoneLogin, authRoleApply } = require("../../../utils/backendApi");

Page({
  data: {
    fromProfile: false,
    manualPhone: "",
    nickname: "",
    avatarUrl: "",
    submitting: false
  },
  onLoad(query) {
    this._returnTo = ((query && query.returnTo) || "").trim();
    const fromProfile = this._returnTo === "profile";
    this.setData({
      fromProfile: fromProfile
    });
    // TODO: 后续恢复“已登录进入登录页自动跳转”逻辑；当前为避免影响开发测试先关闭。
    const appUser = (getApp().globalData && getApp().globalData.userInfo) || {};
    this.setData({
      nickname:
        (appUser.nickname && String(appUser.nickname).trim()) ||
        (appUser.name && String(appUser.name).trim()) ||
        (appUser.nickName && String(appUser.nickName).trim()) ||
        "",
      avatarUrl: String(appUser.avatarUrl || appUser.avatar || "").trim()
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
  onNicknameInput(e) {
    const value = (e.detail.value || "").trim();
    this.setData({ nickname: value });
  },
  onChooseAvatar(e) {
    const url = e && e.detail && e.detail.avatarUrl ? String(e.detail.avatarUrl).trim() : "";
    if (!url) {
      wx.showToast({ title: "头像获取失败", icon: "none" });
      return;
    }
    this.setData({ avatarUrl: url });
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
    const effectiveRole = (app.globalData && app.globalData.role) || "";
    const roleApplyMap = {
      student: "STUDENT",
      teacher: "TEACHER"
    };
    const appUser = (app.globalData && app.globalData.userInfo) || {};
    const preferredNick = (this.data.nickname && String(this.data.nickname).trim()) || "";
    const preferredAvatar = String(this.data.avatarUrl || "").trim();
    const displayNick =
      preferredNick ||
      (appUser.nickname && String(appUser.nickname).trim()) ||
      (appUser.name && String(appUser.name).trim()) ||
      (appUser.nickName && String(appUser.nickName).trim()) ||
      "微信用户";
    const displayAvatar = preferredAvatar || String(appUser.avatarUrl || appUser.avatar || "").trim();
    let token = "";
    let remoteUser = null;
    try {
      let loginRes = null;
      if (options.mode === "phone") {
        loginRes = await authPhoneLogin({
          phone: options.phone,
          nickName: preferredNick || undefined,
          avatarUrl: preferredAvatar || undefined
        });
      } else {
        const loginCode = await this.fetchWxLoginCode();
        const userInfoPayload = {};
        if (preferredNick) {
          userInfoPayload.nickName = preferredNick;
        }
        if (preferredAvatar) {
          userInfoPayload.avatarUrl = preferredAvatar;
        }
        const payload = {
          code: loginCode,
          userInfo: Object.keys(userInfoPayload).length ? userInfoPayload : undefined
        };
        loginRes = await authWxLogin(payload);
      }
      token = loginRes && loginRes.token ? loginRes.token : "";
      remoteUser = loginRes && loginRes.user ? loginRes.user : null;
      if (token) {
        app.globalData.token = token;
        wx.setStorageSync("token", token);
      }
      const targetRole = roleApplyMap[effectiveRole];
      if (token && targetRole) {
        await authRoleApply(targetRole);
      }
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
    app.setLogin(effectiveRole, {
      nickname: (remoteUser && remoteUser.username) || displayNick,
      avatarUrl: (remoteUser && remoteUser.avatar) || displayAvatar,
      phone: finalPhone,
      role: effectiveRole,
      userId: remoteUser && remoteUser.id ? String(remoteUser.id) : finalPhone
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
      wx.redirectTo({ url: "/pages/common/role-select/index" });
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
