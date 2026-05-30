import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'

const envFile = fs.readFileSync('.env.local', 'utf8')
const env = envFile.split('\n').reduce((acc, line) => {
  const [key, value] = line.split('=')
  if (key && value) acc[key] = value.replace(/['"]/g, '')
  return acc
}, {} as any)

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function run() {
  const { data, error } = await supabase.from("dispatch_assignments").select(`
      *,
      company:company_id ( company_name, support_contact, logo_url ),
      driver:driver_id ( first_name, last_name, phone ),
      vehicle:vehicle_id ( 
        make:make_id ( name ), 
        model:model_id ( name ), 
        license_plate 
      )
    `).limit(1)
  console.log("Error:", error)
}

run()
