import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Compass, MessageCircle, ShoppingBag, BookOpen, Plus, Search, Sparkles, User as UserIcon, LogOut, MapPin, X, Loader2, Moon, Sun, Bell, Bookmark } from "lucide-react";
import { useCurrentUser, useStore } from "@/lib/store";
import { useTheme } from "@/lib/theme";
import { useSocket } from "@/lib/socket";
import { api } from "@/lib/api";
import { Avatar } from "../Avatar";
import { CartDrawer } from "../CartDrawer";
import { cn } from "@/lib/utils";
import type { User, Post } from "@/data/types";

const NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/chats", label: "Chats", icon: MessageCircle },
  { href: "/store", label: "Store", icon: ShoppingBag },
  { href: "/guides", label: "Guides", icon: BookOpen },
];

function isActive(loc: string, href: string) {
  if (href === "/") return loc === "/";
  return loc === href || loc.startsWith(href + "/");
}

export function AppLayout({ children }: { children: ReactNode }) {
  const [loc, navigate] = useLocation();
  const me = useCurrentUser();
  const { cart, isPremium, logout } = useStore();
  const { theme, toggle: toggleTheme } = useTheme();
  const { unreadCount, unreadChatIds } = useSocket();
  const [cartOpen, setCartOpen] = useState(false);
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);
  const hasUnreadChats = unreadChatIds.size > 0;

  // Search state
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const [searching, setSearching] = useState(false);
  const [resultUsers, setResultUsers] = useState<User[]>([]);
  const [resultPosts, setResultPosts] = useState<Post[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = q.trim();
    if (!trimmed) { setResultUsers([]); setResultPosts([]); setSearching(false); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.search(trimmed);
        setResultUsers(res.users as User[]);
        setResultPosts(res.posts as Post[]);
      } catch { setResultUsers([]); setResultPosts([]); }
      finally { setSearching(false); }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setFocused(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const clearSearch = () => { setQ(""); setResultUsers([]); setResultPosts([]); setFocused(false); };
  const showDropdown = focused && q.trim().length > 0;

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-sidebar lg:flex">
        <div className="flex h-16 items-center px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground"><Compass className="h-4 w-4" /></span>
            <span className="font-serif text-2xl tracking-tight">Wander</span>
          </Link>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = isActive(loc, n.href);
            const showDot = n.href === "/chats" && hasUnreadChats;
            return (
              <Link key={n.href} href={n.href}>
                <span className={cn("group flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition", active ? "bg-primary/10 text-primary" : "text-foreground/70 hover:bg-muted hover:text-foreground")}>
                  <span className="relative">
                    <Icon className="h-5 w-5" />
                    {showDot && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-sidebar" />}
                  </span>
                  {n.label}
                </span>
              </Link>
            );
          })}
          <button onClick={() => navigate("/plans/new")} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90">
            <Plus className="h-4 w-4" /> Create Plan
          </button>
          <Link href="/subscription">
            <span className={cn("mt-2 flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition", loc.startsWith("/subscription") ? "bg-accent/20 text-accent-foreground" : "text-foreground/70 hover:bg-muted")}>
              <Sparkles className="h-5 w-5" />{isPremium ? "Premium · Active" : "Go Premium"}
            </span>
          </Link>
        </nav>
        <div className="m-3 space-y-2">
          <Link href={`/profile/${me.username}`}>
            <span className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card p-3 hover:bg-muted">
              <Avatar src={me.avatar} alt={me.displayName} size={36} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{me.displayName}</div>
                <div className="truncate text-xs text-muted-foreground">@{me.username}</div>
              </div>
            </span>
          </Link>
          <button onClick={handleLogout} className="flex w-full items-center justify-center gap-1 rounded-lg border border-border px-2 py-1.5 text-xs font-semibold text-foreground/70 hover:bg-muted">
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </aside>

      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur lg:pl-64">
        <div className="flex h-14 items-center gap-3 px-4 lg:px-6">
          {/* Mobile logo */}
          <Link href="/" className="flex items-center gap-2 lg:hidden">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground"><Compass className="h-4 w-4" /></span>
          </Link>

          {/* Centered search bar */}
          <div className="flex flex-1 justify-center px-1 sm:px-0">
            <div ref={searchRef} className="relative w-full max-w-[200px] sm:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onFocus={() => setFocused(true)}
                type="text"
                placeholder="Search travelers, posts..."
                className="h-9 w-full rounded-full border border-border bg-card pl-10 pr-10 text-sm outline-none transition focus:border-primary"
              />
              {q && (
                <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
              )}

              <AnimatePresence>
                {showDropdown && (
                  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.15 }}
                    className="absolute left-0 right-0 top-11 max-h-[420px] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl">
                    {searching && <div className="flex items-center justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>}
                    {!searching && resultUsers.length === 0 && resultPosts.length === 0 && (
                      <div className="py-8 text-center text-sm text-muted-foreground">No results for "{q.trim()}"</div>
                    )}
                    {resultUsers.length > 0 && (
                      <div className="p-2">
                        <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Travelers</div>
                        {resultUsers.slice(0, 5).map((u) => (
                          <Link key={u.id} href={`/profile/${u.username}`} onClick={clearSearch} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-muted">
                            <Avatar src={u.avatar} alt={u.displayName} size={36} />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-semibold">{u.displayName}</div>
                              <div className="truncate text-xs text-muted-foreground">@{u.username}</div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                    {resultPosts.length > 0 && (
                      <div className="border-t border-border p-2">
                        <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Posts</div>
                        {resultPosts.slice(0, 5).map((p) => (
                          <div key={p.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-muted cursor-default">
                            <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-muted"><img src={p.image} alt="" className="h-full w-full object-cover" /></div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium">{p.caption || "No caption"}</div>
                              {p.location && <div className="truncate text-xs text-muted-foreground"><MapPin className="mr-0.5 inline h-3 w-3" />{p.location}</div>}
                            </div>
                            <span className="text-xs text-muted-foreground">❤ {p.likes}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right icons */}
          <div className="flex items-center gap-1">
            {/* Theme toggle */}
            <button onClick={toggleTheme} className="grid h-9 w-9 place-items-center rounded-full transition hover:bg-muted" aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="h-[18px] w-[18px] text-amber-400" /> : <Moon className="h-[18px] w-[18px]" />}
            </button>
            {/* Notifications */}
            <Link href="/notifications" className="relative grid h-9 w-9 place-items-center rounded-full transition hover:bg-muted" aria-label="Notifications">
              <Bell className="h-[18px] w-[18px]" />
              {unreadCount > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </Link>
            {/* Cart */}
            <button onClick={() => setCartOpen(true)} className="relative grid h-9 w-9 place-items-center rounded-full transition hover:bg-muted" aria-label="Cart">
              <ShoppingBag className="h-[18px] w-[18px]" />
              {cartCount > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">{cartCount}</span>}
            </button>
            {/* Avatar */}
            <Link href={`/profile/${me.username}`}>
              <Avatar src={me.avatar} alt={me.displayName} size={28} ring />
            </Link>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="lg:pl-64">
        <motion.div key={loc} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
          className="mx-auto max-w-7xl px-4 pb-28 pt-6 lg:px-8 lg:pb-12">
          {children}
        </motion.div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur lg:hidden">
        <div className="relative grid grid-cols-5">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = isActive(loc, n.href);
            const showDot = n.href === "/chats" && hasUnreadChats;
            return (
              <Link key={n.href} href={n.href}>
                <span className={cn("flex flex-col items-center gap-0.5 py-2.5 text-[10px]", active ? "text-primary" : "text-muted-foreground")}>
                  <span className="relative">
                    <Icon className="h-5 w-5" />
                    {showDot && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-red-500" />}
                  </span>
                  {n.label}
                </span>
              </Link>
            );
          })}
          <button onClick={() => navigate("/plans/new")} aria-label="Create plan"
            className="absolute -top-6 left-1/2 grid h-12 w-12 -translate-x-1/2 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background transition active:scale-95">
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </nav>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}

export function ProfileChip({ userId }: { userId: string }) {
  const { getUser } = useStore();
  const u = getUser(userId);
  if (!u) return null;
  return (
    <Link href={`/profile/${u.username}`}>
      <span className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-card px-2 py-1 text-xs hover:bg-muted">
        <Avatar src={u.avatar} alt={u.displayName} size={20} />
        <span>{u.displayName}</span>
      </span>
    </Link>
  );
}

export { UserIcon };
