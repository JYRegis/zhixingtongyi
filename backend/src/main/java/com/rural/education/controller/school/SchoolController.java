package com.rural.education.controller.school;

import com.rural.education.dto.common.ApiResponse;
import com.rural.education.model.entity.School;
import com.rural.education.service.SchoolService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/schools")
@RequiredArgsConstructor
public class SchoolController {
    private final SchoolService schoolService;

    @GetMapping
    public ApiResponse<List<School>> list(@RequestParam(required = false) String regionCode,
                                          @RequestParam(required = false) String keyword,
                                          @RequestParam(required = false) Integer type) {
        return ApiResponse.success(schoolService.listSchools(regionCode, keyword, type));
    }

    @GetMapping("/{schoolId}")
    public ApiResponse<School> detail(@PathVariable Long schoolId) {
        return ApiResponse.success(schoolService.getSchool(schoolId));
    }
}
