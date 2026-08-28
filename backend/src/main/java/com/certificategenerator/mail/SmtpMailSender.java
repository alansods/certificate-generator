package com.certificategenerator.mail;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

/**
 * Active only when {@code app.mail.provider=smtp}. Reads its own {@code app.mail.*} properties
 * rather than relying on Spring Boot's {@code spring.mail.*} auto-configuration, so a production
 * deployment missing any of them fails at startup with a message naming exactly what's missing,
 * per docs/PLAN.md and design.md "The mail abstraction and the development default" — an app that
 * silently falls back to logging reset links in production instead of sending them is worse than
 * one that refuses to start.
 */
@Component
@ConditionalOnProperty(prefix = "app.mail", name = "provider", havingValue = "smtp")
public class SmtpMailSender implements MailSender {

    private final JavaMailSenderImpl javaMailSender;
    private final String from;

    public SmtpMailSender(
            @Value("${app.mail.from:}") String from,
            @Value("${app.mail.host:}") String host,
            @Value("${app.mail.port:0}") int port,
            @Value("${app.mail.username:}") String username,
            @Value("${app.mail.password:}") String password) {
        requireNonBlank(from, "app.mail.from (APP_MAIL_FROM)");
        requireNonBlank(host, "app.mail.host (APP_MAIL_HOST)");
        requireNonBlank(username, "app.mail.username (APP_MAIL_USERNAME)");
        requireNonBlank(password, "app.mail.password (APP_MAIL_PASSWORD)");
        if (port <= 0) {
            throw new IllegalStateException(
                    "app.mail.port (APP_MAIL_PORT) must be set to a positive port number when"
                            + " app.mail.provider=smtp");
        }
        this.from = from;
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(host);
        sender.setPort(port);
        sender.setUsername(username);
        sender.setPassword(password);
        sender.getJavaMailProperties().put("mail.smtp.auth", "true");
        sender.getJavaMailProperties().put("mail.smtp.starttls.enable", "true");
        this.javaMailSender = sender;
    }

    @Override
    public void send(String to, String subject, String htmlBody) {
        MimeMessage message = javaMailSender.createMimeMessage();
        try {
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(from);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
        } catch (MessagingException e) {
            throw new IllegalStateException("Failed to build the reset email message", e);
        }
        javaMailSender.send(message);
    }

    private static void requireNonBlank(String value, String propertyDescription) {
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(
                    propertyDescription + " must be set when app.mail.provider=smtp");
        }
    }
}
