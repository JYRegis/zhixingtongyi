const envMap = {
  dev: "http://localhost:8080/api/v1",
  test: "https://test-api.example.com",
  prod: "https://api.example.com"
};

function getBaseUrl() {
  const app = getApp();
  const customBaseUrl =
    (app && app.globalData && app.globalData.apiBaseUrl) ||
    wx.getStorageSync("zhixing_api_base_url") ||
    "";
  if (customBaseUrl && String(customBaseUrl).trim()) {
    return String(customBaseUrl).trim();
  }
  const env = (app && app.globalData && app.globalData.env) || "dev";
  return envMap[env];
}

function isRealDevice() {
  try {
    const info = wx.getSystemInfoSync();
    const platform = String((info && info.platform) || "").toLowerCase();
    return platform !== "devtools";
  } catch (e) {
    return true;
  }
}

/** 换取新 token 的接口不要带旧 Bearer，否则无效/过期 token 会触发 401 */
const AUTH_TOKEN_SKIP_PATHS = new Set([
  "/auth/wx-login",
  "/auth/mock-login",
  "/auth/phone-login"
]);

function pathWithoutQuery(url) {
  if (!url || typeof url !== "string") return "";
  const q = url.indexOf("?");
  return q === -1 ? url : url.slice(0, q);
}

function shouldOmitAuthHeader(options, token) {
  if (!token) return true;
  if (options.skipAuth === true) return true;
  const method = (options.method || "GET").toUpperCase();
  const path = pathWithoutQuery(options.url || "");
  if (method === "POST" && AUTH_TOKEN_SKIP_PATHS.has(path)) return true;
  if (method === "GET" && (path === "/schools" || path.startsWith("/schools/"))) return true;
  return false;
}

function request(options) {
  const baseUrl = getBaseUrl();
  const app = getApp();
  const token = (app && app.globalData && app.globalData.token) || wx.getStorageSync("token") || "";
  if (
    isRealDevice() &&
    /^(https?:\/\/)?(127\.0\.0\.1|localhost)(:\d+)?/i.test(String(baseUrl))
  ) {
    return Promise.reject(
      new Error("当前接口地址是 localhost/127.0.0.1，真机无法访问，请改为电脑局域网 IP 地址")
    );
  }
  const headers = {
    "content-type": "application/json",
    "X-Client-Version": "phone-login-debug-1",
    ...(options.header || {})
  };
  if (token && !shouldOmitAuthHeader(options, token)) {
    headers.Authorization = `Bearer ${token}`;
  }
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${baseUrl}${options.url}`,
      method: options.method || "GET",
      data: options.data || {},
      timeout: options.timeout || 15000,
      header: headers,
      success: (res) => {
        const body = res.data;
        if (body === "" || body == null) {
          reject(new Error(`接口返回空响应(${res.statusCode})，请检查后端日志`));
          return;
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          const msg = (body && body.message) || "请求失败";
          reject(new Error(msg));
          return;
        }
        if (!body || typeof body !== "object" || !Object.prototype.hasOwnProperty.call(body, "code")) {
          resolve(body);
          return;
        }
        if (body.code === 200) {
          resolve(body.data);
          return;
        }
        reject(new Error(body.message || "请求失败"));
      },
      fail: (err) => {
        if (err && err.errMsg && err.errMsg.indexOf("timeout") >= 0) {
          reject(new Error("请求超时，请检查后端服务和网络"));
          return;
        }
        reject(err);
      }
    });
  });
}

module.exports = {
  request,
  getBaseUrl
};
