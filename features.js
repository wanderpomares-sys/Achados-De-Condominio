/* Achados de Condomínios — validade dos anúncios, e-mail de aviso, condomínios com
 * checagem de duplicados e painel do administrador.
 * Carregado depois do script principal: redefine algumas funções globais dele. */
(function () {
  const DAY = 864e5, DURATION_DAYS = 30, WARN_DAYS = 3;
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const validEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((e || '').trim());
  const daysLeft = p => Math.ceil(((p.expiresAt || 0) - Date.now()) / DAY);
  const fmtDate = ts => new Date(ts).toLocaleDateString('pt-BR');
  window.daysLeft = daysLeft;

  /* ---------- estilos ---------- */
  const st = document.createElement('style');
  st.textContent = `
  .bub{background:#FFF1C9;border:2px solid #F59E0B;border-radius:18px;padding:12px;margin:10px 0;color:#12263F;box-shadow:0 2px 10px rgba(245,158,11,.25)}
  .bub.here{background:#D9F6E5;border-color:#16A34A;box-shadow:0 2px 10px rgba(22,163,74,.25)}
  .bub>b{display:block;font-size:14px;margin-bottom:6px}
  .bub p{margin:4px 0;font-size:12.5px;line-height:1.35}
  .bub button{display:block;width:100%;text-align:left;margin-top:6px;padding:10px 12px;border-radius:12px;border:1.5px solid rgba(0,0,0,.12);background:#fff;color:#12263F;font-weight:700;font-size:14px;cursor:pointer}
  .bub button small{display:block;font-weight:400;font-size:12px;color:#5B6B80;margin-top:2px}
  html[data-theme=dark] .bub{background:#3A2A08;color:#FFE9B0;border-color:#F59E0B}
  html[data-theme=dark] .bub.here{background:#0F3322;color:#C8F5DA;border-color:#22C55E}
  html[data-theme=dark] .bub button{background:#1B2230;color:#fff;border-color:rgba(255,255,255,.18)}
  html{overscroll-behavior-y:none}
  .dimg[style*="background-image"]{background-size:contain;background-repeat:no-repeat;background-position:center;background-color:#EEF3FB}
  html[data-theme=dark] .dimg[style*="background-image"]{background-color:#0E1626}
  .rad span{flex:none}
  .rad{display:flex;align-items:center;gap:6px;margin:8px 0 4px;font-size:13px;font-weight:700;color:var(--gray,#5B6B80)}
  .rad button{height:32px;flex:1;min-width:0;white-space:nowrap;padding:0 4px;border-radius:16px;border:1px solid var(--border,#D6E0EE);background:transparent;color:var(--dark,#12263F);font-weight:700;font-size:13px;cursor:pointer;font-family:inherit}
  .rad button.on{background:var(--red,#0F2E6B);color:#fff;border-color:var(--red,#0F2E6B)}
  .hbtns{display:flex;align-items:center;gap:8px;flex:none}
  .themebtn{width:40px;height:40px;border-radius:50%;border:1px solid var(--border,#D6E0EE);background:transparent;color:var(--red,#0F2E6B);display:flex;align-items:center;justify-content:center;padding:0;cursor:pointer;flex:none}
  .themebtn svg{width:20px;height:20px}
  .av,.row2 .av{flex:none;aspect-ratio:1/1}
  .row2 .av{min-width:0}
  .safe{background:#FFF8E1;border:1px solid #FFE082;color:#4A3205;border-radius:12px;padding:10px 12px;margin:0 0 10px;font-size:13px;line-height:1.4}
  .safe b{color:inherit}.safe a,.safe button.lk{color:#B45309;font-weight:700;text-decoration:underline;background:none;border:0;padding:0;font:inherit;font-weight:700;cursor:pointer}
  html[data-theme=dark] .safe{background:rgba(255,176,32,.12);border-color:rgba(255,176,32,.35);color:#FFD27A}
  html[data-theme=dark] .safe a,html[data-theme=dark] .safe button.lk{color:#FFB020}
  .exp{margin-top:8px;font-size:13px;font-weight:800;color:var(--gray,#5B6B80);display:flex;align-items:center;gap:6px}
  .exp:before{content:"";width:8px;height:8px;border-radius:50%;background:#2ECC71;flex:none}
  .exp.warn{color:#FFB020}.exp.warn:before{background:#FFB020}
  .exp.crit{color:#FF5A4A}.exp.crit:before{background:#FF5A4A}
  .quero.renew{background:linear-gradient(180deg,#FFD25A,#FFB020)!important;color:#3A2600!important;box-shadow:0 4px 0 #D99A00!important;text-shadow:none!important}
  .quero.renew.warn{animation:pulse 1.6s infinite}
  @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
  .soon{margin:12px 12px 0 12px;border:2px solid #FFB020;border-radius:16px;padding:12px;background:rgba(255,176,32,.12);display:flex;flex-direction:column;gap:10px}
  .soon b{font-size:15px;color:var(--dark,#12263F)}
  .soon .big2{height:46px;border-radius:12px;background:#FFB020;color:#3A2600;font-weight:800;font-size:15px;width:100%}
  .dupbox{border:2px solid #FFB020;border-radius:14px;padding:12px;background:rgba(255,176,32,.1);display:flex;flex-direction:column;gap:8px}
  .dupbox b{font-size:15px;color:var(--dark,#12263F)}.dupbox p{margin:0;font-size:13px;color:var(--gray,#5B6B80)}
  .dupbox .use{text-align:left;border:1px solid var(--border,#D6E0EE);border-radius:12px;padding:10px 12px;background:var(--panel,#fff);color:var(--dark,#12263F);font-size:14px;font-weight:700;line-height:1.3}
  .dupbox .use small{display:block;font-weight:600;color:var(--gray,#5B6B80);font-size:12px;margin-top:2px}
  .regbox small.req{color:var(--gray,#5B6B80);font-size:12px}
  .tagp{display:inline-block;font-size:10px;font-weight:800;padding:2px 6px;border-radius:6px;background:#FFB020;color:#3A2600;margin-left:6px;vertical-align:middle}
  .adm .cardc{background:var(--panel,#fff);border:1px solid var(--border,#D6E0EE);border-radius:16px;padding:12px;display:flex;flex-direction:column;gap:8px}
  .adm .cardc input{width:100%;height:46px;border:1px solid var(--border,#D6E0EE);border-radius:12px;padding:0 12px;background:var(--panel,#fff);color:var(--dark,#12263F);font-size:15px}
  .adm .cardc small{color:var(--gray,#5B6B80);font-size:13px;line-height:1.35}
  .adm .grid2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .adm .grid2 button,.adm .grid2 select{height:44px;border-radius:12px;font-weight:700;font-size:14px;border:1px solid var(--border,#D6E0EE);background:var(--panel,#fff);color:var(--dark,#12263F);padding:0 8px;width:100%}
  .adm .grid2 a.lnk{display:flex;align-items:center;justify-content:center;height:44px;border-radius:12px;font-weight:700;font-size:14px;border:1px solid var(--border,#D6E0EE);background:var(--panel,#fff);color:var(--dark,#12263F);text-decoration:none}
  .adm .ok{background:#24B97F!important;color:#fff!important;border-color:#24B97F!important}
  .adm .no{background:#FF5A4A!important;color:#fff!important;border-color:#FF5A4A!important}
  .adm h3{margin:8px 0 0;font-size:17px}
  .adm .sim{font-size:12px;color:#FFB020;font-weight:700}
  `;
  document.head.appendChild(st);

  /* ---------- normalização / similaridade ---------- */
  const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const slug = s => norm(s).replace(/ /g, '-');
  const STOP = new Set(['de', 'da', 'do', 'dos', 'das', 'e', 'n', 'no', 'num', 'numero', 'nr', 'sn']);
  const ABBR = { rua: 'r', avenida: 'av', av: 'av', travessa: 'tv', alameda: 'al', estrada: 'est', rodovia: 'rod', praca: 'pc', largo: 'lg', r: 'r', tv: 'tv', al: 'al', est: 'est', rod: 'rod' };
  function addrKey(end, cidade) {
    const t = norm(end).split(' ').filter(Boolean);
    let idx = -1; t.forEach((w, i) => { if (/^\d+$/.test(w)) idx = i; });
    const num = idx >= 0 ? t[idx] : '';
    const street = t.filter((w, i) => i !== idx && !STOP.has(w)).map(w => ABBR[w] || w).join(' ');
    return street + '#' + num + '|' + norm(cidade);
  }
  const GEN = new Set(['condominio', 'cond', 'edificio', 'ed', 'edf', 'residencial', 'res', 'conjunto', 'conj', 'residence', 'torre', 'bloco', 'de', 'da', 'do', 'dos', 'das', 'e', 'o', 'a', 'os', 'as']);
  const nameTokens = n => norm(n).split(' ').filter(w => w && !GEN.has(w));
  function lev(a, b) {
    const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[n];
  }
  function sim(a, b) {
    const ta = nameTokens(a), tb = nameTokens(b);
    if (!ta.length || !tb.length) return norm(a) === norm(b) ? 1 : 0;
    const A = new Set(ta), B = new Set(tb); let i = 0; A.forEach(x => B.has(x) && i++);
    const jac = i / (A.size + B.size - i);
    const sa = ta.join(' '), sb = tb.join(' ');
    const l = 1 - lev(sa, sb) / Math.max(sa.length, sb.length);
    const subset = (i === Math.min(A.size, B.size)) ? 0.7 : 0;
    return Math.max(jac, l, subset);
  }


  /* ---------- distância real entre condomínios (CEP → coordenadas) ---------- */
  const rad = x => x * Math.PI / 180;
  const haversine = (a, b) => {
    const R = 6371, dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };
  const hasGeo = c => c && typeof c.lat === 'number' && typeof c.lng === 'number' && isFinite(c.lat) && isFinite(c.lng);
  const fmtCep = v => { const d = String(v || '').replace(/\D/g, '').slice(0, 8); return d.length > 5 ? d.slice(0, 5) + '-' + d.slice(5) : d; };
  const fetchT = (url, opt, ms) => { const c = new AbortController(), t = setTimeout(() => c.abort(), ms || 8000); return fetch(url, { ...(opt || {}), signal: c.signal }).finally(() => clearTimeout(t)); };
  async function lookupCep(cep) { // BrasilAPI (traz coordenadas quando tem); ViaCEP como reserva
    const d = String(cep || '').replace(/\D/g, ''); if (d.length !== 8) return null;
    try {
      const r = await fetchT('https://brasilapi.com.br/api/cep/v2/' + d, null, 7000); if (!r.ok) throw new Error('cep');
      const j = await r.json(), c = (j.location && j.location.coordinates) || {};
      const lat = Number(c.latitude), lng = Number(c.longitude);
      return { street: j.street || '', bairro: j.neighborhood || '', cidade: j.city || '', lat: isFinite(lat) && c.latitude != null ? lat : null, lng: isFinite(lng) && c.longitude != null ? lng : null };
    } catch (e) {
      try {
        const r = await fetchT('https://viacep.com.br/ws/' + d + '/json/', null, 7000); const j = await r.json(); if (j.erro) return null;
        return { street: j.logradouro || '', bairro: j.bairro || '', cidade: j.localidade || '', lat: null, lng: null };
      } catch (e2) { return null; }
    }
  }
  async function geocode(end, bairro, cidade) { // OpenStreetMap/Nominatim (uso leve, 1 consulta por cadastro)
    try {
      const q = encodeURIComponent([end, bairro, cidade, 'Brasil'].filter(Boolean).join(', '));
      const r = await fetchT('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=' + q, { headers: { 'Accept-Language': 'pt-BR' } }, 8000);
      const j = await r.json();
      return j && j[0] ? { lat: Number(j[0].lat), lng: Number(j[0].lon) } : null;
    } catch (e) { return null; }
  }
  /* ---------- registros de condomínios (CR) ---------- */
  const baseDist = Object.fromEntries(CONDOS.map(c => [c[0], c[1]]));
  let CR;
  if (window.CLOUD_ON) CR = [];            // na nuvem, só condomínios reais vindos do servidor
  else CR = store.get('condoRecs', null);
  if (!CR) CR = CONDOS.map(c => ({ id: 'c-' + slug(c[0]), name: c[0], endereco: c[4] || '', bairro: c[2] || '', cidade: c[3] || 'Mogi das Cruzes', status: 'approved' }));
  window.CR = CR;
  const persistCR = () => { if (!window.CLOUD_ON) store.set('condoRecs', CR); };
  function rebuildCondos() {
    const me = window.Cloud && Cloud.uid;
    const mine = S.user && CR.find(x => x.name === S.user.condo);
    CONDOS.length = 0;
    CR.filter(c => c.status === 'approved' || (c.status === 'pending' && (!window.CLOUD_ON || c.createdBy === me || (window.Cloud && Cloud.isAdmin))))
      .forEach(c => {
        let d = baseDist[c.name] != null ? baseDist[c.name] : 0;
        if (hasGeo(mine) && hasGeo(c)) d = c.name === mine.name ? 0 : Math.max(0.1, Math.round(haversine(mine, c) * 10) / 10); // distância real
        CONDOS.push([c.name, d, c.bairro || '', c.cidade || '', c.endereco || '', c.status]);
      });
  }
  window.rebuildCondos = rebuildCondos; window.persistCR = persistCR;
  rebuildCondos(); persistCR();

  /* ---------- anti-duplicidade: o mesmo condomínio não pode ter vários nomes ---------- */
  const NAME_STOP = new Set('condominio condominios cond residencial res edificio edif ed edf conjunto conj da de do das dos e a o the club'.split(' '));
  const core = s => norm(s).split(' ').filter(w => w && !NAME_STOP.has(w)).map(w => w.replace(/s$/, ''));
  const subsetName = (a, b) => { // "Vila" ⊂ "Vila Prosperidade" ≈ "Vila da Prosperidade"
    const A = core(a), B = core(b);
    if (!A.length || !B.length) return norm(a) === norm(b);
    const [s, l] = A.length <= B.length ? [A, B] : [B, A];
    return s.every(w => l.some(x => x === w || (w.length >= 4 && x.length >= 4 && (x.startsWith(w) || w.startsWith(x)))));
  };
  const numOf = e => { const m = String(e || '').match(/\d+/g); return m ? m[m.length - 1] : ''; };
  const cep8 = c => String(c || '').replace(/\D/g, '');
  function findMatches(g) {
    const k = addrKey(g.end, g.cidade), out = [];
    CR.forEach(c => {
      if (c.status === 'rejected') return;
      const sameCity = norm(c.cidade) === norm(g.cidade);
      const sameAddr = (c.endereco && addrKey(c.endereco, c.cidade) === k)
        || (cep8(c.cep).length === 8 && cep8(c.cep) === cep8(g.cep) && numOf(c.endereco) && numOf(c.endereco) === numOf(g.end));
      const nameLike = sameCity && subsetName(c.name, g.name);
      const geo = hasGeo(c) && hasGeo(g) ? haversine(c, g) : null;
      const sameArea = (norm(c.bairro) && norm(c.bairro) === norm(g.bairro))
        || (cep8(c.cep).slice(0, 5) && cep8(c.cep).slice(0, 5) === cep8(g.cep).slice(0, 5)) || (geo != null && geo < 1.5);
      const s = sim(c.name, g.name);
      if (sameAddr) out.push({ rec: c, why: 'mesmo endereço', score: 3, hard: true });
      else if (nameLike && geo != null && geo < 0.1) out.push({ rec: c, why: 'mesmo local', score: 2.5, hard: true });
      else if (nameLike && sameArea) out.push({ rec: c, why: 'mesmo nome nesta região', score: 2, hard: true });
      else if (sameCity && s >= 0.6) out.push({ rec: c, why: 'nome parecido', score: s });
    });
    return out.sort((a, b) => b.score - a.score).slice(0, 4);
  }

  /* ---------- sugestões do mapa (OpenStreetMap): nome → endereço e endereço → nome ---------- */
  const fromNom = x => {
    const a = x.address || {}, name = x.name || (x.display_name || '').split(',')[0];
    if (!name || !isFinite(Number(x.lat))) return null;
    return { name, end: [a.road, a.house_number].filter(Boolean).join(', '), cep: a.postcode || '', bairro: a.suburb || a.neighbourhood || a.city_district || '',
      cidade: a.city || a.town || a.municipality || a.village || '', lat: Number(x.lat), lng: Number(x.lon) };
  };
  const fromOsm = e => {
    const t = e.tags || {}, la = e.lat != null ? e.lat : e.center && e.center.lat, ln = e.lon != null ? e.lon : e.center && e.center.lon;
    if (!t.name || la == null || ln == null) return null;
    return { name: t.name, end: [t['addr:street'], t['addr:housenumber']].filter(Boolean).join(', '), cep: t['addr:postcode'] || '', bairro: t['addr:suburb'] || t['addr:neighbourhood'] || '',
      cidade: t['addr:city'] || '', lat: la, lng: ln, osm: (e.type || 'n')[0] + e.id,
      area: !!(t.place || t.boundary || (t.landuse === 'residential' && !/gated|apartments/.test(t.residential || '')) || t.admin_level) };
  };
  const OSM_NAME = 'condom[ií]nio|residencial|edif[ií]cio|^res[. ]|^ed[. ]|residence|torre|village|villa[gl]|spazio|reserva|solar d|parque d';
  async function overpass(q) {
    const big = q.includes('around:20000'), mirrors = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
    let last;
    for (const u of (big ? mirrors : mirrors.slice(0, 1))) {
      try {
        const r = await fetchT(u, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'data=' + encodeURIComponent(q) }, big ? 100000 : 9000);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const j = await r.json(); return (j.elements || []).map(fromOsm).filter(Boolean);
      } catch (e) { last = e; }
    }
    throw last;
  }
  const nearbyOsm = (lat, lng, rad) => overpass(`[out:json][timeout:15];nwr["name"~"${OSM_NAME}",i](around:${rad || 250},${lat},${lng});out center tags 20;`);
  // lista da Receita Federal por cidade (arquivo estático no site; carregado só quando alguém cadastra, uma vez por cidade)
  const RF = {};
  async function rfList(cidade) {
    const k = norm(cidade || '').replace(/ /g, '-'); if (!k) return [];
    if (RF[k]) return RF[k];
    RF[k] = [];
    try {
      const r = await fetchT('data/condominios/' + k + '.csv', null, 15000); if (!r.ok) return RF[k];
      const rows = parseCsv(await r.text()); const h = rows.shift().map(x => norm(x)), ix = n => h.indexOf(n);
      RF[k] = rows.map(c => ({ name: c[ix('nome')] || '', end: c[ix('endereco')] || '', bairro: c[ix('bairro')] || '', cep: c[ix('cep')] || '', cidade: c[ix('cidade')] || cidade,
        lat: parseFloat(c[ix('lat')]), lng: parseFloat(c[ix('lng')]), rf: true })).filter(x => x.name);
      RF[k].forEach(x => { x.n = norm(x.name + ' ' + x.end + ' ' + x.bairro); if (!isFinite(x.lat)) { x.lat = null; x.lng = null; } });
    } catch (e) {}
    return RF[k];
  }
  const rfByCep = (list, cep, num) => {
    const c = String(cep || '').replace(/\D/g, ''); if (c.length !== 8) return [];
    return list.filter(x => String(x.cep).replace(/\D/g, '') === c).sort((a, b) => ((splitEnd(b.end).num === num) - (splitEnd(a.end).num === num))).slice(0, 5);
  };
  const rfByName = (list, q) => { const ws = norm(q).split(' ').filter(w => w.length > 1); if (!ws.length) return []; return list.filter(x => ws.every(w => x.n.includes(w))).slice(0, 8); };
  const sugHtml = () => {
    const g = S.reg || {}, here = g.here || [], l = g.sugs || [];
    if (here.length) return `<div class="bub here"><b>Este endereço já está cadastrado</b><p>Toque para usar o nome que já existe (assim todos os vizinhos ficam juntos):</p>${here.map(m => `<button data-usecondo="${esc(m.rec.name)}">Usar «${esc(m.rec.name)}»<small>${esc(m.rec.endereco || '')}${m.rec.bairro ? ' • ' + esc(m.rec.bairro) : ''}</small></button>`).join('')}</div>`;
    if (l.length) return `<div class="bub"><b>${g.sugKind === 'name' ? (l[0] && l[0].rf ? 'Condomínios da cidade' : 'Encontrado no mapa') : (l[0] && l[0].rf ? 'É um destes condomínios?' : 'É este o seu condomínio?')}</b><p>Toque no nome certo e o resto é preenchido sozinho:</p>${l.map((s, i) => `<button data-geosug="${i}">${esc(s.name)}<small>${esc([s.end, s.bairro].filter(Boolean).join(' • ') || 'sem endereço no mapa')}</small></button>`).join('')}</div>`;
    if (g.sugBusy) return `<div class="bub"><b>Procurando o nome do condomínio…</b><p>Só um instante.</p></div>`;
    if (g.sugMsg) return `<div class="bub"><b>${esc(g.sugMsg)}</b></div>`;
    return '';
  };
  const updSug = () => { const el = $('#r-sug'); if (el) el.innerHTML = sugHtml(); };
  let nameT;
  function searchName(q) {
    clearTimeout(nameT);
    if (q.trim().length < 4) { if (S.reg.sugKind === 'name') S.reg.sugs = []; updSug(); return; }
    nameT = setTimeout(async () => {
      try {
        const rf = rfByName(await rfList(S.reg.cidade), q);
        if (S.reg.name !== q) return;
        if (rf.length) { S.reg.sugs = rf; S.reg.sugKind = 'name'; S.reg.here = []; return updSug(); }
        const r = await fetchT('https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&countrycodes=br&q=' + encodeURIComponent(q + ', ' + (S.reg.cidade || '')), { headers: { 'Accept-Language': 'pt-BR' } }, 8000);
        const j = await r.json(); if (S.reg.name !== q) return;
        S.reg.sugs = j.map(fromNom).filter(Boolean); S.reg.sugKind = 'name'; S.reg.here = []; updSug();
      } catch (e) {}
    }, 700);
  }
  const splitEnd = e => { const m = String(e || '').match(/^(.*?)[,\s]+(\d+\w?)\s*$/); return m ? { street: m[1].trim(), num: m[2] } : { street: String(e || '').trim(), num: '' }; };
  const setEnd = g => { g.end = g.street ? (g.street.trim() + (g.num ? ', ' + g.num.trim() : '')) : ''; };
  let placeT;
  function placeLookup() { // CEP + número completos: acha cadastro igual ou sugere o nome no mapa
    clearTimeout(placeT);
    const g = S.reg;
    if (g.cep.length !== 9 || !/\d/.test(g.num || '') || !g.street.trim()) { g.here = []; g.sugs = []; g.sugBusy = false; g.sugMsg = ''; updSug(); return; }
    g.sugBusy = true; g.sugMsg = ''; g.here = []; g.sugs = []; g.sugKind = 'place'; updSug();
    const snap = g.cep + '|' + g.num + '|' + g.street;
    placeT = setTimeout(async () => {
      setTimeout(() => { if (g.sugBusy && snap === g.cep + '|' + g.num + '|' + g.street) { g.sugBusy = false; g.sugMsg = 'O mapa demorou a responder. Digite o nome do condomínio abaixo.'; updSug(); } }, 14000);
      const same = () => snap === g.cep + '|' + g.num + '|' + g.street;
      const here = findMatches({ name: '', end: g.end, cidade: g.cidade, cep: g.cep, bairro: g.bairro, lat: g.lat, lng: g.lng }).filter(m => m.why === 'mesmo endereço');
      if (here.length) { g.here = here; g.sugBusy = false; return updSug(); }
      const rfc = rfByCep(await rfList(g.cidade), g.cep, g.num);
      if (!same()) return;
      if (rfc.length) { g.sugBusy = false; g.sugs = rfc; g.sugKind = 'name'; updSug(); return; }
      const c = await geocode(g.end, g.bairro, g.cidade);
      if (!same()) return;
      if (c && isFinite(c.lat)) { g.lat = c.lat; g.lng = c.lng; }
      let l = [];
      if (g.lat != null) { try { l = await nearbyOsm(g.lat, g.lng, 100); if (!l.length) l = await nearbyOsm(g.lat, g.lng, 250); } catch (e) {} }
      if (!same()) return;
      g.sugBusy = false; g.sugs = l.slice(0, 5);
      if (!l.length) g.sugMsg = 'Não achei o nome no mapa. Digite o nome do condomínio abaixo.';
      updSug();
    }, 500);
  }
  async function suggestByPlace(lat, lng, cepNow, rad) {
    try { const l = await nearbyOsm(lat, lng, rad); if (S.reg.cep !== cepNow || !l.length) return; S.reg.sugs = l.slice(0, 6); updSug(); } catch (e) {}
  }

  /* ---------- seletor de condomínio + cadastro ---------- */
  window.condoPicker = function (mode) {
    const onb = mode === 'onb';
    const q = (onb ? S.onb.q : S.cq).toLowerCase();
    const sel = onb ? S.onb.condo : S.user.condo;
    const list = CONDOS.filter(c => c[0].toLowerCase().includes(q));
    const g = S.reg;
    const label = c => c[5] === 'pending' ? 'em análise' : (c[2] ? esc(c[2]) : (c[1] === 0 ? 'aqui' : c[1].toLocaleString('pt-BR') + ' km'));
    const matches = (g.open && g.mode === mode && g.matches && g.matches.length) ? (g.hard ? `
      <div class="dupbox"><b>Este condomínio já está cadastrado</b>
       <p>Para não termos o mesmo lugar com vários nomes, use o nome que já existe:</p>
       ${g.matches.map(m => `<button class="use" data-usecondo="${esc(m.rec.name)}">Usar «${esc(m.rec.name)}»<small>${esc(m.rec.endereco || 'sem endereço')} • ${esc(m.why)}</small></button>`).join('')}
       <p>Se o nome estiver errado, fale com o suporte que o administrador corrige para todos.</p></div>` : `
      <div class="dupbox"><b>Já existe algo parecido</b>
       <p>Antes de criar outro, veja se é o mesmo condomínio:</p>
       ${g.matches.map(m => `<button class="use" data-usecondo="${esc(m.rec.name)}">Usar «${esc(m.rec.name)}»<small>${esc(m.rec.endereco || 'sem endereço')} • ${esc(m.why)}</small></button>`).join('')}
       <p>Se for outro condomínio de verdade, envie para análise. Verificamos e liberamos.</p>
       <button class="opt" data-regnew style="width:100%">É outro condomínio — enviar para análise</button></div>`) : '';
    return `<input type="text" id="${onb ? 'o-q' : 'c-q'}" value="${esc(onb ? S.onb.q : S.cq)}" placeholder="Buscar condomínio..." autocomplete="off" style="margin-bottom:8px">
    <div class="sug">${list.map(c => `<button class="${sel === c[0] ? 'on' : ''}" ${onb ? 'data-condo' : 'data-condopick'}="${esc(c[0])}">${esc(c[0])}<small>${label(c)}</small></button>`).join('') || '<button disabled>Nenhum condomínio encontrado</button>'}</div>
    ${g.open && g.mode === mode ? `<div class="regbox"><b>Cadastrar meu condomínio</b>
      <small class="req">1) CEP, 2) número. Em seguida sugerimos o nome do condomínio.</small>
      <input type="text" id="r-cep" inputmode="numeric" maxlength="9" value="${esc(g.cep || '')}" placeholder="1) CEP *" autocomplete="postal-code">
      <input type="text" id="r-street" value="${esc(g.street || '')}" placeholder="Rua (preenchida pelo CEP) *">
      <input type="text" id="r-num" inputmode="numeric" value="${esc(g.num || '')}" placeholder="2) Número *" autocomplete="off">
      <div id="r-sug">${sugHtml()}</div>
      <input type="text" id="r-name" value="${esc(g.name)}" placeholder="3) Nome do condomínio *" autocomplete="off">
      <input type="text" id="r-bairro" value="${esc(g.bairro)}" placeholder="Bairro *">
      <input type="text" id="r-cidade" value="${esc(g.cidade)}" placeholder="Cidade *">
      <small class="req">${g.geoMsg ? esc(g.geoMsg) + ' ' : ''}Todos os campos são obrigatórios; o CEP serve para calcular a distância até os vizinhos. Cadastros parecidos com um já existente passam por aprovação.</small>
      ${matches}
      <div class="row"><button class="opt" data-regcancel>Cancelar</button><button class="cta48" style="flex:1;min-width:120px" data-regsave>Salvar</button></div></div>`
      : `<button class="ghost" data-regopen="${mode}">＋ Cadastrar meu condomínio</button>`}`;
  };

  const resetReg = mode => { S.reg = { open: false, mode, name: '', cep: '', end: '', street: '', num: '', here: [], sugKind: '', sugBusy: false, sugMsg: '', bairro: '', cidade: 'Mogi das Cruzes', lat: null, lng: null, geoMsg: '', matches: null, hard: false, sugs: [], confirmNew: false }; };
  function chooseCondo(name) {
    if (S.reg.mode === 'onb') { S.onb.condo = name; S.onb.q = ''; }
    else { S.user.condo = name; S.condoSheet = false; save(); rebuildCondos(); window.Cloud && Cloud.saveUser(S.user); }
  }
  window.saveCondo = async function () {
    const g = S.reg, name = g.name.trim(), end = g.end.trim(), bairro = g.bairro.trim(), cidade = g.cidade.trim();
    if (!name || !end || !bairro || !cidade) return toast('Preencha nome, endereço, bairro e cidade');
    if (String(g.cep || '').replace(/\D/g, '').length !== 8) return toast('Informe o CEP (8 números)');
    if (!/\d/.test(end)) return toast('Inclua o número no endereço (ex.: Rua das Flores, 120)');
    if (window.CLOUD_ON && window.Cloud && Cloud.freshCondos) { toast('Conferindo condomínios já cadastrados…'); await Cloud.freshCondos(); }
    if (CR.some(c => c.status !== 'rejected' && norm(c.name) === norm(name))) { // o nome é a chave: não pode repetir
      const same = CR.filter(c => c.status !== 'rejected' && norm(c.name) === norm(name)).map(c => ({ rec: c, why: 'mesmo nome', score: 4, hard: true }));
      g.matches = same.slice(0, 4); g.hard = true; g.confirmNew = false; render();
      return toast('Já existe um condomínio com esse nome. Use o da lista.');
    }
    if (g.lat == null) { // coordenadas: pelo CEP ou pelo endereço (ajuda a achar o mesmo local)
      toast('Localizando o endereço…');
      const geo = await geocode(end, bairro, cidade);
      if (geo && isFinite(geo.lat) && isFinite(geo.lng)) { g.lat = geo.lat; g.lng = geo.lng; }
    }
    const full = { name, end, cidade, cep: g.cep, bairro, lat: g.lat, lng: g.lng };
    const all = findMatches(full), hard = all.filter(x => x.hard);
    if (hard.length) { // bloqueia: o mesmo lugar não pode ter outro nome
      g.matches = hard; g.hard = true; g.confirmNew = false; render();
      return toast('Esse condomínio já existe. Use o nome cadastrado.');
    }
    const m = all;
    if (m.length && !g.confirmNew) { g.matches = m; g.hard = false; render(); return; }
    const rec = { id: 'c-' + cep8(g.cep) + '-' + numOf(end), name, endereco: end, cep: fmtCep(g.cep), bairro, cidade, status: m.length ? 'pending' : 'approved', createdBy: (S.user && S.user.id) || null, ts: Date.now() };
    if (g.lat != null && g.lng != null) { rec.lat = g.lat; rec.lng = g.lng; }
    CR.push(rec); persistCR();
    window.Cloud && Cloud.saveCondo(rec);
    chooseCondo(name); rebuildCondos();
    const mode = g.mode; resetReg(mode);
    render();
    toast(rec.status === 'pending' ? 'Enviado para análise. Você já pode usar o app.' : 'Condomínio cadastrado');
  };

  /* ---------- onboarding com e-mail ---------- */
  const _onb = window.onboarding;
  window.onboarding = function () {
    let h = _onb();
    const o = S.onb;
    h = h.replace('</div>\n  <div><label>Condomínio', `</div>\n  <div><label>E-mail <small style="color:var(--gray);font-weight:400">(avisos de vencimento do anúncio)</small></label><input type="text" id="o-email" inputmode="email" autocomplete="email" value="${esc(o.email || '')}" placeholder="voce@email.com"></div>\n  <div><label>Condomínio`);
    if (!validEmail(o.email) && !/id="o-go" disabled/.test(h)) h = h.replace('id="o-go" ', 'id="o-go" disabled ');
    return h;
  };
  const refreshGo = () => { const b = $('#o-go'); if (b) b.disabled = !(S.onb.name.trim() && S.onb.apt.trim() && S.onb.condo && validEmail(S.onb.email)); };

  /* ---------- validade dos anúncios ---------- */
  function purgeExpired() {
    const now = Date.now();
    const gone = S.posts.filter(p => p.expiresAt && p.expiresAt < now);
    if (!gone.length) return;
    S.posts = S.posts.filter(p => !(p.expiresAt && p.expiresAt < now));
    if (!window.CLOUD_ON) save();
    else window.Cloud && Cloud.purge(gone.filter(p => p.mine));
  }
  S.posts.forEach(p => { if (!p.expiresAt) p.expiresAt = (p.ts || Date.now()) + DURATION_DAYS * DAY; });
  if (!window.CLOUD_ON && !store.get('demoOwn', false)) {   // demonstração: um anúncio seu vencendo em 2 dias
    const d = S.posts.find(p => p.id === 'p2');
    if (d) { d.mine = true; d.expiresAt = Date.now() + 2 * DAY - 3600e3; }
    store.set('demoOwn', true); save();
  }

  const _card = window.card;
  window.card = function (p) {
    if (p.mine && S.user) p.seller = S.user.name;
    let h = _card(p);
    if (!p.mine || !p.expiresAt) return h;
    const d = daysLeft(p), cls = d <= 1 ? 'crit' : d <= WARN_DAYS ? 'warn' : '';
    h = h.replace(`<button class="quero" data-quero="${p.id}">Quero</button>`, `<button class="quero renew ${cls}" data-renew="${p.id}">Renovar</button>`);
    h = h.replace('<div class="bot">', `<div class="exp ${cls}">Vence em ${d} dia${d === 1 ? '' : 's'}</div><div class="bot">`);
    return h;
  };
  const _detail = window.detail;
  window.detail = function () {
    let h = _detail();
    const p = S.posts.find(x => x.id === S.detail);
    if (!p || !p.mine || !p.expiresAt) return h;
    const d = daysLeft(p), cls = d <= 1 ? 'crit' : d <= WARN_DAYS ? 'warn' : '';
    h = h.replace('<div class="proof">', `<div class="exp ${cls}">Seu anúncio vence em ${d} dia${d === 1 ? '' : 's'} (${fmtDate(p.expiresAt)})</div><div class="proof">`);
    h = h.replace(/<button class="big" data-whats="[^"]*">[^<]*<\/button>/, `<button class="big" data-renew="${p.id}">Renovar +${DURATION_DAYS} dias</button>`);
    return h;
  };
  const _feed = window.feed;
  window.feed = function () {
    let h = _feed();
    const soon = S.posts.filter(p => p.mine && p.expiresAt && daysLeft(p) <= WARN_DAYS).slice(0, 2);
    if (soon.length) {
      const b = soon.map(p => { const d = daysLeft(p); return `<div class="soon"><b>«${esc(p.title)}» vence em ${d} dia${d === 1 ? '' : 's'}</b><button class="big2" data-renew="${p.id}">Renovar +${DURATION_DAYS} dias</button></div>`; }).join('');
      h = h.replace('<div class="layout">', b + '<div class="layout">');
    }
    return h;
  };
  const _newPost = window.newPost;
  window.newPost = function () {
    return _newPost().replace('<button class="cta52" id="f-go"', `<small style="color:var(--gray);font-size:13px">Seu anúncio fica no ar por ${DURATION_DAYS} dias e pode ser renovado. Avisamos por e-mail ${WARN_DAYS} dias antes de vencer.</small><button class="cta52" id="f-go"`);
  };
  function renew(id) {
    const p = S.posts.find(x => x.id === id); if (!p) return;
    p.expiresAt = Date.now() + DURATION_DAYS * DAY; p.warnedAt = null;
    if (!window.CLOUD_ON) save();
    window.Cloud && Cloud.renew(p);
    render(); toast(`Anúncio renovado por ${DURATION_DAYS} dias`);
  }

  /* ---------- perfil: e-mail e painel do administrador ---------- */
  const _perfil = window.perfil;
  window.perfil = function () {
    let h = _perfil();
    const u = S.user;
    const emailBlock = `<div class="row2" style="display:block;margin-top:12px"><b>E-mail para avisos</b><small>Avisamos ${WARN_DAYS} dias antes de um anúncio seu vencer.</small>
      <input type="text" id="p-email" inputmode="email" value="${esc(u.email || '')}" placeholder="voce@email.com" style="width:100%;margin-top:8px;height:48px;border-radius:12px;border:1px solid var(--border);padding:0 14px;background:var(--panel,#fff);color:var(--dark)">
      <button class="ghost" data-saveemail>Salvar e-mail</button></div>`;
    const pend = CR.filter(c => c.status === 'pending').length;
    const adm = `<button class="ghost" data-adminopen>Painel do administrador${window.CLOUD_ON ? '' : ' (demo)'}${pend ? ` • ${pend} em análise` : ''}</button>`;
    h = h.replace('<button class="ghost" data-reset', emailBlock + adm + '\n <button class="ghost" data-reset');
    const mine = S.posts.filter(p => p.mine).length;
    return h;
  };

  /* ---------- painel do administrador ---------- */
  const localAdm = {
    renameRefs(oldN, newN) {
      S.posts.forEach(p => { if (p.building && p.building.split(' • ')[0] === oldN) p.building = newN + p.building.slice(oldN.length); });
      if (S.user && S.user.condo === oldN) S.user.condo = newN;
      if (S.onb && S.onb.condo === oldN) S.onb.condo = newN;
    },
    refs(name) { return (S.user && S.user.condo === name) || S.posts.some(p => (p.building || '').split(' • ')[0] === name && p.mine); },
    async approve(rec) { rec.status = 'approved'; },
    async rename(rec, n) { const o = rec.name; rec.name = n; this.renameRefs(o, n); },
    async merge(rec, target) { this.renameRefs(rec.name, target.name); CR.splice(CR.indexOf(rec), 1); },
    async remove(rec) { if (this.refs(rec.name)) throw new Error('Há moradores ou anúncios nesse condomínio. Use "Mesclar em…".'); CR.splice(CR.indexOf(rec), 1); }
  };
  const ops = () => (window.CLOUD_ON ? Cloud.adm : localAdm);
  const isAdmin = () => !window.CLOUD_ON || (window.Cloud && Cloud.isAdmin);
  const isMod = () => !!(window.CLOUD_ON && window.Cloud && Cloud.role === 'mod');

  function adminSheet() {
    if (window.CLOUD_ON && !isAdmin()) {
      return `<div class="ov" data-admclose><div class="sheet adm" id="admsheet"><div class="handle"></div><button class="close" data-admclose>✕</button><div class="form"><h2>Administrador</h2>
        <div class="cardc"><small>Diagnóstico: ${Cloud.admErr ? 'erro ' + esc(Cloud.admErr) : 'conta ' + (Cloud.email ? 'Google (' + esc(Cloud.email) + ')' : 'anônima')} • código ${esc(String(Cloud.uid || '').slice(0, 8))}…</small></div>
        ${Cloud.email ? `<div class="cardc"><b>Conectado como ${esc(Cloud.email)}</b><small>Esta conta ainda não é administradora. No Firestore, crie o documento <b>admins/${esc(Cloud.uid)}</b> (pode ser vazio) e volte aqui.</small><button class="ghost" data-copyuid style="margin-top:8px">Copiar código</button>${Cloud.admErr ? `<small style="display:block;margin-top:6px;color:#B42318">Não consegui ler o documento (${esc(Cloud.admErr)}). Republique as regras do Firestore.</small>` : ''}<button class="cta52" data-admrecheck style="margin-top:8px">Já criei o documento: verificar</button></div>` : `<div class="cardc"><small>Entre com a sua conta Google para aprovar, renomear e mesclar condomínios.</small></div>`}
        <button class="cta52" data-adminlogin>Entrar com Google</button></div></div></div>`;
    }
    const pendAll = CR.filter(c => c.status === 'pending'), apprAll = CR.filter(c => c.status === 'approved');
    const pend = pendAll.slice(0, S.admPend || 15), appr = apprAll.slice(0, S.admAppr || 15);
    const more = (n, tot, k) => tot > n ? `<button class="ghost" data-admmore="${k}">Mostrar mais (${tot - n} restantes)</button>` : '';
    const others = rec => CR.filter(c => c !== rec && c.status !== 'rejected');
    const row = rec => {
      if (isMod()) return `<div class="cardc"><b>${esc(rec.name)}</b><small>${esc([rec.endereco || 'sem endereço', rec.cep, rec.bairro, rec.cidade].filter(Boolean).join(' • '))}</small>${rec.status === 'pending' ? `<div class="grid2"><button class="ok" data-admact="approve" data-id="${esc(rec.id)}">Aprovar</button><button class="no" data-admact="remove" data-id="${esc(rec.id)}">Recusar</button></div>` : ''}</div>`;
      const sug = findMatches({ name: rec.name, end: rec.endereco || '', cidade: rec.cidade }).filter(m => m.rec !== rec).slice(0, 2);
      return `<div class="cardc" data-rec="${esc(rec.id)}">
        <input type="text" value="${esc(rec.name)}" data-admname="${esc(rec.id)}">
        <small>${esc([rec.endereco || 'sem endereço', rec.cep, rec.bairro, rec.cidade, hasGeo(rec) ? '' : 'sem coordenadas'].filter(Boolean).join(' • '))}</small>
        ${rec.status === 'pending' && sug.length ? `<div class="sim">Parecido com: ${sug.map(m => esc(m.rec.name) + ' (' + m.why + ')').join('; ')}</div>` : ''}
        <div class="grid2">
          ${rec.status === 'pending' && sug.length ? `<button class="ok" style="grid-column:1/3" data-admact="mergesug" data-id="${esc(rec.id)}">Mesclar em «${esc(sug[0].rec.name)}»</button>` : ''}
          <button data-admact="rename" data-id="${esc(rec.id)}">Salvar nome</button>
          <a class="lnk" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([rec.endereco, rec.bairro, rec.cidade].filter(Boolean).join(', '))}">Ver mapa</a>
          <select data-admtarget="${esc(rec.id)}"><option value="">Mesclar em…</option>${others(rec).map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select>
          <button data-admact="merge" data-id="${esc(rec.id)}">Mesclar</button>
          ${rec.status === 'pending' ? `<button class="ok" data-admact="approve" data-id="${esc(rec.id)}">Aprovar</button><button class="no" data-admact="remove" data-id="${esc(rec.id)}">Recusar</button>` : `<button class="no" style="grid-column:1/3" data-admact="remove" data-id="${esc(rec.id)}">Apagar</button>`}
        </div>
      </div>`;
    };
    return `<div class="ov" data-admclose><div class="sheet adm" id="admsheet"><div class="handle"></div><button class="close" data-admclose>✕</button><div class="form"><h2>Painel ${isMod() ? 'do moderador' : 'do administrador'}</h2>
      ${isMod() ? '<div class="cardc"><b>Perfil: moderador</b><small>Você modera anúncios denunciados e vencidos e aprova condomínios.</small></div>' : ''}
      ${isMod() ? '' : planReqHtml()}
      ${isMod() ? '' : spAdminHtml()}
      ${importHtml()}
      ${reportedHtml()}
      ${expiredHtml()}
      <h3>Em análise (${pendAll.length})</h3>${pend.map(row).join('') || '<div class="cardc"><small>Nenhum cadastro esperando aprovação.</small></div>'}${more(pend.length, pendAll.length, 'pend')}
      <h3>Aprovados (${apprAll.length})</h3>${appr.map(row).join('') || '<div class="cardc"><small>Nenhum condomínio ainda.</small></div>'}${more(appr.length, apprAll.length, 'appr')}
      <small style="color:var(--gray)">Mesclar move moradores e anúncios para o condomínio escolhido e apaga este cadastro.</small></div></div></div>`;
  }

  /* ---------- foto: compressão no aparelho (WebP, até ~200 KB) ---------- */
  window.resizeImg = function (file, cb) {
    const fr = new FileReader();
    fr.onload = () => {
      const im = new Image();
      im.onload = () => {
        const m = 800, sc = Math.min(1, m / Math.max(im.width, im.height));
        const c = document.createElement('canvas');
        c.width = Math.round(im.width * sc); c.height = Math.round(im.height * sc);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        let mime = 'image/webp', out = c.toDataURL(mime, .7);
        if (!out.startsWith('data:image/webp')) { mime = 'image/jpeg'; out = c.toDataURL(mime, .7); } // navegador sem WebP
        for (let q = .6; q >= .3 && out.length * .75 > 200 * 1024; q -= .1) out = c.toDataURL(mime, q);
        cb(out);
      };
      im.src = fr.result;
    };
    fr.readAsDataURL(file);
  };

  /* ---------- denúncia: 3 denúncias escondem o anúncio (não apaga) ---------- */
  const REPORT_LIMIT = 3;
  const reported = () => store.get('reported', []);
  const hiddenFor = p => {
    if (p.mine || isAdminNow()) return false;
    return reported().includes(p.id) || (p.reportsCount || 0) >= REPORT_LIMIT;
  };
  const isAdminNow = () => !!(window.CLOUD_ON && window.Cloud && Cloud.isAdmin);
  const _detail2 = window.detail;
  window.detail = function () {
    let h = _detail2();
    const p = S.posts.find(x => x.id === S.detail);
    if (!p || p.mine) return h;
    return h.replace('<div class="proof">', `<button class="ghost rep" data-report="${p.id}" style="margin:0 0 10px">Denunciar anúncio</button><div class="proof">`);
  };
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-report]');
    if (!t) return;
    const p = S.posts.find(x => x.id === t.dataset.report);
    if (!p) return;
    const list = reported();
    if (!list.includes(p.id)) { list.push(p.id); store.set('reported', list); }
    window.Cloud && Cloud.report && Cloud.report(p);
    S.detail = null; toast('Denúncia enviada. Obrigado por ajudar!'); render();
  });

  /* ---------- tema claro/escuro (padrão: claro) ---------- */
  const SUN = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="vertical-align:-4px"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  const MOON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-4px"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  const themeNow = () => document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  const HAS_DARK = /data-theme=dark/.test((document.querySelector('style') || {}).textContent || ''); // só o index tem tema escuro
  const _perfilT = window.perfil;
  window.perfil = function () {
    let h = _perfilT();
    if (!HAS_DARK) return h;
    const dark = themeNow() === 'dark';
    return h.replace('<button class="ghost" data-reset', `<button class="ghost" data-theme-toggle>${dark ? MOON : SUN} Tema: <b>${dark ? 'Escuro' : 'Claro'}</b> — toque para ${dark ? 'clarear' : 'escurecer'}</button><button class="ghost" data-reset`);
  };

  // atalho sol/lua no topo do feed (só no index, que tem tema escuro)
  const _feedT = window.feed;
  window.feed = function () {
    let h = _feedT();
    if (!HAS_DARK) return h;
    const dark = themeNow() === 'dark';
    const btn = `<button class="themebtn" data-theme-toggle aria-label="${dark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}">${dark ? SUN : MOON}</button>`;
    return h.replace(/(<button class="pill" data-map="[^"]*">[^<]*<\/button>)/, `<div class="hbtns">${btn}$1</div>`);
  };

  /* ---------- aviso "Carregando anúncios…" enquanto o servidor responde ---------- */
  (function () { const s = document.createElement('style'); s.textContent = '.ldg{display:flex;align-items:center;justify-content:center;gap:10px;margin:10px 0;padding:12px;border-radius:14px;background:var(--panel,#EEF3FB);color:var(--gray,#5B6B80);font-weight:700;font-size:14px}.ldg i{width:16px;height:16px;border-radius:50%;border:3px solid var(--border,#D6E0EE);border-top-color:var(--red,#0F2E6B);animation:ldgspin .8s linear infinite}@keyframes ldgspin{to{transform:rotate(360deg)}}'; document.head.appendChild(s); })();
  const _feedL = window.feed;
  window.feed = function () {
    const h = _feedL();
    if (!(window.CLOUD_ON && S.user && !(window.Cloud && Cloud.postsLoaded))) return h;
    const bar = '<div class="ldg"><i></i>Carregando anúncios…</div>';
    return /<div class="scopes">.*?<\/div>/s.test(h) ? h.replace(/(<div class="scopes">.*?<\/div>)/s, '$1' + bar) : bar + h;
  };

  /* ---------- distância: tocar em "Vizinhos" abre as opções (1 a 20 km) ---------- */
  const RAD_LIST = [1, 2, 5, 10, 15, 20];
  const _feedR = window.feed;
  window.feed = function () {
    let h = _feedR();
    if (!S.user) return h;
    const cur = RAD();
    h = h.replace(/(data-scope="viz">Vizinhos [^<]*?)(<\/button>)/, '$1 ▾$2');
    if (!S.radOpen) return h;
    const pop = `<div class="rad"><span>Até:</span>${RAD_LIST.map(n => `<button class="${n === cur ? 'on' : ''}" data-rad="${n}">${n} km</button>`).join('')}</div>`;
    return h.replace(/(<div class="scopes">.*?<\/div>)/s, '$1' + pop);
  };
  window.addEventListener('click', e => {
    if (!S.user) return;
    const r = e.target.closest('[data-rad]');
    if (r) {
      e.stopImmediatePropagation();
      S.user.radius = Math.min(RADIUS_MAX, Number(r.dataset.rad) || 5);
      S.scope = 'viz'; S.radOpen = false;
      save(); render(); return;
    }
    const s = e.target.closest('[data-scope]');
    if (!s) return;
    if (s.dataset.scope === 'viz') {
      e.stopImmediatePropagation();
      S.scope = 'viz'; S.radOpen = !S.radOpen; render();
    } else S.radOpen = false;
  }, true);

  // "Ver mais anúncios" (o feed carrega 30 por vez para gastar menos leituras do Firebase)
  const _feedM = window.feed;
  window.feed = function () {
    let h = _feedM();
    if (!(window.CLOUD_ON && window.Cloud && Cloud.more)) return h;
    return h.replace(/<\/div>\n <\/div>$/, '<button class="ghost" data-loadmore style="margin:12px 0">Ver mais anúncios</button></div>\n </div>');
  };
  document.addEventListener('click', e => {
    if (e.target.closest('[data-loadmore]') && window.Cloud) Cloud.loadMore();
  });

  /* ---------- créditos de destaque: 3 vídeos = 1 destaque de 24 h (no aparelho; trava de verdade vem com o servidor) ---------- */
  const VIDEOS_PER_CREDIT = 3;
  const VIDEOS_PER_AD = 3;   // 3 vídeos = 1 anúncio extra
  const wallet = () => { const w = store.get('wallet', null) || {}; return { videos: w.videos | 0, credits: w.credits | 0, adv: w.adv | 0, adc: w.adc | 0 }; };
  const saveWallet = w => store.set('wallet', w);
  function applyBoost(postId) {
    const p = S.posts.find(x => x.id === postId);
    if (!p) return false;
    p.boostedUntil = now() + 24 * H; window.Cloud && Cloud.boost(p); save();
    return true;
  }
  const _startR = window.startReward;
  window.startReward = function (kind, postId) {
    if (kind === 'boost') {
      const w = wallet();
      if (w.credits > 0 && applyBoost(postId)) {         // já tem crédito: destaca direto
        w.credits--; saveWallet(w);
        S.reward = { kind: 'boost', postId, left: 0, msg: '' }; return render();
      }
      return _startR('credit', postId);                  // sem crédito: começa a ganhar assistindo
    }
    return _startR(kind, postId);
  };
  const _finishR = window.finishReward;
  window.finishReward = function () {
    const r = S.reward;
    if (r && r.kind === 'credit' && r.what === 'ad') {
      const w = wallet(); w.adv++; r.got = false;
      if (w.adv >= VIDEOS_PER_AD) { w.adv = 0; w.adc++; r.got = true; }
      saveWallet(w); return;
    }
    if (r && r.kind === 'credit') {
      const w = wallet(); w.videos++; r.got = false;
      if (w.videos >= VIDEOS_PER_CREDIT) { w.videos = 0; w.credits++; r.got = true; }
      saveWallet(w); return;
    }
    return _finishR();
  };
  const _rewardUI = window.reward;
  window.reward = function () {
    const r = S.reward;
    if (!r || r.kind !== 'credit') return _rewardUI();
    const w = wallet(), done = r.left <= 0;
    const n = done ? (r.got ? VIDEOS_PER_CREDIT : w.videos) : w.videos + 1;
    const dots = Array.from({ length: VIDEOS_PER_CREDIT }, (_, i) => `<i style="display:inline-block;width:28px;height:8px;border-radius:4px;margin:0 3px;background:${i < n ? 'var(--red,#0F2E6B)' : 'var(--border,#D6E0EE)'}"></i>`).join('');
    const body = !done
      ? `<h3>Vídeo ${n} de ${VIDEOS_PER_CREDIT}</h3><p>Ajude o app continuar grátis 💛</p><div>${dots}</div>
         <div class="tv"><b>${r.left}s</b>vídeo patrocinado (demo)</div>
         <div class="prog"><i style="width:${(1 - r.left / REWARD_SECS) * 100}%"></i></div>
         <button class="ghost" data-rwcancel>Cancelar</button>`
      : r.got
        ? `<div style="font-size:48px">🎉</div><h3>Você ganhou 1 destaque!</h3><p>Seu anúncio fica no topo, nos 5 condomínios, por 24 horas.</p>
           <button class="cta52" style="margin-top:16px" data-usecredit>Destacar agora</button>
           <button class="ghost" data-rwcancel style="margin-top:8px">Guardar para depois</button>`
        : `<h3>Vídeo ${w.videos} de ${VIDEOS_PER_CREDIT} concluído</h3><div>${dots}</div>
           <p>Faltam ${VIDEOS_PER_CREDIT - w.videos} vídeo${VIDEOS_PER_CREDIT - w.videos > 1 ? 's' : ''} para ganhar 1 destaque de 24 h.</p>
           <button class="cta52" style="margin-top:16px" data-credmore>Assistir próximo vídeo (${w.videos + 1}/${VIDEOS_PER_CREDIT})</button>
           <button class="ghost" data-rwcancel style="margin-top:8px">Agora não</button>`;
    return `<div class="ov"><div class="sheet"><div class="handle"></div><div class="rw">${body}</div></div></div>`;
  };
  document.addEventListener('click', e => {
    if (e.target.closest('[data-usecredit]') && S.reward) {
      const w = wallet(), id = S.reward.postId;
      if (w.credits > 0 && applyBoost(id)) { w.credits--; saveWallet(w); S.reward = { kind: 'boost', postId: id, left: 0, msg: '' }; render(); }
    } else if (e.target.closest('[data-credmore]') && S.reward) {
      const id = S.reward.postId, what = S.reward.what; S.reward = null; _startR('credit', id); if (what) S.reward.what = what;
    }
  });
  const _perfilC = window.perfil;
  window.perfil = function () {
    const w = wallet();
    return _perfilC().replace('<button class="ghost" data-map=', `<div class="row2" style="display:block;margin-top:12px"><div class="kv"><span>Destaques disponíveis</span><b>${w.credits}</b></div><div class="kv"><span>Vídeos para o próximo</span><b>${w.videos}/${VIDEOS_PER_CREDIT}</b></div></div><button class="ghost" data-map=`);
  };
  const _feedC = window.feed;
  window.feed = function () { return _feedC().replace('Destacar (15s)', `Destacar (${VIDEOS_PER_CREDIT} vídeos)`); };

  /* ---------- planos: Gratuito x Anual (R$ 9,90/ano) — limites e pedidos; cobrança por Pix entra com o servidor ---------- */
  const QUOTA = { free: { ads: 1, boosts: 0 }, anual: { ads: 5, boosts: 1 } };
  const monthKey = () => new Date().toISOString().slice(0, 7);
  const payLink = () => String(window.PAY_LINK || '');
  const autoPay = () => !!(window.PAY_WORKER && window.CLOUD_ON);
  async function goPay(type, sponsor) {
    if (S.paying) return; S.paying = true; toast('Abrindo o pagamento…');
    try { location.href = await Cloud.checkout(type, sponsor); }
    catch (x) { S.paying = false; toast('Erro: ' + (x.message || x)); }
  }
  (function () { const m = /[?&]pago=(plan|sponsor)/.exec(location.search); if (m) { setTimeout(() => toast('Pagamento recebido! Estamos liberando…'), 600); try { history.replaceState(null, '', location.pathname); } catch (x) {} } })();
  function plan() {
    const p = store.get('plan', null) || {};
    const fresh = p.month === monthKey();
    return { tier: p.tier === 'anual' && p.until > Date.now() ? 'anual' : 'free', until: p.until || 0, month: monthKey(), ads: fresh ? (p.ads | 0) : 0, boosts: fresh ? (p.boosts | 0) : 0 };
  }
  const APP_VERSION = '2026-11-06.52';
  window.APP_VERSION = APP_VERSION;
  const savePlan = p => store.set('plan', p);
  window.refundAd = () => { const w = wallet(); const p = plan(); if (p.ads > 0) { p.ads--; savePlan(p); } };
  if (window.CLOUD_ON && !store.get('fixAds1', false)) { const p = plan(); p.ads = 0; savePlan(p); store.set('fixAds1', true); } // devolve a cota gasta por anúncios que não chegaram a ser salvos
  window.applyCloudPlan = d => { const cur = plan(); savePlan({ ...cur, tier: d && d.tier === 'anual' ? 'anual' : 'free', until: d && d.until ? d.until : 0 }); render(); };

  // publicar: gratuito = 1 anúncio por mês; anual = 5
  document.addEventListener('click', e => {
    if (e.target.id !== 'f-go' || !S.form || !S.form.title.trim() || S.form.editId) return;
    const p = plan();
    if (p.ads >= QUOTA[p.tier].ads) {
      const w = wallet();
      if (w.adc > 0) { w.adc--; saveWallet(w); return; }   // anúncio extra ganho com vídeos
      e.stopImmediatePropagation(); e.preventDefault(); S.plansOpen = true; S.plansWhy = 'ads'; render(); return;
    }
    p.ads++; savePlan(p);
  }, true);
  // destaque do mês incluso no plano anual (sem vídeo)
  const _startP = window.startReward;
  window.startReward = function (kind, postId) {
    if (kind === 'boost') {
      const p = plan();
      if (p.tier === 'anual' && p.boosts < QUOTA.anual.boosts && applyBoost(postId)) {
        p.boosts++; savePlan(p); S.reward = { kind: 'boost', postId, left: 0, msg: '' }; return render();
      }
    }
    return _startP(kind, postId);
  };

  /* ---------- anúncio extra grátis: 3 vídeos = +1 anúncio (ou plano anual) ---------- */
  const _rewardAd = window.reward;
  window.reward = function () {
    const r = S.reward;
    if (!r || r.kind !== 'credit' || r.what !== 'ad') return _rewardAd();
    const w = wallet(), done = r.left <= 0;
    const n = done ? (r.got ? VIDEOS_PER_AD : w.adv) : w.adv + 1;
    const dots = Array.from({ length: VIDEOS_PER_AD }, (_, i) => `<i style="display:inline-block;width:28px;height:8px;border-radius:4px;margin:0 3px;background:${i < n ? 'var(--red,#0F2E6B)' : 'var(--border,#D6E0EE)'}"></i>`).join('');
    const body = !done
      ? `<h3>Vídeo ${n} de ${VIDEOS_PER_AD}</h3><p>Os vídeos mantêm o app grátis 💛 Falta pouco para o seu anúncio extra.</p><div>${dots}</div>
         <div class="tv"><b>${r.left}s</b>vídeo patrocinado (demo)</div>
         <div class="prog"><i style="width:${(1 - r.left / REWARD_SECS) * 100}%"></i></div>
         <button class="ghost" data-rwcancel>Cancelar</button>`
      : r.got
        ? `<div style="font-size:48px">🎉</div><h3>Você ganhou +1 anúncio!</h3><p>Toque abaixo para publicar o seu anúncio agora.</p>
           <button class="cta52" style="margin-top:16px" data-adpublish>Publicar agora</button>
           <button class="ghost" data-rwcancel style="margin-top:8px">Guardar para depois</button>`
        : `<h3>Vídeo ${w.adv} de ${VIDEOS_PER_AD} concluído</h3><div>${dots}</div>
           <p>Faltam ${VIDEOS_PER_AD - w.adv} vídeo${VIDEOS_PER_AD - w.adv > 1 ? 's' : ''} para ganhar +1 anúncio.</p>
           <button class="cta52" style="margin-top:16px" data-credmore>Assistir próximo vídeo (${w.adv + 1}/${VIDEOS_PER_AD})</button>
           <button class="ghost" data-rwcancel style="margin-top:8px">Agora não</button>`;
    return `<div class="ov"><div class="sheet"><div class="handle"></div><div class="rw">${body}</div></div></div>`;
  };
  document.addEventListener('click', e => {
    if (e.target.closest('[data-adwatch]')) {
      S.plansOpen = false; window.startReward('credit', null); if (S.reward) S.reward.what = 'ad'; render();
    } else if (e.target.closest('[data-adpublish]')) {
      S.reward = null; render(); setTimeout(() => { const b = $('#f-go'); if (b) b.click(); }, 50);
    }
  });


  /* ---------- vídeo patrocinado de verdade (arquivos próprios em assets/videos) ---------- */
  const VIDS = () => (window.REWARD_VIDEOS || []).filter(v => v && v.src);
  let vidIdx = store.get('vidIdx', 0) | 0, vidOK = true, vidRaf = 0;
  const vidEl = document.createElement('video');
  vidEl.muted = true; vidEl.loop = true; vidEl.preload = 'auto'; vidEl.controls = false; vidEl.setAttribute('playsinline', ''); vidEl.setAttribute('webkit-playsinline', '');
  vidEl.style.cssText = 'position:fixed;z-index:99999;object-fit:cover;border-radius:16px;background:#000;display:none;pointer-events:none';
  document.body.appendChild(vidEl);
  const lblEl = document.createElement('div');
  lblEl.style.cssText = 'position:fixed;z-index:100000;display:none;pointer-events:none;color:#fff;font:600 12px system-ui,sans-serif';
  document.body.appendChild(lblEl);
  vidEl.addEventListener('error', () => { vidOK = false; vidEl.style.display = 'none'; render(); }); // arquivo não carregou: volta para a demonstração
  const _rewardV = window.reward;
  window.reward = function () {
    const h = _rewardV();
    if (!VIDS().length || !vidOK) return h;
    const v = VIDS()[vidIdx % VIDS().length];
    return h.replace(/<div class="tv"><b>(\d+)s<\/b>vídeo patrocinado \(demo\)<\/div>/, (m, n) =>
      `<div class="tv" id="rwph" style="height:240px;position:relative"></div>`);
  };
  function trackVideo() {
    const ph = document.getElementById('rwph');
    if (!ph || !VIDS().length || !vidOK) { vidRaf = 0; if (vidEl.style.display !== 'none') { vidEl.pause(); vidEl.style.display = 'none'; } lblEl.style.display = 'none'; return; }
    const r = ph.getBoundingClientRect();
    Object.assign(vidEl.style, { display: 'block', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
    const v = VIDS()[vidIdx % VIDS().length], n = S.reward ? Math.max(0, S.reward.left) : 0;
    const pill = 'background:rgba(0,0,0,.55);padding:3px 10px;border-radius:12px;position:absolute;';
    lblEl.innerHTML = `<span style="${pill}left:8px;top:8px">Patrocinado${v.brand ? ' • ' + esc(v.brand) : ''}</span><span style="${pill}right:8px;top:${r.height - 34}px;font-size:14px">${n}s</span>`;
    Object.assign(lblEl.style, { display: 'block', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
    vidRaf = requestAnimationFrame(trackVideo);
  }
  function placeVideo() {
    const ph = document.getElementById('rwph');
    if (!ph || !VIDS().length || !vidOK) { if (vidEl.style.display !== 'none') { vidEl.pause(); vidEl.style.display = 'none'; } lblEl.style.display = 'none'; return; }
    const src = VIDS()[vidIdx % VIDS().length].src;
    if (vidEl.dataset.src !== src) { vidEl.dataset.src = src; vidEl.src = src; }
    if (vidEl.paused) vidEl.play().catch(() => {});
    if (!vidRaf) vidRaf = requestAnimationFrame(trackVideo);
  }
  window.placeVideo = placeVideo;
  // tique do relógio: atualiza só o número e a barra (sem redesenhar a tela inteira)
  window.rwTick = function () {
    const r = S.reward, tv = document.querySelector('.ov .tv b, .rw .tv b'), pr = document.querySelector('.ov .prog i, .rw .prog i');
    if (!r || !pr || (!tv && !VIDS().length)) return render();
    if (tv) tv.textContent = r.left + 's';
    pr.style.width = ((1 - r.left / REWARD_SECS) * 100) + '%';
    const lb = lblEl.querySelector('span:last-child'); if (lb) lb.textContent = Math.max(0, r.left) + 's';
  };
  const _finishV = window.finishReward;
  window.finishReward = function () { if (VIDS().length) { vidIdx++; store.set('vidIdx', vidIdx); } return _finishV.apply(this, arguments); };


  /* ---------- vídeo premiado automático (Google Ad Manager / GPT) ---------- */
  const ADU = () => window.REWARD_ADUNIT || '';
  let adSlot = null, adEv = null, adListen = false, adGptP = null;
  function loadGpt() {
    if (adGptP) return adGptP;
    adGptP = new Promise((res, rej) => {
      window.googletag = window.googletag || { cmd: [] };
      const s = document.createElement('script'); s.async = true;
      s.src = 'https://securepubads.g.doubleclick.net/tag/js/gpt.js';
      s.onload = () => res(); s.onerror = () => { adGptP = null; rej(new Error('gpt')); };
      document.head.appendChild(s);
    });
    return adGptP;
  }
  function adCleanup() {
    try { if (adSlot && window.googletag && googletag.destroySlots) googletag.destroySlots([adSlot]); } catch (e) {}
    adSlot = null; adEv = null;
  }
  function demoTimer() {
    clearInterval(mem.rw);
    mem.rw = setInterval(() => {
      if (!S.reward) { clearInterval(mem.rw); return; }
      S.reward.left--;
      if (S.reward.left <= 0) { clearInterval(mem.rw); finishReward(); render(); }
      else if (window.rwTick) rwTick(); else render();
    }, 1000);
  }
  function adFallback() {          // sem anúncio disponível: usa seus vídeos / demonstração
    adCleanup();
    if (!S.reward || S.reward.net === 'granted') return;
    S.reward.net = 'demo'; S.reward.left = REWARD_SECS; render(); demoTimer();
  }
  const _startA = window.startReward;
  window.startReward = function () {
    _startA.apply(this, arguments);
    if (!ADU() || !S.reward) return;
    clearInterval(mem.rw);                       // pausa o relógio: quem manda agora é o anúncio
    const r = S.reward; r.net = 'load'; adCleanup(); render();
    const alive = () => S.reward === r && r.net !== 'granted' && r.net !== 'demo';
    const wait = setTimeout(() => { if (alive() && r.net === 'load') adFallback(); }, window.REWARD_ADWAIT || 10000);
    loadGpt().then(() => {
      googletag.cmd.push(() => {
        if (!alive()) return;
        adSlot = googletag.defineOutOfPageSlot(ADU(), googletag.enums.OutOfPageFormat.REWARDED);
        if (!adSlot) { clearTimeout(wait); return adFallback(); }
        adSlot.addService(googletag.pubads());
        if (!adListen) {
          adListen = true;
          const ps = googletag.pubads();
          ps.addEventListener('rewardedSlotReady', e => { if (e.slot !== adSlot || !S.reward || S.reward.net !== 'load') return; adEv = e; S.reward.net = 'ready'; render(); });
          ps.addEventListener('rewardedSlotGranted', e => { if (e.slot !== adSlot || !S.reward) return; S.reward.net = 'granted'; S.reward.left = 0; finishReward(); render(); });
          ps.addEventListener('rewardedSlotClosed', e => {
            if (e.slot !== adSlot) return;
            const was = S.reward && S.reward.net; adCleanup();
            if (S.reward && was !== 'granted') { S.reward = null; render(); toast('Assista até o fim para ganhar a recompensa'); }
          });
        }
        googletag.enableServices(); googletag.display(adSlot);
      });
    }).catch(() => { clearTimeout(wait); if (alive()) adFallback(); });
  };
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-adnet]'); if (!b) return;
    if (adEv && S.reward && S.reward.net === 'ready') { S.reward.net = 'showing'; try { adEv.makeRewardedVisible(); } catch (x) { adFallback(); } }
  });
  const _rewardA = window.reward;
  window.reward = function () {
    const h = _rewardA();
    const r = S.reward;
    if (!ADU() || !r || r.left <= 0 || !['load', 'ready', 'showing'].includes(r.net)) return h;
    const box = r.net === 'ready'
      ? `<div class="tv" style="height:auto;padding:22px"><button class="cta52" data-adnet>▶ Assistir vídeo</button></div>`
      : `<div class="tv" style="height:auto;padding:30px">${r.net === 'load' ? 'Carregando vídeo…' : 'Assistindo…'}</div>`;
    return h.replace(/<div class="tv"[^>]*>[\s\S]*?<\/div>/, box).replace(/<div class="prog">[\s\S]*?<\/div>/, '');
  };


  /* ---------- contato: "Quero" abre o anúncio; "Falar com o anunciante" abre o WhatsApp dele (sem vídeo) ---------- */
  const digits = s => String(s || '').replace(/\D/g, '');
  const waNum = s => { const d = digits(s); return d.length >= 12 && d.startsWith('55') ? d : (d.length >= 10 ? '55' + d : ''); };
  function contactNow(postId) {
    const p = S.posts.find(x => x.id === postId); if (!p) return;
    if (p.mine) return toast('Este anúncio é seu');
    const n = waNum(p.whats);
    if (!n) return toast('O anunciante ainda não informou o WhatsApp');
    if (!S.interests.find(i => i.postId === p.id)) {      // conta o interesse uma vez
      p.wants++; const it = { postId: p.id, userId: S.user.id, ts: Date.now() }; S.interests.push(it);
      try { window.Cloud && Cloud.want(p, it); } catch (e) {} save();
    }
    window.open('https://wa.me/' + n + '?text=' + encodeURIComponent(msgFor(p)), '_blank');
  }
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-quero],[data-whats]'); if (!t) return;
    e.stopImmediatePropagation(); e.preventDefault();
    if (t.dataset.quero) openPost(t.dataset.quero); else contactNow(t.dataset.whats);
  }, true);
  const _detailW = window.detail;
  window.detail = function () {
    const h = _detailW();
    return h.replace(/(<button class="big" data-whats="[^"]*">)[^<]*(<\/button>)/, '$1💬 Falar com o anunciante$2');
  };
  // campo de WhatsApp ao publicar (guardado no perfil e usado nos próximos anúncios)
  const editW = () => { const ep = S.form && S.form.editId && S.posts.find(x => x.id === S.form.editId); return (ep && ep.whats) || (S.user && S.user.whats) || ''; };
  const _newPostW = window.newPost;
  window.newPost = function () {
    return _newPostW().replace('<button class="cta52" id="f-go"', `<div><label>Seu WhatsApp (com DDD)</label><input type="tel" inputmode="numeric" id="f-whats" maxlength="16" value="${esc(editW())}" placeholder="(11) 99999-9999"><small style="color:var(--gray)">Os vizinhos usam este número para falar com você pelo anúncio.</small></div><button class="cta52" id="f-go"`);
  };
  document.addEventListener('input', e => { if (e.target && e.target.id === 'f-whats' && S.user) S.user.whats = digits(e.target.value); });
  document.addEventListener('click', e => {
    const t = e.target.closest('#f-go'); if (!t || !S.user) return;
    const i = document.getElementById('f-whats'); if (i) S.user.whats = digits(i.value);
    if (!waNum(S.user.whats)) { e.stopImmediatePropagation(); e.preventDefault(); toast('Informe seu WhatsApp com DDD'); return; }
    S.user.whats = waNum(S.user.whats); save();
  }, true);

  /* ---------- entrar com Google (opcional): recupera cadastro e anúncios em qualquer aparelho ---------- */
  const _onbG = window.onboarding;
  window.onboarding = function () {
    const h = _onbG();
    if (!window.CLOUD_ON) return h;
    return h.replace('<div class="form" style="padding:0">', '<button class="ghost" data-glogin style="margin:4px 0 12px">🔐 Já tenho cadastro — entrar com Google</button><div class="form" style="padding:0">');
  };
  const _perfilG = window.perfil;
  window.perfil = function () {
    const h = _perfilG();
    if (!window.CLOUD_ON || !window.Cloud) return h;
    const row = Cloud.linked()
      ? `<div class="cardc" style="margin-top:8px"><b>🔐 Conta Google conectada ✓</b><br><small>Seu cadastro e seus anúncios ficam salvos nesta conta. Em outro aparelho, toque em "Entrar com Google".</small></div>`
      : `<button class="ghost" data-glogin style="margin-top:8px">🔐 Guardar minha conta com o Google</button><small style="display:block;color:var(--gray);margin:4px 2px 0">Assim você não perde seus anúncios ao trocar de aparelho ou limpar o navegador.</small>`;
    return h.replace('<button class="ghost" data-map=', row + '<button class="ghost" data-map=');
  };
  document.addEventListener('click', async e => {
    const t = e.target.closest('[data-glogin]'); if (!t) return;
    e.stopImmediatePropagation(); e.preventDefault();
    const r = await Cloud.googleLogin(); if (!r) return;
    const pr = r.profile;
    if (pr && pr.building) {                                   // cadastro encontrado: volta tudo
      S.user = { id: Cloud.uid, name: pr.name || r.name, apt: pr.apt || '', condo: pr.building, email: pr.email || r.email || '', cityShort: 'Mogi' };
      save(); render(); toast('Bem-vindo de volta! 🎉');
    } else if (S.user) { Cloud.saveUser(S.user); render(); toast('Conta Google conectada ✓'); }
    else { S.onb.name = S.onb.name || r.name || ''; render(); toast('Conta conectada. Complete o cadastro.'); }
  }, true);

  const _perfilP = window.perfil;
  window.perfil = function () {
    const p = plan(), q = QUOTA[p.tier];
    const card = `<div class="row2" style="display:block;margin-top:12px"><div class="kv"><span>Meu plano</span><b>${p.tier === 'anual' ? 'Anual' : 'Gratuito'}</b></div>
      <div class="kv"><span>Anúncios neste mês</span><b>${p.ads}/${q.ads}</b></div>
      <div class="kv"><span>Anúncios extras (vídeos)</span><b>${wallet().adc} • ${wallet().adv}/${VIDEOS_PER_AD}</b></div>
      ${p.tier === 'anual' ? `<div class="kv"><span>Destaque grátis do mês</span><b>${p.boosts < q.boosts ? 'disponível' : 'usado'}</b></div><div class="kv"><span>Válido até</span><b>${fmtDate(p.until)}</b></div>` : ''}
      <div class="kv"><span>Versão do app</span><b>${APP_VERSION}</b></div>
      ${window.CLOUD_ON && window.Cloud ? `<div class="kv"><span>Conta (código)</span><b>${esc(String(Cloud.uid || '—').slice(0, 6))}</b></div><div class="kv"><span>Anúncios no servidor</span><b>${Cloud.rawCount ? Cloud.rawCount() : 0}</b></div><div class="kv"><span>Último erro</span><b style="font-size:12px;word-break:break-word">${esc(Cloud.lastErr || 'nenhum')}</b></div><button class="ghost" data-ping style="margin-top:8px">Testar conexão com o servidor</button>` : ''}
      <button class="ghost" data-plans style="margin-top:8px">Ver planos</button>
      <button class="ghost" data-spnew style="margin-top:8px">Anunciar meu negócio (patrocinado)</button></div>`;
    return _perfilP().replace('<button class="ghost" data-map=', card + '<button class="ghost" data-map=');
  };
  function plansSheet() {
    const p = plan(), req = (store.get('planReqs', []) || []).length || (window.Cloud && Cloud.myReq);
    let act;
    if (p.tier === 'anual') act = `<small><b>Seu plano está ativo até ${fmtDate(p.until)}.</b></small>`;
    else if (autoPay()) act = `<button class="cta52" data-autopay="plan" style="margin-top:10px">Pagar R$ 9,90 com Pix</button>
        <small>Assim que o Pix for confirmado, o plano é liberado <b>automaticamente</b>.</small>`;
    else if (payLink()) act = `<a class="cta52" href="${esc(payLink())}" target="_blank" rel="noopener" style="display:flex;align-items:center;justify-content:center;text-decoration:none;margin-top:10px">Pagar R$ 9,90 com Pix</a>
        <button class="ghost" data-paid style="margin-top:8px">Já paguei</button>
        <small>Depois de pagar, toque em <b>Já paguei</b>. O administrador confirma o Pix e ativa o plano.${req ? ' <b>Pedido já enviado.</b>' : ''}</small>`;
    else act = `<button class="cta52" disabled style="margin-top:10px">Pagamento por Pix em breve</button>`;
    act += `<br>${SAFE_PAY}`;
    return `<div class="ov" data-planclose><div class="sheet" id="plansheet"><div class="handle"></div><button class="close" data-planclose>✕</button><div class="form"><h2>Planos</h2>
      ${S.plansWhy === 'ads' ? `<div class="cardc"><b>Você já usou os anúncios deste mês</b><br><small>Para publicar mais um, escolha: assistir ${VIDEOS_PER_AD} vídeos curtos (grátis) ou assinar o plano anual.</small></div>` : ''}
      <div class="cardc"><b>Anúncio extra grátis</b><br><small>Assista ${VIDEOS_PER_AD} vídeos de 15 s e ganhe +1 anúncio, quantas vezes quiser. Você tem <b>${wallet().adc}</b> extra${wallet().adc === 1 ? '' : 's'} guardado${wallet().adc === 1 ? '' : 's'} • vídeos: ${wallet().adv}/${VIDEOS_PER_AD}.</small>
        <button class="cta52" data-adwatch style="margin-top:10px">Assistir vídeos e ganhar anúncio</button></div>
      <div class="cardc"><b>Gratuito</b><br><small>1 anúncio por mês. Quer mais? Cada ${VIDEOS_PER_AD} vídeos de 15 s = +1 anúncio. Destaque de 24 h assistindo 3 vídeos.</small></div>
      <div class="cardc" style="border:2px solid var(--red,#0F2E6B)"><b>Anual — R$ 9,90 por ano</b><br><small>5 anúncios por mês, sem vídeo. 1 destaque de 24 h por mês. Menos de R$ 1 por mês.</small>${act}</div></div></div></div>`;
  }
  function planReqs() { return window.CLOUD_ON ? ((window.Cloud && Cloud.planReqs) || []) : (store.get('planReqs', []) || []); }
  function planReqHtml() {
    const list = planReqs();
    return `<h3>Pedidos de plano anual (${list.length})</h3>${list.map(r => `<div class="cardc"><b>${esc(r.name || '')} • apto ${esc(r.apt || '')}</b>
      <small>${esc([r.condo, r.email, r.ts ? fmtDate(r.ts) : ''].filter(Boolean).join(' • '))}</small>
      <div class="grid2"><button class="ok" data-planact="activate" data-uid="${esc(r.uid || r.id)}">Ativar 1 ano</button><button class="no" data-planact="reject" data-uid="${esc(r.uid || r.id)}">Recusar</button></div></div>`).join('') || '<div class="cardc"><small>Nenhum pedido esperando.</small></div>'}`;
  }
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-plans],[data-planclose],[data-paid],[data-planact]');
    if (!t) return;
    if (t.hasAttribute('data-plans')) { S.plansOpen = true; S.plansWhy = ''; return render(); }
    if (t.hasAttribute('data-planclose')) { if (e.target.closest('.sheet') && !t.matches('button.close')) return; S.plansOpen = false; return render(); }
    if (t.hasAttribute('data-paid')) {
      const u = S.user || {}, info = { name: u.name, apt: u.apt, email: u.email || '', condo: u.condo, uid: u.id || 'local', ts: Date.now() };
      if (window.CLOUD_ON) { window.Cloud && Cloud.requestPlan(info); Cloud.myReq = true; }
      else store.set('planReqs', [info]);
      toast('Pedido enviado. Assim que o Pix for confirmado, o plano é ativado.'); return render();
    }
    if (t.dataset.planact) {
      const uid2 = t.dataset.uid, act = t.dataset.planact;
      if (window.CLOUD_ON) {
        (act === 'activate' ? Cloud.adm.activatePlan(uid2) : Cloud.adm.rejectPlan(uid2)).then(() => toast(act === 'activate' ? 'Plano ativado' : 'Pedido recusado')).catch(x => toast('Erro: ' + (x.message || x)));
      } else {
        if (act === 'activate') savePlan({ tier: 'anual', until: Date.now() + 365 * DAY, month: monthKey(), ads: 0, boosts: 0 });
        store.set('planReqs', []); toast(act === 'activate' ? 'Plano ativado' : 'Pedido recusado'); render();
      }
    }
  });

  /* ---------- patrocinados: R$ 29,90 por semana (card amarelo a cada 4 anúncios) ---------- */
  const SP_DEMO = SPONSORS.slice();
  const spStore = () => store.get('sponsors', []) || [];
  const spAll = () => window.CLOUD_ON ? ((window.Cloud && Cloud.sponsors) || []) : spStore();
  function syncSponsors() {
    const act = spAll().filter(x => x.status === 'active' && x.until > Date.now());
    SPONSORS.length = 0; (act.length ? act : SP_DEMO).forEach(x => SPONSORS.push(x));
  }
  window.applySponsors = () => { syncSponsors(); render(); };
  function spUrl(v) {
    v = String(v || '').trim(); if (!v) return '';
    if (/^https?:\/\//i.test(v)) return v;
    const d = v.replace(/\D/g, ''); if (d.length >= 10 && /^[\d\s()+-]+$/.test(v)) return 'https://wa.me/' + (d.length <= 11 ? '55' + d : d);
    return /^[\w-]+(\.[\w-]+)+/.test(v) ? 'https://' + v : '';
  }
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-sp]'); if (!t) return;
    const sp = SPONSORS.find(x => x.id === t.dataset.sp);
    if (sp && sp.link) { e.stopImmediatePropagation(); const u = spUrl(sp.link); if (u) window.open(u, '_blank', 'noopener'); else toast('Anúncio sem link'); }
  }, true);
  const spDraft = () => S.spForm || (S.spForm = store.get('spDraft', null) || { title: '', sub: '', link: '' });
  function spSheet() {
    const f = spDraft(), link = String(window.PAY_SPONSOR || ''), mine = spStore().some(x => x.status === 'pending') || window.Cloud && Cloud.mySp;
    return `<div class="ov" data-spclose><div class="sheet" id="spsheet"><div class="handle"></div><button class="close" data-spclose>✕</button><div class="form"><h2>Anuncie seu negócio</h2>
      <div class="cardc"><b>Card Patrocinado — R$ 29,90 por semana</b><br><small>Aparece em amarelo a cada 4 anúncios, para os moradores dos condomínios da região. Ideal para comércio, serviços e profissionais.</small></div>
      <div><label>Título</label><input type="text" id="sp-title" maxlength="80" value="${esc(f.title)}" placeholder="Ex.: Pizzaria Forno a Lenha — 15% OFF"></div>
      <div><label>Descrição curta</label><input type="text" id="sp-sub" maxlength="140" value="${esc(f.sub)}" placeholder="Ex.: Cupom ACHADOS15 • entrega no condomínio"></div>
      <div><label>WhatsApp ou site</label><input type="text" id="sp-link" maxlength="200" value="${esc(f.link)}" placeholder="(11) 99999-9999 ou seusite.com.br"></div>
      ${autoPay() ? `<button class="cta52" data-autopay="sponsor" style="margin-top:6px">Pagar R$ 29,90 com Pix</button>
      <small>Preencha e pague. Assim que o Pix for confirmado, seu card entra no ar <b>automaticamente</b> por 7 dias.</small>` : link ? `<a class="cta52" href="${esc(link)}" target="_blank" rel="noopener" style="display:flex;align-items:center;justify-content:center;text-decoration:none;margin-top:6px">Pagar R$ 29,90 com Pix</a>
      <button class="ghost" data-sppaid style="margin-top:8px">Já paguei</button>
      <small>Preencha, pague e toque em <b>Já paguei</b>. O administrador confirma o Pix e publica por 7 dias.${mine ? ' <b>Pedido já enviado.</b>' : ''}</small>` : `<button class="cta52" disabled style="margin-top:10px">Pagamento por Pix em breve</button>`}
      <br>${SAFE_PAY}
    </div></div></div>`;
  }
  function spAdminHtml() {
    const l = spAll(), pend = l.filter(x => x.status === 'pending'), act = l.filter(x => x.status === 'active' && x.until > Date.now());
    const row = (x, on) => `<div class="cardc"><b>${esc(x.title)}</b><small>${esc([x.sub, x.link, x.name && (x.name + ' • apto ' + (x.apt || '')), x.condo, on ? 'até ' + fmtDate(x.until) : ''].filter(Boolean).join(' • '))}</small>
      <div class="grid2">${on ? '' : `<button class="ok" data-spact="activate" data-spid="${esc(x.id)}">Ativar 7 dias</button>`}<button class="no" data-spact="remove" data-spid="${esc(x.id)}">${on ? 'Remover' : 'Recusar'}</button></div></div>`;
    return `<h3>Patrocinados pendentes (${pend.length})</h3>${pend.map(x => row(x, false)).join('') || '<div class="cardc"><small>Nenhum pedido esperando.</small></div>'}
      <h3>Patrocinados no ar (${act.length})</h3>${act.map(x => row(x, true)).join('') || '<div class="cardc"><small>Nenhum no ar (aparecem os exemplos).</small></div>'}`;
  }
  document.addEventListener('input', e => {
    const m = { 'sp-title': 'title', 'sp-sub': 'sub', 'sp-link': 'link' }[e.target.id]; if (!m) return;
    spDraft()[m] = e.target.value; store.set('spDraft', S.spForm);
  });
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-autopay]'); if (!a) return;
    if (a.dataset.autopay === 'plan') return goPay('plan');
    const f = spDraft(), u = S.user || {};
    if (f.title.trim().length < 3) return toast('Escreva o título do anúncio');
    if (!spUrl(f.link)) return toast('Informe um WhatsApp ou site válido');
    goPay('sponsor', { title: f.title.trim(), sub: f.sub.trim(), link: f.link.trim(), name: u.name || '', apt: u.apt || '', condo: u.condo || '' });
  });
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-spnew],[data-spclose],[data-sppaid],[data-spact]'); if (!t) return;
    if (t.hasAttribute('data-spnew')) { S.spOpen = true; return render(); }
    if (t.hasAttribute('data-spclose')) { if (e.target.closest('.sheet') && !t.matches('button.close')) return; S.spOpen = false; return render(); }
    if (t.hasAttribute('data-sppaid')) {
      const f = spDraft(); if (f.title.trim().length < 3) return toast('Escreva o título do anúncio');
      if (!spUrl(f.link)) return toast('Informe um WhatsApp ou site válido');
      const u = S.user || {}, rec = { title: f.title.trim(), sub: f.sub.trim(), link: f.link.trim(), name: u.name || '', apt: u.apt || '', condo: u.condo || '' };
      if (window.CLOUD_ON) { Cloud.requestSponsor(rec); Cloud.mySp = true; }
      else store.set('sponsors', spStore().concat([{ ...rec, id: 'sp' + Date.now(), status: 'pending', ts: Date.now() }]));
      S.spForm = null; store.set('spDraft', null); S.spOpen = false;
      toast('Pedido enviado. Assim que o Pix for confirmado, seu card entra no ar.'); return render();
    }
    if (t.dataset.spact) {
      const id = t.dataset.spid, act = t.dataset.spact;
      if (window.CLOUD_ON) {
        (act === 'activate' ? Cloud.adm.activateSponsor(id) : Cloud.adm.removeSponsor(id)).then(() => toast('Feito')).catch(x => toast('Erro: ' + (x.message || x)));
      } else {
        const l = spStore();
        store.set('sponsors', act === 'activate' ? l.map(x => x.id === id ? { ...x, status: 'active', until: Date.now() + 7 * DAY } : x) : l.filter(x => x.id !== id));
        toast('Feito'); render();
      }
    }
  });

  /* ---------- alcance: tipos que ficam só no condomínio (vaga de garagem) ---------- */
  const LOCK_PRED = ['vaga', 'aviso'];
  const _newPostL = window.newPost;
  window.newPost = function () {
    let h = _newPostL();
    if (S.form && LOCK_PRED.includes(S.form.type)) {
      S.form.reach = 'pred';
      h = h.replace(/<div><label>Alcance<\/label>[\s\S]*?<\/div><\/div>/, `<div><label>Alcance</label><div class="cardc"><b>🏢 Só meu condomínio</b><br><small>${S.form.type === 'aviso' ? 'Avisos só aparecem para moradores do seu condomínio. Não são oficiais e não podem pedir pagamento nem dados pessoais.' : 'Este tipo só aparece para moradores do seu condomínio.'}</small></div></div>`);
    }
    return h;
  };
  document.addEventListener('click', e => {
    if (e.target.closest('[data-reach]') && S.form && LOCK_PRED.includes(S.form.type)) { e.stopImmediatePropagation(); e.preventDefault(); toast('Esse tipo fica só no seu condomínio'); }
  }, true);
  document.addEventListener('click', e => {
    if (e.target.id === 'f-go' && S.form && LOCK_PRED.includes(S.form.type)) S.form.reach = 'pred';
  }, true);
  document.addEventListener('change', e => {
    if (e.target.id !== 'f-type' || !S.form) return;
    if (!LOCK_PRED.includes(S.form.type) && S.form._wasLocked) S.form.reach = 'viz';
    S.form._wasLocked = LOCK_PRED.includes(S.form.type);
    render();
  }); // mostra/esconde o alcance travado

  /* ---------- segurança contra golpes e termos ---------- */
  const SAFE_SHORT = `<div class="safe">⚠️ <b>Cuidado com golpes.</b> Combine a entrega pessoalmente, no condomínio. <b>Não pague antecipado</b>, não envie códigos e desconfie de pressa. <button class="lk" data-safe>Ver dicas</button></div>`;
  const SAFE_AVISO = `<div class="safe">📢 <b>Aviso de morador, não verificado.</b> Confirme com a administração do condomínio. <b>Não pague nem envie dados</b> por causa de um aviso. <button class="lk" data-safe>Ver dicas</button></div>`;
  const SAFE_PAY = `<small>🔒 O Achados só cobra <b>dentro do app</b>, pelo botão <b>Pagar</b> (pagamento do Mercado Pago). Nunca cobramos por WhatsApp, e-mail, ligação ou mensagem.</small>`;
  function safeSheet() {
    return `<div class="ov" data-safeclose><div class="sheet" id="safesheet"><div class="handle"></div><button class="close" data-safeclose>✕</button><div class="form"><h2>Segurança e termos</h2>
      <div class="cardc"><b>Ao comprar ou vender</b><br><small>• Combine a entrega <b>pessoalmente</b>, dentro do condomínio.<br>• <b>Não pague antecipado</b> nem faça Pix para "reservar" um item.<br>• Confira o item antes de pagar.<br>• Nunca envie códigos recebidos por SMS, senhas ou fotos de documentos.<br>• Desconfie de preço bom demais, pressa e histórias complicadas.<br>• Algo estranho? Use <b>Denunciar anúncio</b>.</small></div>
      <div class="cardc"><b>Cobranças do Achados</b><br><small>O Achados só cobra (plano anual, destaque e patrocinado) <b>dentro do app</b>, pelo botão <b>Pagar</b>, em um pagamento do Mercado Pago aberto a partir do app. <b>Não cobramos por WhatsApp, e-mail, ligação ou mensagem</b>, e nunca pedimos senha ou código. Endereço oficial: <b>achadosdecondominios.com.br</b>. Se alguém cobrar em nosso nome fora do app, é golpe.</small></div>
      <div class="cardc"><b>Avisos importantes</b><br><small>O Achados é um mural entre vizinhos. Ele <b>não participa, não intermedia e não garante</b> nenhuma negociação, entrega, pagamento ou aviso publicado. Cada usuário é responsável pelo que anuncia e pelo que combina. Avisos de síndico ou administração publicados por moradores <b>não são oficiais</b>: confirme com a administração do condomínio. Anúncios proibidos ou enganosos podem ser removidos.</small></div>
      <p style="text-align:center;margin:8px 0 0"><a href="sobre.html" target="_blank" rel="noopener">Sobre o app, termos completos e política de privacidade</a></p>
    </div></div></div>`;
  }
  const _detailS = window.detail;
  window.detail = function () {
    const h = _detailS(); const p = S.posts.find(x => x.id === S.detail);
    if (p && p.type === 'aviso') return h.replace('<div class="proof">', SAFE_AVISO + '<div class="proof">');
    if (!p || p.mine) return h;
    return h.replace('<button class="ghost rep"', SAFE_SHORT + '<button class="ghost rep"');
  };
  const _perfilS = window.perfil;
  window.perfil = function () { return _perfilS().replace('<button class="ghost" data-map=', '<button class="ghost" data-safe style="margin-top:8px">🛡️ Segurança e termos</button><button class="ghost" data-map='); };
  const _onbS = window.onboarding;
  window.onboarding = function () { return _onbS().replace('<button class="cta48" id="o-go"', '<small style="display:block;text-align:center;color:var(--gray);margin:0 0 8px">Ao entrar, você concorda com as regras do app. <button class="lk" data-safe style="color:var(--red,#0F2E6B);background:none;border:0;padding:0;font:inherit;text-decoration:underline">Segurança e termos</button> · <a href="sobre.html" target="_blank" rel="noopener" style="color:inherit">Sobre e privacidade</a></small><button class="cta48" id="o-go"'); };
  const _newPostS = window.newPost;
  window.newPost = function () { return _newPostS().replace('<button class="cta52" id="f-go"', '<small style="color:var(--gray);font-size:13px">Não peça nem aceite pagamento antecipado. Combine a entrega pessoalmente.</small>\n  <button class="cta52" id="f-go"'); };
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-safe],[data-safeclose]'); if (!t) return;
    if (t.hasAttribute('data-safe')) { e.stopPropagation(); S.safeOpen = true; return render(); }
    if (e.target.closest('.sheet') && !t.matches('button.close')) return;
    S.safeOpen = false; render();
  });

  /* ---------- atualização automática: app instalado ou aberto há tempo pega a versão nova ---------- */
  (function () {
    if (!/^https?:$/.test(location.protocol)) return;
    const FILES = [location.pathname, 'features.js', 'cloud.js', 'firebase-config.js'];
    const stamp = () => Promise.all(FILES.map(f => fetch(f, { method: 'HEAD', cache: 'no-store' }).then(r => (r.headers.get('etag') || r.headers.get('last-modified') || '') ).catch(() => ''))).then(a => a.join('|'));
    let base = null, busy = false;
    const check = () => {
      if (busy) return; busy = true;
      stamp().then(v => {
        busy = false; if (!v.replace(/\|/g, '')) return;
        if (base === null) { base = v; return; }
        if (v === base) return;
        if (S.newPost || S.reward || S.plansOpen || S.spOpen || S.reg && S.reg.open) { toast('Nova versão disponível. Feche e abra o app para atualizar.'); base = v; return; }
        location.reload();
      });
    };
    check();                                              // marca a versão carregada
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
    setInterval(() => { if (document.visibilityState === 'visible') check(); }, 10 * 60 * 1000);
  })();

  /* ---------- o dono encerra ou edita o próprio anúncio ---------- */
  const _detailE = window.detail;
  window.detail = function () {
    const h = _detailE(); const p = S.posts.find(x => x.id === S.detail);
    if (p && !p.mine && window.Cloud && Cloud.isAdmin) return h.replace('<div class="proof">', `<div class="row" style="gap:8px;margin:0 0 10px"><button class="ghost" data-end="${p.id}" style="flex:1;margin:0;color:#C0392B">🗑️ Encerrar (administrador)</button></div><div class="proof">`);
    if (!p || !p.mine) return h;
    return h.replace('<div class="proof">', `<div class="row" style="gap:8px;margin:0 0 10px"><button class="ghost" data-edit="${p.id}" style="flex:1;margin:0">✏️ Editar</button><button class="ghost" data-end="${p.id}" style="flex:1;margin:0;color:#C0392B">🗑️ Encerrar</button></div><div class="proof">`);
  };
  const _newPostE = window.newPost;
  window.newPost = function () {
    const h = _newPostE();
    if (!(S.form && S.form.editId)) return h;
    return h.replace('<h2>Novo anúncio</h2>', '<h2>Editar anúncio</h2>').replace(/(id="f-go"[^>]*>)Publicar</, '$1Salvar alterações<');
  };
  function endSheet() {
    const p = S.posts.find(x => x.id === S.endFor); if (!p) return '';
    return `<div class="ov" data-endclose><div class="sheet" id="endsheet"><div class="handle"></div><button class="close" data-endclose>✕</button><div class="form"><h2>Encerrar anúncio?</h2>
      <div class="cardc"><b>${esc(p.title)}</b><br><small>O anúncio some agora para todos os vizinhos e não dá para desfazer. Use quando o item foi vendido, doado ou você desistiu.</small></div>
      <button class="cta52" data-endyes style="background:#C0392B;border-color:#C0392B">Sim, encerrar anúncio</button>
      <button class="ghost" data-endclose style="margin-top:8px">Cancelar</button></div></div></div>`;
  }
  document.addEventListener('click', e => {
    if (e.target.id === 'f-go' && S.form && S.form.editId) {            // salvar edição (não conta na cota mensal)
      e.stopImmediatePropagation(); e.preventDefault();
      const f = S.form, p = S.posts.find(x => x.id === f.editId); if (!p || !f.title.trim()) return;
      p.title = f.title.trim(); p.type = f.type; p.price = f.free ? 0 : (f.price === '' || f.price == null ? null : Number(f.price));
      p.description = f.desc.trim(); p.imageUrl = f.img || null; p.reach = LOCK_PRED.includes(f.type) ? 'pred' : f.reach; p.emoji = DEFAULT_EMOJI[f.type]; p.whats = waNum(S.user && S.user.whats) || p.whats || '';
      S.newPost = false; S.form = null; S.detail = null; render();
      if (window.CLOUD_ON) {
        toast('Salvando…');
        Promise.race([Promise.resolve(Cloud.update(p)), new Promise(r => setTimeout(() => r('timeout'), 20000))]).then(ok => {
          if (ok === true) toast('Anúncio atualizado ✓');
          else if (ok === 'timeout') { showErr('O servidor não respondeu em 20 segundos.', 'Seu anúncio NÃO foi alterado. Verifique a internet e tente de novo.'); if (Cloud.lastErr === '') Cloud.lastErr = 'sem resposta (20 s)'; }
          else if (ok === false && !S.errMsg) showErr('Não foi possível salvar.', Cloud.lastErr || 'sem detalhe');
        });
      }
      else { save(); toast('Anúncio atualizado ✓'); }
    }
  }, true);
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-edit],[data-end],[data-endyes],[data-endclose]'); if (!t) return;
    if (t.hasAttribute('data-edit')) {
      const p = S.posts.find(x => x.id === t.dataset.edit); if (!p || !p.mine) return;
      S.form = { title: p.title, type: p.type, free: p.price === 0, price: p.price ? String(p.price) : '', img: p.imageUrl || null, desc: p.description || '', reach: p.reach || 'viz', editId: p.id, _wasLocked: LOCK_PRED.includes(p.type) };
      S.detail = null; S.newPost = true; return render();
    }
    if (t.hasAttribute('data-end')) { S.endFor = t.dataset.end; return render(); }
    if (t.hasAttribute('data-endclose')) { if (e.target.closest('.sheet') && !t.matches('button.close,.ghost')) return; S.endFor = null; return render(); }
    if (t.hasAttribute('data-endyes')) {
      const p = S.posts.find(x => x.id === S.endFor); S.endFor = null; if (!p || !(p.mine || (window.Cloud && Cloud.isAdmin))) return render();
      S.posts = S.posts.filter(x => x.id !== p.id); S.detail = null;
      if (window.CLOUD_ON) Cloud.remove(p); else save();
      render(); toast('Anúncio encerrado');
    }
  });

  /* ---------- admin: apagar anúncios vencidos (em lote ou um a um) ---------- */
  function expiredHtml() {
    if (!window.CLOUD_ON) return '';
    const list = (window.Cloud && Cloud.expired) || [];
    if (!Cloud.expLoaded) return `<h3>Anúncios vencidos</h3><div class="cardc"><small>Carregando…</small></div>`;
    const ago = ts => { const d = Math.max(1, Math.round((Date.now() - ts) / DAY)); return `venceu há ${d} dia${d === 1 ? '' : 's'}`; };
    const rows = list.slice(0, 50).map(x => `<div class="cardc"><b>${esc(x.title || '')}</b><small>${esc([x.seller, x.building, ago(x.expiresAt)].filter(Boolean).join(' • '))}</small>
      <div class="grid2"><button class="no" data-expdel="${esc(x.id)}">Apagar</button></div></div>`).join('');
    return `<h3>Anúncios vencidos (${list.length})</h3>${rows || '<div class="cardc"><small>Nenhum anúncio vencido guardado.</small></div>'}
      ${list.length > 50 ? `<small>Mostrando 50 de ${list.length}.</small>` : ''}
      ${list.length ? `<button class="no" data-expall style="width:100%;margin-top:8px">${S.expConfirm ? `Toque de novo para confirmar: apagar ${list.length}` : `Apagar todos os vencidos (${list.length})`}</button>` : ''}
      <button class="ghost" data-exprefresh style="margin-top:8px">Atualizar lista</button>`;
  }
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-expdel],[data-expall],[data-exprefresh]'); if (!t || !window.CLOUD_ON) return;
    if (t.hasAttribute('data-exprefresh')) { S.expConfirm = false; Cloud.adm.loadReported(); return Cloud.adm.loadExpired(); }
    if (t.hasAttribute('data-expdel')) { return Cloud.adm.deleteExpired([t.dataset.expdel]).then(() => toast('Anúncio apagado')).catch(x => toast('Erro: ' + (x.message || x))); }
    if (!S.expConfirm) { S.expConfirm = true; render(); setTimeout(() => { if (S.expConfirm) { S.expConfirm = false; render(); } }, 6000); return; }
    S.expConfirm = false;
    const ids = Cloud.expired.map(x => x.id);
    Cloud.adm.deleteExpired(ids).then(() => toast(ids.length + ' anúncios apagados')).catch(x => toast('Erro: ' + (x.message || x)));
  });

  /* ---------- moderação: anúncios denunciados ---------- */
  function reportedHtml() {
    if (!window.CLOUD_ON) return '';
    if (!Cloud.repLoaded) return `<h3>Anúncios denunciados</h3><div class="cardc"><small>Carregando…</small></div>`;
    const list = Cloud.reported || [];
    return `<h3>Anúncios denunciados (${list.length})</h3>${list.map(x => `<div class="cardc"><b>${esc(x.title || '')}</b><small>${esc([x.seller, x.building, (x.reportsCount || 0) + ' denúncia' + ((x.reportsCount || 0) === 1 ? '' : 's')].filter(Boolean).join(' • '))}</small>
      <div class="grid2"><button class="ok" data-repkeep="${esc(x.id)}">Manter</button><button class="no" data-repdel="${esc(x.id)}">Apagar</button></div></div>`).join('') || '<div class="cardc"><small>Nenhum anúncio denunciado.</small></div>'}`;
  }
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-repkeep],[data-repdel]'); if (!t || !window.CLOUD_ON) return;
    const keep = t.hasAttribute('data-repkeep'), id = keep ? t.dataset.repkeep : t.dataset.repdel;
    (keep ? Cloud.adm.keepReported(id) : Cloud.adm.deleteReported(id)).then(() => toast(keep ? 'Anúncio mantido' : 'Anúncio apagado')).catch(x => toast('Erro: ' + (x.message || x)));
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('[data-theme-toggle]')) return;
    const n = themeNow() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', n);
    try { localStorage.setItem('theme', n); } catch (x) {}
    render();
  });
  const _render = window.render;
  window.render = function () {
    purgeExpired(); syncSponsors();
    const all = S.posts;
    S.posts = all.filter(p => !hiddenFor(p));
    const _sh = document.getElementById('admsheet'), _top = _sh ? _sh.scrollTop : 0;
    try { _render(); } finally { S.posts = all; }
    if (S.adminOpen && window.CLOUD_ON && window.Cloud && Cloud.isAdmin) { if (!Cloud.expLoaded) Cloud.adm.loadExpired(); if (!Cloud.repLoaded) Cloud.adm.loadReported(); }
    if (S.adminOpen) { document.getElementById('root').insertAdjacentHTML('beforeend', adminSheet()); const n = document.getElementById('admsheet'); if (n && _sh) { n.style.animation = 'none'; n.parentElement.style.animation = 'none'; n.scrollTop = _top; } }
    if (S.plansOpen) document.getElementById('root').insertAdjacentHTML('beforeend', plansSheet());
    if (S.spOpen) document.getElementById('root').insertAdjacentHTML('beforeend', spSheet());
    if (S.safeOpen) document.getElementById('root').insertAdjacentHTML('beforeend', safeSheet());
    if (S.endFor) document.getElementById('root').insertAdjacentHTML('beforeend', endSheet());
    if (window.placeVideo) placeVideo();
    if (S.errMsg) document.getElementById('root').insertAdjacentHTML('beforeend', `<div class="ov" data-errclose><div class="sheet"><div class="handle"></div><button class="close" data-errclose>✕</button><div class="form"><h2>${esc(S.errMsg.t === 'Teste de conexão' ? 'Resultado' : 'Algo deu errado')}</h2><div class="cardc"><b>${esc(S.errMsg.t)}</b><small style="word-break:break-word;white-space:pre-line">${esc(S.errMsg.d)}</small><small>Versão ${window.APP_VERSION}</small></div><small>Tire um print desta tela e envie para o suporte.</small><button class="cta52" data-errclose style="margin-top:10px">Entendi</button></div></div></div>`);
  };

  async function admAct(act, id) {
    const rec = CR.find(c => c.id === id); if (!rec) return;
    const nameEl = document.querySelector(`[data-admname="${CSS.escape(id)}"]`);
    try {
      if (act === 'approve') await ops().approve(rec);
      else if (act === 'rename') {
        const n = (nameEl && nameEl.value || '').trim();
        if (!n) return toast('Informe o nome');
        if (CR.some(c => c !== rec && c.status !== 'rejected' && norm(c.name) === norm(n))) return toast('Já existe um condomínio com esse nome');
        await ops().rename(rec, n);
      } else if (act === 'mergesug') {
        const m = findMatches({ name: rec.name, end: rec.endereco || '', cidade: rec.cidade }).filter(x => x.rec !== rec)[0];
        if (!m) return toast('Sem sugestão para mesclar');
        await ops().merge(rec, m.rec);
      } else if (act === 'merge') {
        const sel = document.querySelector(`[data-admtarget="${CSS.escape(id)}"]`);
        const target = CR.find(c => c.id === (sel && sel.value));
        if (!target) return toast('Escolha o condomínio de destino');
        await ops().merge(rec, target);
      } else if (act === 'remove') await ops().remove(rec);
      if (window.CLOUD_ON && (act === 'remove' || act === 'merge' || act === 'mergesug')) { const i = CR.indexOf(rec); if (i >= 0) CR.splice(i, 1); }
      persistCR(); rebuildCondos(); if (!window.CLOUD_ON) save();
      render();
      toast('Feito');
    } catch (e) { toast(e.message || 'Não foi possível concluir'); }
  }


  /* ---------- importar condomínios do mapa (administrador) ---------- */
  const CENTRO = { lat: -23.5228, lng: -46.1883 };
  const isFar = c => c.status === 'pending' && /^c-osm-/.test(c.id) && hasGeo(c) && haversine(CENTRO, c) > 20;
  const impCity = () => { let v = S.impCity; if (v == null) { try { v = localStorage.getItem('impCity'); } catch (x) {} } return String(v || 'Mogi das Cruzes').trim() || 'Mogi das Cruzes'; };
  const isOther = c => c.status === 'pending' && /^c-osm-/.test(c.id) && c.cidade && norm(c.cidade) !== norm(impCity());
  const startsCond = n => /^cond(om[ií]nio|\.)?\s/i.test(String(n || '').trim().normalize('NFC')) || /^condominio\s/i.test(norm(n) + ' ');
  const impStrict = () => { let v = S.impStrict; if (v == null) { try { v = localStorage.getItem('impStrict'); } catch (x) {} } return v == null || v === true || v === '1'; };
  const isNotCond = c => c.status === 'pending' && /^c-osm-/.test(c.id) && !startsCond(c.name);
  const isImp = c => c.status === 'pending' && /^c-osm-/.test(c.id);
  const isNoAddr = c => c.status === 'pending' && /^c-osm-/.test(c.id) && c.endereco === 'Endereço a confirmar';
  function importHtml() {
    const pend = CR.filter(c => c.status === 'pending').length, noAddr = CR.filter(isNoAddr).length, other = CR.filter(isOther).length, notCond = CR.filter(isNotCond).length, allImp = CR.filter(isImp).length;
    return `<h3>Carregar condomínios do mapa</h3><div class="cardc"><small>Busca no OpenStreetMap os condomínios dentro do município escolhido (só ele; outras cidades ficam de fora). Eles entram <b>em análise</b> (sem duplicar os que já existem) e você aprova.</small>
      <input type="text" id="imp-city" value="${esc(impCity())}" placeholder="Nome da cidade" autocomplete="off" ${S.impBusy ? 'disabled' : ''}>
      <label style="display:flex;gap:10px;align-items:center;font-size:14px"><input type="checkbox" id="imp-strict" style="width:22px;height:22px" ${impStrict() ? 'checked' : ''} ${S.impBusy ? 'disabled' : ''}>Só nomes que começam com "Condomínio"</label>
      <button class="ghost" data-admimport ${S.impBusy ? 'disabled' : ''}>${S.impBusy ? 'Buscando…' : 'Importar condomínios da região'}</button>
      ${S.impMsg ? `<small>${esc(S.impMsg)}</small>` : ''}
      <div style="border-top:1px solid var(--border,#D6E0EE);padding-top:10px;margin-top:4px"><b>Lista da Receita Federal (automática)</b><small>Usa a cidade escrita no campo acima. A lista é atualizada todo mês, sem você fazer nada.</small>
      <button class="ghost" data-admrf ${S.csvBusy ? 'disabled' : ''}>Importar condomínios da Receita (${esc(impCity())})</button>
      <small>Ou escolha você mesmo um arquivo gerado pelo script:</small><small>Escolha o arquivo .csv gerado pelo script (nome;endereco;bairro;cep;cidade). Os condomínios entram em análise, com localização no mapa.</small>
      <label class="ghost" style="display:flex;align-items:center;justify-content:center;height:46px;border:1px solid var(--border,#D6E0EE);border-radius:12px;font-weight:700;margin-top:6px;${S.csvBusy ? 'opacity:.5' : ''}">${S.csvBusy ? 'Importando…' : 'Escolher arquivo .csv'}<input type="file" id="imp-csv" accept=".csv,text/csv,text/plain" style="display:none" ${S.csvBusy ? 'disabled' : ''}></label>
      ${S.csvMsg ? `<small>${esc(S.csvMsg)}</small>` : ''}</div>
      ${allImp ? `<button class="${S.rmAll ? 'no' : 'no'}" style="${S.rmAll ? '' : 'opacity:.85'}" data-admrmall>${S.rmAll ? `Confirmar: recusar TODOS os ${allImp} importados` : `Recusar TODOS os importados em análise (${allImp})`}</button>` : ''}
      ${notCond ? `<button class="${S.rmNc ? 'no' : 'ghost'}" data-admrmnc>${S.rmNc ? `Confirmar: recusar os ${notCond}` : `Recusar importados que não começam com Condomínio (${notCond})`}</button>` : ''}
      ${other ? `<button class="${S.rmOther ? 'no' : 'ghost'}" data-admrmother>${S.rmOther ? `Confirmar: recusar os ${other}` : `Recusar importados fora de ${esc(impCity())} (${other})`}</button>` : ''}
      ${noAddr ? `<button class="${S.rmConfirm ? 'no' : 'ghost'}" data-admrmnoaddr>${S.rmConfirm ? `Confirmar: recusar os ${noAddr}` : `Recusar importados sem endereço (${noAddr})`}</button>` : ''}
      ${pend ? `<button class="${S.apConfirm ? 'no' : 'ok'}" data-admapproveall>${S.apConfirm ? `Confirmar: aprovar os ${pend}` : `Aprovar todos em análise (${pend})`}</button>` : ''}</div>`;
  }
  // busca por pedaços (círculos de 5 km cobrindo 20 km): cada pedaço aparece na lista assim que chega
  async function ovTile(q) {
    const urls = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
    let last;
    for (const u of urls) {
      const c = new AbortController(), t = setTimeout(() => c.abort(), 12000);   // o relógio vale também para a leitura da resposta
      try {
        const r = await fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'data=' + encodeURIComponent(q), signal: c.signal });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const j = await r.json(); clearTimeout(t); return (j.elements || []).map(fromOsm).filter(Boolean);
      } catch (e) { clearTimeout(t); last = e; }
    }
    throw last;
  }
  const NOM_RE = new RegExp(OSM_NAME, 'i');
  async function nomTile(pt) {
    const dLat = 3.3 / 111.2, dLng = 3.3 / (111.2 * Math.cos(pt[0] * Math.PI / 180)), out = [];
    for (const term of (impStrict() ? ['condomínio'] : ['condomínio', 'residencial', 'torre', 'residence', 'edifício'])) {
      const c = new AbortController(), t = setTimeout(() => c.abort(), 12000);
      try {
        const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=50&countrycodes=br&bounded=1&viewbox=' + [pt[1] - dLng, pt[0] + dLat, pt[1] + dLng, pt[0] - dLat].join(',') + '&q=' + encodeURIComponent(term), { headers: { 'Accept-Language': 'pt-BR' }, signal: c.signal });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const j = await r.json(); clearTimeout(t);
        j.forEach(x => { const f = fromNom(x); if (f && !/^(place|boundary|landuse|highway)$/.test(x.class || '') && (impStrict() ? startsCond(f.name) : NOM_RE.test(f.name) || /^(building|apartments|residential)$/.test(x.type || ''))) { f.osm = (x.osm_type || 'n')[0] + x.osm_id; out.push(f); } });
      } catch (e) { clearTimeout(t); if (!out.length && term === 'edifício') throw e; }
      await new Promise(r => setTimeout(r, 1100));
    }
    return out;
  }
  function tilePoints(lat0, lng0, maxKm, stepKm) {
    const pts = [[lat0, lng0]], dLat = stepKm / 111.2, dLng = stepKm / (111.2 * Math.cos(lat0 * Math.PI / 180)), n = Math.ceil(maxKm / stepKm);
    for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) {
      if (!i && !j) continue;
      const la = lat0 + i * dLat, ln = lng0 + j * dLng;
      if (haversine({ lat: lat0, lng: lng0 }, { lat: la, lng: ln }) <= maxKm + 2) pts.push([la, ln]);
    }
    return pts.sort((a, b) => haversine({ lat: lat0, lng: lng0 }, { lat: a[0], lng: a[1] }) - haversine({ lat: lat0, lng: lng0 }, { lat: b[0], lng: b[1] }));
  }
  function parseCsv(txt) {
    txt = String(txt || '').replace(/^\uFEFF/, '');
    const out = []; let row = [], cur = '', q = false;
    for (let i = 0; i < txt.length; i++) {
      const ch = txt[i];
      if (q) { if (ch === '"') { if (txt[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
      else if (ch === '"') q = true;
      else if (ch === ';' || ch === ',' && !txt.slice(0, txt.indexOf('\n')).includes(';')) { row.push(cur); cur = ''; }
      else if (ch === '\n') { row.push(cur.replace(/\r$/, '')); out.push(row); row = []; cur = ''; }
      else cur += ch;
    }
    if (cur || row.length) { row.push(cur.replace(/\r$/, '')); out.push(row); }
    return out.filter(r => r.some(x => String(x).trim()));
  }
  async function importCsv(file) {
    if (S.csvBusy) return;
    S.csvBusy = true; S.csvMsg = 'Lendo o arquivo…'; render();
    let ok = 0, dup = 0, bad = 0, nogeo = 0, tot = 0, last = 0;
    try {
      const rows = parseCsv(typeof file === 'string' ? file : await file.text());
      const head = rows.shift().map(h => norm(h)), ix = k => head.indexOf(k);
      const iN = ix('nome'), iE = ix('endereco'), iB = ix('bairro'), iC = ix('cep'), iCi = ix('cidade'), iLa = ix('lat'), iLn = ix('lng');
      if (iN < 0 || iE < 0) throw new Error('O arquivo precisa ter as colunas nome e endereco.');
      tot = rows.length; const me = (window.Cloud && Cloud.uid) || null, buf = [];
      const flush = async () => { if (!buf.length) return; const part = buf.splice(0); if (window.CLOUD_ON) await Cloud.adm.importCondos(part); else { part.forEach(r => CR.push(r)); persistCR(); } rebuildCondos(); };
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i], name = String(r[iN] || '').trim(), end = String(r[iE] || '').trim(), bairro = iB >= 0 ? String(r[iB] || '').trim() : '', cep = iC >= 0 ? String(r[iC] || '').replace(/\D/g, '') : '', cidade = iCi >= 0 ? String(r[iCi] || '').trim() : impCity();
        if (name.length < 2) { bad++; continue; }
        const g = { name, end, cidade, cep, bairro };
        if (findMatches(g).some(m => m.hard) || buf.some(b => subsetName(b.name, name) && norm(b.endereco) === norm(end))) { dup++; continue; }
        let geo = null; const la = iLa >= 0 ? parseFloat(r[iLa]) : NaN, ln = iLn >= 0 ? parseFloat(r[iLn]) : NaN;
        if (isFinite(la) && isFinite(ln)) geo = { lat: la, lng: ln }; else { geo = await geocode(end, bairro, cidade); await new Promise(res => setTimeout(res, 1100)); }
        if (!geo) nogeo++;
        buf.push({ id: 'c-osm-rf-' + slug(name + ' ' + cep + ' ' + end).slice(0, 80), name, endereco: end.length > 4 ? end : 'Endereço a confirmar', cep: cep ? fmtCep(cep) : '', bairro: bairro.length > 1 ? bairro : 'Não informado', cidade: cidade.length > 1 ? cidade : impCity(), lat: geo ? geo.lat : undefined, lng: geo ? geo.lng : undefined, status: 'pending', createdBy: me, ts: Date.now() });
        ok++;
        if (buf.length >= 10) await flush();
        if (Date.now() - last > 1500) { last = Date.now(); S.csvMsg = `Importando… ${i + 1}/${tot} • ${ok} novos • ${dup} já existiam`; render(); }
      }
      await flush();
      S.csvMsg = `Pronto: ${ok} novos em análise • ${dup} já existiam • ${bad} sem nome` + (nogeo ? ` • ${nogeo} sem localização no mapa` : '') + '.';
    } catch (e) { S.csvMsg = 'Erro: ' + (e && e.message || e); }
    S.csvBusy = false; if (window.Cloud && Cloud.attachCondos) Cloud.attachCondos(); render();
  }
  document.addEventListener('change', e => { if (e.target && e.target.id === 'imp-csv' && e.target.files && e.target.files[0]) importCsv(e.target.files[0]); });
  async function importRf() {
    if (S.csvBusy) return;
    const city = impCity(), slug2 = norm(city).replace(/ /g, '-');
    S.csvBusy = true; S.csvMsg = 'Baixando a lista de ' + city + '…'; render();
    try {
      const r = await fetchT('data/condominios/' + slug2 + '.csv?v=' + Date.now(), null, 20000);
      if (!r.ok) throw new Error('nf');
      const t = await r.text();
      S.csvBusy = false; return importCsv(t);
    } catch (e) { S.csvMsg = 'Ainda não existe lista da Receita para "' + city + '". Peça a geração dela (leva uns 20 minutos).'; S.csvBusy = false; render(); }
  }
  async function importOsm() {
    if (S.impBusy) return;
    S.impBusy = true; S.impMsg = 'Começando…'; render();
    const strict = impStrict(), city = impCity(), cityQ = city.replace(/["\\]/g, ''), me = (window.Cloud && Cloud.uid) || null;
    let pts = [];
    try {
      const gr = await fetchT('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=' + encodeURIComponent(city + ', Brasil'), { headers: { 'Accept-Language': 'pt-BR' } }, 10000);
      const g = (await gr.json())[0];
      if (!g || !g.boundingbox) throw new Error('nf');
      const [s0, n0, w0, e0] = g.boundingbox.map(Number), la0 = (s0 + n0) / 2;
      let step = 6;
      const mk = () => { const out = [], dLat = step / 111.2, dLng = step / (111.2 * Math.cos(la0 * Math.PI / 180)); for (let la = s0 + dLat / 2; la < n0 + dLat / 2; la += dLat) for (let ln = w0 + dLng / 2; ln < e0 + dLng / 2; ln += dLng) out.push([la, ln]); return out; };
      pts = mk(); while (pts.length > 80 && step < 20) { step += 2; pts = mk(); }
      const c0 = { lat: la0, lng: (w0 + e0) / 2 }; pts.sort((a, b) => haversine(c0, { lat: a[0], lng: a[1] }) - haversine(c0, { lat: b[0], lng: b[1] }));
    } catch (e) { S.impBusy = false; S.impMsg = 'Não encontrei a cidade "' + city + '". Confira o nome (ex.: Mogi das Cruzes).'; return render(); }
    try { localStorage.setItem('impCity', city); } catch (x) {}
    const rad = Math.round(Math.max(3, Math.min(8, 6)) * 1000);
    let done = 0, found = 0, added = 0, fails = 0, last = 0, useNom = false, ovFail = 0, lastErr = '';
    const seen = new Set(), pending = [];
    const upd = force => { const n = Date.now(); if (!force && n - last < 1500) return; last = n; S.impMsg = `Buscando… ${done}/${pts.length} áreas • ${found} no mapa • ${added} novos em análise` + (fails ? ` • ${fails} área(s) com erro` : '') + (lastErr ? ` • Erro: ${lastErr}` : ''); render(); };
    async function one(pt) {
      try {
        let list;
        if (useNom) list = await nomTile(pt);
        else { try { const A = `(around:6000,${pt[0].toFixed(5)},${pt[1].toFixed(5)})(area.m)`; list = await ovTile(`[out:json][timeout:20];area["boundary"="administrative"]["name"="${cityQ}"]->.m;(${strict ? `nwr["name"~"^cond",i]${A};` : `nwr["name"~"${OSM_NAME}",i]${A};nwr["building"="apartments"]["name"]${A};nwr["landuse"="residential"]["residential"~"apartments|gated"]["name"]${A};`});out center tags 600;`); ovFail = 0; } catch (e) { if (++ovFail >= 2) useNom = true; list = await nomTile(pt); } }
        const add = [];
        list.forEach(x => {
          if (seen.has(x.osm)) return; seen.add(x.osm); found++;
          if (!core(x.name).length) return;
          if (strict && !startsCond(x.name)) return;   // regra: todo condomínio começa com "Condomínio"
          if (x.area) return;   // bairro, loteamento ou área: não é um condomínio
          if (x.cidade && norm(x.cidade) !== norm(city)) return;   // só a cidade escolhida; o Overpass já limita pelo contorno do município
          if (CR.concat(add).some(c => c.status !== 'rejected' && subsetName(c.name, x.name) && (!hasGeo(c) || haversine(c, x) < 0.6))) return;
          add.push({ id: 'c-osm-' + x.osm, name: x.name.trim(), endereco: (x.end && x.end.length > 4) ? x.end : 'Endereço a confirmar', cep: x.cep ? fmtCep(x.cep) : '', bairro: (x.bairro && x.bairro.length > 1) ? x.bairro : 'Não informado',
            cidade: (x.cidade && x.cidade.length > 1) ? x.cidade : city, lat: x.lat, lng: x.lng, status: 'pending', createdBy: me, ts: Date.now() });
        });
        if (add.length) {
          if (window.CLOUD_ON) await Cloud.adm.importCondos(add); else { add.forEach(r => CR.push(r)); persistCR(); rebuildCondos(); }
          added += add.length;
        }
      } catch (e) { fails++; lastErr = (e && (e.code || e.message)) ? String(e.code || '') + ' ' + String(e.message || '').slice(0, 90) : String(e); }
      done++; upd(false);
    }
    try {
      const q = pts.slice(); await Promise.all([0].map(async () => { while (q.length && !(fails >= 6 && !found)) await one(q.shift()); }));
      S.impMsg = `Pronto: ${found} no mapa • ${added} novos em análise (role a lista abaixo) • ${found - added} já existiam ou eram repetidos.` + (fails ? ` ${fails} de ${pts.length} áreas com erro (${lastErr}); toque de novo para completar.` : '');
    } catch (e) { S.impMsg = 'Não consegui consultar o mapa agora. Tente de novo em alguns minutos.'; }
    S.impBusy = false; if (window.Cloud && Cloud.attachCondos) Cloud.attachCondos(); render();
  }
  document.addEventListener('input', e => { if (e.target && e.target.id === 'imp-city') S.impCity = e.target.value; });
  document.addEventListener('change', e => { if (e.target && e.target.id === 'imp-strict') { S.impStrict = e.target.checked; try { localStorage.setItem('impStrict', e.target.checked ? '1' : '0'); } catch (x) {} } });
  document.addEventListener('click', async e => {
    if (e.target.closest('[data-admrf]')) return importRf();
    if (e.target.closest('[data-admimport]')) { const el = document.getElementById('imp-city'); if (el) S.impCity = el.value; return importOsm(); }
    if (e.target.closest('[data-admrmall]')) {
      if (!S.rmAll) { S.rmAll = true; return render(); }
      S.rmAll = false;
      const ids = CR.filter(isImp).map(c => c.id);
      try {
        if (window.CLOUD_ON) await Cloud.adm.removeMany(ids); else persistCR();
        for (let i = CR.length - 1; i >= 0; i--) if (ids.includes(CR[i].id)) CR.splice(i, 1);
        rebuildCondos(); toast(ids.length + ' recusados');
      } catch (x) { toast('Erro: ' + (x.message || x)); }
      return render();
    }
    if (e.target.closest('[data-admrmnc]')) {
      if (!S.rmNc) { S.rmNc = true; return render(); }
      S.rmNc = false;
      const ids = CR.filter(isNotCond).map(c => c.id);
      try {
        if (window.CLOUD_ON) await Cloud.adm.removeMany(ids); else persistCR();
        for (let i = CR.length - 1; i >= 0; i--) if (ids.includes(CR[i].id)) CR.splice(i, 1);
        rebuildCondos(); toast(ids.length + ' recusados');
      } catch (x) { toast('Erro: ' + (x.message || x)); }
      return render();
    }
    if (e.target.closest('[data-admrmother]')) {
      if (!S.rmOther) { S.rmOther = true; return render(); }
      S.rmOther = false;
      const ids = CR.filter(isOther).map(c => c.id);
      try {
        if (window.CLOUD_ON) await Cloud.adm.removeMany(ids); else persistCR();
        for (let i = CR.length - 1; i >= 0; i--) if (ids.includes(CR[i].id)) CR.splice(i, 1);
        rebuildCondos(); toast(ids.length + ' recusados');
      } catch (x) { toast('Erro: ' + (x.message || x)); }
      return render();
    }
    if (e.target.closest('[data-admrmfar]')) {
      if (!S.rmFar) { S.rmFar = true; return render(); }
      S.rmFar = false;
      const ids = CR.filter(isFar).map(c => c.id);
      try {
        if (window.CLOUD_ON) await Cloud.adm.removeMany(ids); else persistCR();
        for (let i = CR.length - 1; i >= 0; i--) if (ids.includes(CR[i].id)) CR.splice(i, 1);
        rebuildCondos(); toast(ids.length + ' recusados');
      } catch (x) { toast('Erro: ' + (x.message || x)); }
      return render();
    }
    if (e.target.closest('[data-admrmnoaddr]')) {
      if (!S.rmConfirm) { S.rmConfirm = true; return render(); }
      S.rmConfirm = false;
      const ids = CR.filter(isNoAddr).map(c => c.id);
      try {
        if (window.CLOUD_ON) await Cloud.adm.removeMany(ids); else { for (let i = CR.length - 1; i >= 0; i--) if (ids.includes(CR[i].id)) CR.splice(i, 1); persistCR(); rebuildCondos(); }
        for (let i = CR.length - 1; i >= 0; i--) if (ids.includes(CR[i].id)) CR.splice(i, 1);
        toast(ids.length + ' recusados');
      } catch (x) { toast('Erro: ' + (x.message || x)); }
      return render();
    }
    if (!e.target.closest('[data-admapproveall]')) return;
    if (!S.apConfirm) { S.apConfirm = true; return render(); }
    S.apConfirm = false;
    const list = CR.filter(c => c.status === 'pending');
    toast('Aprovando ' + list.length + '…');
    try {
      if (window.CLOUD_ON && Cloud.adm.approveMany) await Cloud.adm.approveMany(list.map(c => c.id)); else for (const r of list) await ops().approve(r);
      list.forEach(r => { r.status = 'approved'; });
      if (!window.CLOUD_ON) persistCR();
      rebuildCondos(); toast(list.length + ' aprovados');
    } catch (x) { toast('Erro: ' + (x.message || x)); }
    render();
  });

  document.addEventListener('click', e => {
    if (e.target.closest('[data-admrecheck]') && window.Cloud) { toast('Verificando…'); return Cloud.recheck(); }
    if (!e.target.closest('[data-copyuid]') || !window.Cloud) return;
    const u = Cloud.uid || '';
    const ok = () => toast('Código copiado. Cole no Firestore.');
    try { navigator.clipboard.writeText(u).then(ok, () => { prompt('Copie o código:', u); }); } catch (x) { prompt('Copie o código:', u); }
  });
  document.addEventListener('click', async e => {
    if (!e.target.closest('[data-ping]') || !window.Cloud || !Cloud.ping) return;
    toast('Testando… (até 30 s)');
    const r = await Cloud.ping();
    S.errMsg = { t: 'Teste de conexão', d: r };
    render();
  });
  window.showErr = (t, d) => { S.errMsg = { t, d: d || '' }; render(); };
  document.addEventListener('click', e => {
    const c = e.target.closest('[data-errclose]');
    if (c && (c.matches('button') || e.target === c)) { S.errMsg = null; render(); }
  });
  /* ---------- eventos ---------- */
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-renew],[data-geosug],[data-usecondo],[data-regnew],[data-regopen],[data-regcancel],[data-saveemail],[data-adminopen],[data-admclose],[data-adminlogin],[data-admact],[data-admmore]');
    if (e.target.id === 'o-go' && S.user) { S.user.email = (S.onb.email || '').trim(); save(); window.Cloud && Cloud.saveUser(S.user); }
    if (!t) return;
    const d = t.dataset;
    if (d.renew) return renew(d.renew);
    if (d.geosug != null) {
      const s = (S.reg.sugs || [])[+d.geosug]; if (!s) return;
      const g = S.reg; g.name = s.name;
      if (g.sugKind === 'name') { // veio da busca pelo nome: preenche tudo
        if (s.end) { const p = splitEnd(s.end); g.street = p.street || g.street; g.num = p.num || g.num; setEnd(g); }
        if (s.cep) g.cep = fmtCep(s.cep); if (s.bairro) g.bairro = s.bairro; if (s.cidade) g.cidade = s.cidade;
        g.lat = s.lat; g.lng = s.lng;
      } else if (g.lat == null) { g.lat = s.lat; g.lng = s.lng; }
      g.sugs = []; g.matches = null; g.hard = false; g.here = [];
      g.geoMsg = /\d/.test(g.end) && g.cep ? 'Conferido. Falta só salvar.' : 'Complete o CEP e o número.';
      return render();
    }
    if (d.usecondo) { chooseCondo(d.usecondo); resetReg(S.reg.mode); return render(); }
    if (t.hasAttribute('data-regnew')) { S.reg.confirmNew = true; return window.saveCondo(); }
    if (t.hasAttribute('data-saveemail')) {
      const v = ($('#p-email') || {}).value || '';
      if (!validEmail(v)) return toast('E-mail inválido');
      S.user.email = v.trim(); save(); window.Cloud && Cloud.saveUser(S.user); return toast('E-mail salvo');
    }
    if (t.hasAttribute('data-adminopen')) { S.adminOpen = true; return render(); }
    if (t.hasAttribute('data-admmore')) { const k = t.dataset.admmore === 'pend' ? 'admPend' : 'admAppr'; S[k] = (S[k] || 15) + 30; return render(); }
    if (t.hasAttribute('data-admclose')) { if (e.target.closest('.sheet') && !t.matches('button.close')) return; S.adminOpen = false; S.admPend = S.admAppr = 0; return render(); }
    if (t.hasAttribute('data-adminlogin')) return window.Cloud && Cloud.adminLogin();
    if (d.admact) return admAct(d.admact, d.id);
  });
  // abrir o formulário já limpa o estado anterior
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-regopen]');
    if (t) { resetReg(t.dataset.regopen); S.reg.open = true; render(); }
  }, true);
  document.addEventListener('click', e => {   // cancelar cadastro
    if (e.target.closest('[data-regcancel]')) { resetReg(S.reg.mode); }
  }, true);
  document.addEventListener('input', e => {
    const id = e.target.id;
    if (id === 'o-email') { S.onb.email = e.target.value; refreshGo(); }
    else if (id === 'o-name' || id === 'o-apt') refreshGo();
    else if (id === 'r-cep') {
      const v = fmtCep(e.target.value); e.target.value = v; S.reg.cep = v; S.reg.lat = S.reg.lng = null; S.reg.geoMsg = '';
      S.reg.matches = null; S.reg.hard = false; placeLookup();
      if (v.length === 9) lookupCep(v).then(r => {
        if (!r || S.reg.cep !== v) { if (!r) { S.reg.geoMsg = 'CEP não encontrado agora; preencha a rua.'; render(); } return; }
        if (r.street) S.reg.street = r.street;
        if (r.bairro) S.reg.bairro = r.bairro;
        if (r.cidade) S.reg.cidade = r.cidade;
        S.reg.lat = r.lat; S.reg.lng = r.lng; setEnd(S.reg);
        S.reg.geoMsg = 'Rua preenchida. Agora digite o número.';
        render(); const n = $('#r-num'); if (n) n.focus();
        placeLookup();
      });
    }
    else if (id === 'r-street' || id === 'r-num') {
      const g = S.reg; if (id === 'r-street') g.street = e.target.value; else g.num = e.target.value.replace(/[^\d\w -]/g, '');
      setEnd(g); g.matches = null; g.hard = false; g.confirmNew = false; const b = $('.dupbox'); if (b) b.remove();
      g.lat = g.lat; placeLookup();
    }
    else if (/^r-(name|end|bairro|cidade)$/.test(id)) { S.reg.matches = null; S.reg.hard = false; S.reg.confirmNew = false; const b = $('.dupbox'); if (b) b.remove(); if (id === 'r-name') searchName(S.reg.name = e.target.value); }
  });
  resetReg('onb');
  if (S.onb && S.onb.email == null) S.onb.email = '';
  purgeExpired();
  render();
})();
