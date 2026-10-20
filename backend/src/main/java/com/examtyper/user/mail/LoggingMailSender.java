package com.examtyper.user.mail;

import com.examtyper.common.config.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * The default mail transport: writes the message to the log.
 *
 * <p>Enabled unless {@code app.mail.mode} is set to something else, so the
 * application works out of the box with no SMTP server and no API keys.
 */
@Component
@ConditionalOnProperty(name = "app.mail.mode", havingValue = "console", matchIfMissing = true)
public class LoggingMailSender implements MailSender {

    private static final Logger log = LoggerFactory.getLogger(LoggingMailSender.class);

    private final AppProperties props;

    public LoggingMailSender(AppProperties props) {
        this.props = props;
    }

    @Override
    public void send(String to, String subject, String body) {
        log.info("""

                ----------------------------------------------------------------
                MAIL (console transport)
                To:      {}
                From:    {}
                Subject: {}
                ----------------------------------------------------------------
                {}
                ----------------------------------------------------------------
                """, to, props.getMail().getFrom(), subject, body);
    }
}
