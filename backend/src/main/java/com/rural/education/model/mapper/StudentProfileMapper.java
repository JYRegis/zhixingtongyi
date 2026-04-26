package com.rural.education.model.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.rural.education.model.entity.StudentProfile;
import com.rural.education.vo.StudentVO;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface StudentProfileMapper extends BaseMapper<StudentProfile> {
    List<StudentVO> selectManagedStudents(@Param("adminId") Long adminId);
}
