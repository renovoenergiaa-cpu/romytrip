-- Communities
CREATE TABLE IF NOT EXISTS public.communities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  type text NOT NULL, -- 'Temporária', 'Privada', 'Pública', 'Internacional'
  location text,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  color text DEFAULT '#A855F7',
  bg_color text DEFAULT '#F3E8FF',
  description text,
  created_by uuid REFERENCES public.users(id),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  group_chat_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL
);

-- Community Members
CREATE TABLE IF NOT EXISTS public.community_members (
  community_id uuid REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  role text DEFAULT 'member', -- 'admin', 'member'
  joined_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (community_id, user_id)
);

-- Community Posts
CREATE TABLE IF NOT EXISTS public.community_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id uuid REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  content text,
  media_url text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Turn on RLS
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

-- Policies for communities
-- Anyone can see public and international communities, or communities they are a member of
CREATE POLICY "View communities" ON public.communities
  FOR SELECT USING (
    type IN ('Pública', 'Internacional', 'Temporária')
    OR EXISTS (SELECT 1 FROM public.community_members WHERE community_id = communities.id AND user_id = auth.uid())
  );

-- Only authenticated users can insert communities
CREATE POLICY "Insert communities" ON public.communities
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Policies for community_members
-- Anyone can see members of a community they can see
CREATE POLICY "View community members" ON public.community_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.communities WHERE id = community_members.community_id)
  );

-- Users can join communities
CREATE POLICY "Insert community members" ON public.community_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for community_posts
-- Users can view posts of public communities or communities they are members of
CREATE POLICY "View community posts" ON public.community_posts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.communities WHERE id = community_posts.community_id AND type IN ('Pública', 'Internacional', 'Temporária'))
    OR EXISTS (SELECT 1 FROM public.community_members WHERE community_id = community_posts.community_id AND user_id = auth.uid())
  );

-- Users can insert posts in communities they are members of
CREATE POLICY "Insert community posts" ON public.community_posts
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND 
    EXISTS (SELECT 1 FROM public.community_members WHERE community_id = community_posts.community_id AND user_id = auth.uid())
  );
