/**
 * 已结对对象与初始聊天记录。
 * 聊天记录按 partnerId 分桶存入本地 storage。
 */

const { getSchoolName } = require("./schoolsMock");
const { getActivePairList } = require("./pairingStore");
const {
  getApprovedStudentsReviewedByRecipientL2,
  getApprovedTeachersReviewedByVolunteerL2
} = require("./onboardingStore");

const STORAGE_PREFIX = "zhixing_chat_";

const SCHOOL_ID_TO_TEMPLATE_VOL = {
  rec_yunlong: "vol_001",
  rec_mengku: "vol_002",
  rec_hekou: "vol_003",
  rec_shidian: "vol_004",
  rec_nujiang: "vol_001",
  rec_lushi: "vol_001"
};

const L1_DUO_BY_PARTNER = {
  vol_001: { schoolId: "rec_yunlong", studentName: "乡村学员", volunteerName: "王老师" },
  vol_002: { schoolId: "rec_mengku", studentName: "乡村学员", volunteerName: "李老师" },
  vol_003: { schoolId: "rec_hekou", studentName: "乡村学员", volunteerName: "赵老师" },
  vol_004: { schoolId: "rec_shidian", studentName: "乡村学员", volunteerName: "孙老师" },
  stu_001: { schoolId: "rec_yunlong", studentName: "小芳", volunteerName: "支教老师" },
  stu_002: { schoolId: "rec_mengku", studentName: "小军", volunteerName: "支教老师" },
  stu_003: { schoolId: "rec_mengku", studentName: "阿力", volunteerName: "支教老师" }
};

function sanitizeKey(id) {
  return String(id || "").replace(/[^a-zA-Z0-9_]/g, "_");
}

/**
 * 受援老师只读查看会话的 partnerId，与 `getApprovedStudentsReviewedByRecipientL2` 结果一一对应
 * @param {{ id: string }} app
 * @returns {string}
 */
function toRecipientL2ObserverPartnerId(app) {
  return "vol_l2r_" + sanitizeKey(app && app.id);
}

function getApplicationByRecipientL2ObserverPartnerId(partnerId) {
  const { getApplications } = require("./onboardingStore");
  if (String(partnerId).indexOf("vol_l2r_") !== 0) {
    return null;
  }
  const want = String(partnerId).slice(8);
  return (getApplications() || []).find((a) => sanitizeKey(a.id) === want) || null;
}

/**
 * 支教 L2 只读查看：每条已通过志愿者申请一条会话
 * @param {{ id: string }} app
 * @returns {string}
 */
function toVolunteerL2ObserverPartnerId(app) {
  return "vol_l2v_" + sanitizeKey(app && app.id);
}

function getApplicationByVolunteerL2ObserverPartnerId(partnerId) {
  const { getApplications } = require("./onboardingStore");
  if (String(partnerId).indexOf("vol_l2v_") !== 0) {
    return null;
  }
  const want = String(partnerId).slice(8);
  return (getApplications() || []).find((a) => sanitizeKey(a.id) === want) || null;
}

/** 一级/受援二级的只读查看：partnerId 对应的学校与双端显示名，含受援 L2 动态线 */
function getDuoForObserverView(partnerId) {
  const id = String(partnerId);
  if (L1_DUO_BY_PARTNER[id]) {
    return L1_DUO_BY_PARTNER[id];
  }
  if (id.indexOf("vol_l2r_") === 0) {
    const app = getApplicationByRecipientL2ObserverPartnerId(id);
    if (!app) {
      return null;
    }
    const ex = app.extra || {};
    const schoolId = app.schoolId || "";
    const sn = (ex.name || "").trim() || "乡村学员";
    const tid = SCHOOL_ID_TO_TEMPLATE_VOL[schoolId] || "vol_001";
    const tduo = L1_DUO_BY_PARTNER[tid] || L1_DUO_BY_PARTNER.vol_001;
    return { schoolId: schoolId, studentName: sn, volunteerName: tduo.volunteerName || "支教老师" };
  }
  if (id.indexOf("vol_l2v_") === 0) {
    const app = getApplicationByVolunteerL2ObserverPartnerId(id);
    if (!app) {
      return null;
    }
    const ex = app.extra || {};
    const schoolId = app.schoolId || "";
    const tid = SCHOOL_ID_TO_TEMPLATE_VOL[schoolId] || "vol_001";
    const tduo = L1_DUO_BY_PARTNER[tid] || L1_DUO_BY_PARTNER.vol_001;
    const vn = (ex.name || "").trim() || tduo.volunteerName || "支教老师";
    return { schoolId: schoolId, studentName: tduo.studentName || "乡村学员", volunteerName: vn };
  }
  return null;
}

/**
 * @param {string} phone
 * @param {object} [l2Profile]
 * @returns {string[]}
 */
function getAllowedRecipientL2ObserverPartnerIds(phone, l2Profile) {
  return getPairedListForRecipientL2(phone, l2Profile).map((p) => p.partnerId);
}

/**
 * 某受援 L2 是否可打开该 partnerId 的只读查看会话
 * @param {string} phone
 * @param {string} partnerId
 * @param {object} l2Profile
 * @returns {boolean}
 */
function isRecipientL2ObserverAllowed(phone, partnerId, l2Profile) {
  if (!phone || !partnerId) {
    return false;
  }
  return getPairedListForRecipientL2(phone, l2Profile).some((p) => p.partnerId === partnerId);
}

/**
 * 支教方 L2：可查看的志愿者会话
 */
function getPairedListForVolunteerL2(phone, l2Profile) {
  if (!l2Profile || l2Profile.l2Scope !== "volunteer_side") {
    return [];
  }
  const apps = getApprovedTeachersReviewedByVolunteerL2(phone, l2Profile);
  const out = [];
  for (let i = 0; i < apps.length; i += 1) {
    const app = apps[i];
    const partnerId = toVolunteerL2ObserverPartnerId(app);
    const duo = getDuoForObserverView(partnerId);
    const line =
      (duo && duo.studentName + " ⟷ " + duo.volunteerName) || "学员 ⟷ 志愿者";
    const schoolId = (duo && duo.schoolId) || app.schoolId || "";
    const schoolName = schoolId ? getSchoolName(schoolId) : "—";
    const thread = loadThread(partnerId);
    const last = thread && thread.length ? thread[thread.length - 1] : null;
    out.push({
      partnerId: partnerId,
      name: line,
      tag: schoolName + " · 本支教点 · 可查看",
      lastPreview: (last && last.text) || "（暂无内容）",
      lastTime: "近期",
      schoolId: schoolId,
      schoolName: schoolName,
      l1DuoLine: line
    });
  }
  return out;
}

function isVolunteerL2ObserverAllowed(phone, partnerId, l2Profile) {
  if (!phone || !partnerId) {
    return false;
  }
  return getPairedListForVolunteerL2(phone, l2Profile).some((p) => p.partnerId === partnerId);
}

/** @type {Record<string, { partnerId: string, name: string, tag: string, lastPreview: string, lastTime: string }[]>} */
const PAIRED_LIST = {
  /** 乡村学员：对话对象为志愿者/支教老师 (partnerId 以 vol_ 为前缀)，勿用「XX同学」作展示名，易与同学身份混淆。 */
  student: [
    {
      partnerId: "vol_001",
      name: "王老师",
      tag: "支教志愿者 · 数学",
      lastPreview: "今晚 8 点我们复习函数。",
      lastTime: "昨天"
    },
    {
      partnerId: "vol_002",
      name: "李老师",
      tag: "支教志愿者 · 英语",
      lastPreview: "记得带上七年级上册单词表。",
      lastTime: "周日"
    },
    {
      partnerId: "vol_003",
      name: "赵老师",
      tag: "支教志愿者 · 科学",
      lastPreview: "下周小实验我拍视频给你看。",
      lastTime: "15:20"
    },
    {
      partnerId: "vol_004",
      name: "孙老师",
      tag: "历史 · 预约中",
      lastPreview: "这章我整理了时间轴。",
      lastTime: "周一"
    }
  ],
  teacher: [
    {
      partnerId: "stu_001",
      name: "小芳",
      tag: "乡村学员 · 七年级",
      lastPreview: "好的老师，我会提前准备。",
      lastTime: "昨天"
    },
    {
      partnerId: "stu_002",
      name: "小军",
      tag: "八年级",
      lastPreview: "老师作业已交在群里。",
      lastTime: "10:32"
    },
    {
      partnerId: "stu_003",
      name: "阿力",
      tag: "乡村学员 · 勐库",
      lastPreview: "这题我还是不太懂。",
      lastTime: "周三"
    }
  ],
  admin_level_2: [],
  admin_level_1: []
};

/**
 * 一级管理端：汇总监听演示会话（学员/志愿者侧合并，去重 partnerId），带学校与双方标题
 */
function getPairedListForL1() {
  const sourceLabels = ["学员侧", "志愿者侧"];
  const lists = [PAIRED_LIST.student, PAIRED_LIST.teacher];
  const seen = new Set();
  const out = [];
  for (let s = 0; s < lists.length; s += 1) {
    const part = lists[s] || [];
    for (let i = 0; i < part.length; i += 1) {
      const p = part[i];
      if (!p || !p.partnerId || seen.has(p.partnerId)) {
        continue;
      }
      seen.add(p.partnerId);
      const duo = L1_DUO_BY_PARTNER[p.partnerId] || {};
      const schoolId = duo.schoolId || "rec_yunlong";
      const schoolName = getSchoolName(schoolId);
      const a = duo.studentName || "学员";
      const b = duo.volunteerName || p.name || "对方";
      const l1DuoLine = a + " ⟷ " + b;
      out.push({
        ...p,
        schoolId: schoolId,
        schoolName: schoolName,
        l1DuoLine: l1DuoLine,
        name: l1DuoLine,
        tag: schoolName + " · 巡览（" + (sourceLabels[s] || "会话") + "）"
      });
    }
  }
  return out;
}

/**
 * 受援方 L2：仅本老师已通过的学生的会话（学员与志愿者双方，灰色展示）
 * @param {string} phone
 * @param {{ l2Scope?: string, recipientTargetIds?: string[] } | null} l2Profile
 */
function getPairedListForRecipientL2(phone, l2Profile) {
  if (!l2Profile || l2Profile.l2Scope !== "recipient_side") {
    return [];
  }
  const apps = getApprovedStudentsReviewedByRecipientL2(phone, l2Profile);
  const out = [];
  for (let i = 0; i < apps.length; i += 1) {
    const app = apps[i];
    const partnerId = toRecipientL2ObserverPartnerId(app);
    const duo = getDuoForObserverView(partnerId);
    const line =
      (duo && (duo.studentName + " ⟷ " + duo.volunteerName)) || "学员 ⟷ 志愿者";
    const schoolId = (duo && duo.schoolId) || app.schoolId || "";
    const schoolName = schoolId ? getSchoolName(schoolId) : "—";
    const thread = loadThread(partnerId);
    const last = thread && thread.length ? thread[thread.length - 1] : null;
    out.push({
      partnerId: partnerId,
      name: line,
      tag: schoolName + " · 本区已通过 · 可查看",
      lastPreview: (last && last.text) || "（暂无内容）",
      lastTime: "近期",
      schoolId: schoolId,
      schoolName: schoolName,
      l1DuoLine: line
    });
  }
  return out;
}

/**
 * 供一级聊天列表按学校筛选
 */
function getL1SchoolFilterOptions() {
  const seen = new Set();
  const opts = [{ id: "", name: "全部学校" }];
  getPairedListForL1().forEach((p) => {
    if (!p.schoolId || seen.has(p.schoolId)) {
      return;
    }
    seen.add(p.schoolId);
    opts.push({ id: p.schoolId, name: p.schoolName || getSchoolName(p.schoolId) });
  });
  return opts;
}

/**
 * 会话室：平台巡览/受援老师只读查看 双方线程时，把原「我」与对端还原为「学员/志愿者」两侧展示
 * @param {string} partnerId
 * @param {Array} raw
 */
function mapThreadForL1View(partnerId, raw) {
  const id = String(partnerId);
  const duo = getDuoForObserverView(id) || {};
  const isVol = id.indexOf("vol_") === 0;
  const isStu = id.indexOf("stu_") === 0;
  return (raw || []).map((m) => {
    const fromRaw = m.from;
    const wasSelf = !!m.isSelf;
    let isStudentMsg;
    if (isVol) {
      isStudentMsg = wasSelf;
    } else if (isStu) {
      isStudentMsg = !wasSelf;
    } else {
      isStudentMsg = !wasSelf;
    }
    const partyLabel = isStudentMsg ? "学员" : "志愿者";
    let displayName = fromRaw;
    if (fromRaw === "我") {
      displayName = isStudentMsg ? duo.studentName || "乡村学员" : duo.volunteerName || "支教老师";
    } else {
      displayName = fromRaw;
    }
    return {
      id: m.id,
      from: displayName,
      partyLabel: partyLabel,
      text: m.text,
      time: m.time,
      l1IsStudent: isStudentMsg,
      avatarChar: (displayName || "?").charAt(0) || "?"
    };
  });
}

function getL1ThreadTitleLine(partnerId) {
  const duo = getDuoForObserverView(partnerId);
  if (!duo) {
    return "会话";
  }
  return (duo.studentName || "学员") + " ⟷ " + (duo.volunteerName || "老师");
}

/** @type {Record<string, { id: number, from: string, text: string, time: string, isSelf: boolean }[]>} */
const SEED_MESSAGES = {
  vol_001: [
    { id: 101, from: "王老师", text: "你好，今晚 8 点我们复习函数。", time: "19:30", isSelf: false },
    { id: 102, from: "我", text: "好的老师，我会提前准备。", time: "19:32", isSelf: true }
  ],
  vol_002: [
    { id: 201, from: "李老师", text: "记得带上七年级上册单词表。", time: "10:12", isSelf: false },
    { id: 202, from: "我", text: "好的老师，我放进书包了。", time: "10:18", isSelf: true }
  ],
  stu_001: [
    { id: 301, from: "小芳", text: "老师好，我想问一下作文怎么立意。", time: "09:00", isSelf: false },
    { id: 302, from: "我", text: "可以先列三个关键词再展开。", time: "09:05", isSelf: true }
  ],
  vol_003: [
    { id: 501, from: "赵老师", text: "下周小实验我拍视频给你看。", time: "15:20", isSelf: false }
  ],
  vol_004: [
    { id: 502, from: "孙老师", text: "这章我整理了时间轴。", time: "09:00", isSelf: false }
  ],
  stu_002: [
    { id: 601, from: "小军", text: "老师作业已交在群里。", time: "10:32", isSelf: false }
  ],
  stu_003: [
    { id: 602, from: "阿力", text: "这题我还是不太懂。", time: "20:00", isSelf: false }
  ]
};

function buildRecipientL2ObserverSeedForApp(app) {
  const tid = SCHOOL_ID_TO_TEMPLATE_VOL[app.schoolId] || "vol_001";
  const base = SEED_MESSAGES[tid] || SEED_MESSAGES.vol_001;
  const copy = JSON.parse(JSON.stringify(base));
  if (!copy.length) {
    return copy;
  }
  const ex = app.extra || {};
  const tduo = L1_DUO_BY_PARTNER[tid] || L1_DUO_BY_PARTNER.vol_001;
  for (let i = 0; i < copy.length; i += 1) {
    if (copy[i].isSelf) {
      copy[i].from = (ex.name || "乡村学员").trim() || "我";
    } else {
      const vn = tduo.volunteerName || "支教老师";
      if (i === 0) {
        copy[i].from = vn;
      }
    }
  }
  return copy;
}

function buildVolunteerL2ObserverSeedForApp(app) {
  const tid = SCHOOL_ID_TO_TEMPLATE_VOL[app.schoolId] || "vol_001";
  const base = SEED_MESSAGES[tid] || SEED_MESSAGES.vol_001;
  const copy = JSON.parse(JSON.stringify(base));
  if (!copy.length) {
    return copy;
  }
  const ex = app.extra || {};
  const tduo = L1_DUO_BY_PARTNER[tid] || L1_DUO_BY_PARTNER.vol_001;
  const volName = (ex.name || "").trim() || tduo.volunteerName || "支教老师";
  for (let i = 0; i < copy.length; i += 1) {
    if (copy[i].isSelf) {
      copy[i].from = tduo.studentName || "乡村学员";
    } else {
      if (i === 0) {
        copy[i].from = volName;
      }
    }
  }
  return copy;
}

function storageKey(partnerId) {
  return `${STORAGE_PREFIX}${partnerId}`;
}

function loadThread(partnerId) {
  const key = storageKey(partnerId);
  let saved;
  try {
    saved = wx.getStorageSync(key);
  } catch (e) {
    saved = null;
  }
  if (saved && Array.isArray(saved) && saved.length) {
    return saved;
  }
  if (String(partnerId).indexOf("vol_l2r_") === 0) {
    const app = getApplicationByRecipientL2ObserverPartnerId(partnerId);
    if (app) {
      return buildRecipientL2ObserverSeedForApp(app);
    }
  }
  if (String(partnerId).indexOf("vol_l2v_") === 0) {
    const app = getApplicationByVolunteerL2ObserverPartnerId(partnerId);
    if (app) {
      return buildVolunteerL2ObserverSeedForApp(app);
    }
  }
  const seed = SEED_MESSAGES[partnerId];
  return seed ? JSON.parse(JSON.stringify(seed)) : [];
}

function saveThread(partnerId, messages) {
  wx.setStorageSync(storageKey(partnerId), messages);
}

function getPairedList(role) {
  return PAIRED_LIST[role] || [];
}

/**
 * 将手机号稳定映射到 stu_001～003 / vol_001～004，与 pairingStore 默认行对齐（演示用）
 */
function hashPhoneToNonNeg(phone) {
  const s = String(phone || "0");
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function getMockStudentEntityId(phone) {
  const arr = ["stu_001", "stu_002", "stu_003"];
  return arr[hashPhoneToNonNeg(phone) % 3];
}

function getMockVolunteerEntityId(phone) {
  const arr = ["vol_001", "vol_002", "vol_003", "vol_004"];
  return arr[hashPhoneToNonNeg(phone) % 4];
}

/**
 * 与 getActivePairList 中某行的 studentId / teacherId 对应（用于「只显示与本人相关」的结对）
 */
function getRelevantActivePairRows(phone, role) {
  if (role !== "student" && role !== "teacher") {
    return [];
  }
  if (!phone) {
    return [];
  }
  const all = getActivePairList() || [];
  if (role === "student") {
    const sid = getMockStudentEntityId(phone);
    return all.filter((p) => p && p.status === "结对中" && p.studentId && String(p.studentId) === sid);
  }
  const vid = getMockVolunteerEntityId(phone);
  return all.filter((p) => p && p.status === "结对中" && p.teacherId && String(p.teacherId) === vid);
}

/**
 * 乡村学员 / 支教志愿者：仅返回与「当前账号在演示结对中身份」相关的会话行（与会议/解绑/结对选区一致，避免刷出与本人无关的全体演示结对）
 * @param {string} phone
 * @param {string} role
 */
function getPairedListForUser(phone, role) {
  if (role !== "student" && role !== "teacher") {
    return getPairedList(role);
  }
  if (!phone) {
    return [];
  }
  const allRows = getPairedList(role) || [];
  const rel = getRelevantActivePairRows(phone, role);
  const allowPartner = new Set();
  for (let i = 0; i < rel.length; i += 1) {
    const p = rel[i];
    if (role === "student" && p.teacherId) {
      allowPartner.add(String(p.teacherId));
    }
    if (role === "teacher" && p.studentId) {
      allowPartner.add(String(p.studentId));
    }
  }
  return allRows.filter((row) => row && row.partnerId && allowPartner.has(String(row.partnerId)));
}

module.exports = {
  getPairedList,
  getPairedListForUser,
  getPairedListForL1,
  getPairedListForRecipientL2,
  getPairedListForVolunteerL2,
  getDuoForObserverView,
  getL1SchoolFilterOptions,
  toRecipientL2ObserverPartnerId,
  toVolunteerL2ObserverPartnerId,
  isRecipientL2ObserverAllowed,
  isVolunteerL2ObserverAllowed,
  getAllowedRecipientL2ObserverPartnerIds,
  mapThreadForL1View,
  getL1ThreadTitleLine,
  loadThread,
  saveThread
};
