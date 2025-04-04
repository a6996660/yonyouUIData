package com.yonyou.dbtreeview.dto;

/**
 * API统一响应对象
 */
public class ApiResponse<T> {
    
    private String code;
    private String message;
    private T data;
    
    private ApiResponse(String code, String message, T data) {
        this.code = code;
        this.message = message;
        this.data = data;
    }
    
    /**
     * 成功响应
     *
     * @param data 响应数据
     * @return API响应对象
     */
    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>("0000", "成功", data);
    }
    
    /**
     * 成功响应（无数据）
     *
     * @return API响应对象
     */
    public static <T> ApiResponse<T> success() {
        return success(null);
    }
    
    /**
     * 错误响应
     *
     * @param message 错误信息
     * @return API响应对象
     */
    public static <T> ApiResponse<T> error(String message) {
        return new ApiResponse<>("9999", message, null);
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public T getData() {
        return data;
    }

    public void setData(T data) {
        this.data = data;
    }
} 