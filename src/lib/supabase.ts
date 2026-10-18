import { Capacitor } from '@capacitor/core';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { createClient, type SupportedStorage } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
function isAllowedSupabaseUrl(value: string | undefined) {
  if (!value || value.includes('your-project')) return false;
  try {
    const endpoint = new URL(value);
    const localHost = ['localhost', '127.0.0.1', '::1'].includes(endpoint.hostname);
    return ['http:', 'https:'].includes(endpoint.protocol) &&
      !(import.meta.env.PROD && localHost) &&
      !endpoint.username && !endpoint.password;
  } catch {
    return false;
  }
}
export const isSupabaseConfigured = Boolean(
  isAllowedSupabaseUrl(url) && anonKey && !anonKey.includes('your-public-anon-key'),
);

const nativeStorage: SupportedStorage = {
  getItem: (key) => SecureStorage.getItem(key),
  setItem: (key, value) => SecureStorage.setItem(key, value),
  removeItem: (key) => SecureStorage.removeItem(key),
};

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        storage: Capacitor.isNativePlatform() ? nativeStorage : localStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;
