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
    CONDOS.length = 0;
    CR.filter(c => c.status === 'approved' || (c.status === 'pending' && (!window.CLOUD_ON || c.createdBy === me || (window.Cloud && Cloud.isAdmin))))
      .forEach(c => CONDOS.push([c.name, baseDist[c.name] != null ? baseDist[c.name] : 0, c.bairro || '', c.cidade || '', c.endereco || '', c.status]));
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
    const list = CONDOS.filter(c => c[1] <= 2 && c[0].toLowerCase().includes(q));
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
      <input type="text" id="r-end" value="${esc(g.end)}" placeholder="Endereço: rua e número *">
      <input type="text" id="r-bairro" value="${esc(g.bairro)}" placeholder="Bairro *">
      <input type="text" id="r-cidade" value="${esc(g.cidade)}" placeholder="Cidade *">
      <small class="req">Todos os campos são obrigatórios. Cadastros parecidos com um já existente passam por aprovação.</small>
      ${matches}
      <div class="row"><button class="opt" data-regcancel>Cancelar</button><button class="cta48" style="flex:1;min-width:120px" data-regsave>Salvar</button></div></div>`
      : `<button class="ghost" data-regopen="${mode}">＋ Cadastrar meu condomínio</button>`}`;
  };

  const resetReg = mode => { S.reg = { open: false, mode, name: '', end: '', bairro: '', cidade: 'Mogi das Cruzes', matches: null, confirmNew: false }; };
  function chooseCondo(name) {
    if (S.reg.mode === 'onb') { S.onb.condo = name; S.onb.q = ''; }
    else { S.user.condo = name; S.condoSheet = false; save(); window.Cloud && Cloud.saveUser(S.user); }
  }
  window.saveCondo = function () {
    const g = S.reg, name = g.name.trim(), end = g.end.trim(), bairro = g.bairro.trim(), cidade = g.cidade.trim();
    if (!name || !end || !bairro || !cidade) return toast('Preencha nome, endereço, bairro e cidade');
    if (!/\d/.test(end)) return toast('Inclua o número no endereço (ex.: Rua das Flores, 120)');
    if (CR.some(c => c.status !== 'rejected' && norm(c.name) === norm(name))) {
      g.matches = findMatches({ name, end, cidade }); g.confirmNew = false; render();
      return toast('Já existe um condomínio com esse nome. Use o da lista.');
    }
    const m = findMatches({ name, end, cidade });
    if (m.length && !g.confirmNew) { g.matches = m; render(); return; }
    const rec = { id: 'c-' + slug(name) + '-' + Math.random().toString(36).slice(2, 6), name, endereco: end, bairro, cidade, status: m.length ? 'pending' : 'approved', createdBy: (S.user && S.user.id) || null, ts: Date.now() };
    CR.push(rec); persistCR(); rebuildCondos();
    window.Cloud && Cloud.saveCondo(rec);
    chooseCondo(name);
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
        <small>${esc([rec.endereco || 'sem endereço', rec.bairro, rec.cidade].filter(Boolean).join(' • '))}</small>
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
      <h3>Em análise (${pend.length})</h3>${pend.map(row).join('') || '<div class="cardc"><small>Nenhum cadastro esperando aprovação.</small></div>'}
      <h3>Aprovados (${appr.length})</h3>${appr.map(row).join('') || '<div class="cardc"><small>Nenhum condomínio ainda.</small></div>'}
      <small style="color:var(--gray)">Mesclar move moradores e anúncios para o condomínio escolhido e apaga este cadastro.</small></div></div></div>`;
  }
  const _render = window.render;
  window.render = function () {
    purgeExpired();
    _render();
    if (S.adminOpen) document.getElementById('root').insertAdjacentHTML('beforeend', adminSheet());
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
    else if (/^r-(name|end|bairro|cidade)$/.test(id)) { S.reg.matches = null; S.reg.confirmNew = false; const b = $('.dupbox'); if (b) b.remove(); }
  });
  resetReg('onb');
  if (S.onb && S.onb.email == null) S.onb.email = '';
  purgeExpired();
  render();
})();
