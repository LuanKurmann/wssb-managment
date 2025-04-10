export interface Team {
  id: string;
  name: string;
  created_at: string;
  user_id: string;
}

export interface Player {
  id: string;
  team_id: string;
  first_name: string;
  last_name: string;
  position: string | null;
  jersey_number: number | null;
  birth_date: string | null;
  created_at: string;
}