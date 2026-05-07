package com.rural.education.model.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.rural.education.model.entity.TeacherProfile;
import com.rural.education.vo.TeacherVO;

import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface TeacherProfileMapper extends BaseMapper<TeacherProfile> {
    List<TeacherVO> selectRecommendations();

    int accumulateDuration(@Param("userId") Long userId, @Param("duration") Integer duration);
}
