import { useState, useEffect, useCallback } from 'react';
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useNovaState } from "@/hooks/useNovaState";
import { api, SESSION_EXPIRED_EVENT } from "@/lib/api";
import LoginPage from "@/pages/login";
import Onboarding from "@/pages/onboarding";
import ChatPage from "@/pages/chat";
import VersionsPage from "@/pages/versions";
import MemoryPage from "@/pages/memory";
import BoundariesPage from "@/pages/boundaries";
import SettingsPage from "@/pages/settings";
import DiagnosticsPage from "@/pages/diagnostics";
import NotFound from "@/pages/not-found";

type AuthState = 'loading' | 'setup' | 'login' | 'authenticated';

function SessionExpiredBanner({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-red-500/95 text-white px-4 py-3 text-center shadow-lg backdrop-blur-sm">
      <p className="text-sm font-medium">
        Session expired. Please refresh to continue.
        <button 
          onClick={onRefresh}
          className="ml-3 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-md text-sm font-medium transition-colors"
          data-testid="button-session-refresh"
        >
          Refresh Now
        </button>
      </p>
    </div>
  );
}

function NovaApp() {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [sessionExpired, setSessionExpired] = useState(false);
  const nova = useNovaState();
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [hasAutoSelected, setHasAutoSelected] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  // Listen for session expired events
  useEffect(() => {
    const handleSessionExpired = () => {
      setSessionExpired(true);
    };
    
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, []);

  useEffect(() => {
    if (authState === 'authenticated' && !hasAutoSelected && nova.isReady && nova.state.conversations.length > 0 && !currentConversationId) {
      const latest = nova.state.conversations[0];
      setCurrentConversationId(latest.id);
      setHasAutoSelected(true);
    }
  }, [authState, hasAutoSelected, nova.isReady, nova.state.conversations, currentConversationId]);

  const checkAuth = async () => {
    try {
      const [status, me] = await Promise.all([
        api.auth.status(),
        api.auth.me(),
      ]);

      if (status.needsSetup) {
        setAuthState('setup');
      } else if (me.authenticated) {
        setAuthState('authenticated');
        await nova.loadData();
      } else {
        setAuthState('login');
      }
    } catch (error) {
      setAuthState('setup');
    }
  };

  const handleAuthSuccess = async () => {
    setAuthState('authenticated');
    setHasAutoSelected(false);
    await nova.loadData();
  };

  const handleLogout = async () => {
    try {
      await api.auth.logout();
      setAuthState('login');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  const handleNewConversation = useCallback(async (versionId: string) => {
    const conv = await nova.createConversation(versionId, 'New Conversation');
    setCurrentConversationId(conv.id);
    return conv;
  }, [nova]);

  const handleSendMessage = useCallback(async (conversationId: string, content: string, role: 'user' | 'assistant' = 'user') => {
    await nova.addMessage(conversationId, {
      role,
      content,
    });

    const conv = nova.state.conversations.find(c => c.id === conversationId);
    if (conv && conv.messages.length === 0 && role === 'user') {
      const title = content.slice(0, 40) + (content.length > 40 ? '...' : '');
      await nova.updateConversation(conversationId, { title });
    }
  }, [nova]);

  if (authState === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading Nova...</p>
        </div>
      </div>
    );
  }

  if (authState === 'setup' || authState === 'login') {
    return <LoginPage isSetup={authState === 'setup'} onSuccess={handleAuthSuccess} />;
  }

  if (!nova.state.onboardingComplete) {
    return <Onboarding onComplete={nova.completeOnboarding} />;
  }

  const handleRefresh = () => window.location.reload();

  return (
    <>
      {sessionExpired && <SessionExpiredBanner onRefresh={handleRefresh} />}
      <Switch>
      <Route path="/">
        <ChatPage
          conversations={nova.state.conversations}
          versions={nova.state.versions}
          currentMood={nova.state.currentMood}
          settings={nova.state.settings}
          onNewConversation={handleNewConversation}
          onSelectConversation={setCurrentConversationId}
          onSendMessage={handleSendMessage}
          onExport={nova.exportData}
          currentConversationId={currentConversationId}
          setCurrentConversationId={setCurrentConversationId}
        />
      </Route>
      <Route path="/versions">
        <VersionsPage
          versions={nova.state.versions}
          conversations={nova.state.conversations}
          onCreateVersion={nova.createVersion}
          onUpdateVersion={nova.updateVersion}
          onCloneVersion={nova.cloneVersion}
          onDeleteVersion={nova.deleteVersion}
        />
      </Route>
      <Route path="/memory">
        <MemoryPage
          memories={nova.state.memories}
          conversations={nova.state.conversations}
          versions={nova.state.versions}
          onCreateMemory={nova.createMemory}
          onUpdateMemory={nova.updateMemory}
          onDeleteMemory={nova.deleteMemory}
        />
      </Route>
      <Route path="/boundaries">
        <BoundariesPage
          boundaries={nova.state.settings.boundaries}
          conversations={nova.state.conversations}
          versions={nova.state.versions}
          onAddBoundary={nova.addBoundary}
          onUpdateBoundary={nova.updateBoundary}
          onDeleteBoundary={nova.deleteBoundary}
          onReset={nova.resetState}
        />
      </Route>
      <Route path="/settings">
        <SettingsPage
          settings={nova.state.settings}
          conversations={nova.state.conversations}
          versions={nova.state.versions}
          onUpdateSettings={nova.updateSettings}
          onExport={nova.exportData}
          onImport={nova.importData}
          onLogout={handleLogout}
        />
      </Route>
      <Route path="/diagnostics">
        <DiagnosticsPage
          conversations={nova.state.conversations}
          versions={nova.state.versions}
        />
      </Route>
      <Route component={NotFound} />
    </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <NovaApp />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
