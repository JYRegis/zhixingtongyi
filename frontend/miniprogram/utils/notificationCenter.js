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

const POLL_INTERVAL_MS = 30 * 1000;        // 30 秒一次（前台）
const PEEK_RECENT_SIZE = 5;                 // 检测新增时取最近几条

let _timer = null;
let _running = false;
let _lastTotal = 0;
let _lastMaxId = 0;
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
        // 启动首拉：把 maxId 校准为当前最大未读 id，避免冷启动把历史未读弹一遍
        notificationApi.list({ unreadOnly: 1, page: 1, size: PEEK_RECENT_SIZE })
          .then(function (res2) {
            const records = (res2 && (res2.records || res2.list)) || [];
            const maxId = records.reduce(function (acc, r) {
              const id = Number(r && r.id) || 0;
              return id > acc ? id : acc;
            }, 0);
            _lastMaxId = maxId;
            _suppressFirstBanner = false;
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
  setUnreadCount(0);
  _emit("unread-change", { count: 0 });
}

module.exports = {
  start: start,
  stop: stop,
  refreshNow: refreshNow,
  subscribe: subscribe,
  getUnreadCount: getUnreadCount,
  decrement: decrement,
  reset: reset
};
