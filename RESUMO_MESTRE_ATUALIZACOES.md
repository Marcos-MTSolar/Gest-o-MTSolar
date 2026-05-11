# RESUMO MESTRE — Gestão MT Solar
*Atualizado em: 11/05/2026*

## 1. Objetivo Principal do Projeto
Sistema ERP/CRM completo para empresas de energia solar, cobrindo todo o 
ciclo operacional: captação do cliente → proposta comercial → vistoria 
técnica → homologação junto à concessionária → instalação/obra → finalização.
Inclui módulo de atendimento via WhatsApp, agenda, contratos, estoque,
gerador de propostas com PDF, histórico de propostas e controle de permissões por cargo.

## 2. Decisões Técnicas Tomadas
- Cadastro do cliente unificado com dados de gerenciamento comercial.
- Removida aba/modal duplicada de "Gerenciar" — substituída por "Ver Detalhes" (modo leitura).
- Documentos do cliente movidos do cadastro para a página de Homologação.
- Dados comerciais e fotos de obra excluídos do banco/storage ao mover projeto para "Finalizados".
- Página "Obra Finalizada" renomeada para "Obra" em todo o sistema.
- Aba da Área Comercial nomeada como "Projetos Pendentes" (nome definitivo).
- Nova aba "Instalação" na Área Comercial com 3 status: Aguardando / Executando / Finalizada.
- Status da aba Instalação sincronizado com Technical.tsx e Obra.tsx.
- Status sempre exibidos em português (nunca valores brutos do banco).
- Fotos de obra salvas no Supabase Storage (bucket: obras-fotos), excluídas ao finalizar projeto.
- Proposta comercial salva no Supabase Storage (bucket: propostas) com validade de 7 dias.
- Limpeza automática de propostas expiradas via Vercel Cron Job (diário às 03h).
- Role TÉCNICO: acesso restrito a Dashboard, Agenda, Técnica, Obra e Mensagens.
- Build local obrigatório antes de qualquer commit.
- **Lazy Loading:** Implementado para todas as rotas do frontend para otimizar o tempo de carregamento inicial.

## 3. Regras e Padrões Definidos
- Status do banco NUNCA exibidos crus — sempre mapear para label em português:
  - registration → "Cadastro" | pending → "Pendente" | approved → "Aprovado"
  - in_progress → "Em Andamento" | completed → "Concluído"
- Fotos de obra: salvas no Supabase Storage, excluídas ao finalizar projeto.
- Proposta comercial: disponível para download por 7 dias, excluída do storage após expiração.
- Role TÉCNICO acessa apenas: Dashboard, Agenda, Técnica, Obra, Mensagens.
- Eventos "Atendido" na Agenda: line-through com cor #9CA3AF.
- `api/index.ts` sempre validado com `npx tsc --noEmit` antes de commit.
- `npm run build` deve passar localmente antes de qualquer commit/push.

## 4. Estrutura de Arquivos Criada ou Alterada
- `src/pages/Commercial.tsx` — cadastro unificado, "Ver Detalhes", aba Instalação, renomeações
- `src/pages/Technical.tsx` — status de vistoria sincronizado com aba Instalação
- `src/pages/Obra.tsx` — upload seguro (Storage primeiro), logs de erro detalhados
- `src/pages/ProposalGenerator.tsx` — histórico de propostas com download e expiração de 7 dias
- `src/pages/Homologation.tsx` — recebe documentos do cadastro do cliente
- `src/pages/Agenda.tsx` — line-through cor #9CA3AF para eventos atendidos
- `src/pages/FinishedProjects.tsx` — modal de finalização com download ZIP via JSZip
- `src/App.tsx` — implementação de React.lazy + Suspense (redução de bundle)
- `src/components/Layout.tsx` — menu filtrado por role (Técnico vê apenas 5 páginas)
- `api/index.ts` — limpeza de dados comerciais e clientes ao finalizar projeto
- `vercel.json` — Cron Job diário para limpeza de propostas expiradas
- `RESUMO_MESTRE_ATUALIZACOES.md` — este arquivo

## 5. Pendências
- Testar Cron Job de expiração de propostas em ambiente de produção (Vercel).
- Avaliar modularização do `api/index.ts` (atualmente +1000 linhas).
- Implementar melhorias no módulo de usuários (roles e permissões).

## 6. Problemas Resolvidos
- Erro build "Unterminated regular expression" — Commercial.tsx linha 664.
- Erros build JSX inválido — Commercial.tsx linhas 663/688.
- Erros TypeScript — api/index.ts linhas 250-255.
- Erro "Erro ao atualizar obra" ao salvar em Obra.tsx — corrigido com upload síncrono e logging.
- Problema do Técnico acessando WhatsApp e Configurações — corrigido com restrição de roles.
- Propostas perdidas após geração — agora salvas no histórico por 7 dias.
- **Bundle Grande (1.49 MB):** Resolvido com code-splitting (Lazy Loading), reduzindo para **623 KB**.

## 7. Restrições Importantes
- Sistema depende 100% da Evolution API para WhatsApp — monitorar logs.
- `api/index.ts` com +1000 linhas — qualquer edição exige validação TypeScript.
- Sempre executar `cap sync` após alterações no frontend para refletir no APK Android.
- Dados enviados ao Gemini passam por servidores externos — não expor dados sensíveis.
- Deploy na Vercel é automático via push no branch main — nunca commitar sem build local.
- Vercel Cron Jobs requerem configuração correta no `vercel.json`.

## 8. Tecnologias Utilizadas
- **Frontend:** React 19, Vite, TypeScript, Tailwind CSS 4
- **Backend:** Node.js, Express (Serverless via Vercel)
- **Banco de Dados:** Supabase (PostgreSQL) + Supabase Storage
- **Mobile:** Capacitor (Android / iOS)
- **Comunicação:** Evolution API (WhatsApp via Webhooks)
- **IA:** Google Generative AI — @google/genai (Gemini)
- **PDF:** jsPDF + jspdf-autotable
- **Autenticação:** JWT + bcryptjs
- **Ícones:** lucide-react
- **Animações:** Framer Motion
- **HTTP:** Axios
- **Compressão:** JSZip (Download de fotos da obra)
- **Deploy:** Vercel (CI/CD automático via GitHub + Cron Jobs)

## 🚀 Últimas Atualizações (11/05/2026)

### Finalização de Projetos com Download de Fotos
- **[NOVO]** Adicionado estágio `conclusion` (Conclusão) na listagem de `FinishedProjects.tsx`.
- **[MODAL]** Novo componente de confirmação de finalização que detecta fotos de obra pendentes.
- **[DOWNLOAD]** Integração com `JSZip` para baixar fotos do bucket `obras-fotos` em um arquivo ZIP consolidado antes da exclusão.
- **[SEGURANÇA]** Mantida a lógica de exclusão automática no backend após a confirmação do usuário (LGPD compliance).

### 🛠️ Melhorias de Infraestrutura
- **Push Notifications (Mobile)**: 
    - Implementação do sistema híbrido (Push + Local).
    - Registro automático de tokens FCM no Supabase ao logar no App.
    - Webhook para notificações de novas mensagens de WhatsApp.
    - Trigger para avisar técnicos de novos projetos disponíveis.
    - Agendamento local para lembretes de agenda (1h antes).
- **Produção Mobile (APK)**:
    - Preparação completa para APK v1.1 com minificação (Proguard) ativa.
    - Configurado `capacitor.config.ts` para apontar diretamente para a produção na Vercel.
    - Permissões de câmera e armazenamento adicionadas ao Manifesto.
- **Performance (Bundle Otimizado)**:
- **[BACKEND]** Reforçada a exclusão de dados sensíveis: agora remove também registros de `commercial_data` ao finalizar projeto. Adicionados logs detalhados prefixados com `[DELETE ERROR]` para rastreabilidade.
- **[UPLOAD]** Implementada validação sequencial em `Obra.tsx`: o salvamento no banco de dados agora é estritamente bloqueado se qualquer upload para o Storage falhar, com alertas claros para o usuário.
- **[PERFORMANCE]** Implementado **Lazy Loading** (React.lazy + Suspense) em todas as rotas do `App.tsx`.
- **[RESULTADO]** Tamanho do chunk principal reduzido de **1.49 MB** para **623 KB** (redução de ~58%), melhorando drasticamente o tempo de carregamento inicial.

### 📦 Geração de APK de Produção (v1.2) - ASSINADO
- **Status**: Concluído e assinado em 11/05/2026.
- **Mudanças**:
  - `versionCode 3`, `versionName "1.2"`.
  - `minifyEnabled true` (Otimização Proguard).
  - `server.url`: https://gest-o-mt-solar.vercel.app
  - Assinatura: Realizada com `mtsolar.jks` (alias: `mtsolar`).
- **Arquivo Assinado**: `android/app/build/outputs/apk/release/app-release.apk`


