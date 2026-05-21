/**
 * 志愿时长认定义务待审（Mock 存本地；路由到受援方二级，一级可全审）
 */
const { getSchoolName } = require("./schoolsMock");
const { getRecipientL2ForSchool } = require("./pairingStore");

const HOURS_KEY = "zhixing_hours_reviews";

function getList() {
  try {
    const raw = wx.getStorageSync(HOURS_KEY);
    return Array.isArray(raw) ? raw : [];
  } catch (e) {
    return [];
  }
}

function setList(list) {
  wx.setStorageSync(HOURS_KEY, list);
}

/**
 * 提交一条「认定义务时长」待审（如学员/志愿者在绑定后提交）
 * @param {object} p
 * @param {string} p.schoolId 受援校
 * @param {string} p.studentName
 * @param {string} [p.volunteerName]
 * @param {number} p.hours
 * @param {string} p.week 如 2025-W20
 * @param {string} [p.applicantPhone] 提交人手机（用于「我的申请」列表）
 * @param {string} [p.applicantRole] student|teacher
 * @param {string} [p.pairId] 对应结对
 */
function submitHoursRequest(p) {
  if (!p || !p.schoolId) {
    return { ok: false, message: "缺少受援校" };
  }
  if (!p.hours || Number(p.hours) <= 0) {
    return { ok: false, message: "请填写大于 0 的时长" };
  }
  const targetL2UserId = getRecipientL2ForSchool(p.schoolId);
  const id = `hr_${Date.now()}_${Math.random().toString(16).slice(2, 7)}`;
  const ap = p.applicantPhone != null && p.applicantPhone !== "" ? String(p.applicantPhone) : "";
  const item = {
    id,
    schoolId: String(p.schoolId),
    schoolName: p.schoolName || getSchoolName(p.schoolId) || "—",
    studentName: String(p.studentName || "").trim() || "—",
    volunteerName: String(p.volunteerName || "").trim() || "—",
    hours: Number(p.hours) || 0,
    week: String(p.week || "").trim() || "—",
    targetL2UserId: targetL2UserId || "",
    status: "pending",
    createdAt: Date.now(),
    applicantPhone: ap,
    applicantRole: p.applicantRole != null && p.applicantRole !== "" ? String(p.applicantRole) : "",
    pairId: p.pairId != null && p.pairId !== "" ? String(p.pairId) : ""
  };
  const list = [item, ...getList().filter((x) => x.id !== id)];
  setList(list);
  return { ok: true, item };
}

/**
 * 我提交的认定义务时长（按创建时间新→旧）含待审/已通过/已驳回
 * @param {string} phone
 */
function getMyHoursRequests(phone) {
  if (!phone) {
    return [];
  }
  const p = String(phone);
  return getList()
    .filter((h) => h && h.applicantPhone && String(h.applicantPhone) === p)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

/**
 * 受援方 L2 的待审列表
 * @param {string} phone
 */
function getPendingForL2(phone) {
  if (!phone) {
    return [];
  }
  const p = String(phone);
  return getList().filter((h) => h.status === "pending" && h.targetL2UserId && h.targetL2UserId === p);
}

/**
 * 一级能看到的：全部待审
 */
function getAllPendingForL1() {
  return getList().filter((h) => h.status === "pending");
}

/**
 * 按 id 取一条认定义务时长单（查看详情用，含已处理历史）
 * @param {string} id
 */
function getHoursRequestById(id) {
  if (!id) {
    return null;
  }
  return getList().find((h) => h.id === id) || null;
}

/**
 * @param {string} id
 * @param {boolean} approve
 * @param {object} reviewer { role, phone, nickname? }
 */
function resolveHoursRequest(id, approve, reviewer) {
  const rRole = reviewer && reviewer.role;
  const rPhone = reviewer && reviewer.phone;
  const list = getList();
  const idx = list.findIndex((h) => h.id === id);
  if (idx === -1) {
    return { ok: false, message: "未找到记录" };
  }
  const h = list[idx];
  if (h.status !== "pending") {
    return { ok: false, message: "已处理" };
  }
  if (rRole === "admin_level_1") {
    // 一级可审全部
  } else if (rRole === "admin_level_2" && rPhone) {
    if (!h.targetL2UserId || h.targetL2UserId !== String(rPhone)) {
      return { ok: false, message: "无权限" };
    }
  } else {
    return { ok: false, message: "无审核权限" };
  }
  const next = {
    ...h,
    status: approve ? "approved" : "rejected",
    resolvedAt: Date.now(),
    reviewedBy: rPhone || ""
  };
  list[idx] = next;
  setList(list);
  return { ok: true, item: next };
}

const HOURS_DEMO_KEY_PREFIX = "zhixing_hours_demo_injected_";

/**
 * 若本区尚无待审，为当前 L2+默认结对校插入一条演示，便于点通/驳回；同一账号只自动插入一次
 * @param {string} l2Phone
 * @param {string} [schoolId] 默认 rec_yunlong
 */
function ensureDemoForRecipientL2(l2Phone, schoolId) {
  if (!l2Phone) {
    return;
  }
  const pending = getPendingForL2(l2Phone);
  if (pending.length > 0) {
    return;
  }
  try {
    if (wx.getStorageSync(HOURS_DEMO_KEY_PREFIX + String(l2Phone))) {
      return;
    }
  } catch (e) {
    // ignore
  }
  const sid = schoolId || "rec_yunlong";
  const t = getRecipientL2ForSchool(sid);
  if (t !== String(l2Phone)) {
    return;
  }
  const r = submitHoursRequest({
    schoolId: sid,
    studentName: "演示学员",
    volunteerName: "李志愿者",
    hours: 4,
    week: "2025-W20",
    applicantPhone: "",
    pairId: ""
  });
  if (r && r.ok) {
    try {
      wx.setStorageSync(HOURS_DEMO_KEY_PREFIX + String(l2Phone), "1");
    } catch (e) {
      // ignore
    }
  }
}

/**
 * 仅测试：整表覆盖认定义务时长
 * @param {any[]} list
 */
function replaceHoursListForDev(list) {
  if (!Array.isArray(list)) {
    return;
  }
  setList(list);
}

module.exports = {
  submitHoursRequest,
  getMyHoursRequests,
  getPendingForL2,
  getAllPendingForL1,
  getHoursRequestById,
  resolveHoursRequest,
  ensureDemoForRecipientL2,
  getList,
  replaceHoursListForDev
};
