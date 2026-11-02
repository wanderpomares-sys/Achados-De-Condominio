# Pagamento 100% automático (Cloudflare Worker + Mercado Pago)

O morador toca em **Pagar** → o Worker cria um Pix do Mercado Pago só para aquela compra → quando o Pix é pago, o Mercado Pago avisa o Worker → o Worker **confere o pagamento na API do Mercado Pago** e libera o plano anual (+365 dias) ou o card patrocinado (+7 dias) no Firestore. Pagamento repetido, valor menor que o preço e retorno para outro site são recusados.

**Nunca cole Access Token, chave do Firebase ou senhas no chat nem no GitHub.** Eles vão só no painel da Cloudflare (Secrets).

## Passo a passo (uns 15 minutos)
1. **Cloudflare:** crie conta grátis em https://dash.cloudflare.com. Menu **Workers & Pages → Create → Create Worker** (modelo "Hello World"), nome `achados-pagamentos` → **Deploy**.
2. Clique em **Edit code**, apague tudo, cole o conteúdo de `worker/worker.js` e clique em **Deploy**.
3. **Mercado Pago:** Seu negócio → Configurações → **Credenciais** → credenciais de **produção** → copie o **Access Token**.
4. **Firebase:** Configurações do projeto (engrenagem) → **Contas de serviço** → **Gerar nova chave privada**. Baixa um arquivo `.json` (é segredo; não suba no GitHub).
5. No Worker: **Settings → Variables and Secrets → Add**:
   - `MP_ACCESS_TOKEN` → tipo **Secret** → cole o Access Token.
   - `FIREBASE_SA` → tipo **Secret** → cole o conteúdo inteiro do `.json`.
   - `FIREBASE_API_KEY` → tipo **Text** → o `apiKey` que está no `firebase-config.js`.
   Clique em **Deploy** de novo.
6. Copie o endereço do Worker (algo como `https://achados-pagamentos.SEU-USUARIO.workers.dev`) e me mande (ele não é segredo). Eu coloco em `window.PAY_WORKER` no `firebase-config.js`.
7. Republique o `firestore.rules` no Firebase (Firestore → Regras).
8. **Teste real:** pague o plano de R$ 9,90 com o seu Pix e veja o plano ativar sozinho. Depois estorne no Mercado Pago, se quiser.

## Observações
- Só Pix e saldo Mercado Pago (cartão e boleto ficam desligados, para manter a taxa baixa e não ter chargeback).
- Preços: `PRICE_PLAN` (9.9) e `PRICE_SPONSOR` (29.9) podem ser mudados nas variáveis do Worker. Mantenha iguais aos textos do app.
- Se `PAY_WORKER` estiver vazio, o app volta ao modo manual (botão "Já paguei" e ativação pelo admin).
- Plano gratuito da Cloudflare: 100 mil chamadas por dia, mais que suficiente.
