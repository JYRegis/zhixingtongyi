package com.rural.education.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.rural.education.model.entity.School;

import java.util.List;

public interface SchoolService extends IService<School> {
    List<School> listSchools(String regionCode, String keyword, Integer type);

    School getSchool(Long schoolId);
}
