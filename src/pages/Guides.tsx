import { useMemo, useState } from "react";
import { GuideCard } from "@/components/GuideCard";
import { EmptyState } from "@/components/EmptyState";
import { BookOpen, Search } from "lucide-react";
import { MOCK_GUIDES } from "@/data/mock";

export default function Guides() {
  const guides = MOCK_GUIDES;
  const countries = useMemo(() => ["All", ...Array.from(new Set(guides.map((g) => g.country)))], [guides]);
  const seasons = useMemo(() => ["All", ...Array.from(new Set(guides.map((g) => g.season)))], [guides]);
  const [country, setCountry] = useState("All");
  const [season, setSeason] = useState("All");
  const [q, setQ] = useState("");

  const filtered = guides.filter((g) =>
    (country === "All" || g.country === country) &&
    (season === "All" || g.season === season) &&
    (!q || `${g.place} ${g.country} ${g.state}`.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-serif text-4xl">Travel guides</h1>
        <p className="text-sm text-muted-foreground">Real on-the-ground knowledge from travelers who've been there.</p>
      </header>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="grid gap-4 lg:grid-cols-[1fr_220px_220px]">
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-4 h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a place..." className="h-11 w-full rounded-xl border border-border bg-background pl-11 pr-4 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/30" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Country</label>
            <select value={country} onChange={(e) => setCountry(e.target.value)} className="input">
              {countries.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Season</label>
            <select value={season} onChange={(e) => setSeason(e.target.value)} className="input">
              {seasons.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={BookOpen} title="No guides match your filters" />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((g) => <GuideCard key={g.id} guide={g} />)}
        </div>
      )}
    </div>
  );
}
