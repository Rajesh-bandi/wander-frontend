import { createContext, useContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { api, isAuthenticated, setToken } from "@/lib/api";
import type { Chat, Comment, Message, Plan, Post, Product, User } from "@/data/types";

type CartItem = { productId: string; qty: number };

type StoreState = {
  /* Auth */
  token: string | null;
  currentUser: User | null;
  isLoggedIn: boolean;
  authLoading: boolean;

  /* Data  */
  users: User[];
  posts: Post[];
  plans: Plan[];
  products: Product[];
  chats: Chat[];
  likedPostIds: string[];
  savedPostIds: string[];
  follows: string[];
  cart: CartItem[];
};

type StoreContextValue = StoreState & {
  /* Auth */
  signup: (data: { username: string; email: string; password: string; displayName: string; location?: string }) => Promise<void>;
  signin: (data: { email: string; password: string }) => Promise<void>;
  logout: () => void;

  /* Data fetchers */
  refreshPosts: () => Promise<void>;
  refreshPlans: () => Promise<void>;
  refreshChats: () => Promise<void>;

  /* Actions */
  toggleLike: (postId: string) => void;
  addComment: (postId: string, text: string) => void;
  toggleFollow: (userId: string) => void;
  createPlan: (p: Omit<Plan, "id" | "creatorId" | "participantIds" | "pendingRequestIds" | "status" | "isExpired">) => Promise<Plan>;
  requestJoinPlan: (planId: string) => void;
  acceptJoinRequest: (planId: string, userId: string) => void;
  rejectJoinRequest: (planId: string, userId: string) => void;
  sendMessage: (chatId: string, text: string) => void;
  acceptChatRequest: (chatId: string) => void;
  rejectChatRequest: (chatId: string) => void;
  startPrivateChat: (userId: string) => Promise<string>;
  createPost: (data: { image: string; caption?: string; location?: string; tags?: string[] }) => Promise<Post>;
  deletePost: (postId: string) => Promise<void>;
  toggleBookmark: (postId: string) => void;
  addToCart: (productId: string, qty?: number) => void;
  setCartQty: (productId: string, qty: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  setIsPremium: (v: boolean) => void;
  updateProfile: (patch: Partial<User>) => void;
  getUser: (id: string) => User | undefined;
  getProduct: (id: string) => Product | undefined;
  getPlan: (id: string) => Plan | undefined;
  getPost: (id: string) => Post | undefined;
  isPremium: boolean;
  currentUserId: string;
};

const StoreContext = createContext<StoreContextValue | null>(null);

const CART_KEY = "wander.cart";

function loadCart(): CartItem[] {
  try { return JSON.parse(localStorage.getItem(CART_KEY) || "[]"); } catch { return []; }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem("wander.token"));
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [likedPostIds, setLikedPostIds] = useState<string[]>([]);
  const [savedPostIds, setSavedPostIds] = useState<string[]>([]);
  const [follows, setFollows] = useState<string[]>([]);
  const [cart, setCart] = useState<CartItem[]>(loadCart);

  // Persist cart
  useEffect(() => { localStorage.setItem(CART_KEY, JSON.stringify(cart)); }, [cart]);

  // Load products on mount
  useEffect(() => {
    api.products.getAll().then((prods) => setProducts(prods as any)).catch(() => {});
  }, []);

  // Load current user on mount if token exists
  useEffect(() => {
    if (!isAuthenticated()) { setAuthLoading(false); return; }
    api.auth.me()
      .then((res) => {
        const user = res.user as any;
        setCurrentUser(user);
        setFollows(res.followingIds || []);
        setSavedPostIds(res.savedPostIds || []);
        setUsers((prev) => {
          const exists = prev.find((u) => u.id === user.id);
          return exists ? prev.map((u) => u.id === user.id ? user : u) : [...prev, user];
        });
      })
      .catch(() => { setToken(null); setTokenState(null); })
      .finally(() => setAuthLoading(false));
  }, [token]);

  // Load data when logged in
  useEffect(() => {
    if (!currentUser) return;

    api.posts.getAll(1, 50).then((res) => {
      setPosts(res.posts as any);
      // collect users from posts
      const postUsers = (res.posts as any[]).filter((p: any) => p._author).map((p: any) => p._author);
      // collect liked post ids
      const myLiked = (res.posts as any[]).filter((p: any) => p._likedByIds?.includes(currentUser.id)).map((p: any) => p.id);
      setLikedPostIds(myLiked);
      mergeUsers(postUsers);
    }).catch(() => {});

    api.plans.getAll().then((res) => {
      setPlans(res as any);
      const planUsers = (res as any[]).flatMap((p: any) => [...(p._participants || []), ...(p._pendingRequests || []), p._creator].filter(Boolean));
      mergeUsers(planUsers);
    }).catch(() => {});

    api.chats.getAll().then((res) => {
      setChats(res as any);
      const chatUsers = (res as any[]).flatMap((c: any) => c._participants || []).filter(Boolean);
      mergeUsers(chatUsers);
    }).catch(() => {});
  }, [currentUser?.id]);

  const mergeUsers = useCallback((newUsers: User[]) => {
    setUsers((prev) => {
      const map = new Map(prev.map((u) => [u.id, u]));
      for (const u of newUsers) {
        if (u && u.id) map.set(u.id, u);
      }
      return Array.from(map.values());
    });
  }, []);

  const refreshPosts = useCallback(async () => {
    const res = await api.posts.getAll(1, 50);
    setPosts(res.posts as any);
    const postUsers = (res.posts as any[]).filter((p: any) => p._author).map((p: any) => p._author);
    mergeUsers(postUsers);
  }, [mergeUsers]);

  const refreshPlans = useCallback(async () => {
    const res = await api.plans.getAll();
    setPlans(res as any);
  }, []);

  const refreshChats = useCallback(async () => {
    const res = await api.chats.getAll();
    setChats(res as any);
  }, []);

  const value = useMemo<StoreContextValue>(() => ({
    token,
    currentUser,
    isLoggedIn: !!currentUser,
    authLoading,
    currentUserId: currentUser?.id ?? "",
    isPremium: currentUser?.isPremium ?? false,
    users,
    posts,
    plans,
    products,
    chats,
    likedPostIds,
    savedPostIds,
    follows,
    cart,
    refreshPosts,
    refreshPlans,
    refreshChats,

    // Auth
    signup: async (data) => {
      const res = await api.auth.signup(data);
      setTokenState(res.token);
      setCurrentUser(res.user as any);
      mergeUsers([res.user as any]);
    },
    signin: async (data) => {
      const res = await api.auth.signin(data);
      setTokenState(res.token);
      setCurrentUser(res.user as any);
      mergeUsers([res.user as any]);
    },
    logout: () => {
      setToken(null);
      setTokenState(null);
      setCurrentUser(null);
      setPosts([]);
      setPlans([]);
      setChats([]);
      setUsers([]);
      setLikedPostIds([]);
      setFollows([]);
    },

    // Getters
    getUser: (id) => users.find((u) => u.id === id),
    getProduct: (id) => products.find((p) => p.id === id),
    getPlan: (id) => plans.find((p) => p.id === id),
    getPost: (id) => posts.find((p) => p.id === id),

    // Post actions
    toggleLike: async (postId: string) => {
      try {
        const res = await api.posts.toggleLike(postId);
        setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, likes: res.likes } : p));
        setLikedPostIds((prev) => res.liked ? [...prev, postId] : prev.filter((id) => id !== postId));
      } catch {}
    },
    addComment: async (postId: string, text: string) => {
      try {
        const comments = await api.posts.addComment(postId, text);
        const mapped = comments.map((c: any) => ({
          id: String(c._id || c.id),
          authorId: typeof c.author === "object" ? String(c.author._id || c.author.id) : String(c.author),
          text: c.text,
          createdAt: c.createdAt,
        }));
        setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, comments: mapped } : p));
      } catch {}
    },
    createPost: async (data) => {
      const post = await api.posts.create(data);
      setPosts((prev) => [post as any, ...prev]);
      return post as any;
    },
    deletePost: async (postId: string) => {
      await api.posts.delete(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    },
    toggleBookmark: async (postId: string) => {
      try {
        console.log("[Bookmark] toggling", postId, "current saved:", savedPostIds);
        const isSaved = savedPostIds.includes(postId);
        setSavedPostIds((prev) => isSaved ? prev.filter((id) => id !== postId) : [...prev, postId]);
        const res = await api.posts.toggleBookmark(postId);
        console.log("[Bookmark] API response:", res);
        setSavedPostIds(res.savedPosts);
      } catch (err) {
        console.error("[Bookmark] error:", err);
      }
    },

    // User actions
    toggleFollow: async (userId: string) => {
      try {
        const isCurrentlyFollowing = follows.includes(userId);
        const res = await api.users.toggleFollow(userId);
        setFollows((prev) => res.following ? [...prev, userId] : prev.filter((id) => id !== userId));
      } catch (err: any) {
        throw err;
      }
    },
    updateProfile: async (patch: Partial<User>) => {
      try {
        const user = await api.users.updateProfile(patch as any);
        setCurrentUser(user as any);
        mergeUsers([user as any]);
      } catch {}
    },
    setIsPremium: async (v: boolean) => {
      try {
        const user = await api.users.updateProfile({ isPremium: v } as any);
        setCurrentUser(user as any);
        mergeUsers([user as any]);
      } catch {}
    },

    // Plan actions
    createPlan: async (p) => {
      const plan = await api.plans.create(p as any);
      setPlans((prev) => [plan as any, ...prev]);
      return plan as any;
    },
    requestJoinPlan: async (planId: string) => {
      try {
        await api.plans.requestJoin(planId);
        await refreshPlans();
      } catch {}
    },
    acceptJoinRequest: async (planId: string, userId: string) => {
      try {
        await api.plans.acceptJoin(planId, userId);
        await refreshPlans();
      } catch {}
    },
    rejectJoinRequest: async (planId: string, userId: string) => {
      try {
        await api.plans.rejectJoin(planId, userId);
        await refreshPlans();
      } catch {}
    },

    // Chat actions
    sendMessage: async (chatId: string, text: string) => {
      try {
        await api.chats.sendMessage(chatId, text);
        await refreshChats();
      } catch {}
    },
    acceptChatRequest: async (chatId: string) => {
      try {
        await api.chats.acceptRequest(chatId);
        await refreshChats();
      } catch {}
    },
    rejectChatRequest: async (chatId: string) => {
      try {
        await api.chats.rejectRequest(chatId);
        await refreshChats();
      } catch {}
    },
    startPrivateChat: async (userId: string) => {
      const chat = await api.chats.startPrivate(userId);
      await refreshChats();
      return (chat as any).id;
    },

    // Cart (local only — no backend)
    addToCart: (productId, qty = 1) => setCart((prev) => {
      const found = prev.find((c) => c.productId === productId);
      return found ? prev.map((c) => c.productId === productId ? { ...c, qty: c.qty + qty } : c) : [...prev, { productId, qty }];
    }),
    setCartQty: (productId, qty) => setCart((prev) => qty <= 0 ? prev.filter((c) => c.productId !== productId) : prev.map((c) => c.productId === productId ? { ...c, qty } : c)),
    removeFromCart: (productId) => setCart((prev) => prev.filter((c) => c.productId !== productId)),
    clearCart: () => setCart([]),
  }), [token, currentUser, authLoading, users, posts, plans, products, chats, likedPostIds, savedPostIds, follows, cart, refreshPosts, refreshPlans, refreshChats, mergeUsers]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export function useCurrentUser() {
  const { currentUser } = useStore();
  return currentUser || { id: "", username: "guest", displayName: "Guest", avatar: "", coverImage: "", bio: "", location: "", followers: 0, following: 0, isPremium: false };
}
