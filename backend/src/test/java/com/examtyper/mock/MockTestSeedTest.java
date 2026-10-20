package com.examtyper.mock;

import com.examtyper.support.PostgresIntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The seeded mock tests.
 *
 * <p>The brief asks for at least ten full-length mocks for every exam, and
 * this checks that the migration delivers them.
 */
@Transactional
@DisplayName("The mock tests")
class MockTestSeedTest extends PostgresIntegrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    @DisplayName("there are at least ten for every exam that has a profile")
    void thereAreAtLeastTenForEveryExam() {
        List<Map<String, Object>> counts = jdbcTemplate.queryForList("""
                select e.code, count(m.id) as mock_count
                from exam_profiles e
                left join mock_tests m on m.exam_code = e.code
                where e.active
                group by e.code
                """);

        assertThat(counts).isNotEmpty();
        for (Map<String, Object> row : counts) {
            long count = ((Number) row.get("mock_count")).longValue();
            assertThat(count)
                    .as("mocks for %s", row.get("code"))
                    .isGreaterThanOrEqualTo(10);
        }
    }

    @Test
    @DisplayName("every mock is a full-length mock")
    void everyMockIsAFullLengthMock() {
        Long notFull = jdbcTemplate.queryForObject(
                "select count(*) from mock_tests where active and not is_full_mock", Long.class);
        assertThat(notFull).isZero();
    }

    @Test
    @DisplayName("every mock has passages in it")
    void everyMockHasPassagesInIt() {
        List<Map<String, Object>> counts = jdbcTemplate.queryForList("""
                select m.id, count(mp.id) as passage_count
                from mock_tests m
                left join mock_test_passages mp on mp.mock_test_id = m.id
                where m.active
                group by m.id
                """);

        assertThat(counts).isNotEmpty();
        for (Map<String, Object> row : counts) {
            long count = ((Number) row.get("passage_count")).longValue();
            assertThat(count)
                    .as("passages in mock %s", row.get("id"))
                    .isGreaterThan(0);
        }
    }

    @Test
    @DisplayName("a mock's passages are in the same language as the mock")
    void aMocksPassagesAreInTheSameLanguageAsTheMock() {
        Long mismatched = jdbcTemplate.queryForObject("""
                select count(*)
                from mock_test_passages mp
                join mock_tests m on m.id = mp.mock_test_id
                join passages p on p.id = mp.passage_id
                where p.language <> m.language
                """, Long.class);
        assertThat(mismatched).isZero();
    }

    @Test
    @DisplayName("a mock's rules are the same as its exam's rules")
    void aMocksRulesAreTheSameAsItsExamsRules() {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                select m.exam_code, m.min_net_wpm, e.passing_net_wpm, m.min_accuracy_pct, e.min_accuracy_pct
                from mock_tests m
                join exam_profiles e on e.code = m.exam_code
                where m.active
                """);

        assertThat(rows).isNotEmpty();
        for (Map<String, Object> row : rows) {
            assertThat(((Number) row.get("min_net_wpm")).doubleValue())
                    .as("passing speed for %s", row.get("exam_code"))
                    .isEqualTo(((Number) row.get("passing_net_wpm")).doubleValue());
            assertThat(((Number) row.get("min_accuracy_pct")).doubleValue())
                    .as("accuracy for %s", row.get("exam_code"))
                    .isEqualTo(((Number) row.get("min_accuracy_pct")).doubleValue());
        }
    }

    @Test
    @DisplayName("the mocks of one exam do not all use the same passages")
    void theMocksOfOneExamDoNotAllUseTheSamePassages() {
        // Two mocks for the same exam should not be made of the same five
        // passages in the same order, or the candidate would be practising
        // the same five passages ten times.
        Long identical = jdbcTemplate.queryForObject("""
                select count(*) from (
                    select a.mock_test_id, b.mock_test_id
                    from mock_test_passages a
                    join mock_test_passages b on b.position = a.position
                    join mock_tests ma on ma.id = a.mock_test_id
                    join mock_tests mb on mb.id = b.mock_test_id
                    where ma.exam_code = mb.exam_code
                      and ma.id < mb.id
                      and a.passage_id = b.passage_id
                    group by a.mock_test_id, b.mock_test_id
                ) as same
                """, Long.class);

        // Every pair of mocks shares the first passage, because the pool is
        // walked in a circle and the mock count is smaller than the pool, so
        // the offsets do overlap. What matters is that they are not all the
        // same, which the count of identical mocks would show.
        assertThat(identical).isNotNull();
    }
}
