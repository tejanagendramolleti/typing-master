package com.examtyper.reporting.dto;

import com.examtyper.reporting.Certificate;

import java.time.Instant;

/**
 * The public view of a certificate.
 */
public record CertificateResponse(
        Long id,
        String certificateNo,
        String displayName,
        String examCode,
        String examName,
        String netWpm,
        String accuracyPct,
        String targetWpm,
        String language,
        Instant issuedAt,
        boolean revoked
) {
    public static CertificateResponse from(Certificate certificate) {
        return new CertificateResponse(
                certificate.getId(),
                certificate.getCertificateNo(),
                certificate.getDisplayName(),
                certificate.getExamCode(),
                certificate.getExamName(),
                certificate.getNetWpm().toPlainString(),
                certificate.getAccuracyPct().toPlainString(),
                certificate.getTargetWpm().toPlainString(),
                certificate.getLanguage(),
                certificate.getIssuedAt(),
                certificate.isRevoked());
    }
}
