import { useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Bell, Heart, MessageCircle, UserPlus, CornerDownRight, CheckCheck } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { useSocket } from "@/lib/socket";

function timeAgo(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

const ICONS: Record<string, typeof Heart> = {
  like: Heart,
  comment: MessageCircle,
  follow: UserPlus,
  reply: CornerDownRight,
  chat_message: MessageCircle,
};

const COLORS: Record<string, string> = {
  like: "text-rose-500 bg-rose-500/10",
  comment: "text-blue-500 bg-blue-500/10",
  follow: "text-emerald-500 bg-emerald-500/10",
  reply: "text-amber-500 bg-amber-500/10",
  chat_message: "text-violet-500 bg-violet-500/10",
};

export default function Notifications() {
  const { notifications, unreadCount, markAllRead, markRead, fetchNotifications } = useSocket();

  useEffect(() => { fetchNotifications(); }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-muted-foreground">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold transition hover:bg-muted">
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </button>
        )}
      </div>

      {/* List */}
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-muted">
            <Bell className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">No notifications yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">When someone likes, comments, or follows you, it'll show up here.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {notifications.map((n: any, i: number) => {
            const Icon = ICONS[n.type] || Bell;
            const colorClass = COLORS[n.type] || "text-muted-foreground bg-muted";
            const sender = n.sender;
            const senderName = sender?.displayName || sender?.username || "Someone";
            const senderAvatar = sender?.avatar || "";
            const senderUsername = sender?.username || "user";

            return (
              <motion.div
                key={n._id || i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => !n.read && markRead(n._id)}
                className={`flex items-start gap-3 rounded-xl p-3 transition cursor-pointer ${
                  n.read ? "opacity-70" : "bg-primary/5 hover:bg-primary/10"
                }`}
              >
                {/* Sender avatar with type icon overlay */}
                <div className="relative flex-shrink-0">
                  <Link href={`/profile/${senderUsername}`}>
                    <Avatar src={senderAvatar} alt={senderName} size={44} />
                  </Link>
                  <div className={`absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full ${colorClass}`}>
                    <Icon className="h-3 w-3" />
                  </div>
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <Link href={`/profile/${senderUsername}`} className="font-semibold hover:underline">{senderName}</Link>{" "}
                    <span className="text-muted-foreground">{n.text || n.type}</span>
                  </p>
                  <span className="text-[11px] text-muted-foreground">{timeAgo(n.createdAt)}</span>
                </div>

                {/* Post thumbnail */}
                {n.post?.image && (
                  <div className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                    <img src={n.post.image} alt="" className="h-full w-full object-cover" />
                  </div>
                )}

                {/* Unread dot */}
                {!n.read && (
                  <div className="mt-2 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-primary" />
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
