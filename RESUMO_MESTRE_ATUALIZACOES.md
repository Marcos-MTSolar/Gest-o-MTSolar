# RESUMO MESTRE DE ATUALIZAÇÕES - MT SOLAR ERP

Este documento serve como a fonte de verdade técnica para o estado atual do projeto, consolidando decisões, padrões e pendências.

## 1. Objetivo Principal
Desenvolver um ERP multi-tenant robusto para a MT Solar, integrando gestão de atendimentos (WhatsApp), propostas comerciais e dimensionamento solar em uma plataforma única e performática.

## 2. Decisões Técnicas
- **Multi-Tenancy**: Isolamento de dados garantido via `company_id` em todas as tabelas e rotas da API.
- **WhatsApp Integration**: Uso da Evolution API v2 com suporte a múltiplas instâncias por empresa (`mtsolar` e `atendimento-cliente`).
- **Media Handling**: Upload de arquivos via backend para contornar RLS do Supabase, utilizando `supabaseAdmin` com `service_role`.
- **Image Optimization**: Compressão no cliente (máx 1280px, JPEG 82%) antes do upload para reduzir delay.
- **Message Status**: Rastreamento em tempo real (Enviado, Entregue, Lido) via Webhook (`messages.update`).

## 3. Regras e Padrões
- **Instâncias WhatsApp**:
  - `mtsolar`: Administrativo.
  - `atendimento-cliente`: Comercial/Atendimento.
- **Segurança**:
  - Nunca expor `SUPABASE_SERVICE_ROLE_KEY` no frontend.
  - Rotas `/api/whatsapp/*` exigem `authenticateToken` e validam o `company_id` do JWT.
- **Resolução de Instâncias**: Busca estrita na tabela `company_instances` antes de qualquer disparo.
- **Nomenclatura**: Instâncias normalizadas para lowercase com hífen (ex: `atendimento-cliente`).

## 4. Estrutura de Arquivos Relevante
- `api/index.ts`: Servidor central Express, handlers de WhatsApp, Webhook e Upload.
- `src/pages/WhatsApp.tsx`: Módulo principal de Atendimento, chat em tempo real e gestão de tickets.
- `src/lib/api.ts`: Cliente Axios configurado para comunicação com o backend Vercel.
- `src/lib/supabase.ts`: Configuração do cliente Supabase (Public Anon).

## 5. Problemas Resolvidos
- **404 Evolution API**: Corrigido via resolução estrita de instâncias e correção de apikeys no backend.
- **400 Supabase Storage**: Resolvido usando `service_role` e verificação de existência do bucket `whatsapp-media`.
- **Delay de Imagens**: Reduzido via compressão no frontend e otimização de parâmetros de upload (upsert: false).
- **Formatos de Mídia**: Suporte expandido para PDF, DOCX, XLSX, ZIP e Figurinhas (Stickers).

## 6. Pendências (Backlog)
- [ ] **Configuração de Webhook**: Ativar o webhook para a instância `atendimento-cliente` no painel da Evolution API.
- [ ] **Sincronização de Histórico**: Implementar botão para importar mensagens antigas da instância para o banco local.
- [ ] **Notificações Push**: Refinar o envio de notificações para agentes quando novas mensagens chegam (atualmente básico).
- [ ] **Segurança RLS**: Reativar e configurar RLS em tabelas críticas do Supabase (atualmente desativadas para desenvolvimento rápido).
- [ ] **Tradução Global**: Finalizar a localização PT-BR em componentes menores de UI.

## 7. Restrições Importantes
- **Vercel Limits**: Funções serverless têm timeout de 10s-60s; uploads grandes devem ser otimizados.
- **Vite Env Vars**: Variáveis prefixadas com `VITE_` são expostas ao cliente; segredos devem ser usados sem o prefixo no backend.

## 8. Tecnologias Utilizadas
- **Frontend**: React, Vite, TypeScript, Tailwind CSS, Lucide React.
- **Backend**: Node.js (Express), Vercel Serverless Functions.
- **Banco/Storage**: Supabase (PostgreSQL + Storage).
- **Mensageria**: Evolution API v2.
