const envMap = {
  dev: "http://localhost:8080/api/v1",
  test: "http://localhost:8080/api/v1",
  prod: "https://api.example.com/api/v1"
};

function getBaseUrl() {
  const app = getApp();
  const env = (app && app.globalData && app.globalData.env) || "dev";
  return envMap[env];
}

function request(options) {
  const baseUrl = getBaseUrl();
  const app = getApp();
  const token = (app && app.globalData && app.globalData.token) || wx.getStorageSync("token") || "";
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${baseUrl}${options.url}`,
      method: options.method || "GET",
      data: options.data || {},
      header: {
        "content-type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
        ...(options.header || {})
      },
      success: (res) => {
        const body = res.data || {};
        if (res.statusCode >= 200 && res.statusCode < 300 && (body.code == null || body.code === 200)) {
          resolve(body);
          return;
        }
        const msg = (body && (body.message || body.msg)) || "请求失败";
        reject({ message: String(msg), code: body.code, raw: body, statusCode: res.statusCode });
      },
      fail: (err) => {
        const msg = (err && err.errMsg) || "网络异常，请检查本机/模拟器网络与后端是否启动";
        reject({ message: String(msg), network: true, err });
      }
    });
  });
}

module.exports = {
  request
};
