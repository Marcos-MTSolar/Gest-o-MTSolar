# RESUMO MESTRE DE ATUALIZAÇÕES: ERP Gestão MT Solar

## 1. Objetivo Principal do Projeto
O **Gestão MT Solar** é um sistema ERP/CRM completo, desenvolvido para empresas integradoras de energia solar operando sob uma arquitetura SaaS Multi-Tenant. O sistema gerencia o ciclo de vida de vendas e operações (captação, proposta, vistoria, homologação, instalação/obra e finalização). Ele engloba funcionalidades como atendimento omnichannel via WhatsApp, agendamentos, estoque, geração de propostas PDF e calculadora avançada de consumo.

## 2. Decisões Técnicas Já Tomadas
*   **Arquitetura Multi-Tenant**: Isolamento total de dados entre diferentes empresas/filiais ("instâncias") utilizando a coluna `company_id` de forma compulsória no backend (via extração do Token JWT ou do banco).
*   **Gestão de Estado do WhatsApp**: A persistência de mensagens e conversas substituiu comandos `upsert` ineficientes por fluxos transacionais explícitos (`SELECT`/`INSERT`/`UPDATE`) no webhook, visando estabilidade e prevenção de dados corrompidos entre instâncias (ex: `mtsolar` vs. `atendimento-cliente`).
*   **Segurança (RLS) Desativada Temporariamente**: O Row Level Security (RLS) do Supabase está desativado em todas as tabelas. A segurança e isolamento de dados são estritamente garantidos por filtros `.eq('company_id', ...)` na API Backend.
*   **Otimização de Performance (Lazy Loading)**: Implementado code-splitting via React.lazy e Suspense para todas as rotas de frontend, o que reduziu drasticamente o tamanho do bundle principal (~1.49MB para ~623KB).
*   **Persistência e Limpeza de Arquivos**: Fotos de obras são deletadas automaticamente ao finalizar um projeto. Propostas PDF (bucket `propostas`) expiram em 7 dias, controladas via Cron Job diário da Vercel.

## 3. Regras e Padrões Definidos
*   **Acesso por Perfis (Roles)**:
    *   `TÉCNICO`: Acesso restrito a Dashboard, Agenda, Técnica, Obra e Mensagens.
    *   `COMMERCIAL` (Vendedor): Bloqueado em rotas operacionais, com acesso exclusivo liberado para o módulo de Atendimento/WhatsApp (e ocultação visual de transferências de instâncias "Administrativas").
*   **Regras de Exibição de Status**: O sistema nunca exibe dados puros do banco (ex: `in_progress`). Tudo deve ser formatado para labels em português (ex: "Em Andamento", "Pendente").
*   **Build Obrigatório**: Nenhuma alteração é submetida ao repositório ou produção sem a aprovação do `npx tsc --noEmit` e sucesso completo do `npm run build` local.
*   **Validação Sequencial em Obras**: O registro de uma obra no banco é estritamente bloqueado caso haja qualquer falha de upload das imagens no Supabase Storage (Upload Síncrono).

## 4. Estrutura de Arquivos Já Criada (Principais)
*   `src/pages/Commercial.tsx` & `Technical.tsx`: Gestão do ciclo operacional unificado.
*   `src/pages/Obra.tsx`: Interface para gerenciamento de instalação com upload estruturado para o Storage.
*   `src/pages/WhatsApp/Atendimento.tsx`: Dashboard de mensagens integrado via webhooks da Evolution API.
*   `src/pages/EnergyCalculator.tsx`: Módulo com suporte a Watts, BTU e CV para estimativa de painéis solares necessários.
*   `src/components/Layout.tsx`: Implementa navegação lateral otimizada para mobile e restrição de renderização de abas baseadas nas permissões de usuário (role).
*   `api/index.ts`: Backend monolítico em Express serverless (Hospedado na Vercel) responsável pelos webhooks, exclusões lógicas e consultas autenticadas.
*   `android/` & `capacitor.config.ts`: Infraestrutura para build mobile contendo permissões nativas e link do app gerado.

## 5. Pendências
*   [ ] **RLS do Supabase**: Planejar a reativação gradual das políticas `Row Level Security` (`company_id = auth.uid_company_id()`) após a estabilização completa da lógica no backend Express.
*   [ ] **Refatoração da API Backend**: Avaliar modularização do `api/index.ts` (que já ultrapassou +1600 linhas), separando controllers de WhatsApp, Obras e Autenticação.
*   [ ] **Monitoramento Mobile**: Validar os logs do aplicativo via ADB no novo APK gerado (v1.2.5) para monitorar comportamento do ErrorBoundary na raiz do React durante fluxos críticos (ex: Crash de Login resolvido anteriormente).

## 6. Problemas Já Resolvidos
*   **Conflitos e Bugs Multi-Instance no WhatsApp**: Eliminados. Conversas cruzadas entre "Todas" foram removidas. Adicionada chave única composta (`instance_name` + `remote_jid`) para garantir o isolamento correto de conversas de WhatsApp por tenant.
*   **Vazamento de Dados em Telas ("Páginas Vazias")**: Corrigido com a propagação compulsória do `company_id` do backend para o contexto React.
*   **Tamanho de Bundle Elevado**: Code-splitting resolveu a lentidão inicial de carregamento da aplicação.
*   **Falha Silenciosa de Uploads**: Corrigido em `Obra.tsx` adicionando logs detalhados prefixados com `[DELETE ERROR]` / `[UPLOAD ERROR]`.

## 7. Restrições Importantes
*   **Dependência Crítica Externa**: Todo o módulo de Atendimento funciona via **Evolution API**. Falhas nesta API derrubam as mensagens. O endpoint Webhook `/api/whatsapp/webhook` não pode falhar ou sofrer timeouts longos sob risco de mensagens perdidas.
*   **APK de Produção**: Após mudanças visuais ou estruturais severas, a geração do aplicativo requer obrigatoriamente a execução de `npx cap sync` antes do build do Android.
*   **Compliance e LGPD**: Quando um projeto é "Finalizado", fotos (bucket `obras-fotos`) e dados sensíveis de viabilidade comercial devem, obrigatoriamente, ser apagados permanentemente pelo backend, não apenas ocultados.

## 8. Tecnologias Utilizadas
*   **Frontend**: React 19, Vite, TypeScript, Tailwind CSS 4.
*   **Mobile Nativo**: Capacitor (Android assinada com `.jks` customizado, Proguard habilitado).
*   **Backend & Cloud Funcs**: Node.js, Express (Serverless Functions via Vercel).
*   **Banco de Dados & Storage**: Supabase (PostgreSQL).
*   **Mensageria WhatsApp**: Evolution API v2 (Integração de Instâncias Multi-Tenant).
*   **Inteligência Artificial**: Google Generative AI (Gemini) para processamentos textuais específicos.
*   **Processamento/PDFs**: JSZip (pacotes de imagem de obra), jsPDF + jspdf-autotable (Propostas Comerciais).
