package com.examtyper.exam;

import com.examtyper.common.error.NotFoundException;
import com.examtyper.scoring.ScoringRules;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Reads and manages the data-driven exam rules.
 *
 * <p>Profile lists and single profiles are cached because they are read on every
 * test start but change only when an administrator edits them.
 */
@Service
public class ExamProfileService {

    public static final String CACHE_ALL = "examProfiles:all";
    public static final String CACHE_BY_CODE = "examProfiles:byCode";

    private final ExamProfileRepository repository;

    public ExamProfileService(ExamProfileRepository repository) {
        this.repository = repository;
    }

    @Cacheable(cacheNames = CACHE_ALL, unless = "#result.isEmpty()")
    @Transactional(readOnly = true)
    public List<ExamProfile> findAllActive() {
        return repository.findByActiveTrueOrderBySortOrderAscNameAsc();
    }

    @Cacheable(cacheNames = CACHE_BY_CODE, key = "#code", unless = "#result == null")
    @Transactional(readOnly = true)
    public ExamProfile findByCode(String code) {
        return repository.findByCode(code)
                .orElseThrow(() -> NotFoundException.of("Exam profile", code));
    }

    @Cacheable(cacheNames = CACHE_BY_CODE, key = "#code", unless = "#result == null")
    @Transactional(readOnly = true)
    public ScoringRules rulesFor(String code) {
        return findByCode(code).toScoringRules();
    }

    @Cacheable(cacheNames = CACHE_ALL, unless = "#result.isEmpty()")
    @Transactional(readOnly = true)
    public List<ExamProfile> findByLanguage(String language) {
        return repository.findActiveByLanguage(language);
    }

    @Transactional(readOnly = true)
    public List<String> findActiveLanguages() {
        return repository.findActiveLanguages();
    }

    @CacheEvict(cacheNames = {CACHE_ALL, CACHE_BY_CODE}, allEntries = true)
    @Transactional
    public ExamProfile save(ExamProfile profile) {
        return repository.save(profile);
    }

    @CacheEvict(cacheNames = {CACHE_ALL, CACHE_BY_CODE}, allEntries = true)
    @Transactional
    public void delete(Long id) {
        repository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public boolean existsByCode(String code) {
        return repository.existsByCode(code);
    }
}
