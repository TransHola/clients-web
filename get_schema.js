const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  if (line && !line.startsWith('#')) {
    const [k, ...v] = line.split('=');
    if (k) env[k.trim()] = v.join('=').trim();
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('bookings').select('*').limit(1);
  console.log("Bookings columns:", data ? Object.keys(data[0]) : error);
  
  const { data: d2, error: e2 } = await supabase.from('bookings').select('booking_details').limit(5);
  console.log("booking_details samples:", JSON.stringify(d2, null, 2));
}

run();
