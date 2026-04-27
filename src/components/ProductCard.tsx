import { motion } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import { Link } from "wouter";
import { useStore } from "@/lib/store";
import { RatingStars } from "./RatingStars";
import type { Product } from "@/data/types";

export function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useStore();
  return (
    <motion.div
      whileHover={{ y: -3 }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
    >
      <Link href={`/store/${product.id}`} className="relative block aspect-square overflow-hidden bg-muted">
        <img src={product.image} alt={product.name} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
        <span className="absolute left-3 top-3 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider backdrop-blur">{product.category}</span>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link href={`/store/${product.id}`} className="line-clamp-1 text-sm font-semibold hover:underline">{product.name}</Link>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <RatingStars value={product.rating} />
          <span className="ml-1">{product.rating.toFixed(1)} ({product.reviewCount})</span>
        </div>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="font-serif text-lg">
            {product.currency === "INR" ? "₹" : "$"}{product.price}
          </span>
          <button
            onClick={(e) => { e.preventDefault(); addToCart(product.id); }}
            disabled={product.stock <= 0}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs font-semibold text-primary-foreground transition ${product.stock > 0 ? "bg-primary hover:opacity-90 active:scale-95" : "bg-muted text-muted-foreground cursor-not-allowed"}`}
          >
            <ShoppingBag className="h-3.5 w-3.5" /> {product.stock > 0 ? "Add" : "Out of Stock"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
