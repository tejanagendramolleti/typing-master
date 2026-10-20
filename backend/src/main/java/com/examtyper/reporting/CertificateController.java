package com.examtyper.reporting;

import com.examtyper.common.web.CurrentUser;
import com.examtyper.reporting.dto.CertificateResponse;
import com.examtyper.reporting.dto.CertificateVerificationResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * The certificates.
 *
 * <p>The verification endpoint is public: anybody with the number can check
 * it, and checking it needs no account.
 */
@RestController
@RequestMapping("/api/v1/certificates")
@Tag(name = "Certificates", description = "The certificates and their verification")
public class CertificateController {

    private final CertificateService certificateService;

    public CertificateController(CertificateService certificateService) {
        this.certificateService = certificateService;
    }

    @GetMapping("/mine")
    @Operation(summary = "The candidate's own certificates")
    public ResponseEntity<List<CertificateResponse>> mine() {
        List<CertificateResponse> certificates = certificateService
                .listForUser(CurrentUser.requireId())
                .stream()
                .map(CertificateResponse::from)
                .toList();
        return ResponseEntity.ok(certificates);
    }

    @GetMapping("/{certificateNo}/pdf")
    @Operation(summary = "The certificate as a PDF")
    public ResponseEntity<Resource> pdf(@PathVariable String certificateNo) {
        Certificate certificate = certificateService.findByNumber(certificateNo);
        byte[] pdf = certificateService.toPdf(certificate);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + certificate.getCertificateNo() + ".pdf\"")
                .contentLength(pdf.length)
                .body(new ByteArrayResource(pdf));
    }

    @GetMapping("/verify/{certificateNo}")
    @Operation(summary = "Check a certificate number")
    public ResponseEntity<CertificateVerificationResponse> verify(@PathVariable String certificateNo) {
        Certificate certificate = certificateService.findByNumber(certificateNo);
        return ResponseEntity.ok(CertificateVerificationResponse.from(certificate));
    }
}
