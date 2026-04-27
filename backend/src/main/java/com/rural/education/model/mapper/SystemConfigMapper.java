package com.rural.education.model.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.rural.education.model.entity.SystemConfig;
import org.apache.ibatis.annotations.Param;

public interface SystemConfigMapper extends BaseMapper<SystemConfig> {

    SystemConfig selectByKey(@Param("configKey") String configKey);
}
