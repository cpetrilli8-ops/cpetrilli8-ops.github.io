export type ContentStatus = 'idea' | 'draft' | 'ready' | 'published';
export type Platform = 'Instagram' | 'TikTok' | 'Facebook' | 'LinkedIn' | 'YouTube' | 'Pinterest' | 'Altro';
export type ContentFormat = 'Reel' | 'Post' | 'Carousel' | 'Story' | 'Video' | 'Articolo' | 'Altro';

export interface Brand {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  identity: string;
  references: string;
  created_at: string;
}

export interface SocialProfile {
  id: string;
  owner_id: string;
  brand_id: string | null;
  platform: Platform;
  handle: string;
  url: string;
  created_at: string;
}

export interface ContentItem {
  id: string;
  owner_id: string;
  brand_id: string | null;
  social_profile_id: string | null;
  title: string;
  platform: Platform;
  format: ContentFormat;
  pillar: string;
  status: ContentStatus;
  scheduled_at: string | null;
  script: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceData {
  brands: Brand[];
  profiles: SocialProfile[];
  contents: ContentItem[];
}

export interface ImportBundle {
  version: 1;
  exportedAt: string;
  profile?: { first_name: string; last_name: string; email: string };
  brands: Array<Pick<Brand, 'name' | 'description' | 'identity' | 'references'> & { id?: string }>;
  profiles: Array<Pick<SocialProfile, 'brand_id' | 'platform' | 'handle' | 'url'> & { id?: string }>;
  contents: Array<Pick<ContentItem, 'brand_id' | 'social_profile_id' | 'title' | 'platform' | 'format' | 'pillar' | 'status' | 'scheduled_at' | 'script' | 'notes'> & { id?: string }>;
}
