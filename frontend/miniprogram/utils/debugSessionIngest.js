/**
 * DEBUG 会话 NDJSON 上报（Session 04aca8），仅用于排查后删除。
 */
// #region agent log
var _INGEST =
  "http://127.0.0.1:7901/ingest/b9258bce-365b-4992-b01a-3eae0b628d46";
var _SESSION = "04aca8";

function ingestDebugLog(payload) {
  var line = Object.assign(
    { sessionId: _SESSION, timestamp: Date.now() },
    payload
  );
  try {
    if (typeof wx !== "undefined" && wx.request) {
      wx.request({
        url: _INGEST,
        method: "POST",
        header: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": _SESSION
        },
        data: line
      });
    } else if (typeof fetch === "function") {
      fetch(_INGEST, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": _SESSION
        },
        body: JSON.stringify(line)
      }).catch(function () {});
    } else if (console && console.log) {
      console.log("[ingest-fallback]", line);
    }
  } catch (e) {
    if (console && console.log) {
      console.log("[ingest-fallback]", line, e);
    }
  }
}
// #endregion

module.exports = {
  ingestDebugLog
};
