-- Enable PostGIS extension for geolocation
create extension if not exists postgis schema extensions;

-- Create Users Table
create table public.users (
  id uuid references auth.users on delete cascade not null primary key,
  email text unique not null,
  name text,
  dob date,
  city text,
  sex text,
  photos text[] default '{}',
  bio text,
  
  -- Trip info
  destination text,
  check_in date,
  check_out date,
  is_flexible boolean default false,
  companions text,
  
  -- Preferences & Styles (Stored as Arrays/JSON)
  travel_styles text[] default '{}',
  interests text[] default '{}',
  
  -- Social & Budget
  budget text,
  cost_split boolean default false,
  group_travel boolean default false,
  one_person boolean default false,
  invitations boolean default false,

  -- Geolocations and Status
  is_free boolean default false,
  last_location geography(POINT),
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)
alter table public.users enable row level security;

create policy "Users can view all profiles"
  on public.users for select
  using ( true );

create policy "Users can update own profile"
  on public.users for update
  using ( auth.uid() = id );

create policy "Users can insert own profile"
  on public.users for insert
  with check ( auth.uid() = id );

-- Function to handle new user signups
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.users (id, email, name, created_at)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', now());
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to automatically create profile on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
