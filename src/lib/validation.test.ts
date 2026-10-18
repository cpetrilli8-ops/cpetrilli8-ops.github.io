import { describe, expect, it } from 'vitest';
import { contentSchema, importSchema } from './validation';

describe('content validation', () => {
  it('requires a title and brand when a social profile is associated', () => {
    expect(contentSchema.safeParse({
      title: '', brand_id: null, social_profile_id: '40000000-0000-4000-8000-000000000004',
      platform: 'Instagram', format: 'Post', status: 'idea', scheduled_at: null,
    }).success).toBe(false);
  });

  it('accepts a valid planned content item and bounds long fields', () => {
    const valid = contentSchema.safeParse({
      title: 'Nuova idea', brand_id: null, social_profile_id: null, platform: 'Instagram',
      format: 'Reel', pillar: 'Dietro le quinte', status: 'ready',
      scheduled_at: '2026-10-20T09:30:00.000Z', script: 'Test', notes: '',
    });
    expect(valid.success).toBe(true);
    expect(contentSchema.safeParse({
      title: 'Titolo', brand_id: null, social_profile_id: null, platform: 'Instagram', format: 'Post',
      pillar: '', status: 'idea', scheduled_at: null, script: 'x'.repeat(30001), notes: '',
    }).success).toBe(false);
  });
});

describe('JSON import validation', () => {
  it('rejects unsupported versions and malformed associations', () => {
    expect(importSchema.safeParse({ version: 2, exportedAt: new Date().toISOString(), brands: [], profiles: [], contents: [] }).success).toBe(false);
  });

  it('validates portable references but never returns imported owner identifiers', () => {
    const id = '30000000-0000-4000-8000-000000000003';
    const result = importSchema.parse({
      version: 1, exportedAt: new Date().toISOString(),
      owner_id: '20000000-0000-4000-8000-000000000002',
      brands: [{ id, name: 'Brand', description: '', identity: '', references: '', owner_id: '20000000-0000-4000-8000-000000000002' }],
      profiles: [], contents: [],
    });
    expect(result.brands[0]?.id).toBe(id);
    expect(result.brands[0]).not.toHaveProperty('owner_id');
    expect(result).not.toHaveProperty('owner_id');
  });
});
