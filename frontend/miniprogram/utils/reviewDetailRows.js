const { formatSavedTimeForDisplay } = require("./classTimeOptions");
const { getSchoolName } = require("./schoolsMock");
const { ROLE_DISPLAY_NAME } = require("./roleLabels");

function formatCreated(ts) {
  if (ts == null) {
    return "—";
  }
  const d = new Date(typeof ts === "number" ? ts : Date.parse(String(ts)));
  if (isNaN(d.getTime())) {
    return "—";
  }
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const h = d.getHours();
  const min = d.getMinutes();
  const p2 = (n) => (n < 10 ? "0" : "") + n;
  return `${y}-${p2(m)}-${p2(day)} ${p2(h)}:${p2(min)}`;
}

/**
 * 入驻单 → 人读行（与入驻表字段对齐）
 * @param {object} app
 * @returns {{ pageTitle: string, rows: { label: string, value: string }[] }}
 */
function buildOnboardingRows(app) {
  const e = (app && app.extra) || {};
  const role = app && app.role;
  const pageTitle = "申请信息 · " + (ROLE_DISPLAY_NAME[role] || role || "—");
  const rows = [];

  rows.push({ label: "身份", value: ROLE_DISPLAY_NAME[role] || role || "—" });
  if (app.applicantId) {
    rows.push({ label: "手机号", value: String(app.applicantId) });
  }
  rows.push({ label: "姓名", value: e.name || "—" });

  if (role === "student") {
    rows.push({ label: "学号", value: e.studentNo || "—" });
    rows.push({ label: "年级", value: e.grade || "—" });
    if (e.studentAvailableTime) {
      rows.push({ label: "希望可上课时间", value: formatSavedTimeForDisplay(e.studentAvailableTime) });
    }
  }
  if (role === "teacher") {
    rows.push({ label: "学工号/学号", value: e.workNo || "—" });
    if (e.availableTime) {
      rows.push({ label: "可授课时间", value: formatSavedTimeForDisplay(e.availableTime) });
    }
  }
  if (role === "admin_level_2") {
    rows.push({ label: "学工号/工号", value: e.workNo || "—" });
    if (e.availableTime) {
      rows.push({ label: "方便联系/办公时间", value: formatSavedTimeForDisplay(e.availableTime) });
    }
    if (e.l2Note) {
      rows.push({ label: "管辖/身份补充", value: e.l2Note });
    }
  }
  if (role === "admin_level_1") {
    if (e.orgNote) {
      rows.push({ label: "机构/说明", value: e.orgNote });
    }
  }
  {
    const sn = app.schoolName || (app.schoolId ? getSchoolName(app.schoolId) : "");
    rows.push({ label: "学校", value: sn || "—" });
  }
  if (e.applyNote) {
    rows.push({ label: "补充说明", value: e.applyNote });
  }
  if (e.organization && role !== "admin_level_1") {
    rows.push({ label: "机构说明", value: e.organization });
  }
  if (e.applicationNote) {
    rows.push({ label: "附注", value: e.applicationNote });
  }
  rows.push({ label: "提交时间", value: formatCreated(app.createdAt) });
  if (app.status) {
    rows.push({ label: "当前状态", value: app.status === "pending" ? "待审" : app.status === "approved" ? "已通过" : "已驳回" });
  }
  if (app.rejectNote) {
    rows.push({ label: "驳回说明", value: app.rejectNote });
  }

  return { pageTitle, rows };
}

/**
 * 认定义务时长行
 * @param {object} h
 */
function buildHoursRows(h) {
  const pageTitle = "认定义务时长";
  const rows = [];
  if (h.pairId) {
    rows.push({ label: "结对", value: h.pairId });
  }
  rows.push(
    { label: "受援校", value: h.schoolName || (h.schoolId ? getSchoolName(h.schoolId) : "—") },
    { label: "学员", value: h.studentName || "—" },
    { label: "志愿者", value: h.volunteerName || "—" },
    { label: "认定义务时长", value: String(h.hours != null ? h.hours : "—") + " 小时" },
    { label: "周次", value: h.week || "—" },
    { label: "提交时间", value: formatCreated(h.createdAt) }
  );
  if (h.status) {
    rows.push({
      label: "状态",
      value: h.status === "pending" ? "待审" : h.status === "approved" ? "已通过" : h.status === "rejected" ? "已驳回" : String(h.status)
    });
  }
  return { pageTitle, rows };
}

module.exports = {
  buildOnboardingRows,
  buildHoursRows,
  formatCreated
};
