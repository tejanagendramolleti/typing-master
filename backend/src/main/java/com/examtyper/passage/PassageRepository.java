package com.examtyper.passage;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PassageRepository extends JpaRepository<Passage, Long> {

    Optional<Passage> findByIdAndActiveTrue(Long id);

    Page<Passage> findByActiveTrue(Pageable pageable);

    Page<Passage> findByActiveTrueAndLanguage(String language, Pageable pageable);

    Page<Passage> findByActiveTrueAndLanguageAndDifficulty(String language, String difficulty, Pageable pageable);

    @Query("select p from Passage p where p.active = true and p.language = :language "
            + "and p.examType = :examType and p.difficulty = :difficulty")
    List<Passage> findForSelection(@Param("language") String language,
                                   @Param("examType") String examType,
                                   @Param("difficulty") String difficulty);

    @Query("select p from Passage p where p.active = true and p.language = :language")
    List<Passage> findAllActiveByLanguage(@Param("language") String language);

    long countByActiveTrue();

    long countByActiveTrueAndLanguage(String language);
}
