/**
 * 按手机号聚合扩展资料（子权限、审核态等），便于 Mock 多账号与后续对接接口。
 * key：userId/phone
 */

const KEY = "zhixing_user_profiles";

function getAll() {
  try {
    return wx.getStorageSync(KEY) || {};
  } catch (e) {
    return {};
  }
}

/**
 * @param {string} phone
 */
function getByPhone(phone) {
  if (!phone) {
    return null;
  }
  return getAll()[String(phone)] || null;
}

/**
 * 写入并若当前登录用户为同一手机则同步 globalData + userInfo 缓存
 * @param {string} phone
 * @param {object} partial
 */
function saveProfile(phone, partial) {
  if (!phone) {
    return null;
  }
  const p = String(phone);
  const all = { ...getAll() };
  all[p] = { ...all[p], ...partial, userId: p, phone: p };
  wx.setStorageSync(KEY, all);
  const app = getApp();
  if (app && app.globalData && app.globalData.userInfo && String(app.globalData.userInfo.phone) === p) {
    app.globalData.userInfo = { ...all[p] };
    wx.setStorageSync("userInfo", app.globalData.userInfo);
  }
  return all[p];
}

/** 从本地档案合并到当前 globalData（启动 / 进页时） */
function mergeFromStorageIntoApp() {
  const app = getApp();
  if (!app || !app.globalData) {
    return;
  }
  const u = app.globalData.userInfo;
  if (!u || !u.phone) {
    return;
  }
  const remote = getByPhone(u.phone);
  if (remote) {
    app.globalData.userInfo = { ...remote, ...u };
    wx.setStorageSync("userInfo", app.globalData.userInfo);
  }
}

/**
 * 列出作为二级且已审过的账号（给一级派权用）
 * @param {{ onlyApproved?: boolean }} [opt]
 */
function listL2Admins(opt) {
  const onlyApproved = !opt || opt.onlyApproved !== false;
  return Object.values(getAll()).filter((u) => {
    if (u.role !== "admin_level_2") {
      return false;
    }
    if (onlyApproved && u.onboardingStatus !== "approved") {
      return false;
    }
    return true;
  });
}

module.exports = {
  getAll,
  getByPhone,
  saveProfile,
  mergeFromStorageIntoApp,
  listL2Admins
};
