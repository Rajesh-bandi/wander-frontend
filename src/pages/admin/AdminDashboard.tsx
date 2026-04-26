import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Users, Image as ImageIcon, Map, MessageCircle, Crown, TrendingUp,
  Trash2, Search, ChevronLeft, ChevronRight, LogOut, Compass, ToggleLeft, ToggleRight,
  UserCheck, UserX, Eye, Loader2, BarChart3, Activity, ShoppingBag, DollarSign,
  Plus, Edit2, X, Ban, Check, Package, Upload, Menu,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

const API = `${import.meta.env.VITE_API_URL}/api`;

type Tab = "dashboard" | "users" | "posts" | "plans" | "products" | "revenue";

function adminFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem("wander.admin.token");
  return fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> || {}),
    },
  }).then(async (res) => {
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    return data;
  });
}

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [loading, setLoading] = useState(true);
  const [mobileMenu, setMobileMenu] = useState(false);

  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const [userSearch, setUserSearch] = useState("");
  const [posts, setPosts] = useState<any[]>([]);
  const [postTotal, setPostTotal] = useState(0);
  const [postPage, setPostPage] = useState(1);
  const [plans, setPlans] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [revenue, setRevenue] = useState<any>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [pForm, setPForm] = useState({ name: "", description: "", image: "", price: "", category: "other", stock: "0", featured: false });
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [productImagePreview, setProductImagePreview] = useState("");
  const productFileRef = useRef<HTMLInputElement>(null);

  const logout = () => { localStorage.removeItem("wander.admin.token"); navigate("/admin/login"); };

  const loadStats = useCallback(async () => {
    try { const d = await adminFetch("/admin/stats"); setStats(d); }
    catch (err: any) { if (err.message.includes("token") || err.message.includes("Admin")) { logout(); return; } toast.error(err.message); }
  }, []);
  const loadUsers = useCallback(async () => {
    try { const d = await adminFetch(`/admin/users?page=${userPage}&limit=20&q=${encodeURIComponent(userSearch)}`); setUsers(d.users); setUserTotal(d.total); }
    catch (err: any) { toast.error(err.message); }
  }, [userPage, userSearch]);
  const loadPosts = useCallback(async () => {
    try { const d = await adminFetch(`/admin/posts?page=${postPage}&limit=20`); setPosts(d.posts); setPostTotal(d.total); }
    catch (err: any) { toast.error(err.message); }
  }, [postPage]);
  const loadPlans = useCallback(async () => {
    try { const d = await adminFetch("/admin/plans"); setPlans(d.plans); }
    catch (err: any) { toast.error(err.message); }
  }, []);
  const loadProducts = useCallback(async () => {
    try { const d = await adminFetch("/admin/products"); setProducts(d.products); }
    catch (err: any) { toast.error(err.message); }
  }, []);
  const loadRevenue = useCallback(async () => {
    try { const d = await adminFetch("/admin/revenue"); setRevenue(d); }
    catch (err: any) { toast.error(err.message); }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("wander.admin.token");
    if (!token) { navigate("/admin/login"); return; }
    setLoading(true); loadStats().finally(() => setLoading(false));
  }, []);
  useEffect(() => { if (tab === "users") loadUsers(); }, [tab, loadUsers]);
  useEffect(() => { if (tab === "posts") loadPosts(); }, [tab, loadPosts]);
  useEffect(() => { if (tab === "plans") loadPlans(); }, [tab, loadPlans]);
  useEffect(() => { if (tab === "products") loadProducts(); }, [tab, loadProducts]);
  useEffect(() => { if (tab === "revenue") loadRevenue(); }, [tab, loadRevenue]);

  const togglePremium = async (id: string, cur: boolean) => {
    try { await adminFetch(`/admin/users/${id}`, { method: "PUT", body: JSON.stringify({ isPremium: !cur }) }); toast.success(cur ? "Premium removed" : "Premium granted"); loadUsers(); loadStats(); } catch (err: any) { toast.error(err.message); }
  };
  const toggleAdmin = async (id: string, cur: boolean) => {
    try { await adminFetch(`/admin/users/${id}`, { method: "PUT", body: JSON.stringify({ isAdmin: !cur }) }); toast.success(cur ? "Admin revoked" : "Admin granted"); loadUsers(); } catch (err: any) { toast.error(err.message); }
  };
  const toggleSuspend = async (id: string, cur: boolean) => {
    const reason = !cur ? prompt("Reason for suspension:") : "";
    try { await adminFetch(`/admin/users/${id}`, { method: "PUT", body: JSON.stringify({ suspended: !cur, suspendedReason: reason || "" }) }); toast.success(cur ? "User unsuspended" : "User suspended"); loadUsers(); loadStats(); } catch (err: any) { toast.error(err.message); }
  };
  const deleteUser = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}" and all content?`)) return;
    try { await adminFetch(`/admin/users/${id}`, { method: "DELETE" }); toast.success("Deleted"); loadUsers(); loadStats(); } catch (err: any) { toast.error(err.message); }
  };
  const deletePost = async (id: string) => {
    if (!confirm("Delete post?")) return;
    try { await adminFetch(`/admin/posts/${id}`, { method: "DELETE" }); toast.success("Deleted"); loadPosts(); loadStats(); } catch (err: any) { toast.error(err.message); }
  };
  const deletePlan = async (id: string) => {
    if (!confirm("Delete plan?")) return;
    try { await adminFetch(`/admin/plans/${id}`, { method: "DELETE" }); toast.success("Deleted"); loadPlans(); loadStats(); } catch (err: any) { toast.error(err.message); }
  };
  const saveProduct = async () => {
    try {
      let imageUrl = pForm.image;
      if (productImageFile) {
        imageUrl = await api.upload(productImageFile);
      }
      if (!imageUrl && !editProduct) { toast.error("Please select an image"); return; }
      const body = { ...pForm, image: imageUrl, price: parseFloat(pForm.price) || 0, stock: parseInt(pForm.stock) || 0 };
      if (editProduct) { await adminFetch(`/admin/products/${editProduct._id}`, { method: "PUT", body: JSON.stringify(body) }); toast.success("Updated"); }
      else { await adminFetch("/admin/products", { method: "POST", body: JSON.stringify(body) }); toast.success("Created"); }
      setShowProductForm(false); setEditProduct(null);
      setPForm({ name: "", description: "", image: "", price: "", category: "other", stock: "0", featured: false });
      setProductImageFile(null); setProductImagePreview("");
      loadProducts(); loadStats();
    } catch (err: any) { toast.error(err.message); }
  };
  const deleteProduct = async (id: string) => {
    if (!confirm("Delete product?")) return;
    try { await adminFetch(`/admin/products/${id}`, { method: "DELETE" }); toast.success("Deleted"); loadProducts(); } catch (err: any) { toast.error(err.message); }
  };

  if (loading) return <div className="grid min-h-screen place-items-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const TABS: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: "dashboard", label: "Overview", icon: BarChart3 },
    { id: "users", label: "Users", icon: Users },
    { id: "posts", label: "Posts", icon: ImageIcon },
    { id: "plans", label: "Plans", icon: Map },
    { id: "products", label: "Store", icon: ShoppingBag },
    { id: "revenue", label: "Revenue", icon: DollarSign },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-destructive">
              <Shield className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-bold tracking-tight hidden sm:inline">Wander Admin</span>
          </div>
          {/* Desktop nav */}
          <nav className="ml-6 hidden md:flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${tab === t.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            ))}
          </nav>
          {/* Mobile menu button */}
          <button onClick={() => setMobileMenu(!mobileMenu)} className="ml-auto md:hidden rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
            {mobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <button onClick={logout} className="ml-auto hidden md:flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground">
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
        {/* Mobile dropdown */}
        {mobileMenu && (
          <div className="md:hidden border-t border-border bg-card px-4 py-2 space-y-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setMobileMenu(false); }}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${tab === t.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                  }`}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </button>
            ))}
            <button onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <AnimatePresence mode="wait">
          {tab === "dashboard" && stats && (
            <motion.div key="dash" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">
              <div>
                <h1 className="text-2xl font-bold">Dashboard</h1>
                <p className="text-sm text-muted-foreground">Platform overview and recent activity</p>
              </div>

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard icon={Users} label="Total Users" value={stats.totalUsers} sub={`+${stats.newUsersMonth} this month`} color="from-blue-500 to-cyan-400" />
                <StatCard icon={ImageIcon} label="Total Posts" value={stats.totalPosts} sub={`+${stats.newPostsMonth} this month`} color="from-purple-500 to-pink-400" />
                <StatCard icon={Crown} label="Premium Users" value={stats.premiumUsers} sub={`$${stats.monthlyRevenue}/mo revenue`} color="from-orange-500 to-rose-500" />
                <StatCard icon={Ban} label="Suspended" value={stats.suspendedUsers || 0} sub={`${stats.totalProducts || 0} products in store`} color="from-red-500 to-rose-600" />
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="mb-4 text-sm font-semibold text-muted-foreground">Recent Signups</h2>
                <div className="space-y-3">
                  {stats.recentUsers?.map((u: any) => (
                    <div key={u._id} className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
                      <div className="grid h-9 w-9 place-items-center rounded-full bg-muted text-xs font-bold">
                        {u.displayName?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{u.displayName}</div>
                        <div className="text-xs text-muted-foreground/70">@{u.username}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {u.isPremium && <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-[10px] font-semibold text-orange-400">PRO</span>}
                        {u.isAdmin && <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold text-red-400">ADMIN</span>}
                        <span className="text-xs text-muted-foreground/50">{new Date(u.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {tab === "users" && (
            <motion.div key="users" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">Users</h1>
                  <p className="text-sm text-muted-foreground">{userTotal} total users</p>
                </div>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                  <input
                    value={userSearch}
                    onChange={(e) => { setUserSearch(e.target.value); setUserPage(1); }}
                    placeholder="Search users..."
                    className="h-9 w-64 rounded-lg border border-border bg-muted/50 pl-10 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/40"
                  />
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-card text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-center">Premium</th>
                      <th className="px-4 py-3 text-center">Admin</th>
                      <th className="px-4 py-3">Joined</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u._id} className="border-b border-border/50 hover:bg-card transition">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="grid h-7 w-7 place-items-center rounded-full bg-muted text-[10px] font-bold overflow-hidden">
                              {u.avatar ? <img src={u.avatar} className="h-full w-full object-cover" /> : u.displayName?.[0]?.toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-foreground">{u.displayName}</div>
                              <div className="text-[11px] text-muted-foreground/70">@{u.username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => toggleSuspend(u._id, u.suspended)} className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition ${u.suspended ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"}`}>
                            {u.suspended ? "SUSPENDED" : "ACTIVE"}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => togglePremium(u._id, u.isPremium)} className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition ${u.isPremium ? "bg-orange-500/20 text-orange-400 hover:bg-orange-500/30" : "bg-muted/50 text-muted-foreground/70 hover:bg-muted"}`}>
                            {u.isPremium ? "PRO" : "FREE"}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => toggleAdmin(u._id, u.isAdmin)} className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition ${u.isAdmin ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "bg-muted/50 text-muted-foreground/70 hover:bg-muted"}`}>
                            {u.isAdmin ? "ADMIN" : "USER"}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground/70 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => deleteUser(u._id, u.displayName)} className="rounded-lg p-1.5 text-muted-foreground/50 transition hover:bg-red-500/10 hover:text-red-400">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {userTotal > 20 && (
                <div className="flex items-center justify-center gap-3">
                  <button disabled={userPage <= 1} onClick={() => setUserPage((p) => p - 1)} className="rounded-lg border border-border p-1.5 text-muted-foreground disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
                  <span className="text-xs text-muted-foreground">Page {userPage}</span>
                  <button disabled={userPage * 20 >= userTotal} onClick={() => setUserPage((p) => p + 1)} className="rounded-lg border border-border p-1.5 text-muted-foreground disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
                </div>
              )}
            </motion.div>
          )}

          {tab === "posts" && (
            <motion.div key="posts" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold">Posts</h1>
                <p className="text-sm text-muted-foreground">{postTotal} total posts</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {posts.map((p) => (
                  <div key={p._id} className="group overflow-hidden rounded-2xl border border-border bg-card transition hover:border-border">
                    <div className="aspect-square overflow-hidden bg-muted/50">
                      <img src={p.image} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="grid h-6 w-6 place-items-center rounded-full bg-muted text-[9px] font-bold overflow-hidden">
                          {p.author?.avatar ? <img src={p.author.avatar} className="h-full w-full object-cover" /> : "?"}
                        </div>
                        <span className="text-xs font-semibold text-foreground/80">{p.author?.displayName || "Unknown"}</span>
                        <span className="ml-auto text-[10px] text-muted-foreground/50">{new Date(p.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{p.caption || "No caption"}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex gap-3 text-[11px] text-muted-foreground/70">
                          <span>❤ {p.likes?.length || 0}</span>
                          <span>💬 {p.comments?.length || 0}</span>
                        </div>
                        <button onClick={() => deletePost(p._id)} className="rounded-lg p-1.5 text-muted-foreground/50 opacity-0 transition group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {postTotal > 20 && (
                <div className="flex items-center justify-center gap-3">
                  <button disabled={postPage <= 1} onClick={() => setPostPage((p) => p - 1)} className="rounded-lg border border-border p-1.5 text-muted-foreground disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
                  <span className="text-xs text-muted-foreground">Page {postPage}</span>
                  <button disabled={postPage * 20 >= postTotal} onClick={() => setPostPage((p) => p + 1)} className="rounded-lg border border-border p-1.5 text-muted-foreground disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
                </div>
              )}
            </motion.div>
          )}

          {tab === "plans" && (
            <motion.div key="plans" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold">Plans</h1>
                <p className="text-sm text-muted-foreground">{plans.length} total plans</p>
              </div>

              <div className="overflow-hidden rounded-2xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-card text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                      <th className="px-4 py-3">Plan</th>
                      <th className="px-4 py-3">Creator</th>
                      <th className="px-4 py-3">Dates</th>
                      <th className="px-4 py-3 text-center">Travelers</th>
                      <th className="px-4 py-3">Budget</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plans.map((p) => (
                      <tr key={p._id} className="border-b border-border/50 hover:bg-card transition">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground">{p.title}</div>
                          <div className="text-[11px] text-muted-foreground/70">{p.destination}</div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">@{p.creator?.username || "?"}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {new Date(p.startDate).toLocaleDateString()} – {new Date(p.endDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-center text-muted-foreground">{p.participants?.length || 0}/{p.maxParticipants}</td>
                        <td className="px-4 py-3 text-muted-foreground">{p.budget}</td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => deletePlan(p._id)} className="rounded-lg p-1.5 text-muted-foreground/50 transition hover:bg-red-500/10 hover:text-red-400">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
          {tab === "products" && (
            <motion.div key="products" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              <div className="flex items-center justify-between">
                <div><h1 className="text-2xl font-bold">Store Products</h1><p className="text-sm text-muted-foreground">{products.length} products</p></div>
                <button onClick={() => { setEditProduct(null); setPForm({ name: "", description: "", image: "", price: "", category: "other", stock: "0", featured: false }); setProductImageFile(null); setProductImagePreview(""); setShowProductForm(true); }}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                  <Plus className="h-3.5 w-3.5" /> Add Product
                </button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((p) => (
                  <div key={p._id} className="group overflow-hidden rounded-2xl border border-border bg-card transition hover:border-border">
                    <div className="aspect-square overflow-hidden bg-muted/50">
                      {p.image ? <img src={p.image} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><Package className="h-10 w-10 text-white/10" /></div>}
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-foreground truncate">{p.name}</div>
                        <span className="text-sm font-bold text-orange-400">${p.price}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground/70">
                        <span className="rounded bg-muted/50 px-1.5 py-0.5">{p.category}</span>
                        <span>Stock: {p.stock}</span>
                        {p.featured && <span className="text-amber-400">★ Featured</span>}
                        {!p.active && <span className="text-red-400">Inactive</span>}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditProduct(p); setPForm({ name: p.name, description: p.description || "", image: p.image, price: String(p.price), category: p.category, stock: String(p.stock), featured: p.featured }); setProductImageFile(null); setProductImagePreview(""); setShowProductForm(true); }}
                          className="flex-1 rounded-lg bg-muted/50 py-1.5 text-[10px] font-semibold text-muted-foreground hover:bg-muted"><Edit2 className="inline h-3 w-3 mr-1" />Edit</button>
                        <button onClick={() => deleteProduct(p._id)} className="rounded-lg bg-red-500/10 px-3 py-1.5 text-[10px] text-red-400 hover:bg-red-500/20"><Trash2 className="h-3 w-3" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Product Form Modal */}
              {showProductForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setShowProductForm(false)}>
                  <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between"><h2 className="text-lg font-bold">{editProduct ? "Edit" : "New"} Product</h2><button onClick={() => setShowProductForm(false)}><X className="h-5 w-5 text-muted-foreground" /></button></div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Product Name</label>
                      <input value={pForm.name} onChange={(e) => setPForm({ ...pForm, name: e.target.value })} placeholder="e.g. Travel Backpack Pro" className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Description</label>
                      <textarea value={pForm.description} onChange={(e) => setPForm({ ...pForm, description: e.target.value })} placeholder="Describe the product..." rows={2} className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Product Image</label>
                      {(productImagePreview || pForm.image) ? (
                        <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
                          <img src={productImagePreview || pForm.image} alt="" className="h-full w-full object-cover" />
                          <button onClick={() => { setProductImageFile(null); setProductImagePreview(""); setPForm({ ...pForm, image: "" }); }}
                            className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"><X className="h-3.5 w-3.5" /></button>
                        </div>
                      ) : (
                        <button onClick={() => productFileRef.current?.click()}
                          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 py-6 text-sm text-muted-foreground transition hover:border-primary hover:text-primary">
                          <Upload className="h-5 w-5" /> Click to upload image
                        </button>
                      )}
                      <input ref={productFileRef} type="file" accept="image/*" hidden onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) { setProductImageFile(f); const r = new FileReader(); r.onload = () => setProductImagePreview(r.result as string); r.readAsDataURL(f); }
                        e.target.value = "";
                      }} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Price ($)</label>
                        <input value={pForm.price} onChange={(e) => setPForm({ ...pForm, price: e.target.value })} placeholder="29.99" type="number" className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm outline-none" />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Stock Qty</label>
                        <input value={pForm.stock} onChange={(e) => setPForm({ ...pForm, stock: e.target.value })} placeholder="100" type="number" className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Category</label>
                      <select value={pForm.category} onChange={(e) => setPForm({ ...pForm, category: e.target.value })} className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm outline-none">
                        {["backpacks", "accessories", "electronics", "clothing", "camping", "other"].map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                      </select>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-muted-foreground"><input type="checkbox" checked={pForm.featured} onChange={(e) => setPForm({ ...pForm, featured: e.target.checked })} /> Featured product</label>
                    <button onClick={saveProduct} className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground">{editProduct ? "Update" : "Create"} Product</button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {tab === "revenue" && revenue && (
            <motion.div key="revenue" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">
              <div><h1 className="text-2xl font-bold">Revenue & Subscriptions</h1><p className="text-sm text-muted-foreground">Premium subscription analytics</p></div>
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard icon={Crown} label="Active Subscribers" value={revenue.total} color="from-orange-500 to-rose-500" />
                <StatCard icon={DollarSign} label="Monthly Revenue" value={`$${revenue.monthlyRevenue}`} color="from-emerald-500 to-teal-500" />
                <StatCard icon={TrendingUp} label="Annual Projection" value={`$${(revenue.total * 9.99 * 12).toFixed(0)}`} color="from-blue-500 to-indigo-500" />
              </div>
              {revenue.monthlyBreakdown?.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-6">
                  <h2 className="mb-4 text-sm font-semibold text-muted-foreground">Monthly Breakdown</h2>
                  <div className="grid grid-cols-6 gap-2">
                    {revenue.monthlyBreakdown.map((m: any, i: number) => (
                      <div key={i} className="rounded-xl bg-muted/50 p-3 text-center">
                        <div className="text-[10px] text-muted-foreground/70">{m.month}</div>
                        <div className="mt-1 text-lg font-bold text-orange-400">{m.newSubscribers}</div>
                        <div className="text-[10px] text-muted-foreground/50">${m.revenue}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="mb-4 text-sm font-semibold text-muted-foreground">Premium Subscribers</h2>
                <div className="space-y-2">
                  {revenue.premiumUsers?.map((u: any) => (
                    <div key={u._id} className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-orange-500/20 text-xs font-bold text-orange-400 overflow-hidden">
                        {u.avatar ? <img src={u.avatar} className="h-full w-full object-cover" /> : u.displayName?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{u.displayName}</div>
                        <div className="text-[10px] text-muted-foreground/70">@{u.username} · {u.email}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-semibold text-orange-400">$9.99/mo</div>
                        <div className="text-[10px] text-muted-foreground/50">{u.premiumSince ? `Since ${new Date(u.premiumSince).toLocaleDateString()}` : "Active"}</div>
                      </div>
                    </div>
                  ))}
                  {(!revenue.premiumUsers || revenue.premiumUsers.length === 0) && <p className="py-6 text-center text-sm text-muted-foreground/50">No premium subscribers yet</p>}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: typeof Users; label: string; value: number | string; sub?: string; color: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 sm:p-5">
      <div className="flex items-center justify-between">
        <div className={`grid h-8 w-8 sm:h-10 sm:w-10 place-items-center rounded-lg sm:rounded-xl bg-gradient-to-br ${color} shadow-lg`}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
        </div>
      </div>
      <div className="mt-2 sm:mt-4 text-xl sm:text-3xl font-bold">{typeof value === "number" ? value.toLocaleString() : value}</div>
      <div className="text-[10px] sm:text-xs text-muted-foreground">{label}</div>
      {sub && <div className="mt-0.5 sm:mt-1 text-[9px] sm:text-[11px] text-muted-foreground/60 truncate">{sub}</div>}
    </div>
  );
}
