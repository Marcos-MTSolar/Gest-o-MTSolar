# RESUMO MESTRE — Gestão MT Solar
*Atualizado em: 09/05/2026*

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
- `src/pages/Obra.tsx` — correção erro salvamento, fotos no Supabase Storage
- `src/pages/ProposalGenerator.tsx` — histórico de propostas com download e expiração de 7 dias
- `src/pages/Homologation.tsx` — recebe documentos do cadastro do cliente
- `src/pages/Agenda.tsx` — line-through cor #9CA3AF para eventos atendidos
- `src/pages/FinishedProjects.tsx` — exclui fotos de obra e dados comerciais ao finalizar
- `src/App.tsx` — rotas atualizadas + restrições de acesso por role (Técnico restrito)
- `src/components/Layout.tsx` — menu filtrado por role (Técnico vê apenas 5 páginas)
- `api/index.ts` — rotas de upload de proposta e limpeza de arquivos expirados
- `vercel.json` — Cron Job diário para limpeza de propostas expiradas
- `RESUMO_MESTRE_ATUALIZACOES.md` — este arquivo

## 5. Pendências
- Validar exclusão de dados/fotos ao mover para "Finalizados" no banco e storage.
- Testar Cron Job de expiração de propostas em ambiente de produção (Vercel).
- Confirmar que upload de fotos no Storage conclui antes do salvamento dos dados da obra.
- Avaliar modularização do `api/index.ts` (atualmente +1000 linhas).
- Avaliar lazy loading para reduzir chunk de 1.491 kB no build.

## 6. Problemas Resolvidos
- Erro build "Unterminated regular expression" — Commercial.tsx linha 664.
- Erros build JSX inválido — Commercial.tsx linhas 663/688.
- Erros TypeScript — api/index.ts linhas 250-255.
- Erro "Erro ao atualizar obra" ao salvar em Obra.tsx — corrigido com logging e mapeamento.
- Problema do Técnico acessando WhatsApp e Configurações — corrigido com restrição de roles.
- Propostas perdidas após geração — agora salvas no histórico por 7 dias.

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
- **Deploy:** Vercel (CI/CD automático via GitHub + Cron Jobs)
