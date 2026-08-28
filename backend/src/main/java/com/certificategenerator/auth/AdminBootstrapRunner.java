package com.certificategenerator.auth;

import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Seeds the first {@code ADMIN} user from {@code ADMIN_BOOTSTRAP_EMAIL} /
 * {@code ADMIN_BOOTSTRAP_PASSWORD} when the {@code users} table is empty, so some account exists
 * for the very first login even before self-registration is enabled. No-op once any user exists
 * or either variable is unset, so it's safe to leave the variables set permanently.
 */
@Component
public class AdminBootstrapRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrapRunner.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final String bootstrapEmail;
    private final String bootstrapPassword;

    public AdminBootstrapRunner(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.admin-bootstrap.email:}") String bootstrapEmail,
            @Value("${app.admin-bootstrap.password:}") String bootstrapPassword) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.bootstrapEmail = bootstrapEmail;
        this.bootstrapPassword = bootstrapPassword;
    }

    @Override
    public void run(String... args) {
        if (!StringUtils.hasText(bootstrapEmail) || !StringUtils.hasText(bootstrapPassword)) {
            return;
        }
        if (userRepository.count() > 0) {
            return;
        }
        String normalizedEmail = bootstrapEmail.trim().toLowerCase(Locale.ROOT);
        User admin =
                new User(
                        normalizedEmail,
                        passwordEncoder.encode(bootstrapPassword),
                        "Administrator",
                        Role.ADMIN);
        userRepository.save(admin);
        log.info("Bootstrapped initial ADMIN user for {}", normalizedEmail);
    }
}
