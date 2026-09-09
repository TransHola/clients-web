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

export class GisClient {
    private static baseUrl = process.env.NEXT_PUBLIC_GIS_API_URL ? `${process.env.NEXT_PUBLIC_GIS_API_URL}/api/v1/gis` : 'http://localhost:4000/api/v1/gis';

    static async geocode(query: string, bias?: { lat: number, lon: number }): Promise<GisLocation[]> {
        if (!query || query.trim().length < 2) return [];
        const cleanQuery = query.trim();

        // 1. Try Primary GIS API if available (with 1.5s timeout to prevent UI hang)
        try {
            let url = `${this.baseUrl}/geocode?q=${encodeURIComponent(cleanQuery)}`;
            if (bias) url += `&lat=${bias.lat}&lon=${bias.lon}`;
            
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 1500);
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timer);

            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    return data.map((item: any) => {
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
                }
            }
        } catch {
            // Fall through to public geocoding services
        }

        // 2. High-speed Fallback: Photon (OpenStreetMap geocoder)
        try {
            let photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQuery)}&limit=8`;
            if (bias) {
                photonUrl += `&lat=${bias.lat}&lon=${bias.lon}`;
            }
            const fallbackRes = await fetch(photonUrl);
            if (fallbackRes.ok) {
                const data = await fallbackRes.json();
                if (Array.isArray(data.features) && data.features.length > 0) {
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
                            raw: f
                        };
                    });
                }
            }
        } catch {}

        // 3. Robust Fallback: Nominatim (OpenStreetMap)
        try {
            const nomRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery)}&limit=6&addressdetails=1`, {
                headers: { 'User-Agent': 'TransHola-Web/1.0' }
            });
            if (nomRes.ok) {
                const nomData = await nomRes.json();
                if (Array.isArray(nomData) && nomData.length > 0) {
                    return nomData.map((item: any) => {
                        const lat = parseFloat(item.lat);
                        const lon = parseFloat(item.lon);
                        const address = item.display_name || cleanQuery;
                        const name = item.name || address.split(',')[0];
                        return {
                            address,
                            name,
                            displayName: address,
                            coordinate: { lat, lon },
                            lat,
                            lon,
                            countryCode: item.address?.country_code ? String(item.address.country_code).toUpperCase() : undefined,
                            raw: item
                        };
                    });
                }
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
