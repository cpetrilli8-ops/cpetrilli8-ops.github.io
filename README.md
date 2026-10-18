# Elara Studio

Elara Studio è un workspace responsive per pianificare contenuti, brand e profili social. La frase guida è “Qui prendono forma le tue idee.” La schermata di accesso segue il riferimento fornito; il workspace usa una palette bordeaux, cipria, beige e oro. Il portfolio statico preesistente è conservato nelle pagine `portfolio.html` e `about.html`.

## Funzioni disponibili

- Registrazione con nome, cognome, email e password, verifica email, login, logout, recupero e reimpostazione password con Supabase Auth.
- Percorsi protetti e ripristino sessione; deep link per il callback nativo `com.elarastudio.app://auth/callback`.
- Panoramica dei contenuti e delle scadenze; creazione, modifica, eliminazione, ricerca e filtri dei contenuti; tabella, bacheca e calendario sugli stessi record.
- Brand, identità, descrizioni, riferimenti, profili social manuali e vista organizzata per brand.
- Esportazione JSON e importazione validata con anteprima e conferma. L’import aggiunge soltanto record, associa i riferimenti tramite identificativi esportati e ignora duplicati riconosciuti; non importa gli `owner_id` né sovrascrive o elimina record esistenti. L’eventuale nome profilo nel file è aggiornato solo dopo una seconda conferma esplicita. Le scritture sono individuali, non transazionali: se una richiesta server fallisce a metà, alcuni record potrebbero essere già stati inseriti.
- Logo del workspace personalizzabile con un file PNG/JPEG/WebP (massimo 1,5 MB) conservato localmente e separato per account.
- Query TanStack Query e cache IndexedDB separata per account; lettura offline dei dati già in cache. Le modifiche richiedono rete.
- Lo stato dell’assistente AI resta esplicitamente “non configurato”: non sono incluse generazioni simulate né chiavi client-side.

Non sono implementate pubblicazione automatica, analytics, upload/allegati, accesso Google o collaborazione multiutente su uno stesso workspace.

## Avvio web

Requisiti: Node.js 20.19+ o 22.12+, npm.

```bash
npm install
Copy-Item .env.example .env.local
# imposta VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nel file locale
npm run dev
```

Apri l’indirizzo locale indicato da Vite. Senza Supabase configurato l’app mostra lo stato non configurato e non abilita operazioni di account. Il frontend usa esclusivamente la chiave pubblica anon/publishable del progetto; **non** inserire mai una chiave `service_role`.

## Configurazione Supabase

1. Crea un progetto Supabase e imposta `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` e `VITE_APP_URL` in `.env.local` (il file è escluso da Git).
2. Applica le migrazioni versionate con Supabase CLI:

   ```bash
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npx supabase db push
   ```

   In alternativa applica `supabase/migrations/202610180001_initial_schema.sql` dall’SQL Editor del progetto.
3. In **Authentication → URL Configuration**, imposta il Site URL sul dominio web HTTPS effettivo e aggiungi tra i Redirect URLs `https://<dominio>/auth/callback*` e il deep link nativo `com.elarastudio.app://auth/callback*` (il parametro `type=recovery` distingue il recupero password). Per sviluppo locale consenti separatamente l’origine Vite e i suoi percorsi auth; non usare localhost nell’elenco delle build pubblicate.
4. Configura il provider email e i template di conferma/reimpostazione nel progetto Supabase. Il trigger DB crea il profilo senza memorizzare password.

La migrazione abilita policy RLS esplicite per le operazioni CRUD di ogni tabella personale. Le foreign key composite vincolano le associazioni ai record dello stesso proprietario e il profilo social di un contenuto deve corrispondere al suo brand. Verifica tutte le policy nel progetto di destinazione prima di usarlo con dati reali.

## Deploy web e PWA

```bash
npm run build
npm run preview
```

Distribuisci `dist/` su un hosting HTTPS per SPA, con fallback delle rotte client a `index.html`. La PWA usa la shell statica; non sono definite cache runtime per Supabase o altre risposte private. Imposta `VITE_APP_URL` all’URL HTTPS effettivo prima della build. L’icona PWA di base è `public/elara-icon.svg`; per il logo del workspace si può usare il selettore in **Impostazioni**.

## Android e iOS con Capacitor

L’identificativo applicazione si personalizza in `capacitor.config.ts` (`appId`); il valore di partenza è `com.elarastudio.app`. Modifica lo stesso identificativo nella configurazione nativa generata prima di distribuire.

```bash
npm run build
npx cap sync
npx cap open android
npx cap open ios
```

Se aggiungi queste piattaforme in un fork privo dei progetti generati, esegui `npx cap add android` e/o `npx cap add ios` una sola volta prima della sincronizzazione. `cap add ios` e la build/firma iOS richiedono macOS e Xcode; non sono verificabili nell’ambiente Windows. Il callback nativo è già registrato in `ios/App/App/Info.plist` e `android/app/src/main/AndroidManifest.xml`. Le sessioni native usano `@aparajita/capacitor-secure-storage`; la plugin va verificata su dispositivo dopo `cap sync`. Configura gli URL consentiti in Supabase in corrispondenza del dominio web/deep link effettivi. Nessun URL localhost è configurato per la produzione.

L’identificativo condiviso è centralizzato in `src/lib/app-identity.ts`; Capacitor lo importa dalla stessa costante. Se lo cambi, aggiorna anche `AndroidManifest.xml`, `Info.plist` e l’allowlist Supabase. I deep link sono già registrati nei progetti nativi generati. Non include certificati, profili di firma, account store, credenziali o prove su emulatori/dispositivi. La compatibilità tecnica non costituisce approvazione per Apple App Store o Google Play. Non eseguire pubblicazione o acquisti da questo progetto.

## Assistente AI

È predisposta la Supabase Edge Function `creative-assistant`: con un ID contenuto salvato, verifica la sessione e legge contenuto/brand tramite RLS prima di inviarli al provider configurato. Restituisce una proposta separata e modificabile; l’utente sceglie esplicitamente se aggiungerla allo script. Senza provider configurato restituisce un errore esplicito (nessuna risposta finta). Per abilitarla:

```bash
npx supabase functions deploy creative-assistant
npx supabase secrets set AI_ALLOWED_ORIGINS="https://<dominio>,capacitor://localhost,https://localhost" AI_PROVIDER_URL="https://<endpoint-provider>" AI_PROVIDER_API_KEY="<segreto>" AI_PROVIDER_MODEL="<modello>"
```

`AI_PROVIDER_API_KEY` resta nei secret del server e non va aggiunta a `.env` o al client. `AI_ALLOWED_ORIGINS` deve contenere solo le origini effettive; rimuovi gli origin Capacitor non usati. L’endpoint configurato deve accettare una POST JSON con `model`, `task`, `instruction`, `brand` e `content`, e restituire JSON `{ "suggestion": "..." }`. Verifica provider, trattamento dei dati e limiti prima dell’attivazione. Nessun provider a pagamento è attivato o acquistato da questo progetto; l’uso di un endpoint a pagamento può generare costi secondo il contratto del provider.

## Verifiche

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Le verifiche automatiche locali non sostituiscono test auth con progetto Supabase attivo o prove RLS sul DB remoto. I test `supabase/tests/rls.sql` richiedono Supabase CLI e un database locale Supabase. Non sono eseguiti test su dispositivi/emulatori, né verifiche di firma o pubblicazione store.

## Configurazioni esterne ancora necessarie

- Progetto e credenziali pubbliche Supabase, redirect allowlist HTTPS e URL scheme nativo, provider/template email.
- Dominio HTTPS e hosting con fallback SPA; URL pubblica impostata prima della build.
- Generazione dei progetti Android/iOS, configurazione deep link nativa, dispositivi/emulatori e verifica del plugin di storage sicuro.
- Per una futura distribuzione: account sviluppatore, certificati, chiavi di firma, schede privacy e requisiti di review degli store.
- Eventuale endpoint AI server-side e credenziali del provider, solo se la funzione verrà attivata.
