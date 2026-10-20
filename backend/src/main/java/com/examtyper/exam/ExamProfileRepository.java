package com.examtyper.exam;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ExamProfileRepository extends JpaRepository<ExamProfile, Long> {

    Optional<ExamProfile> findByCode(String code);

    boolean existsByCode(String code);

    List<ExamProfile> findByActiveTrueOrderBySortOrderAscNameAsc();

    List<ExamProfile> findByLanguageAndActiveTrueOrderBySortOrderAscNameAsc(String language);

    @Query("select e from ExamProfile e where e.active = true and e.language = :language order by e.sortOrder asc, e.name asc")
    List<ExamProfile> findActiveByLanguage(String language);

    @Query("select distinct e.language from ExamProfile e where e.active = true order by e.language")
    List<String> findActiveLanguages();
}
