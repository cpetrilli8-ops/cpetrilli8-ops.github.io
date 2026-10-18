import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { loginWithEmail, logout, registerWithEmail, requestPasswordReset, updatePassword } from './auth-actions';

function clientWithAuth(auth: Record<string, ReturnType<typeof vi.fn>>) {
  return { auth } as unknown as SupabaseClient;
}

describe('Supabase email authentication actions', () => {
  it('registers with names in auth metadata and a confirmation callback', async () => {
    const signUp = vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' }, session: null }, error: null });
    await registerWithEmail(clientWithAuth({ signUp }), {
      firstName: ' Ada ', lastName: ' Lovelace ', email: ' ada@example.test ',
      password: 'safe-password-123', redirectTo: 'https://elara.example/auth/callback',
    });
    expect(signUp).toHaveBeenCalledWith({
      email: 'ada@example.test', password: 'safe-password-123',
      options: { data: { first_name: 'Ada', last_name: 'Lovelace' }, emailRedirectTo: 'https://elara.example/auth/callback' },
    });
  });

  it('rejects incomplete registration and short passwords before calling Supabase', async () => {
    const signUp = vi.fn();
    await expect(registerWithEmail(clientWithAuth({ signUp }), {
      firstName: '', lastName: 'Test', email: 'a@example.test', password: '123', redirectTo: '/',
    })).rejects.toThrow('Inserisci nome e cognome');
    expect(signUp).not.toHaveBeenCalled();
  });

  it('logs in and propagates authentication errors', async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    await loginWithEmail(clientWithAuth({ signInWithPassword }), ' user@example.test ', 'secret');
    expect(signInWithPassword).toHaveBeenCalledWith({ email: 'user@example.test', password: 'secret' });
    const failed = vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('Credenziali non valide') });
    await expect(loginWithEmail(clientWithAuth({ signInWithPassword: failed }), 'user@example.test', 'wrong')).rejects.toThrow('Credenziali non valide');
  });

  it('requests password recovery with an allowlisted callback and updates passwords', async () => {
    const resetPasswordForEmail = vi.fn().mockResolvedValue({ error: null });
    await requestPasswordReset(clientWithAuth({ resetPasswordForEmail }), ' user@example.test ', 'https://elara.example/auth/reset');
    expect(resetPasswordForEmail).toHaveBeenCalledWith('user@example.test', { redirectTo: 'https://elara.example/auth/reset' });
    const updateUser = vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    await updatePassword(clientWithAuth({ updateUser }), 'new-safe-password');
    expect(updateUser).toHaveBeenCalledWith({ password: 'new-safe-password' });
  });

  it('logs out only after Supabase confirms success', async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null });
    await logout(clientWithAuth({ signOut }));
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
    const failed = vi.fn().mockResolvedValue({ error: new Error('Sessione scaduta') });
    await expect(logout(clientWithAuth({ signOut: failed }))).rejects.toThrow('Sessione scaduta');
  });
});
