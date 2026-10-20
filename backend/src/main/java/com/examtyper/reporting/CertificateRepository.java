package com.examtyper.reporting;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CertificateRepository extends JpaRepository<Certificate, Long> {

    Optional<Certificate> findByCertificateNo(String certificateNo);

    Optional<Certificate> findByAttemptId(Long attemptId);

    List<Certificate> findByUserIdOrderByIssuedAtDesc(Long userId);
}
