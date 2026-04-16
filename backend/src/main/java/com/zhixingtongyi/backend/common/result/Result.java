package com.zhixingtongyi.backend.common.result;

import lombok.Data;
import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * 统一返回结果
 */
@Data
public class Result<T> implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 状态码
     */
    private Integer code;

    /**
     * 消息
     */
    private String message;

    /**
     * 数据
     */
    private T data;

    /**
     * 时间戳
     */
    private LocalDateTime timestamp;

    /**
     * 成功（默认消息 无数据）
     */
    public static <T> Result<T> success() {
        return success("操作成功", null);
    }

    /**
     * 成功（自定义消息 无数据）
     */
    public static <T> Result<T> success(String message) {
        return success(message, null);
    }

    /**
     * 成功（默认消息 有数据）
     */
    public static <T> Result<T> success(T data) {
        return success("操作成功", data);
    }

    /**
     * 成功（自定义消息 有数据）
     */
    public static <T> Result<T> success(String message, T data) {
        Result<T> result = new Result<T>();
        result.setCode(200);
        result.setMessage(message);
        result.setData(data);
        result.setTimestamp(LocalDateTime.now());
        return result;
    }

    /**
     * 失败（默认状态码 默认消息）
     */
    public static <T> Result<T> error() {
        return error(500, "操作失败");
    }

    /**
     * 失败（默认状态码 自定义消息）
     */
    public static <T> Result<T> error(String message) {
        return error(500, message);
    }

    /**
     * 失败（自定义状态码 自定义消息）
     */
    public static <T> Result<T> error(Integer code, String message) {
        Result<T> result = new Result<>();
        result.setCode(code);
        result.setMessage(message);
        result.setTimestamp(LocalDateTime.now());
        return result;
    }

}
