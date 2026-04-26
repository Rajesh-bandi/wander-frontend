import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Loader2 } from "lucide-react";

type PostLocation = {
  id: string;
  location: string;
  image: string;
  caption: string;
  lat: number;
  lng: number;
};

type Props = {
  posts: { id: string; location?: string; image: string; caption?: string }[];
};

// Fix Leaflet default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

export function TripMap({ posts }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const [locations, setLocations] = useState<PostLocation[]>([]);
  const [loading, setLoading] = useState(true);

  // Geocode all locations using Nominatim
  useEffect(() => {
    const postsWithLocation = posts.filter((p) => p.location);
    if (postsWithLocation.length === 0) {
      setLoading(false);
      return;
    }

    const geocode = async () => {
      const results: PostLocation[] = [];
      // Deduplicate locations to save API calls
      const uniqueLocations = [...new Set(postsWithLocation.map((p) => p.location!))];
      const cache: Record<string, { lat: number; lng: number }> = {};

      for (const loc of uniqueLocations) {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(loc)}`,
            { headers: { "Accept-Language": "en" } }
          );
          const data = await res.json();
          if (data?.[0]) {
            cache[loc] = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
          }
        } catch {}
        // Rate limit: 1 request per second
        await new Promise((r) => setTimeout(r, 1100));
      }

      for (const p of postsWithLocation) {
        const coords = cache[p.location!];
        if (coords) {
          results.push({
            id: p.id,
            location: p.location!,
            image: p.image,
            caption: p.caption || "",
            ...coords,
          });
        }
      }

      setLocations(results);
      setLoading(false);
    };

    geocode();
  }, [posts]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || loading || locations.length === 0) return;
    if (leafletMap.current) {
      leafletMap.current.remove();
      leafletMap.current = null;
    }

    const map = L.map(mapRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView([20, 0], 2);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      maxZoom: 18,
    }).addTo(map);

    const bounds = L.latLngBounds([]);

    locations.forEach((loc) => {
      const marker = L.marker([loc.lat, loc.lng]).addTo(map);
      bounds.extend([loc.lat, loc.lng]);

      const popupContent = `
        <div style="width:200px;font-family:system-ui,sans-serif">
          <img src="${loc.image}" alt="" style="width:100%;height:120px;object-fit:cover;border-radius:8px;margin-bottom:8px" />
          <div style="font-weight:600;font-size:13px;margin-bottom:2px">${loc.location}</div>
          ${loc.caption ? `<div style="font-size:11px;color:#888;line-height:1.3">${loc.caption.slice(0, 80)}${loc.caption.length > 80 ? "..." : ""}</div>` : ""}
        </div>
      `;
      marker.bindPopup(popupContent, { maxWidth: 220 });
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 });
    }

    leafletMap.current = map;

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, [locations, loading]);

  const postsWithLocation = posts.filter((p) => p.location);

  if (postsWithLocation.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <MapPin className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No location-tagged posts yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <MapPin className="h-4 w-4 text-primary" />
        Travel Map
        <span className="text-xs font-normal text-muted-foreground">
          ({locations.length} {locations.length === 1 ? "place" : "places"} visited)
        </span>
      </div>
      <div className="relative overflow-hidden rounded-2xl border border-border bg-muted" style={{ height: 380 }}>
        {loading ? (
          <div className="flex h-full items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading map...</span>
          </div>
        ) : (
          <div ref={mapRef} className="h-full w-full" />
        )}
      </div>
    </div>
  );
}
