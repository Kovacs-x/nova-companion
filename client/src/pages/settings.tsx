import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation, Link } from 'wouter';
import {
  Settings as SettingsIcon,
  ArrowLeft,
  Globe,
  Cpu,
  Download,
  Upload,
  Check,
  LogOut,
  Activity,
  Server,
} from 'lucide-react';
import { Sidebar } from '@/components/nova/Sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { NovaSettings, Conversation, NovaVersion } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface SettingsPageProps {
  settings: NovaSettings;
  conversations: Conversation[];
  versions: NovaVersion[];
  onUpdateSettings: (updates: Partial<NovaSettings>) => void;
  onExport: () => string;
  onImport: (json: string) => boolean;
  onLogout?: () => void;
}

const providers = [
  { id: 'openai', name: 'OpenAI', endpoint: 'https://api.openai.com/v1' },
  { id: 'anthropic', name: 'Anthropic', endpoint: 'https://api.anthropic.com/v1' },
  { id: 'custom', name: 'Custom Endpoint', endpoint: '' },
];

const models = {
  openai: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
  custom: [],
};

export default function SettingsPage({
  settings,
  conversations,
  versions,
  onUpdateSettings,
  onExport,
  onImport,
  onLogout,
}: SettingsPageProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [localSettings, setLocalSettings] = useState(settings);
  const [hasChanges, setHasChanges] = useState(false);

  const handleChange = (updates: Partial<NovaSettings>) => {
    setLocalSettings(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const handleProviderChange = (providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
    if (provider) {
      handleChange({
        provider: providerId,
        apiEndpoint: provider.endpoint,
        modelName: models[providerId as keyof typeof models]?.[0] || '',
      });
    }
  };

  const handleSave = () => {
    onUpdateSettings(localSettings);
    setHasChanges(false);
    toast({
      title: "Settings saved",
      description: "Your changes have been saved successfully.",
    });
  };

  const handleExport = () => {
    const data = onExport();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nova-companion-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "Export complete",
      description: "Your data has been exported to a JSON file.",
    });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const json = event.target?.result as string;
        const success = onImport(json);
        if (success) {
          toast({
            title: "Import complete",
            description: "Your data has been restored successfully.",
          });
        } else {
          toast({
            title: "Import failed",
            description: "The file format is invalid or corrupted.",
            variant: "destructive",
          });
        }
      };
      reader.readAsText(file);
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
          <SettingsIcon className="w-6 h-6 text-purple-400 ml-8 lg:ml-0" />
          <div className="flex-1">
            <h1 className="font-display text-xl font-bold">Settings</h1>
            <p className="text-sm text-muted-foreground">Configure Nova and manage your data</p>
          </div>
          {hasChanges && (
            <Button
              onClick={handleSave}
              className="bg-purple-600 hover:bg-purple-500"
              data-testid="button-save-settings"
            >
              <Check className="w-4 h-4 mr-1" /> Save Changes
            </Button>
          )}
        </header>

        <ScrollArea className="flex-1 p-6">
          <div className="max-w-2xl mx-auto space-y-8">
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                <Globe className="w-5 h-5 text-purple-400" />
                API Provider
              </h2>

              <div className="p-4 rounded-xl bg-card border border-border/50 space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Provider
                  </label>
                  <Select
                    value={localSettings.provider}
                    onValueChange={handleProviderChange}
                  >
                    <SelectTrigger data-testid="select-provider">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {providers.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {localSettings.provider === 'custom' && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      API Endpoint
                    </label>
                    <Input
                      value={localSettings.apiEndpoint}
                      onChange={(e) => handleChange({ apiEndpoint: e.target.value })}
                      placeholder="https://your-api.com/v1"
                      data-testid="input-endpoint"
                    />
                  </div>
                )}

                <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Server className="w-4 h-4" />
                    <span>API key is configured server-side for security</span>
                  </div>
                </div>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-4"
            >
              <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                <Cpu className="w-5 h-5 text-purple-400" />
                Model
              </h2>

              <div className="p-4 rounded-xl bg-card border border-border/50">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Model Name
                </label>
                {localSettings.provider !== 'custom' ? (
                  <Select
                    value={localSettings.modelName}
                    onValueChange={(v) => handleChange({ modelName: v })}
                  >
                    <SelectTrigger data-testid="select-model">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {models[localSettings.provider as keyof typeof models]?.map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={localSettings.modelName}
                    onChange={(e) => handleChange({ modelName: e.target.value })}
                    placeholder="gpt-4, claude-3-opus, etc."
                    data-testid="input-model"
                  />
                )}
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              <h2 className="font-display text-lg font-semibold">Data Management</h2>

              <div className="p-4 rounded-xl bg-card border border-border/50 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-sm">Export Data</h3>
                    <p className="text-xs text-muted-foreground">
                      Download all your conversations, memories, and settings
                    </p>
                  </div>
                  <Button variant="outline" onClick={handleExport} data-testid="button-export">
                    <Download className="w-4 h-4 mr-1" /> Export
                  </Button>
                </div>

                <div className="border-t border-border/30" />

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-sm">Import Data</h3>
                    <p className="text-xs text-muted-foreground">
                      Restore from a previous backup file
                    </p>
                  </div>
                  <label>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImport}
                      className="hidden"
                      data-testid="input-import"
                    />
                    <Button variant="outline" asChild>
                      <span>
                        <Upload className="w-4 h-4 mr-1" /> Import
                      </span>
                    </Button>
                  </label>
                </div>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-4"
            >
              <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-400" />
                System
              </h2>

              <div className="p-4 rounded-xl bg-card border border-border/50 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-sm">Diagnostics</h3>
                    <p className="text-xs text-muted-foreground">
                      View sync status, schema version, and system health
                    </p>
                  </div>
                  <Link href="/diagnostics">
                    <Button variant="outline" data-testid="button-diagnostics">
                      View Diagnostics
                    </Button>
                  </Link>
                </div>

                {onLogout && (
                  <>
                    <div className="border-t border-border/30" />
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-sm">Sign Out</h3>
                        <p className="text-xs text-muted-foreground">
                          Log out of your Nova Companion account
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={onLogout}
                        className="text-destructive hover:text-destructive"
                        data-testid="button-logout"
                      >
                        <LogOut className="w-4 h-4 mr-1" /> Sign Out
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="pb-8"
            >
              <div className="p-4 rounded-xl bg-muted/30 border border-border/30 text-center">
                <p className="text-xs text-muted-foreground">
                  Nova Companion v1.0.0 • Data synced to PostgreSQL
                </p>
              </div>
            </motion.section>
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}
