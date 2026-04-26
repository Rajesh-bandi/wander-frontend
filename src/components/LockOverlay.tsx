import { Lock } from "lucide-react";
import { Link } from "wouter";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function LockOverlay({ children, message = "Premium feature", className }: { children?: React.ReactNode; message?: string; className?: string }) {
  const { isPremium } = useStore();
  if (isPremium) return <>{children}</>;
  return (
    <div className={cn("relative", className)}>
      <div className="pointer-events-none select-none opacity-30 blur-[1px]">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-background/40 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-6 py-5 text-center shadow-lg">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent/20 text-accent-foreground">
            <Lock className="h-5 w-5" />
          </span>
          <p className="text-sm font-medium">{message}</p>
          <Link href="/subscription" className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90">Upgrade to Premium</Link>
        </div>
      </div>
    </div>
  );
}

export function PremiumGate({ children, message }: { children: (locked: boolean) => React.ReactNode; message?: string }) {
  const { isPremium } = useStore();
  if (isPremium) return <>{children(false)}</>;
  return (
    <div className="relative">
      <div className="pointer-events-none">{children(true)}</div>
      <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-background/60 backdrop-blur-sm">
        <Link href="/subscription" className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow">
          <Lock className="h-3.5 w-3.5" />
          {message ?? "Unlock with Premium"}
        </Link>
      </div>
    </div>
  );
}
