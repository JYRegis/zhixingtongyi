/**
 * 聊天「最近查看」时间戳本地缓存。
 *
 * 用途：进入聊天室时记录 pair 的查看时间，用于在聊天列表中乐观清零未读红圈，
 * 避免等下次后端 conversations 接口回包导致界面延迟。
 *
 * 后端的真实未读由 GET /admin/chat/conversations 维护，下次刷新拉到 unreadCount 后会覆盖本地。
 */
const KEY = "chat_pair_seen_at";

function readMap() {
  try {
    var v = wx.getStorageSync(KEY);
    return v && typeof v === "object" ? v : {};
  } catch (_) {
    return {};
  }
}
function writeMap(m) {
  try { wx.setStorageSync(KEY, m); } catch (_) {}
}

function markPairSeen(pairId) {
  if (!pairId && pairId !== 0) return;
  var m = readMap();
  m[String(pairId)] = Date.now();
  writeMap(m);
}

function getPairSeenAt(pairId) {
  if (!pairId && pairId !== 0) return 0;
  var m = readMap();
  return Number(m[String(pairId)] || 0);
}

/**
 * 列表中某个 pair 的 unreadCount 是否应该被前端乐观清零：
 * 当且仅当该 pair 的最后消息时间 <= 本地查看时间。
 */
function shouldClearUnread(pairId, lastMessageTime) {
  var seen = getPairSeenAt(pairId);
  if (!seen) return false;
  if (!lastMessageTime) return true;
  var last = typeof lastMessageTime === "number"
    ? lastMessageTime
    : Date.parse(String(lastMessageTime).replace(" ", "T"));
  if (isNaN(last)) return true;
  return last <= seen;
}

module.exports = {
  markPairSeen: markPairSeen,
  getPairSeenAt: getPairSeenAt,
  shouldClearUnread: shouldClearUnread
};
