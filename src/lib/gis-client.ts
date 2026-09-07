export class GisClient {
    private static baseUrl = process.env.NEXT_PUBLIC_GIS_API_URL ? `${process.env.NEXT_PUBLIC_GIS_API_URL}/api/v1/gis` : 'http://localhost:4000/api/v1/gis';

    static async geocode(query: string, bias?: { lat: number, lon: number }) {
        if (!query || query.length < 3) return [];
        try {
            let url = `${this.baseUrl}/geocode?q=${encodeURIComponent(query)}`;
            if (bias) url += `&lat=${bias.lat}&lon=${bias.lon}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch geocode');
            return await res.json();
        } catch {
            // Proactive Fallback to public Photon
            try {
                const fallbackRes = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`);
                if (fallbackRes.ok) {
                    const data = await fallbackRes.json();
                    return data.features?.map((f: any) => ({
                        displayName: [f.properties.name, f.properties.city, f.properties.country].filter(Boolean).join(', '),
                        lat: f.geometry.coordinates[1],
                        lon: f.geometry.coordinates[0],
                        raw: f
                    })) || [];
                }
            } catch {}
            return [];
        }
    }

    static async getRoute(coordinates: {lat: number, lon: number}[], profile = 'driving') {
        if (!coordinates || coordinates.length < 2) return null;
        try {
            const res = await fetch(`${this.baseUrl}/route`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ coordinates, profile })
            });
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
