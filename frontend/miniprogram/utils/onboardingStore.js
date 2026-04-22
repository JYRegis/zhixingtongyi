const { saveProfile, listL2Admins } = require("./userProfileStore");
const { getSchoolName } = require("./schoolsMock");

const APPS_KEY = "zhixing_onboarding_applications";
/** 本机是否已有过「首账号 L1 自动过审」；有则之后 L1 新申请走待审，由已通过的 L1 在平台里审。 */
const L1_ONBOARDING_SEED_KEY = "l1OnboardingSeeded";

function isL1OnboardingSeeded() {
  try {
    return !!wx.getStorageSync(L1_ONBOARDING_SEED_KEY);
  } catch (e) {
    return false;
  }
}

function setL1OnboardingSeeded() {
  try {
    wx.setStorageSync(L1_ONBOARDING_SEED_KEY, "1");
  } catch (e) {
    // ignore
  }
}

function getApplications() {
  try {
    const raw = wx.getStorageSync(APPS_KEY);
    return Array.isArray(raw) ? raw : [];
  } catch (e) {
    return [];
  }
}

function setApplications(list) {
  wx.setStorageSync(APPS_KEY, list);
}

/**
 * 根据学生/志愿者学校匹配到对应已审的二级（支教方/受援方）
 * @param {"student"|"teacher"} role
 * @param {string} schoolId
 * @returns {string|null} L2 的手机号
 */
function findTargetL2ForRole(role, schoolId) {
  if (!schoolId) {
    return null;
  }
  const admins = listL2Admins();
  for (let i = 0; i < admins.length; i += 1) {
    const u = admins[i];
    if (role === "student" && u.l2Scope === "recipient_side") {
      const ids = u.recipientTargetIds;
      if (Array.isArray(ids) && ids.indexOf(schoolId) !== -1) {
        return u.phone;
      }
    }
    if (role === "teacher" && u.l2Scope === "volunteer_side") {
      const ids = u.supportSchoolIds;
      if (Array.isArray(ids) && ids.indexOf(schoolId) !== -1) {
        return u.phone;
      }
    }
  }
  return null;
}

/**
 * 提交入驻申请
 * @param {object} params
 * @param {string} params.applicantId 手机号
 * @param {string} params.role
 * @param {string} [params.schoolId]
 * @param {object} [params.extra] 如 studentAvailableTime, grade
 */
function submitApplication(params) {
  const { applicantId, role, schoolId, extra = {} } = params;
  if (!applicantId) {
    return { ok: false, message: "缺少用户标识" };
  }
  const list = getApplications();
  const targetL2UserId = role === "student" || role === "teacher" ? findTargetL2ForRole(role, schoolId) : null;
  // 首账号 L1：仅本机第一次提交仍自动过审，避免无人给自己过审；之后与其它角色一样进待审，由已通过的 L1 在平台审
  if (String(role) === "admin_level_1") {
    if (!isL1OnboardingSeeded()) {
      const item = {
        id: `app_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
        applicantId: String(applicantId),
        role: "admin_level_1",
        schoolId: schoolId || "",
        schoolName: schoolId ? getSchoolName(schoolId) : "",
        status: "approved",
        targetL2UserId: null,
        createdAt: Date.now(),
        extra: extra || {},
        reviewedByL1: "system_first"
      };
      list.unshift(item);
      setApplications(list);
      setL1OnboardingSeeded();
      saveProfile(String(applicantId), { onboardingStatus: "approved" });
      return { ok: true, item };
    }
    const item = {
      id: `app_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
      applicantId: String(applicantId),
      role: "admin_level_1",
      schoolId: schoolId || "",
      schoolName: schoolId ? getSchoolName(schoolId) : "",
      status: "pending",
      targetL2UserId: null,
      createdAt: Date.now(),
      extra: extra || {}
    };
    list.unshift(item);
    setApplications(list);
    saveProfile(String(applicantId), { onboardingStatus: "pending" });
    return { ok: true, item };
  }
  const item = {
    id: `app_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    applicantId: String(applicantId),
    role: String(role),
    schoolId: schoolId || "",
    schoolName: schoolId ? getSchoolName(schoolId) : "",
    status: "pending",
    targetL2UserId: targetL2UserId,
    createdAt: Date.now(),
    extra: extra || {}
  };
  list.unshift(item);
  setApplications(list);
  saveProfile(String(applicantId), { onboardingStatus: "pending" });
  return { ok: true, item };
}

/**
 * @param {string} applicationId
 * @param {boolean} approve
 * @param {object} reviewer { role, phone, nickname }
 * @param {string} [rejectNote]
 */
function resolveApplication(applicationId, approve, reviewer, rejectNote) {
  const list = getApplications();
  const idx = list.findIndex((a) => a.id === applicationId);
  if (idx === -1) {
    return { ok: false, message: "未找到对应记录" };
  }
  const app = list[idx];
  if (app.status !== "pending") {
    return { ok: false, message: "该条已处理" };
  }
  const rRole = reviewer && reviewer.role;
  const rPhone = reviewer && reviewer.phone;
  if (rRole === "admin_level_1") {
    // 一级可审全部
  } else if (rRole === "admin_level_2" && rPhone) {
    if (app.targetL2UserId && app.targetL2UserId !== rPhone) {
      return { ok: false, message: "仅对应学校老师可审此条" };
    }
    if (!app.targetL2UserId && (app.role === "admin_level_2" || app.role === "admin_level_1")) {
      // 无路由二级时仅平台审 L2/L1
      return { ok: false, message: "此类需由平台运营审核" };
    }
  } else {
    return { ok: false, message: "无审核权限" };
  }

  const next = { ...app, status: approve ? "approved" : "rejected" };
  if (rejectNote) {
    next.rejectNote = rejectNote;
  }
  if (next.targetL2UserId && rRole === "admin_level_2" && rPhone) {
    next.reviewedByL2 = rPhone;
  }
  if (rRole === "admin_level_1") {
    next.reviewedByL1 = rPhone;
  }
  list[idx] = next;
  setApplications(list);
  const st = approve ? "approved" : "rejected";
  saveProfile(app.applicantId, { onboardingStatus: st });
  return { ok: true, item: next };
}

/**
 * 按单条 id 取入驻申请（审核端查看申请资料用）
 * @param {string} id
 */
function getApplicationById(id) {
  if (!id) {
    return null;
  }
  return getApplications().find((a) => a.id === id) || null;
}

function getPendingApplications() {
  return getApplications().filter((a) => a.status === "pending");
}

function getApplicationsForL2(phone) {
  const p = String(phone);
  return getPendingApplications().filter(
    (a) => a.targetL2UserId && a.targetL2UserId === p
  );
}

/**
 * 一级能看到的：全部 pending
 * 二级能看到的：targetL2 为自己的 + 自己角色无法由二级审的仍在一级
 */
function getAllPendingForUI(viewerRole, viewerPhone) {
  const all = getPendingApplications();
  if (viewerRole === "admin_level_1") {
    return all;
  }
  if (viewerRole === "admin_level_2" && viewerPhone) {
    return all.filter(
      (a) => a.targetL2UserId && a.targetL2UserId === String(viewerPhone)
    );
  }
  return [];
}

/**
 * 以最新申请记录回写审核态（getApplications 时间倒序、最新在前）
 * @param {string} phone
 */
function ensureStatusFromApplications(phone) {
  if (!phone) {
    return;
  }
  const byUser = getApplications().filter((a) => a.applicantId === String(phone));
  if (byUser.length === 0) {
    return;
  }
  const top = byUser[0];
  if (top.status === "pending" || top.status === "approved" || top.status === "rejected") {
    saveProfile(phone, { onboardingStatus: top.status });
  }
}

function exportAllForDebug() {
  return { applications: getApplications() };
}

/**
 * 仅测试：整表覆盖入驻申请（勿在生产调用）
 * @param {any[]} list
 */
function replaceApplicationsForDev(list) {
  if (!Array.isArray(list)) {
    return;
  }
  setApplications(list);
}

/**
 * 受援方已审过且通过的学生（当前老师为 reviewedByL2，且学校在其 recipientTargetIds 内）。
 * @param {string} phone
 * @param {{ recipientTargetIds?: string[] }} [l2Profile] 与 userProfile 一致时传入，缺省不校验校范围
 * @returns {any[]}
 */
function getApprovedStudentsReviewedByRecipientL2(phone, l2Profile) {
  const p = String(phone || "");
  if (!p) {
    return [];
  }
  const allowIds = (l2Profile && Array.isArray(l2Profile.recipientTargetIds) && l2Profile.recipientTargetIds.length
    ? l2Profile.recipientTargetIds
    : null) || null;
  return getApplications().filter((a) => {
    if (a.role !== "student" || a.status !== "approved") {
      return false;
    }
    if (String(a.reviewedByL2 || "") !== p) {
      return false;
    }
    if (allowIds && a.schoolId && allowIds.indexOf(a.schoolId) === -1) {
      return false;
    }
    return true;
  });
}

/**
 * 支教方：本老师已审通过的志愿者（教师）申请；支教校须在 supportSchoolIds 内。
 * @param {string} phone
 * @param {{ supportSchoolIds?: string[] } | null} l2Profile
 * @returns {any[]}
 */
function getApprovedTeachersReviewedByVolunteerL2(phone, l2Profile) {
  const p = String(phone || "");
  if (!p) {
    return [];
  }
  const allow = l2Profile && Array.isArray(l2Profile.supportSchoolIds) && l2Profile.supportSchoolIds.length
    ? l2Profile.supportSchoolIds
    : null;
  return getApplications().filter((a) => {
    if (a.role !== "teacher" || a.status !== "approved") {
      return false;
    }
    if (String(a.reviewedByL2 || "") !== p) {
      return false;
    }
    if (allow && a.schoolId && allow.indexOf(a.schoolId) === -1) {
      return false;
    }
    return true;
  });
}

module.exports = {
  getApplications,
  getPendingApplications,
  getApplicationById,
  submitApplication,
  resolveApplication,
  findTargetL2ForRole,
  getAllPendingForUI,
  getApplicationsForL2,
  getApprovedStudentsReviewedByRecipientL2,
  getApprovedTeachersReviewedByVolunteerL2,
  ensureStatusFromApplications,
  exportAllForDebug,
  replaceApplicationsForDev
};
