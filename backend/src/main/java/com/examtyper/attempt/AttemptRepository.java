package com.examtyper.attempt;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface AttemptRepository extends JpaRepository<Attempt, Long> {

    Optional<Attempt> findByIdAndUserId(Long id, Long userId);

    List<Attempt> findByUserIdAndStatus(Long userId, AttemptStatus status);

    Page<Attempt> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    Page<Attempt> findByUserIdAndExamCodeOrderByCreatedAtDesc(Long userId, String examCode, Pageable pageable);

    /**
     * Counts the attempts a user has made since the start of the current
     * server-side day. Used for the free-tier daily quota.
     */
    @Query("select count(a) from Attempt a where a.userId = :userId "
            + "and a.createdAt >= :since and a.status <> com.examtyper.attempt.AttemptStatus.IN_PROGRESS")
    long countSince(@Param("userId") Long userId, @Param("since") Instant since);

    @Query("select a from Attempt a where a.userId = :userId and a.examCode = :examCode "
            + "and a.status <> com.examtyper.attempt.AttemptStatus.IN_PROGRESS "
            + "and a.createdAt >= :since")
    List<Attempt> findCompletedSince(@Param("userId") Long userId,
                                      @Param("examCode") String examCode,
                                      @Param("since") Instant since);

    /**
     * Finds attempts whose time limit has passed but which were never submitted,
     * so the scheduled job can finalise them.
     */
    @Query("select a from Attempt a where a.status = com.examtyper.attempt.AttemptStatus.IN_PROGRESS "
            + "and a.startedAt < :cutoff")
    List<Attempt> findExpiredInProgress(@Param("cutoff") Instant cutoff);

    @Query("select count(a) from Attempt a where a.submittedAt is not null")
    long countSubmitted();

    /**
     * The finished attempts for an exam, for the leaderboard.
     *
     * <p>Both a submitted attempt and an automatically submitted one count:
     * a candidate whose time ran out has a real result.
     */
    @Query("select a from Attempt a where a.examCode = :examCode "
            + "and a.status in (com.examtyper.attempt.AttemptStatus.SUBMITTED, "
            + "com.examtyper.attempt.AttemptStatus.AUTO_SUBMITTED) "
            + "and a.submittedAt is not null "
            + "and (:since is null or a.submittedAt >= :since)")
    List<Attempt> findFinishedForExam(@Param("examCode") String examCode,
                                      @Param("since") Instant since);

    @Query("select count(a) from Attempt a where a.submittedAt >= :since")
    long countSubmittedSince(@Param("since") Instant since);
}
