/*
  # Update position column to use integer type

  1. Changes
    - Modify the position column in players table to use integer type
    - Add check constraint to ensure valid position values (1-5)
    - Update existing position values to new numeric format

  2. Position Values
    - 1: Position nicht gewählt
    - 2: Stürmer*in
    - 3: Center*in
    - 4: Verteidiger*in
    - 5: Goali
*/

-- First, update existing values to their numeric equivalents
UPDATE players
SET position = CASE position
  WHEN '' THEN '1'
  WHEN 'stuermer' THEN '2'
  WHEN 'center' THEN '3'
  WHEN 'verteidiger' THEN '4'
  ELSE '1'
END;

-- Alter the column type to integer
ALTER TABLE players
ALTER COLUMN position TYPE integer
USING position::integer;

-- Add check constraint to ensure valid position values
ALTER TABLE players
ADD CONSTRAINT valid_position_values
CHECK (position >= 1 AND position <= 5);