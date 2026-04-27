import { motion, AnimatePresence } from "framer-motion";
import { X, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { api } from "@/lib/api";

export function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { cart, getProduct, setCartQty, removeFromCart, clearCart, refreshProducts } = useStore();
  const items = cart.map((c) => ({ c, p: getProduct(c.productId)! })).filter((x) => x.p);
  const total = items.reduce((s, x) => s + x.p.price * x.c.qty, 0);
  const currency = items.length > 0 ? items[0].p.currency : "USD";
  const [checkingOut, setCheckingOut] = useState(false);

  const formatPrice = (price: number, curr: string) => {
    return curr === "INR" ? `₹${price?.toFixed(2)}` : `$${price?.toFixed(2)}`;
  };

  const handleCheckout = async () => {
    if (items.length === 0) return;
    setCheckingOut(true);
    try {
      const orderItems = items.map(({ c, p }) => ({ productId: p.id, quantity: c.qty }));
      await api.orders.place(orderItems);
      clearCart();
      onClose();
      if (refreshProducts) await refreshProducts();
      toast.success("Order placed successfully", { description: "Your travel gear is on its way." });
    } catch (err: any) {
      toast.error(err.message || "Failed to place order");
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-background shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="font-serif text-2xl">Your Cart</h2>
              <button onClick={onClose} className="rounded-full p-2 hover:bg-muted"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                  <ShoppingBag className="h-12 w-12" />
                  <p>Your cart is empty.</p>
                </div>
              ) : (
                <ul className="space-y-4">
                  {items.map(({ c, p }) => (
                    <li key={p.id} className="flex gap-3 rounded-2xl border border-border p-3">
                      <img src={p.image} alt={p.name} className="h-20 w-20 rounded-xl object-cover" />
                      <div className="flex flex-1 flex-col">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="line-clamp-1 text-sm font-semibold">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{formatPrice(p.price, p.currency)}</p>
                          </div>
                          <button onClick={() => removeFromCart(p.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                        </div>
                        <div className="mt-auto flex items-center justify-between">
                          <div className="inline-flex items-center rounded-full border border-border">
                            <button onClick={() => setCartQty(p.id, c.qty - 1)} className="px-2 py-1"><Minus className="h-3 w-3" /></button>
                            <span className="w-6 text-center text-xs font-semibold tabular-nums">{c.qty}</span>
                            <button onClick={() => setCartQty(p.id, c.qty + 1)} className="px-2 py-1"><Plus className="h-3 w-3" /></button>
                          </div>
                          <span className="text-sm font-semibold">{formatPrice(p.price * c.qty, p.currency)}</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {items.length > 0 && (
              <div className="space-y-3 border-t border-border bg-card/50 p-5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-serif text-2xl">{formatPrice(total, currency)}</span>
                </div>
                <button
                  disabled={checkingOut}
                  onClick={handleCheckout}
                  className="w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                >
                  {checkingOut ? "Processing..." : "Checkout"}
                </button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
