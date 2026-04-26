import { Avatar } from "./Avatar";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Message } from "@/data/types";

export function ChatBubble({ message }: { message: Message }) {
  const { getUser, currentUserId } = useStore();
  const author = getUser(message.authorId);
  const mine = message.authorId === currentUserId;
  return (
    <div className={cn("flex items-end gap-2", mine && "flex-row-reverse")}>
      {!mine && author && <Avatar src={author.avatar} alt={author.displayName} size={28} />}
      <div className="max-w-[75%]">
        {!mine && author && <div className="mb-1 text-[10px] font-semibold text-muted-foreground">{author.displayName}</div>}
        <div className={cn(
          "rounded-2xl px-3.5 py-2 text-sm leading-snug shadow-sm",
          mine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md border border-border bg-card",
        )}>
          {message.text}
        </div>
      </div>
    </div>
  );
}
