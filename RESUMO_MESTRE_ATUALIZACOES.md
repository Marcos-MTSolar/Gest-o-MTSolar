# RESUMO MESTRE — Gestão MT Solar (Atualizado)

## 1. Objetivo Principal do Projeto
O sistema visa otimizar a gestão de projetos de energia solar da MT Solar, integrando o fluxo comercial, vistoria técnica, instalação e homologação em uma única plataforma web e mobile (via Capacitor). O foco principal desta sessão foi consolidar o cadastro comercial e migrar a gestão documental para a etapa de homologação, garantindo maior fluidez no fechamento de vendas e conformidade com segurança de dados.

## 2. Decisões Técnicas Tomadas
- **Unificação de Cadastro**: Inclusão de campos comerciais (`proposal_value`, `payment_method`, `kit_supplier`, `pendencies`) na criação do cliente para evitar retrabalho no "Gerenciamento Comercial".
- **Desnormalização de Dados**: Adição da coluna `client_name` na tabela `projects` para persistir o nome do cliente mesmo após a exclusão de seus dados sensíveis na tabela `clients`.
- **Limpeza Automática (LGPD/Segurança)**: Implementação de lógica no backend para deletar o registro do cliente na finalização do projeto (status "Ponto de Conexão Aprovado").
- **Renomeação de Fluxo**: Substituição do termo "Instalação" por "Obra" para melhor alinhamento com o vocabulário operacional da empresa.
- **Visual Diferenciado**: Uso de `line-through` com cor neutra (`#9CA3AF`) para eventos atendidos na agenda.

## 3. Regras e Padrões Definidos
- **Status de Obra (Instalação)**: Padronizado em: *Aguardando Instalação*, *Executando* e *Finalizada*.
- **Gestão Documental**: Centralizada na página de **Homologação**. Documentos obrigatórios devem ser validados antes do início do processo técnico.
- **Comunicação Backend**: Padronizada via rotas REST no `api/index.ts` utilizando o SDK do Supabase para persistência.
- **Nomenclatura de Arquivos**: PascalCase para componentes React/Páginas (ex: `Obra.tsx`, `Homologation.tsx`).

## 4. Estrutura de Arquivos Criada ou Alterada
- **`src/pages/Commercial.tsx`**: [MODIFICADO] Adicionada aba "Instalação", unificado cadastro comercial e removido upload de documentos.
- **`src/pages/Homologation.tsx`**: [MODIFICADO] Implementada nova seção de gestão de documentos com upload para o Supabase Storage.
- **`src/pages/Obra.tsx`**: [RENOMEADO] (Antigo `Installation.tsx`) Refatorado para refletir a nova nomenclatura "Obra".
- **`api/index.ts`**: [MODIFICADO] Atualizadas rotas de cadastro, busca de projetos e finalização com exclusão de cliente.
- **`src/App.tsx` & `src/components/Layout.tsx`**: [MODIFICADO] Ajustadas rotas e menu lateral para refletir a página "Obra".
- **`src/pages/Agenda.tsx`**: [MODIFICADO] Aplicada estilização visual para eventos "Atendidos".
- **`src/pages/ProposalGenerator.tsx`**: [MODIFICADO] Adicionado cálculo de parcelas com valor de entrada no simulador de financiamento.
- **`RESUMO_PROJETO.md`**: [CRIADO] Documentação técnica geral do projeto.

## 5. Pendências
- [ ] Ativar e configurar **RLS (Row Level Security)** em 13 tabelas do Supabase que estão expostas.
- [ ] Modularizar o arquivo `api/index.ts` (atualmente com +1100 lines) em rotas menores.
- [ ] Validar o fluxo de notificações push no ambiente nativo (Android/iOS) após a renomeação para "Obra".

## 6. Problemas Resolvidos
- **Fluxo Comercial Interrompido**: Corrigido o redirecionamento após cadastro de cliente, movendo o usuário automaticamente para a aba "Projetos Pendentes".
- **Dados Fragmentados**: Unificação de dados de financiamento e valor de proposta no cadastro inicial.
- **Limpeza de Dados**: Automação da exclusão de registros de clientes finalizados.

## 7. Restrições Importantes
- **Integridade Referencial**: Ao deletar o cliente, o `client_id` no projeto é setado como `null`. A dependência do nome deve ser suprida pela coluna `client_name`.
- **Dependência de API**: A integração com o WhatsApp depende da `Evolution API`. Variáveis de ambiente devem estar configuradas no Vercel.

## 8. Tecnologias Utilizadas
- **Frontend**: React 18, Vite, TypeScript, TailwindCSS, Lucide React.
- **Mobile**: Capacitor 5.
- **Backend**: Node.js (Vercel Serverless Functions), Express.
- **Banco de Dados & Auth**: Supabase (PostgreSQL), Supabase Storage.
- **Integrações**: Evolution API (WhatsApp), Local Notifications (Capacitor).
