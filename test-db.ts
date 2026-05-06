import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJh...'
)

async function run() {
  const { data, error } = await supabase.from('country_configurations').select('country_code, config')
  console.log(JSON.stringify(data?.[0]?.config?.solutions, null, 2))
}
run()
