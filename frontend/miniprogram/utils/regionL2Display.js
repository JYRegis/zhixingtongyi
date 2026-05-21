/**
 * 受援/支教 二级「区域管理」里列表的展示层字段（可上课时间等人读格式）
 */
const { getSchoolName } = require("./schoolsMock");
const { ROLE_DISPLAY_NAME } = require("./roleLabels");
const { formatSavedTimeForDisplay } = require("./classTimeOptions");
const { getApplicationsForL2 } = require("./onboardingStore");
const { getActivePair } = require("./pairingStore");
const { getPendingForL2, ensureDemoForRecipientL2 } = require("./hoursReviewStore");

/**
 * 学生入驻待审（受援 L2 过滤 role=student 前在外部可再筛）
 * @param {{ id: string, role: string, extra?: object, schoolName?: string, schoolId?: string, applicantId?: string }} a
 */
function mapStudentAppForRegion(a) {
  const ex = a.extra || {};
  const raw = ex.studentAvailableTime;
  const timeText =
    raw == null || String(raw).trim() === "" ? "—" : formatSavedTimeForDisplay(String(raw));
  return {
    ...a,
    roleName: ROLE_DISPLAY_NAME[a.role] || a.role,
    schoolName: a.schoolName || (a.schoolId ? getSchoolName(a.schoolId) : "—"),
    displayName: ex.name || a.applicantId || "—",
    grade: ex.grade || "—",
    timeText: timeText
  };
}

/**
 * 受援 L2 名下待审学生注册列表
 * @param {string} phone
 * @returns {any[]}
 */
function getRecipientStudentRegList(phone) {
  if (!phone) {
    return [];
  }
  return getApplicationsForL2(phone)
    .filter((a) => a.role === "student")
    .map(mapStudentAppForRegion);
}

/**
 * 受援 L2 认定义务时长待审列表
 * @param {string} phone
 * @returns {any[]}
 */
function getRecipientHoursList(phone) {
  if (!phone) {
    return [];
  }
  const pair = getActivePair();
  const sid = (pair && pair.schoolId) || "";
  if (sid) {
    ensureDemoForRecipientL2(phone, sid);
  } else {
    ensureDemoForRecipientL2(phone, "rec_yunlong");
  }
  return getPendingForL2(phone) || [];
}

/**
 * 支教 L2 志愿者待审
 */
function mapTeacherAppForRegion(a) {
  const ex = a.extra || {};
  const raw = ex.availableTime;
  const timeText =
    raw == null || String(raw).trim() === "" ? "—" : formatSavedTimeForDisplay(String(raw));
  return {
    ...a,
    roleName: ROLE_DISPLAY_NAME[a.role] || a.role,
    schoolName: a.schoolName || (a.schoolId ? getSchoolName(a.schoolId) : "—"),
    displayName: ex.name || a.applicantId || "—",
    workNo: ex.workNo || "—",
    timeText: timeText
  };
}

/**
 * 支教 L2 志愿者注册待审
 * @param {string} phone
 * @returns {any[]}
 */
function getVolunteerRegList(phone) {
  if (!phone) {
    return [];
  }
  return getApplicationsForL2(phone)
    .filter((a) => a.role === "teacher")
    .map(mapTeacherAppForRegion);
}

module.exports = {
  mapStudentAppForRegion,
  mapTeacherAppForRegion,
  getRecipientStudentRegList,
  getRecipientHoursList,
  getVolunteerRegList
};
