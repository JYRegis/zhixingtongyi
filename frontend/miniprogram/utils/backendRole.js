/**
 * 与 zhixingtongyi-zyh 后端 User.role 整数对齐
 * 0: 平台一级  1: 学校二级  2: 支教教师  3: 学员
 */
function intToAppRole(n) {
  if (n === 0) {
    return "admin_level_1";
  }
  if (n === 1) {
    return "admin_level_2";
  }
  if (n === 2) {
    return "teacher";
  }
  if (n === 3) {
    return "student";
  }
  return "student";
}

/** 仅 /auth/role-apply 支持 STUDENT | TEACHER */
function appRoleToRoleApplyTarget(r) {
  if (r === "teacher") {
    return "TEACHER";
  }
  return "STUDENT";
}

module.exports = {
  intToAppRole,
  appRoleToRoleApplyTarget
};
