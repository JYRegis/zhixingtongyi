/**
 * 学校老师（二级管理员）代管学员数据与当前代操作学员本地缓存。
 * 正式环境由接口拉取所辖学员列表；本处默认不预置假数据，通过审后的列表应为空，直至接口/种子写入。
 */

const STORAGE_KEY = "zhixing_acting_student";

const PROXY_STUDENTS = [];

function getActingStudent() {
  try {
    const v = wx.getStorageSync(STORAGE_KEY);
    if (v && v.id && v.name) {
      return v;
    }
  } catch (e) {
    // ignore
  }
  return null;
}

/** @param {{ id: string, name: string, grade: string }} st */
function setActingStudent(st) {
  wx.setStorageSync(STORAGE_KEY, {
    id: st.id,
    name: st.name,
    grade: st.grade || ""
  });
}

function clearActingStudent() {
  wx.removeStorageSync(STORAGE_KEY);
}

module.exports = {
  PROXY_STUDENTS,
  getActingStudent,
  setActingStudent,
  clearActingStudent
};
