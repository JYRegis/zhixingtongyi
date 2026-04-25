package com.rural.education.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.rural.education.pojo.po.TeacherProfile;

import java.util.List;
import java.util.Map;

public interface TeacherProfileMapper extends BaseMapper<TeacherProfile> {
    List<Map<String, Object>> selectRecommendations();
}
