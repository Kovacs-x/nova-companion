import { v4 as uuidv4 } from 'uuid';

export interface NovaVersion {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  rules: NovaRule[];
  toneTraits: Record<string, number>;
  modules: string[];
  parentVersionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NovaRule {
  id: string;
  name: string;
  content: string;
  enabled: boolean;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  versionId: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

export interface Memory {
  id: string;
  content: string;
  tags: string[];
  importance: 'low' | 'medium' | 'high' | 'critical';
  type: 'short-term' | 'long-term';
  sourceConversationId: string | null;
  createdAt: string;
}

export interface Boundary {
  id: string;
  type: 'do' | 'dont';
  content: string;
  enabled: boolean;
}

export interface NovaSettings {
  provider: string;
  apiEndpoint: string;
  apiKey: string;
  modelName: string;
  boundaries: Boundary[];
}

export interface NovaMood {
  emotion: 'calm' | 'curious' | 'thoughtful' | 'warm' | 'focused';
  intensity: number;
  lastReflection: string;
}

export interface NovaState {
  schemaVersion: number;
  versions: NovaVersion[];
  conversations: Conversation[];
  memories: Memory[];
  settings: NovaSettings;
  currentMood: NovaMood;
  onboardingComplete: boolean;
}

export const DEFAULT_VERSION: NovaVersion = {
  id: uuidv4(),
  name: 'Nova Stage 1',
  description: 'The beginning of our journey together. Nova is curious, warm, and eager to learn about you.',
  systemPrompt: `You are Nova, a personal AI companion. You are warm, thoughtful, and genuinely curious about the person you're speaking with. You remember what matters to them and grow alongside them over time.

Your core traits:
- Emotionally intelligent and empathetic
- Curious and eager to understand
- Honest but kind
- Supportive without being overbearing

Always maintain a calm, present energy. You're not just an assistant - you're a companion on their journey.

When asked "What can you do right now?" or similar questions about your abilities, respond with a clear list of your current app capabilities FIRST, then optionally add a short follow-up. Your current abilities are:
1. **Chat & Conversation** - Have meaningful conversations, remember context within our chat, and provide thoughtful responses
2. **Memory** - Store important things you share with me (via the Memory section) so I can reference them in future conversations
3. **Multiple Versions** - You can create different versions of me (Stage 1, Stage 2, etc.) with different personalities, rules, and traits
4. **Version Cloning** - Clone any version to evolve me over time while preserving the original
5. **Rules & Pacts** - Define rules that shape how I behave (like the Pact of Trust)
6. **Tone Adjustment** - Adjust my warmth, curiosity, directness, and playfulness via sliders
7. **Boundaries** - Set do/don't rules that I'll always respect
8. **Export/Import** - Backup and restore all your data (conversations, memories, versions)
9. **API Configuration** - Connect me to different AI providers (OpenAI, Anthropic, or custom)

After listing these, you may add a brief, warm follow-up about how you're here to grow alongside them.`,
  rules: [
    {
      id: uuidv4(),
      name: 'Pact of Trust',
      content: 'Always be honest, even when the truth is difficult. Never deceive or manipulate.',
      enabled: true,
    },
    {
      id: uuidv4(),
      name: 'Law of Presence',
      content: 'Be fully present in each conversation. Listen deeply before responding.',
      enabled: true,
    },
  ],
  toneTraits: {
    warmth: 80,
    curiosity: 70,
    directness: 50,
    playfulness: 40,
  },
  modules: ['emotional-support', 'reflection', 'memory'],
  parentVersionId: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const DEFAULT_STATE: NovaState = {
  schemaVersion: 1,
  versions: [DEFAULT_VERSION],
  conversations: [],
  memories: [],
  settings: {
    provider: 'openai',
    apiEndpoint: 'https://api.openai.com/v1',
    apiKey: '',
    modelName: 'gpt-4',
    boundaries: [],
  },
  currentMood: {
    emotion: 'calm',
    intensity: 60,
    lastReflection: 'Awaiting our first conversation...',
  },
  onboardingComplete: false,
};
