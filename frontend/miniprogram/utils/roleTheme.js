/**
 * 四角色 + 未登录 的主题 class（候选 B：温暖成长系）
 * 与 styles/role-theme.wxss 中 .theme-* 一一对应
 */
const THEME_BY_ROLE = {
  "": "theme-guest",
  student: "theme-student",
  teacher: "theme-teacher",
  admin_level_2: "theme-l2",
  admin_level_1: "theme-l1"
};

/**
 * 仅在有登录态（JWT 存在）时才用 role 定主题；无 token 时一律当未选角/未登录，避免
 * 仅有孤儿 `role` 缓存时首页/各页与「学员暖橙 / 访客奶杏」串色。
 * @returns {string} 业务 role 或 ""
 */
function getEffectiveRoleForTheme() {
  let token = "";
  let role = "";
  try {
    const app = typeof getApp === "function" ? getApp() : null;
    token = (app && app.globalData && app.globalData.token) || "";
    role = (app && app.globalData && app.globalData.role) || "";
    if (typeof wx !== "undefined" && wx.getStorageSync) {
      if (!token) {
        token = wx.getStorageSync("token") || "";
      }
      if (!role) {
        role = wx.getStorageSync("role") || "";
      }
    }
  } catch (e) {
    // ignore
  }
  if (!token) {
    return "";
  }
  return role || "";
}

/**
 * @param {string} [role]
 * @returns {string} theme-guest | theme-student | ...
 */
function getRoleThemeClass(role) {
  const r = role != null && role !== "" ? String(role) : "";
  return THEME_BY_ROLE[r] || THEME_BY_ROLE[""] || "theme-guest";
}

/**
 * 页面/底栏用：与登录态绑定的主题 class
 * @returns {string}
 */
function getPageRoleThemeClass() {
  return getRoleThemeClass(getEffectiveRoleForTheme());
}

/**
 * 底栏选中色（与 role-theme 中 tab 高亮人工对齐）
 * @param {string} [role]
 * @returns {string} hex
 */
function getTabActiveColorHex() {
  const t = getPageRoleThemeClass();
  const map = {
    "theme-guest": "#ff8c00",
    "theme-student": "#f57c00",
    "theme-teacher": "#ff8c00",
    "theme-l2": "#ff8c00",
    "theme-l1": "#ff8c00"
  };
  return map[t] || map["theme-guest"];
}

module.exports = {
  getRoleThemeClass,
  getEffectiveRoleForTheme,
  getPageRoleThemeClass,
  getTabActiveColorHex,
  THEME_BY_ROLE
};
