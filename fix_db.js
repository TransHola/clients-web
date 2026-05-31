import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://ekzbskuqpirwwojflfbq.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVremJza3VxcGlyd3dvamZsZmJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNDU2NTUsImV4cCI6MjA4NjkyMTY1NX0.1a4y-lZW8Wwr2q9BQAWBTPDFJ6BWbFl-4TK5qbAsRhY');

async function main() {
    // We get all rates that have advance_mode = 'tiered'
    const { data: rates } = await supabase.from('country_vehicle_rates').select('id, raw_rates, calculation_engine, country_vehicle_rate_tiers(*)').eq('advance_mode', 'tiered');
    
    let updates = 0;
    for (let r of rates) {
        if (!r.raw_rates || !r.raw_rates.tiers) continue;
        
        let changed = false;
        r.raw_rates.tiers.forEach(t => {
            if (parseFloat(t.afterUnits) > 40 && parseFloat(t.value) < 30) {
                console.log("Found corrupted tier:", t);
                const temp = t.afterUnits;
                t.afterUnits = String(t.value);
                t.value = String(temp);
                changed = true;
            }
        });
        
        if (changed) {
            console.log("Updating rate ID:", r.id);
            await supabase.from('country_vehicle_rates').update({ raw_rates: r.raw_rates }).eq('id', r.id);
            updates++;
            
            // Fix tiers table too
            for (let dbTier of r.country_vehicle_rate_tiers) {
                if (parseFloat(dbTier.min_threshold) > 40 && parseFloat(dbTier.rate_value) < 30) {
                     await supabase.from('country_vehicle_rate_tiers').update({
                         min_threshold: dbTier.rate_value,
                         rate_value: dbTier.min_threshold
                     }).eq('id', dbTier.id);
                }
            }
        }
    }
    console.log("Fixed rates count:", updates);
}
main();
