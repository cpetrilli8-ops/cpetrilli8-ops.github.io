import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@supabase/supabase-js';
import { clearWorkspaceCache, readWorkspaceCache, writeWorkspaceCache } from './cache';
import type { WorkspaceData } from '../types';

const supabaseMock = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('./supabase', () => ({ supabase: supabaseMock }));

const user = (id: string) => ({ id } as User);
const workspace = (name: string): WorkspaceData => ({
  brands: [], profiles: [],
  contents: [{
    id: name, owner_id: 'owner', brand_id: null, social_profile_id: null, title: name,
    platform: 'Instagram', format: 'Post', pillar: '', status: 'idea', scheduled_at: null,
    script: '', notes: '', created_at: '', updated_at: '',
  }],
});

function configureServer(data: WorkspaceData, failure?: Error) {
  supabaseMock.from.mockImplementation((table: keyof WorkspaceData) => ({
    select: () => ({
      eq: () => ({
        order: () => ({
          abortSignal: async () => failure
            ? { data: null, error: { message: failure.message, code: 'FETCH_ERROR' } }
            : { data: data[table], error: null },
        }),
      }),
    }),
  }));
}

beforeEach(async () => {
  await clearWorkspaceCache();
  supabaseMock.from.mockReset();
});

describe('workspace data and offline fallback', () => {
  it('returns cached private data after a network failure without mixing accounts', async () => {
    const { loadWorkspace } = await import('./data');
    await writeWorkspaceCache('user-a', workspace('Draft A'));
    await writeWorkspaceCache('user-b', workspace('Draft B'));
    configureServer(workspace('unused'), new Error('Network unavailable'));
    const isCurrent = () => true;
    const first = await loadWorkspace(user('user-a'), new AbortController().signal, isCurrent);
    const second = await loadWorkspace(user('user-b'), new AbortController().signal, isCurrent);
    expect(first.contents[0]?.title).toBe('Draft A');
    expect(second.contents[0]?.title).toBe('Draft B');
  });

  it('surfaces connection failures when no cached workspace exists', async () => {
    const { loadWorkspace } = await import('./data');
    configureServer(workspace('unused'), new Error('Network unavailable'));
    await expect(loadWorkspace(user('user-empty'), new AbortController().signal, () => true)).rejects.toThrow('Network unavailable');
  });

  it('does not cache a late response after the active account has changed', async () => {
    const { loadWorkspace } = await import('./data');
    configureServer(workspace('Stale response'));
    await expect(loadWorkspace(user('previous-user'), new AbortController().signal, () => false)).rejects.toThrow('Account changed');
    expect(await readWorkspaceCache('previous-user')).toBeUndefined();
  });
});

describe('server-backed content CRUD', () => {
  const contentValues = {
    title: 'Idea nuova', brand_id: null, social_profile_id: null, platform: 'Instagram',
    format: 'Post', pillar: 'Studio', status: 'idea', scheduled_at: null, script: '', notes: '',
  };

  it('creates, updates, and deletes content with an explicit owner filter', async () => {
    const { saveContent, deleteRecord } = await import('./data');
    const record = { ...contentValues, id: 'content-1', owner_id: 'user-a', created_at: '', updated_at: '' };
    const selected = { select: vi.fn(), single: vi.fn().mockResolvedValue({ data: record, error: null }) };
    selected.select.mockReturnValue(selected);
    const inserted = vi.fn().mockReturnValue(selected);
    const updated = { eq: vi.fn(), select: vi.fn() };
    updated.eq.mockReturnValue(updated);
    updated.select.mockReturnValue(selected);
    const update = vi.fn().mockReturnValue(updated);
    const deleted = { eq: vi.fn() };
    deleted.eq.mockReturnValueOnce(deleted).mockResolvedValueOnce({ error: null });
    const remove = vi.fn().mockReturnValue(deleted);
    supabaseMock.from.mockImplementation(() => ({ insert: inserted, update, delete: remove }));

    await saveContent(user('user-a'), contentValues);
    expect(inserted).toHaveBeenCalledWith({ ...contentValues, owner_id: 'user-a' });
    await saveContent(user('user-a'), contentValues, 'content-1');
    expect(update).toHaveBeenCalledWith(contentValues);
    expect(updated.eq).toHaveBeenNthCalledWith(1, 'id', 'content-1');
    expect(updated.eq).toHaveBeenNthCalledWith(2, 'owner_id', 'user-a');
    await deleteRecord(user('user-a'), 'contents', 'content-1');
    expect(remove).toHaveBeenCalledOnce();
    expect(deleted.eq).toHaveBeenNthCalledWith(1, 'id', 'content-1');
    expect(deleted.eq).toHaveBeenNthCalledWith(2, 'owner_id', 'user-a');
  });

  it('rejects an offline write and surfaces server failures without a success-shaped result', async () => {
    const { saveContent } = await import('./data');
    const original = navigator.onLine;
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    try {
      await expect(saveContent(user('user-a'), contentValues)).rejects.toThrow('Le modifiche richiedono una connessione');
      expect(supabaseMock.from).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(navigator, 'onLine', { configurable: true, value: original });
    }
    const selection = { select: vi.fn(), single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Write rejected' } }) };
    selection.select.mockReturnValue(selection);
    supabaseMock.from.mockImplementation(() => ({ insert: vi.fn().mockReturnValue(selection) }));
    await expect(saveContent(user('user-a'), contentValues)).rejects.toThrow('Write rejected');
  });
});
