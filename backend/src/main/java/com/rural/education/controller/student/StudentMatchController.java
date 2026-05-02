package com.rural.education.controller.student;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/student/match")
@RequiredArgsConstructor
public class StudentMatchController {
    // 学生匹配相关接口（现阶段由 /match 下接口承载）
}

