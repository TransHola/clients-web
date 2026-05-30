const fs = require('fs');
const mapFile = '.next/dev/server/chunks/ssr/src_components_booking_booking-panel_tsx_0br-fis._.js.map';
const mapData = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
console.log("Sources:", mapData.sources);
