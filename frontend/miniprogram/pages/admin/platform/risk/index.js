const { mergeFromStorageIntoApp } = require("../../../../utils/userProfileStore");
const { checkOnboardingOrRedirect } = require("../../../../utils/onboardingGuard");
const { dashboardApi, matchApi } = require("../../../../utils/api");

const PAGE_PATH = "pages/admin/platform/risk/index";

Page({
  data: { exceptionPairs: [], loading: false, riskSummary: [] },
  onShow() { checkOnboardingOrRedirect(PAGE_PATH); mergeFromStorageIntoApp(); this.load(); },
  load() {
    const token = (getApp().globalData && getApp().globalData.token) || wx.getStorageSync("token") || "";
    if (!token) { this.setData({ exceptionPairs: [], riskSummary: [] }); return; }
    this.setData({ loading: true });
    Promise.all([matchApi.myPairs(1).catch(() => []), dashboardApi.overview().catch(() => null), dashboardApi.matchSuccessRate({}).catch(() => null)]).then(([pairs, overview, matchRate]) => {
      const list = [];
      const count = Array.isArray(pairs) ? pairs.length : 0;
      if (count > 5) list.push({ reason: "结对会话较多", risk: "中" });
      if (overview && overview.pendingAlerts != null && Number(overview.pendingAlerts) > 10) list.push({ reason: "平台待处理告警较多", risk: "高" });
      if (matchRate && Array.isArray(matchRate) && matchRate.length > 0) list.push({ reason: "匹配成功率可继续优化", risk: "低" });
      if (!list.length) list.push({ reason: "暂无可计算风险，等待后端风险模型", risk: "低" });
      this.setData({ exceptionPairs: list, riskSummary: [{ label: "结对数", value: count }, { label: "告警数", value: overview && overview.pendingAlerts != null ? overview.pendingAlerts : 0 }], loading: false });
    }).catch(() => this.setData({ loading: false, exceptionPairs: [], riskSummary: [] }));
  },
  onPullDownRefresh() { this.load(); wx.stopPullDownRefresh(); },
  onForceUnbind() { wx.showToast({ title: "请通过结对解绑接口处理", icon: "none" }); }
});
