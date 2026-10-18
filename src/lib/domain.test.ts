import { describe, expect, it } from 'vitest';
import type { ContentItem } from '../types';
import { filterContents, groupContentsByDate, groupContentsByStatus } from './domain';

const items = [
  { id: 'idea', title: 'Moodboard', status: 'idea', platform: 'Instagram', format: 'Carousel', brand_id: 'brand-a', scheduled_at: null, pillar: 'Inspo', script: '', notes: '' },
  { id: 'ready', title: 'Behind the scenes', status: 'ready', platform: 'Instagram', format: 'Reel', brand_id: 'brand-a', scheduled_at: '2026-10-19T10:00:00.000Z', pillar: 'Studio', script: 'Set', notes: '' },
  { id: 'published', title: 'Autumn edit', status: 'published', platform: 'Instagram', format: 'Post', brand_id: 'brand-b', scheduled_at: '2026-10-19T12:00:00.000Z', pillar: '', script: '', notes: '' },
] as ContentItem[];

describe('content views share the same source records', () => {
  it('filters by search, status, and brand together', () => {
    expect(filterContents(items, { query: 'set', status: 'ready', brandId: 'brand-a', brandNames: { 'brand-a': 'Atelier' } }).map((item) => item.id)).toEqual(['ready']);
    expect(filterContents(items, { query: 'instagram' }).map((item) => item.id)).toEqual(['idea', 'ready', 'published']);
    expect(filterContents(items, { status: 'draft' })).toEqual([]);
  });

  it('groups every record once by its status', () => {
    const groups = groupContentsByStatus(items);
    expect(Object.values(groups).flat().map((item) => item.id).sort()).toEqual(['idea', 'published', 'ready']);
  });

  it('includes scheduled content in calendar dates and omits unscheduled ideas', () => {
    const groups = groupContentsByDate(items);
    expect(groups['2026-10-19']?.map((item) => item.id)).toEqual(['ready', 'published']);
    expect(Object.values(groups).flat()).toHaveLength(2);
  });
});
