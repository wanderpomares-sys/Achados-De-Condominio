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
  .rad span{flex:none}
  .rad{display:flex;align-items:center;gap:6px;margin:8px 0 4px;font-size:13px;font-weight:700;color:var(--gray,#5B6B80)}
  .rad button{height:32px;flex:1;min-width:0;white-space:nowrap;padding:0 4px;border-radius:16px;border:1px solid var(--border,#D6E0EE);background:transparent;color:var(--dark,#12263F);font-weight:700;font-size:13px;cursor:pointer;font-family:inherit}
  .rad button.on{background:var(--red,#0F2E6B);color:#fff;border-color:var(--red,#0F2E6B)}
  .hbtns{display:flex;align-items:center;gap:8px;flex:none}
  .themebtn{width:40px;height:40px;border-radius:50%;border:1px solid var(--border,#D6E0EE);background:transparent;color:var(--red,#0F2E6B);display:flex;align-items:center;justify-content:center;padding:0;cursor:pointer;flex:none}
  .themebtn svg{width:20px;height:20px}
  .av{flex:none;aspect-ratio:1/1}
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
  async function lookupCep(cep) { // BrasilAPI (traz coordenadas quando tem); ViaCEP como reserva
    const d = String(cep || '').replace(/\D/g, ''); if (d.length !== 8) return null;
    try {
      const r = await fetch('https://brasilapi.com.br/api/cep/v2/' + d); if (!r.ok) throw new Error('cep');
      const j = await r.json(), c = (j.location && j.location.coordinates) || {};
      const lat = Number(c.latitude), lng = Number(c.longitude);
      return { street: j.street || '', bairro: j.neighborhood || '', cidade: j.city || '', lat: isFinite(lat) && c.latitude != null ? lat : null, lng: isFinite(lng) && c.longitude != null ? lng : null };
    } catch (e) {
      try {
        const r = await fetch('https://viacep.com.br/ws/' + d + '/json/'); const j = await r.json(); if (j.erro) return null;
        return { street: j.logradouro || '', bairro: j.bairro || '', cidade: j.localidade || '', lat: null, lng: null };
      } catch (e2) { return null; }
    }
  }
  async function geocode(end, bairro, cidade) { // OpenStreetMap/Nominatim (uso leve, 1 consulta por cadastro)
    try {
      const q = encodeURIComponent([end, bairro, cidade, 'Brasil'].filter(Boolean).join(', '));
      const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=' + q, { headers: { 'Accept-Language': 'pt-BR' } });
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

  function findMatches(g) {
    const k = addrKey(g.end, g.cidade), out = [];
    CR.forEach(c => {
      if (c.status === 'rejected') return;
      const sameCity = norm(c.cidade) === norm(g.cidade);
      const sameAddr = c.endereco && addrKey(c.endereco, c.cidade) === k;
      const s = sim(c.name, g.name);
      if (sameAddr) out.push({ rec: c, why: 'mesmo endereço', score: 2 });
      else if (sameCity && s >= 0.6) out.push({ rec: c, why: 'nome parecido', score: s });
    });
    return out.sort((a, b) => b.score - a.score).slice(0, 4);
  }

  /* ---------- seletor de condomínio + cadastro ---------- */
  window.condoPicker = function (mode) {
    const onb = mode === 'onb';
    const q = (onb ? S.onb.q : S.cq).toLowerCase();
    const sel = onb ? S.onb.condo : S.user.condo;
    const list = CONDOS.filter(c => c[0].toLowerCase().includes(q));
    const g = S.reg;
    const label = c => c[5] === 'pending' ? 'em análise' : (c[2] ? esc(c[2]) : (c[1] === 0 ? 'aqui' : c[1].toLocaleString('pt-BR') + ' km'));
    const matches = (g.open && g.mode === mode && g.matches && g.matches.length) ? `
      <div class="dupbox"><b>Já existe algo parecido</b>
       <p>Antes de criar outro, veja se é o mesmo condomínio:</p>
       ${g.matches.map(m => `<button class="use" data-usecondo="${esc(m.rec.name)}">Usar «${esc(m.rec.name)}»<small>${esc(m.rec.endereco || 'sem endereço')} • ${esc(m.why)}</small></button>`).join('')}
       <p>Se for outro condomínio de verdade, envie para análise. Verificamos e liberamos.</p>
       <button class="opt" data-regnew style="width:100%">É outro condomínio — enviar para análise</button></div>` : '';
    return `<input type="text" id="${onb ? 'o-q' : 'c-q'}" value="${esc(onb ? S.onb.q : S.cq)}" placeholder="Buscar condomínio..." autocomplete="off" style="margin-bottom:8px">
    <div class="sug">${list.map(c => `<button class="${sel === c[0] ? 'on' : ''}" ${onb ? 'data-condo' : 'data-condopick'}="${esc(c[0])}">${esc(c[0])}<small>${label(c)}</small></button>`).join('') || '<button disabled>Nenhum condomínio encontrado</button>'}</div>
    ${g.open && g.mode === mode ? `<div class="regbox"><b>Cadastrar meu condomínio</b>
      <input type="text" id="r-name" value="${esc(g.name)}" placeholder="Nome do condomínio *">
      <input type="text" id="r-cep" inputmode="numeric" maxlength="9" value="${esc(g.cep || '')}" placeholder="CEP * (preenche o endereço)" autocomplete="postal-code">
      <input type="text" id="r-end" value="${esc(g.end)}" placeholder="Endereço: rua e número *">
      <input type="text" id="r-bairro" value="${esc(g.bairro)}" placeholder="Bairro *">
      <input type="text" id="r-cidade" value="${esc(g.cidade)}" placeholder="Cidade *">
      <small class="req">${g.geoMsg ? esc(g.geoMsg) + ' ' : ''}Todos os campos são obrigatórios; o CEP serve para calcular a distância até os vizinhos. Cadastros parecidos com um já existente passam por aprovação.</small>
      ${matches}
      <div class="row"><button class="opt" data-regcancel>Cancelar</button><button class="cta48" style="flex:1;min-width:120px" data-regsave>Salvar</button></div></div>`
      : `<button class="ghost" data-regopen="${mode}">＋ Cadastrar meu condomínio</button>`}`;
  };

  const resetReg = mode => { S.reg = { open: false, mode, name: '', cep: '', end: '', bairro: '', cidade: 'Mogi das Cruzes', lat: null, lng: null, geoMsg: '', matches: null, confirmNew: false }; };
  function chooseCondo(name) {
    if (S.reg.mode === 'onb') { S.onb.condo = name; S.onb.q = ''; }
    else { S.user.condo = name; S.condoSheet = false; save(); rebuildCondos(); window.Cloud && Cloud.saveUser(S.user); }
  }
  window.saveCondo = async function () {
    const g = S.reg, name = g.name.trim(), end = g.end.trim(), bairro = g.bairro.trim(), cidade = g.cidade.trim();
    if (!name || !end || !bairro || !cidade) return toast('Preencha nome, endereço, bairro e cidade');
    if (String(g.cep || '').replace(/\D/g, '').length !== 8) return toast('Informe o CEP (8 números)');
    if (!/\d/.test(end)) return toast('Inclua o número no endereço (ex.: Rua das Flores, 120)');
    if (CR.some(c => c.status !== 'rejected' && norm(c.name) === norm(name))) {
      g.matches = findMatches({ name, end, cidade }); g.confirmNew = false; render();
      return toast('Já existe um condomínio com esse nome. Use o da lista.');
    }
    const m = findMatches({ name, end, cidade });
    if (m.length && !g.confirmNew) { g.matches = m; render(); return; }
    if (g.lat == null) { // sem coordenadas pelo CEP: tenta achar pelo endereço
      toast('Localizando o endereço…');
      const geo = await geocode(end, bairro, cidade);
      if (geo && isFinite(geo.lat) && isFinite(geo.lng)) { g.lat = geo.lat; g.lng = geo.lng; }
    }
    const rec = { id: 'c-' + slug(name) + '-' + Math.random().toString(36).slice(2, 6), name, endereco: end, cep: fmtCep(g.cep), bairro, cidade, status: m.length ? 'pending' : 'approved', createdBy: (S.user && S.user.id) || null, ts: Date.now() };
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

  function adminSheet() {
    if (window.CLOUD_ON && !isAdmin()) {
      return `<div class="ov" data-admclose><div class="sheet adm" id="admsheet"><div class="handle"></div><button class="close" data-admclose>✕</button><div class="form"><h2>Administrador</h2>
        ${Cloud.email ? `<div class="cardc"><b>Conectado como ${esc(Cloud.email)}</b><small>Esta conta ainda não é administradora. No Firestore, crie o documento <b>admins/${esc(Cloud.uid)}</b> (pode ser vazio) e volte aqui.</small></div>` : `<div class="cardc"><small>Entre com a sua conta Google para aprovar, renomear e mesclar condomínios.</small></div>`}
        <button class="cta52" data-adminlogin>Entrar com Google</button></div></div></div>`;
    }
    const pend = CR.filter(c => c.status === 'pending'), appr = CR.filter(c => c.status === 'approved');
    const others = rec => CR.filter(c => c !== rec && c.status !== 'rejected');
    const row = rec => {
      const sug = findMatches({ name: rec.name, end: rec.endereco || '', cidade: rec.cidade }).filter(m => m.rec !== rec).slice(0, 2);
      return `<div class="cardc" data-rec="${esc(rec.id)}">
        <input type="text" value="${esc(rec.name)}" data-admname="${esc(rec.id)}">
        <small>${esc([rec.endereco || 'sem endereço', rec.cep, rec.bairro, rec.cidade, hasGeo(rec) ? '' : 'sem coordenadas'].filter(Boolean).join(' • '))}</small>
        ${rec.status === 'pending' && sug.length ? `<div class="sim">Parecido com: ${sug.map(m => esc(m.rec.name) + ' (' + m.why + ')').join('; ')}</div>` : ''}
        <div class="grid2">
          <button data-admact="rename" data-id="${esc(rec.id)}">Salvar nome</button>
          <a class="lnk" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([rec.endereco, rec.bairro, rec.cidade].filter(Boolean).join(', '))}">Ver mapa</a>
          <select data-admtarget="${esc(rec.id)}"><option value="">Mesclar em…</option>${others(rec).map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select>
          <button data-admact="merge" data-id="${esc(rec.id)}">Mesclar</button>
          ${rec.status === 'pending' ? `<button class="ok" data-admact="approve" data-id="${esc(rec.id)}">Aprovar</button><button class="no" data-admact="remove" data-id="${esc(rec.id)}">Recusar</button>` : `<button class="no" style="grid-column:1/3" data-admact="remove" data-id="${esc(rec.id)}">Apagar</button>`}
        </div>
      </div>`;
    };
    return `<div class="ov" data-admclose><div class="sheet adm" id="admsheet"><div class="handle"></div><button class="close" data-admclose>✕</button><div class="form"><h2>Painel do administrador</h2>
      ${planReqHtml()}
      ${spAdminHtml()}
      <h3>Em análise (${pend.length})</h3>${pend.map(row).join('') || '<div class="cardc"><small>Nenhum cadastro esperando aprovação.</small></div>'}
      <h3>Aprovados (${appr.length})</h3>${appr.map(row).join('') || '<div class="cardc"><small>Nenhum condomínio ainda.</small></div>'}
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

  /* ---------- distância escolhida pelo morador (2, 5, 10 ou 20 km) ---------- */
  const _feedR = window.feed;
  window.feed = function () {
    let h = _feedR();
    if (!S.user) return h;
    const cur = RAD();
    const chips = `<div class="rad"><span>Distância:</span>${RADIUS_OPTS.map(n => `<button class="${n === cur ? 'on' : ''}" data-rad="${n}">${n} km</button>`).join('')}</div>`;
    return h.replace(/(<div class="scopes">.*?<\/div>)/s, '$1' + chips);
  };
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-rad]');
    if (!t || !S.user) return;
    S.user.radius = Math.min(RADIUS_MAX, Number(t.dataset.rad) || 5);
    S.scope = 'viz'; // escolher a distância já mostra os vizinhos
    save(); render();
  });

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
  const wallet = () => { const w = store.get('wallet', null) || {}; return { videos: w.videos | 0, credits: w.credits | 0 }; };
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
        ? `<div style="font-size:48px">🎉</div><h3>Você ganhou 1 destaque!</h3><p>Seu anúncio fica no topo, nos 5 prédios, por 24 horas.</p>
           <button class="cta52" style="margin-top:16px" data-usecredit>Destacar agora</button>
           <button class="ghost" data-rwcancel style="margin-top:8px">Guardar para depois</button>`
        : `<h3>Vídeo ${w.videos} de ${VIDEOS_PER_CREDIT} concluído</h3><div>${dots}</div>
           <p>Faltam ${VIDEOS_PER_CREDIT - w.videos} vídeo${VIDEOS_PER_CREDIT - w.videos > 1 ? 's' : ''} para ganhar 1 destaque de 24 h.</p>
           <button class="cta52" style="margin-top:16px" data-credmore>Assistir o próximo</button>
           <button class="ghost" data-rwcancel style="margin-top:8px">Agora não</button>`;
    return `<div class="ov"><div class="sheet"><div class="handle"></div><div class="rw">${body}</div></div></div>`;
  };
  document.addEventListener('click', e => {
    if (e.target.closest('[data-usecredit]') && S.reward) {
      const w = wallet(), id = S.reward.postId;
      if (w.credits > 0 && applyBoost(id)) { w.credits--; saveWallet(w); S.reward = { kind: 'boost', postId: id, left: 0, msg: '' }; render(); }
    } else if (e.target.closest('[data-credmore]') && S.reward) {
      const id = S.reward.postId; S.reward = null; _startR('credit', id);
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
  const savePlan = p => store.set('plan', p);
  window.applyCloudPlan = d => { const cur = plan(); savePlan({ ...cur, tier: d && d.tier === 'anual' ? 'anual' : 'free', until: d && d.until ? d.until : 0 }); render(); };

  // publicar: gratuito = 1 anúncio por mês; anual = 5
  document.addEventListener('click', e => {
    if (e.target.id !== 'f-go' || !S.form || !S.form.title.trim()) return;
    const p = plan();
    if (p.ads >= QUOTA[p.tier].ads) { e.stopImmediatePropagation(); e.preventDefault(); S.plansOpen = true; S.plansWhy = 'ads'; render(); return; }
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
  const _perfilP = window.perfil;
  window.perfil = function () {
    const p = plan(), q = QUOTA[p.tier];
    const card = `<div class="row2" style="display:block;margin-top:12px"><div class="kv"><span>Meu plano</span><b>${p.tier === 'anual' ? 'Anual' : 'Gratuito'}</b></div>
      <div class="kv"><span>Anúncios neste mês</span><b>${p.ads}/${q.ads}</b></div>
      ${p.tier === 'anual' ? `<div class="kv"><span>Destaque grátis do mês</span><b>${p.boosts < q.boosts ? 'disponível' : 'usado'}</b></div><div class="kv"><span>Válido até</span><b>${fmtDate(p.until)}</b></div>` : ''}
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
      ${S.plansWhy === 'ads' ? `<div class="cardc"><b>Você já usou o anúncio deste mês</b><br><small>Assine o plano anual para publicar até 5 por mês.</small></div>` : ''}
      <div class="cardc"><b>Gratuito</b><br><small>1 anúncio por mês. Destaque de 24 h assistindo 3 vídeos de 15 s.</small></div>
      <div class="cardc" style="border:2px solid var(--red,#0F2E6B)"><b>Anual — R$ 9,90 por ano</b><br><small>5 anúncios por mês. 1 destaque de 24 h por mês, sem vídeo. Menos de R$ 1 por mês.</small>${act}</div></div></div></div>`;
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

  /* ---------- alcance: tipos que ficam só no prédio (vaga de garagem) ---------- */
  const LOCK_PRED = ['vaga', 'aviso'];
  const _newPostL = window.newPost;
  window.newPost = function () {
    let h = _newPostL();
    if (S.form && LOCK_PRED.includes(S.form.type)) {
      S.form.reach = 'pred';
      h = h.replace(/<div><label>Alcance<\/label>[\s\S]*?<\/div><\/div>/, `<div><label>Alcance</label><div class="cardc"><b>🏢 Só meu prédio</b><br><small>${S.form.type === 'aviso' ? 'Avisos só aparecem para moradores do seu condomínio. Não são oficiais e não podem pedir pagamento nem dados pessoais.' : 'Este tipo só aparece para moradores do seu condomínio.'}</small></div></div>`);
    }
    return h;
  };
  document.addEventListener('click', e => {
    if (e.target.closest('[data-reach]') && S.form && LOCK_PRED.includes(S.form.type)) { e.stopImmediatePropagation(); e.preventDefault(); toast('Esse tipo fica só no seu prédio'); }
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
  window.onboarding = function () { return _onbS().replace('<button class="cta48" id="o-go"', '<small style="display:block;text-align:center;color:var(--gray);margin:0 0 8px">Ao entrar, você concorda com as regras do app. <button class="lk" data-safe style="color:var(--red,#0F2E6B);background:none;border:0;padding:0;font:inherit;text-decoration:underline">Segurança e termos</button></small><button class="cta48" id="o-go"'); };
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
    try { _render(); } finally { S.posts = all; }
    if (S.adminOpen) document.getElementById('root').insertAdjacentHTML('beforeend', adminSheet());
    if (S.plansOpen) document.getElementById('root').insertAdjacentHTML('beforeend', plansSheet());
    if (S.spOpen) document.getElementById('root').insertAdjacentHTML('beforeend', spSheet());
    if (S.safeOpen) document.getElementById('root').insertAdjacentHTML('beforeend', safeSheet());
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
      } else if (act === 'merge') {
        const sel = document.querySelector(`[data-admtarget="${CSS.escape(id)}"]`);
        const target = CR.find(c => c.id === (sel && sel.value));
        if (!target) return toast('Escolha o condomínio de destino');
        await ops().merge(rec, target);
      } else if (act === 'remove') await ops().remove(rec);
      persistCR(); rebuildCondos(); if (!window.CLOUD_ON) save();
      render();
      toast('Feito');
    } catch (e) { toast(e.message || 'Não foi possível concluir'); }
  }

  /* ---------- eventos ---------- */
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-renew],[data-usecondo],[data-regnew],[data-regopen],[data-regcancel],[data-saveemail],[data-adminopen],[data-admclose],[data-adminlogin],[data-admact]');
    if (e.target.id === 'o-go' && S.user) { S.user.email = (S.onb.email || '').trim(); save(); window.Cloud && Cloud.saveUser(S.user); }
    if (!t) return;
    const d = t.dataset;
    if (d.renew) return renew(d.renew);
    if (d.usecondo) { chooseCondo(d.usecondo); resetReg(S.reg.mode); return render(); }
    if (t.hasAttribute('data-regnew')) { S.reg.confirmNew = true; return window.saveCondo(); }
    if (t.hasAttribute('data-saveemail')) {
      const v = ($('#p-email') || {}).value || '';
      if (!validEmail(v)) return toast('E-mail inválido');
      S.user.email = v.trim(); save(); window.Cloud && Cloud.saveUser(S.user); return toast('E-mail salvo');
    }
    if (t.hasAttribute('data-adminopen')) { S.adminOpen = true; return render(); }
    if (t.hasAttribute('data-admclose')) { if (e.target.closest('.sheet') && !t.matches('button.close')) return; S.adminOpen = false; return render(); }
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
      if (v.length === 9) lookupCep(v).then(r => {
        if (!r || S.reg.cep !== v) { if (!r) { S.reg.geoMsg = 'CEP não encontrado agora; preencha o endereço.'; render(); } return; }
        if (r.street && !S.reg.end.trim()) S.reg.end = r.street + ', ';
        if (r.bairro) S.reg.bairro = r.bairro;
        if (r.cidade) S.reg.cidade = r.cidade;
        S.reg.lat = r.lat; S.reg.lng = r.lng;
        S.reg.geoMsg = 'Endereço preenchido. Complete o número.';
        render();
      });
    }
    else if (/^r-(name|end|bairro|cidade)$/.test(id)) { S.reg.matches = null; S.reg.confirmNew = false; const b = $('.dupbox'); if (b) b.remove(); }
  });
  resetReg('onb');
  if (S.onb && S.onb.email == null) S.onb.email = '';
  purgeExpired();
  render();
})();
