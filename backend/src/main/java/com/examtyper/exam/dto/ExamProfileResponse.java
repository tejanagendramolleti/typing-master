package com.examtyper.exam.dto;

import com.examtyper.exam.ExamProfile;

import java.math.BigDecimal;

/**
 * The public view of an exam profile.
 */
public record ExamProfileResponse(
        Long id,
        String code,
        String name,
        String description,
        String language,
        String keyboardLayout,
        int durationSeconds,
        Integer targetKeystrokes,
        Integer targetWords,
        BigDecimal passingNetWpm,
        int wordLengthChars,
        String errorModel,
        BigDecimal errorPenaltyPerUnit,
        boolean backspaceAllowed,
        boolean showLiveWpm,
        boolean alphanumeric,
        BigDecimal minAccuracyPct,
        String sourceNote,
        boolean active
) {
    public static ExamProfileResponse from(ExamProfile profile) {
        return new ExamProfileResponse(
                profile.getId(),
                profile.getCode(),
                profile.getName(),
                profile.getDescription(),
                profile.getLanguage(),
                profile.getKeyboardLayout(),
                profile.getDurationSeconds(),
                profile.getTargetKeystrokes(),
                profile.getTargetWords(),
                profile.getPassingNetWpm(),
                profile.getWordLengthChars(),
                profile.getErrorModel() == null ? null : profile.getErrorModel().name(),
                profile.getErrorPenaltyPerUnit(),
                profile.isBackspaceAllowed(),
                profile.isShowLiveWpm(),
                profile.isAlphanumeric(),
                profile.getMinAccuracyPct(),
                profile.getSourceNote(),
                profile.isActive());
    }
}
