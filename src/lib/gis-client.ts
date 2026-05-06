export class GisClient {
    private static baseUrl = process.env.NEXT_PUBLIC_GIS_BASE_URL || 'http://localhost:4000/api/v1/gis';

    static async geocode(query: string, bias?: { lat: number, lon: number }) {
        if (!query || query.length < 3) return [];
        try {
            let url = `${this.baseUrl}/geocode?q=${encodeURIComponent(query)}`;
            if (bias) url += `&lat=${bias.lat}&lon=${bias.lon}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch geocode');
            return await res.json();
        } catch (e) {
            console.error(e);
            return [];
        }
    }

    static async getRoute(coordinates: {lat: number, lon: number}[], profile = 'driving') {
        try {
            const res = await fetch(`${this.baseUrl}/route`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ coordinates, profile })
            });
            return await res.json();
        } catch (e) {
            console.error(e);
            return null;
        }
    }
}
