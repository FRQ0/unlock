# Unlock Gastro

Plataforma SaaS de cardápio digital da Unlock Systems. Um único sistema
**multi-tenant** atende vários estabelecimentos (hamburguerias, pizzarias,
restaurantes, bares, cafeterias, açaiterias...). Cada um tem o seu cardápio,
identidade visual, produtos, preços e pedidos, sem enxergar os dados dos outros.

## O que tem

| Área | Endereço | Para quem |
| --- | --- | --- |
| Página de vendas e planos | `/` | Público |
| Cadastro e login | `/cadastro`, `/entrar` | Donos |
| Painel do estabelecimento | `/painel` | Dono (tudo) e funcionário (só pedidos) |
| Cardápio do cliente | `/{endereco}` | Clientes do estabelecimento |
| Feed de vídeos | `/{endereco}/feed` | Clientes (plano Completo) |
| Acompanhar pedido | `/{endereco}/pedido/{codigo}` | Cliente que fez o pedido |
| Painel Master | `/master` | Equipe Unlock |

**Painel do estabelecimento:** início com números do dia e lista de "primeiros
passos", pedidos (novos → em preparo → prontos → finalizados, com aviso
sonoro e histórico), produtos (foto, vídeo, preço, categoria, disponível,
destaque, grupos de variações e adicionais com modelos prontos), categorias,
aparência (cores, logo, capa, estilo dos cartões, claro/escuro) com **prévia
ao vivo**, minha plaquinha (link fixo, QR Code PNG/SVG, instruções de NFC e
versão para imprimir), assinatura, e dados e horários (contato, endereço,
horário, mesa/retirada/entrega, taxa de entrega e ferramentas de LGPD).

**Planos:** dois planos vêm cadastrados:

- **Básico:** o dono monta tudo pelo painel.
- **Completo:** a equipe Unlock monta e cuida do cardápio, com feed de vídeos.

Os preços começam **vazios** (a página mostra "Sob consulta"). Defina-os em
`/master/planos`. Lá também se liga e desliga o feed de vídeos e o limite de
produtos de cada plano.

**Painel Master:** visão geral (clientes ativos, receita mensal das
assinaturas ativas, pedidos), lista e busca de estabelecimentos, criar conta
para um cliente, ativar/suspender/cancelar, trocar plano, **registrar
pagamento recebido** (Pix/transferência, fica registrado quem lançou),
**"Gerenciar cardápio"** (a equipe entra no painel do cliente para o plano
Completo, com faixa de aviso e registro em log), planos e usuários.

## Pagamentos: situação atual

Ainda **não há gateway de pagamento integrado** (`PAYMENT_PROVIDER="none"`).
Nada é simulado:

- Ao se cadastrar, a assinatura fica **"Aguardando pagamento"** e o cardápio
  só vai ao ar depois da ativação.
- A Unlock combina o pagamento e o registra no Master. Isso ativa a conta.
- Os pedidos dos clientes são pagos **no local**.

A integração com um gateway recorrente (Asaas, Mercado Pago, Stripe,
Pagar.me...) já tem lugar pronto: implemente a interface `PaymentGateway` em
`src/lib/payments/` e o webhook em `/api/payments/webhook` passa a ativar,
marcar atraso ou cancelar assinaturas sozinho.

## Segurança e multi-tenant

- Toda tabela de dados de um estabelecimento tem `tenantId`. O painel só pega
  o `tenantId` da sessão (`src/lib/session.ts`), nunca do formulário.
- Toda escrita usa `where: { id, tenantId }`. Um id de outro estabelecimento
  simplesmente não é encontrado.
- Preços dos pedidos são **recalculados no servidor** (`src/lib/pricing.ts`).
- Uploads conferem o tipo real do arquivo, o tamanho e a pasta do
  estabelecimento. Vídeo só no plano que tem feed.
- Senhas com bcrypt, sessão em cookie `httpOnly` assinado, limite de
  tentativas de login, cabeçalhos de segurança e registro de auditoria.
- LGPD: consentimento no envio do pedido, política de privacidade, exportação
  dos dados e anonimização de pedidos antigos pelo painel.

## Rodar localmente

Requisitos: Node 20+ e PostgreSQL.

```bash
cd gastro
cp .env.example .env          # preencha DATABASE_URL, AUTH_SECRET, MASTER_EMAIL e MASTER_PASSWORD
npm install
npx prisma migrate deploy     # cria as tabelas
npm run db:seed               # cria os planos e o primeiro usuário Master
npm run dev                   # http://localhost:3000
```

## Testes

```bash
npm test                      # testes unitários (preço, tema, horário, uploads...)
npm run build && npm start    # em outro terminal, com o app no ar:
npm run test:e2e              # segurança entre estabelecimentos e responsividade no celular
```

## Publicar na Vercel

1. Crie um banco PostgreSQL (Neon, Supabase ou Railway) e copie a URL.
2. Na Vercel: **Add New → Project**, escolha este repositório e em
   **Root Directory** coloque `gastro`. É um projeto separado do site da Unlock.
3. Em **Storage**, crie um **Blob** e conecte ao projeto (isso cria
   `BLOB_READ_WRITE_TOKEN`).
4. Em **Environment Variables**, defina:
   - `DATABASE_URL`: URL do banco
   - `AUTH_SECRET`: gere com `openssl rand -base64 48`
   - `NEXT_PUBLIC_APP_URL`: ex.: `https://unlockgastro.com.br`
   - `STORAGE_DRIVER`: `vercel-blob`
   - `PAYMENT_PROVIDER`: `none`
   - `MASTER_EMAIL` e `MASTER_PASSWORD` (10+ caracteres): o seu acesso ao Painel Master
   - opcionais: `NEXT_PUBLIC_UNLOCK_WHATSAPP` (botão "Falar com a Unlock" na
     assinatura) e `NEXT_PUBLIC_CONTACT_EMAIL` (contato nas páginas legais)
5. Faça o deploy. O build cria as tabelas, os planos e o usuário Master
   sozinho (`vercel-build`). Rodar de novo não duplica nada.
6. Aponte o domínio `unlockgastro.com.br` para o projeto.

> O link de cada cardápio (`NEXT_PUBLIC_APP_URL/{endereco}`) vai gravado nas
> plaquinhas NFC e nos QR Codes. Defina o domínio definitivo **antes** de
> gravar as plaquinhas.

## Antes de vender

- Defina os preços dos planos no Master.
- Peça para um advogado revisar `/privacidade` e `/termos`.
- O limite de tentativas de login fica na memória de cada servidor. Com muito
  tráfego, troque por Redis/Upstash em `src/lib/rate-limit.ts`.
