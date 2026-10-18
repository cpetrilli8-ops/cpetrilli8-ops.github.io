import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { completeAuthCallback } from './auth-callback';

function callbackClient(auth: Record<string, ReturnType<typeof vi.fn>>) {
  return { auth } as unknown as SupabaseClient;
}

describe('authentication callback handling', () => {
  it('exchanges email-confirmation codes and detects recovery links', async () => {
    const exchangeCodeForSession = vi.fn().mockResolvedValue({ error: null });
    const result = await completeAuthCallback(
      callbackClient({ exchangeCodeForSession }),
      'https://elara.example/auth/callback?code=one-time-code&type=recovery',
    );
    expect(exchangeCodeForSession).toHaveBeenCalledWith('one-time-code');
    expect(result).toEqual({ error: null, recovery: true });
  });

  it('restores a native implicit callback session from URL fragments', async () => {
    const setSession = vi.fn().mockResolvedValue({ error: null });
    const result = await completeAuthCallback(
      callbackClient({ setSession }),
      'com.elarastudio.app://auth/callback#access_token=access&refresh_token=refresh&type=recovery',
    );
    expect(setSession).toHaveBeenCalledWith({ access_token: 'access', refresh_token: 'refresh' });
    expect(result.recovery).toBe(true);
  });

  it('rejects callback URLs without a code or session tokens', async () => {
    await expect(completeAuthCallback(callbackClient({}), 'https://elara.example/auth/callback')).resolves.toMatchObject({
      recovery: false, error: expect.objectContaining({ message: 'Il link non contiene una sessione valida.' }),
    });
  });
});
