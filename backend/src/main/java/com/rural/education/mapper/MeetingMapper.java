package com.rural.education.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.rural.education.pojo.po.Meeting;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Map;

public interface MeetingMapper extends BaseMapper<Meeting> {
    Map<String, Object> selectMeetingDetail(@Param("meetingId") Long meetingId);

    List<Map<String, Object>> selectTeacherMeetings(@Param("userId") Long userId);

    List<Map<String, Object>> selectStudentMeetings(@Param("userId") Long userId);
}
