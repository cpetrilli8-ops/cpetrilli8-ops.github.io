import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { readWorkspaceCache, writeWorkspaceCache } from './cache';
import type { Brand, ContentItem, SocialProfile, WorkspaceData } from '../types';
import { brandSchema, contentSchema, profileSchema } from './validation';

function requireClient() {
  if (!supabase) throw new Error('Supabase non è configurato. Completa la configurazione per usare i dati cloud.');
  return supabase;
}
function requireOnline() {
  if (!navigator.onLine) throw new Error('Sei offline. Le modifiche richiedono una connessione; puoi consultare i dati già in cache.');
}

export async function loadWorkspace(
  user: User,
  signal: AbortSignal,
  isCurrentUser: () => boolean,
  onCacheError?: (error: Error) => void,
): Promise<WorkspaceData> {
  const client = requireClient();
  const [brands, profiles, contents] = await Promise.all([
    client.from('brands').select('*').eq('owner_id', user.id).order('created_at').abortSignal(signal),
    client.from('social_profiles').select('*').eq('owner_id', user.id).order('created_at').abortSignal(signal),
    client.from('contents').select('*').eq('owner_id', user.id).order('scheduled_at', { nullsFirst: false }).abortSignal(signal),
  ]);
  if (!isCurrentUser()) throw new DOMException('Account changed during data fetch.', 'AbortError');
  const error = brands.error ?? profiles.error ?? contents.error;
  if (!error) {
    const data = { brands: brands.data as Brand[], profiles: profiles.data as SocialProfile[], contents: contents.data as ContentItem[] };
    try { if (isCurrentUser()) await writeWorkspaceCache(user.id, data); }
    catch (cause) { onCacheError?.(cause instanceof Error ? cause : new Error('Cache locale non disponibile.')); }
    return data;
  }
  if (error.code === 'PGRST301' || error.code === 'JWT_EXPIRED') throw new Error('Sessione scaduta. Accedi di nuovo per sincronizzare.');
  const cached = await readWorkspaceCache(user.id);
  if (!isCurrentUser()) throw new DOMException('Account changed during offline fallback.', 'AbortError');
  if (cached) return cached;
  throw new Error(navigator.onLine ? error.message : 'Offline e nessun dato memorizzato per questo account.');
}

export async function saveBrand(user: User, values: unknown, id?: string) {
  requireOnline();
  const parsed = brandSchema.parse(values);
  const client = requireClient();
  const result = id
    ? await client.from('brands').update(parsed).eq('id', id).eq('owner_id', user.id).select().single()
    : await client.from('brands').insert({ ...parsed, owner_id: user.id }).select().single();
  if (result.error) throw new Error(result.error.message);
  return result.data as Brand;
}
export async function saveProfile(user: User, values: unknown, id?: string) {
  requireOnline();
  const parsed = profileSchema.parse(values);
  const client = requireClient();
  const result = id
    ? await client.from('social_profiles').update(parsed).eq('id', id).eq('owner_id', user.id).select().single()
    : await client.from('social_profiles').insert({ ...parsed, owner_id: user.id }).select().single();
  if (result.error) throw new Error(result.error.message);
  return result.data as SocialProfile;
}
export async function saveContent(user: User, values: unknown, id?: string) {
  requireOnline();
  const parsed = contentSchema.parse(values);
  const client = requireClient();
  const result = id
    ? await client.from('contents').update(parsed).eq('id', id).eq('owner_id', user.id).select().single()
    : await client.from('contents').insert({ ...parsed, owner_id: user.id }).select().single();
  if (result.error) throw new Error(result.error.message);
  return result.data as ContentItem;
}
export async function deleteRecord(user: User, table: 'brands' | 'social_profiles' | 'contents', id: string) {
  requireOnline();
  const { error } = await requireClient().from(table).delete().eq('id', id).eq('owner_id', user.id);
  if (error) throw new Error(error.message);
}
export async function saveProfileName(user: User, firstName: string, lastName: string) {
  requireOnline();
  const client = requireClient();
  const first = firstName.trim();
  const last = lastName.trim();
  const { error } = await client.from('profiles').upsert({ id: user.id, first_name: first, last_name: last });
  if (error) throw new Error(error.message);
  const { error: metadataError } = await client.auth.updateUser({ data: { first_name: first, last_name: last } });
  if (metadataError) throw new Error(metadataError.message);
}
