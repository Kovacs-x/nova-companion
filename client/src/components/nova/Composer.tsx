import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Sparkles, Layers, Download, Slash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ComposerProps {
  onSend: (message: string) => void;
  onSwitchVersion?: () => void;
  onExport?: () => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function Composer({
  onSend,
  onSwitchVersion,
  onExport,
  disabled,
  placeholder = 'Message Nova...',
  className,
}: ComposerProps) {
  const [message, setMessage] = useState('');
  const [showActions, setShowActions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
    }
  }, [message]);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === '/' && message === '') {
      setShowActions(true);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative flex flex-col gap-2 p-3 rounded-2xl',
        'bg-card/80 backdrop-blur-xl border border-border/50',
        'shadow-lg shadow-black/5',
        className
      )}
    >
      {showActions && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="absolute bottom-full left-0 right-0 mb-2 p-2 rounded-xl bg-popover border border-border shadow-xl"
        >
          <div className="text-xs text-muted-foreground mb-2 px-2">Quick Actions</div>
          <div className="space-y-1">
            <button
              onClick={() => { onSwitchVersion?.(); setShowActions(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 text-sm text-left transition-colors"
            >
              <Layers className="w-4 h-4 text-purple-400" />
              <span>Switch Nova Version</span>
            </button>
            <button
              onClick={() => { onExport?.(); setShowActions(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 text-sm text-left transition-colors"
            >
              <Download className="w-4 h-4 text-purple-400" />
              <span>Export Backup</span>
            </button>
          </div>
        </motion.div>
      )}

      <div className="flex items-end gap-2">
        <button
          onClick={() => setShowActions(!showActions)}
          className="flex-shrink-0 p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
          data-testid="button-quick-actions"
        >
          <Slash className="w-4 h-4" />
        </button>

        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowActions(false)}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={cn(
            'flex-1 bg-transparent border-0 resize-none focus:outline-none focus:ring-0',
            'text-sm text-foreground placeholder:text-muted-foreground/50',
            'py-2 px-1 max-h-[150px]'
          )}
          data-testid="input-message"
        />

        <Button
          onClick={handleSend}
          disabled={!message.trim() || disabled}
          size="icon"
          className={cn(
            'flex-shrink-0 rounded-xl h-9 w-9 transition-all',
            message.trim()
              ? 'bg-gradient-to-br from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 glow-nova'
              : 'bg-muted text-muted-foreground'
          )}
          data-testid="button-send"
        >
          {disabled ? (
            <Sparkles className="w-4 h-4 animate-pulse" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>

      <div className="flex items-center gap-2 px-2 text-[10px] text-muted-foreground/50">
        <span>Press / for commands</span>
        <span>•</span>
        <span>Shift+Enter for new line</span>
      </div>
    </motion.div>
  );
}
