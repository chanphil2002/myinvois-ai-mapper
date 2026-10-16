-- Columns filled by MySQL's CURRENT_TIMESTAMP default were stored in the server's local time zone
-- (e.g. +08:00), while the app reads every timestamp as UTC — so they showed 8 hours off. From now
-- on the JDBC session runs in UTC (connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true),
-- and this converts the existing rows. On a server already in UTC, CONVERT_TZ is a no-op.

UPDATE users                 SET created_at  = CONVERT_TZ(created_at,  'SYSTEM', '+00:00');
UPDATE myinvois_credentials  SET created_at  = CONVERT_TZ(created_at,  'SYSTEM', '+00:00');
UPDATE documents             SET uploaded_at = CONVERT_TZ(uploaded_at, 'SYSTEM', '+00:00');
UPDATE mapped_invoices       SET created_at  = CONVERT_TZ(created_at,  'SYSTEM', '+00:00');
UPDATE sales_transactions    SET created_at  = CONVERT_TZ(created_at,  'SYSTEM', '+00:00');
UPDATE consolidated_invoices SET created_at  = CONVERT_TZ(created_at,  'SYSTEM', '+00:00');
UPDATE ai_usage_events       SET created_at  = CONVERT_TZ(created_at,  'SYSTEM', '+00:00');
UPDATE audit_log             SET created_at  = CONVERT_TZ(created_at,  'SYSTEM', '+00:00');
UPDATE business_profiles     SET created_at  = CONVERT_TZ(created_at,  'SYSTEM', '+00:00'),
                                 updated_at  = CONVERT_TZ(updated_at,  'SYSTEM', '+00:00');
UPDATE support_messages      SET created_at  = CONVERT_TZ(created_at,  'SYSTEM', '+00:00');
UPDATE subscriptions         SET created_at  = CONVERT_TZ(created_at,  'SYSTEM', '+00:00');
UPDATE notifications         SET created_at  = CONVERT_TZ(created_at,  'SYSTEM', '+00:00');
