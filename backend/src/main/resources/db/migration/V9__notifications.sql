-- In-app (+ email) notifications, plus the fields the reminder jobs need.

CREATE TABLE notifications (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT        NOT NULL,
    type        VARCHAR(40)   NOT NULL,
    title       VARCHAR(200)  NOT NULL,
    body        VARCHAR(1000),
    link        VARCHAR(255),
    -- One notification per (user, event): reminder jobs re-run safely without duplicates.
    dedupe_key  VARCHAR(150),
    read_at     DATETIME NULL,
    emailed_at  DATETIME NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT uk_notifications_dedupe UNIQUE (user_id, dedupe_key),
    INDEX idx_notifications_user_created (user_id, created_at)
) ENGINE=InnoDB;

-- When LHDN first reported the document Valid (start of the 72-hour cancellation window).
ALTER TABLE submissions ADD COLUMN validated_at DATETIME NULL;
UPDATE submissions SET validated_at = status_updated_at WHERE status = 'VALID';

-- Subscriptions now have an end date and an auto-renew flag (expiry reminders, Stripe renewals).
ALTER TABLE subscriptions
    ADD COLUMN period_end DATETIME NULL,
    ADD COLUMN auto_renew BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE subscriptions SET period_end = DATE_ADD(paid_at, INTERVAL 1 MONTH) WHERE paid_at IS NOT NULL;
