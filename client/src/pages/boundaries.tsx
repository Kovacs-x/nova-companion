import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  Shield,
  Plus,
  Trash2,
  ArrowLeft,
  X,
  Check,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
} from "lucide-react";
import { Sidebar } from "@/components/nova/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Boundary, Conversation, NovaVersion } from "@/lib/types";
import { cn } from "@/lib/utils";

interface BoundariesPageProps {
  boundaries: Boundary[];
  conversations: Conversation[];
  versions: NovaVersion[];
  onAddBoundary: (boundary: Omit<Boundary, "id">) => void;
  onUpdateBoundary: (id: string, updates: Partial<Boundary>) => void;
  onDeleteBoundary: (id: string) => void;
  onReset: () => void;
}

export default function BoundariesPage({
  boundaries,
  conversations,
  versions,
  onAddBoundary,
  onUpdateBoundary,
  onDeleteBoundary,
  onReset,
}: BoundariesPageProps) {
  const [, navigate] = useLocation();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [newBoundary, setNewBoundary] = useState({
    type: "do" as Boundary["type"],
    content: "",
  });

  const doRules = boundaries.filter((b) => b.type === "do");
  const dontRules = boundaries.filter((b) => b.type === "dont");

  const handleAdd = () => {
    if (newBoundary.content.trim()) {
      onAddBoundary({ ...newBoundary, enabled: true });
      setNewBoundary({ type: "do", content: "" });
      setShowAddDialog(false);
    }
  };

  const handleReset = () => {
    onReset();
    setShowResetDialog(false);
  };

  const BoundaryCard = ({ boundary }: { boundary: Boundary }) => (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "flex items-start gap-3 p-4 rounded-xl border transition-all",
        boundary.enabled
          ? boundary.type === "do"
            ? "bg-green-500/5 border-green-500/20"
            : "bg-red-500/5 border-red-500/20"
          : "bg-muted/30 border-border/50 opacity-60",
      )}
      data-testid={`boundary-${boundary.id}`}
    >
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
          boundary.type === "do" ? "bg-green-500/20" : "bg-red-500/20",
        )}
      >
        {boundary.type === "do" ? (
          <ThumbsUp className="w-4 h-4 text-green-500" />
        ) : (
          <ThumbsDown className="w-4 h-4 text-red-500" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm leading-relaxed",
            boundary.enabled ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {boundary.content}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={boundary.enabled}
          onCheckedChange={(checked) =>
            onUpdateBoundary(boundary.id, { enabled: checked })
          }
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive/60 hover:text-destructive"
          onClick={() => onDeleteBoundary(boundary.id)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        conversations={conversations}
        versions={versions}
        currentConversationId={null}
        onNewConversation={() => navigate("/")}
        onSelectConversation={() => navigate("/")}
      />

      <main className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center gap-4 px-6 py-4 border-b border-border/30 bg-card/30 backdrop-blur-sm">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="lg:hidden"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Shield className="w-6 h-6 text-purple-400 ml-8 lg:ml-0" />
          <div className="flex-1">
            <h1 className="font-display text-xl font-bold">Boundaries</h1>
            <p className="text-sm text-muted-foreground">
              Define what Nova should and shouldn't do
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowResetDialog(true)}
            className="text-destructive hover:bg-destructive/10"
            data-testid="button-reset-all"
          >
            <RotateCcw className="w-4 h-4 mr-1" /> Reset All
          </Button>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="bg-purple-600 hover:bg-purple-500"
            data-testid="button-add-boundary"
          >
            <Plus className="w-4 h-4 mr-1" /> Add Rule
          </Button>
        </header>

        <ScrollArea className="flex-1 p-6">
          <div className="max-w-3xl mx-auto space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3"
            >
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-sm text-amber-200 mb-1">
                  Important Disclaimer
                </h4>
                <p className="text-sm text-amber-200/70 leading-relaxed">
                  Nova Companion is not a substitute for professional mental health care,
                  therapy, or medical advice. If you're experiencing a crisis, please
                  contact a mental health professional or emergency services.
                </p>
              </div>
            </motion.div>

            <div>
              <div className="flex items-center gap-2 mb-4">
                <ThumbsUp className="w-5 h-5 text-green-500" />
                <h2 className="font-display text-lg font-semibold">Do Rules</h2>
                <span className="text-xs text-muted-foreground">({doRules.length})</span>
              </div>
              <div className="space-y-3">
                {doRules.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No "do" rules defined yet.
                  </p>
                ) : (
                  doRules.map((boundary) => (
                    <BoundaryCard key={boundary.id} boundary={boundary} />
                  ))
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-4">
                <ThumbsDown className="w-5 h-5 text-red-500" />
                <h2 className="font-display text-lg font-semibold">Don't Rules</h2>
                <span className="text-xs text-muted-foreground">
                  ({dontRules.length})
                </span>
              </div>
              <div className="space-y-3">
                {dontRules.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No "don't" rules defined yet.
                  </p>
                ) : (
                  dontRules.map((boundary) => (
                    <BoundaryCard key={boundary.id} boundary={boundary} />
                  ))
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </main>

      <AnimatePresence>
        {showAddDialog && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddDialog(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md p-6 bg-card border border-border rounded-2xl shadow-2xl z-50"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg font-semibold">Add Boundary Rule</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowAddDialog(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant={newBoundary.type === "do" ? "default" : "outline"}
                    onClick={() => setNewBoundary({ ...newBoundary, type: "do" })}
                    className={cn(
                      "flex-1",
                      newBoundary.type === "do" && "bg-green-600 hover:bg-green-500",
                    )}
                  >
                    <ThumbsUp className="w-4 h-4 mr-1" /> Do
                  </Button>
                  <Button
                    variant={newBoundary.type === "dont" ? "default" : "outline"}
                    onClick={() => setNewBoundary({ ...newBoundary, type: "dont" })}
                    className={cn(
                      "flex-1",
                      newBoundary.type === "dont" && "bg-red-600 hover:bg-red-500",
                    )}
                  >
                    <ThumbsDown className="w-4 h-4 mr-1" /> Don't
                  </Button>
                </div>

                <Input
                  value={newBoundary.content}
                  onChange={(e) =>
                    setNewBoundary({ ...newBoundary, content: e.target.value })
                  }
                  placeholder={
                    newBoundary.type === "do"
                      ? "e.g., Always be honest and transparent"
                      : "e.g., Never give medical advice"
                  }
                  data-testid="input-boundary-content"
                />

                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setShowAddDialog(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAdd}
                    disabled={!newBoundary.content.trim()}
                    className="bg-purple-600 hover:bg-purple-500"
                    data-testid="button-save-boundary"
                  >
                    <Check className="w-4 h-4 mr-1" /> Add Rule
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}

        {showResetDialog && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowResetDialog(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md p-6 bg-card border border-border rounded-2xl shadow-2xl z-50"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold">
                    Reset Everything?
                  </h3>
                  <p className="text-sm text-muted-foreground">This cannot be undone</p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-6">
                This will delete all your conversations, memories, Nova versions, and
                settings. Nova will return to its initial state.
              </p>

              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowResetDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleReset}
                  variant="destructive"
                  data-testid="button-confirm-reset"
                >
                  <RotateCcw className="w-4 h-4 mr-1" /> Reset Everything
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
