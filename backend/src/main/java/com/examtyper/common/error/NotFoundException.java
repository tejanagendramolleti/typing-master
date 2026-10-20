package com.examtyper.common.error;

/** Thrown when a requested resource does not exist. */
public class NotFoundException extends BusinessException {
    public NotFoundException(String message) {
        super(ErrorCode.NOT_FOUND, message);
    }

    public static NotFoundException of(String what, Object id) {
        return new NotFoundException(what + " not found: " + id);
    }
}
