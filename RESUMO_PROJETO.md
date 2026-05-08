# RESUMO MESTRE DETALHADO — GESTÃO MT SOLAR

## 1. Visão Geral do Projeto
**Nome:** Gestão MT Solar (Dashboard & App)  
**Propósito:** Sistema completo para gerenciamento de empresas de energia solar, cobrindo desde a prospecção comercial e geração de propostas até a instalação técnica e homologação junto à concessionária.  
**Stack Tecnológica:**
- **Frontend:** React + TypeScript + Vite (Dashboard Web).
- **Mobile:** Capacitor (Hibridização para Android/iOS).
- **Backend:** Vercel Serverless Functions (Express.js).
- **Banco de Dados:** Supabase (PostgreSQL).
- **Estilização:** TailwindCSS / Vanilla CSS.
- **Notificações:** Capacitor Local Notifications.
- **Integrações:** Evolution API (WhatsApp), Axios (API).

---

## 2. Estrutura de Pastas e Arquivos
- **/api**: Contém o `index.ts` (backend principal em Express rodando como serverless na Vercel).
- **/src**: Código fonte do frontend.
    - **/components**: Componentes reutilizáveis (Layout, Sidebar, ProtectedRoutes, etc.).
    - **/lib**: Configurações de bibliotecas (api.ts, supabase.ts, notifications.ts).
    - **/pages**: Telas da aplicação (Dashboard, Comercial, Obra, Homologação, etc.).
- **/public**: Ativos estáticos.
- **/supabase**: Migrations e configurações de banco de dados.

---

## 3. Arquivos Principais
- **api/index.ts**: O "coração" do backend. Gerencia autenticação, CRUD de projetos, uploads para Supabase Storage e integrações.
- **App.tsx**: Definição de rotas (react-router-dom) e níveis de acesso.
- **Commercial.tsx**: Gestão de propostas, cadastro de clientes e acompanhamento de projetos em estágio inicial.
- **ProposalGenerator.tsx**: Motor de geração de propostas em PDF com simulador de financiamento.
- **Obra.tsx (antigo Installation.tsx)**: Checklist de fotos e pendências para a execução técnica em campo.
- **Technical.tsx**: Ficha de vistoria técnica preliminar.
- **Homologation.tsx**: Fluxo burocrático junto à concessionária de energia.
- **WhatsApp.tsx**: Interface de chat multi-atendente integrada via Evolution API.

---

## 4. Fluxo da Aplicação
1. **Entrada**: Cadastro do cliente ou importação via WhatsApp.
2. **Comercial**: Geração de proposta técnica/comercial -> Aprovação do cliente.
3. **Vistoria**: Equipe técnica realiza vistoria via App (`Technical.tsx`).
4. **Projeto**: Compra do kit solar e elaboração do projeto.
5. **Obra**: Execução da instalação com registro fotográfico obrigatório (`Obra.tsx`).
6. **Homologação**: Envio de protocolos e aprovação pela concessionária.
7. **Finalização**: Conclusão do projeto e ativação do sistema.

---

## 5. Dependências Relevantes
- `@supabase/supabase-js`: Persistência de dados e Storage.
- `lucide-react`: Ícones da interface.
- `html2canvas` / `jspdf`: Geração de documentos no cliente.
- `multer` / `cors`: Middleware de backend.
- `bcryptjs` / `jsonwebtoken`: Segurança e Auth.

---

## 6. Banco de Dados / Modelos de Dados
- **users**: Usuários do sistema (CEO, Admin, Comercial, Técnico).
- **clients**: Dados cadastrais dos clientes.
- **projects**: Tabela central que vincula cliente, estágio atual (`current_stage`) e status de cada fase.
- **commercial_data / technical_data**: Detalhes específicos de cada etapa vinculados ao ID do projeto.
- **whatsapp_conversations**: Log de chats e estados de atendimento.

---

## 7. APIs e Integrações
- **Evolution API**: Webhooks e envio de mensagens WhatsApp.
- **Supabase Storage**: Armazenamento de fotos de vistorias e obras.
- **Notificações Locais**: Capacitor para avisos em tempo real no mobile.

---

## 8. Pontos de Atenção / Melhorias
- **Refatoração do Backend**: O arquivo `api/index.ts` ultrapassou 1000 linhas e deve ser dividido em rotas modulares.
- **Logs de Auditoria**: Implementar rastreamento mais detalhado de quem alterou cada campo em estágios críticos (Homologação/Financeiro).
- **Cache**: Implementar React Query para melhorar a performance de listagens longas em dispositivos móveis.
