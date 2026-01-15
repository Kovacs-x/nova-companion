import { useState, useCallback } from "react";
import {
  NovaState,
  NovaVersion,
  Conversation,
  Memory,
  Message,
  NovaMood,
  Boundary,
  DEFAULT_STATE,
} from "@/lib/types";
import { api } from "@/lib/api";
import { v4 as uuidv4 } from "uuid";
import { generateConversationTitle } from "@/lib/conversation-utils";

export function useNovaState() {
  const [state, setState] = useState<NovaState>(DEFAULT_STATE);
  const [isReady, setIsReady] = useState(false);

  const loadDataFromServer = async () => {
    try {
      const [versions, conversations, memories, settings] = await Promise.all([
        api.versions.list(),
        api.conversations.list(),
        api.memories.list(),
        api.settings.get(),
      ]);

      const conversationsWithMessages = await Promise.all(
        conversations.map(async (conv: any) => {
          let messages: any[] = [];

          try {
            const fullConv = await api.conversations.get(conv.id);
            messages = fullConv.messages || [];
          } catch {
            // If fetch fails, use empty messages array
            messages = [];
          }

          // Always regenerate title using current logic to fix legacy greeting-based titles
          const regeneratedTitle = generateConversationTitle(messages, conv.createdAt);

          // Update server if title changed (only if we have a valid conversation)
          if (regeneratedTitle !== conv.title) {
            try {
              await api.conversations.update(conv.id, { title: regeneratedTitle });
            } catch (error) {
              console.error("Failed to update conversation title:", error);
            }
          }

          return {
            ...conv,
            title: regeneratedTitle,
            messages,
            createdAt: conv.createdAt,
            updatedAt: conv.updatedAt,
          };
        }),
      );

      setState({
        schemaVersion: 1,
        versions: versions.map((v: any) => ({
          ...v,
          createdAt: v.createdAt,
          updatedAt: v.updatedAt,
        })),
        conversations: conversationsWithMessages,
        memories: memories.map((m: any) => ({
          ...m,
          createdAt: m.createdAt,
        })),
        settings: {
          provider: settings.provider || "openai",
          apiEndpoint: settings.apiEndpoint || "https://api.openai.com/v1",
          modelName: settings.modelName || "gpt-4",
          voiceMode: settings.voiceMode || "quiet",
          boundaries: settings.boundaries || [],
        },
        currentMood: settings.currentMood || DEFAULT_STATE.currentMood,
        onboardingComplete: true,
      });
    } catch (error) {
      console.error("Failed to load data from server:", error);
      setState((prev) => ({ ...prev, onboardingComplete: true }));
    } finally {
      setIsReady(true);
    }
  };

  const completeOnboarding = useCallback(() => {
    setState((prev) => ({ ...prev, onboardingComplete: true }));
  }, []);

  const createVersion = useCallback(
    async (version: Omit<NovaVersion, "id" | "createdAt" | "updatedAt">) => {
      try {
        const created = await api.versions.create(version);
        const newVersion: NovaVersion = {
          ...created,
          createdAt: created.createdAt,
          updatedAt: created.updatedAt,
        };
        setState((prev) => ({
          ...prev,
          versions: [...prev.versions, newVersion],
        }));
        return newVersion;
      } catch (error) {
        console.error("Failed to create version:", error);
        const localVersion: NovaVersion = {
          ...version,
          id: uuidv4(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setState((prev) => ({
          ...prev,
          versions: [...prev.versions, localVersion],
        }));
        return localVersion;
      }
    },
    [],
  );

  const updateVersion = useCallback(async (id: string, updates: Partial<NovaVersion>) => {
    try {
      await api.versions.update(id, updates);
    } catch (error) {
      console.error("Failed to update version:", error);
    }
    setState((prev) => ({
      ...prev,
      versions: prev.versions.map((v) =>
        v.id === id ? { ...v, ...updates, updatedAt: new Date().toISOString() } : v,
      ),
    }));
  }, []);

  const cloneVersion = useCallback(
    async (id: string, newName: string) => {
      try {
        const cloned = await api.versions.clone(id, newName);
        const newVersion: NovaVersion = {
          ...cloned,
          createdAt: cloned.createdAt,
          updatedAt: cloned.updatedAt,
        };
        setState((prev) => ({
          ...prev,
          versions: [...prev.versions, newVersion],
        }));
        return newVersion;
      } catch (error) {
        console.error("Failed to clone version:", error);
        const original = state.versions.find((v) => v.id === id);
        if (!original) return null;

        const cloned: NovaVersion = {
          ...original,
          id: uuidv4(),
          name: newName,
          parentVersionId: id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setState((prev) => ({
          ...prev,
          versions: [...prev.versions, cloned],
        }));
        return cloned;
      }
    },
    [state.versions],
  );

  const deleteVersion = useCallback(async (id: string) => {
    try {
      await api.versions.delete(id);
    } catch (error) {
      console.error("Failed to delete version:", error);
    }
    setState((prev) => ({
      ...prev,
      versions: prev.versions.filter((v) => v.id !== id),
    }));
  }, []);

  const createConversation = useCallback(async (versionId: string, title?: string) => {
    const defaultTitle = title || generateConversationTitle([], new Date().toISOString());
    const created = await api.conversations.create(versionId, defaultTitle);
    const newConv: Conversation = {
      ...created,
      messages: [],
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };

    setState((prev) => ({
      ...prev,
      conversations: [newConv, ...prev.conversations],
    }));

    return newConv;
  }, []);

  const updateConversation = useCallback(
    async (id: string, updates: Partial<Conversation>) => {
      try {
        await api.conversations.update(id, updates);
      } catch (error) {
        console.error("Failed to update conversation:", error);
      }
      setState((prev) => ({
        ...prev,
        conversations: prev.conversations.map((c) =>
          c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c,
        ),
      }));
    },
    [],
  );

  const deleteConversation = useCallback(async (id: string) => {
    try {
      await api.conversations.delete(id);
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    }
    setState((prev) => ({
      ...prev,
      conversations: prev.conversations.filter((c) => c.id !== id),
    }));
  }, []);

  const addMessage = useCallback(
    async (conversationId: string, message: Omit<Message, "id" | "timestamp">) => {
      const newMessage: Message = {
        ...message,
        id: uuidv4(),
        timestamp: new Date().toISOString(),
      };

      let updatedTitle: string | undefined;

      setState((prev) => {
        const conversation = prev.conversations.find((c) => c.id === conversationId);
        if (!conversation) return prev;

        const updatedMessages = [...conversation.messages, newMessage];

        // Generate new title based on updated messages
        const newTitle = generateConversationTitle(
          updatedMessages,
          conversation.createdAt,
        );

        // Save for server update if changed
        if (newTitle !== conversation.title) {
          updatedTitle = newTitle;
        }

        return {
          ...prev,
          conversations: prev.conversations.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  messages: updatedMessages,
                  title: newTitle,
                  updatedAt: new Date().toISOString(),
                }
              : c,
          ),
        };
      });

      try {
        await api.conversations.addMessage(conversationId, message.role, message.content);

        // Update title on server if it changed
        if (updatedTitle) {
          await api.conversations.update(conversationId, { title: updatedTitle });
        }
      } catch (error) {
        console.error("Failed to save message to server:", error);
      }

      return newMessage;
    },
    [],
  );

  const updateMessage = useCallback(
    (conversationId: string, messageId: string, updates: Partial<Message>) => {
      setState((prev) => ({
        ...prev,
        conversations: prev.conversations.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === messageId ? { ...m, ...updates } : m,
                ),
              }
            : c,
        ),
      }));
    },
    [],
  );

  const createMemory = useCallback(async (memory: Omit<Memory, "id" | "createdAt">) => {
    try {
      const created = await api.memories.create(memory);
      const newMemory: Memory = {
        ...created,
        createdAt: created.createdAt,
      };
      setState((prev) => ({
        ...prev,
        memories: [...prev.memories, newMemory],
      }));
      return newMemory;
    } catch (error) {
      console.error("Failed to create memory:", error);
      const localMemory: Memory = {
        ...memory,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
      };
      setState((prev) => ({
        ...prev,
        memories: [...prev.memories, localMemory],
      }));
      return localMemory;
    }
  }, []);

  const updateMemory = useCallback(async (id: string, updates: Partial<Memory>) => {
    try {
      await api.memories.update(id, updates);
    } catch (error) {
      console.error("Failed to update memory:", error);
    }
    setState((prev) => ({
      ...prev,
      memories: prev.memories.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    }));
  }, []);

  const deleteMemory = useCallback(async (id: string) => {
    try {
      await api.memories.delete(id);
    } catch (error) {
      console.error("Failed to delete memory:", error);
    }
    setState((prev) => ({
      ...prev,
      memories: prev.memories.filter((m) => m.id !== id),
    }));
  }, []);

  const updateSettings = useCallback(async (updates: Partial<typeof state.settings>) => {
    try {
      await api.settings.update(updates);
    } catch (error) {
      console.error("Failed to update settings:", error);
    }
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...updates },
    }));
  }, []);

  const addBoundary = useCallback(
    async (boundary: Omit<Boundary, "id">) => {
      const newBoundary: Boundary = { ...boundary, id: uuidv4() };
      const newBoundaries = [...state.settings.boundaries, newBoundary];

      try {
        await api.settings.update({ boundaries: newBoundaries });
      } catch (error) {
        console.error("Failed to add boundary:", error);
      }

      setState((prev) => ({
        ...prev,
        settings: {
          ...prev.settings,
          boundaries: newBoundaries,
        },
      }));
    },
    [state.settings.boundaries],
  );

  const updateBoundary = useCallback(
    async (id: string, updates: Partial<Boundary>) => {
      const newBoundaries = state.settings.boundaries.map((b) =>
        b.id === id ? { ...b, ...updates } : b,
      );

      try {
        await api.settings.update({ boundaries: newBoundaries });
      } catch (error) {
        console.error("Failed to update boundary:", error);
      }

      setState((prev) => ({
        ...prev,
        settings: {
          ...prev.settings,
          boundaries: newBoundaries,
        },
      }));
    },
    [state.settings.boundaries],
  );

  const deleteBoundary = useCallback(
    async (id: string) => {
      const newBoundaries = state.settings.boundaries.filter((b) => b.id !== id);

      try {
        await api.settings.update({ boundaries: newBoundaries });
      } catch (error) {
        console.error("Failed to delete boundary:", error);
      }

      setState((prev) => ({
        ...prev,
        settings: {
          ...prev.settings,
          boundaries: newBoundaries,
        },
      }));
    },
    [state.settings.boundaries],
  );

  const updateMood = useCallback(
    async (mood: Partial<NovaMood>) => {
      const newMood = { ...state.currentMood, ...mood };

      try {
        await api.settings.update({ currentMood: newMood });
      } catch (error) {
        console.error("Failed to update mood:", error);
      }

      setState((prev) => ({
        ...prev,
        currentMood: newMood,
      }));
    },
    [state.currentMood],
  );

  const doExportData = useCallback(async () => {
    try {
      const data = await api.backups.export();
      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error("Failed to export data:", error);
      return JSON.stringify(state, null, 2);
    }
  }, [state]);

  const doImportData = useCallback((json: string) => {
    try {
      const parsed = JSON.parse(json);
      if (parsed.schemaVersion) {
        loadDataFromServer();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const doResetState = useCallback(() => {
    setState(DEFAULT_STATE);
  }, []);

  return {
    state,
    isReady,
    loadData: loadDataFromServer,
    completeOnboarding,
    createVersion,
    updateVersion,
    cloneVersion,
    deleteVersion,
    createConversation,
    updateConversation,
    deleteConversation,
    addMessage,
    updateMessage,
    createMemory,
    updateMemory,
    deleteMemory,
    updateSettings,
    addBoundary,
    updateBoundary,
    deleteBoundary,
    updateMood,
    exportData: doExportData,
    importData: doImportData,
    resetState: doResetState,
    reloadData: loadDataFromServer,
  };
}
