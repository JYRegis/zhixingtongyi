const { ROLE_DISPLAY_NAME } = require("../../../utils/roleLabels");

const STORAGE_PHONES = "zhixing_saved_phones";

Page({
  data: {
    role: "",
    roleName: "",
    savedPhoneItems: [],
    selectedPhone: "",
    manualPhone: "",
    showManualPhone: false,
    nickname: "",
    avatarUrl: ""
  },
  onLoad(query) {
    const role = (query.role || "").trim();
    if (!role) {
      wx.showModal({
        title: "提示",
        content: "请先在首页选择您的身份。",
        showCancel: false,
        success: () => wx.navigateBack()
      });
      return;
    }
    this.setData({
      role,
      roleName: ROLE_DISPLAY_NAME[role] || "用户"
    });
    this.loadSavedPhones();
    if (query.prefill === "1") {
      const u = getApp().globalData.userInfo || {};
      const phone = (u.phone || "").replace(/\D/g, "").slice(0, 11);
      this.setData({
        nickname: (u.nickname || "").trim(),
        avatarUrl: (u.avatarUrl || "").trim(),
        manualPhone: phone,
        selectedPhone: phone.length === 11 ? phone : "",
        showManualPhone: phone.length === 11
      });
    }
  },
  loadSavedPhones() {
    const raw = wx.getStorageSync(STORAGE_PHONES) || [];
    const list = Array.isArray(raw) ? raw : [];
    const savedPhoneItems = list.map((phone) => ({
      phone,
      display: String(phone).replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2")
    }));
    this.setData({ savedPhoneItems });
  },
  persistPhones(phones) {
    wx.setStorageSync(STORAGE_PHONES, phones.slice(0, 5));
    this.loadSavedPhones();
  },
  onSelectSavedPhone(e) {
    const phone = e.currentTarget.dataset.phone;
    this.setData({
      selectedPhone: phone,
      manualPhone: phone,
      showManualPhone: false
    });
  },
  onShowManualInput() {
    this.setData({
      showManualPhone: true,
      selectedPhone: "",
      manualPhone: ""
    });
  },
  onManualPhoneInput(e) {
    const v = (e.detail.value || "").replace(/\D/g, "").slice(0, 11);
    this.setData({
      manualPhone: v,
      selectedPhone: v.length === 11 ? v : ""
    });
  },
  /**
   * 微信手机号快速验证：真实环境需用 e.detail.code 调后端换明文。
   */
  onGetPhoneNumber(e) {
    const d = e.detail || {};
    if (d.errMsg && d.errMsg.indexOf("fail") !== -1) {
      wx.showToast({ title: "已取消授权，可手动输入", icon: "none" });
      return;
    }
    if (d.code) {
      const demoPhone = "13900000000";
      wx.showToast({ title: "已自动填入手机号", icon: "none" });
      this.applyPhoneAndSave(demoPhone);
      return;
    }
    wx.showToast({ title: "请手动输入或使用已保存号码", icon: "none" });
  },
  applyPhoneAndSave(phone) {
    const p = String(phone).replace(/\D/g, "").slice(0, 11);
    if (p.length !== 11) {
      return;
    }
    let list = wx.getStorageSync(STORAGE_PHONES) || [];
    if (!Array.isArray(list)) {
      list = [];
    }
    const next = [p, ...list.filter((x) => x !== p)].slice(0, 5);
    this.persistPhones(next);
    this.setData({
      manualPhone: p,
      selectedPhone: p,
      showManualPhone: false
    });
  },
  onChooseAvatar(e) {
    const url = e.detail && e.detail.avatarUrl;
    if (url) {
      this.setData({ avatarUrl: url });
    }
  },
  onNicknameInput(e) {
    this.setData({ nickname: (e.detail.value || "").trim() });
  },
  onNicknameBlur(e) {
    this.setData({ nickname: (e.detail.value || "").trim() });
  },
  onSubmit() {
    const phone = (this.data.manualPhone || this.data.selectedPhone || "").replace(/\D/g, "").slice(0, 11);
    if (!/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: "请填写11位大陆手机号", icon: "none" });
      return;
    }
    const nickname = (this.data.nickname || "").trim();
    if (!nickname) {
      wx.showToast({ title: "请填写昵称", icon: "none" });
      return;
    }
    this.applyPhoneAndSave(phone);
    const app = getApp();
    app.setLogin(this.data.role, {
      nickname,
      avatarUrl: this.data.avatarUrl || "",
      phone,
      role: this.data.role
    });
    wx.showToast({ title: "登录成功", icon: "success" });
    setTimeout(() => {
      wx.switchTab({ url: "/pages/common/workbench/index" });
    }, 400);
  }
});
