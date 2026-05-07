package com.rural.education.exception;

import com.rural.education.dto.common.ApiResponse;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.stream.Collectors;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    public ApiResponse<Void> handleBusiness(BusinessException ex) {
        return ApiResponse.error(400, ex.getMessage());
    }

    @ExceptionHandler(AuthException.class)
    public ApiResponse<Void> handleAuth(AuthException ex) {
        return ApiResponse.error(401, ex.getMessage());
    }

    @ExceptionHandler(PermissionException.class)
    public ApiResponse<Void> handlePermission(PermissionException ex) {
        return ApiResponse.error(403, ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ApiResponse<Void> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(fieldError -> fieldError.getField() + ": " + fieldError.getDefaultMessage())
                .collect(Collectors.joining("; "));
        return ApiResponse.error(400, message.isBlank() ? "参数校验失败" : message);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ApiResponse<Void> handleConstraintViolation(ConstraintViolationException ex) {
        String message = ex.getConstraintViolations().stream()
                .map(v -> v.getPropertyPath() + ": " + v.getMessage())
                .collect(Collectors.joining("; "));
        return ApiResponse.error(400, message.isBlank() ? "参数校验失败" : message);
    }

    @ExceptionHandler(Exception.class)
    public ApiResponse<Void> handleAny(Exception ex) {
        log.error("未处理异常", ex);
        return ApiResponse.error(500, "系统异常，请稍后重试");
    }
}
