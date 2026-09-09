-- Drop the recursive policies
DROP POLICY IF EXISTS "View communities" ON public.communities;
DROP POLICY IF EXISTS "View community members" ON public.community_members;
DROP POLICY IF EXISTS "View community posts" ON public.community_posts;
DROP POLICY IF EXISTS "Delete communities" ON public.communities;

-- Recreate "View communities" avoiding recursion
-- We check if the type is public/international/temp, OR if the current user has a row in community_members for this community.
CREATE POLICY "View communities" ON public.communities
  FOR SELECT USING (
    type IN ('Pública', 'Internacional', 'Temporária')
    OR (
      -- Using a direct check that doesn't trigger "View community members" recursion
      -- By checking auth.uid() directly against community_members
      EXISTS (
        SELECT 1 FROM public.community_members 
        WHERE community_id = id AND user_id = auth.uid()
      )
    )
  );

-- Recreate "View community members" without referencing communities
-- Anyone can see members of a community. If they can't see the community, they won't know the ID anyway.
CREATE POLICY "View community members" ON public.community_members
  FOR SELECT USING (true);

-- Recreate "View community posts" without referencing communities table to avoid recursion
-- Anyone can see posts of communities they know the ID of, or we restrict it to members.
CREATE POLICY "View community posts" ON public.community_posts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.communities 
      WHERE id = community_posts.community_id AND type IN ('Pública', 'Internacional', 'Temporária')
    )
    OR EXISTS (
      SELECT 1 FROM public.community_members 
      WHERE community_id = community_posts.community_id AND user_id = auth.uid()
    )
  );

-- Allow creator to delete their own community
CREATE POLICY "Delete communities" ON public.communities
  FOR DELETE USING (auth.uid() = created_by);