import type { SupabaseClient } from '@supabase/supabase-js';

type CallbackClient = Pick<SupabaseClient, 'auth'>;

export async function completeAuthCallback(client: CallbackClient, callbackUrl: string) {
  const url = new URL(callbackUrl);
  const fragment = new URLSearchParams(url.hash.slice(1));
  const code = url.searchParams.get('code');
  const accessToken = fragment.get('access_token');
  const refreshToken = fragment.get('refresh_token');

  if (code) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    return { error, recovery: url.searchParams.get('type') === 'recovery' };
  }
  if (accessToken && refreshToken) {
    const { error } = await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    return { error, recovery: url.searchParams.get('type') === 'recovery' || fragment.get('type') === 'recovery' };
  }
  return { error: new Error('Il link non contiene una sessione valida.'), recovery: false };
}
