package com.examtyper.attempt;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface AttemptEventRepository extends JpaRepository<AttemptEvent, Long> {

    List<AttemptEvent> findByAttemptIdOrderByEventAtAsc(Long attemptId);

    @Query("select e from AttemptEvent e where e.attemptId = :attemptId "
            + "and e.eventType = com.examtyper.attempt.AttemptEventType.KEYSTROKE "
            + "order by e.eventAt asc")
    List<AttemptEvent> findKeystrokes(@Param("attemptId") Long attemptId);

    @Query("select e from AttemptEvent e where e.attemptId = :attemptId "
            + "and e.eventType = com.examtyper.attempt.AttemptEventType.BACKSPACE")
    long countBackspaces(@Param("attemptId") Long attemptId);

    @Query("select e from AttemptEvent e where e.attemptId = :attemptId "
            + "and e.eventType = com.examtyper.attempt.AttemptEventType.BLUR")
    long countBlurs(@Param("attemptId") Long attemptId);

    @Query("select e from AttemptEvent e where e.attemptId = :attemptId "
            + "and e.eventType in (com.examtyper.attempt.AttemptEventType.PASTE_ATTEMPT, "
            + "com.examtyper.attempt.AttemptEventType.DROP_ATTEMPT, "
            + "com.examtyper.attempt.AttemptEventType.COPY_ATTEMPT, "
            + "com.examtyper.attempt.AttemptEventType.CONTEXT_MENU) "
            + "order by e.eventAt asc")
    List<AttemptEvent> findCheatSignals(@Param("attemptId") Long attemptId);

    long countByEventTypeAndEventAtAfter(AttemptEventType eventType, Instant since);
}
