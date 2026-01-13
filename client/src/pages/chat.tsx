import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from '@/components/nova/Sidebar';
import { NovaPresence } from '@/components/nova/NovaPresence';
import { ChatMessage, TypingIndicator } from '@/components/nova/ChatMessage';
import { Composer } from '@/components/nova/Composer';
import { NovaAvatar } from '@/components/nova/NovaAvatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Conversation, NovaVersion, NovaMood, NovaSettings } from '@/lib/types';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface ChatPageProps {
  conversations: Conversation[];
  versions: NovaVersion[];
  currentMood: NovaMood;
  settings: NovaSettings;
  onNewConversation: (versionId: string) => Promise<Conversation>;
  onSelectConversation: (id: string) => void;
  onSendMessage: (conversationId: string, content: string, role?: 'user' | 'assistant') => Promise<void>;
  onExport: () => void;
  currentConversationId: string | null;
  setCurrentConversationId: (id: string | null) => void;
}

export default function ChatPage({
  conversations,
  versions,
  currentMood,
  settings,
  onNewConversation,
  onSelectConversation,
  onSendMessage,
  onExport,
  currentConversationId,
  setCurrentConversationId,
}: ChatPageProps) {
  const [isTyping, setIsTyping] = useState(false);
  const [showVersionPicker, setShowVersionPicker] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentConversation = conversations.find(c => c.id === currentConversationId);
  const currentVersion = currentConversation
    ? versions.find(v => v.id === currentConversation.versionId)
    : versions[0];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentConversation?.messages]);

  const handleNewConversation = async () => {
    if (versions.length === 1) {
      await onNewConversation(versions[0].id);
    } else {
      setShowVersionPicker(true);
    }
  };

  const handleSelectVersion = async (versionId: string) => {
    await onNewConversation(versionId);
    setShowVersionPicker(false);
  };

  const handleSend = async (content: string) => {
    let targetConvId = currentConversationId;
    
    if (!targetConvId) {
      try {
        const conv = await onNewConversation(versions[0].id);
        targetConvId = conv.id;
      } catch (error) {
        console.error('Failed to create conversation:', error);
        return;
      }
    }

    const conv = conversations.find(c => c.id === targetConvId);
    const version = versions.find(v => v.id === (conv?.versionId || versions[0].id));
    const currentMessages = conv?.messages || [];
    
    await onSendMessage(targetConvId, content, 'user');
    
    setIsTyping(true);
    
    try {
      const response = await api.chat.complete(
        [...currentMessages, { role: 'user', content }],
        settings.modelName,
        version?.systemPrompt || ''
      );
      
      setIsTyping(false);
      
      if (response.mock) {
        setIsDemoMode(true);
      }
      
      const assistantMessage = response.choices?.[0]?.message?.content || 
        "I'm here with you. What's on your mind?";
      
      await onSendMessage(targetConvId, assistantMessage, 'assistant');
    } catch (error) {
      setIsTyping(false);
      console.error('Chat error:', error);
      await onSendMessage(targetConvId, "I apologize, but I encountered an issue. Let's try again.", 'assistant');
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        conversations={conversations}
        versions={versions}
        currentConversationId={currentConversationId}
        onNewConversation={handleNewConversation}
        onSelectConversation={setCurrentConversationId}
      />

      <main className="flex-1 flex flex-col min-w-0 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/5 via-transparent to-transparent pointer-events-none" />

        {!currentConversation ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-md"
            >
              <NovaAvatar size="lg" className="mx-auto mb-6" />
              <h2 className="font-display text-2xl font-bold mb-3 text-gradient-nova">
                Hello, I'm Nova
              </h2>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Your companion is ready. Start a conversation and let's explore together.
              </p>
              <Composer
                onSend={handleSend}
                onExport={onExport}
                placeholder="What's on your mind?"
                className="max-w-md mx-auto"
              />
            </motion.div>
          </div>
        ) : (
          <>
            <header className="flex flex-col border-b border-border/30 bg-card/30 backdrop-blur-sm z-10">
              {isDemoMode && (
                <div className="px-6 py-2 bg-purple-500/10 border-b border-purple-500/20">
                  <p className="text-xs text-purple-300 text-center">
                    <span className="font-medium">Demo mode:</span> Connect your API key in Settings to use real AI responses
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3 ml-12 lg:ml-0">
                  <NovaAvatar size="sm" />
                  <div>
                    <h2 className="font-medium text-sm">Nova — Companion</h2>
                    <span className="text-xs text-muted-foreground/60">Present and listening</span>
                  </div>
                </div>
              </div>
            </header>

            <div className="flex-1 flex min-h-0">
              <ScrollArea ref={scrollRef} className="flex-1 px-4 py-6">
                <div className="space-y-4 pb-4">
                  {currentConversation.messages.map((message, i) => (
                    <ChatMessage
                      key={message.id}
                      message={message}
                      isLast={i === currentConversation.messages.length - 1}
                    />
                  ))}
                  <AnimatePresence>
                    {isTyping && <TypingIndicator />}
                  </AnimatePresence>
                </div>
              </ScrollArea>

              <aside className="hidden xl:block w-72 p-4 border-l border-border/30">
                <NovaPresence
                  mood={currentMood}
                  currentVersion={currentVersion || null}
                />
              </aside>
            </div>

            <div className="p-4 bg-gradient-to-t from-background via-background to-transparent">
              <Composer
                onSend={handleSend}
                onSwitchVersion={() => setShowVersionPicker(true)}
                onExport={onExport}
                className="max-w-3xl mx-auto"
              />
            </div>
          </>
        )}
      </main>

      <AnimatePresence>
        {showVersionPicker && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowVersionPicker(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md p-6 bg-card border border-border rounded-2xl shadow-2xl z-50"
            >
              <h3 className="font-display text-lg font-semibold mb-4">Choose Nova Version</h3>
              <div className="space-y-2">
                {versions.map(version => (
                  <button
                    key={version.id}
                    onClick={() => handleSelectVersion(version.id)}
                    className={cn(
                      'w-full text-left p-4 rounded-xl border transition-colors',
                      'hover:bg-purple-500/10 hover:border-purple-500/30',
                      'border-border/50 bg-muted/30'
                    )}
                    data-testid={`version-picker-${version.id}`}
                  >
                    <div className="font-medium text-sm">{version.name}</div>
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {version.description}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
