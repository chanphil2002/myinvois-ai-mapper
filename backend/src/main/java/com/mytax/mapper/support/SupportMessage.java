package com.mytax.mapper.support;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

/** A contact-us / support message submitted from the app. */
@Entity
@Table(name = "support_messages")
public class SupportMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private Long userId;

    @Column(nullable = false)
    private String email;

    @Column(nullable = false)
    private String subject;

    @Column(nullable = false)
    private String body;

    @Column(name = "created_at", updatable = false, insertable = false)
    private Instant createdAt;

    protected SupportMessage() {
    }

    public SupportMessage(Long userId, String email, String subject, String body) {
        this.userId = userId;
        this.email = email;
        this.subject = subject;
        this.body = body;
    }

    public Long getId() {
        return id;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
