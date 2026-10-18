import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowDownToLine, ArrowLeft, ArrowRight, Bell, CalendarDays, CircleHelp,
  Clapperboard, ClipboardList, Download, FileUp, Filter, Grid2X2, Instagram, LayoutDashboard,
  List, LoaderCircle, LogOut, Menu, Pencil, Plus, Search, Settings,
  Sparkles, Trash2, Users, WandSparkles, X,
} from 'lucide-react';
import { App as NativeApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { AuthRoutes, useAuth } from './Auth';
import type { Brand, ContentItem, ContentStatus, ImportBundle, SocialProfile, WorkspaceData } from './types';
import { loadWorkspace, deleteRecord, saveBrand, saveContent, saveProfile, saveProfileName } from './lib/data';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import { importSchema, platforms, formats, statuses } from './lib/validation';
import { clearUserLogo, readUserLogo, readWorkspaceCache, writeUserLogo } from './lib/cache';
import { filterContents, groupContentsByDate, groupContentsByStatus } from './lib/domain';

type Section = 'overview' | 'content' | 'calendar' | 'brands' | 'social' | 'manager' | 'settings';
const navItems: { id: Section; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Panoramica', icon: LayoutDashboard },
  { id: 'content', label: 'Contenuti', icon: Clapperboard },
  { id: 'calendar', label: 'Calendario', icon: CalendarDays },
  { id: 'brands', label: 'Pagine / brand', icon: Sparkles },
  { id: 'social', label: 'Profili social', icon: Instagram },
  { id: 'manager', label: 'Social media manager', icon: Users },
  { id: 'settings', label: 'Impostazioni', icon: Settings },
];
const statusLabels: Record<ContentStatus, string> = { idea: 'Idea', draft: 'In lavorazione', ready: 'Pronto', published: 'Pubblicato' };
const emptyWorkspace: WorkspaceData = { brands: [], profiles: [], contents: [] };
const today = new Date();
const dateText = (value: string | null) => value
  ? new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
  : 'Da pianificare';
const dateOnly = (value: string | null) => value ? new Date(value).toLocaleDateString('sv-SE') : '';
const datetimeInput = (value: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

function App() {
  return <AuthRoutes workspace={<Studio />} />;
}

function Studio() {
  const { user, signOut, cacheWarning } = useAuth();
  const client = useQueryClient();
  const navigate = useNavigate();
  const [section, setSection] = useState<Section>('overview');
  const [menuOpen, setMenuOpen] = useState(false);
  const [contentDraft, setContentDraft] = useState<ContentItem | null | undefined>(undefined);
  const [entityDraft, setEntityDraft] = useState<{ kind: 'brand' | 'profile'; item?: Brand | SocialProfile } | null>(null);
  const [notice, setNotice] = useState('');
  const [online, setOnline] = useState(() => navigator.onLine);
  const [logo, setLogo] = useState('');
  const currentUserId = useRef(user?.id);
  currentUserId.current = user?.id;
  const workspaceQuery = useQuery({
    queryKey: ['workspace', user?.id],
    queryFn: ({ signal }) => {
      if (!user) throw new Error('Accedi per caricare il workspace.');
      return loadWorkspace(user, signal, () => currentUserId.current === user.id, (error) => setNotice(error.message));
    },
    enabled: Boolean(user && isSupabaseConfigured),
  });
  const data = workspaceQuery.data ?? emptyWorkspace;
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  useEffect(() => { if (cacheWarning) setNotice(cacheWarning); }, [cacheWarning]);
  useEffect(() => {
    if (!user) return;
    let active = true;
    void readWorkspaceCache(user.id).then((cached) => {
      if (active && currentUserId.current === user.id && cached) {
        client.setQueryData<WorkspaceData>(['workspace', user.id], (current) => current ?? cached);
      }
    }).catch((error: unknown) => {
      if (active && error instanceof Error) setNotice(error.message);
    });
    return () => { active = false; };
  }, [client, user]);
  useEffect(() => {
    if (!user) { setLogo(''); return; }
    let active = true;
    void readUserLogo(user.id).then((saved) => { if (active) setLogo(saved ?? ''); })
      .catch((error: unknown) => { if (active) setNotice(error instanceof Error ? error.message : 'Logo locale non disponibile.'); });
    return () => { active = false; };
  }, [user]);
  const refresh = () => client.invalidateQueries({ queryKey: ['workspace', user?.id] });
  const contentMutation = useMutation({
    mutationFn: ({ values, id }: { values: unknown; id?: string }) => saveContent(user!, values, id),
    onSuccess: refresh,
    onError: (error: Error) => setNotice(error.message),
  });
  const brandMutation = useMutation({
    mutationFn: ({ values, id }: { values: unknown; id?: string }) => saveBrand(user!, values, id),
    onSuccess: refresh,
    onError: (error: Error) => setNotice(error.message),
  });
  const profileMutation = useMutation({
    mutationFn: ({ values, id }: { values: unknown; id?: string }) => saveProfile(user!, values, id),
    onSuccess: refresh,
    onError: (error: Error) => setNotice(error.message),
  });
  const deleteMutation = useMutation({
    mutationFn: ({ table, id }: { table: 'brands' | 'social_profiles' | 'contents'; id: string }) => deleteRecord(user!, table, id),
    onSuccess: refresh,
    onError: (error: Error) => setNotice(error.message),
  });
  const profileNameMutation = useMutation({
    mutationFn: ({ firstName, lastName }: { firstName: string; lastName: string }) => saveProfileName(user!, firstName, lastName),
    onSuccess: () => setNotice('Profilo aggiornato.'),
    onError: (error: Error) => setNotice(error.message),
  });

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const back = NativeApp.addListener('backButton', () => {
      if (contentDraft !== undefined) setContentDraft(undefined);
      else if (entityDraft) setEntityDraft(null);
      else if (section !== 'overview') setSection('overview');
      else if (window.history.length > 1) navigate(-1);
      else void NativeApp.exitApp();
    });
    return () => { void back.then((handle) => handle.remove()); };
  }, [contentDraft, entityDraft, navigate, section]);

  const displayName = [user?.user_metadata.first_name, user?.user_metadata.last_name].filter(Boolean).join(' ') || user?.email?.split('@')[0] || 'Creator';
  const title = navItems.find((item) => item.id === section)?.label ?? 'Panoramica';

  async function remove(table: 'brands' | 'social_profiles' | 'contents', id: string, name: string) {
    if (!window.confirm(`Eliminare “${name}”? Questa azione non può essere annullata.`)) return;
    deleteMutation.mutate({ table, id });
  }
  function newContent(item?: ContentItem) { setContentDraft(item ?? null); }
  async function exportData() {
    const bundle: ImportBundle = {
      version: 1,
      exportedAt: new Date().toISOString(),
      profile: {
        first_name: String(user?.user_metadata.first_name ?? displayName.split(' ')[0] ?? ''),
        last_name: String(user?.user_metadata.last_name ?? displayName.split(' ').slice(1).join(' ')),
        email: user?.email ?? '',
      },
      brands: data.brands.map(({ id, name, description, identity, references }) => ({ id, name, description, identity, references })),
      profiles: data.profiles.map(({ id, brand_id, platform, handle, url }) => ({ id, brand_id, platform, handle, url })),
      contents: data.contents.map(({ id, brand_id, social_profile_id, title, platform, format, pillar, status, scheduled_at, script, notes }) => ({ id, brand_id, social_profile_id, title, platform, format, pillar, status, scheduled_at, script, notes })),
    };
    const file = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(file);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = `elara-studio-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click(); URL.revokeObjectURL(url);
  }
  async function uploadLogo(file: File) {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Il logo deve essere un file PNG, JPEG o WebP.');
    if (file.size > 1_500_000) throw new Error('Il logo supera il limite di 1,5 MB.');
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Non è stato possibile leggere il file.'));
      reader.onerror = () => reject(new Error('Non è stato possibile leggere il file.'));
      reader.readAsDataURL(file);
    });
    await writeUserLogo(user!.id, dataUrl);
    setLogo(dataUrl);
  }
  async function importFile(file: File) {
    if (file.size > 20 * 1024 * 1024) throw new Error('Il file supera il limite di 20 MB.');
    const parsed = importSchema.safeParse(JSON.parse(await file.text()));
    if (!parsed.success) throw new Error(`File non valido: ${parsed.error.issues[0]?.message ?? 'controlla struttura e campi.'}`);
    const bundle = parsed.data;
    const sourceBrands = new Set(bundle.brands.flatMap((brand) => brand.id ? [brand.id] : []));
    const sourceProfiles = new Set(bundle.profiles.flatMap((profile) => profile.id ? [profile.id] : []));
    if (bundle.brands.some((brand) => brand.id && bundle.brands.filter((item) => item.id === brand.id).length > 1)) throw new Error('Il file contiene identificativi brand duplicati.');
    if (bundle.profiles.some((profile) => profile.id && bundle.profiles.filter((item) => item.id === profile.id).length > 1)) throw new Error('Il file contiene identificativi profilo duplicati.');
    if (bundle.profiles.some((profile) => profile.brand_id && !sourceBrands.has(profile.brand_id))) throw new Error('Un profilo social fa riferimento a un brand assente dal file.');
    if (bundle.contents.some((content) => content.brand_id && !sourceBrands.has(content.brand_id))) throw new Error('Un contenuto fa riferimento a un brand assente dal file.');
    if (bundle.contents.some((content) => content.social_profile_id && !sourceProfiles.has(content.social_profile_id))) throw new Error('Un contenuto fa riferimento a un profilo social assente dal file.');
    if (bundle.contents.some((content) => {
      const profile = bundle.profiles.find((item) => item.id === content.social_profile_id);
      return Boolean(content.social_profile_id && (!content.brand_id || profile?.brand_id !== content.brand_id));
    })) throw new Error('Un contenuto collega un profilo social a un brand diverso.');
    const profilePreview = bundle.profile ? `\nProfilo incluso: ${bundle.profile.first_name} ${bundle.profile.last_name} (${bundle.profile.email}).` : '';
    const previewRows = [
      bundle.brands.length ? `Brand: ${bundle.brands.slice(0, 4).map((item) => item.name).join(', ')}${bundle.brands.length > 4 ? ', …' : ''}` : '',
      bundle.profiles.length ? `Profili: ${bundle.profiles.slice(0, 4).map((item) => `${item.platform} ${item.handle}`).join(', ')}${bundle.profiles.length > 4 ? ', …' : ''}` : '',
      bundle.contents.length ? `Contenuti: ${bundle.contents.slice(0, 4).map((item) => item.title).join(', ')}${bundle.contents.length > 4 ? ', …' : ''}` : '',
    ].filter(Boolean).join('\n');
    const confirmation = window.confirm(`Anteprima importazione:\n${bundle.brands.length} brand, ${bundle.profiles.length} profili social, ${bundle.contents.length} contenuti.${profilePreview}${previewRows ? `\n${previewRows}` : ''}\nI duplicati saranno ignorati; i dati esistenti non verranno sovrascritti o eliminati.\nContinuare?`);
    if (!confirmation) return;
    const brandMap = new Map<string, string>();
    let inserted = 0; let skipped = 0;
    const knownBrands = new Map(data.brands.map((brand) => [brand.name.toLocaleLowerCase(), brand.id]));
    for (const brand of bundle.brands) {
      const known = knownBrands.get(brand.name.toLocaleLowerCase());
      const saved = known ? { id: known } : await saveBrand(user!, brand);
      if (known) skipped++; else { inserted++; knownBrands.set(brand.name.toLocaleLowerCase(), saved.id); }
      if (brand.id) brandMap.set(brand.id, saved.id);
    }
    const profileMap = new Map<string, string>();
    const knownProfiles = new Map(data.profiles.map((profile) => [`${profile.platform}|${profile.handle.toLocaleLowerCase()}|${profile.brand_id ?? ''}`, profile.id]));
    for (const profile of bundle.profiles) {
      const mappedBrand = profile.brand_id ? brandMap.get(profile.brand_id) : null;
      if (profile.brand_id && !mappedBrand) throw new Error('Associazione brand non valida durante l’importazione.');
      const signature = `${profile.platform}|${profile.handle.toLocaleLowerCase()}|${mappedBrand ?? ''}`;
      const known = knownProfiles.get(signature);
      const saved = known ? { id: known } : await saveProfile(user!, { ...profile, brand_id: mappedBrand });
      if (known) skipped++; else { inserted++; knownProfiles.set(signature, saved.id); }
      if (profile.id) profileMap.set(profile.id, saved.id);
    }
    const knownContent = new Set(data.contents.map((item) => `${item.title.toLocaleLowerCase()}|${item.scheduled_at ?? ''}|${item.brand_id ?? ''}`));
    for (const content of bundle.contents) {
      const mappedBrand = content.brand_id ? brandMap.get(content.brand_id) : null;
      const mappedProfile = content.social_profile_id ? profileMap.get(content.social_profile_id) : null;
      if ((content.brand_id && !mappedBrand) || (content.social_profile_id && !mappedProfile)) throw new Error('Associazione non valida durante l’importazione dei contenuti.');
      const signature = `${content.title.toLocaleLowerCase()}|${content.scheduled_at ?? ''}|${mappedBrand ?? ''}`;
      if (knownContent.has(signature)) { skipped++; continue; }
      await saveContent(user!, { ...content, brand_id: mappedBrand, social_profile_id: mappedProfile });
      inserted++; knownContent.add(signature);
    }
    let profileUpdated = false;
    if (bundle.profile && (bundle.profile.first_name !== String(user?.user_metadata.first_name ?? '') || bundle.profile.last_name !== String(user?.user_metadata.last_name ?? ''))) {
      if (window.confirm(`Vuoi aggiornare il nome del profilo a “${bundle.profile.first_name} ${bundle.profile.last_name}”?`)) {
        await saveProfileName(user!, bundle.profile.first_name, bundle.profile.last_name);
        profileUpdated = true;
      }
    }
    await refresh();
    setNotice(`Importazione completata: ${inserted} record aggiunti, ${skipped} duplicati ignorati${profileUpdated ? ', profilo aggiornato' : ''}.`);
  }

  return (
    <div className="studio-shell">
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <Link to="/" className="brand side-brand" onClick={() => setSection('overview')}><BrandMark logo={logo} /><span>elara <small>studio</small></span></Link>
        <div className="workspace-label">IL TUO WORKSPACE</div>
        <nav className="side-nav" aria-label="Navigazione principale">
          {navItems.map(({ id, label, icon: Icon }) => <button className={`nav-item ${section === id ? 'selected' : ''}`} key={id} onClick={() => { setSection(id); setMenuOpen(false); }}><Icon size={18} aria-hidden="true" /><span>{label}</span></button>)}
        </nav>
        <div className="sidebar-bottom"><p>“Qui prendono forma<br />le tue idee.”</p><span>ELARA STUDIO · 01</span></div>
      </aside>
      {menuOpen && <button className="mobile-scrim" aria-label="Chiudi menu" onClick={() => setMenuOpen(false)} />}
      <main className="studio-main">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Apri menu"><Menu size={20} /></button>
          <div className="breadcrumb"><span>Elara Studio</span><span className="crumb-sep">/</span><strong>{title}</strong></div>
          <div className="top-actions"><span className={`connection-pill ${online ? 'online' : 'offline'}`}><i />{online ? 'Connesso' : 'Offline'}</span><button className="icon-button" aria-label="Nessuna notifica"><Bell size={18} /></button><div className="avatar" aria-label={`Account ${displayName}`}>{displayName.slice(0, 1).toUpperCase()}</div></div>
        </header>
        {!online && <div className="offline-banner" role="status">Modalità offline: puoi consultare dati memorizzati in precedenza. Le modifiche richiedono connessione.</div>}
        {!isSupabaseConfigured && <div className="offline-banner setup-banner" role="status">Collega Supabase per abilitare autenticazione e dati reali. Nessun contenuto dimostrativo viene creato automaticamente.</div>}
        {notice && <div className="toast" role="status">{notice}<button aria-label="Chiudi avviso" onClick={() => setNotice('')}><X size={16} /></button></div>}
        <div className="page-content">
          {workspaceQuery.isLoading ? <div className="loading-content"><LoaderCircle className="spin" /> Caricamento dei tuoi dati…</div>
            : workspaceQuery.error && !workspaceQuery.data ? <div className="error-card"><CircleHelp size={20} /><div><strong>Non è stato possibile caricare i dati.</strong><p>{workspaceQuery.error.message}</p><button className="button secondary small" onClick={() => void workspaceQuery.refetch()}>Riprova</button></div></div>
              : <WorkspaceSection section={section} data={data} name={displayName} email={user?.email ?? ''} onCreate={newContent} onEdit={newContent} onDelete={remove}
                onEntity={(kind, item) => setEntityDraft({ kind, item })} onExport={exportData}
                onImport={(file) => importFile(file).catch((error: unknown) => setNotice(`${error instanceof Error ? error.message : 'Importazione non riuscita.'} Se l’errore è avvenuto durante il salvataggio, alcuni record potrebbero essere già stati aggiunti; aggiorna i dati prima di riprovare.`))}
                onProfileSave={(firstName, lastName) => profileNameMutation.mutate({ firstName, lastName })}
                onLogout={() => signOut().then(() => navigate('/login')).catch((error: Error) => setNotice(error.message))}
                onAi={() => setNotice('Assistente AI non configurato. Collega un endpoint server-side per abilitarlo.')}
                onNavigate={setSection}
                logo={logo}
                onLogoUpload={(file) => uploadLogo(file).catch((error: unknown) => setNotice(error instanceof Error ? error.message : 'Logo non salvato.'))}
                onLogoRemove={() => { void clearUserLogo(user!.id).then(() => setLogo('')).catch((error: unknown) => setNotice(error instanceof Error ? error.message : 'Logo non rimosso.')); }}
                onCreateContent={(values, id) => contentMutation.mutateAsync({ values, id })}
                onCreateBrand={(values, id) => brandMutation.mutateAsync({ values, id })}
                onCreateProfile={(values, id) => profileMutation.mutateAsync({ values, id })} />}
        </div>
      </main>
      {contentDraft !== undefined && <ContentEditor item={contentDraft} data={data} busy={contentMutation.isPending} onClose={() => setContentDraft(undefined)}
        onSave={(values, id) => contentMutation.mutateAsync({ values, id }).then(() => { setContentDraft(undefined); setNotice('Contenuto salvato sul server.'); })}
        onAi={async (contentId) => {
          if (!supabase) throw new Error('Supabase non è configurato.');
          const { data: result, error } = await supabase.functions.invoke('creative-assistant', { body: { contentId } });
          if (error) throw new Error('Assistente non configurato o temporaneamente non disponibile. Verifica la Edge Function e la configurazione server-side.');
          if (typeof result?.suggestion !== 'string' || !result.suggestion.trim()) throw new Error('Il servizio AI non ha restituito una proposta valida.');
          return result.suggestion;
        }} />}
      {entityDraft && <EntityEditor kind={entityDraft.kind} item={entityDraft.item} data={data} busy={brandMutation.isPending || profileMutation.isPending} onClose={() => setEntityDraft(null)}
        onSave={(values, id) => (entityDraft.kind === 'brand' ? brandMutation.mutateAsync({ values, id }) : profileMutation.mutateAsync({ values, id })).then(() => { setEntityDraft(null); setNotice('Modifiche salvate sul server.'); })} />}
    </div>
  );
}

interface SectionProps {
  section: Section; data: WorkspaceData; name: string; email: string;
  onNavigate: (section: Section) => void;
  logo: string; onLogoUpload: (file: File) => void; onLogoRemove: () => void;
  onCreate: (item?: ContentItem) => void; onEdit: (item?: ContentItem) => void;
  onDelete: (table: 'brands' | 'social_profiles' | 'contents', id: string, name: string) => void;
  onEntity: (kind: 'brand' | 'profile', item?: Brand | SocialProfile) => void;
  onExport: () => void; onImport: (file: File) => void; onProfileSave: (firstName: string, lastName: string) => void;
  onLogout: () => void; onAi: () => void;
  onCreateContent: (values: unknown, id?: string) => Promise<unknown>;
  onCreateBrand: (values: unknown, id?: string) => Promise<unknown>;
  onCreateProfile: (values: unknown, id?: string) => Promise<unknown>;
}

function WorkspaceSection(props: SectionProps) {
  switch (props.section) {
    case 'overview': return <Overview {...props} />;
    case 'content': return <ContentLibrary {...props} />;
    case 'calendar': return <EditorialCalendar {...props} />;
    case 'brands': return <BrandLibrary {...props} />;
    case 'social': return <SocialLibrary {...props} />;
    case 'manager': return <BrandManager {...props} />;
    case 'settings': return <SettingsPage {...props} />;
  }
}

function PageHeading({ eyebrow, title, children, action }: { eyebrow: string; title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="heading-copy">{children}</p></div>{action}</div>;
}

function Overview(props: SectionProps) {
  const { data } = props;
  const upcoming = data.contents.filter((item) => item.scheduled_at && new Date(item.scheduled_at) >= today && item.status !== 'published').sort((a, b) => a.scheduled_at!.localeCompare(b.scheduled_at!)).slice(0, 4);
  const counts = [
    { label: 'Idee', count: data.contents.filter((item) => item.status === 'idea').length, icon: Sparkles },
    { label: 'In lavorazione', count: data.contents.filter((item) => item.status === 'draft').length, icon: ClipboardList },
    { label: 'Pronti', count: data.contents.filter((item) => item.status === 'ready').length, icon: CalendarDays },
    { label: 'Brand attivi', count: data.brands.length, icon: Users },
  ];
  return <>
    <PageHeading eyebrow="Il tuo spazio creativo" title={`Ciao, ${props.name.split(' ')[0]}`} action={<button className="button primary" onClick={() => props.onCreate()}><Plus size={17} />Nuovo contenuto</button>}>Il tuo spazio per idee, contenuti e profili social — tutto in un posto.</PageHeading>
    <div className="stat-grid">{counts.map(({ label, count, icon: Icon }) => <article className="stat-card" key={label}><span className="stat-icon"><Icon size={19} /></span><span className="stat-number">{count}</span><span className="stat-label">{label}</span><span className="stat-decoration">✳</span></article>)}</div>
    <div className="overview-grid">
      <section className="panel upcoming-panel"><div className="panel-heading"><div><p className="eyebrow">IL PROSSIMO DA FARE</p><h2>Prossime scadenze</h2></div><CalendarDays size={18} /></div>
        {upcoming.length ? <div className="upcoming-list">{upcoming.map((item) => <ContentRow key={item.id} item={item} data={data} onEdit={() => props.onEdit(item)} />)}</div>
          : <EmptyState title="Nessuna scadenza in vista" copy="Pianifica un contenuto per vederlo qui, nel tuo prossimo passo creativo." action={<button className="text-action" onClick={() => props.onCreate()}>Crea il primo contenuto <ArrowRight size={15} /></button>} />}</section>
      <aside className="panel ai-panel"><span className="ai-stamp"><WandSparkles size={20} /></span><p className="eyebrow">UNA PICCOLA SPINTA</p><h2>Le idee migliori nascono da una scintilla.</h2><p>Il tuo assistente creativo ti aiuterà a trasformarla in contenuto, rispettando la tua voce.</p><button className="button secondary" onClick={props.onAi}>Scopri l’assistente <ArrowRight size={16} /></button><span className="ai-footnote">Funzione non disponibile finché il servizio non è configurato</span></aside>
    </div>
    <section className="panel recent-panel">    <div className="panel-heading"><div><p className="eyebrow">APPENA NATI</p><h2>I tuoi contenuti</h2></div><button className="text-action" onClick={() => props.onNavigate('content')}>Vedi tutti <ArrowRight size={15} /></button></div>
      {data.contents.length ? <div className="table-wrap"><table><thead><tr><th>Titolo</th><th>Brand</th><th>Stato</th><th>Data</th><th /></tr></thead><tbody>{data.contents.slice(0, 5).map((item) => <ContentTableRow key={item.id} item={item} data={data} onEdit={() => props.onEdit(item)} onDelete={() => props.onDelete('contents', item.id, item.title)} />)}</tbody></table></div>
        : <EmptyState title="La tua pagina è ancora tutta da scrivere" copy="Aggiungi la prima idea quando sei pronta: sarà visibile solo nel tuo account." action={<button className="text-action" onClick={() => props.onCreate()}>Crea un contenuto <ArrowRight size={15} /></button>} />}</section>
  </>;
}

function ContentLibrary(props: SectionProps) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<ContentStatus | ''>('');
  const [brandId, setBrandId] = useState('');
  const [view, setView] = useState<'table' | 'board'>('table');
  const items = filterContents(props.data.contents, {
    query, status, brandId,
    brandNames: Object.fromEntries(props.data.brands.map((brand) => [brand.id, brand.name])),
    profileNames: Object.fromEntries(props.data.profiles.map((profile) => [profile.id, `${profile.platform} ${profile.handle}`])),
  });
  const grouped = groupContentsByStatus(items);
  return <>
    <PageHeading eyebrow="LA TUA BANCA CREATIVA" title="Contenuti" action={<button className="button primary" onClick={() => props.onCreate()}><Plus size={17} />Nuovo contenuto</button>}>Dalle prime idee ai post pronti: tutto il tuo lavoro editoriale, connesso al calendario.</PageHeading>
    <div className="toolbar panel"><label className="searchbox"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cerca tra i contenuti…" aria-label="Cerca contenuti" /></label><label className="select-with-icon"><Filter size={15} /><select value={status} onChange={(event) => setStatus(statuses.find((value) => value === event.target.value) ?? '')} aria-label="Filtra per stato"><option value="">Tutti gli stati</option>{statuses.map((item) => <option key={item} value={item}>{statusLabels[item]}</option>)}</select></label><select value={brandId} onChange={(event) => setBrandId(event.target.value)} aria-label="Filtra per brand"><option value="">Tutti i brand</option>{props.data.brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select><div className="view-toggle" aria-label="Vista contenuti"><button className={view === 'table' ? 'active' : ''} aria-label="Vista tabella" onClick={() => setView('table')}><List size={17} /></button><button className={view === 'board' ? 'active' : ''} aria-label="Vista bacheca" onClick={() => setView('board')}><Grid2X2 size={16} /></button></div></div>
    {!items.length ? <EmptyState title={props.data.contents.length ? 'Nessun risultato per questi filtri' : 'Qui le idee diventano contenuti'} copy={props.data.contents.length ? 'Modifica la ricerca o i filtri per ritrovare i tuoi contenuti.' : 'Aggiungi il tuo primo contenuto. Potrai organizzarlo per brand, piattaforma, formato e scadenza.'} action={!props.data.contents.length ? <button className="text-action" onClick={() => props.onCreate()}>Aggiungi un contenuto <ArrowRight size={15} /></button> : undefined} />
      : view === 'table' ? <section className="panel content-table"><div className="table-wrap"><table><thead><tr><th>Titolo</th><th>Brand / piattaforma</th><th>Formato</th><th>Stato</th><th>Pubblicazione</th><th /></tr></thead><tbody>{items.map((item) => <ContentTableRow key={item.id} item={item} data={props.data} onEdit={() => props.onEdit(item)} onDelete={() => props.onDelete('contents', item.id, item.title)} />)}</tbody></table></div></section>
        : <div className="board-grid">{statuses.map((itemStatus) => <section className="board-column" key={itemStatus}><div className="board-title"><span className={`status-dot ${itemStatus}`} />{statusLabels[itemStatus]}<span>{grouped[itemStatus].length}</span></div>{grouped[itemStatus].map((item) => <button className="board-card" key={item.id} onClick={() => props.onEdit(item)}><span className="muted-label">{brandName(props.data, item.brand_id) || item.platform}</span><strong>{item.title}</strong><span>{dateText(item.scheduled_at)}</span></button>)}</section>)}</div>}
  </>;
}

function EditorialCalendar(props: SectionProps) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selected, setSelected] = useState(() => new Date().toLocaleDateString('sv-SE'));
  const year = month.getFullYear(); const monthIndex = month.getMonth();
  const firstWeekday = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const days = new Date(year, monthIndex + 1, 0).getDate();
  const contentByDate = useMemo(() => groupContentsByDate(props.data.contents), [props.data.contents]);
  const chosen = contentByDate[selected] ?? [];
  return <>
    <PageHeading eyebrow="IL TUO RITMO EDITORIALE" title="Calendario" action={<button className="button primary" onClick={() => props.onCreate()}><Plus size={17} />Pianifica idea</button>}>Ogni contenuto pianificato, in un unico calendario aggiornato con le tue altre viste.</PageHeading>
    <section className="panel calendar-panel"><div className="calendar-head"><button className="icon-button" aria-label="Mese precedente" onClick={() => setMonth(new Date(year, monthIndex - 1, 1))}><ArrowLeft size={18} /></button><h2>{month.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}</h2><button className="icon-button" aria-label="Mese successivo" onClick={() => setMonth(new Date(year, monthIndex + 1, 1))}><ArrowRight size={18} /></button></div><div className="calendar-grid">{['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map((weekday) => <strong className="calendar-weekday" key={weekday}>{weekday}</strong>)}{Array.from({ length: firstWeekday }, (_, index) => <span key={`blank-${index}`} />)}{Array.from({ length: days }, (_, index) => {
      const day = index + 1; const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return <button key={day} className={`calendar-day ${selected === key ? 'is-selected' : ''} ${dateOnly(new Date().toISOString()) === key ? 'is-today' : ''}`} onClick={() => setSelected(key)}><span>{day}</span>{(contentByDate[key] ?? []).slice(0, 3).map((item) => <i title={item.title} key={item.id}>{item.title}</i>)}{(contentByDate[key]?.length ?? 0) > 3 && <small>+{contentByDate[key].length - 3} altri</small>}</button>;
    })}</div></section>
    <section className="panel selected-date"><div className="panel-heading"><div><p className="eyebrow">AGENDA DEL GIORNO</p><h2>{new Date(`${selected}T12:00:00`).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</h2></div><span>{chosen.length} contenuti</span></div>{chosen.length ? chosen.map((item) => <ContentRow key={item.id} item={item} data={props.data} onEdit={() => props.onEdit(item)} />) : <p className="muted-copy">Nessun contenuto pianificato in questo giorno.</p>}</section>
  </>;
}

function BrandLibrary(props: SectionProps) {
  return <>
    <PageHeading eyebrow="IDENTITÀ E PROGETTI" title="Pagine / brand" action={<button className="button primary" onClick={() => props.onEntity('brand')}><Plus size={17} />Aggiungi brand</button>}>La voce, l’identità e i riferimenti di ogni progetto, sempre a portata di mano.</PageHeading>
    {props.data.brands.length ? <div className="entity-grid">{props.data.brands.map((brand) => <article className="entity-card" key={brand.id}><div className="entity-top"><span className="brand-initial">{brand.name.slice(0, 1).toUpperCase()}</span><button className="icon-button" aria-label={`Modifica ${brand.name}`} onClick={() => props.onEntity('brand', brand)}><Pencil size={16} /></button></div><h2>{brand.name}</h2><p>{brand.description || 'Aggiungi una descrizione al tuo brand.'}</p><div className="brand-details"><span><strong>Identità</strong>{brand.identity || 'Da definire'}</span><span><strong>Riferimenti</strong>{brand.references || 'Da aggiungere'}</span></div><div className="entity-footer"><span>{props.data.profiles.filter((profile) => profile.brand_id === brand.id).length} profili · {props.data.contents.filter((content) => content.brand_id === brand.id).length} contenuti</span><button className="icon-button danger" aria-label={`Elimina ${brand.name}`} onClick={() => props.onDelete('brands', brand.id, brand.name)}><Trash2 size={16} /></button></div></article>)}</div>
      : <EmptyState title="Ogni progetto ha una voce unica" copy="Crea una pagina brand per collegare identità, riferimenti, canali social e contenuti." action={<button className="text-action" onClick={() => props.onEntity('brand')}>Crea il primo brand <ArrowRight size={15} /></button>} />}
  </>;
}

function SocialLibrary(props: SectionProps) {
  return <>
    <PageHeading eyebrow="I TUOI CANALI" title="Profili social" action={<button className="button primary" onClick={() => props.onEntity('profile')}><Plus size={17} />Aggiungi profilo</button>}>Registra manualmente i tuoi canali e collegali ai brand per organizzare meglio il lavoro.</PageHeading>
    {props.data.profiles.length ? <div className="entity-grid">{props.data.profiles.map((profile) => <article className="entity-card social-card" key={profile.id}><div className="entity-top"><span className="social-icon"><Instagram size={20} /></span><button className="icon-button" aria-label={`Modifica ${profile.handle}`} onClick={() => props.onEntity('profile', profile)}><Pencil size={16} /></button></div><span className="eyebrow">{profile.platform}</span><h2>{profile.handle}</h2><p>{brandName(props.data, profile.brand_id) || 'Nessun brand associato'}</p>{profile.url && <a className="text-action" href={profile.url} target="_blank" rel="noreferrer">Apri profilo <ArrowRight size={14} /></a>}<div className="entity-footer"><span>{props.data.contents.filter((item) => item.social_profile_id === profile.id).length} contenuti collegati</span><button className="icon-button danger" aria-label={`Elimina ${profile.handle}`} onClick={() => props.onDelete('social_profiles', profile.id, profile.handle)}><Trash2 size={16} /></button></div></article>)}</div>
      : <EmptyState title="I tuoi canali, il tuo spazio" copy="Inserisci un profilo social e scegli se associarlo a uno dei tuoi brand." action={<button className="text-action" onClick={() => props.onEntity('profile')}>Aggiungi un profilo <ArrowRight size={15} /></button>} />}
  </>;
}

function BrandManager(props: SectionProps) {
  return <>
    <PageHeading eyebrow="LA TUA ATTIVITÀ, INSIEME" title="Social media manager">Una vista di lavoro per brand: stato, canali social e prossime pubblicazioni.</PageHeading>
    {!props.data.brands.length ? <EmptyState title="Inizia dal primo brand" copy="Quando aggiungerai un brand, qui potrai organizzare il suo lavoro editoriale." action={<button className="text-action" onClick={() => props.onEntity('brand')}>Aggiungi un brand <ArrowRight size={15} /></button>} />
      : <div className="manager-list">{props.data.brands.map((brand) => {
        const content = props.data.contents.filter((item) => item.brand_id === brand.id);
        const profiles = props.data.profiles.filter((item) => item.brand_id === brand.id);
        return <section className="panel manager-card" key={brand.id}><div className="manager-header"><span className="brand-initial">{brand.name.slice(0, 1).toUpperCase()}</span><div><p className="eyebrow">BRAND</p><h2>{brand.name}</h2></div><button className="button secondary small" onClick={() => props.onCreate()}>Aggiungi contenuto</button></div><div className="manager-metrics"><span><strong>{content.length}</strong> contenuti</span><span><strong>{profiles.length}</strong> profili social</span><span><strong>{content.filter((item) => item.status === 'ready').length}</strong> pronti</span><span><strong>{content.filter((item) => item.scheduled_at && new Date(item.scheduled_at) >= today && item.status !== 'published').length}</strong> in calendario</span></div>{content.length ? content.slice(0, 3).map((item) => <ContentRow key={item.id} item={item} data={props.data} onEdit={() => props.onEdit(item)} />) : <p className="muted-copy">Ancora nessun contenuto per questo brand.</p>}</section>;
      })}</div>}
  </>;
}

function SettingsPage(props: SectionProps) {
  const [firstName, setFirstName] = useState(props.name.split(' ')[0] ?? '');
  const [lastName, setLastName] = useState(props.name.split(' ').slice(1).join(' '));
  return <>
    <PageHeading eyebrow="IL TUO ACCOUNT" title="Impostazioni">I tuoi dati, i tuoi file e il tuo account in un solo posto.</PageHeading>
    <div className="settings-layout"><section className="panel settings-card"><div className="panel-heading"><div><p className="eyebrow">PROFILO</p><h2>Le tue informazioni</h2></div><Users size={18} /></div><form className="settings-form" onSubmit={(event) => { event.preventDefault(); props.onProfileSave(firstName, lastName); }}><label className="field"><span>Nome</span><input value={firstName} onChange={(event) => setFirstName(event.target.value)} required /></label><label className="field"><span>Cognome</span><input value={lastName} onChange={(event) => setLastName(event.target.value)} required /></label><label className="field"><span>Email</span><input value={props.email} readOnly /></label><button className="button primary">Salva profilo</button></form></section>
    <section className="panel settings-card"><div className="panel-heading"><div><p className="eyebrow">IDENTITÀ VISIVA</p><h2>Il tuo logo</h2></div><Sparkles size={18} /></div><p className="muted-copy">Scegli un logo PNG, JPEG o WebP (massimo 1,5 MB). È conservato solo su questo dispositivo e nel tuo account locale.</p><div className="logo-settings"><BrandMark logo={props.logo} /><label className="button secondary file-button"><FileUp size={16} />Scegli un file<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) props.onLogoUpload(file); event.currentTarget.value = ''; }} /></label>{props.logo && <button type="button" className="button secondary" onClick={props.onLogoRemove}><Trash2 size={15} />Rimuovi logo</button>}</div></section>
      <section className="panel settings-card"><div className="panel-heading"><div><p className="eyebrow">I TUOI DATI</p><h2>Esporta o importa</h2></div><ArrowDownToLine size={18} /></div><p className="muted-copy">L’esportazione crea un file JSON. L’importazione valida i contenuti, mostra un’anteprima e aggiunge solo record nuovi.</p><div className="settings-actions"><button className="button secondary" onClick={props.onExport} disabled={!props.data.contents.length && !props.data.brands.length && !props.data.profiles.length}><Download size={16} />Esporta dati JSON</button><label className="button secondary file-button"><FileUp size={16} />Scegli JSON da importare<input type="file" accept="application/json,.json" onChange={(event) => { const file = event.target.files?.[0]; if (file) props.onImport(file); event.currentTarget.value = ''; }} /></label></div></section>
      <section className="panel settings-card ai-settings"><div className="panel-heading"><div><p className="eyebrow">ASSISTENTE CREATIVO</p><h2>AI server-side</h2></div><WandSparkles size={18} /></div><p>Stato: non configurato. Le chiavi devono restare sul server; l’assistente non genera risposte di esempio e non modifica i tuoi contenuti.</p></section>
      <section className="panel logout-card"><div><p className="eyebrow">A PRESTO</p><h2>Esci dal tuo account</h2><p>Alla disconnessione i dati personali vengono rimossi dalla cache locale di questo dispositivo.</p></div><button className="button secondary" onClick={props.onLogout}><LogOut size={16} />Esci da Elara</button></section>
    </div>
  </>;
}

function ContentRow({ item, data, onEdit }: { item: ContentItem; data: WorkspaceData; onEdit: () => void }) {
  return <button className="upcoming-row" onClick={onEdit}><span className={`date-tile ${item.status}`}><strong>{item.scheduled_at ? new Date(item.scheduled_at).getDate() : '—'}</strong><small>{item.scheduled_at ? new Date(item.scheduled_at).toLocaleDateString('it-IT', { month: 'short' }) : 'Data'}</small></span><span className="upcoming-copy"><strong>{item.title}</strong><small>{brandName(data, item.brand_id) || item.platform} · {item.format}</small></span><span className={`status-pill ${item.status}`}>{statusLabels[item.status]}</span><span className="upcoming-date">{dateText(item.scheduled_at)}</span></button>;
}

function ContentTableRow({ item, data, onEdit, onDelete }: { item: ContentItem; data: WorkspaceData; onEdit: () => void; onDelete: () => void }) {
  return <tr><td><button className="table-title" onClick={onEdit}>{item.title}</button>{item.pillar && <small className="table-subtitle">{item.pillar}</small>}</td><td>{brandName(data, item.brand_id) || <span className="muted-copy">{item.platform}</span>}<small className="table-subtitle">{item.platform}</small></td><td>{item.format}</td><td><span className={`status-pill ${item.status}`}>{statusLabels[item.status]}</span></td><td>{dateText(item.scheduled_at)}</td><td><span className="row-actions"><button className="icon-button" aria-label={`Modifica ${item.title}`} onClick={onEdit}><Pencil size={15} /></button><button className="icon-button danger" aria-label={`Elimina ${item.title}`} onClick={onDelete}><Trash2 size={15} /></button></span></td></tr>;
}

function EmptyState({ title, copy, action }: { title: string; copy: string; action?: React.ReactNode }) {
  return <div className="empty-state"><span className="empty-mark">✳</span><h2>{title}</h2><p>{copy}</p>{action}</div>;
}

function brandName(data: WorkspaceData, id: string | null) { return data.brands.find((brand) => brand.id === id)?.name ?? ''; }

function BrandMark({ logo }: { logo: string }) {
  return <span className={`brand-symbol ${logo ? 'has-custom-logo' : ''}`}>{logo ? <img src={logo} alt="" /> : 'E'}</span>;
}

function ContentEditor({ item, data, busy, onClose, onSave, onAi }: { item: ContentItem | null; data: WorkspaceData; busy: boolean; onClose: () => void; onSave: (values: Record<string, string | null>, id?: string) => Promise<unknown>; onAi: (id: string) => Promise<string> }) {
  const [error, setError] = useState('');
  const [aiError, setAiError] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  const [script, setScript] = useState(item?.script ?? '');
  const [selectedBrand, setSelectedBrand] = useState(item?.brand_id ?? '');
  const relatedProfiles = data.profiles.filter((profile) => !selectedBrand || profile.brand_id === selectedBrand);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    const form = new FormData(event.currentTarget);
    const scheduled = String(form.get('scheduled_at') ?? '');
    const values = {
      title: String(form.get('title') ?? ''),
      brand_id: String(form.get('brand_id') ?? '') || null,
      social_profile_id: String(form.get('social_profile_id') ?? '') || null,
      platform: String(form.get('platform') ?? 'Instagram'),
      format: String(form.get('format') ?? 'Post'),
      pillar: String(form.get('pillar') ?? ''),
      status: String(form.get('status') ?? 'idea'),
      scheduled_at: scheduled ? new Date(scheduled).toISOString() : null,
      script,
      notes: String(form.get('notes') ?? ''),
    };
    try { await onSave(values, item?.id); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Salvataggio non riuscito.'); }
  }
  return <Modal title={item ? 'Modifica contenuto' : 'Nuovo contenuto'} onClose={onClose}><form className="editor-form" onSubmit={submit}>
    <label className="field wide"><span>Titolo</span><input name="title" defaultValue={item?.title} placeholder="Dai forma alla tua idea…" required maxLength={200} autoFocus /></label>
    <label className="field"><span>Brand</span><select name="brand_id" value={selectedBrand} onChange={(event) => setSelectedBrand(event.target.value)}><option value="">Senza brand</option>{data.brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></label>
    <label className="field"><span>Profilo social</span><select name="social_profile_id" defaultValue={item?.social_profile_id ?? ''}><option value="">Nessun profilo</option>{relatedProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.platform} · {profile.handle}</option>)}</select></label>
    <label className="field"><span>Piattaforma</span><select name="platform" defaultValue={item?.platform ?? 'Instagram'}>{platforms.map((value) => <option key={value}>{value}</option>)}</select></label>
    <label className="field"><span>Formato</span><select name="format" defaultValue={item?.format ?? 'Post'}>{formats.map((value) => <option key={value}>{value}</option>)}</select></label>
    <label className="field"><span>Pilastro editoriale</span><input name="pillar" defaultValue={item?.pillar} placeholder="Es. Dietro le quinte" maxLength={120} /></label>
    <label className="field"><span>Stato</span><select name="status" defaultValue={item?.status ?? 'idea'}>{statuses.map((value) => <option key={value} value={value}>{statusLabels[value]}</option>)}</select></label>
    <label className="field"><span>Data e ora di pubblicazione</span><input type="datetime-local" name="scheduled_at" defaultValue={datetimeInput(item?.scheduled_at ?? null)} /></label>
    <label className="field wide"><span>Script</span><textarea name="script" rows={5} value={script} onChange={(event) => setScript(event.target.value)} placeholder="La tua idea, il tuo tono di voce…" maxLength={30000} /></label>
    <label className="field wide"><span>Appunti</span><textarea name="notes" rows={3} defaultValue={item?.notes} placeholder="Link, riferimenti, promemoria…" maxLength={10000} /></label>
    <section className="assistant-panel wide" aria-label="Assistente AI"><div><p className="eyebrow">ASSISTENTE CREATIVO</p><p>La proposta usa solo questo contenuto e il suo brand. Non modifica lo script finché non scegli di aggiungerla.</p></div><button type="button" className="button secondary small" disabled={!item?.id || aiBusy} onClick={() => { if (!item?.id) return; setAiBusy(true); setAiError(''); void onAi(item.id).then(setSuggestion).catch((cause: unknown) => setAiError(cause instanceof Error ? cause.message : 'Assistente non disponibile.')).finally(() => setAiBusy(false)); }}>{aiBusy ? 'Creo una proposta…' : item?.id ? 'Chiedi una proposta' : 'Salva per chiedere una proposta'}</button>{aiError && <p className="form-message error" role="alert">{aiError}</p>}{suggestion && <><label className="field"><span>Proposta modificabile</span><textarea rows={5} value={suggestion} onChange={(event) => setSuggestion(event.target.value)} /></label><button type="button" className="text-action" onClick={() => setScript((current) => current ? `${current}\n\n${suggestion}` : suggestion)}>Aggiungi allo script <ArrowRight size={15} /></button></>}</section>
    {error && <p className="form-message error wide" role="alert">{error}</p>}
    <div className="modal-actions wide"><button type="button" className="button secondary" onClick={onClose}>Annulla</button><button className="button primary" disabled={busy}>{busy ? 'Salvataggio…' : item ? 'Salva modifiche' : 'Crea contenuto'}</button></div>
  </form></Modal>;
}

function EntityEditor({ kind, item, data, busy, onClose, onSave }: { kind: 'brand' | 'profile'; item?: Brand | SocialProfile; data: WorkspaceData; busy: boolean; onClose: () => void; onSave: (values: unknown, id?: string) => Promise<unknown> }) {
  const [error, setError] = useState('');
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    const form = new FormData(event.currentTarget);
    const values = kind === 'brand'
      ? { name: String(form.get('name') ?? ''), description: String(form.get('description') ?? ''), identity: String(form.get('identity') ?? ''), references: String(form.get('references') ?? '') }
      : { brand_id: String(form.get('brand_id') ?? '') || null, platform: String(form.get('platform') ?? 'Instagram'), handle: String(form.get('handle') ?? ''), url: String(form.get('url') ?? '') };
    try { await onSave(values, item?.id); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Salvataggio non riuscito.'); }
  }
  const brand = kind === 'brand' ? item as Brand | undefined : undefined;
  const profile = kind === 'profile' ? item as SocialProfile | undefined : undefined;
  return <Modal title={`${brand || profile ? 'Modifica' : 'Aggiungi'} ${kind === 'brand' ? 'brand' : 'profilo social'}`} onClose={onClose}><form className="editor-form" onSubmit={submit}>
    {kind === 'brand' ? <>
      <label className="field wide"><span>Nome brand</span><input name="name" defaultValue={brand?.name} required maxLength={120} autoFocus /></label>
      <label className="field wide"><span>Descrizione</span><textarea name="description" defaultValue={brand?.description} rows={3} maxLength={3000} /></label>
      <label className="field wide"><span>Identità</span><textarea name="identity" defaultValue={brand?.identity} rows={3} placeholder="Valori, voce, tono…" maxLength={3000} /></label>
      <label className="field wide"><span>Riferimenti</span><textarea name="references" defaultValue={brand?.references} rows={3} placeholder="Link e ispirazioni…" maxLength={3000} /></label>
    </> : <>
      <label className="field"><span>Piattaforma</span><select name="platform" defaultValue={profile?.platform ?? 'Instagram'}>{platforms.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label className="field"><span>Brand associato</span><select name="brand_id" defaultValue={profile?.brand_id ?? ''}><option value="">Nessuno</option>{data.brands.map((value) => <option key={value.id} value={value.id}>{value.name}</option>)}</select></label>
      <label className="field wide"><span>Nome profilo</span><input name="handle" defaultValue={profile?.handle} placeholder="@tuoprofilo" required maxLength={120} autoFocus /></label>
      <label className="field wide"><span>URL pubblico</span><input name="url" type="url" defaultValue={profile?.url} placeholder="https://…" /></label>
    </>}
    {error && <p className="form-message error wide" role="alert">{error}</p>}
    <div className="modal-actions wide"><button type="button" className="button secondary" onClick={onClose}>Annulla</button><button className="button primary" disabled={busy}>{busy ? 'Salvataggio…' : 'Salva'}</button></div>
  </form></Modal>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const dialog = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const container = dialog.current;
    const focusable = () => Array.from(container?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])') ?? []);
    (container?.querySelector<HTMLElement>('.editor-form input, .editor-form select, .editor-form textarea') ?? focusable()[0])?.focus();
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current();
      if (event.key === 'Tab') {
        const elements = focusable();
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => { window.removeEventListener('keydown', handler); previousFocus?.focus(); };
  }, []);
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section ref={dialog} className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-head"><h2 id="modal-title">{title}</h2><button type="button" className="icon-button" onClick={onClose} aria-label="Chiudi"><X size={19} /></button></div>{children}</section></div>;
}

export default App;
