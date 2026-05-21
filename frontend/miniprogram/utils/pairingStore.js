/**
 * 结对与解绑申请（三向确认），Mock 存本地
 * 支持**一人多个结对**（多行 pairId，与聊天列表一致）。
 */

const { listL2Admins } = require("./userProfileStore");

const PAIR_KEY = "zhixing_active_pair";
const PAIR_LIST_KEY = "zhixing_active_pairs";
const UNBIND_KEY = "zhixing_unbind_requests";

const defaultPair = {
  pairId: "pair_001",
  studentId: "stu_001",
  teacherId: "vol_001",
  studentName: "小芳",
  partnerName: "王老师",
  subject: "数学",
  startDate: "2025-04-20",
  status: "结对中",
  schoolId: "rec_yunlong"
};

const OLD_PAIR_ID_TO_CANON = {
  P20250501: "pair_001",
  P20260422: "pair_001"
};

/**
 * 与 `chatPartners.PAIRED_LIST` 一一对应：学生侧 partnerId 为 vol_*
 */
const STUDENT_PARTNER_ID_TO_PAIR_ID = {
  vol_001: "pair_001",
  vol_002: "pair_002",
  vol_003: "pair_003",
  vol_004: "pair_004"
};

const TEACHER_PARTNER_ID_TO_PAIR_ID = {
  stu_001: "pair_001",
  stu_002: "pair_002",
  stu_003: "pair_003"
};

/**
 * 演示用完整结对表（4 个：其中 pair_001～003 在学员/志愿者两侧各能看到对应一行）
 * @returns {Array<object>}
 */
function defaultPairList() {
  return [
    {
      pairId: "pair_001",
      studentId: "stu_001",
      teacherId: "vol_001",
      studentName: "小芳",
      partnerName: "王老师",
      subject: "数学",
      startDate: "2025-04-20",
      status: "结对中",
      schoolId: "rec_yunlong"
    },
    {
      pairId: "pair_002",
      studentId: "stu_002",
      teacherId: "vol_002",
      studentName: "小军",
      partnerName: "李老师",
      subject: "英语",
      startDate: "2025-04-20",
      status: "结对中",
      schoolId: "rec_mengku"
    },
    {
      pairId: "pair_003",
      studentId: "stu_003",
      teacherId: "vol_003",
      studentName: "阿力",
      partnerName: "赵老师",
      subject: "科学",
      startDate: "2025-04-20",
      status: "结对中",
      schoolId: "rec_mengku"
    },
    {
      pairId: "pair_004",
      studentId: "",
      teacherId: "vol_004",
      studentName: "（预对接学员）",
      partnerName: "孙老师",
      subject: "历史",
      startDate: "2025-05-01",
      status: "结对中",
      schoolId: "rec_shidian"
    }
  ];
}

/**
 * 将已存覆盖合并进默认 4 条，保证字段齐全
 * @param {any[]} [overrides]
 * @returns {any[]}
 */
function mergeListWithDefaults(overrides) {
  const defs = defaultPairList();
  const m = new Map();
  for (let i = 0; i < (overrides || []).length; i += 1) {
    const x = overrides[i];
    if (x && x.pairId) {
      m.set(x.pairId, x);
    }
  }
  return defs.map((d) => {
    const o = m.get(d.pairId);
    return o ? { ...d, ...o, pairId: d.pairId } : { ...d };
  });
}

/**
 * 旧版单条 storage → 多条的迁移
 * @param {object} old
 * @returns {any[]|null}
 */
function migrateFromLegacySingle(old) {
  if (!old || !old.pairId) {
    return null;
  }
  const canon = OLD_PAIR_ID_TO_CANON[old.pairId] || (old.studentId === "stu_001" && old.teacherId === "vol_001" ? "pair_001" : "pair_001");
  const normalized = { ...old, pairId: canon };
  return mergeListWithDefaults([normalized]);
}

/**
 * 全部结对的当前快照（4 行）
 * @returns {any[]}
 */
function getActivePairList() {
  try {
    const stored = wx.getStorageSync(PAIR_LIST_KEY);
    if (Array.isArray(stored) && stored.length) {
      return mergeListWithDefaults(stored);
    }
  } catch (e) {
    // ignore
  }
  try {
    const le = wx.getStorageSync(PAIR_KEY);
    if (le && le.pairId) {
      const ml = migrateFromLegacySingle(le);
      if (ml) {
        wx.setStorageSync(PAIR_LIST_KEY, ml);
        return ml;
      }
    }
  } catch (e2) {
    // ignore
  }
  return defaultPairList();
}

/**
 * @param {string} pairId
 * @returns {object|undefined}
 */
function getPairById(pairId) {
  if (!pairId) {
    return undefined;
  }
  return getActivePairList().find((p) => p.pairId === String(pairId));
}

/**
 * 与聊天 partnerId 对齐的 pairId（多结对）
 * @param {string} role
 * @param {string} partnerId vol_* 或 stu_*
 * @returns {string}
 */
function getPairIdForRolePartner(role, partnerId) {
  const k = String(partnerId || "");
  if (role === "student") {
    return STUDENT_PARTNER_ID_TO_PAIR_ID[k] || "";
  }
  if (role === "teacher") {
    return TEACHER_PARTNER_ID_TO_PAIR_ID[k] || "";
  }
  return "";
}

/**
 * 供其它页兼容：取「首条 结对中」，否则取第一条
 * @returns {object}
 */
function getActivePair() {
  const list = getActivePairList();
  const found = list.find((p) => p.status === "结对中");
  const raw = found || list[0] || { ...defaultPair };
  const c = { ...raw };
  if (!c.partnerName && c.teacherName) {
    c.partnerName = c.teacherName;
  }
  return c;
}

/**
 * @param {string} pairId
 * @param {object} partial
 * @returns {object|null}
 */
function setPairById(pairId, partial) {
  const list = getActivePairList();
  const idx = list.findIndex((p) => p.pairId === String(pairId));
  if (idx === -1) {
    return null;
  }
  const n = { ...list[idx], ...partial, pairId: list[idx].pairId };
  const nlist = list.slice();
  nlist[idx] = n;
  wx.setStorageSync(PAIR_LIST_KEY, nlist);
  return n;
}

/**
 * 兼容旧逻辑：无 pairId 时改首条
 * @param {object} partial
 * @returns {object}
 */
function setActivePair(partial) {
  const p = partial || {};
  if (p.pairId) {
    return setPairById(String(p.pairId), p) || getActivePair();
  }
  const first = getActivePairList()[0] || { pairId: "pair_001" };
  return setPairById(first.pairId, p) || { ...getActivePair(), ...p };
}

function getUnbindList() {
  try {
    const raw = wx.getStorageSync(UNBIND_KEY);
    return Array.isArray(raw) ? raw : [];
  } catch (e) {
    return [];
  }
}

function setUnbindList(list) {
  wx.setStorageSync(UNBIND_KEY, list);
}

/**
 * 受援校二级：根据结对 schoolId
 * @param {string} schoolId
 * @returns {string|null} phone
 */
function getRecipientL2ForSchool(schoolId) {
  if (!schoolId) {
    return null;
  }
  const list = listL2Admins();
  for (let i = 0; i < list.length; i += 1) {
    const u = list[i];
    if (u.l2Scope === "recipient_side" && Array.isArray(u.recipientTargetIds) && u.recipientTargetIds.indexOf(schoolId) !== -1) {
      return u.phone;
    }
  }
  return null;
}

/**
 * 新建解绑单：三方均未同意
 * @param {object} o
 * @param {string} o.reason
 * @param {string} o.fromRole student|teacher|admin_level_2
 * @param {string} o.pairId 必传：对应一条结对
 */
function createUnbindRequest(o) {
  const o2 = o || {};
  const p0 = o2.pairId ? getPairById(String(o2.pairId)) : null;
  const p = p0 && p0.pairId ? p0 : getActivePair();
  const schoolId = p.schoolId || "rec_yunlong";
  const l2 = getRecipientL2ForSchool(schoolId);
  const fromRole0 = o2.fromRole || "student";
  let initiatorLabel = "学员 " + (p.studentName || "（未知）");
  if (fromRole0 === "teacher") {
    initiatorLabel = "志愿者 " + (p.partnerName || "（未知）");
  }
  const item = {
    id: `ub_${Date.now()}`,
    pairId: p.pairId,
    schoolId: schoolId,
    studentId: p.studentId,
    studentName: p.studentName,
    partnerName: p.partnerName,
    l2UserId: l2 || "",
    reason: (o2.reason || "").trim() || "（未填写）",
    fromRole: fromRole0,
    initiatorLabel: initiatorLabel,
    applicantPhone: o2.applicantPhone != null && o2.applicantPhone !== "" ? String(o2.applicantPhone) : "",
    status: "pending_approval",
    agree: {
      student: false,
      teacher: false,
      l2: l2 ? false : true
    },
    createdAt: Date.now()
  };
  if (!l2) {
    item.agree.l2 = true;
  }
  const list = [item, ...getUnbindList().filter((u) => u.status !== "pending_approval" || u.pairId !== p.pairId)];
  setUnbindList(list);
  return item;
}

/**
 * 当前端确认解绑
 * @param {string} requestId
 * @param {"student"|"teacher"|"l2"} party
 * @param {string} currentPhone
 * @param {string} currentRole
 */
function recordUnbindAgree(requestId, party, currentPhone, currentRole) {
  const list = getUnbindList();
  const idx = list.findIndex((x) => x.id === requestId);
  if (idx === -1) {
    return { ok: false, message: "未找到待办" };
  }
  const row = { ...list[idx] };
  const ag = { ...row.agree };
  if (party === "student" && currentRole === "student") {
    ag.student = true;
  } else if (party === "teacher" && currentRole === "teacher") {
    ag.teacher = true;
  } else if (party === "l2" && currentRole === "admin_level_2" && String(row.l2UserId) === String(currentPhone)) {
    ag.l2 = true;
  } else {
    return { ok: false, message: "与当前身份不符" };
  }
  row.agree = ag;
  if (ag.student && ag.teacher && ag.l2) {
    row.status = "completed";
    if (row.pairId) {
      setPairById(String(row.pairId), { status: "已解绑" });
    } else {
      setActivePair({ status: "已解绑" });
    }
  }
  list[idx] = row;
  setUnbindList(list);
  return { ok: true, item: row, allAgreed: row.status === "completed" };
}

/**
 * 当前结对下待处理的解绑单（取最新一条待审批）
 * @param {string} [pairId]
 */
function getLatestPendingUnbind(pairId) {
  const p = pairId || getActivePair().pairId;
  const list = getUnbindList();
  for (let i = 0; i < list.length; i += 1) {
    if (list[i].pairId === p && list[i].status === "pending_approval") {
      return list[i];
    }
  }
  return null;
}

/**
 * 受援方 L2：只看待处理的、且由学员/志愿者发起（非平台代提）的解绑单
 * @param {{ recipientTargetIds?: string[] }|null|undefined} prof
 * @returns {any[]}
 */
function getUnbindListForRecipientL2(prof) {
  if (!prof || !Array.isArray(prof.recipientTargetIds) || !prof.recipientTargetIds.length) {
    return [];
  }
  const set = new Set(prof.recipientTargetIds);
  const list = getUnbindList();
  return list
    .filter((u) => {
      if (!u || u.status !== "pending_approval" || !u.schoolId) {
        return false;
      }
      if (!set.has(u.schoolId)) {
        return false;
      }
      const fr = u.fromRole;
      if (fr === "admin_level_1" || fr === "admin_level_2") {
        return false;
      }
      return true;
    })
    .map((u) => enrichUnbindItemForDisplay(u))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

/**
 * 旧单补齐 initiatorLabel
 * @param {object} u
 * @returns {object}
 */
function enrichUnbindItemForDisplay(u) {
  if (!u) {
    return u;
  }
  if (u.initiatorLabel) {
    return { ...u };
  }
  const fr = u.fromRole || "student";
  if (fr === "teacher") {
    return { ...u, initiatorLabel: "志愿者 " + (u.partnerName || "（未知）") };
  }
  return { ...u, initiatorLabel: "学员 " + (u.studentName || "（未知）") };
}

/**
 * @param {string} id
 * @returns {any|null}
 */
function getUnbindById(id) {
  if (!id) {
    return null;
  }
  return getUnbindList().find((x) => x && x.id === id) || null;
}

/** 一级平台强制解绑，不经过三方 */
function platformForceUnbind() {
  const list = getActivePairList();
  for (let i = 0; i < list.length; i += 1) {
    if (list[i] && list[i].pairId) {
      setPairById(String(list[i].pairId), { status: "已解绑" });
    }
  }
  return { ok: true };
}

function rejectUnbind(requestId) {
  const list = getUnbindList();
  const idx = list.findIndex((x) => x.id === requestId);
  if (idx === -1) {
    return { ok: false, message: "未找到待办" };
  }
  const row = { ...list[idx], status: "rejected" };
  list[idx] = row;
  setUnbindList(list);
  return { ok: true, item: row };
}

/** 开发/种子：整表替换 */
function replaceActivePairListForDev(pairs) {
  wx.setStorageSync(PAIR_LIST_KEY, Array.isArray(pairs) ? pairs : []);
}

module.exports = {
  getActivePair,
  setActivePair,
  getActivePairList,
  getPairById,
  getPairIdForRolePartner,
  getUnbindList,
  getUnbindListForRecipientL2,
  getUnbindById,
  createUnbindRequest,
  recordUnbindAgree,
  getRecipientL2ForSchool,
  getLatestPendingUnbind,
  platformForceUnbind,
  rejectUnbind,
  replaceActivePairListForDev,
  mergeListWithDefaults,
  defaultPairList
};
