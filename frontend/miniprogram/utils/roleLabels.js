/**
 * 角色文案：对内仍用英文 value，对外的说法尽量口语化，不出现「一级/二级管理员」等术语。
 */

const ROLE = {
  STUDENT: "student",
  TEACHER: "teacher",
  ADMIN_SCHOOL: "admin_level_2",
  ADMIN_PLATFORM: "admin_level_1"
};

/** 各页顶部的简短身份名称 */
const ROLE_DISPLAY_NAME = {
  student: "乡村学员",
  teacher: "支教志愿者",
  admin_level_2: "学校老师",
  admin_level_1: "平台运营"
};

/** 首页身份卡片：主标题用「我是 xxx」句式 */
const ROLE_HOME_CARDS = [
  { value: ROLE.STUDENT, iam: "我是乡村学员", hint: "进入学习陪伴、匹配与课堂", accent: "#1677ff", icon: "学" }, // 与 theme-student 一致
  { value: ROLE.TEACHER, iam: "我是支教志愿者", hint: "管理结对申请、沟通和志愿时长", accent: "#1677ff", icon: "教" }, // 与 theme-teacher 一致
  { value: ROLE.ADMIN_SCHOOL, iam: "我是学校老师", hint: "审核本校学生/志愿者与服务记录", accent: "#1677ff", icon: "校" }, // 与 theme-l2 一致
  { value: ROLE.ADMIN_PLATFORM, iam: "我是平台运营", hint: "查看平台审核、数据与风险预警", accent: "#1677ff", icon: "管" } // 与 theme-l1 一致
];

module.exports = {
  ROLE,
  ROLE_DISPLAY_NAME,
  ROLE_HOME_CARDS
};
