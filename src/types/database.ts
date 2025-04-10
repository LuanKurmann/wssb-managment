export interface Team {
  id: string;
  name: string;
  created_at: string;
  user_id: string;
}

export type Position = 1 | 2 | 3 | 4 | 5;

export interface Player {
  id: string;
  team_id: string;
  first_name: string;
  last_name: string;
  position: Position | null;
  jersey_number: number | null;
  birth_date: string | null;
  created_at: string;
}