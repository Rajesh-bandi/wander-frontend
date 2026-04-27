import { useEffect, useRef, useState, useCallback } from "react";
import { useStore } from "@/lib/store";
import { useSocket } from "@/lib/socket";
import { Avatar } from "@/components/Avatar";
import { ChatBubble } from "@/components/ChatBubble";
import { EmptyState } from "@/components/EmptyState";
import { MessageCircle, Send, Check, X, Users, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function Chats() {
  const { chats, currentUserId, getUser, getPlan, sendMessage, acceptChatRequest, rejectChatRequest, refreshChats } = useStore();
  const { socket, clearChatUnread } = useSocket();
  const myChats = chats.filter((c) => c.participantIds.includes(currentUserId));
  const groups = myChats.filter((c) => c.type === "group");
  const privates = myChats.filter((c) => c.type === "private");
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = myChats.find((c) => c.id === activeId);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [active?.messages.length, activeId]);

  // Join socket rooms for all chats
  useEffect(() => {
    if (!socket) return;
    myChats.forEach((c) => socket.emit("join_chat", c.id));
    return () => { myChats.forEach((c) => socket.emit("leave_chat", c.id)); };
  }, [socket, myChats.length]);

  // Listen for real-time messages and refresh
  useEffect(() => {
    const handler = () => { refreshChats(); };
    window.addEventListener("socket:new_message", handler);
    return () => window.removeEventListener("socket:new_message", handler);
  }, [refreshChats]);

  // Clear unread when opening a chat
  useEffect(() => {
    if (activeId) clearChatUnread(activeId);
  }, [activeId, clearChatUnread]);

  const onSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (active && draft.trim()) { sendMessage(active.id, draft.trim()); setDraft(""); }
  };

  const partner = active?.type === "private" ? getUser(active.participantIds.find((id) => id !== currentUserId)!) : null;
  const planTitle = active?.planId ? getPlan(active.planId)?.title : null;
  const isPendingForMe = active?.type === "private" && active.requestStatus === "pending" && active.messages[0]?.authorId !== currentUserId;

  if (myChats.length === 0) {
    return (
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="font-serif text-4xl">Chats</h1>
          <p className="text-sm text-muted-foreground">Your conversations will appear here.</p>
        </header>
        <EmptyState
          icon={MessageCircle}
          title="No chats yet"
          description="Join a travel plan or message a traveler to start chatting."
        />
      </div>
    );
  }

  return (
    <div className="grid h-[calc(100vh-8rem)] gap-4 lg:grid-cols-[320px_1fr]">
      {/* ── Chat list (hidden on mobile when a chat is open) ── */}
      <aside className={cn(
        "space-y-4 overflow-y-auto rounded-2xl border border-border bg-card p-3",
        activeId ? "hidden lg:block" : "block"
      )}>
        <div className="flex items-center gap-2 px-2 pb-1">
          <MessageCircle className="h-5 w-5 text-primary" />
          <h2 className="font-serif text-xl font-bold">Chats</h2>
          <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">{myChats.length}</span>
        </div>

        <Section title="Plan group chats" icon={Users}>
          {groups.length === 0 ? <p className="px-2 py-3 text-xs text-muted-foreground">No group chats yet.</p> : groups.map((c) => {
            const plan = c.planId ? getPlan(c.planId) : null;
            const last = c.messages[c.messages.length - 1];
            return (
              <button key={c.id} onClick={() => setActiveId(c.id)}
                className={cn("flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition", activeId === c.id ? "bg-primary/10" : "hover:bg-muted")}>
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary/15 text-secondary"><Users className="h-4 w-4" /></div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{plan?.title ?? "Group"}</div>
                  <div className="truncate text-xs text-muted-foreground">{last?.text ?? "No messages"}</div>
                </div>
              </button>
            );
          })}
        </Section>

        <Section title="Private chats" icon={MessageCircle}>
          {privates.length === 0 ? <p className="px-2 py-3 text-xs text-muted-foreground">No private chats yet.</p> : privates.map((c) => {
            const other = getUser(c.participantIds.find((id) => id !== currentUserId)!);
            const last = c.messages[c.messages.length - 1];
            return (
              <button key={c.id} onClick={() => setActiveId(c.id)}
                className={cn("flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition", activeId === c.id ? "bg-primary/10" : "hover:bg-muted")}>
                {other && <Avatar src={other.avatar} alt={other.displayName} size={40} />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="truncate text-sm font-semibold">{other?.displayName}</div>
                    {c.requestStatus === "pending" && <span className="rounded-full bg-accent/30 px-2 py-0.5 text-[10px] font-semibold uppercase">Request</span>}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{last?.text ?? "No messages"}</div>
                </div>
              </button>
            );
          })}
        </Section>
      </aside>

      {/* ── Active chat (hidden on mobile when no chat is open) ── */}
      <section className={cn(
        "flex flex-col overflow-hidden rounded-2xl border border-border bg-card",
        activeId ? "flex" : "hidden lg:flex"
      )}>
        {!active ? (
          <div className="grid h-full place-items-center">
            <EmptyState icon={MessageCircle} title="Pick a conversation" description="Select a chat on the left to get started." />
          </div>
        ) : (
          <>
            <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5 sm:py-4">
              <div className="flex items-center gap-3">
                {/* Back button — mobile only */}
                <button
                  onClick={() => setActiveId(null)}
                  className="rounded-full p-1.5 hover:bg-muted transition lg:hidden"
                  aria-label="Back to chats"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                {partner ? <Avatar src={partner.avatar} alt={partner.displayName} size={40} /> : <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary/15 text-secondary"><Users className="h-4 w-4" /></div>}
                <div>
                  <div className="font-semibold">{partner?.displayName ?? planTitle ?? "Group"}</div>
                  <div className="text-xs text-muted-foreground">
                    {active.type === "group" ? `${active.participantIds.length} travelers` : partner?.location}
                  </div>
                </div>
              </div>
            </header>

            {isPendingForMe ? (
              <div className="grid flex-1 place-items-center p-8">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-sm space-y-4 rounded-2xl border border-border bg-background p-6 text-center">
                  {partner && <Avatar src={partner.avatar} alt={partner.displayName} size={64} className="mx-auto" />}
                  <h3 className="font-serif text-xl">{partner?.displayName} wants to chat</h3>
                  <p className="text-sm text-muted-foreground">{active.messages[0]?.text}</p>
                  <div className="flex gap-2">
                    <button onClick={() => { acceptChatRequest(active.id); toast.success("Chat request accepted"); }} className="flex-1 rounded-full bg-primary py-2 text-sm font-semibold text-primary-foreground"><Check className="mr-1 inline h-4 w-4" />Accept</button>
                    <button onClick={() => { rejectChatRequest(active.id); toast("Request declined"); }} className="flex-1 rounded-full border border-border py-2 text-sm font-semibold"><X className="mr-1 inline h-4 w-4" />Decline</button>
                  </div>
                </motion.div>
              </div>
            ) : (
              <>
                <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
                  {active.messages.length === 0 && <p className="text-center text-xs text-muted-foreground">No messages yet — say hi.</p>}
                  {active.messages.map((m) => <ChatBubble key={m.id} message={m} />)}
                </div>
                <form onSubmit={onSend} className="flex items-center gap-2 border-t border-border p-3">
                  <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type a message..." className="input flex-1" />
                  <button type="submit" className="rounded-full bg-primary p-2.5 text-primary-foreground hover:opacity-90 active:scale-95"><Send className="h-4 w-4" /></button>
                </form>
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof Users; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-1 flex items-center gap-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"><Icon className="h-3 w-3" />{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}
