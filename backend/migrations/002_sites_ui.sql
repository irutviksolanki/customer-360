-- Apply once after 001 as the gcc360 role. Existing records are preserved.
ALTER TABLE customers ADD COLUMN ui jsonb NOT NULL DEFAULT '{}';
ALTER TABLE meetings ADD COLUMN ui jsonb NOT NULL DEFAULT '{}';
ALTER TABLE actions ADD COLUMN ui jsonb NOT NULL DEFAULT '{}';
CREATE TABLE workspace_events (id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES users(id), customer_id uuid NOT NULL REFERENCES customers(id), event text NOT NULL, note text NOT NULL, created_on date NOT NULL DEFAULT CURRENT_DATE);
ALTER TABLE workspace_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_events FORCE ROW LEVEL SECURITY;
CREATE POLICY ownership ON workspace_events USING(owner_id=nullif(current_setting('app.user_id',true),'')::uuid) WITH CHECK(owner_id=nullif(current_setting('app.user_id',true),'')::uuid AND EXISTS(SELECT 1 FROM customers WHERE id=customer_id));
CREATE TABLE evidence (id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES users(id), name text NOT NULL, content bytea NOT NULL CHECK(octet_length(content)<=5242880));
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence FORCE ROW LEVEL SECURITY;
CREATE POLICY ownership ON evidence USING(owner_id=nullif(current_setting('app.user_id',true),'')::uuid) WITH CHECK(owner_id=nullif(current_setting('app.user_id',true),'')::uuid);
