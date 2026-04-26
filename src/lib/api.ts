const API_BASE = `${import.meta.env.VITE_API_URL}/api`;

function getToken(): string | null {
  return localStorage.getItem("wander.token");
}

export function setToken(token: string | null) {
  if (token) {
    localStorage.setItem("wander.token", token);
  } else {
    localStorage.removeItem("wander.token");
  }
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Something went wrong");
  }

  return data as T;
}

// Helper to normalize MongoDB _id → id on any object
function normalizeId<T>(obj: any): T {
  if (!obj) return obj;
  if (Array.isArray(obj)) return obj.map((item) => normalizeId(item)) as any;
  if (typeof obj === "object") {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      if (key === "_id") {
        result["id"] = String(obj._id);
      } else if (key === "__v") {
        // skip mongoose version key
      } else {
        result[key] = normalizeId(obj[key]);
      }
    }
    return result;
  }
  return obj;
}

// ─── Upload helper ───────────────────────────────
async function uploadImage(file: File): Promise<string> {
  const token = getToken();
  const form = new FormData();
  form.append("image", file);
  const res = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Upload failed");
  // Return full URL so images display correctly
  return `${import.meta.env.VITE_API_URL}${data.url}`;
}

// ─── Auth ────────────────────────────────────────
export const api = {
  upload: uploadImage,

  auth: {
    signup: async (data: { username: string; email: string; password: string; displayName: string; location?: string }) => {
      const res = await request<{ token: string; user: any }>("/auth/signup", {
        method: "POST",
        body: JSON.stringify(data),
      });
      setToken(res.token);
      return { token: res.token, user: normalizeUser(res.user) };
    },

    signin: async (data: { email: string; password: string }) => {
      const res = await request<{ token: string; user: any }>("/auth/signin", {
        method: "POST",
        body: JSON.stringify(data),
      });
      setToken(res.token);
      return { token: res.token, user: normalizeUser(res.user) };
    },

    me: async () => {
      const res = await request<{ user: any; followingIds: string[]; savedPostIds: string[] }>("/auth/me");
      return { user: normalizeUser(res.user), followingIds: res.followingIds || [], savedPostIds: res.savedPostIds || [] };
    },
  },

  // ─── Users ────────────────────────────────────────
  users: {
    getByUsername: async (username: string) => {
      const res = await request<{ user: any }>(`/users/${username}`);
      return normalizeUser(res.user);
    },

    updateProfile: async (data: { displayName?: string; bio?: string; location?: string; avatar?: string; coverImage?: string; isPremium?: boolean }) => {
      const res = await request<{ user: any }>("/users/profile", {
        method: "PUT",
        body: JSON.stringify(data),
      });
      return normalizeUser(res.user);
    },

    toggleFollow: async (userId: string) => {
      const res = await request<{ following: boolean }>(`/users/${userId}/follow`, {
        method: "POST",
      });
      return res;
    },

    getFollowers: async (username: string) => {
      const res = await request<{ users: any[] }>(`/users/${username}/followers`);
      return res.users.map(normalizeUser);
    },

    getFollowing: async (username: string) => {
      const res = await request<{ users: any[] }>(`/users/${username}/following`);
      return res.users.map(normalizeUser);
    },
  },

  // ─── Posts ────────────────────────────────────────
  posts: {
    getAll: async (page = 1, limit = 10) => {
      const res = await request<{ posts: any[]; total: number; pages: number }>(
        `/posts?page=${page}&limit=${limit}`
      );
      return { ...res, posts: res.posts.map(normalizePost) };
    },

    getByUser: async (userId: string) => {
      const res = await request<{ posts: any[] }>(`/posts/user/${userId}`);
      return res.posts.map(normalizePost);
    },

    getById: async (postId: string) => {
      const res = await request<{ post: any }>(`/posts/${postId}`);
      return res.post;
    },

    create: async (data: { image: string; caption?: string; location?: string; tags?: string[] }) => {
      const res = await request<{ post: any }>("/posts", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return normalizePost(res.post);
    },

    toggleLike: async (postId: string) => {
      const res = await request<{ likes: number; liked: boolean }>(`/posts/${postId}/like`, {
        method: "POST",
      });
      return res;
    },

    addComment: async (postId: string, text: string) => {
      const res = await request<{ comments: any[] }>(`/posts/${postId}/comment`, {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      return res.comments;
    },

    deleteComment: async (postId: string, commentId: string) => {
      const res = await request<{ comments: any[] }>(`/posts/${postId}/comment/${commentId}`, {
        method: "DELETE",
      });
      return res.comments;
    },

    toggleCommentLike: async (postId: string, commentId: string) => {
      const res = await request<{ likes: number; liked: boolean }>(`/posts/${postId}/comment/${commentId}/like`, {
        method: "POST",
      });
      return res;
    },

    addReply: async (postId: string, commentId: string, text: string) => {
      const res = await request<{ comments: any[] }>(`/posts/${postId}/comment/${commentId}/reply`, {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      return res.comments;
    },

    delete: async (postId: string) => {
      await request(`/posts/${postId}`, { method: "DELETE" });
    },

    update: async (postId: string, data: { caption?: string; location?: string; tags?: string[] }) => {
      const res = await request<{ post: any }>(`/posts/${postId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      return normalizePost(res.post);
    },

    toggleBookmark: async (postId: string) => {
      return request<{ saved: boolean; savedPosts: string[] }>(`/posts/${postId}/bookmark`, {
        method: "POST",
      });
    },

    getSaved: async () => {
      const res = await request<{ posts: any[]; savedIds: string[] }>("/posts/saved");
      return { posts: res.posts.map(normalizePost), savedIds: res.savedIds };
    },

    getExplore: async (params?: { tag?: string; location?: string; sort?: string }) => {
      const q = new URLSearchParams();
      if (params?.tag) q.set("tag", params.tag);
      if (params?.location) q.set("location", params.location);
      if (params?.sort) q.set("sort", params.sort);
      const qs = q.toString();
      const res = await request<{ posts: any[]; trendingTags: any[]; trendingLocations: any[] }>(`/posts/explore${qs ? `?${qs}` : ""}`);
      return { posts: res.posts.map(normalizePost), trendingTags: res.trendingTags, trendingLocations: res.trendingLocations };
    },
  },

  // ─── Plans ────────────────────────────────────────
  plans: {
    getAll: async () => {
      const res = await request<{ plans: any[] }>("/plans");
      return res.plans.map(normalizePlan);
    },

    getById: async (id: string) => {
      const res = await request<{ plan: any }>(`/plans/${id}`);
      return normalizePlan(res.plan);
    },

    create: async (data: {
      title: string; description?: string; destination: string;
      coverImage?: string; startDate: string; endDate: string;
      maxParticipants?: number; budget?: number; currency?: string;
    }) => {
      const res = await request<{ plan: any }>("/plans", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return normalizePlan(res.plan);
    },

    requestJoin: async (planId: string) => {
      await request(`/plans/${planId}/request`, { method: "POST" });
    },

    acceptJoin: async (planId: string, userId: string) => {
      await request(`/plans/${planId}/accept/${userId}`, { method: "POST" });
    },

    rejectJoin: async (planId: string, userId: string) => {
      await request(`/plans/${planId}/reject/${userId}`, { method: "POST" });
    },
  },

  // ─── Chats ────────────────────────────────────────
  chats: {
    getAll: async () => {
      const res = await request<{ chats: any[] }>("/chats");
      return res.chats.map(normalizeChat);
    },

    startPrivate: async (userId: string) => {
      const res = await request<{ chat: any }>(`/chats/private/${userId}`, {
        method: "POST",
      });
      return normalizeChat(res.chat);
    },

    sendMessage: async (chatId: string, text: string) => {
      const res = await request<{ messages: any[] }>(`/chats/${chatId}/message`, {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      return res.messages.map((m: any) => normalizeId(m));
    },

    acceptRequest: async (chatId: string) => {
      await request(`/chats/${chatId}/accept`, { method: "POST" });
    },

    rejectRequest: async (chatId: string) => {
      await request(`/chats/${chatId}/reject`, { method: "POST" });
    },
  },

  // ─── Products ────────────────────────────────────────
  products: {
    getAll: async () => {
      const res = await request<{ products: any[] }>("/products");
      return res.products.map(normalizeProduct);
    },
    getById: async (id: string) => {
      const res = await request<{ product: any }>(`/products/${id}`);
      return normalizeProduct(res.product);
    },
    addReview: async (productId: string, data: { rating: number; text: string }) => {
      const res = await request<{ product: any }>(`/products/${productId}/review`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      return normalizeProduct(res.product);
    },
  },

  // ─── Orders ────────────────────────────────────────
  orders: {
    place: async (items: { productId: string; qty: number }[], shippingAddress?: string) => {
      const res = await request<{ order: any }>("/orders", {
        method: "POST",
        body: JSON.stringify({ items, shippingAddress }),
      });
      return res.order;
    },
    getMyOrders: async () => {
      const res = await request<{ orders: any[] }>("/orders");
      return res.orders;
    },
  },

  // ─── Search ────────────────────────────────────────
  search: async (q: string) => {
    const res = await request<{ users: any[]; posts: any[]; plans: any[] }>(`/search?q=${encodeURIComponent(q)}`);
    return {
      users: res.users.map(normalizeUser),
      posts: res.posts.map(normalizePost),
      plans: res.plans.map(normalizePlan),
    };
  },
};

// ─── Normalizers (MongoDB → frontend types) ─────────
function normalizeProduct(p: any) {
  if (!p) return p;
  return {
    id: String(p._id || p.id),
    name: p.name,
    description: p.description || "",
    price: p.price,
    image: p.image,
    category: p.category,
    rating: p.rating || 0,
    reviewCount: p.reviewCount || 0,
    stock: p.stock ?? 0,
    featured: p.featured || false,
    reviews: (p.reviews || []).map((r: any) => ({
      id: String(r._id || r.id || Math.random()),
      author: r.author && typeof r.author === "object" ? normalizeUser(r.author) : r.author,
      rating: r.rating,
      text: r.text || "",
      createdAt: r.createdAt,
    })),
  };
}

function normalizeUser(u: any) {
  if (!u) return u;
  return {
    id: String(u._id || u.id),
    username: u.username,
    displayName: u.displayName,
    avatar: u.avatar || "",
    coverImage: u.coverImage || "",
    bio: u.bio || "",
    location: u.location || "",
    followers: u.followersCount ?? u.followers?.length ?? 0,
    following: u.followingCount ?? u.following?.length ?? 0,
    isPremium: u.isPremium || false,
  };
}

function normalizePost(p: any) {
  if (!p) return p;
  const author = p.author;
  return {
    id: String(p._id || p.id),
    authorId: typeof author === "object" ? String(author._id || author.id) : String(author),
    image: p.image,
    caption: p.caption || "",
    location: p.location || "",
    likes: typeof p.likes === "number" ? p.likes : p.likes?.length ?? 0,
    comments: (p.comments || []).map((c: any) => {
      const cAuthor = c.author;
      return {
        id: String(c._id || c.id),
        authorId: typeof cAuthor === "object" ? String(cAuthor._id || cAuthor.id) : String(cAuthor),
        // Keep the full populated author object for display
        _author: cAuthor && typeof cAuthor === "object" ? {
          username: cAuthor.username,
          displayName: cAuthor.displayName,
          avatar: cAuthor.avatar || "",
        } : null,
        text: c.text,
        createdAt: c.createdAt,
        likes: (c.likes || []).map((l: any) => typeof l === "object" ? String(l._id || l.id) : String(l)),
        replies: (c.replies || []).map((r: any) => {
          const rAuthor = r.author;
          return {
            id: String(r._id || r.id),
            authorId: typeof rAuthor === "object" ? String(rAuthor._id || rAuthor.id) : String(rAuthor),
            _author: rAuthor && typeof rAuthor === "object" ? {
              username: rAuthor.username,
              displayName: rAuthor.displayName,
              avatar: rAuthor.avatar || "",
            } : null,
            text: r.text,
            createdAt: r.createdAt,
            likes: (r.likes || []).map((l: any) => typeof l === "object" ? String(l._id || l.id) : String(l)),
          };
        }),
      };
    }),
    createdAt: p.createdAt,
    _author: author && typeof author === "object" ? normalizeUser(author) : null,
    _likedByIds: Array.isArray(p.likes) ? p.likes.map(String) : [],
  };
}

function normalizePlan(p: any) {
  if (!p) return p;
  return {
    id: String(p._id || p.id),
    creatorId: typeof p.creator === "object" ? String(p.creator._id || p.creator.id) : String(p.creator),
    title: p.title,
    description: p.description || "",
    destination: p.destination,
    coverImage: p.coverImage || "",
    startDate: p.startDate,
    endDate: p.endDate,
    maxParticipants: p.maxParticipants,
    budget: typeof p.budget === "number" ? p.budget : 0,
    currency: p.currency || "USD",
    status: p.status || "upcoming",
    isExpired: p.isExpired || false,
    participantIds: (p.participants || []).map((u: any) => typeof u === "object" ? String(u._id || u.id) : String(u)),
    pendingRequestIds: (p.pendingRequests || []).map((u: any) => typeof u === "object" ? String(u._id || u.id) : String(u)),
    _creator: p.creator && typeof p.creator === "object" ? normalizeUser(p.creator) : null,
    _participants: Array.isArray(p.participants) ? p.participants.filter((u: any) => typeof u === "object").map(normalizeUser) : [],
    _pendingRequests: Array.isArray(p.pendingRequests) ? p.pendingRequests.filter((u: any) => typeof u === "object").map(normalizeUser) : [],
  };
}

function normalizeChat(c: any) {
  if (!c) return c;
  return {
    id: String(c._id || c.id),
    type: c.type as "group" | "private",
    participantIds: (c.participants || []).map((u: any) => typeof u === "object" ? String(u._id || u.id) : String(u)),
    messages: (c.messages || []).map((m: any) => ({
      id: String(m._id || m.id),
      chatId: String(c._id || c.id),
      authorId: typeof m.author === "object" ? String(m.author._id || m.author.id) : String(m.author),
      text: m.text,
      createdAt: m.createdAt,
      _author: m.author && typeof m.author === "object" ? normalizeUser(m.author) : null,
    })),
    planId: c.plan ? (typeof c.plan === "object" ? String(c.plan._id || c.plan.id) : String(c.plan)) : undefined,
    requestStatus: c.requestStatus,
    _participants: Array.isArray(c.participants) ? c.participants.filter((u: any) => typeof u === "object").map(normalizeUser) : [],
    _planTitle: c.plan && typeof c.plan === "object" ? c.plan.title : undefined,
  };
}
