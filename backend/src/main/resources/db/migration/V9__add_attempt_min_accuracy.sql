-- -----------------------------------------------------------------------------
-- V9__add_attempt_min_accuracy.sql
--
-- The accuracy floor was missing from the attempt's snapshot of the exam
-- rules.
--
-- The `attempts` table snapshots the rules so that a later change to an exam
-- profile does not change how a stored result is scored. The snapshot had
-- the passing speed but not the accuracy floor, so the floor was always
-- zero and the accuracy was never actually checked.
--
-- The result was a candidate with 5% accuracy being told they had passed,
-- as long as they were fast enough — which they were, because a candidate
-- who types for two seconds and submits is very fast.
-- -----------------------------------------------------------------------------

ALTER TABLE attempts
    ADD COLUMN IF NOT EXISTS min_accuracy_pct NUMERIC(5,2) NOT NULL DEFAULT 0;

-- The attempts that are already stored were scored without the floor. They
-- are left as they are: re-scoring them would change a result the
-- candidate has already been shown.
COMMENT ON COLUMN attempts.min_accuracy_pct IS
    'The minimum accuracy the exam required, snapshotted when the attempt started.';
