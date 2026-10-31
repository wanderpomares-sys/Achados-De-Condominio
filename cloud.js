/* Achados de Condomínios — camada de nuvem (Firebase Auth + Firestore + Storage).
 * Só é ativada quando firebase-config.js tem a configuração do seu projeto.
 * Sem configuração, o app continua funcionando só no aparelho (localStorage). */
(function () {
  const cfg = window.FIREBASE_CONFIG;
  const noop = () => {};
  if (!window.CLOUD_ON) {
    window.Cloud = { on: false, view: noop, want: noop, boost: noop, add: noop, renew: noop, purge: noop, saveUser: noop, saveCondo: noop };
    return;
  }

  const V = '10.12.2';
  const LIBS = ['app', 'auth', 'firestore', 'storage'].map(n => `https://www.gstatic.com/firebasejs/${V}/firebase-${n}-compat.js`);
  const loadScript = u => new Promise((ok, err) => {
    const s = document.createElement('script');
    s.src = u; s.onload = ok; s.onerror = () => err(new Error('Não foi possível carregar o Firebase (sem internet?)'));
    document.head.appendChild(s);
  });

  let db, st, uid = null, raw = [];
  const C = window.Cloud = { on: true, ready: false, isAdmin: false, uid: null, email: null };
  const clean = o => JSON.parse(JSON.stringify(o)); // remove undefined (Firestore não aceita)
  const slug = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const fail = e => { console.error('[Cloud]', e); if (window.toast) toast('Servidor indisponível: ' + (e && e.message ? e.message : e)); };
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
  // aplica a lista bruta: esconde vencidos, "só meu prédio" e condomínios ainda em análise
  C.apply = () => {
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

  C.view = id => db && db.collection('posts').doc(id).update({ views: firebase.firestore.FieldValue.increment(1) }).catch(noop);
  C.want = (p, interest) => {
    if (!db) return;
    db.collection('posts').doc(p.id).update({ wants: firebase.firestore.FieldValue.increment(1) }).catch(noop);
    if (interest) db.collection('interests').add({ postId: p.id, userId: uid, ts: interest.ts }).catch(fail);
  };
  C.boost = p => db && db.collection('posts').doc(p.id).update({ boostedUntil: p.boostedUntil }).catch(fail);
  C.renew = p => db && db.collection('posts').doc(p.id).update({ expiresAt: p.expiresAt, warnedAt: null }).catch(fail);
  C.purge = list => db && list.forEach(p => db.collection('posts').doc(p.id).delete().catch(noop)); // dono apaga os próprios vencidos
  C.add = async p => {
    if (!db) return fail(new Error('ainda conectando, tente de novo em instantes'));
    try {
      let url = p.imageUrl || null;
      if (url && url.startsWith('data:')) {
        const ref = st.ref(`posts/${uid}/${p.id}.jpg`);
        await ref.putString(url, 'data_url');
        url = await ref.getDownloadURL();
      }
      const d = clean({
        id: p.id, title: p.title, price: p.price, originalPrice: p.originalPrice, type: p.type,
        building: p.building, buildingId: slug(cond(p)), ts: p.ts, seller: p.seller, apt: p.apt,
        verified: false, views: 0, wants: 0, description: p.description, imageUrl: url,
        reach: p.reach, boostedUntil: 0, sellerUid: uid,
        expiresAt: p.expiresAt, warnedAt: null
      });
      await db.collection('posts').doc(p.id).set(d);
    } catch (e) { fail(e); }
  };
  C.saveUser = u => {
    if (!db || !uid) return;
    u.id = uid;
    db.collection('users').doc(uid).set(clean({ id: uid, name: u.name, apt: u.apt, email: u.email || null, building: u.condo, buildingId: slug(u.condo || '') }), { merge: true }).catch(fail);
    C.apply();
  };
  C.saveCondo = rec => {
    if (!db || !uid) return;
    rec.createdBy = uid;
    db.collection('condos').doc(rec.id).set(clean({ name: rec.name, endereco: rec.endereco, bairro: rec.bairro, cidade: rec.cidade, status: rec.status, createdBy: uid, ts: rec.ts })).catch(fail);
  };

  /* ---------- administrador ---------- */
  async function checkAdmin() {
    try { const d = await db.collection('admins').doc(uid).get(); C.isAdmin = !!d.exists; } catch (e) { C.isAdmin = false; }
    if (window.rebuildCondos) rebuildCondos();
    render();
  }
  C.adminLogin = async () => {
    try {
      const prov = new firebase.auth.GoogleAuthProvider();
      const cu = firebase.auth().currentUser;
      try { await cu.linkWithPopup(prov); }
      catch (e) {
        if (e.credential && (e.code === 'auth/credential-already-in-use' || e.code === 'auth/email-already-in-use')) await firebase.auth().signInWithCredential(e.credential);
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
    approve: async rec => { await db.collection('condos').doc(rec.id).update({ status: 'approved' }); },
    rename: async (rec, newName) => {
      const old = rec.name;
      await db.collection('condos').doc(rec.id).update({ name: newName });
      await moveUsers(old, newName); await movePosts(old, newName);
    },
    merge: async (rec, target) => {
      await moveUsers(rec.name, target.name); await movePosts(rec.name, target.name);
      await db.collection('condos').doc(rec.id).delete();
    },
    remove: async rec => {
      const u = await db.collection('users').where('building', '==', rec.name).limit(1).get();
      if (!u.empty) throw new Error('Há moradores nesse condomínio. Use "Mesclar em…".');
      await db.collection('condos').doc(rec.id).delete();
    }
  };

  (async () => {
    try {
      if (!window.firebase) for (const u of LIBS) await loadScript(u);
      firebase.initializeApp(cfg);
      db = firebase.firestore(); st = firebase.storage();
      await firebase.auth().signInAnonymously();
      uid = firebase.auth().currentUser.uid; C.uid = uid;
      C.ready = true;
      await checkAdmin();
      if (S.user) { S.user.id = uid; C.saveUser(S.user); }

      // condomínios cadastrados (lista real; pendentes só aparecem para quem criou e para o admin)
      db.collection('condos').onSnapshot(snap => {
        CR.length = 0;
        snap.docs.forEach(d => CR.push({ id: d.id, ...d.data() }));
        rebuildCondos();
        C.apply();
      }, fail);

      // se o admin renomear/mesclar o meu condomínio, o app acompanha
      db.collection('users').doc(uid).onSnapshot(d => {
        const x = d.exists ? d.data() : null;
        if (x && S.user && x.building && x.building !== S.user.condo) { S.user.condo = x.building; save(); C.apply(); }
      }, noop);

      db.collection('posts').orderBy('ts', 'desc').limit(200).onSnapshot(snap => {
        raw = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        C.apply();
      }, fail);
    } catch (e) { fail(e); }
  })();
})();
