export interface GisLocation {
    address: string;
    name?: string;
    displayName?: string;
    coordinate: { lat: number; lon: number };
    lat: number;
    lon: number;
    countryCode?: string;
    raw?: any;
}

const ISO3_TO_ISO2: Record<string, string> = {
    ARE: 'AE', USA: 'US', ESP: 'ES', MAR: 'MA', GBR: 'GB', FRA: 'FR', DEU: 'DE', ITA: 'IT',
    CHE: 'CH', NLD: 'NL', BEL: 'BE', AUT: 'AT', PRT: 'PT', TUR: 'TR', SAU: 'SA', QAT: 'QA',
    KWT: 'KW', BHR: 'BH', OMN: 'OM', JOR: 'JO', EGY: 'EG', CAN: 'CA', MEX: 'MX', BRA: 'BR',
    IND: 'IN', SGP: 'SG', JPN: 'JP', KOR: 'KR', AUS: 'AU', ZAF: 'ZA', IRL: 'IE', GRC: 'GR',
};

const GEOCODE_MEM_CACHE = new Map<string, GisLocation[]>();

export class GisClient {
    private static baseUrl = process.env.NEXT_PUBLIC_GIS_API_URL ? `${process.env.NEXT_PUBLIC_GIS_API_URL}/api/v1/gis` : 'http://localhost:4000/api/v1/gis';

    static async geocode(query: string, bias?: { lat: number, lon: number }): Promise<GisLocation[]> {
        if (!query || query.trim().length < 2) return [];
        const cleanQuery = query.trim();
        const cacheKey = `${cleanQuery.toLowerCase()}|${bias ? `${bias.lat.toFixed(2)},${bias.lon.toFixed(2)}` : ''}`;
        const cached = GEOCODE_MEM_CACHE.get(cacheKey);
        if (cached && cached.length > 0) return cached;

        // 1. Only try internal GIS API if explicitly configured to a non-localhost domain or running on localhost
        const isBrowserRemote = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
        const isLocalDefault = this.baseUrl.includes('localhost:4000') || this.baseUrl.includes('127.0.0.1:4000');
        if (!isBrowserRemote || !isLocalDefault) {
            try {
                let url = `${this.baseUrl}/geocode?q=${encodeURIComponent(cleanQuery)}`;
                if (bias) url += `&lat=${bias.lat}&lon=${bias.lon}`;

                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), 900);
                const res = await fetch(url, { signal: controller.signal });
                clearTimeout(timer);

                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data) && data.length > 0) {
                        const mapped = data.map((item: any) => {
                            const lat = Number(item.coordinate?.lat ?? item.lat ?? 0);
                            const lon = Number(item.coordinate?.lon ?? item.lon ?? 0);
                            const address = item.address || item.displayName || item.name || cleanQuery;
                            const name = item.name || address.split(',')[0] || address;
                            return {
                                address,
                                name,
                                displayName: address,
                                coordinate: { lat, lon },
                                lat,
                                lon,
                                countryCode: item.countryCode || item.country_code,
                                raw: item
                            };
                        });
                        GEOCODE_MEM_CACHE.set(cacheKey, mapped);
                        return mapped;
                    }
                }
            } catch {}
        }

        // 2. Sub-200ms Parallel Race: ArcGIS World GeocodeServer + Timed Photon
        const arcGisTask = (async (): Promise<GisLocation[]> => {
            const ctrl = new AbortController();
            const tid = setTimeout(() => ctrl.abort(), 1800);
            try {
                let arcUrl = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&langCode=EN&SingleLine=${encodeURIComponent(cleanQuery)}&maxLocations=8&outFields=PlaceName,Place_addr,LongLabel,ShortLabel,City,Region,CntryName,Country,Addr_type,Type`;
                if (bias) arcUrl += `&location=${bias.lon},${bias.lat}`;
                const res = await fetch(arcUrl, { signal: ctrl.signal, mode: 'cors' });
                if (!res.ok) throw new Error('ArcGIS failed');
                const data = await res.json();
                const cands = Array.isArray(data?.candidates) ? data.candidates : [];
                if (cands.length === 0) throw new Error('ArcGIS empty');
                return cands.map((c: any) => {
                    const attrs = c.attributes || {};
                    const lon = Number(c.location?.x ?? 0);
                    const lat = Number(c.location?.y ?? 0);
                    const iso3 = String(attrs.Country || '').toUpperCase();
                    const iso2 = iso3.length === 2 ? iso3 : ISO3_TO_ISO2[iso3];
                    const countryName = attrs.CntryName || iso2 || '';
                    const address = String(attrs.LongLabel || c.address || cleanQuery).replace(/,\s*[A-Z]{3}$/, countryName ? `, ${countryName}` : '');
                    const name = attrs.PlaceName || attrs.ShortLabel || address.split(',')[0] || cleanQuery;
                    return {
                        address,
                        name,
                        displayName: address,
                        coordinate: { lat, lon },
                        lat,
                        lon,
                        countryCode: iso2,
                        raw: c,
                    };
                });
            } finally {
                clearTimeout(tid);
            }
        })();

        const photonTask = (async (): Promise<GisLocation[]> => {
            const ctrl = new AbortController();
            const tid = setTimeout(() => ctrl.abort(), 1100);
            try {
                let photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQuery)}&limit=8`;
                if (bias) photonUrl += `&lat=${bias.lat}&lon=${bias.lon}`;
                const fallbackRes = await fetch(photonUrl, { signal: ctrl.signal });
                if (!fallbackRes.ok) throw new Error('Photon failed');
                const data = await fallbackRes.json();
                if (!Array.isArray(data?.features) || data.features.length === 0) throw new Error('Photon empty');
                return data.features.map((f: any) => {
                    const props = f.properties || {};
                    const coords = f.geometry?.coordinates || [0, 0];
                    const lon = Number(coords[0]);
                    const lat = Number(coords[1]);
                    const streetPart = [props.street || props.name, props.housenumber].filter(Boolean).join(' ');
                    const cityPart = [props.city || props.town || props.village, props.state, props.postcode].filter(Boolean).join(' ');
                    const address = [streetPart || props.name, cityPart, props.country].filter(Boolean).join(', ') || cleanQuery;
                    const name = props.name || streetPart || props.city || address.split(',')[0];
                    return {
                        address,
                        name,
                        displayName: address,
                        coordinate: { lat, lon },
                        lat,
                        lon,
                        countryCode: props.countrycode ? String(props.countrycode).toUpperCase() : undefined,
                        raw: f,
                    };
                });
            } finally {
                clearTimeout(tid);
            }
        })();

        try {
            const winner = await Promise.any([arcGisTask, photonTask]);
            if (winner.length > 0) {
                GEOCODE_MEM_CACHE.set(cacheKey, winner);
                return winner;
            }
        } catch {}

        return [];
    }

    static async getRoute(coordinates: {lat: number, lon: number}[], profile = 'driving') {
        if (!coordinates || coordinates.length < 2) return null;
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
        } catch {
            // Proactive Fallback directly to public OSRM routing engine
            try {
                const coordsStr = coordinates.map(c => `${c.lon},${c.lat}`).join(';');
                const fallbackRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=polyline`);
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
}
