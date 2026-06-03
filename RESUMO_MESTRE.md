# RESUMO MESTRE — GESTÃO MTSOLAR

Este documento consolida a análise detalhada e atualizada da arquitetura, stack de tecnologias, estrutura do banco de dados, regras de negócio e integrações do sistema **Gestão MTSolar**, servindo como a principal fonte de verdade técnica do projeto.

---

## 1. VISÃO GERAL

* **Propósito do Sistema:** O **Gestão MTSolar** é um sistema ERP/CRM completo desenvolvido para otimizar e gerenciar o ciclo de vida de projetos de energia solar fotovoltaica. Ele unifica a captação de leads, o funil comercial (CRM), dimensionamento técnico, geração automatizada de propostas em PDF, homologação junto a concessionárias de energia, controle de estoque de kits/componentes e o atendimento omnichannel integrado via WhatsApp.
* **Público-alvo:** Equipes comerciais (vendedores/parceiros), equipe técnica/engenharia (instaladores, projetistas) e a administração (gestores e CEOs) de franquias ou distribuidoras de energia solar.
* **Estágio Atual do Projeto:** O projeto encontra-se em estágio avançado de produção. A aplicação web/desktop está totalmente operacional, integrada com a Evolution API v2 para atendimento e com o Supabase para banco de dados e arquivos. Possui também um wrapper mobile com Capacitor configurado para builds nativos Android e iOS. A arquitetura foi adaptada para um modelo SaaS **Multi-Tenant** funcional, isolando dados de diferentes empresas/franquias.

---

## 2. STACK TECNOLÓGICA

O projeto utiliza um conjunto de tecnologias modernas baseadas em TypeScript em todas as camadas:

### Frontend
* **Core:** React 19 + Vite 6
* **Estilização:** TailwindCSS v4.1.14 para estilização baseada em utilitários CSS rápidos e modernos, em conjunto com o `lucide-react` para ícones.
* **Roteamento:** React Router DOM v7.13.0 para navegação SPA (Single Page Application).
* **Animações:** Motion (antigo Framer Motion) para micro-transições fluidas na interface.
* **Biblioteca Gráfica/PDFs:** `jspdf` para montagem dinâmica de propostas e relatórios no lado do cliente.

### Backend
* **Servidor:** Node.js com Express v4.21.2 executado em ambiente Serverless na **Vercel** (conforme mapeamento do arquivo `vercel.json`).
* **Compilação/Execução local:** `tsx` (TypeScript Execute) rodando em modo nativo ES Modules (`"type": "module"`).
* **Segurança e Utilitários:** `bcryptjs` para hashing de senhas, `jsonwebtoken` para emissão e validação de tokens JWT, e `cookie-parser` / `cors` para gestão de requisições.
* **Uploads de Arquivos:** `multer` configurado para receber uploads multipart/form-data em memória no Express antes de repassá-los para o Supabase.

### Banco de Dados e Storage
* **Banco:** Supabase (PostgreSQL gerido na nuvem), acessado via SDK `@supabase/supabase-js` v2.97.0.
* **Storage (Buckets):** Supabase Storage para persistência permanente de documentos e arquivos de vistoria e propostas.
* **Storage Auxiliar:** Cloudflare R2 integrado através do `@aws-sdk/client-s3` para armazenamento secundário.

### Integrações Externas
* **WhatsApp:** Evolution API v2 instalada em servidor próprio (geralmente hospedado na Railway), funcionando bidirecionalmente via requisições HTTP REST (envio) e Webhooks configurados (recebimento).
* **Firebase:** Firebase Admin SDK v13.9.0 para disparar Push Notifications nativas a dispositivos móveis.

### Mobile
* **Wrapper Nativo:** Capacitor v8.0.2 (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/ios`) envelopando a aplicação web SPA e expondo APIs de hardware (como `@capacitor/camera` para vistorias em campo, `@capacitor/geolocation` para geolocalização e `@capacitor/push-notifications`).

---

## 3. ESTRUTURA DE ARQUIVOS

O projeto segue a estrutura de monorepo integrando o frontend, backend (pasta `/api`) e as configurações do Capacitor.

```text
/Gest-o-MTSolar
├── api/
│   ├── index.ts               # Servidor backend central Express (Rotas da API, Cronjobs e Webhooks)
│   └── r2.ts                  # Utilitários do cliente Cloudflare R2 (Upload, Delete, List)
├── android/                   # Código nativo Android gerado pelo Capacitor
├── ios/                       # Código nativo iOS gerado pelo Capacitor (se sincronizado)
├── src/
│   ├── components/            # Componentes reutilizáveis globais da UI
│   │   ├── Layout.tsx         # Estrutura principal da página (Navbar, Sidebar responsiva e Container)
│   │   └── stock/             # Componentes específicos de estoque (Modais de retirada, alertas, etc.)
│   ├── context/               # Contextos de estado global
│   │   ├── AuthContext.tsx    # Controle de autenticação (Login, Logout, Sessão do Usuário)
│   │   └── SocketContext.tsx  # Contexto de socket/realtime (se aplicável ao painel)
│   ├── db/
│   │   └── schema.sql         # Esquema de banco de dados mockado/local (SQLite de desenvolvimento)
│   ├── hooks/                 # Hooks customizados para abstração de regras e buscas de dados
│   │   ├── useHomologacaoDocs.ts
│   │   └── useStock.ts        # Gerenciamento de itens de estoque e escutas de realtime
│   ├── lib/                   # Inicialização de SDKs e APIs de terceiros
│   │   ├── api.ts             # Cliente Axios configurado para requisições ao backend da Vercel
│   │   ├── documentCapture.ts # Utilitários de captura e redimensionamento de imagens de câmera
│   │   ├── notifications.ts   # Configuração nativa de push notifications e agendamento local
│   │   ├── supabase.ts        # Inicialização do cliente Supabase (Public Anon Client)
│   │   ├── utils.ts           # Funções utilitárias (Tailwind Merge, Clsx)
│   │   └── whatsapp.ts        # Cliente utilitário de WhatsApp do Frontend (legado/fallback)
│   ├── pages/                 # Telas da aplicação
│   │   ├── Dashboard.tsx      # Métricas financeiras, funil simplificado e estatísticas de vendas
│   │   ├── Commercial.tsx     # CRM com funil Kanban, gestão de leads e projetos comerciais
│   │   ├── ProposalGenerator.tsx # Configuração e geração dinâmica da proposta em PDF
│   │   ├── EnergyCalculator.tsx  # Ferramenta de estimativa de kWh baseado no consumo dos equipamentos
│   │   ├── Technical.tsx      # Ficha técnica do projeto e envio de fotos georreferenciadas
│   │   ├── Obra.tsx           # Checklist de instalação e acompanhamento de obras em tempo real
│   │   ├── ObraSchedule.tsx   # Calendário e agendamentos de equipes de montagem/obra
│   │   ├── Homologation.tsx   # Acompanhamento do status de homologação de projetos fotovoltaicos
│   │   ├── NeoenergiaProtocols.tsx # Controle interno de protocolos na concessionária (Ex: Neoenergia)
│   │   ├── Stock.tsx          # Controle visual de estoque, alertas de nível crítico e histórico
│   │   ├── KitPurchase.tsx    # Registro de compra de kits fotovoltaicos vinculados aos projetos
│   │   ├── Agenda.tsx         # Calendário de compromissos para vendedores e engenheiros
│   │   ├── Ponto.tsx          # Tela de ponto eletrônico com captura de selfie, geolocalização e relatórios
│   │   ├── Settings.tsx       # Configuração de dados e preferências da empresa
│   │   ├── Users.tsx          # Painel de gestão de membros da equipe (vendedores, engenheiros, admin)
│   │   ├── WhatsApp.tsx       # Chat central de atendimento ao cliente integrado ao WhatsApp
│   │   ├── Login.tsx          # Tela de autenticação por e-mail e senha
│   │   └── Messages.tsx       # Interface interna de recados/mensagens da equipe
│   ├── types/                 # Tipagens estáticas do TypeScript (Ex: stock.ts)
│   ├── App.tsx                # Definição de rotas do React Router DOM e carregador do AuthProvider
│   ├── main.tsx               # Ponto de entrada do React
│   └── index.css              # Importação e configuração do Tailwind CSS
├── supabase_schema.sql        # Esquema oficial com tabelas do PostgreSQL executado no Supabase
├── vercel.json                # Configurações de rotas de deploy e agendamentos de Cron no backend Vercel
├── capacitor.config.ts        # Configurações de build do wrapper Capacitor Mobile
├── package.json               # Gerenciamento de scripts NPM e dependências de pacotes
└── .env                       # Variáveis de ambiente locais (sensíveis)
```

---

## 4. MÓDULOS E FUNCIONALIDADES

O sistema é dividido em fluxos de negócios integrados que cobrem todas as fases de uma venda solar:

1. **Autenticação (`Login.tsx`):**
   * Tela inicial para inserção de credenciais de e-mail e senha. Valida o usuário e estabelece o JWT seguro.
2. **Dashboard Geral (`Dashboard.tsx`):**
   * Gráficos financeiros, resumo do funil de vendas ativo, volume de geração projetado e atalhos rápidos para novas ações.
3. **CRM / Comercial (`Commercial.tsx`):**
   * Kanban interativo contendo colunas customizáveis (ex: Lead, Vistoria Agendada, Proposta Elaborada, Fechamento). Os vendedores criam cards de clientes e arrastam entre fases. Permite o upload do contrato assinado.
4. **Calculadora de Consumo (`EnergyCalculator.tsx`):**
   * Permite cadastrar múltiplos aparelhos elétricos (lâmpadas, ar-condicionados, motores), suas potências, horas de uso diário e dias de uso mensal para calcular o consumo total em kWh de forma automática.
5. **Gerador de Propostas (`ProposalGenerator.tsx`):**
   * Formulário passo-a-passo no qual o vendedor informa os dados de consumo do cliente, seleciona o kit (painéis, inversores, estruturas), configura financiamentos e gera uma proposta comercial personalizada no formato de arquivo PDF (salva no storage do Supabase).
6. **WhatsApp / Chat Center (`WhatsApp.tsx`):**
   * Painel de atendimento em tempo real. Exibe conversas em andamento agrupadas por status (Aguardando, Em Atendimento, Resolvidas). Permite envio de textos, áudios e mídias, bem como transferência de tickets entre vendedores e departamentos.
   * **Bloqueio de Conversa em Atendimento:** Quando um agente está atendendo uma conversa (`status = 'in_progress'`), ela fica bloqueada para outros agentes. O frontend exibe uma barra amarela com cadeado indicando o nome do responsável em vez do campo de mensagem. CEOs têm acesso irrestrito. A validação ocorre tanto no backend (`GET /api/conversations/:id/messages`, `POST /api/whatsapp/send`, `send-media` e `send-audio`) quanto no frontend.
   * **Mensagens Automáticas de Horário:** Três cronjobs enviam mensagens automáticas de início de expediente (08:30 BRT), pausa para almoço (12:00 BRT) e fim de expediente (17:00 BRT) para todas as conversas ativas (`in_progress`).
7. **Ficha Técnica e Vistoria (`Technical.tsx`):**
   * Acesso aos dados físicos do local do cliente (tipo de telhado, orientação, padrão de entrada, disjuntores). Permite o envio de fotos comprobatórias obrigatórias do local da instalação.
8. **Gestão de Obras (`Obra.tsx` e `ObraSchedule.tsx`):**
   * Cronograma de montagem do sistema. Acompanhamento visual de status (Não Iniciado, Em Andamento, Concluído) e atribuição de técnicos responsáveis.
9. **Homologação e Concessionárias (`Homologation.tsx` e `NeoenergiaProtocols.tsx`):**
   * Tela burocrática para anexar solicitações de conexão, pareceres de acesso e protocolos de vistoria junto a distribuidoras (ex: Neoenergia).
10. **Estoque (`Stock.tsx`):**
    * Gestão física de equipamentos como módulos solares, inversores e estruturas. Emite alertas de estoque baixo baseado em limites (threshold) cadastrados.
11. **Ponto Eletrônico (Ponto/Jornada):**
    * Sistema de controle de ponto eletrônico para colaboradores. Permite bater ponto (entrada, início de almoço, fim de almoço e saída) enviando a selfie e a geolocalização capturada pelo GPS do dispositivo.
    * **Gestão de Horários:** Configuração de turnos de trabalho (`work_schedules`) por função de usuário pela gerência (`CEO`/`ADMIN`).
    * **Fluxo de Ajustes:** Os funcionários podem solicitar correções de batidas de ponto justificadas, que passam por um fluxo de aprovação pendente avaliado pelos administradores.

---

## 5. BANCO DE DADOS

O banco de dados é hospedado no **Supabase (PostgreSQL)** e implementa uma estrutura rígida de multi-tenancy.

### Principais Tabelas e Colunas

#### `companies` (Tenants)
* `id` (UUID - Primary Key)
* `name` (TEXT)
* `whatsapp_instance` (TEXT - Nome legado da instância principal de WhatsApp)
* `created_at` (TIMESTAMPTZ)

#### `company_instances` (Vínculo de Instâncias WhatsApp)
* `id` (UUID - Primary Key)
* `company_id` (UUID - References `companies.id`)
* `instance_name` (TEXT - Nome normalizado da instância da Evolution API)
* `created_at` (TIMESTAMPTZ)

#### `users` (Usuários / Colaboradores)
* `id` (SERIAL - Primary Key)
* `company_id` (UUID - References `companies.id`)
* `name` (TEXT)
* `email` (TEXT - UNIQUE)
* `password_hash` (TEXT)
* `role` (TEXT - Restrito via CHECK: `'CEO', 'ADMIN', 'COMMERCIAL', 'TECHNICAL'`)
* `active` (BOOLEAN - Padrão TRUE)
* `avatar_url` (TEXT)
* `push_token` (TEXT - Token nativo Firebase/FCM)
* `created_at` (TIMESTAMPTZ)

#### `clients` (Clientes)
* `id` (SERIAL - Primary Key)
* `company_id` (UUID - References `companies.id`)
* `name` (TEXT)
* `cpf_cnpj` (TEXT)
* `phone` (TEXT)
* `email` (TEXT)
* `address` (TEXT)
* `city` (TEXT)
* `state` (TEXT)
* `status` (TEXT)
* `created_by` (INTEGER - References `users.id`)
* `created_at` (TIMESTAMPTZ)

#### `projects` (Projetos / Usinas)
* `id` (SERIAL - Primary Key)
* `company_id` (UUID - References `companies.id`)
* `client_id` (INTEGER - References `clients.id`)
* `title` (TEXT)
* `description` (TEXT)
* `status` (TEXT - `'pending', 'in_progress', 'completed', 'cancelled'`)
* `current_stage` (TEXT - `'registration', 'proposal', 'documentation', 'payment', 'kit_purchase', 'inspection', 'homologation', 'conclusion'`)
* `installation_status` (TEXT)
* `homologation_status` (TEXT)
* `inverter_model` (TEXT)
* `inverter_power` (TEXT)
* `module_model` (TEXT)
* `module_power` (TEXT)
* `created_at` (TIMESTAMPTZ)
* `updated_at` (TIMESTAMPTZ)

#### `commercial_data` (Dados Comerciais do Projeto - 1:1 com `projects`)
* `id` (SERIAL - Primary Key)
* `project_id` (INTEGER - UNIQUE - References `projects.id`)
* `company_id` (UUID - References `companies.id`)
* `proposal_value` (REAL)
* `payment_method` (TEXT)
* `contract_url` (TEXT)
* `notes` (TEXT)
* `status` (TEXT)

#### `technical_data` (Dados de Engenharia/Vistoria do Projeto - 1:1 com `projects`)
* `id` (SERIAL - Primary Key)
* `project_id` (INTEGER - UNIQUE - References `projects.id`)
* `company_id` (UUID - References `companies.id`)
* `roof_structure` (TEXT)
* `structure_type` (TEXT)
* `module_quantity` (INTEGER)
* `observations` (TEXT)
* `photo_modules` (TEXT)
* `photo_inverter` (TEXT)
* `photo_roof_sealing` (TEXT)

#### `proposal_history` (Histórico de Propostas Geradas)
* `id` (SERIAL - Primary Key)
* `company_id` (UUID - References `companies.id`)
* `client_name` (TEXT)
* `proposal_number` (TEXT)
* `url_arquivo` (TEXT - Link do arquivo PDF)
* `raw_data` (JSON - Objeto contendo todas as variáveis utilizadas na geração)
* `data_geracao` (TIMESTAMPTZ)
* `data_expiracao` (TIMESTAMPTZ - Padrão de 7 dias úteis após geração)
* `created_by` (INTEGER)

#### `stock_items` (Itens de Estoque)
* `id` (SERIAL - Primary Key)
* `company_id` (UUID - References `companies.id`)
* `category` (TEXT)
* `specification` (TEXT)
* `unit` (TEXT)
* `current_quantity` (NUMERIC)
* `ideal_quantity` (NUMERIC)
* `low_stock_threshold` (NUMERIC)
* `created_at` (TIMESTAMPTZ)

#### `stock_withdrawals` (Saídas de Estoque)
* `id` (SERIAL - Primary Key)
* `company_id` (UUID - References `companies.id`)
* `stock_item_id` (INTEGER - References `stock_items.id`)
* `quantity` (NUMERIC)
* `withdrawal_date` (TIMESTAMPTZ)
* `installation_name` (TEXT)
* `technician_name` (TEXT)
* `notes` (TEXT)
* `created_by` (UUID / INTEGER)

#### `whatsapp_conversations` (Conversas de WhatsApp)
* `id` (UUID - Primary Key)
* `company_id` (UUID - References `companies.id`)
* `phone` (TEXT)
* `name` (TEXT)
* `unread_count` (INTEGER - Padrão 0)
* `last_message` (TEXT)
* `last_message_at` (TIMESTAMPTZ)
* `status` (TEXT - `'waiting', 'open', 'closed'`)
* `assigned_to` (INTEGER - References `users.id`)
* `instance` (TEXT - Nome normalizado da instância responsável)
* `tags` (TEXT[] - Etiquetas aplicadas à conversa)

#### `whatsapp_messages` (Mensagens de WhatsApp)
* `id` (UUID - Primary Key)
* `company_id` (UUID - References `companies.id`)
* `conversation_id` (UUID - References `whatsapp_conversations.id`)
* `phone` (TEXT)
* `message` (TEXT)
* `from_me` (BOOLEAN)
* `message_id` (TEXT - ID interno gerado pela Evolution API)
* `timestamp` (TIMESTAMPTZ)
* `status` (TEXT - `'sent', 'delivered', 'read'`)
* `media_type` (TEXT - `'image', 'audio', 'document', 'video', 'sticker'`)
* `media_url` (TEXT - Link público e permanente no Supabase Storage)
* `file_name` (TEXT)
* `file_size` (NUMERIC)
* `is_internal` (BOOLEAN - Se a mensagem foi escrita como anotação interna e não enviada ao cliente)

#### `work_schedules` (Horários de Trabalho por Função/Empresa)
* `id` (SERIAL - Primary Key)
* `company_id` (UUID - References `companies.id` ON DELETE CASCADE)
* `role` (TEXT - Restrito via CHECK: `'CEO', 'ADMIN', 'COMMERCIAL', 'TECHNICAL'`)
* `entry_time` (TIME - Horário de entrada)
* `lunch_start` (TIME - Horário de início do almoço)
* `lunch_end` (TIME - Horário de término do almoço)
* `exit_time` (TIME - Horário de saída)
* `created_at` (TIMESTAMPTZ)

#### `time_records` (Registros de Ponto Eletrônico)
* `id` (SERIAL - Primary Key)
* `company_id` (UUID - References `companies.id` ON DELETE CASCADE)
* `user_id` (INTEGER - References `users.id` ON DELETE CASCADE)
* `type` (TEXT - Restrito via CHECK: `'entry', 'lunch_start', 'lunch_end', 'exit'`)
* `timestamp` (TIMESTAMPTZ - Registro de data/hora do ponto)
* `latitude` (NUMERIC)
* `longitude` (NUMERIC)
* `selfie_url` (TEXT - Link público da foto de selfie no Supabase Storage)
* `selfie_path` (TEXT - Caminho interno da foto no bucket de Storage)
* `status` (TEXT - Restrito via CHECK: `'pending', 'approved', 'adjustment_requested'`)

#### `time_adjustments` (Solicitações de Ajuste de Ponto)
* `id` (SERIAL - Primary Key)
* `company_id` (UUID - References `companies.id` ON DELETE CASCADE)
* `time_record_id` (INTEGER - References `time_records.id` ON DELETE CASCADE)
* `requested_by` (INTEGER - References `users.id` ON DELETE CASCADE)
* `justification` (TEXT - Justificativa detalhada do funcionário para o ajuste)
* `new_timestamp` (TIMESTAMPTZ - Nova data/hora solicitada)
* `status` (TEXT - Restrito via CHECK: `'pending', 'approved', 'rejected'`)
* `reviewed_by` (INTEGER - References `users.id` - ID do usuário gestor que aprovou/rejeitou)
* `reviewed_at` (TIMESTAMPTZ - Data/hora da revisão)
* `created_at` (TIMESTAMPTZ)


### Regras de Isolamento Multi-Tenant (company_id)
* **Preenchimento:** Todas as inserções nas tabelas críticas incluem a coluna `company_id` obtida no lado do servidor via decodificação do JWT Token do usuário conectado.
* **Isolamento:** Toda requisição `SELECT`, `UPDATE` ou `DELETE` no backend Express injeta a cláusula `.eq('company_id', req.user.company_id)` para impedir vazamento ou alteração de dados entre diferentes empresas contratantes.

---

## 6. INTEGRAÇÕES EXTERNAS

### Evolution API (WhatsApp)
* **Envio:** O frontend dispara requisições para a API local Express em rotas como `/api/whatsapp/send`. O backend localiza as credenciais seguras da instância (Base URL, API Key) na tabela `company_instances` e faz o disparo do JSON para a Evolution API.
* **Recebimento via Webhook:** A Evolution API monitora o celular e envia webhooks (`POST /api/webhooks/whatsapp`) para o backend da aplicação. O Express resolve qual empresa é dona da mensagem processando o `instance_name` recebido e salvando nas tabelas `whatsapp_conversations` e `whatsapp_messages`.

### Supabase Storage
O armazenamento de arquivos é dividido nos seguintes Buckets de acesso:
1. **`whatsapp-media`:** Guarda permanentemente imagens, áudios e documentos trocados pelo painel do WhatsApp.
2. **`propostas`:** Armazena os PDFs de propostas gerados pela equipe comercial.
3. **`uploads`:** Guarda documentos gerais e fotos rápidas de vistoria cadastrados via CRM Kanban.
4. **`obras-fotos`:** Fotos de checklists de obras enviadas pelos instaladores.
5. **`homologacao-docs`:** Documentações burocráticas submetidas às distribuidoras de energia.

### Firebase (Push Notifications)
* **Serviço FCM:** O Firebase Admin SDK no Express é inicializado com chaves privadas de ambiente. Quando um status de projeto ou mensagem do WhatsApp precisa alertar um usuário mobile, o backend busca o `push_token` do usuário na tabela `users` e envia o payload.

### Vercel (Deploy e Serverless)
* **Backend Serverless:** O arquivo `/api/index.ts` roda em ambiente Vercel. Todas as rotas de API `/api/*` são reescritas para apontar para a serverless function monolítica.
* **Cronjobs:** Conforme definido em `vercel.json`, a Vercel aciona rotas agendadas em background:
  * `GET /api/cleanup-proposals` — Diariamente às 03:00 UTC. Remove propostas expiradas.
  * `GET /api/cron/agenda-reminders` — Diariamente às 07:00 UTC. Notifica usuários de compromissos próximos.
  * `POST /api/cron/mensagem-inicio-expediente` — Segunda a sexta, 11:30 UTC (08:30 BRT). Envia mensagem de início de expediente para conversas em atendimento.
  * `POST /api/cron/mensagem-almoco` — Segunda a sexta, 15:00 UTC (12:00 BRT). Envia mensagem de pausa para almoço.
  * `POST /api/cron/mensagem-fim-expediente` — Segunda a sexta, 20:00 UTC (17:00 BRT). Envia mensagem de encerramento do atendimento.

### Railway (Evolution API)
* A hospedagem das instâncias da Evolution API e da conexão com o WhatsApp do cliente final reside em um servidor Railway, provendo uma API contínua com IP estável para não derrubar o escaneamento do QR Code.

---

## 7. AUTENTICAÇÃO E SEGURANÇA

* **Fluxo de Login e JWT:**
  1. O usuário submete e-mail e senha na tela de Login.
  2. O backend faz o hash e compara usando `bcrypt.compareSync()`. Caso o e-mail seja `ceo@mtsolar.com` e a senha `admin123`, há um fallback administrador configurado para facilitar a recuperação.
  3. Com a senha correta, é assinado um Token JWT contendo: `id`, `name`, `role` e `company_id`.
  4. O token é retornado na resposta JSON e gravado em `localStorage` via `login()` do `AuthContext`. O `AuthContext` também emite um cookie via backend simultaneamente.
  5. Em toda inicialização do React, `AuthContext` chama `GET /api/auth/me` para validar a sessão. Em caso de falha, remove o token do `localStorage` automaticamente.
* **Cliente HTTP (`src/lib/api.ts`):**
  * Instância Axios com `timeout: 15000ms` e `withCredentials: true`.
  * **`baseURL` dinâmica:** Se rodando em plataforma nativa Capacitor, aponta para `https://gest-o-mt-solar.vercel.app`. Em ambiente web, usa `window.location.origin` (funciona tanto em local quanto em produção sem reconfiguração).
  * Interceptor automático que injeta o header `Authorization: Bearer <token>` lido do `localStorage` em todas as requisições.
* **Role-Based Access Control (Roles de Usuário e Rotas Protegidas):**

  | Rota | CEO | ADMIN | COMMERCIAL | TECHNICAL |
  |---|:---:|:---:|:---:|:---:|
  | `/` (Dashboard) | ✅ | ✅ | ✅ | ✅ |
  | `/commercial` (CRM) | ✅ | ✅ | ✅ | ❌ |
  | `/whatsapp` | ✅ | ✅ | ✅ | ❌ |
  | `/proposal-generator` | ✅ | ✅ | ✅ | ❌ |
  | `/agenda` | ✅ | ✅ | ✅ | ❌ |
  | `/calculadora` | ✅ | ✅ | ✅ | ✅ |
  | `/technical` | ✅ | ✅ | ❌ | ✅ |
  | `/obra` | ✅ | ✅ | ❌ | ✅ |
  | `/cronograma` | ✅ | ✅ | ✅ | ✅ |
  | `/homologation` | ✅ | ✅ | ✅ | ❌ |
  | `/estoque` | ✅ | ✅ | ❌ | ❌ |
  | `/kit-purchase` | ✅ | ✅ | ❌ | ❌ |
  | `/users` | ✅ | ✅ | ❌ | ❌ |
  | `/settings` | ✅ | ✅ | ❌ | ❌ |
  | `/contracts` | ✅ | ✅ | ❌ | ❌ |
  | `/neoenergia` | ✅ | ✅ | ❌ | ❌ |
  | `/finished` | ✅ | ✅ | ❌ | ❌ |
  | `/messages` | ✅ | ✅ | ❌ | ✅ |
  | `/documents` | ✅ | ✅ | ❌ | ❌ |

  * **Regra especial COMMERCIAL:** Se o usuário tem `role = COMMERCIAL` e tenta acessar qualquer rota fora das permitidas, é redirecionado para `/` pelo `PrivateRoute` em `App.tsx`.
* **Middleware de Autenticação (`authenticateToken`):**
  * Toda rota protegida do Express passa por este middleware. Ele lê o token do header `Authorization: Bearer <token>` ou do Cookie, verifica a assinatura contra `JWT_SECRET` e injeta `req.user` contendo as informações e o `company_id` da empresa na requisição.
* **Firebase Admin (Push Notifications):**
  * A inicialização do Firebase Admin é **condicional**: só ocorre se as três variáveis `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY` e `FIREBASE_CLIENT_EMAIL` estiverem presentes no ambiente. Caso contrário, a API inicializa normalmente sem crash.

---

## 8. REGRAS DE NEGÓCIO

* **Isolamento de Visualização por Role (WhatsApp):**
  * Vendedores (`COMMERCIAL`) visualizam e respondem chats apenas sob as seguintes regras:
    1. A conversa não tem dono (`assigned_to IS NULL`) e está na fila (`status = 'waiting'`).
    2. A conversa está explicitamente atribuída a ele (`assigned_to = user_id`).
  * Administradores e CEOs acessam todas as conversas sem barreiras. Conversas em atendimento por outros agentes aparecem para o COMMERCIAL, mas travadas (bloqueadas para escrita e com conteúdo oculto).
* **Assunção e Transferência de Tickets:**
  * **Assumir:** Quando um atendente clica em uma conversa na fila, o sistema atualiza `assigned_to` para o seu ID de usuário e o status para `in_progress`.
  * **Transferir:** Um atendente comercial pode transferir a conversa para outro colaborador ou departamento. O sistema apaga o `assigned_to` anterior, atribui ao novo colaborador e registra uma mensagem do sistema indicando o direcionamento.
  * **Transferência de Instância:** Instância `atendimento-cliente` → `mtsolar` (administrativo) e vice-versa, disponível apenas para ADMINs.
* **Sistema de Etiquetas (Tags) das Conversas:**
  * Cada conversa pode ter **múltiplas etiquetas** armazenadas na coluna `tags TEXT[]`.
  * As etiquetas disponíveis são definidas no frontend em `WHATSAPP_TAGS` (constante em `WhatsApp.tsx`) com id, label e cor hex.
  * A lógica de toggle: ao clicar em uma etiqueta, se ela já existe no array é removida; se não existe, é adicionada. O estado completo do array é sempre enviado ao backend (`PUT /api/conversations/:id/tag`).
  * Etiquetas disponíveis: Atendimento Iniciado, Cuidar e Fechar, Fechou Venda, Lead Desqualificado, Lead Qualificado, Não Fechou Venda, Orçamento Enviado, Visita Agendada, Transferido.
* **Funil de Vendas Kanban:**
  * Os projetos transitam de forma linear pelas colunas de estágio. Cada estágio exige preenchimento ou upload de dados diferentes (ex: o fechamento comercial exige upload de contrato; a fase técnica exige vistoria cadastrada).

---

## 9. FLUXO DO WHATSAPP

O fluxo de processamento de mídias foi otimizado para evitar expiração rápida de links e garantir o histórico permanente.

### Envio de Mensagens

#### Envio de Texto
* O front-end envia para `/api/whatsapp/send`. A Evolution despacha e o Express grava a mensagem no banco.

#### Envio de Imagens/Documentos
* O front-end faz o upload do arquivo para o bucket temporário `/api/whatsapp/upload-media`, que retorna uma URL assinada temporária (válida por 600 segundos) e o caminho do arquivo (`filePath`).
* O front-end chama `/api/whatsapp/send-media` passando essa URL assinada como origem para a Evolution API realizar o download e envio.
* Após a confirmação da Evolution API, o Express gera a URL pública e definitiva via `supabaseAdmin.storage.from(...).getPublicUrl(filePath)` e insere o registro com `media_url: publicUrl` e `from_me: true`.

#### Envio de Áudio
* O front-end grava o áudio e envia uma string em formato `base64` no corpo da requisição para `/api/whatsapp/send-audio`.
* O backend Express repassa o áudio em `base64` para a Evolution API.
* Após sucesso no disparo, o Express converte o `base64` em um `Buffer` físico e realiza o upload para o Supabase Storage sob o caminho `company_id/conversationId/audio-[timestamp].ogg`.
* O backend obtém a URL pública estática gerada pelo storage e insere no banco a nova mensagem contendo `media_url: audioPublicUrl`, `media_type: 'audio'`, `file_name: 'audio.ogg'` e `from_me: true`.

### Recebimento (Webhook)
* Quando uma mensagem de mídia externa (imagem, áudio ou documento) chega pelo Webhook da Evolution API:
  1. O Express intercepta a mensagem no webhook de recebimento (`/api/webhooks/whatsapp`).
  2. Caso a mensagem contenha mídia, o webhook faz uma chamada reversa à Evolution API (`/chat/getBase64FromMediaMessage`) para ler o binário em formato `base64`.
  3. O backend converte o `base64` para binário (`Buffer`) e realiza o upload permanente no Supabase Storage no bucket `whatsapp-media`.
  4. O link público estático e definitivo gerado pelo Supabase é salvo na coluna `media_url` da mensagem gravada no banco com `from_me: false`.

---

## 10. BUILD E DEPLOY

### Processo de Build do Frontend
* O build é executado via script do Vite: `npm run build` ou `vite build`. O compilador lê as configurações do arquivo `vite.config.ts` e gera os arquivos estáticos indexados na pasta `/dist`.

### Deploy na Vercel
* O deploy é estruturado com base nas regras do arquivo `vercel.json`:
  * As requisições direcionadas para `/api/*` são interceptadas e encaminhadas para a serverless function Express (`/api/index.ts`).
  * Qualquer outra rota de página `/.*` é redirecionada para a página estática raiz `/index.html` para deixar a navegação de rotas internas a cargo do React Router DOM (SPA).

### Mobile com Capacitor
* **Sincronização:** Após o build de produção (`npm run build`), o comando `npx cap sync` atualiza as plataformas móveis (`android` e `ios`) copiando a pasta `/dist` e os plugins necessários.
* **Build de Desenvolvimento:** O comando `npm run build:mobile` usa chaves e arquivos `.env.mobile` específicos para gerar o build e sincronizar imediatamente no simulador ou celular conectado.

---

## 11. PROBLEMAS RESOLVIDOS

* **URLs de Mídia Nulas para Mensagens Enviadas (`from_me = true`):**
  * *Causa Raiz:* No envio de mídias e áudios, a URL temporária ou arquivo `base64` era enviado para a Evolution API, mas no `INSERT` da tabela `whatsapp_messages` a coluna `media_url` era mantida nula. Além disso, o arquivo temporário da mídia no bucket `whatsapp-media` era deletado imediatamente após o envio bem-sucedido para economizar espaço de storage.
  * *Solução Aplicada:* Ajustadas as rotas `/api/whatsapp/send-media` e `/api/whatsapp/send-audio` no backend Express. Agora, antes de inserir a mensagem, o backend gera uma URL pública definitiva pelo storage com `supabaseAdmin.storage.from(...).getPublicUrl(filePath)`, preenche a propriedade `media_url` na query de `INSERT` e mantém o arquivo gravado no bucket de forma permanente.
* **404 na Evolution API:**
  * *Causa Raiz:* Inconsistências na URL final enviada à Evolution API por falta de validação rigorosa dos nomes das instâncias ativas (que vinham com espaços e letras maiúsculas).
  * *Solução:* Implementado tratamento estrito de nomes de instâncias via Express antes de repassar a requisição (conversão para lowercase e substituição de espaços por hífens).
* **Erro 400 no Supabase Storage via RLS:**
  * *Causa Raiz:* O envio de arquivos pelo front-end falhava intermitentemente por falta de permissão de escrita de usuários não autenticados no bucket.
  * *Solução:* Substituído o cliente anônimo por `supabaseAdmin` utilizando a chave privada master `SUPABASE_SERVICE_ROLE_KEY` exclusivamente no backend Express para realizar o upload das mídias.
* **Sistema de Etiquetas Não Salvando (Multi-Tag):**
  * *Causa Raiz (1 — Banco):* A tabela `whatsapp_conversations` possuía apenas a coluna `tag TEXT` (singular), incapaz de armazenar múltiplas etiquetas. A coluna `tags TEXT[]` não existia, fazendo o UPDATE retornar erro `42703` silencioso do PostgreSQL.
  * *Causa Raiz (2 — Backend):* A rota `PUT /api/conversations/:id/tag` atualizava a coluna `tag` com uma string única em vez de receber e persistir um array na coluna `tags`.
  * *Causa Raiz (3 — Frontend):* A interface `Conversation` tipava o campo como `tag?: string | null` e a função `updateTag` enviava uma string única, sem lógica de toggle ou suporte a múltiplos valores.
  * *Solução Aplicada:*
    1. Executado `ALTER TABLE whatsapp_conversations ADD COLUMN tags TEXT[] DEFAULT '{}'` no SQL Editor do Supabase.
    2. Migrados dados históricos: `UPDATE whatsapp_conversations SET tags = ARRAY[tag] WHERE tag IS NOT NULL AND tag != ''`.
    3. Atualizada a rota backend para ler `{ tags }` do body e gravar `{ tags: tags ?? [] }` na coluna correta.
    4. Atualizado o frontend: interface alterada para `tags?: string[] | null`, função `updateTag` com lógica de toggle (adiciona/remove do array), dropdown com checkboxes visuais e renderização de múltiplas tags coloridas por conversa.

* **Bloqueio de Conversa em Atendimento por Outro Agente:**
  * *Contexto:* Antes da implementação, não havia bloqueio do tipo "conversa em uso" — qualquer agente podia ler e responder mensagens de conversas que já estavam sendo atendidas por outro colega, gerando conflito de atendimento.
  * *Solução Aplicada:*
    1. Criada nova rota `GET /api/conversations/:id/messages` no backend que, antes de retornar mensagens, verifica se `status = 'in_progress'`, `assigned_to IS NOT NULL` e `assigned_to != req.user.id`. Caso confirmado e o role não for CEO, retorna HTTP 403 com `{ error: 'CONVERSATION_LOCKED', assignedTo: nome_do_agente }`.
    2. Adicionada a mesma validação nas rotas `POST /api/whatsapp/send`, `POST /api/whatsapp/send-media` e `POST /api/whatsapp/send-audio` via helper `checkConversationLock()`.
    3. No frontend (`WhatsApp.tsx`): adicionados estados `isLocked` e `lockedByName`. A função `fetchMessages` agora chama o backend via `api.get()` (em vez de Supabase direto) e trata o erro 403 setando `isLocked = true`. Ao trocar de conversa, os estados são resetados. No lugar do campo de mensagem, exibe-se um aviso amarelo com ícone de cadeado e o nome do agente responsável.
* **Cronjobs de Mensagens Automáticas de Horário:**
  * Adicionadas 3 novas rotas `POST` no backend e 3 entradas no `vercel.json` para disparar mensagens automáticas de horário (início de expediente, almoço e fim de expediente) para todas as conversas com `status = 'in_progress'`, utilizando as credenciais de instância de cada empresa via `getEvolutionApiCredentials()`.
* **Scroll no Histórico do Gerador de Propostas:**
  * *O que foi feito:* Adição das classes CSS `overflow-y-auto` e `max-h-96` ao container div que envolve a tabela na aba de histórico do gerador de propostas. Isso habilita o scroll vertical, permitindo visualizar todos os registros sem limitação ou quebra de layout.
  * *Data e hora da alteração:* 01/06/2026 às 15:11 (Horário Local)
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`
* **Filtro de Projetos Finalizados nas Homologações do Dashboard:**
  * *O que foi feito:* Adição de condições no `.filter()` da listagem de homologações no arquivo `Dashboard.tsx` para excluir projetos que possuam `current_stage` como `'conclusion'` ou `status` como `'completed'`.
  * *Data e hora da alteração:* 01/06/2026 às 15:12 (Horário Local)
  * *Arquivos modificados:* `src/pages/Dashboard.tsx`
* **Campo de Input Numérico para Ordenação no Cronograma:**
  * *O que foi feito:* Substituição dos botões de seta por um componente de input numérico (`OrderInput`) na listagem do cronograma de obras (`ObraSchedule.tsx`). O input permite ao usuário digitar diretamente a posição de reordenação do cliente, e dispara a movimentação e reordenação no blur ou pressionando Enter.
* **Criação das Tabelas de Controle de Ponto no Supabase (Parte 1):**
  * *O que foi feito:* Criação das tabelas `work_schedules` (horários de trabalho), `time_records` (registros de ponto) e `time_adjustments` (ajustes de ponto), além de índices de performance (`idx_time_records_company_user`, `idx_time_records_timestamp`, `idx_time_adjustments_company`, `idx_work_schedules_company_role`) no banco de dados Supabase do projeto para suporte ao sistema de jornada de colaboradores.
  * *Data e hora da alteração:* 02/06/2026 às 04:18 (Horário Local)
  * *Arquivos modificados:* Nenhum arquivo de código modificado diretamente (criação via SQL Editor do Supabase); atualizado o resumo mestre do banco de dados em `RESUMO_MESTRE_GESTAO_MTSOLAR.md`.
* **Instalação das Dependências do Cloudflare R2 / Geolocalização e Criação do Cliente R2 (Parte 2):**
  * *O que foi feito:* Instalação das dependências `@aws-sdk/client-s3` e `@aws-sdk/s3-request-presigner` via npm, instalação e sincronização do plugin `@capacitor/geolocation` no wrapper mobile do Capacitor, e criação do arquivo de cliente Cloudflare R2 em `api/r2.ts` com funções utilitárias de upload, delete e listagem de arquivos.
  * *Data e hora da alteração:* 02/06/2026 às 04:21 (Horário Local)
  * *Arquivos modificados:* `package.json`, `package-lock.json`, `api/r2.ts` (novo arquivo), `android/app/src/main/assets/capacitor.config.json` (gerado/atualizado pelo capacitor sync).
* **Implementação das Rotas de Ponto Eletrônico (Parte 4):**
  * *O que foi feito:* Adição da importação do cliente Cloudflare R2 em `api/index.ts` e implementação de todas as rotas do módulo de Ponto Eletrônico (horários de expedientes, registro de ponto com selfie e localização, listagem de histórico, relatórios por usuário, solicitações de ajuste e moderação de ajustes por administradores).
  * *Data e hora da alteração:* 02/06/2026 às 04:29 (Horário Local)
  * *Arquivos modificados:* `api/index.ts`
* **Cronjob de Limpeza de Selfies no Cloudflare R2 (Parte 5):**
  * *O que foi feito:* Adição da rota `GET /api/cron/cleanup-r2` em `api/index.ts` que exclui do R2 (e limpa os campos `selfie_url` e `selfie_path` no Supabase) selfies de registros de ponto com mais de 90 dias. Registrada a entrada correspondente no `vercel.json` com schedule mensal (`0 3 1 * *`, às 03:00 UTC do dia 1 de cada mês).
  * *Data e hora da alteração:* 02/06/2026 às 04:32 (Horário Local)
  * *Arquivos modificados:* `api/index.ts`, `vercel.json`
* **Criação da Tela de Ponto Eletrônico no Frontend (Parte 6):**
  * *O que foi feito:* Criação da página `src/pages/Ponto.tsx` implementando a interface visual completa do Ponto Eletrônico (batida de ponto com integração do plugin `@capacitor/camera` para captura de selfie e `@capacitor/geolocation` para obter latitude e longitude, histórico pessoal de registros de ponto com solicitação de ajustes de horário justificados, visualização de espelho de ponto com cálculo de horas trabalhadas diárias e mensais, painel de relatórios do gestor com exportação de PDF utilizando `jsPDF`, configuração de horários de expediente por função e moderação de solicitações de ajuste pendentes).
  * *Data e hora da alteração:* 02/06/2026 às 04:41 (Horário Local)
  * *Arquivos modificados:* `src/pages/Ponto.tsx`
* **Registro de Rota de Ponto Eletrônico e Permissões do Android (Parte 7):**
  * *O que foi feito:* Registro da rota protegida `/ponto` em `src/App.tsx` para todas as roles (`CEO`, `ADMIN`, `COMMERCIAL`, `TECHNICAL`) e adição do caminho aos autorizados para a role de vendedor (`COMMERCIAL`). Adição das permissões nativas de localização (`ACCESS_FINE_LOCATION` e `ACCESS_COARSE_LOCATION`) no `android/app/src/main/AndroidManifest.xml` e execução bem-sucedida do `npx cap sync` para sincronizar os arquivos de build Gradle e plugins nativos no wrapper do Capacitor.
  * *Data e hora da alteração:* 02/06/2026 às 04:43 (Horário Local)
  * *Arquivos modificados:* `src/App.tsx`, `android/app/src/main/AndroidManifest.xml`, `android/app/capacitor.build.gradle` (e outros arquivos gerados pelo Capacitor sync)
* **Adição do Item "Ponto Eletrônico" no Menu Lateral de Navegação (Parte 8):**
  * *O que foi feito:* Adição da importação do ícone `Clock` do `lucide-react` no arquivo `src/components/Layout.tsx`, inclusão da opção "Ponto Eletrônico" (caminho `/ponto`, ícone `Clock`) no array de rotas visíveis `menuItems` (liberado para todas as roles) e inclusão da rota na lista `allowedPaths` para permitir a exibição do menu lateral para a role de vendedor (`COMMERCIAL`).
  * *Data e hora da alteração:* 02/06/2026 às 04:45 (Horário Local)
  * *Arquivos modificados:* `src/components/Layout.tsx`
* **Filtro de Período Personalizado no Ponto Eletrônico e Relatório PDF:**
  * *O que foi feito:* Substituição do seletor de mês fixo por inputs de Data Inicial e Data Final na aba de relatórios do gestor. Ajuste da busca de registros de ponto no backend utilizando a query de período customizado. Refatoração completa da função de exportação de PDF (`generatePDF` usando `jsPDF`) para incluir o nome da empresa e CNPJ consultados da tabela `companies` do Supabase, o período do relatório formatado em DD/MM/AAAA, o nome e o cargo do colaborador, o quadro de expediente esperado de acordo com a tabela `work_schedules` baseada no `role` do colaborador, a tabela diária completa contendo o dia da semana e uma nova coluna de Observações informando se o ponto foi batido fora do local de interesse (latitude/longitude nulos indicando "Sem localização registrada"), além de rodapé com o total acumulado de horas e linha de assinatura.
  * *Data e hora da alteração:* 03/06/2026 às 09:45 (Horário Local)
  * *Arquivos modificados:* `src/pages/Ponto.tsx`
* **Exclusão de Registros de Ponto por Funcionário Demitido (Somente CEO):**
  * *O que foi feito:* Adição da rota DELETE `/api/ponto/usuario/:userId/registros` no Express, protegida com autenticação e restrita ao role de CEO, garantindo o isolamento multi-tenant (`company_id`). No frontend (`src/pages/Ponto.tsx`), implementada exibição condicional do botão "Excluir todos os registros" com ícone de lixeira (`Trash2`) apenas para usuários logados como CEO. Criado modal de confirmação antes de disparar o delete na API e, em caso de sucesso, o estado local é limpo e uma notificação é exibida.
  * *Data e hora da alteração:* 03/06/2026 às 09:50 (Horário Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/Ponto.tsx`
* **Correção de Geolocalização no APK e Visualização do Local (Parte 3):**
  * *O que foi feito:* Adição da tag `<uses-feature android:name="android.hardware.location.gps" android:required="false" />` no `android/app/src/main/AndroidManifest.xml` para robustez de localização. No frontend (`src/pages/Ponto.tsx`), criada a função helper assíncrona `capturarLocalizacao` que requisita explicitamente permissão de localização (`Geolocation.requestPermissions()`) antes de consultar a posição atual. O fluxo `handlePunch` foi ajustado para prosseguir de forma não bloqueante caso a geolocalização falhe, exibindo o aviso "Localização não capturada. O ponto será registrado sem geolocalização.". No histórico de ponto (colaborador e gestor), adicionado o ícone de mapa (`MapPin`) ao lado do horário da batida, estilizado em cinza se a geolocalização for nula, ou em verde e clicável (abrindo link do Google Maps em nova aba) caso a localização esteja preenchida.
  * *Data e hora da alteração:* 03/06/2026 às 09:55 (Horário Local)
  * *Arquivos modificados:* `android/app/src/main/AndroidManifest.xml`, `src/pages/Ponto.tsx`
* **Cadastro de Funcionários Vinculado ao Ponto Eletrônico (Parte 4):**
  * *O que foi feito:* Criação da nova página `src/pages/Funcionarios.tsx` para cadastro, edição e gestão de funcionários, restrita aos papéis de `CEO` e `ADMIN`. A página exibe a listagem completa de colaboradores com botões para Editar, Desativar/Reativar e um botão de Ponto (ícone `Clock`) com tooltip "Ver ponto" que redireciona para a rota `/ponto?userId={id}`. No arquivo `src/pages/Ponto.tsx`, implementada a leitura do query parameter `userId` via `useSearchParams()`. Ao detectar o ID na URL, o sistema pré-seleciona automaticamente o colaborador no dropdown e carrega de imediato o espelho de ponto correspondente na aba de gestor. Por fim, a nova página foi registrada como rota preguiçosa (`lazy`) no `src/App.tsx` (restrita a `CEO` e `ADMIN`) e associada ao menu de navegação lateral em `src/components/Layout.tsx` com o ícone `Users`.
  * *Data e hora da alteração:* 03/06/2026 às 10:00 (Horário Local)
  * *Arquivos modificados:* `src/pages/Funcionarios.tsx` (novo), `src/pages/Ponto.tsx`, `src/App.tsx`, `src/components/Layout.tsx`
* **Contrato PDF: Correção do Fundo e do Rodapé (Parte 5):**
  * *O que foi feito:* No gerador de PDFs do contrato (`src/pages/Contracts.tsx`), removemos a imagem embaçada de fundo (`/Papel_-_timbrado.png`) da função `addBackground()`, substituindo-a por um preenchimento de fundo branco puro (`doc.setFillColor(255, 255, 255)` e `doc.rect(0, 0, pageWidth, pageHeight, 'F')`). Ajustamos a verificação de limite de página da função `addText` para `pageHeight - 30` (267mm) para respeitar a margem inferior do rodapé de 25mm. Adicionamos uma validação de overflow de página logo antes do bloco de assinaturas para garantir que as assinaturas não se sobreponham ao rodapé, gerando uma nova página caso necessário. Por fim, implementamos um laço de repetição que percorre todas as páginas geradas (`doc.setPage(i)`), desenha uma linha separadora fina e imprime o rodapé corporativo institucional padronizado (CNPJ, e-mail, telefone, endereço) centralizado e a paginação `Página X de Y` à direita.
  * *Data e hora da alteração:* 03/06/2026 às 10:05 (Horário Local)
  * *Arquivos modificados:* `src/pages/Contracts.tsx`
* **Proposta Comercial PDF: Correção de Layout e Paginação (Parte 6):**
  * *O que foi feito:* Refatoramos a geração da página de fotos do PDF da proposta comercial no `src/pages/ProposalGenerator.tsx` definindo margens fixas horizontais/verticais (15mm/20mm) e implementando controle estrito de cursor vertical (`y = margemSuperior`). Quando uma imagem não cabe no espaço restante da página (`y + photoHeight > pageHeight - margemInferior`), a página é quebrada com `doc.addPage()` e o cursor reiniciado. Além disso, criamos um loop de pós-processamento que percorre todas as páginas geradas para desenhar uma linha divisória discreta a 20mm da base, o rodapé corporativo institucional e a paginação automática (`Página X de Y`). A partir da página 2, desenha também um cabeçalho simplificado com a proposta (`PROP-${proposalNumber}`) e o nome do cliente.
  * *Data e hora da alteração:* 03/06/2026 às 10:11 (Horário Local)
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`

---

## 12. DÉBITOS TÉCNICOS

* **Monolito no Arquivo `api/index.ts`:**
  * *Risco:* O arquivo concentra mais de **2.619 linhas** de código unificando autenticação, rotas de projetos comercial, técnico, logs, estoque, WhatsApp, webhooks de recebimento, crons e inteligência artificial. Isso eleva a chance de bugs de concorrência de variáveis globais e dificulta manutenções.
* **Dupla Coluna de Tag (`tag` e `tags`) na Tabela `whatsapp_conversations`:**
  * *Situação:* A coluna legada `tag TEXT` (singular) ainda existe na tabela ao lado da nova coluna `tags TEXT[]`. Os dados históricos foram migrados via script, mas as duas colunas coexistem. Novas gravações via a rota corrigida só atualizam `tags`; a coluna `tag` ficará progressivamente desatualizada.
  * *Risco:* Confusão em queries futuras, consumo desnecessário de espaço, e risco de regressão caso alguma rota antiga ainda referencie `tag`.
  * *Ação Recomendada:* Após confirmar estabilidade, executar `ALTER TABLE whatsapp_conversations DROP COLUMN tag;` para remover a coluna obsoleta.
* **Payloads e Timeouts na Vercel:**
  * *Risco:* Funções Serverless gratuitas ou standard na Vercel possuem limites de execução de 10s a 15s. O processamento de downloads de vídeos pesados vindos da Evolution API e subsequente upload no Supabase pode facilmente dar timeout.
* **Uso Extensivo de Tipagem `any`:**
  * *Risco:* Várias funções e manipulações de respostas do Express e do React no frontend estão anotadas com `any` ou utilizando diretivas de escape do compilador (`// @ts-ignore`), o que reduz consideravelmente os benefícios da checagem estática de tipos do TypeScript.
* **Arquivos Sobressalentes / Legado:**
  * *Risco:* Presença de arquivos de backup na pasta do código-fonte (ex: `src/pages/Technical.tsx.bak`) que poluem a árvore de arquivos e podem confundir desenvolvedores.
* **Rota de Transferência Não Atualiza `tags`:**
  * *Situação:* A rota `POST /api/whatsapp/transfer` ao criar o objeto `transferData` ainda define `tag: 'Transferido'` (coluna antiga singular), e **não** preenche a coluna `tags` com `['Transferido']`.
  * *Risco:* Conversas transferidas não receberão a etiqueta visual no novo sistema de multi-tags.

---

## 13. BACKLOG E MELHORIAS SUGERIDAS

### Técnicas
1. **Desacoplamento e Organização do Backend:** Dividir o arquivo `/api/index.ts` em uma estrutura modularizada de rotas (ex: `api/routes/auth.ts`, `api/routes/whatsapp.ts`, `api/routes/projects.ts`) e controladores.
2. **Utilização de Fila de Background Jobs:** Adotar serviços de fila (como BullMQ, Redis, ou tarefas em background integradas) para o processamento de mídias de webhooks recebidos do WhatsApp. O Webhook deve retornar `200 OK` imediatamente e agendar o processamento pesado de mídia em background para evitar timeouts.
3. **Mecanismo de Limpeza Periódica de Storage (Data Retention):** Mídias permanentes de chat consomem gigabytes rapidamente. É recomendado criar um Cronjob mensal para deletar arquivos e URLs de mensagens com mais de 120 dias no bucket `whatsapp-media`.

### Produto
1. **Visualização Nativa de Arquivos:** Modificar o visualizador no chat (`WhatsApp.tsx`) para permitir visualizar PDFs de contratos e orçamentos dentro da própria conversa em formato iframe/modal sem exigir o download físico prévio.
2. **Histórico Local de Mensagens:** Desenvolver um botão na interface do chat para sincronizar e importar as últimas 50 mensagens anteriores guardadas diretamente no celular da Evolution API para o banco do sistema.

---

## 14. VARIÁVEIS DE AMBIENTE

Abaixo estão listadas todas as variáveis cruciais exigidas para o funcionamento local e de produção:

### Frontend (Devem possuir o prefixo `VITE_` para exposição ao Vite/Cliente)
* **`VITE_SUPABASE_URL`:** URL base da API do projeto Supabase. Usado para conectar o cliente SDK do banco.
* **`VITE_SUPABASE_ANON_KEY`:** Chave pública de acesso do Supabase. Segura para exposição pública.
* **`VITE_EVOLUTION_URL`:** Endereço público do servidor da Evolution API v2 (Railway).
* **`VITE_EVOLUTION_KEY`:** Chave global de acesso de administrador da Evolution API.
* **`VITE_EVOLUTION_INSTANCE_ADMIN`:** Nome padrão da instância administrativa (`mtsolar`).
* **`VITE_EVOLUTION_INSTANCE_ATENDIMENTO`:** Nome padrão da instância comercial (`atendimento-cliente`).
* **`VITE_EVOLUTION_TOKEN_ATENDIMENTO`:** Token de acesso específico da instância de atendimento ao cliente.

### Backend (Seguras e restritas apenas ao Servidor Express na Vercel)
* **`SUPABASE_SERVICE_ROLE_KEY`:** Chave de administração master do Supabase. Ignora todas as regras de segurança RLS (Row Level Security). **NUNCA DEVE SER EXPOSTA NO FRONTEND.**
* **`JWT_SECRET`:** Chave secreta de encriptação usada para assinar e validar a autenticidade dos tokens de sessão de usuários.
* **`FIREBASE_PROJECT_ID`:** ID de identificação do projeto configurado no console do Google Firebase.
* **`FIREBASE_PRIVATE_KEY`:** Chave privada criptográfica em string do Firebase Admin para autenticação de push.
* **`FIREBASE_CLIENT_EMAIL`:** E-mail de serviço configurado para comunicação com a API FCM do Firebase.

---

> [!WARNING]
> A chave `SUPABASE_SERVICE_ROLE_KEY` concede controle total sobre todas as linhas de todas as tabelas do banco de dados e arquivos do Storage. Não insira ou exponha esta chave em qualquer script que seja compilado dentro do bundle do frontend (pasta `/src`).

> [!IMPORTANT]
> A Evolution API depende que os webhooks estejam ativados no painel correspondente direcionando para `https://gest-o-mt-solar.vercel.app/api/webhooks/whatsapp`. Caso o endpoint do webhook seja alterado ou o deploy Vercel seja recriado com uma nova URL, os webhooks devem ser reconfigurados imediatamente no painel da Evolution.
