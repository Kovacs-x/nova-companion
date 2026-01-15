import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Database,
  Clock,
  AlertCircle,
  CheckCircle,
  Server,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sidebar } from "@/components/nova/Sidebar";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface DiagnosticsData {
  syncStatus: {
    schemaVersion: number;
    lastSyncTime: string | null;
    syncCount: number;
    lastError: string | null;
  };
  stats: {
    versionsCount: number;
    conversationsCount: number;
    memoriesCount: number;
  };
  hasApiKey: boolean;
}

interface DiagnosticsPageProps {
  conversations: any[];
  versions: any[];
}

export default function DiagnosticsPage({
  conversations,
  versions,
}: DiagnosticsPageProps) {
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDiagnostics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.diagnostics.get();
      setDiagnostics(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch diagnostics");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        conversations={conversations}
        versions={versions}
        currentConversationId={null}
        onSelectConversation={() => {}}
        onNewConversation={() => {}}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border/50 flex items-center justify-between px-6 bg-card/30 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-purple-400" />
              <h1 className="font-display text-lg font-semibold">Diagnostics</h1>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDiagnostics}
            disabled={isLoading}
            data-testid="button-refresh"
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-destructive p-4 bg-destructive/10 rounded-lg mb-6"
            >
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </motion.div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="bg-card/50 border-border/50 animate-pulse">
                  <CardHeader className="pb-2">
                    <div className="h-4 w-24 bg-muted rounded" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-8 w-16 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            diagnostics && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card className="bg-card/50 border-border/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                        <Database className="w-4 h-4" />
                        Schema Version
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-gradient-nova">
                        {diagnostics.syncStatus.schemaVersion}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-card/50 border-border/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        Last Sync
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-lg font-medium">
                        {diagnostics.syncStatus.lastSyncTime
                          ? new Date(diagnostics.syncStatus.lastSyncTime).toLocaleString()
                          : "Never"}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-card/50 border-border/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                        <RefreshCw className="w-4 h-4" />
                        Sync Count
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">
                        {diagnostics.syncStatus.syncCount}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-card/50 border-border/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                        <Server className="w-4 h-4" />
                        API Key Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Badge
                        variant={diagnostics.hasApiKey ? "default" : "secondary"}
                        className={cn(
                          diagnostics.hasApiKey &&
                            "bg-green-500/20 text-green-400 border-green-500/30",
                        )}
                      >
                        {diagnostics.hasApiKey ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" /> Connected
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3 mr-1" /> Not Set
                          </>
                        )}
                      </Badge>
                    </CardContent>
                  </Card>

                  <Card className="bg-card/50 border-border/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Total Versions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">
                        {diagnostics.stats.versionsCount}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-card/50 border-border/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Total Conversations
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">
                        {diagnostics.stats.conversationsCount}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-card/50 border-border/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Total Memories
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">
                        {diagnostics.stats.memoriesCount}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {diagnostics.syncStatus.lastError && (
                  <Card className="bg-destructive/10 border-destructive/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2 text-destructive">
                        <AlertCircle className="w-4 h-4" />
                        Last Error
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-sm text-destructive/80 whitespace-pre-wrap font-mono">
                        {diagnostics.syncStatus.lastError}
                      </pre>
                    </CardContent>
                  </Card>
                )}
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
}
