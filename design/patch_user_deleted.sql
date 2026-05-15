-- ---------------------------------------------------------------------------
-- 一次性补丁：为「在 init.sql 增加 user.deleted 之前」已创建的旧库补列。
-- 当前 design/init.sql 新建库已包含 deleted，无需执行本文件。
--
-- 若列已存在，执行会报 Duplicate column，可忽略。
--
-- 示例（库名、密码按本机 .env / docker-compose 调整）：
--   docker exec -i rep-mysql mysql -uroot -proot aid_education_platform < design/patch_user_deleted.sql
-- PowerShell：
--   Get-Content design\patch_user_deleted.sql | docker exec -i rep-mysql mysql -uroot -proot aid_education_platform
-- ---------------------------------------------------------------------------

USE `aid_education_platform`;

ALTER TABLE `user`
  ADD COLUMN `deleted` tinyint NOT NULL DEFAULT 0 COMMENT '逻辑删除：0-未删除，1-已删除' AFTER `status`;
