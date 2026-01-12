import { useState, useEffect, useCallback } from 'react';
import { NovaState, NovaVersion, Conversation, Memory, Message, NovaMood, Boundary } from '@/lib/types';
import { loadState, saveState, resetState, exportData, importData } from '@/lib/storage';
import { v4 as uuidv4 } from 'uuid';

export function useNovaState() {
  const [state, setState] = useState<NovaState>(() => loadState());

  useEffect(() => {
    saveState(state);
  }, [state]);

  const completeOnboarding = useCallback(() => {
    setState(prev => ({ ...prev, onboardingComplete: true }));
  }, []);

  const createVersion = useCallback((version: Omit<NovaVersion, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newVersion: NovaVersion = {
      ...version,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setState(prev => ({
      ...prev,
      versions: [...prev.versions, newVersion],
    }));
    return newVersion;
  }, []);

  const updateVersion = useCallback((id: string, updates: Partial<NovaVersion>) => {
    setState(prev => ({
      ...prev,
      versions: prev.versions.map(v =>
        v.id === id ? { ...v, ...updates, updatedAt: new Date().toISOString() } : v
      ),
    }));
  }, []);

  const cloneVersion = useCallback((id: string, newName: string) => {
    const original = state.versions.find(v => v.id === id);
    if (!original) return null;

    const cloned: NovaVersion = {
      ...original,
      id: uuidv4(),
      name: newName,
      parentVersionId: id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setState(prev => ({
      ...prev,
      versions: [...prev.versions, cloned],
    }));
    return cloned;
  }, [state.versions]);

  const deleteVersion = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      versions: prev.versions.filter(v => v.id !== id),
    }));
  }, []);

  const createConversation = useCallback((versionId: string, title?: string) => {
    const newConv: Conversation = {
      id: uuidv4(),
      title: title || 'New Conversation',
      versionId,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setState(prev => ({
      ...prev,
      conversations: [newConv, ...prev.conversations],
    }));
    return newConv;
  }, []);

  const updateConversation = useCallback((id: string, updates: Partial<Conversation>) => {
    setState(prev => ({
      ...prev,
      conversations: prev.conversations.map(c =>
        c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
      ),
    }));
  }, []);

  const deleteConversation = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      conversations: prev.conversations.filter(c => c.id !== id),
    }));
  }, []);

  const addMessage = useCallback((conversationId: string, message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...message,
      id: uuidv4(),
      timestamp: new Date().toISOString(),
    };
    setState(prev => ({
      ...prev,
      conversations: prev.conversations.map(c =>
        c.id === conversationId
          ? { ...c, messages: [...c.messages, newMessage], updatedAt: new Date().toISOString() }
          : c
      ),
    }));
    return newMessage;
  }, []);

  const updateMessage = useCallback((conversationId: string, messageId: string, updates: Partial<Message>) => {
    setState(prev => ({
      ...prev,
      conversations: prev.conversations.map(c =>
        c.id === conversationId
          ? {
              ...c,
              messages: c.messages.map(m => m.id === messageId ? { ...m, ...updates } : m),
            }
          : c
      ),
    }));
  }, []);

  const createMemory = useCallback((memory: Omit<Memory, 'id' | 'createdAt'>) => {
    const newMemory: Memory = {
      ...memory,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    setState(prev => ({
      ...prev,
      memories: [...prev.memories, newMemory],
    }));
    return newMemory;
  }, []);

  const updateMemory = useCallback((id: string, updates: Partial<Memory>) => {
    setState(prev => ({
      ...prev,
      memories: prev.memories.map(m => m.id === id ? { ...m, ...updates } : m),
    }));
  }, []);

  const deleteMemory = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      memories: prev.memories.filter(m => m.id !== id),
    }));
  }, []);

  const updateSettings = useCallback((updates: Partial<typeof state.settings>) => {
    setState(prev => ({
      ...prev,
      settings: { ...prev.settings, ...updates },
    }));
  }, []);

  const addBoundary = useCallback((boundary: Omit<Boundary, 'id'>) => {
    const newBoundary: Boundary = { ...boundary, id: uuidv4() };
    setState(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        boundaries: [...prev.settings.boundaries, newBoundary],
      },
    }));
  }, []);

  const updateBoundary = useCallback((id: string, updates: Partial<Boundary>) => {
    setState(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        boundaries: prev.settings.boundaries.map(b => b.id === id ? { ...b, ...updates } : b),
      },
    }));
  }, []);

  const deleteBoundary = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        boundaries: prev.settings.boundaries.filter(b => b.id !== id),
      },
    }));
  }, []);

  const updateMood = useCallback((mood: Partial<NovaMood>) => {
    setState(prev => ({
      ...prev,
      currentMood: { ...prev.currentMood, ...mood },
    }));
  }, []);

  const doExportData = useCallback(() => {
    return exportData(state);
  }, [state]);

  const doImportData = useCallback((json: string) => {
    const imported = importData(json);
    if (imported) {
      setState(imported);
      return true;
    }
    return false;
  }, []);

  const doResetState = useCallback(() => {
    setState(resetState());
  }, []);

  return {
    state,
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
  };
}
