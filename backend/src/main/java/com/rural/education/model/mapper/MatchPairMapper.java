package com.rural.education.model.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.rural.education.model.entity.MatchPair;
import com.rural.education.vo.MatchPairVO;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface MatchPairMapper extends BaseMapper<MatchPair> {
    List<MatchPairVO> selectPendingApplications(@Param("teacherId") Long teacherId);
}
