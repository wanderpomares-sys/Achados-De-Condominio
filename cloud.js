/* Achados de Condomínios — camada de nuvem (Firebase Auth + Firestore + Storage).
 * Só é ativada quando firebase-config.js tem a configuração do seu projeto.
 * Sem configuração, o app continua funcionando só no aparelho (localStorage). */
(function () {
  const cfg = window.FIREBASE_CONFIG;
  const noop = () => {};
  if (!window.CLOUD_ON) {
    window.Cloud = { on: false, view: noop, want: noop, boost: noop, add: noop, renew: noop, purge: noop, saveUser: noop, saveCondo: noop, report: noop, loadMore: noop, more: false, requestSponsor: noop, freshCondos: noop, reported: [], repLoaded: false, expired: [], expLoaded: false, remove: noop, update: noop, checkout: noop, sponsors: [], requestPlan: noop, planReqs: [], googleLogin: noop, linked: () => false };
    return;
  }

  const V = '10.12.2';
  const LIBS = ['app', 'auth', 'firestore', 'storage'].map(n => `https://www.gstatic.com/firebasejs/${V}/firebase-${n}-compat.js`);
  const loadScript = u => new Promise((ok, err) => {
    const s = document.createElement('script');
    s.src = u; s.onload = ok; s.onerror = () => err(new Error('Não foi possível carregar o Firebase (sem internet?)'));
    document.head.appendChild(s);
  });

  let db, st, uid = null, raw = [], postLimit = 30, unsubPosts = null;
  const CACHE_KEY = 'condoCache', CACHE_TTL = 6 * 3600e3; // lista de condomínios guardada no aparelho por 6 h
  const cacheGet = () => { try { const x = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); return x && Date.now() - x.ts < CACHE_TTL ? x.list : null; } catch (e) { return null; } };
  const cacheSet = list => { try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), list })); } catch (e) {} };
  const C = window.Cloud = { on: true, ready: false, isAdmin: false, uid: null, email: null };
  const clean = o => JSON.parse(JSON.stringify(o)); // remove undefined (Firestore não aceita)
  const slug = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const fail = e => { console.error('[Cloud]', e); C.lastErr = String((e && (e.code || e.message)) || e).slice(0, 90); if (window.toast) toast('Servidor indisponível: ' + (e && e.message ? e.message : e)); };
  const bad = (t, e) => { console.error('[Cloud]', e); C.lastErr = String((e && (e.code || e.message)) || e).slice(0, 90); const m = (e && (e.code ? e.code + ': ' : '')) + (e && e.message ? e.message : e); if (window.showErr) showErr(t, m); else fail(e); };
  const cond = p => (p.building || '').split(' • ')[0];
  const distOf = name => { const c = CONDOS.find(x => x[0] === name); return c && c[1] > 0 ? c[1] : 1; };
  const status = name => { const r = window.CR && CR.find(c => c.name === name); return r ? r : null; };

  // converte documento do Firestore no formato usado pela interface
  function toUI(d) {
    const p = { ...d };
    const mine = !!(S.user && cond(p) === S.user.condo);
    p.isMy = mine;
    p.distance = mine ? 0 : distOf(cond(p));
    p.mine = !!uid && p.sellerUid === uid;
    p.boostedUntil = p.boostedUntil || 0;
    p.views = p.views || 0; p.wants = p.wants || 0;
    return p;
  }
  // aplica a lista bruta: esconde vencidos, "só meu condomínio" e condomínios ainda em análise
  C.apply = () => {
    if (window.rebuildCondos) rebuildCondos(); // distâncias a partir do MEU condomínio
    const now = Date.now();
    S.posts = raw.map(toUI).filter(p => {
      if (p.expiresAt && p.expiresAt < now) return false;
      if (p.reach === 'pred' && !p.isMy) return false;
      const r = status(cond(p));
      if (r && r.status === 'pending' && !p.isMy && !p.mine && !C.isAdmin) return false;
      return true;
    });
    render();
  };


  // ---------- conta Google do morador (opcional): mantém o mesmo código em qualquer aparelho ----------
  C.linked = () => { const u = window.firebase && firebase.auth && firebase.auth().currentUser; return !!(u && u.providerData && u.providerData.some(x => x.providerId === 'google.com')); };
  C.googleLogin = async () => {
    try {
      const prov = new firebase.auth.GoogleAuthProvider();
      const cu = firebase.auth().currentUser;
      let restored = false;
      try { await cu.linkWithPopup(prov); }
      catch (e) {
        if (e.code === 'auth/provider-already-linked') { /* já vinculado */ }
        else if (e.credential && (e.code === 'auth/credential-already-in-use' || e.code === 'auth/email-already-in-use')) { await firebase.auth().signInWithCredential(e.credential); restored = true; }
        else throw e;
      }
      const u = firebase.auth().currentUser;
      uid = u.uid; C.uid = uid;
      const g = u.providerData.find(x => x.providerId === 'google.com') || {};
      C.email = g.email || u.email || null;
      let profile = null;
      try { const d = await db.collection('users').doc(uid).get(); if (d.exists) profile = d.data(); } catch (e) { /* sem perfil guardado */ }
      await checkAdmin(); C.apply();
      return { restored, profile, name: g.displayName || '', email: C.email };
    } catch (e) {
      if (e && (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request')) return null;
      bad('Não foi possível entrar com o Google', e); return null;
    }
  };

  // teste de conexão: mede leitura e escrita no servidor e diz o que está acontecendo
  C.ping = async () => {
    const out = [];
    const lim = (p, ms) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('sem resposta em ' + ms / 1000 + ' s')), ms))]);
    if (!db || !uid) return 'Ainda conectando (sem conta). Tente de novo em alguns segundos.';
    const t0 = Date.now();
    try { await lim(db.collection('condos').limit(1).get({ source: 'server' }), 10000); out.push('Leitura no servidor: OK (' + (Date.now() - t0) + ' ms)'); }
    catch (e) { out.push('Leitura no servidor: FALHOU (' + ((e && (e.code || e.message)) || e) + ')'); }
    const t1 = Date.now();
    try { await lim(db.collection('users').doc(uid).set({ ping: Date.now() }, { merge: true }), 10000); out.push('Escrita no servidor: OK (' + (Date.now() - t1) + ' ms)'); }
    catch (e) { out.push('Escrita no servidor: FALHOU (' + ((e && (e.code || e.message)) || e) + ')'); }
    try { await lim(db.waitForPendingWrites(), 6000); out.push('Alterações pendentes: nenhuma'); } catch (e) { out.push('Alterações pendentes: AINDA AGUARDANDO O SERVIDOR'); }
    out.push('Rede do aparelho: ' + (navigator.onLine ? 'online' : 'OFFLINE'));
    return out.join('\n');
  };
  C.postsLoaded = false; C.rawCount = () => raw.length; C.lastErr = '';
  C.more = false; C.planReqs = [];
  C.requestPlan = info => db && uid && db.collection('planRequests').doc(uid).set(clean({ ...info, uid })).catch(fail);
  let reqUnsub = null;
  function watchPlanReqs() {
    if (reqUnsub || !C.isAdmin || C.role === 'mod') return;
    reqUnsub = db.collection('planRequests').onSnapshot(s => { C.planReqs = s.docs.map(d => ({ id: d.id, ...d.data() })); render(); }, noop);
  }
  // patrocinados: admin acompanha ao vivo (pendentes + ativos); os demais leem os ativos uma vez
  C.sponsors = [];
  // pagamento automático: o Worker cria o Pix no Mercado Pago e libera tudo quando o pagamento é confirmado
  C.checkout = async (type, sponsor) => {
    const idToken = await firebase.auth().currentUser.getIdToken();
    const r = await fetch(String(window.PAY_WORKER).replace(/\/$/, '') + '/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, idToken, sponsor, back: location.origin + location.pathname }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.url) throw new Error(j.error || 'Não foi possível criar o pagamento');
    return j.url;
  };
  C.requestSponsor = rec => db && uid ? db.collection('sponsors').add(clean({ ...rec, uid, status: 'pending', ts: Date.now() })).catch(fail) : null;
  let spUnsub = null;
  function loadSponsors() {
    if (!db) return;
    const fill = s => { C.sponsors = s.docs.map(d => ({ id: d.id, ...d.data() })); window.applySponsors && applySponsors(); };
    if (C.isAdmin && C.role !== 'mod') { if (!spUnsub) spUnsub = db.collection('sponsors').onSnapshot(fill, noop); }
    else db.collection('sponsors').where('status', '==', 'active').limit(10).get().then(fill).catch(noop);
  }
  C.loadMore = () => { postLimit += 30; listenPosts(); };
  C.view = id => db && db.collection('posts').doc(id).update({ views: firebase.firestore.FieldValue.increment(1) }).catch(noop);
  C.want = (p, interest) => {
    if (!db) return;
    db.collection('posts').doc(p.id).update({ wants: firebase.firestore.FieldValue.increment(1) }).catch(noop);
    if (interest) db.collection('interests').add({ postId: p.id, userId: uid, ts: interest.ts }).catch(fail);
  };
  C.boost = p => db && db.collection('posts').doc(p.id).update({ boostedUntil: p.boostedUntil }).catch(fail);
  C.renew = p => db && db.collection('posts').doc(p.id).update({ expiresAt: p.expiresAt, warnedAt: null }).catch(e => bad('Não foi possível renovar o anúncio.', e));
  C.report = async p => { // uma denúncia por pessoa por anúncio; o contador sobe junto (rules validam)
    if (!db || !uid) return;
    try {
      const b = db.batch();
      b.set(db.collection('reports').doc(p.id + '_' + uid), { postId: p.id, userId: uid, ts: Date.now() });
      b.update(db.collection('posts').doc(p.id), { reportsCount: firebase.firestore.FieldValue.increment(1) });
      await b.commit();
    } catch (e) { console.warn('[Cloud] denúncia', e); }
  };
  // o dono encerra ou altera o próprio anúncio
  C.remove = async p => {
    if (!db) return false;
    try {
      await db.collection('posts').doc(p.id).delete();
      if (st) ['webp', 'jpg'].forEach(x => st.ref(`posts/${uid}/${p.id}.${x}`).delete().catch(noop)); // apaga a foto, se houver
      return true;
    } catch (e) { bad('Não foi possível encerrar o anúncio.', e); C.apply(); return false; }
  };
  C.update = async p => {
    if (!db) return false;
    try {
      let url = p.imageUrl || null;
      if (url && url.startsWith('data:') && url.length > 300000) { url = null; if (window.toast) toast('Foto grande demais: alterações salvas sem a foto nova'); }
      await db.collection('posts').doc(p.id).update(clean({ title: p.title, price: p.price === undefined ? null : p.price, type: p.type, description: p.description, imageUrl: url, reach: p.reach, whats: String(p.whats || '').replace(/\D/g, '').slice(0, 13) }));
      const back = await db.collection('posts').doc(p.id).get({ source: 'server' }); // confere o que o servidor guardou
      if (!back.exists) throw new Error('o servidor não encontrou este anúncio (id ' + p.id + ')');
      if (back.data().title !== p.title) throw new Error('o servidor ainda tem o título antigo: ' + back.data().title);
      return true;
    } catch (e) { bad('Não foi possível salvar a alteração. O anúncio voltou ao original.', e); C.apply(); return false; }
  };
  C.purge = list => db && list.forEach(p => db.collection('posts').doc(p.id).delete().catch(noop)); // dono apaga os próprios vencidos
  const undoAdd = p => { // não deixa um anúncio "fantasma" (só no aparelho) nem gasta a cota do mês
    S.posts = S.posts.filter(x => x.id !== p.id);
    if (window.refundAd) refundAd();
    render();
  };
  C.add = async p => {
    if (!db) { undoAdd(p); return fail(new Error('ainda conectando, tente de novo em instantes')); }
    if (!p.expiresAt) p.expiresAt = (p.ts || Date.now()) + 30 * 864e5;   // as regras exigem a validade
    try {
      let url = p.imageUrl || null;
      // Fotos ficam dentro do próprio anúncio (já reduzidas pelo app); o Storage exige plano pago e deixava o envio travado
      if (url && url.startsWith('data:') && url.length > 300000) { url = null; if (window.toast) toast('Foto grande demais: anúncio publicado sem foto'); }
      const d = clean({
        id: p.id, title: p.title, price: p.price, originalPrice: p.originalPrice, type: p.type,
        building: p.building, buildingId: slug(cond(p)), ts: p.ts, seller: p.seller, apt: p.apt,
        verified: false, views: 0, wants: 0, description: p.description, imageUrl: url,
        reach: p.reach, whats: String(p.whats || '').replace(/\D/g, '').slice(0, 13), boostedUntil: 0, sellerUid: uid,
        expiresAt: p.expiresAt, warnedAt: null
      });
      await db.collection('posts').doc(p.id).set(d);
    } catch (e) { undoAdd(p); console.error('[Cloud]', e); if (window.showErr) showErr('Não foi possível publicar o anúncio.', (e && (e.code ? e.code + ': ' : '')) + (e && e.message ? e.message : e)); else fail(e); }
  };
  C.saveUser = u => {
    if (!db || !uid) return;
    u.id = uid;
    db.collection('users').doc(uid).set(clean({ id: uid, name: u.name, apt: u.apt, email: u.email || null, building: u.condo, buildingId: slug(u.condo || '') }), { merge: true }).catch(fail);
    C.apply();
  };
  // lista fresca do servidor antes de cadastrar (a lista guardada pode ter até 6 h)
  C.freshCondos = async () => {
    if (!db || !uid) return;
    try {
      const snap = await db.collection('condos').get();
      const l = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      try { cacheSet(l); } catch (e) {}
      CR.length = 0; l.forEach(x => CR.push(x)); if (window.rebuildCondos) rebuildCondos();
    } catch (e) {}
  };
  C.saveCondo = rec => {
    if (!db || !uid) return;
    rec.createdBy = uid;
    try { const cur = cacheGet() || []; cacheSet(cur.filter(x => x.id !== rec.id).concat([{ ...rec }])); } catch (e) {}
    db.collection('condos').doc(rec.id).set(clean({ name: rec.name, endereco: rec.endereco, cep: rec.cep, lat: rec.lat, lng: rec.lng, bairro: rec.bairro, cidade: rec.cidade, status: rec.status, createdBy: uid, ts: rec.ts })).catch(fail);
  };

  // confirma no servidor que o condomínio realmente sumiu (senão avisa em vez de dizer "Feito")
  async function checkGone(id) {
    try { const d = await db.collection('condos').doc(id).get({ source: 'server' }); if (d.exists) throw new Error('O servidor não apagou este condomínio. Verifique se sua conta é administradora.'); }
    catch (e) { if (e && e.message && e.message.indexOf('servidor não apagou') >= 0) throw e; }
  }

  /* ---------- administrador ---------- */
  async function checkAdmin() {
    try { const d = await db.collection('admins').doc(uid).get(); C.admErr = ''; C.isAdmin = !!d.exists; C.role = d.exists && d.data() && d.data().role === 'mod' ? 'mod' : 'admin'; } catch (e) { C.isAdmin = false; C.role = null; C.admErr = (e && (e.code || e.message)) || 'erro'; }
    if (window.rebuildCondos) rebuildCondos();
    watchPlanReqs();
    loadSponsors();
    render();
  }
  C.recheck = async () => { try { await checkAdmin(); } catch (e) { fail(e); } };
  C.adminLogin = async () => {
    try { localStorage.setItem('admReturn', '1'); } catch (x) {}   // se o app recarregar após o login, reabre o painel
    try {
      const prov = new firebase.auth.GoogleAuthProvider();
      const cu = firebase.auth().currentUser;
      try { await cu.linkWithPopup(prov); }
      catch (e) {
        if (e.code === 'auth/provider-already-linked') { /* já vinculado: só confere de novo */ }
        else if (e.credential && (e.code === 'auth/credential-already-in-use' || e.code === 'auth/email-already-in-use')) await firebase.auth().signInWithCredential(e.credential);
        else throw e;
      }
      const u = firebase.auth().currentUser;
      uid = u.uid; C.uid = uid; C.email = (u.providerData.find(x => x.email) || {}).email || u.email || null;
      await checkAdmin();
    } catch (e) { fail(e); }
  };
  async function movePosts(oldName, newName) {
    const q = await db.collection('posts').where('buildingId', '==', slug(oldName)).get();
    let batch = db.batch(), n = 0;
    for (const d of q.docs) {
      const b = d.data().building || '';
      batch.update(d.ref, { building: newName + b.slice(oldName.length), buildingId: slug(newName) });
      if (++n % 400 === 0) { await batch.commit(); batch = db.batch(); }
    }
    await batch.commit();
  }
  async function moveUsers(oldName, newName) {
    const q = await db.collection('users').where('building', '==', oldName).get();
    let batch = db.batch(), n = 0;
    for (const d of q.docs) {
      batch.update(d.ref, { building: newName, buildingId: slug(newName) });
      if (++n % 400 === 0) { await batch.commit(); batch = db.batch(); }
    }
    await batch.commit();
  }
  C.adm = {
    // anúncios vencidos (só o admin): lista para apagar em lote ou um a um
    // anúncios denunciados: o moderador mantém (zera as denúncias) ou apaga
    loadReported: async () => {
      C.repLoaded = true;
      try {
        const s = await db.collection('posts').where('reportsCount', '>=', 1).limit(100).get();
        C.reported = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.reportsCount || 0) - (a.reportsCount || 0));
      } catch (e) { fail(e); C.reported = []; }
      render();
    },
    keepReported: async id => { await db.collection('posts').doc(id).update({ reportsCount: 0 }); C.reported = C.reported.filter(x => x.id !== id); render(); },
    deleteReported: async id => { await db.collection('posts').doc(id).delete(); C.reported = C.reported.filter(x => x.id !== id); render(); },
    loadExpired: async () => {
      C.expLoaded = true;
      try {
        const s = await db.collection('posts').where('expiresAt', '<', Date.now()).limit(300).get();
        C.expired = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.expiresAt - b.expiresAt);
      } catch (e) { fail(e); C.expired = []; }
      render();
    },
    deleteExpired: async ids => {
      for (let i = 0; i < ids.length; i += 400) {
        const b = db.batch(); ids.slice(i, i + 400).forEach(id => b.delete(db.collection('posts').doc(id)));
        await b.commit();
      }
      C.expired = C.expired.filter(x => !ids.includes(x.id)); render();
    },
    activateSponsor: id => db.collection('sponsors').doc(id).update({ status: 'active', until: Date.now() + 7 * 864e5 }),
    removeSponsor: id => db.collection('sponsors').doc(id).delete(),
    activatePlan: async uid2 => { await db.collection('plans').doc(uid2).set({ tier: 'anual', until: Date.now() + 365 * 864e5, ts: Date.now() }); await db.collection('planRequests').doc(uid2).delete(); },
    rejectPlan: uid2 => db.collection('planRequests').doc(uid2).delete(),
    approve: async rec => { await db.collection('condos').doc(rec.id).update({ status: 'approved' }); },
    importCondos: async list => {
      for (let i = 0; i < list.length; i += 400) {
        const b = db.batch();
        list.slice(i, i + 400).forEach(r => b.set(db.collection('condos').doc(r.id), clean({ name: r.name, endereco: r.endereco, cep: r.cep, lat: r.lat, lng: r.lng, bairro: r.bairro, cidade: r.cidade, status: 'pending', createdBy: uid, ts: r.ts })));
        await b.commit();
      }
    },
    rename: async (rec, newName) => {
      const old = rec.name;
      await db.collection('condos').doc(rec.id).update({ name: newName });
      await moveUsers(old, newName); await movePosts(old, newName);
    },
    merge: async (rec, target) => {
      await moveUsers(rec.name, target.name); await movePosts(rec.name, target.name);
      await db.collection('condos').doc(rec.id).delete();
      await checkGone(rec.id);
    },
    remove: async rec => {
      const u = await db.collection('users').where('building', '==', rec.name).limit(1).get();
      if (!u.empty) throw new Error('Há moradores nesse condomínio. Use "Mesclar em…".');
      await db.collection('condos').doc(rec.id).delete();
      await checkGone(rec.id);
    }
  };

  function listenPosts() {
    if (unsubPosts) unsubPosts();
    unsubPosts = db.collection('posts').orderBy('ts', 'desc').limit(postLimit).onSnapshot(snap => {
      C.postsLoaded = true;
      raw = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      C.more = snap.docs.length >= postLimit;
      C.apply();
    }, e => { C.postsLoaded = true; fail(e); });
  }

  (async () => {
    try {
      if (!window.firebase) { await loadScript(LIBS[0]); await Promise.all(LIBS.slice(1).map(loadScript)); } // o primeiro (app) antes; os outros juntos
      firebase.initializeApp(cfg);
      db = firebase.firestore(); st = firebase.storage();
      // redes móveis às vezes seguram a conexão em tempo real do Firestore: detecta e troca para o modo compatível
      try { db.settings({ experimentalAutoDetectLongPolling: true, useFetchStreams: false, merge: true }); } catch (e) { console.warn('[Cloud] settings', e); }
      // guarda os anúncios no aparelho: abre na hora e não perde alterações se o app for fechado antes do servidor confirmar
      try { await db.enablePersistence({ synchronizeTabs: true }); } catch (e) { console.warn('[Cloud] persistência', e && e.code); }
      await firebase.auth().signInAnonymously();
      uid = firebase.auth().currentUser.uid; C.uid = uid;
      C.ready = true;
      listenPosts();                       // começa a buscar os anúncios já, sem esperar o resto
      await checkAdmin();
      try { if (localStorage.getItem('admReturn')) { localStorage.removeItem('admReturn'); S.adminOpen = true; render(); } } catch (x) {}
      if (S.user) { S.user.id = uid; C.saveUser(S.user); }

      // condomínios: admin acompanha ao vivo; os demais usam a lista guardada (6 h) ou leem uma vez
      let fcT = 0, fcL = null;
      const fillCondos = list => { fcL = list; clearTimeout(fcT); fcT = setTimeout(() => { CR.length = 0; fcL.forEach(x => CR.push(x)); rebuildCondos(); C.apply(); }, 350); };
      if (C.isAdmin) {
        db.collection('condos').onSnapshot(snap => fillCondos(snap.docs.map(d => ({ id: d.id, ...d.data() }))), fail);
      } else {
        const cached = cacheGet();
        if (cached) fillCondos(cached);
        else db.collection('condos').get().then(snap => { const l = snap.docs.map(d => ({ id: d.id, ...d.data() })); cacheSet(l); fillCondos(l); }).catch(fail);
      }

      db.collection('plans').doc(uid).onSnapshot(d => { window.applyCloudPlan && applyCloudPlan(d.exists ? d.data() : null); }, noop);

      // se o admin renomear/mesclar o meu condomínio, o app acompanha
      db.collection('users').doc(uid).onSnapshot(d => {
        const x = d.exists ? d.data() : null;
        if (x && S.user && x.building && x.building !== S.user.condo) { S.user.condo = x.building; save(); C.apply(); }
      }, noop);

    } catch (e) { fail(e); }
  })();
})();
