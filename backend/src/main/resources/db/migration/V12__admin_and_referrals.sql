-- Admin console + salesperson referral programme.

ALTER TABLE users
    ADD COLUMN active           BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'false = blocked by an admin',
    ADD COLUMN referral_code_id BIGINT  NULL     COMMENT 'code used at sign-up (earns its salesperson commission)';

CREATE TABLE salespersons (
    id                 BIGINT AUTO_INCREMENT PRIMARY KEY,
    name               VARCHAR(150) NOT NULL,
    email              VARCHAR(255),
    phone              VARCHAR(50),
    -- Recurring commission: this % of every payment made by users they referred.
    commission_percent DECIMAL(5, 2) NOT NULL DEFAULT 10.00,
    active             BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE referral_codes (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    code           VARCHAR(40) NOT NULL UNIQUE,
    salesperson_id BIGINT      NOT NULL,
    active         BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at     DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_referral_codes_salesperson FOREIGN KEY (salesperson_id) REFERENCES salespersons (id)
) ENGINE=InnoDB;

ALTER TABLE users
    ADD CONSTRAINT fk_users_referral_code FOREIGN KEY (referral_code_id) REFERENCES referral_codes (id);

CREATE TABLE commissions (
    id                   BIGINT AUTO_INCREMENT PRIMARY KEY,
    salesperson_id       BIGINT        NOT NULL,
    user_id              BIGINT        NOT NULL,
    subscription_id      BIGINT        NULL,
    -- Provider payment id (Billplz bill / Stripe invoice) — one commission per payment.
    payment_ref          VARCHAR(120)  NOT NULL UNIQUE,
    payment_amount_cents INT           NOT NULL,
    percent              DECIMAL(5, 2) NOT NULL,
    amount_cents         INT           NOT NULL,
    status               VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
    paid_at              DATETIME      NULL,
    created_at           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_commissions_salesperson FOREIGN KEY (salesperson_id) REFERENCES salespersons (id),
    CONSTRAINT fk_commissions_user FOREIGN KEY (user_id) REFERENCES users (id),
    INDEX idx_commissions_status (status)
) ENGINE=InnoDB;
