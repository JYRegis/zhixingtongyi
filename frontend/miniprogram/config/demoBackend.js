/**
 * 与本地 Docker MySQL 种子数据对齐（仅前端配置，不改编后端代码）。
 * 请确保以下 id 在库中真实存在，否则 /student/profile 等会外键/校验失败。
 *
 * 建议在首次执行 init.sql 后，手工在 `school` 表插入 1..N 条与 SCHOOLS 同序，
 * 并在 `user` 表有 role=1 的二级管理员，将 DEMO_L2_USER_ID 设为其主键 id。
 */
module.exports = {
  /** 学员资料必填：绑定二级管理员 user.id（长整型，与表 user 主键一致；与 seed_test_data 中 L2 一致时为 2） */
  DEMO_L2_USER_ID: 2,
  /**
   * 有 JWT 时是否走远程入驻（学员/教师）；false 时始终用原本地 onboardingStore
   */
  USE_BACKEND_ONBOARDING: true,
  /**
   * 有 JWT 时是否对「学员」走远程匹配：推荐/申请/教师端结对待办；失败时回退当前页 mock/种子数据。
   * 注意：GET /match/recommendations 仅对学员（role=3）开放，支教志愿者在匹配中心仍为本地演示推荐列表。
   */
  USE_BACKEND_MATCH: true,
  /**
   * 有 JWT 时：会议列表 GET /meetings/my，建会 POST /meetings（结对口来自 GET /match/my-pairs?status=1）
   */
  USE_BACKEND_MEETING: true,
  /**
   * 有 JWT 时：解绑走 match 解绑 API（Long 结对 id）；失败回退本机 pairingStore
   */
  USE_BACKEND_UNBIND: true,
  /**
   * 有 JWT 时：通知列表 GET /notifications 与已读
   */
  USE_BACKEND_NOTIFICATION: true,
  /**
   * 有 JWT 且身份为支教志愿者时：在资料页拉取/更新 PUT /teacher/continuous-match（持续匹配开关）
   */
  USE_BACKEND_TEACHER_CONTINUOUS_MATCH: true
};
