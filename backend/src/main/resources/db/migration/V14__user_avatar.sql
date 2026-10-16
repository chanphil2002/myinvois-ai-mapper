-- Profile photo: a small, already-cropped square image stored as a data URL (≈ 15–60 KB).
ALTER TABLE users ADD COLUMN avatar MEDIUMTEXT NULL;
