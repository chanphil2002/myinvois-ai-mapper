package com.mytax.mapper.notification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

/**
 * Sends notification emails. Optional: if no SMTP server is configured ({@code spring.mail.host}),
 * Spring creates no {@link JavaMailSender} and emails are skipped (logged) — in-app notifications
 * still work.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final ObjectProvider<JavaMailSender> mailSender;
    private final String from;
    private final String appUrl;

    public EmailService(ObjectProvider<JavaMailSender> mailSender,
                        @Value("${app.mail.from:MyTax <no-reply@mytax.app>}") String from,
                        @Value("${app.public-url:http://localhost:5173}") String appUrl) {
        this.mailSender = mailSender;
        this.from = from;
        this.appUrl = appUrl.replaceAll("/+$", "");
    }

    public boolean isEnabled() {
        return mailSender.getIfAvailable() != null;
    }

    /** Fire-and-forget: never blocks or fails the request that triggered the notification. */
    @Async
    public void send(String to, String subject, String body, String link, Runnable onSent) {
        JavaMailSender sender = mailSender.getIfAvailable();
        if (sender == null || to == null || to.isBlank()) {
            log.debug("Email not sent (SMTP not configured): {}", subject);
            return;
        }
        try {
            var message = sender.createMimeMessage();
            var helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(from);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(html(subject, body, link), true);
            sender.send(message);
            if (onSent != null) {
                onSent.run();
            }
        } catch (Exception e) {
            log.warn("Could not send email '{}' to {}: {}", subject, to, e.getMessage());
        }
    }

    private String html(String subject, String body, String link) {
        String button = link == null ? "" : """
                <p style="margin:24px 0 0"><a href="%s" style="background:#047857;color:#fff;padding:10px 18px;
                border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">Open in MyTax</a></p>
                """.formatted(appUrl + link);
        return """
                <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:520px;margin:0 auto;
                padding:24px;color:#1c1c1a">
                  <div style="font-weight:700;font-size:18px;margin-bottom:16px">MyTax</div>
                  <h2 style="font-size:18px;margin:0 0 8px">%s</h2>
                  <p style="line-height:1.6;margin:0;color:#57534e">%s</p>
                  %s
                  <p style="font-size:12px;color:#78716c;margin-top:32px">You're receiving this because you have a
                  MyTax account. Manage alerts from the bell icon in the app.</p>
                </div>
                """.formatted(HtmlUtils.htmlEscape(subject), HtmlUtils.htmlEscape(body == null ? "" : body), button);
    }
}
