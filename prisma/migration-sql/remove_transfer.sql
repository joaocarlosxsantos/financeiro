-- Safe drop of Transfer table
-- This will remove the Transfer table if it exists. It uses IF EXISTS to avoid errors.
-- Note: this was generated to reflect local schema change where model Transfer was removed.

DROP TABLE IF EXISTS public."Transfer" CASCADE;
