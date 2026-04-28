import { useRef, useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { Calendar, Users, MapPin, Wallet, Check, X, Send, Pencil, Trash2, Loader2, ImagePlus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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

  // Edit plan state
  const [showEditModal, setShowEditModal] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<User | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);

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

  const onRemoveParticipant = async () => {
    if (!removeTarget) return;
    try {
      setRemoveLoading(true);
      const res = await api.plans.removeParticipant(plan.id, removeTarget.id);
      setPlan(res.plan as any);
      toast.success(`${removeTarget.displayName} removed from the plan`);
      setRemoveTarget(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to remove participant");
    } finally {
      setRemoveLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="relative h-64 overflow-hidden rounded-3xl sm:h-80 lg:h-96">
        <img src={plan.coverImage || "https://images.unsplash.com/photo-1469854523086-cc02fe5d6800?w=800"} alt={plan.destination} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6 text-white">
          <div className="flex items-center gap-1 text-xs"><MapPin className="h-3 w-3" />{plan.destination}</div>
          <h1 className="mt-1 font-serif text-4xl sm:text-5xl">{plan.title}</h1>
        </div>
        {isCreator && (
          <button
            onClick={() => setShowEditModal(true)}
            className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/30"
          >
            <Pencil className="h-4 w-4" /> Edit Plan
          </button>
        )}
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-xl">Travelers</h2>
              {isCreator && participants.length > 1 && (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Manage participants</span>
              )}
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {participants.map((u: User) => (
                <li key={u.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                  <Avatar src={u.avatar} alt={u.displayName} size={40} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/profile/${u.username}`} className="block truncate text-sm font-semibold hover:underline">{u.displayName}</Link>
                    <div className="truncate text-xs text-muted-foreground">{u.location}</div>
                  </div>
                  {u.id === plan.creatorId ? (
                    <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground">Host</span>
                  ) : isCreator ? (
                    <button
                      onClick={() => setRemoveTarget(u)}
                      className="rounded-full p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30 transition"
                      title="Remove participant"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
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
              <p className="text-xs text-muted-foreground">You're hosting this trip. Manage requests and participants on the left.</p>
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

      {/* Edit Plan Modal */}
      <AnimatePresence>
        {showEditModal && plan && (
          <EditPlanModal
            plan={plan}
            onClose={() => setShowEditModal(false)}
            onSave={async (updated) => { setPlan(updated as any); setShowEditModal(false); await refreshPlans(); }}
          />
        )}
      </AnimatePresence>

      {/* Remove Participant Confirmation Modal */}
      <AnimatePresence>
        {removeTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setRemoveTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-border bg-background p-5 space-y-4 shadow-2xl"
            >
              <h3 className="text-lg font-bold">Remove participant?</h3>
              <div className="flex items-center gap-3 rounded-xl border border-border p-3">
                <Avatar src={removeTarget.avatar} alt={removeTarget.displayName} size={40} />
                <div>
                  <div className="text-sm font-semibold">{removeTarget.displayName}</div>
                  <div className="text-xs text-muted-foreground">@{removeTarget.username}</div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                They will be removed from the plan and the group chat. They can request to join again later.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setRemoveTarget(null)}
                  className="flex-1 rounded-full border border-border py-2.5 text-sm font-semibold transition hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={onRemoveParticipant}
                  disabled={removeLoading}
                  className="flex-1 rounded-full bg-red-600 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 active:scale-[0.98] disabled:opacity-50"
                >
                  {removeLoading ? <><Loader2 className="h-4 w-4 animate-spin inline mr-1" /> Removing...</> : "Remove"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Edit Plan Modal ─── */
function EditPlanModal({ plan, onClose, onSave }: { plan: any; onClose: () => void; onSave: (updated: any) => void }) {
  const [title, setTitle] = useState(plan.title || "");
  const [description, setDescription] = useState(plan.description || "");
  const [destination, setDestination] = useState(plan.destination || "");
  const [coverImage, setCoverImage] = useState(plan.coverImage || "");
  const [newCoverImage, setNewCoverImage] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(plan.startDate ? new Date(plan.startDate).toISOString().slice(0, 10) : "");
  const [endDate, setEndDate] = useState(plan.endDate ? new Date(plan.endDate).toISOString().slice(0, 10) : "");
  const [maxParticipants, setMaxParticipants] = useState(plan.maxParticipants || 4);
  const [budget, setBudget] = useState(plan.budget || 0);
  const [currency, setCurrency] = useState(plan.currency || "USD");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setNewCoverImage(result);
      setCoverImage(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!title.trim() || !destination.trim() || !startDate || !endDate) {
      toast.error("Title, destination, and dates are required");
      return;
    }
    if (new Date(endDate) <= new Date(startDate)) {
      toast.error("End date must be after start date");
      return;
    }
    try {
      setLoading(true);
      const data: any = { title, description, destination, startDate, endDate, maxParticipants, budget, currency };
      if (newCoverImage) data.coverImage = coverImage;
      const updated = await api.plans.update(plan.id, data);
      toast.success("Plan updated");
      onSave(updated);
    } catch (err: any) {
      toast.error(err.message || "Failed to update plan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-background p-5 space-y-4 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Edit Plan</h3>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>

        {/* Cover image */}
        <div className="relative group">
          <img
            src={coverImage || "https://images.unsplash.com/photo-1469854523086-cc02fe5d6800?w=400"}
            alt="Cover"
            className="h-40 w-full rounded-xl object-cover bg-muted"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition rounded-xl">
            <button
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-black hover:bg-white transition"
            >
              <ImagePlus className="h-4 w-4" /> Change cover
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="input" placeholder="Plan title" maxLength={100} />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input min-h-[80px] resize-none" placeholder="Describe your plan..." maxLength={2000} />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Destination</label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input type="text" value={destination} onChange={(e) => setDestination(e.target.value)} className="input pl-10" placeholder="Where to?" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Start date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">End date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Max travelers</label>
              <input type="number" value={maxParticipants} onChange={(e) => setMaxParticipants(Number(e.target.value))} className="input" min={2} max={50} />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Budget</label>
              <div className="flex gap-2">
                <input type="number" value={budget} onChange={(e) => setBudget(Number(e.target.value))} className="input flex-1" min={0} />
                <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="input w-20">
                  <option value="USD">$</option>
                  <option value="EUR">€</option>
                  <option value="INR">₹</option>
                  <option value="GBP">£</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-full border border-border py-2.5 text-sm font-semibold transition hover:bg-muted">
            Cancel
          </button>
          <button onClick={handleSave} disabled={loading} className="flex-1 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin inline mr-1" /> Saving...</> : "Save changes"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Stat({ icon: Icon, label }: { icon: typeof Calendar; label: string }) {
  return <span className="inline-flex items-center gap-1.5 text-foreground/80"><Icon className="h-4 w-4 text-primary" />{label}</span>;
}
function fmt(d: string) { return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); }
