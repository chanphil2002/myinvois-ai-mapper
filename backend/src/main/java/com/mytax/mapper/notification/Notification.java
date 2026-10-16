package com.mytax.mapper.notification;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "notifications")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationType type;

    @Column(nullable = false)
    private String title;

    private String body;

    /** In-app route to open when the notification is clicked, e.g. /mapped-invoices/12. */
    private String link;

    @Column(name = "dedupe_key")
    private String dedupeKey;

    @Column(name = "read_at")
    private Instant readAt;

    @Column(name = "emailed_at")
    private Instant emailedAt;

    @Column(name = "created_at", updatable = false, insertable = false)
    private Instant createdAt;

    protected Notification() {
    }

    public Notification(Long userId, NotificationType type, String title, String body, String link, String dedupeKey) {
        this.userId = userId;
        this.type = type;
        this.title = title;
        this.body = body;
        this.link = link;
        this.dedupeKey = dedupeKey;
    }

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public NotificationType getType() { return type; }
    public String getTitle() { return title; }
    public String getBody() { return body; }
    public String getLink() { return link; }
    public String getDedupeKey() { return dedupeKey; }
    public Instant getReadAt() { return readAt; }
    public void setReadAt(Instant readAt) { this.readAt = readAt; }
    public Instant getEmailedAt() { return emailedAt; }
    public void setEmailedAt(Instant emailedAt) { this.emailedAt = emailedAt; }
    public Instant getCreatedAt() { return createdAt; }
}
