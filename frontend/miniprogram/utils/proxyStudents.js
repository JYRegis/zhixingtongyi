/**
 * 学校老师（二级管理员）代管学员：演示数据与「当前代哪位学员操作」本地缓存。
 * 正式环境改为接口：所辖学员列表 + 当前 actingStudentId。
 */

const STORAGE_KEY = "zhixing_acting_student";

const PROXY_STUDENTS = [
  { id: "S001", name: "小林", grade: "初三", binding: "已绑定", progress: "结对中" },
  { id: "S002", name: "小周", grade: "初二", binding: "待绑定", progress: "待匹配" },
  { id: "S003", name: "小王", grade: "高一", binding: "已绑定", progress: "待确认" }
];

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
