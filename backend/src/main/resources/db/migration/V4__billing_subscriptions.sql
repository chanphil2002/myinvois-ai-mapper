-- Billing / subscriptions. A subscription row is created when a user starts checkout (status
-- PENDING + a Billplz bill id); the Billplz callback flips it to ACTIVE once paid. Only one ACTIVE
-- subscription per user at a time (older ones are marked CANCELLED when a new one activates).
CREATE TABLE subscriptions (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id          BIGINT NOT NULL,
    plan             VARCHAR(30) NOT NULL,
    status           VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    billplz_bill_id  VARCHAR(64),
    amount_cents     INT NOT NULL,
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    paid_at          DATETIME,
    CONSTRAINT fk_subscriptions_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB;

CREATE INDEX idx_subscriptions_user ON subscriptions (user_id);
CREATE INDEX idx_subscriptions_bill ON subscriptions (billplz_bill_id);
