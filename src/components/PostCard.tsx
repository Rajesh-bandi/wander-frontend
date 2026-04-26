import { Heart, MessageCircle, Send, MapPin, Trash2, CornerDownRight, X, Copy, Search, Loader2, MoreHorizontal, Tag, Bookmark } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Avatar } from "./Avatar";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import type { Post, User } from "@/data/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function timeAgo(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "now";
  if (d < 3600) return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  return `${Math.floor(d / 86400)}d`;
}

export function PostCard({ post: initialPost }: { post: Post }) {
  const { currentUserId, follows, toggleFollow, toggleLike, likedPostIds, savedPostIds, toggleBookmark, getUser, chats } = useStore();
  const [post, setPost] = useState(initialPost);
  const [showComments, setShowComments] = useState(false);
  const [draft, setDraft] = useState("");
  const [pop, setPop] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [deleted, setDeleted] = useState(false);

  // Sync local state when the store's post data changes
  useEffect(() => { setPost(initialPost); }, [initialPost]);

  const liked = likedPostIds.includes(post.id);
  const saved = savedPostIds.includes(post.id);
  const author = getUser(post.authorId) || { id: post.authorId, username: "user", displayName: "User", avatar: "", coverImage: "", bio: "", location: "", followers: 0, following: 0, isPremium: false };
  const isFollowing = follows.includes(author.id);
  const isMyPost = author.id === currentUserId;

  const handleAddComment = async () => {
    if (!draft.trim()) return;
    try {
      const comments = await api.posts.addComment(post.id, draft.trim());
      setPost((p) => ({ ...p, comments: mapComments(comments) }));
      setDraft("");
    } catch {}
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const comments = await api.posts.deleteComment(post.id, commentId);
      setPost((p) => ({ ...p, comments: mapComments(comments) }));
      toast.success("Comment deleted");
    } catch (err: any) { toast.error(err.message || "Failed to delete comment"); }
  };

  const handleCommentLike = async (commentId: string) => {
    try {
      const res = await api.posts.toggleCommentLike(post.id, commentId);
      // Optimistically update the comment likes in local state
      setPost((p) => ({
        ...p,
        comments: p.comments.map((c: any) =>
          (c.id === commentId)
            ? { ...c, likes: res.liked
                ? [...(c.likes || []), currentUserId]
                : (c.likes || []).filter((l: string) => l !== currentUserId) }
            : c
        ),
      }));
    } catch {}
  };

  const handleReply = async (commentId: string) => {
    if (!replyDraft.trim()) return;
    try {
      const comments = await api.posts.addReply(post.id, commentId, replyDraft.trim());
      setPost((p) => ({ ...p, comments: mapComments(comments) }));
      setReplyDraft("");
      setReplyTo(null);
    } catch {}
  };

  const handleDeletePost = async () => {
    if (!confirm("Delete this post? This cannot be undone.")) return;
    try {
      await api.posts.delete(post.id);
      setDeleted(true);
      toast.success("Post deleted");
    } catch (err: any) { toast.error(err.message || "Failed to delete"); }
  };

  if (deleted) return null;

  return (
    <>
      <motion.article layout className="overflow-hidden rounded-2xl border border-border bg-card transition">
        {/* Header */}
        <header className="flex items-center gap-3 px-4 py-3">
          <Link href={`/profile/${author.username}`}><Avatar src={author.avatar} alt={author.displayName} size={40} /></Link>
          <div className="flex-1 min-w-0">
            <Link href={`/profile/${author.username}`} className="text-sm font-semibold hover:underline">{author.displayName}</Link>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {post.location && <><MapPin className="h-3 w-3" /><span>{post.location}</span><span>·</span></>}
              <span>{timeAgo(post.createdAt)}</span>
            </div>
          </div>
          {isMyPost ? (
            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)} className="rounded-full p-1.5 hover:bg-muted">
                <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 z-10 w-36 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                  <button onClick={() => { setShowDetail(true); setShowMenu(false); }} className="flex w-full items-center gap-2 px-3 py-2.5 text-sm hover:bg-muted">
                    View post
                  </button>
                  <button onClick={() => { handleDeletePost(); setShowMenu(false); }} className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-3.5 w-3.5" /> Delete post
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={async () => {
              try { await toggleFollow(author.id); } catch (err: any) { toast.error(err.message || "Premium required"); }
            }} className={cn("rounded-full px-3 py-1.5 text-xs font-semibold transition", isFollowing ? "border border-border bg-transparent text-foreground hover:bg-muted" : "bg-primary text-primary-foreground hover:opacity-90")}>
              {isFollowing ? "Following" : "Follow"}
            </button>
          )}
        </header>

        {/* Image — click opens detail for owner */}
        <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted sm:aspect-[5/4] cursor-pointer" onClick={() => isMyPost && setShowDetail(true)}>
          <img src={post.image} alt="" className="h-full w-full object-cover" loading="lazy" />
        </div>

        {/* Actions */}
        <div className="space-y-3 p-4">
          <div className="flex items-center gap-3">
            <button aria-label="Like" onClick={() => {
              // Optimistically update local state
              const wasLiked = liked;
              const currentLikes = typeof post.likes === "number" ? post.likes : (post.likes as any)?.length || 0;
              setPost((p) => ({ ...p, likes: wasLiked ? currentLikes - 1 : currentLikes + 1 }));
              if (!wasLiked) { setPop(true); setTimeout(() => setPop(false), 350); }
              toggleLike(post.id);
            }} className="relative inline-flex items-center gap-1.5 text-sm">
              <motion.span animate={pop ? { scale: [1, 1.4, 1] } : { scale: 1 }} transition={{ duration: 0.35 }} className="inline-block">
                <Heart className={cn("h-6 w-6 transition", liked ? "fill-primary text-primary" : "text-foreground")} />
              </motion.span>
              <span className="tabular-nums">{(typeof post.likes === "number" ? post.likes : (post.likes as any)?.length || 0).toLocaleString()}</span>
            </button>
            <button onClick={() => setShowComments((v) => !v)} className="inline-flex items-center gap-1.5 text-sm">
              <MessageCircle className="h-6 w-6" /><span>{post.comments.length}</span>
            </button>
            <button className="ml-auto" aria-label="Share" onClick={() => setShowShare(true)}>
              <Send className="h-5 w-5" />
            </button>
            <button aria-label="Bookmark" onClick={(e) => { e.stopPropagation(); toggleBookmark(post.id); }}
              className="rounded-full p-1.5 cursor-pointer hover:bg-muted transition">
              <Bookmark className={cn("h-5 w-5 transition", saved ? "fill-foreground text-foreground" : "text-foreground")} />
            </button>
          </div>

          {/* Tags */}
          {(post as any).tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {(post as any).tags.map((tag: string, i: number) => (
                <span key={i} className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                  <Tag className="h-2.5 w-2.5" />{tag}
                </span>
              ))}
            </div>
          )}

          <p className="text-sm leading-relaxed">
            <Link href={`/profile/${author.username}`} className="font-semibold hover:underline">{author.username}</Link>{" "}
            <span>{post.caption}</span>
          </p>

          {/* Comments */}
          <AnimatePresence initial={false}>
            {showComments && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="space-y-3 border-t border-border pt-3">
                  {post.comments.length === 0 && <p className="text-xs text-muted-foreground">Be the first to comment.</p>}

                  {post.comments.map((c: any) => {
                    const cUsername = c._author?.username || "user";
                    const cAvatar = c._author?.avatar || "";
                    const cDisplayName = c._author?.displayName || cUsername;
                    const cId = c.id;
                    const canDelete = c.authorId === currentUserId || isMyPost;
                    const commentLikes = c.likes?.length || 0;
                    const iLikedComment = c.likes?.includes?.(currentUserId) || false;

                    return (
                      <div key={cId} className="space-y-2">
                        <div className="flex items-start gap-2 group">
                          <Link href={`/profile/${cUsername}`}><Avatar src={cAvatar} alt={cDisplayName} size={28} /></Link>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm">
                              <Link href={`/profile/${cUsername}`} className="font-semibold hover:underline">{cUsername}</Link>{" "}
                              <span>{c.text}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-[10px] text-muted-foreground">{c.createdAt ? timeAgo(c.createdAt) : ""}</span>
                              <button onClick={() => handleCommentLike(cId)} className={cn("inline-flex items-center gap-0.5 text-[10px] font-semibold transition", iLikedComment ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
                                <Heart className={cn("h-3 w-3", iLikedComment && "fill-primary")} />
                                {commentLikes > 0 && <span>{commentLikes}</span>}
                              </button>
                              <button onClick={() => setReplyTo(replyTo === cId ? null : cId)} className="text-[10px] font-semibold text-muted-foreground hover:text-foreground">Reply</button>
                            </div>
                          </div>
                          {canDelete && (
                            <button onClick={() => handleDeleteComment(cId)} className="rounded p-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition hover:text-destructive" title="Delete">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Replies */}
                        {c.replies?.length > 0 && (
                          <div className="ml-8 space-y-2 border-l-2 border-border pl-3">
                            {c.replies.map((r: any) => {
                              const rUsername = r._author?.username || "user";
                              const rAvatar = r._author?.avatar || "";
                              const canDeleteReply = r.authorId === currentUserId || isMyPost;
                              return (
                                <div key={r.id} className="flex items-start gap-2 group/reply">
                                  <Link href={`/profile/${rUsername}`}><Avatar src={rAvatar} alt={rUsername} size={22} /></Link>
                                  <div className="flex-1 text-sm">
                                    <Link href={`/profile/${rUsername}`} className="font-semibold hover:underline">{rUsername}</Link>{" "}
                                    <span>{r.text}</span>
                                  </div>
                                  {canDeleteReply && (
                                    <button onClick={() => handleDeleteComment(cId)} className="rounded p-1 text-muted-foreground opacity-0 group-hover/reply:opacity-100 transition hover:text-destructive" title="Delete reply">
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Reply input */}
                        {replyTo === cId && (
                          <form onSubmit={(e) => { e.preventDefault(); handleReply(cId); }} className="ml-8 flex items-center gap-2">
                            <CornerDownRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <input value={replyDraft} onChange={(e) => setReplyDraft(e.target.value)} placeholder={`Reply to @${cUsername}...`}
                              className="flex-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-primary" autoFocus />
                            <button type="submit" className="rounded-full bg-primary px-2.5 py-1.5 text-[10px] font-semibold text-primary-foreground">Reply</button>
                          </form>
                        )}
                      </div>
                    );
                  })}

                  <form onSubmit={(e) => { e.preventDefault(); handleAddComment(); }} className="flex items-center gap-2 pt-2">
                    <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add a comment..."
                      className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:border-primary" />
                    <button type="submit" className="rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">Post</button>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.article>

      {/* Share Modal */}
      <ShareModal open={showShare} onClose={() => setShowShare(false)} post={post} author={author} />

      {/* Post Detail Modal (for owner) */}
      <PostDetailModal open={showDetail} onClose={() => setShowDetail(false)} post={post} author={author} onDelete={handleDeletePost} isOwner={isMyPost} />
    </>
  );
}

/* ─────────────── Post Detail Modal (owner view) ─────────────── */
function PostDetailModal({ open, onClose, post, author, onDelete, isOwner }: {
  open: boolean; onClose: () => void; post: Post; author: User; onDelete: () => void; isOwner: boolean;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-3xl overflow-hidden rounded-3xl border border-border bg-card shadow-2xl max-h-[90vh] flex flex-col md:flex-row"
            onClick={(e) => e.stopPropagation()}>

            {/* Image side */}
            <div className="w-full md:w-1/2 bg-black flex items-center">
              <img src={post.image} alt="" className="h-full w-full object-contain max-h-[50vh] md:max-h-[90vh]" />
            </div>

            {/* Info side */}
            <div className="flex w-full flex-col md:w-1/2">
              {/* Header */}
              <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                <Avatar src={author.avatar} alt={author.displayName} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{author.displayName}</div>
                  <div className="text-xs text-muted-foreground">@{author.username}</div>
                </div>
                <button onClick={onClose} className="rounded-full p-1 hover:bg-muted"><X className="h-5 w-5" /></button>
              </div>

              {/* Details */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {post.caption && <p className="text-sm">{post.caption}</p>}
                {post.location && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />{post.location}
                  </div>
                )}
                {(post as any).tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {(post as any).tags.map((t: string, i: number) => (
                      <span key={i} className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                        <Tag className="h-2.5 w-2.5" />{t}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Heart className="h-4 w-4" />{post.likes.toLocaleString()} likes</span>
                  <span className="flex items-center gap-1"><MessageCircle className="h-4 w-4" />{post.comments.length} comments</span>
                </div>
                <div className="text-xs text-muted-foreground">{new Date(post.createdAt).toLocaleDateString("en-US", { dateStyle: "long" })}</div>
              </div>

              {/* Owner actions */}
              {isOwner && (
                <div className="border-t border-border p-4">
                  <button onClick={() => { onDelete(); onClose(); }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive py-2.5 text-sm font-semibold text-destructive transition hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" /> Delete this post
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─────────────── Share Modal ─────────────── */
function ShareModal({ open, onClose, post, author }: { open: boolean; onClose: () => void; post: Post; author: User }) {
  const { chats, currentUserId, startPrivateChat } = useStore();
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState<string | null>(null);

  const recentUsers = chats
    .filter((c: any) => c.type === "private")
    .flatMap((c: any) => (c._participants || []).filter((p: any) => (p._id || p.id || p) !== currentUserId))
    .slice(0, 6);

  const handleSearch = async (q: string) => {
    setSearchQ(q);
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await api.search(q.trim());
      setSearchResults((res.users as User[]).filter((u) => u.id !== currentUserId));
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  };

  const shareToUser = async (userId: string) => {
    try {
      setSending(userId);
      const chatId = await startPrivateChat(userId);
      await api.chats.sendMessage(chatId, `Check out this post! 📸\n${post.caption || ""}\n${window.location.origin}/profile/${author.username}`);
      toast.success("Shared!");
      onClose();
    } catch (err: any) { toast.error(err.message || "Failed to share"); }
    finally { setSending(null); }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/profile/${author.username}`);
      toast.success("Link copied!");
    } catch {}
  };

  const shareExternal = async () => {
    try {
      await navigator.share({ title: `Post by ${author.displayName}`, text: post.caption || "Check out this post on Wander!", url: `${window.location.origin}/profile/${author.username}` });
    } catch {}
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
          <motion.div initial={{ opacity: 0, y: 80 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 80 }}
            transition={{ type: "spring", damping: 30, stiffness: 400 }}
            className="w-full max-w-md overflow-hidden rounded-t-3xl sm:rounded-3xl border border-border bg-card shadow-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}>

            <div className="flex justify-center pt-3 pb-1 sm:hidden"><div className="h-1 w-10 rounded-full bg-muted-foreground/30" /></div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <h3 className="font-serif text-lg">Share</h3>
              <button onClick={onClose} className="rounded-full p-1 hover:bg-muted"><X className="h-5 w-5" /></button>
            </div>

            {/* Post preview */}
            <div className="mx-4 mt-4 flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
              <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                <img src={post.image} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <Avatar src={author.avatar} alt={author.displayName} size={20} />
                  <span className="text-xs font-semibold">{author.displayName}</span>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{post.caption || "No caption"}</p>
              </div>
            </div>

            {/* Search */}
            <div className="px-4 pt-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input value={searchQ} onChange={(e) => handleSearch(e.target.value)} placeholder="Search people..."
                  className="h-9 w-full rounded-full border border-border bg-background pl-10 pr-4 text-sm outline-none focus:border-primary" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
              {searching && <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>}
              {!searching && searchQ && searchResults.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">No users found</p>}
              {(searchQ ? searchResults : recentUsers).map((u: any) => {
                const uid = u._id || u.id;
                return (
                  <button key={uid} onClick={() => shareToUser(uid)} disabled={sending === uid}
                    className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition hover:bg-muted disabled:opacity-50">
                    <Avatar src={u.avatar || ""} alt={u.displayName || u.username} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold truncate">{u.displayName || u.username}</div>
                      <div className="text-xs text-muted-foreground truncate">@{u.username}</div>
                    </div>
                    {sending === uid ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">Send</span>}
                  </button>
                );
              })}
              {!searchQ && recentUsers.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">Start chatting to see recent contacts here</p>}
            </div>

            <div className="border-t border-border px-4 py-3 flex gap-2">
              <button onClick={copyLink} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-semibold transition hover:bg-muted">
                <Copy className="h-4 w-4" /> Copy link
              </button>
              {typeof navigator.share === "function" && (
                <button onClick={shareExternal} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90">
                  <Send className="h-4 w-4" /> More apps
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─── Helpers ─── */
function mapComments(raw: any[]) {
  return raw.map((c: any) => {
    const cAuthor = c.author;
    return {
      id: String(c._id || c.id),
      authorId: typeof cAuthor === "object" ? String(cAuthor?._id || cAuthor?.id) : String(cAuthor || c.authorId),
      _author: cAuthor && typeof cAuthor === "object" ? {
        username: cAuthor.username,
        displayName: cAuthor.displayName,
        avatar: cAuthor.avatar || "",
      } : (c._author || null),
      text: c.text,
      createdAt: c.createdAt,
      likes: (c.likes || []).map((l: any) => typeof l === "object" ? String(l._id || l.id) : String(l)),
      replies: (c.replies || []).map((r: any) => {
        const rAuthor = r.author;
        return {
          id: String(r._id || r.id),
          authorId: typeof rAuthor === "object" ? String(rAuthor?._id || rAuthor?.id) : String(rAuthor || r.authorId),
          _author: rAuthor && typeof rAuthor === "object" ? {
            username: rAuthor.username,
            displayName: rAuthor.displayName,
            avatar: rAuthor.avatar || "",
          } : (r._author || null),
          text: r.text,
          createdAt: r.createdAt,
          likes: (r.likes || []).map((l: any) => typeof l === "object" ? String(l._id || l.id) : String(l)),
        };
      }),
    };
  });
}
