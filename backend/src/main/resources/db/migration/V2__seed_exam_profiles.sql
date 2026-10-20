-- =============================================================================
-- Seed exam profiles.
--
-- IMPORTANT: every value below is a sensible DEFAULT chosen for this product,
-- not an official figure. Official notifications change between cycles, so each
-- row carries a source_note that says so. An administrator should check each
-- profile against the latest notification before relying on it for a real exam.
--
-- Durations are indicative of the shape of each test, not official timings.
-- =============================================================================

INSERT INTO exam_profiles
    (code, name, description, language, keyboard_layout, duration_seconds,
     target_keystrokes, target_words, passing_net_wpm, word_length_chars,
     error_model, error_penalty_per_unit, backspace_allowed, show_live_wpm,
     is_alphanumeric, min_accuracy_pct, source_note, active, sort_order)
VALUES
-- ---------------------------------------------------------------- SSC CHSL --
('SSC-CHSL-EN', 'SSC CHSL Typing Test (English)',
 'Typing speed and accuracy test for the Combined Higher Secondary Level examination, English section.',
 'EN', 'en-qwerty', 1200,
 3600, NULL, 35.00, 5,
 'FULL_AND_HALF_MISTAKES', 1.000, TRUE, TRUE,
 FALSE, 90.00,
 'Default values for this product - verify against the latest official SSC CHSL notification. Duration, pass mark and accuracy floor are indicative.',
 TRUE, 10),

('SSC-CHSL-HI', 'SSC CHSL Typing Test (Hindi)',
 'Typing speed and accuracy test for the Combined Higher Secondary Level examination, Hindi section.',
 'HI', 'hi-inscript', 1200,
 3600, NULL, 30.00, 5,
 'FULL_AND_HALF_MISTAKES', 1.000, TRUE, TRUE,
 FALSE, 90.00,
 'Default values for this product - verify against the latest official SSC CHSL notification. Duration, pass mark and accuracy floor are indicative.',
 TRUE, 11),

-- ---------------------------------------------------------------- SSC CGL --
('SSC-CGL-EN', 'SSC CGL Typing Test (English)',
 'Typing speed and accuracy test for the Combined Graduate Level examination, English section.',
 'EN', 'en-qwerty', 1200,
 3600, NULL, 40.00, 5,
 'FULL_AND_HALF_MISTAKES', 1.000, TRUE, TRUE,
 FALSE, 90.00,
 'Default values for this product - verify against the latest official SSC CGL notification. Duration, pass mark and accuracy floor are indicative.',
 TRUE, 12),

('SSC-CGL-HI', 'SSC CGL Typing Test (Hindi)',
 'Typing speed and accuracy test for the Combined Graduate Level examination, Hindi section.',
 'HI', 'hi-inscript', 1200,
 3600, NULL, 35.00, 5,
 'FULL_AND_HALF_MISTAKES', 1.000, TRUE, TRUE,
 FALSE, 90.00,
 'Default values for this product - verify against the latest official SSC CGL notification. Duration, pass mark and accuracy floor are indicative.',
 TRUE, 13),

-- ------------------------------------------------------- Court / Junior Asst --
('COURT-TYPIST-EN', 'Court Typist / Junior Assistant (English)',
 'Typing test for High Court and District Court typist and junior assistant recruitment, English section.',
 'EN', 'en-qwerty', 1200,
 3600, NULL, 35.00, 5,
 'FULL_AND_HALF_MISTAKES', 1.000, TRUE, TRUE,
 FALSE, 90.00,
 'Default values for this product - verify against the latest official High Court / District Court recruitment notification. Court examinations do not publish one uniform rule set - rules vary by recruiting body.',
 TRUE, 20),

('COURT-TYPIST-HI', 'Court Typist / Junior Assistant (Hindi)',
 'Typing test for High Court and District Court typist and junior assistant recruitment, Hindi section.',
 'HI', 'hi-inscript', 1200,
 3600, NULL, 30.00, 5,
 'FULL_AND_HALF_MISTAKES', 1.000, TRUE, TRUE,
 FALSE, 90.00,
 'Default values for this product - verify against the latest official High Court / District Court recruitment notification. Court examinations do not publish one uniform rule set - rules vary by recruiting body.',
 TRUE, 21),

-- ------------------------------------------------------------------- RRB --
('RRB-EN', 'RRB Typing Test (English)',
 'Typing speed test for Railway Recruitment Board stenographer and typist posts, English section.',
 'EN', 'en-qwerty', 900,
 2700, NULL, 35.00, 5,
 'FULL_AND_HALF_MISTAKES', 1.000, TRUE, TRUE,
 FALSE, 88.00,
 'Default values for this product - verify against the latest official RRB CEN notification. Duration and pass mark are indicative.',
 TRUE, 30),

('RRB-HI', 'RRB Typing Test (Hindi)',
 'Typing speed test for Railway Recruitment Board stenographer and typist posts, Hindi section.',
 'HI', 'hi-inscript', 900,
 2700, NULL, 30.00, 5,
 'FULL_AND_HALF_MISTAKES', 1.000, TRUE, TRUE,
 FALSE, 88.00,
 'Default values for this product - verify against the latest official RRB CEN notification. Duration and pass mark are indicative.',
 TRUE, 31),

-- ------------------------------------------------------------ Stenographer --
('STENO-EN', 'Stenographer Transcription (English)',
 'Transcription test for stenographer and shorthand competitions, measured in words typed per minute.',
 'EN', 'en-qwerty', 600,
 NULL, 300, 40.00, 5,
 'FULL_AND_HALF_MISTAKES', 1.000, TRUE, TRUE,
 FALSE, 92.00,
 'Default values for this product - verify against the latest official stenography competition notification. Transcription tests are usually shorter than the other profiles.',
 TRUE, 40),

('STENO-HI', 'Stenographer Transcription (Hindi)',
 'Transcription test for stenographer and shorthand competitions in Hindi.',
 'HI', 'hi-inscript', 600,
 NULL, 300, 35.00, 5,
 'FULL_AND_HALF_MISTAKES', 1.000, TRUE, TRUE,
 FALSE, 92.00,
 'Default values for this product - verify against the latest official stenography competition notification. Transcription tests are usually shorter than the other profiles.',
 TRUE, 41),

-- ------------------------------------------------------- Data Entry Operator --
('DEO-ALNUM', 'Data Entry Operator (Alphanumeric)',
 'Data entry speed test. Measured in key depressions per hour rather than words per minute, on alphanumeric content only.',
 'ALNUM', 'en-qwerty', 1200,
 9000, NULL, 0.00, 5,
 'PER_ERROR_PENALTY', 1.000, TRUE, FALSE,
 TRUE, 95.00,
 'Default values for this product - verify against the latest official Data Entry / DEO operator notification. Data entry roles are usually scored on key depressions per hour, so the pass mark is expressed as the equivalent WPM floor.',
 TRUE, 50),

-- ----------------------------------------------------------------- Telugu --
('TS-TELUGU-STATE', 'Telugu Typing (State Examinations)',
 'Telugu typing test for state-level and public sector examinations conducted in Telugu.',
 'TE', 'te-inscript', 900,
 2700, NULL, 30.00, 5,
 'FULL_AND_HALF_MISTAKES', 1.000, TRUE, TRUE,
 FALSE, 90.00,
 'Default values for this product - verify against the latest official notification of the relevant Telugu-language state examination. Rules vary between departments.',
 TRUE, 60),

-- -------------------------------------------------------------- Kruti Dev --
('HI-KRUTIDEV', 'Hindi Typing - Kruti Dev Layout',
 'Hindi typing test for candidates who type on a Kruti Dev 010 keyboard layout. The on-screen layout shows the Kruti Dev key positions.',
 'HI', 'hi-krutidev', 1200,
 3600, NULL, 30.00, 5,
 'FULL_AND_HALF_MISTAKES', 1.000, TRUE, TRUE,
 FALSE, 90.00,
 'Default values for this product - verify against the latest official notification. Kruti Dev is a legacy layout and is not accepted by every current examination.',
 TRUE, 70),

-- ------------------------------------------------------- Generic practice --
('GENERIC-PRACTICE-EN', 'General Typing Practice (English)',
 'Open practice test with no exam-specific rules. Useful for warm-ups and for candidates preparing for an exam that is not listed here.',
 'EN', 'en-qwerty', 300,
 NULL, NULL, 0.00, 5,
 'FULL_AND_HALF_MISTAKES', 1.000, TRUE, TRUE,
 FALSE, 0.00,
 'Free practice profile, not tied to any specific examination. Values are chosen by this product.',
 TRUE, 90),

('GENERIC-PRACTICE-HI', 'General Typing Practice (Hindi)',
 'Open practice test in Hindi with no exam-specific rules.',
 'HI', 'hi-inscript', 300,
 NULL, NULL, 0.00, 5,
 'FULL_AND_HALF_MISTAKES', 1.000, TRUE, TRUE,
 FALSE, 0.00,
 'Free practice profile, not tied to any specific examination. Values are chosen by this product.',
 TRUE, 91),

('GENERIC-PRACTICE-ALNUM', 'General Data Entry Practice (Alphanumeric)',
 'Open alphanumeric practice with no exam-specific rules.',
 'ALNUM', 'en-qwerty', 300,
 NULL, NULL, 0.00, 5,
 'PER_ERROR_PENALTY', 1.000, TRUE, FALSE,
 TRUE, 0.00,
 'Free practice profile, not tied to any specific examination. Values are chosen by this product.',
 TRUE, 92);
