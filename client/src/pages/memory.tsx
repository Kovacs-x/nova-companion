import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import {
  Brain,
  Plus,
  Trash2,
  Tag,
  ArrowLeft,
  X,
  Search,
  Clock,
  Zap,
} from 'lucide-react';
import { Sidebar } from '@/components/nova/Sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Memory, Conversation, NovaVersion } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface MemoryPageProps {
  memories: Memory[];
  conversations: Conversation[];
  versions: NovaVersion[];
  onCreateMemory: (memory: Omit<Memory, 'id' | 'createdAt'>) => Memory;
  onUpdateMemory: (id: string, updates: Partial<Memory>) => void;
  onDeleteMemory: (id: string) => void;
}

const importanceColors = {
  low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export default function MemoryPage({
  memories,
  conversations,
  versions,
  onCreateMemory,
  onUpdateMemory,
  onDeleteMemory,
}: MemoryPageProps) {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'short-term' | 'long-term'>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newMemory, setNewMemory] = useState({
    content: '',
    tags: [] as string[],
    importance: 'medium' as Memory['importance'],
    type: 'long-term' as Memory['type'],
    sourceConversationId: null as string | null,
  });
  const [tagInput, setTagInput] = useState('');

  const filteredMemories = memories.filter(m => {
    const matchesSearch = m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = filterType === 'all' || m.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleAddTag = () => {
    if (tagInput.trim() && !newMemory.tags.includes(tagInput.trim())) {
      setNewMemory({ ...newMemory, tags: [...newMemory.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setNewMemory({ ...newMemory, tags: newMemory.tags.filter(t => t !== tag) });
  };

  const handleCreate = () => {
    if (newMemory.content.trim()) {
      onCreateMemory(newMemory);
      setNewMemory({
        content: '',
        tags: [],
        importance: 'medium',
        type: 'long-term',
        sourceConversationId: null,
      });
      setShowCreateDialog(false);
    }
  };

  const getConversationTitle = (id: string | null) => {
    if (!id) return null;
    return conversations.find(c => c.id === id)?.title;
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        conversations={conversations}
        versions={versions}
        currentConversationId={null}
        onNewConversation={() => navigate('/')}
        onSelectConversation={() => navigate('/')}
      />

      <main className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center gap-4 px-6 py-4 border-b border-border/30 bg-card/30 backdrop-blur-sm">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="lg:hidden"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Brain className="w-6 h-6 text-purple-400 ml-8 lg:ml-0" />
          <div className="flex-1">
            <h1 className="font-display text-xl font-bold">Memory</h1>
            <p className="text-sm text-muted-foreground">
              {memories.length} memories stored
            </p>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-purple-600 hover:bg-purple-500"
            data-testid="button-add-memory"
          >
            <Plus className="w-4 h-4 mr-1" /> Add Memory
          </Button>
        </header>

        <div className="p-4 border-b border-border/30 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search memories..."
              className="pl-9 bg-muted/30"
              data-testid="input-search-memory"
            />
          </div>
          <Select value={filterType} onValueChange={(v) => setFilterType(v as typeof filterType)}>
            <SelectTrigger className="w-[140px] bg-muted/30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="short-term">Short-term</SelectItem>
              <SelectItem value="long-term">Long-term</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="flex-1 p-4">
          {filteredMemories.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center">
              <Brain className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <h3 className="font-display text-lg font-semibold mb-2">No Memories Yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Memories help Nova remember important things about you and your conversations.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
              {filteredMemories.map((memory) => (
                <motion.div
                  key={memory.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl bg-card border border-border/50 hover:border-purple-500/30 transition-colors"
                  data-testid={`memory-card-${memory.id}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-full border capitalize',
                        importanceColors[memory.importance]
                      )}
                    >
                      {memory.importance}
                    </span>
                    <div className="flex items-center gap-1">
                      {memory.type === 'short-term' ? (
                        <Clock className="w-3 h-3 text-muted-foreground" />
                      ) : (
                        <Zap className="w-3 h-3 text-purple-400" />
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {memory.type}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-foreground/90 leading-relaxed mb-3">
                    {memory.content}
                  </p>

                  {memory.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {memory.tags.map(tag => (
                        <span
                          key={tag}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground/60">
                    <span>{format(new Date(memory.createdAt), 'MMM d, yyyy')}</span>
                    {getConversationTitle(memory.sourceConversationId) && (
                      <span className="truncate max-w-[120px]">
                        from: {getConversationTitle(memory.sourceConversationId)}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive/60 hover:text-destructive"
                      onClick={() => onDeleteMemory(memory.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </ScrollArea>
      </main>

      <AnimatePresence>
        {showCreateDialog && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateDialog(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg p-6 bg-card border border-border rounded-2xl shadow-2xl z-50"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg font-semibold">Add Memory</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowCreateDialog(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Content
                  </label>
                  <Textarea
                    value={newMemory.content}
                    onChange={(e) => setNewMemory({ ...newMemory, content: e.target.value })}
                    placeholder="What should Nova remember?"
                    className="min-h-[100px]"
                    data-testid="input-memory-content"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      Type
                    </label>
                    <Select
                      value={newMemory.type}
                      onValueChange={(v) => setNewMemory({ ...newMemory, type: v as Memory['type'] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="long-term">Long-term</SelectItem>
                        <SelectItem value="short-term">Short-term</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      Importance
                    </label>
                    <Select
                      value={newMemory.importance}
                      onValueChange={(v) => setNewMemory({ ...newMemory, importance: v as Memory['importance'] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Tags
                  </label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="Add a tag"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    />
                    <Button variant="outline" onClick={handleAddTag}>
                      <Tag className="w-4 h-4" />
                    </Button>
                  </div>
                  {newMemory.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {newMemory.tags.map(tag => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground"
                        >
                          #{tag}
                          <button onClick={() => handleRemoveTag(tag)}>
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={!newMemory.content.trim()}
                    className="bg-purple-600 hover:bg-purple-500"
                    data-testid="button-save-memory"
                  >
                    Save Memory
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
