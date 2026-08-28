package com.certificategenerator.auth.reset;

import com.certificategenerator.auth.User;
import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    /** Called before issuing a new token, per design.md ("the newest link in the inbox is always
     * the one that works"): deleted, not marked used, since these were never actually redeemed. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM PasswordResetToken t WHERE t.user = :user AND t.usedAt IS NULL")
    void deleteUnusedForUser(@Param("user") User user);

    /**
     * Atomically claims a token: the conditional {@code usedAt IS NULL} in the WHERE clause makes
     * this a single-statement check-and-set, so two concurrent requests racing on the same valid
     * token cannot both succeed (a plain check-then-set across two statements would allow that
     * under READ COMMITTED). Returns 0 if the token was already used (or doesn't exist) by the
     * time this runs.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE PasswordResetToken t SET t.usedAt = :now WHERE t.id = :id AND t.usedAt IS NULL")
    int markUsedIfUnused(@Param("id") Long id, @Param("now") Instant now);
}
