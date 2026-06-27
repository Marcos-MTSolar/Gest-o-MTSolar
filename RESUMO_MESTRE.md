# RESUMO MESTRE Ã¢â‚¬â€ GESTÃƒÆ’O MTSOLAR

Este documento consolida a análise detalhada e atualizada da arquitetura, stack de tecnologias, estrutura do banco de dados, regras de negócio e integrações do sistema **Gestão MTSolar**, servindo como a principal fonte de verdade técnica do projeto.

* **Correção de Permissão na Aba Kits Solares:**
  * *O que foi feito:* A variável `isAdminOrCeo` (que controla a visibilidade da aba "Kits Solares" e seu conteúdo no módulo de Propostas) estava validando erroneamente o papel `ADM`. Foi corrigida para verificar a role `ADMIN` corretamente. A condição foi atualizada para `user?.role === 'CEO' || user?.role === 'ADMIN'`, garantindo que a gerência administrativa também tenha acesso à aba. A role `COMMERCIAL` continua sem acesso (vê apenas o dropdown).
  * *Data e hora da alteração:* 26/06/2026 às 13:33 (Horário Local)
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`
* **Atualização do Schema solar_kits — potencia_kwh → potencia_kwp + consumo_referencia_kwh:**
  * *O que foi feito:* Refletidas no código as alterações já executadas no banco Supabase via `ALTER TABLE`. A coluna `potencia_kwh` foi renomeada para `potencia_kwp` (kWp é a unidade correta para painéis fotovoltaicos) e a nova coluna opcional `consumo_referencia_kwh` (NUMERIC 10,2) foi adicionada para indicar a faixa de consumo mensal que o kit dimensiona. As seguintes mudanças foram aplicadas:
    * **`api/index.ts`:** GET `/api/solar-kits` — `order by` atualizado para `potencia_kwp` e `select` explícito com `consumo_referencia_kwh`; POST e PUT — desestruturação de `req.body` com `potencia_kwp` e `consumo_referencia_kwh = null`; payload de INSERT/UPDATE enviado ao Supabase atualizado.
    * **`src/pages/ProposalGenerator.tsx`:** Interface `SolarKit` e constante `EMPTY_KIT` atualizadas; `openEditKitModal` e `applySelectedKit` usam `potencia_kwp`; dropdowns de CEO/ADM e VENDEDOR exibem `kWp` e, quando preenchido, o consumo de referência; tabela de kits tem coluna "Potência (kWp)" + nova coluna "Ref. Consumo"; modal de Adicionar/Editar Kit tem label e campo `potencia_kwp` + novo campo opcional `consumo_referencia_kwh`.
    * **`supabase/migrations/20260625_create_solar_kits.sql`:** DDL atualizado para documentação — coluna renomeada e nova coluna adicionada; índice `idx_solar_kits_potencia` aponta para `potencia_kwp`.
  * *Data e hora da alteração:* 26/06/2026 às 11:55 (Horário Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/ProposalGenerator.tsx`, `supabase/migrations/20260625_create_solar_kits.sql`

* **Correcao 6 - Orientacao EXIF e prioridade de leitura de equipamentos:**
  * *O que foi feito:*
    * **Obra.tsx (Tarefa 4):** Refatorado o laco de geracao de PDF (`generatePDF`) para carregar a foto Base64 em um objeto `Image` nativo, detectando sua largura e altura reais. Se a altura for maior que a largura (foto vertical), o espaco de desenho no jsPDF eh redimensionado proporcionalmente para caber nos mesmos 60px de altura maximos permitidos no layout, corrigindo o efeito de achatamento.
    * **api/index.ts (Tarefa 6):** Ajustado o `GET /api/projects/:id` para que as chaves `inversor_modelo` e `modulo_modelo` leiam primeiramente de `techData.inverter_model/module_model` (fonte confiavel do Kit Solar), usando `project.clients` apenas como fallback. Isso resolve o bug do "Inversor: 8 (8)".
  * *Data e hora da alteracao:* 20/06/2026 as 08:55 (Horario Local)
  * *Arquivos modificados:* `src/pages/Obra.tsx`, `api/index.ts`


* **CorreÃ§Ã£o 4 â€” RemoÃ§Ã£o de TensÃ£o CA duplicada e promoÃ§Ã£o do Aterramento PadrÃ£o:**
  * *O que foi feito:*
    * **Obra.tsx:** O campo photo_tensao_ca_neutro_terra foi removido da seÃ§Ã£o MediÃ§Ãµes ElÃ©tricas Adicionais e da trava do botÃ£o PDF. O campo photo_aterramento_padrao foi movido para a constante PHOTO_FIELDS, passando a ser exigido universalmente junto com as demais fotos obrigatÃ³rias da obra.
  * *Data e hora da alteraÃ§Ã£o:* 20/06/2026 Ã s 07:42 (HorÃ¡rio Local)
  * *Arquivos modificados:* src/pages/Obra.tsx


* **CorreÃ§Ã£o 3 â€” Mismatch de nomenclatura Inversor/MÃ³dulo e Trava do PDF:**
  * *O que foi feito:*
    * **Obra.tsx:** Corrigidas as referÃªncias de nomenclatura de idioma no mÃ©todo de geraÃ§Ã£o do PDF. O cÃ³digo passou a ler inversor_modelo, inversor_potencia, modulo_modelo e modulo_potencia (em vez das antigas propriedades inexistentes em inglÃªs inverter_model), resolvendo o problema de exibiÃ§Ã£o N/A. Adicionada tambÃ©m uma trava de seguranÃ§a baseada em estados temporÃ¡rios: se qualquer fila de anexo recÃ©m-selecionada (photoFiles, newPhotoFiles ou mpptList) contiver um arquivo nÃ£o submetido, o botÃ£o aborta a geraÃ§Ã£o do PDF e lanÃ§a um alerta solicitando que o usuÃ¡rio salve a obra primeiro.
  * *Data e hora da alteraÃ§Ã£o:* 20/06/2026 Ã s 07:11 (HorÃ¡rio Local)
  * *Arquivos modificados:* src/pages/Obra.tsx


* **CorreÃ§Ã£o 2 â€” Carregamento assÃ­ncrono de imagens no RelatÃ³rio de Obra (PDF):**
  * *O que foi feito:*
    * **Obra.tsx:** Refatorada a funÃ§Ã£o generatePDF para ser sync. O laÃ§o sÃ­ncrono orEach que inseria imagens no PDF foi substituÃ­do por um or...of assÃ­ncrono. Agora, cada URL de imagem passa por um etch e Ã© convertida para Base64 usando FileReader antes de ser inserida no documento via doc.addImage(). O bloco catch foi mantido para que falhas de rede de fotos individuais nÃ£o quebrem o resto do PDF.
  * *Data e hora da alteraÃ§Ã£o:* 20/06/2026 Ã s 07:08 (HorÃ¡rio Local)
  * *Arquivos modificados:* src/pages/Obra.tsx


* **SessÃ£o de Auditorias Finais (Propostas, Obra, HistÃ³rico):**
  * *O que foi feito:*
    * **Proposta Comercial:** Removida a pÃ¡gina institucional indevida (MissÃ£o, VisÃ£o, Valores) da funÃ§Ã£o de geraÃ§Ã£o da Proposta Comercial (generatePDF HTML) em src/pages/ProposalGenerator.tsx.
    * **Obra:** Adicionado o cronjob /api/cron/cleanup-obra-fotos (frequÃªncia 0 2 * * *) no arquivo vercel.json para deletar fotos do R2 apÃ³s 15 dias.
    * **HistÃ³rico de Propostas:** Corrigido o backend da paginaÃ§Ã£o. A rota GET /api/proposal-history em api/index.ts foi substituÃ­da para realizar a busca com .range(), .select('*', { count: 'exact' }) e retornar o formato { data, total, page, totalPages } esperado pelo frontend.
    * **VerificaÃ§Ãµes adicionais:** Confirmado que a interface Mobile/Tablet em Layout.tsx e Agenda.tsx estÃ£o funcionando responsivamente. Confirmado que o frontend de Obra.tsx jÃ¡ possuÃ­a os componentes e funÃ§Ãµes requeridos para fotos trifÃ¡sicas, MPPTs e geraÃ§Ã£o do relatÃ³rio em PDF. Confirmado que data_expiracao na rota POST /api/proposal-history estÃ¡ somando 30 dias.
  * *Data e hora da alteraÃ§Ã£o:* 18/06/2026 Ã s 19:04 (HorÃ¡rio Local)
  * *Arquivos modificados:* src/pages/ProposalGenerator.tsx, vercel.json, api/index.ts


* **CorreÃƒÂ§ÃƒÂ£o do Bug de Upload de HomologaÃƒÂ§ÃƒÂ£o (Payload Too Large):**
  * *O que foi feito:* Refatorada a arquitetura de upload de documentos de homologaÃƒÂ§ÃƒÂ£o no cadastro comercial. Devido ao limite de 4.5MB das Serverless Functions da Vercel, o upload via FormData estava falhando para arquivos grandes. Foi implementado o fluxo de URL PrÃƒÂ©-assinada (Presigned URL) do Cloudflare R2.
  * *Detalhes:* O frontend agora solicita uma URL temporÃƒÂ¡ria ao backend via `GET /api/r2/presigned-url`, faz o upload do arquivo binÃƒÂ¡rio *diretamente* para o R2, e depois registra a URL gerada no banco via `POST /api/homologation-documents/register`.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 18/06/2026 ÃƒÂ s 19:50 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `api/r2.ts`, `api/index.ts`, `src/pages/Commercial.tsx`

* **CorreÃƒÂ§ÃƒÂ£o do HistÃƒÂ³rico de Propostas:**
  * *O que foi feito:* Resolvido o problema onde o histÃƒÂ³rico de propostas aparecia vazio mesmo apÃƒÂ³s a paginaÃƒÂ§ÃƒÂ£o estar implementada. O erro ocorria pois a ordenaÃƒÂ§ÃƒÂ£o `.order('data_geracao', { ascending: false })` estava falhando silenciosamente no Supabase para registros antigos, disparando o bloco catch que zerava o estado. A ordenaÃƒÂ§ÃƒÂ£o foi revertida para a coluna nativa e segura `created_at`.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 18/06/2026 ÃƒÂ s 20:00 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`

---

## 1. VISÃƒÆ’O GERAL

* **PropÃƒÂ³sito do Sistema:** O **GestÃƒÂ£o MTSolar** ÃƒÂ© um sistema ERP/CRM completo desenvolvido para otimizar e gerenciar o ciclo de vida de projetos de energia solar fotovoltaica. Ele unifica a captaÃƒÂ§ÃƒÂ£o de leads, o funil comercial (CRM), dimensionamento tÃƒÂ©cnico, geraÃƒÂ§ÃƒÂ£o automatizada de propostas em PDF, homologaÃƒÂ§ÃƒÂ£o junto a concessionÃƒÂ¡rias de energia, controle de estoque de kits/componentes e o atendimento omnichannel integrado via WhatsApp.
* **PÃƒÂºblico-alvo:** Equipes comerciais (vendedores/parceiros), equipe tÃƒÂ©cnica/engenharia (instaladores, projetistas) e a administraÃƒÂ§ÃƒÂ£o (gestores e CEOs) de franquias ou distribuidoras de energia solar.
* **EstÃƒÂ¡gio Atual do Projeto:** O projeto encontra-se em estÃƒÂ¡gio avanÃƒÂ§ado de produÃƒÂ§ÃƒÂ£o. A aplicaÃƒÂ§ÃƒÂ£o web/desktop estÃƒÂ¡ totalmente operacional, integrada com a Evolution API v2 para atendimento e com o Supabase para banco de dados e arquivos. Possui tambÃƒÂ©m um wrapper mobile com Capacitor configurado para builds nativos Android e iOS. A arquitetura foi adaptada para um modelo SaaS **Multi-Tenant** funcional, isolando dados de diferentes empresas/franquias.


---

## 2. STACK TECNOLÃƒâ€œGICA

O projeto utiliza um conjunto de tecnologias modernas baseadas em TypeScript em todas as camadas:

### Frontend
* **Core:** React 19 + Vite 6
* **EstilizaÃƒÂ§ÃƒÂ£o:** TailwindCSS v4.1.14 para estilizaÃƒÂ§ÃƒÂ£o baseada em utilitÃƒÂ¡rios CSS rÃƒÂ¡pidos e modernos, em conjunto com o `lucide-react` para ÃƒÂ­cones.
* **Roteamento:** React Router DOM v7.13.0 para navegaÃƒÂ§ÃƒÂ£o SPA (Single Page Application).
* **AnimaÃƒÂ§ÃƒÂµes:** Motion (antigo Framer Motion) para micro-transiÃƒÂ§ÃƒÂµes fluidas na interface.
* **Biblioteca GrÃƒÂ¡fica/PDFs:** `jspdf` para montagem dinÃƒÂ¢mica de propostas e relatÃƒÂ³rios no lado do cliente.

### Backend
* **Servidor:** Node.js com Express v4.21.2 executado em ambiente Serverless na **Vercel** (conforme mapeamento do arquivo `vercel.json`).
* **CompilaÃƒÂ§ÃƒÂ£o/ExecuÃƒÂ§ÃƒÂ£o local:** `tsx` (TypeScript Execute) rodando em modo nativo ES Modules (`"type": "module"`).
* **SeguranÃƒÂ§a e UtilitÃƒÂ¡rios:** `bcryptjs` para hashing de senhas, `jsonwebtoken` para emissÃƒÂ£o e validaÃƒÂ§ÃƒÂ£o de tokens JWT, e `cookie-parser` / `cors` para gestÃƒÂ£o de requisiÃƒÂ§ÃƒÂµes.
* **Uploads de Arquivos:** `multer` configurado para receber uploads multipart/form-data em memÃƒÂ³ria no Express antes de repassÃƒÂ¡-los para o Supabase.

### Banco de Dados e Storage
* **Banco:** Supabase (PostgreSQL gerido na nuvem), acessado via SDK `@supabase/supabase-js` v2.97.0.
* **Storage (Buckets):** Supabase Storage para persistÃƒÂªncia permanente de documentos e arquivos de vistoria e propostas.
* **Storage Auxiliar:** Cloudflare R2 integrado atravÃƒÂ©s do `@aws-sdk/client-s3` para armazenamento secundÃƒÂ¡rio.

### IntegraÃƒÂ§ÃƒÂµes Externas
* **WhatsApp:** Evolution API v2 instalada em servidor prÃƒÂ³prio (geralmente hospedado na Railway), funcionando bidirecionalmente via requisiÃƒÂ§ÃƒÂµes HTTP REST (envio) e Webhooks configurados (recebimento).
* **Firebase:** Firebase Admin SDK v13.9.0 para disparar Push Notifications nativas a dispositivos mÃƒÂ³veis.

### Mobile
* **Wrapper Nativo:** Capacitor v8.0.2 (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/ios`) envelopando a aplicaÃƒÂ§ÃƒÂ£o web SPA e expondo APIs de hardware (como `@capacitor/camera` para vistorias em campo, `@capacitor/geolocation` para geolocalizaÃƒÂ§ÃƒÂ£o e `@capacitor/push-notifications`).


---

## 3. ESTRUTURA DE ARQUIVOS

O projeto segue a estrutura de monorepo integrando o frontend, backend (pasta `/api`) e as configuraÃƒÂ§ÃƒÂµes do Capacitor.

```text
/Gest-o-MTSolar
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ api/
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ index.ts               # Servidor backend central Express (Rotas da API, Cronjobs e Webhooks)
Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ r2.ts                  # UtilitÃƒÂ¡rios do cliente Cloudflare R2 (Upload, Delete, List)
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ android/                   # CÃƒÂ³digo nativo Android gerado pelo Capacitor
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ ios/                       # CÃƒÂ³digo nativo iOS gerado pelo Capacitor (se sincronizado)
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ src/
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ components/            # Componentes reutilizÃƒÂ¡veis globais da UI
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ Layout.tsx         # Estrutura principal da pÃƒÂ¡gina (Navbar, Sidebar responsiva e Container)
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ stock/             # Componentes especÃƒÂ­ficos de estoque (Modais de retirada, alertas, etc.)
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ context/               # Contextos de estado global
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ AuthContext.tsx    # Controle de autenticaÃƒÂ§ÃƒÂ£o (Login, Logout, SessÃƒÂ£o do UsuÃƒÂ¡rio)
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ SocketContext.tsx  # Contexto de socket/realtime (se aplicÃƒÂ¡vel ao painel)
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ db/
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ schema.sql         # Esquema de banco de dados mockado/local (SQLite de desenvolvimento)
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ hooks/                 # Hooks customizados para abstraÃƒÂ§ÃƒÂ£o de regras e buscas de dados
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ useHomologacaoDocs.ts
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ useStock.ts        # Gerenciamento de itens de estoque e escutas de realtime
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ lib/                   # InicializaÃƒÂ§ÃƒÂ£o de SDKs e APIs de terceiros
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ api.ts             # Cliente Axios configurado para requisiÃƒÂ§ÃƒÂµes ao backend da Vercel
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ documentCapture.ts # UtilitÃƒÂ¡rios de captura e redimensionamento de imagens de cÃƒÂ¢mera
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ notifications.ts   # ConfiguraÃƒÂ§ÃƒÂ£o nativa de push notifications e agendamento local
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ supabase.ts        # InicializaÃƒÂ§ÃƒÂ£o do cliente Supabase (Public Anon Client)
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ utils.ts           # FunÃƒÂ§ÃƒÂµes utilitÃƒÂ¡rias (Tailwind Merge, Clsx)
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ whatsapp.ts        # Cliente utilitÃƒÂ¡rio de WhatsApp do Frontend (legado/fallback)
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ pages/                 # Telas da aplicaÃƒÂ§ÃƒÂ£o
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ Dashboard.tsx      # MÃƒÂ©tricas financeiras, funil simplificado e estatÃƒÂ­sticas de vendas
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ Commercial.tsx     # CRM com funil Kanban, gestÃƒÂ£o de leads e projetos comerciais
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ ProposalGenerator.tsx # ConfiguraÃƒÂ§ÃƒÂ£o e geraÃƒÂ§ÃƒÂ£o dinÃƒÂ¢mica da proposta em PDF
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ EnergyCalculator.tsx  # Ferramenta de estimativa de kWh baseado no consumo dos equipamentos
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ Technical.tsx      # Ficha tÃƒÂ©cnica do projeto e envio de fotos georreferenciadas
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ Obra.tsx           # Checklist de instalaÃƒÂ§ÃƒÂ£o e acompanhamento de obras em tempo real
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ ObraSchedule.tsx   # CalendÃƒÂ¡rio e agendamentos de equipes de montagem/obra
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ Homologation.tsx   # Acompanhamento do status de homologaÃƒÂ§ÃƒÂ£o de projetos fotovoltaicos
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ NeoenergiaProtocols.tsx # Controle interno de protocolos na concessionÃƒÂ¡ria (Ex: Neoenergia)
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ Stock.tsx          # Controle visual de estoque, alertas de nÃƒÂ­vel crÃƒÂ­tico e histÃƒÂ³rico
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ KitPurchase.tsx    # Registro de compra de kits fotovoltaicos vinculados aos projetos
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ Agenda.tsx         # CalendÃƒÂ¡rio de compromissos para vendedores e engenheiros
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ Ponto.tsx          # Tela de ponto eletrÃƒÂ´nico com captura de selfie, geolocalizaÃƒÂ§ÃƒÂ£o e relatÃƒÂ³rios
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ Settings.tsx       # ConfiguraÃƒÂ§ÃƒÂ£o de dados e preferÃƒÂªncias da empresa
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ Users.tsx          # Painel de gestÃƒÂ£o de membros da equipe (vendedores, engenheiros, admin)
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ WhatsApp.tsx       # Chat central de atendimento ao cliente integrado ao WhatsApp
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ Login.tsx          # Tela de autenticaÃƒÂ§ÃƒÂ£o por e-mail e senha
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ Messages.tsx       # Interface interna de recados/mensagens da equipe
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ types/                 # Tipagens estÃƒÂ¡ticas do TypeScript (Ex: stock.ts)
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ App.tsx                # DefiniÃƒÂ§ÃƒÂ£o de rotas do React Router DOM e carregador do AuthProvider
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ main.tsx               # Ponto de entrada do React
Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ index.css              # ImportaÃƒÂ§ÃƒÂ£o e configuraÃƒÂ§ÃƒÂ£o do Tailwind CSS
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ supabase_schema.sql        # Esquema oficial com tabelas do PostgreSQL executado no Supabase
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ vercel.json                # ConfiguraÃƒÂ§ÃƒÂµes de rotas de deploy e agendamentos de Cron no backend Vercel
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ capacitor.config.ts        # ConfiguraÃƒÂ§ÃƒÂµes de build do wrapper Capacitor Mobile
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ package.json               # Gerenciamento de scripts NPM e dependÃƒÂªncias de pacotes
Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ .env                       # VariÃƒÂ¡veis de ambiente locais (sensÃƒÂ­veis)
```


---

## 4. MÃƒâ€œDULOS E FUNCIONALIDADES

O sistema ÃƒÂ© dividido em fluxos de negÃƒÂ³cios integrados que cobrem todas as fases de uma venda solar:

1. **AutenticaÃƒÂ§ÃƒÂ£o (`Login.tsx`):**
   * Tela inicial para inserÃƒÂ§ÃƒÂ£o de credenciais de e-mail e senha. Valida o usuÃƒÂ¡rio e estabelece o JWT seguro.
2. **Dashboard Geral (`Dashboard.tsx`):**
   * GrÃƒÂ¡ficos financeiros, resumo do funil de vendas ativo, volume de geraÃƒÂ§ÃƒÂ£o projetado e atalhos rÃƒÂ¡pidos para novas aÃƒÂ§ÃƒÂµes.
3. **CRM / Comercial (`Commercial.tsx`):**
   * Kanban interativo contendo colunas customizÃƒÂ¡veis (ex: Lead, Vistoria Agendada, Proposta Elaborada, Fechamento). Os vendedores criam cards de clientes e arrastam entre fases. Permite o upload do contrato assinado.
4. **Calculadora de Consumo (`EnergyCalculator.tsx`):**
   * Permite cadastrar mÃƒÂºltiplos aparelhos elÃƒÂ©tricos (lÃƒÂ¢mpadas, ar-condicionados, motores), suas potÃƒÂªncias, horas de uso diÃƒÂ¡rio e dias de uso mensal para calcular o consumo total em kWh de forma automÃƒÂ¡tica.
5. **Gerador de Propostas (`ProposalGenerator.tsx`):**
   * FormulÃƒÂ¡rio passo-a-passo no qual o vendedor informa os dados de consumo do cliente, seleciona o kit (painÃƒÂ©is, inversores, estruturas), configura financiamentos e gera uma proposta comercial personalizada no formato de arquivo PDF (salva no storage do Supabase).
6. **WhatsApp / Chat Center (`WhatsApp.tsx` e `AttendanceRegistry.tsx`):**
   * Painel de atendimento em tempo real. Exibe conversas em andamento agrupadas por status (Aguardando, Em Atendimento, Resolvidas). Permite envio de textos, ÃƒÂ¡udios e mÃƒÂ­dias, bem como transferÃƒÂªncia de tickets entre vendedores e departamentos.
   * **Bloqueio de Conversa em Atendimento:** Quando um agente estÃƒÂ¡ atendendo uma conversa (`status = 'in_progress'`), ela fica bloqueada para outros agentes. O frontend exibe uma barra amarela com cadeado indicando o nome do responsÃƒÂ¡vel em vez do campo de mensagem. CEOs tÃƒÂªm acesso irrestrito. A validaÃƒÂ§ÃƒÂ£o ocorre tanto no backend (`GET /api/conversations/:id/messages`, `POST /api/whatsapp/send`, `send-media` e `send-audio`) quanto no frontend.
   * **Mensagens AutomÃƒÂ¡ticas de HorÃƒÂ¡rio:** TrÃƒÂªs cronjobs enviam mensagens automÃƒÂ¡ticas de inÃƒÂ­cio de expediente (08:30 BRT), pausa para almoÃƒÂ§o (12:00 BRT) e fim de expediente (17:00 BRT) para todas as conversas ativas (`in_progress`).
   * **Registro de Atendimentos:** Nova pÃƒÂ¡gina gerencial/planilha (`AttendanceRegistry.tsx`) que exibe todos os clientes em andamento. Destaca visualmente em vermelho as conversas ociosas (sem qualquer interaÃƒÂ§ÃƒÂ£o hÃƒÂ¡ mais de 5 dias). Vendedores visualizam de forma isolada apenas os seus prÃƒÂ³prios atendimentos, enquanto a gestÃƒÂ£o (ADM/CEO) tem visÃƒÂ£o integral. Permite filtragem de conversas por Vendedor e por Etiqueta, e apresenta a ÃƒÂºltima observaÃƒÂ§ÃƒÂ£o registrada para o atendimento via join com `whatsapp_observations`.
7. **Ficha TÃƒÂ©cnica e Vistoria (`Technical.tsx`):**
   * Acesso aos dados fÃƒÂ­sicos do local do cliente (tipo de telhado, orientaÃƒÂ§ÃƒÂ£o, padrÃƒÂ£o de entrada, disjuntores). Permite o envio de fotos comprobatÃƒÂ³rias obrigatÃƒÂ³rias do local da instalaÃƒÂ§ÃƒÂ£o.
8. **GestÃƒÂ£o de Obras (`Obra.tsx` e `ObraSchedule.tsx`):**
   * Cronograma de montagem do sistema. Acompanhamento visual de status (NÃƒÂ£o Iniciado, Em Andamento, ConcluÃƒÂ­do) e atribuiÃƒÂ§ÃƒÂ£o de tÃƒÂ©cnicos responsÃƒÂ¡veis.
9. **HomologaÃƒÂ§ÃƒÂ£o e ConcessionÃƒÂ¡rias (`Homologation.tsx` e `NeoenergiaProtocols.tsx`):**
   * Tela burocrÃƒÂ¡tica para anexar solicitaÃƒÂ§ÃƒÂµes de conexÃƒÂ£o, pareceres de acesso e protocolos de vistoria junto a distribuidoras (ex: Neoenergia).
10. **Estoque (`Stock.tsx`):**
    * GestÃƒÂ£o fÃƒÂ­sica de equipamentos como mÃƒÂ³dulos solares, inversores e estruturas. Emite alertas de estoque baixo baseado em limites (threshold) cadastrados.
11. **Ponto EletrÃƒÂ´nico (Ponto/Jornada):**
    * Sistema de controle de ponto eletrÃƒÂ´nico para colaboradores. Permite bater ponto (entrada, inÃƒÂ­cio de almoÃƒÂ§o, fim de almoÃƒÂ§o e saÃƒÂ­da) enviando a selfie e a geolocalizaÃƒÂ§ÃƒÂ£o capturada pelo GPS do dispositivo.
    * **GestÃƒÂ£o de HorÃƒÂ¡rios:** ConfiguraÃƒÂ§ÃƒÂ£o de turnos de trabalho (`work_schedules`) por funÃƒÂ§ÃƒÂ£o de usuÃƒÂ¡rio pela gerÃƒÂªncia (`CEO`/`ADMIN`).
    * **Fluxo de Ajustes:** Os funcionÃƒÂ¡rios podem solicitar correÃƒÂ§ÃƒÂµes de batidas de ponto justificadas, que passam por um fluxo de aprovaÃƒÂ§ÃƒÂ£o pendente avaliado pelos administradores.


---

## 5. BANCO DE DADOS

O banco de dados ÃƒÂ© hospedado no **Supabase (PostgreSQL)** e implementa uma estrutura rÃƒÂ­gida de multi-tenancy.

### Principais Tabelas e Colunas

#### `companies` (Tenants)
* `id` (UUID - Primary Key)
* `name` (TEXT)
* `whatsapp_instance` (TEXT - Nome legado da instÃƒÂ¢ncia principal de WhatsApp)
* `created_at` (TIMESTAMPTZ)

#### `company_instances` (VÃƒÂ­nculo de InstÃƒÂ¢ncias WhatsApp)
* `id` (UUID - Primary Key)
* `company_id` (UUID - References `companies.id`)
* `instance_name` (TEXT - Nome normalizado da instÃƒÂ¢ncia da Evolution API)
* `created_at` (TIMESTAMPTZ)

#### `users` (UsuÃƒÂ¡rios / Colaboradores)
* `id` (SERIAL - Primary Key)
* `company_id` (UUID - References `companies.id`)
* `name` (TEXT)
* `email` (TEXT - UNIQUE)
* `password_hash` (TEXT)
* `role` (TEXT - Restrito via CHECK: `'CEO', 'ADMIN', 'COMMERCIAL', 'TECHNICAL'`)
* `active` (BOOLEAN - PadrÃƒÂ£o TRUE)
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

#### `proposal_history` (HistÃƒÂ³rico de Propostas Geradas)
* `id` (SERIAL - Primary Key)
* `company_id` (UUID - References `companies.id`)
* `client_name` (TEXT)
* `proposal_number` (TEXT)
* `url_arquivo` (TEXT - Link do arquivo PDF)
* `raw_data` (JSON - Objeto contendo todas as variÃƒÂ¡veis utilizadas na geraÃƒÂ§ÃƒÂ£o)
* `data_geracao` (TIMESTAMPTZ)
* `data_expiracao` (TIMESTAMPTZ - PadrÃƒÂ£o de 7 dias ÃƒÂºteis apÃƒÂ³s geraÃƒÂ§ÃƒÂ£o)
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

#### `stock_withdrawals` (SaÃƒÂ­das de Estoque)
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
* `unread_count` (INTEGER - PadrÃƒÂ£o 0)
* `last_message` (TEXT)
* `last_message_at` (TIMESTAMPTZ)
* `status` (TEXT - `'waiting', 'open', 'closed'`)
* `assigned_to` (INTEGER - References `users.id`)
* `instance` (TEXT - Nome normalizado da instÃƒÂ¢ncia responsÃƒÂ¡vel)
* `tags` (TEXT[] - Etiquetas aplicadas ÃƒÂ  conversa)

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
* `media_url` (TEXT - Link pÃƒÂºblico e permanente no Supabase Storage)
* `file_name` (TEXT)
* `file_size` (NUMERIC)
* `is_internal` (BOOLEAN - Se a mensagem foi escrita como anotaÃƒÂ§ÃƒÂ£o interna e nÃƒÂ£o enviada ao cliente)

#### `work_schedules` (HorÃƒÂ¡rios de Trabalho por FunÃƒÂ§ÃƒÂ£o/Empresa)
* `id` (SERIAL - Primary Key)
* `company_id` (UUID - References `companies.id` ON DELETE CASCADE)
* `role` (TEXT - Restrito via CHECK: `'CEO', 'ADMIN', 'COMMERCIAL', 'TECHNICAL'`)
* `entry_time` (TIME - HorÃƒÂ¡rio de entrada)
* `lunch_start` (TIME - HorÃƒÂ¡rio de inÃƒÂ­cio do almoÃƒÂ§o)
* `lunch_end` (TIME - HorÃƒÂ¡rio de tÃƒÂ©rmino do almoÃƒÂ§o)
* `exit_time` (TIME - HorÃƒÂ¡rio de saÃƒÂ­da)
* `created_at` (TIMESTAMPTZ)

#### `time_records` (Registros de Ponto EletrÃƒÂ´nico)
* `id` (SERIAL - Primary Key)
* `company_id` (UUID - References `companies.id` ON DELETE CASCADE)
* `user_id` (INTEGER - References `users.id` ON DELETE CASCADE)
* `type` (TEXT - Restrito via CHECK: `'entry', 'lunch_start', 'lunch_end', 'exit'`)
* `timestamp` (TIMESTAMPTZ - Registro de data/hora do ponto)
* `latitude` (NUMERIC)
* `longitude` (NUMERIC)
* `selfie_url` (TEXT - Link pÃƒÂºblico da foto de selfie no Supabase Storage)
* `selfie_path` (TEXT - Caminho interno da foto no bucket de Storage)
* `status` (TEXT - Restrito via CHECK: `'pending', 'approved', 'adjustment_requested'`)

#### `time_adjustments` (SolicitaÃƒÂ§ÃƒÂµes de Ajuste de Ponto)
* `id` (SERIAL - Primary Key)
* `company_id` (UUID - References `companies.id` ON DELETE CASCADE)
* `time_record_id` (INTEGER - References `time_records.id` ON DELETE CASCADE)
* `requested_by` (INTEGER - References `users.id` ON DELETE CASCADE)
* `justification` (TEXT - Justificativa detalhada do funcionÃƒÂ¡rio para o ajuste)
* `new_timestamp` (TIMESTAMPTZ - Nova data/hora solicitada)
* `status` (TEXT - Restrito via CHECK: `'pending', 'approved', 'rejected'`)
* `reviewed_by` (INTEGER - References `users.id` - ID do usuÃƒÂ¡rio gestor que aprovou/rejeitou)
* `reviewed_at` (TIMESTAMPTZ - Data/hora da revisÃƒÂ£o)
* `created_at` (TIMESTAMPTZ)


### Regras de Isolamento Multi-Tenant (company_id)
* **Preenchimento:** Todas as inserÃƒÂ§ÃƒÂµes nas tabelas crÃƒÂ­ticas incluem a coluna `company_id` obtida no lado do servidor via decodificaÃƒÂ§ÃƒÂ£o do JWT Token do usuÃƒÂ¡rio conectado.
* **Isolamento:** Toda requisiÃƒÂ§ÃƒÂ£o `SELECT`, `UPDATE` ou `DELETE` no backend Express injeta a clÃƒÂ¡usula `.eq('company_id', req.user.company_id)` para impedir vazamento ou alteraÃƒÂ§ÃƒÂ£o de dados entre diferentes empresas contratantes.


---

## 6. INTEGRAÃƒâ€¡Ãƒâ€¢ES EXTERNAS

### Evolution API (WhatsApp)
* **Envio:** O frontend dispara requisiÃƒÂ§ÃƒÂµes para a API local Express em rotas como `/api/whatsapp/send`. O backend localiza as credenciais seguras da instÃƒÂ¢ncia (Base URL, API Key) na tabela `company_instances` e faz o disparo do JSON para a Evolution API.
* **Recebimento via Webhook:** A Evolution API monitora o celular e envia webhooks (`POST /api/webhooks/whatsapp`) para o backend da aplicaÃƒÂ§ÃƒÂ£o. O Express resolve qual empresa ÃƒÂ© dona da mensagem processando o `instance_name` recebido e salvando nas tabelas `whatsapp_conversations` e `whatsapp_messages`.

### Supabase Storage
O armazenamento de arquivos ÃƒÂ© dividido nos seguintes Buckets de acesso:
1. **`whatsapp-media`:** Guarda permanentemente imagens, ÃƒÂ¡udios e documentos trocados pelo painel do WhatsApp.
2. **`propostas`:** Armazena os PDFs de propostas gerados pela equipe comercial.
3. **`uploads`:** Guarda documentos gerais e fotos rÃƒÂ¡pidas de vistoria cadastrados via CRM Kanban.
4. **`obras-fotos`:** Fotos de checklists de obras enviadas pelos instaladores.
5. **`homologacao-docs`:** DocumentaÃƒÂ§ÃƒÂµes burocrÃƒÂ¡ticas submetidas ÃƒÂ s distribuidoras de energia.

### Firebase (Push Notifications)
* **ServiÃƒÂ§o FCM:** O Firebase Admin SDK no Express ÃƒÂ© inicializado com chaves privadas de ambiente. Quando um status de projeto ou mensagem do WhatsApp precisa alertar um usuÃƒÂ¡rio mobile, o backend busca o `push_token` do usuÃƒÂ¡rio na tabela `users` e envia o payload.

### Vercel (Deploy e Serverless)
* **Backend Serverless:** O arquivo `/api/index.ts` roda em ambiente Vercel. Todas as rotas de API `/api/*` sÃƒÂ£o reescritas para apontar para a serverless function monolÃƒÂ­tica.
* **Cronjobs:** Conforme definido em `vercel.json`, a Vercel aciona rotas agendadas em background:
  * `GET /api/cleanup-proposals` Ã¢â‚¬â€ Diariamente ÃƒÂ s 03:00 UTC. Remove propostas expiradas.
  * `GET /api/cron/agenda-reminders` Ã¢â‚¬â€ Diariamente ÃƒÂ s 07:00 UTC. Notifica usuÃƒÂ¡rios de compromissos prÃƒÂ³ximos.
  * `POST /api/cron/mensagem-inicio-expediente` Ã¢â‚¬â€ Segunda a sexta, 11:30 UTC (08:30 BRT). Envia mensagem de inÃƒÂ­cio de expediente para conversas em atendimento.
  * `POST /api/cron/mensagem-almoco` Ã¢â‚¬â€ Segunda a sexta, 15:00 UTC (12:00 BRT). Envia mensagem de pausa para almoÃƒÂ§o.
  * `POST /api/cron/mensagem-fim-expediente` Ã¢â‚¬â€ Segunda a sexta, 20:00 UTC (17:00 BRT). Envia mensagem de encerramento do atendimento.

### Railway (Evolution API)
* A hospedagem das instÃƒÂ¢ncias da Evolution API e da conexÃƒÂ£o com o WhatsApp do cliente final reside em um servidor Railway, provendo uma API contÃƒÂ­nua com IP estÃƒÂ¡vel para nÃƒÂ£o derrubar o escaneamento do QR Code.


---

## 7. AUTENTICAÃƒâ€¡ÃƒÆ’O E SEGURANÃƒâ€¡A

* **Fluxo de Login e JWT:**
  1. O usuÃƒÂ¡rio submete e-mail e senha na tela de Login.
  2. O backend faz o hash e compara usando `bcrypt.compareSync()`. Caso o e-mail seja `ceo@mtsolar.com` e a senha `admin123`, hÃƒÂ¡ um fallback administrador configurado para facilitar a recuperaÃƒÂ§ÃƒÂ£o.
  3. Com a senha correta, ÃƒÂ© assinado um Token JWT contendo: `id`, `name`, `role` e `company_id`.
  4. O token ÃƒÂ© retornado na resposta JSON e gravado em `localStorage` via `login()` do `AuthContext`. O `AuthContext` tambÃƒÂ©m emite um cookie via backend simultaneamente.
  5. Em toda inicializaÃƒÂ§ÃƒÂ£o do React, `AuthContext` chama `GET /api/auth/me` para validar a sessÃƒÂ£o. Em caso de falha, remove o token do `localStorage` automaticamente.
* **Cliente HTTP (`src/lib/api.ts`):**
  * InstÃƒÂ¢ncia Axios com `timeout: 15000ms` e `withCredentials: true`.
  * **`baseURL` dinÃƒÂ¢mica:** Se rodando em plataforma nativa Capacitor, aponta para `https://gest-o-mt-solar.vercel.app`. Em ambiente web, usa `window.location.origin` (funciona tanto em local quanto em produÃƒÂ§ÃƒÂ£o sem reconfiguraÃƒÂ§ÃƒÂ£o).
  * Interceptor automÃƒÂ¡tico que injeta o header `Authorization: Bearer <token>` lido do `localStorage` em todas as requisiÃƒÂ§ÃƒÂµes.
* **Role-Based Access Control (Roles de UsuÃƒÂ¡rio e Rotas Protegidas):**

  | Rota | CEO | ADMIN | COMMERCIAL | TECHNICAL |





---:|
  | `/` (Dashboard) | Ã¢Å“â€¦ | Ã¢Å“â€¦ | Ã¢Å“â€¦ | Ã¢Å“â€¦ |
  | `/commercial` (CRM) | Ã¢Å“â€¦ | Ã¢Å“â€¦ | Ã¢Å“â€¦ | Ã¢ÂÅ’ |
  | `/whatsapp` | Ã¢Å“â€¦ | Ã¢Å“â€¦ | Ã¢Å“â€¦ | Ã¢ÂÅ’ |
  | `/proposal-generator` | Ã¢Å“â€¦ | Ã¢Å“â€¦ | Ã¢Å“â€¦ | Ã¢ÂÅ’ |
  | `/agenda` | Ã¢Å“â€¦ | Ã¢Å“â€¦ | Ã¢Å“â€¦ | Ã¢ÂÅ’ |
  | `/calculadora` | Ã¢Å“â€¦ | Ã¢Å“â€¦ | Ã¢Å“â€¦ | Ã¢Å“â€¦ |
  | `/technical` | Ã¢Å“â€¦ | Ã¢Å“â€¦ | Ã¢ÂÅ’ | Ã¢Å“â€¦ |
  | `/obra` | Ã¢Å“â€¦ | Ã¢Å“â€¦ | Ã¢ÂÅ’ | Ã¢Å“â€¦ |
  | `/cronograma` | Ã¢Å“â€¦ | Ã¢Å“â€¦ | Ã¢Å“â€¦ | Ã¢Å“â€¦ |
  | `/homologation` | Ã¢Å“â€¦ | Ã¢Å“â€¦ | Ã¢Å“â€¦ | Ã¢ÂÅ’ |
  | `/estoque` | Ã¢Å“â€¦ | Ã¢Å“â€¦ | Ã¢ÂÅ’ | Ã¢ÂÅ’ |
  | `/kit-purchase` | Ã¢Å“â€¦ | Ã¢Å“â€¦ | Ã¢ÂÅ’ | Ã¢ÂÅ’ |
  | `/users` | Ã¢Å“â€¦ | Ã¢Å“â€¦ | Ã¢ÂÅ’ | Ã¢ÂÅ’ |
  | `/settings` | Ã¢Å“â€¦ | Ã¢Å“â€¦ | Ã¢ÂÅ’ | Ã¢ÂÅ’ |
  | `/contracts` | Ã¢Å“â€¦ | Ã¢Å“â€¦ | Ã¢ÂÅ’ | Ã¢ÂÅ’ |
  | `/neoenergia` | Ã¢Å“â€¦ | Ã¢Å“â€¦ | Ã¢ÂÅ’ | Ã¢ÂÅ’ |
  | `/finished` | Ã¢Å“â€¦ | Ã¢Å“â€¦ | Ã¢ÂÅ’ | Ã¢ÂÅ’ |
  | `/messages` | Ã¢Å“â€¦ | Ã¢Å“â€¦ | Ã¢ÂÅ’ | Ã¢Å“â€¦ |
  | `/documents` | Ã¢Å“â€¦ | Ã¢Å“â€¦ | Ã¢ÂÅ’ | Ã¢ÂÅ’ |

  * **Regra especial COMMERCIAL:** Se o usuÃƒÂ¡rio tem `role = COMMERCIAL` e tenta acessar qualquer rota fora das permitidas, ÃƒÂ© redirecionado para `/` pelo `PrivateRoute` em `App.tsx`.
* **Middleware de AutenticaÃƒÂ§ÃƒÂ£o (`authenticateToken`):**
  * Toda rota protegida do Express passa por este middleware. Ele lÃƒÂª o token do header `Authorization: Bearer <token>` ou do Cookie, verifica a assinatura contra `JWT_SECRET` e injeta `req.user` contendo as informaÃƒÂ§ÃƒÂµes e o `company_id` da empresa na requisiÃƒÂ§ÃƒÂ£o.
* **Firebase Admin (Push Notifications):**
  * A inicializaÃƒÂ§ÃƒÂ£o do Firebase Admin ÃƒÂ© **condicional**: sÃƒÂ³ ocorre se as trÃƒÂªs variÃƒÂ¡veis `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY` e `FIREBASE_CLIENT_EMAIL` estiverem presentes no ambiente. Caso contrÃƒÂ¡rio, a API inicializa normalmente sem crash.


---

## 8. REGRAS DE NEGÃƒâ€œCIO

* **Isolamento de VisualizaÃƒÂ§ÃƒÂ£o por Role (WhatsApp):**
  * Vendedores (`COMMERCIAL`) visualizam e respondem chats apenas sob as seguintes regras:
    1. A conversa nÃƒÂ£o tem dono (`assigned_to IS NULL`) e estÃƒÂ¡ na fila (`status = 'waiting'`).
    2. A conversa estÃƒÂ¡ explicitamente atribuÃƒÂ­da a ele (`assigned_to = user_id`).
  * Administradores e CEOs acessam todas as conversas sem barreiras. Conversas em atendimento por outros agentes aparecem para o COMMERCIAL, mas travadas (bloqueadas para escrita e com conteÃƒÂºdo oculto).
* **AssunÃƒÂ§ÃƒÂ£o e TransferÃƒÂªncia de Tickets:**
  * **Assumir:** Quando um atendente clica em uma conversa na fila, o sistema atualiza `assigned_to` para o seu ID de usuÃƒÂ¡rio e o status para `in_progress`.
  * **Transferir:** Um atendente comercial pode transferir a conversa para outro colaborador ou departamento. O sistema apaga o `assigned_to` anterior, atribui ao novo colaborador e registra uma mensagem do sistema indicando o direcionamento.
  * **TransferÃƒÂªncia de InstÃƒÂ¢ncia:** InstÃƒÂ¢ncia `atendimento-cliente` Ã¢â€ â€™ `mtsolar` (administrativo) e vice-versa, disponÃƒÂ­vel apenas para ADMINs.
* **Sistema de Etiquetas (Tags) das Conversas:**
  * Cada conversa pode ter **mÃƒÂºltiplas etiquetas** armazenadas na coluna `tags TEXT[]`.
  * As etiquetas disponÃƒÂ­veis sÃƒÂ£o definidas no frontend em `WHATSAPP_TAGS` (constante em `WhatsApp.tsx`) com id, label e cor hex.
  * A lÃƒÂ³gica de toggle: ao clicar em uma etiqueta, se ela jÃƒÂ¡ existe no array ÃƒÂ© removida; se nÃƒÂ£o existe, ÃƒÂ© adicionada. O estado completo do array ÃƒÂ© sempre enviado ao backend (`PUT /api/conversations/:id/tag`).
  * Etiquetas disponÃƒÂ­veis: Atendimento Iniciado, Cuidar e Fechar, Fechou Venda, Lead Desqualificado, Lead Qualificado, NÃƒÂ£o Fechou Venda, OrÃƒÂ§amento Enviado, Visita Agendada, Transferido.
* **Funil de Vendas Kanban:**
  * Os projetos transitam de forma linear pelas colunas de estÃƒÂ¡gio. Cada estÃƒÂ¡gio exige preenchimento ou upload de dados diferentes (ex: o fechamento comercial exige upload de contrato; a fase tÃƒÂ©cnica exige vistoria cadastrada).


---

## 9. FLUXO DO WHATSAPP

O fluxo de processamento de mÃƒÂ­dias foi otimizado para evitar expiraÃƒÂ§ÃƒÂ£o rÃƒÂ¡pida de links e garantir o histÃƒÂ³rico permanente.

### Envio de Mensagens

#### Envio de Texto
* O front-end envia para `/api/whatsapp/send`. A Evolution despacha e o Express grava a mensagem no banco.

#### Envio de Imagens/Documentos
* O front-end faz o upload do arquivo para o bucket temporÃƒÂ¡rio `/api/whatsapp/upload-media`, que retorna uma URL assinada temporÃƒÂ¡ria (vÃƒÂ¡lida por 600 segundos) e o caminho do arquivo (`filePath`).
* O front-end chama `/api/whatsapp/send-media` passando essa URL assinada como origem para a Evolution API realizar o download e envio.
* ApÃƒÂ³s a confirmaÃƒÂ§ÃƒÂ£o da Evolution API, o Express gera a URL pÃƒÂºblica e definitiva via `supabaseAdmin.storage.from(...).getPublicUrl(filePath)` e insere o registro com `media_url: publicUrl` e `from_me: true`.

#### Envio de ÃƒÂudio
* O front-end grava o ÃƒÂ¡udio e envia uma string em formato `base64` no corpo da requisiÃƒÂ§ÃƒÂ£o para `/api/whatsapp/send-audio`.
* O backend Express repassa o ÃƒÂ¡udio em `base64` para a Evolution API.
* ApÃƒÂ³s sucesso no disparo, o Express converte o `base64` em um `Buffer` fÃƒÂ­sico e realiza o upload para o Supabase Storage sob o caminho `company_id/conversationId/audio-[timestamp].ogg`.
* O backend obtÃƒÂ©m a URL pÃƒÂºblica estÃƒÂ¡tica gerada pelo storage e insere no banco a nova mensagem contendo `media_url: audioPublicUrl`, `media_type: 'audio'`, `file_name: 'audio.ogg'` e `from_me: true`.

### Recebimento (Webhook)
* Quando uma mensagem de mÃƒÂ­dia externa (imagem, ÃƒÂ¡udio ou documento) chega pelo Webhook da Evolution API:
  1. O Express intercepta a mensagem no webhook de recebimento (`/api/webhooks/whatsapp`).
  2. Caso a mensagem contenha mÃƒÂ­dia, o webhook faz uma chamada reversa ÃƒÂ  Evolution API (`/chat/getBase64FromMediaMessage`) para ler o binÃƒÂ¡rio em formato `base64`.
  3. O backend converte o `base64` para binÃƒÂ¡rio (`Buffer`) e realiza o upload permanente no Supabase Storage no bucket `whatsapp-media`.
  4. O link pÃƒÂºblico estÃƒÂ¡tico e definitivo gerado pelo Supabase ÃƒÂ© salvo na coluna `media_url` da mensagem gravada no banco com `from_me: false`.


---

## 10. BUILD E DEPLOY

### Processo de Build do Frontend
* O build ÃƒÂ© executado via script do Vite: `npm run build` ou `vite build`. O compilador lÃƒÂª as configuraÃƒÂ§ÃƒÂµes do arquivo `vite.config.ts` e gera os arquivos estÃƒÂ¡ticos indexados na pasta `/dist`.

### Deploy na Vercel
* O deploy ÃƒÂ© estruturado com base nas regras do arquivo `vercel.json`:
  * As requisiÃƒÂ§ÃƒÂµes direcionadas para `/api/*` sÃƒÂ£o interceptadas e encaminhadas para a serverless function Express (`/api/index.ts`).
  * Qualquer outra rota de pÃƒÂ¡gina `/.*` ÃƒÂ© redirecionada para a pÃƒÂ¡gina estÃƒÂ¡tica raiz `/index.html` para deixar a navegaÃƒÂ§ÃƒÂ£o de rotas internas a cargo do React Router DOM (SPA).

### Mobile com Capacitor
* **SincronizaÃƒÂ§ÃƒÂ£o:** ApÃƒÂ³s o build de produÃƒÂ§ÃƒÂ£o (`npm run build`), o comando `npx cap sync` atualiza as plataformas mÃƒÂ³veis (`android` e `ios`) copiando a pasta `/dist` e os plugins necessÃƒÂ¡rios.
* **Build de Desenvolvimento:** O comando `npm run build:mobile` usa chaves e arquivos `.env.mobile` especÃƒÂ­ficos para gerar o build e sincronizar imediatamente no simulador ou celular conectado.


---

## 11. PROBLEMAS RESOLVIDOS E TAREFAS CONCLUÃDAS

---

### INCIDENTE: Perda de Dados em proposal_history (18/06 a 25/06/2026)

> **ATENCAO CRITICA:** Este incidente resultou em perda irreversivel de dados de producao. Registrado aqui permanentemente como referencia historica para qualquer consulta futura sobre propostas ausentes.

* **Causa:** O cronjob `GET /api/cleanup-proposals`, criado no commit `f868250` em 18/06/2026, foi implementado com logica incorreta: em vez de apenas zerar o campo `url_arquivo` nas propostas expiradas (preservando o registro historico), a rota fazia um `.delete()` completo das linhas na tabela `proposal_history`, apagando permanentemente todos os dados, incluindo `client_name`, `raw_data` e `proposal_number`.
* **Periodo afetado:** O cronjob executou diariamente as 03:00 UTC entre 19/06 e 25/06/2026. Propostas geradas antes de aproximadamente **11/06/2026** (30 dias antes do dia de execucao do cleanup) foram sendo excluidas de forma incremental a cada execucao. Propostas geradas apos essa data permaneceram intactas.
* **Correcao:** O commit `765c66a` em 25/06/2026 substituiu a logica de DELETE por um UPDATE `url_arquivo = null`, preservando permanentemente o registro historico e removendo apenas o arquivo PDF fisico do storage.
* **Dados perdidos:** **Nao recuperaveis.** O plano atual do Supabase nao possui PITR (Point-in-Time Recovery) ativo. A decisao de nao ativar o PITR foi tomada por questoes de custo em 26/06/2026.
* **Risco adicional removido em 26/06/2026:** A rota de conclusao de homologacao (`connection_point_approved` em `api/index.ts`) tambem possuia uma query `.delete()` em `proposal_history` filtrada por `project_id`. Embora inofensiva no estado atual (a coluna `project_id` nunca foi populada em `proposal_history`), representava um risco futuro grave. Esta linha foi removida preventivamente e substituida por `.update({ url_arquivo: null })`.

---


* **Deduplicação de Clientes e Filtro de Vendedor no Dashboard:**
  * *O que foi feito:* 
    1. Implementada verificação de duplicidade de cliente no backend (`POST /api/clients`) por telefone ou CPF/CNPJ. Retorna HTTP 409 caso exista, exibindo o nome do usuário que o cadastrou.
    2. Adicionado tratamento de erro HTTP 409 no frontend (`Commercial.tsx`), exibindo um alerta amigável ao vendedor e mantendo o modal aberto para correção.
    3. Atualizadas as rotas `GET /api/stats` e `GET /api/neoenergia` para filtrar os projetos pelo vendedor (`created_by`) logado caso ele tenha a role `COMMERCIAL`.
    4. Implementado filtro de projetos no lado do cliente em `Dashboard.tsx` (na listagem de Homologações) para que usuários com role `COMMERCIAL` vejam apenas seus próprios projetos.
  * *Data e hora da alteração:* 27/06/2026 às 14:45 (Horário Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/Commercial.tsx`, `src/pages/Dashboard.tsx`.

* **Alerta de Inatividade e Auto-encerramento de Conversas:**
  * *O que foi feito:* Criada a rota de cronjob `GET /api/cron/check-inatividade` em `api/index.ts` e registrada em `vercel.json` para rodar diariamente às 08:00 UTC. Conversas sem interação há mais de 10 dias alertam o vendedor via Push Notification; conversas há mais de 30 dias são encerradas automaticamente com mensagem interna.
  * *Data e hora da alteração:* 27/06/2026 às 15:00 (Horário Local)
  * *Arquivos modificados:* `api/index.ts`, `vercel.json`.

* **Transferência para Vendedor Específico (Somente CEO):**
  * *O que foi feito:* Adicionada nova rota `POST /api/whatsapp/transfer-to-agent` no backend, protegida pela role `CEO`. A rota reatribui a conversa ao vendedor escolhido, insere uma nota interna de registro e dispara push notification para o vendedor de destino. No frontend (`WhatsApp.tsx`): adicionados 3 novos estados (`showCeoTransferModal`, `ceoTransferTarget`, `isTransferringToAgent`), a função `transferToSpecificAgent`, um botão roxo "Transferir para Vendedor" no painel de ações desktop (visível apenas para CEO) e o modal completo com lista de vendedores filtrados por role `COMMERCIAL`. O `fetchAgents` foi atualizado para buscar também o campo `role`, necessário para o filtro do modal.
  * *Data e hora da alteração:* 27/06/2026 às 15:07 (Horário Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/WhatsApp.tsx`.

* **Relatório de Origem de Vendas (CEO) e Campo Origem:**
  * *O que foi feito:* Adicionado o campo `origem_venda` no payload de `POST /api/clients` e `PUT /api/clients/:id` no backend. No frontend (`Commercial.tsx`), foi adicionado o select para o campo "Origem da Venda" com opções predefinidas logo após o Endereço. Criada a página `SalesOrigin.tsx` com gráficos de barra para o CEO analisar os canais de aquisição. A rota protegida e o item no menu lateral foram adicionados apenas para role `CEO`. Requer execução manual do SQL no Supabase: `ALTER TABLE clients ADD COLUMN IF NOT EXISTS origem_venda TEXT;`.
  * *Data e hora da alteração:* 27/06/2026 às 15:00 (Horário Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/Commercial.tsx`, `src/App.tsx`, `src/components/Layout.tsx`. Arquivo criado: `src/pages/SalesOrigin.tsx`.

* **ImplementaÃ§Ã£o da Nova PÃ¡gina de Registro de Atendimentos:**
  * *O que foi feito:* Criada a pÃ¡gina "Registro de Atendimentos" (`AttendanceRegistry.tsx`) funcionando como uma planilha gerencial de clientes em andamento no WhatsApp. Adicionada a rota `GET /api/attendance-registry` com suporte a multi-tenancy e filtro de role (Vendedores veem apenas as prÃ³prias conversas, ADM/CEO veem todas). A tabela exibe o Cliente, Vendedor ResponsÃ¡vel, Etiquetas, Tempo sem InteraÃ§Ã£o (calculado a partir de `last_message_at`) e a Ãºltima nota da tabela `whatsapp_observations`. Inclui funcionalidade de destacar em vermelho conversas sem interaÃ§Ã£o hÃ¡ mais de 5 dias e filtro por vendedor/etiquetas.
  * *Data e hora da alteraÃ§Ã£o:* 25/06/2026 Ã s 16:16 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/AttendanceRegistry.tsx`, `src/components/Layout.tsx`, `src/App.tsx` e `RESUMO_MESTRE.md`.

* **Implementação: Integração Kommo CRM → MTSolar (Round-Robin + Webhook):**
  * *O que foi feito:* Adicionados 6 blocos em `api/index.ts` implementando a integração completa entre o Kommo CRM e o sistema de atendimento WhatsApp do MTSolar:
    1. **`kommoApi()`** — Helper centralizado para chamadas REST ao Kommo usando `KOMMO_LONG_LIVED_TOKEN` e `KOMMO_SUBDOMAIN` (variáveis de ambiente).
    2. **`getRoundRobinVendedor()`** — Distribui leads automaticamente para o vendedor `COMMERCIAL` ativo com menos atendimentos `in_progress` no momento.
    3. **`getKommoLeadContact()`** — Busca no Kommo o nome e telefone do contato vinculado ao lead (normaliza telefone para formato `55XXXXXXXXXXX`).
    4. **`getKommoLeadNotes()`** — Busca as últimas 5 notas do lead no Kommo e monta um resumo em texto para a nota interna.
    5. **`POST /api/kommo/webhook`** — Webhook principal: recebe leads, cria conversa no CRM, aplica Round-Robin, cria nota interna automática visível apenas para o vendedor e dispara push notification. Responde `200` imediatamente para evitar retries. Se a conversa já existe, apenas atualiza o nome se estava como "Você"/null.
    6. **`POST /api/kommo/fix-names`** *(CEO apenas)* — Rota de correção retroativa: busca conversas sem nome no banco, consulta o Kommo pelo telefone e atualiza o `contact_name`. Limita 200ms entre requisições para não sobrecarregar a API.
  * *Variáveis de ambiente necessárias (adicionar na Vercel):*
    - `KOMMO_LONG_LIVED_TOKEN` — JWT de acesso longo (Long-Lived Token da conta MTSolar)
    - `KOMMO_SUBDOMAIN` — Subdomínio da conta Kommo (`mtsolarenergia`)
  * *URL do webhook para configurar no Kommo:* `https://gest-o-mt-solar.vercel.app/api/kommo/webhook`
  * *Data e hora da alteração:* 27/06/2026 às 11:20 (Horário Local)
  * *Arquivos modificados:* `api/index.ts`

* **Correção: contact_name Nulo em Mensagens fromMe (Kommo CRM):**
  * *O que foi feito:* Quando um vendedor respondia pelo Kommo CRM, a mensagem chegava via webhook da Evolution API com `fromMe: true` e `pushName` vazio/nulo. O sistema sobrescrevia `contact_name` com `null`, fazendo o frontend exibir "Você" como nome do contato.
  * *Solução:* Nos dois pontos do webhook (`POST /api/webhooks/whatsapp`) onde `whatsapp_conversations` é gravada (atualização de conversa existente e inserção de nova), adicionada lógica de resolução de nome em cascata: (1) usa `pushName` se disponível; (2) mantém o nome já salvo (`existingConv.contact_name`); (3) se ainda nulo, faz consulta na tabela `clients` pelo telefone e `company_id` para recuperar o nome cadastrado.
  * *Ação manual recomendada (Supabase SQL Editor):* Executar o SQL abaixo para corrigir conversas já existentes com nome vazio:
    ```sql
    UPDATE whatsapp_conversations wc
    SET contact_name = c.name
    FROM clients c
    WHERE wc.phone = c.phone
      AND wc.company_id = c.company_id
      AND (wc.contact_name IS NULL OR wc.contact_name = 'Você' OR wc.contact_name = '');
    ```
  * *Data e hora da alteração:* 27/06/2026 às 10:50 (Horário Local)
  * *Arquivos modificados:* `api/index.ts`

* **Correção de Bugs: Conversa Travada e Observações no Registro de Atendimentos:**
  * *O que foi feito:*
    1. Ajustado o helper `checkConversationLock` em `api/index.ts` para não bloquear conversas quando `assigned_to` for nulo, garantindo que conversas não fiquem travadas sem dono. Além disso, o webhook de recebimento (`POST /api/webhooks/whatsapp`) foi ajustado para forçar o status `waiting` em novas conversas, impedindo a inicialização em `in_progress` sem `assigned_to`.
    2. Na rota `GET /api/attendance-registry`, foi removido o `.limit(1)` das observações, retornando o histórico completo de notas da conversa. No frontend (`AttendanceRegistry.tsx`), a interface `Observation` e a renderização da coluna foram atualizadas para exibir o histórico de observações empilhado verticalmente (as 2 mais recentes, com botão "Ver todas (X)" abrindo inline) em vez de apenas a última observação, garantindo que notas antigas não sejam sobrescritas.
  * *Data e hora da alteração:* 27/06/2026 às 09:48 (Horário Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/AttendanceRegistry.tsx`

* **Correção Crítica: Bug de Cadeado Universal (Sandra Feliciano) — checkConversationLock v2:**
  * *O que foi feito:*
    1. **Problema A (Travamento sem dono):** Reescrito o helper `checkConversationLock` em `api/index.ts` usando `supabaseAdmin` com join explícito `users!whatsapp_conversations_assigned_to_fkey(name)`. A lógica agora verifica em sequência: (a) se `assigned_to` é nulo → libera imediatamente; (b) se `assigned_to` é o próprio usuário → libera; (c) se o role é CEO → libera; (d) só então bloqueia se `status = 'in_progress'`. O campo retornado é `assignedToName` (vindo do join real com a tabela `users`), não mais `assigned_name` (campo de snapshot que podia estar desatualizado ou nulo).
    2. **Problema B (Nome vazio no cadeado):** Todas as 4 rotas que chamam `checkConversationLock` (`GET /api/conversations/:id/messages`, `POST /api/whatsapp/send`, `POST /api/whatsapp/send-media`, `POST /api/whatsapp/send-audio`) foram ajustadas para retornar `assignedTo: lockCheck.assignedToName ?? 'outro atendente'` no corpo do HTTP 403.
    3. **Frontend `WhatsApp.tsx`:** O reset de `isLocked` e `lockedByName` foi movido para o início de `fetchMessages` (antes do `try`), garantindo que a UI limpa o cadeado instantaneamente ao trocar de conversa. A barra amarela de bloqueio exibe agora o nome em `<strong>` com fallback `'outro atendente'`.
    4. **Utilitário `sanitizeConversationStatus`:** Adicionada função que garante que qualquer inserção/atualização em `whatsapp_conversations` com `assigned_to = null` sempre usa `status = 'waiting'`. Aplicada no webhook ao atualizar conversas existentes e ao criar novas.
  * *Data e hora da alteração:* 27/06/2026 às 10:11 (Horário Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/WhatsApp.tsx`

* **Correção Crítica: Bug de Cadeado Universal — Number(null) = 0 no Frontend:**
  * *O que foi feito:*
    1. **Causa raiz identificada:** `Number(null) === 0` fazia com que a comparação `Number(conv.assigned_to) !== Number(user?.id)` retornasse `true` para conversas sem dono (`assigned_to = NULL`), bloqueando-as com cadeado para todos os vendedores.
    2. **Correção 1 — `isAssignedToOther`:** Adicionadas as guardas `conv.assigned_to !== null && conv.assigned_to !== undefined` antes da comparação numérica em `renderConversationItem`.
    3. **Correção 2 — Badge de status:** Conversas `in_progress` sem dono agora exibem badge âmbar com ícone `Timer` e texto "Aguardando atendente" em vez de cadeado cinza sem nome.
    4. **Correção 3 — onClick:** Conversas `in_progress` sem `assigned_to` agora acionam `assumeConversation` ao clicar (igual às `waiting`), em vez de bloquear o clique.
    5. **Correção 4 — Rota de manutenção:** Adicionada rota `POST /api/admin/fix-orphan-conversations` (restrita a CEO) que converte todas as conversas `in_progress` sem dono para `status = 'waiting'`, corrigindo o estado corrompido já existente no banco.
  * *Data e hora da alteração:* 27/06/2026 às 10:30 (Horário Local)
  * *Arquivos modificados:* `src/pages/WhatsApp.tsx`, `api/index.ts`

* **Etiquetas, Transferir e Encerrar no Mobile â€” Modal de Detalhes (WhatsApp.tsx):**
  * *O que foi feito:* O modal `showObservationsModal` (aberto pelo botÃ£o Info no mobile) continha apenas o bloco de ObservaÃ§Ãµes. Expandido para funcionar como um painel completo de atendimento no mobile, incluindo: (1) Card de info do contato com status; (2) Bloco de **Etiquetas** com seleÃ§Ã£o mÃºltipla por toque; (3) Bloco de **AÃ§Ãµes** com todos os botÃµes contextuais (Assumir / Transferir para Agente / Transferir para Administrativo / Transferir para Atendimento / Encerrar / Reabrir) respeitando o status da conversa e o role do usuÃ¡rio; (4) Bloco de **ObservaÃ§Ãµes**. Cada aÃ§Ã£o do bloco AÃ§Ãµes fecha o modal antes de executar para evitar sobreposiÃ§Ã£o de camadas.
  * *Data e hora da alteraÃ§Ã£o:* 26/06/2026 Ã s 10:56 (HorÃ¡rio Local)
  * *Arquivos modificados:* `src/pages/WhatsApp.tsx`
* **CorreÃ§Ã£o do Download de PDF em Dispositivos MÃ³veis (Capacitor):**
  * *O que foi feito:* Instalados os plugins `@capacitor/filesystem` e `@capacitor/share`. Refatorada a funÃ§Ã£o `generatePDF` em `ProposalGenerator.tsx` para detectar se o app estÃ¡ rodando como nativo (`Capacitor.isNativePlatform()`). No mobile, o PDF Ã© gerado via `jsPDF`, convertido para Base64, salvo no diretÃ³rio de Documentos do dispositivo com `Filesystem.writeFile` e entÃ£o compartilhado via `Share.share` (tela nativa de compartilhamento). No desktop/web, o comportamento anterior (`window.open` + `print()`) Ã© mantido sem alteraÃ§Ãµes. Adicionado estado visual `isGeneratingPDF` nos botÃµes de aÃ§Ã£o para feedback de carregamento. Corrigido tambÃ©m o erro de tipagem `setLineDash` no jsPDF via cast `(doc as any)`.
  * *Data e hora da alteraÃ§Ã£o:* 26/06/2026 Ã s 10:52 (HorÃ¡rio Local)
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`, `package.json`
* **CorreÃ§Ã£o de CÃ¡lculos Financeiros no Gerador de Propostas:**
  * *O que foi feito:* Refatorada a lÃ³gica financeira na geraÃ§Ã£o do PDF (`ProposalGenerator.tsx`). A **Economia Total** de 25 anos agora soma os valores anuais com reajuste de 10% a.a., e o erro de ordem de grandeza (que gerava 67 milhÃµes) foi evitado. O **ROI** foi alterado para mostrar o Retorno Simples de 1Âº ano em percentual (% a.a.). O cÃ¡lculo da **TIR (Taxa Interna de Retorno)** foi reescrito do zero implementando o mÃ©todo numÃ©rico iterativo de Newton-Raphson para descobrir a taxa real do fluxo de caixa, abandonando a fÃ³rmula simplificada errÃ´nea que causava discrepÃ¢ncias.
  * *Data e hora da alteraÃ§Ã£o:* 26/06/2026 Ã s 10:37 (HorÃ¡rio Local)
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`
* **RemoÃ§Ã£o da ExibiÃ§Ã£o do "Valor Final de Venda" para Vendedor na Aba Kit Solar:**
  * *O que foi feito:* Refatorada a aba "Kit Solar" (a aba de dimensionamento) no `ProposalGenerator.tsx` para nÃ£o exibir o card de "Valor Final de Venda" nem a seÃ§Ã£o "Preview do Valor de Venda" para usuÃ¡rios com o role `COMMERCIAL` (Vendedor). Em substituiÃ§Ã£o, o campo tornou-se exclusivamente o dropdown de "Selecionar Kit Cadastrado", obrigatÃ³rio, que exibe apenas a identificaÃ§Ã£o do kit (ex: "Kit 5 kWh") sem os preÃ§os, blindando informaÃ§Ãµes de custos, preÃ§os, marca de mÃ³dulos e marca de inversores nÃ£o desejadas nessa visualizaÃ§Ã£o.
  * *Data e hora da alteraÃ§Ã£o:* 25/06/2026 Ã s 15:11 (HorÃ¡rio Local)
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`

* **CorreÃ§Ã£o de Tabela solar_kits nÃ£o encontrada (Erro 500 bloqueador):**
  * *O que foi feito:* A tabela `solar_kits` existia no cÃ³digo da API (`api/index.ts`, rotas GET/POST/PUT/DELETE `/api/solar-kits`) e no frontend (`ProposalGenerator.tsx`, interface `SolarKit`), mas **nunca havia sido criada no banco Supabase**. Nem o `supabase_schema.sql` nem a pasta `supabase/migrations/` possuÃ­am qualquer migration para ela â€” a pasta estava completamente vazia.
  * *Causa Raiz:* A tabela foi implementada no cÃ³digo em desenvolvimento mas a migration correspondente nunca foi executada no banco Supabase de produÃ§Ã£o, fazendo o PostgREST retornar erro `"Could not find the table 'public.solar_kits' in the schema cache"` em todas as requisiÃ§Ãµes.
  * *SoluÃ§Ã£o Aplicada:* Criado o arquivo `supabase/migrations/20260625_create_solar_kits.sql` com a estrutura completa da tabela, incluindo: (a) coluna `company_id` para multi-tenancy, (b) todos os campos mapeados pela interface `SolarKit` do frontend, (c) RLS habilitada com polÃ­ticas por role, (d) trigger de `updated_at` automÃ¡tico, e (e) `NOTIFY pgrst, 'reload schema'` ao final para forÃ§ar atualizaÃ§Ã£o do cache do PostgREST. O arquivo `supabase_schema.sql` tambÃ©m foi atualizado para refletir a nova tabela.
  * *âš ï¸ AÃ‡ÃƒO MANUAL NECESSÃRIA:* Esta migration precisa ser executada **manualmente** no **SQL Editor do Supabase** (dashboard â†’ SQL Editor â†’ colar o conteÃºdo do arquivo e executar). O arquivo estÃ¡ em: `supabase/migrations/20260625_create_solar_kits.sql`.
  * *Data e hora da alteraÃ§Ã£o:* 25/06/2026 Ã s 15:06 (HorÃ¡rio Local)
  * *Arquivos modificados:* `supabase/migrations/20260625_create_solar_kits.sql` (novo), `supabase_schema.sql`

* **Estrutura final de colunas da tabela solar_kits:**
  * `id` (UUID - PK, gerado automaticamente)
  * `company_id` (**UUID** - Multi-tenancy obrigatÃ³rio â€” referencia `companies.id`)
  * `potencia_kwh` (NUMERIC 10,3 - PotÃªncia total do kit em kWp)
  * `valor_total` (NUMERIC 12,2 - Custo de aquisiÃ§Ã£o do kit)
  * `margem_venda` (NUMERIC 5,2 - Margem de lucro em %, padrÃ£o 30)
  * `quantidade_modulos` (INTEGER - Qtd. de mÃ³dulos fotovoltaicos)
  * `potencia_modulo_w` (NUMERIC 10,2 - PotÃªncia de cada mÃ³dulo em W)
  * `marca_modulo` (TEXT - Marca/modelo dos mÃ³dulos)
  * `quantidade_inversores` (INTEGER - Qtd. de inversores)
  * `potencia_inversor_kw` (NUMERIC 10,3 - PotÃªncia do inversor principal em kW)
  * `marca_inversor` (TEXT - Marca do inversor principal)
  * `inversor_ampliacao` (BOOLEAN - Se kit possui inversor de ampliaÃ§Ã£o, padrÃ£o FALSE)
  * `potencia_inversor_ampliacao_kw` (NUMERIC 10,3 - PotÃªncia do inversor de ampliaÃ§Ã£o, nullable)
  * `marca_inversor_ampliacao` (TEXT - Marca do inversor de ampliaÃ§Ã£o, nullable)
  * `ativo` (BOOLEAN - Soft-delete: FALSE = desativado, padrÃ£o TRUE)
  * `created_at` (TIMESTAMPTZ - automÃ¡tico)
  * `updated_at` (TIMESTAMPTZ - atualizado via trigger automÃ¡tico)

* **CorreÃ§Ã£o CrÃ­tica â€” company_id INTEGER â†’ UUID em solar_kits e whatsapp_observations:**
  * *O que foi feito:* Diagnosticado e corrigido o erro `"invalid input syntax for type integer: \"e4bf6f22-6182-414d-afa4-c5449c014323\""` que bloqueava completamente o CRUD de kits solares e as observaÃ§Ãµes de atendimento.
  * *Causa Raiz:* As migrations `20260625_create_solar_kits.sql` e `20260625_create_whatsapp_observations.sql` criaram a coluna `company_id` como `INTEGER` (seguindo o padrÃ£o das tabelas antigas como `users.id SERIAL`), mas a tabela `companies` no Supabase utiliza `UUID` como chave primÃ¡ria. O JWT carrega o `company_id` do usuÃ¡rio autenticado como UUID (`e4bf6f22-...`), causando falha de cast ao inserir/filtrar. Confirmado via:
    * `AuthContext.tsx` linha 11: `company_id: string` â€” o frontend sempre trata como string (UUID)
    * RESUMO_MESTRE seÃ§Ã£o 5: `companies.id (UUID - Primary Key)` jÃ¡ documentado
    * Todas as outras tabelas do sistema (users, clients, projects, commercial_data, whatsapp_conversations etc.) jÃ¡ usam `company_id UUID`
  * *SoluÃ§Ã£o Aplicada (arquivos locais):*
    * `supabase/migrations/20260625_create_solar_kits.sql`: `company_id INTEGER â†’ UUID`, casts das 2 polÃ­ticas RLS `::INTEGER â†’ ::UUID`
    * `supabase/migrations/20260625_create_whatsapp_observations.sql`: `company_id INTEGER â†’ UUID`, casts das 2 polÃ­ticas RLS `::INTEGER â†’ ::UUID`
    * `supabase_schema.sql`: referÃªncias corrigidas para UUID nas duas tabelas
  * *âš ï¸ AÃ‡ÃƒO MANUAL NECESSÃRIA no Supabase SQL Editor:* Como a tabela `solar_kits` jÃ¡ existe (vazia) no banco com tipo errado, Ã© necessÃ¡rio executar o SQL de correÃ§Ã£o `ALTER TABLE` + recriar as polÃ­ticas RLS. Ver SQL completo gerado abaixo.
  * *Data e hora da alteraÃ§Ã£o:* 26/06/2026 Ã s 05:59 (HorÃ¡rio Local)
  * *Arquivos modificados:* `supabase/migrations/20260625_create_solar_kits.sql`, `supabase/migrations/20260625_create_whatsapp_observations.sql`, `supabase_schema.sql`

* **CorreÃ§Ã£o de DeleÃ§Ã£o de Documentos de HomologaÃ§Ã£o (Supabase â†’ R2):**
  * *O que foi feito:* Removida a chamada legada `supabase.storage.from('homologacao-docs').remove([path])` do bloco de deleÃ§Ã£o em massa (aprovaÃ§Ã£o de Ponto de ConexÃ£o) em `Homologation.tsx`. SubstituÃ­da pela chamada correta ao backend `await api.delete('/api/homologation-documents/${doc.id}')`, que jÃ¡ trata a exclusÃ£o no Cloudflare R2. A deleÃ§Ã£o individual jÃ¡ estava correta e nÃ£o necessitou alteraÃ§Ã£o.
  * *Data e hora da alteraÃ§Ã£o:* 19/06/2026
  * *Arquivos modificados:* `src/pages/Homologation.tsx`

* **CorreÃ§Ã£o de Encoding de Emojis e Labels PT-BR na PÃ¡gina Obra:**
  * *O que foi feito:* Corrigidos 3 tÃ­tulos de seÃ§Ã£o com encoding corrompido (Latin-1) em `Obra.tsx`: `âš¡ MediÃ§Ãµes ElÃ©tricas Adicionais`, `ðŸ”Œ MediÃ§Ãµes CC (MPPTs)` e `ðŸ“¦ Opcionais Adicionais`. Labels e textos jÃ¡ estavam em portuguÃªs â€” nenhuma alteraÃ§Ã£o adicional necessÃ¡ria.
  * *Data e hora da alteraÃ§Ã£o:* 19/06/2026
  * *Arquivos modificados:* `src/pages/Obra.tsx`

* **HistÃ³rico de Propostas â€” Scroll, PaginaÃ§Ã£o e ExpiraÃ§Ã£o de 30 dias:**
  * *O que foi feito:* Adicionados estados `currentPage` e `ITEMS_PER_PAGE = 10` em `ProposalGenerator.tsx`. Tabela de histÃ³rico encapsulada com `overflow-y-auto max-h-[500px]` e cabeÃ§alho fixo (`sticky top-0`). Controles de paginaÃ§Ã£o `â† Anterior / PrÃ³xima â†’` exibidos apenas quando `totalPages > 1`. Alterado via SQL no Supabase o `DEFAULT` da coluna `data_expiracao` da tabela `proposal_history` para `now() + interval '30 days'` e atualizado registros existentes. O backend (`api/index.ts` linha 2729â€“2730) jÃ¡ usava `.insert()` com 30 dias â€” nenhuma alteraÃ§Ã£o necessÃ¡ria no backend.
  * *Data e hora da alteraÃ§Ã£o:* 19/06/2026
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`, Supabase SQL Editor

* **Falha Geral no Login e API do Servidor (Erro de CompilaÃƒÂ§ÃƒÂ£o no Backend):**
  * *Causa Raiz:* Durante a implementaÃƒÂ§ÃƒÂ£o da Melhoria 5, a chave de fechamento (`}`) da funÃƒÂ§ÃƒÂ£o `sendPushNotification` foi acidentalmente removida no arquivo `api/index.ts`. Como resultado, o compilador TSX/esbuild interpretou as definiÃƒÂ§ÃƒÂµes de rotas subsequentes como parte da funÃƒÂ§ÃƒÂ£o, gerando um erro sintÃƒÂ¡tico fatal (`Unexpected export`) e travando a inicializaÃƒÂ§ÃƒÂ£o de todo o backend. Com a API fora do ar, todas as tentativas de autenticaÃƒÂ§ÃƒÂ£o falharam.
  * *SoluÃƒÂ§ÃƒÂ£o Aplicada:* Restaurada a chave de fechamento `}` na funÃƒÂ§ÃƒÂ£o `sendPushNotification` (linha 392) de `api/index.ts`. O compilador reiniciou com sucesso, restabelecendo a operaÃƒÂ§ÃƒÂ£o de todas as rotas e permitindo o login dos usuÃƒÂ¡rios.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 03/06/2026 ÃƒÂ s 12:30 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`

* **Erro Cannot read properties of null (reading 'map') na aba RelatÃƒÂ³rio do Ponto:**
  * *Causa Raiz:* O estado `reportRecords` e outros estados de arrays de ponto eram deixados como `null` or `undefined` quando ocorria um erro de requisiÃƒÂ§ÃƒÂ£o (como HTTP 400 por falta de parÃƒÂ¢metros) ou o retorno da API vinha vazio. O frontend tentava renderizar chamando `.map()` sobre esses arrays, provocando a quebra visual completa da aba de relatÃƒÂ³rios.
  * *SoluÃƒÂ§ÃƒÂ£o Aplicada:*
    1. Adicionada guarda de validaÃƒÂ§ÃƒÂ£o de parÃƒÂ¢metros na funÃƒÂ§ÃƒÂ£o `fetchReport` para evitar requisiÃƒÂ§ÃƒÂµes sem `userId`, `startDate` ou `endDate`, retornando preventivamente e definindo o estado como `[]`.
    2. Implementado fallback com operador de coalescÃƒÂªncia nula (`res.data ?? []`) e fallback explÃƒÂ­cito no bloco `catch` em todas as rotas de carregamento (`fetchReport`, `fetchHistory`, `fetchSchedules`, `fetchAllUsers` e `fetchPendingAdjustments`).
    3. Protegidos todos os acessos por `.map()`, `.filter()`, `.find()`, `.reduce()` e agrupamento utilizando o operador `(estado ?? [])`.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 03/06/2026 ÃƒÂ s 13:45 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `src/pages/Ponto.tsx`

* **Erro HTTP 400 ao Cadastrar/Atualizar FuncionÃƒÂ¡rio:**
  * *Causa Raiz:* No envio de novas propriedades de cadastro (como `cpf`, `cargo` e `data_admissao`), as rotas do backend nÃƒÂ£o utilizavam valores padrÃƒÂµes na desestruturaÃƒÂ§ÃƒÂ£o de `req.body`, resultando em payloads ou colunas inconsistentes que o Supabase rejeitava se os campos estivessem ausentes. No frontend, a inicializaÃƒÂ§ÃƒÂ£o e a mÃƒÂ¡scara de formataÃƒÂ§ÃƒÂ£o do CPF nÃƒÂ£o seguiam o padrÃƒÂ£o exato exigido.
  * *SoluÃƒÂ§ÃƒÂ£o Aplicada:*
    1. Ajustadas as rotas `POST /api/users` e `PUT /api/users/:id` no backend `api/index.ts` para desestruturar `cpf = null`, `cargo = null` e `data_admissao = null` do `req.body` com valores padrÃƒÂ£o nulos.
    2. Modificado o estado inicial do formulÃƒÂ¡rio no frontend `src/pages/Funcionarios.tsx` para inicializar `cargo` com `''` (string vazia).
    3. Adicionada a opÃƒÂ§ÃƒÂ£o padrÃƒÂ£o `Selecione o cargo` no menu select de cargos do formulÃƒÂ¡rio para guiar o usuÃƒÂ¡rio na seleÃƒÂ§ÃƒÂ£o.
    4. Atualizada a mÃƒÂ¡scara de formataÃƒÂ§ÃƒÂ£o incremental do CPF para usar o padrÃƒÂ£o regex literal solicitado.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 03/06/2026 ÃƒÂ s 13:48 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/Funcionarios.tsx`

* **Ciclo de Vida de Armazenamento e Limpeza AutomÃƒÂ¡tica de MÃƒÂ­dias (R2 e Supabase Storage):**
  * *Causa Raiz:* NÃƒÂ£o existia uma limpeza periÃƒÂ³dica de mÃƒÂ­dias enviadas no WhatsApp (`whatsapp-media`), gerando acÃƒÂºmulo ilimitado de arquivos no Supabase Storage. O cronjob do R2 (`cleanup-r2`) usava uma lÃƒÂ³gica de intervalo dinÃƒÂ¢mico que nÃƒÂ£o correspondia exatamente ÃƒÂ  filtragem recomendada no banco de dados.
  * *SoluÃƒÂ§ÃƒÂ£o Aplicada:*
    1. Corrigida a lÃƒÂ³gica de filtragem da data de corte no cronjob `cleanup-r2` no `api/index.ts` usando `setDate(getDate() - 90)` de forma direta e segura.
    2. Desenvolvido o novo cronjob `GET /api/cron/cleanup-whatsapp-media` no backend para buscar mÃƒÂ­dias do WhatsApp com mais de 120 dias, extrair o caminho relativo dos arquivos a partir da `media_url`, removÃƒÂª-los do Supabase Storage via `supabaseAdmin.storage.from(...).remove` e atualizar o banco para `media_url = null` (processados em lotes de 50 registros para evitar timeout).
    3. Cadastrada a rota do novo cronjob no arquivo `vercel.json` sob o agendamento `"0 3 2 * *"` (dia 2 de cada mÃƒÂªs).
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 03/06/2026 ÃƒÂ s 13:58 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `vercel.json`

* **AlteraÃƒÂ§ÃƒÂ£o da Opacidade do Logotipo (`PNG_-_MT_SOLAR__1_.png`):**
  * *Causa Raiz:* O logotipo institucional de fundo estava com opacidade muito alta, interferindo na legibilidade dos textos e layouts das telas.
  * *SoluÃƒÂ§ÃƒÂ£o Aplicada:* Processado o arquivo de imagem no canal alpha para definir a opacidade mÃƒÂ¡xima como 15%, suavizando sua exibiÃƒÂ§ÃƒÂ£o em toda a aplicaÃƒÂ§ÃƒÂ£o.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 03/06/2026 ÃƒÂ s 14:10 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `public/PNG_-_MT_SOLAR__1_.png`

* **Erro HTTP 400 ao Cadastrar e Listagem Vazia na PÃƒÂ¡gina de FuncionÃƒÂ¡rios (PGRST204):**
  * *Causa Raiz:* O PostgREST do Supabase retornava erro `PGRST204` em trÃƒÂªs rotas (`GET`, `POST` e `PUT /api/users`) porque as colunas `cpf`, `cargo` e `data_admissao` ainda nÃƒÂ£o foram criadas na tabela `users`. O `GET` retornava `null` silenciosamente (lista vazia na tela), o `POST` retornava HTTP 400 (cadastro falhava) e o `PUT` idem.
  * *SoluÃƒÂ§ÃƒÂ£o Aplicada:* Implementado **fallback automÃƒÂ¡tico com cÃƒÂ³digo de erro `PGRST204`** nas trÃƒÂªs rotas do `api/index.ts`:
    1. `GET /api/users`: tenta buscar com campos extras; se `PGRST204`, retenta sem eles Ã¢â‚¬â€ a lista de funcionÃƒÂ¡rios sempre ÃƒÂ© retornada.
    2. `POST /api/users`: tenta inserir com `cpf`/`cargo`/`data_admissao`; se `PGRST204`, retenta com apenas os campos obrigatÃƒÂ³rios.
    3. `PUT /api/users/:id`: mesma lÃƒÂ³gica de fallback para atualizaÃƒÂ§ÃƒÂµes.
  * *AÃƒÂ§ÃƒÂ£o pendente:* Executar o SQL abaixo no editor do Supabase para ativar o salvamento dos campos opcionais:
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
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 03/06/2026 ÃƒÂ s 14:42 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`







* **URLs de MÃƒÂ­dia Nulas para Mensagens Enviadas (`from_me = true`):**
  * *Causa Raiz:* No envio de mÃƒÂ­dias e ÃƒÂ¡udios, a URL temporÃƒÂ¡ria ou arquivo `base64` era enviado para a Evolution API, mas no `INSERT` da tabela `whatsapp_messages` a coluna `media_url` era mantida nula. AlÃƒÂ©m disso, o arquivo temporÃƒÂ¡rio da mÃƒÂ­dia no bucket `whatsapp-media` era deletado imediatamente apÃƒÂ³s o envio bem-sucedido para economizar espaÃƒÂ§o de storage.
  * *SoluÃƒÂ§ÃƒÂ£o Aplicada:* Ajustadas as rotas `/api/whatsapp/send-media` e `/api/whatsapp/send-audio` no backend Express. Agora, antes de inserir a mensagem, o backend gera uma URL pÃƒÂºblica definitiva pelo storage com `supabaseAdmin.storage.from(...).getPublicUrl(filePath)`, preenche a propriedade `media_url` na query de `INSERT` e mantÃƒÂ©m o arquivo gravado no bucket de forma permanente.
* **404 na Evolution API:**
  * *Causa Raiz:* InconsistÃƒÂªncias na URL final enviada ÃƒÂ  Evolution API por falta de validaÃƒÂ§ÃƒÂ£o rigorosa dos nomes das instÃƒÂ¢ncias ativas (que vinham com espaÃƒÂ§os e letras maiÃƒÂºsculas).
  * *SoluÃƒÂ§ÃƒÂ£o:* Implementado tratamento estrito de nomes de instÃƒÂ¢ncias via Express antes de repassar a requisiÃƒÂ§ÃƒÂ£o (conversÃƒÂ£o para lowercase e substituiÃƒÂ§ÃƒÂ£o de espaÃƒÂ§os por hÃƒÂ­fens).
* **Erro 400 no Supabase Storage via RLS:**
  * *Causa Raiz:* O envio de arquivos pelo front-end falhava intermitentemente por falta de permissÃƒÂ£o de escrita de usuÃƒÂ¡rios nÃƒÂ£o autenticados no bucket.
  * *SoluÃƒÂ§ÃƒÂ£o:* SubstituÃƒÂ­do o cliente anÃƒÂ´nimo por `supabaseAdmin` utilizando a chave privada master `SUPABASE_SERVICE_ROLE_KEY` exclusivamente no backend Express para realizar o upload das mÃƒÂ­dias.
* **Sistema de Etiquetas NÃƒÂ£o Salvando (Multi-Tag):**
  * *Causa Raiz (1 Ã¢â‚¬â€ Banco):* A tabela `whatsapp_conversations` possuÃƒÂ­a apenas a coluna `tag TEXT` (singular), incapaz de armazenar mÃƒÂºltiplas etiquetas. A coluna `tags TEXT[]` nÃƒÂ£o existia, fazendo o UPDATE retornar erro `42703` silencioso do PostgreSQL.
  * *Causa Raiz (2 Ã¢â‚¬â€ Backend):* A rota `PUT /api/conversations/:id/tag` atualizava a coluna `tag` com uma string ÃƒÂºnica em vez de receber e persistir um array na coluna `tags`.
  * *Causa Raiz (3 Ã¢â‚¬â€ Frontend):* A interface `Conversation` tipava o campo como `tag?: string | null` e a funÃƒÂ§ÃƒÂ£o `updateTag` enviava uma string ÃƒÂºnica, sem lÃƒÂ³gica de toggle ou suporte a mÃƒÂºltiplos valores.
  * *SoluÃƒÂ§ÃƒÂ£o Aplicada:*
    1. Executado `ALTER TABLE whatsapp_conversations ADD COLUMN tags TEXT[] DEFAULT '{}'` no SQL Editor do Supabase.
    2. Migrados dados histÃƒÂ³ricos: `UPDATE whatsapp_conversations SET tags = ARRAY[tag] WHERE tag IS NOT NULL AND tag != ''`.
    3. Atualizada a rota backend para ler `{ tags }` do body e gravar `{ tags: tags ?? [] }` na coluna correta.
    4. Atualizado o frontend: interface alterada para `tags?: string[] | null`, funÃƒÂ§ÃƒÂ£o `updateTag` com lÃƒÂ³gica de toggle (adiciona/remove do array), dropdown com checkboxes visuais e renderizaÃƒÂ§ÃƒÂ£o de mÃƒÂºltiplas tags coloridas por conversa.

* **Bloqueio de Conversa em Atendimento por Outro Agente:**
  * *Contexto:* Antes da implementaÃƒÂ§ÃƒÂ£o, nÃƒÂ£o havia bloqueio do tipo "conversa em uso" Ã¢â‚¬â€ qualquer agente podia ler e responder mensagens de conversas que jÃƒÂ¡ estavam sendo atendidas por outro colega, gerando conflito de atendimento.
  * *SoluÃƒÂ§ÃƒÂ£o Aplicada:*
    1. Criada nova rota `GET /api/conversations/:id/messages` no backend que, antes de retornar mensagens, verifica se `status = 'in_progress'`, `assigned_to IS NOT NULL` e `assigned_to != req.user.id`. Caso confirmado e o role nÃƒÂ£o for CEO, retorna HTTP 403 com `{ error: 'CONVERSATION_LOCKED', assignedTo: nome_do_agente }`.
    2. Adicionada a mesma validaÃƒÂ§ÃƒÂ£o nas rotas `POST /api/whatsapp/send`, `POST /api/whatsapp/send-media` e `POST /api/whatsapp/send-audio` via helper `checkConversationLock()`.
    3. No frontend (`WhatsApp.tsx`): adicionados estados `isLocked` e `lockedByName`. A funÃƒÂ§ÃƒÂ£o `fetchMessages` agora chama o backend via `api.get()` (em vez de Supabase direto) e trata o erro 403 setando `isLocked = true`. Ao trocar de conversa, os estados sÃƒÂ£o resetados. No lugar do campo de mensagem, exibe-se um aviso amarelo com ÃƒÂ­cone de cadeado e o nome do agente responsÃƒÂ¡vel.
* **Cronjobs de Mensagens AutomÃƒÂ¡ticas de HorÃƒÂ¡rio:**
  * Adicionadas 3 novas rotas `POST` no backend e 3 entradas no `vercel.json` para disparar mensagens automÃƒÂ¡ticas de horÃƒÂ¡rio (inÃƒÂ­cio de expediente, almoÃƒÂ§o e fim de expediente) para todas as conversas com `status = 'in_progress'`, utilizando as credenciais de instÃƒÂ¢ncia de cada empresa via `getEvolutionApiCredentials()`.
* **Scroll no HistÃƒÂ³rico do Gerador de Propostas:**
  * *O que foi feito:* AdiÃƒÂ§ÃƒÂ£o das classes CSS `overflow-y-auto` e `max-h-96` ao container div que envolve a tabela na aba de histÃƒÂ³rico do gerador de propostas. Isso habilita o scroll vertical, permitindo visualizar todos os registros sem limitaÃƒÂ§ÃƒÂ£o ou quebra de layout.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 01/06/2026 ÃƒÂ s 15:11 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`
* **Filtro de Projetos Finalizados nas HomologaÃƒÂ§ÃƒÂµes do Dashboard:**
  * *O que foi feito:* AdiÃƒÂ§ÃƒÂ£o de condiÃƒÂ§ÃƒÂµes no `.filter()` da listagem de homologaÃƒÂ§ÃƒÂµes no arquivo `Dashboard.tsx` para excluir projetos que possuam `current_stage` como `'conclusion'` ou `status` como `'completed'`.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 01/06/2026 ÃƒÂ s 15:12 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `src/pages/Dashboard.tsx`
* **Campo de Input NumÃƒÂ©rico para OrdenaÃƒÂ§ÃƒÂ£o no Cronograma:**
  * *O que foi feito:* SubstituiÃƒÂ§ÃƒÂ£o dos botÃƒÂµes de seta por um componente de input numÃƒÂ©rico (`OrderInput`) na listagem do cronograma de obras (`ObraSchedule.tsx`). O input permite ao usuÃƒÂ¡rio digitar diretamente a posiÃƒÂ§ÃƒÂ£o de reordenaÃƒÂ§ÃƒÂ£o do cliente, e dispara a movimentaÃƒÂ§ÃƒÂ£o e reordenaÃƒÂ§ÃƒÂ£o no blur ou pressionando Enter.
* **CriaÃƒÂ§ÃƒÂ£o das Tabelas de Controle de Ponto no Supabase (Parte 1):**
  * *O que foi feito:* CriaÃƒÂ§ÃƒÂ£o das tabelas `work_schedules` (horÃƒÂ¡rios de trabalho), `time_records` (registros de ponto) e `time_adjustments` (ajustes de ponto), alÃƒÂ©m de ÃƒÂ­ndices de performance (`idx_time_records_company_user`, `idx_time_records_timestamp`, `idx_time_adjustments_company`, `idx_work_schedules_company_role`) no banco de dados Supabase do projeto para suporte ao sistema de jornada de colaboradores.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 02/06/2026 ÃƒÂ s 04:18 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* Nenhum arquivo de cÃƒÂ³digo modificado diretamente (criaÃƒÂ§ÃƒÂ£o via SQL Editor do Supabase); atualizado o resumo mestre do banco de dados em `RESUMO_MESTRE_GESTAO_MTSOLAR.md`.
* **InstalaÃƒÂ§ÃƒÂ£o das DependÃƒÂªncias do Cloudflare R2 / GeolocalizaÃƒÂ§ÃƒÂ£o e CriaÃƒÂ§ÃƒÂ£o do Cliente R2 (Parte 2):**
  * *O que foi feito:* InstalaÃƒÂ§ÃƒÂ£o das dependÃƒÂªncias `@aws-sdk/client-s3` e `@aws-sdk/s3-request-presigner` via npm, instalaÃƒÂ§ÃƒÂ£o e sincronizaÃƒÂ§ÃƒÂ£o do plugin `@capacitor/geolocation` no wrapper mobile do Capacitor, e criaÃƒÂ§ÃƒÂ£o do arquivo de cliente Cloudflare R2 em `api/r2.ts` com funÃƒÂ§ÃƒÂµes utilitÃƒÂ¡rias de upload, delete e listagem de arquivos.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 02/06/2026 ÃƒÂ s 04:21 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `package.json`, `package-lock.json`, `api/r2.ts` (novo arquivo), `android/app/src/main/assets/capacitor.config.json` (gerado/atualizado pelo capacitor sync).
* **ImplementaÃƒÂ§ÃƒÂ£o das Rotas de Ponto EletrÃƒÂ´nico (Parte 4):**
  * *O que foi feito:* AdiÃƒÂ§ÃƒÂ£o da importaÃƒÂ§ÃƒÂ£o do cliente Cloudflare R2 em `api/index.ts` e implementaÃƒÂ§ÃƒÂ£o de todas as rotas do mÃƒÂ³dulo de Ponto EletrÃƒÂ´nico (horÃƒÂ¡rios de expedientes, registro de ponto com selfie e localizaÃƒÂ§ÃƒÂ£o, listagem de histÃƒÂ³rico, relatÃƒÂ³rios por usuÃƒÂ¡rio, solicitaÃƒÂ§ÃƒÂµes de ajuste e moderaÃƒÂ§ÃƒÂ£o de ajustes por administradores).
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 02/06/2026 ÃƒÂ s 04:29 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`
* **Cronjob de Limpeza de Selfies no Cloudflare R2 (Parte 5):**
  * *O que foi feito:* AdiÃƒÂ§ÃƒÂ£o da rota `GET /api/cron/cleanup-r2` em `api/index.ts` que exclui do R2 (e limpa os campos `selfie_url` e `selfie_path` no Supabase) selfies de registros de ponto com mais de 90 dias. Registrada a entrada correspondente no `vercel.json` com schedule mensal (`0 3 1 * *`, ÃƒÂ s 03:00 UTC do dia 1 de cada mÃƒÂªs).
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 02/06/2026 ÃƒÂ s 04:32 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `vercel.json`
* **CriaÃƒÂ§ÃƒÂ£o da Tela de Ponto EletrÃƒÂ´nico no Frontend (Parte 6):**
  * *O que foi feito:* CriaÃƒÂ§ÃƒÂ£o da pÃƒÂ¡gina `src/pages/Ponto.tsx` implementando a interface visual completa do Ponto EletrÃƒÂ´nico (batida de ponto com integraÃƒÂ§ÃƒÂ£o do plugin `@capacitor/camera` para captura de selfie e `@capacitor/geolocation` para obter latitude e longitude, histÃƒÂ³rico pessoal de registros de ponto com solicitaÃƒÂ§ÃƒÂ£o de ajustes de horÃƒÂ¡rio justificados, visualizaÃƒÂ§ÃƒÂ£o de espelho de ponto com cÃƒÂ¡lculo de horas trabalhadas diÃƒÂ¡rias e mensais, painel de relatÃƒÂ³rios do gestor com exportaÃƒÂ§ÃƒÂ£o de PDF utilizando `jsPDF`, configuraÃƒÂ§ÃƒÂ£o de horÃƒÂ¡rios de expediente por funÃƒÂ§ÃƒÂ£o e moderaÃƒÂ§ÃƒÂ£o de solicitaÃƒÂ§ÃƒÂµes de ajuste pendentes).
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 02/06/2026 ÃƒÂ s 04:41 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `src/pages/Ponto.tsx`
* **Registro de Rota de Ponto EletrÃƒÂ´nico e PermissÃƒÂµes do Android (Parte 7):**
  * *O que foi feito:* Registro da rota protegida `/ponto` em `src/App.tsx` para todas as roles (`CEO`, `ADMIN`, `COMMERCIAL`, `TECHNICAL`) e adiÃƒÂ§ÃƒÂ£o do caminho aos autorizados para a role de vendedor (`COMMERCIAL`). AdiÃƒÂ§ÃƒÂ£o das permissÃƒÂµes nativas de localizaÃƒÂ§ÃƒÂ£o (`ACCESS_FINE_LOCATION` e `ACCESS_COARSE_LOCATION`) no `android/app/src/main/AndroidManifest.xml` e execuÃƒÂ§ÃƒÂ£o bem-sucedida do `npx cap sync` para sincronizar os arquivos de build Gradle e plugins nativos no wrapper do Capacitor.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 02/06/2026 ÃƒÂ s 04:43 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `src/App.tsx`, `android/app/src/main/AndroidManifest.xml`, `android/app/capacitor.build.gradle` (e outros arquivos gerados pelo Capacitor sync)
* **AdiÃƒÂ§ÃƒÂ£o do Item "Ponto EletrÃƒÂ´nico" no Menu Lateral de NavegaÃƒÂ§ÃƒÂ£o (Parte 8):**
  * *O que foi feito:* AdiÃƒÂ§ÃƒÂ£o da importaÃƒÂ§ÃƒÂ£o do ÃƒÂ­cone `Clock` do `lucide-react` no arquivo `src/components/Layout.tsx`, inclusÃƒÂ£o da opÃƒÂ§ÃƒÂ£o "Ponto EletrÃƒÂ´nico" (caminho `/ponto`, ÃƒÂ­cone `Clock`) no array de rotas visÃƒÂ­veis `menuItems` (liberado para todas as roles) e inclusÃƒÂ£o da rota na lista `allowedPaths` para permitir a exibiÃƒÂ§ÃƒÂ£o do menu lateral para a role de vendedor (`COMMERCIAL`).
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 02/06/2026 ÃƒÂ s 04:45 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `src/components/Layout.tsx`
* **Filtro de PerÃƒÂ­odo Personalizado no Ponto EletrÃƒÂ´nico e RelatÃƒÂ³rio PDF:**
  * *O que foi feito:* SubstituiÃƒÂ§ÃƒÂ£o do seletor de mÃƒÂªs fixo por inputs de Data Inicial e Data Final na aba de relatÃƒÂ³rios do gestor. Ajuste da busca de registros de ponto no backend utilizando a query de perÃƒÂ­odo customizado. RefatoraÃƒÂ§ÃƒÂ£o completa da funÃƒÂ§ÃƒÂ£o de exportaÃƒÂ§ÃƒÂ£o de PDF (`generatePDF` usando `jsPDF`) para incluir o nome da empresa e CNPJ consultados da tabela `companies` do Supabase, o perÃƒÂ­odo do relatÃƒÂ³rio formatado em DD/MM/AAAA, o nome e o cargo do colaborador, o quadro de expediente esperado de acordo com a tabela `work_schedules` baseada no `role` do colaborador, a tabela diÃƒÂ¡ria completa contendo o dia da semana e uma nova coluna de ObservaÃƒÂ§ÃƒÂµes informando se o ponto foi batido fora do local de interesse (latitude/longitude nulos indicando "Sem localizaÃƒÂ§ÃƒÂ£o registrada"), alÃƒÂ©m de rodapÃƒÂ© com o total acumulado de horas e linha de assinatura.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 03/06/2026 ÃƒÂ s 09:45 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `src/pages/Ponto.tsx`
* **ExclusÃƒÂ£o de Registros de Ponto por FuncionÃƒÂ¡rio Demitido (Somente CEO):**
  * *O que foi feito:* AdiÃƒÂ§ÃƒÂ£o da rota DELETE `/api/ponto/usuario/:userId/registros` no Express, protegida com autenticaÃƒÂ§ÃƒÂ£o e restrita ao role de CEO, garantindo o isolamento multi-tenant (`company_id`). No frontend (`src/pages/Ponto.tsx`), implementada exibiÃƒÂ§ÃƒÂ£o condicional do botÃƒÂ£o "Excluir todos os registros" com ÃƒÂ­cone de lixeira (`Trash2`) apenas para usuÃƒÂ¡rios logados como CEO. Criado modal de confirmaÃƒÂ§ÃƒÂ£o antes de disparar o delete na API e, em caso de sucesso, o estado local ÃƒÂ© limpo e uma notificaÃƒÂ§ÃƒÂ£o ÃƒÂ© exibida.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 03/06/2026 ÃƒÂ s 09:50 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/Ponto.tsx`
* **CorreÃƒÂ§ÃƒÂ£o de GeolocalizaÃƒÂ§ÃƒÂ£o no APK e VisualizaÃƒÂ§ÃƒÂ£o do Local (Parte 3):**
  * *O que foi feito:* AdiÃƒÂ§ÃƒÂ£o da tag `<uses-feature android:name="android.hardware.location.gps" android:required="false" />` no `android/app/src/main/AndroidManifest.xml` para robustez de localizaÃƒÂ§ÃƒÂ£o. No frontend (`src/pages/Ponto.tsx`), criada a funÃƒÂ§ÃƒÂ£o helper assÃƒÂ­ncrona `capturarLocalizacao` que requisita explicitamente permissÃƒÂ£o de localizaÃƒÂ§ÃƒÂ£o (`Geolocation.requestPermissions()`) antes de consultar a posiÃƒÂ§ÃƒÂ£o atual. O fluxo `handlePunch` foi ajustado para prosseguir de forma nÃƒÂ£o bloqueante caso a geolocalizaÃƒÂ§ÃƒÂ£o falhe, exibindo o aviso "LocalizaÃƒÂ§ÃƒÂ£o nÃƒÂ£o capturada. O ponto serÃƒÂ¡ registrado sem geolocalizaÃƒÂ§ÃƒÂ£o.". No histÃƒÂ³rico de ponto (colaborador e gestor), adicionado o ÃƒÂ­cone de mapa (`MapPin`) ao lado do horÃƒÂ¡rio da batida, estilizado em cinza se a geolocalizaÃƒÂ§ÃƒÂ£o for nula, ou em verde e clicÃƒÂ¡vel (abrindo link do Google Maps em nova aba) caso a localizaÃƒÂ§ÃƒÂ£o esteja preenchida.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 03/06/2026 ÃƒÂ s 09:55 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `android/app/src/main/AndroidManifest.xml`, `src/pages/Ponto.tsx`
* **Cadastro de FuncionÃƒÂ¡rios Vinculado ao Ponto EletrÃƒÂ´nico (Parte 4):**
  * *O que foi feito:* CriaÃƒÂ§ÃƒÂ£o da nova pÃƒÂ¡gina `src/pages/Funcionarios.tsx` para cadastro, ediÃƒÂ§ÃƒÂ£o e gestÃƒÂ£o de funcionÃƒÂ¡rios, restrita aos papÃƒÂ©is de `CEO` e `ADMIN`. A pÃƒÂ¡gina exibe a listagem completa de colaboradores com botÃƒÂµes para Editar, Desativar/Reativar e um botÃƒÂ£o de Ponto (ÃƒÂ­cone `Clock`) com tooltip "Ver ponto" que redireciona para a rota `/ponto?userId={id}`. No arquivo `src/pages/Ponto.tsx`, implementada a leitura do query parameter `userId` via `useSearchParams()`. Ao detectar o ID na URL, o sistema prÃƒÂ©-seleciona automaticamente o colaborador no dropdown e carrega de imediato o espelho de ponto correspondente na aba de gestor. Por fim, a nova pÃƒÂ¡gina foi registrada como rota preguiÃƒÂ§osa (`lazy`) no `src/App.tsx` (restrita a `CEO` e `ADMIN`) e associada ao menu de navegaÃƒÂ§ÃƒÂ£o lateral em `src/components/Layout.tsx` com o ÃƒÂ­cone `Users`.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 03/06/2026 ÃƒÂ s 10:00 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `src/pages/Funcionarios.tsx` (novo), `src/pages/Ponto.tsx`, `src/App.tsx`, `src/components/Layout.tsx`
* **Contrato PDF: CorreÃƒÂ§ÃƒÂ£o do Fundo e do RodapÃƒÂ© (Parte 5):**
  * *O que foi feito:* No gerador de PDFs do contrato (`src/pages/Contracts.tsx`), removemos a imagem embaÃƒÂ§ada de fundo (`/Papel_-_timbrado.png`) da funÃƒÂ§ÃƒÂ£o `addBackground()`, substituindo-a por um preenchimento de fundo branco puro (`doc.setFillColor(255, 255, 255)` e `doc.rect(0, 0, pageWidth, pageHeight, 'F')`). Ajustamos a verificaÃƒÂ§ÃƒÂ£o de limite de pÃƒÂ¡gina da funÃƒÂ§ÃƒÂ£o `addText` para `pageHeight - 30` (267mm) para respeitar a margem inferior do rodapÃƒÂ© de 25mm. Adicionamos uma validaÃƒÂ§ÃƒÂ£o de overflow de pÃƒÂ¡gina logo antes do bloco de assinaturas para garantir que as assinaturas nÃƒÂ£o se sobreponham ao rodapÃƒÂ©, gerando uma nova pÃƒÂ¡gina caso necessÃƒÂ¡rio. Por fim, implementamos um laÃƒÂ§o de repetiÃƒÂ§ÃƒÂ£o que percorre todas as pÃƒÂ¡ginas geradas (`doc.setPage(i)`), desenha uma linha separadora fina e imprime o rodapÃƒÂ© corporativo institucional padronizado (CNPJ, e-mail, telefone, endereÃƒÂ§o) centralizado e a paginaÃƒÂ§ÃƒÂ£o `PÃƒÂ¡gina X de Y` ÃƒÂ  direita.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 03/06/2026 ÃƒÂ s 10:05 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `src/pages/Contracts.tsx`
* **Proposta Comercial PDF: CorreÃƒÂ§ÃƒÂ£o de Layout e PaginaÃƒÂ§ÃƒÂ£o (Parte 6):**
  * *O que foi feito:* Refatoramos a geraÃƒÂ§ÃƒÂ£o da pÃƒÂ¡gina de fotos do PDF da proposta comercial no `src/pages/ProposalGenerator.tsx` definindo margens fixas horizontais/verticais (15mm/20mm) e implementando controle estrito de cursor vertical (`y = margemSuperior`). Quando uma imagem nÃƒÂ£o cabe no espaÃƒÂ§o restante da pÃƒÂ¡gina (`y + photoHeight > pageHeight - margemInferior`), a pÃƒÂ¡gina ÃƒÂ© quebrada com `doc.addPage()` e o cursor reiniciado. AlÃƒÂ©m disso, criamos um loop de pÃƒÂ³s-processamento que percorre todas as pÃƒÂ¡ginas geradas para desenhar uma linha divisÃƒÂ³ria discreta a 20mm da base, o rodapÃƒÂ© corporativo institucional e a paginaÃƒÂ§ÃƒÂ£o automÃƒÂ¡tica (`PÃƒÂ¡gina X de Y`). A partir da pÃƒÂ¡gina 2, desenha tambÃƒÂ©m um cabeÃƒÂ§alho simplificado com a proposta (`PROP-${proposalNumber}`) e o nome do cliente.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 03/06/2026 ÃƒÂ s 10:11 (HorÃƒÂ¡rio Local)
* **Cadastro e AtualizaÃƒÂ§ÃƒÂ£o de Colaboradores com CPF, Cargo e Data de AdmissÃƒÂ£o (Melhoria 2):**
  * *O que foi feito:*
    * **Backend (`api/index.ts`):** AtualizaÃƒÂ§ÃƒÂ£o das rotas `GET`, `POST` e `PUT` de `/api/users` para persistir e retornar os campos `cpf`, `cargo` e `data_admissao` na tabela `users` do Supabase.
    * **Frontend (`Funcionarios.tsx`):** CriaÃƒÂ§ÃƒÂ£o/atualizaÃƒÂ§ÃƒÂ£o do formulÃƒÂ¡rio para inclusÃƒÂ£o de CPF com mÃƒÂ¡scara `000.000.000-00` obrigatÃƒÂ³rio, select de cargo obrigatÃƒÂ³rio (CEO, ADMIN, COMMERCIAL, TECHNICAL) e data de admissÃƒÂ£o opcional.
    * **Espelho de Ponto (`Ponto.tsx`):** InclusÃƒÂ£o desses novos campos formatados no cabeÃƒÂ§alho do PDF do espelho de ponto.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 03/06/2026 ÃƒÂ s 11:30 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/Funcionarios.tsx`, `src/pages/Ponto.tsx`

* **Marca D'ÃƒÂ¡gua com Logomarca no PDF do Contrato (Melhoria 3):**
  * *O que foi feito:* InclusÃƒÂ£o da logomarca `/PNG_-_MT_SOLAR__1_.png` como marca d'ÃƒÂ¡gua centralizada em todas as pÃƒÂ¡ginas do PDF do contrato gerado em `Contracts.tsx`. A imagem ÃƒÂ© carregada e convertida em base64, escalada dinamicamente mantendo a proporÃƒÂ§ÃƒÂ£o com largura de 120mm e inserida com opacidade de 30% (`doc.setGState` com `opacity: 0.3`).
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 03/06/2026 ÃƒÂ s 11:55 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `src/pages/Contracts.tsx`

* **CorreÃƒÂ§ÃƒÂ£o de RodapÃƒÂ© na Proposta Comercial com Muitos Materiais (Melhoria 4):**
  * *O que foi feito:* ImplementaÃƒÂ§ÃƒÂ£o de paginaÃƒÂ§ÃƒÂ£o dinÃƒÂ¢mica para a tabela de materiais de estrutura na proposta comercial em `ProposalGenerator.tsx`. Define margem inferior de 35mm e verifica antes de cada linha se ultrapassa `pageHeight - 35`. Em caso positivo, quebra pÃƒÂ¡gina, reinicia cursor y em 20mm e desenha novamente o cabeÃƒÂ§alho (Item, DescriÃƒÂ§ÃƒÂ£o, Qtd, Valor Unit., Valor Total) na nova pÃƒÂ¡gina.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 03/06/2026 ÃƒÂ s 12:12 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`

* **NotificaÃƒÂ§ÃƒÂµes Push com APK Fechado Ã¢â‚¬â€ Background/Killed State (Melhoria 5):**
  * *O que foi feito:*
    * **Backend (`api/index.ts`):** RefatoraÃƒÂ§ÃƒÂ£o da funÃƒÂ§ÃƒÂ£o `sendPushNotification` para payload data-only (apenas campo `data`, sem campo `notification`), garantindo trÃƒÂ¡fego FCM de alta prioridade e entrega com app fechado/morto.
    * **AndroidManifest.xml:** Registro do serviÃƒÂ§o de recepÃƒÂ§ÃƒÂ£o do Firebase associado ao serviÃƒÂ§o customizado.
    * **`MyFirebaseMessagingService.java` (Novo):** CriaÃƒÂ§ÃƒÂ£o do serviÃƒÂ§o nativo para capturar mensagens de dados, criar canal de notificaÃƒÂ§ÃƒÂ£o com som/vibraÃƒÂ§ÃƒÂ£o no Oreo+ e disparar a notificaÃƒÂ§ÃƒÂ£o local via `NotificationCompat` direcionada para abrir a Activity principal.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 03/06/2026 ÃƒÂ s 12:15 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `android/app/src/main/AndroidManifest.xml`, `android/app/src/main/java/io/ionic/starter/MyFirebaseMessagingService.java`

* **NotificaÃƒÂ§ÃƒÂ£o Push em Mensagens de Entrada no WhatsApp Atendimento (Melhoria 6):**
  * *O que foi feito:* Adicionada lÃƒÂ³gica no webhook de recebimento de mensagens (`POST /api/webhooks/whatsapp` em `api/index.ts`) para disparar notificaÃƒÂ§ÃƒÂ£o push ao agente responsÃƒÂ¡vel caso a mensagem seja de entrada (`from_me = false`). O sistema busca a conversa no banco, obtÃƒÂ©m o campo `assigned_to` e, se preenchido, recupera o `push_token` correspondente daquele usuÃƒÂ¡rio com validaÃƒÂ§ÃƒÂ£o de `company_id`. Se existir, aciona a funÃƒÂ§ÃƒÂ£o `sendPushNotification` com payload data-only: tÃƒÂ­tulo baseado no nome do contato da conversa (ou o nÃƒÂºmero de telefone se nulo), corpo limitando a mensagem em 80 caracteres (ou "Ã°Å¸â€œÅ½ MÃƒÂ­dia recebida" se for mensagem multimÃƒÂ­dia), tipo definido como "whatsapp_message" e o UUID da conversa correspondente. Se a conversa nÃƒÂ£o estiver atribuÃƒÂ­da (fila de espera), nada ÃƒÂ© disparado.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 03/06/2026 ÃƒÂ s 12:20 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`

* **CorreÃƒÂ§ÃƒÂ£o de Pacote Java do MyFirebaseMessagingService e GeraÃƒÂ§ÃƒÂ£o do Android App Bundle (.aab) Assinado:**
  * *O que foi feito:*
    * **Problema identificado:** O arquivo `MyFirebaseMessagingService.java` estava declarado no pacote legado `io.ionic.starter` (template Ionic), incompatÃƒÂ­vel com o namespace real do projeto `br.com.mtsolar.gestao`. Isso causava erros de compilaÃƒÂ§ÃƒÂ£o `cannot find symbol` para `MainActivity.class` e `R.mipmap.ic_launcher`.
    * **SoluÃƒÂ§ÃƒÂ£o aplicada:**
      1. Criado novo `MyFirebaseMessagingService.java` no pacote correto `br.com.mtsolar.gestao` em `android/app/src/main/java/br/com/mtsolar/gestao/`.
      2. Removido o arquivo antigo do pacote `io.ionic.starter`.
      3. Atualizado `AndroidManifest.xml` para referenciar o serviÃƒÂ§o no novo pacote (`br.com.mtsolar.gestao.MyFirebaseMessagingService`).
    * **Build gerado:** `app-release.aab` (6,11 MB), assinado com a keystore `mtsolar.jks` localizada em `C:\Users\aurel\Desktop\APK\`, certificado `CN=Marcos Nascimento`, algoritmo `SHA256withRSA`, chave RSA de 2048 bits, vÃƒÂ¡lido atÃƒÂ© `01/05/2051`. VerificaÃƒÂ§ÃƒÂ£o `jarsigner`: **`jar verified`**.
    * **LocalizaÃƒÂ§ÃƒÂ£o do arquivo final:** `android/app/build/outputs/bundle/release/app-release.aab` (e cÃƒÂ³pia em `C:\Users\aurel\Desktop\APK\app-release.aab`).
    * **ConfiguraÃƒÂ§ÃƒÂ£o de assinatura no `build.gradle`:** `storeFile = C:\Users\aurel\Desktop\APK\mtsolar.jks`, `keyAlias = mtsolar`, `minifyEnabled = true`.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 04/06/2026 ÃƒÂ s 16:51 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `android/app/src/main/java/br/com/mtsolar/gestao/MyFirebaseMessagingService.java` (novo), `android/app/src/main/AndroidManifest.xml`

* **Incremento de VersÃƒÂ£o (versionCode 9 / versionName 1.0.1) e Novo Bundle app-release-v2.aab:**
  * *O que foi feito:*
    * **`android/app/build.gradle`:** `versionCode` incrementado de `8` para `9` e `versionName` atualizado de `"1.2.5"` para `"1.0.1"` dentro do bloco `defaultConfig`.
    * **Build gerado:** `bundleRelease` executado com sucesso em Ã¢â€°Ë†18s via `.\gradlew bundleRelease` Ã¢â‚¬â€ **BUILD SUCCESSFUL (252 tasks, 15 executadas, 237 up-to-date)**.
    * **Arquivo final:** `app-release.aab` (6,11 MB), assinado com a keystore `mtsolar.jks` (`CN=Marcos Nascimento`, RSA 2048 bits, vÃƒÂ¡lido atÃƒÂ© 01/05/2051).
    * **CÃƒÂ³pia de entrega:** `C:\Users\aurel\Desktop\APK\app-release-v2.aab`.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 04/06/2026 ÃƒÂ s 19:38 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `android/app/build.gradle`

* **AlteraÃƒÂ§ÃƒÂ£o de applicationId para com.mtsolar.mtsolv e Novo .aab Gerado:**
  * *O que foi feito:*
    * **`android/app/build.gradle`:** `applicationId` alterado de `br.com.mtsolar.gestao` para `com.mtsolar.mtsolv`. O `namespace` permaneceu `br.com.mtsolar.gestao` (controla o pacote de `R` e `BuildConfig`).
    * **`android/app/src/main/java/com/mtsolar/mtsolv/MyFirebaseMessagingService.java`:** Arquivo Java recriado na nova estrutura de pastas com `package com.mtsolar.mtsolv;`. Os imports de `MainActivity` e `R` apontam explicitamente para `br.com.mtsolar.gestao` onde essas classes sÃƒÂ£o geradas/definidas.
    * **`android/app/src/main/AndroidManifest.xml`:** ReferÃƒÂªncia do serviÃƒÂ§o FCM atualizada para `com.mtsolar.mtsolv.MyFirebaseMessagingService`.
    * **`android/app/google-services.json`:** `package_name` atualizado de `br.com.mtsolar.gestao` para `com.mtsolar.mtsolv` (necessÃƒÂ¡rio pois o plugin `google-services` bloqueia o build se nÃƒÂ£o houver match).
    * **Build gerado:** `app-release.aab` (6,11 MB) com `applicationId = com.mtsolar.mtsolv` confirmado no manifest compilado (`build/intermediates/bundle_manifest`). Assinado com a keystore `mtsolar.jks` (`CN=Marcos Nascimento`, RSA 2048 bits, vÃƒÂ¡lido atÃƒÂ© 01/05/2051).
    * **LocalizaÃƒÂ§ÃƒÂ£o:** `android/app/build/outputs/bundle/release/app-release.aab` e cÃƒÂ³pia em `C:\Users\aurel\Desktop\APK\app-release.aab`.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 04/06/2026 ÃƒÂ s 17:01 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `android/app/build.gradle`, `android/app/src/main/java/com/mtsolar/mtsolv/MyFirebaseMessagingService.java` (novo), `android/app/src/main/AndroidManifest.xml`, `android/app/google-services.json`


* **ImplementaÃ§Ã£o do MÃ³dulo de ObservaÃ§Ãµes de Atendimento (WhatsApp):**
  * *O que foi feito:* Criada a funcionalidade completa de observaÃ§Ãµes internas por conversa no mÃ³dulo de Atendimento (WhatsApp). A soluÃ§Ã£o adota uma tabela separada `whatsapp_observations` (e nÃ£o um campo Ãºnico sobrescrito em `whatsapp_conversations`) para manter um histÃ³rico auditÃ¡vel com autoria e timestamp. O campo `user_name` Ã© um snapshot salvo no momento da criaÃ§Ã£o â€” nÃ£o sincronizado retroativamente com o nome atual do usuÃ¡rio.
  * *Banco de Dados:* Criada a migration `supabase/migrations/20260625_create_whatsapp_observations.sql` com a tabela completa, Ã­ndices de performance, RLS habilitada (leitura para toda a empresa; inserÃ§Ã£o autenticada; sem UPDATE/DELETE), e `NOTIFY pgrst, 'reload schema'` ao final.
  * *Backend:* Criadas as rotas `GET /api/conversations/:id/observations` (lista do mais recente ao mais antigo, filtrado por `company_id` do token) e `POST /api/conversations/:id/observations` (insere nova nota com validaÃ§Ã£o de conversa, `company_id`, `user_id` e `user_name` extraÃ­dos do token JWT â€” nunca do payload do client).
  * *Frontend (Desktop â€” Painel Direito):* Adicionada seÃ§Ã£o "ObservaÃ§Ãµes do Atendimento" com textarea, botÃ£o "Adicionar Nota" e listagem de notas anteriores (autor, data/hora, texto), alimentada pelo estado `observations` buscado automaticamente ao selecionar uma conversa.
  * *Frontend (Mobile):* Adicionado botÃ£o de Ã­cone `Info` no cabeÃ§alho do chat (visÃ­vel apenas em `<lg`) que abre um modal deslizante com o mesmo painel de observaÃ§Ãµes, reutilizando o mesmo estado e funÃ§Ãµes â€” sem chamadas duplicadas de API.
  * *âš ï¸ AÃ‡ÃƒO MANUAL NECESSÃRIA:* Executar a migration no **SQL Editor do Supabase**: `supabase/migrations/20260625_create_whatsapp_observations.sql`
  * *Data e hora da alteraÃ§Ã£o:* 25/06/2026 Ã s 15:37 (HorÃ¡rio Local)
  * *Arquivos modificados:* `supabase/migrations/20260625_create_whatsapp_observations.sql` (novo), `supabase_schema.sql`, `api/index.ts`, `src/pages/WhatsApp.tsx`

---



## 12. DÃƒâ€°BITOS TÃƒâ€°CNICOS

* **Monolito no Arquivo `api/index.ts`:**
  * *Risco:* O arquivo concentra mais de **2.619 linhas** de cÃƒÂ³digo unificando autenticaÃƒÂ§ÃƒÂ£o, rotas de projetos comercial, tÃƒÂ©cnico, logs, estoque, WhatsApp, webhooks de recebimento, crons e inteligÃƒÂªncia artificial. Isso eleva a chance de bugs de concorrÃƒÂªncia de variÃƒÂ¡veis globais e dificulta manutenÃƒÂ§ÃƒÂµes.
* **Dupla Coluna de Tag (`tag` e `tags`) na Tabela `whatsapp_conversations`:**
  * *SituaÃƒÂ§ÃƒÂ£o:* A coluna legada `tag TEXT` (singular) ainda existe na tabela ao lado da nova coluna `tags TEXT[]`. Os dados histÃƒÂ³ricos foram migrados via script, mas as duas colunas coexistem. Novas gravaÃƒÂ§ÃƒÂµes via a rota corrigida sÃƒÂ³ atualizam `tags`; a coluna `tag` ficarÃƒÂ¡ progressivamente desatualizada.
  * *Risco:* ConfusÃƒÂ£o em queries futuras, consumo desnecessÃƒÂ¡rio de espaÃƒÂ§o, e risco de regressÃƒÂ£o caso alguma rota antiga ainda referencie `tag`.
  * *AÃƒÂ§ÃƒÂ£o Recomendada:* ApÃƒÂ³s confirmar estabilidade, executar `ALTER TABLE whatsapp_conversations DROP COLUMN tag;` para remover a coluna obsoleta.
* **Payloads e Timeouts na Vercel:**
  * *Risco:* FunÃƒÂ§ÃƒÂµes Serverless gratuitas ou standard na Vercel possuem limites de execuÃƒÂ§ÃƒÂ£o de 10s a 15s. O processamento de downloads de vÃƒÂ­deos pesados vindos da Evolution API e subsequente upload no Supabase pode facilmente dar timeout.
* **Uso Extensivo de Tipagem `any`:**
  * *Risco:* VÃƒÂ¡rias funÃƒÂ§ÃƒÂµes e manipulaÃƒÂ§ÃƒÂµes de respostas do Express e do React no frontend estÃƒÂ£o anotadas com `any` ou utilizando diretivas de escape do compilador (`// @ts-ignore`), o que reduz consideravelmente os benefÃƒÂ­cios da checagem estÃƒÂ¡tica de tipos do TypeScript.
* **Arquivos Sobressalentes / Legado:**
  * *Risco:* PresenÃƒÂ§a de arquivos de backup na pasta do cÃƒÂ³digo-fonte (ex: `src/pages/Technical.tsx.bak`) que poluem a ÃƒÂ¡rvore de arquivos e podem confundir desenvolvedores.
* **Rota de TransferÃƒÂªncia NÃƒÂ£o Atualiza `tags`:**
  * *SituaÃƒÂ§ÃƒÂ£o:* A rota `POST /api/whatsapp/transfer` ao criar o objeto `transferData` ainda define `tag: 'Transferido'` (coluna antiga singular), e **nÃƒÂ£o** preenche a coluna `tags` com `['Transferido']`.
  * *Risco:* Conversas transferidas nÃƒÂ£o receberÃƒÂ£o a etiqueta visual no novo sistema de multi-tags.


---

## 13. BACKLOG E MELHORIAS SUGERIDAS

### TÃƒÂ©cnicas
1. **Desacoplamento e OrganizaÃƒÂ§ÃƒÂ£o do Backend:** Dividir o arquivo `/api/index.ts` em uma estrutura modularizada de rotas (ex: `api/routes/auth.ts`, `api/routes/whatsapp.ts`, `api/routes/projects.ts`) e controladores.
2. **UtilizaÃƒÂ§ÃƒÂ£o de Fila de Background Jobs:** Adotar serviÃƒÂ§os de fila (como BullMQ, Redis, ou tarefas em background integradas) para o processamento de mÃƒÂ­dias de webhooks recebidos do WhatsApp. O Webhook deve retornar `200 OK` imediatamente e agendar o processamento pesado de mÃƒÂ­dia em background para evitar timeouts.
3. **Mecanismo de Limpeza PeriÃƒÂ³dica de Storage (Data Retention):** MÃƒÂ­dias permanentes de chat consomem gigabytes rapidamente. Ãƒâ€° recomendado criar um Cronjob mensal para deletar arquivos e URLs de mensagens com mais de 120 dias no bucket `whatsapp-media`.

### Produto
1. **VisualizaÃƒÂ§ÃƒÂ£o Nativa de Arquivos:** Modificar o visualizador no chat (`WhatsApp.tsx`) para permitir visualizar PDFs de contratos e orÃƒÂ§amentos dentro da prÃƒÂ³pria conversa em formato iframe/modal sem exigir o download fÃƒÂ­sico prÃƒÂ©vio.
2. **HistÃƒÂ³rico Local de Mensagens:** Desenvolver um botÃƒÂ£o na interface do chat para sincronizar e importar as ÃƒÂºltimas 50 mensagens anteriores guardadas diretamente no celular da Evolution API para o banco do sistema.


---

## 14. VARIÃƒÂVEIS DE AMBIENTE

Abaixo estÃƒÂ£o listadas todas as variÃƒÂ¡veis cruciais exigidas para o funcionamento local e de produÃƒÂ§ÃƒÂ£o:

### Frontend (Devem possuir o prefixo `VITE_` para exposiÃƒÂ§ÃƒÂ£o ao Vite/Cliente)
* **`VITE_SUPABASE_URL`:** URL base da API do projeto Supabase. Usado para conectar o cliente SDK do banco.
* **`VITE_SUPABASE_ANON_KEY`:** Chave pÃƒÂºblica de acesso do Supabase. Segura para exposiÃƒÂ§ÃƒÂ£o pÃƒÂºblica.
* **`VITE_EVOLUTION_URL`:** EndereÃƒÂ§o pÃƒÂºblico do servidor da Evolution API v2 (Railway).
* **`VITE_EVOLUTION_KEY`:** Chave global de acesso de administrador da Evolution API.
* **`VITE_EVOLUTION_INSTANCE_ADMIN`:** Nome padrÃƒÂ£o da instÃƒÂ¢ncia administrativa (`mtsolar`).
* **`VITE_EVOLUTION_INSTANCE_ATENDIMENTO`:** Nome padrÃƒÂ£o da instÃƒÂ¢ncia comercial (`atendimento-cliente`).
* **`VITE_EVOLUTION_TOKEN_ATENDIMENTO`:** Token de acesso especÃƒÂ­fico da instÃƒÂ¢ncia de atendimento ao cliente.

### Backend (Seguras e restritas apenas ao Servidor Express na Vercel)
* **`SUPABASE_SERVICE_ROLE_KEY`:** Chave de administraÃƒÂ§ÃƒÂ£o master do Supabase. Ignora todas as regras de seguranÃƒÂ§a RLS (Row Level Security). **NUNCA DEVE SER EXPOSTA NO FRONTEND.**
* **`JWT_SECRET`:** Chave secreta de encriptaÃƒÂ§ÃƒÂ£o usada para assinar e validar a autenticidade dos tokens de sessÃƒÂ£o de usuÃƒÂ¡rios.
* **`FIREBASE_PROJECT_ID`:** ID de identificaÃƒÂ§ÃƒÂ£o do projeto configurado no console do Google Firebase.
* **`FIREBASE_PRIVATE_KEY`:** Chave privada criptogrÃƒÂ¡fica em string do Firebase Admin para autenticaÃƒÂ§ÃƒÂ£o de push.
* **`FIREBASE_CLIENT_EMAIL`:** E-mail de serviÃƒÂ§o configurado para comunicaÃƒÂ§ÃƒÂ£o com a API FCM do Firebase.

* **6 CorreÃƒÂ§ÃƒÂµes Pontuais no Gerador de Contratos PDF (Blocos 1Ã¢â‚¬â€œ6):**
  * *O que foi feito:*
    * **BLOCO 1 Ã¢â‚¬â€ Opacidade da marca d'ÃƒÂ¡gua:** Aumentada a opacidade da logomarca de fundo no PDF do contrato de `opacity: 0.3` para `opacity: 0.35` (+5 p.p.) via `doc.setGState`.
    * **BLOCO 2 Ã¢â‚¬â€ Quebra de pÃƒÂ¡gina antes do bloco final:** Restruturada a lÃƒÂ³gica de paginaÃƒÂ§ÃƒÂ£o das assinaturas. Agora o sistema prÃƒÂ©-calcula a altura total necessÃƒÂ¡ria (parÃƒÂ¡grafo "E por estarem assim justas...", linha da data, espaÃƒÂ§o e as duas colunas de assinatura com labels) e verifica *antes* de renderizar o parÃƒÂ¡grafo final se tudo cabe na pÃƒÂ¡gina. A quebra, quando necessÃƒÂ¡ria, ocorre antes do parÃƒÂ¡grafo inicial do bloco, garantindo que parÃƒÂ¡grafo, data e assinaturas fiquem sempre juntos.
    * **BLOCO 3 Ã¢â‚¬â€ Data sem problema de fuso UTC:** SubstituÃƒÂ­da a formaÃƒÂ§ÃƒÂ£o da data no PDF (que usava `new Date(data).toLocaleDateString(...)` e sofria de deslocamento UTC-3) por desestruturaÃƒÂ§ÃƒÂ£o direta da string `YYYY-MM-DD` e montagem com array `mesesPtBR` usando ÃƒÂ­ndice local. TambÃƒÂ©m corrigida a data inicial do campo de formulÃƒÂ¡rio (de `toISOString().split('T')[0]` para IIFE com `getFullYear()/getMonth()/getDate()`).
    * **BLOCO 4 Ã¢â‚¬â€ MÃƒÂ¡scara CPF/CNPJ dinÃƒÂ¢mica:** Criada funÃƒÂ§ÃƒÂ£o `formatarCpfCnpj(valor: string): string` que remove nÃƒÂ£o-numÃƒÂ©ricos, limita a 14 dÃƒÂ­gitos e aplica progressivamente a mÃƒÂ¡scara `000.000.000-00` (atÃƒÂ© 11 dÃƒÂ­gitos) ou `00.000.000/0000-00` (12Ã¢â‚¬â€œ14 dÃƒÂ­gitos). Campo alterado para `type="text"`, `inputMode="numeric"` e `maxLength={18}`.
    * **BLOCO 5 Ã¢â‚¬â€ Tabela do Kit Fotovoltaico no PDF:** SubstituÃƒÂ­da a lista numerada por tabela manual com 3 colunas (Item 15% | Qtd. 15% | Produto 70%), desenhada com `doc.rect()` e `doc.line()`. CabeÃƒÂ§alho com fundo azul-claro (`fillColor 230,235,245`), paginaÃƒÂ§ÃƒÂ£o dinÃƒÂ¢mica com redesenho de cabeÃƒÂ§alho em nova pÃƒÂ¡gina, e suporte a quebra de linha automÃƒÂ¡tica na coluna Produto.
    * **BLOCO 6 Ã¢â‚¬â€ CorreÃƒÂ§ÃƒÂµes gramaticais e de coesÃƒÂ£o:** Aplicadas 8 correÃƒÂ§ÃƒÂµes de redaÃƒÂ§ÃƒÂ£o nas clÃƒÂ¡usulas do contrato (3Ã‚Âª, 5Ã‚Âª, 7Ã‚Âª e 8Ã‚Âª); correÃƒÂ§ÃƒÂµes incluem crases ausentes, concordÃƒÂ¢ncias verbais, erros de regÃƒÂªncia e pontuaÃƒÂ§ÃƒÂ£o. Adicionado comentÃƒÂ¡rio `// REVISAR:` no trecho de agente de atendimento da ClÃƒÂ¡usula Quinta para revisÃƒÂ£o jurÃƒÂ­dica futura.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 15/06/2026 ÃƒÂ s 11:30 (HorÃƒÂ¡rio Local)
* **5 Novas CorreÃƒÂ§ÃƒÂµes no Gerador de Contratos PDF (Blocos AÃ¢â‚¬â€œE):**
  * *O que foi feito:*
    * **DiagnÃƒÂ³stico / BLOCO A Ã¢â‚¬â€ Opacidade da marca d'ÃƒÂ¡gua:** O valor de opacidade atual era de `0.35`. O diagnÃƒÂ³stico confirmou que existe apenas 1 local de desenho da marca d'ÃƒÂ¡gua no PDF, e a restauraÃƒÂ§ÃƒÂ£o de opacidade com `doc.setGState(new doc.GState({ opacity: 1.0 }))` ocorre imediatamente depois, na mesma pÃƒÂ¡gina, sem vazar. O valor de `0.35` (35%) foi mantido em todas as ocorrÃƒÂªncias de marca d'ÃƒÂ¡gua do arquivo.
    * **BLOCO B Ã¢â‚¬â€ Remover o "x" da coluna "Qtd.":** Ajustado o parsing na tabela para remover o "x" exibido ao lado do nÃƒÂºmero na coluna de quantidade, alterando a atribuiÃƒÂ§ÃƒÂ£o de `qtdStr` de `${item.quantity}x` para `String(item.quantity)`.
    * **BLOCO C Ã¢â‚¬â€ CorreÃƒÂ§ÃƒÂ£o na ClÃƒÂ¡usula Quinta:** Alterado o sujeito de "apÃƒÂ³s serem reportadas pela CONTRATADA" para "apÃƒÂ³s serem reportadas pelo CONTRATANTE", corrigindo o sentido de quem comunica as falhas nos equipamentos e removendo o comentÃƒÂ¡rio temporÃƒÂ¡rio de revisÃƒÂ£o.
    * **BLOCO D Ã¢â‚¬â€ EspaÃƒÂ§amento apÃƒÂ³s a tabela do Kit:** Aumentado o espaÃƒÂ§amento entre o tÃƒÂ©rmino da tabela do kit fotovoltaico e o tÃƒÂ­tulo da ClÃƒÂ¡usula Segunda de `3mm` para `8mm` (`currentY += 8;`), criando uma separaÃƒÂ§ÃƒÂ£o consistente.
    * **BLOCO E Ã¢â‚¬â€ Ajuste de quebra de pÃƒÂ¡gina (bloco final):** Refatorado o cÃƒÂ¡lculo de `alturaTotalBlocoFinal` para `alturaParaFinal + 48` (removendo margem redundante de seguranÃƒÂ§a), reduzindo a altura calculada de 64mm para 60mm e evitando que o bloco final seja empurrado desnecessariamente para a pÃƒÂ¡gina seguinte.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 15/06/2026 ÃƒÂ s 12:00 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `src/pages/Contracts.tsx`

* **ReordenaÃƒÂ§ÃƒÂ£o do item Comercial no menu lateral:**
  * *O que foi feito:*
    * O item "Comercial" (rota `/commercial`) foi reposicionado no array `menuItems` para a segunda posiÃƒÂ§ÃƒÂ£o, logo apÃƒÂ³s o item "Dashboard" (rota `/`).
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 16/06/2026 ÃƒÂ s 10:30 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `src/components/Layout.tsx`

* **Auditoria Completa do Ciclo de Vida do Cliente e Projeto:**
  * *O que foi feito:*
    * Auditoria granular de ponta a ponta do ciclo de vida no sistema, do cadastro ÃƒÂ  finalizaÃƒÂ§ÃƒÂ£o/completed.
    * Mapeamento de 7 etapas principais: Cadastro, Kanban, Proposta Comercial, Vistoria TÃƒÂ©cnica, Obra/InstalaÃƒÂ§ÃƒÂ£o, HomologaÃƒÂ§ÃƒÂ£o/ConcessionÃƒÂ¡ria, ConclusÃƒÂ£o com HigienizaÃƒÂ§ÃƒÂ£o e LGPD.
    * Levantamento de campos frontend, persistÃƒÂªncia de banco de dados e fluxos de remoÃƒÂ§ÃƒÂ£o automÃƒÂ¡tica de dados sensÃƒÂ­veis e arquivos de storage (buckets `obras-fotos` e `propostas`).
    * IdentificaÃƒÂ§ÃƒÂ£o de gaps de seguranÃƒÂ§a, persistÃƒÂªncia assÃƒÂ­ncrona de PDF e regras de integridade fÃƒÂ­sica.
    * CriaÃƒÂ§ÃƒÂ£o do relatÃƒÂ³rio tÃƒÂ©cnico de auditoria `auditoria_fluxo_gestao_mtsolar.md`.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 16/06/2026 ÃƒÂ s 13:40 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados/criados:* `RESUMO_MESTRE.md`, `auditoria_fluxo_gestao_mtsolar.md` (Criado)

* **SeÃƒÂ§ÃƒÂ£o 8 Ã¢â‚¬â€ DivergÃƒÂªncias e Lacunas adicionada ao relatÃƒÂ³rio de auditoria:**
  * *O que foi feito:*
    * AnÃƒÂ¡lise cruzada entre frontend (Commercial.tsx, ProposalGenerator.tsx, Technical.tsx, Obra.tsx, ObraSchedule.tsx, Homologation.tsx, NeoenergiaProtocols.tsx, FinishedProjects.tsx), backend (api/index.ts) e schema (supabase_schema.sql).
    * **Q1 Ã¢â‚¬â€ Campos orphÃƒÂ£os no frontend:** Identificados 7 campos coletados e validados como obrigatÃƒÂ³rios em Commercial.tsx (`zip_code`, `inversor_marca`, `inversor_modelo`, `inversor_potencia`, `modulo_potencia`, `modulo_modelo`, `estrutura_tipo`) que sÃƒÂ£o descartados silenciosamente pela rota `POST /api/clients` sem nenhuma persistÃƒÂªncia.
    * **Q2 Ã¢â‚¬â€ Colunas do banco nunca preenchidas:** Identificadas 7 colunas sem rota de escrita: `clients.status`, `projects.description`, `commercial_data.contract_url`, `projects.homologation_protocol`, `projects.homologation_entry_date`, `projects.homologation_notes` e `proposal_history.project_id` (crÃƒÂ­tico: torna a limpeza de propostas ineficaz na finalizaÃƒÂ§ÃƒÂ£o do projeto).
    * **Q3 Ã¢â‚¬â€ TransiÃƒÂ§ÃƒÂµes sem validaÃƒÂ§ÃƒÂ£o backend:** Confirmado que nÃƒÂ£o existe Kanban drag-and-drop. As 3 transiÃƒÂ§ÃƒÂµes de estÃƒÂ¡gio (`registrationÃ¢â€ â€™inspection`, `inspectionÃ¢â€ â€™homologation`, `installationÃ¢â€ â€™homologation`) avanÃƒÂ§am sem qualquer validaÃƒÂ§ÃƒÂ£o de campos no backend Ã¢â‚¬â€ toda validaÃƒÂ§ÃƒÂ£o ÃƒÂ© client-side e bypassÃƒÂ¡vel.
    * **Q4 Ã¢â‚¬â€ DivergÃƒÂªncia de documentaÃƒÂ§ÃƒÂ£o de fotos:** Os nomes dos 3 campos citados no RESUMO_MESTRE estÃƒÂ£o corretos. A divergÃƒÂªncia ÃƒÂ© de incompletude: 7 dos 10 campos de foto (`photo_inverter_label`, `photo_grounding`, `photo_ac_voltage`, `photo_dc_voltage`, `photo_generation_plate`, `photo_ac_stringbox`, `photo_connection_point`) estÃƒÂ£o ausentes da documentaÃƒÂ§ÃƒÂ£o, mas existem no cÃƒÂ³digo, schema e cleanup do backend.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 16/06/2026 ÃƒÂ s 11:04 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `RESUMO_MESTRE.md`, `auditoria_fluxo_gestao_mtsolar.md` (SeÃƒÂ§ÃƒÂ£o 8 adicionada)

* **PersistÃƒÂªncia de Dados do Kit Negociado e CorreÃƒÂ§ÃƒÂ£o do Fechamento Comercial:**
  * *O que foi feito:*
    * **Parte 1 (Dados do Kit):**
      * Atualizadas as rotas `POST /api/clients` e `PUT /api/clients/:id` no backend (`api/index.ts`) para receber, processar e inserir os dados do kit (`inversor_marca`, `inversor_modelo`, `inversor_potencia`, `modulo_modelo`, `modulo_potencia`, `estrutura_tipo`) na tabela `clients`. Implementamos tratamento de erro (`PGRST204` / `42703`) resiliente para fallback (tentando novamente sem os campos extras caso as colunas ainda nÃƒÂ£o estejam criadas no banco).
      * Modificado o join do `GET /api/projects/:id` no backend para selecionar de forma flexÃƒÂ­vel todas as colunas de `clients` usando `clients (*)` e mapear as novas propriedades no objeto planificado que retorna ao frontend.
      * Confirmado que o formulÃƒÂ¡rio de cadastro de novo cliente (`newClient`) e o formulÃƒÂ¡rio de ediÃƒÂ§ÃƒÂ£o de cliente (`editClientData`) no frontend (`Commercial.tsx`) jÃƒÂ¡ coletavam, controlavam e submetiam adequadamente os payloads com esses 6 campos.
    * **Parte 2 (Fechamento Comercial):**
      * Criada a rota `PUT /api/commercial-data/:projectId` no backend (`api/index.ts`) para realizar o `upsert` dos dados do fechamento comercial na tabela `commercial_data` com chave de conflito em `project_id`. A rota valida o token do usuÃƒÂ¡rio (`authenticateToken`), assegura o isolamento de tenant (`company_id`) e executa a atualizaÃƒÂ§ÃƒÂ£o e o disparo de regras de transiÃƒÂ§ÃƒÂ£o de status de projeto (ex: avanÃƒÂ§ar para vistoria em caso de `proposta_enviada` com disparador de notificaÃƒÂ§ÃƒÂµes push).
      * Convertidos os textos estÃƒÂ¡ticos de exibiÃƒÂ§ÃƒÂ£o das "InformaÃƒÂ§ÃƒÂµes Comerciais do Fechamento" na tela de detalhes do projeto do frontend (`Commercial.tsx`) em inputs de formulÃƒÂ¡rio interativos e dinÃƒÂ¢micos vinculados ao estado de `selectedProject`.
      * Atualizada a aÃƒÂ§ÃƒÂ£o do botÃƒÂ£o "Salvar AlteraÃƒÂ§ÃƒÂµes" no frontend (`Commercial.tsx`) para chamar a nova rota `PUT /api/commercial-data/:projectId` enviando o payload correspondente e atualizando o estado do componente.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 16/06/2026 ÃƒÂ s 11:43 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/Commercial.tsx`, `RESUMO_MESTRE.md`

* **Parte 3 Ã¢â‚¬â€ ExibiÃƒÂ§ÃƒÂ£o do Kit Negociado no Cronograma de Obras:**
  * *O que foi feito:*
    * **Backend (`api/index.ts`):** Atualizada a rota `GET /api/projects-schedule` para fazer join com a tabela `clients` selecionando os campos `inversor_marca`, `inversor_modelo`, `inversor_potencia`, `modulo_modelo`, `modulo_potencia` e `estrutura_tipo`. O resultado ÃƒÂ© mapeado de forma planificada (flat), preservando retrocompatibilidade com todos os campos anteriores da rota.
    * **Frontend (`ObraSchedule.tsx`):** Expandida a interface `ProjectSchedule` com os seis novos campos opcionais do kit (todos tipados como `string | number | null`). Na seÃƒÂ§ÃƒÂ£o expandÃƒÂ­vel de cada card do cronograma, adicionado um bloco somente-leitura com fundo ÃƒÂ¢mbar mostrando **Inversor Modelo**, **PotÃƒÂªncia Inversor (kW)**, **MÃƒÂ³dulo Modelo** e **PotÃƒÂªncia MÃƒÂ³dulo (Wp)**. O bloco sÃƒÂ³ ÃƒÂ© exibido quando ao menos um desses campos estÃƒÂ¡ preenchido; campos vazios/nulos exibem `Ã¢â‚¬â€` como valor padrÃƒÂ£o.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 16/06/2026 ÃƒÂ s 11:46 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/ObraSchedule.tsx`, `RESUMO_MESTRE.md`

* **Parte 4 Ã¢â‚¬â€ Campos de Compra do Kit e Bloqueio de EstÃƒÂ¡gio:**
  * *O que foi feito:*
    * **Backend (`api/index.ts`):** 
      * Atualizada a rota `PUT /api/projects/:id/kit` para aceitar os campos `data_compra_kit`, `data_prevista_entrega`, `distribuidora` e `kit_entregue` e persisti-los na tabela `projects`.
      * Adicionado tratamento com bloco try-catch resiliente contra colunas inexistentes no banco (erro `PGRST204` / `42703`), garantindo o fallback e funcionamento das demais atualizaÃƒÂ§ÃƒÂµes mesmo sem essas colunas fisicamente criadas no banco.
      * Adicionada validaÃƒÂ§ÃƒÂ£o de transiÃƒÂ§ÃƒÂ£o nas rotas `PUT /api/projects/:id/commercial` e `PUT /api/commercial-data/:projectId`: agora a transiÃƒÂ§ÃƒÂ£o de `current_stage` para `inspection` (Vistoria) ÃƒÂ© rejeitada com status HTTP `422` se o kit nÃƒÂ£o tiver sido marcado como entregue (`kit_entregue` for falso).
    * **Frontend (`KitPurchase.tsx`):**
      * Adicionados os campos "Data de Compra do Kit", "Data Prevista de Entrega", "Distribuidora" e a checkbox "Material Entregue?" no formulÃƒÂ¡rio de gerenciar kit do projeto.
      * Exibidos de forma clara e organizada os dados de compra na listagem de projetos e adicionados badges dinÃƒÂ¢micos baseados no status da entrega ("Material Entregue" em verde e "Aguardando Entrega" em amarelo).
    * **Frontend (`Commercial.tsx`):**
      * O botÃƒÂ£o "Aprovar Proposta Comercial" (que envia o estÃƒÂ¡gio do projeto para Vistoria) agora ÃƒÂ© desabilitado com opacidade e cursor nÃƒÂ£o-permitido se `kit_entregue` for falso, mostrando um tooltip avisando sobre a pendÃƒÂªncia da entrega.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 16/06/2026 ÃƒÂ s 11:55 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/KitPurchase.tsx`, `src/pages/Commercial.tsx`, `RESUMO_MESTRE.md`

* **Parte 5 Ã¢â‚¬â€ Desaparecimento de Clientes Homologados:**
  * *O que foi feito:*
    * **Backend (`api/index.ts`):** 
      * Ajustada a rota `PUT /api/projects/:id/homologation` para que, ao receber o status `connection_point_approved` (Ponto de ConexÃƒÂ£o Aprovado), atualize o `current_stage` e o `status` do projeto para `conclusion` (ConclusÃƒÂ£o / PÃƒÂ³s-venda) em vez de `completed`. Isso move o projeto para a prÃƒÂ³xima fase natural do funil.
    * **Frontend (`Homologation.tsx`):**
      * Atualizado o filtro de projetos carregados no mÃƒÂ©todo `fetchProjects` para manter na tela apenas aqueles com estÃƒÂ¡gio `homologation` e cujo `homologation_status` seja diferente de `connection_point_approved`.
      * Adicionada atualizaÃƒÂ§ÃƒÂ£o reativa imediata no mÃƒÂ©todo `handleUpdate` que remove sÃƒÂ­ncronamente o projeto da listagem local (`projects`) assim que o status aprovado ÃƒÂ© salvo com sucesso.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 16/06/2026 ÃƒÂ s 12:00 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/Homologation.tsx`, `RESUMO_MESTRE.md`

* **CorreÃƒÂ§ÃƒÂ£o de Fluxo de EstÃƒÂ¡gios (Funil Completo):**
  * *O que foi feito:*
    * **Backend (`api/index.ts`):**
      * `PUT /api/projects/:id/technical` Ã¢â‚¬â€ corrigida a transiÃƒÂ§ÃƒÂ£o ao concluir a vistoria: `current_stage` agora avanÃƒÂ§a para `installation` (era incorretamente `homologation`).
      * `GET /api/projects-schedule` Ã¢â‚¬â€ substituÃƒÂ­do o filtro `.neq('current_stage', 'completed')` por `.eq('current_stage', 'installation').eq('kit_entregue', true)`. O cronograma agora exibe **somente** projetos em fase de instalaÃƒÂ§ÃƒÂ£o com kit confirmado como entregue.
      * `PUT /api/projects/:id/installation` Ã¢â‚¬â€ mantida sem alteraÃƒÂ§ÃƒÂ£o: ao concluir a obra (`status: 'approved'`), o projeto avanÃƒÂ§a corretamente para `homologation`.
    * **Frontends verificados (sem alteraÃƒÂ§ÃƒÂ£o necessÃƒÂ¡ria):**
      * `Technical.tsx` Ã¢â‚¬â€ jÃƒÂ¡ usava `PUT /api/projects/:id/technical` com `status: 'vistoria_concluida'` Ã¢Å“â€¦
      * `Obra.tsx` Ã¢â‚¬â€ jÃƒÂ¡ usava `PUT /api/projects/:id/installation` com `status: 'approved'` Ã¢Å“â€¦
      * `KitPurchase.tsx` Ã¢â‚¬â€ jÃƒÂ¡ usava `PUT /api/projects/:id/kit` com `kit_entregue` Ã¢Å“â€¦
  * *Fluxo correto apÃƒÂ³s as correÃƒÂ§ÃƒÂµes:*
    1. ÃƒÂrea Comercial Ã¢â€ â€™ `(proposta_enviada)` Ã¢â€ â€™ `current_stage: inspection`
    2. Vistoria TÃƒÂ©cnica Ã¢â€ â€™ `(vistoria_concluida)` Ã¢â€ â€™ `current_stage: installation`
    3. Kit Solar Ã¢â€ â€™ `(kit_entregue: true)` Ã¢â€ â€™ projeto elegÃƒÂ­vel para Cronograma
    4. Cronograma Ã¢â€ â€™ filtro: `installation` + `kit_entregue = true`
    5. Obra Ã¢â€ â€™ `(status: approved)` Ã¢â€ â€™ `current_stage: homologation`
    6. HomologaÃƒÂ§ÃƒÂ£o Ã¢â€ â€™ `(connection_point_approved)` Ã¢â€ â€™ `current_stage: conclusion`
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 16/06/2026 ÃƒÂ s 12:30 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `RESUMO_MESTRE.md`

* **Ajuste de EstÃƒÂ¡gio Inicial, EndereÃƒÂ§os no Cronograma e Desbloqueio Comercial:**
  * *O que foi feito:*
    * **Backend (`api/index.ts`):**
      * `POST /api/clients` Ã¢â‚¬â€ Adicionado `current_stage: 'registration'` na inserÃƒÂ§ÃƒÂ£o da tabela `projects`, garantindo que novos projetos iniciem no funil na etapa correta de cadastro.
      * `GET /api/projects-schedule` Ã¢â‚¬â€ Adicionado os campos `address`, `city` e `state` no select de join da tabela `clients` e incluÃƒÂ­do o mapeamento plano em `mappedProjects`.
      * `PUT /api/projects/:id/commercial` e `PUT /api/commercial-data/:projectId` Ã¢â‚¬â€ Removida a validaÃƒÂ§ÃƒÂ£o de `kit_entregue` ao aprovar a proposta comercial (`status: 'proposta_enviada'`), permitindo o avanÃƒÂ§o correto para a etapa de vistoria tÃƒÂ©cnica (`current_stage: 'inspection'`) sem travas prematuras.
    * **Frontend (`Commercial.tsx`):**
      * Removido o bloqueio `disabled={!selectedProject.kit_entregue}` e a condicional do botÃƒÂ£o "Aprovar Proposta Comercial", permitindo que o vendedor envie a proposta e avance o projeto para vistoria sem exigir entrega prÃƒÂ©via do kit (que sÃƒÂ³ ocorre na fase de instalaÃƒÂ§ÃƒÂ£o/obra).
    * **Frontend (`ObraSchedule.tsx`):**
      * Adicionados campos `address`, `city` e `state` como opcionais na interface `ProjectSchedule`.
      * Inserido card visual cinza claro (`bg-gray-50`) exibindo o endereÃƒÂ§o do cliente cadastrado caso esteja preenchido (`project.address`, `project.city`, `project.state`), posicionado estrategicamente acima dos dados do kit negociado no detalhe expandÃƒÂ­vel do cronograma.
* **ReestruturaÃƒÂ§ÃƒÂ£o e Alinhamento do Funil de Obras:**
  * *O que foi feito:*
    * **Backend (`api/index.ts`):**
      * `GET /api/projects-schedule` Ã¢â‚¬â€ Alterado o filtro do cronograma de obras para exibir somente projetos que estejam no estÃƒÂ¡gio de instalaÃƒÂ§ÃƒÂ£o (`current_stage: 'installation'`) E cujo kit de equipamentos jÃƒÂ¡ tenha sido entregue (`kit_entregue: true`), garantindo que o cronograma represente apenas obras prontas para inÃƒÂ­cio.
    * **Frontend (`Homologation.tsx`):**
      * Ajustado o filtro da listagem de homologaÃƒÂ§ÃƒÂµes para exibir projetos tanto no estÃƒÂ¡gio `'homologation'` quanto no estÃƒÂ¡gio paralelo `'installation'`. Isso permite que o processo de homologaÃƒÂ§ÃƒÂ£o ocorra em paralelo com a compra do Kit Solar e a execuÃƒÂ§ÃƒÂ£o da Obra, logo apÃƒÂ³s a conclusÃƒÂ£o da Vistoria TÃƒÂ©cnica.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 16/06/2026 ÃƒÂ s 13:25 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/Homologation.tsx`, `RESUMO_MESTRE.md`

* **CorreÃƒÂ§ÃƒÂ£o do Cronograma: Projetos em InstalaÃƒÂ§ÃƒÂ£o NÃƒÂ£o Apareciam:**
  * *Causa Raiz:*
    * O cronograma filtrava por `kit_entregue = true`, mas o campo pode ser `null` no banco caso o fallback `PGRST204` seja ativado (colunas ausentes no schema), fazendo com que projetos em `installation` nÃƒÂ£o apareÃƒÂ§am.
  * *O que foi feito:*
    * **Backend (`api/index.ts`):**
      * `GET /api/projects-schedule` Ã¢â‚¬â€ Removido o filtro `kit_entregue = true` da query do Supabase. O cronograma agora exibe todos os projetos no estÃƒÂ¡gio `current_stage: 'installation'`, sem depender da coluna `kit_entregue` como filtro de banco.
      * `PUT /api/projects/:id/kit` Ã¢â‚¬â€ Adicionado `current_stage: 'installation'` ao payload base de atualizaÃƒÂ§ÃƒÂ£o, garantindo que ao salvar o kit (comprado ou entregue) o projeto permaneÃƒÂ§a no estÃƒÂ¡gio correto de instalaÃƒÂ§ÃƒÂ£o. O status foi ajustado: `'kit_entregue'` quando entregue, `'kit_definido'` caso contrÃƒÂ¡rio.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 16/06/2026 ÃƒÂ s 13:36 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `RESUMO_MESTRE.md`

* **Auto-preenchimento do Kit Negociado em KitPurchase.tsx:**
  * *O que foi feito:*
    * **Frontend (`KitPurchase.tsx`):**
      * Corrigido o fallback de prÃƒÂ©-preenchimento dos campos do formulÃƒÂ¡rio de Kit Solar ao abrir um projeto. Anteriormente, o cÃƒÂ³digo tentava usar `project.proposal_inverter_model`, `project.proposal_inverter_power` etc., que **nÃƒÂ£o existem** no payload da API. Agora o fallback correto usa os campos da tabela `clients`: `inversor_marca + inversor_modelo` (concatenados) para o modelo do inversor, `inversor_potencia` para a potÃƒÂªncia do inversor, `modulo_modelo` para o modelo do mÃƒÂ³dulo e `modulo_potencia` para a potÃƒÂªncia do mÃƒÂ³dulo.
      * **Prioridade garantida:** Se jÃƒÂ¡ existirem dados salvos de compra de kit (`inverter_model`, `inverter_power`, `module_model`, `module_power`), esses valores tÃƒÂªm prioridade e os dados do cliente **nÃƒÂ£o sobrescrevem**.
      * **Tratamento de nulos:** Caso os campos do cliente estejam vazios/nulos, os inputs exibem o placeholder normalmente, sem erros.
      * **Banner informativo:** Adicionado aviso em azul (`bg-blue-50`) que aparece apenas quando os campos foram prÃƒÂ©-preenchidos com dados do kit negociado (estado `usingProposalData: true`), orientando o usuÃƒÂ¡rio a editar livremente caso o kit comprado seja diferente.
      * Adicionada importaÃƒÂ§ÃƒÂ£o do ÃƒÂ­cone `Info` do `lucide-react` para uso no banner.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 16/06/2026 ÃƒÂ s 14:00 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `src/pages/KitPurchase.tsx`, `RESUMO_MESTRE.md`

* **CorreÃƒÂ§ÃƒÂ£o da LocalizaÃƒÂ§ÃƒÂ£o do EndereÃƒÂ§o no Cronograma (ObraSchedule.tsx):**
  * *O que foi feito:*
    * **Frontend (`ObraSchedule.tsx`):**
      * Removido o campo manual/duplicado de "EndereÃƒÂ§o da InstalaÃƒÂ§ÃƒÂ£o" (que permitia input manual) que estava posicionado junto aos campos tÃƒÂ©cnicos de Inversor e Telhado.
      * Na listagem do card da obra (onde o cliente, tÃƒÂ­tulo e endereÃƒÂ§o sÃƒÂ£o exibidos de forma comprimida), o campo de endereÃƒÂ§o que tentava renderizar o endereÃƒÂ§o manual antigo (`details.endereco`) foi substituÃƒÂ­do pela formataÃƒÂ§ÃƒÂ£o do endereÃƒÂ§o real vindo da tabela `clients` (`project.city` e `project.state`, com fallback para `project.address`), mantendo assim a consistÃƒÂªncia com o card expandÃƒÂ­vel.
      * O card cinza chiaro "EndereÃƒÂ§o da InstalaÃƒÂ§ÃƒÂ£o (Cadastro do Cliente)" foi mantido como a ÃƒÂºnica fonte de endereÃƒÂ§o da instalaÃƒÂ§ÃƒÂ£o, evitando informaÃƒÂ§ÃƒÂµes duplicadas e confusas.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 16/06/2026 ÃƒÂ s 14:06 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `src/pages/ObraSchedule.tsx`, `RESUMO_MESTRE.md`

* **Limpeza, AnonimizaÃƒÂ§ÃƒÂ£o e OcultaÃƒÂ§ÃƒÂ£o de Projetos Finalizados (Conclusion / Completed):**
  * *O que foi feito:*
    * **Backend (`api/index.ts` - `PUT /api/projects/:id/homologation`):**
      * Refatorada a rotina de encerramento do projeto (quando atinge `connection_point_approved`).
      * O estÃƒÂ¡gio agora transita diretamente para `completed` (e `status = 'completed'`).
      * **ExclusÃƒÂ£o FÃƒÂ­sica (Storage):** Adicionado suporte para excluir mÃƒÂ­dias de vistoria da tabela `technical_data` (`uploads`), mÃƒÂ­dias e contratos de `commercial_data` (`uploads`), documentos de homologaÃƒÂ§ÃƒÂ£o da tabela `documents` (`homologacao-docs`), e histÃƒÂ³ricos de propostas JSON (`propostas`), economizando espaÃƒÂ§o e protegendo dados sensÃƒÂ­veis.
      * **Soft-Delete (AnonimizaÃƒÂ§ÃƒÂ£o LGPD):** Em vez de excluir o projeto, os dados sensÃƒÂ­veis da tabela `clients` (`cpf_cnpj`, `phone`, `email`, `address`) sÃƒÂ£o anulados para nulo. Cidade, Estado, e os parÃƒÂ¢metros tÃƒÂ©cnicos do inversor e mÃƒÂ³dulo sÃƒÂ£o preservados, mantendo o vÃƒÂ­nculo `client_id` ativo. Campos de notas textuais livres (`observations` e `notes`) de todas as tabelas acessÃƒÂ³rias sÃƒÂ£o sumariamente apagados. A tabela de `proposal_history` para aquele projeto ÃƒÂ© removida do banco.
    * **Frontend:**
      * Os projetos finalizados e concluÃƒÂ­dos foram sumariamente bloqueados (ocultados) de aparecer nas listagens ativas:
        * `Commercial.tsx` (Filtro `installationProjects` ajustado)
        * `Technical.tsx` (Adicionado `current_stage !== 'conclusion'` e `completed`)
        * `Obra.tsx` (Removido `'conclusion'` do array permissivo)
        * `KitPurchase.tsx` (Removido `'conclusion'` do array permissivo)
      * A tela `FinishedProjects.tsx` passa a absorver todos esses projetos limpos e exibe-os apenas com os dados brutos restantes (Cidade, Cliente, Data), sem quebrar e sem permitir o uso indevido de PIIs finalizados.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 16/06/2026 ÃƒÂ s 14:22 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/Commercial.tsx`, `src/pages/Technical.tsx`, `src/pages/Obra.tsx`, `src/pages/KitPurchase.tsx`, `RESUMO_MESTRE.md`

* **CorreÃƒÂ§ÃƒÂ£o no Filtro da Aba InstalaÃƒÂ§ÃƒÂ£o do CRM Comercial (Soft-Delete):**
  * *O que foi feito:*
    * Adicionada exclusÃƒÂ£o explÃƒÂ­cita de projetos com estÃƒÂ¡gio `completed` no filtro da aba InstalaÃƒÂ§ÃƒÂ£o em `Commercial.tsx`, eliminando o edge case onde projetos concluÃƒÂ­dos e anonimizados poderiam ser exibidos se passassem nos critÃƒÂ©rios de whitelist de estÃƒÂ¡gios.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 16/06/2026 ÃƒÂ s 14:37 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `src/pages/Commercial.tsx`, `RESUMO_MESTRE.md`

* **MigraÃƒÂ§ÃƒÂ£o de MÃƒÂ­dias: Supabase Storage Ã¢â€ â€™ Cloudflare R2 (Parte 1 Ã¢â‚¬â€ Backend):**
  * *O que foi feito:*
    * Mapeamento completo de todos os pontos de upload/delete de arquivo em `api/index.ts`.
    * **6 alteraÃƒÂ§ÃƒÂµes aplicadas** em `api/index.ts`:
      1. **Helper `uploadFile()`**: SubstituÃƒÂ­do `supabase.storage.from(bucket).upload()` + `getPublicUrl()` por `uploadToR2(file.buffer, filePath, file.mimetype)`. O parÃƒÂ¢metro `bucket` ÃƒÂ© mantido como prefixo de pasta no R2 para retrocompatibilidade com todos os chamadores.
      2. **`POST /api/whatsapp/send-audio`**: SubstituÃƒÂ­do `supabaseAdmin.storage...upload()` + `getPublicUrl()` por `uploadToR2(audioBuffer, audioFileName, 'audio/ogg')`. Caminho agora inclui prefixo `whatsapp-media/` no R2.
      3. **`POST /api/whatsapp/upload-media`**: SubstituÃƒÂ­do upload Supabase + `createSignedUrl` (600s) por `uploadToR2()`. Rota passa a retornar **URL pÃƒÂºblica permanente** do R2.
      4. **`POST /api/whatsapp/send-media`**: SubstituÃƒÂ­do `supabaseAdmin.storage...getPublicUrl(filePath)` por `${R2_PUBLIC_URL}/${filePath}` (construÃƒÂ§ÃƒÂ£o direta com variÃƒÂ¡vel jÃƒÂ¡ importada).
      5. **Webhook `downloadAndUploadMedia()`**: SubstituÃƒÂ­do `supabaseAdmin.storage...upload()` + `getPublicUrl()` por `uploadToR2(buffer, storagePath, contentType)`. MÃƒÂ­dias recebidas via webhook agora armazenadas no R2.
      6. **`GET /api/cron/cleanup-whatsapp-media`**: SubstituÃƒÂ­do `supabaseAdmin.storage...remove([path])` por `deleteFromR2(path)` com tratamento de erro por try-catch. AtualizaÃƒÂ§ÃƒÂ£o do banco permanece inalterada.
    * **NÃƒÂ£o alterados:** `POST /api/ponto/registrar` (jÃƒÂ¡ usava `uploadToR2`), `.remove()` dos buckets `obras-fotos`, `propostas`, `uploads` e `homologacao-docs`, autenticaÃƒÂ§ÃƒÂ£o, queries de banco e regras de negÃƒÂ³cio.
    * **Import confirmado na linha 12:** `import { uploadToR2, deleteFromR2, R2_PUBLIC_URL } from './r2.js'` jÃƒÂ¡ existia antes desta tarefa.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 18/06/2026 ÃƒÂ s 06:36 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `RESUMO_MESTRE.md`

* **CorreÃƒÂ§ÃƒÂ£o da SequÃƒÂªncia do Funil (Cadastro Ã¢â€ â€™ TÃƒÂ©cnica Ã¢â€ â€™ Kit Solar/HomologaÃƒÂ§ÃƒÂ£o Ã¢â€ â€™ Cronograma):**
  * *O que foi feito:*
    * **VerificaÃƒÂ§ÃƒÂµes Realizadas (Trechos Mantidos por Estarem Corretos):**
      1. `POST /api/clients`: Confirmado que novos projetos sÃƒÂ£o inseridos com `current_stage: 'registration'`.
      2. `PUT /api/projects/:id/technical`: Confirmado que ao concluir vistoria, o projeto avanÃƒÂ§a para `installation` (e nÃƒÂ£o para homologation).
      3. `PUT /api/projects/:id/kit`: Confirmado que o estÃƒÂ¡gio permanece em `installation` ao preencher os dados do kit e entrega.
      4. `Homologation.tsx` (frontend): Confirmado que a listagem de projetos jÃƒÂ¡ filtra corretamente `current_stage === 'homologation' || current_stage === 'installation'`, garantindo que o projeto apareÃƒÂ§a em ambas as telas simultaneamente (paralelismo) logo apÃƒÂ³s a vistoria tÃƒÂ©cnica.
    * **AlteraÃƒÂ§ÃƒÂ£o Realizada (`GET /api/projects-schedule`):**
      * Adicionado o filtro condicional `.or('kit_entregue.eq.true,kit_entregue.is.null')` ao final da query de seleÃƒÂ§ÃƒÂ£o.
      * O cronograma agora filtra ativamente projetos em estÃƒÂ¡gio de `installation` que possuam o `kit_entregue = true`. Projetos em `installation` que estejam com kit explÃƒÂ­cito como `false` nÃƒÂ£o aparecerÃƒÂ£o mais na tela.
      * Adicionado o fallback seguro `.is.null` para garantir que, caso a tabela no banco nÃƒÂ£o tenha a coluna de kit ou tenha registros antigos vazios, nenhum projeto desapareÃƒÂ§a acidentalmente.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 18/06/2026 ÃƒÂ s 06:42 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `RESUMO_MESTRE.md`

  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 18/06/2026 ÃƒÂ s 06:42 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `RESUMO_MESTRE.md`

* **Parte 7 Ã¢â‚¬â€ HistÃƒÂ³rico de Propostas: PaginaÃƒÂ§ÃƒÂ£o e Prazo de 30 Dias:**
  * *O que foi feito:*
    * **Backend (`api/index.ts`):** Campo `data_expiracao` na rota `POST /api/proposal-history` alterado de `+7 dias` para `+30 dias`. Rota `GET /api/proposal-history` refatorada para aceitar `?page=N&limit=N`, usar `.range(from, to)` e `.select('*', { count: 'exact' })`, retornando `{ data, total, page, totalPages }`.
    * **Frontend (`ProposalGenerator.tsx`):** Adicionados estados `historyPage`, `historyTotalPages` e `historyTotal`. FunÃƒÂ§ÃƒÂ£o `fetchHistory` atualizada para aceitar parÃƒÂ¢metro de pÃƒÂ¡gina. Tabela encapsulada em `max-h-[480px]` para scroll interno. Controles de paginaÃƒÂ§ÃƒÂ£o (Anterior / PrÃƒÂ³xima, indicador de pÃƒÂ¡gina) adicionados abaixo da tabela. Corrigido bug de template literal malformado na URL da API.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 18/06/2026 ÃƒÂ s 18:03 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/ProposalGenerator.tsx`

* **Parte 8 Ã¢â‚¬â€ Ponto EletrÃƒÂ´nico: Aba de VerificaÃƒÂ§ÃƒÂ£o de Fotos (ADM/CEO):**
  * *O que foi feito:*
    * **Backend (`api/index.ts`):** Criada a rota `GET /api/ponto/fotos-verificacao`, restrita a roles `CEO` e `ADMIN`. Recebe `?userId=X&data=YYYY-MM-DD`, monta intervalo do dia inteiro no fuso de BrasÃƒÂ­lia (`T00:00:00-03:00` a `T23:59:59-03:00`), busca `time_records` filtrando por `company_id`, `user_id` e intervalo de data, retorna `id, type, timestamp, selfie_url, latitude, longitude, status`.
    * **Frontend (`Ponto.tsx`):**
      * Tipo do `activeTab` atualizado para incluir `'fotos'`.
      * Adicionados estados: `fotoUserId`, `fotoData`, `fotoRecords`, `fotoLoading`, `fotoModalUrl`.
      * Adicionada funÃƒÂ§ÃƒÂ£o `fetchFotosVerificacao`.
      * Aba **"Verificar Fotos"** adicionada ao array de tabs, visÃƒÂ­vel apenas para `isManager`.
      * Painel da aba: filtros (dropdown de colaboradores + input de data + botÃƒÂ£o Buscar), linha do tempo vertical de registros com ÃƒÂ­cone de tipo, horÃƒÂ¡rio, badge de status, ÃƒÂ­cone de mapa (verde clicÃƒÂ¡vel para Google Maps, ou cinza sem localizaÃƒÂ§ÃƒÂ£o) e thumbnail 112Ãƒâ€”112px da selfie clicÃƒÂ¡vel.
      * Modal lightbox para visualizaÃƒÂ§ÃƒÂ£o da foto em tamanho ampliado com botÃƒÂ£o de fechar (`Ãƒâ€”`) e click fora para dispensar.
    * **Abas existentes preservadas:** `ponto`, `historico`, `gestor`, `ajustes` Ã¢â‚¬â€ nenhuma linha alterada.
    * **RelatÃƒÂ³rio PDF existente:** nÃƒÂ£o tocado.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 18/06/2026 ÃƒÂ s 18:21 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/Ponto.tsx`


* **PaginaÃƒÂ§ÃƒÂ£o Client-Side e Scroll na Aba HistÃƒÂ³rico de Propostas:**
  * *O que foi feito:*
    * **AlteraÃƒÂ§ÃƒÂ£o 1 (data_expiracao):** Verificado que o backend (`api/index.ts`, linhas 2729Ã¢â‚¬â€œ2730) jÃƒÂ¡ calcula `data_expiracao` com `+30 dias` e usa `.insert()` (nÃƒÂ£o `.upsert()`). Nenhuma alteraÃƒÂ§ÃƒÂ£o necessÃƒÂ¡ria no frontend, pois o campo nÃƒÂ£o compÃƒÂµe o payload enviado pela funÃƒÂ§ÃƒÂ£o `saveToHistory` Ã¢â‚¬â€ ÃƒÂ© calculado exclusivamente no servidor.
    * **AlteraÃƒÂ§ÃƒÂ£o 2 (estados de paginaÃƒÂ§ÃƒÂ£o):** Adicionados dois novos estados client-side ao componente `ProposalGenerator`: `const [currentPage, setCurrentPage] = useState(1)` e `const ITEMS_PER_PAGE = 10`. Os estados de paginaÃƒÂ§ÃƒÂ£o backend prÃƒÂ©-existentes (`historyPage`, `historyTotalPages`, `historyTotal`) foram mantidos intactos.
    * **AlteraÃƒÂ§ÃƒÂ£o 3 (scroll e paginaÃƒÂ§ÃƒÂ£o client-side):** O bloco da tabela da aba HistÃƒÂ³rico de Propostas foi substituÃƒÂ­do por uma IIFE (`(() => { ... })()`) que calcula `totalPages`, `startIndex` e `currentItems = history.slice(...)`. A tabela agora possui o `<thead>` com `sticky top-0 z-10` para cabeÃƒÂ§alho fixo durante o scroll, container com `overflow-y-auto max-h-[500px]` e controles de paginaÃƒÂ§ÃƒÂ£o (Ã¢â€ Â Anterior / PrÃƒÂ³xima Ã¢â€ â€™) exibidos somente quando `totalPages > 1`. Todos os `<th>` e `<td>` originais foram preservados.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 19/06/2026 ÃƒÂ s 14:24 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`

* **Parte 4 Ã¢â‚¬â€ CorreÃƒÂ§ÃƒÂ£o de Encoding de Emojis e VerificaÃƒÂ§ÃƒÂ£o de Upload em Obra.tsx:**
  * *O que foi feito:*
    * **AlteraÃƒÂ§ÃƒÂ£o 1 (encoding):** Corrigidos 3 emojis corrompidos nos tÃƒÂ­tulos de seÃƒÂ§ÃƒÂ£o do JSX em `Obra.tsx`:
      * `ÃƒÂ¢Ã…Â¡Ã‚Â¡ MediÃƒÂ§ÃƒÂµes ElÃƒÂ©tricas Adicionais` Ã¢â€ â€™ `Ã¢Å¡Â¡ MediÃƒÂ§ÃƒÂµes ElÃƒÂ©tricas Adicionais` (linha 551)
      * `ÃƒÂ°Ã…Â¸"Ã…â€™ MediÃƒÂ§ÃƒÂµes CC (MPPTs)` Ã¢â€ â€™ `Ã°Å¸â€Å’ MediÃƒÂ§ÃƒÂµes CC (MPPTs)` (linha 574)
      * `ÃƒÂ°Ã…Â¸"Ã‚Â¦ Opcionais Adicionais` Ã¢â€ â€™ `Ã°Å¸â€œÂ¦ Opcionais Adicionais` (linha 610)
    * **AlteraÃƒÂ§ÃƒÂ£o 2 (field do upload):** Verificado que a funÃƒÂ§ÃƒÂ£o `uploadNewPhoto` jÃƒÂ¡ usa `fd.append('file', file)` corretamente (linha 66). Nenhuma alteraÃƒÂ§ÃƒÂ£o necessÃƒÂ¡ria.
    * **AlteraÃƒÂ§ÃƒÂ£o 3 (persistÃƒÂªncia no banco):** Verificado que a arquitetura do componente ÃƒÂ©: as URLs retornadas por `uploadNewPhoto` sÃƒÂ£o acumuladas em `extraUrls` e `uploadedMppts`, e enviadas no submit final via `api.put('/api/projects/:id/installation', payload)`. Essa ÃƒÂ© a arquitetura correta Ã¢â‚¬â€ persistÃƒÂªncia ocorre no submit, nÃƒÂ£o individualmente por upload. Nenhuma alteraÃƒÂ§ÃƒÂ£o necessÃƒÂ¡ria.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 19/06/2026 ÃƒÂ s 14:44 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `src/pages/Obra.tsx`

* **Parte 5 â€” Melhorias no MÃ³dulo de Vistoria TÃ©cnica e RetenÃ§Ã£o R2:**
  * *O que foi feito:*
    * **Backend:** Adicionado suporte a metadata `{ retention: '2-months' }` no `uploadToR2`. Criado o cronjob `GET /api/cron/cleanup-vistoria-midia` agendado no `vercel.json` (`0 3 * * *`) para deletar do bucket "vistoria/" fotos/vÃ­deos criados hÃ¡ mais de 60 dias (validado pelo `LastModified`).
    * **Frontend:** Na tela `Technical.tsx`, modificado o input para aceitar explicitamente apenas `image/*,video/*` e adicionado botÃ£o de download em cada thumbnail da vistoria salva no banco de dados. O download converte a imagem em um `Blob` e aciona um clique simulado local, evitando comportamentos de "open in new tab" na WebView.
  * *Data e hora da alteraÃ§Ã£o:* 25/06/2026 Ã s 13:10 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `api/r2.ts`, `vercel.json`, `src/pages/Technical.tsx`.

* **Parte 6 â€” MÃ³dulo de Kits Solares e Ajustes em Propostas:**
  * *O que foi feito:*
    * **Banco de Dados:** Criada tabela `solar_kits` com suporte a multi-tenancy e RLS restrito a lideranÃ§a (ADM/CEO) para operaÃ§Ãµes de escrita, mas permitindo leitura de kits ativos aos Vendedores.
    * **Backend (`api/index.ts`):** Criadas rotas CRUD (`GET`, `POST`, `PUT`, `DELETE`) em `/api/solar-kits` com middleware `requireAdminOrCEO`.
    * **Frontend (`ProposalGenerator.tsx`):**
      * Criada nova aba "Kits Solares" no gerador de propostas, acessÃ­vel apenas por usuÃ¡rios com role ADM ou CEO.
      * Desenvolvida tela de gerenciamento de kits com tabela responsiva e modal para adiÃ§Ã£o/ediÃ§Ã£o de kits (incluindo checkbox para inversor de ampliaÃ§Ã£o).
      * Removidos os campos manuais de "Custo do Kit", "Margem de Venda (%)" e "Desconto" da visÃ£o do Vendedor na aba "Kit Solar".
      * Introduzido um Dropdown (seletor) de "Kit Cadastrado" que Ã© **obrigatÃ³rio** para vendedores (bloqueia geraÃ§Ã£o de PDF se vazio) e exibe o nome simplificado "Kit X kWh" sem exibir os custos.
      * A seleÃ§Ã£o preenche automaticamente mÃ³dulos, inversores, potÃªncias e marcas, alÃ©m de travar os campos detalhados de equipamento como leitura apenas (read-only) para Vendedores.
      * O preÃ§o Ã© calculado em background (Custo + Margem) e exibido como "Valor Final de Venda". Apenas ADM/CEO possuem a capacidade de alterar o valor e especificaÃ§Ãµes livremente na tela de propostas caso necessÃ¡rio.
  * *Data e hora da alteraÃ§Ã£o:* 25/06/2026 Ã s 13:38 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/ProposalGenerator.tsx`.

* **Parte 7 â€” CorreÃ§Ãµes no HistÃ³rico de Propostas:**
  * *O que foi feito:*
    * **Backend (`api/index.ts`):** O cronjob `GET /api/cleanup-proposals` foi corrigido. Antes, ele deletava os registros da tabela `proposal_history` ao expirar. Agora, ele apenas deleta os arquivos fÃ­sicos no Storage (bucket `propostas`) e anula o campo `url_arquivo = null` no banco, mantendo o registro do histÃ³rico permanentemente. A busca foi atualizada para filtrar apenas registros com `url_arquivo IS NOT NULL` e `data_expiracao < now()`.
    * **Frontend (`ProposalGenerator.tsx`):**
      * **PaginaÃ§Ã£o corrigida:** Removidos os estados `currentPage` e `ITEMS_PER_PAGE` que causavam paginaÃ§Ã£o duplicada (frontend + backend). A aba "HistÃ³rico" agora usa exclusivamente a paginaÃ§Ã£o do backend via `historyPage` e `historyTotalPages`. Os botÃµes "â† Anterior" e "PrÃ³xima â†’" chamam `fetchHistory(historyPage - 1)` e `fetchHistory(historyPage + 1)`. O indicador exibe "PÃ¡gina X de Y â€” Z proposta(s) no total".
      * **Colunas ocultas para Vendedor:** As colunas "Margem" e "Custo do Kit" na tabela do histÃ³rico sÃ£o renderizadas condicionalmente com `{isAdminOrCeo && ...}`. Para o role `VENDEDOR`, essas colunas (`<th>` e `<td>`) sÃ£o completamente omitidas do DOM.
  * *Data e hora da alteraÃ§Ã£o:* 25/06/2026 Ã s 13:44 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/ProposalGenerator.tsx`, `RESUMO_MESTRE.md`.

---

> [!WARNING]
> A chave `SUPABASE_SERVICE_ROLE_KEY` concede controle total sobre todas as linhas de todas as tabelas do banco de dados e arquivos do Storage. NÃƒÂ£o insira ou exponha esta chave em qualquer script que seja compilado dentro do bundle do frontend (pasta `/src`).

> [!IMPORTANT]

---

## 15. MIGRATIONS PENDENTES DE EXECUÃ‡ÃƒO MANUAL NO SUPABASE

Esta seÃ§Ã£o rastreia os arquivos de migration que foram criados no repositÃ³rio mas ainda precisam ser executados manualmente no **SQL Editor do Supabase** para ter efeito no banco de dados de produÃ§Ã£o.

### â³ Pendentes

| Arquivo | DescriÃ§Ã£o | Criado em |
|---|---|---|
| supabase/migrations/20260625_create_solar_kits.sql | Cria a tabela solar_kits com RLS, Ã­ndices e trigger de updated_at. Sem isso, GET /api/solar-kits retorna erro 500. | 25/06/2026 |

> [!CAUTION]
> Enquanto esses arquivos nÃ£o forem executados no Supabase, as funcionalidades correspondentes estarÃ£o **completamente indisponÃ­veis** em produÃ§Ã£o, independentemente de qualquer deploy no Vercel.

### âœ… JÃ¡ Aplicadas

| Arquivo | DescriÃ§Ã£o | Aplicado em |
|---|---|---|
| supabase/migrations/20260625_create_whatsapp_observations.sql | Cria a tabela whatsapp_observations com RLS e Ã­ndices para o mÃ³dulo de notas do Atendimento. | 25/06/2026 |

