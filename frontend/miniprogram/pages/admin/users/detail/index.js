const { adminApi } = require("../../../../utils/api");
const { checkOnboardingOrRedirect } = require("../../../../utils/onboardingGuard");

Page({
  data: { user: null },
  onLoad(q) { this._id = (q && q.id) || ""; },
  onShow() { checkOnboardingOrRedirect("pages/admin/users/detail/index"); this.load(); },
  load() { if (!this._id) return; adminApi.userDetail(this._id).then((u) => this.setData({ user: u || null })).catch(() => this.setData({ user: null })); },
  _setStatus(status) { if (!this._id) return; adminApi.updateUserStatus(this._id, { status }).then(() => { wx.showToast({ title: "已更新", icon: "success" }); this.load(); }).catch((err) => wx.showToast({ title: (err && err.message) || "失败", icon: "none" })); },
  onDisable() { this._setStatus(0); },
  onEnable() { this._setStatus(1); },
  onPromote() { this._setStatus(2); }
});
