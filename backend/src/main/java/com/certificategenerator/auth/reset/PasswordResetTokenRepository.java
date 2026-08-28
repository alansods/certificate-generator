package com.certificategenerator.auth.reset;

import com.certificategenerator.auth.User;
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
}
