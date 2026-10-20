package com.examtyper.common.error;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Consistent error envelope returned by the global exception handler.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiError(
        String code,
        String message,
        Instant timestamp,
        String path,
        String requestId,
        Map<String, String> fieldErrors,
        List<String> details
) {
    public static ApiError of(String code, String message, String path, String requestId) {
        return new ApiError(code, message, Instant.now(), path, requestId, null, null);
    }
}
