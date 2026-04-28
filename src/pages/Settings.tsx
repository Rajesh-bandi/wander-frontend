import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useStore } from "@/lib/store";
import { useTheme } from "@/lib/theme";
import { api } from "@/lib/api";
import { PostCard } from "@/components/PostCard";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import {
  Settings as SettingsIcon, Moon, Sun, Monitor, Bookmark, ShoppingBag,
  Package, ChevronRight, Loader2, MapPin, Heart, MessageCircle, ArrowLeft,
  Clock, CheckCircle, Truck, XCircle, Star, KeyRound, Eye, EyeOff, ShieldCheck,
  AlertTriangle, Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PasswordStrength } from "@/components/PasswordStrength";
import type { Post } from "@/data/types";

type Section = "main" | "appearance" | "saved" | "orders" | "account";

export default function SettingsPage() {
  const { currentUser } = useStore();
  const [section, setSection] = useState<Section>("main");

  if (!currentUser) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Header */}
      <header className="flex items-center gap-3">
        {section !== "main" && (
          <button onClick={() => setSection("main")} className="rounded-full p-1.5 hover:bg-muted transition">
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary/80 to-secondary/80">
            <SettingsIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold">
              {section === "main" && "Settings"}
              {section === "appearance" && "Appearance"}
              {section === "saved" && "Saved Posts"}
              {section === "orders" && "Order History"}
              {section === "account" && "Account"}
            </h1>
            <p className="text-xs text-muted-foreground">@{currentUser.username}</p>
          </div>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {section === "main" && (
          <motion.div key="main" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
            className="space-y-2">
            <MenuItem icon={Sun} label="Appearance" desc="Theme & display settings" onClick={() => setSection("appearance")} />
            <MenuItem icon={KeyRound} label="Account" desc="Password & security" onClick={() => setSection("account")} />
            <MenuItem icon={Bookmark} label="Saved Posts" desc="Your bookmarked posts" onClick={() => setSection("saved")} />
            <MenuItem icon={ShoppingBag} label="Order History" desc="Your past purchases" onClick={() => setSection("orders")} />
          </motion.div>
        )}

        {section === "appearance" && (
          <motion.div key="appearance" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
            <AppearanceSection />
          </motion.div>
        )}

        {section === "saved" && (
          <motion.div key="saved" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
            <SavedSection />
          </motion.div>
        )}

        {section === "orders" && (
          <motion.div key="orders" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
            <OrdersSection />
          </motion.div>
        )}

        {section === "account" && (
          <motion.div key="account" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
            <AccountSection />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Menu item ─── */
function MenuItem({ icon: Icon, label, desc, onClick }: { icon: any; label: string; desc: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left transition hover:bg-muted/50 active:scale-[0.99]">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

/* ─── Appearance ─── */
function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const themes = [
    { value: "light" as const, label: "Light", icon: Sun, desc: "Clean & bright" },
    { value: "dark" as const, label: "Dark", icon: Moon, desc: "Easy on the eyes" },
    { value: "system" as const, label: "System", icon: Monitor, desc: "Match your device" },
  ];

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">Theme</p>
      <div className="grid grid-cols-3 gap-3">
        {themes.map((t) => (
          <button key={t.value} onClick={() => setTheme(t.value)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition",
              theme === t.value ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/50"
            )}>
            <t.icon className={cn("h-6 w-6", theme === t.value ? "text-primary" : "text-muted-foreground")} />
            <span className="text-sm font-semibold">{t.label}</span>
            <span className="text-[10px] text-muted-foreground">{t.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Saved Posts ─── */
function SavedSection() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.posts.getSaved()
      .then((res) => setPosts(res.posts as Post[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (posts.length === 0) return <EmptyState icon={Bookmark} title="No saved posts" description="Tap the bookmark icon on posts to save them here." />;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 sm:gap-3">
      {posts.map((p) => (
        <motion.div key={p.id} whileHover={{ scale: 1.02 }}
          className="group relative aspect-square overflow-hidden rounded-xl bg-muted cursor-pointer">
          <img src={p.image} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition" />
          <div className="absolute inset-x-0 bottom-0 p-2 opacity-0 group-hover:opacity-100 transition">
            {p.location && (
              <div className="flex items-center gap-1 text-[10px] text-white/90">
                <MapPin className="h-2.5 w-2.5" />{p.location}
              </div>
            )}
            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-white/80">
              <span className="flex items-center gap-0.5"><Heart className="h-2.5 w-2.5" />{typeof p.likes === "number" ? p.likes : 0}</span>
              <span className="flex items-center gap-0.5"><MessageCircle className="h-2.5 w-2.5" />{p.comments?.length || 0}</span>
            </div>
          </div>
          <div className="absolute right-1.5 top-1.5">
            <Bookmark className="h-3.5 w-3.5 fill-white text-white drop-shadow" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ─── Order History ─── */
const STATUS_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  pending: { icon: Clock, color: "text-amber-500", label: "Pending" },
  confirmed: { icon: CheckCircle, color: "text-blue-500", label: "Confirmed" },
  shipped: { icon: Truck, color: "text-purple-500", label: "Shipped" },
  delivered: { icon: CheckCircle, color: "text-emerald-500", label: "Delivered" },
  cancelled: { icon: XCircle, color: "text-red-500", label: "Cancelled" },
};

function OrdersSection() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.orders.getMyOrders()
      .then((o) => setOrders(o))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const formatPrice = (price: number, curr: string) => {
    return curr === "INR" ? `₹${price?.toFixed(2)}` : `$${price?.toFixed(2)}`;
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (orders.length === 0) return <EmptyState icon={ShoppingBag} title="No orders yet" description="Your purchase history will appear here." />;

  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
        const StatusIcon = status.icon;
        return (
          <div key={order.id} className="rounded-2xl border border-border bg-card overflow-hidden">
            {/* Order header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <div className="text-xs text-muted-foreground">Order #{order.id.slice(-8).toUpperCase()}</div>
                <div className="text-[10px] text-muted-foreground">{new Date(order.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</div>
              </div>
              <div className={cn("flex items-center gap-1 text-xs font-semibold", status.color)}>
                <StatusIcon className="h-3.5 w-3.5" />
                {status.label}
              </div>
            </div>

            {/* Items */}
            <div className="divide-y divide-border">
              {order.items.map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <img src={item.image} alt={item.name} className="h-12 w-12 rounded-lg object-cover bg-muted" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{item.name}</div>
                    <div className="text-xs text-muted-foreground">Qty: {item.quantity} × {formatPrice(item.priceAtPurchase, order.currency)}</div>
                  </div>
                  <div className="text-sm font-semibold">{formatPrice(item.priceAtPurchase * item.quantity, order.currency)}</div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-3">
              <span className="text-xs font-semibold text-muted-foreground">Total</span>
              <span className="text-base font-bold">{formatPrice(order.totalAmount, order.currency)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Account / Change Password ─── */
function AccountSection() {
  const { currentUser, deleteAccount } = useStore();
  const [, navigate] = useLocation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }

    try {
      setLoading(true);
      await api.auth.changePassword({ currentPassword, newPassword });
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== "DELETE") {
      toast.error('Please type "DELETE" to confirm');
      return;
    }
    if (!deletePassword) {
      toast.error("Please enter your password");
      return;
    }
    try {
      setDeleteLoading(true);
      await deleteAccount({ password: deletePassword, confirmation: deleteConfirmation });
      toast.success("Account deleted. We're sorry to see you go.");
      navigate("/login");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete account");
    } finally {
      setDeleteLoading(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Verification status */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
            currentUser?.isVerified ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-amber-100 dark:bg-amber-900/30"
          )}>
            <ShieldCheck className={cn(
              "h-5 w-5",
              currentUser?.isVerified ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
            )} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">Email Verification</div>
            <div className={cn(
              "text-xs",
              currentUser?.isVerified ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
            )}>
              {currentUser?.isVerified ? "Verified" : "Not verified"}
            </div>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold">Change Password</div>
            <div className="text-xs text-muted-foreground">Update your account password</div>
          </div>
        </div>

        {success && (
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <p className="text-xs text-emerald-700 dark:text-emerald-300">Password changed successfully!</p>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-3">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Current password</label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type={showCurrent ? "text" : "password"}
                required
                value={currentPassword}
                onChange={(e) => { setCurrentPassword(e.target.value); setSuccess(false); }}
                className="input pl-10 pr-10"
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">New password</label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type={showNew ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setSuccess(false); }}
                className="input pl-10 pr-10"
                placeholder="••••••••"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {newPassword && <PasswordStrength password={newPassword} />}

          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Confirm new password</label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type={showConfirm ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setSuccess(false); }}
                className="input pl-10 pr-10"
                placeholder="••••••••"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirmPassword && newPassword && confirmPassword !== newPassword && (
              <p className="mt-1 text-[11px] text-red-500">Passwords don't match</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || (confirmPassword !== "" && newPassword !== confirmPassword)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Updating...</> : "Change password"}
          </button>
        </form>
      </div>

      {/* Danger Zone - Delete Account */}
      <div className="rounded-2xl border-2 border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-red-700 dark:text-red-400">Danger Zone</div>
            <div className="text-xs text-red-600/70 dark:text-red-400/60">Irreversible and destructive actions</div>
          </div>
        </div>

        <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-white dark:bg-card p-4 space-y-3">
          <div>
            <div className="text-sm font-semibold">Delete Account</div>
            <p className="text-xs text-muted-foreground mt-1">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
          </div>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 active:scale-[0.98]"
          >
            <Trash2 className="h-4 w-4" /> Delete my account
          </button>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-border bg-background p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Delete your account?</h3>
                  <p className="text-xs text-muted-foreground">This action is irreversible</p>
                </div>
              </div>

              <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 p-3">
                <p className="text-xs text-red-700 dark:text-red-300">
                  Your profile, posts, and all data will be permanently deleted. You will be removed from all plans and group chats.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Your password</label>
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    className="input"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Type <span className="font-bold text-red-600">DELETE</span> to confirm
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    className="input"
                    placeholder="DELETE"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowDeleteModal(false); setDeletePassword(""); setDeleteConfirmation(""); }}
                  className="flex-1 rounded-full border border-border py-2.5 text-sm font-semibold transition hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading || deleteConfirmation !== "DELETE" || !deletePassword}
                  className="flex-1 rounded-full bg-red-600 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 active:scale-[0.98] disabled:opacity-50"
                >
                  {deleteLoading ? <><Loader2 className="h-4 w-4 animate-spin inline mr-1" /> Deleting...</> : "Delete account"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
