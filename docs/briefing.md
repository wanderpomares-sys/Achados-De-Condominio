PROJETO: Achados de Condomínios - Marketplace hiperlocal entre condomínios
ESTILO: iFood clean marketplace, fundo #F7F7F7, cards brancos #FFFFFF, primary red #EA1D2C
LOGO: /mnt/data/achados_logo_hightech_3d.png (40px no header)
FONTE: Inter, 16px corpo / 18px título / 20px preço (médias e grandes)

# ARQUITETURA:
- Stack: React Native + Expo + Firebase (Auth, Firestore, Storage)
- Max width 400px, grade 8px, todos botões visíveis em 2 linhas (wrap, sem scroll escondido)
- 0 overflow, cards com sombra 0 2px 12px rgba(0,0,0,0.08), raio 16px

# TELAS:

1. ONBOARDING (primeira vez):
- Logo + "Tudo que rola no seu condomínio e nos vizinhos"
- Input: Nome, Apto, Condomínio (seletor com raio 2km via Google Places)
- CTA: "Ver o que tem no meu bairro →" red 48px
- Salva localStorage + Firebase

2. FEED PRINCIPAL (home):
- Header: Logo 40px + "Achados de Condomínios" + loc pill "📍 Mogi • 2km"
- Busca: height 48px, rounded 12px, border 1px #E5E7EB, placeholder "Buscar sofá, vaga, feirinha..."
- Scope tabs: [Meu Condomínio • 8] [Vizinhos 2km • 23] - height 44px, active red #EA1D2C white, inactive #F7F7F7 #3E3E3E
- Filtros WRAP (não scroll): Tudo, 💰 Venda, 🎁 Doação, 🔑 Achados, 🎉 Novidades, 📅 Eventos, 🅿️ Vagas, 📚 Cursos - chip 36px height, rounded 20px, border 1px #E5E7EB, active red border #EA1D2C bg #FFF0F0 color #EA1D2C, gap 8px, 2 linhas
- Cards: width calc(100% - 32px), margin 16px auto, bg white, radius 16px, shadow 0 2px 12px, image 180px gradient + emoji 64px + badge top left 11px bold white (VENDA #2ECC71, DOAÇÃO #3498DB, NOVIDADE #8B5CF6, ACHADO #F59E0B), dist bottom right white pill border 1px, body padding 16px, title 16px bold #3E3E3E, price 18px bold, old price 13px gray crossed, meta 13px #717171 "Cond. Solar • 2º andar • há 2h • 👁️ 23 • 💬 5 querem", footer border-top 1px #F2F2F2, seller avatar 32px + name 13px bold + verified ✓, button Quero red #EA1D2C 36px radius 8px 14px bold white
- Gap entre cards 16px (separação nítida)
- Monetização convidativa:
  a) Sponsored a cada 4º card: bg #FFF8E1 light yellow, border #FFE082, label Patrocinado #3E3E3E 10px bold, não bloqueia
  b) Banner destaque: white card border 1px, "✨ Destaque seu anúncio por 24h nos 5 condomínios" + button Destacar (15s) black, dismiss X, não atrapalha (padding bottom 140px)
  c) Video Rewarded: ao clicar Quero / Ver WhatsApp / Destacar → modal video 15s progress bar red, texto "Ajude o app continuar grátis", depois libera WhatsApp com mensagem pronta copiada

3. DETALHE (modal slide up):
- Handle bar 40px width 4px gray
- Image 240px, badge, dist
- Body padding 20px: title 20px bold, price 22px bold, original crossed, desc 16px line 1.5 #3E3E3E, details box #F9FAFB radius 12px padding 12px with icons 📍 📦 👁️, verified by portaria green
- Sticky bottom CTA height 72px white border top, heart 48px border + Ver WhatsApp (15s) red 52px flex1
- Social proof: "18 viram hoje • 3 querem"

4. AGENDA (tab 2):
- Header "📅 Essa semana no seu condomínio" 18px bold
- Timeline vertical line 2px #E5E7EB, dots colored, cards: date badge 11px bold white colored bg, title 16px bold, meta 13px gray
- Itens: Feirinha Noturna Sex 18h-22h Área piscina Grátis 42 vão, Mercadinho Self Service inaugurou 2º andar 24h, Curso brigadeiro Sáb 14h R$30 8 vagas restantes (escassez), Aula funcional Ter/Qui 7h Grátis

5. NOVO ANÚNCIO (FAB):
- Form: Título, Preço ou Grátis (toggle), Foto (upload), Descrição, Tipo select (Venda/Doação/Achado/Novidade/Evento/Vaga/Curso), Alcance radio (só meu condomínio ou vizinhos 2km)
- CTA: Publicar red 52px
- Salva Firestore collection posts

6. BOTTOM NAV: Fixed 64px white border top 1px #F0F0F0, 4 items: 🏠 Feed active red, 🎉 Agenda, 💬 Chats, 👤 Perfil, icon 22px label 11px bold

# DATA MODEL Firestore:
posts: {id, title, price, originalPrice, type (venda/doacao/achado/novidade/evento/vaga/curso), badge, badgeColor, distance, building, timeAgo (timestamp), seller, apt, verified boolean, views number, wants number, description, imageUrl, gradient, isMyBuilding boolean, location geopoint}
users: {id, name, apt, building, buildingId, lat lng}
interests: {postId, userId, timestamp}

# FUNCIONALIDADES EXTRAS:
- Busca textual filter
- Filtro por tipo e scope
- Contador views increment on open
- Wants increment on Quero click
- Compartilhar no WhatsApp do condomínio: link com OG image 1200x630
- Push notification quando novo post no meu condomínio

# MONETIZAÇÃO (AdMob Rewarded):
- rewardedVideoAd: 1 video = libera contato OR destaca post por 24h (field boostedUntil timestamp)
- Sponsored card: collection sponsoredPosts
- Nunca bloqueia feed, sempre opt-in com texto "ajude o app continuar grátis"

# DESIGN TOKENS:
- Primary red #EA1D2C, dark #3E3E3E, gray #717171, light bg #F7F7F7, white #FFFFFF, border #E5E7EB, shadow 0 2px 12px rgba(0,0,0,0.08), radius card 16px, button 12px, chip 20px, font Inter 14/16/18/20

# ENTREGÁVEIS:
- HTML protótipo: /mnt/data/achados_ifood_final_agentic_artifact_12_fc2081c2d981.html
- Logo: /mnt/data/achados_logo_hightech_3d.png
- OG image 1200x630 a gerar com logo + texto "Achados de Condomínios - Venda e doação entre vizinhos"