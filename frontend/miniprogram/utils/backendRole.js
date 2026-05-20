/**
 * 与后端 User.role 整数对齐
 * 0: 平台一级 (admin_level_1)
 * 1: 学校二级 (admin_level_2)
 * 2: 支教教师 (teacher)
 * 3: 学员 (student)
 * null/undefined: 未选择身份（新注册用户）
 */
function intToAppRole(n) {
  if (n == null) {
    return ""; // 未选择身份
  }
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
  return ""; // 未知值视为未分配
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
