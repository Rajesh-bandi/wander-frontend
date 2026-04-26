import { useRef, useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { Calendar, Users, MapPin, Wallet, Check, X, Send } from "lucide-react";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import { Avatar } from "@/components/Avatar";
import { ChatBubble } from "@/components/ChatBubble";
import { LockOverlay } from "@/components/LockOverlay";
import { formatBudget } from "@/pages/CreatePlan";
import { toast } from "sonner";
import type { Plan, Chat, User } from "@/data/types";

export default function PlanDetails() {
  const [, params] = useRoute("/plans/:id");
  const id = params?.id;
  const { currentUserId, isPremium, requestJoinPlan, acceptJoinRequest, rejectJoinRequest, sendMessage, refreshPlans, refreshChats } = useStore();

  const [plan, setPlan] = useState<(Plan & { _creator?: User; _participants?: User[]; _pendingRequests?: User[] }) | null>(null);
  const [groupChat, setGroupChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    if (!id) return;
    try {
      const [planData, chatsData] = await Promise.all([
        api.plans.getById(id),
        api.chats.getAll(),
      ]);
      setPlan(planData as any);
      const gc = (chatsData as any[]).find((c: any) => c.planId === id);
      setGroupChat(gc || null);
    } catch {
      setPlan(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [id]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [groupChat?.messages.length]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!plan) return <div className="py-20 text-center text-muted-foreground">Plan not found.</div>;

  const creator = (plan as any)._creator || null;
  const participants = (plan as any)._participants || [];
  const pendingRequests = (plan as any)._pendingRequests || [];
  const isCreator = plan.creatorId === currentUserId;
  const joined = plan.participantIds.includes(currentUserId);
  const requested = plan.pendingRequestIds.includes(currentUserId);

  const onJoin = async () => {
    if (!isPremium) { toast.error("Joining plans requires Premium."); return; }
    await requestJoinPlan(plan.id);
    toast.success("Request sent", { description: "The trip creator will review your request." });
    await loadData();
  };

  const onSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (groupChat && draft.trim()) {
      await sendMessage(groupChat.id, draft.trim());
      setDraft("");
      await loadData();
    }
  };

  const onAccept = async (userId: string) => {
    await acceptJoinRequest(plan.id, userId);
    toast.success("Request accepted");
    await loadData();
  };

  const onReject = async (userId: string) => {
    await rejectJoinRequest(plan.id, userId);
    toast("Request declined");
    await loadData();
  };

  return (
    <div className="space-y-8">
      <div className="relative h-64 overflow-hidden rounded-3xl sm:h-80 lg:h-96">
        <img src={plan.coverImage} alt={plan.destination} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6 text-white">
          <div className="flex items-center gap-1 text-xs"><MapPin className="h-3 w-3" />{plan.destination}</div>
          <h1 className="mt-1 font-serif text-4xl sm:text-5xl">{plan.title}</h1>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-6">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <Stat icon={Calendar} label={`${fmt(plan.startDate)} – ${fmt(plan.endDate)}`} />
              <Stat icon={Users} label={`${plan.participantIds.length}/${plan.maxParticipants} travelers`} />
              <Stat icon={Wallet} label={plan.budget > 0 ? formatBudget(plan.budget, plan.currency) : "Flexible"} />
            </div>
            <p className="mt-4 leading-relaxed text-foreground/80">{plan.description}</p>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-4 font-serif text-xl">Travelers</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {participants.map((u: User) => (
                <li key={u.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                  <Avatar src={u.avatar} alt={u.displayName} size={40} />
                  <div className="min-w-0">
                    <Link href={`/profile/${u.username}`} className="block truncate text-sm font-semibold hover:underline">{u.displayName}</Link>
                    <div className="truncate text-xs text-muted-foreground">{u.location}</div>
                  </div>
                  {u.id === plan.creatorId && <span className="ml-auto rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground">Host</span>}
                </li>
              ))}
            </ul>

            {isCreator && pendingRequests.length > 0 && (
              <>
                <h3 className="mt-6 mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pending requests</h3>
                <ul className="space-y-2">
                  {pendingRequests.map((u: User) => (
                    <li key={u.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                      <Avatar src={u.avatar} alt={u.displayName} size={36} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{u.displayName}</div>
                        <div className="truncate text-xs text-muted-foreground">{u.location}</div>
                      </div>
                      <button onClick={() => onAccept(u.id)} className="rounded-full bg-primary p-2 text-primary-foreground hover:opacity-90"><Check className="h-4 w-4" /></button>
                      <button onClick={() => onReject(u.id)} className="rounded-full border border-border p-2 hover:bg-muted"><X className="h-4 w-4" /></button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            {creator && (
              <Link href={`/profile/${creator.username}`} className="mb-4 flex items-center gap-3">
                <Avatar src={creator.avatar} alt={creator.displayName} size={48} />
                <div>
                  <div className="text-sm font-semibold">{creator.displayName}</div>
                  <div className="text-xs text-muted-foreground">Trip host</div>
                </div>
              </Link>
            )}
            {isCreator ? (
              <p className="text-xs text-muted-foreground">You're hosting this trip. Manage requests on the left.</p>
            ) : joined ? (
              <button disabled className="w-full cursor-not-allowed rounded-full bg-muted py-2.5 text-sm font-semibold text-muted-foreground">You're in</button>
            ) : requested ? (
              <button disabled className="w-full cursor-not-allowed rounded-full border border-border py-2.5 text-sm font-semibold text-muted-foreground">Request pending</button>
            ) : (
              <button onClick={onJoin} className="w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 active:scale-[0.98]">Request to join</button>
            )}
          </div>

          {groupChat && (joined || isCreator) ? (
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="border-b border-border px-4 py-3">
                <h3 className="font-semibold">Group chat</h3>
                <p className="text-xs text-muted-foreground">{groupChat.participantIds.length} travelers</p>
              </div>
              <div ref={scrollRef} className="max-h-80 space-y-3 overflow-y-auto p-4">
                {groupChat.messages.length === 0 && <p className="text-center text-xs text-muted-foreground">No messages yet — say hi.</p>}
                {groupChat.messages.map((m) => <ChatBubble key={m.id} message={m} />)}
              </div>
              <form onSubmit={onSend} className="flex items-center gap-2 border-t border-border p-3">
                <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Message the crew..." className="input flex-1" />
                <button type="submit" className="rounded-full bg-primary p-2.5 text-primary-foreground hover:opacity-90"><Send className="h-4 w-4" /></button>
              </form>
            </div>
          ) : groupChat ? (
            <LockOverlay message="Join the trip to chat with the crew">
              <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Group chat preview</div>
            </LockOverlay>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label }: { icon: typeof Calendar; label: string }) {
  return <span className="inline-flex items-center gap-1.5 text-foreground/80"><Icon className="h-4 w-4 text-primary" />{label}</span>;
}
function fmt(d: string) { return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); }
