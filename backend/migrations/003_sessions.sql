-- Per-device revocable sessions. Mobile sessions have no automatic expiry.
CREATE TABLE app_sessions (
 id uuid PRIMARY KEY,
 owner_id uuid NOT NULL REFERENCES users(id),
 client text NOT NULL CHECK(client IN ('web','mobile')),
 refresh_hash text,
 created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
 expires_at timestamptz,
 revoked_at timestamptz,
 CHECK((client='web' AND expires_at IS NOT NULL AND refresh_hash IS NULL)
    OR (client='mobile' AND expires_at IS NULL AND refresh_hash IS NOT NULL))
);
CREATE INDEX app_sessions_owner ON app_sessions(owner_id);
ALTER TABLE app_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_sessions FORCE ROW LEVEL SECURITY;
CREATE POLICY ownership ON app_sessions
 USING(owner_id=nullif(current_setting('app.user_id',true),'')::uuid)
 WITH CHECK(owner_id=nullif(current_setting('app.user_id',true),'')::uuid);
