export interface GisLocation {
    address: string;
    name?: string;
    displayName?: string;
    coordinate: { lat: number; lon: number };
    lat: number;
    lon: number;
    countryCode?: string;
    icon?: string;
    raw?: any;
}

export interface GisBiasContext {
    lat: number;
    lon: number;
    countryCode?: string;
    city?: string;
}

const ISO3_TO_ISO2: Record<string, string> = {
    ARE: 'AE', USA: 'US', ESP: 'ES', MAR: 'MA', GBR: 'GB', FRA: 'FR', DEU: 'DE', ITA: 'IT',
    CHE: 'CH', NLD: 'NL', BEL: 'BE', AUT: 'AT', PRT: 'PT', TUR: 'TR', SAU: 'SA', QAT: 'QA',
    KWT: 'KW', BHR: 'BH', OMN: 'OM', JOR: 'JO', EGY: 'EG', CAN: 'CA', MEX: 'MX', BRA: 'BR',
    IND: 'IN', SGP: 'SG', JPN: 'JP', KOR: 'KR', AUS: 'AU', ZAF: 'ZA', IRL: 'IE', GRC: 'GR',
};

const ISO2_COUNTRY_NAMES: Record<string, string> = {
    AE: 'United Arab Emirates', US: 'United States', ES: 'Spain', MA: 'Morocco',
    GB: 'United Kingdom', FR: 'France', DE: 'Germany', IT: 'Italy', SA: 'Saudi Arabia',
    QA: 'Qatar', KW: 'Kuwait', BH: 'Bahrain', OM: 'Oman', TR: 'Turkey', CH: 'Switzerland',
    NL: 'Netherlands', PT: 'Portugal', EG: 'Egypt', JOR: 'Jordan',
};

interface GazetteerLandmark {
    name: string;
    address: string;
    lat: number;
    lon: number;
    countryCode: string;
    city: string;
    aliases?: string[];
    icon?: string;
}

// Verified Tier-1 Landmarks, Airports, Mega-Malls & Convention Hubs
const VERIFIED_LANDMARKS: GazetteerLandmark[] = [
    // United Arab Emirates — Dubai
    { name: 'The Dubai Mall', address: 'The Dubai Mall, Financial Center Street, Downtown Dubai, Dubai, United Arab Emirates', lat: 25.1972, lon: 55.2796, countryCode: 'AE', city: 'Dubai', aliases: ['dubai mall', 'downtown mall'], icon: 'briefcase' },
    { name: 'Burj Khalifa', address: 'Burj Khalifa, 1 Sheikh Mohammed bin Rashid Blvd, Downtown Dubai, Dubai, United Arab Emirates', lat: 25.1972, lon: 55.2744, countryCode: 'AE', city: 'Dubai', aliases: ['burj khalifa downtown'], icon: 'map' },
    { name: 'Mall of the Emirates', address: 'Mall of the Emirates, Sheikh Zayed Road, Al Barsha 1, Dubai, United Arab Emirates', lat: 25.1181, lon: 55.2006, countryCode: 'AE', city: 'Dubai', aliases: ['moe', 'emirates mall', 'dubai mall of the emirates'], icon: 'briefcase' },
    { name: 'Dubai Marina Mall', address: 'Dubai Marina Mall, Sheikh Zayed Road, Dubai Marina, Dubai, United Arab Emirates', lat: 25.0763, lon: 55.1403, countryCode: 'AE', city: 'Dubai', aliases: ['marina mall dubai'], icon: 'briefcase' },
    { name: 'Dubai Hills Mall', address: 'Dubai Hills Mall, Al Khail Road, Dubai Hills Estate, Dubai, United Arab Emirates', lat: 25.1004, lon: 55.2381, countryCode: 'AE', city: 'Dubai', aliases: ['hills mall'], icon: 'briefcase' },
    { name: 'Dubai Festival City Mall', address: 'Dubai Festival City Mall, Crescent Road, Dubai Festival City, Dubai, United Arab Emirates', lat: 25.2221, lon: 55.3527, countryCode: 'AE', city: 'Dubai', aliases: ['festival city'], icon: 'briefcase' },
    { name: 'Ibn Battuta Mall', address: 'Ibn Battuta Mall, Sheikh Zayed Road, Jebel Ali Village, Dubai, United Arab Emirates', lat: 25.0446, lon: 55.1179, countryCode: 'AE', city: 'Dubai', aliases: ['ibn battuta'], icon: 'briefcase' },
    { name: 'Dubai Outlet Mall', address: 'Dubai Outlet Mall, Dubai - Al Ain Road (E66), Dubailand, Dubai, United Arab Emirates', lat: 25.0737, lon: 55.3991, countryCode: 'AE', city: 'Dubai', aliases: ['outlet mall dubai'], icon: 'briefcase' },
    { name: 'Dubai International Airport (DXB)', address: 'Dubai International Airport (DXB), Airport Road, Garhoud, Dubai, United Arab Emirates', lat: 25.2532, lon: 55.3657, countryCode: 'AE', city: 'Dubai', aliases: ['dxb', 'dubai airport', 'terminal 1', 'terminal 3'], icon: 'navigation' },
    { name: 'Al Maktoum International Airport (DWC)', address: 'Al Maktoum International Airport (DWC), Dubai South, Dubai, United Arab Emirates', lat: 24.8967, lon: 55.1614, countryCode: 'AE', city: 'Dubai', aliases: ['dwc', 'dubai world central', 'maktoum airport'], icon: 'navigation' },
    { name: 'Palm Jumeirah & Atlantis The Palm', address: 'Crescent Road, The Palm Jumeirah, Dubai, United Arab Emirates', lat: 25.1304, lon: 55.1171, countryCode: 'AE', city: 'Dubai', aliases: ['atlantis dubai', 'palm jumeirah', 'atlantis the royal'], icon: 'map' },
    { name: 'Dubai World Trade Centre (DWTC)', address: 'Sheikh Zayed Road, Trade Centre 2, Dubai, United Arab Emirates', lat: 25.2255, lon: 55.2889, countryCode: 'AE', city: 'Dubai', aliases: ['dwtc', 'world trade center dubai', 'exhibition centre dubai'], icon: 'briefcase' },
    { name: 'Dubai International Financial Centre (DIFC)', address: 'Gate Village, DIFC, Sheikh Zayed Road, Dubai, United Arab Emirates', lat: 25.2116, lon: 55.2797, countryCode: 'AE', city: 'Dubai', aliases: ['difc', 'gate avenue'], icon: 'briefcase' },
    { name: 'Dubai Marina & JBR Walk', address: 'The Walk, Jumeirah Beach Residence, Dubai Marina, Dubai, United Arab Emirates', lat: 25.0785, lon: 55.1342, countryCode: 'AE', city: 'Dubai', aliases: ['jbr', 'dubai marina', 'jumeirah beach residence'], icon: 'map' },
    { name: 'Global Village Dubai', address: 'Global Village, Sheikh Mohammed Bin Zayed Road (E311), Dubai, United Arab Emirates', lat: 25.0695, lon: 55.3075, countryCode: 'AE', city: 'Dubai', aliases: ['global village'], icon: 'map' },
    { name: 'Museum of the Future', address: 'Museum of the Future, Sheikh Zayed Road, Trade Centre, Dubai, United Arab Emirates', lat: 25.2192, lon: 55.2819, countryCode: 'AE', city: 'Dubai', aliases: ['future museum'], icon: 'map' },

    // United Arab Emirates — Abu Dhabi
    { name: 'Zayed International Airport (AUH)', address: 'Zayed International Airport (AUH), Al Matar, Abu Dhabi, United Arab Emirates', lat: 24.4330, lon: 54.6511, countryCode: 'AE', city: 'Abu Dhabi', aliases: ['auh', 'abu dhabi airport', 'zayed airport'], icon: 'navigation' },
    { name: 'Yas Mall', address: 'Yas Mall, Yas Island, Abu Dhabi, United Arab Emirates', lat: 24.4889, lon: 54.6094, countryCode: 'AE', city: 'Abu Dhabi', aliases: ['yas island mall'], icon: 'briefcase' },
    { name: 'Yas Island & Yas Marina Circuit', address: 'Yas Marina Circuit, Yas Island, Abu Dhabi, United Arab Emirates', lat: 24.4672, lon: 54.6031, countryCode: 'AE', city: 'Abu Dhabi', aliases: ['ferrari world', 'warner bros world', 'seaworld abu dhabi', 'etihad arena'], icon: 'map' },
    { name: 'The Galleria Al Maryah Island', address: 'The Galleria, 107 Hamouda Bin Ali Al Dhaheri St, Al Maryah Island, Abu Dhabi, United Arab Emirates', lat: 24.5015, lon: 54.3894, countryCode: 'AE', city: 'Abu Dhabi', aliases: ['galleria mall abu dhabi', 'al maryah island', 'adgm'], icon: 'briefcase' },
    { name: 'Abu Dhabi Mall', address: 'Abu Dhabi Mall, Al Maiyani Street, Al Zahiyah, Abu Dhabi, United Arab Emirates', lat: 24.4960, lon: 54.3832, countryCode: 'AE', city: 'Abu Dhabi', aliases: ['abudhabi mall'], icon: 'briefcase' },
    { name: 'Marina Mall Abu Dhabi', address: 'Marina Mall, Corniche Breakwater, Al Kasir, Abu Dhabi, United Arab Emirates', lat: 24.4761, lon: 54.3215, countryCode: 'AE', city: 'Abu Dhabi', aliases: ['abu dhabi marina mall'], icon: 'briefcase' },
    { name: 'Louvre Abu Dhabi', address: 'Louvre Abu Dhabi, Jacques Chirac Street, Saadiyat Cultural District, Abu Dhabi, United Arab Emirates', lat: 24.5339, lon: 54.3985, countryCode: 'AE', city: 'Abu Dhabi', aliases: ['louvre museum', 'saadiyat louvre'], icon: 'map' },
    { name: 'Sheikh Zayed Grand Mosque', address: 'Sheikh Zayed Grand Mosque, Al Rawdah, Abu Dhabi, United Arab Emirates', lat: 24.4128, lon: 54.4750, countryCode: 'AE', city: 'Abu Dhabi', aliases: ['grand mosque abu dhabi', 'zayed mosque'], icon: 'map' },
    { name: 'ADNEC Centre Abu Dhabi', address: 'Abu Dhabi National Exhibition Centre (ADNEC), Khaleej Al Arabi Street, Abu Dhabi, United Arab Emirates', lat: 24.4187, lon: 54.4368, countryCode: 'AE', city: 'Abu Dhabi', aliases: ['adnec', 'exhibition centre abu dhabi'], icon: 'briefcase' },
    { name: 'Emirates Palace Mandarin Oriental', address: 'West Corniche Road, Al Ras Al Akhdar, Abu Dhabi, United Arab Emirates', lat: 24.4616, lon: 54.3173, countryCode: 'AE', city: 'Abu Dhabi', aliases: ['emirates palace', 'qasr al watan'], icon: 'map' },
    { name: 'Sharjah International Airport (SHJ)', address: 'Sharjah International Airport (SHJ), Airport Road, Sharjah, United Arab Emirates', lat: 25.3286, lon: 55.5172, countryCode: 'AE', city: 'Sharjah', aliases: ['shj', 'sharjah airport'], icon: 'navigation' },

    // Spain, Morocco, UK, US Key Hubs
    { name: 'Adolfo Suárez Madrid-Barajas Airport (MAD)', address: 'Av. de la Hispanidad, s/n, 28042 Madrid, Spain', lat: 40.4839, lon: -3.5680, countryCode: 'ES', city: 'Madrid', aliases: ['mad', 'madrid airport', 'barajas'], icon: 'navigation' },
    { name: 'Josep Tarradellas Barcelona-El Prat Airport (BCN)', address: '08820 El Prat de Llobregat, Barcelona, Spain', lat: 41.2974, lon: 2.0833, countryCode: 'ES', city: 'Barcelona', aliases: ['bcn', 'barcelona airport', 'el prat'], icon: 'navigation' },
    { name: 'Mohammed V International Airport (CMN)', address: 'Mohammed V International Airport, Nouaceur, Casablanca, Morocco', lat: 33.3675, lon: -7.5898, countryCode: 'MA', city: 'Casablanca', aliases: ['cmn', 'casablanca airport', 'aeroport mohammed v'], icon: 'navigation' },
    { name: 'Morocco Mall', address: 'Morocco Mall, Boulevard de Biarritz, Ain Diab, Casablanca, Morocco', lat: 33.5761, lon: -7.7073, countryCode: 'MA', city: 'Casablanca', aliases: ['casablanca mall'], icon: 'briefcase' },
    { name: 'Marrakech Menara Airport (RAK)', address: 'Marrakech Menara Airport, Mhamid, Marrakech, Morocco', lat: 31.6069, lon: -8.0363, countryCode: 'MA', city: 'Marrakech', aliases: ['rak', 'marrakech airport', 'menara airport'], icon: 'navigation' },
    { name: 'London Heathrow Airport (LHR)', address: 'London Heathrow Airport (LHR), Longford TW6, United Kingdom', lat: 51.4700, lon: -0.4543, countryCode: 'GB', city: 'London', aliases: ['lhr', 'heathrow'], icon: 'navigation' },
    { name: 'John F. Kennedy International Airport (JFK)', address: 'JFK International Airport, Queens, NY 11430, United States', lat: 40.6413, lon: -73.7781, countryCode: 'US', city: 'New York', aliases: ['jfk', 'new york airport'], icon: 'navigation' },
];

const STOPWORDS = new Set(['the', 'in', 'at', 'of', 'and', 'to', 'for', 'near', 'de', 'la', 'el', 'al']);

const KNOWN_CITY_TOKENS = new Set([
    'dubai', 'sharjah', 'ajman', 'fujairah', 'madrid', 'barcelona', 'malaga', 'valencia',
    'seville', 'sevilla', 'casablanca', 'marrakech', 'rabat', 'tangier', 'tanger', 'agadir',
    'fes', 'london', 'manchester', 'paris', 'riyadh', 'jeddah', 'doha', 'muscat', 'kuwait',
]);

// Sub-POIs / infrastructure noise that passengers almost never intend unless explicitly typed
const NOISE_OSM_VALUES = new Set([
    'construction', 'bus_stop', 'platform', 'parking', 'parking_entrance', 'parking_space',
    'atm', 'toilets', 'vending_machine', 'waste_basket', 'charging_station', 'bench',
    'elevator', 'steps', 'footway', 'service', 'pitch', 'playground', 'artwork',
    'information', 'pond', 'basin', 'substation', 'mast', 'tower_communication',
]);

// Minor retail/food kiosks inside malls/airports — de-prioritized below the main landmark
const MINOR_TENANT_VALUES = new Set([
    'fast_food', 'cafe', 'ice_cream', 'pharmacy', 'bank', 'bureau_de_change',
    'clothes', 'shoes', 'jewelry', 'cosmetics', 'mobile_phone', 'kiosk',
    'convenience', 'hairdresser', 'optician', 'car_rental',
]);

const MAJOR_DESTINATION_VALUES = new Set([
    'aerodrome', 'airport', 'terminal', 'mall', 'department_store', 'shopping_center',
    'hotel', 'resort', 'motel', 'guest_house', 'attraction', 'museum', 'theme_park',
    'conference_centre', 'exhibition_centre', 'stadium', 'arena', 'university',
    'hospital', 'station', 'halt', 'ferry_terminal', 'cruise_terminal',
    'suburb', 'neighbourhood', 'quarter', 'island', 'city', 'town', 'locality',
]);

function normalizeIso2(raw?: string): string | undefined {
    if (!raw) return undefined;
    const upper = raw.trim().toUpperCase();
    if (upper === 'UK') return 'GB';
    if (upper.length === 2) return upper;
    return ISO3_TO_ISO2[upper];
}

function normalizeSearchText(input?: string): string {
    if (!input) return '';
    let s = input
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    if (s.startsWith('the ')) s = s.slice(4);
    return s;
}

function sanitizeEnglishAddress(raw: string, query: string): string {
    if (!raw) return raw;
    const userTypedArabic = /[\u0600-\u06FF]/.test(query);
    if (userTypedArabic) return raw;
    const parts = raw
        .split(',')
        .map(p => p.trim())
        .filter(Boolean)
        .filter(p => {
            // Strip redundant pure-Arabic segments when Latin segments already exist
            const hasArabic = /[\u0600-\u06FF]/.test(p);
            const hasLatin = /[A-Za-z]/.test(p);
            return !(hasArabic && !hasLatin);
        });
    const deduped: string[] = [];
    for (const part of parts) {
        if (!deduped.some(existing => existing.toLowerCase() === part.toLowerCase())) {
            deduped.push(part);
        }
    }
    return deduped.join(', ') || raw;
}

function isOneEditTypo(a: string, b: string): boolean {
    if (a === b) return true;
    // Allow 1-char edit distance on tokens >= 5 chars (e.g., "dubail" -> "dubai")
    if (Math.min(a.length, b.length) < 5) return false;
    if (Math.abs(a.length - b.length) > 1) return false;
    let i = 0;
    let j = 0;
    let edits = 0;
    while (i < a.length && j < b.length) {
        if (a[i] === b[j]) {
            i++;
            j++;
        } else {
            edits++;
            if (edits > 1) return false;
            if (a.length > b.length) i++;
            else if (b.length > a.length) j++;
            else { i++; j++; }
        }
    }
    if (i < a.length || j < b.length) edits++;
    return edits <= 1;
}

function tokenMatchesText(token: string, targetWords: string[], targetJoined: string): boolean {
    if (targetJoined.includes(token)) return true;
    for (const w of targetWords) {
        if (w.startsWith(token) || isOneEditTypo(token, w)) return true;
    }
    return false;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Common typo repairs so remote APIs (Photon/ArcGIS/Nominatim) also get a clean spelling
const COMMON_TYPO_REPAIRS: Record<string, string> = {
    dubail: 'dubai',
    abudhabi: 'abu dhabi',
    sharja: 'sharjah',
    airpot: 'airport',
    ariport: 'airport',
    marrakesh: 'marrakech',
};

function repairCommonQueryTypos(query: string): string {
    return query
        .split(/\s+/)
        .map(word => {
            const clean = word.toLowerCase().replace(/[^a-z]/g, '');
            return COMMON_TYPO_REPAIRS[clean] || word;
        })
        .join(' ');
}

interface RawCandidate extends GisLocation {
    _osmKey?: string;
    _osmValue?: string;
    _arcType?: string;
    _importance?: number;
    _curatedBoost?: number;
}

const GEOCODE_MEM_CACHE = new Map<string, GisLocation[]>();

export class GisClient {
    private static baseUrl = process.env.NEXT_PUBLIC_GIS_API_URL ? `${process.env.NEXT_PUBLIC_GIS_API_URL}/api/v1/gis` : 'http://localhost:4000/api/v1/gis';

    static getInstantLandmarkMatches(query: string, bias?: GisBiasContext): GisLocation[] {
        const repaired = repairCommonQueryTypos(query.trim());
        const nq = normalizeSearchText(repaired);
        if (nq.length < 2) return [];
        const targetCountry = normalizeIso2(bias?.countryCode);
        const tokens = nq.split(' ').filter(t => t.length >= 2 && !STOPWORDS.has(t));
        const activeTokens = tokens.length > 0 ? tokens : nq.split(' ').filter(Boolean);

        const matches: RawCandidate[] = [];
        for (const lm of VERIFIED_LANDMARKS) {
            if (targetCountry && lm.countryCode !== targetCountry) continue;
            const hay = normalizeSearchText([lm.name, lm.city, ...(lm.aliases || [])].join(' '));
            const hayWords = hay.split(' ');
            const allMatch = activeTokens.every(t => tokenMatchesText(t, hayWords, hay));
            if (!allMatch) continue;
            matches.push({
                name: lm.name,
                address: lm.address,
                displayName: lm.address,
                coordinate: { lat: lm.lat, lon: lm.lon },
                lat: lm.lat,
                lon: lm.lon,
                countryCode: lm.countryCode,
                icon: lm.icon,
                _osmValue: lm.icon === 'navigation' ? 'airport' : 'mall',
                _curatedBoost: 45,
            });
        }
        return this.rankAndDeduplicate(matches, repaired, bias).slice(0, 6);
    }

    private static rankAndDeduplicate(
        items: RawCandidate[],
        cleanQuery: string,
        bias?: GisBiasContext
    ): GisLocation[] {
        const targetCountry = normalizeIso2(bias?.countryCode);
        const targetCity = normalizeSearchText((bias?.city || '').split(',')[0] || '');
        const nq = normalizeSearchText(cleanQuery);
        const rawTokens = nq.split(' ').filter(t => t.length >= 2 && !STOPWORDS.has(t));
        const qTokens = rawTokens.length > 0 ? rawTokens : nq.split(' ').filter(Boolean);

        // Separate non-city feature tokens (e.g. in "dubai mall", "dubai" is city, "mall" is feature)
        const nonCityTokens = qTokens.filter(t => !KNOWN_CITY_TOKENS.has(t) && t !== targetCity);
        const queryNamesBiasCity = Boolean(targetCity && nq.includes(targetCity));
        const explicitOtherCities = qTokens.filter(t => KNOWN_CITY_TOKENS.has(t) && t !== targetCity);

        const seenAddress = new Set<string>();
        const acceptedByName = new Map<string, Array<{ lat: number; lon: number }>>();
        const scored: Array<{ item: GisLocation; score: number }> = [];

        for (const it of items) {
            if (!it || (!it.lat && !it.lon)) continue;
            const itemCc = normalizeIso2(it.countryCode);
            if (targetCountry && itemCc && itemCc !== targetCountry) continue;

            const cleanAddress = sanitizeEnglishAddress(it.address || it.displayName || it.name || '', cleanQuery);
            const cleanName = sanitizeEnglishAddress(it.name || cleanAddress.split(',')[0] || cleanAddress, cleanQuery);
            const nn = normalizeSearchText(cleanName);
            const na = normalizeSearchText(cleanAddress);
            if (!nn) continue;

            // Filter out construction zones, bus stops, parking spaces, sculptures unless user explicitly typed them
            const osmVal = (it._osmValue || '').toLowerCase();
            const osmKey = (it._osmKey || '').toLowerCase();
            const arcType = (it._arcType || '').toLowerCase();
            if (osmVal && NOISE_OSM_VALUES.has(osmVal)) {
                const readableTag = osmVal.replace(/_/g, ' ');
                if (!nq.includes(readableTag) && !nq.includes('bus') && !nq.includes('metro')) {
                    continue;
                }
            }
            if (osmKey === 'landuse' && osmVal === 'construction') continue;

            const nnWords = nn.split(' ');
            const fullHay = `${nn} ${na}`;
            const fullWords = fullHay.split(' ');

            const nameHits = qTokens.filter(t => tokenMatchesText(t, nnWords, nn)).length;
            const fullHits = qTokens.filter(t => tokenMatchesText(t, fullWords, fullHay)).length;

            // CRITICAL LEXICAL GATE:
            // Never allow ArcGIS category hallucinations (e.g. "Outlet Village, Dubai" or "Extra Souq, Dubai"
            // for query "dubai mall") where ONLY the city name matched and 0 feature tokens matched!
            if (nonCityTokens.length > 0 && qTokens.length >= 2) {
                const featureHits = nonCityTokens.filter(t => tokenMatchesText(t, fullWords, fullHay)).length;
                if (featureHits === 0) continue;
            }
            if (nameHits === 0 && fullHits < qTokens.length) {
                continue;
            }

            // Exact address dedup + 2.5km same-landmark proximity dedup
            const addrKey = `${nn}|${na}`;
            if (seenAddress.has(addrKey)) continue;
            const prevCoords = acceptedByName.get(nn) || [];
            if (prevCoords.some(p => haversineKm(p.lat, p.lon, it.lat, it.lon) <= 2.5)) {
                continue;
            }
            seenAddress.add(addrKey);
            acceptedByName.set(nn, [...prevCoords, { lat: it.lat, lon: it.lon }]);

            let score = Number(it._curatedBoost || 0);

            // 1. Exact & Phrase Lexical Precision
            if (nn === nq) {
                score += 280;
            } else if (nn.startsWith(`${nq} `) || nn.startsWith(nq)) {
                score += 185;
            } else if (nn.includes(nq)) {
                score += 145;
            }

            // 2. Multi-token completeness & conciseness
            if (qTokens.length > 0) {
                if (nameHits === qTokens.length) {
                    score += 110;
                    const extraWords = Math.max(0, nnWords.length - qTokens.length);
                    score -= Math.min(48, extraWords * 9);
                } else if (fullHits === qTokens.length) {
                    score += 65;
                } else {
                    score += Math.round(35 * (nameHits / qTokens.length));
                }
            }

            // 3. Landmark / Destination Class Weighting
            const combinedClass = `${osmVal} ${arcType}`;
            if (
                MAJOR_DESTINATION_VALUES.has(osmVal) ||
                osmKey === 'aeroway' ||
                /\b(airport|shopping center|hotel|museum|convention|university|hospital|train station|metro station|pointaddress|streetaddress)\b/.test(combinedClass)
            ) {
                score += 55;
            }
            if (MINOR_TENANT_VALUES.has(osmVal) && nn !== nq) {
                score -= 45;
            }

            // 4. OpenStreetMap / Wikipedia global importance
            if (it._importance) {
                score += Number(it._importance) * 85;
            }

            // 5. Context-Aware Geographic Bias (respects cross-city queries like typing "dubai mall" from Abu Dhabi!)
            if (bias) {
                const distKm = haversineKm(bias.lat, bias.lon, it.lat, it.lon);
                if (explicitOtherCities.length > 0) {
                    // User explicitly named another city (e.g., "dubai") — boost items in THAT city, NOT Abu Dhabi!
                    if (explicitOtherCities.some(cityTok => na.includes(cityTok))) {
                        score += 45;
                    }
                } else {
                    const inBiasCity = (targetCity && na.includes(targetCity)) || distKm <= 50;
                    if (inBiasCity) {
                        score += queryNamesBiasCity ? 50 : 28;
                    }
                    score += Math.max(0, 18 - distKm / 25);
                }
            }

            const { _osmKey, _osmValue, _arcType, _importance, _curatedBoost, ...cleanItem } = it;
            scored.push({
                item: {
                    ...cleanItem,
                    name: cleanName,
                    address: cleanAddress,
                    displayName: cleanAddress,
                    countryCode: itemCc || targetCountry,
                },
                score,
            });
        }

        return scored
            .sort((a, b) => b.score - a.score)
            .slice(0, 8)
            .map(x => x.item);
    }

    static async geocode(query: string, bias?: GisBiasContext): Promise<GisLocation[]> {
        if (!query || query.trim().length < 2) return [];
        const rawTrimmed = query.trim();
        const cleanQuery = repairCommonQueryTypos(rawTrimmed);
        const targetCountry = normalizeIso2(bias?.countryCode);
        const targetCity = (bias?.city || '').split(',')[0]?.trim().toLowerCase() || '';
        const cacheKey = `v2|${cleanQuery.toLowerCase()}|${targetCountry || ''}|${targetCity}|${bias ? `${bias.lat.toFixed(2)},${bias.lon.toFixed(2)}` : ''}`;
        const cached = GEOCODE_MEM_CACHE.get(cacheKey);
        if (cached && cached.length > 0) return cached;

        // Tier 0: Verified Curated Landmarks & Hubs
        const curatedCandidates: RawCandidate[] = this.getInstantLandmarkMatches(cleanQuery, bias).map(item => ({
            ...item,
            _curatedBoost: 45,
            _osmValue: item.icon === 'navigation' ? 'airport' : 'mall',
        }));

        // Tier 1A: Photon English Geocoder (without overpowering zoom=12 distortion)
        const photonTask = (async (): Promise<RawCandidate[]> => {
            const ctrl = new AbortController();
            const tid = setTimeout(() => ctrl.abort(), 1400);
            try {
                const nq = normalizeSearchText(cleanQuery);
                const mentionsOtherCity = Array.from(KNOWN_CITY_TOKENS).some(c => nq.includes(c) && c !== targetCity);
                let photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQuery)}&limit=15&lang=en`;
                if (bias && !mentionsOtherCity) {
                    photonUrl += `&lat=${bias.lat}&lon=${bias.lon}&location_bias_scale=0.18`;
                }
                const res = await fetch(photonUrl, { signal: ctrl.signal });
                if (!res.ok) return [];
                const data = await res.json();
                if (!Array.isArray(data?.features)) return [];
                return data.features.map((f: any): RawCandidate => {
                    const props = f.properties || {};
                    const coords = f.geometry?.coordinates || [0, 0];
                    const lon = Number(coords[0]);
                    const lat = Number(coords[1]);
                    const rawName = props.name || [props.street, props.housenumber].filter(Boolean).join(' ') || '';
                    const streetPart = props.street && props.street !== rawName
                        ? [props.street, props.housenumber].filter(Boolean).join(' ')
                        : '';
                    const localityParts = [props.district, props.city || props.town || props.village, props.state, props.country]
                        .filter(Boolean);
                    const address = [rawName, streetPart, ...localityParts].filter(Boolean).join(', ') || cleanQuery;
                    return {
                        name: rawName || address.split(',')[0],
                        address,
                        displayName: address,
                        coordinate: { lat, lon },
                        lat,
                        lon,
                        countryCode: normalizeIso2(props.countrycode),
                        _osmKey: props.osm_key || '',
                        _osmValue: props.osm_value || props.type || '',
                        raw: f,
                    };
                });
            } catch {
                return [];
            } finally {
                clearTimeout(tid);
            }
        })();

        // Tier 1B: Single-RTT ArcGIS World GeocodeServer (strictly lexically gated, sub-350ms)
        const arcGisTask = (async (): Promise<RawCandidate[]> => {
            const ctrl = new AbortController();
            const tid = setTimeout(() => ctrl.abort(), 950);
            try {
                let baseArc = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&langCode=EN&SingleLine=${encodeURIComponent(cleanQuery)}&maxLocations=10&outFields=PlaceName,Place_addr,LongLabel,ShortLabel,City,Region,Subregion,CntryName,Country,Addr_type,Type`;
                if (targetCountry) baseArc += `&countryCode=${targetCountry}`;
                if (bias) baseArc += `&location=${bias.lon},${bias.lat}`;

                const res = await fetch(baseArc, { signal: ctrl.signal, mode: 'cors' });
                if (!res.ok) return [];
                const data = await res.json();
                const rawCandidates: any[] = Array.isArray(data?.candidates) ? data.candidates : [];

                return rawCandidates.map((c: any): RawCandidate => {
                    const attrs = c.attributes || {};
                    const lon = Number(c.location?.x ?? 0);
                    const lat = Number(c.location?.y ?? 0);
                    const iso2 = normalizeIso2(attrs.Country);
                    const countryName = attrs.CntryName || (iso2 ? ISO2_COUNTRY_NAMES[iso2] : '') || iso2 || '';
                    const address = String(attrs.LongLabel || attrs.Place_addr || c.address || cleanQuery)
                        .replace(/,\s*[A-Z]{3}$/, countryName ? `, ${countryName}` : '');
                    const name = attrs.PlaceName || attrs.ShortLabel || address.split(',')[0] || cleanQuery;
                    return {
                        name,
                        address,
                        displayName: address,
                        coordinate: { lat, lon },
                        lat,
                        lon,
                        countryCode: iso2,
                        _arcType: `${attrs.Type || ''} ${attrs.Addr_type || ''}`.trim(),
                        raw: c,
                    };
                });
            } catch {
                return [];
            } finally {
                clearTimeout(tid);
            }
        })();

        // Gather BOTH Photon & ArcGIS ensembles instead of blind winner-take-all Promise.any
        const [photonSettled, arcSettled] = await Promise.allSettled([photonTask, arcGisTask]);
        const ensemble: RawCandidate[] = [
            ...curatedCandidates,
            ...(photonSettled.status === 'fulfilled' ? photonSettled.value : []),
            ...(arcSettled.status === 'fulfilled' ? arcSettled.value : []),
        ];

        let ranked = this.rankAndDeduplicate(ensemble, cleanQuery, bias);

        // Tier 2 Resilience Fallback: Nominatim (if fewer than 3 matches found)
        if (ranked.length < 3) {
            const ctrl = new AbortController();
            const tid = setTimeout(() => ctrl.abort(), 1600);
            try {
                const ccFilter = targetCountry ? `&countrycodes=${encodeURIComponent(targetCountry.toLowerCase())}` : '';
                const nomUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&accept-language=en&q=${encodeURIComponent(cleanQuery)}&limit=6${ccFilter}`;
                const nomRes = await fetch(nomUrl, {
                    headers: { 'Accept-Language': 'en' },
                    signal: ctrl.signal,
                });
                if (nomRes.ok) {
                    const nomData = await nomRes.json();
                    if (Array.isArray(nomData) && nomData.length > 0) {
                        const nomMapped: RawCandidate[] = nomData.map((d: any) => {
                            const lat = Number(d.lat || 0);
                            const lon = Number(d.lon || 0);
                            const address = d.display_name || cleanQuery;
                            const name = d.name || address.split(',')[0];
                            return {
                                name,
                                address,
                                displayName: address,
                                coordinate: { lat, lon },
                                lat,
                                lon,
                                countryCode: normalizeIso2(d.address?.country_code) || targetCountry,
                                _osmKey: d.category || '',
                                _osmValue: d.type || '',
                                _importance: Number(d.importance || 0),
                                raw: d,
                            };
                        });
                        ranked = this.rankAndDeduplicate([...ensemble, ...nomMapped], cleanQuery, bias);
                    }
                }
            } catch {
                // Keep existing ranked matches
            } finally {
                clearTimeout(tid);
            }
        }

        if (ranked.length > 0) {
            GEOCODE_MEM_CACHE.set(cacheKey, ranked);
        }
        return ranked;
    }

    static async getRoute(coordinates: {lat: number, lon: number}[], profile = 'driving') {
        if (!coordinates || coordinates.length < 2) return null;
        const isBrowserRemote = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
        const isLocalDefault = this.baseUrl.includes('localhost:4000') || this.baseUrl.includes('127.0.0.1:4000');
        if (!isBrowserRemote || !isLocalDefault) {
            try {
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), 2000);
                const res = await fetch(`${this.baseUrl}/route`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ coordinates, profile }),
                    signal: controller.signal
                });
                clearTimeout(timer);
                if (!res.ok) throw new Error(`GIS HTTP ${res.status}`);
                return await res.json();
            } catch {}
        }
        // Proactive Fallback directly to public OSRM routing engine
        try {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), 2800);
            const coordsStr = coordinates.map(c => `${c.lon},${c.lat}`).join(';');
            const fallbackRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=polyline`, { signal: ctrl.signal });
            clearTimeout(timer);
            if (fallbackRes.ok) {
                const data = await fallbackRes.json();
                const route = data.routes?.[0];
                if (route) {
                    return {
                        distance: route.distance,
                        duration: route.duration,
                        geometry: route.geometry,
                        providerUsed: 'OSRM_FALLBACK',
                        legs: route.legs ? route.legs.map((l: any) => ({ distance: l.distance, duration: l.duration })) : []
                    };
                }
            }
        } catch {}
        return null;
    }
}
