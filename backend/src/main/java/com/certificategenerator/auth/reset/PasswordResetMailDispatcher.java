package com.certificategenerator.auth.reset;

import com.certificategenerator.mail.MailSender;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

/**
 * Sends the reset email off the request thread, so a mail-provider outage or a slow SMTP
 * round trip never delays or changes the response to POST /auth/forgot-password — see
 * design.md "Always answering 202". Must be a separate bean from PasswordResetService: an
 * @Async method only runs asynchronously when called through the Spring proxy, which a
 * same-class (self-invoked) call bypasses entirely.
 */
@Component
public class PasswordResetMailDispatcher {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetMailDispatcher.class);

    private final MailSender mailSender;
    private final TemplateEngine templateEngine;

    public PasswordResetMailDispatcher(MailSender mailSender, TemplateEngine templateEngine) {
        this.mailSender = mailSender;
        this.templateEngine = templateEngine;
    }

    @Async
    public void dispatch(String email, String resetLink) {
        try {
            Context context = new Context();
            context.setVariable("resetLink", resetLink);
            String htmlBody = templateEngine.process("mail/password-reset", context);
            mailSender.send(email, "Reset your Certificate Generator password", htmlBody);
        } catch (Exception e) {
            // Never lets a mail failure propagate — the caller already got 202. Logged at
            // warn, not error: a transient provider issue here is expected occasionally and
            // isn't an application bug.
            log.warn("Failed to send password reset email", e);
        }
    }
}
