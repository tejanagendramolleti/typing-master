package com.examtyper.reporting;

import com.examtyper.attempt.Attempt;
import com.examtyper.attempt.AttemptRepository;
import com.examtyper.attempt.AttemptStatus;
import com.examtyper.common.error.BusinessException;
import com.examtyper.common.error.ErrorCode;
import com.examtyper.common.error.NotFoundException;
import com.examtyper.user.User;
import com.examtyper.user.UserRepository;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Optional;

/**
 * The certificates.
 *
 * <p>A certificate is issued when a candidate passes a full-length mock at
 * or above the target speed. It carries a number that is long and
 * unguessable, and the number is the whole of the verification: anybody
 * with it can check what it says.
 *
 * <p>The number is not a secret and does not need to be. It is not a
 * qualification and it is not signed — see {@code KNOWN_ISSUES.md}.
 */
@Service
public class CertificateService {

    private static final Logger log = LoggerFactory.getLogger(CertificateService.class);

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    /**
     * The font the PDF uses.
     *
     * The fonts are built with {@link FontFactory} rather than with the
     * {@code Font} constructor, because the constructor wants a
     * {@code BaseFont} and the factory is the way to get one.
     */
    private static final Font TITLE = font(FontFactory.HELVETICA_BOLD, 22, 0x1F2937);
    private static final Font HEADING = font(FontFactory.HELVETICA_BOLD, 12, 0x4F46E5);
    private static final Font BODY = font(FontFactory.HELVETICA, 11, 0x334155);
    private static final Font SMALL = font(FontFactory.HELVETICA, 9, 0x64748B);
    private static final Font MONO = font(FontFactory.COURIER, 10, 0x334155);
    private static final Font NAME = font(FontFactory.HELVETICA_BOLD, 18, 0x0F172A);

    /**
     * Builds a font.
     *
     * @param family the font family
     * @param size   the size in points
     * @param colour the colour, as an RGB value
     */
    private static Font font(String family, int size, int colour) {
        return FontFactory.getFont(family, size, java.awt.Color.decode(
                String.format("#%06X", colour)));
    }

    private final AttemptRepository attemptRepository;
    private final UserRepository userRepository;
    private final CertificateRepository certificateRepository;

    public CertificateService(AttemptRepository attemptRepository,
                              UserRepository userRepository,
                              CertificateRepository certificateRepository) {
        this.attemptRepository = attemptRepository;
        this.userRepository = userRepository;
        this.certificateRepository = certificateRepository;
    }

    /**
     * Issues a certificate for a passed attempt, if there is not one
     * already.
     *
     * <p>The certificate is only issued for a full-length mock, and only
     * when the attempt passed.
     */
    @Transactional
    public Optional<Certificate> issueForAttempt(Attempt attempt) {
        if (attempt.getMockTestId() == null) {
            // Only a full-length mock earns a certificate.
            return Optional.empty();
        }
        if (!Boolean.TRUE.equals(attempt.getPassed())) {
            return Optional.empty();
        }
        if (attempt.getStatus() != AttemptStatus.SUBMITTED
                && attempt.getStatus() != AttemptStatus.AUTO_SUBMITTED) {
            return Optional.empty();
        }

        Optional<Certificate> existing = certificateRepository.findByAttemptId(attempt.getId());
        if (existing.isPresent()) {
            return existing;
        }

        User user = userRepository.findById(attempt.getUserId()).orElse(null);
        if (user == null) {
            return Optional.empty();
        }

        Certificate certificate = new Certificate();
        certificate.setUserId(attempt.getUserId());
        certificate.setAttemptId(attempt.getId());
        certificate.setCertificateNo(newCertificateNumber());
        certificate.setDisplayName(user.getDisplayName() == null ? user.getEmail() : user.getDisplayName());
        certificate.setExamCode(attempt.getExamCode());
        certificate.setExamName(attempt.getExamCode());
        certificate.setNetWpm(attempt.getNetWpm() == null ? BigDecimal.ZERO : attempt.getNetWpm());
        certificate.setAccuracyPct(attempt.getAccuracyPct() == null ? BigDecimal.ZERO : attempt.getAccuracyPct());
        certificate.setTargetWpm(attempt.getPassingNetWpm() == null ? BigDecimal.ZERO : attempt.getPassingNetWpm());
        certificate.setLanguage(attempt.getLanguage());
        certificate.setIssuedAt(Instant.now());
        certificate.setRevoked(false);

        log.info("Issued certificate {} for attempt {}", certificate.getCertificateNo(), attempt.getId());
        return Optional.of(certificateRepository.save(certificate));
    }

    /**
     * The certificate for an attempt, if there is one.
     */
    @Transactional(readOnly = true)
    public Optional<Certificate> findByAttempt(Long attemptId) {
        return certificateRepository.findByAttemptId(attemptId);
    }

    /**
     * The candidate's certificates, newest first.
     */
    @Transactional(readOnly = true)
    public java.util.List<Certificate> listForUser(Long userId) {
        return certificateRepository.findByUserIdOrderByIssuedAtDesc(userId);
    }

    /**
     * Looks a certificate up by its number, for the public verification
     * page.
     */
    @Transactional(readOnly = true)
    public Certificate findByNumber(String number) {
        return certificateRepository.findByCertificateNo(number.trim().toUpperCase(Locale.ROOT))
                .orElseThrow(() -> new NotFoundException("No certificate with that number."));
    }

    /**
     * The certificate as a PDF.
     */
    @Transactional(readOnly = true)
    public byte[] toPdf(Certificate certificate) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4, 50, 50, 50, 50);

        try {
            PdfWriter.getInstance(document, out);
            document.open();

            Paragraph title = new Paragraph("Certificate of Typing Proficiency", TITLE);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(6);
            document.add(title);

            Paragraph subtitle = new Paragraph("ExamTyper", HEADING);
            subtitle.setAlignment(Element.ALIGN_CENTER);
            subtitle.setSpacingAfter(24);
            document.add(subtitle);

            Paragraph awarded = new Paragraph("This certifies that", BODY);
            awarded.setAlignment(Element.ALIGN_CENTER);
            awarded.setSpacingAfter(8);
            document.add(awarded);

            Paragraph name = new Paragraph(certificate.getDisplayName(), NAME);
            name.setAlignment(Element.ALIGN_CENTER);
            name.setSpacingAfter(8);
            document.add(name);

            Paragraph completed = new Paragraph(
                    "has passed the full-length " + certificate.getExamName() + " typing test", BODY);
            completed.setAlignment(Element.ALIGN_CENTER);
            completed.setSpacingAfter(24);
            document.add(completed);

            PdfPTable table = new PdfPTable(2);
            table.setWidths(new float[]{1, 1});
            table.setSpacingBefore(12);
            table.setSpacingAfter(12);
            table.addCell(cell("Net speed", certificate.getNetWpm() + " words a minute"));
            table.addCell(cell("Accuracy", certificate.getAccuracyPct() + "%"));
            table.addCell(cell("Target speed", certificate.getTargetWpm() + " words a minute"));
            table.addCell(cell("Language", certificate.getLanguage()));
            document.add(table);

            Paragraph issued = new Paragraph(
                    "Issued on " + DateTimeFormatter.ofPattern("d MMMM yyyy", Locale.ENGLISH)
                            .format(certificate.getIssuedAt().atZone(ZoneId.of("UTC"))), BODY);
            issued.setSpacingAfter(6);
            document.add(issued);

            Paragraph number = new Paragraph("Certificate number: " + certificate.getCertificateNo(), MONO);
            number.setSpacingAfter(24);
            document.add(number);

            Paragraph footer = new Paragraph(
                    "This certificate records a practice test taken on ExamTyper. "
                            + "It is not a qualification and it is not issued by any "
                            + "examination authority. It can be checked at the verification "
                            + "page with the number above.", SMALL);
            document.add(footer);

            document.close();
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.INTERNAL_ERROR,
                    "The certificate could not be produced.");
        }

        return out.toByteArray();
    }

    /**
     * One cell of the table.
     */
    private static PdfPCell cell(String label, String value) {
        PdfPCell cell = new PdfPCell();
        cell.setPadding(10);
        cell.setBorderColor(new java.awt.Color(0xE2, 0xE8, 0xF0));
        cell.addElement(new Phrase(label, SMALL));
        cell.addElement(new Phrase(value, BODY));
        return cell;
    }

    /**
     * A new certificate number.
     *
     * <p>The alphabet leaves out the letters that are easy to confuse — no
     * I, no O, no 0 and no 1 — because the number is read off a screen and
     * typed back in.
     */
    private String newCertificateNumber() {
        StringBuilder builder = new StringBuilder("ET-");
        for (int group = 0; group < 4; group++) {
            if (group > 0) {
                builder.append('-');
            }
            for (int i = 0; i < 4; i++) {
                builder.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
            }
        }
        return builder.toString();
    }
}
