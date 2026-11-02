/* Achados de Condomínios — Cloudflare Worker (módulo único, sem dependências)
 *   POST /checkout  → cria o pagamento no Mercado Pago (Pix) e devolve o link
 *   POST /mp        → webhook do Mercado Pago: confere o pagamento na API e libera plano/patrocinado no Firestore
 * Segredos (painel da Cloudflare → Settings → Variables and Secrets):
 *   MP_ACCESS_TOKEN  (secret)  Access Token de produção do Mercado Pago
 *   FIREBASE_SA      (secret)  JSON da chave de conta de serviço do Firebase
 *   FIREBASE_API_KEY (texto)   apiKey do firebase-config.js (é pública)
 * Opcional: ALLOWED_ORIGINS (origens do site, separadas por vírgula), PRICE_PLAN, PRICE_SPONSOR
 */
const DAY = 864e5;
const DEFAULT_ORIGINS = 'https://wanderpomares-sys.github.io,https://achadosdecondominios.com.br,https://www.achadosdecondominios.com.br';
const price = (env, k) => Number(k === 'plan' ? env.PRICE_PLAN || 9.9 : env.PRICE_SPONSOR || 29.9);
const origins = env => String(env.ALLOWED_ORIGINS || DEFAULT_ORIGINS).split(',').map(s => s.trim()).filter(Boolean);
class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const origin = req.headers.get('Origin') || '';
    const cors = origins(env).includes(origin) ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin' } : {};
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    try {
      if (url.pathname === '/checkout' && req.method === 'POST') return out(await checkout(req, env, url, origin), 200, cors);
      if (url.pathname === '/mp') return out(await webhook(req, env, url), 200, {});
      return new Response('Achados de Condomínios • pagamentos', { status: 200 });
    } catch (e) {
      return out({ error: e.message || String(e) }, e.status || 500, cors);
    }
  }
};
const out = (o, status, h) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', ...h } });

/* ---------- checkout ---------- */
async function checkout(req, env, url, origin) {
  const b = await req.json().catch(() => { throw new HttpError(400, 'Pedido inválido'); });
  if (!['plan', 'sponsor'].includes(b.type)) throw new HttpError(400, 'Tipo inválido');
  const uid = await verifyUser(env, b.idToken);
  const back = String(b.back || '');
  if (!origins(env).some(o => back.startsWith(o + '/'))) throw new HttpError(400, 'Endereço de retorno não permitido');
  let ref, title;
  if (b.type === 'plan') {
    ref = 'plan:' + uid; title = 'Achados de Condomínios — plano anual';
  } else {
    const s = b.sponsor || {}, t = clip(s.title, 80);
    if (t.length < 3) throw new HttpError(400, 'Título muito curto');
    const id = await fsAdd(env, 'sponsors', { uid, status: 'awaiting', title: t, sub: clip(s.sub, 140), link: clip(s.link, 300), name: clip(s.name, 60), apt: clip(s.apt, 10), condo: clip(s.condo, 80), ts: Date.now() });
    ref = 'sp:' + id; title = 'Achados de Condomínios — card patrocinado (7 dias)';
  }
  const ok = back + (back.includes('?') ? '&' : '?') + 'pago=' + b.type;
  const pref = await mp(env, '/checkout/preferences', {
    items: [{ title, quantity: 1, unit_price: price(env, b.type), currency_id: 'BRL' }],
    external_reference: ref,
    notification_url: url.origin + '/mp',
    back_urls: { success: ok, pending: ok, failure: back },
    auto_return: 'approved',
    statement_descriptor: 'ACHADOS',
    payment_methods: { excluded_payment_types: [{ id: 'credit_card' }, { id: 'debit_card' }, { id: 'ticket' }, { id: 'prepaid_card' }], installments: 1 }
  });
  return { url: pref.init_point };
}
const clip = (v, n) => String(v == null ? '' : v).trim().slice(0, n);

async function verifyUser(env, idToken) {
  if (!idToken) throw new HttpError(401, 'Sem login');
  const r = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + encodeURIComponent(env.FIREBASE_API_KEY), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) });
  const j = await r.json().catch(() => ({}));
  const u = j.users && j.users[0];
  if (!r.ok || !u) throw new HttpError(401, 'Login inválido');
  return u.localId;
}

/* ---------- webhook ---------- */
async function webhook(req, env, url) {
  let body = {}; try { body = await req.json(); } catch (e) {}
  const type = url.searchParams.get('type') || url.searchParams.get('topic') || body.type || (body.action || '').split('.')[0];
  if (type && type !== 'payment') return { ignored: type };
  const pid = url.searchParams.get('data.id') || url.searchParams.get('id') || (body.data && body.data.id);
  if (!pid || !/^\d+$/.test(String(pid))) return { ignored: 'sem id' };
  const pay = await mp(env, '/v1/payments/' + pid);               // confere na fonte: ninguém consegue forjar
  if (pay.status !== 'approved') return { status: pay.status };
  const [kind, id] = String(pay.external_reference || '').split(':');
  if (!['plan', 'sp'].includes(kind) || !id) return { ignored: 'referência' };
  const need = price(env, kind === 'plan' ? 'plan' : 'sponsor');
  if (Number(pay.transaction_amount) + 0.001 < need) return { ignored: 'valor menor que o preço' };
  if (!(await fsCreate(env, 'payments', String(pid), { ref: pay.external_reference, amount: Number(pay.transaction_amount), ts: Date.now() }))) return { duplicado: true };
  try {
    if (kind === 'plan') {
      const cur = await fsGet(env, 'plans/' + id);
      const base = cur && cur.until > Date.now() ? cur.until : Date.now();
      await fsSet(env, 'plans/' + id, { tier: 'anual', until: base + 365 * DAY, ts: Date.now() });
    } else {
      const sp = await fsGet(env, 'sponsors/' + id);
      if (!sp) throw new HttpError(404, 'Patrocinado não encontrado');
      await fsPatch(env, 'sponsors/' + id, { status: 'active', until: Date.now() + 7 * DAY });
    }
  } catch (e) {
    await fsDelete(env, 'payments/' + pid).catch(() => {});      // libera para o Mercado Pago tentar de novo
    throw e;
  }
  return { liberado: kind, id };
}

/* ---------- Mercado Pago ---------- */
async function mp(env, path, body) {
  const r = await fetch('https://api.mercadopago.com' + path, { method: body ? 'POST' : 'GET', headers: { Authorization: 'Bearer ' + env.MP_ACCESS_TOKEN, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new HttpError(502, 'Mercado Pago: ' + (j.message || r.status));
  return j;
}

/* ---------- Firestore (REST, conta de serviço) ---------- */
let tok = { v: '', exp: 0 };
const b64u = b => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64s = s => b64u(new TextEncoder().encode(s));
async function gToken(env) {
  if (tok.v && tok.exp > Date.now() + 60000) return tok.v;
  const sa = JSON.parse(env.FIREBASE_SA), now = Math.floor(Date.now() / 1000);
  const head = b64s(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64s(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/datastore', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const der = Uint8Array.from(atob(sa.private_key.replace(/-----[A-Z ]+-----|\s/g, '')), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(head + '.' + claim));
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + head + '.' + claim + '.' + b64u(sig) });
  const j = await r.json();
  if (!r.ok) throw new HttpError(500, 'Firebase auth: ' + (j.error_description || r.status));
  tok = { v: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 };
  return tok.v;
}
const base = env => `https://firestore.googleapis.com/v1/projects/${JSON.parse(env.FIREBASE_SA).project_id}/databases/(default)/documents`;
const enc = o => ({ fields: Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === 'number' ? (Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }) : typeof v === 'boolean' ? { booleanValue: v } : { stringValue: String(v) }])) });
const dec = d => Object.fromEntries(Object.entries(d.fields || {}).map(([k, v]) => [k, v.integerValue != null ? Number(v.integerValue) : v.doubleValue != null ? v.doubleValue : v.booleanValue != null ? v.booleanValue : v.stringValue]));
async function fs(env, method, path, body) {
  const r = await fetch(base(env) + path, { method, headers: { Authorization: 'Bearer ' + await gToken(env), 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  return { r, j };
}
async function fsGet(env, p) { const { r, j } = await fs(env, 'GET', '/' + p); if (r.status === 404) return null; if (!r.ok) throw new HttpError(500, 'Firestore: ' + r.status); return dec(j); }
async function fsSet(env, p, o) { const { r } = await fs(env, 'PATCH', '/' + p, enc(o)); if (!r.ok) throw new HttpError(500, 'Firestore: ' + r.status); }
async function fsPatch(env, p, o) { const m = Object.keys(o).map(k => 'updateMask.fieldPaths=' + k).join('&'); const { r } = await fs(env, 'PATCH', '/' + p + '?' + m, enc(o)); if (!r.ok) throw new HttpError(500, 'Firestore: ' + r.status); }
async function fsDelete(env, p) { await fs(env, 'DELETE', '/' + p); }
async function fsAdd(env, col, o) { const { r, j } = await fs(env, 'POST', '/' + col, enc(o)); if (!r.ok) throw new HttpError(500, 'Firestore: ' + r.status); return j.name.split('/').pop(); }
async function fsCreate(env, col, id, o) { const { r } = await fs(env, 'POST', '/' + col + '?documentId=' + encodeURIComponent(id), enc(o)); if (r.status === 409) return false; if (!r.ok) throw new HttpError(500, 'Firestore: ' + r.status); return true; }
