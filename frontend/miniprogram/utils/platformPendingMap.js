/**
 * 平台侧待审项展示映射（多页复用）
 */
const { getSchoolName } = require("./schoolsMock");
const { ROLE_DISPLAY_NAME } = require("./roleLabels");

const AUDIT_TYPE_LABEL = {
  student: "学生注册",
  teacher: "志愿者注册",
  admin_level_1: "平台运营",
  admin_level_2: "学校老师"
};

const ROLE_TITLES = {
  student: "乡村学员",
  teacher: "支教志愿者",
  admin_level_1: "平台运营",
  admin_level_2: "学校老师"
};

/**
 * @param {object} a
 */
function mapApplicationRow(a) {
  return {
    ...a,
    roleName: ROLE_DISPLAY_NAME[a.role] || a.role,
    typeLabel: AUDIT_TYPE_LABEL[a.role] || a.role,
    schoolName: a.schoolName || (a.schoolId ? getSchoolName(a.schoolId) : "—")
  };
}

module.exports = {
  mapApplicationRow,
  AUDIT_TYPE_LABEL,
  ROLE_TITLES
};
