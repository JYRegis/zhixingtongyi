-- ============================================================================
--  清理所有业务数据（保留表结构）
--  数据库: aid_education_platform
--  说明: 按外键依赖顺序删除，删除后可重新执行 seed_local_debug.sql 恢复种子数据
-- ============================================================================

USE `aid_education_platform`;
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM `chat_message`;
DELETE FROM `chat_participant`;
DELETE FROM `meeting`;
DELETE FROM `message_notification`;
DELETE FROM `volunteer_record`;
DELETE FROM `match_pair`;
DELETE FROM `student_profile`;
DELETE FROM `teacher_profile`;
DELETE FROM `admin_profile`;
DELETE FROM `user`;
DELETE FROM `school`;
DELETE FROM `algorithm_weight_config`;

SET FOREIGN_KEY_CHECKS = 1;

SELECT '所有业务数据已清理完毕' AS result;
