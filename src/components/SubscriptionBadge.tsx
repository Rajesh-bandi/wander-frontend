import { Sparkles } from "lucide-react";
export function SubscriptionBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground">
      <Sparkles className="h-3 w-3" /> Premium
    </span>
  );
}
