import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import {
  Plus,
  Copy,
  Trash2,
  ChevronRight,
  GitBranch,
  Edit3,
  X,
  Check,
  ArrowLeft,
} from 'lucide-react';
import { Sidebar } from '@/components/nova/Sidebar';
import { NovaAvatar } from '@/components/nova/NovaAvatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NovaVersion, NovaRule, Conversation } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

interface VersionsPageProps {
  versions: NovaVersion[];
  conversations: Conversation[];
  onCreateVersion: (version: Omit<NovaVersion, 'id' | 'createdAt' | 'updatedAt'>) => NovaVersion;
  onUpdateVersion: (id: string, updates: Partial<NovaVersion>) => void;
  onCloneVersion: (id: string, newName: string) => NovaVersion | null;
  onDeleteVersion: (id: string) => void;
}

export default function VersionsPage({
  versions,
  conversations,
  onCreateVersion,
  onUpdateVersion,
  onCloneVersion,
  onDeleteVersion,
}: VersionsPageProps) {
  const [, navigate] = useLocation();
  const [selectedVersion, setSelectedVersion] = useState<NovaVersion | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<NovaVersion>>({});
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [cloneName, setCloneName] = useState('');

  const getParentVersion = (parentId: string | null) => {
    if (!parentId) return null;
    return versions.find(v => v.id === parentId);
  };

  const handleEdit = (version: NovaVersion) => {
    setSelectedVersion(version);
    setEditForm(version);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (selectedVersion && editForm) {
      onUpdateVersion(selectedVersion.id, editForm);
      setIsEditing(false);
      setSelectedVersion({ ...selectedVersion, ...editForm } as NovaVersion);
    }
  };

  const handleClone = () => {
    if (selectedVersion && cloneName) {
      const cloned = onCloneVersion(selectedVersion.id, cloneName);
      if (cloned) {
        setSelectedVersion(cloned);
        setShowCloneDialog(false);
        setCloneName('');
      }
    }
  };

  const handleDelete = (id: string) => {
    if (versions.length > 1) {
      onDeleteVersion(id);
      if (selectedVersion?.id === id) {
        setSelectedVersion(null);
      }
    }
  };

  const handleAddRule = () => {
    if (editForm) {
      const newRule: NovaRule = {
        id: uuidv4(),
        name: 'New Rule',
        content: '',
        enabled: true,
      };
      setEditForm({
        ...editForm,
        rules: [...(editForm.rules || []), newRule],
      });
    }
  };

  const handleUpdateRule = (ruleId: string, updates: Partial<NovaRule>) => {
    if (editForm?.rules) {
      setEditForm({
        ...editForm,
        rules: editForm.rules.map(r => r.id === ruleId ? { ...r, ...updates } : r),
      });
    }
  };

  const handleDeleteRule = (ruleId: string) => {
    if (editForm?.rules) {
      setEditForm({
        ...editForm,
        rules: editForm.rules.filter(r => r.id !== ruleId),
      });
    }
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
          <div className="ml-8 lg:ml-0">
            <h1 className="font-display text-xl font-bold">Nova Versions</h1>
            <p className="text-sm text-muted-foreground">Create and evolve different versions of Nova</p>
          </div>
        </header>

        <div className="flex-1 flex min-h-0">
          <ScrollArea className="w-80 border-r border-border/30 p-4">
            <div className="space-y-2">
              {versions.map((version) => {
                const parent = getParentVersion(version.parentVersionId);
                return (
                  <motion.button
                    key={version.id}
                    onClick={() => { setSelectedVersion(version); setIsEditing(false); }}
                    className={cn(
                      'w-full text-left p-4 rounded-xl border transition-all',
                      selectedVersion?.id === version.id
                        ? 'bg-purple-500/10 border-purple-500/30'
                        : 'border-border/50 hover:bg-muted/50'
                    )}
                    whileHover={{ x: 2 }}
                    data-testid={`version-card-${version.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <NovaAvatar size="sm" animated={false} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{version.name}</div>
                        {parent && (
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                            <GitBranch className="w-3 h-3" />
                            <span>from {parent.name}</span>
                          </div>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                      {version.description}
                    </p>
                    <div className="text-[10px] text-muted-foreground/60 mt-2">
                      {format(new Date(version.updatedAt), 'MMM d, yyyy')}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </ScrollArea>

          <div className="flex-1 p-6 overflow-auto">
            {selectedVersion ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl mx-auto space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <NovaAvatar size="lg" />
                    <div>
                      {isEditing ? (
                        <Input
                          value={editForm.name || ''}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="font-display text-xl font-bold bg-transparent border-border/50"
                        />
                      ) : (
                        <h2 className="font-display text-xl font-bold">{selectedVersion.name}</h2>
                      )}
                      <p className="text-sm text-muted-foreground">
                        Created {format(new Date(selectedVersion.createdAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                          <X className="w-4 h-4 mr-1" /> Cancel
                        </Button>
                        <Button size="sm" onClick={handleSave} className="bg-purple-600 hover:bg-purple-500">
                          <Check className="w-4 h-4 mr-1" /> Save
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="outline" size="sm" onClick={() => handleEdit(selectedVersion)}>
                          <Edit3 className="w-4 h-4 mr-1" /> Edit
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setShowCloneDialog(true)}>
                          <Copy className="w-4 h-4 mr-1" /> Clone
                        </Button>
                        {versions.length > 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(selectedVersion.id)}
                            className="text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      Description
                    </label>
                    {isEditing ? (
                      <Textarea
                        value={editForm.description || ''}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        className="bg-muted/30 border-border/50 min-h-[80px]"
                      />
                    ) : (
                      <p className="text-sm text-foreground/80 leading-relaxed">
                        {selectedVersion.description}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      System Prompt / Persona
                    </label>
                    {isEditing ? (
                      <Textarea
                        value={editForm.systemPrompt || ''}
                        onChange={(e) => setEditForm({ ...editForm, systemPrompt: e.target.value })}
                        className="bg-muted/30 border-border/50 min-h-[200px] font-mono text-sm"
                      />
                    ) : (
                      <pre className="text-sm text-foreground/80 whitespace-pre-wrap bg-muted/30 rounded-xl p-4 border border-border/30">
                        {selectedVersion.systemPrompt}
                      </pre>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium text-muted-foreground">
                        Rules & Pacts
                      </label>
                      {isEditing && (
                        <Button variant="ghost" size="sm" onClick={handleAddRule}>
                          <Plus className="w-4 h-4 mr-1" /> Add Rule
                        </Button>
                      )}
                    </div>
                    <div className="space-y-3">
                      {(isEditing ? editForm.rules : selectedVersion.rules)?.map((rule) => (
                        <div
                          key={rule.id}
                          className={cn(
                            'p-4 rounded-xl border transition-colors',
                            rule.enabled ? 'border-purple-500/30 bg-purple-500/5' : 'border-border/50 bg-muted/30 opacity-60'
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            {isEditing ? (
                              <Input
                                value={rule.name}
                                onChange={(e) => handleUpdateRule(rule.id, { name: e.target.value })}
                                className="bg-transparent border-0 font-medium p-0 h-auto text-sm"
                              />
                            ) : (
                              <span className="font-medium text-sm">{rule.name}</span>
                            )}
                            <div className="flex items-center gap-2">
                              {isEditing && (
                                <>
                                  <Switch
                                    checked={rule.enabled}
                                    onCheckedChange={(checked) => handleUpdateRule(rule.id, { enabled: checked })}
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-destructive"
                                    onClick={() => handleDeleteRule(rule.id)}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                          {isEditing ? (
                            <Textarea
                              value={rule.content}
                              onChange={(e) => handleUpdateRule(rule.id, { content: e.target.value })}
                              className="bg-transparent border-0 p-0 text-sm text-muted-foreground min-h-[60px] resize-none"
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground">{rule.content}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-3 block">
                      Tone Traits
                    </label>
                    <div className="space-y-4">
                      {Object.entries(isEditing ? (editForm.toneTraits || {}) : selectedVersion.toneTraits).map(([trait, value]) => (
                        <div key={trait} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm capitalize">{trait}</span>
                            <span className="text-xs text-muted-foreground">{value}%</span>
                          </div>
                          {isEditing ? (
                            <Slider
                              value={[value]}
                              onValueChange={([v]) => setEditForm({
                                ...editForm,
                                toneTraits: { ...editForm.toneTraits, [trait]: v }
                              })}
                              max={100}
                              step={5}
                              className="[&_[role=slider]]:bg-purple-500"
                            />
                          ) : (
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-purple-600 to-violet-500 rounded-full"
                                style={{ width: `${value}%` }}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <NovaAvatar size="lg" className="mb-4" />
                <h3 className="font-display text-lg font-semibold mb-2">Select a Version</h3>
                <p className="text-sm text-muted-foreground">
                  Choose a version to view or edit its configuration
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <AnimatePresence>
        {showCloneDialog && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCloneDialog(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md p-6 bg-card border border-border rounded-2xl shadow-2xl z-50"
            >
              <h3 className="font-display text-lg font-semibold mb-2">Clone Version</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create a new version based on "{selectedVersion?.name}"
              </p>
              <Input
                value={cloneName}
                onChange={(e) => setCloneName(e.target.value)}
                placeholder="New version name (e.g., Nova Stage 2)"
                className="mb-4"
                data-testid="input-clone-name"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowCloneDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleClone}
                  disabled={!cloneName}
                  className="bg-purple-600 hover:bg-purple-500"
                  data-testid="button-clone-confirm"
                >
                  <Copy className="w-4 h-4 mr-1" /> Clone
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
