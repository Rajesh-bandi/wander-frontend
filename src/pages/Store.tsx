import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { ProductCard } from "@/components/ProductCard";
import { EmptyState } from "@/components/EmptyState";
import { ShoppingBag, Search } from "lucide-react";

export default function Store() {
  const { products } = useStore();
  const categories = useMemo(() => ["All", ...Array.from(new Set(products.map((p) => p.category)))], [products]);
  const max = useMemo(() => Math.ceil(Math.max(...products.map((p) => p.price)) / 10) * 10, [products]);
  const [cat, setCat] = useState("All");
  const [maxPrice, setMaxPrice] = useState(max);
  const [q, setQ] = useState("");

  const filtered = products.filter((p) =>
    (cat === "All" || p.category === cat) && p.price <= maxPrice &&
    (!q || p.name.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-serif text-4xl">Travel store</h1>
        <p className="text-sm text-muted-foreground">Curated gear for every trip.</p>
      </header>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="grid gap-4 lg:grid-cols-[1fr_220px_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products..." className="h-11 w-full rounded-full border border-border bg-background pl-10 pr-4 text-sm outline-none focus:border-primary" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Max price: ${maxPrice}</label>
            <input type="range" min={20} max={max} value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className="w-full accent-primary" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Category</label>
            <select value={cat} onChange={(e) => setCat(e.target.value)} className="input">
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="Nothing matches your filters" />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
