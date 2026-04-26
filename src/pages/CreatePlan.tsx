import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ImagePlus, MapPin, Sparkles, DollarSign } from "lucide-react";
import { useStore } from "@/lib/store";
import { LockOverlay } from "@/components/LockOverlay";
import { LocationInput } from "@/components/LocationInput";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const FALLBACK = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=80&w=1200";

const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "THB", symbol: "฿", name: "Thai Baht" },
  { code: "MXN", symbol: "MX$", name: "Mexican Peso" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real" },
];

function detectCurrency(): string {
  try {
    const locale = navigator.language || "en-US";
    const parts = new Intl.NumberFormat(locale, { style: "currency", currency: "USD" }).resolvedOptions();
    // Map common locales to currencies
    const localeMap: Record<string, string> = {
      "en-US": "USD", "en-GB": "GBP", "en-AU": "AUD", "en-CA": "CAD",
      "en-IN": "INR", "hi-IN": "INR", "ja-JP": "JPY", "th-TH": "THB",
      "pt-BR": "BRL", "es-MX": "MXN",
    };
    const regionMap: Record<string, string> = {
      US: "USD", GB: "GBP", AU: "AUD", CA: "CAD", IN: "INR",
      JP: "JPY", TH: "THB", BR: "BRL", MX: "MXN",
    };
    if (localeMap[locale]) return localeMap[locale];
    const region = locale.split("-")[1]?.toUpperCase();
    if (region && regionMap[region]) return regionMap[region];
    // Check timezone
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz.startsWith("Asia/Kolkata") || tz.startsWith("Asia/Calcutta")) return "INR";
    if (tz.startsWith("Europe/London")) return "GBP";
    if (tz.startsWith("Asia/Tokyo")) return "JPY";
  } catch {}
  return "USD";
}

export function getCurrencySymbol(code: string) {
  return CURRENCIES.find((c) => c.code === code)?.symbol || code;
}

export function formatBudget(amount: number, currency: string) {
  if (!amount) return "Not set";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${getCurrencySymbol(currency)}${amount.toLocaleString()}`;
  }
}

export default function CreatePlan() {
  const { createPlan, isPremium } = useStore();
  const [, navigate] = useLocation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [description, setDescription] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [maxP, setMaxP] = useState(4);
  const [budget, setBudget] = useState<number>(0);
  const [currency, setCurrency] = useState(() => detectCurrency());
  const [cover, setCover] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const onFile = (f?: File) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setCover(r.result as string);
    r.readAsDataURL(f);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !destination || !start || !end) { toast.error("Please fill in the required fields."); return; }
    const startD = new Date(start);
    const endD = new Date(end);
    if (startD < new Date()) { toast.error("Start date must be in the future."); return; }
    if (endD <= startD) { toast.error("End date must be after start date."); return; }
    if (budget <= 0) { toast.error("Please enter a budget amount."); return; }
    try {
      setLoading(true);
      const plan = await createPlan({
        title, description, destination, startDate: start, endDate: end,
        maxParticipants: maxP, budget, currency, coverImage: cover || FALLBACK,
      });
      toast.success("Plan created", { description: `${plan.title} is live in Explore.` });
      navigate(`/plans/${plan.id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create plan");
    } finally {
      setLoading(false);
    }
  };

  const Form = (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
        <Field label="Title">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" placeholder="Amalfi Coast Roadtrip" />
        </Field>
        <Field label="Destination">
          <LocationInput value={destination} onChange={setDestination} placeholder="Where are you going?" />
        </Field>
        <Field label="Description">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="input" placeholder="Tell potential travelers what to expect..." />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Start date"><input required type="date" value={start} onChange={(e) => setStart(e.target.value)} className="input" /></Field>
          <Field label="End date"><input required type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="input" /></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={`Max participants: ${maxP}`}>
            <input type="range" min={2} max={20} value={maxP} onChange={(e) => setMaxP(Number(e.target.value))} className="w-full accent-primary" />
          </Field>
          <Field label="Budget (per person)">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                  {getCurrencySymbol(currency)}
                </span>
                <input
                  type="number"
                  min={0}
                  value={budget || ""}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  placeholder="0"
                  className="input pl-8"
                />
              </div>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="input w-24 cursor-pointer text-xs font-semibold"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.code}</option>
                ))}
              </select>
            </div>
          </Field>
        </div>
        <button type="submit" disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 active:scale-[0.99] disabled:opacity-50">
          <Sparkles className="h-4 w-4" /> {loading ? "Creating..." : "Create plan"}
        </button>
      </div>

      <div className="space-y-4">
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="relative aspect-[4/3] bg-muted">
            {cover ? <img src={cover} alt="cover" className="h-full w-full object-cover" /> : (
              <button type="button" onClick={() => fileRef.current?.click()} className="grid h-full w-full place-items-center text-center text-sm text-muted-foreground hover:bg-muted/60">
                <span><ImagePlus className="mx-auto mb-2 h-7 w-7" />Click to upload a cover image</span>
              </button>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 p-3">
            <button type="button" onClick={() => fileRef.current?.click()} className="text-xs font-semibold text-primary hover:underline">Choose image</button>
            {cover && <button type="button" onClick={() => setCover("")} className="text-xs text-muted-foreground hover:text-destructive">Remove</button>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-2 font-serif text-lg">Live preview</h3>
          <div className="space-y-1 text-sm">
            <div className="font-semibold">{title || "Your plan title"}</div>
            <div className="text-xs text-muted-foreground">{destination || "Destination"}</div>
            <div className="text-xs text-muted-foreground">{start || "Start"} → {end || "End"}</div>
            <div className="text-xs text-muted-foreground">
              Up to {maxP} travelers · {budget > 0 ? formatBudget(budget, currency) : "No budget set"}
            </div>
          </div>
        </div>
      </div>
    </form>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <h1 className="font-serif text-4xl">Create a plan</h1>
        <p className="text-sm text-muted-foreground">Share where you're heading and find your crew.</p>
      </header>
      {isPremium ? Form : (
        <LockOverlay message="Creating plans is a Premium feature">{Form}</LockOverlay>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
