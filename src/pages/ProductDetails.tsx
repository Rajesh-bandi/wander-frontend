import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { useStore } from "@/lib/store";
import { RatingStars } from "@/components/RatingStars";
import { ShoppingBag, Zap, ChevronLeft, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

export default function ProductDetails() {
  const [, params] = useRoute("/store/:id");
  const id = params?.id;
  const { getProduct, products, addToCart, currentUser, refreshProducts } = useStore();
  const product = id ? getProduct(id) : undefined;
  
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);

  useEffect(() => {
    if (currentUser && id) {
      api.orders.getMyOrders()
        .then((orders) => {
          const purchased = orders.some((o) => o.items.some((i: any) => i.productId === id));
          setHasPurchased(purchased);
        })
        .catch(() => {});
    }
  }, [currentUser, id]);

  if (!product) return <div className="py-20 text-center text-muted-foreground">Product not found.</div>;
  const related = products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4);

  const formatPrice = (price: number, curr: string) => {
    return curr === "INR" ? `₹${price}` : `$${price}`;
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    setSubmittingReview(true);
    try {
      await api.products.addReview(product.id, { rating, comment });
      toast.success("Review submitted successfully");
      setComment("");
      setRating(5);
      // Wait for store to refresh or we could manually refresh the product
      if (refreshProducts) await refreshProducts();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="space-y-10">
      <Link href="/store" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="h-4 w-4" /> Back to store</Link>
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="overflow-hidden rounded-3xl border border-border bg-muted">
          <img src={product.image} alt={product.name} className="aspect-square h-full w-full object-cover" />
        </div>
        <div className="flex flex-col gap-5">
          <div className="flex justify-between items-start">
            <span className="self-start rounded-full bg-muted px-3 py-1 text-[11px] font-semibold uppercase tracking-wider">{product.category}</span>
            {product.stock <= 5 && product.stock > 0 && (
              <span className="text-xs font-semibold text-orange-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Only {product.stock} left
              </span>
            )}
            {product.stock <= 0 && (
              <span className="text-xs font-semibold text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Out of Stock
              </span>
            )}
          </div>
          <h1 className="font-serif text-4xl">{product.name}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RatingStars value={product.rating} size={16} />
            <span>{product.rating.toFixed(1)} · {product.reviewCount} reviews</span>
          </div>
          <p className="font-serif text-4xl">{formatPrice(product.price, product.currency)}</p>
          <p className="leading-relaxed text-foreground/80">{product.description}</p>
          <div className="flex flex-wrap gap-3 pt-2">
            <button 
              onClick={() => { addToCart(product.id); toast.success("Added to cart", { description: product.name }); }} 
              disabled={product.stock <= 0}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
              <ShoppingBag className="h-4 w-4" /> {product.stock > 0 ? "Add to cart" : "Out of stock"}
            </button>
            <button 
              onClick={async () => {
                try {
                  await api.orders.place([{ productId: product.id, quantity: 1 }]);
                  if (refreshProducts) await refreshProducts();
                  toast.success("Order placed", { description: product.name });
                } catch (err: any) {
                  toast.error(err.message || "Failed to place order");
                }
              }} 
              disabled={product.stock <= 0}
              className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-semibold hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed">
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

      <section className="space-y-6">
        <h2 className="font-serif text-2xl">Verified Reviews</h2>
        
        {/* Review Form */}
        {currentUser && hasPurchased && (
          <form onSubmit={handleReviewSubmit} className="rounded-2xl border border-border bg-card p-5 space-y-4 max-w-xl">
            <h3 className="text-sm font-semibold">Write a Review</h3>
            <p className="text-xs text-muted-foreground">You can only review products you have purchased.</p>
            <div>
              <label className="text-xs font-semibold mb-1 block">Rating (1-5)</label>
              <input 
                type="number" min="1" max="5" value={rating} 
                onChange={e => setRating(Number(e.target.value))} 
                className="input w-24" required 
              />
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block">Comment</label>
              <textarea 
                value={comment} onChange={e => setComment(e.target.value)} 
                className="input min-h-[80px]" placeholder="Share your experience..." required 
              />
            </div>
            <button disabled={submittingReview} type="submit" className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
              {submittingReview ? "Submitting..." : "Submit Review"}
            </button>
          </form>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {product.reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground col-span-full">No reviews yet.</p>
          ) : (
            product.reviews.map((r) => (
              <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-semibold">{r.author ? (typeof r.author === 'object' ? r.author.displayName : r.author) : "Anonymous"}</span>
                  <RatingStars value={r.rating} />
                </div>
                <p className="text-sm text-foreground/80">{r.text}</p>
              </div>
            ))
          )}
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
                    <p className="text-xs text-muted-foreground">{formatPrice(p.price, p.currency)}</p>
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
