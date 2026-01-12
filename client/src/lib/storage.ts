import { NovaState, DEFAULT_STATE } from './types';

const STORAGE_KEY = 'nova-companion-state';

export function loadState(): NovaState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_STATE;
    
    const parsed = JSON.parse(stored) as NovaState;
    return migrateState(parsed);
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveState(state: NovaState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state:', e);
  }
}

export function migrateState(state: NovaState): NovaState {
  let migrated = { ...state };
  
  if (!migrated.schemaVersion) {
    migrated.schemaVersion = 1;
  }
  
  if (!migrated.currentMood) {
    migrated.currentMood = DEFAULT_STATE.currentMood;
  }
  
  if (migrated.onboardingComplete === undefined) {
    migrated.onboardingComplete = false;
  }
  
  return migrated;
}

export function exportData(state: NovaState): string {
  return JSON.stringify(state, null, 2);
}

export function importData(json: string): NovaState | null {
  try {
    const parsed = JSON.parse(json);
    if (parsed.schemaVersion) {
      return migrateState(parsed);
    }
    return null;
  } catch {
    return null;
  }
}

export function resetState(): NovaState {
  localStorage.removeItem(STORAGE_KEY);
  return DEFAULT_STATE;
}
