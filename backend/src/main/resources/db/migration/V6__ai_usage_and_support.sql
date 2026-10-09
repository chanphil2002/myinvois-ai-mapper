-- One row per successful AI parse, so usage/credits are tracked and persisted
-- server-side rather than inferred on the client.
CREATE TABLE ai_usage_events (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT NOT NULL,
    operation   VARCHAR(30) NOT NULL,   -- MAPPING | EXTRACTION
    document_id BIGINT,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ai_usage_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB;

CREATE INDEX idx_ai_usage_user_created ON ai_usage_events (user_id, created_at);

-- Support / contact-us messages submitted from the app.
CREATE TABLE support_messages (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id    BIGINT,
    email      VARCHAR(255) NOT NULL,
    subject    VARCHAR(255) NOT NULL,
    body       TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_support_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB;
