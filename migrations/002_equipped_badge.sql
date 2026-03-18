-- Equipped Badge Migration
-- Run this in Supabase SQL Editor
-- Adds equipped_badge column to profiles table for PUBG-style title badge display

ALTER TABLE public.profiles
ADD COLUMN equipped_badge text DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.equipped_badge IS 'Achievement ID of the badge the user has equipped as their title';
