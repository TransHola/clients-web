const fs = require('fs');
const mapFile = '.next/dev/server/chunks/ssr/src_components_booking_booking-panel_tsx_0br-fis._.js.map';
const mapData = JSON.parse(fs.readFileSync(mapFile, 'utf8'));

let recovered = false;
if (mapData.sections) {
    for (const section of mapData.sections) {
        if (section.map && section.map.sources) {
            const idx = section.map.sources.findIndex(s => s.includes('booking-panel.tsx'));
            if (idx !== -1 && section.map.sourcesContent) {
                fs.writeFileSync('booking-panel.tsx.recovered', section.map.sourcesContent[idx]);
                console.log('Recovered successfully from sections!');
                recovered = true;
                break;
            }
        }
    }
}

if (!recovered) {
    console.log('Could not find source in sections');
}
