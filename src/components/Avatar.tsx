import { cn } from "@/lib/utils";

type Props = { src: string; alt: string; size?: number; ring?: boolean; className?: string };

export function Avatar({ src, alt, size = 40, ring, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 overflow-hidden rounded-full bg-muted",
        ring && "ring-2 ring-primary/60 ring-offset-2 ring-offset-background",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <img src={src} alt={alt} className="h-full w-full object-cover" loading="lazy" />
    </span>
  );
}
