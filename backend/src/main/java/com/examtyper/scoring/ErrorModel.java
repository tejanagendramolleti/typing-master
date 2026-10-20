package com.examtyper.scoring;

/**
 * How errors translate into a net-speed penalty.
 *
 * <p>Exam bodies change their rules between notifications, so the model is
 * selected per {@code ExamProfile} rather than being fixed in the engine.
 */
public enum ErrorModel {

    /**
     * The classic Indian exam model: a "full mistake" (a wrong, missing or extra
     * word) costs one full word of speed, a "half mistake" (case / punctuation /
     * spacing slip) costs half a word.
     */
    FULL_AND_HALF_MISTAKES {
        @Override
        public double penalty(int fullMistakes, int halfMistakes, double penaltyPerUnit) {
            return fullMistakes * 1.0 + halfMistakes * 0.5;
        }
    },

    /**
     * Every mistake — full or half — costs a fixed number of words of speed,
     * configured by {@code errorPenaltyPerUnit}.
     */
    PER_ERROR_PENALTY {
        @Override
        public double penalty(int fullMistakes, int halfMistakes, double penaltyPerUnit) {
            return (fullMistakes + halfMistakes) * penaltyPerUnit;
        }
    },

    /**
     * Speed is reported gross, but the pass mark also requires an accuracy floor;
     * the effective score is scaled by accuracy so a run full of errors is slow
     * even when the raw keystroke rate was high.
     */
    ACCURACY_ONLY {
        @Override
        public double penalty(int fullMistakes, int halfMistakes, double penaltyPerUnit) {
            return 0.0;
        }
    };

    /** Words of speed to subtract for the given mistake counts. */
    public abstract double penalty(int fullMistakes, int halfMistakes, double penaltyPerUnit);
}
