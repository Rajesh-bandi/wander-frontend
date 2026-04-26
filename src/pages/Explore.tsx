import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useStore } from "@/lib/store";
import { PlanCard } from "@/components/PlanCard";
import { LocationInput } from "@/components/LocationInput";
import { Search, Compass, Loader2, MapPin, Calendar, Users, SlidersHorizontal, Plus, Navigation } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Plan } from "@/data/types";
import { cn } from "@/lib/utils";
import { useUserLocation, geocodePlace, haversineKm } from "@/lib/geo";

type SortMode = "recent" | "upcoming" | "popular" | "nearest";

export default function Explore() {
  const { plans, refreshPlans } = useStore();
  const { userPos } = useUserLocation();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [sort, setSort] = useState<SortMode>("upcoming");
  const [showFilters, setShowFilters] = useState(false);
  const [distances, setDistances] = useState<Record<string, number>>({});

  useEffect(() => {
    refreshPlans().finally(() => setLoading(false));
  }, []);

  // Geocode destinations and compute distances
  useEffect(() => {
    if (!userPos || plans.length === 0) return;
    const uniqueDests = [...new Set(plans.map((p) => p.destination))];
    let cancelled = false;
    (async () => {
      const result: Record<string, number> = {};
      for (const dest of uniqueDests) {
        if (cancelled) break;
        const coords = await geocodePlace(dest);
        if (coords) {
          const km = haversineKm(userPos.lat, userPos.lng, coords.lat, coords.lng);
          // Map all plans with this destination
          plans.filter((p) => p.destination === dest).forEach((p) => { result[p.id] = km; });
        }
        // Small delay to respect Nominatim rate limits
        await new Promise((r) => setTimeout(r, 300));
      }
      if (!cancelled) setDistances(result);
    })();
    return () => { cancelled = true; };
  }, [userPos, plans]);

  // Filter plans
  let filtered = plans;

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.destination.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }

  if (locationFilter) {
    const loc = locationFilter.toLowerCase();
    filtered = filtered.filter((p) => p.destination.toLowerCase().includes(loc));
  }

  // Sort plans
  if (sort === "upcoming") {
    filtered = [...filtered].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    filtered = filtered.filter((p) => new Date(p.endDate) >= new Date());
  } else if (sort === "recent") {
    filtered = [...filtered].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  } else if (sort === "popular") {
    filtered = [...filtered].sort((a, b) => b.participantIds.length - a.participantIds.length);
  } else if (sort === "nearest" && Object.keys(distances).length > 0) {
    filtered = [...filtered].sort((a, b) => (distances[a.id] ?? Infinity) - (distances[b.id] ?? Infinity));
  }

  // Get unique destinations for quick filters
  const destinations = [...new Set(plans.map((p) => p.destination))].slice(0, 8);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-secondary to-primary">
            <Compass className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-serif text-3xl font-bold">Explore Plans</h1>
            <p className="text-sm text-muted-foreground">Find your next adventure &amp; travel crew</p>
          </div>
        </div>
        <Link href="/plans/new">
          <button className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:shadow-primary/40 active:scale-[0.98]">
            <Plus className="h-4 w-4" /> Create Plan
          </button>
        </Link>
      </header>

      {/* Search + Sort */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search plans, destinations..."
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
          />
        </div>
        <div className="flex gap-2">
          {(["upcoming", "recent", "popular", ...(userPos ? ["nearest" as SortMode] : [])] as SortMode[]).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={cn(
                "rounded-lg px-3 py-2 text-xs font-semibold capitalize transition",
                sort === s ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {s}
            </button>
          ))}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "rounded-lg px-3 py-2 text-xs font-semibold transition",
              showFilters ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Location filter (expandable) */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Filter by destination
                </label>
                <LocationInput
                  value={locationFilter}
                  onChange={(v) => setLocationFilter(v)}
                  placeholder="Search a destination..."
                />
              </div>
              {locationFilter && (
                <button
                  onClick={() => setLocationFilter("")}
                  className="rounded-lg bg-muted px-3 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  Clear
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick destination pills */}
      {destinations.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {destinations.map((dest) => (
            <button
              key={dest}
              onClick={() => setLocationFilter(locationFilter === dest ? "" : dest)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                locationFilter === dest
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-secondary/10 hover:text-secondary"
              )}
            >
              <MapPin className="h-3 w-3" />
              {dest}
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <Compass className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
          <p className="text-lg font-semibold">No plans found</p>
          <p className="text-sm text-muted-foreground">
            {searchQuery || locationFilter
              ? "Try changing your filters"
              : "Be the first to create a travel plan!"}
          </p>
          <Link href="/plans/new">
            <button className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
              <Plus className="h-4 w-4" /> Create Plan
            </button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((plan) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                layout
              >
                <PlanCard plan={plan} distanceKm={distances[plan.id]} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Stats footer */}
      {!loading && filtered.length > 0 && (
        <div className="flex items-center justify-center gap-6 py-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Compass className="h-3.5 w-3.5" /> {filtered.length} plans</span>
          <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {destinations.length} destinations</span>
          <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {filtered.reduce((sum, p) => sum + p.participantIds.length, 0)} travelers</span>
        </div>
      )}
    </div>
  );
}
