package com.certificategenerator.mail;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class SmtpMailSenderTest {

    @Test
    void throwsWhenFromIsBlank() {
        assertThatThrownBy(() -> new SmtpMailSender("", "smtp.example.com", 587, "user", "pass"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("app.mail.from");
    }

    @Test
    void throwsWhenHostIsBlank() {
        assertThatThrownBy(() -> new SmtpMailSender("from@example.com", "", 587, "user", "pass"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("app.mail.host");
    }

    @Test
    void throwsWhenUsernameIsBlank() {
        assertThatThrownBy(() -> new SmtpMailSender("from@example.com", "smtp.example.com", 587, "", "pass"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("app.mail.username");
    }

    @Test
    void throwsWhenPasswordIsBlank() {
        assertThatThrownBy(() -> new SmtpMailSender("from@example.com", "smtp.example.com", 587, "user", ""))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("app.mail.password");
    }

    @Test
    void throwsWhenPortIsNotPositive() {
        assertThatThrownBy(() -> new SmtpMailSender("from@example.com", "smtp.example.com", 0, "user", "pass"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("app.mail.port");
    }

    @Test
    void constructsSuccessfullyWhenEveryPropertyIsSet() {
        assertThatCode(() -> new SmtpMailSender("from@example.com", "smtp.example.com", 587, "user", "pass"))
                .doesNotThrowAnyException();
    }
}
