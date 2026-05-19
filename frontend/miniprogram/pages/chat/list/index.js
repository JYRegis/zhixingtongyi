const { getPairedListForUser, getPairedListForL1, getL1SchoolFilterOptions, getPairedListForRecipientL2, getPairedListForVolunteerL2 } = require("../../../utils/chatPartners");
const { ROLE_DISPLAY_NAME } = require("../../../utils/roleLabels");
const { checkOnboardingOrRedirect } = require("../../../utils/onboardingGuard");
const { syncCustomTabBar } = require("../../../utils/customTabBar");
const { mergeFromStorageIntoApp, getByPhone } = require("../../../utils/userProfileStore");
const { matchApi, adminApi, chatApi } = require("../../../utils/api");
const { shouldClearUnread } = require("../../../utils/chatReadStore");
const notificationCenter = require("../../../utils/notificationCenter");

function enrichPairs(pairs) { return (pairs || []).map((item) => ({ ...item, avatarText: String(item && item.name ? item.name : "聊").slice(0, 1) })); }
function fmtTime(v) {
  if (!v) return "";
  const t = typeof v === "string" ? Date.parse(v.replace(" ", "T")) : Date.parse(String(v));
  if (isNaN(t)) return "";
  const d = new Date(t);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const z = (n) => (n < 10 ? "0" : "") + n;
  if (isToday) return z(d.getHours()) + ":" + z(d.getMinutes());
  // 同一年只显示「月X日」，跨年显示「YYYY年X月X日」
  if (d.getFullYear() === now.getFullYear()) return (d.getMonth() + 1) + "月" + d.getDate() + "日";
  return d.getFullYear() + "年" + (d.getMonth() + 1) + "月" + d.getDate() + "日";
}
function daysSince(v) {
  if (!v) return 0;
  const t = typeof v === "string" ? Date.parse(v.replace(" ", "T")) : Date.parse(String(v));
  if (isNaN(t)) return 0;
  const days = Math.floor((Date.now() - t) / 86400000);
  return days < 0 ? 0 : days;
}
function statusInfo(matchStatus) {
  const n = matchStatus == null ? -1 : Number(matchStatus);
  if (n === 0) return { text: "待审核", level: "warning" };
  if (n === 1) return { text: "结对中", level: "success" };
  if (n === 2) return { text: "已拒绝", level: "danger" };
  if (n === 3) return { text: "解绑流程中", level: "warning" };
  if (n === 4) return { text: "已解绑", level: "muted" };
  if (n === 5) return { text: "解绑有异议", level: "danger" };
  return { text: "", level: "" };
}
function mapRemotePairs(pairs, role) {
  const arr = Array.isArray(pairs) ? pairs : ((pairs && (pairs.records || pairs.list)) || []);
  return arr.map((p) => {
    const id = p && p.id != null ? p.id : p.pairId;
    const otherName = role === "student" ? (p.teacherName || "志愿者") : (p.studentName || "学员");
    const otherSchool = role === "student" ? (p.teacherSchool || "") : (p.studentSchool || "");
    const otherRoleLabel = role === "student" ? "志愿者" : "学员";
    const sInfo = statusInfo(p && p.matchStatus);
    const days = daysSince(p && p.acceptTime);
    return {
      id: String(id),
      partnerId: String(id),
      name: otherName,
      tag: otherRoleLabel,
      schoolName: otherSchool,
      schoolId: p && p.schoolId,
      _remote: true,
      lastPreview: "",
      lastTime: "",
      unreadCount: 0,
      statusText: sInfo.text,
      statusLevel: sInfo.level,
      durationText: days > 0 ? "已结对 " + days + " 天" : (p && p.acceptTime ? "今日开始结对" : "")
    };
  });
}
function mapAdminConversations(conversations) {
  return (Array.isArray(conversations) ? conversations : []).map((c) => {
    const id = c.matchPairId || c.pairId || c.id;
    const name = (c.studentName && c.teacherName) ? c.studentName + " — " + c.teacherName : "会话";
    const rawUnread = Number(c.unreadCount || 0);
    // 乐观清零：本地最近查看时间 >= lastMessageTime 时直接显示 0
    const unread = shouldClearUnread(id, c.lastMessageTime) ? 0 : rawUnread;
    return {
      id: String(id),
      partnerId: String(id),
      name: name,
      tag: "",
      schoolName: c.schoolName || "",
      schoolId: c.schoolId,
      _remote: true,
      lastPreview: c.lastMessage || "暂无消息",
      lastTime: fmtTime(c.lastMessageTime),
      unreadCount: unread,
      statusText: "",
      statusLevel: "",
      durationText: ""
    };
  });
}

function buildSchoolFilter(pairs) {
  const map = {};
  (pairs || []).forEach(function (p) { if (p.schoolName) map[p.schoolName] = p.schoolId; });
  const list = [{ id: "", name: "全部学校" }];
  Object.keys(map).forEach(function (name) { list.push({ id: map[name], name: name }); });
  return list;
}

Page({
  data: { role: "", roleName: "未登录", pairs: [], l1FilterSchools: [], l1FilterIndex: 0, emptyHint: "" },
  onShow() {
    checkOnboardingOrRedirect("pages/chat/list/index"); syncCustomTabBar(); mergeFromStorageIntoApp();
    // 进入列表立即刷新 Tab 徽标，确保从其他页切回时数据一致
    try { notificationCenter.refreshChatUnread(); } catch (_) {}
    const u = (getApp().globalData && getApp().globalData.userInfo) || {}; const profile = getByPhone(u.phone) || u; const role = getApp().globalData.role || ""; const token = (getApp().globalData && getApp().globalData.token) || wx.getStorageSync("token") || "";
    if (role === "admin_level_1") {
      if (token) {
        adminApi.chatConversations().then((res) => {
          const raw = Array.isArray(res) ? res : (res && res.records) || (res && res.list) || [];
          const all = enrichPairs(mapAdminConversations(raw));
          const schools = buildSchoolFilter(all);
          this._allPairs = all;
          this.setData({ role, roleName: ROLE_DISPLAY_NAME[role] || "未登录", pairs: all, l1FilterSchools: schools, l1FilterIndex: 0, emptyHint: all.length ? "" : "暂无会话" });
        }).catch(() => {
          this.setData({ role, roleName: ROLE_DISPLAY_NAME[role] || "未登录", pairs: [], l1FilterSchools: [], l1FilterIndex: 0, emptyHint: "暂无会话" });
        });
        return;
      }
      this.setData({ role, roleName: ROLE_DISPLAY_NAME[role] || "未登录", pairs: [], l1FilterSchools: [], l1FilterIndex: 0, emptyHint: "暂无会话" }); return;
    }
    if (role === "admin_level_2") {
      if (token) {
        adminApi.chatConversations().then((res) => {
          const raw = Array.isArray(res) ? res : (res && res.records) || (res && res.list) || [];
          const pairs = enrichPairs(mapAdminConversations(raw));
          this.setData({ role, roleName: ROLE_DISPLAY_NAME[role] || "未登录", pairs, l1FilterSchools: [], l1FilterIndex: 0, emptyHint: pairs.length ? "" : "暂无会话" });
        }).catch(() => {
          matchApi.myPairs(1).then((rows) => {
            const pairs = enrichPairs(mapRemotePairs(Array.isArray(rows) ? rows : [], "admin"));
            this.setData({ role, roleName: ROLE_DISPLAY_NAME[role] || "未登录", pairs, l1FilterSchools: [], l1FilterIndex: 0, emptyHint: pairs.length ? "" : "暂无会话" });
          }).catch(() => {
            this.setData({ role, roleName: ROLE_DISPLAY_NAME[role] || "未登录", pairs: [], l1FilterSchools: [], l1FilterIndex: 0, emptyHint: "暂无会话" });
          });
        });
        return;
      }
      this.setData({ role, roleName: ROLE_DISPLAY_NAME[role] || "未登录", pairs: [], l1FilterSchools: [], l1FilterIndex: 0, emptyHint: "请先登录" }); return;
    }
    if (token && (role === "student" || role === "teacher")) {
      matchApi.myPairs(1).then((rows) => {
        if (console && console.log) console.log("[chat-list] myPairs(1) returned:", JSON.stringify(rows));
        const remotePairs = enrichPairs(mapRemotePairs(rows, role));
        this.setData({ role, roleName: ROLE_DISPLAY_NAME[role] || "未登录", pairs: remotePairs, l1FilterSchools: [], l1FilterIndex: 0, emptyHint: remotePairs.length ? "" : "暂无生效中的结对会话" });
        // 异步拉最近一条消息作为预览，限制并发避免大量请求
        this._enrichLastMessages(remotePairs);
      }).catch((err) => {
        if (console && console.warn) console.warn("[chat-list] myPairs(1) failed:", err);
        const pairs = enrichPairs(getPairedListForUser(String(u.phone || ""), role));
        this.setData({ role, roleName: ROLE_DISPLAY_NAME[role] || "未登录", pairs, l1FilterSchools: [], l1FilterIndex: 0, emptyHint: pairs.length ? "" : "请先在「匹配」中结对" });
      });
      return;
    }
    this.setData({ role, roleName: ROLE_DISPLAY_NAME[role] || "未登录", pairs: [], l1FilterSchools: [], l1FilterIndex: 0, emptyHint: role ? "请先在「匹配」中结对" : "请先登录" });
  },
  onL1SchoolFilterChange(e) {
    const idx = Number(e.detail.value) || 0;
    const schools = this.data.l1FilterSchools || [];
    const selected = schools[idx];
    const all = this._allPairs || [];
    let filtered;
    if (!selected || !selected.id) {
      filtered = all;
    } else {
      filtered = all.filter(function (p) { return p.schoolName === selected.name; });
    }
    this.setData({ l1FilterIndex: idx, pairs: filtered });
  },
  /**
   * 学员/志愿者：异步为每个 pair 拉一条最近消息作为预览。
   * 与 notificationCenter._tickChat 对齐，遍历全部 pair 计算未读，避免 Tab 与列表不一致。
   */
  _enrichLastMessages(pairs) {
    const list = (pairs || []);
    if (!list.length) return;
    const self = this;
    const u = (getApp().globalData && getApp().globalData.userInfo) || {};
    const selfId = String(u.backendUserId || u.id || u.userId || "");
    const tasks = list.map(function (p) {
      return chatApi.messages({ matchPairId: Number(p.partnerId), limit: 200 })
        .then(function (res) {
          const records = (Array.isArray(res) ? res : (res && (res.records || res.list)) || []);
          if (!records.length) return null;
          const last = records[0]; // 后端按 id desc 返回，第 0 个就是最新
          const lastTime = last && (last.sendTime || last.sentTime || last.createTime);
          // 统计未读：不是自己发的 + readTime 为空
          let unread = 0;
          records.forEach(function (m) {
            if (!m) return;
            if (String(m.senderId || "") === selfId) return;
            const rt = m.readTime != null ? m.readTime : m.read_time;
            if (rt == null || rt === "") unread++;
          });
          // 乐观清零：本地查看时间 >= 最新消息时间则视为 0
          if (shouldClearUnread(p.partnerId, lastTime)) unread = 0;
          return {
            partnerId: p.partnerId,
            lastPreview: (last && (last.content || last.text)) || "",
            lastTime: fmtTime(lastTime),
            unreadCount: unread
          };
        })
        .catch(function () { return null; });
    });
    Promise.all(tasks).then(function (results) {
      const map = {};
      results.forEach(function (r) { if (r) map[r.partnerId] = r; });
      const next = (self.data.pairs || []).map(function (p) {
        const ext = map[p.partnerId];
        if (!ext) return p;
        return Object.assign({}, p, {
          lastPreview: ext.lastPreview || p.lastPreview,
          lastTime: ext.lastTime || p.lastTime,
          unreadCount: ext.unreadCount != null ? ext.unreadCount : p.unreadCount
        });
      });
      self.setData({ pairs: next });
    });
  },
  onOpenRoom(e) { const { id, name } = e.currentTarget.dataset; if (!id) return; wx.navigateTo({ url: `/pages/chat/room/index?partnerId=${encodeURIComponent(id)}&partnerName=${encodeURIComponent(name || "聊天")}` }); },
  toMatch() { wx.switchTab({ url: "/pages/match/center/index" }); }
});
