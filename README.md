# Achados de Condomínios

Marketplace hiperlocal entre prédios: venda, doação, achados, eventos, vagas e cursos entre vizinhos em um raio escolhido por você (2, 5, 10 ou 20 km).

Este repositório contém o **protótipo HTML** (arquivo único, sem build) e o briefing do app.

## Protótipos

| Arquivo | Estilo |
|---|---|
| [`index.html`](index.html) | High-tech: fundo escuro, azul/ciano neon, barra lateral fixa |
| [`pixar.html`](pixar.html) | Estilo animação 3D: cores vivas, botões 3D, nuvens |

Abra o arquivo direto no navegador (use largura de celular, até 400 px). Adicione `?fast` ao endereço para encurtar o vídeo rewarded de 15 s para 3 s.

## O que o protótipo faz

- Onboarding: nome, apto e condomínio (lista em raio escolhido pelo morador, até 20 km, cadastro de condomínio novo)
- Feed com busca, escopo (Meu Prédio / Vizinhos (distância escolhida)), barra lateral de atalhos por categoria e seções
- Card patrocinado a cada 4º card e banner "Destaque seu anúncio"
- Vídeo rewarded de 15 s antes de liberar o WhatsApp (com mensagem pronta copiada) ou destacar um anúncio por 24 h
- Detalhe do anúncio, mapa do condomínio com "Como chegar" (Google Maps e Waze)
- Agenda, Chats e Perfil (trocar condomínio, notificações)
- Novo anúncio: título, preço ou grátis, foto, descrição, tipo e alcance

## O que é simulado

- **Firebase:** sem configuração, os dados ficam no `localStorage` do navegador. Com `firebase-config.js` preenchido, usa Firestore e Storage (veja abaixo).
- **Google Places:** lista fixa de condomínios de exemplo.
- **AdMob:** o vídeo é uma contagem regressiva de demonstração.
- **Push:** simulado depois de ativar a opção em Perfil.
- **Link de compartilhamento:** `achados.app/p/...` é um endereço de exemplo.

Os anúncios e patrocinados exibidos são dados de exemplo.


## Hospedagem e banco de dados (Firebase)

Por padrão o protótipo guarda tudo no aparelho (`localStorage`). Para os moradores **compartilharem anúncios de verdade**, ligue o Firebase (plano gratuito Spark atende para começar):

1. Crie um projeto em <https://console.firebase.google.com>.
2. **Authentication** > Sign-in method > ative **Anônimo** (cada aparelho recebe uma identidade; depois dá para trocar por telefone ou Google).
3. **Firestore Database** > criar banco em modo produção, região `southamerica-east1` (São Paulo).
4. **Storage** > começar (para as fotos dos anúncios).
5. Configurações do projeto > **Seus apps** > Web (`</>`) > copie o `firebaseConfig` e cole em [`firebase-config.js`](firebase-config.js).
6. Publique as regras e o site:

```bash
npm i -g firebase-tools
firebase login
firebase use --add            # escolha o projeto
firebase deploy --only firestore:rules,storage,hosting
```

O site fica em `https://SEU-PROJETO.web.app`. Se preferir hospedar só os arquivos no **GitHub Pages**, o banco continua sendo o Firestore: basta ativar o Pages e adicionar o domínio `SEU-USUARIO.github.io` em Authentication > Settings > Authorized domains.

**O que vai para a nuvem:** `posts` (anúncios, com views e wants), `users`, `interests` (cliques em Quero), `condos` (condomínios cadastrados) e as fotos em Storage. Os anúncios aparecem em tempo real para todos.

**Segurança:** a configuração do Firebase não é segredo. A proteção está nas regras ([`firestore.rules`](firestore.rules) e [`storage.rules`](storage.rules)): só o dono edita ou apaga o próprio anúncio, e os demais só somam +1 em visualizações e interesses.

**Ainda simulado:** push (precisa do Firebase Cloud Messaging), AdMob real e distância exata entre condomínios (precisa de latitude/longitude do Google Places; hoje é aproximada).

## Estrutura

```
index.html          protótipo high-tech
pixar.html          protótipo estilo animação 3D
assets/og-image.png imagem Open Graph 1200x630
assets/logo.png     logo
cloud.js            sincronização com Firebase (Auth, Firestore, Storage)
firebase-config.js  cole aqui a configuração do seu projeto
firestore.rules     regras de segurança do banco
storage.rules       regras de segurança das fotos
firebase.json       configuração de hospedagem
docs/briefing.md    briefing completo (telas, modelo de dados, monetização)
```

## Próximos passos

App em React Native + Expo + Firebase (Auth, Firestore, Storage), AdMob Rewarded, Google Places e push, conforme o [briefing](docs/briefing.md).

## Duração do anúncio, renovação e e-mail
- Todo anúncio vale **30 dias**; depois disso some (o app esconde e a função `apagarVencidos` apaga, com foto).
- Quando faltam **3 dias** aparece o aviso no feed e o botão **Renovar** (+30 dias) no anúncio do dono.
- O **e-mail de aviso** é enviado pela função `avisarVencimento` (todo dia 09:00) via extensão *Trigger Email from Firestore* (SMTP/SendGrid). Exige plano **Blaze**:
  `firebase deploy --only functions,firestore:rules,storage`
- Sem Firebase configurado (modo local) não há e-mail; só o aviso dentro do app.

## Condomínios: endereço, duplicados e aprovação
- Cadastro exige nome, endereço (com número), bairro e cidade.
- Se o endereço e um nome parecido já existem, o app sugere usar o existente. Se a pessoa insistir que é outro, o condomínio fica **pendente** até o admin aprovar.
- Admin pode **aprovar, renomear, mesclar (move moradores e anúncios) ou apagar**.
- Virar admin: Perfil → Painel do administrador → entrar com Google; depois crie no Firestore o documento `admins/{seu uid}` (qualquer conteúdo).

## Distância real entre condomínios
- O cadastro do condomínio pede **CEP**. Ele preenche rua, bairro e cidade (BrasilAPI, com ViaCEP de reserva) e traz as coordenadas quando existem. Se não vierem, o app tenta achar o endereço no OpenStreetMap (Nominatim, uma consulta por cadastro).
- A distância entre o meu condomínio e os outros é calculada pelas coordenadas (haversine). Condomínios de exemplo, ou sem coordenadas, usam uma distância fixa aproximada; o painel do admin marca "sem coordenadas".
- O morador escolhe o raio (2, 5, 10 ou 20 km) na aba "Vizinhos".

## Custo do Firebase (leituras)
- O feed carrega **30 anúncios por vez** (botão "Ver mais anúncios" carrega mais 30).
- A lista de condomínios fica **guardada no aparelho por 6 horas** (só o administrador acompanha ao vivo).
- Meta: poucas leituras por usuário por dia para ficar na cota grátis (50 mil leituras/dia).

## Créditos de destaque
- Cada 3 vídeos de 15 s (hoje simulados) dão 1 crédito = 1 destaque de 24 h. Com crédito, o destaque é direto, sem vídeo.
- O saldo aparece no Perfil. Por enquanto fica só no aparelho (não protegido contra fraude); a trava de verdade vem junto com o servidor de pagamentos.

## Planos (Gratuito e Anual)
- **Gratuito:** 1 anúncio por mês; destaque de 24 h assistindo 3 vídeos.
- **Anual (R$ 9,99/ano):** 5 anúncios por mês e 1 destaque por mês sem vídeo.
- Pagamento por Pix via link do Mercado Pago: coloque o link em `window.PAY_LINK` no `firebase-config.js`. Vazio = botão "em breve".
- Fluxo atual (manual): usuário paga, toca em **Já paguei** → o admin vê o pedido em "Pedidos de plano anual" e toca em **Ativar 1 ano** (grava `plans/{uid}`).
- Atenção: contadores de cota e créditos são do lado do cliente (burláveis). A fase 2 (webhook do Mercado Pago + servidor) fará a ativação automática e a validação real.
- Regras do Firestore: republique `firestore.rules` (coleções `plans` e `planRequests`).
