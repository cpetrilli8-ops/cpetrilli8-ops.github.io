import { openDB } from 'idb';
import type { WorkspaceData } from '../types';

const database = openDB('elara-private-cache', 2, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('workspaces')) db.createObjectStore('workspaces');
    if (!db.objectStoreNames.contains('logos')) db.createObjectStore('logos');
  },
});

export async function readWorkspaceCache(userId: string): Promise<WorkspaceData | undefined> {
  const db = await database;
  const cached = await db.get('workspaces', userId) as WorkspaceData | undefined;
  if (!cached) return undefined;
  if (!Array.isArray(cached.brands) || !Array.isArray(cached.profiles) || !Array.isArray(cached.contents)) {
    await db.delete('workspaces', userId);
    throw new Error('La cache locale era danneggiata ed è stata rimossa. Riconnettiti per ricaricare i dati.');
  }
  return cached;
}

export async function writeWorkspaceCache(userId: string, data: WorkspaceData): Promise<void> {
  const db = await database;
  try {
    await db.put('workspaces', data, userId);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      throw new Error('Spazio locale esaurito: i dati sono sul server, ma non è stato possibile aggiornare la cache.');
    }
    throw error;
  }
}

export async function clearWorkspaceCache(userId?: string): Promise<void> {
  const db = await database;
  if (userId) {
    const transaction = db.transaction(['workspaces', 'logos'], 'readwrite');
    await Promise.all([transaction.objectStore('workspaces').delete(userId), transaction.objectStore('logos').delete(userId)]);
    await transaction.done;
  } else {
    await Promise.all([db.clear('workspaces'), db.clear('logos')]);
  }
}

export async function readUserLogo(userId: string): Promise<string | undefined> {
  const db = await database;
  const logo = await db.get('logos', userId);
  return typeof logo === 'string' ? logo : undefined;
}

export async function writeUserLogo(userId: string, dataUrl: string): Promise<void> {
  const db = await database;
  try {
    await db.put('logos', dataUrl, userId);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      throw new Error('Spazio locale esaurito: non è stato possibile salvare il logo su questo dispositivo.');
    }
    throw error;
  }
}

export async function clearUserLogo(userId: string): Promise<void> {
  const db = await database;
  await db.delete('logos', userId);
}
