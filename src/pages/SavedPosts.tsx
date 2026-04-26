import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PostCard } from "@/components/PostCard";
import { Bookmark, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Post } from "@/data/types";

export default function SavedPosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.posts.getSaved()
      .then((res) => setPosts(res.posts as Post[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent">
            <Bookmark className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-serif text-3xl font-bold">Saved Posts</h1>
            <p className="text-sm text-muted-foreground">{posts.length} saved items</p>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : posts.length === 0 ? (
        <div className="py-16 text-center">
          <Bookmark className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
          <p className="text-lg font-semibold">No saved posts yet</p>
          <p className="text-sm text-muted-foreground">Tap the bookmark icon on posts to save them here</p>
        </div>
      ) : (
        <div className="space-y-6">
          <AnimatePresence>
            {posts.map((post) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <PostCard post={post} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
