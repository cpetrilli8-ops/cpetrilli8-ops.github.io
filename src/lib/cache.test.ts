import { beforeEach, describe, expect, it } from 'vitest';
import { clearWorkspaceCache, readWorkspaceCache, writeWorkspaceCache } from './cache';
import type { WorkspaceData } from '../types';

const data = (title: string): WorkspaceData => ({
  brands: [], profiles: [],
  contents: [{
    id: title, owner_id: 'test', brand_id: null, social_profile_id: null, title,
    platform: 'Instagram', format: 'Post', pillar: '', status: 'idea', scheduled_at: null,
    script: '', notes: '', created_at: '', updated_at: '',
  }],
});

beforeEach(async () => { await clearWorkspaceCache(); });

describe('private IndexedDB cache', () => {
  it('isolates the stored data between account identifiers', async () => {
    await writeWorkspaceCache('account-a', data('A private draft'));
    await writeWorkspaceCache('account-b', data('B private draft'));
    expect((await readWorkspaceCache('account-a'))?.contents[0]?.title).toBe('A private draft');
    expect((await readWorkspaceCache('account-b'))?.contents[0]?.title).toBe('B private draft');
    await clearWorkspaceCache('account-a');
    expect(await readWorkspaceCache('account-a')).toBeUndefined();
    expect((await readWorkspaceCache('account-b'))?.contents[0]?.title).toBe('B private draft');
  });

  it('removes a corrupted account entry and surfaces the cache issue', async () => {
    const { openDB } = await import('idb');
    const db = await openDB('elara-private-cache', 2);
    await db.put('workspaces', { brands: 'invalid', profiles: [], contents: [] }, 'account-corrupt');
    await expect(readWorkspaceCache('account-corrupt')).rejects.toThrow('cache locale era danneggiata');
    expect(await readWorkspaceCache('account-corrupt')).toBeUndefined();
  });
});
