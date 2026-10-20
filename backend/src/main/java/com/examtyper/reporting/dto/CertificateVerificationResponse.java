package com.examtyper.reporting.dto;

import com.examtyper.reporting.Certificate;

import java.time.Instant;

/**
 * What the public verification page shows.
 *
 * @param found        true when a certificate with that number exists
 * @param certificateNo the number that was checked
 * @param holderName   the name on the certificate
 * @param examCode     the exam
 * @param examName     the exam's name
 * @param netWpm       the speed that was achieved
 * @param accuracyPct  the accuracy that was achieved
 * @param passed       whether the test was passed
 * @param issuedAt     when it was issued
 * @param valid        true when the certificate exists and has not been revoked
 */
public record CertificateVerificationResponse(
        boolean found,
        String certificateNo,
        String holderName,
        String examCode,
        String examName,
        double netWpm,
        double accuracyPct,
        boolean passed,
        Instant issuedAt,
        boolean valid
) {
    public static CertificateVerificationResponse from(Certificate certificate) {
        return new CertificateVerificationResponse(
                true,
                certificate.getCertificateNo(),
                certificate.getDisplayName(),
                certificate.getExamCode(),
                certificate.getExamName(),
                certificate.getNetWpm().doubleValue(),
                certificate.getAccuracyPct().doubleValue(),
                true,
                certificate.getIssuedAt(),
                !certificate.isRevoked());
    }
}
