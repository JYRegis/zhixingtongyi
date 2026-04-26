package com.rural.education.model.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.rural.education.model.entity.Meeting;
import com.rural.education.vo.MeetingVO;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface MeetingMapper extends BaseMapper<Meeting> {
    MeetingVO selectMeetingDetail(@Param("meetingId") Long meetingId);

    List<MeetingVO> selectTeacherMeetings(@Param("userId") Long userId);

    List<MeetingVO> selectStudentMeetings(@Param("userId") Long userId);
}
