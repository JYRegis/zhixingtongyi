package com.rural.education.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.rural.education.pojo.po.MatchPair;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Map;

public interface MatchPairMapper extends BaseMapper<MatchPair> {
    List<Map<String, Object>> selectPendingApplications(@Param("teacherId") Long teacherId);
}
