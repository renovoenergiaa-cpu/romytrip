-- Supabase Schema for Local Events
-- Execute this script in your Supabase SQL Editor

-- 1. Create local_events table
CREATE TABLE IF NOT EXISTS public.local_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  location_name TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  icon TEXT DEFAULT '📍',
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for local_events
ALTER TABLE public.local_events ENABLE ROW LEVEL SECURITY;

-- 2. Create event_requests table
CREATE TABLE IF NOT EXISTS public.event_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.local_events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(event_id, user_id)
);

-- Enable RLS for event_requests
ALTER TABLE public.event_requests ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for local_events
-- Anyone can read public events
CREATE POLICY "Public events are viewable by everyone."
  ON public.local_events FOR SELECT
  USING (is_public = true);

-- Users can read their own private events
CREATE POLICY "Users can view their own private events."
  ON public.local_events FOR SELECT
  USING (auth.uid() = user_id);

-- Authenticated users can create events
CREATE POLICY "Users can insert their own events."
  ON public.local_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own events
CREATE POLICY "Users can update their own events."
  ON public.local_events FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own events
CREATE POLICY "Users can delete their own events."
  ON public.local_events FOR DELETE
  USING (auth.uid() = user_id);

-- 4. RLS Policies for event_requests
-- Event creators can see requests for their events
CREATE POLICY "Event creators can view requests for their events."
  ON public.event_requests FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.local_events WHERE id = event_id
    )
  );

-- Users can see their own requests
CREATE POLICY "Users can view their own requests."
  ON public.event_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Authenticated users can request to join
CREATE POLICY "Users can insert their own requests."
  ON public.event_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only event creators can update request status (accept/reject)
CREATE POLICY "Only event creators can update request status."
  ON public.event_requests FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.local_events WHERE id = event_id
    )
  );

-- Users can delete their own requests (cancel request)
CREATE POLICY "Users can delete their own requests."
  ON public.event_requests FOR DELETE
  USING (auth.uid() = user_id);

