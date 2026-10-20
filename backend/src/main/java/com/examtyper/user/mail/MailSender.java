package com.examtyper.user.mail;

/**
 * Sends transactional email.
 *
 * <p>The interface exists so that a real SMTP transport can be plugged in later
 * without touching the services that send mail. The default implementation
 * writes to the log, so the application runs with no external service and no
 * credentials.
 */
public interface MailSender {

    /**
     * Sends a plain-text email.
     *
     * @param to      recipient address
     * @param subject subject line
     * @param body    message body
     */
    void send(String to, String subject, String body);

    /**
     * Sends an HTML email.
     */
    default void sendHtml(String to, String subject, String htmlBody) {
        send(to, subject, htmlBody);
    }
}
