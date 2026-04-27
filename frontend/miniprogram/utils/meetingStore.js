/**
 * 线上一对一/小组会议排期（Mock 存本地；上线后对接 HTTP 同构字段即可）
 * 建会：任意会议链接可粘贴（腾讯会议/课堂等）；不做腾讯 API 内嵌创建（见 README）。
 */
const { getPairById, getPairIdForRolePartner } = require("./pairingStore");
const { getPairedListForUser } = require("./chatPartners");
const { getByPhone } = require("./userProfileStore");

const KEY = "zhixing_meetings_v1";

/**
 * @returns {any[]}
 */
function getMeetingsRaw() {
  try {
    const raw = wx.getStorageSync(KEY);
    return Array.isArray(raw) ? raw : [];
  } catch (e) {
    return [];
  }
}

function setMeetingsRaw(list) {
  wx.setStorageSync(KEY, list);
}

/**
 * @param {string} [phone]
 * @param {string} [role]
 * @param {object} [profile]
 * @returns {Set<string>}
 */
function getUserPairIdSet(phone, role) {
  const s = new Set();
  if (role !== "student" && role !== "teacher") {
    return s;
  }
  const pl = getPairedListForUser(phone, role) || [];
  for (let i = 0; i < pl.length; i += 1) {
    const r = pl[i];
    const pid = getPairIdForRolePartner(role, r && r.partnerId);
    if (pid) {
      s.add(String(pid));
    }
  }
  return s;
}

/**
 * @param {object} m
 * @param {object} ctx
 * @param {string} ctx.phone
 * @param {string} ctx.role
 * @param {object} [ctx.profile]
 * @returns {boolean}
 */
function canSeeMeeting(m, ctx) {
  if (!m) {
    return false;
  }
  const role = (ctx && ctx.role) || "";
  const phone = (ctx && ctx.phone) != null ? String(ctx.phone) : "";
  if (m.createdByPhone && String(m.createdByPhone) === phone) {
    return role === "student" || role === "teacher";
  }
  if (role !== "student" && role !== "teacher") {
    return false;
  }
  if (!m.pairId) {
    return false;
  }
  if (!getPairById(String(m.pairId))) {
    return false;
  }
  return getUserPairIdSet(phone, role).has(String(m.pairId));
}

/**
 * @param {string} phone
 * @param {string} role
 * @param {object} [profile]
 * @returns {any[]}
 */
function getMeetingsForUser(phone, role, profile) {
  const raw = getMeetingsRaw();
  const p = profile || (phone && getByPhone(String(phone))) || {};
  return raw.filter((m) => canSeeMeeting(m, { phone, role, profile: p }));
}

/**
 * 将列表拆成「下一场未来」+「历史 / 无未来时最近一条未来展示」
 * @param {any[]} list
 * @param {number} [nowMs]
 * @returns {{ nextMeeting: any|null, history: any[] }}
 */
function splitNextAndHistory(list, nowMs) {
  const t = nowMs != null ? nowMs : Date.now();
  const sorted = (list || [])
    .slice()
    .filter((m) => m && m.startTimeMs)
    .sort((a, b) => (a.startTimeMs || 0) - (b.startTimeMs || 0));
  const future = sorted.filter((m) => (m.startTimeMs || 0) > t);
  const past = sorted
    .filter((m) => (m.startTimeMs || 0) <= t)
    .sort((a, b) => (b.startTimeMs || 0) - (a.startTimeMs || 0));
  const nextMeeting = future.length > 0 ? { ...future[0] } : null;
  const pastIds = new Set();
  if (nextMeeting) {
    pastIds.add(String(nextMeeting.id));
  }
  const history = past
    .filter((h) => !nextMeeting || String(h.id) !== String(nextMeeting.id))
    .map((h) => ({ ...h, status: h.status || "已结束" }));
  return { nextMeeting, history };
}

/**
 * @param {object} o
 * @param {string} o.title
 * @param {number} o.startTimeMs
 * @param {string} o.roomLink
 * @param {string} [o.pairId]
 * @param {string} o.createdByPhone
 * @param {string} o.creatorRole
 * @param {string} o.pairLine 展示用
 */
function addMeeting(o) {
  const o2 = o || {};
  const id = o2.id || "mt_" + Date.now() + "_" + Math.random().toString(16).slice(2, 6);
  const item = {
    id: id,
    title: String(o2.title || "").trim() || "未命名会议",
    startTimeMs: o2.startTimeMs != null ? +o2.startTimeMs : Date.now(),
    roomLink: String(o2.roomLink != null ? o2.roomLink : "").trim(),
    pairId: o2.pairId ? String(o2.pairId) : "",
    pairLine: String(o2.pairLine || "").trim() || (o2.pairId ? "结对 " + o2.pairId : "不指定结对"),
    createdByPhone: String(o2.createdByPhone || "").trim(),
    creatorRole: String(o2.creatorRole || "")
  };
  const list = [item, ...getMeetingsRaw()];
  setMeetingsRaw(list);
  return item;
}

function formatMeetingTime(ms) {
  if (ms == null || isNaN(+ms)) {
    return "—";
  }
  const d = new Date(+ms);
  if (isNaN(d.getTime())) {
    return "—";
  }
  const z = (n) => (n < 10 ? "0" : "") + n;
  return d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate()) + " " + z(d.getHours()) + ":" + z(d.getMinutes());
}

/**
 * 仅乡村学员、支教志愿者可登记会议（与底栏入口一致；管理员由产品侧不进入本模块）
 */
function canCreateMeetingRole(role) {
  return role === "student" || role === "teacher";
}

/**
 * 结对下拉里可选的结对口
 * @param {string} role
 * @param {object} prof
 * @param {boolean} allowEmpty
 * @returns {{ id: string, name: string }[]}
 */
function getPairOptionsForForm(role, prof) {
  const out = [];
  if (role === "student" || role === "teacher") {
    let phone = (prof && prof.phone) != null ? String(prof.phone) : "";
    if (!phone) {
      try {
        const u = (getApp() && getApp().globalData && getApp().globalData.userInfo) || {};
        phone = u.phone != null ? String(u.phone) : "";
      } catch (e) {
        phone = "";
      }
    }
    const pl = getPairedListForUser(phone, role) || [];
    for (let i = 0; i < pl.length; i += 1) {
      const r = pl[i];
      const pid = getPairIdForRolePartner(role, r && r.partnerId);
      if (!pid) {
        continue;
      }
      const pmeta = getPairById(String(pid)) || {};
      out.push({
        id: String(pid),
        name: (pmeta.studentName || "学员") + " — " + (pmeta.partnerName || "志愿者")
      });
    }
    return out;
  }
  return out;
}

module.exports = {
  getMeetingsRaw,
  getMeetingsForUser,
  canSeeMeeting,
  splitNextAndHistory,
  addMeeting,
  formatMeetingTime,
  canCreateMeetingRole,
  getPairOptionsForForm
};
