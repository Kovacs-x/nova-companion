import { useState, useCallback } from 'react';
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useNovaState } from "@/hooks/useNovaState";
import Onboarding from "@/pages/onboarding";
import ChatPage from "@/pages/chat";
import VersionsPage from "@/pages/versions";
import MemoryPage from "@/pages/memory";
import BoundariesPage from "@/pages/boundaries";
import SettingsPage from "@/pages/settings";
import NotFound from "@/pages/not-found";

function NovaApp() {
  const nova = useNovaState();
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  const handleNewConversation = useCallback((versionId: string) => {
    return nova.createConversation(versionId, 'New Conversation');
  }, [nova]);

  const handleSendMessage = useCallback((conversationId: string, content: string) => {
    const conv = nova.state.conversations.find(c => c.id === conversationId);
    if (!conv) return;

    const isUserMessage = conv.messages.length % 2 === 0;
    nova.addMessage(conversationId, {
      role: isUserMessage ? 'user' : 'assistant',
      content,
    });

    if (conv.messages.length === 0) {
      const title = content.slice(0, 40) + (content.length > 40 ? '...' : '');
      nova.updateConversation(conversationId, { title });
    }
  }, [nova]);

  if (!nova.state.onboardingComplete) {
    return (
      <Onboarding
        onComplete={nova.completeOnboarding}
        onUpdateSettings={nova.updateSettings}
      />
    );
  }

  return (
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
        />
      </Route>
      <Route component={NotFound} />
    </Switch>
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
