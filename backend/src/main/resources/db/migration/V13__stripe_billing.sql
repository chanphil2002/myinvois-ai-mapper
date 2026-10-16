-- Payments move from Billplz (one-off FPX bills) to Stripe: FPX, cards and Apple Pay via Stripe
-- Checkout, plus auto-renewing subscriptions (cards / Apple Pay) via Stripe Billing.

ALTER TABLE users ADD COLUMN stripe_customer_id VARCHAR(255) NULL;

ALTER TABLE subscriptions
    ADD COLUMN provider                   VARCHAR(20)  NOT NULL DEFAULT 'BILLPLZ',
    ADD COLUMN stripe_checkout_session_id VARCHAR(255) NULL,
    ADD COLUMN stripe_subscription_id     VARCHAR(255) NULL,
    ADD INDEX idx_subscriptions_checkout (stripe_checkout_session_id),
    ADD INDEX idx_subscriptions_stripe_sub (stripe_subscription_id);

-- Every successful charge (first payment and each renewal) — the user's payment history.
CREATE TABLE payments (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT       NOT NULL,
    subscription_id BIGINT       NULL,
    provider        VARCHAR(20)  NOT NULL,
    -- Provider id (Stripe invoice / payment intent, Billplz bill) — one row per payment.
    provider_ref    VARCHAR(255) NOT NULL UNIQUE,
    amount_cents    INT          NOT NULL,
    description     VARCHAR(255),
    receipt_url     VARCHAR(500),
    paid_at         DATETIME     NOT NULL,
    CONSTRAINT fk_payments_user FOREIGN KEY (user_id) REFERENCES users (id),
    INDEX idx_payments_user (user_id, paid_at)
) ENGINE=InnoDB;

-- Carry over past Billplz payments so history isn't empty.
INSERT INTO payments (user_id, subscription_id, provider, provider_ref, amount_cents, description, paid_at)
SELECT user_id, id, 'BILLPLZ', CONCAT('billplz-', billplz_bill_id), amount_cents, CONCAT('MyTax ', plan, ' plan'), paid_at
FROM subscriptions
WHERE paid_at IS NOT NULL AND billplz_bill_id IS NOT NULL;
