package com.certificategenerator.mail;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;

class LoggingMailSenderTest {

    private Logger logger;
    private ListAppender<ILoggingEvent> appender;

    @BeforeEach
    void attachAppender() {
        logger = (Logger) LoggerFactory.getLogger(LoggingMailSender.class);
        appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
    }

    @AfterEach
    void detachAppender() {
        logger.detachAppender(appender);
    }

    @Test
    void neverThrowsAndTransmitsNothing() {
        assertThatCode(() -> new LoggingMailSender().send("someone@example.com", "Subject", "<p>body</p>"))
                .doesNotThrowAnyException();
    }

    @Test
    void writesTheLinkAndSubjectToTheApplicationLog() {
        // Proves design.md's "Development" scenario ("the reset link is written to the
        // application log"), rather than only asserting the call doesn't throw.
        new LoggingMailSender()
                .send(
                        "someone@example.com",
                        "Reset your Certificate Generator password",
                        "<a href=\"https://app.example.com/reset-password?token=abc123\">Reset</a>");

        assertThat(appender.list).hasSize(1);
        String message = appender.list.get(0).getFormattedMessage();
        assertThat(message).contains("someone@example.com");
        assertThat(message).contains("Reset your Certificate Generator password");
        assertThat(message).contains("https://app.example.com/reset-password?token=abc123");
    }
}
