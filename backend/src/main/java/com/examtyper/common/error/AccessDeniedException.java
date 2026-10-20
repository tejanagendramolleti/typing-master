package com.examtyper.common.error;

/** Thrown when the caller is authenticated but not permitted to perform the action. */
public class AccessDeniedException extends BusinessException {
    public AccessDeniedException(String message) {
        super(ErrorCode.ACCESS_DENIED, message);
    }
}
