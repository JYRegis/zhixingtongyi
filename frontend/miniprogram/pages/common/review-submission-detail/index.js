const { getApplicationById } = require("../../../utils/onboardingStore");
const { getHoursRequestById } = require("../../../utils/hoursReviewStore");
const { buildOnboardingRows, buildHoursRows } = require("../../../utils/reviewDetailRows");
const { canViewOnboardingSubmission, canViewHoursSubmission } = require("../../../utils/reviewAccess");
const { mergeFromStorageIntoApp } = require("../../../utils/userProfileStore");
const { checkOnboardingOrRedirect } = require("../../../utils/onboardingGuard");
const { adminApi, volunteerRecordApi } = require("../../../utils/api");

const PAGE = "pages/common/review-submission-detail/index";

Page({
  data: {
    type: "onboarding",
    pageTitle: "详情",
    rows: [],
    denied: false
  },
  onLoad(q) {
    this._id = (q && q.id) || "";
    this._type = (q && q.type) === "hours" ? "hours" : "onboarding";
  },
  onShow() {
    checkOnboardingOrRedirect(PAGE);
    this._load();
  },
  _pageRecords(payload) {
    if (Array.isArray(payload)) {
      return payload;
    }
    return (payload && (payload.records || payload.list)) || [];
  },
  _remoteHoursRows(row) {
    const minutes = Number(row && row.duration ? row.duration : 0);
    const hours = minutes ? Math.round((minutes / 60) * 10) / 10 : "—";
    return {
      pageTitle: "认定义务时长",
      rows: [
        { label: "记录 ID", value: String(row.id || "—") },
        { label: "结对 ID", value: String(row.matchPairId || "—") },
        { label: "学员 ID", value: String(row.studentId || "—") },
        { label: "志愿者 ID", value: String(row.teacherId || "—") },
        { label: "服务日期", value: row.meetingDate || "—" },
        { label: "服务时长", value: hours + " 小时" },
        { label: "服务说明", value: row.serviceDesc || "—" },
        { label: "状态", value: String(row.status != null ? row.status : "—") },
        { label: "驳回原因", value: row.rejectReason || "—" }
      ]
    };
  },
  _remoteUserRows(user) {
    return {
      pageTitle: "用户信息",
      rows: [
        { label: "用户 ID", value: String(user.id || "—") },
        { label: "用户名", value: user.username || "—" },
        { label: "手机号", value: user.phone || "—" },
        { label: "角色代码", value: String(user.role != null ? user.role : "—") },
        { label: "状态", value: String(user.status != null ? user.status : "—") },
        { label: "创建时间", value: user.createTime || "—" }
      ]
    };
  },
  _loadRemote(id, type) {
    if (type === "hours") {
      return volunteerRecordApi.list({ page: 1, size: 100 }).then((res) => {
        const row = this._pageRecords(res).find((x) => x && String(x.id) === String(id));
        if (!row) {
          return Promise.reject(new Error("记录不存在"));
        }
        return this._remoteHoursRows(row);
      });
    }
    return adminApi.userDetail(id).then((user) => this._remoteUserRows(user || {}));
  },
  _load() {
    mergeFromStorageIntoApp();
    const app0 = getApp();
    const r = app0.globalData && app0.globalData.role;
    const u = (app0.globalData && app0.globalData.userInfo) || {};
    const phone = u.phone || "";
    if (r !== "admin_level_1" && r !== "admin_level_2") {
      this.setData({ denied: true, rows: [], pageTitle: "无权限" });
      return;
    }
    const id = this._id;
    if (!id) {
      this.setData({ denied: true, rows: [] });
      return;
    }
    const token = (app0.globalData && app0.globalData.token) || wx.getStorageSync("token") || "";
    if (token) {
      this._loadRemote(id, this._type)
        .then(({ pageTitle, rows }) => {
          this.setData({
            type: this._type,
            pageTitle,
            rows,
            denied: false
          });
          try {
            wx.setNavigationBarTitle({ title: this._type === "hours" ? "时长详情" : "申请信息" });
          } catch (e) {
            // ignore
          }
        })
        .catch(() => {
          this._loadLocal(r, phone, id);
        });
      return;
    }
    this._loadLocal(r, phone, id);
  },
  _loadLocal(r, phone, id) {
    if (this._type === "hours") {
      const row = getHoursRequestById(id);
      if (!row || !canViewHoursSubmission(r, phone, row)) {
        this.setData({ denied: true, rows: [] });
        wx.showToast({ title: "无权限或记录不存在", icon: "none" });
        return;
      }
      const { pageTitle, rows } = buildHoursRows(row);
      this.setData({
        type: "hours",
        pageTitle: pageTitle,
        rows: rows,
        denied: false
      });
      try {
        wx.setNavigationBarTitle({ title: "时长详情" });
      } catch (e) {
        // ignore
      }
      return;
    }
    const a = getApplicationById(id);
    if (!a || !canViewOnboardingSubmission(r, phone, a)) {
      this.setData({ denied: true, rows: [] });
      wx.showToast({ title: "无权限或记录不存在", icon: "none" });
      return;
    }
    const { pageTitle, rows } = buildOnboardingRows(a);
    this.setData({
      type: "onboarding",
      pageTitle: pageTitle,
      rows: rows,
      denied: false
    });
    try {
      wx.setNavigationBarTitle({ title: "申请信息" });
    } catch (e) {
      // ignore
    }
  }
});
