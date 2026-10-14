-- One MyInvois credential set per environment (sandbox + production) instead of one per user,
-- an explicit "active" environment per user, and the environment each submission went to
-- (so a status refresh queries the same LHDN environment even after the user switches).

ALTER TABLE myinvois_credentials
    ADD CONSTRAINT uk_myinvois_credentials_user_env UNIQUE (user_id, environment);

ALTER TABLE users
    ADD COLUMN myinvois_environment VARCHAR(20) NOT NULL DEFAULT 'SANDBOX';

-- Keep today's behaviour: whichever environment the user's single credential was saved under.
UPDATE users u
    JOIN myinvois_credentials c ON c.user_id = u.id
SET u.myinvois_environment = c.environment;

-- Every submission before this migration went to the preprod URLs (the only ones configured).
ALTER TABLE submissions
    ADD COLUMN environment VARCHAR(20) NOT NULL DEFAULT 'SANDBOX';
