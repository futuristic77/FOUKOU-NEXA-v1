BEGIN;

ALTER TABLE schools
  ADD COLUMN address text NOT NULL DEFAULT '' CHECK (char_length(address) <= 240),
  ADD COLUMN phone text NOT NULL DEFAULT '' CHECK (char_length(phone) <= 40),
  ADD COLUMN email text NOT NULL DEFAULT '' CHECK (char_length(email) <= 254);

COMMIT;
