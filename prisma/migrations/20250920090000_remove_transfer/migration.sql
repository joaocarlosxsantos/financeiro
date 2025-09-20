-- Placeholder migration: 20250920090000_remove_transfer
-- This migration removes the Transfer table from the schema.
-- The table was removed from the database directly at the user's request; this placeholder records that the migration's effects are already applied.

DROP TABLE IF EXISTS public."Transfer" CASCADE;
