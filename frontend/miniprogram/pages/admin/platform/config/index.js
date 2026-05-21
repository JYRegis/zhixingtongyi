const { checkOnboardingOrRedirect } = require("../../../../utils/onboardingGuard");
const { mergeFromStorageIntoApp } = require("../../../../utils/userProfileStore");
const { systemApi, algorithmApi } = require("../../../../utils/api");

const PAGE_PATH = "pages/admin/platform/config/index";

function normalizeList(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.records)) return payload.records;
  if (payload && Array.isArray(payload.list)) return payload.list;
  return [];
}

Page({
  data: {
    configs: [],
    weights: [],
    editKey: "",
    editValue: "",
    editWeightId: "",
    editWeight: "",
    editWeightEnabled: true
  },
  onShow() {
    checkOnboardingOrRedirect(PAGE_PATH);
    mergeFromStorageIntoApp();
    this.load();
  },
  load() {
    Promise.all([systemApi.configs().catch(() => []), algorithmApi.weights().catch(() => [])]).then(([configs, weights]) => {
      this.setData({
        configs: normalizeList(configs),
        weights: normalizeList(weights)
      });
    });
  },
  onRefresh() {
    this.load();
  },
  onPickConfig(e) {
    const idx = Number(e.detail.value) || 0;
    const item = this.data.configs[idx] || {};
    this.setData({
      editKey: item.key || item.name || "",
      editValue: item.value != null ? String(item.value) : ""
    });
  },
  onEditValue(e) {
    this.setData({ editValue: e.detail.value || "" });
  },
  onSaveConfig() {
    const key = String(this.data.editKey || "").trim();
    if (!key) {
      wx.showToast({ title: "请先选择配置项", icon: "none" });
      return;
    }
    systemApi
      .updateConfig(key, { value: this.data.editValue })
      .then(() => {
        wx.showToast({ title: "已保存", icon: "success" });
        this.load();
      })
      .catch((err) => wx.showToast({ title: (err && err.message) || "失败", icon: "none" }));
  },
  onPickWeight(e) {
    const idx = Number(e.detail.value) || 0;
    const item = this.data.weights[idx] || {};
    this.setData({
      editWeightId: item.id != null ? String(item.id) : "",
      editWeight: item.weight != null ? String(item.weight) : "",
      editWeightEnabled: item.enabled !== false
    });
  },
  onEditWeight(e) {
    this.setData({ editWeight: e.detail.value || "" });
  },
  onEditWeightEnabled(e) {
    this.setData({ editWeightEnabled: !!(e.detail && e.detail.value) });
  },
  onSaveWeight() {
    const id = String(this.data.editWeightId || "").trim();
    if (!id) {
      wx.showToast({ title: "请先选择权重项", icon: "none" });
      return;
    }
    algorithmApi
      .updateWeight(id, { weight: Number(this.data.editWeight), enabled: !!this.data.editWeightEnabled })
      .then(() => {
        wx.showToast({ title: "已保存", icon: "success" });
        this.load();
      })
      .catch((err) => wx.showToast({ title: (err && err.message) || "失败", icon: "none" }));
  },
  onRecalc() {
    algorithmApi
      .recalculateWeights()
      .then(() => wx.showToast({ title: "已提交", icon: "success" }))
      .catch((err) => wx.showToast({ title: (err && err.message) || "失败", icon: "none" }));
  }
});
