package com.rural.education.model.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.rural.education.dto.response.admin.RegionDistributionResponse;
import com.rural.education.model.entity.School;

import java.util.List;

public interface SchoolMapper extends BaseMapper<School> {

    List<RegionDistributionResponse> selectRegionDistribution();
}
