import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface NovaAvatarProps {
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  className?: string;
}

export function NovaAvatar({ size = 'md', animated = true, className }: NovaAvatarProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <motion.div
      className={cn(
        'relative flex items-center justify-center rounded-full',
        'bg-gradient-to-br from-purple-500/20 via-violet-500/30 to-fuchsia-500/20',
        'border border-purple-500/30',
        sizeClasses[size],
        className
      )}
      animate={animated ? {
        boxShadow: [
          '0 0 8px rgba(168, 85, 247, 0.3)',
          '0 0 16px rgba(168, 85, 247, 0.5)',
          '0 0 8px rgba(168, 85, 247, 0.3)',
        ],
      } : undefined}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
    >
      <svg
        viewBox="0 0 24 24"
        className={cn(
          'text-purple-400',
          size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-6 h-6'
        )}
        fill="currentColor"
      >
        <path d="M12 2L13.09 8.26L18 6L15.74 10.91L22 12L15.74 13.09L18 18L13.09 15.74L12 22L10.91 15.74L6 18L8.26 13.09L2 12L8.26 10.91L6 6L10.91 8.26L12 2Z" />
      </svg>
      <motion.div
        className="absolute inset-0 rounded-full bg-purple-500/10"
        animate={animated ? { scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] } : undefined}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
      />
    </motion.div>
  );
}
