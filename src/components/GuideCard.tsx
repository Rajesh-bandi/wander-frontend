import { motion, AnimatePresence } from "framer-motion";
import { CalendarRange, Cloud, MapPin, Wallet, ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Guide } from "@/data/types";

export function GuideCard({ guide }: { guide: Guide }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div whileHover={{ y: -3 }} className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="relative aspect-[5/3] overflow-hidden">
        <img src={guide.image} alt={guide.place} loading="lazy" className="h-full w-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4">
          <div className="flex items-center gap-1 text-xs text-white/80"><MapPin className="h-3 w-3" />{guide.country} · {guide.state}</div>
          <h3 className="font-serif text-xl text-white">{guide.place}</h3>
        </div>
        <span className="absolute right-3 top-3 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">{guide.season}</span>
      </div>
      <div className="space-y-3 p-4">
        <div className="grid grid-cols-3 gap-2 text-xs">
          <Stat icon={CalendarRange} label="Best time" value={guide.bestTimeToVisit} />
          <Stat icon={Cloud} label="Weather" value={guide.weather} />
          <Stat icon={Wallet} label="Cost" value={guide.costEstimate} />
        </div>
        <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between rounded-xl bg-muted px-3 py-2 text-xs font-semibold">
          {open ? "Hide tips" : "Show local tips"}
          <ChevronDown className={cn("h-4 w-4 transition", open && "rotate-180")} />
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.ul
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-1.5 overflow-hidden text-sm"
            >
              {guide.tips.map((t, i) => (
                <li key={i} className="flex gap-2"><span className="text-primary">·</span>{t}</li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/60 p-2.5">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground"><Icon className="h-3 w-3" />{label}</div>
      <div className="mt-1 text-xs font-semibold leading-tight">{value}</div>
    </div>
  );
}
