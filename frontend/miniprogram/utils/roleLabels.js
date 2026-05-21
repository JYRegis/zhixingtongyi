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
  { value: ROLE.STUDENT, iam: "我是乡村学员", hint: "进入学习陪伴、匹配与课堂", accent: "#1677ff", iconSrc: "/images/icons/graduation.svg" },
  { value: ROLE.TEACHER, iam: "我是支教志愿者", hint: "管理结对申请、沟通和志愿时长", accent: "#1677ff", iconSrc: "/images/icons/award.svg" },
  { value: ROLE.ADMIN_SCHOOL, iam: "我是学校老师", hint: "等待平台分配管理权限", accent: "#1677ff", iconSrc: "/images/icons/school.svg" }
];

module.exports = {
  ROLE,
  ROLE_DISPLAY_NAME,
  ROLE_HOME_CARDS
};
