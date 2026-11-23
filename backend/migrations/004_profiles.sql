CREATE TABLE user_profiles (
 owner_id uuid PRIMARY KEY REFERENCES users(id),
 designation text NOT NULL DEFAULT '',
 department text NOT NULL DEFAULT '',
 phone text NOT NULL DEFAULT '',
 location text NOT NULL DEFAULT '',
 updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles FORCE ROW LEVEL SECURITY;
CREATE POLICY ownership ON user_profiles
 USING(owner_id=nullif(current_setting('app.user_id',true),'')::uuid)
 WITH CHECK(owner_id=nullif(current_setting('app.user_id',true),'')::uuid);
