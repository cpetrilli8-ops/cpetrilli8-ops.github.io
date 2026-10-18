import type { SupabaseClient } from '@supabase/supabase-js';

type AuthActionClient = Pick<SupabaseClient, 'auth'>;

export async function registerWithEmail(
  client: AuthActionClient,
  input: { firstName: string; lastName: string; email: string; password: string; redirectTo: string },
) {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (!firstName || !lastName) throw new Error('Inserisci nome e cognome.');
  if (input.password.length < 10) throw new Error('La password deve contenere almeno 10 caratteri.');
  const { data, error } = await client.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: { data: { first_name: firstName, last_name: lastName }, emailRedirectTo: input.redirectTo },
  });
  if (error) throw error;
  return data;
}

export async function loginWithEmail(client: AuthActionClient, email: string, password: string) {
  const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
  return data;
}

export async function requestPasswordReset(client: AuthActionClient, email: string, redirectTo: string) {
  const { error } = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo });
  if (error) throw error;
}

export async function updatePassword(client: AuthActionClient, password: string) {
  if (password.length < 10) throw new Error('La password deve contenere almeno 10 caratteri.');
  const { data, error } = await client.auth.updateUser({ password });
  if (error) throw error;
  return data;
}

export async function logout(client: AuthActionClient) {
  const { error } = await client.auth.signOut({ scope: 'local' });
  if (error) throw error;
}
