# RESUMO MESTRE â€” GESTÃƒO MTSOLAR

Este documento consolida a anÃ¡lise detalhada e atualizada da arquitetura, stack de tecnologias, estrutura do banco de dados, regras de negÃ³cio e integraÃ§Ãµes do sistema **GestÃ£o MTSolar**, servindo como a principal fonte de verdade tÃ©cnica do projeto.

* **Correcao 6 - Orientacao EXIF e prioridade de leitura de equipamentos:**
  * *O que foi feito:*
    * **Obra.tsx (Tarefa 4):** Refatorado o laco de geracao de PDF (`generatePDF`) para carregar a foto Base64 em um objeto `Image` nativo, detectando sua largura e altura reais. Se a altura for maior que a largura (foto vertical), o espaco de desenho no jsPDF eh redimensionado proporcionalmente para caber nos mesmos 60px de altura maximos permitidos no layout, corrigindo o efeito de achatamento.
    * **api/index.ts (Tarefa 6):** Ajustado o `GET /api/projects/:id` para que as chaves `inversor_modelo` e `modulo_modelo` leiam primeiramente de `techData.inverter_model/module_model` (fonte confiavel do Kit Solar), usando `project.clients` apenas como fallback. Isso resolve o bug do "Inversor: 8 (8)".
  * *Data e hora da alteracao:* 20/06/2026 as 08:55 (Horario Local)
  * *Arquivos modificados:* `src/pages/Obra.tsx`, `api/index.ts`


* **Correção 4 — Remoção de Tensão CA duplicada e promoção do Aterramento Padrão:**
  * *O que foi feito:*
    * **Obra.tsx:** O campo photo_tensao_ca_neutro_terra foi removido da seção Medições Elétricas Adicionais e da trava do botão PDF. O campo photo_aterramento_padrao foi movido para a constante PHOTO_FIELDS, passando a ser exigido universalmente junto com as demais fotos obrigatórias da obra.
  * *Data e hora da alteração:* 20/06/2026 às 07:42 (Horário Local)
  * *Arquivos modificados:* src/pages/Obra.tsx


* **Correção 3 — Mismatch de nomenclatura Inversor/Módulo e Trava do PDF:**
  * *O que foi feito:*
    * **Obra.tsx:** Corrigidas as referências de nomenclatura de idioma no método de geração do PDF. O código passou a ler inversor_modelo, inversor_potencia, modulo_modelo e modulo_potencia (em vez das antigas propriedades inexistentes em inglês inverter_model), resolvendo o problema de exibição N/A. Adicionada também uma trava de segurança baseada em estados temporários: se qualquer fila de anexo recém-selecionada (photoFiles, newPhotoFiles ou mpptList) contiver um arquivo não submetido, o botão aborta a geração do PDF e lança um alerta solicitando que o usuário salve a obra primeiro.
  * *Data e hora da alteração:* 20/06/2026 às 07:11 (Horário Local)
  * *Arquivos modificados:* src/pages/Obra.tsx


* **Correção 2 — Carregamento assíncrono de imagens no Relatório de Obra (PDF):**
  * *O que foi feito:*
    * **Obra.tsx:** Refatorada a função generatePDF para ser sync. O laço síncrono orEach que inseria imagens no PDF foi substituído por um or...of assíncrono. Agora, cada URL de imagem passa por um etch e é convertida para Base64 usando FileReader antes de ser inserida no documento via doc.addImage(). O bloco catch foi mantido para que falhas de rede de fotos individuais não quebrem o resto do PDF.
  * *Data e hora da alteração:* 20/06/2026 às 07:08 (Horário Local)
  * *Arquivos modificados:* src/pages/Obra.tsx


* **Sessão de Auditorias Finais (Propostas, Obra, Histórico):**
  * *O que foi feito:*
    * **Proposta Comercial:** Removida a página institucional indevida (Missão, Visão, Valores) da função de geração da Proposta Comercial (generatePDF HTML) em src/pages/ProposalGenerator.tsx.
    * **Obra:** Adicionado o cronjob /api/cron/cleanup-obra-fotos (frequência 0 2 * * *) no arquivo vercel.json para deletar fotos do R2 após 15 dias.
    * **Histórico de Propostas:** Corrigido o backend da paginação. A rota GET /api/proposal-history em api/index.ts foi substituída para realizar a busca com .range(), .select('*', { count: 'exact' }) e retornar o formato { data, total, page, totalPages } esperado pelo frontend.
    * **Verificações adicionais:** Confirmado que a interface Mobile/Tablet em Layout.tsx e Agenda.tsx estão funcionando responsivamente. Confirmado que o frontend de Obra.tsx já possuía os componentes e funções requeridos para fotos trifásicas, MPPTs e geração do relatório em PDF. Confirmado que data_expiracao na rota POST /api/proposal-history está somando 30 dias.
  * *Data e hora da alteração:* 18/06/2026 às 19:04 (Horário Local)
  * *Arquivos modificados:* src/pages/ProposalGenerator.tsx, vercel.json, api/index.ts


* **CorreÃ§Ã£o do Bug de Upload de HomologaÃ§Ã£o (Payload Too Large):**
  * *O que foi feito:* Refatorada a arquitetura de upload de documentos de homologaÃ§Ã£o no cadastro comercial. Devido ao limite de 4.5MB das Serverless Functions da Vercel, o upload via FormData estava falhando para arquivos grandes. Foi implementado o fluxo de URL PrÃ©-assinada (Presigned URL) do Cloudflare R2.
  * *Detalhes:* O frontend agora solicita uma URL temporÃ¡ria ao backend via `GET /api/r2/presigned-url`, faz o upload do arquivo binÃ¡rio *diretamente* para o R2, e depois registra a URL gerada no banco via `POST /api/homologation-documents/register`.
  * *Data e hora da alteraÃ§Ã£o:* 18/06/2026 Ã s 19:50 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/r2.ts`, `api/index.ts`, `src/pages/Commercial.tsx`

* **CorreÃ§Ã£o do HistÃ³rico de Propostas:**
  * *O que foi feito:* Resolvido o problema onde o histÃ³rico de propostas aparecia vazio mesmo apÃ³s a paginaÃ§Ã£o estar implementada. O erro ocorria pois a ordenaÃ§Ã£o `.order('data_geracao', { ascending: false })` estava falhando silenciosamente no Supabase para registros antigos, disparando o bloco catch que zerava o estado. A ordenaÃ§Ã£o foi revertida para a coluna nativa e segura `created_at`.
  * *Data e hora da alteraÃ§Ã£o:* 18/06/2026 Ã s 20:00 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`

---

## 1. VISÃƒO GERAL

* **PropÃ³sito do Sistema:** O **GestÃ£o MTSolar** Ã© um sistema ERP/CRM completo desenvolvido para otimizar e gerenciar o ciclo de vida de projetos de energia solar fotovoltaica. Ele unifica a captaÃ§Ã£o de leads, o funil comercial (CRM), dimensionamento tÃ©cnico, geraÃ§Ã£o automatizada de propostas em PDF, homologaÃ§Ã£o junto a concessionÃ¡rias de energia, controle de estoque de kits/componentes e o atendimento omnichannel integrado via WhatsApp.
* **PÃºblico-alvo:** Equipes comerciais (vendedores/parceiros), equipe tÃ©cnica/engenharia (instaladores, projetistas) e a administraÃ§Ã£o (gestores e CEOs) de franquias ou distribuidoras de energia solar.
* **EstÃ¡gio Atual do Projeto:** O projeto encontra-se em estÃ¡gio avanÃ§ado de produÃ§Ã£o. A aplicaÃ§Ã£o web/desktop estÃ¡ totalmente operacional, integrada com a Evolution API v2 para atendimento e com o Supabase para banco de dados e arquivos. Possui tambÃ©m um wrapper mobile com Capacitor configurado para builds nativos Android e iOS. A arquitetura foi adaptada para um modelo SaaS **Multi-Tenant** funcional, isolando dados de diferentes empresas/franquias.


---

## 2. STACK TECNOLÃ“GICA

O projeto utiliza um conjunto de tecnologias modernas baseadas em TypeScript em todas as camadas:

### Frontend
* **Core:** React 19 + Vite 6
* **EstilizaÃ§Ã£o:** TailwindCSS v4.1.14 para estilizaÃ§Ã£o baseada em utilitÃ¡rios CSS rÃ¡pidos e modernos, em conjunto com o `lucide-react` para Ã­cones.
* **Roteamento:** React Router DOM v7.13.0 para navegaÃ§Ã£o SPA (Single Page Application).
* **AnimaÃ§Ãµes:** Motion (antigo Framer Motion) para micro-transiÃ§Ãµes fluidas na interface.
* **Biblioteca GrÃ¡fica/PDFs:** `jspdf` para montagem dinÃ¢mica de propostas e relatÃ³rios no lado do cliente.

### Backend
* **Servidor:** Node.js com Express v4.21.2 executado em ambiente Serverless na **Vercel** (conforme mapeamento do arquivo `vercel.json`).
* **CompilaÃ§Ã£o/ExecuÃ§Ã£o local:** `tsx` (TypeScript Execute) rodando em modo nativo ES Modules (`"type": "module"`).
* **SeguranÃ§a e UtilitÃ¡rios:** `bcryptjs` para hashing de senhas, `jsonwebtoken` para emissÃ£o e validaÃ§Ã£o de tokens JWT, e `cookie-parser` / `cors` para gestÃ£o de requisiÃ§Ãµes.
* **Uploads de Arquivos:** `multer` configurado para receber uploads multipart/form-data em memÃ³ria no Express antes de repassÃ¡-los para o Supabase.

### Banco de Dados e Storage
* **Banco:** Supabase (PostgreSQL gerido na nuvem), acessado via SDK `@supabase/supabase-js` v2.97.0.
* **Storage (Buckets):** Supabase Storage para persistÃªncia permanente de documentos e arquivos de vistoria e propostas.
* **Storage Auxiliar:** Cloudflare R2 integrado atravÃ©s do `@aws-sdk/client-s3` para armazenamento secundÃ¡rio.

### IntegraÃ§Ãµes Externas
* **WhatsApp:** Evolution API v2 instalada em servidor prÃ³prio (geralmente hospedado na Railway), funcionando bidirecionalmente via requisiÃ§Ãµes HTTP REST (envio) e Webhooks configurados (recebimento).
* **Firebase:** Firebase Admin SDK v13.9.0 para disparar Push Notifications nativas a dispositivos mÃ³veis.

### Mobile
* **Wrapper Nativo:** Capacitor v8.0.2 (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/ios`) envelopando a aplicaÃ§Ã£o web SPA e expondo APIs de hardware (como `@capacitor/camera` para vistorias em campo, `@capacitor/geolocation` para geolocalizaÃ§Ã£o e `@capacitor/push-notifications`).


---

## 3. ESTRUTURA DE ARQUIVOS

O projeto segue a estrutura de monorepo integrando o frontend, backend (pasta `/api`) e as configuraÃ§Ãµes do Capacitor.

```text
/Gest-o-MTSolar
â”œâ”€â”€ api/
â”‚   â”œâ”€â”€ index.ts               # Servidor backend central Express (Rotas da API, Cronjobs e Webhooks)
â”‚   â””â”€â”€ r2.ts                  # UtilitÃ¡rios do cliente Cloudflare R2 (Upload, Delete, List)
â”œâ”€â”€ android/                   # CÃ³digo nativo Android gerado pelo Capacitor
â”œâ”€â”€ ios/                       # CÃ³digo nativo iOS gerado pelo Capacitor (se sincronizado)
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ components/            # Componentes reutilizÃ¡veis globais da UI
â”‚   â”‚   â”œâ”€â”€ Layout.tsx         # Estrutura principal da pÃ¡gina (Navbar, Sidebar responsiva e Container)
â”‚   â”‚   â””â”€â”€ stock/             # Componentes especÃ­ficos de estoque (Modais de retirada, alertas, etc.)
â”‚   â”œâ”€â”€ context/               # Contextos de estado global
â”‚   â”‚   â”œâ”€â”€ AuthContext.tsx    # Controle de autenticaÃ§Ã£o (Login, Logout, SessÃ£o do UsuÃ¡rio)
â”‚   â”‚   â””â”€â”€ SocketContext.tsx  # Contexto de socket/realtime (se aplicÃ¡vel ao painel)
â”‚   â”œâ”€â”€ db/
â”‚   â”‚   â””â”€â”€ schema.sql         # Esquema de banco de dados mockado/local (SQLite de desenvolvimento)
â”‚   â”œâ”€â”€ hooks/                 # Hooks customizados para abstraÃ§Ã£o de regras e buscas de dados
â”‚   â”‚   â”œâ”€â”€ useHomologacaoDocs.ts
â”‚   â”‚   â””â”€â”€ useStock.ts        # Gerenciamento de itens de estoque e escutas de realtime
â”‚   â”œâ”€â”€ lib/                   # InicializaÃ§Ã£o de SDKs e APIs de terceiros
â”‚   â”‚   â”œâ”€â”€ api.ts             # Cliente Axios configurado para requisiÃ§Ãµes ao backend da Vercel
â”‚   â”‚   â”œâ”€â”€ documentCapture.ts # UtilitÃ¡rios de captura e redimensionamento de imagens de cÃ¢mera
â”‚   â”‚   â”œâ”€â”€ notifications.ts   # ConfiguraÃ§Ã£o nativa de push notifications e agendamento local
â”‚   â”‚   â”œâ”€â”€ supabase.ts        # InicializaÃ§Ã£o do cliente Supabase (Public Anon Client)
â”‚   â”‚   â”œâ”€â”€ utils.ts           # FunÃ§Ãµes utilitÃ¡rias (Tailwind Merge, Clsx)
â”‚   â”‚   â””â”€â”€ whatsapp.ts        # Cliente utilitÃ¡rio de WhatsApp do Frontend (legado/fallback)
â”‚   â”œâ”€â”€ pages/                 # Telas da aplicaÃ§Ã£o
â”‚   â”‚   â”œâ”€â”€ Dashboard.tsx      # MÃ©tricas financeiras, funil simplificado e estatÃ­sticas de vendas
â”‚   â”‚   â”œâ”€â”€ Commercial.tsx     # CRM com funil Kanban, gestÃ£o de leads e projetos comerciais
â”‚   â”‚   â”œâ”€â”€ ProposalGenerator.tsx # ConfiguraÃ§Ã£o e geraÃ§Ã£o dinÃ¢mica da proposta em PDF
â”‚   â”‚   â”œâ”€â”€ EnergyCalculator.tsx  # Ferramenta de estimativa de kWh baseado no consumo dos equipamentos
â”‚   â”‚   â”œâ”€â”€ Technical.tsx      # Ficha tÃ©cnica do projeto e envio de fotos georreferenciadas
â”‚   â”‚   â”œâ”€â”€ Obra.tsx           # Checklist de instalaÃ§Ã£o e acompanhamento de obras em tempo real
â”‚   â”‚   â”œâ”€â”€ ObraSchedule.tsx   # CalendÃ¡rio e agendamentos de equipes de montagem/obra
â”‚   â”‚   â”œâ”€â”€ Homologation.tsx   # Acompanhamento do status de homologaÃ§Ã£o de projetos fotovoltaicos
â”‚   â”‚   â”œâ”€â”€ NeoenergiaProtocols.tsx # Controle interno de protocolos na concessionÃ¡ria (Ex: Neoenergia)
â”‚   â”‚   â”œâ”€â”€ Stock.tsx          # Controle visual de estoque, alertas de nÃ­vel crÃ­tico e histÃ³rico
â”‚   â”‚   â”œâ”€â”€ KitPurchase.tsx    # Registro de compra de kits fotovoltaicos vinculados aos projetos
â”‚   â”‚   â”œâ”€â”€ Agenda.tsx         # CalendÃ¡rio de compromissos para vendedores e engenheiros
â”‚   â”‚   â”œâ”€â”€ Ponto.tsx          # Tela de ponto eletrÃ´nico com captura de selfie, geolocalizaÃ§Ã£o e relatÃ³rios
â”‚   â”‚   â”œâ”€â”€ Settings.tsx       # ConfiguraÃ§Ã£o de dados e preferÃªncias da empresa
â”‚   â”‚   â”œâ”€â”€ Users.tsx          # Painel de gestÃ£o de membros da equipe (vendedores, engenheiros, admin)
â”‚   â”‚   â”œâ”€â”€ WhatsApp.tsx       # Chat central de atendimento ao cliente integrado ao WhatsApp
â”‚   â”‚   â”œâ”€â”€ Login.tsx          # Tela de autenticaÃ§Ã£o por e-mail e senha
â”‚   â”‚   â””â”€â”€ Messages.tsx       # Interface interna de recados/mensagens da equipe
â”‚   â”œâ”€â”€ types/                 # Tipagens estÃ¡ticas do TypeScript (Ex: stock.ts)
â”‚   â”œâ”€â”€ App.tsx                # DefiniÃ§Ã£o de rotas do React Router DOM e carregador do AuthProvider
â”‚   â”œâ”€â”€ main.tsx               # Ponto de entrada do React
â”‚   â””â”€â”€ index.css              # ImportaÃ§Ã£o e configuraÃ§Ã£o do Tailwind CSS
â”œâ”€â”€ supabase_schema.sql        # Esquema oficial com tabelas do PostgreSQL executado no Supabase
â”œâ”€â”€ vercel.json                # ConfiguraÃ§Ãµes de rotas de deploy e agendamentos de Cron no backend Vercel
â”œâ”€â”€ capacitor.config.ts        # ConfiguraÃ§Ãµes de build do wrapper Capacitor Mobile
â”œâ”€â”€ package.json               # Gerenciamento de scripts NPM e dependÃªncias de pacotes
â””â”€â”€ .env                       # VariÃ¡veis de ambiente locais (sensÃ­veis)
```


---

## 4. MÃ“DULOS E FUNCIONALIDADES

O sistema Ã© dividido em fluxos de negÃ³cios integrados que cobrem todas as fases de uma venda solar:

1. **AutenticaÃ§Ã£o (`Login.tsx`):**
   * Tela inicial para inserÃ§Ã£o de credenciais de e-mail e senha. Valida o usuÃ¡rio e estabelece o JWT seguro.
2. **Dashboard Geral (`Dashboard.tsx`):**
   * GrÃ¡ficos financeiros, resumo do funil de vendas ativo, volume de geraÃ§Ã£o projetado e atalhos rÃ¡pidos para novas aÃ§Ãµes.
3. **CRM / Comercial (`Commercial.tsx`):**
   * Kanban interativo contendo colunas customizÃ¡veis (ex: Lead, Vistoria Agendada, Proposta Elaborada, Fechamento). Os vendedores criam cards de clientes e arrastam entre fases. Permite o upload do contrato assinado.
4. **Calculadora de Consumo (`EnergyCalculator.tsx`):**
   * Permite cadastrar mÃºltiplos aparelhos elÃ©tricos (lÃ¢mpadas, ar-condicionados, motores), suas potÃªncias, horas de uso diÃ¡rio e dias de uso mensal para calcular o consumo total em kWh de forma automÃ¡tica.
5. **Gerador de Propostas (`ProposalGenerator.tsx`):**
   * FormulÃ¡rio passo-a-passo no qual o vendedor informa os dados de consumo do cliente, seleciona o kit (painÃ©is, inversores, estruturas), configura financiamentos e gera uma proposta comercial personalizada no formato de arquivo PDF (salva no storage do Supabase).
6. **WhatsApp / Chat Center (`WhatsApp.tsx` e `AttendanceRegistry.tsx`):**
   * Painel de atendimento em tempo real. Exibe conversas em andamento agrupadas por status (Aguardando, Em Atendimento, Resolvidas). Permite envio de textos, Ã¡udios e mÃ­dias, bem como transferÃªncia de tickets entre vendedores e departamentos.
   * **Bloqueio de Conversa em Atendimento:** Quando um agente estÃ¡ atendendo uma conversa (`status = 'in_progress'`), ela fica bloqueada para outros agentes. O frontend exibe uma barra amarela com cadeado indicando o nome do responsÃ¡vel em vez do campo de mensagem. CEOs tÃªm acesso irrestrito. A validaÃ§Ã£o ocorre tanto no backend (`GET /api/conversations/:id/messages`, `POST /api/whatsapp/send`, `send-media` e `send-audio`) quanto no frontend.
   * **Mensagens AutomÃ¡ticas de HorÃ¡rio:** TrÃªs cronjobs enviam mensagens automÃ¡ticas de inÃ­cio de expediente (08:30 BRT), pausa para almoÃ§o (12:00 BRT) e fim de expediente (17:00 BRT) para todas as conversas ativas (`in_progress`).
   * **Registro de Atendimentos:** Nova pÃ¡gina gerencial/planilha (`AttendanceRegistry.tsx`) que exibe todos os clientes em andamento. Destaca visualmente em vermelho as conversas ociosas (sem qualquer interaÃ§Ã£o hÃ¡ mais de 5 dias). Vendedores visualizam de forma isolada apenas os seus prÃ³prios atendimentos, enquanto a gestÃ£o (ADM/CEO) tem visÃ£o integral. Permite filtragem de conversas por Vendedor e por Etiqueta, e apresenta a Ãºltima observaÃ§Ã£o registrada para o atendimento via join com `whatsapp_observations`.
7. **Ficha TÃ©cnica e Vistoria (`Technical.tsx`):**
   * Acesso aos dados fÃ­sicos do local do cliente (tipo de telhado, orientaÃ§Ã£o, padrÃ£o de entrada, disjuntores). Permite o envio de fotos comprobatÃ³rias obrigatÃ³rias do local da instalaÃ§Ã£o.
8. **GestÃ£o de Obras (`Obra.tsx` e `ObraSchedule.tsx`):**
   * Cronograma de montagem do sistema. Acompanhamento visual de status (NÃ£o Iniciado, Em Andamento, ConcluÃ­do) e atribuiÃ§Ã£o de tÃ©cnicos responsÃ¡veis.
9. **HomologaÃ§Ã£o e ConcessionÃ¡rias (`Homologation.tsx` e `NeoenergiaProtocols.tsx`):**
   * Tela burocrÃ¡tica para anexar solicitaÃ§Ãµes de conexÃ£o, pareceres de acesso e protocolos de vistoria junto a distribuidoras (ex: Neoenergia).
10. **Estoque (`Stock.tsx`):**
    * GestÃ£o fÃ­sica de equipamentos como mÃ³dulos solares, inversores e estruturas. Emite alertas de estoque baixo baseado em limites (threshold) cadastrados.
11. **Ponto EletrÃ´nico (Ponto/Jornada):**
    * Sistema de controle de ponto eletrÃ´nico para colaboradores. Permite bater ponto (entrada, inÃ­cio de almoÃ§o, fim de almoÃ§o e saÃ­da) enviando a selfie e a geolocalizaÃ§Ã£o capturada pelo GPS do dispositivo.
    * **GestÃ£o de HorÃ¡rios:** ConfiguraÃ§Ã£o de turnos de trabalho (`work_schedules`) por funÃ§Ã£o de usuÃ¡rio pela gerÃªncia (`CEO`/`ADMIN`).
    * **Fluxo de Ajustes:** Os funcionÃ¡rios podem solicitar correÃ§Ãµes de batidas de ponto justificadas, que passam por um fluxo de aprovaÃ§Ã£o pendente avaliado pelos administradores.


---

## 5. BANCO DE DADOS

O banco de dados Ã© hospedado no **Supabase (PostgreSQL)** e implementa uma estrutura rÃ­gida de multi-tenancy.

### Principais Tabelas e Colunas

#### `companies` (Tenants)
* `id` (UUID - Primary Key)
* `name` (TEXT)
* `whatsapp_instance` (TEXT - Nome legado da instÃ¢ncia principal de WhatsApp)
* `created_at` (TIMESTAMPTZ)

#### `company_instances` (VÃ­nculo de InstÃ¢ncias WhatsApp)
* `id` (UUID - Primary Key)
* `company_id` (UUID - References `companies.id`)
* `instance_name` (TEXT - Nome normalizado da instÃ¢ncia da Evolution API)
* `created_at` (TIMESTAMPTZ)

#### `users` (UsuÃ¡rios / Colaboradores)
* `id` (SERIAL - Primary Key)
* `company_id` (UUID - References `companies.id`)
* `name` (TEXT)
* `email` (TEXT - UNIQUE)
* `password_hash` (TEXT)
* `role` (TEXT - Restrito via CHECK: `'CEO', 'ADMIN', 'COMMERCIAL', 'TECHNICAL'`)
* `active` (BOOLEAN - PadrÃ£o TRUE)
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

#### `proposal_history` (HistÃ³rico de Propostas Geradas)
* `id` (SERIAL - Primary Key)
* `company_id` (UUID - References `companies.id`)
* `client_name` (TEXT)
* `proposal_number` (TEXT)
* `url_arquivo` (TEXT - Link do arquivo PDF)
* `raw_data` (JSON - Objeto contendo todas as variÃ¡veis utilizadas na geraÃ§Ã£o)
* `data_geracao` (TIMESTAMPTZ)
* `data_expiracao` (TIMESTAMPTZ - PadrÃ£o de 7 dias Ãºteis apÃ³s geraÃ§Ã£o)
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

#### `stock_withdrawals` (SaÃ­das de Estoque)
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
* `unread_count` (INTEGER - PadrÃ£o 0)
* `last_message` (TEXT)
* `last_message_at` (TIMESTAMPTZ)
* `status` (TEXT - `'waiting', 'open', 'closed'`)
* `assigned_to` (INTEGER - References `users.id`)
* `instance` (TEXT - Nome normalizado da instÃ¢ncia responsÃ¡vel)
* `tags` (TEXT[] - Etiquetas aplicadas Ã  conversa)

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
* `media_url` (TEXT - Link pÃºblico e permanente no Supabase Storage)
* `file_name` (TEXT)
* `file_size` (NUMERIC)
* `is_internal` (BOOLEAN - Se a mensagem foi escrita como anotaÃ§Ã£o interna e nÃ£o enviada ao cliente)

#### `work_schedules` (HorÃ¡rios de Trabalho por FunÃ§Ã£o/Empresa)
* `id` (SERIAL - Primary Key)
* `company_id` (UUID - References `companies.id` ON DELETE CASCADE)
* `role` (TEXT - Restrito via CHECK: `'CEO', 'ADMIN', 'COMMERCIAL', 'TECHNICAL'`)
* `entry_time` (TIME - HorÃ¡rio de entrada)
* `lunch_start` (TIME - HorÃ¡rio de inÃ­cio do almoÃ§o)
* `lunch_end` (TIME - HorÃ¡rio de tÃ©rmino do almoÃ§o)
* `exit_time` (TIME - HorÃ¡rio de saÃ­da)
* `created_at` (TIMESTAMPTZ)

#### `time_records` (Registros de Ponto EletrÃ´nico)
* `id` (SERIAL - Primary Key)
* `company_id` (UUID - References `companies.id` ON DELETE CASCADE)
* `user_id` (INTEGER - References `users.id` ON DELETE CASCADE)
* `type` (TEXT - Restrito via CHECK: `'entry', 'lunch_start', 'lunch_end', 'exit'`)
* `timestamp` (TIMESTAMPTZ - Registro de data/hora do ponto)
* `latitude` (NUMERIC)
* `longitude` (NUMERIC)
* `selfie_url` (TEXT - Link pÃºblico da foto de selfie no Supabase Storage)
* `selfie_path` (TEXT - Caminho interno da foto no bucket de Storage)
* `status` (TEXT - Restrito via CHECK: `'pending', 'approved', 'adjustment_requested'`)

#### `time_adjustments` (SolicitaÃ§Ãµes de Ajuste de Ponto)
* `id` (SERIAL - Primary Key)
* `company_id` (UUID - References `companies.id` ON DELETE CASCADE)
* `time_record_id` (INTEGER - References `time_records.id` ON DELETE CASCADE)
* `requested_by` (INTEGER - References `users.id` ON DELETE CASCADE)
* `justification` (TEXT - Justificativa detalhada do funcionÃ¡rio para o ajuste)
* `new_timestamp` (TIMESTAMPTZ - Nova data/hora solicitada)
* `status` (TEXT - Restrito via CHECK: `'pending', 'approved', 'rejected'`)
* `reviewed_by` (INTEGER - References `users.id` - ID do usuÃ¡rio gestor que aprovou/rejeitou)
* `reviewed_at` (TIMESTAMPTZ - Data/hora da revisÃ£o)
* `created_at` (TIMESTAMPTZ)


### Regras de Isolamento Multi-Tenant (company_id)
* **Preenchimento:** Todas as inserÃ§Ãµes nas tabelas crÃ­ticas incluem a coluna `company_id` obtida no lado do servidor via decodificaÃ§Ã£o do JWT Token do usuÃ¡rio conectado.
* **Isolamento:** Toda requisiÃ§Ã£o `SELECT`, `UPDATE` ou `DELETE` no backend Express injeta a clÃ¡usula `.eq('company_id', req.user.company_id)` para impedir vazamento ou alteraÃ§Ã£o de dados entre diferentes empresas contratantes.


---

## 6. INTEGRAÃ‡Ã•ES EXTERNAS

### Evolution API (WhatsApp)
* **Envio:** O frontend dispara requisiÃ§Ãµes para a API local Express em rotas como `/api/whatsapp/send`. O backend localiza as credenciais seguras da instÃ¢ncia (Base URL, API Key) na tabela `company_instances` e faz o disparo do JSON para a Evolution API.
* **Recebimento via Webhook:** A Evolution API monitora o celular e envia webhooks (`POST /api/webhooks/whatsapp`) para o backend da aplicaÃ§Ã£o. O Express resolve qual empresa Ã© dona da mensagem processando o `instance_name` recebido e salvando nas tabelas `whatsapp_conversations` e `whatsapp_messages`.

### Supabase Storage
O armazenamento de arquivos Ã© dividido nos seguintes Buckets de acesso:
1. **`whatsapp-media`:** Guarda permanentemente imagens, Ã¡udios e documentos trocados pelo painel do WhatsApp.
2. **`propostas`:** Armazena os PDFs de propostas gerados pela equipe comercial.
3. **`uploads`:** Guarda documentos gerais e fotos rÃ¡pidas de vistoria cadastrados via CRM Kanban.
4. **`obras-fotos`:** Fotos de checklists de obras enviadas pelos instaladores.
5. **`homologacao-docs`:** DocumentaÃ§Ãµes burocrÃ¡ticas submetidas Ã s distribuidoras de energia.

### Firebase (Push Notifications)
* **ServiÃ§o FCM:** O Firebase Admin SDK no Express Ã© inicializado com chaves privadas de ambiente. Quando um status de projeto ou mensagem do WhatsApp precisa alertar um usuÃ¡rio mobile, o backend busca o `push_token` do usuÃ¡rio na tabela `users` e envia o payload.

### Vercel (Deploy e Serverless)
* **Backend Serverless:** O arquivo `/api/index.ts` roda em ambiente Vercel. Todas as rotas de API `/api/*` sÃ£o reescritas para apontar para a serverless function monolÃ­tica.
* **Cronjobs:** Conforme definido em `vercel.json`, a Vercel aciona rotas agendadas em background:
  * `GET /api/cleanup-proposals` â€” Diariamente Ã s 03:00 UTC. Remove propostas expiradas.
  * `GET /api/cron/agenda-reminders` â€” Diariamente Ã s 07:00 UTC. Notifica usuÃ¡rios de compromissos prÃ³ximos.
  * `POST /api/cron/mensagem-inicio-expediente` â€” Segunda a sexta, 11:30 UTC (08:30 BRT). Envia mensagem de inÃ­cio de expediente para conversas em atendimento.
  * `POST /api/cron/mensagem-almoco` â€” Segunda a sexta, 15:00 UTC (12:00 BRT). Envia mensagem de pausa para almoÃ§o.
  * `POST /api/cron/mensagem-fim-expediente` â€” Segunda a sexta, 20:00 UTC (17:00 BRT). Envia mensagem de encerramento do atendimento.

### Railway (Evolution API)
* A hospedagem das instÃ¢ncias da Evolution API e da conexÃ£o com o WhatsApp do cliente final reside em um servidor Railway, provendo uma API contÃ­nua com IP estÃ¡vel para nÃ£o derrubar o escaneamento do QR Code.


---

## 7. AUTENTICAÃ‡ÃƒO E SEGURANÃ‡A

* **Fluxo de Login e JWT:**
  1. O usuÃ¡rio submete e-mail e senha na tela de Login.
  2. O backend faz o hash e compara usando `bcrypt.compareSync()`. Caso o e-mail seja `ceo@mtsolar.com` e a senha `admin123`, hÃ¡ um fallback administrador configurado para facilitar a recuperaÃ§Ã£o.
  3. Com a senha correta, Ã© assinado um Token JWT contendo: `id`, `name`, `role` e `company_id`.
  4. O token Ã© retornado na resposta JSON e gravado em `localStorage` via `login()` do `AuthContext`. O `AuthContext` tambÃ©m emite um cookie via backend simultaneamente.
  5. Em toda inicializaÃ§Ã£o do React, `AuthContext` chama `GET /api/auth/me` para validar a sessÃ£o. Em caso de falha, remove o token do `localStorage` automaticamente.
* **Cliente HTTP (`src/lib/api.ts`):**
  * InstÃ¢ncia Axios com `timeout: 15000ms` e `withCredentials: true`.
  * **`baseURL` dinÃ¢mica:** Se rodando em plataforma nativa Capacitor, aponta para `https://gest-o-mt-solar.vercel.app`. Em ambiente web, usa `window.location.origin` (funciona tanto em local quanto em produÃ§Ã£o sem reconfiguraÃ§Ã£o).
  * Interceptor automÃ¡tico que injeta o header `Authorization: Bearer <token>` lido do `localStorage` em todas as requisiÃ§Ãµes.
* **Role-Based Access Control (Roles de UsuÃ¡rio e Rotas Protegidas):**

  | Rota | CEO | ADMIN | COMMERCIAL | TECHNICAL |





---:|
  | `/` (Dashboard) | âœ… | âœ… | âœ… | âœ… |
  | `/commercial` (CRM) | âœ… | âœ… | âœ… | âŒ |
  | `/whatsapp` | âœ… | âœ… | âœ… | âŒ |
  | `/proposal-generator` | âœ… | âœ… | âœ… | âŒ |
  | `/agenda` | âœ… | âœ… | âœ… | âŒ |
  | `/calculadora` | âœ… | âœ… | âœ… | âœ… |
  | `/technical` | âœ… | âœ… | âŒ | âœ… |
  | `/obra` | âœ… | âœ… | âŒ | âœ… |
  | `/cronograma` | âœ… | âœ… | âœ… | âœ… |
  | `/homologation` | âœ… | âœ… | âœ… | âŒ |
  | `/estoque` | âœ… | âœ… | âŒ | âŒ |
  | `/kit-purchase` | âœ… | âœ… | âŒ | âŒ |
  | `/users` | âœ… | âœ… | âŒ | âŒ |
  | `/settings` | âœ… | âœ… | âŒ | âŒ |
  | `/contracts` | âœ… | âœ… | âŒ | âŒ |
  | `/neoenergia` | âœ… | âœ… | âŒ | âŒ |
  | `/finished` | âœ… | âœ… | âŒ | âŒ |
  | `/messages` | âœ… | âœ… | âŒ | âœ… |
  | `/documents` | âœ… | âœ… | âŒ | âŒ |

  * **Regra especial COMMERCIAL:** Se o usuÃ¡rio tem `role = COMMERCIAL` e tenta acessar qualquer rota fora das permitidas, Ã© redirecionado para `/` pelo `PrivateRoute` em `App.tsx`.
* **Middleware de AutenticaÃ§Ã£o (`authenticateToken`):**
  * Toda rota protegida do Express passa por este middleware. Ele lÃª o token do header `Authorization: Bearer <token>` ou do Cookie, verifica a assinatura contra `JWT_SECRET` e injeta `req.user` contendo as informaÃ§Ãµes e o `company_id` da empresa na requisiÃ§Ã£o.
* **Firebase Admin (Push Notifications):**
  * A inicializaÃ§Ã£o do Firebase Admin Ã© **condicional**: sÃ³ ocorre se as trÃªs variÃ¡veis `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY` e `FIREBASE_CLIENT_EMAIL` estiverem presentes no ambiente. Caso contrÃ¡rio, a API inicializa normalmente sem crash.


---

## 8. REGRAS DE NEGÃ“CIO

* **Isolamento de VisualizaÃ§Ã£o por Role (WhatsApp):**
  * Vendedores (`COMMERCIAL`) visualizam e respondem chats apenas sob as seguintes regras:
    1. A conversa nÃ£o tem dono (`assigned_to IS NULL`) e estÃ¡ na fila (`status = 'waiting'`).
    2. A conversa estÃ¡ explicitamente atribuÃ­da a ele (`assigned_to = user_id`).
  * Administradores e CEOs acessam todas as conversas sem barreiras. Conversas em atendimento por outros agentes aparecem para o COMMERCIAL, mas travadas (bloqueadas para escrita e com conteÃºdo oculto).
* **AssunÃ§Ã£o e TransferÃªncia de Tickets:**
  * **Assumir:** Quando um atendente clica em uma conversa na fila, o sistema atualiza `assigned_to` para o seu ID de usuÃ¡rio e o status para `in_progress`.
  * **Transferir:** Um atendente comercial pode transferir a conversa para outro colaborador ou departamento. O sistema apaga o `assigned_to` anterior, atribui ao novo colaborador e registra uma mensagem do sistema indicando o direcionamento.
  * **TransferÃªncia de InstÃ¢ncia:** InstÃ¢ncia `atendimento-cliente` â†’ `mtsolar` (administrativo) e vice-versa, disponÃ­vel apenas para ADMINs.
* **Sistema de Etiquetas (Tags) das Conversas:**
  * Cada conversa pode ter **mÃºltiplas etiquetas** armazenadas na coluna `tags TEXT[]`.
  * As etiquetas disponÃ­veis sÃ£o definidas no frontend em `WHATSAPP_TAGS` (constante em `WhatsApp.tsx`) com id, label e cor hex.
  * A lÃ³gica de toggle: ao clicar em uma etiqueta, se ela jÃ¡ existe no array Ã© removida; se nÃ£o existe, Ã© adicionada. O estado completo do array Ã© sempre enviado ao backend (`PUT /api/conversations/:id/tag`).
  * Etiquetas disponÃ­veis: Atendimento Iniciado, Cuidar e Fechar, Fechou Venda, Lead Desqualificado, Lead Qualificado, NÃ£o Fechou Venda, OrÃ§amento Enviado, Visita Agendada, Transferido.
* **Funil de Vendas Kanban:**
  * Os projetos transitam de forma linear pelas colunas de estÃ¡gio. Cada estÃ¡gio exige preenchimento ou upload de dados diferentes (ex: o fechamento comercial exige upload de contrato; a fase tÃ©cnica exige vistoria cadastrada).


---

## 9. FLUXO DO WHATSAPP

O fluxo de processamento de mÃ­dias foi otimizado para evitar expiraÃ§Ã£o rÃ¡pida de links e garantir o histÃ³rico permanente.

### Envio de Mensagens

#### Envio de Texto
* O front-end envia para `/api/whatsapp/send`. A Evolution despacha e o Express grava a mensagem no banco.

#### Envio de Imagens/Documentos
* O front-end faz o upload do arquivo para o bucket temporÃ¡rio `/api/whatsapp/upload-media`, que retorna uma URL assinada temporÃ¡ria (vÃ¡lida por 600 segundos) e o caminho do arquivo (`filePath`).
* O front-end chama `/api/whatsapp/send-media` passando essa URL assinada como origem para a Evolution API realizar o download e envio.
* ApÃ³s a confirmaÃ§Ã£o da Evolution API, o Express gera a URL pÃºblica e definitiva via `supabaseAdmin.storage.from(...).getPublicUrl(filePath)` e insere o registro com `media_url: publicUrl` e `from_me: true`.

#### Envio de Ãudio
* O front-end grava o Ã¡udio e envia uma string em formato `base64` no corpo da requisiÃ§Ã£o para `/api/whatsapp/send-audio`.
* O backend Express repassa o Ã¡udio em `base64` para a Evolution API.
* ApÃ³s sucesso no disparo, o Express converte o `base64` em um `Buffer` fÃ­sico e realiza o upload para o Supabase Storage sob o caminho `company_id/conversationId/audio-[timestamp].ogg`.
* O backend obtÃ©m a URL pÃºblica estÃ¡tica gerada pelo storage e insere no banco a nova mensagem contendo `media_url: audioPublicUrl`, `media_type: 'audio'`, `file_name: 'audio.ogg'` e `from_me: true`.

### Recebimento (Webhook)
* Quando uma mensagem de mÃ­dia externa (imagem, Ã¡udio ou documento) chega pelo Webhook da Evolution API:
  1. O Express intercepta a mensagem no webhook de recebimento (`/api/webhooks/whatsapp`).
  2. Caso a mensagem contenha mÃ­dia, o webhook faz uma chamada reversa Ã  Evolution API (`/chat/getBase64FromMediaMessage`) para ler o binÃ¡rio em formato `base64`.
  3. O backend converte o `base64` para binÃ¡rio (`Buffer`) e realiza o upload permanente no Supabase Storage no bucket `whatsapp-media`.
  4. O link pÃºblico estÃ¡tico e definitivo gerado pelo Supabase Ã© salvo na coluna `media_url` da mensagem gravada no banco com `from_me: false`.


---

## 10. BUILD E DEPLOY

### Processo de Build do Frontend
* O build Ã© executado via script do Vite: `npm run build` ou `vite build`. O compilador lÃª as configuraÃ§Ãµes do arquivo `vite.config.ts` e gera os arquivos estÃ¡ticos indexados na pasta `/dist`.

### Deploy na Vercel
* O deploy Ã© estruturado com base nas regras do arquivo `vercel.json`:
  * As requisiÃ§Ãµes direcionadas para `/api/*` sÃ£o interceptadas e encaminhadas para a serverless function Express (`/api/index.ts`).
  * Qualquer outra rota de pÃ¡gina `/.*` Ã© redirecionada para a pÃ¡gina estÃ¡tica raiz `/index.html` para deixar a navegaÃ§Ã£o de rotas internas a cargo do React Router DOM (SPA).

### Mobile com Capacitor
* **SincronizaÃ§Ã£o:** ApÃ³s o build de produÃ§Ã£o (`npm run build`), o comando `npx cap sync` atualiza as plataformas mÃ³veis (`android` e `ios`) copiando a pasta `/dist` e os plugins necessÃ¡rios.
* **Build de Desenvolvimento:** O comando `npm run build:mobile` usa chaves e arquivos `.env.mobile` especÃ­ficos para gerar o build e sincronizar imediatamente no simulador ou celular conectado.


---

## 11. PROBLEMAS RESOLVIDOS E TAREFAS CONCLUÍDAS

* **Implementação da Nova Página de Registro de Atendimentos:**
  * *O que foi feito:* Criada a página "Registro de Atendimentos" (`AttendanceRegistry.tsx`) funcionando como uma planilha gerencial de clientes em andamento no WhatsApp. Adicionada a rota `GET /api/attendance-registry` com suporte a multi-tenancy e filtro de role (Vendedores veem apenas as próprias conversas, ADM/CEO veem todas). A tabela exibe o Cliente, Vendedor Responsável, Etiquetas, Tempo sem Interação (calculado a partir de `last_message_at`) e a última nota da tabela `whatsapp_observations`. Inclui funcionalidade de destacar em vermelho conversas sem interação há mais de 5 dias e filtro por vendedor/etiquetas.
  * *Data e hora da alteração:* 25/06/2026 às 16:16 (Horário Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/AttendanceRegistry.tsx`, `src/components/Layout.tsx`, `src/App.tsx` e `RESUMO_MESTRE.md`.

* **Remoção da Exibição do "Valor Final de Venda" para Vendedor na Aba Kit Solar:**
  * *O que foi feito:* Refatorada a aba "Kit Solar" (a aba de dimensionamento) no `ProposalGenerator.tsx` para não exibir o card de "Valor Final de Venda" nem a seção "Preview do Valor de Venda" para usuários com o role `COMMERCIAL` (Vendedor). Em substituição, o campo tornou-se exclusivamente o dropdown de "Selecionar Kit Cadastrado", obrigatório, que exibe apenas a identificação do kit (ex: "Kit 5 kWh") sem os preços, blindando informações de custos, preços, marca de módulos e marca de inversores não desejadas nessa visualização.
  * *Data e hora da alteração:* 25/06/2026 às 15:11 (Horário Local)
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`

* **Correção de Tabela solar_kits não encontrada (Erro 500 bloqueador):**
  * *O que foi feito:* A tabela `solar_kits` existia no código da API (`api/index.ts`, rotas GET/POST/PUT/DELETE `/api/solar-kits`) e no frontend (`ProposalGenerator.tsx`, interface `SolarKit`), mas **nunca havia sido criada no banco Supabase**. Nem o `supabase_schema.sql` nem a pasta `supabase/migrations/` possuíam qualquer migration para ela — a pasta estava completamente vazia.
  * *Causa Raiz:* A tabela foi implementada no código em desenvolvimento mas a migration correspondente nunca foi executada no banco Supabase de produção, fazendo o PostgREST retornar erro `"Could not find the table 'public.solar_kits' in the schema cache"` em todas as requisições.
  * *Solução Aplicada:* Criado o arquivo `supabase/migrations/20260625_create_solar_kits.sql` com a estrutura completa da tabela, incluindo: (a) coluna `company_id` para multi-tenancy, (b) todos os campos mapeados pela interface `SolarKit` do frontend, (c) RLS habilitada com políticas por role, (d) trigger de `updated_at` automático, e (e) `NOTIFY pgrst, 'reload schema'` ao final para forçar atualização do cache do PostgREST. O arquivo `supabase_schema.sql` também foi atualizado para refletir a nova tabela.
  * *⚠️ AÇÃO MANUAL NECESSÁRIA:* Esta migration precisa ser executada **manualmente** no **SQL Editor do Supabase** (dashboard → SQL Editor → colar o conteúdo do arquivo e executar). O arquivo está em: `supabase/migrations/20260625_create_solar_kits.sql`.
  * *Data e hora da alteração:* 25/06/2026 às 15:06 (Horário Local)
  * *Arquivos modificados:* `supabase/migrations/20260625_create_solar_kits.sql` (novo), `supabase_schema.sql`

* **Estrutura final de colunas da tabela solar_kits:**
  * `id` (UUID - PK, gerado automaticamente)
  * `company_id` (INTEGER - Multi-tenancy obrigatório)
  * `potencia_kwh` (NUMERIC 10,3 - Potência total do kit em kWp)
  * `valor_total` (NUMERIC 12,2 - Custo de aquisição do kit)
  * `margem_venda` (NUMERIC 5,2 - Margem de lucro em %, padrão 30)
  * `quantidade_modulos` (INTEGER - Qtd. de módulos fotovoltaicos)
  * `potencia_modulo_w` (NUMERIC 10,2 - Potência de cada módulo em W)
  * `marca_modulo` (TEXT - Marca/modelo dos módulos)
  * `quantidade_inversores` (INTEGER - Qtd. de inversores)
  * `potencia_inversor_kw` (NUMERIC 10,3 - Potência do inversor principal em kW)
  * `marca_inversor` (TEXT - Marca do inversor principal)
  * `inversor_ampliacao` (BOOLEAN - Se kit possui inversor de ampliação, padrão FALSE)
  * `potencia_inversor_ampliacao_kw` (NUMERIC 10,3 - Potência do inversor de ampliação, nullable)
  * `marca_inversor_ampliacao` (TEXT - Marca do inversor de ampliação, nullable)
  * `ativo` (BOOLEAN - Soft-delete: FALSE = desativado, padrão TRUE)
  * `created_at` (TIMESTAMPTZ - automático)
  * `updated_at` (TIMESTAMPTZ - atualizado via trigger automático)

* **Correção de Deleção de Documentos de Homologação (Supabase → R2):**
  * *O que foi feito:* Removida a chamada legada `supabase.storage.from('homologacao-docs').remove([path])` do bloco de deleção em massa (aprovação de Ponto de Conexão) em `Homologation.tsx`. Substituída pela chamada correta ao backend `await api.delete('/api/homologation-documents/${doc.id}')`, que já trata a exclusão no Cloudflare R2. A deleção individual já estava correta e não necessitou alteração.
  * *Data e hora da alteração:* 19/06/2026
  * *Arquivos modificados:* `src/pages/Homologation.tsx`

* **Correção de Encoding de Emojis e Labels PT-BR na Página Obra:**
  * *O que foi feito:* Corrigidos 3 títulos de seção com encoding corrompido (Latin-1) em `Obra.tsx`: `⚡ Medições Elétricas Adicionais`, `🔌 Medições CC (MPPTs)` e `📦 Opcionais Adicionais`. Labels e textos já estavam em português — nenhuma alteração adicional necessária.
  * *Data e hora da alteração:* 19/06/2026
  * *Arquivos modificados:* `src/pages/Obra.tsx`

* **Histórico de Propostas — Scroll, Paginação e Expiração de 30 dias:**
  * *O que foi feito:* Adicionados estados `currentPage` e `ITEMS_PER_PAGE = 10` em `ProposalGenerator.tsx`. Tabela de histórico encapsulada com `overflow-y-auto max-h-[500px]` e cabeçalho fixo (`sticky top-0`). Controles de paginação `← Anterior / Próxima →` exibidos apenas quando `totalPages > 1`. Alterado via SQL no Supabase o `DEFAULT` da coluna `data_expiracao` da tabela `proposal_history` para `now() + interval '30 days'` e atualizado registros existentes. O backend (`api/index.ts` linha 2729–2730) já usava `.insert()` com 30 dias — nenhuma alteração necessária no backend.
  * *Data e hora da alteração:* 19/06/2026
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`, Supabase SQL Editor

* **Falha Geral no Login e API do Servidor (Erro de CompilaÃ§Ã£o no Backend):**
  * *Causa Raiz:* Durante a implementaÃ§Ã£o da Melhoria 5, a chave de fechamento (`}`) da funÃ§Ã£o `sendPushNotification` foi acidentalmente removida no arquivo `api/index.ts`. Como resultado, o compilador TSX/esbuild interpretou as definiÃ§Ãµes de rotas subsequentes como parte da funÃ§Ã£o, gerando um erro sintÃ¡tico fatal (`Unexpected export`) e travando a inicializaÃ§Ã£o de todo o backend. Com a API fora do ar, todas as tentativas de autenticaÃ§Ã£o falharam.
  * *SoluÃ§Ã£o Aplicada:* Restaurada a chave de fechamento `}` na funÃ§Ã£o `sendPushNotification` (linha 392) de `api/index.ts`. O compilador reiniciou com sucesso, restabelecendo a operaÃ§Ã£o de todas as rotas e permitindo o login dos usuÃ¡rios.
  * *Data e hora da alteraÃ§Ã£o:* 03/06/2026 Ã s 12:30 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`

* **Erro Cannot read properties of null (reading 'map') na aba RelatÃ³rio do Ponto:**
  * *Causa Raiz:* O estado `reportRecords` e outros estados de arrays de ponto eram deixados como `null` or `undefined` quando ocorria um erro de requisiÃ§Ã£o (como HTTP 400 por falta de parÃ¢metros) ou o retorno da API vinha vazio. O frontend tentava renderizar chamando `.map()` sobre esses arrays, provocando a quebra visual completa da aba de relatÃ³rios.
  * *SoluÃ§Ã£o Aplicada:*
    1. Adicionada guarda de validaÃ§Ã£o de parÃ¢metros na funÃ§Ã£o `fetchReport` para evitar requisiÃ§Ãµes sem `userId`, `startDate` ou `endDate`, retornando preventivamente e definindo o estado como `[]`.
    2. Implementado fallback com operador de coalescÃªncia nula (`res.data ?? []`) e fallback explÃ­cito no bloco `catch` em todas as rotas de carregamento (`fetchReport`, `fetchHistory`, `fetchSchedules`, `fetchAllUsers` e `fetchPendingAdjustments`).
    3. Protegidos todos os acessos por `.map()`, `.filter()`, `.find()`, `.reduce()` e agrupamento utilizando o operador `(estado ?? [])`.
  * *Data e hora da alteraÃ§Ã£o:* 03/06/2026 Ã s 13:45 (HorÃ¡rio Local)
  * *Arquivos modificados:* `src/pages/Ponto.tsx`

* **Erro HTTP 400 ao Cadastrar/Atualizar FuncionÃ¡rio:**
  * *Causa Raiz:* No envio de novas propriedades de cadastro (como `cpf`, `cargo` e `data_admissao`), as rotas do backend nÃ£o utilizavam valores padrÃµes na desestruturaÃ§Ã£o de `req.body`, resultando em payloads ou colunas inconsistentes que o Supabase rejeitava se os campos estivessem ausentes. No frontend, a inicializaÃ§Ã£o e a mÃ¡scara de formataÃ§Ã£o do CPF nÃ£o seguiam o padrÃ£o exato exigido.
  * *SoluÃ§Ã£o Aplicada:*
    1. Ajustadas as rotas `POST /api/users` e `PUT /api/users/:id` no backend `api/index.ts` para desestruturar `cpf = null`, `cargo = null` e `data_admissao = null` do `req.body` com valores padrÃ£o nulos.
    2. Modificado o estado inicial do formulÃ¡rio no frontend `src/pages/Funcionarios.tsx` para inicializar `cargo` com `''` (string vazia).
    3. Adicionada a opÃ§Ã£o padrÃ£o `Selecione o cargo` no menu select de cargos do formulÃ¡rio para guiar o usuÃ¡rio na seleÃ§Ã£o.
    4. Atualizada a mÃ¡scara de formataÃ§Ã£o incremental do CPF para usar o padrÃ£o regex literal solicitado.
  * *Data e hora da alteraÃ§Ã£o:* 03/06/2026 Ã s 13:48 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/Funcionarios.tsx`

* **Ciclo de Vida de Armazenamento e Limpeza AutomÃ¡tica de MÃ­dias (R2 e Supabase Storage):**
  * *Causa Raiz:* NÃ£o existia uma limpeza periÃ³dica de mÃ­dias enviadas no WhatsApp (`whatsapp-media`), gerando acÃºmulo ilimitado de arquivos no Supabase Storage. O cronjob do R2 (`cleanup-r2`) usava uma lÃ³gica de intervalo dinÃ¢mico que nÃ£o correspondia exatamente Ã  filtragem recomendada no banco de dados.
  * *SoluÃ§Ã£o Aplicada:*
    1. Corrigida a lÃ³gica de filtragem da data de corte no cronjob `cleanup-r2` no `api/index.ts` usando `setDate(getDate() - 90)` de forma direta e segura.
    2. Desenvolvido o novo cronjob `GET /api/cron/cleanup-whatsapp-media` no backend para buscar mÃ­dias do WhatsApp com mais de 120 dias, extrair o caminho relativo dos arquivos a partir da `media_url`, removÃª-los do Supabase Storage via `supabaseAdmin.storage.from(...).remove` e atualizar o banco para `media_url = null` (processados em lotes de 50 registros para evitar timeout).
    3. Cadastrada a rota do novo cronjob no arquivo `vercel.json` sob o agendamento `"0 3 2 * *"` (dia 2 de cada mÃªs).
  * *Data e hora da alteraÃ§Ã£o:* 03/06/2026 Ã s 13:58 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `vercel.json`

* **AlteraÃ§Ã£o da Opacidade do Logotipo (`PNG_-_MT_SOLAR__1_.png`):**
  * *Causa Raiz:* O logotipo institucional de fundo estava com opacidade muito alta, interferindo na legibilidade dos textos e layouts das telas.
  * *SoluÃ§Ã£o Aplicada:* Processado o arquivo de imagem no canal alpha para definir a opacidade mÃ¡xima como 15%, suavizando sua exibiÃ§Ã£o em toda a aplicaÃ§Ã£o.
  * *Data e hora da alteraÃ§Ã£o:* 03/06/2026 Ã s 14:10 (HorÃ¡rio Local)
  * *Arquivos modificados:* `public/PNG_-_MT_SOLAR__1_.png`

* **Erro HTTP 400 ao Cadastrar e Listagem Vazia na PÃ¡gina de FuncionÃ¡rios (PGRST204):**
  * *Causa Raiz:* O PostgREST do Supabase retornava erro `PGRST204` em trÃªs rotas (`GET`, `POST` e `PUT /api/users`) porque as colunas `cpf`, `cargo` e `data_admissao` ainda nÃ£o foram criadas na tabela `users`. O `GET` retornava `null` silenciosamente (lista vazia na tela), o `POST` retornava HTTP 400 (cadastro falhava) e o `PUT` idem.
  * *SoluÃ§Ã£o Aplicada:* Implementado **fallback automÃ¡tico com cÃ³digo de erro `PGRST204`** nas trÃªs rotas do `api/index.ts`:
    1. `GET /api/users`: tenta buscar com campos extras; se `PGRST204`, retenta sem eles â€” a lista de funcionÃ¡rios sempre Ã© retornada.
    2. `POST /api/users`: tenta inserir com `cpf`/`cargo`/`data_admissao`; se `PGRST204`, retenta com apenas os campos obrigatÃ³rios.
    3. `PUT /api/users/:id`: mesma lÃ³gica de fallback para atualizaÃ§Ãµes.
  * *AÃ§Ã£o pendente:* Executar o SQL abaixo no editor do Supabase para ativar o salvamento dos campos opcionais:
    ```sql
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='cpf') THEN
        ALTER TABLE users ADD COLUMN cpf TEXT;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='cargo') THEN
        ALTER TABLE users ADD COLUMN cargo TEXT;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='data_admissao') THEN
        ALTER TABLE users ADD COLUMN data_admissao TIMESTAMP WITH TIME ZONE;
      END IF;
    END $$;
    ```
  * *Data e hora da alteraÃ§Ã£o:* 03/06/2026 Ã s 14:42 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`







* **URLs de MÃ­dia Nulas para Mensagens Enviadas (`from_me = true`):**
  * *Causa Raiz:* No envio de mÃ­dias e Ã¡udios, a URL temporÃ¡ria ou arquivo `base64` era enviado para a Evolution API, mas no `INSERT` da tabela `whatsapp_messages` a coluna `media_url` era mantida nula. AlÃ©m disso, o arquivo temporÃ¡rio da mÃ­dia no bucket `whatsapp-media` era deletado imediatamente apÃ³s o envio bem-sucedido para economizar espaÃ§o de storage.
  * *SoluÃ§Ã£o Aplicada:* Ajustadas as rotas `/api/whatsapp/send-media` e `/api/whatsapp/send-audio` no backend Express. Agora, antes de inserir a mensagem, o backend gera uma URL pÃºblica definitiva pelo storage com `supabaseAdmin.storage.from(...).getPublicUrl(filePath)`, preenche a propriedade `media_url` na query de `INSERT` e mantÃ©m o arquivo gravado no bucket de forma permanente.
* **404 na Evolution API:**
  * *Causa Raiz:* InconsistÃªncias na URL final enviada Ã  Evolution API por falta de validaÃ§Ã£o rigorosa dos nomes das instÃ¢ncias ativas (que vinham com espaÃ§os e letras maiÃºsculas).
  * *SoluÃ§Ã£o:* Implementado tratamento estrito de nomes de instÃ¢ncias via Express antes de repassar a requisiÃ§Ã£o (conversÃ£o para lowercase e substituiÃ§Ã£o de espaÃ§os por hÃ­fens).
* **Erro 400 no Supabase Storage via RLS:**
  * *Causa Raiz:* O envio de arquivos pelo front-end falhava intermitentemente por falta de permissÃ£o de escrita de usuÃ¡rios nÃ£o autenticados no bucket.
  * *SoluÃ§Ã£o:* SubstituÃ­do o cliente anÃ´nimo por `supabaseAdmin` utilizando a chave privada master `SUPABASE_SERVICE_ROLE_KEY` exclusivamente no backend Express para realizar o upload das mÃ­dias.
* **Sistema de Etiquetas NÃ£o Salvando (Multi-Tag):**
  * *Causa Raiz (1 â€” Banco):* A tabela `whatsapp_conversations` possuÃ­a apenas a coluna `tag TEXT` (singular), incapaz de armazenar mÃºltiplas etiquetas. A coluna `tags TEXT[]` nÃ£o existia, fazendo o UPDATE retornar erro `42703` silencioso do PostgreSQL.
  * *Causa Raiz (2 â€” Backend):* A rota `PUT /api/conversations/:id/tag` atualizava a coluna `tag` com uma string Ãºnica em vez de receber e persistir um array na coluna `tags`.
  * *Causa Raiz (3 â€” Frontend):* A interface `Conversation` tipava o campo como `tag?: string | null` e a funÃ§Ã£o `updateTag` enviava uma string Ãºnica, sem lÃ³gica de toggle ou suporte a mÃºltiplos valores.
  * *SoluÃ§Ã£o Aplicada:*
    1. Executado `ALTER TABLE whatsapp_conversations ADD COLUMN tags TEXT[] DEFAULT '{}'` no SQL Editor do Supabase.
    2. Migrados dados histÃ³ricos: `UPDATE whatsapp_conversations SET tags = ARRAY[tag] WHERE tag IS NOT NULL AND tag != ''`.
    3. Atualizada a rota backend para ler `{ tags }` do body e gravar `{ tags: tags ?? [] }` na coluna correta.
    4. Atualizado o frontend: interface alterada para `tags?: string[] | null`, funÃ§Ã£o `updateTag` com lÃ³gica de toggle (adiciona/remove do array), dropdown com checkboxes visuais e renderizaÃ§Ã£o de mÃºltiplas tags coloridas por conversa.

* **Bloqueio de Conversa em Atendimento por Outro Agente:**
  * *Contexto:* Antes da implementaÃ§Ã£o, nÃ£o havia bloqueio do tipo "conversa em uso" â€” qualquer agente podia ler e responder mensagens de conversas que jÃ¡ estavam sendo atendidas por outro colega, gerando conflito de atendimento.
  * *SoluÃ§Ã£o Aplicada:*
    1. Criada nova rota `GET /api/conversations/:id/messages` no backend que, antes de retornar mensagens, verifica se `status = 'in_progress'`, `assigned_to IS NOT NULL` e `assigned_to != req.user.id`. Caso confirmado e o role nÃ£o for CEO, retorna HTTP 403 com `{ error: 'CONVERSATION_LOCKED', assignedTo: nome_do_agente }`.
    2. Adicionada a mesma validaÃ§Ã£o nas rotas `POST /api/whatsapp/send`, `POST /api/whatsapp/send-media` e `POST /api/whatsapp/send-audio` via helper `checkConversationLock()`.
    3. No frontend (`WhatsApp.tsx`): adicionados estados `isLocked` e `lockedByName`. A funÃ§Ã£o `fetchMessages` agora chama o backend via `api.get()` (em vez de Supabase direto) e trata o erro 403 setando `isLocked = true`. Ao trocar de conversa, os estados sÃ£o resetados. No lugar do campo de mensagem, exibe-se um aviso amarelo com Ã­cone de cadeado e o nome do agente responsÃ¡vel.
* **Cronjobs de Mensagens AutomÃ¡ticas de HorÃ¡rio:**
  * Adicionadas 3 novas rotas `POST` no backend e 3 entradas no `vercel.json` para disparar mensagens automÃ¡ticas de horÃ¡rio (inÃ­cio de expediente, almoÃ§o e fim de expediente) para todas as conversas com `status = 'in_progress'`, utilizando as credenciais de instÃ¢ncia de cada empresa via `getEvolutionApiCredentials()`.
* **Scroll no HistÃ³rico do Gerador de Propostas:**
  * *O que foi feito:* AdiÃ§Ã£o das classes CSS `overflow-y-auto` e `max-h-96` ao container div que envolve a tabela na aba de histÃ³rico do gerador de propostas. Isso habilita o scroll vertical, permitindo visualizar todos os registros sem limitaÃ§Ã£o ou quebra de layout.
  * *Data e hora da alteraÃ§Ã£o:* 01/06/2026 Ã s 15:11 (HorÃ¡rio Local)
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`
* **Filtro de Projetos Finalizados nas HomologaÃ§Ãµes do Dashboard:**
  * *O que foi feito:* AdiÃ§Ã£o de condiÃ§Ãµes no `.filter()` da listagem de homologaÃ§Ãµes no arquivo `Dashboard.tsx` para excluir projetos que possuam `current_stage` como `'conclusion'` ou `status` como `'completed'`.
  * *Data e hora da alteraÃ§Ã£o:* 01/06/2026 Ã s 15:12 (HorÃ¡rio Local)
  * *Arquivos modificados:* `src/pages/Dashboard.tsx`
* **Campo de Input NumÃ©rico para OrdenaÃ§Ã£o no Cronograma:**
  * *O que foi feito:* SubstituiÃ§Ã£o dos botÃµes de seta por um componente de input numÃ©rico (`OrderInput`) na listagem do cronograma de obras (`ObraSchedule.tsx`). O input permite ao usuÃ¡rio digitar diretamente a posiÃ§Ã£o de reordenaÃ§Ã£o do cliente, e dispara a movimentaÃ§Ã£o e reordenaÃ§Ã£o no blur ou pressionando Enter.
* **CriaÃ§Ã£o das Tabelas de Controle de Ponto no Supabase (Parte 1):**
  * *O que foi feito:* CriaÃ§Ã£o das tabelas `work_schedules` (horÃ¡rios de trabalho), `time_records` (registros de ponto) e `time_adjustments` (ajustes de ponto), alÃ©m de Ã­ndices de performance (`idx_time_records_company_user`, `idx_time_records_timestamp`, `idx_time_adjustments_company`, `idx_work_schedules_company_role`) no banco de dados Supabase do projeto para suporte ao sistema de jornada de colaboradores.
  * *Data e hora da alteraÃ§Ã£o:* 02/06/2026 Ã s 04:18 (HorÃ¡rio Local)
  * *Arquivos modificados:* Nenhum arquivo de cÃ³digo modificado diretamente (criaÃ§Ã£o via SQL Editor do Supabase); atualizado o resumo mestre do banco de dados em `RESUMO_MESTRE_GESTAO_MTSOLAR.md`.
* **InstalaÃ§Ã£o das DependÃªncias do Cloudflare R2 / GeolocalizaÃ§Ã£o e CriaÃ§Ã£o do Cliente R2 (Parte 2):**
  * *O que foi feito:* InstalaÃ§Ã£o das dependÃªncias `@aws-sdk/client-s3` e `@aws-sdk/s3-request-presigner` via npm, instalaÃ§Ã£o e sincronizaÃ§Ã£o do plugin `@capacitor/geolocation` no wrapper mobile do Capacitor, e criaÃ§Ã£o do arquivo de cliente Cloudflare R2 em `api/r2.ts` com funÃ§Ãµes utilitÃ¡rias de upload, delete e listagem de arquivos.
  * *Data e hora da alteraÃ§Ã£o:* 02/06/2026 Ã s 04:21 (HorÃ¡rio Local)
  * *Arquivos modificados:* `package.json`, `package-lock.json`, `api/r2.ts` (novo arquivo), `android/app/src/main/assets/capacitor.config.json` (gerado/atualizado pelo capacitor sync).
* **ImplementaÃ§Ã£o das Rotas de Ponto EletrÃ´nico (Parte 4):**
  * *O que foi feito:* AdiÃ§Ã£o da importaÃ§Ã£o do cliente Cloudflare R2 em `api/index.ts` e implementaÃ§Ã£o de todas as rotas do mÃ³dulo de Ponto EletrÃ´nico (horÃ¡rios de expedientes, registro de ponto com selfie e localizaÃ§Ã£o, listagem de histÃ³rico, relatÃ³rios por usuÃ¡rio, solicitaÃ§Ãµes de ajuste e moderaÃ§Ã£o de ajustes por administradores).
  * *Data e hora da alteraÃ§Ã£o:* 02/06/2026 Ã s 04:29 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`
* **Cronjob de Limpeza de Selfies no Cloudflare R2 (Parte 5):**
  * *O que foi feito:* AdiÃ§Ã£o da rota `GET /api/cron/cleanup-r2` em `api/index.ts` que exclui do R2 (e limpa os campos `selfie_url` e `selfie_path` no Supabase) selfies de registros de ponto com mais de 90 dias. Registrada a entrada correspondente no `vercel.json` com schedule mensal (`0 3 1 * *`, Ã s 03:00 UTC do dia 1 de cada mÃªs).
  * *Data e hora da alteraÃ§Ã£o:* 02/06/2026 Ã s 04:32 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `vercel.json`
* **CriaÃ§Ã£o da Tela de Ponto EletrÃ´nico no Frontend (Parte 6):**
  * *O que foi feito:* CriaÃ§Ã£o da pÃ¡gina `src/pages/Ponto.tsx` implementando a interface visual completa do Ponto EletrÃ´nico (batida de ponto com integraÃ§Ã£o do plugin `@capacitor/camera` para captura de selfie e `@capacitor/geolocation` para obter latitude e longitude, histÃ³rico pessoal de registros de ponto com solicitaÃ§Ã£o de ajustes de horÃ¡rio justificados, visualizaÃ§Ã£o de espelho de ponto com cÃ¡lculo de horas trabalhadas diÃ¡rias e mensais, painel de relatÃ³rios do gestor com exportaÃ§Ã£o de PDF utilizando `jsPDF`, configuraÃ§Ã£o de horÃ¡rios de expediente por funÃ§Ã£o e moderaÃ§Ã£o de solicitaÃ§Ãµes de ajuste pendentes).
  * *Data e hora da alteraÃ§Ã£o:* 02/06/2026 Ã s 04:41 (HorÃ¡rio Local)
  * *Arquivos modificados:* `src/pages/Ponto.tsx`
* **Registro de Rota de Ponto EletrÃ´nico e PermissÃµes do Android (Parte 7):**
  * *O que foi feito:* Registro da rota protegida `/ponto` em `src/App.tsx` para todas as roles (`CEO`, `ADMIN`, `COMMERCIAL`, `TECHNICAL`) e adiÃ§Ã£o do caminho aos autorizados para a role de vendedor (`COMMERCIAL`). AdiÃ§Ã£o das permissÃµes nativas de localizaÃ§Ã£o (`ACCESS_FINE_LOCATION` e `ACCESS_COARSE_LOCATION`) no `android/app/src/main/AndroidManifest.xml` e execuÃ§Ã£o bem-sucedida do `npx cap sync` para sincronizar os arquivos de build Gradle e plugins nativos no wrapper do Capacitor.
  * *Data e hora da alteraÃ§Ã£o:* 02/06/2026 Ã s 04:43 (HorÃ¡rio Local)
  * *Arquivos modificados:* `src/App.tsx`, `android/app/src/main/AndroidManifest.xml`, `android/app/capacitor.build.gradle` (e outros arquivos gerados pelo Capacitor sync)
* **AdiÃ§Ã£o do Item "Ponto EletrÃ´nico" no Menu Lateral de NavegaÃ§Ã£o (Parte 8):**
  * *O que foi feito:* AdiÃ§Ã£o da importaÃ§Ã£o do Ã­cone `Clock` do `lucide-react` no arquivo `src/components/Layout.tsx`, inclusÃ£o da opÃ§Ã£o "Ponto EletrÃ´nico" (caminho `/ponto`, Ã­cone `Clock`) no array de rotas visÃ­veis `menuItems` (liberado para todas as roles) e inclusÃ£o da rota na lista `allowedPaths` para permitir a exibiÃ§Ã£o do menu lateral para a role de vendedor (`COMMERCIAL`).
  * *Data e hora da alteraÃ§Ã£o:* 02/06/2026 Ã s 04:45 (HorÃ¡rio Local)
  * *Arquivos modificados:* `src/components/Layout.tsx`
* **Filtro de PerÃ­odo Personalizado no Ponto EletrÃ´nico e RelatÃ³rio PDF:**
  * *O que foi feito:* SubstituiÃ§Ã£o do seletor de mÃªs fixo por inputs de Data Inicial e Data Final na aba de relatÃ³rios do gestor. Ajuste da busca de registros de ponto no backend utilizando a query de perÃ­odo customizado. RefatoraÃ§Ã£o completa da funÃ§Ã£o de exportaÃ§Ã£o de PDF (`generatePDF` usando `jsPDF`) para incluir o nome da empresa e CNPJ consultados da tabela `companies` do Supabase, o perÃ­odo do relatÃ³rio formatado em DD/MM/AAAA, o nome e o cargo do colaborador, o quadro de expediente esperado de acordo com a tabela `work_schedules` baseada no `role` do colaborador, a tabela diÃ¡ria completa contendo o dia da semana e uma nova coluna de ObservaÃ§Ãµes informando se o ponto foi batido fora do local de interesse (latitude/longitude nulos indicando "Sem localizaÃ§Ã£o registrada"), alÃ©m de rodapÃ© com o total acumulado de horas e linha de assinatura.
  * *Data e hora da alteraÃ§Ã£o:* 03/06/2026 Ã s 09:45 (HorÃ¡rio Local)
  * *Arquivos modificados:* `src/pages/Ponto.tsx`
* **ExclusÃ£o de Registros de Ponto por FuncionÃ¡rio Demitido (Somente CEO):**
  * *O que foi feito:* AdiÃ§Ã£o da rota DELETE `/api/ponto/usuario/:userId/registros` no Express, protegida com autenticaÃ§Ã£o e restrita ao role de CEO, garantindo o isolamento multi-tenant (`company_id`). No frontend (`src/pages/Ponto.tsx`), implementada exibiÃ§Ã£o condicional do botÃ£o "Excluir todos os registros" com Ã­cone de lixeira (`Trash2`) apenas para usuÃ¡rios logados como CEO. Criado modal de confirmaÃ§Ã£o antes de disparar o delete na API e, em caso de sucesso, o estado local Ã© limpo e uma notificaÃ§Ã£o Ã© exibida.
  * *Data e hora da alteraÃ§Ã£o:* 03/06/2026 Ã s 09:50 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/Ponto.tsx`
* **CorreÃ§Ã£o de GeolocalizaÃ§Ã£o no APK e VisualizaÃ§Ã£o do Local (Parte 3):**
  * *O que foi feito:* AdiÃ§Ã£o da tag `<uses-feature android:name="android.hardware.location.gps" android:required="false" />` no `android/app/src/main/AndroidManifest.xml` para robustez de localizaÃ§Ã£o. No frontend (`src/pages/Ponto.tsx`), criada a funÃ§Ã£o helper assÃ­ncrona `capturarLocalizacao` que requisita explicitamente permissÃ£o de localizaÃ§Ã£o (`Geolocation.requestPermissions()`) antes de consultar a posiÃ§Ã£o atual. O fluxo `handlePunch` foi ajustado para prosseguir de forma nÃ£o bloqueante caso a geolocalizaÃ§Ã£o falhe, exibindo o aviso "LocalizaÃ§Ã£o nÃ£o capturada. O ponto serÃ¡ registrado sem geolocalizaÃ§Ã£o.". No histÃ³rico de ponto (colaborador e gestor), adicionado o Ã­cone de mapa (`MapPin`) ao lado do horÃ¡rio da batida, estilizado em cinza se a geolocalizaÃ§Ã£o for nula, ou em verde e clicÃ¡vel (abrindo link do Google Maps em nova aba) caso a localizaÃ§Ã£o esteja preenchida.
  * *Data e hora da alteraÃ§Ã£o:* 03/06/2026 Ã s 09:55 (HorÃ¡rio Local)
  * *Arquivos modificados:* `android/app/src/main/AndroidManifest.xml`, `src/pages/Ponto.tsx`
* **Cadastro de FuncionÃ¡rios Vinculado ao Ponto EletrÃ´nico (Parte 4):**
  * *O que foi feito:* CriaÃ§Ã£o da nova pÃ¡gina `src/pages/Funcionarios.tsx` para cadastro, ediÃ§Ã£o e gestÃ£o de funcionÃ¡rios, restrita aos papÃ©is de `CEO` e `ADMIN`. A pÃ¡gina exibe a listagem completa de colaboradores com botÃµes para Editar, Desativar/Reativar e um botÃ£o de Ponto (Ã­cone `Clock`) com tooltip "Ver ponto" que redireciona para a rota `/ponto?userId={id}`. No arquivo `src/pages/Ponto.tsx`, implementada a leitura do query parameter `userId` via `useSearchParams()`. Ao detectar o ID na URL, o sistema prÃ©-seleciona automaticamente o colaborador no dropdown e carrega de imediato o espelho de ponto correspondente na aba de gestor. Por fim, a nova pÃ¡gina foi registrada como rota preguiÃ§osa (`lazy`) no `src/App.tsx` (restrita a `CEO` e `ADMIN`) e associada ao menu de navegaÃ§Ã£o lateral em `src/components/Layout.tsx` com o Ã­cone `Users`.
  * *Data e hora da alteraÃ§Ã£o:* 03/06/2026 Ã s 10:00 (HorÃ¡rio Local)
  * *Arquivos modificados:* `src/pages/Funcionarios.tsx` (novo), `src/pages/Ponto.tsx`, `src/App.tsx`, `src/components/Layout.tsx`
* **Contrato PDF: CorreÃ§Ã£o do Fundo e do RodapÃ© (Parte 5):**
  * *O que foi feito:* No gerador de PDFs do contrato (`src/pages/Contracts.tsx`), removemos a imagem embaÃ§ada de fundo (`/Papel_-_timbrado.png`) da funÃ§Ã£o `addBackground()`, substituindo-a por um preenchimento de fundo branco puro (`doc.setFillColor(255, 255, 255)` e `doc.rect(0, 0, pageWidth, pageHeight, 'F')`). Ajustamos a verificaÃ§Ã£o de limite de pÃ¡gina da funÃ§Ã£o `addText` para `pageHeight - 30` (267mm) para respeitar a margem inferior do rodapÃ© de 25mm. Adicionamos uma validaÃ§Ã£o de overflow de pÃ¡gina logo antes do bloco de assinaturas para garantir que as assinaturas nÃ£o se sobreponham ao rodapÃ©, gerando uma nova pÃ¡gina caso necessÃ¡rio. Por fim, implementamos um laÃ§o de repetiÃ§Ã£o que percorre todas as pÃ¡ginas geradas (`doc.setPage(i)`), desenha uma linha separadora fina e imprime o rodapÃ© corporativo institucional padronizado (CNPJ, e-mail, telefone, endereÃ§o) centralizado e a paginaÃ§Ã£o `PÃ¡gina X de Y` Ã  direita.
  * *Data e hora da alteraÃ§Ã£o:* 03/06/2026 Ã s 10:05 (HorÃ¡rio Local)
  * *Arquivos modificados:* `src/pages/Contracts.tsx`
* **Proposta Comercial PDF: CorreÃ§Ã£o de Layout e PaginaÃ§Ã£o (Parte 6):**
  * *O que foi feito:* Refatoramos a geraÃ§Ã£o da pÃ¡gina de fotos do PDF da proposta comercial no `src/pages/ProposalGenerator.tsx` definindo margens fixas horizontais/verticais (15mm/20mm) e implementando controle estrito de cursor vertical (`y = margemSuperior`). Quando uma imagem nÃ£o cabe no espaÃ§o restante da pÃ¡gina (`y + photoHeight > pageHeight - margemInferior`), a pÃ¡gina Ã© quebrada com `doc.addPage()` e o cursor reiniciado. AlÃ©m disso, criamos um loop de pÃ³s-processamento que percorre todas as pÃ¡ginas geradas para desenhar uma linha divisÃ³ria discreta a 20mm da base, o rodapÃ© corporativo institucional e a paginaÃ§Ã£o automÃ¡tica (`PÃ¡gina X de Y`). A partir da pÃ¡gina 2, desenha tambÃ©m um cabeÃ§alho simplificado com a proposta (`PROP-${proposalNumber}`) e o nome do cliente.
  * *Data e hora da alteraÃ§Ã£o:* 03/06/2026 Ã s 10:11 (HorÃ¡rio Local)
* **Cadastro e AtualizaÃ§Ã£o de Colaboradores com CPF, Cargo e Data de AdmissÃ£o (Melhoria 2):**
  * *O que foi feito:*
    * **Backend (`api/index.ts`):** AtualizaÃ§Ã£o das rotas `GET`, `POST` e `PUT` de `/api/users` para persistir e retornar os campos `cpf`, `cargo` e `data_admissao` na tabela `users` do Supabase.
    * **Frontend (`Funcionarios.tsx`):** CriaÃ§Ã£o/atualizaÃ§Ã£o do formulÃ¡rio para inclusÃ£o de CPF com mÃ¡scara `000.000.000-00` obrigatÃ³rio, select de cargo obrigatÃ³rio (CEO, ADMIN, COMMERCIAL, TECHNICAL) e data de admissÃ£o opcional.
    * **Espelho de Ponto (`Ponto.tsx`):** InclusÃ£o desses novos campos formatados no cabeÃ§alho do PDF do espelho de ponto.
  * *Data e hora da alteraÃ§Ã£o:* 03/06/2026 Ã s 11:30 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/Funcionarios.tsx`, `src/pages/Ponto.tsx`

* **Marca D'Ã¡gua com Logomarca no PDF do Contrato (Melhoria 3):**
  * *O que foi feito:* InclusÃ£o da logomarca `/PNG_-_MT_SOLAR__1_.png` como marca d'Ã¡gua centralizada em todas as pÃ¡ginas do PDF do contrato gerado em `Contracts.tsx`. A imagem Ã© carregada e convertida em base64, escalada dinamicamente mantendo a proporÃ§Ã£o com largura de 120mm e inserida com opacidade de 30% (`doc.setGState` com `opacity: 0.3`).
  * *Data e hora da alteraÃ§Ã£o:* 03/06/2026 Ã s 11:55 (HorÃ¡rio Local)
  * *Arquivos modificados:* `src/pages/Contracts.tsx`

* **CorreÃ§Ã£o de RodapÃ© na Proposta Comercial com Muitos Materiais (Melhoria 4):**
  * *O que foi feito:* ImplementaÃ§Ã£o de paginaÃ§Ã£o dinÃ¢mica para a tabela de materiais de estrutura na proposta comercial em `ProposalGenerator.tsx`. Define margem inferior de 35mm e verifica antes de cada linha se ultrapassa `pageHeight - 35`. Em caso positivo, quebra pÃ¡gina, reinicia cursor y em 20mm e desenha novamente o cabeÃ§alho (Item, DescriÃ§Ã£o, Qtd, Valor Unit., Valor Total) na nova pÃ¡gina.
  * *Data e hora da alteraÃ§Ã£o:* 03/06/2026 Ã s 12:12 (HorÃ¡rio Local)
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`

* **NotificaÃ§Ãµes Push com APK Fechado â€” Background/Killed State (Melhoria 5):**
  * *O que foi feito:*
    * **Backend (`api/index.ts`):** RefatoraÃ§Ã£o da funÃ§Ã£o `sendPushNotification` para payload data-only (apenas campo `data`, sem campo `notification`), garantindo trÃ¡fego FCM de alta prioridade e entrega com app fechado/morto.
    * **AndroidManifest.xml:** Registro do serviÃ§o de recepÃ§Ã£o do Firebase associado ao serviÃ§o customizado.
    * **`MyFirebaseMessagingService.java` (Novo):** CriaÃ§Ã£o do serviÃ§o nativo para capturar mensagens de dados, criar canal de notificaÃ§Ã£o com som/vibraÃ§Ã£o no Oreo+ e disparar a notificaÃ§Ã£o local via `NotificationCompat` direcionada para abrir a Activity principal.
  * *Data e hora da alteraÃ§Ã£o:* 03/06/2026 Ã s 12:15 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `android/app/src/main/AndroidManifest.xml`, `android/app/src/main/java/io/ionic/starter/MyFirebaseMessagingService.java`

* **NotificaÃ§Ã£o Push em Mensagens de Entrada no WhatsApp Atendimento (Melhoria 6):**
  * *O que foi feito:* Adicionada lÃ³gica no webhook de recebimento de mensagens (`POST /api/webhooks/whatsapp` em `api/index.ts`) para disparar notificaÃ§Ã£o push ao agente responsÃ¡vel caso a mensagem seja de entrada (`from_me = false`). O sistema busca a conversa no banco, obtÃ©m o campo `assigned_to` e, se preenchido, recupera o `push_token` correspondente daquele usuÃ¡rio com validaÃ§Ã£o de `company_id`. Se existir, aciona a funÃ§Ã£o `sendPushNotification` com payload data-only: tÃ­tulo baseado no nome do contato da conversa (ou o nÃºmero de telefone se nulo), corpo limitando a mensagem em 80 caracteres (ou "ðŸ“Ž MÃ­dia recebida" se for mensagem multimÃ­dia), tipo definido como "whatsapp_message" e o UUID da conversa correspondente. Se a conversa nÃ£o estiver atribuÃ­da (fila de espera), nada Ã© disparado.
  * *Data e hora da alteraÃ§Ã£o:* 03/06/2026 Ã s 12:20 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`

* **CorreÃ§Ã£o de Pacote Java do MyFirebaseMessagingService e GeraÃ§Ã£o do Android App Bundle (.aab) Assinado:**
  * *O que foi feito:*
    * **Problema identificado:** O arquivo `MyFirebaseMessagingService.java` estava declarado no pacote legado `io.ionic.starter` (template Ionic), incompatÃ­vel com o namespace real do projeto `br.com.mtsolar.gestao`. Isso causava erros de compilaÃ§Ã£o `cannot find symbol` para `MainActivity.class` e `R.mipmap.ic_launcher`.
    * **SoluÃ§Ã£o aplicada:**
      1. Criado novo `MyFirebaseMessagingService.java` no pacote correto `br.com.mtsolar.gestao` em `android/app/src/main/java/br/com/mtsolar/gestao/`.
      2. Removido o arquivo antigo do pacote `io.ionic.starter`.
      3. Atualizado `AndroidManifest.xml` para referenciar o serviÃ§o no novo pacote (`br.com.mtsolar.gestao.MyFirebaseMessagingService`).
    * **Build gerado:** `app-release.aab` (6,11 MB), assinado com a keystore `mtsolar.jks` localizada em `C:\Users\aurel\Desktop\APK\`, certificado `CN=Marcos Nascimento`, algoritmo `SHA256withRSA`, chave RSA de 2048 bits, vÃ¡lido atÃ© `01/05/2051`. VerificaÃ§Ã£o `jarsigner`: **`jar verified`**.
    * **LocalizaÃ§Ã£o do arquivo final:** `android/app/build/outputs/bundle/release/app-release.aab` (e cÃ³pia em `C:\Users\aurel\Desktop\APK\app-release.aab`).
    * **ConfiguraÃ§Ã£o de assinatura no `build.gradle`:** `storeFile = C:\Users\aurel\Desktop\APK\mtsolar.jks`, `keyAlias = mtsolar`, `minifyEnabled = true`.
  * *Data e hora da alteraÃ§Ã£o:* 04/06/2026 Ã s 16:51 (HorÃ¡rio Local)
  * *Arquivos modificados:* `android/app/src/main/java/br/com/mtsolar/gestao/MyFirebaseMessagingService.java` (novo), `android/app/src/main/AndroidManifest.xml`

* **Incremento de VersÃ£o (versionCode 9 / versionName 1.0.1) e Novo Bundle app-release-v2.aab:**
  * *O que foi feito:*
    * **`android/app/build.gradle`:** `versionCode` incrementado de `8` para `9` e `versionName` atualizado de `"1.2.5"` para `"1.0.1"` dentro do bloco `defaultConfig`.
    * **Build gerado:** `bundleRelease` executado com sucesso em â‰ˆ18s via `.\gradlew bundleRelease` â€” **BUILD SUCCESSFUL (252 tasks, 15 executadas, 237 up-to-date)**.
    * **Arquivo final:** `app-release.aab` (6,11 MB), assinado com a keystore `mtsolar.jks` (`CN=Marcos Nascimento`, RSA 2048 bits, vÃ¡lido atÃ© 01/05/2051).
    * **CÃ³pia de entrega:** `C:\Users\aurel\Desktop\APK\app-release-v2.aab`.
  * *Data e hora da alteraÃ§Ã£o:* 04/06/2026 Ã s 19:38 (HorÃ¡rio Local)
  * *Arquivos modificados:* `android/app/build.gradle`

* **AlteraÃ§Ã£o de applicationId para com.mtsolar.mtsolv e Novo .aab Gerado:**
  * *O que foi feito:*
    * **`android/app/build.gradle`:** `applicationId` alterado de `br.com.mtsolar.gestao` para `com.mtsolar.mtsolv`. O `namespace` permaneceu `br.com.mtsolar.gestao` (controla o pacote de `R` e `BuildConfig`).
    * **`android/app/src/main/java/com/mtsolar/mtsolv/MyFirebaseMessagingService.java`:** Arquivo Java recriado na nova estrutura de pastas com `package com.mtsolar.mtsolv;`. Os imports de `MainActivity` e `R` apontam explicitamente para `br.com.mtsolar.gestao` onde essas classes sÃ£o geradas/definidas.
    * **`android/app/src/main/AndroidManifest.xml`:** ReferÃªncia do serviÃ§o FCM atualizada para `com.mtsolar.mtsolv.MyFirebaseMessagingService`.
    * **`android/app/google-services.json`:** `package_name` atualizado de `br.com.mtsolar.gestao` para `com.mtsolar.mtsolv` (necessÃ¡rio pois o plugin `google-services` bloqueia o build se nÃ£o houver match).
    * **Build gerado:** `app-release.aab` (6,11 MB) com `applicationId = com.mtsolar.mtsolv` confirmado no manifest compilado (`build/intermediates/bundle_manifest`). Assinado com a keystore `mtsolar.jks` (`CN=Marcos Nascimento`, RSA 2048 bits, vÃ¡lido atÃ© 01/05/2051).
    * **LocalizaÃ§Ã£o:** `android/app/build/outputs/bundle/release/app-release.aab` e cÃ³pia em `C:\Users\aurel\Desktop\APK\app-release.aab`.
  * *Data e hora da alteraÃ§Ã£o:* 04/06/2026 Ã s 17:01 (HorÃ¡rio Local)
  * *Arquivos modificados:* `android/app/build.gradle`, `android/app/src/main/java/com/mtsolar/mtsolv/MyFirebaseMessagingService.java` (novo), `android/app/src/main/AndroidManifest.xml`, `android/app/google-services.json`


* **Implementação do Módulo de Observações de Atendimento (WhatsApp):**
  * *O que foi feito:* Criada a funcionalidade completa de observações internas por conversa no módulo de Atendimento (WhatsApp). A solução adota uma tabela separada `whatsapp_observations` (e não um campo único sobrescrito em `whatsapp_conversations`) para manter um histórico auditável com autoria e timestamp. O campo `user_name` é um snapshot salvo no momento da criação — não sincronizado retroativamente com o nome atual do usuário.
  * *Banco de Dados:* Criada a migration `supabase/migrations/20260625_create_whatsapp_observations.sql` com a tabela completa, índices de performance, RLS habilitada (leitura para toda a empresa; inserção autenticada; sem UPDATE/DELETE), e `NOTIFY pgrst, 'reload schema'` ao final.
  * *Backend:* Criadas as rotas `GET /api/conversations/:id/observations` (lista do mais recente ao mais antigo, filtrado por `company_id` do token) e `POST /api/conversations/:id/observations` (insere nova nota com validação de conversa, `company_id`, `user_id` e `user_name` extraídos do token JWT — nunca do payload do client).
  * *Frontend (Desktop — Painel Direito):* Adicionada seção "Observações do Atendimento" com textarea, botão "Adicionar Nota" e listagem de notas anteriores (autor, data/hora, texto), alimentada pelo estado `observations` buscado automaticamente ao selecionar uma conversa.
  * *Frontend (Mobile):* Adicionado botão de ícone `Info` no cabeçalho do chat (visível apenas em `<lg`) que abre um modal deslizante com o mesmo painel de observações, reutilizando o mesmo estado e funções — sem chamadas duplicadas de API.
  * *⚠️ AÇÃO MANUAL NECESSÁRIA:* Executar a migration no **SQL Editor do Supabase**: `supabase/migrations/20260625_create_whatsapp_observations.sql`
  * *Data e hora da alteração:* 25/06/2026 às 15:37 (Horário Local)
  * *Arquivos modificados:* `supabase/migrations/20260625_create_whatsapp_observations.sql` (novo), `supabase_schema.sql`, `api/index.ts`, `src/pages/WhatsApp.tsx`

---



## 12. DÃ‰BITOS TÃ‰CNICOS

* **Monolito no Arquivo `api/index.ts`:**
  * *Risco:* O arquivo concentra mais de **2.619 linhas** de cÃ³digo unificando autenticaÃ§Ã£o, rotas de projetos comercial, tÃ©cnico, logs, estoque, WhatsApp, webhooks de recebimento, crons e inteligÃªncia artificial. Isso eleva a chance de bugs de concorrÃªncia de variÃ¡veis globais e dificulta manutenÃ§Ãµes.
* **Dupla Coluna de Tag (`tag` e `tags`) na Tabela `whatsapp_conversations`:**
  * *SituaÃ§Ã£o:* A coluna legada `tag TEXT` (singular) ainda existe na tabela ao lado da nova coluna `tags TEXT[]`. Os dados histÃ³ricos foram migrados via script, mas as duas colunas coexistem. Novas gravaÃ§Ãµes via a rota corrigida sÃ³ atualizam `tags`; a coluna `tag` ficarÃ¡ progressivamente desatualizada.
  * *Risco:* ConfusÃ£o em queries futuras, consumo desnecessÃ¡rio de espaÃ§o, e risco de regressÃ£o caso alguma rota antiga ainda referencie `tag`.
  * *AÃ§Ã£o Recomendada:* ApÃ³s confirmar estabilidade, executar `ALTER TABLE whatsapp_conversations DROP COLUMN tag;` para remover a coluna obsoleta.
* **Payloads e Timeouts na Vercel:**
  * *Risco:* FunÃ§Ãµes Serverless gratuitas ou standard na Vercel possuem limites de execuÃ§Ã£o de 10s a 15s. O processamento de downloads de vÃ­deos pesados vindos da Evolution API e subsequente upload no Supabase pode facilmente dar timeout.
* **Uso Extensivo de Tipagem `any`:**
  * *Risco:* VÃ¡rias funÃ§Ãµes e manipulaÃ§Ãµes de respostas do Express e do React no frontend estÃ£o anotadas com `any` ou utilizando diretivas de escape do compilador (`// @ts-ignore`), o que reduz consideravelmente os benefÃ­cios da checagem estÃ¡tica de tipos do TypeScript.
* **Arquivos Sobressalentes / Legado:**
  * *Risco:* PresenÃ§a de arquivos de backup na pasta do cÃ³digo-fonte (ex: `src/pages/Technical.tsx.bak`) que poluem a Ã¡rvore de arquivos e podem confundir desenvolvedores.
* **Rota de TransferÃªncia NÃ£o Atualiza `tags`:**
  * *SituaÃ§Ã£o:* A rota `POST /api/whatsapp/transfer` ao criar o objeto `transferData` ainda define `tag: 'Transferido'` (coluna antiga singular), e **nÃ£o** preenche a coluna `tags` com `['Transferido']`.
  * *Risco:* Conversas transferidas nÃ£o receberÃ£o a etiqueta visual no novo sistema de multi-tags.


---

## 13. BACKLOG E MELHORIAS SUGERIDAS

### TÃ©cnicas
1. **Desacoplamento e OrganizaÃ§Ã£o do Backend:** Dividir o arquivo `/api/index.ts` em uma estrutura modularizada de rotas (ex: `api/routes/auth.ts`, `api/routes/whatsapp.ts`, `api/routes/projects.ts`) e controladores.
2. **UtilizaÃ§Ã£o de Fila de Background Jobs:** Adotar serviÃ§os de fila (como BullMQ, Redis, ou tarefas em background integradas) para o processamento de mÃ­dias de webhooks recebidos do WhatsApp. O Webhook deve retornar `200 OK` imediatamente e agendar o processamento pesado de mÃ­dia em background para evitar timeouts.
3. **Mecanismo de Limpeza PeriÃ³dica de Storage (Data Retention):** MÃ­dias permanentes de chat consomem gigabytes rapidamente. Ã‰ recomendado criar um Cronjob mensal para deletar arquivos e URLs de mensagens com mais de 120 dias no bucket `whatsapp-media`.

### Produto
1. **VisualizaÃ§Ã£o Nativa de Arquivos:** Modificar o visualizador no chat (`WhatsApp.tsx`) para permitir visualizar PDFs de contratos e orÃ§amentos dentro da prÃ³pria conversa em formato iframe/modal sem exigir o download fÃ­sico prÃ©vio.
2. **HistÃ³rico Local de Mensagens:** Desenvolver um botÃ£o na interface do chat para sincronizar e importar as Ãºltimas 50 mensagens anteriores guardadas diretamente no celular da Evolution API para o banco do sistema.


---

## 14. VARIÃVEIS DE AMBIENTE

Abaixo estÃ£o listadas todas as variÃ¡veis cruciais exigidas para o funcionamento local e de produÃ§Ã£o:

### Frontend (Devem possuir o prefixo `VITE_` para exposiÃ§Ã£o ao Vite/Cliente)
* **`VITE_SUPABASE_URL`:** URL base da API do projeto Supabase. Usado para conectar o cliente SDK do banco.
* **`VITE_SUPABASE_ANON_KEY`:** Chave pÃºblica de acesso do Supabase. Segura para exposiÃ§Ã£o pÃºblica.
* **`VITE_EVOLUTION_URL`:** EndereÃ§o pÃºblico do servidor da Evolution API v2 (Railway).
* **`VITE_EVOLUTION_KEY`:** Chave global de acesso de administrador da Evolution API.
* **`VITE_EVOLUTION_INSTANCE_ADMIN`:** Nome padrÃ£o da instÃ¢ncia administrativa (`mtsolar`).
* **`VITE_EVOLUTION_INSTANCE_ATENDIMENTO`:** Nome padrÃ£o da instÃ¢ncia comercial (`atendimento-cliente`).
* **`VITE_EVOLUTION_TOKEN_ATENDIMENTO`:** Token de acesso especÃ­fico da instÃ¢ncia de atendimento ao cliente.

### Backend (Seguras e restritas apenas ao Servidor Express na Vercel)
* **`SUPABASE_SERVICE_ROLE_KEY`:** Chave de administraÃ§Ã£o master do Supabase. Ignora todas as regras de seguranÃ§a RLS (Row Level Security). **NUNCA DEVE SER EXPOSTA NO FRONTEND.**
* **`JWT_SECRET`:** Chave secreta de encriptaÃ§Ã£o usada para assinar e validar a autenticidade dos tokens de sessÃ£o de usuÃ¡rios.
* **`FIREBASE_PROJECT_ID`:** ID de identificaÃ§Ã£o do projeto configurado no console do Google Firebase.
* **`FIREBASE_PRIVATE_KEY`:** Chave privada criptogrÃ¡fica em string do Firebase Admin para autenticaÃ§Ã£o de push.
* **`FIREBASE_CLIENT_EMAIL`:** E-mail de serviÃ§o configurado para comunicaÃ§Ã£o com a API FCM do Firebase.

* **6 CorreÃ§Ãµes Pontuais no Gerador de Contratos PDF (Blocos 1â€“6):**
  * *O que foi feito:*
    * **BLOCO 1 â€” Opacidade da marca d'Ã¡gua:** Aumentada a opacidade da logomarca de fundo no PDF do contrato de `opacity: 0.3` para `opacity: 0.35` (+5 p.p.) via `doc.setGState`.
    * **BLOCO 2 â€” Quebra de pÃ¡gina antes do bloco final:** Restruturada a lÃ³gica de paginaÃ§Ã£o das assinaturas. Agora o sistema prÃ©-calcula a altura total necessÃ¡ria (parÃ¡grafo "E por estarem assim justas...", linha da data, espaÃ§o e as duas colunas de assinatura com labels) e verifica *antes* de renderizar o parÃ¡grafo final se tudo cabe na pÃ¡gina. A quebra, quando necessÃ¡ria, ocorre antes do parÃ¡grafo inicial do bloco, garantindo que parÃ¡grafo, data e assinaturas fiquem sempre juntos.
    * **BLOCO 3 â€” Data sem problema de fuso UTC:** SubstituÃ­da a formaÃ§Ã£o da data no PDF (que usava `new Date(data).toLocaleDateString(...)` e sofria de deslocamento UTC-3) por desestruturaÃ§Ã£o direta da string `YYYY-MM-DD` e montagem com array `mesesPtBR` usando Ã­ndice local. TambÃ©m corrigida a data inicial do campo de formulÃ¡rio (de `toISOString().split('T')[0]` para IIFE com `getFullYear()/getMonth()/getDate()`).
    * **BLOCO 4 â€” MÃ¡scara CPF/CNPJ dinÃ¢mica:** Criada funÃ§Ã£o `formatarCpfCnpj(valor: string): string` que remove nÃ£o-numÃ©ricos, limita a 14 dÃ­gitos e aplica progressivamente a mÃ¡scara `000.000.000-00` (atÃ© 11 dÃ­gitos) ou `00.000.000/0000-00` (12â€“14 dÃ­gitos). Campo alterado para `type="text"`, `inputMode="numeric"` e `maxLength={18}`.
    * **BLOCO 5 â€” Tabela do Kit Fotovoltaico no PDF:** SubstituÃ­da a lista numerada por tabela manual com 3 colunas (Item 15% | Qtd. 15% | Produto 70%), desenhada com `doc.rect()` e `doc.line()`. CabeÃ§alho com fundo azul-claro (`fillColor 230,235,245`), paginaÃ§Ã£o dinÃ¢mica com redesenho de cabeÃ§alho em nova pÃ¡gina, e suporte a quebra de linha automÃ¡tica na coluna Produto.
    * **BLOCO 6 â€” CorreÃ§Ãµes gramaticais e de coesÃ£o:** Aplicadas 8 correÃ§Ãµes de redaÃ§Ã£o nas clÃ¡usulas do contrato (3Âª, 5Âª, 7Âª e 8Âª); correÃ§Ãµes incluem crases ausentes, concordÃ¢ncias verbais, erros de regÃªncia e pontuaÃ§Ã£o. Adicionado comentÃ¡rio `// REVISAR:` no trecho de agente de atendimento da ClÃ¡usula Quinta para revisÃ£o jurÃ­dica futura.
  * *Data e hora da alteraÃ§Ã£o:* 15/06/2026 Ã s 11:30 (HorÃ¡rio Local)
* **5 Novas CorreÃ§Ãµes no Gerador de Contratos PDF (Blocos Aâ€“E):**
  * *O que foi feito:*
    * **DiagnÃ³stico / BLOCO A â€” Opacidade da marca d'Ã¡gua:** O valor de opacidade atual era de `0.35`. O diagnÃ³stico confirmou que existe apenas 1 local de desenho da marca d'Ã¡gua no PDF, e a restauraÃ§Ã£o de opacidade com `doc.setGState(new doc.GState({ opacity: 1.0 }))` ocorre imediatamente depois, na mesma pÃ¡gina, sem vazar. O valor de `0.35` (35%) foi mantido em todas as ocorrÃªncias de marca d'Ã¡gua do arquivo.
    * **BLOCO B â€” Remover o "x" da coluna "Qtd.":** Ajustado o parsing na tabela para remover o "x" exibido ao lado do nÃºmero na coluna de quantidade, alterando a atribuiÃ§Ã£o de `qtdStr` de `${item.quantity}x` para `String(item.quantity)`.
    * **BLOCO C â€” CorreÃ§Ã£o na ClÃ¡usula Quinta:** Alterado o sujeito de "apÃ³s serem reportadas pela CONTRATADA" para "apÃ³s serem reportadas pelo CONTRATANTE", corrigindo o sentido de quem comunica as falhas nos equipamentos e removendo o comentÃ¡rio temporÃ¡rio de revisÃ£o.
    * **BLOCO D â€” EspaÃ§amento apÃ³s a tabela do Kit:** Aumentado o espaÃ§amento entre o tÃ©rmino da tabela do kit fotovoltaico e o tÃ­tulo da ClÃ¡usula Segunda de `3mm` para `8mm` (`currentY += 8;`), criando uma separaÃ§Ã£o consistente.
    * **BLOCO E â€” Ajuste de quebra de pÃ¡gina (bloco final):** Refatorado o cÃ¡lculo de `alturaTotalBlocoFinal` para `alturaParaFinal + 48` (removendo margem redundante de seguranÃ§a), reduzindo a altura calculada de 64mm para 60mm e evitando que o bloco final seja empurrado desnecessariamente para a pÃ¡gina seguinte.
  * *Data e hora da alteraÃ§Ã£o:* 15/06/2026 Ã s 12:00 (HorÃ¡rio Local)
  * *Arquivos modificados:* `src/pages/Contracts.tsx`

* **ReordenaÃ§Ã£o do item Comercial no menu lateral:**
  * *O que foi feito:*
    * O item "Comercial" (rota `/commercial`) foi reposicionado no array `menuItems` para a segunda posiÃ§Ã£o, logo apÃ³s o item "Dashboard" (rota `/`).
  * *Data e hora da alteraÃ§Ã£o:* 16/06/2026 Ã s 10:30 (HorÃ¡rio Local)
  * *Arquivos modificados:* `src/components/Layout.tsx`

* **Auditoria Completa do Ciclo de Vida do Cliente e Projeto:**
  * *O que foi feito:*
    * Auditoria granular de ponta a ponta do ciclo de vida no sistema, do cadastro Ã  finalizaÃ§Ã£o/completed.
    * Mapeamento de 7 etapas principais: Cadastro, Kanban, Proposta Comercial, Vistoria TÃ©cnica, Obra/InstalaÃ§Ã£o, HomologaÃ§Ã£o/ConcessionÃ¡ria, ConclusÃ£o com HigienizaÃ§Ã£o e LGPD.
    * Levantamento de campos frontend, persistÃªncia de banco de dados e fluxos de remoÃ§Ã£o automÃ¡tica de dados sensÃ­veis e arquivos de storage (buckets `obras-fotos` e `propostas`).
    * IdentificaÃ§Ã£o de gaps de seguranÃ§a, persistÃªncia assÃ­ncrona de PDF e regras de integridade fÃ­sica.
    * CriaÃ§Ã£o do relatÃ³rio tÃ©cnico de auditoria `auditoria_fluxo_gestao_mtsolar.md`.
  * *Data e hora da alteraÃ§Ã£o:* 16/06/2026 Ã s 13:40 (HorÃ¡rio Local)
  * *Arquivos modificados/criados:* `RESUMO_MESTRE.md`, `auditoria_fluxo_gestao_mtsolar.md` (Criado)

* **SeÃ§Ã£o 8 â€” DivergÃªncias e Lacunas adicionada ao relatÃ³rio de auditoria:**
  * *O que foi feito:*
    * AnÃ¡lise cruzada entre frontend (Commercial.tsx, ProposalGenerator.tsx, Technical.tsx, Obra.tsx, ObraSchedule.tsx, Homologation.tsx, NeoenergiaProtocols.tsx, FinishedProjects.tsx), backend (api/index.ts) e schema (supabase_schema.sql).
    * **Q1 â€” Campos orphÃ£os no frontend:** Identificados 7 campos coletados e validados como obrigatÃ³rios em Commercial.tsx (`zip_code`, `inversor_marca`, `inversor_modelo`, `inversor_potencia`, `modulo_potencia`, `modulo_modelo`, `estrutura_tipo`) que sÃ£o descartados silenciosamente pela rota `POST /api/clients` sem nenhuma persistÃªncia.
    * **Q2 â€” Colunas do banco nunca preenchidas:** Identificadas 7 colunas sem rota de escrita: `clients.status`, `projects.description`, `commercial_data.contract_url`, `projects.homologation_protocol`, `projects.homologation_entry_date`, `projects.homologation_notes` e `proposal_history.project_id` (crÃ­tico: torna a limpeza de propostas ineficaz na finalizaÃ§Ã£o do projeto).
    * **Q3 â€” TransiÃ§Ãµes sem validaÃ§Ã£o backend:** Confirmado que nÃ£o existe Kanban drag-and-drop. As 3 transiÃ§Ãµes de estÃ¡gio (`registrationâ†’inspection`, `inspectionâ†’homologation`, `installationâ†’homologation`) avanÃ§am sem qualquer validaÃ§Ã£o de campos no backend â€” toda validaÃ§Ã£o Ã© client-side e bypassÃ¡vel.
    * **Q4 â€” DivergÃªncia de documentaÃ§Ã£o de fotos:** Os nomes dos 3 campos citados no RESUMO_MESTRE estÃ£o corretos. A divergÃªncia Ã© de incompletude: 7 dos 10 campos de foto (`photo_inverter_label`, `photo_grounding`, `photo_ac_voltage`, `photo_dc_voltage`, `photo_generation_plate`, `photo_ac_stringbox`, `photo_connection_point`) estÃ£o ausentes da documentaÃ§Ã£o, mas existem no cÃ³digo, schema e cleanup do backend.
  * *Data e hora da alteraÃ§Ã£o:* 16/06/2026 Ã s 11:04 (HorÃ¡rio Local)
  * *Arquivos modificados:* `RESUMO_MESTRE.md`, `auditoria_fluxo_gestao_mtsolar.md` (SeÃ§Ã£o 8 adicionada)

* **PersistÃªncia de Dados do Kit Negociado e CorreÃ§Ã£o do Fechamento Comercial:**
  * *O que foi feito:*
    * **Parte 1 (Dados do Kit):**
      * Atualizadas as rotas `POST /api/clients` e `PUT /api/clients/:id` no backend (`api/index.ts`) para receber, processar e inserir os dados do kit (`inversor_marca`, `inversor_modelo`, `inversor_potencia`, `modulo_modelo`, `modulo_potencia`, `estrutura_tipo`) na tabela `clients`. Implementamos tratamento de erro (`PGRST204` / `42703`) resiliente para fallback (tentando novamente sem os campos extras caso as colunas ainda nÃ£o estejam criadas no banco).
      * Modificado o join do `GET /api/projects/:id` no backend para selecionar de forma flexÃ­vel todas as colunas de `clients` usando `clients (*)` e mapear as novas propriedades no objeto planificado que retorna ao frontend.
      * Confirmado que o formulÃ¡rio de cadastro de novo cliente (`newClient`) e o formulÃ¡rio de ediÃ§Ã£o de cliente (`editClientData`) no frontend (`Commercial.tsx`) jÃ¡ coletavam, controlavam e submetiam adequadamente os payloads com esses 6 campos.
    * **Parte 2 (Fechamento Comercial):**
      * Criada a rota `PUT /api/commercial-data/:projectId` no backend (`api/index.ts`) para realizar o `upsert` dos dados do fechamento comercial na tabela `commercial_data` com chave de conflito em `project_id`. A rota valida o token do usuÃ¡rio (`authenticateToken`), assegura o isolamento de tenant (`company_id`) e executa a atualizaÃ§Ã£o e o disparo de regras de transiÃ§Ã£o de status de projeto (ex: avanÃ§ar para vistoria em caso de `proposta_enviada` com disparador de notificaÃ§Ãµes push).
      * Convertidos os textos estÃ¡ticos de exibiÃ§Ã£o das "InformaÃ§Ãµes Comerciais do Fechamento" na tela de detalhes do projeto do frontend (`Commercial.tsx`) em inputs de formulÃ¡rio interativos e dinÃ¢micos vinculados ao estado de `selectedProject`.
      * Atualizada a aÃ§Ã£o do botÃ£o "Salvar AlteraÃ§Ãµes" no frontend (`Commercial.tsx`) para chamar a nova rota `PUT /api/commercial-data/:projectId` enviando o payload correspondente e atualizando o estado do componente.
  * *Data e hora da alteraÃ§Ã£o:* 16/06/2026 Ã s 11:43 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/Commercial.tsx`, `RESUMO_MESTRE.md`

* **Parte 3 â€” ExibiÃ§Ã£o do Kit Negociado no Cronograma de Obras:**
  * *O que foi feito:*
    * **Backend (`api/index.ts`):** Atualizada a rota `GET /api/projects-schedule` para fazer join com a tabela `clients` selecionando os campos `inversor_marca`, `inversor_modelo`, `inversor_potencia`, `modulo_modelo`, `modulo_potencia` e `estrutura_tipo`. O resultado Ã© mapeado de forma planificada (flat), preservando retrocompatibilidade com todos os campos anteriores da rota.
    * **Frontend (`ObraSchedule.tsx`):** Expandida a interface `ProjectSchedule` com os seis novos campos opcionais do kit (todos tipados como `string | number | null`). Na seÃ§Ã£o expandÃ­vel de cada card do cronograma, adicionado um bloco somente-leitura com fundo Ã¢mbar mostrando **Inversor Modelo**, **PotÃªncia Inversor (kW)**, **MÃ³dulo Modelo** e **PotÃªncia MÃ³dulo (Wp)**. O bloco sÃ³ Ã© exibido quando ao menos um desses campos estÃ¡ preenchido; campos vazios/nulos exibem `â€”` como valor padrÃ£o.
  * *Data e hora da alteraÃ§Ã£o:* 16/06/2026 Ã s 11:46 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/ObraSchedule.tsx`, `RESUMO_MESTRE.md`

* **Parte 4 â€” Campos de Compra do Kit e Bloqueio de EstÃ¡gio:**
  * *O que foi feito:*
    * **Backend (`api/index.ts`):** 
      * Atualizada a rota `PUT /api/projects/:id/kit` para aceitar os campos `data_compra_kit`, `data_prevista_entrega`, `distribuidora` e `kit_entregue` e persisti-los na tabela `projects`.
      * Adicionado tratamento com bloco try-catch resiliente contra colunas inexistentes no banco (erro `PGRST204` / `42703`), garantindo o fallback e funcionamento das demais atualizaÃ§Ãµes mesmo sem essas colunas fisicamente criadas no banco.
      * Adicionada validaÃ§Ã£o de transiÃ§Ã£o nas rotas `PUT /api/projects/:id/commercial` e `PUT /api/commercial-data/:projectId`: agora a transiÃ§Ã£o de `current_stage` para `inspection` (Vistoria) Ã© rejeitada com status HTTP `422` se o kit nÃ£o tiver sido marcado como entregue (`kit_entregue` for falso).
    * **Frontend (`KitPurchase.tsx`):**
      * Adicionados os campos "Data de Compra do Kit", "Data Prevista de Entrega", "Distribuidora" e a checkbox "Material Entregue?" no formulÃ¡rio de gerenciar kit do projeto.
      * Exibidos de forma clara e organizada os dados de compra na listagem de projetos e adicionados badges dinÃ¢micos baseados no status da entrega ("Material Entregue" em verde e "Aguardando Entrega" em amarelo).
    * **Frontend (`Commercial.tsx`):**
      * O botÃ£o "Aprovar Proposta Comercial" (que envia o estÃ¡gio do projeto para Vistoria) agora Ã© desabilitado com opacidade e cursor nÃ£o-permitido se `kit_entregue` for falso, mostrando um tooltip avisando sobre a pendÃªncia da entrega.
  * *Data e hora da alteraÃ§Ã£o:* 16/06/2026 Ã s 11:55 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/KitPurchase.tsx`, `src/pages/Commercial.tsx`, `RESUMO_MESTRE.md`

* **Parte 5 â€” Desaparecimento de Clientes Homologados:**
  * *O que foi feito:*
    * **Backend (`api/index.ts`):** 
      * Ajustada a rota `PUT /api/projects/:id/homologation` para que, ao receber o status `connection_point_approved` (Ponto de ConexÃ£o Aprovado), atualize o `current_stage` e o `status` do projeto para `conclusion` (ConclusÃ£o / PÃ³s-venda) em vez de `completed`. Isso move o projeto para a prÃ³xima fase natural do funil.
    * **Frontend (`Homologation.tsx`):**
      * Atualizado o filtro de projetos carregados no mÃ©todo `fetchProjects` para manter na tela apenas aqueles com estÃ¡gio `homologation` e cujo `homologation_status` seja diferente de `connection_point_approved`.
      * Adicionada atualizaÃ§Ã£o reativa imediata no mÃ©todo `handleUpdate` que remove sÃ­ncronamente o projeto da listagem local (`projects`) assim que o status aprovado Ã© salvo com sucesso.
  * *Data e hora da alteraÃ§Ã£o:* 16/06/2026 Ã s 12:00 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/Homologation.tsx`, `RESUMO_MESTRE.md`

* **CorreÃ§Ã£o de Fluxo de EstÃ¡gios (Funil Completo):**
  * *O que foi feito:*
    * **Backend (`api/index.ts`):**
      * `PUT /api/projects/:id/technical` â€” corrigida a transiÃ§Ã£o ao concluir a vistoria: `current_stage` agora avanÃ§a para `installation` (era incorretamente `homologation`).
      * `GET /api/projects-schedule` â€” substituÃ­do o filtro `.neq('current_stage', 'completed')` por `.eq('current_stage', 'installation').eq('kit_entregue', true)`. O cronograma agora exibe **somente** projetos em fase de instalaÃ§Ã£o com kit confirmado como entregue.
      * `PUT /api/projects/:id/installation` â€” mantida sem alteraÃ§Ã£o: ao concluir a obra (`status: 'approved'`), o projeto avanÃ§a corretamente para `homologation`.
    * **Frontends verificados (sem alteraÃ§Ã£o necessÃ¡ria):**
      * `Technical.tsx` â€” jÃ¡ usava `PUT /api/projects/:id/technical` com `status: 'vistoria_concluida'` âœ…
      * `Obra.tsx` â€” jÃ¡ usava `PUT /api/projects/:id/installation` com `status: 'approved'` âœ…
      * `KitPurchase.tsx` â€” jÃ¡ usava `PUT /api/projects/:id/kit` com `kit_entregue` âœ…
  * *Fluxo correto apÃ³s as correÃ§Ãµes:*
    1. Ãrea Comercial â†’ `(proposta_enviada)` â†’ `current_stage: inspection`
    2. Vistoria TÃ©cnica â†’ `(vistoria_concluida)` â†’ `current_stage: installation`
    3. Kit Solar â†’ `(kit_entregue: true)` â†’ projeto elegÃ­vel para Cronograma
    4. Cronograma â†’ filtro: `installation` + `kit_entregue = true`
    5. Obra â†’ `(status: approved)` â†’ `current_stage: homologation`
    6. HomologaÃ§Ã£o â†’ `(connection_point_approved)` â†’ `current_stage: conclusion`
  * *Data e hora da alteraÃ§Ã£o:* 16/06/2026 Ã s 12:30 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `RESUMO_MESTRE.md`

* **Ajuste de EstÃ¡gio Inicial, EndereÃ§os no Cronograma e Desbloqueio Comercial:**
  * *O que foi feito:*
    * **Backend (`api/index.ts`):**
      * `POST /api/clients` â€” Adicionado `current_stage: 'registration'` na inserÃ§Ã£o da tabela `projects`, garantindo que novos projetos iniciem no funil na etapa correta de cadastro.
      * `GET /api/projects-schedule` â€” Adicionado os campos `address`, `city` e `state` no select de join da tabela `clients` e incluÃ­do o mapeamento plano em `mappedProjects`.
      * `PUT /api/projects/:id/commercial` e `PUT /api/commercial-data/:projectId` â€” Removida a validaÃ§Ã£o de `kit_entregue` ao aprovar a proposta comercial (`status: 'proposta_enviada'`), permitindo o avanÃ§o correto para a etapa de vistoria tÃ©cnica (`current_stage: 'inspection'`) sem travas prematuras.
    * **Frontend (`Commercial.tsx`):**
      * Removido o bloqueio `disabled={!selectedProject.kit_entregue}` e a condicional do botÃ£o "Aprovar Proposta Comercial", permitindo que o vendedor envie a proposta e avance o projeto para vistoria sem exigir entrega prÃ©via do kit (que sÃ³ ocorre na fase de instalaÃ§Ã£o/obra).
    * **Frontend (`ObraSchedule.tsx`):**
      * Adicionados campos `address`, `city` e `state` como opcionais na interface `ProjectSchedule`.
      * Inserido card visual cinza claro (`bg-gray-50`) exibindo o endereÃ§o do cliente cadastrado caso esteja preenchido (`project.address`, `project.city`, `project.state`), posicionado estrategicamente acima dos dados do kit negociado no detalhe expandÃ­vel do cronograma.
* **ReestruturaÃ§Ã£o e Alinhamento do Funil de Obras:**
  * *O que foi feito:*
    * **Backend (`api/index.ts`):**
      * `GET /api/projects-schedule` â€” Alterado o filtro do cronograma de obras para exibir somente projetos que estejam no estÃ¡gio de instalaÃ§Ã£o (`current_stage: 'installation'`) E cujo kit de equipamentos jÃ¡ tenha sido entregue (`kit_entregue: true`), garantindo que o cronograma represente apenas obras prontas para inÃ­cio.
    * **Frontend (`Homologation.tsx`):**
      * Ajustado o filtro da listagem de homologaÃ§Ãµes para exibir projetos tanto no estÃ¡gio `'homologation'` quanto no estÃ¡gio paralelo `'installation'`. Isso permite que o processo de homologaÃ§Ã£o ocorra em paralelo com a compra do Kit Solar e a execuÃ§Ã£o da Obra, logo apÃ³s a conclusÃ£o da Vistoria TÃ©cnica.
  * *Data e hora da alteraÃ§Ã£o:* 16/06/2026 Ã s 13:25 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/Homologation.tsx`, `RESUMO_MESTRE.md`

* **CorreÃ§Ã£o do Cronograma: Projetos em InstalaÃ§Ã£o NÃ£o Apareciam:**
  * *Causa Raiz:*
    * O cronograma filtrava por `kit_entregue = true`, mas o campo pode ser `null` no banco caso o fallback `PGRST204` seja ativado (colunas ausentes no schema), fazendo com que projetos em `installation` nÃ£o apareÃ§am.
  * *O que foi feito:*
    * **Backend (`api/index.ts`):**
      * `GET /api/projects-schedule` â€” Removido o filtro `kit_entregue = true` da query do Supabase. O cronograma agora exibe todos os projetos no estÃ¡gio `current_stage: 'installation'`, sem depender da coluna `kit_entregue` como filtro de banco.
      * `PUT /api/projects/:id/kit` â€” Adicionado `current_stage: 'installation'` ao payload base de atualizaÃ§Ã£o, garantindo que ao salvar o kit (comprado ou entregue) o projeto permaneÃ§a no estÃ¡gio correto de instalaÃ§Ã£o. O status foi ajustado: `'kit_entregue'` quando entregue, `'kit_definido'` caso contrÃ¡rio.
  * *Data e hora da alteraÃ§Ã£o:* 16/06/2026 Ã s 13:36 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `RESUMO_MESTRE.md`

* **Auto-preenchimento do Kit Negociado em KitPurchase.tsx:**
  * *O que foi feito:*
    * **Frontend (`KitPurchase.tsx`):**
      * Corrigido o fallback de prÃ©-preenchimento dos campos do formulÃ¡rio de Kit Solar ao abrir um projeto. Anteriormente, o cÃ³digo tentava usar `project.proposal_inverter_model`, `project.proposal_inverter_power` etc., que **nÃ£o existem** no payload da API. Agora o fallback correto usa os campos da tabela `clients`: `inversor_marca + inversor_modelo` (concatenados) para o modelo do inversor, `inversor_potencia` para a potÃªncia do inversor, `modulo_modelo` para o modelo do mÃ³dulo e `modulo_potencia` para a potÃªncia do mÃ³dulo.
      * **Prioridade garantida:** Se jÃ¡ existirem dados salvos de compra de kit (`inverter_model`, `inverter_power`, `module_model`, `module_power`), esses valores tÃªm prioridade e os dados do cliente **nÃ£o sobrescrevem**.
      * **Tratamento de nulos:** Caso os campos do cliente estejam vazios/nulos, os inputs exibem o placeholder normalmente, sem erros.
      * **Banner informativo:** Adicionado aviso em azul (`bg-blue-50`) que aparece apenas quando os campos foram prÃ©-preenchidos com dados do kit negociado (estado `usingProposalData: true`), orientando o usuÃ¡rio a editar livremente caso o kit comprado seja diferente.
      * Adicionada importaÃ§Ã£o do Ã­cone `Info` do `lucide-react` para uso no banner.
  * *Data e hora da alteraÃ§Ã£o:* 16/06/2026 Ã s 14:00 (HorÃ¡rio Local)
  * *Arquivos modificados:* `src/pages/KitPurchase.tsx`, `RESUMO_MESTRE.md`

* **CorreÃ§Ã£o da LocalizaÃ§Ã£o do EndereÃ§o no Cronograma (ObraSchedule.tsx):**
  * *O que foi feito:*
    * **Frontend (`ObraSchedule.tsx`):**
      * Removido o campo manual/duplicado de "EndereÃ§o da InstalaÃ§Ã£o" (que permitia input manual) que estava posicionado junto aos campos tÃ©cnicos de Inversor e Telhado.
      * Na listagem do card da obra (onde o cliente, tÃ­tulo e endereÃ§o sÃ£o exibidos de forma comprimida), o campo de endereÃ§o que tentava renderizar o endereÃ§o manual antigo (`details.endereco`) foi substituÃ­do pela formataÃ§Ã£o do endereÃ§o real vindo da tabela `clients` (`project.city` e `project.state`, com fallback para `project.address`), mantendo assim a consistÃªncia com o card expandÃ­vel.
      * O card cinza chiaro "EndereÃ§o da InstalaÃ§Ã£o (Cadastro do Cliente)" foi mantido como a Ãºnica fonte de endereÃ§o da instalaÃ§Ã£o, evitando informaÃ§Ãµes duplicadas e confusas.
  * *Data e hora da alteraÃ§Ã£o:* 16/06/2026 Ã s 14:06 (HorÃ¡rio Local)
  * *Arquivos modificados:* `src/pages/ObraSchedule.tsx`, `RESUMO_MESTRE.md`

* **Limpeza, AnonimizaÃ§Ã£o e OcultaÃ§Ã£o de Projetos Finalizados (Conclusion / Completed):**
  * *O que foi feito:*
    * **Backend (`api/index.ts` - `PUT /api/projects/:id/homologation`):**
      * Refatorada a rotina de encerramento do projeto (quando atinge `connection_point_approved`).
      * O estÃ¡gio agora transita diretamente para `completed` (e `status = 'completed'`).
      * **ExclusÃ£o FÃ­sica (Storage):** Adicionado suporte para excluir mÃ­dias de vistoria da tabela `technical_data` (`uploads`), mÃ­dias e contratos de `commercial_data` (`uploads`), documentos de homologaÃ§Ã£o da tabela `documents` (`homologacao-docs`), e histÃ³ricos de propostas JSON (`propostas`), economizando espaÃ§o e protegendo dados sensÃ­veis.
      * **Soft-Delete (AnonimizaÃ§Ã£o LGPD):** Em vez de excluir o projeto, os dados sensÃ­veis da tabela `clients` (`cpf_cnpj`, `phone`, `email`, `address`) sÃ£o anulados para nulo. Cidade, Estado, e os parÃ¢metros tÃ©cnicos do inversor e mÃ³dulo sÃ£o preservados, mantendo o vÃ­nculo `client_id` ativo. Campos de notas textuais livres (`observations` e `notes`) de todas as tabelas acessÃ³rias sÃ£o sumariamente apagados. A tabela de `proposal_history` para aquele projeto Ã© removida do banco.
    * **Frontend:**
      * Os projetos finalizados e concluÃ­dos foram sumariamente bloqueados (ocultados) de aparecer nas listagens ativas:
        * `Commercial.tsx` (Filtro `installationProjects` ajustado)
        * `Technical.tsx` (Adicionado `current_stage !== 'conclusion'` e `completed`)
        * `Obra.tsx` (Removido `'conclusion'` do array permissivo)
        * `KitPurchase.tsx` (Removido `'conclusion'` do array permissivo)
      * A tela `FinishedProjects.tsx` passa a absorver todos esses projetos limpos e exibe-os apenas com os dados brutos restantes (Cidade, Cliente, Data), sem quebrar e sem permitir o uso indevido de PIIs finalizados.
  * *Data e hora da alteraÃ§Ã£o:* 16/06/2026 Ã s 14:22 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/Commercial.tsx`, `src/pages/Technical.tsx`, `src/pages/Obra.tsx`, `src/pages/KitPurchase.tsx`, `RESUMO_MESTRE.md`

* **CorreÃ§Ã£o no Filtro da Aba InstalaÃ§Ã£o do CRM Comercial (Soft-Delete):**
  * *O que foi feito:*
    * Adicionada exclusÃ£o explÃ­cita de projetos com estÃ¡gio `completed` no filtro da aba InstalaÃ§Ã£o em `Commercial.tsx`, eliminando o edge case onde projetos concluÃ­dos e anonimizados poderiam ser exibidos se passassem nos critÃ©rios de whitelist de estÃ¡gios.
  * *Data e hora da alteraÃ§Ã£o:* 16/06/2026 Ã s 14:37 (HorÃ¡rio Local)
  * *Arquivos modificados:* `src/pages/Commercial.tsx`, `RESUMO_MESTRE.md`

* **MigraÃ§Ã£o de MÃ­dias: Supabase Storage â†’ Cloudflare R2 (Parte 1 â€” Backend):**
  * *O que foi feito:*
    * Mapeamento completo de todos os pontos de upload/delete de arquivo em `api/index.ts`.
    * **6 alteraÃ§Ãµes aplicadas** em `api/index.ts`:
      1. **Helper `uploadFile()`**: SubstituÃ­do `supabase.storage.from(bucket).upload()` + `getPublicUrl()` por `uploadToR2(file.buffer, filePath, file.mimetype)`. O parÃ¢metro `bucket` Ã© mantido como prefixo de pasta no R2 para retrocompatibilidade com todos os chamadores.
      2. **`POST /api/whatsapp/send-audio`**: SubstituÃ­do `supabaseAdmin.storage...upload()` + `getPublicUrl()` por `uploadToR2(audioBuffer, audioFileName, 'audio/ogg')`. Caminho agora inclui prefixo `whatsapp-media/` no R2.
      3. **`POST /api/whatsapp/upload-media`**: SubstituÃ­do upload Supabase + `createSignedUrl` (600s) por `uploadToR2()`. Rota passa a retornar **URL pÃºblica permanente** do R2.
      4. **`POST /api/whatsapp/send-media`**: SubstituÃ­do `supabaseAdmin.storage...getPublicUrl(filePath)` por `${R2_PUBLIC_URL}/${filePath}` (construÃ§Ã£o direta com variÃ¡vel jÃ¡ importada).
      5. **Webhook `downloadAndUploadMedia()`**: SubstituÃ­do `supabaseAdmin.storage...upload()` + `getPublicUrl()` por `uploadToR2(buffer, storagePath, contentType)`. MÃ­dias recebidas via webhook agora armazenadas no R2.
      6. **`GET /api/cron/cleanup-whatsapp-media`**: SubstituÃ­do `supabaseAdmin.storage...remove([path])` por `deleteFromR2(path)` com tratamento de erro por try-catch. AtualizaÃ§Ã£o do banco permanece inalterada.
    * **NÃ£o alterados:** `POST /api/ponto/registrar` (jÃ¡ usava `uploadToR2`), `.remove()` dos buckets `obras-fotos`, `propostas`, `uploads` e `homologacao-docs`, autenticaÃ§Ã£o, queries de banco e regras de negÃ³cio.
    * **Import confirmado na linha 12:** `import { uploadToR2, deleteFromR2, R2_PUBLIC_URL } from './r2.js'` jÃ¡ existia antes desta tarefa.
  * *Data e hora da alteraÃ§Ã£o:* 18/06/2026 Ã s 06:36 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `RESUMO_MESTRE.md`

* **CorreÃ§Ã£o da SequÃªncia do Funil (Cadastro â†’ TÃ©cnica â†’ Kit Solar/HomologaÃ§Ã£o â†’ Cronograma):**
  * *O que foi feito:*
    * **VerificaÃ§Ãµes Realizadas (Trechos Mantidos por Estarem Corretos):**
      1. `POST /api/clients`: Confirmado que novos projetos sÃ£o inseridos com `current_stage: 'registration'`.
      2. `PUT /api/projects/:id/technical`: Confirmado que ao concluir vistoria, o projeto avanÃ§a para `installation` (e nÃ£o para homologation).
      3. `PUT /api/projects/:id/kit`: Confirmado que o estÃ¡gio permanece em `installation` ao preencher os dados do kit e entrega.
      4. `Homologation.tsx` (frontend): Confirmado que a listagem de projetos jÃ¡ filtra corretamente `current_stage === 'homologation' || current_stage === 'installation'`, garantindo que o projeto apareÃ§a em ambas as telas simultaneamente (paralelismo) logo apÃ³s a vistoria tÃ©cnica.
    * **AlteraÃ§Ã£o Realizada (`GET /api/projects-schedule`):**
      * Adicionado o filtro condicional `.or('kit_entregue.eq.true,kit_entregue.is.null')` ao final da query de seleÃ§Ã£o.
      * O cronograma agora filtra ativamente projetos em estÃ¡gio de `installation` que possuam o `kit_entregue = true`. Projetos em `installation` que estejam com kit explÃ­cito como `false` nÃ£o aparecerÃ£o mais na tela.
      * Adicionado o fallback seguro `.is.null` para garantir que, caso a tabela no banco nÃ£o tenha a coluna de kit ou tenha registros antigos vazios, nenhum projeto desapareÃ§a acidentalmente.
  * *Data e hora da alteraÃ§Ã£o:* 18/06/2026 Ã s 06:42 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `RESUMO_MESTRE.md`

  * *Data e hora da alteraÃ§Ã£o:* 18/06/2026 Ã s 06:42 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `RESUMO_MESTRE.md`

* **Parte 7 â€” HistÃ³rico de Propostas: PaginaÃ§Ã£o e Prazo de 30 Dias:**
  * *O que foi feito:*
    * **Backend (`api/index.ts`):** Campo `data_expiracao` na rota `POST /api/proposal-history` alterado de `+7 dias` para `+30 dias`. Rota `GET /api/proposal-history` refatorada para aceitar `?page=N&limit=N`, usar `.range(from, to)` e `.select('*', { count: 'exact' })`, retornando `{ data, total, page, totalPages }`.
    * **Frontend (`ProposalGenerator.tsx`):** Adicionados estados `historyPage`, `historyTotalPages` e `historyTotal`. FunÃ§Ã£o `fetchHistory` atualizada para aceitar parÃ¢metro de pÃ¡gina. Tabela encapsulada em `max-h-[480px]` para scroll interno. Controles de paginaÃ§Ã£o (Anterior / PrÃ³xima, indicador de pÃ¡gina) adicionados abaixo da tabela. Corrigido bug de template literal malformado na URL da API.
  * *Data e hora da alteraÃ§Ã£o:* 18/06/2026 Ã s 18:03 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/ProposalGenerator.tsx`

* **Parte 8 â€” Ponto EletrÃ´nico: Aba de VerificaÃ§Ã£o de Fotos (ADM/CEO):**
  * *O que foi feito:*
    * **Backend (`api/index.ts`):** Criada a rota `GET /api/ponto/fotos-verificacao`, restrita a roles `CEO` e `ADMIN`. Recebe `?userId=X&data=YYYY-MM-DD`, monta intervalo do dia inteiro no fuso de BrasÃ­lia (`T00:00:00-03:00` a `T23:59:59-03:00`), busca `time_records` filtrando por `company_id`, `user_id` e intervalo de data, retorna `id, type, timestamp, selfie_url, latitude, longitude, status`.
    * **Frontend (`Ponto.tsx`):**
      * Tipo do `activeTab` atualizado para incluir `'fotos'`.
      * Adicionados estados: `fotoUserId`, `fotoData`, `fotoRecords`, `fotoLoading`, `fotoModalUrl`.
      * Adicionada funÃ§Ã£o `fetchFotosVerificacao`.
      * Aba **"Verificar Fotos"** adicionada ao array de tabs, visÃ­vel apenas para `isManager`.
      * Painel da aba: filtros (dropdown de colaboradores + input de data + botÃ£o Buscar), linha do tempo vertical de registros com Ã­cone de tipo, horÃ¡rio, badge de status, Ã­cone de mapa (verde clicÃ¡vel para Google Maps, ou cinza sem localizaÃ§Ã£o) e thumbnail 112Ã—112px da selfie clicÃ¡vel.
      * Modal lightbox para visualizaÃ§Ã£o da foto em tamanho ampliado com botÃ£o de fechar (`Ã—`) e click fora para dispensar.
    * **Abas existentes preservadas:** `ponto`, `historico`, `gestor`, `ajustes` â€” nenhuma linha alterada.
    * **RelatÃ³rio PDF existente:** nÃ£o tocado.
  * *Data e hora da alteraÃ§Ã£o:* 18/06/2026 Ã s 18:21 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/Ponto.tsx`


* **PaginaÃ§Ã£o Client-Side e Scroll na Aba HistÃ³rico de Propostas:**
  * *O que foi feito:*
    * **AlteraÃ§Ã£o 1 (data_expiracao):** Verificado que o backend (`api/index.ts`, linhas 2729â€“2730) jÃ¡ calcula `data_expiracao` com `+30 dias` e usa `.insert()` (nÃ£o `.upsert()`). Nenhuma alteraÃ§Ã£o necessÃ¡ria no frontend, pois o campo nÃ£o compÃµe o payload enviado pela funÃ§Ã£o `saveToHistory` â€” Ã© calculado exclusivamente no servidor.
    * **AlteraÃ§Ã£o 2 (estados de paginaÃ§Ã£o):** Adicionados dois novos estados client-side ao componente `ProposalGenerator`: `const [currentPage, setCurrentPage] = useState(1)` e `const ITEMS_PER_PAGE = 10`. Os estados de paginaÃ§Ã£o backend prÃ©-existentes (`historyPage`, `historyTotalPages`, `historyTotal`) foram mantidos intactos.
    * **AlteraÃ§Ã£o 3 (scroll e paginaÃ§Ã£o client-side):** O bloco da tabela da aba HistÃ³rico de Propostas foi substituÃ­do por uma IIFE (`(() => { ... })()`) que calcula `totalPages`, `startIndex` e `currentItems = history.slice(...)`. A tabela agora possui o `<thead>` com `sticky top-0 z-10` para cabeÃ§alho fixo durante o scroll, container com `overflow-y-auto max-h-[500px]` e controles de paginaÃ§Ã£o (â† Anterior / PrÃ³xima â†’) exibidos somente quando `totalPages > 1`. Todos os `<th>` e `<td>` originais foram preservados.
  * *Data e hora da alteraÃ§Ã£o:* 19/06/2026 Ã s 14:24 (HorÃ¡rio Local)
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`

* **Parte 4 â€” CorreÃ§Ã£o de Encoding de Emojis e VerificaÃ§Ã£o de Upload em Obra.tsx:**
  * *O que foi feito:*
    * **AlteraÃ§Ã£o 1 (encoding):** Corrigidos 3 emojis corrompidos nos tÃ­tulos de seÃ§Ã£o do JSX em `Obra.tsx`:
      * `Ã¢Å¡Â¡ MediÃ§Ãµes ElÃ©tricas Adicionais` â†’ `âš¡ MediÃ§Ãµes ElÃ©tricas Adicionais` (linha 551)
      * `Ã°Å¸"Å’ MediÃ§Ãµes CC (MPPTs)` â†’ `ðŸ”Œ MediÃ§Ãµes CC (MPPTs)` (linha 574)
      * `Ã°Å¸"Â¦ Opcionais Adicionais` â†’ `ðŸ“¦ Opcionais Adicionais` (linha 610)
    * **AlteraÃ§Ã£o 2 (field do upload):** Verificado que a funÃ§Ã£o `uploadNewPhoto` jÃ¡ usa `fd.append('file', file)` corretamente (linha 66). Nenhuma alteraÃ§Ã£o necessÃ¡ria.
    * **AlteraÃ§Ã£o 3 (persistÃªncia no banco):** Verificado que a arquitetura do componente Ã©: as URLs retornadas por `uploadNewPhoto` sÃ£o acumuladas em `extraUrls` e `uploadedMppts`, e enviadas no submit final via `api.put('/api/projects/:id/installation', payload)`. Essa Ã© a arquitetura correta â€” persistÃªncia ocorre no submit, nÃ£o individualmente por upload. Nenhuma alteraÃ§Ã£o necessÃ¡ria.
  * *Data e hora da alteraÃ§Ã£o:* 19/06/2026 Ã s 14:44 (HorÃ¡rio Local)
  * *Arquivos modificados:* `src/pages/Obra.tsx`

* **Parte 5 — Melhorias no Módulo de Vistoria Técnica e Retenção R2:**
  * *O que foi feito:*
    * **Backend:** Adicionado suporte a metadata `{ retention: '2-months' }` no `uploadToR2`. Criado o cronjob `GET /api/cron/cleanup-vistoria-midia` agendado no `vercel.json` (`0 3 * * *`) para deletar do bucket "vistoria/" fotos/vídeos criados há mais de 60 dias (validado pelo `LastModified`).
    * **Frontend:** Na tela `Technical.tsx`, modificado o input para aceitar explicitamente apenas `image/*,video/*` e adicionado botão de download em cada thumbnail da vistoria salva no banco de dados. O download converte a imagem em um `Blob` e aciona um clique simulado local, evitando comportamentos de "open in new tab" na WebView.
  * *Data e hora da alteração:* 25/06/2026 às 13:10 (Horário Local)
  * *Arquivos modificados:* `api/index.ts`, `api/r2.ts`, `vercel.json`, `src/pages/Technical.tsx`.

* **Parte 6 — Módulo de Kits Solares e Ajustes em Propostas:**
  * *O que foi feito:*
    * **Banco de Dados:** Criada tabela `solar_kits` com suporte a multi-tenancy e RLS restrito a liderança (ADM/CEO) para operações de escrita, mas permitindo leitura de kits ativos aos Vendedores.
    * **Backend (`api/index.ts`):** Criadas rotas CRUD (`GET`, `POST`, `PUT`, `DELETE`) em `/api/solar-kits` com middleware `requireAdminOrCEO`.
    * **Frontend (`ProposalGenerator.tsx`):**
      * Criada nova aba "Kits Solares" no gerador de propostas, acessível apenas por usuários com role ADM ou CEO.
      * Desenvolvida tela de gerenciamento de kits com tabela responsiva e modal para adição/edição de kits (incluindo checkbox para inversor de ampliação).
      * Removidos os campos manuais de "Custo do Kit", "Margem de Venda (%)" e "Desconto" da visão do Vendedor na aba "Kit Solar".
      * Introduzido um Dropdown (seletor) de "Kit Cadastrado" que é **obrigatório** para vendedores (bloqueia geração de PDF se vazio) e exibe o nome simplificado "Kit X kWh" sem exibir os custos.
      * A seleção preenche automaticamente módulos, inversores, potências e marcas, além de travar os campos detalhados de equipamento como leitura apenas (read-only) para Vendedores.
      * O preço é calculado em background (Custo + Margem) e exibido como "Valor Final de Venda". Apenas ADM/CEO possuem a capacidade de alterar o valor e especificações livremente na tela de propostas caso necessário.
  * *Data e hora da alteração:* 25/06/2026 às 13:38 (Horário Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/ProposalGenerator.tsx`.

* **Parte 7 — Correções no Histórico de Propostas:**
  * *O que foi feito:*
    * **Backend (`api/index.ts`):** O cronjob `GET /api/cleanup-proposals` foi corrigido. Antes, ele deletava os registros da tabela `proposal_history` ao expirar. Agora, ele apenas deleta os arquivos físicos no Storage (bucket `propostas`) e anula o campo `url_arquivo = null` no banco, mantendo o registro do histórico permanentemente. A busca foi atualizada para filtrar apenas registros com `url_arquivo IS NOT NULL` e `data_expiracao < now()`.
    * **Frontend (`ProposalGenerator.tsx`):**
      * **Paginação corrigida:** Removidos os estados `currentPage` e `ITEMS_PER_PAGE` que causavam paginação duplicada (frontend + backend). A aba "Histórico" agora usa exclusivamente a paginação do backend via `historyPage` e `historyTotalPages`. Os botões "← Anterior" e "Próxima →" chamam `fetchHistory(historyPage - 1)` e `fetchHistory(historyPage + 1)`. O indicador exibe "Página X de Y — Z proposta(s) no total".
      * **Colunas ocultas para Vendedor:** As colunas "Margem" e "Custo do Kit" na tabela do histórico são renderizadas condicionalmente com `{isAdminOrCeo && ...}`. Para o role `VENDEDOR`, essas colunas (`<th>` e `<td>`) são completamente omitidas do DOM.
  * *Data e hora da alteração:* 25/06/2026 às 13:44 (Horário Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/ProposalGenerator.tsx`, `RESUMO_MESTRE.md`.

---

> [!WARNING]
> A chave `SUPABASE_SERVICE_ROLE_KEY` concede controle total sobre todas as linhas de todas as tabelas do banco de dados e arquivos do Storage. NÃ£o insira ou exponha esta chave em qualquer script que seja compilado dentro do bundle do frontend (pasta `/src`).

> [!IMPORTANT]

---

## 15. MIGRATIONS PENDENTES DE EXECUÇÃO MANUAL NO SUPABASE

Esta seção rastreia os arquivos de migration que foram criados no repositório mas ainda precisam ser executados manualmente no **SQL Editor do Supabase** para ter efeito no banco de dados de produção.

### ⏳ Pendentes

| Arquivo | Descrição | Criado em |
|---|---|---|
| supabase/migrations/20260625_create_solar_kits.sql | Cria a tabela solar_kits com RLS, índices e trigger de updated_at. Sem isso, GET /api/solar-kits retorna erro 500. | 25/06/2026 |

> [!CAUTION]
> Enquanto esses arquivos não forem executados no Supabase, as funcionalidades correspondentes estarão **completamente indisponíveis** em produção, independentemente de qualquer deploy no Vercel.

### ✅ Já Aplicadas

| Arquivo | Descrição | Aplicado em |
|---|---|---|
| supabase/migrations/20260625_create_whatsapp_observations.sql | Cria a tabela whatsapp_observations com RLS e índices para o módulo de notas do Atendimento. | 25/06/2026 |

