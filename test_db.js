import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://ekzbskuqpirwwojflfbq.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVremJza3VxcGlyd3dvamZsZmJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNDU2NTUsImV4cCI6MjA4NjkyMTY1NX0.1a4y-lZW8Wwr2q9BQAWBTPDFJ6BWbFl-4TK5qbAsRhY');

async function main() {
  const { data: vType } = await supabase.from('vehicle_types').select('*').ilike('name', 'Coach Bus');
  const { data: csv } = await supabase.from('country_solution_vehicles').select('*').eq('vehicle_type_id', vType[0].id);
  for (let c of csv) {
      const { data: rates } = await supabase.from('country_vehicle_rates').select('*').eq('country_solution_vehicle_id', c.id).eq('rate_type', 'one_way');
      console.log("Solution Vehicle:", c.id);
      console.dir(rates, { depth: null });
  }
}
main();
