import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";

type LocationSuggestion = {
  display_name: string;
  lat: string;
  lon: string;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export function LocationInput({ value, onChange, placeholder = "Add location...", className = "" }: Props) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync external value
  useEffect(() => { setQuery(value); }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setSuggestions([]); return; }
    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(q)}`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      setSuggestions(data);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (val: string) => {
    setQuery(val);
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 400);
  };

  const selectSuggestion = (s: LocationSuggestion) => {
    // Use a shorter display: take first 2-3 meaningful parts
    const parts = s.display_name.split(", ");
    const short = parts.slice(0, 3).join(", ");
    setQuery(short);
    onChange(short);
    setSuggestions([]);
    setFocused(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder={placeholder}
          className={`w-full rounded-xl border border-border bg-muted/50 py-2.5 pl-10 pr-8 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/40 focus:ring-2 focus:ring-primary/10 ${className}`}
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
      </div>

      {/* Suggestions dropdown */}
      {focused && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          {suggestions.map((s, i) => {
            const parts = s.display_name.split(", ");
            const main = parts.slice(0, 2).join(", ");
            const sub = parts.slice(2, 4).join(", ");
            return (
              <button
                key={`${s.lat}-${s.lon}-${i}`}
                onClick={() => selectSuggestion(s)}
                className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition hover:bg-muted"
              >
                <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{main}</div>
                  {sub && <div className="text-[11px] text-muted-foreground truncate">{sub}</div>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
