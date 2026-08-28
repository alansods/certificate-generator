package com.certificategenerator.mail;

import static org.assertj.core.api.Assertions.assertThatCode;

import org.junit.jupiter.api.Test;

class LoggingMailSenderTest {

    @Test
    void neverThrowsAndTransmitsNothing() {
        assertThatCode(() -> new LoggingMailSender().send("someone@example.com", "Subject", "<p>body</p>"))
                .doesNotThrowAnyException();
    }
}
