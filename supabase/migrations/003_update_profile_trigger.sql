-- Migration to update the profile creation trigger to handle new display_name format
-- This extracts full name from the "Full Name,RegNo" format in display_name

-- Update the trigger function to handle the new format
create or replace function public.handle_new_user()
returns trigger as $$
declare
  extracted_full_name text := '';
  display_name_parts text[];
begin
  -- Try to extract full name from display_name (format: "Full Name,RegNo")
  if new.raw_user_meta_data->>'display_name' is not null then
    display_name_parts := string_to_array(new.raw_user_meta_data->>'display_name', ',');
    if array_length(display_name_parts, 1) >= 2 then
      extracted_full_name := trim(display_name_parts[1]);
    end if;
  end if;
  
  -- Fallback to other name fields if extraction failed
  if extracted_full_name = '' then
    extracted_full_name := coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      ''
    );
  end if;
  
  insert into public.profiles (id, full_name, role)
  values (
    new.id, 
    extracted_full_name,
    coalesce(new.raw_user_meta_data->>'role', 'student')
  )
  on conflict (id) do update set
    full_name = excluded.full_name;
    
  return new;
end;
$$ language plpgsql security definer;

-- The trigger already exists, so no need to recreate it
-- drop trigger if exists on_auth_user_created on auth.users;
-- create trigger on_auth_user_created
--   after insert on auth.users
--   for each row execute function public.handle_new_user();
