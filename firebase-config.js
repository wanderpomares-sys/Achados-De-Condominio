/* Configuração do app web do Firebase (projeto achados-de-condominios).
 * Esses valores NÃO são segredo: a segurança vem das regras em firestore.rules e storage.rules. */
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyB4Y44vZLdJyaMRYdgszNmEJ_Yzdqyo9c8",
  authDomain: "achados-de-condominios.firebaseapp.com",
  projectId: "achados-de-condominios",
  storageBucket: "achados-de-condominios.firebasestorage.app",
  messagingSenderId: "490345201426",
  appId: "1:490345201426:web:473ed54080db4c3efdfdcb"
};

// Link de pagamento Pix do plano anual (Efí). Enquanto vazio, o botão mostra "Pagamento por Pix em breve".
window.PAY_LINK = "https://mpago.li/1tRRFzZ";
window.PAY_SPONSOR = "https://mpago.li/1qy8VFx";

// Endereço do Worker da Cloudflare (pagamento 100% automático). Vazio = modo manual (botão "Já paguei").
window.PAY_WORKER = "https://achados-pagamentos.wanderpomares.workers.dev";

// Vídeos patrocinados da tela de 15 segundos (anúncio extra, destaque, WhatsApp).
// Coloque os arquivos .mp4 na pasta assets/videos/ e liste aqui. Lista vazia = tela de demonstração.
// Exemplo: window.REWARD_VIDEOS = [{ src: "assets/videos/padaria.mp4", brand: "Padaria do Zé" }];
window.REWARD_VIDEOS = [];
