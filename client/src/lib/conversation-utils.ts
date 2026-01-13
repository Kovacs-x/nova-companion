import { format } from 'date-fns';

const SIMPLE_GREETINGS = ['hi', 'hey', 'hello', 'yo', 'sup'];

/**
 * Check if a message is a simple greeting
 */
export function isSimpleGreeting(message: string): boolean {
  const cleaned = message.toLowerCase().trim().replace(/[!.?]+$/, '');
  return SIMPLE_GREETINGS.includes(cleaned);
}

/**
 * Generate a sensible title for a conversation
 * - Ignores simple greetings
 * - Uses first meaningful message (>10 chars)
 * - Falls back to "Conversation • <date>"
 */
export function generateConversationTitle(
  messages: Array<{ role: string; content: string }>,
  createdAt: string | Date
): string {
  // Find first meaningful user message
  const userMessages = messages.filter(m => m.role === 'user');
  
  for (const message of userMessages) {
    const content = message.content.trim();
    
    // Skip greetings
    if (isSimpleGreeting(content)) {
      continue;
    }
    
    // Use first meaningful message (>10 chars)
    if (content.length > 10) {
      // Truncate to 40 chars if needed
      return content.length > 40 ? content.slice(0, 40) + '...' : content;
    }
  }
  
  // Fallback to date-based title
  const date = new Date(createdAt);
  return `Conversation • ${format(date, 'MMM d')}`;
}
