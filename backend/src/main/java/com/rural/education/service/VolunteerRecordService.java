package com.rural.education.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.rural.education.dto.request.record.AdminAuditRecordRequest;
import com.rural.education.dto.request.record.StudentConfirmRequest;
import com.rural.education.dto.request.record.SubmitRecordRequest;
import com.rural.education.model.entity.VolunteerRecord;
import com.rural.education.vo.VolunteerRecordVO;

public interface VolunteerRecordService extends IService<VolunteerRecord> {

    void submitRecord(Long userId, SubmitRecordRequest request);

    void studentConfirm(Long userId, Long recordId, StudentConfirmRequest request);

    Page<VolunteerRecordVO> getPendingRecords(Long userId, Long page, Long size);

    void auditRecord(Long userId, Long recordId, AdminAuditRecordRequest request);

    Page<VolunteerRecordVO> queryRecords(Long userId, Long teacherId, Long studentId, Integer status, Long page, Long size);
}
