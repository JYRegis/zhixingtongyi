/**
 * 与 app.json 中「自定义 tabBar」同步当前选中项（见 miniprogram/custom-tab-bar）
 */
function syncCustomTabBar() {
  const pages = getCurrentPages();
  if (!pages.length) {
    return;
  }
  const page = pages[pages.length - 1];
  if (page && typeof page.getTabBar === "function") {
    const inst = page.getTabBar();
    if (inst && typeof inst.sync === "function") {
      inst.sync();
    }
  }
}

module.exports = { syncCustomTabBar };
