import { motion } from "framer-motion";
import { Message } from "@/lib/types";
import { NovaAvatar } from "./NovaAvatar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface ChatMessageProps {
  message: Message;
  isLast?: boolean;
}

export function ChatMessage({ message, isLast }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, transform: "translateY(6px)" }}
      animate={{ opacity: 1, transform: "translateY(0)" }}
      transition={{ duration: 0.16, ease: "easeOut" }}
      style={{ willChange: "opacity, transform" }}
      className={cn(
        "flex gap-3 max-w-3xl mx-auto w-full px-4",
        isUser ? "justify-end" : "justify-start",
      )}
      data-testid={`message-${message.id}`}
    >
      {!isUser && (
        <div className="flex-shrink-0 mt-1">
          <NovaAvatar size="sm" animated={message.isStreaming} />
        </div>
      )}

      <div
        className={cn(
          "flex flex-col gap-1 max-w-[75%]",
          isUser ? "items-end" : "items-start",
        )}
      >
        <div
          className={cn(
            "px-4 py-3 rounded-2xl text-sm leading-relaxed",
            isUser
              ? "bg-gradient-to-br from-purple-600 to-violet-500 text-white rounded-br-sm shadow-lg shadow-purple-500/20"
              : "bg-card/80 backdrop-blur-sm border border-purple-500/20 text-foreground rounded-bl-sm shadow-lg shadow-purple-500/5",
            message.isStreaming && !isUser && "border-purple-500/40",
          )}
          style={
            !isUser
              ? {
                  boxShadow:
                    "0 0 20px rgba(168, 85, 247, 0.08), 0 4px 12px rgba(0,0,0,0.15)",
                }
              : undefined
          }
        >
          {message.content}
          {message.isStreaming && (
            <motion.span
              className="inline-block ml-1 text-purple-400"
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              ▋
            </motion.span>
          )}
        </div>

        <span className="text-[10px] text-muted-foreground/60 px-1">
          {format(new Date(message.timestamp), "h:mm a")}
        </span>
      </div>

      {isUser && <div className="w-8 flex-shrink-0" />}
    </motion.div>
  );
}

export function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
      style={{ willChange: "opacity" }}
      className="flex gap-3 max-w-3xl mx-auto w-full px-4 min-h-[52px]"
    >
      <div className="flex-shrink-0 mt-1">
        <NovaAvatar size="sm" animated />
      </div>
      <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-card border border-border/50">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-purple-400/60"
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
