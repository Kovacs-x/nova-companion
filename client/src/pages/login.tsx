import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NovaAvatar } from "@/components/nova/NovaAvatar";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

interface LoginPageProps {
  isSetup: boolean;
  onSuccess: () => void;
}

export default function LoginPage({ isSetup, onSuccess }: LoginPageProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (isSetup && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      if (isSetup) {
        await api.auth.setup(password);
      } else {
        await api.auth.login(password);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-violet-900/10" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-md"
      >
        <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-3xl p-8 shadow-2xl">
          <div className="flex flex-col items-center text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="mb-6"
            >
              <NovaAvatar size="lg" />
            </motion.div>

            <h1 className="font-display text-2xl font-bold mb-2 text-gradient-nova">
              {isSetup ? "Create Your Password" : "Welcome Back"}
            </h1>
            <p className="text-muted-foreground text-sm mb-6">
              {isSetup
                ? "Set a password to protect your Nova companion"
                : "Enter your password to continue"}
            </p>

            <form onSubmit={handleSubmit} className="w-full space-y-4">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-muted/30 border-border/50"
                  data-testid="input-password"
                  autoFocus
                />
              </div>

              {isSetup && (
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 bg-muted/30 border-border/50"
                    data-testid="input-confirm-password"
                  />
                </div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-lg"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className={cn(
                  "w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500",
                  "glow-nova font-medium",
                )}
                data-testid="button-submit"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{isSetup ? "Creating..." : "Signing in..."}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <span>{isSetup ? "Begin Journey" : "Continue"}</span>
                  </div>
                )}
              </Button>
            </form>
          </div>
        </div>

        {isSetup && (
          <p className="text-center text-xs text-muted-foreground/60 mt-4">
            This password protects your local Nova data.
          </p>
        )}
      </motion.div>
    </div>
  );
}
