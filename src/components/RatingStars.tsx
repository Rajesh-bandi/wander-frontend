import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function RatingStars({ value, size = 14, className }: { value: number; size?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i + 1 <= Math.round(value);
        return (
          <Star
            key={i}
            width={size}
            height={size}
            className={cn(filled ? "fill-accent text-accent" : "text-muted-foreground/40")}
          />
        );
      })}
    </span>
  );
}
