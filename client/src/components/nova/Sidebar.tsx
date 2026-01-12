import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, Link } from 'wouter';
import {
  MessageSquare,
  Layers,
  Brain,
  Settings,
  Shield,
  Plus,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';
import { NovaAvatar } from './NovaAvatar';
import { Conversation, NovaVersion } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SidebarProps {
  conversations: Conversation[];
  versions: NovaVersion[];
  currentConversationId: string | null;
  onNewConversation: () => void;
  onSelectConversation: (id: string) => void;
}

const navItems = [
  { path: '/', icon: MessageSquare, label: 'Chat' },
  { path: '/versions', icon: Layers, label: 'Nova Versions' },
  { path: '/memory', icon: Brain, label: 'Memory' },
  { path: '/boundaries', icon: Shield, label: 'Boundaries' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar({
  conversations,
  versions,
  currentConversationId,
  onNewConversation,
  onSelectConversation,
}: SidebarProps) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const getVersionName = (versionId: string) => {
    return versions.find(v => v.id === versionId)?.name || 'Unknown';
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b border-border/30">
        <NovaAvatar size="md" />
        <div>
          <h1 className="font-display font-bold text-lg text-foreground">Nova</h1>
          <p className="text-xs text-muted-foreground">Companion</p>
        </div>
      </div>

      <nav className="p-2 space-y-1">
        {navItems.map(({ path, icon: Icon, label }) => (
          <Link key={path} href={path}>
            <motion.div
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors',
                location === path
                  ? 'bg-purple-500/10 text-purple-400'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              )}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setMobileOpen(false)}
              data-testid={`nav-${label.toLowerCase().replace(' ', '-')}`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{label}</span>
              {location === path && (
                <ChevronRight className="w-4 h-4 ml-auto" />
              )}
            </motion.div>
          </Link>
        ))}
      </nav>

      {location === '/' && (
        <>
          <div className="px-4 py-3 border-t border-border/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Conversations
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-purple-400"
                onClick={onNewConversation}
                data-testid="button-new-conversation"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1 px-2">
            <div className="space-y-1 pb-4">
              {conversations.length === 0 ? (
                <p className="text-xs text-muted-foreground/60 text-center py-4 px-2">
                  No conversations yet. Start chatting with Nova!
                </p>
              ) : (
                conversations.map((conv) => (
                  <motion.button
                    key={conv.id}
                    onClick={() => { onSelectConversation(conv.id); setMobileOpen(false); }}
                    className={cn(
                      'w-full text-left px-3 py-2.5 rounded-xl transition-colors',
                      conv.id === currentConversationId
                        ? 'bg-muted/80 text-foreground'
                        : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                    )}
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.98 }}
                    data-testid={`conversation-${conv.id}`}
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="text-sm font-medium truncate flex-1">
                        {conv.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 ml-5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400">
                        {getVersionName(conv.versionId)}
                      </span>
                      <span className="text-[10px] text-muted-foreground/60">
                        {format(new Date(conv.updatedAt), 'MMM d')}
                      </span>
                    </div>
                  </motion.button>
                ))
              )}
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-card/80 backdrop-blur border border-border/50"
        data-testid="button-mobile-menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      <aside className="hidden lg:flex w-64 flex-col bg-sidebar border-r border-sidebar-border">
        <SidebarContent />
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-72 bg-sidebar border-r border-sidebar-border z-50"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-lg hover:bg-muted/50"
              >
                <X className="w-5 h-5" />
              </button>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
