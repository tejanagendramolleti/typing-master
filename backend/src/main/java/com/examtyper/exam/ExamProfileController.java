package com.examtyper.exam;

import com.examtyper.exam.dto.ExamProfileResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * The public exam catalogue.
 */
@RestController
@RequestMapping("/api/v1/exams")
@Tag(name = "Exams", description = "The catalogue of exam typing tests and their rules")
public class ExamProfileController {

    private final ExamProfileService examProfileService;

    public ExamProfileController(ExamProfileService examProfileService) {
        this.examProfileService = examProfileService;
    }

    @GetMapping
    @Operation(summary = "List every available exam test")
    public ResponseEntity<List<ExamProfileResponse>> list(
            @RequestParam(required = false) String language) {
        List<ExamProfile> profiles = (language == null || language.isBlank())
                ? examProfileService.findAllActive()
                : examProfileService.findByLanguage(language);
        return ResponseEntity.ok(profiles.stream().map(ExamProfileResponse::from).toList());
    }

    @GetMapping("/{code}")
    @Operation(summary = "Get one exam test's rules")
    public ResponseEntity<ExamProfileResponse> get(@PathVariable String code) {
        return ResponseEntity.ok(ExamProfileResponse.from(examProfileService.findByCode(code)));
    }

    @GetMapping("/languages")
    @Operation(summary = "The languages that have exam tests")
    public ResponseEntity<List<String>> languages() {
        return ResponseEntity.ok(examProfileService.findActiveLanguages());
    }
}
