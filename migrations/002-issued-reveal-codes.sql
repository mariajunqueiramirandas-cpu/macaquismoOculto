CREATE TABLE issued_reveal_code (
  digest text PRIMARY KEY
);

INSERT INTO issued_reveal_code (digest)
SELECT code_digest FROM assignment WHERE code_digest IS NOT NULL;
