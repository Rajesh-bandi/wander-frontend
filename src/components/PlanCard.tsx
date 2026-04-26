import { motion } from "framer-motion";
import { Calendar, Users, MapPin, Wallet, Navigation } from "lucide-react";
import { Link } from "wouter";
import { useStore } from "@/lib/store";
import { Avatar } from "./Avatar";
import { formatBudget } from "@/pages/CreatePlan";
import { formatDistance } from "@/lib/geo";
import type { Plan } from "@/data/types";

function fmt(d: string) {
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function PlanCard({ plan, distanceKm }: { plan: Plan; distanceKm?: number }) {
  const { getUser } = useStore();
  const creator = getUser(plan.creatorId);
  return (
    <Link href={`/plans/${plan.id}`}>
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2 }}
        className="group cursor-pointer overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
      >
        <div className="relative aspect-[5/3] overflow-hidden">
          <img src={plan.coverImage} alt={plan.destination} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" loading="lazy" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-4">
            <div className="flex items-center gap-1 text-xs font-medium text-white/90">
              <MapPin className="h-3 w-3" /> <span>{plan.destination}</span>
            </div>
            <h3 className="mt-1 font-serif text-xl text-white">{plan.title}</h3>
          </div>
          <span className="absolute right-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-xs font-semibold backdrop-blur">
            <Wallet className="-mt-0.5 mr-1 inline h-3 w-3" />{plan.budget > 0 ? formatBudget(plan.budget, plan.currency) : "Flexible"}
          </span>
          {plan.status === "completed" && (
            <span className="absolute left-3 top-3 rounded-full bg-red-500/90 px-2.5 py-1 text-[10px] font-bold uppercase text-white backdrop-blur">Completed</span>
          )}
          {plan.status === "active" && (
            <span className="absolute left-3 top-3 rounded-full bg-emerald-500/90 px-2.5 py-1 text-[10px] font-bold uppercase text-white backdrop-blur">Active</span>
          )}
        </div>
        <div className="space-y-3 p-4">
          <p className="line-clamp-2 text-sm text-muted-foreground">{plan.description}</p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{fmt(plan.startDate)} – {fmt(plan.endDate)}</span>
            <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{plan.participantIds.length}/{plan.maxParticipants}</span>
            {distanceKm != null && (
              <span className="inline-flex items-center gap-1 text-primary font-semibold">
                <Navigation className="h-3 w-3" />{formatDistance(distanceKm)} away
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {creator && <Avatar src={creator.avatar} alt={creator.displayName} size={28} />}
              <span className="text-xs text-muted-foreground">by <span className="font-semibold text-foreground">{creator?.displayName}</span></span>
            </div>
            <span className="rounded-full bg-secondary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-secondary">View</span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
