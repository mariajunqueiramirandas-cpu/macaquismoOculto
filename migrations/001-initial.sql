CREATE TABLE event (
  id smallint PRIMARY KEY CHECK (id = 1),
  state text NOT NULL DEFAULT 'draft' CHECK (state IN ('draft', 'drawn', 'published', 'closed')),
  exchange_date date,
  location text NOT NULL DEFAULT '',
  budget_cents integer CHECK (budget_cents BETWEEN 0 AND 1000000)
);

INSERT INTO event (id) VALUES (1);

CREATE TABLE participant (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  avatar smallint NOT NULL CHECK (avatar BETWEEN 0 AND 15),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX participant_name_unique ON participant (lower(name));

CREATE TABLE exclusion (
  giver_id uuid NOT NULL REFERENCES participant(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES participant(id) ON DELETE CASCADE,
  PRIMARY KEY (giver_id, recipient_id),
  CHECK (giver_id <> recipient_id)
);

CREATE TABLE assignment (
  giver_id uuid PRIMARY KEY REFERENCES participant(id),
  recipient_id uuid NOT NULL UNIQUE REFERENCES participant(id),
  code_digest text UNIQUE,
  code_version integer NOT NULL DEFAULT 0,
  revealed_at timestamptz,
  CHECK (giver_id <> recipient_id)
);

CREATE TABLE admin_account (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'admin'))
);

CREATE UNIQUE INDEX admin_single_owner ON admin_account (role) WHERE role = 'owner';

CREATE TABLE admin_invitation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  token_digest text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL
);

CREATE TABLE admin_session (
  token_digest text PRIMARY KEY,
  admin_id uuid NOT NULL REFERENCES admin_account(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);

CREATE INDEX admin_session_admin ON admin_session (admin_id);
CREATE INDEX admin_session_expires ON admin_session (expires_at);

CREATE TABLE rate_limit (
  scope_digest text PRIMARY KEY,
  attempts integer NOT NULL,
  expires_at timestamptz NOT NULL
);

CREATE INDEX rate_limit_expires ON rate_limit (expires_at);
