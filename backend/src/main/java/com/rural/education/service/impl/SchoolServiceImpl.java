package com.rural.education.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.rural.education.exception.BusinessException;
import com.rural.education.model.entity.School;
import com.rural.education.model.mapper.SchoolMapper;
import com.rural.education.service.SchoolService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SchoolServiceImpl extends ServiceImpl<SchoolMapper, School> implements SchoolService {

    @Override
    public List<School> listSchools(String regionCode, String keyword, Integer type) {
        LambdaQueryWrapper<School> wrapper = new LambdaQueryWrapper<>();
        if (regionCode != null && !regionCode.isBlank()) {
            wrapper.eq(School::getRegionCode, regionCode);
        }
        if (keyword != null && !keyword.isBlank()) {
            wrapper.like(School::getName, keyword);
        }
        if (type != null) {
            wrapper.eq(School::getType, type);
        }
        wrapper.orderByAsc(School::getId);
        return list(wrapper);
    }

    @Override
    public School getSchool(Long schoolId) {
        School school = getById(schoolId);
        if (school == null) {
            throw new BusinessException("学校不存在");
        }
        return school;
    }
}
