/*
  # Add generate_uuid function
  
  1. New Functions
    - `generate_uuid`: A function that generates a UUID using the built-in gen_random_uuid()
  
  2. Purpose
    - Provides a secure way to generate UUIDs for team IDs
    - Ensures uniqueness of team IDs
*/

create or replace function generate_uuid()
returns table (id text)
language plpgsql
security definer
as $$
begin
  return query select gen_random_uuid()::text;
end;
$$;