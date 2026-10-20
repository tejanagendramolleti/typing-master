package com.examtyper.user;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    Page<User> findByRole(Role role, Pageable pageable);

    long countByRoleAndCreatedAtAfter(Role role, Instant since);

    long countByCreatedAtAfter(Instant since);

    @Query("select count(u) from User u where u.lastLoginAt is not null and u.lastLoginAt > :since")
    long countActiveSince(Instant since);

    @Query("select u from User u where u.role = com.examtyper.user.Role.ADMIN order by u.createdAt asc")
    List<User> findAdmins();
}
