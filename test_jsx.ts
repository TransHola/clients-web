import * as fs from 'fs';

const content = fs.readFileSync('src/components/booking/booking-panel.tsx', 'utf-8');
const lines = content.split('\n');
let level = 0;
for (let i = 2216; i < 2448; i++) {
    const line = lines[i];
    const openDivs = (line.match(/<div/g) || []).length;
    const closeDivs = (line.match(/<\/div>/g) || []).length;
    level += openDivs - closeDivs;
    if (openDivs !== closeDivs || level < 0) {
        console.log(`L${i+1}: open=${openDivs} close=${closeDivs} level=${level} -> ${line.trim()}`);
    }
}
