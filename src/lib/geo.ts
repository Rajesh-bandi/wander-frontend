import { useEffect, useState } from "react";

// ─── Haversine distance (km) ───
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 100) return `${km.toFixed(1)} km`;
  return `${Math.round(km).toLocaleString()} km`;
}

// ─── Geocode cache (destination name → coords) ───
const geoCache = new Map<string, { lat: number; lng: number } | null>();
const pendingRequests = new Map<string, Promise<{ lat: number; lng: number } | null>>();

export async function geocodePlace(name: string): Promise<{ lat: number; lng: number } | null> {
  const key = name.trim().toLowerCase();
  if (geoCache.has(key)) return geoCache.get(key)!;
  if (pendingRequests.has(key)) return pendingRequests.get(key)!;

  const promise = (async () => {
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(name)}&format=json&limit=1`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await resp.json();
      if (data?.[0]) {
        const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        geoCache.set(key, result);
        return result;
      }
    } catch {}
    geoCache.set(key, null);
    return null;
  })();

  pendingRequests.set(key, promise);
  const result = await promise;
  pendingRequests.delete(key);
  return result;
}

// ─── Hook: get user's current GPS position ───
let cachedUserPos: { lat: number; lng: number } | null = null;

export function useUserLocation() {
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(cachedUserPos);
  const [loading, setLoading] = useState(!cachedUserPos);

  useEffect(() => {
    if (cachedUserPos) { setPos(cachedUserPos); setLoading(false); return; }
    if (!navigator.geolocation) { setLoading(false); return; }

    navigator.geolocation.getCurrentPosition(
      (p) => {
        cachedUserPos = { lat: p.coords.latitude, lng: p.coords.longitude };
        setPos(cachedUserPos);
        setLoading(false);
      },
      () => setLoading(false),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
    );
  }, []);

  return { userPos: pos, loading };
}
