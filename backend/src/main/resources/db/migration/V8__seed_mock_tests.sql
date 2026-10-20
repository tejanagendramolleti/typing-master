-- -----------------------------------------------------------------------------
-- V8__seed_mock_tests.sql
--
-- Ten full-length mocks for every exam.
--
-- A mock is a named, ordered set of passages. Ten per exam gives a candidate
-- enough material to practise against without the sets being repetitive: the
-- mocks between them walk through the whole passage pool for their language,
-- so two mocks rarely share a passage in the same position.
--
-- The rules for a mock — the time, the passing speed and the accuracy floor —
-- are copied from the exam profile, so a mock and a practice test for the
-- same exam are scored the same way.
-- -----------------------------------------------------------------------------

INSERT INTO mock_tests
    (exam_code, name, description, language, duration_seconds, is_full_mock,
     min_net_wpm, min_accuracy_pct, sort_order, active)
SELECT
    e.code,
    'Mock ' || LPAD(g.n::text, 2, '0'),
    'Full-length mock ' || g.n::text || ' for ' || e.name
        || '. The rules are the same as the practice test.',
    e.language,
    e.duration_seconds,
    TRUE,
    e.passing_net_wpm,
    e.min_accuracy_pct,
    g.n,
    TRUE
FROM exam_profiles e
CROSS JOIN generate_series(1, 10) AS g(n)
WHERE e.active
ON CONFLICT (exam_code, name) DO NOTHING;

-- -----------------------------------------------------------------------------
-- The passages for each mock.
--
-- Every mock takes five passages from the pool for its language. The mock
-- number and the position together give an offset into that pool, so the
-- mocks walk through it and each passage appears in a different position in
-- each mock.
-- -----------------------------------------------------------------------------

WITH ranked AS (
    SELECT p.id,
           p.language,
           ROW_NUMBER() OVER (PARTITION BY p.language ORDER BY p.id) AS rn
    FROM passages p
    WHERE p.active
),
pool AS (
    SELECT language, COUNT(*) AS total
    FROM ranked
    GROUP BY language
),
mocks AS (
    SELECT m.id AS mock_id,
           m.language,
           ROW_NUMBER() OVER (PARTITION BY m.exam_code ORDER BY m.sort_order) AS mock_no
    FROM mock_tests m
    WHERE m.active AND m.is_full_mock
),
positions AS (
    SELECT generate_series(0, 4) AS pos
)
INSERT INTO mock_test_passages (mock_test_id, passage_id, position)
SELECT mocks.mock_id,
       ranked.id,
       positions.pos
FROM mocks
CROSS JOIN positions
JOIN ranked ON ranked.language = mocks.language
JOIN pool ON pool.language = ranked.language
WHERE ranked.rn = ((mocks.mock_no - 1) * 5 + positions.pos) % pool.total + 1
ON CONFLICT (mock_test_id, position) DO NOTHING;
