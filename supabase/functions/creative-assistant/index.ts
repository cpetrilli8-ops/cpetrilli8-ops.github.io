import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const json = (status: number, body: Record<string, string>, origin: string | null, allowed: Set<string>) => {
  const headers = new Headers({ 'Content-Type': 'application/json', 'Vary': 'Origin' });
  if (origin && allowed.has(origin)) headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Headers', 'authorization, apikey, content-type, x-client-info');
  headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers });
};

Deno.serve(async (request) => {
  const origin = request.headers.get('Origin');
  const allowed = new Set((Deno.env.get('AI_ALLOWED_ORIGINS') ?? '').split(',').map((value) => value.trim()).filter(Boolean));
  if (request.method === 'OPTIONS') return json(204, {}, origin, allowed);
  if (request.method !== 'POST') return json(405, { error: 'Metodo non consentito.' }, origin, allowed);
  if (!origin || !allowed.has(origin)) return json(403, { error: 'Origine non consentita.' }, origin, allowed);
  if (Number(request.headers.get('Content-Length') ?? 0) > 4096) return json(413, { error: 'Richiesta troppo grande.' }, origin, allowed);

  const authorization = request.headers.get('Authorization');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const providerUrl = Deno.env.get('AI_PROVIDER_URL');
  const providerKey = Deno.env.get('AI_PROVIDER_API_KEY');
  const model = Deno.env.get('AI_PROVIDER_MODEL');
  if (!supabaseUrl || !anonKey || !authorization) return json(401, { error: 'Sessione non valida. Accedi di nuovo.' }, origin, allowed);
  if (!providerUrl || !providerKey || !model) return json(503, { error: 'Assistente AI non configurato. Nessun contenuto è stato generato.' }, origin, allowed);

  let endpoint: URL;
  try {
    endpoint = new URL(providerUrl);
    if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password ||
      ['localhost', '127.0.0.1', '::1'].includes(endpoint.hostname)) throw new Error('Invalid endpoint');
  } catch {
    return json(503, { error: 'Endpoint AI server-side non valido.' }, origin, allowed);
  }

  let contentId: unknown;
  try {
    const rawBody = await request.text();
    if (rawBody.length > 4096) return json(413, { error: 'Richiesta troppo grande.' }, origin, allowed);
    const body: unknown = JSON.parse(rawBody);
    if (typeof body !== 'object' || body === null || !('contentId' in body)) return json(400, { error: 'Seleziona un contenuto salvato.' }, origin, allowed);
    contentId = body.contentId;
  } catch {
    return json(400, { error: 'Richiesta non valida.' }, origin, allowed);
  }
  if (typeof contentId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(contentId)) {
    return json(400, { error: 'Identificativo contenuto non valido.' }, origin, allowed);
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return json(401, { error: 'Sessione scaduta. Accedi di nuovo.' }, origin, allowed);

  const { data: content, error: contentError } = await supabase.from('contents')
    .select('id, title, platform, format, pillar, status, scheduled_at, script, notes, brand_id')
    .eq('owner_id', authData.user.id).eq('id', contentId).maybeSingle();
  if (contentError) return json(500, { error: 'Non è stato possibile leggere il contenuto selezionato.' }, origin, allowed);
  if (!content) return json(404, { error: 'Contenuto non trovato nel tuo account.' }, origin, allowed);

  let brand: Record<string, unknown> | null = null;
  if (content.brand_id) {
    const { data, error } = await supabase.from('brands')
      .select('name, description, identity, "references"')
      .eq('owner_id', authData.user.id).eq('id', content.brand_id).maybeSingle();
    if (error) return json(500, { error: 'Non è stato possibile leggere il brand selezionato.' }, origin, allowed);
    if (!data) return json(404, { error: 'Brand del contenuto non trovato nel tuo account.' }, origin, allowed);
    brand = data;
  }

  let providerResponse: Response;
  try {
    providerResponse = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${providerKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        task: 'content_suggestion',
        instruction: 'Genera una proposta modificabile usando esclusivamente il contenuto e il brand forniti. Non pubblicare e non sovrascrivere dati. Rispondi con JSON { "suggestion": "..." }.',
        brand,
        content: {
          title: content.title, platform: content.platform, format: content.format,
          pillar: content.pillar, status: content.status, scheduled_at: content.scheduled_at,
          script: content.script, notes: content.notes,
        },
      }),
      signal: AbortSignal.timeout(25_000),
    });
  } catch {
    return json(502, { error: 'Il servizio AI non è raggiungibile. Nessun contenuto è stato modificato.' }, origin, allowed);
  }
  if (!providerResponse.ok || Number(providerResponse.headers.get('Content-Length') ?? 0) > 65_536) {
    return json(502, { error: 'Il servizio AI non ha restituito una risposta utilizzabile.' }, origin, allowed);
  }
  let suggestion: unknown;
  try {
    const providerText = await providerResponse.text();
    if (providerText.length > 65_536) return json(502, { error: 'La risposta del servizio AI è troppo grande.' }, origin, allowed);
    const providerData: unknown = JSON.parse(providerText);
    suggestion = typeof providerData === 'object' && providerData !== null && 'suggestion' in providerData
      ? providerData.suggestion
      : undefined;
  } catch {
    return json(502, { error: 'Il servizio AI ha restituito dati non validi.' }, origin, allowed);
  }
  if (typeof suggestion !== 'string' || suggestion.trim().length === 0 || suggestion.length > 20_000) {
    return json(502, { error: 'Il servizio AI non ha restituito una proposta valida.' }, origin, allowed);
  }
  return json(200, { suggestion }, origin, allowed);
});
