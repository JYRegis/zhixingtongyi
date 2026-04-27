package com.rural.education.model.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.rural.education.model.entity.VolunteerRecord;
import com.rural.education.vo.VolunteerRecordVO;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface VolunteerRecordMapper extends BaseMapper<VolunteerRecord> {

    List<VolunteerRecordVO> selectRecords(@Param("teacherId") Long teacherId,
                                          @Param("studentId") Long studentId,
                                          @Param("status") Integer status,
                                          @Param("schoolId") Long schoolId);

    List<VolunteerRecordVO> selectPendingBySchool(@Param("schoolId") Long schoolId);
}
