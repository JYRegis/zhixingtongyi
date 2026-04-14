function to(path, params = {}) {
  const query = Object.keys(params)
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join("&");
  const url = query ? `${path}?${query}` : path;
  wx.navigateTo({ url });
}

function switchTab(path) {
  wx.switchTab({ url: path });
}

module.exports = {
  to,
  switchTab
};
