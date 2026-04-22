/**
 * 谁可查看某条待审/记录的申请资料详情页
 */

/**
 * 入驻类申请单
 * @param {"admin_level_1"|"admin_level_2"} viewerRole
 * @param {string} viewerPhone
 * @param {object} app
 */
function canViewOnboardingSubmission(viewerRole, viewerPhone, app) {
  if (!app) {
    return false;
  }
  if (viewerRole === "admin_level_1") {
    return true;
  }
  if (viewerRole === "admin_level_2" && viewerPhone) {
    const t = app.targetL2UserId;
    if (t && String(t) === String(viewerPhone)) {
      return true;
    }
    if (!t) {
      return false;
    }
  }
  return false;
}

/**
 * 认定义务时长
 */
function canViewHoursSubmission(viewerRole, viewerPhone, row) {
  if (!row) {
    return false;
  }
  if (viewerRole === "admin_level_1") {
    return true;
  }
  if (viewerRole === "admin_level_2" && viewerPhone) {
    const t = row.targetL2UserId;
    if (t && String(t) === String(viewerPhone)) {
      return true;
    }
  }
  return false;
}

module.exports = {
  canViewOnboardingSubmission,
  canViewHoursSubmission
};
