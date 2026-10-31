/* Tarefas diárias do servidor:
 *  1) avisarVencimento: 3 dias antes de um anúncio vencer, coloca um e-mail na fila (coleção "mail").
 *     O envio é feito pela extensão "Trigger Email from Firestore" (firebase/firestore-send-email).
 *  2) apagarVencidos: apaga anúncios vencidos, as fotos e os interesses ligados a eles.
 * Requer o plano Blaze (pago por uso; no volume de um app de condomínios o custo é praticamente zero). */
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
admin.initializeApp();

const DAY = 864e5;
const REGION = 'southamerica-east1';
const escHtml = s => String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

exports.avisarVencimento = onSchedule({ schedule: 'every day 09:00', timeZone: 'America/Sao_Paulo', region: REGION }, async () => {
  const db = admin.firestore();
  const now = Date.now();
  const appUrl = `https://${admin.app().options.projectId}.web.app`;
  const snap = await db.collection('posts').where('expiresAt', '>', now).where('expiresAt', '<=', now + 3 * DAY).get();
  for (const doc of snap.docs) {
    const p = doc.data();
    if (p.warnedAt) continue;                       // já avisado nesta validade
    const u = await db.collection('users').doc(p.sellerUid).get();
    const email = u.exists && u.data().email;
    if (!email) continue;
    const dias = Math.max(1, Math.ceil((p.expiresAt - now) / DAY));
    await db.collection('mail').add({
      to: email,
      message: {
        subject: `Seu anúncio "${p.title}" vence em ${dias} dia${dias === 1 ? '' : 's'}`,
        html: `<p>Olá${u.data().name ? ', ' + escHtml(u.data().name) : ''}!</p>
               <p>Seu anúncio <b>${escHtml(p.title)}</b> no Achados de Condomínios vence em <b>${dias} dia${dias === 1 ? '' : 's'}</b> e será apagado.</p>
               <p>Para mantê-lo por mais 30 dias, abra o app e toque em <b>Renovar</b> no seu anúncio:</p>
               <p><a href="${appUrl}">${appUrl}</a></p>`
      }
    });
    await doc.ref.update({ warnedAt: now });
  }
});

exports.apagarVencidos = onSchedule({ schedule: 'every day 03:00', timeZone: 'America/Sao_Paulo', region: REGION }, async () => {
  const db = admin.firestore();
  const bucket = admin.storage().bucket();
  const snap = await db.collection('posts').where('expiresAt', '<=', Date.now()).get();
  for (const doc of snap.docs) {
    const p = doc.data();
    await bucket.file(`posts/${p.sellerUid}/${doc.id}.jpg`).delete().catch(() => {});
    const ints = await db.collection('interests').where('postId', '==', doc.id).get();
    await Promise.all(ints.docs.map(i => i.ref.delete()));
    await doc.ref.delete();
  }
});
