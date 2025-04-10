/*
  # Create Teams and Players Schema

  1. New Tables
    - `teams`
      - `id` (text, primary key)
      - `name` (text)
      - `created_at` (timestamp)
      - `user_id` (uuid, references auth.users)
    - `players`
      - `id` (uuid, primary key)
      - `team_id` (text, references teams)
      - `first_name` (text)
      - `last_name` (text)
      - `position` (text)
      - `jersey_number` (integer)
      - `birth_date` (date)
      - `created_at` (timestamp)
  
  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own teams and players
*/

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create players table
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id TEXT REFERENCES teams(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  position TEXT,
  jersey_number INTEGER,
  birth_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- Create policies for teams
CREATE POLICY "Users can manage their own teams"
  ON teams
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for players
CREATE POLICY "Users can manage players in their teams"
  ON players
  FOR ALL
  TO authenticated
  USING (
    team_id IN (
      SELECT id FROM teams 
      WHERE user_id = auth.uid()
    )
  );