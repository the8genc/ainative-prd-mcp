-- 002_refresh_token_family.sql — group refresh tokens into rotation families so a
-- replayed (already-rotated) refresh token can revoke the whole family (reuse detection).

ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS family_id uuid NOT NULL DEFAULT gen_random_uuid();
CREATE INDEX IF NOT EXISTS refresh_tokens_family_idx ON refresh_tokens (family_id);
