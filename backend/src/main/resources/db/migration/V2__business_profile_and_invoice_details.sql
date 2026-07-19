CREATE TABLE business_profiles (
    id                    BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id               BIGINT NOT NULL UNIQUE,
    registration_name     VARCHAR(255) NOT NULL,
    tin                   VARCHAR(50) NOT NULL,
    id_type               VARCHAR(20) NOT NULL DEFAULT 'NRIC',
    id_value              VARCHAR(50) NOT NULL,
    sst_registration      VARCHAR(50),
    ttx_registration      VARCHAR(50),
    msic_code             VARCHAR(10),
    msic_description      VARCHAR(255),
    address_line1         VARCHAR(255),
    address_line2         VARCHAR(255),
    city                  VARCHAR(100),
    postal_zone           VARCHAR(20),
    state_code            VARCHAR(10),
    country_code          VARCHAR(10) NOT NULL DEFAULT 'MYS',
    phone                 VARCHAR(50),
    email                 VARCHAR(255),
    created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_business_profiles_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB;

ALTER TABLE mapped_invoices
    ADD COLUMN buyer_id_type       VARCHAR(20),
    ADD COLUMN buyer_id_value      VARCHAR(50),
    ADD COLUMN buyer_sst           VARCHAR(50),
    ADD COLUMN buyer_address_line1 VARCHAR(255),
    ADD COLUMN buyer_address_line2 VARCHAR(255),
    ADD COLUMN buyer_city          VARCHAR(100),
    ADD COLUMN buyer_postal_zone   VARCHAR(20),
    ADD COLUMN buyer_state_code    VARCHAR(10),
    ADD COLUMN buyer_country_code  VARCHAR(10) DEFAULT 'MYS',
    ADD COLUMN buyer_phone         VARCHAR(50),
    ADD COLUMN buyer_email         VARCHAR(255),
    ADD COLUMN discount_total      DECIMAL(18,2);

ALTER TABLE mapped_invoice_line_items
    ADD COLUMN unit_code VARCHAR(10) NOT NULL DEFAULT 'C62';
