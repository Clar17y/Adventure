-- Refresh JWTs can exceed 255 chars depending on claims and username length.
-- Store tokens as TEXT to avoid truncation/overflow (P2000) during auth flows.
ALTER TABLE "refresh_tokens"
ALTER COLUMN "token" TYPE TEXT;
