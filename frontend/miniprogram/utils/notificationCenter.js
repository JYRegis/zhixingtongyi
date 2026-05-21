/**
 * 全局通知中心：
 * - 周期性轮询未读数量，缓存在 globalData.unreadCount。
 * - 检测到 unreadCount 上升或 maxId 增大时，向所有订阅者派发 onIncoming 事件。
 * - 订阅者：自定义 tabBar（红点）、横幅组件（弹窗）等。
 *
 * 仅依赖前端，无需后端改动。后端接口：
 *   GET /notifications?unreadOnly=1&page=1&size=1     拿 total
 *   GET /notifications?unreadOnly=1&page=1&size=10    拿最近的 records 用于横幅展示
 */
const { notificationApi } = require("./api");
const { chatApi, adminApi, matchApi } = require("./api");
const { shouldClearUnread } = require("./chatReadStore");

const POLL_INTERVAL_MS = 60 * 1000;        // 60 秒一次（前台），降低真机请求压力
const PEEK_RECENT_SIZE = 5;                 // 检测新增时取最近几条

let _timer = null;
let _running = false;
let _lastTotal = 0;
let _lastMaxId = 0;
let _chatUnread = 0;
const _listeners = new Set();
let _suppressFirstBanner = true;            // 启动后第一次拉取不视为「新消息」

function _now() { return Date.now(); }

function _emit(eventName, payload) {
  _listeners.forEach((fn) => {
    try { fn({ type: eventName, payload }); } catch (_) {}
  });
}

function getUnreadCount() {
  const app = getApp && getApp();
  return (app && app.globalData && app.globalData.unreadCount) || 0;
}
function setUnreadCount(n) {
  const app = getApp && getApp();
  if (app && app.globalData) {
    app.globalData.unreadCount = n;
  }
}

/**
 * 订阅事件：
 *   { type: "unread-change", payload: { count } }
 *   { type: "incoming", payload: { count, deltaCount, latest } }
 * 返回取消订阅函数。
 */
function subscribe(fn) {
  if (typeof fn !== "function") return function () {};
  _listeners.add(fn);
  // 立即把当前未读数告诉新订阅者，避免组件刚 attach 时角标没立刻刷新
  try { fn({ type: "unread-change", payload: { count: getUnreadCount() } }); } catch (_) {}
  try { fn({ type: "chat-unread-change", payload: { count: _chatUnread } }); } catch (_) {}
  return function () { _listeners.delete(fn); };
}

function _hasToken() {
  const app = getApp && getApp();
  if (!app) return false;
  const t = (app.globalData && app.globalData.token) || "";
  if (t) return true;
  try { return !!wx.getStorageSync("token"); } catch (_) { return false; }
}

function _tick() {
  if (!_hasToken()) return;
  _tickNotifications();
  _tickChat();
}

function _tickChat() {
  const app = getApp && getApp();
  const role = (app && app.globalData && app.globalData.role) || "";
  const isAdmin = role === "admin_level_1" || role === "admin_level_2";
  const req = isAdmin ? adminApi.chatConversations() : matchApi.myPairs(1);
  req.then(function (res) {
    if (isAdmin) {
      // 与聊天列表算法一致：后端 unreadCount 经过 shouldClearUnread 乐观清零
      const list = Array.isArray(res) ? res : (res && (res.records || res.list)) || [];
      var total = 0;
      list.forEach(function (c) {
        if (!c) return;
        const pid = c.matchPairId || c.pairId || c.id;
        const raw = Number(c.unreadCount || 0);
        const unread = shouldClearUnread(pid, c.lastMessageTime) ? 0 : raw;
        total += unread;
      });
      _chatUnread = total;
      _emit("chat-unread-change", { count: total });
      return;
    }
    // 学员 / 志愿者：对所有活跃结对，分别拉近 50 条消息估算未读，
    // 同时套用 shouldClearUnread 让进入聊天室后立即清零（与列表算法对齐）。
    // 注：聊天列表页 _enrichLastMessages 会用更大窗口(200条)精确重算并主动调用 setChatUnread 覆盖。
    const pairs = Array.isArray(res) ? res : (res && (res.records || res.list)) || [];
    if (!pairs.length) {
      _chatUnread = 0;
      _emit("chat-unread-change", { count: 0 });
      return;
    }
    const selfId = String((app.globalData.userInfo || {}).backendUserId || (app.globalData.userInfo || {}).id || "");
    const checks = pairs.map(function (p) {
      const pairId = p && (p.id != null ? p.id : p.pairId);
      if (!pairId) return Promise.resolve(0);
      return chatApi.messages({ matchPairId: Number(pairId), limit: 20 }).then(function (msgs) {
        const arr = Array.isArray(msgs) ? msgs : (msgs && (msgs.records || msgs.list)) || [];
        if (!arr.length) return 0;
        // 拿最新一条消息时间用于 shouldClearUnread 判断
        const last = arr[0]; // 后端按 id desc 返回
        const lastTime = last && (last.sendTime || last.sentTime || last.createTime);
        if (shouldClearUnread(pairId, lastTime)) return 0;
        var count = 0;
        arr.forEach(function (m) {
          if (!m) return;
          if (String(m.senderId || "") === selfId) return;
          const rt = m.readTime != null ? m.readTime : m.read_time;
          if (rt == null || rt === "") count++;
        });
        return count;
      }).catch(function () { return 0; });
    });
    Promise.all(checks).then(function (counts) {
      var sum = 0;
      counts.forEach(function (c) { sum += c; });
      _chatUnread = sum;
      _emit("chat-unread-change", { count: sum });
    });
  }).catch(function () {});
}

function _tickNotifications() {
  // 1) 先拿 total
  notificationApi.list({ unreadOnly: 1, page: 1, size: 1 })
    .then(function (res) {
      const total = (res && res.total != null ? Number(res.total) : 0) || 0;
      const prev = _lastTotal;
      _lastTotal = total;
      setUnreadCount(total);
      _emit("unread-change", { count: total });

      // 2) 如果未读上升，再拿一次详情用于横幅
      if (total > prev && !_suppressFirstBanner) {
        notificationApi.list({ unreadOnly: 1, page: 1, size: PEEK_RECENT_SIZE })
          .then(function (res2) {
            const records = (res2 && (res2.records || res2.list)) || [];
            const maxId = records.reduce(function (acc, r) {
              const id = Number(r && r.id) || 0;
              return id > acc ? id : acc;
            }, 0);
            // 按 id 严格判断新增，避免页面切换/标记后刷新误触发
            const fresh = records.filter(function (r) {
              return Number(r && r.id) > _lastMaxId;
            });
            if (maxId > _lastMaxId) _lastMaxId = maxId;
            if (fresh.length > 0) {
              _emit("incoming", {
                count: total,
                deltaCount: fresh.length,
                latest: fresh[0]
              });
            }
          })
          .catch(function () {});
      } else if (_suppressFirstBanner) {
        // 启动首拉：校准 maxId；如果有未读通知，弹一次横幅提醒用户
        notificationApi.list({ unreadOnly: 1, page: 1, size: PEEK_RECENT_SIZE })
          .then(function (res2) {
            const records = (res2 && (res2.records || res2.list)) || [];
            const maxId = records.reduce(function (acc, r) {
              const id = Number(r && r.id) || 0;
              return id > acc ? id : acc;
            }, 0);
            _lastMaxId = maxId;
            _suppressFirstBanner = false;
            // 如果登录时就有未读通知，延迟弹一次横幅（等 tabBar 组件 attach 完成）
            if (records.length > 0 && total > 0) {
              setTimeout(function () {
                _emit("incoming", {
                  count: total,
                  deltaCount: records.length,
                  latest: records[0]
                });
              }, 2500);
            }
          })
          .catch(function () { _suppressFirstBanner = false; });
      }
    })
    .catch(function () {});
}

function start() {
  if (_running) return;
  _running = true;
  _suppressFirstBanner = true;
  _lastTotal = 0;
  _lastMaxId = 0;
  _tick();
  _timer = setInterval(_tick, POLL_INTERVAL_MS);
}

function stop() {
  _running = false;
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
  }
}

function refreshNow() { _tick(); }

/**
 * 用户在「通知页」点击已读/批量已读后调用，立即同步未读数。
 */
function decrement(n) {
  const next = Math.max(0, getUnreadCount() - (n || 1));
  _lastTotal = next;
  setUnreadCount(next);
  _emit("unread-change", { count: next });
}

function reset() {
  _lastTotal = 0;
  _lastMaxId = 0;
  _chatUnread = 0;
  setUnreadCount(0);
  _emit("unread-change", { count: 0 });
  _emit("chat-unread-change", { count: 0 });}

/**
 * 主动拉一次未读列表，如果有未读直接派发 incoming 事件（无视 _suppressFirstBanner）。
 * tabBar 组件 attached 时调用，避免错过登录时的初次弹窗。
 */
function peekAndNotify() {
  if (!_hasToken()) return;
  notificationApi.list({ unreadOnly: 1, page: 1, size: PEEK_RECENT_SIZE })
    .then(function (res) {
      const records = (res && (res.records || res.list)) || [];
      const total = (res && res.total != null ? Number(res.total) : records.length) || 0;
      if (records.length > 0 && total > 0) {
        _emit("incoming", {
          count: total,
          deltaCount: records.length,
          latest: records[0]
        });
      }
    })
    .catch(function () {});
}

module.exports = {
  start: start,
  stop: stop,
  refreshNow: refreshNow,
  subscribe: subscribe,
  getUnreadCount: getUnreadCount,
  decrement: decrement,
  reset: reset,
  peekAndNotify: peekAndNotify,
  refreshChatUnread: function () { _tickChat(); },
  /** 直接设置聊天未读数（页面已计算过时调用，避免重复请求） */
  setChatUnread: function (n) {
    var v = Math.max(0, Number(n) || 0);
    _chatUnread = v;
    _emit("chat-unread-change", { count: v });
  }
};
