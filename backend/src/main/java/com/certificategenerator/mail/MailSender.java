package com.certificategenerator.mail;

/** Sends transactional email. See {@link LoggingMailSender} and {@link SmtpMailSender}. */
public interface MailSender {

    void send(String to, String subject, String htmlBody);
}
