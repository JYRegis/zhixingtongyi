package com.rural.education.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.rural.education.pojo.po.StudentProfile;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Map;

public interface StudentProfileMapper extends BaseMapper<StudentProfile> {
    List<Map<String, Object>> selectManagedStudents(@Param("adminId") Long adminId);
}
