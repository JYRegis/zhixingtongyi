const { mergeFromStorageIntoApp } = require("./userProfileStore");
const { ensureStatusFromApplications } = require("./onboardingStore");

const ALLOWED_NO_ONBOARD = new Set([
  "pages/common/home/index",
  "pages/common/auth/index",
  "pages/common/role-select/index",
  "pages/common/onboarding-apply/index",
  "pages/common/template/index"
]);

/** 仅审核中可停留的页（不进入各业务 Tab/功能） */
const ALLOWED_WHEN_PENDING = new Set([
  "pages/common/onboarding-pending/index",
  "pages/common/home/index",
  "pages/common/auth/index",
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
  if (!r || !u || !u.phone) {
    return;
  }
  ensureStatusFromApplications(String(u.phone));
  const st = (app.globalData.userInfo && app.globalData.userInfo.onboardingStatus) || "none";
  const path = (pageRoute || "").replace(/^\//, "");

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
      url: `/pages/common/onboarding-pending/index?role=${encodeURIComponent(r)}`
    });
    return;
  }

  if (st !== "none" && st !== "rejected" && st !== "") {
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
