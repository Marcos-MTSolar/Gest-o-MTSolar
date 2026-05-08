# RESUMO MESTRE — Gestão MT Solar
*Atualizado em: 08/05/2026*

## 1. Objetivo Principal do Projeto
Sistema ERP/CRM completo para empresas de energia solar, cobrindo todo o 
ciclo operacional: captação do cliente → proposta comercial → vistoria 
técnica → homologação junto à concessionária → instalação/obra → finalização.
Inclui módulo de atendimento via WhatsApp, agenda, contratos, estoque e 
gerador de propostas com PDF.

## 2. Decisões Técnicas Tomadas
- Cadastro do cliente unificado com dados de gerenciamento comercial 
  (Valor da Proposta, Forma de Pagamento, Fornecedor do Kit, Pendências, Observações).
- Removida aba/modal duplicada de "Gerenciar" — substituída por "Ver Detalhes" em modo leitura.
- Documentos do cliente movidos do cadastro para a página de Homologação.
- Dados comerciais excluídos do banco ao mover projeto para "Finalizados".
- Página "Obra Finalizada" renomeada para "Obra" em todo o sistema.
- Aba da Área Comercial nomeada como "Projetos Pendentes" (nome definitivo).
- Nova aba "Instalação" na Área Comercial com status: Aguardando Instalação / Executando / Finalizada.
- Status da aba Instalação sincronizado com as páginas Technical.tsx e Obra.tsx.
- Status exibidos ao usuário sempre em português (nunca valores brutos do banco).
- Build local obrigatório antes de qualquer commit.

## 3. Regras e Padrões Definidos
- Status do banco NUNCA exibidos crus — sempre mapear para label em português.
- Mapeamento de status obrigatório:
  - registration → "Cadastro"
  - pending → "Pendente"  
  - approved → "Aprovado"
  - in_progress → "Em Andamento"
  - completed → "Concluído"
  - (demais status seguem o mesmo padrão)
- Build local (`npm run build`) deve passar antes de qualquer commit.
- Dados comerciais do projeto são excluídos do banco ao finalizar o projeto.
- A aba "Instalação" reflete status atualizado pelas páginas Técnica e Obra em tempo real.
- Eventos "Atendido" na Agenda: texto com line-through em cor #9CA3AF (cinza neutro).
- `api/index.ts` deve ser mantido sem erros de sintaxe — sempre validar com `tsc --noEmit`.

## 4. Estrutura de Arquivos Criada ou Alterada
- `src/pages/Commercial.tsx` — cadastro unificado, remoção de duplicidade, 
   aba Instalação, renomeações, correção de "Ver Detalhes"
- `src/pages/Technical.tsx` — status de vistoria sincronizado com aba Instalação
- `src/pages/Obra.tsx` — correção do erro "Erro ao atualizar obra", 
   sincronização de status com aba Instalação
- `src/pages/ProposalGenerator.tsx` — valor da parcela de financiamento no PDF
- `src/pages/Homologation.tsx` — recebe documentos que antes ficavam no cadastro
- `src/pages/Agenda.tsx` — line-through com cor #9CA3AF para eventos atendidos
- `src/App.tsx` — rotas atualizadas (Obra Finalizada → Obra)
- `api/index.ts` — correções de sintaxe TypeScript e robustecimento de rotas
- `RESUMO_MESTRE_ATUALIZACOES.md` — este arquivo

## 5. Pendências
- Validar se exclusão de dados ao mover para "Finalizados" funciona corretamente no banco.
- Confirmar que upload de fotos no Supabase Storage conclui antes do salvamento da obra.
- Testar geração de PDF da proposta com valor da parcela incluído.
- Avaliar modularização do `api/index.ts` (atualmente +1000 linhas).
- Avaliar lazy loading para reduzir chunk de 1.491 kB no build.

## 6. Problemas Resolvidos
- Erro de build "Unterminated regular expression" em Commercial.tsx (linha 664).
- Erros de build JSX inválido em Commercial.tsx (linhas 663/688).
- Erros TypeScript em api/index.ts (linhas 250-255): client, project, res não encontrados.
- Modal/aba duplicada de "Gerenciar" removida.
- Dados comerciais não apareciam em "Ver Detalhes" — corrigido mapeamento e query.
- Status exibido como valor bruto `registration` — corrigido com mapeamento de labels.
- Campo "Vistoria Técnica" em "Ver Detalhes" não atualizava — corrigido sincronismo.
- Erro "Erro ao atualizar obra" ao salvar em Obra.tsx — corrigido com try/catch e logs.
- Status "Aguardando Instalação" não atualizava na aba Instalação — corrigido.

## 7. Restrições Importantes
- O sistema depende 100% da Evolution API para WhatsApp — monitorar logs de erro.
- `api/index.ts` com +1000 linhas é um ponto de risco — qualquer edição exige validação TypeScript.
- Sempre executar `cap sync` após alterações no frontend para refletir no APK Android.
- Dados enviados ao Gemini passam por servidores externos — não expor dados sensíveis.
- Deploy na Vercel é automático via push no branch main — nunca commitar sem build local.

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
- **Deploy:** Vercel (CI/CD automático via GitHub)
