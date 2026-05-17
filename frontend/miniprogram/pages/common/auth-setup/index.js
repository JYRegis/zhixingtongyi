const { authApi } = require("../../../utils/api");
const { isAdminRole } = require("../../../utils/backendRole");

Page({
  data: {
    nickname: "",
    avatarUrl: "",
    submitting: false
  },
  onLoad() {
    const app = getApp();
    const u = (app.globalData && app.globalData.userInfo) || {};
    this.setData({
      nickname:
        (u.nickname && String(u.nickname).trim()) ||
        (u.nickName && String(u.nickName).trim()) ||
        "",
      avatarUrl: String(u.avatarUrl || u.avatar || "").trim()
    });
    try {
      wx.setNavigationBarTitle({ title: "完善资料" });
    } catch (e) {
      // ignore
    }
  },
  onChooseAvatar(e) {
    const url = e && e.detail && e.detail.avatarUrl ? String(e.detail.avatarUrl).trim() : "";
    if (!url) {
      wx.showToast({ title: "头像获取失败", icon: "none" });
      return;
    }
    this.setData({ avatarUrl: url });
  },
  onNicknameInput(e) {
    const value = (e.detail.value || "").trim();
    this.setData({ nickname: value });
  },
  async onSubmit() {
    if (this.data.submitting) {
      return;
    }
    const nickname = (this.data.nickname || "").trim();
    if (!nickname) {
      wx.showToast({ title: "请填写昵称", icon: "none" });
      return;
    }
    if (nickname.length > 20) {
      wx.showToast({ title: "昵称最多 20 个字", icon: "none" });
      return;
    }
    this.setData({ submitting: true });
    const app = getApp();
    const u = (app.globalData && app.globalData.userInfo) || {};
    const role = (app.globalData && app.globalData.role) || u.role || "";
    const phone = String(u.phone || "").replace(/\D/g, "").slice(0, 11);
    const avatarUrl = (this.data.avatarUrl || "").trim();
    try {
      // 复用 phoneLogin 作为「更新昵称/头像」的接口：后端 AuthServiceImpl
      // 在每次手机号登录时会按请求里的 nickName / avatarUrl 同步更新 user.username / user.avatar。
      if (/^1\d{10}$/.test(phone)) {
        const loginRes = await authApi.phoneLogin({
          phone,
          nickName: nickname,
          avatarUrl: avatarUrl || undefined
        });
        const token = loginRes && loginRes.token ? loginRes.token : "";
        const remoteUser = (loginRes && loginRes.user) || {};
        if (token) {
          app.globalData.token = token;
          wx.setStorageSync("token", token);
        }
        app.setLogin(role, {
          ...u,
          nickname: remoteUser.username || nickname,
          avatarUrl: remoteUser.avatar || avatarUrl,
          phone: remoteUser.phone || phone,
          backendRoleCode: remoteUser.role != null ? remoteUser.role : u.backendRoleCode,
          backendUserId: remoteUser.id != null ? remoteUser.id : u.backendUserId,
          userId: remoteUser.phone || phone || (remoteUser.id != null ? String(remoteUser.id) : u.userId)
        });
      } else {
        // 极端兜底：拿不到手机号时只本地缓存
        app.setLogin(role, { ...u, nickname, avatarUrl });
      }
    } catch (err) {
      this.setData({ submitting: false });
      wx.showToast({ title: (err && err.message) || "保存失败", icon: "none" });
      return;
    }
    wx.showToast({ title: "已保存", icon: "success" });
    setTimeout(() => {
      this.setData({ submitting: false });
      this._goNext();
    }, 400);
  },
  onSkip() {
    this._goNext();
  },
  _goNext() {
    const app = getApp();
    const role = (app.globalData && app.globalData.role) || "";
    if (role && isAdminRole(role)) {
      wx.reLaunch({ url: "/pages/common/workbench/index" });
      return;
    }
    wx.reLaunch({ url: "/pages/common/role-select/index" });
  }
});
