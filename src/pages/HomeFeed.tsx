import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { useStore } from "@/lib/store";
import { PostCard } from "@/components/PostCard";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonCard } from "@/components/SkeletonCard";
import { Compass, Plus, Image as ImageIcon } from "lucide-react";

const PAGE = 6;

export default function HomeFeed() {
  const { posts } = useStore();
  const [count, setCount] = useState(PAGE);
  const [loading, setLoading] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const visible = posts.slice(0, count);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && count < posts.length && !loading) {
        setLoading(true);
        setTimeout(() => { setCount((c) => Math.min(posts.length, c + PAGE)); setLoading(false); }, 500);
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [count, posts.length, loading]);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="mx-auto w-full max-w-xl space-y-6">
        {posts.length === 0 ? (
          <EmptyState
            icon={ImageIcon}
            title="No posts yet"
            description="Your travel feed is empty. Posts from travelers you follow will appear here."
          />
        ) : (
          <div className="space-y-6">
            {visible.map((p) => <PostCard key={p.id} post={p} />)}
            {loading && <SkeletonCard height={400} />}
            <div ref={sentinel} className="h-1" />
            {count >= posts.length && (
              <p className="py-8 text-center text-xs text-muted-foreground">You're all caught up.</p>
            )}
          </div>
        )}
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-24 space-y-6">
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-2">
              <Compass className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Get started</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Explore travel guides, browse the store, or create a plan to find your travel crew.
            </p>
          </section>
          <Link href="/plans/new">
            <span className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4 text-sm font-semibold text-primary hover:bg-primary/10">
              <Plus className="h-4 w-4" /> Plan your next adventure
            </span>
          </Link>
        </div>
      </aside>
    </div>
  );
}
