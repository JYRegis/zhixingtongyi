const { authWxLogin, authPhoneLogin, authRoleApply } = require("../../../utils/backendApi");

Page({
  data: {
    fromProfile: false,
    manualPhone: "",
    wxPhoneCode: "",
    encryptedData: "",
    iv: "",
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
  /**
   * 微信手机号快速验证：真实环境需用 e.detail.code 调后端换明文。
   */
  onGetPhoneNumber(e) {
    const d = e.detail || {};
    console.log("[auth] getPhoneNumber detail:", d);
    const errMsg = String(d.errMsg || "");
    if (errMsg.indexOf("fail") !== -1) {
      if (errMsg.indexOf("cancel") !== -1) {
        wx.showToast({ title: "你已取消授权，请重新点击", icon: "none" });
      } else if (errMsg.indexOf("privacy") !== -1) {
        wx.showToast({ title: "请先同意隐私协议后再授权", icon: "none" });
      } else {
        const fullErr = errMsg || "unknown";
        wx.showModal({
          title: "手机号授权失败",
          content: "微信返回：" + fullErr + "\n请确认：小程序已开通手机号能力、当前账号在测试白名单、并已同意隐私协议。",
          showCancel: false
        });
      }
      return;
    }
    const phoneCode = d.code ? String(d.code).trim() : "";
    const encryptedData = d.encryptedData ? String(d.encryptedData).trim() : "";
    const iv = d.iv ? String(d.iv).trim() : "";
    if (phoneCode || (encryptedData && iv)) {
      this.setData({
        wxPhoneCode: phoneCode,
        encryptedData: encryptedData,
        iv: iv
      });
      wx.showToast({ title: "已授权手机号，正在登录", icon: "none" });
      this.onSubmit();
      return;
    }
    const shortErr = errMsg ? errMsg.slice(0, 28) : "无手机号凭据";
    wx.showToast({ title: "授权结果异常: " + shortErr, icon: "none" });
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
  async onSubmit() {
    await this.submitLogin({ mode: "wechat" });
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
    const nick =
      (appUser.nickname && String(appUser.nickname).trim()) ||
      (appUser.name && String(appUser.name).trim()) ||
      (appUser.nickName && String(appUser.nickName).trim()) ||
      "微信用户";
    const avatarUrl = String(appUser.avatarUrl || appUser.avatar || "").trim();
    let token = "";
    let remoteUser = null;
    try {
      let loginRes = null;
      if (options.mode === "phone") {
        loginRes = await authPhoneLogin({
          phone: options.phone,
          nickName: nick,
          avatarUrl: avatarUrl
        });
      } else {
        const hasWxPhoneCode = !!(this.data.wxPhoneCode && String(this.data.wxPhoneCode).trim());
        const hasEncryptedPayload = !!(
          this.data.encryptedData &&
          String(this.data.encryptedData).trim() &&
          this.data.iv &&
          String(this.data.iv).trim()
        );
        if (!hasWxPhoneCode && !hasEncryptedPayload) {
          throw new Error("请先点击微信一键获取手机号");
        }
        const loginCode = await this.fetchWxLoginCode();
        const payload = {
          code: loginCode,
          phoneCode: this.data.wxPhoneCode || undefined,
          encryptedData: this.data.encryptedData || undefined,
          iv: this.data.iv || undefined,
          userInfo: {
            nickName: nick,
            avatarUrl: avatarUrl
          }
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
      nickname: (remoteUser && remoteUser.username) || nick,
      avatarUrl: (remoteUser && remoteUser.avatar) || avatarUrl,
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
