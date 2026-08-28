package com.certificategenerator.mail;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * The default {@link MailSender}, active in dev and in every test unless {@code app.mail.provider}
 * is explicitly set to {@code smtp}: writes the message to the log instead of transmitting it, so
 * the whole password-reset flow is exercisable without an SMTP account and no test depends on a
 * network round trip. See design.md "The mail abstraction and the development default".
 */
@Component
@ConditionalOnProperty(prefix = "app.mail", name = "provider", havingValue = "logging", matchIfMissing = true)
public class LoggingMailSender implements MailSender {

    private static final Logger log = LoggerFactory.getLogger(LoggingMailSender.class);

    @Override
    public void send(String to, String subject, String htmlBody) {
        log.info("Would send email to {} with subject \"{}\":\n{}", to, subject, htmlBody);
    }
}
