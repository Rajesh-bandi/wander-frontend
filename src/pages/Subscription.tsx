import { useStore } from "@/lib/store";
import { Check, Sparkles, X } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TIERS = [
  { name: "Free", price: "$0", per: "forever", features: ["Browse the feed", "View travel guides", "Read group chats you've joined"], cta: "Current plan", highlight: false },
  { name: "Premium Monthly", price: "$9", per: "per month", features: ["Create & join unlimited plans", "Unlimited private chats", "Premium travel guides", "Priority support", "No daily post limits"], cta: "Subscribe", highlight: true },
  { name: "Premium Yearly", price: "$72", per: "per year — save 33%", features: ["Everything in Premium", "Two months free", "Early access to new features", "Premium travel insurance discount"], cta: "Subscribe", highlight: false },
];

const COMPARE = [
  { feature: "Browse home feed", free: true, premium: true },
  { feature: "View travel guides", free: true, premium: true },
  { feature: "Create travel plans", free: false, premium: true },
  { feature: "Join travel plans", free: false, premium: true },
  { feature: "Send private chat requests", free: false, premium: true },
  { feature: "Unlimited posts per day", free: false, premium: true },
  { feature: "Priority customer support", free: false, premium: true },
];

export default function Subscription() {
  const { isPremium, setIsPremium } = useStore();

  return (
    <div className="space-y-12">
      <header className="space-y-3 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent-foreground">
          <Sparkles className="h-3.5 w-3.5" /> Wander Premium
        </span>
        <h1 className="font-serif text-5xl">Travel further, together.</h1>
        <p className="mx-auto max-w-2xl text-muted-foreground">Unlock the full Wander experience — create unlimited plans, message any traveler, and access premium guides written by locals.</p>
        <div className="flex justify-center">
          <button onClick={() => { setIsPremium(!isPremium); toast.success(isPremium ? "Premium disabled" : "Premium activated", { description: "Locked features are now " + (isPremium ? "locked again." : "unlocked.") }); }}
            className="mt-2 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold hover:bg-muted">
            <Sparkles className="h-3.5 w-3.5 text-accent" /> {isPremium ? "Mock unsubscribe (demo)" : "Mock subscribe (demo)"}
          </button>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-3">
        {TIERS.map((t, i) => (
          <motion.div key={t.name}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className={cn(
              "relative flex flex-col gap-4 rounded-3xl border p-6 shadow-sm",
              t.highlight ? "border-primary bg-gradient-to-br from-primary/10 via-card to-accent/10" : "border-border bg-card",
            )}>
            {t.highlight && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">Most popular</span>}
            <div>
              <h3 className="font-serif text-2xl">{t.name}</h3>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-serif text-4xl">{t.price}</span>
                <span className="text-xs text-muted-foreground">{t.per}</span>
              </div>
            </div>
            <ul className="flex-1 space-y-2 text-sm">
              {t.features.map((f) => (
                <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-primary" />{f}</li>
              ))}
            </ul>
            <button
              onClick={() => { if (t.name !== "Free") { setIsPremium(true); toast.success("Welcome to Premium"); } }}
              disabled={t.name === "Free"}
              className={cn(
                "rounded-full py-2.5 text-sm font-semibold transition",
                t.highlight ? "bg-primary text-primary-foreground hover:opacity-90" : "border border-border hover:bg-muted",
                t.name === "Free" && "cursor-not-allowed opacity-60",
              )}>
              {t.name === "Free" && !isPremium ? "Current plan" : t.cta}
            </button>
          </motion.div>
        ))}
      </div>

      <section className="rounded-3xl border border-border bg-card p-6">
        <h2 className="mb-4 font-serif text-2xl">Compare features</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-3 font-medium">Feature</th>
                <th className="py-3 text-center font-medium">Free</th>
                <th className="py-3 text-center font-medium">Premium</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map((row) => (
                <tr key={row.feature} className="border-b border-border/60 last:border-0">
                  <td className="py-3 pr-4">{row.feature}</td>
                  <td className="py-3 text-center">{row.free ? <Check className="mx-auto h-4 w-4 text-primary" /> : <X className="mx-auto h-4 w-4 text-muted-foreground" />}</td>
                  <td className="py-3 text-center">{row.premium ? <Check className="mx-auto h-4 w-4 text-primary" /> : <X className="mx-auto h-4 w-4 text-muted-foreground" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
