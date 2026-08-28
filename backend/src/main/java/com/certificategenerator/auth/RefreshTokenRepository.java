package com.certificategenerator.auth;

import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(
            "UPDATE RefreshToken t SET t.revokedAt = :now WHERE t.user = :user AND t.revokedAt IS"
                    + " NULL")
    void revokeAllForUser(@Param("user") User user, @Param("now") Instant now);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(
            "UPDATE RefreshToken t SET t.revokedAt = :now WHERE t.user = :user AND t.tokenHash <>"
                    + " :keptTokenHash AND t.revokedAt IS NULL")
    void revokeAllForUserExceptTokenHash(
            @Param("user") User user,
            @Param("keptTokenHash") String keptTokenHash,
            @Param("now") Instant now);
}
