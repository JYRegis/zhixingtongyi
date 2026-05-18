ALTER TABLE `school`
ADD COLUMN `type` tinyint NOT NULL DEFAULT 0 COMMENT '学校类型：0-乡村学校（学员），1-高校（志愿者）' AFTER `contact_phone`;

-- 按名称试探性标记已有高校
UPDATE `school` SET `type` = 1 WHERE `name` LIKE '%大学%' OR `name` LIKE '%学院%';
