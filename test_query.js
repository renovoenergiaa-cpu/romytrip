const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ybolfnlilxygcoaupygp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlib2xmbmxpbHh5Z2NvYXVweWdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MjUxMzYsImV4cCI6MjA5NDIwMTEzNn0.45x9ZGIFYohq5d0TIwvjQH6T0UG4KSqhDtHJRlSbupk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      users (
        name,
        photos,
        city,
        bio,
        travel_styles
      ),
      post_likes(count),
      comments(count)
    `)
    .limit(5);

  if (error) {
    console.error('ERROR:', error);
  } else {
    console.log('DATA:', JSON.stringify(data, null, 2));
  }
}

run();
