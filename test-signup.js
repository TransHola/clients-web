require('dotenv').config({ path: '/Users/fathallahlahlou/Workspace/clients-web/.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ekzbskuqpirwwojflfbq.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVremJza3VxcGlyd3dvamZsZmJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNDU2NTUsImV4cCI6MjA4NjkyMTY1NX0.1a4y-lZW8Wwr2q9BQAWBTPDFJ6BWbFl-4TK5qbAsRhY'
);

async function signUp() {
  const { data, error } = await supabase.auth.signUp({
    email: 'usaclient@transhola.com',
    password: 'Password123!',
    options: {
      data: {
        first_name: 'John',
        last_name: 'Doe',
        country: 'USA'
      }
    }
  });
  console.log("Signup Response:", JSON.stringify({ data, error }, null, 2));
}

signUp();
