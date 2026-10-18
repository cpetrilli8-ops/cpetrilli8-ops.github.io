import { z } from 'zod';
import type { ContentFormat, ContentStatus, Platform } from '../types';

export const platforms = ['Instagram', 'TikTok', 'Facebook', 'LinkedIn', 'YouTube', 'Pinterest', 'Altro'] as const satisfies readonly Platform[];
export const formats = ['Reel', 'Post', 'Carousel', 'Story', 'Video', 'Articolo', 'Altro'] as const satisfies readonly ContentFormat[];
export const statuses = ['idea', 'draft', 'ready', 'published'] as const satisfies readonly ContentStatus[];

const text = (max: number) => z.string().trim().max(max);
export const brandSchema = z.object({
  name: z.string().trim().min(1, 'Inserisci il nome del brand.').max(120),
  description: text(3000).default(''),
  identity: text(3000).default(''),
  references: text(3000).default(''),
});
export const profileSchema = z.object({
  brand_id: z.string().uuid().nullable(),
  platform: z.enum(platforms),
  handle: z.string().trim().min(1).max(120),
  url: z.string().trim().max(2048).refine((value) => !value || /^https?:\/\//i.test(value), 'Inserisci un URL http o https valido.').default(''),
});
export const contentSchema = z.object({
  title: z.string().trim().min(1, 'Inserisci un titolo.').max(200),
  brand_id: z.string().uuid().nullable(),
  social_profile_id: z.string().uuid().nullable(),
  platform: z.enum(platforms),
  format: z.enum(formats),
  pillar: text(120).default(''),
  status: z.enum(statuses),
  scheduled_at: z.string().datetime({ offset: true }).nullable(),
  script: text(30000).default(''),
  notes: text(10000).default(''),
}).refine((item) => !item.social_profile_id || Boolean(item.brand_id), {
  message: 'Seleziona un brand per associare un profilo social.',
  path: ['social_profile_id'],
});

const brandImportSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  description: text(3000),
  identity: text(3000),
  references: text(3000),
});
const profileImportSchema = z.object({
  id: z.string().uuid().optional(),
  brand_id: z.string().uuid().nullable(),
  platform: z.enum(platforms),
  handle: z.string().trim().min(1).max(120),
  url: z.string().trim().max(2048),
});
const contentImportSchema = z.object({
  id: z.string().uuid().optional(),
  brand_id: z.string().uuid().nullable(),
  social_profile_id: z.string().uuid().nullable(),
  title: z.string().trim().min(1).max(200),
  platform: z.enum(platforms),
  format: z.enum(formats),
  pillar: text(120),
  status: z.enum(statuses),
  scheduled_at: z.string().datetime({ offset: true }).nullable(),
  script: text(30000),
  notes: text(10000),
});
export const importSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string().datetime({ offset: true }),
  profile: z.object({
    first_name: z.string().trim().min(1).max(80),
    last_name: z.string().trim().max(80),
    email: z.string().email().max(320),
  }).optional(),
  brands: z.array(brandImportSchema).max(500),
  profiles: z.array(profileImportSchema).max(1000),
  contents: z.array(contentImportSchema).max(5000),
});
