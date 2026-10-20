package com.examtyper.common.web;

/**
 * Simple success envelope for endpoints that do not return a collection.
 */
public record ApiResponse<T>(T data) {
    public static <T> ApiResponse<T> of(T data) {
        return new ApiResponse<>(data);
    }
}
