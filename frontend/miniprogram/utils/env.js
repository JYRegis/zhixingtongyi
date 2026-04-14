const envMap = {
  dev: "https://dev-api.example.com",
  test: "https://test-api.example.com",
  prod: "https://api.example.com"
};

function getBaseUrl() {
  const app = getApp();
  const env = (app && app.globalData && app.globalData.env) || "dev";
  return envMap[env];
}

function request(options) {
  const baseUrl = getBaseUrl();
  const token = getApp().globalData.token || "";
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
      success: (res) => resolve(res.data),
      fail: reject
    });
  });
}

module.exports = {
  request
};
