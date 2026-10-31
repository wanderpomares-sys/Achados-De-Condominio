# Achados de Condomínios

Marketplace hiperlocal entre prédios: venda, doação, achados, eventos, vagas e cursos entre vizinhos em um raio de 2 km.

Este repositório contém o **protótipo HTML** (arquivo único, sem build) e o briefing do app.

## Protótipos

| Arquivo | Estilo |
|---|---|
| [`index.html`](index.html) | High-tech: fundo escuro, azul/ciano neon, barra lateral fixa |
| [`pixar.html`](pixar.html) | Estilo animação 3D: cores vivas, botões 3D, nuvens |

Abra o arquivo direto no navegador (use largura de celular, até 400 px). Adicione `?fast` ao endereço para encurtar o vídeo rewarded de 15 s para 3 s.

## O que o protótipo faz

- Onboarding: nome, apto e condomínio (lista em raio de 2 km, cadastro de condomínio novo)
- Feed com busca, escopo (Meu Prédio / Vizinhos 2 km), barra lateral de atalhos por categoria e seções
- Card patrocinado a cada 4º card e banner "Destaque seu anúncio"
- Vídeo rewarded de 15 s antes de liberar o WhatsApp (com mensagem pronta copiada) ou destacar um anúncio por 24 h
- Detalhe do anúncio, mapa do condomínio com "Como chegar" (Google Maps e Waze)
- Agenda, Chats e Perfil (trocar condomínio, notificações)
- Novo anúncio: título, preço ou grátis, foto, descrição, tipo e alcance

## O que é simulado

- **Firebase:** os dados ficam no `localStorage` do navegador. Os campos seguem o modelo do briefing (`posts`, `users`, `interests`, `boostedUntil`).
- **Google Places:** lista fixa de condomínios de exemplo.
- **AdMob:** o vídeo é uma contagem regressiva de demonstração.
- **Push:** simulado depois de ativar a opção em Perfil.
- **Link de compartilhamento:** `achados.app/p/...` é um endereço de exemplo.

Os anúncios e patrocinados exibidos são dados de exemplo.

## Estrutura

```
index.html          protótipo high-tech
pixar.html          protótipo estilo animação 3D
assets/og-image.png imagem Open Graph 1200x630
assets/logo.png     logo
docs/briefing.md    briefing completo (telas, modelo de dados, monetização)
```

## Próximos passos

App em React Native + Expo + Firebase (Auth, Firestore, Storage), AdMob Rewarded, Google Places e push, conforme o [briefing](docs/briefing.md).
