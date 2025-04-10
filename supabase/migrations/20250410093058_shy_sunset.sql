/*
  # Add unique constraint for team names
  
  1. Changes
    - Add unique constraint to teams.name column
    - Ensures no two teams can have the same name
*/

ALTER TABLE teams ADD CONSTRAINT teams_name_key UNIQUE (name);