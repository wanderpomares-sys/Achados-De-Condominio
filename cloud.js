/* Achados de Condomínios — camada de nuvem (Firebase Auth + Firestore + Storage).
 * Só é ativada quando firebase-config.js tem a configuração do seu projeto.
 * Sem configuração, o app continua funcionando só no aparelho (localStorage). */
(function () {
  const cfg = window.FIREBASE_CONFIG;
  const noop = () => {};
  if (!window.CLOUD_ON) {
    window.Cloud = { on: false, view: noop, want: noop, boost: noop, add: noop, saveUser: noop, saveCondo: noop };
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
  const C = window.Cloud = { on: true, ready: false };
  const clean = o => JSON.parse(JSON.stringify(o)); // remove undefined (Firestore não aceita)
  const slug = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const fail = e => { console.error('[Cloud]', e); if (window.toast) toast('Servidor indisponível: ' + (e && e.message ? e.message : e)); };
  const cond = p => (p.building || '').split(' • ')[0];
  const distOf = name => { const c = CONDOS.find(x => x[0] === name); return c && c[1] > 0 ? c[1] : 1; };

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
  // aplica a lista bruta (respeita "só meu prédio")
  C.apply = () => {
    S.posts = raw.map(toUI).filter(p => !(p.reach === 'pred' && !p.isMy));
    render();
  };

  C.view = id => db && db.collection('posts').doc(id).update({ views: firebase.firestore.FieldValue.increment(1) }).catch(noop);
  C.want = (p, interest) => {
    if (!db) return;
    db.collection('posts').doc(p.id).update({ wants: firebase.firestore.FieldValue.increment(1) }).catch(noop);
    if (interest) db.collection('interests').add({ postId: p.id, userId: uid, ts: interest.ts }).catch(fail);
  };
  C.boost = p => db && db.collection('posts').doc(p.id).update({ boostedUntil: p.boostedUntil }).catch(fail);
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
        reach: p.reach, boostedUntil: 0, sellerUid: uid
      });
      await db.collection('posts').doc(p.id).set(d);
    } catch (e) { fail(e); }
  };
  C.saveUser = u => {
    if (!db || !uid) return;
    u.id = uid;
    db.collection('users').doc(uid).set(clean({ id: uid, name: u.name, apt: u.apt, building: u.condo, buildingId: slug(u.condo || '') }), { merge: true }).catch(fail);
    C.apply();
  };
  C.saveCondo = c => db && db.collection('condos').doc(slug(c[0])).set(clean({ name: c[0], bairro: c[2], cidade: c[3], endereco: c[4], createdBy: uid })).catch(fail);

  (async () => {
    try {
      if (!window.firebase) for (const u of LIBS) await loadScript(u);
      firebase.initializeApp(cfg);
      db = firebase.firestore(); st = firebase.storage();
      await firebase.auth().signInAnonymously();
      uid = firebase.auth().currentUser.uid;
      C.ready = true;
      if (S.user) { S.user.id = uid; C.saveUser(S.user); }

      db.collection('condos').onSnapshot(snap => {
        snap.docs.forEach(d => {
          const x = d.data();
          if (!CONDOS.some(c => c[0].toLowerCase() === (x.name || '').toLowerCase())) CONDOS.push([x.name, 0, x.bairro || '', x.cidade || '', x.endereco || '']);
        });
        if (!S.user) render();
      }, fail);

      db.collection('posts').orderBy('ts', 'desc').limit(200).onSnapshot(snap => {
        raw = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        C.apply();
      }, fail);
    } catch (e) { fail(e); }
  })();
})();
