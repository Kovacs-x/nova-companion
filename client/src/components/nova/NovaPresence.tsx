import { motion } from "framer-motion";
import { Sparkles, Heart, Brain, Eye, Flame } from "lucide-react";
import { NovaAvatar } from "./NovaAvatar";
import { NovaMood, NovaVersion } from "@/lib/types";
import { cn } from "@/lib/utils";

interface NovaPresenceProps {
  mood: NovaMood;
  currentVersion: NovaVersion | null;
  className?: string;
}

const moodIcons = {
  calm: Sparkles,
  curious: Eye,
  thoughtful: Brain,
  warm: Heart,
  focused: Flame,
};

const moodLabels = {
  calm: "Calm & Present",
  curious: "Curious",
  thoughtful: "Thoughtful",
  warm: "Warm",
  focused: "Focused",
};

export function NovaPresence({ mood, currentVersion, className }: NovaPresenceProps) {
  const MoodIcon = moodIcons[mood.emotion];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "flex flex-col gap-4 p-5 rounded-2xl",
        "bg-card/50 backdrop-blur-xl border border-border/50",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <NovaAvatar size="lg" />
        <div className="flex-1">
          <h3 className="font-display font-semibold text-foreground">Nova</h3>
          {currentVersion && (
            <span className="text-xs text-muted-foreground">{currentVersion.name}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/30">
        <MoodIcon className="w-4 h-4 text-purple-400" />
        <span className="text-sm text-foreground/80">{moodLabels[mood.emotion]}</span>
        <div className="flex-1" />
        <div className="flex gap-0.5">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className={cn(
                "w-1 rounded-full",
                i < Math.ceil(mood.intensity / 20) ? "bg-purple-400" : "bg-muted",
              )}
              initial={{ height: 8 }}
              animate={{
                height:
                  8 +
                  (i < Math.ceil(mood.intensity / 20)
                    ? Math.sin(Date.now() / 500 + i) * 4
                    : 0),
              }}
              transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Last Reflection
        </span>
        <p className="text-sm text-foreground/70 italic leading-relaxed">
          "{mood.lastReflection}"
        </p>
      </div>

      {currentVersion && (
        <div className="pt-2 border-t border-border/30">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-muted-foreground">Active</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
