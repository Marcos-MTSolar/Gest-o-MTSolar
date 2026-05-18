# Resumo Mestre do Projeto: Gestão MTSolar

Este documento consolida a análise detalhada do sistema **Gestão MTSolar**, cobrindo sua arquitetura, tecnologias, regras de negócio e integrações, servindo como a principal fonte de verdade técnica do projeto.

---

## 1. Visão Geral
O **Gestão MTSolar** é um sistema ERP/CRM completo desenvolvido para otimizar o fluxo de trabalho de empresas de energia solar fotovoltaica. 
Seu propósito é centralizar todas as etapas do ciclo de vida de um cliente e de um projeto solar, resolvendo problemas de desorganização, perda de leads, falta de rastreabilidade na engenharia e comunicação ineficiente.

**Público-alvo:** Equipes comerciais (vendedores), técnicas (engenheiros/instaladores) e administração (CEOs) de franquias e distribuidoras de energia solar. A arquitetura foi adaptada para suportar um modelo SaaS Multi-Tenant (múltiplas empresas isoladas logicamente).

---

## 2. Tecnologias Utilizadas
O projeto utiliza um stack moderno, orientado ao ecossistema JavaScript/TypeScript:

**Frontend (Web & Mobile):**
- **React 19** com **Vite 6**
- **TypeScript** (tipagem estática)
- **TailwindCSS 4** (estilização) + **Lucide React** (ícones)
- **React Router DOM 7** (roteamento SPA)
- **Capacitor 8** (`@capacitor/core`, `android`, `ios`) para envelopar a aplicação web em aplicativos nativos.

**Backend:**
- **Node.js** + **Express 4.21** (executado como Serverless Function na Vercel)
- **Multer** (manipulação de uploads de arquivos em memória)
- **Bcryptjs** e **JSONWebToken (JWT)** (autenticação e segurança)
- **Axios** (requisições HTTP internas)

**Banco de Dados & Storage:**
- **Supabase** (PostgreSQL gerido, utilizando o `@supabase/supabase-js`)
- **Supabase Storage** (armazenamento de arquivos e mídias)

**APIs e Integrações de Terceiros:**
- **Evolution API v2** (Motor de integração com WhatsApp via Webhooks)
- **Firebase Admin SDK** (Envio de Push Notifications para o app mobile Capacitor)
- **Google GenAI** (Integrações com inteligência artificial, possivelmente para análise ou chatbots)
- **jsPDF** (Geração de propostas comerciais em PDF no cliente/servidor)

---

## 3. Estrutura de Arquivos
A estrutura reflete um monorepo que contém tanto o frontend (Vite) quanto o backend (Express) e o wrapper mobile (Capacitor):

```text
/Gest-o-MTSolar
├── api/
│   └── index.ts               # Servidor backend monolítico Express (Rotas da API e Webhooks)
├── android/                   # Projeto Android gerado pelo Capacitor
├── src/
│   ├── components/            # Componentes reutilizáveis (Layout.tsx, barra lateral, modais de estoque)
│   ├── context/               # Contextos do React (AuthContext para gerenciamento de sessão)
│   ├── hooks/                 # Custom hooks do React
│   ├── lib/                   # Configurações de clientes (api.ts, supabase.ts, whatsapp.ts)
│   ├── pages/                 # Telas da aplicação (Dashboard, WhatsApp, Commercial, Technical, etc.)
│   ├── types/                 # Definições de interfaces e tipos TypeScript
│   ├── App.tsx & main.tsx     # Pontos de entrada e rotas do Frontend
│   └── index.css              # Estilos globais (Tailwind)
├── supabase_schema.sql        # Arquivo de definição do esquema de banco de dados
├── vercel.json                # Configuração de rotas de deploy Serverless da Vercel
├── capacitor.config.ts        # Configurações do wrapper mobile
└── package.json               # Dependências e scripts de build
```

---

## 4. Módulos e Funcionalidades

O sistema é dividido em "Módulos de Negócio" acessíveis via navegação lateral:

1. **Dashboard (`Dashboard.tsx`):** Exibe métricas de desempenho, funil de vendas, projetos em andamento e faturamento.
2. **CRM/Comercial (`Commercial.tsx`):** Funil de vendas em formato Kanban. Permite mover cards de leads, qualificar e fechar vendas.
3. **Gerador de Propostas (`ProposalGenerator.tsx`):** Um módulo avançado para gerar orçamentos em PDF com dados do kit solar, gráficos e tabelas de ROI.
4. **Calculadora de Energia (`EnergyCalculator.tsx`):** Ferramenta que converte consumos de equipamentos (Watts, BTU, CV) para estimativa de kWh mensal.
5. **WhatsApp (`WhatsApp.tsx`):** Interface de atendimento omnichannel integrada ao CRM. Permite enviar textos, áudios e mídias, gerenciar filas, transferir tickets e filtrar por etiquetas.
6. **Engenharia e Obras (`Technical.tsx`, `Obra.tsx`):** Gestão de documentação de projeto, vistoria técnica e checklists com upload de fotos georreferenciadas.
7. **Homologação (`Homologation.tsx`, `NeoenergiaProtocols.tsx`):** Acompanhamento burocrático nas concessionárias de energia.
8. **Estoque e Compras (`Stock.tsx`, `KitPurchase.tsx`):** Controle de inventário de painéis, inversores e cabos.
9. **Agenda (`Agenda.tsx`):** Calendário integrado para visitas técnicas e comerciais.

---

## 5. Banco de Dados
A infraestrutura roda no **Supabase (PostgreSQL)**, modelada para suportar o conceito de *Multi-Tenant* (isolamento por `company_id`).

**Principais Entidades:**
- `users`: Armazena credenciais (hash bcrypt), roles (CEO, ADMIN, COMMERCIAL, TECHNICAL) e o `company_id`.
- `clients` & `projects`: Relacionamento 1:N. Um cliente pode ter vários projetos de usinas solares.
- `commercial_data`, `technical_data`: Extensões da tabela de projetos (1:1), particionando os dados do projeto conforme a etapa do funil.
- `documents` & `media`: Rastreabilidade de arquivos upados (fotos do telhado, contratos, PDFs).
- `whatsapp_conversations` & `whatsapp_messages`: Tabela espelho das interações do CRM com o cliente.
- `company_instances`: Relaciona a empresa do sistema a uma instância rodando no motor do WhatsApp (Evolution API).

---

## 6. Integrações Externas

### A. Evolution API (WhatsApp)
- **Fluxo de Envio:** O frontend chama `api.post('/api/whatsapp/send')`. O Express envia para o endpoint da Evolution.
- **Fluxo de Recebimento (Webhook):** A Evolution faz um `POST` no webhook `/api/webhooks/whatsapp`.
- **Tratamento de Mídia:** Como a CDN do WhatsApp expira rápido e o webhook da Evolution (por configuração) não envia base64 nativamente, o backend da MTSolar intercepta o evento, faz um fetch reverso (`/chat/getBase64FromMediaMessage`), pega o binário da imagem/áudio/doc e re-upa no **Supabase Storage** (Bucket: `whatsapp-media`), substituindo por um link público permanente.

### B. Firebase Admin (Push Notifications)
O servidor Node utiliza credenciais de serviço para disparar notificações em tempo real para os apps iOS/Android (Capacitor) da equipe comercial e técnica quando eventos importantes acontecem (novo lead, mensagem de cliente, mudança de status de obra).

---

## 7. Regras de Negócio Críticas
- **Segregação de Visibilidade (WhatsApp):** Um vendedor (role: COMMERCIAL) só consegue visualizar e responder conversas das quais é o `assigned_to` ou que estejam aguardando atendimento (`status = waiting`). Perfis ADMIN ou CEO possuem visão "God Mode".
- **Assunção e Transferência de Ticket:** Ao assumir uma conversa, as tabelas atualizam o responsável. A transferência limpa o dono atual e pode transitar a conversa até entre instâncias diferentes da Evolution API (ex: Vendedor repassando pro Financeiro).
- **Processamento Dinâmico de Instâncias:** O webhook utiliza os dados que vêm da Evolution para resolver o `company_id` de forma dinâmica (procurando na tabela `company_instances`), garantindo que a mensagem da franquia A não caia no banco de dados da franquia B.

---

## 8. Autenticação e Segurança
- **Sistema de Sessão:** JWT (JSON Web Tokens). O token é gerado no login e salvo tanto em `HttpOnly Cookie` quanto via `Authorization Header` (importante para contornar limitações do Capacitor Mobile).
- **Middleware Express:** A função `authenticateToken` barra o acesso a rotas `/api/*` e garante que todo request injete o `req.user.company_id` nas consultas do banco de dados (isolamento multi-tenant).
- **Supabase RLS:** Utiliza-se a *Service Role Key* (Server-side) em algumas lógicas de webhook e upload de mídia para contornar restrições RLS em processamentos assíncronos que não possuem o contexto do JWT do usuário, injetando segurança direto via backend.

---

## 9. Build, Deploy e Configuração
- **Web (Vercel):** O Frontend compila com `vite build`. O Backend (`api/index.ts`) não sobe como um servidor Node tradicional (`app.listen`); o `vercel.json` o expõe via **Serverless Functions** (rewrites de `/api/(.*)` para `api/index.ts`). Isso requer configuração rigorosa para limites de payload e timeouts.
- **Mobile (Capacitor):** É compilado apontando as requisições API e o bundle estático para dentro das WebViews do iOS/Android através do comando `npx cap sync`.
- **Variáveis de Ambiente `.env`:**
  - Banco: `VITE_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
  - JWT: `JWT_SECRET`
  - Firebase: `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`
  - WhatsApp: `VITE_EVOLUTION_URL`, `VITE_EVOLUTION_KEY`, `VITE_EVOLUTION_INSTANCE_ATENDIMENTO`, etc.

---

## 10. Problemas, Limitações e Pendências (Debt Técnico)
1. **Monolito de Rotas:** O arquivo `api/index.ts` possui mais de 2.600 linhas, concentrando TODAS as lógicas de todas as integrações. Isso dificulta testes unitários, versionamento por múltiplos desenvolvedores e aumenta o *Cold Start* das Serverless Functions.
2. **Gerenciamento de Tipagem Local:** Uso extenso de `any` ou `// @ts-ignore` observável em rotas Express e objetos do React, o que reduz a segurança natural do TypeScript.
3. **Resíduos de Código:** Presença de arquivos `.bak` (ex: `Technical.tsx.bak`), sugerindo falhas de versionamento de backup via Git.
4. **Sobrecarga de Mídia via Webhook:** Arquivos e vídeos grandes passando pelo Express correm o risco de estourar o limite de 50mb do Express ou dar Time-Out (15s da Vercel function) no momento em que ele trafega a base64 da Evolution e converte para Buffer antes de enviar pro Supabase.
5. **Realtime "Racy":** Dependência no frontend do WebSocket (`postgres_changes`) do Supabase misturado com `setInterval` de fallback para lidar com mídias do WhatsApp.

---

## 11. Melhorias Sugeridas

### Técnicas
- **Refatoração do Backend:** Migrar a arquitetura monolítica do Express para rotas controladas (Ex: `routes/whatsapp.ts`, `routes/auth.ts`, `controllers/`) para desacoplar a regra de negócio do roteamento.
- **Transações ACID:** Muitas operações do frontend (como a transferência de instâncias do WhatsApp) disparam várias chamadas ao DB sucessivas (`supabase.from().update...`). Mover essas ações para uma **RPC (Stored Procedure)** no Postgres garante que, se uma etapa falhar, há *rollback* completo, evitando dados inconsistentes.
- **Filas (Queues) para Webhooks:** Substituir o processamento síncrono dos Webhooks por uma fila (Redis / BullMQ ou Serverless Background Jobs). O webhook apenas receberia a requisição, salvaria na fila e retornaria `200 OK` imediatamente. Outro worker cuidaria do download do base64 e upload pro Supabase, evitando timeouts e repetições errôneas da Evolution API.

### Produto
- **Limpeza Periódica de Arquivos:** As mídias de WhatsApp persistidas no Supabase consumirão rapidamente o limite gratuito ou contratado da nuvem. Criar um CronJob para apagar imagens "irrelevantes" ou "velhas" (após 90 dias) da tabela `whatsapp_messages` e do bucket.
- **Melhorias de Visualização:** Implementar miniaturas (Thumbnails) para vídeos e visualização de PDFs nativa diretamente no feed do WhatsApp (`WhatsApp.tsx`), evitando a obrigatoriedade de download.
