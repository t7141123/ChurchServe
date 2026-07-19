-- Migration: Add missing columns and fix schema drift
ALTER TABLE ServiceItems ADD COLUMN category TEXT DEFAULT '';
ALTER TABLE Groups ADD COLUMN is_active INTEGER DEFAULT 1;
