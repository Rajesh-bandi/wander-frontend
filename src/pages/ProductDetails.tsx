import { useRoute, Link } from "wouter";
import { useStore } from "@/lib/store";
import { RatingStars } from "@/components/RatingStars";
import { ShoppingBag, Zap, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

export default function ProductDetails() {
  const [, params] = useRoute("/store/:id");
  const id = params?.id;
  const { getProduct, products, addToCart } = useStore();
  const product = id ? getProduct(id) : undefined;
  if (!product) return <div className="py-20 text-center text-muted-foreground">Product not found.</div>;
  const related = products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4);

  return (
    <div className="space-y-10">
      <Link href="/store" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="h-4 w-4" /> Back to store</Link>
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="overflow-hidden rounded-3xl border border-border bg-muted">
          <img src={product.image} alt={product.name} className="aspect-square h-full w-full object-cover" />
        </div>
        <div className="flex flex-col gap-5">
          <span className="self-start rounded-full bg-muted px-3 py-1 text-[11px] font-semibold uppercase tracking-wider">{product.category}</span>
          <h1 className="font-serif text-4xl">{product.name}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RatingStars value={product.rating} size={16} />
            <span>{product.rating.toFixed(1)} · {product.reviewCount} reviews</span>
          </div>
          <p className="font-serif text-4xl">${product.price}</p>
          <p className="leading-relaxed text-foreground/80">{product.description}</p>
          <div className="flex flex-wrap gap-3 pt-2">
            <button onClick={() => { addToCart(product.id); toast.success("Added to cart", { description: product.name }); }} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 active:scale-95">
              <ShoppingBag className="h-4 w-4" /> Add to cart
            </button>
            <button onClick={() => { addToCart(product.id); toast.success("Order placed", { description: product.name }); }} className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-semibold hover:bg-muted">
              <Zap className="h-4 w-4" /> Buy now
            </button>
          </div>
          <ul className="mt-4 grid gap-2 text-xs text-muted-foreground">
            <li>· Free worldwide shipping over $100</li>
            <li>· 30-day returns, no questions</li>
            <li>· Lifetime repair guarantee</li>
          </ul>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="font-serif text-2xl">Recent reviews</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { id: "r1", name: "Marta R.", rating: 5, text: "Held up to three weeks of bikepacking through Iceland. Zero complaints." },
            { id: "r2", name: "Jamal K.", rating: 4, text: "Quality is unreal. A touch heavier than expected, but worth it." },
            { id: "r3", name: "Kenji A.", rating: 5, text: "Customer service was incredible. They sent a replacement strap for free." },
          ].map((r) => (
            <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-semibold">{r.name}</span>
                <RatingStars value={r.rating} />
              </div>
              <p className="text-sm text-foreground/80">{r.text}</p>
            </div>
          ))}
        </div>
      </section>

      {related.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-serif text-2xl">You may also like</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {related.map((p) => (
              <Link key={p.id} href={`/store/${p.id}`}>
                <div className="overflow-hidden rounded-2xl border border-border bg-card hover:shadow-md">
                  <div className="aspect-square overflow-hidden bg-muted"><img src={p.image} alt={p.name} className="h-full w-full object-cover" /></div>
                  <div className="p-3">
                    <p className="line-clamp-1 text-sm font-semibold">{p.name}</p>
                    <p className="text-xs text-muted-foreground">${p.price}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
