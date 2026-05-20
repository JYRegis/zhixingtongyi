const { mergeFromStorageIntoApp } = require("./userProfileStore");
const { ingestDebugLog } = require("./debugSessionIngest");
const { ensureStatusFromApplications, getApplications } = require("./onboardingStore");
const ALLOWED_NO_ONBOARD = new Set([
  "pages/common/home/index",
  "pages/common/auth/index",
  "pages/common/auth-setup/index",
  "pages/common/role-select/index",
  "pages/common/invite-code/index",
  "pages/common/onboarding-apply/index",
  "pages/common/onboarding-pending/index",
  "pages/common/template/index"
]);

/** 仅审核中可停留的页（不进入各业务 Tab/功能） */
const ALLOWED_WHEN_PENDING = new Set([
  "pages/common/onboarding-pending/index",
  "pages/common/onboarding-apply/index",
  "pages/common/home/index",
  "pages/common/auth/index",
  "pages/common/auth-setup/index",
  "pages/common/role-select/index",
  "pages/common/template/index"
]);

/**
 * 在 tab 等页面 onShow 调用。
 * - `approved`：正常使用。
 * - `pending`：重定向到「正在审核中」专页，仅白名单可停留。
 * - `none`/`rejected`：与此前一致，跳转入驻申请补资料。
 * @param {string} [pageRoute] 当前页路径，如 pages/common/workbench/index
 */
function checkOnboardingOrRedirect(pageRoute) {
  const app = getApp();
  if (!app || !app.globalData) {
    return;
  }
  mergeFromStorageIntoApp();
  const u = app.globalData.userInfo;
  const r = app.globalData.role;
  // 个人小程序无法获取手机号，用 backendUserId 作为用户标识
  const uid = u && (u.backendUserId || u.id || u.userId || u.phone || "");
  if (!u || !uid) {
    return;
  }
  // 用户已登录但没有选择角色：路由到 role-select
  if (!r) {
    const path0 = (pageRoute || "").replace(/^\//, "");
    if (path0 === "pages/common/home/index" ||
        path0 === "pages/common/auth/index" ||
        path0 === "pages/common/auth-setup/index" ||
        path0 === "pages/common/role-select/index" ||
        path0 === "pages/common/onboarding-apply/index" ||
        path0 === "pages/common/invite-code/index") {
      return;
    }
    wx.reLaunch({ url: "/pages/common/role-select/index" });
    return;
  }
  if ((r === "admin_level_1" || r === "admin_level_2") && ((app.globalData && app.globalData.token) || wx.getStorageSync("token"))) {
    // 二级管理员如果还没被分配权限（pending_assignment），不允许进入业务页
    const assignSt = u.onboardingStatus;
    if (r === "admin_level_2" && assignSt === "pending_assignment") {
      const path1 = (pageRoute || "").replace(/^\//, "");
      if (path1 === "pages/common/home/index" || path1 === "pages/common/role-select/index" || path1 === "pages/common/auth-setup/index") {
        return;
      }
      wx.reLaunch({ url: "/pages/common/home/index" });
      return;
    }
    return;
  }
  const userKey = String(uid);
  ensureStatusFromApplications(userKey);
  // 兜底：后端 hasProfile=true 说明已是登记过的学生/志愿者；即使前端没拉到
  // 审核状态映射（onboardingStatus 为空），也不要把人推回入驻申请页，避免
  // 已通过审核的志愿者（如 13900009010）被误跳到「执教志愿者入驻」界面。
  const hasProfileFlag = !!(app.globalData.userInfo && app.globalData.userInfo.hasProfile);
  const rawSt = app.globalData.userInfo && app.globalData.userInfo.onboardingStatus;
  // 如果 onboardingStatus 已明确设置，直接使用；
  // 否则 hasProfile=true 时检查 auditStatus 字段（登录时可能已写入 userInfo）
  let st = rawSt;
  if (!st && hasProfileFlag) {
    const auditCode = app.globalData.userInfo && app.globalData.userInfo.auditStatus;
    if (auditCode != null) {
      const n = Number(auditCode);
      if (n === 0) st = "pending";
      else if (n === 1) st = "approved";
      else if (n === 2) st = "rejected";
      else st = "pending";
    } else {
      // auditStatus 未知时保守处理，视为 pending 而非 approved
      st = "pending";
    }
  }
  if (!st) st = "none";
  const path = (pageRoute || "").replace(/^\//, "");
  // #region agent log
  try {
    var apps = getApplications() || [];
    var appCount = apps.filter(function (a) {
      return String(a.applicantId) === userKey;
    }).length;
    ingestDebugLog({
      hypothesisId: "H4",
      location: "onboardingGuard.js:checkOnboardingOrRedirect",
      message: "guard",
      data: { st: st, path: path, appCountForUser: appCount },
      runId: "pre-fix"
    });
  } catch (e) {
    // ignore
  }
  // #endregion

  if (st === "approved") {
    return;
  }

  if (st === "pending") {
    for (const p of ALLOWED_WHEN_PENDING) {
      if (path === p) {
        return;
      }
    }
    wx.reLaunch({
      url: `/pages/common/onboarding-pending/index?role=${encodeURIComponent(r)}&status=pending`
    });
    return;
  }

  if (st === "rejected") {
    for (const p of ALLOWED_WHEN_PENDING) {
      if (path === p) {
        return;
      }
    }
    wx.reLaunch({
      url: `/pages/common/onboarding-pending/index?role=${encodeURIComponent(r)}&status=rejected`
    });
    return;
  }

  if (st !== "none" && st !== "") {
    return;
  }
  for (const p of ALLOWED_NO_ONBOARD) {
    if (path === p) {
      return;
    }
  }
  wx.redirectTo({
    url: `/pages/common/onboarding-apply/index?role=${encodeURIComponent(r)}&from=guard`
  });
}

module.exports = {
  checkOnboardingOrRedirect
};
