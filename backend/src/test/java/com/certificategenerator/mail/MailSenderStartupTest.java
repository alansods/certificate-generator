package com.certificategenerator.mail;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

/**
 * A slice-level equivalent of "the app fails to start when a mail-sending profile is missing
 * required properties" — cheaper and more precise than a full {@code @SpringBootTest}, since only
 * this package's two beans are under test. {@link SmtpMailSenderTest} exercises the same guarantee
 * directly against the constructor; this proves it holds when Spring itself does the wiring
 * (property binding, {@code @ConditionalOnProperty} bean selection, and all).
 */
class MailSenderStartupTest {

    private final ApplicationContextRunner contextRunner =
            new ApplicationContextRunner().withUserConfiguration(LoggingMailSender.class, SmtpMailSender.class);

    @Test
    void loggingProviderStartsWithNoOtherPropertiesSet() {
        contextRunner
                .withPropertyValues("app.mail.provider=logging")
                .run(context -> assertThat(context).hasSingleBean(LoggingMailSender.class));
    }

    @Test
    void smtpProviderFailsToStartWhenNoOtherPropertiesAreSet() {
        contextRunner
                .withPropertyValues("app.mail.provider=smtp")
                .run(context -> assertThat(context).hasFailed());
    }

    @Test
    void smtpProviderStartsWhenEveryPropertyIsSet() {
        contextRunner
                .withPropertyValues(
                        "app.mail.provider=smtp",
                        "app.mail.from=noreply@example.com",
                        "app.mail.host=smtp.example.com",
                        "app.mail.port=587",
                        "app.mail.username=user",
                        "app.mail.password=pass")
                .run(context -> assertThat(context).hasSingleBean(SmtpMailSender.class));
    }
}
