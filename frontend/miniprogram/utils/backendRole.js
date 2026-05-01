/**
 * 与 zhixingtongyi-zyh 后端 User.role 整数对齐
 * 0: 平台一级  1: 学校二级  2: 支教教师  3: 学员
 */
function intToAppRole(n) {
  const code = Number(n);
  if (code === 0) {
    return "admin_level_1";
  }
  if (code === 1) {
    return "admin_level_2";
  }
  if (code === 2) {
    return "teacher";
  }
  if (code === 3) {
    return "student";
  }
  return "student";
}

/** 仅 /auth/role-apply 支持 STUDENT | TEACHER */
function appRoleToRoleApplyTarget(r) {
  if (r === "teacher") {
    return "TEACHER";
  }
  if (r === "student") {
    return "STUDENT";
  }
  return "";
}

function isAdminRole(r) {
  return r === "admin_level_1" || r === "admin_level_2";
}

function isLearnerRole(r) {
  return r === "student" || r === "teacher";
}

function roleApplyTargetToAppRole(target) {
  const t = String(target || "").toUpperCase();
  if (t === "TEACHER") {
    return "teacher";
  }
  if (t === "STUDENT") {
    return "student";
  }
  return "";
}

module.exports = {
  intToAppRole,
  appRoleToRoleApplyTarget,
  isAdminRole,
  isLearnerRole,
  roleApplyTargetToAppRole
};
