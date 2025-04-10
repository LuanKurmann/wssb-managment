/*
  # Fix position values in players table

  1. Changes
    - Update any null positions to 1 (Position nicht gewählt)
    - Ensure all positions are valid integers
*/

-- Update any null positions to 1 (Position nicht gewählt)
UPDATE players
SET position = 1
WHERE position IS NULL;

-- Ensure all positions are valid integers between 1 and 5
UPDATE players
SET position = 1
WHERE position NOT BETWEEN 1 AND 5;