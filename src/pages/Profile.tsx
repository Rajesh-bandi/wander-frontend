import { useEffect, useRef, useState } from "react";
import { useRoute, Link } from "wouter";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import { Avatar } from "@/components/Avatar";
import { PlanCard } from "@/components/PlanCard";
import { PostCard } from "@/components/PostCard";
import { SubscriptionBadge } from "@/components/SubscriptionBadge";
import { EmptyState } from "@/components/EmptyState";
import { LocationInput } from "@/components/LocationInput";
import { TripMap } from "@/components/TripMap";
import { Edit2, Check, X, Camera, MapPin, Image as ImageIcon, Plus, Upload, Loader2, ImagePlus, Heart, MessageCircle, Eye, Trash2, Tag, CornerDownRight, Pencil, Bookmark, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import type { User, Post, Plan } from "@/data/types";
import { cn } from "@/lib/utils";

const TABS = ["Posts", "Map", "Created", "Joined"] as const;

export default function Profile() {
  const [, params] = useRoute("/profile/:username");
  const username = params?.username;
  const { currentUserId, follows, toggleFollow, updateProfile, startPrivateChat, createPost, refreshPosts } = useStore();

  const [user, setUser] = useState<User | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [userPlans, setUserPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<typeof TABS[number]>("Posts");
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState("");
  const [name, setName] = useState("");

  // Create Post modal
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [postImage, setPostImage] = useState<File | null>(null);
  const [postImagePreview, setPostImagePreview] = useState("");
  const [postCaption, setPostCaption] = useState("");
  const [postLocation, setPostLocation] = useState("");
  const [postTags, setPostTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [postUploading, setPostUploading] = useState(false);
  const postFileRef = useRef<HTMLInputElement>(null);

  // Post Detail modal
  const [detailPost, setDetailPost] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editingPost, setEditingPost] = useState(false);
  const [editCaption, setEditCaption] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editTagInput, setEditTagInput] = useState("");

  // Avatar & banner upload
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const bannerFileRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);

  // Followers/Following modal
  const [showFollowList, setShowFollowList] = useState<"followers" | "following" | null>(null);
  const [followListUsers, setFollowListUsers] = useState<User[]>([]);
  const [followListLoading, setFollowListLoading] = useState(false);

  const loadProfile = async () => {
    if (!username) return;
    try {
      const [userData, postsData, plansData] = await Promise.all([
        api.users.getByUsername(username),
        api.posts.getAll(1, 100),
        api.plans.getAll(),
      ]);
      const u = userData as any;
      setUser(u);
      setBio(u.bio || "");
      setName(u.displayName || "");
      setUserPosts((postsData.posts as any[]).filter((p: any) => p.authorId === u.id));
      setUserPlans(plansData as any[]);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setLoading(true); loadProfile(); }, [username]);

  const openFollowList = async (type: "followers" | "following") => {
    if (!username) return;
    setShowFollowList(type);
    setFollowListLoading(true);
    try {
      const users = type === "followers"
        ? await api.users.getFollowers(username)
        : await api.users.getFollowing(username);
      setFollowListUsers(users as User[]);
    } catch { setFollowListUsers([]); }
    finally { setFollowListLoading(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <div className="py-20 text-center text-muted-foreground">Traveler not found.</div>;

  const isMe = user.id === currentUserId;
  const isFollowing = follows.includes(user.id);
  const created = userPlans.filter((p) => p.creatorId === user.id);
  const joined = userPlans.filter((p) => p.participantIds.includes(user.id) && p.creatorId !== user.id);

  const saveEdit = async () => {
    await updateProfile({ displayName: name, bio });
    setUser((prev) => prev ? { ...prev, displayName: name, bio } : prev);
    setEditing(false);
    toast.success("Profile updated");
  };

  const handleAvatarUpload = async (file: File) => {
    try {
      setAvatarUploading(true);
      const url = await api.upload(file);
      await updateProfile({ avatar: url } as any);
      setUser((prev) => prev ? { ...prev, avatar: url } : prev);
      toast.success("Profile picture updated");
    } catch (err: any) { toast.error(err.message || "Failed to upload"); }
    finally { setAvatarUploading(false); }
  };

  const handleBannerUpload = async (file: File) => {
    try {
      setBannerUploading(true);
      const url = await api.upload(file);
      await updateProfile({ coverImage: url } as any);
      setUser((prev) => prev ? { ...prev, coverImage: url } : prev);
      toast.success("Banner updated");
    } catch (err: any) { toast.error(err.message || "Failed to upload"); }
    finally { setBannerUploading(false); }
  };

  const handlePostImageSelect = (file: File) => {
    setPostImage(file);
    const reader = new FileReader();
    reader.onload = () => setPostImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const submitPost = async () => {
    if (!postImage) { toast.error("Select an image for your post."); return; }
    try {
      setPostUploading(true);
      const imageUrl = await api.upload(postImage);
      await createPost({ image: imageUrl, caption: postCaption, location: postLocation, tags: postTags });
      await refreshPosts();
      await loadProfile();
      setShowCreatePost(false);
      setPostImage(null); setPostImagePreview(""); setPostCaption(""); setPostLocation(""); setPostTags([]); setTagInput("");
      toast.success("Post created!");
    } catch (err: any) { toast.error(err.message || "Failed to create post"); }
    finally { setPostUploading(false); }
  };

  return (
    <div className="space-y-8">
      <header className="overflow-hidden rounded-3xl border border-border bg-card">
        {/* Banner — clickable for upload */}
        <div className="relative h-32 sm:h-40 group">
          {user.coverImage ? (
            <img src={user.coverImage} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/20 via-accent/20 to-secondary/20" />
          )}
          {isMe && (
            <button
              onClick={() => bannerFileRef.current?.click()}
              disabled={bannerUploading}
              className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100"
            >
              {bannerUploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              ) : (
                <span className="flex items-center gap-2 rounded-full bg-black/50 px-4 py-2 text-xs font-semibold text-white">
                  <ImagePlus className="h-4 w-4" /> Change banner
                </span>
              )}
            </button>
          )}
          <input ref={bannerFileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) handleBannerUpload(f); e.target.value = ""; }} />
        </div>

        <div className="px-6 pb-6">
          <div className="-mt-12 flex flex-col items-start gap-4 sm:-mt-14 sm:flex-row sm:items-end">
            {/* Avatar — clickable for upload */}
            <div className="relative group">
              <Avatar src={user.avatar} alt={user.displayName} size={104} className="ring-4 ring-background" />
              {isMe && (
                <button
                  onClick={() => avatarFileRef.current?.click()}
                  disabled={avatarUploading}
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition group-hover:opacity-100"
                >
                  {avatarUploading ? <Loader2 className="h-6 w-6 animate-spin text-white" /> : <Camera className="h-6 w-6 text-white" />}
                </button>
              )}
              <input ref={avatarFileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); e.target.value = ""; }} />
            </div>

            <div className="flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                {editing ? (
                  <input value={name} onChange={(e) => setName(e.target.value)} className="input max-w-xs font-serif text-2xl" />
                ) : (
                  <h1 className="font-serif text-3xl">{user.displayName}</h1>
                )}
                {user.isPremium && <SubscriptionBadge />}
              </div>
              <div className="text-sm text-muted-foreground">@{user.username}</div>
              {user.location && (
                <div className="inline-flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{user.location}</div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isMe ? (
                <>
                  {editing ? (
                    <>
                      <button onClick={saveEdit} className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"><Check className="h-3.5 w-3.5" /> Save</button>
                      <button onClick={() => { setEditing(false); setBio(user.bio); setName(user.displayName); }} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs"><X className="h-3.5 w-3.5" /> Cancel</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setShowCreatePost(true)} className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"><Plus className="h-3.5 w-3.5" /> Create Post</button>
                      <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"><Edit2 className="h-3.5 w-3.5" /> Edit profile</button>
                      <Link href="/settings">
                        <button className="inline-flex items-center gap-1 rounded-full border border-border p-1.5 text-xs font-semibold hover:bg-muted" aria-label="Settings">
                          <Settings className="h-4 w-4" />
                        </button>
                      </Link>
                    </>
                  )}
                </>
              ) : (
                <>
                  <button onClick={async () => {
                    try { await toggleFollow(user.id); } 
                    catch (err: any) { toast.error(err.message || "Premium required to follow"); }
                  }} className={`rounded-full px-4 py-1.5 text-xs font-semibold ${isFollowing ? "border border-border" : "bg-primary text-primary-foreground"}`}>
                    {isFollowing ? "Following" : "Follow"}
                  </button>
                  <button onClick={async () => {
                    try { 
                      await startPrivateChat(user.id); 
                      toast.success("Chat request sent", { description: `${user.displayName} will need to accept your request.` }); 
                    } catch (err: any) { toast.error(err.message || "Premium required to message"); }
                  }} className="rounded-full border border-border px-4 py-1.5 text-xs font-semibold hover:bg-muted">
                    Message
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="mt-4 max-w-2xl">
            {editing ? (
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={2} className="input" />
            ) : (
              user.bio && <p className="text-sm text-foreground/80">{user.bio}</p>
            )}
          </div>

          {/* Stats — clickable followers/following */}
          <div className="mt-5 flex flex-wrap gap-6 text-sm">
            <Stat label="Posts" value={userPosts.length} />
            <button onClick={() => openFollowList("followers")} className="text-left hover:opacity-70 transition">
              <Stat label="Followers" value={user.followers} />
            </button>
            <button onClick={() => openFollowList("following")} className="text-left hover:opacity-70 transition">
              <Stat label="Following" value={user.following} />
            </button>
            <Stat label="Plans" value={created.length + joined.length} />
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="flex gap-1 rounded-full border border-border bg-card p-1">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{t}</button>
        ))}
      </nav>

      {tab === "Posts" && (
        userPosts.length === 0 ? (
          <div className="space-y-4">
            <EmptyState icon={Camera} title="No posts yet" description="Posts will appear in a beautiful grid right here." />
            {isMe && (
              <div className="text-center">
                <button onClick={() => setShowCreatePost(true)} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
                  <Plus className="h-4 w-4" /> Create your first post
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
            {userPosts.map((p) => (
              <motion.div key={p.id} whileHover={{ scale: 1.02 }}
                className="relative aspect-square overflow-hidden rounded-xl bg-muted cursor-pointer"
                onClick={async () => {
                  if (!isMe) return;
                  setDetailLoading(true);
                  setDetailPost(p); // show immediately with basic data
                  try {
                    const full = await api.posts.getById(p.id);
                    setDetailPost(full);
                  } catch {}
                  finally { setDetailLoading(false); }
                }}>
                <img src={p.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                <div className="absolute inset-0 flex items-center justify-center gap-4 bg-black/40 opacity-0 transition hover:opacity-100 text-white text-sm font-semibold">
                  <span className="flex items-center gap-1"><Heart className="h-4 w-4" /> {p.likes}</span>
                  <span className="flex items-center gap-1"><MessageCircle className="h-4 w-4" /> {p.comments.length}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )
      )}

      {tab === "Map" && (
        <TripMap posts={userPosts} />
      )}


      {tab === "Created" && (
        created.length === 0 ? <EmptyState icon={ImageIcon} title="No plans created yet" /> :
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{created.map((p) => <PlanCard key={p.id} plan={p} />)}</div>
      )}

      {tab === "Joined" && (
        joined.length === 0 ? <EmptyState icon={ImageIcon} title="Not part of any trips yet" description="Join plans from Explore to see them here." /> :
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{joined.map((p) => <PlanCard key={p.id} plan={p} />)}</div>
      )}

      {/* ─── Create Post Modal ─── */}
      <AnimatePresence>
        {showCreatePost && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => !postUploading && setShowCreatePost(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <h2 className="font-serif text-xl">New post</h2>
                <button onClick={() => !postUploading && setShowCreatePost(false)} className="rounded-full p-1 hover:bg-muted"><X className="h-5 w-5" /></button>
              </div>
              <div className="space-y-4 p-5">
                {postImagePreview ? (
                  <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
                    <img src={postImagePreview} alt="Preview" className="h-full w-full object-cover" />
                    <button onClick={() => { setPostImage(null); setPostImagePreview(""); }}
                      className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"><X className="h-4 w-4" /></button>
                  </div>
                ) : (
                  <button onClick={() => postFileRef.current?.click()}
                    className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/30 text-muted-foreground transition hover:border-primary hover:text-primary">
                    <Upload className="h-8 w-8" /><span className="text-sm font-semibold">Click to upload a photo</span><span className="text-xs">JPG, PNG, WebP up to 10MB</span>
                  </button>
                )}
                <input ref={postFileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePostImageSelect(f); e.target.value = ""; }} />
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Caption</label>
                  <textarea value={postCaption} onChange={(e) => setPostCaption(e.target.value)} rows={3} className="input" placeholder="Write about your adventure..." />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Location</label>
                  <LocationInput value={postLocation} onChange={setPostLocation} placeholder="Where was this?" />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tags</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {postTags.map((t, i) => (
                      <span key={i} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                        <Tag className="h-2.5 w-2.5" />{t}
                        <button onClick={() => setPostTags(postTags.filter((_, j) => j !== i))} className="ml-0.5 hover:text-destructive"><X className="h-3 w-3" /></button>
                      </span>
                    ))}
                  </div>
                  <div className="relative">
                    <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
                          e.preventDefault();
                          if (!postTags.includes(tagInput.trim())) setPostTags([...postTags, tagInput.trim()]);
                          setTagInput("");
                        }
                      }}
                      className="input pl-10" placeholder="Type and press Enter (e.g. travel, beach)" />
                  </div>
                </div>
                <button onClick={async () => {
                  if (!postImage) return;
                  setPostUploading(true);
                  try {
                    const imageUrl = await api.upload(postImage);
                    await createPost({ image: imageUrl, caption: postCaption, location: postLocation, tags: postTags });
                    toast.success("Post shared! ✨");
                    setShowCreatePost(false);
                    setPostImage(null); setPostImagePreview(""); setPostCaption(""); setPostLocation(""); setPostTags([]); setTagInput("");
                    await refreshPosts();
                    loadProfile();
                  } catch (err: any) { toast.error(err.message || "Upload failed"); }
                  finally { setPostUploading(false); }
                }} disabled={!postImage || postUploading}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50">
                  {postUploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Posting...</> : <><Plus className="h-4 w-4" /> Share post</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Post Detail Modal ─── */}
      <AnimatePresence>
        {detailPost && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={() => { setDetailPost(null); setEditingPost(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-4xl overflow-hidden rounded-3xl border border-border bg-card shadow-2xl max-h-[90vh] flex flex-col md:flex-row"
              onClick={(e) => e.stopPropagation()}>

              {/* Image */}
              <div className="w-full md:w-1/2 bg-black flex items-center justify-center">
                <img src={detailPost.image} alt="" className="h-full w-full object-contain max-h-[45vh] md:max-h-[90vh]" />
              </div>

              {/* Info panel */}
              <div className="flex w-full flex-col md:w-1/2 max-h-[45vh] md:max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                  <Avatar src={user?.avatar || ""} alt={user?.displayName || ""} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">{user?.displayName}</div>
                    <div className="text-xs text-muted-foreground">@{user?.username}</div>
                  </div>
                  <button onClick={() => { setDetailPost(null); setEditingPost(false); }} className="rounded-full p-1 hover:bg-muted"><X className="h-5 w-5" /></button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Stats row */}
                  <div className="flex items-center gap-5 text-sm">
                    <span className="flex items-center gap-1.5 font-semibold"><Heart className="h-4 w-4 text-primary" />{detailPost.likes?.length ?? detailPost.likes ?? 0} likes</span>
                    <span className="flex items-center gap-1.5"><MessageCircle className="h-4 w-4" />{detailPost.comments?.length ?? 0} comments</span>
                    <span className="flex items-center gap-1.5 text-muted-foreground"><Eye className="h-4 w-4" />{detailPost.views?.length ?? 0} views</span>
                  </div>

                  {/* Who liked */}
                  {Array.isArray(detailPost.likes) && detailPost.likes.length > 0 && typeof detailPost.likes[0] === "object" && (
                    <div className="space-y-1">
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Liked by</div>
                      <div className="flex flex-wrap gap-1">
                        {detailPost.likes.slice(0, 10).map((l: any) => (
                          <Link key={l._id || l.id} href={`/profile/${l.username}`} onClick={() => setDetailPost(null)}
                            className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs hover:bg-primary/10">
                            <Avatar src={l.avatar || ""} alt={l.displayName || l.username} size={16} />
                            <span>{l.username}</span>
                          </Link>
                        ))}
                        {detailPost.likes.length > 10 && <span className="text-xs text-muted-foreground">+{detailPost.likes.length - 10} more</span>}
                      </div>
                    </div>
                  )}

                  {/* Caption & location */}
                  {editingPost ? (
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Caption</label>
                        <textarea value={editCaption} onChange={(e) => setEditCaption(e.target.value)} rows={3} className="input" />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Location</label>
                        <LocationInput value={editLocation} onChange={setEditLocation} />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tags</label>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {editTags.map((t, i) => (
                            <span key={i} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                              {t}<button onClick={() => setEditTags(editTags.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button>
                            </span>
                          ))}
                        </div>
                        <input value={editTagInput} onChange={(e) => setEditTagInput(e.target.value)}
                          onKeyDown={(e) => { if ((e.key === "Enter" || e.key === ",") && editTagInput.trim()) { e.preventDefault(); if (!editTags.includes(editTagInput.trim())) setEditTags([...editTags, editTagInput.trim()]); setEditTagInput(""); } }}
                          className="input" placeholder="Add tag..." />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={async () => {
                          try {
                            await api.posts.update(detailPost._id || detailPost.id, { caption: editCaption, location: editLocation, tags: editTags });
                            toast.success("Post updated!");
                            setEditingPost(false);
                            const full = await api.posts.getById(detailPost._id || detailPost.id);
                            setDetailPost(full);
                            loadProfile();
                          } catch (err: any) { toast.error(err.message); }
                        }} className="flex-1 rounded-full bg-primary py-2 text-sm font-semibold text-primary-foreground">Save</button>
                        <button onClick={() => setEditingPost(false)} className="rounded-full border border-border px-4 py-2 text-sm">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {(detailPost.caption) && <p className="text-sm">{detailPost.caption}</p>}
                      {detailPost.location && <div className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{detailPost.location}</div>}
                      {(detailPost.tags?.length > 0) && (
                        <div className="flex flex-wrap gap-1.5">
                          {detailPost.tags.map((t: string, i: number) => (
                            <span key={i} className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"><Tag className="h-2.5 w-2.5" />{t}</span>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {/* Date */}
                  <div className="text-xs text-muted-foreground">{detailPost.createdAt ? new Date(detailPost.createdAt).toLocaleDateString("en-US", { dateStyle: "long" }) : ""}</div>

                  {/* Comments */}
                  {detailPost.comments?.length > 0 && (
                    <div className="space-y-2 border-t border-border pt-3">
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Comments</div>
                      {detailPost.comments.map((c: any) => {
                        const cAuthor = c.author && typeof c.author === "object" ? c.author : c._author;
                        const cUsername = cAuthor?.username || "user";
                        const cAvatar = cAuthor?.avatar || "";
                        const cId = c._id || c.id;
                        const canDelete = (c.author?._id || c.authorId || c.author) === currentUserId || isMe;
                        return (
                          <div key={cId} className="flex items-start gap-2 group">
                            <Link href={`/profile/${cUsername}`} onClick={() => setDetailPost(null)}><Avatar src={cAvatar} alt={cUsername} size={24} /></Link>
                            <div className="flex-1 text-sm">
                              <Link href={`/profile/${cUsername}`} onClick={() => setDetailPost(null)} className="font-semibold hover:underline">{cUsername}</Link>{" "}
                              <span>{c.text}</span>
                            </div>
                            {canDelete && (
                              <button onClick={async () => {
                                try {
                                  await api.posts.deleteComment(detailPost._id || detailPost.id, cId);
                                  const full = await api.posts.getById(detailPost._id || detailPost.id);
                                  setDetailPost(full);
                                  toast.success("Comment deleted");
                                } catch {}
                              }} className="rounded p-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition hover:text-destructive">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Bottom actions */}
                <div className="border-t border-border p-4 space-y-2">
                  <button onClick={() => {
                    setEditingPost(true);
                    setEditCaption(detailPost.caption || "");
                    setEditLocation(detailPost.location || "");
                    setEditTags(detailPost.tags || []);
                  }} className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-semibold transition hover:bg-muted">
                    <Pencil className="h-4 w-4" /> Edit post
                  </button>
                  <button onClick={async () => {
                    if (!confirm("Delete this post? This cannot be undone.")) return;
                    try {
                      await api.posts.delete(detailPost._id || detailPost.id);
                      toast.success("Post deleted");
                      setDetailPost(null);
                      loadProfile();
                    } catch (err: any) { toast.error(err.message); }
                  }} className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive py-2.5 text-sm font-semibold text-destructive transition hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" /> Delete post
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Followers / Following Modal ─── */}
      <AnimatePresence>
        {showFollowList && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => setShowFollowList(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <h2 className="font-serif text-xl capitalize">{showFollowList}</h2>
                <button onClick={() => setShowFollowList(null)} className="rounded-full p-1 hover:bg-muted"><X className="h-5 w-5" /></button>
              </div>
              <div className="max-h-96 overflow-y-auto p-3">
                {followListLoading ? (
                  <div className="flex items-center justify-center py-10"><div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
                ) : followListUsers.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">No {showFollowList} yet.</p>
                ) : (
                  <ul className="space-y-1">
                    {followListUsers.map((u) => (
                      <li key={u.id}>
                        <Link href={`/profile/${u.username}`} onClick={() => setShowFollowList(null)}
                          className="flex items-center gap-3 rounded-xl p-3 transition hover:bg-muted">
                          <Avatar src={u.avatar} alt={u.displayName} size={44} />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold">{u.displayName}</div>
                            <div className="truncate text-xs text-muted-foreground">@{u.username}</div>
                          </div>
                          {u.location && <span className="hidden text-xs text-muted-foreground sm:block">{u.location}</span>}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <div className="font-serif text-2xl">{value}</div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
