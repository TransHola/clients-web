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

function normalizeIso2(raw?: string): string | undefined {
    if (!raw) return undefined;
    const upper = raw.trim().toUpperCase();
    if (upper === 'UK') return 'GB';
    if (upper.length === 2) return upper;
    return ISO3_TO_ISO2[upper];
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

const GEOCODE_MEM_CACHE = new Map<string, GisLocation[]>();

export class GisClient {
    private static baseUrl = process.env.NEXT_PUBLIC_GIS_API_URL ? `${process.env.NEXT_PUBLIC_GIS_API_URL}/api/v1/gis` : 'http://localhost:4000/api/v1/gis';

    static async geocode(query: string, bias?: GisBiasContext): Promise<GisLocation[]> {
        if (!query || query.trim().length < 2) return [];
        const cleanQuery = query.trim();
        const targetCountry = normalizeIso2(bias?.countryCode);
        const targetCity = (bias?.city || '').split(',')[0]?.trim().toLowerCase() || '';
        const cacheKey = `${cleanQuery.toLowerCase()}|${targetCountry || ''}|${targetCity}|${bias ? `${bias.lat.toFixed(2)},${bias.lon.toFixed(2)}` : ''}`;
        const cached = GEOCODE_MEM_CACHE.get(cacheKey);
        if (cached && cached.length > 0) return cached;

        const filterAndSortScoped = (items: Array<GisLocation & { _arcScore?: number }>): GisLocation[] => {
            const qLower = cleanQuery.toLowerCase();
            const seen = new Set<string>();
            const scored: Array<{ item: GisLocation; score: number }> = [];

            for (const it of items) {
                const itemCc = normalizeIso2(it.countryCode);
                if (targetCountry && itemCc && itemCc !== targetCountry) continue;

                const dedupKey = `${(it.name || it.address).toLowerCase()}|${Math.round(it.lat * 200)}|${Math.round(it.lon * 200)}`;
                if (seen.has(dedupKey)) continue;
                seen.add(dedupKey);

                let score = Number(it._arcScore ?? 75);
                const nameLower = (it.name || '').toLowerCase();
                const addrLower = (it.address || '').toLowerCase();
                if (nameLower === qLower) score += 35;
                else if (nameLower.startsWith(qLower)) score += 25;
                else if (nameLower.includes(qLower)) score += 12;

                if (bias) {
                    const distKm = haversineKm(bias.lat, bias.lon, it.lat, it.lon);
                    const inCity = (targetCity && addrLower.includes(targetCity)) || distKm <= 55;
                    const explicitOtherCity = targetCity && !qLower.includes(targetCity) && !inCity && (it._arcScore ?? 0) >= 99;
                    if (inCity) score += explicitOtherCity ? 10 : 55;
                    score += Math.max(0, 25 - distKm / 20);
                }

                const { _arcScore, ...cleanItem } = it as any;
                scored.push({ item: cleanItem, score });
            }

            return scored.sort((a, b) => b.score - a.score).slice(0, 8).map(x => x.item);
        };

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
                        const mapped = filterAndSortScoped(data.map((item: any) => {
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
                                countryCode: normalizeIso2(item.countryCode || item.country_code),
                                raw: item
                            };
                        }));
                        if (mapped.length > 0) {
                            GEOCODE_MEM_CACHE.set(cacheKey, mapped);
                            return mapped;
                        }
                    }
                }
            } catch {}
        }

        // 2. Sub-200ms Parallel Race: City+Country Scoped ArcGIS World GeocodeServer + Scoped Photon
        const arcGisTask = (async (): Promise<GisLocation[]> => {
            const ctrl = new AbortController();
            const tid = setTimeout(() => ctrl.abort(), 1800);
            try {
                let baseArc = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&langCode=EN&SingleLine=${encodeURIComponent(cleanQuery)}&maxLocations=6&outFields=PlaceName,Place_addr,LongLabel,ShortLabel,City,Region,Subregion,CntryName,Country,Addr_type,Type`;
                if (targetCountry) baseArc += `&countryCode=${targetCountry}`;
                if (bias) baseArc += `&location=${bias.lon},${bias.lat}`;

                const requests: Promise<any>[] = [];
                if (bias) {
                    const d = 0.65;
                    const extent = `${bias.lon - d},${bias.lat - d},${bias.lon + d},${bias.lat + d}`;
                    requests.push(fetch(`${baseArc}&searchExtent=${extent}`, { signal: ctrl.signal, mode: 'cors' }).then(r => r.ok ? r.json() : null));
                }
                requests.push(fetch(baseArc, { signal: ctrl.signal, mode: 'cors' }).then(r => r.ok ? r.json() : null));

                const settled = await Promise.allSettled(requests);
                const rawCandidates: any[] = [];
                for (const s of settled) {
                    if (s.status === 'fulfilled' && Array.isArray(s.value?.candidates)) {
                        rawCandidates.push(...s.value.candidates);
                    }
                }
                if (rawCandidates.length === 0) throw new Error('ArcGIS empty');

                const mapped = rawCandidates.map((c: any) => {
                    const attrs = c.attributes || {};
                    const lon = Number(c.location?.x ?? 0);
                    const lat = Number(c.location?.y ?? 0);
                    const iso2 = normalizeIso2(attrs.Country);
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
                        _arcScore: Number(c.score ?? 80),
                    };
                });
                const ranked = filterAndSortScoped(mapped);
                if (ranked.length === 0) throw new Error('ArcGIS filtered empty');
                return ranked;
            } finally {
                clearTimeout(tid);
            }
        })();

        const photonTask = (async (): Promise<GisLocation[]> => {
            const ctrl = new AbortController();
            const tid = setTimeout(() => ctrl.abort(), 1100);
            try {
                let photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQuery)}&limit=12`;
                if (bias) photonUrl += `&lat=${bias.lat}&lon=${bias.lon}&zoom=12&location_bias_scale=0.9`;
                const fallbackRes = await fetch(photonUrl, { signal: ctrl.signal });
                if (!fallbackRes.ok) throw new Error('Photon failed');
                const data = await fallbackRes.json();
                if (!Array.isArray(data?.features) || data.features.length === 0) throw new Error('Photon empty');
                const mapped = data.features.map((f: any) => {
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
                        countryCode: normalizeIso2(props.countrycode),
                        raw: f,
                    };
                });
                const ranked = filterAndSortScoped(mapped);
                if (ranked.length === 0) throw new Error('Photon filtered empty');
                return ranked;
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
