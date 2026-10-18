import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { App as NativeApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { LockKeyhole, Mail, Sparkles } from 'lucide-react';
import { clearWorkspaceCache } from './lib/cache';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import { loginWithEmail, logout, registerWithEmail, requestPasswordReset, updatePassword } from './lib/auth-actions';
import { completeAuthCallback } from './lib/auth-callback';
import { queryClient } from './main';
import { APP_ID } from './lib/app-identity';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  cacheWarning: string;
  signOut: () => Promise<void>;
}
const AuthContext = createContext<AuthContextValue | null>(null);
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth deve essere usato dentro AuthProvider.');
  return value;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [cacheWarning, setCacheWarning] = useState('');
  const userIdRef = useRef<string | undefined>(undefined);
  const [loading, setLoading] = useState(Boolean(supabase));
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    const { data } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!active) return;
      const previousUser = userIdRef.current;
      const nextUser = nextSession?.user.id;
      userIdRef.current = nextUser;
      if (previousUser && previousUser !== nextUser) {
        setSession(null);
        await queryClient.cancelQueries();
        queryClient.clear();
        try { await clearWorkspaceCache(previousUser); }
        catch (error) {
          const warning = error instanceof Error ? error.message : 'Cache locale non rimossa al cambio account.';
          setCacheWarning(warning);
          console.error('Cache privata non rimossa al cambio account:', warning);
        }
      }
      setSession(nextSession);
      setLoading(false);
    });
    void supabase.auth.getSession().then(({ data: result, error }) => {
      if (!active) return;
      if (error) {
        setCacheWarning('Sessione non ripristinata. Accedi di nuovo per continuare.');
        console.error('Sessione non ripristinata:', error.message);
      }
      userIdRef.current = result.session?.user.id;
      setSession(result.session);
      setLoading(false);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user: session?.user ?? null,
    session,
    loading,
    cacheWarning,
    signOut: async () => {
      if (!supabase) throw new Error('Supabase non è configurato.');
      const userId = session?.user.id;
      await logout(supabase);
      queryClient.clear();
      if (userId) await clearWorkspaceCache(userId);
      setSession(null);
    },
  }), [cacheWarning, loading, session]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function SetupNotice() {
  return <div className="setup-notice" role="status">Per attivare l’account collega il progetto Supabase configurando <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code>.</div>;
}

function AuthLayout({ children, title, description }: { children?: React.ReactNode; title: string; description: string }) {
  return (
    <main className="auth-screen">
      <section className="auth-card">
        <Link className="brand auth-brand" to="/login" aria-label="Elara Studio, home"><span className="brand-symbol">E</span><span>elara <small>studio</small></span></Link>
        <div className="auth-heading"><p className="eyebrow">Il tuo spazio creativo</p><h1>{title}</h1><p>{description}</p></div>
        {!isSupabaseConfigured && <SetupNotice />}
        {children}
        <p className="auth-mantra">Qui prendono forma le tue idee.</p>
      </section>
    </main>
  );
}

function AuthForm({ mode }: { mode: 'login' | 'register' | 'recover' | 'update' }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { cacheWarning } = useAuth();
  const titles = {
    login: ['Bentornata', 'Accedi al tuo studio creativo.'],
    register: ['Crea il tuo spazio', 'Un posto tutto tuo per le idee, i brand e i contenuti.'],
    recover: ['Recupera l’accesso', 'Ti invieremo un link per reimpostare la password.'],
    update: ['Scegli una password', 'Imposta una nuova password sicura per il tuo account.'],
  } as const;
  const callbackUrl = (nativeType?: 'recovery') => {
    if (Capacitor.isNativePlatform()) return `${APP_ID}://auth/callback${nativeType ? `?type=${nativeType}` : ''}`;
    const configuredUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    const origin = new URL(configuredUrl);
    if (import.meta.env.PROD && (origin.protocol !== 'https:' || ['localhost', '127.0.0.1', '::1'].includes(origin.hostname))) {
      throw new Error('Configura VITE_APP_URL con il dominio HTTPS pubblico prima del rilascio.');
    }
    return `${origin.origin}/auth/callback${nativeType ? '?type=recovery' : ''}`;
  };
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    if (!supabase) { setBusy(false); setError('Servizio non configurato.'); return; }
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim();
    try {
      if (mode === 'register') {
        const firstName = String(form.get('first_name') ?? '').trim();
        const lastName = String(form.get('last_name') ?? '').trim();
        const password = String(form.get('password') ?? '');
        await registerWithEmail(supabase, { firstName, lastName, email, password, redirectTo: callbackUrl() });
        setMessage('Registrazione avviata. Controlla la tua email per confermare l’indirizzo e attivare l’account.');
      } else if (mode === 'login') {
        await loginWithEmail(supabase, email, String(form.get('password') ?? ''));
        navigate('/');
      } else if (mode === 'recover') {
        await requestPasswordReset(supabase, email, callbackUrl('recovery'));
        setMessage('Se l’indirizzo corrisponde a un account, riceverai un link di reimpostazione.');
      } else {
        const password = String(form.get('password') ?? '');
        await updatePassword(supabase, password);
        setMessage('Password aggiornata. Ora puoi usare il tuo account.');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Operazione non riuscita. Riprova.');
    } finally { setBusy(false); }
  }
  const [title, description] = titles[mode];
  return (
    <AuthLayout title={title} description={description}>
      <form className="auth-form" onSubmit={submit}>
        {mode === 'register' && <div className="field-row">
          <Field label="Nome" name="first_name" autoComplete="given-name" required />
          <Field label="Cognome" name="last_name" autoComplete="family-name" required />
        </div>}
        {mode !== 'update' && <label className="field"><span>Email</span><span className="input-wrap"><Mail size={17} aria-hidden="true" /><input name="email" type="email" autoComplete="email" placeholder="tu@esempio.com" required /></span></label>}
        {(mode === 'login' || mode === 'register' || mode === 'update') && <label className="field"><span>Password</span><span className="input-wrap"><LockKeyhole size={17} aria-hidden="true" /><input name="password" type="password" minLength={10} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="Almeno 10 caratteri" required /></span></label>}
        {error && <p className="form-message error" role="alert">{error}</p>}
        {location.state?.message && <p className="form-message" role="status">{String(location.state.message)}</p>}
        {cacheWarning && <p className="form-message error" role="alert">{cacheWarning}</p>}
        {message && <p className="form-message success" role="status">{message}</p>}
        <button className="button primary auth-submit" disabled={busy || !isSupabaseConfigured}>
          <Sparkles size={16} aria-hidden="true" />{busy ? 'Un momento…' : mode === 'register' ? 'Crea account' : mode === 'recover' ? 'Invia link' : mode === 'update' ? 'Aggiorna password' : 'Accedi'}
        </button>
      </form>
      <div className="auth-links">
        {mode === 'login' && <><Link to="/register">Crea account</Link><Link to="/recover">Password dimenticata?</Link></>}
        {mode === 'register' && <Link to="/login">Hai già un account? Accedi</Link>}
        {mode === 'recover' && <Link to="/login">Torna all’accesso</Link>}
        {mode === 'update' && <Link to="/login">Vai all’accesso</Link>}
      </div>
    </AuthLayout>
  );
}

function Field({ label, name, autoComplete, required }: { label: string; name: string; autoComplete: string; required?: boolean }) {
  return <label className="field"><span>{label}</span><span className="input-wrap"><input name={name} autoComplete={autoComplete} placeholder={label} required={required} /></span></label>;
}

function CallbackPage() {
  const navigate = useNavigate();
  useEffect(() => {
    const client = supabase;
    if (!client) return;
    void completeAuthCallback(client, window.location.href).then(({ error, recovery }) => {
      if (error) navigate('/login', { replace: true, state: { message: 'Impossibile verificare il link. Richiedine uno nuovo.' } });
      else navigate(recovery ? '/auth/reset' : '/', { replace: true });
    }).catch(() => navigate('/login', { replace: true, state: { message: 'Impossibile verificare il link. Richiedine uno nuovo.' } }));
  }, [navigate]);
  return <AuthLayout title="Un attimo ancora" description="Stiamo verificando il tuo link sicuro." />;
}

function NativeDeepLinkHandler() {
  const navigate = useNavigate();
  useEffect(() => {
    const client = supabase;
    if (!client || !Capacitor.isNativePlatform()) return;
    let active = true;
    const handledUrls = new Set<string>();
    const handle = async (url: string) => {
      if (!url.includes('auth/callback')) return;
      if (handledUrls.has(url)) return;
      handledUrls.add(url);
      try {
        const { error, recovery } = await completeAuthCallback(client, url);
        if (!active) return;
        if (error) navigate('/login', { replace: true, state: { message: 'Il link non è valido o è scaduto. Richiedine uno nuovo.' } });
        else navigate(recovery ? '/auth/reset' : '/', { replace: true });
      } catch {
        if (active) navigate('/login', { replace: true, state: { message: 'Il link non è valido o è scaduto. Richiedine uno nuovo.' } });
      }
    };
    const listener = NativeApp.addListener('appUrlOpen', ({ url }) => { void handle(url); });
    void NativeApp.getLaunchUrl().then((launch) => { if (launch?.url) return handle(launch.url); })
      .catch(() => { if (active) navigate('/login', { replace: true, state: { message: 'Impossibile leggere il link di accesso.' } }); });
    return () => { active = false; void listener.then((value) => value.remove()); };
  }, [navigate]);
  return null;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Elara Studio</div>;
  return user ? children : <Navigate to="/login" replace />;
}

export function AuthRoutes({ workspace }: { workspace: React.ReactNode }) {
  return <AuthProvider><NativeDeepLinkHandler /><Routes>
    <Route path="/login" element={<AuthForm mode="login" />} />
    <Route path="/register" element={<AuthForm mode="register" />} />
    <Route path="/recover" element={<AuthForm mode="recover" />} />
    <Route path="/auth/reset" element={<AuthForm mode="update" />} />
    <Route path="/auth/callback" element={<CallbackPage />} />
    <Route path="*" element={<ProtectedRoute>{workspace}</ProtectedRoute>} />
  </Routes></AuthProvider>;
}
