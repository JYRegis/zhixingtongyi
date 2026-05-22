-- Migration: Move real_name from profile tables to user table
-- Run this on existing databases before deploying the new backend

-- 1. Add real_name column to user table
ALTER TABLE `user` ADD COLUMN `real_name` varchar(64) DEFAULT NULL COMMENT '真实姓名' AFTER `avatar`;

-- 2. Copy real_name from admin_profile to user
UPDATE `user` u
JOIN `admin_profile` ap ON u.id = ap.user_id AND ap.deleted = 0
SET u.real_name = ap.real_name
WHERE u.real_name IS NULL;

-- 3. Copy real_name from teacher_profile to user
UPDATE `user` u
JOIN `teacher_profile` tp ON u.id = tp.user_id AND tp.deleted = 0
SET u.real_name = tp.real_name
WHERE u.real_name IS NULL;

-- 4. Copy real_name from student_profile to user
UPDATE `user` u
JOIN `student_profile` sp ON u.id = sp.user_id AND sp.deleted = 0
SET u.real_name = sp.real_name
WHERE u.real_name IS NULL;

-- 5. Drop real_name from profile tables (run after verifying data migration)
-- ALTER TABLE `admin_profile` DROP COLUMN `real_name`;
-- ALTER TABLE `teacher_profile` DROP COLUMN `real_name`;
-- ALTER TABLE `student_profile` DROP COLUMN `real_name`;
