package com.examtyper.common.error;

/** Thrown when an operation conflicts with existing state (e.g. duplicate email). */
public class ConflictException extends BusinessException {
    public ConflictException(String message) {
        super(ErrorCode.CONFLICT, message);
    }
}
