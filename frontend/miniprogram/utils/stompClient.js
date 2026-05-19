/**
 * 微信小程序 STOMP over wx.connectSocket 适配层
 * 后端使用 Spring STOMP（/ws 端点 + SockJS），小程序直连 raw WebSocket 路径 /ws/websocket
 *
 * 用法：
 *   const stomp = require('./stompClient');
 *   stomp.connect(token);
 *   stomp.subscribe('/user/queue/chat', (msg) => { ... });
 *   stomp.send('/app/chat.send', { matchPairId: 1, messageType: 'TEXT', content: 'hi' });
 *   stomp.disconnect();
 */

const { getBaseUrl } = require("./env");

let _socket = null;
let _connected = false;
let _subscriptions = {};  // { id: { destination, callback } }
let _subIdCounter = 0;
let _heartbeatTimer = null;
let _reconnectTimer = null;
let _token = "";
let _onConnectCb = null;
let _onDisconnectCb = null;

function _getWsUrl() {
  const base = getBaseUrl();
  // http://localhost:8080/api/v1 → ws://localhost:8080/api/v1/ws/websocket
  const wsBase = base.replace(/^http/, "ws");
  return wsBase + "/ws/websocket";
}

function _generateId() {
  _subIdCounter += 1;
  return "sub-" + _subIdCounter;
}

function _sendFrame(command, headers, body) {
  if (!_socket) return;
  let frame = command + "\n";
  const hdrs = headers || {};
  Object.keys(hdrs).forEach(function (key) {
    frame += key + ":" + hdrs[key] + "\n";
  });
  frame += "\n";
  if (body) {
    frame += body;
  }
  frame += "\0";
  _socket.send({ data: frame, fail: function () {} });
}

function _parseFrame(data) {
  // STOMP frame: COMMAND\nheader:value\n...\n\nbody\0
  const str = typeof data === "string" ? data : "";
  const nullIdx = str.indexOf("\0");
  const raw = nullIdx >= 0 ? str.substring(0, nullIdx) : str;
  const divider = raw.indexOf("\n\n");
  const headerBlock = divider >= 0 ? raw.substring(0, divider) : raw;
  const body = divider >= 0 ? raw.substring(divider + 2) : "";
  const lines = headerBlock.split("\n");
  const command = (lines[0] || "").trim();
  const headers = {};
  for (let i = 1; i < lines.length; i++) {
    const colon = lines[i].indexOf(":");
    if (colon > 0) {
      headers[lines[i].substring(0, colon)] = lines[i].substring(colon + 1);
    }
  }
  return { command, headers, body };
}

function connect(token, onConnect, onDisconnect) {
  if (_connected && _socket) return;
  _token = token || "";
  _onConnectCb = onConnect || null;
  _onDisconnectCb = onDisconnect || null;

  const url = _getWsUrl();
  _socket = wx.connectSocket({
    url: url,
    header: {},
    success: function () {},
    fail: function (err) {
      if (console && console.warn) console.warn("[stomp] connectSocket fail", err);
    }
  });

  _socket.onOpen(function () {
    // Send STOMP CONNECT frame
    _sendFrame("CONNECT", {
      "accept-version": "1.1,1.2",
      "heart-beat": "10000,10000",
      "Authorization": "Bearer " + _token
    });
  });

  _socket.onMessage(function (res) {
    const frame = _parseFrame(res.data);
    if (frame.command === "CONNECTED") {
      _connected = true;
      // Re-subscribe all existing subscriptions (for reconnect)
      Object.keys(_subscriptions).forEach(function (id) {
        const sub = _subscriptions[id];
        _sendFrame("SUBSCRIBE", { id: id, destination: sub.destination });
      });
      // Start heartbeat
      _startHeartbeat();
      if (_onConnectCb) _onConnectCb();
    } else if (frame.command === "MESSAGE") {
      const subId = frame.headers["subscription"];
      const sub = _subscriptions[subId];
      if (sub && sub.callback) {
        try {
          const parsed = JSON.parse(frame.body);
          sub.callback(parsed);
        } catch (e) {
          sub.callback(frame.body);
        }
      }
    } else if (frame.command === "ERROR") {
      if (console && console.error) console.error("[stomp] ERROR frame", frame);
    }
  });

  _socket.onClose(function () {
    _connected = false;
    _stopHeartbeat();
    if (_onDisconnectCb) _onDisconnectCb();
    // Auto reconnect after 5s
    _scheduleReconnect();
  });

  _socket.onError(function (err) {
    if (console && console.warn) console.warn("[stomp] socket error", err);
  });
}

function _startHeartbeat() {
  _stopHeartbeat();
  _heartbeatTimer = setInterval(function () {
    if (_socket && _connected) {
      // STOMP heartbeat = single newline
      _socket.send({ data: "\n", fail: function () {} });
    }
  }, 25000);
}

function _stopHeartbeat() {
  if (_heartbeatTimer) {
    clearInterval(_heartbeatTimer);
    _heartbeatTimer = null;
  }
}

function _scheduleReconnect() {
  if (_reconnectTimer) return;
  _reconnectTimer = setTimeout(function () {
    _reconnectTimer = null;
    if (!_connected && _token) {
      connect(_token, _onConnectCb, _onDisconnectCb);
    }
  }, 5000);
}

function subscribe(destination, callback) {
  const id = _generateId();
  _subscriptions[id] = { destination: destination, callback: callback };
  if (_connected) {
    _sendFrame("SUBSCRIBE", { id: id, destination: destination });
  }
  return id;
}

function unsubscribe(id) {
  if (_subscriptions[id]) {
    if (_connected) {
      _sendFrame("UNSUBSCRIBE", { id: id });
    }
    delete _subscriptions[id];
  }
}

function send(destination, body) {
  if (!_connected) {
    if (console && console.warn) console.warn("[stomp] not connected, cannot send to", destination);
    return false;
  }
  _sendFrame("SEND", {
    destination: destination,
    "content-type": "application/json"
  }, typeof body === "string" ? body : JSON.stringify(body));
  return true;
}

function disconnect() {
  _stopHeartbeat();
  if (_reconnectTimer) {
    clearTimeout(_reconnectTimer);
    _reconnectTimer = null;
  }
  if (_connected && _socket) {
    _sendFrame("DISCONNECT", {});
  }
  _connected = false;
  _subscriptions = {};
  if (_socket) {
    _socket.close({});
    _socket = null;
  }
}

function isConnected() {
  return _connected;
}

module.exports = {
  connect,
  subscribe,
  unsubscribe,
  send,
  disconnect,
  isConnected
};
