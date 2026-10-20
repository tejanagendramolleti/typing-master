package com.examtyper.common.error;

/**
 * The candidate has used their daily allowance.
 *
 * <p>The status is 429 rather than 403, because the request itself was
 * fine — the candidate has simply reached the limit of what the free tier
 * allows, and the answer is to come back tomorrow or to upgrade.
 */
public class QuotaExceededException extends BusinessException {

    public QuotaExceededException(String message) {
        super(ErrorCode.QUOTA_EXCEEDED, message);
    }
}
