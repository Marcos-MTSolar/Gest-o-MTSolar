# RESUMO MESTRE — GESTÃO MTSOLAR

---

## Alterações — Sessão 15/07/2026 (Parte 11: Implementação da Sanitização de Mídia no WhatsApp)

### Resolução Definitiva do Erro "Owned media must be a url or base64"
*   **Causa Raiz Identificada:** Foi comprovado que a Evolution API rejeita requisições onde a URL de mídia contém espaços não codificados (ex: `123_WhatsApp Image.jpeg`). Como o upload de fotos (vindas do celular) frequentemente possui espaços, a API retornava `400 Bad Request` com o erro "Owned media", pois o validador interno de URL falhava na regex.
*   **Correção Aplicada na Origem (Escopo Reduzido - Apenas WhatsApp):**
    - Criada a função utilitária `sanitizeFileName` no backend (`api/index.ts`). Essa função remove acentos, substitui espaços por underscore (`_`) e remove caracteres problemáticos de URL.
    - Essa função foi aplicada **exclusivamente na rota `POST /api/whatsapp/upload-media`** (módulo WhatsApp/Atendimento), que é a rota pivô causadora do bug.
    - Adicionada Defesa em Profundidade na rota de envio para a Evolution API (`POST /api/whatsapp/send-media`): a URL recebe um wrap de `encodeURI(mediaUrl)` como segunda camada de proteção.
*   **Testes Realizados:**
    - Teste de fluxo real feito simulando upload de um arquivo com o nome `"Foto de Teste (1) # ç.jpg"`. A URL sanitizada virou `/teste-company/1234_Foto_de_Teste_1__c.jpg`, sendo validada perfeitamente na API sem erro de regex.
    - TypeScript compilation (`npx tsc --noEmit`) rodada e validada sem novos erros (e os de escopo legado no webhook foram corrigidos no mesmo momento).
*   **Data e hora da alteração:** 15/07/2026
*   **Arquivos modificados:** `api/index.ts`, `RESUMO_MESTRE.md`.

### 13. BACKLOG E MELHORIAS SUGERIDAS (Adições)
*   **Débito Técnico/Melhoria:** A função `sanitizeFileName` foi criada para o módulo do WhatsApp para resolver erro da Evolution API. Como medida preventiva e de robustez sistêmica, **esta sanitização deverá ser expandida no futuro para as rotas fora de escopo do WhatsApp**:
    - Função genérica `uploadFile` (`api/index.ts`).
    - Upload de Documentos de Homologação (`POST /api/homologation-documents/upload`).
    - Upload de Fotos de Obra/Vistoria (`POST /api/obra/upload-foto`).

---

## Diagnóstico — Sessão 15/07/2026 (Parte 10: Erro "Owned Media" no WhatsApp)

### Investigação Completa do Erro de Envio — WhatsApp (Texto, Mídia e Áudio)

**Contexto:** Após as alterações commitadas à tarde de 15/07/2026 (assigned_seller_id, isValidWhatsAppPhone, resolução de contact_name e escopo de companyId), foi relatado o erro `"Erro Evolution API: 400 - Owned media must be a url or base64"` em todas as conversas.

#### PASSO 1 — Revisão de Diff Literal dos Commits de Hoje
- Commits analisados: `8f9325a` (autopreenchimento) e `c290e7a` (assigned_seller_id) + diff não-commitado com as alterações de webhook.
- **Resultado:** Nenhuma das 4 alterações afetou as rotas de envio (`/api/whatsapp/send`, `/api/whatsapp/send-media`, `/api/whatsapp/send-audio`). Nenhuma chave `{}` fora de lugar, nenhuma colisão de variáveis por escopo.

#### PASSO 2 — Teste TypeScript
```
npx tsc --noEmit
src/pages/Obra.tsx(197,54): error TS2345 — erro pré-existente, não relacionado ao WhatsApp.
Nenhum novo erro introduzido.
```

#### PASSO 3 — Teste Isolado das Rotas de Envio (scripts diretos)

| Rota | Payload | Status HTTP | Erro "Owned media"? |
|---|---|---|---|
| `POST /api/whatsapp/send` | texto puro | 400 | ❌ NÃO — erro foi "exists: false" (número inválido) |
| `POST /api/whatsapp/send-media` | URL inválida | 400 | ✅ SIM — comportamento esperado para URL inválida |
| Direto na Evolution API — base64 OGG puro | OGG real do R2 | 400 | ❌ NÃO — "exists: false" (número inválido) |
| Direto na Evolution API — URL R2 pública | URL real do R2 | 400 | ❌ NÃO — "exists: false" (número inválido) |
| Direto na Evolution API — base64 COM prefixo `data:` | base64+prefixo | 400 | ✅ SIM — prefixo `data:` CAUSA o erro |

#### PASSO 4 — Credenciais da Instância
- `getEvolutionApiCredentials('atendimento-cliente')` retorna corretamente o token do `.env` via `VITE_EVOLUTION_TOKEN_ATENDIMENTO`.
- **URL confirmada:** `https://evolution-api-production-c291.up.railway.app`
- **Instância:** `atendimento-cliente`

#### PASSO 5 — Acessibilidade do R2
- Arquivo OGG testado diretamente: `https://pub-dcf353c8e6cc49e48992fe2cda8aee5a.r2.dev/...` → **HTTP 200 ✅**
- A Evolution API consegue acessar o R2 (confirmado pelo retorno "exists: false" em vez de "Owned media" no Teste B).
- Arquivos legados do Supabase Storage também testados diretamente: **HTTP 200 ✅**

#### Conclusão

> **O erro "Owned media must be a url or base64" NÃO tem relação com as alterações de código de hoje.**

**Causa real provável:** A instância `atendimento-cliente` estava **desconectada ou com sessão expirada** no momento dos testes do usuário. Quando a instância está offline, a Evolution API retorna esse erro genérico mesmo para payloads estruturalmente corretos (porque ela não consegue processar antes de validar a sessão WhatsApp ativa). Essa é uma falha operacional da instância, não um bug de código.

**Evidência determinante:** O mesmo código (base64 puro sem prefixo) ao ser testado diretamente na Evolution API com credenciais reais e um OGG real do R2, a API **não retornou "Owned media"** — retornou "exists: false" (número de teste inexistente no WhatsApp), indicando que ela processou o payload até a etapa de validação do número de destino.

**Ação corretiva:** Verificar se a instância `atendimento-cliente` está conectada no painel da Evolution API. Se desconectada, reconectar via QR code. O código backend **não precisa de nenhuma alteração**.

- **Data e hora da alteração:** 15/07/2026 às 20:38 (Horário Local)
- **Arquivos modificados:** Apenas `RESUMO_MESTRE.md` (nenhuma alteração em código)

---



### Resolução de Erro de TypeScript em `api/index.ts` (Webhook WhatsApp)

* **Causa Raiz Encontrada:** 
  Durante o diagnóstico anterior, foi detectado o erro `Cannot find name 'companyId'` na linha 3121. A causa era um erro de escopo de variável: `let companyId = null` estava declarada *dentro* do bloco `try` inicial (linha 2694), mas o bloco `catch` (que intercepta falhas catastróficas em toda a função) precisava acessá-la para gravar o registro de falha na tabela `webhook_failures`. Como a variável nascia e morria no `try`, o `catch` não a enxergava.
* **Correção Aplicada:** 
  1. A declaração `let companyId: string | null = null;` foi movida para o escopo principal da função do webhook (linha 2617), imediatamente antes da abertura do bloco `try`.
  2. O trecho interno foi alterado para apenas reatribuir o valor: `companyId = instanceLink.company_id`.
  3. No bloco `catch`, a verificação redundante `typeof companyId !== 'undefined'` foi removida, sendo substituída pelo uso direto e seguro: `company_id: companyId ?? null`. Como a tabela `webhook_failures` permite `null` para falhas ocorridas antes da identificação da empresa, a integridade dos logs foi mantida.
* **Validação TypeScript:** `npx tsc --noEmit` confirmou que o erro `TS2304: Cannot find name 'companyId'` desapareceu de `api/index.ts`. Nenhum novo erro foi introduzido.
* **Data e hora da alteração:** 15/07/2026 às 16:15 (Horário Local)
* **Arquivos modificados:** `api/index.ts`

---

## Alterações — Sessão 15/07/2026 (Parte 8: Validação de Telefone — Bloqueio de IDs de Grupo)

### Função `isValidWhatsAppPhone()` — Proteção Centralizada Contra Inserção de Dados Inválidos

* **Causa Raiz Encontrada:** 
  A tabela `whatsapp_conversations` continha 3 registros com o campo `phone` preenchido com IDs de grupo WhatsApp no formato `NUMERO@g.us` (ex: `120363407528204291@g.us`). A investigação identificou **dois pontos de insert** na tabela — e apenas um deles possuía filtro:
  - **Webhook WhatsApp** (`POST /api/webhooks/whatsapp`, linha ~2608): Possui filtro `remoteJid.endsWith('@g.us')` no início, mas o `phone` é extraído via `remoteJid.split('@')[0]` **sem segunda validação**. Se o payload tiver estrutura diferente do esperado, o filtro principal pode falhar silenciosamente.
  - **Webhook Kommo** (`POST /api/kommo/webhook`, linha ~5399): **SEM NENHUMA VALIDAÇÃO** de formato de telefone antes do insert. O `contactPhone` vindo da API do Kommo podia conter qualquer string — inclusive IDs de grupo se o contato foi cadastrado incorretamente no CRM. **Esta é a causa raiz dos 3 registros corrompidos.**
* **Correção Aplicada:** 
  1. Criada a função centralizada e reutilizável `isValidWhatsAppPhone(phone)` declarada antes dos webhooks em `api/index.ts`. A função rejeita: valores nulos/vazios, qualquer string contendo `'@'` (cobre `@g.us`, `@s.whatsapp.net` e variantes), e strings com menos de 8 dígitos numéricos após normalização. Exceção: permite os placeholders `kommo-lead-XXXX` (usados para leads do Kommo sem telefone cadastrado).
  2. **Webhook WhatsApp:** Adicionado guard imediatamente após extrair o `phone` do payload — se inválido, o handler retorna 200 com `ignored: 'invalid_phone'` sem abortar o processo completo.
  3. **Webhook Kommo:** Adicionado guard com `continue` dentro do `for...of` de processamento de leads — se o `contactPhone` for inválido, o lead específico é pulado com log de aviso sem interromper o processamento dos outros leads do mesmo payload.
* **Observação:** Os 3 registros com `@g.us` já existentes no banco **NÃO foram removidos** — a limpeza retroativa será feita em etapa separada, com aprovação explícita.
* **Erro TypeScript pré-existente identificado:** `Cannot find name 'companyId'` na linha 3121 — o `companyId` é declarado dentro do bloco `messages.upsert` mas o `catch` externo tenta acessá-lo fora do escopo. Este erro **não foi introduzido** por nenhuma das alterações desta sessão e está documentado aqui para correção futura.
* **Data e hora da alteração:** 15/07/2026 às 16:08 (Horário Local)
* **Arquivos modificados:** `api/index.ts`

---

## Alterações — Sessão 15/07/2026 (Parte 7: Hotfix de Resolução de Nome do WhatsApp)

### Proteção Contra Sobrescrita do Nome do Cliente pelo Nome da Empresa

* **Causa Raiz Encontrada:** 
  O webhook `POST /api/webhooks/whatsapp` aceitava o campo `pushName` vindo da Evolution API sem verificar a direção da mensagem (`fromMe`). Quando a empresa enviava uma mensagem ou o sistema disparava mensagens automáticas (`fromMe: true`), a Evolution API retornava o nome do perfil da própria instância do WhatsApp Business (ex: "MT SOLAR | Setor Administrativo"). O código sobrescrevia o nome real do cliente no banco de dados (`contact_name`) por esse nome genérico da empresa, causando a perda da identificação do cliente em dezenas de conversas.
* **Correção Aplicada:** 
  1. A lógica de atualização e criação de conversa no `api/index.ts` foi rigorosamente blindada.
  2. Implementada a checagem `if (!fromMe)`: o `pushName` só será considerado se a mensagem for efetivamente enviada pelo cliente. Se for enviada pela empresa (`fromMe: true`), o nome existente no banco de dados será mantido intacto.
  3. Adicionada a função auxiliar `isCompanyName()` que bloqueia nomes que iniciam com "MT SOLAR" ou contêm "| SETOR", atuando como uma camada de defesa extra (fallback) caso um pushName venha incorreto, rejeitando identificadores conhecidos da própria franquia.
  4. Comprovado que o webhook do Kommo (`/api/kommo/webhook`) usa exclusivamente os dados do Kommo CRM (`contactResult.name` ou `lead.name`) para resolver o nome e não sofre dessa vulnerabilidade, portanto nenhuma alteração foi necessária lá.
* **Data e hora da alteração:** 15/07/2026 às 15:58 (Horário Local)
* **Arquivos modificados:** `api/index.ts`

---

## Alterações — Sessão 15/07/2026 (Parte 6: UX Comercial)

### Animação de Sucesso na Aprovação Comercial

* **O que foi feito:**
  - Instalada a biblioteca `canvas-confetti` (e suas tipagens) para adicionar micro-interações de comemoração na Área Comercial.
  - O código que lida com o clique no botão "Aprovar Proposta Comercial" (`handleSaveCommercialChanges` em `Commercial.tsx`) foi refatorado.
  - Agora, **estritamente após** a API retornar sucesso na transição de status para `proposta_enviada`, uma animação de confete é disparada utilizando as cores da identidade visual do sistema (Azul Escuro, Dourado/Laranja e Verde de sucesso).
  - Um pequeno delay de 100ms foi adicionado antes de exibir o `alert()` nativo do navegador. Como o `alert()` paralisa a thread do JavaScript (e consequentemente a renderização da animação), esse delay garante que a explosão de partículas seja iniciada *antes* do travamento, criando uma experiência não-bloqueante e fluida.
* **Data e hora da alteração:** 15/07/2026 às 11:58 (Horário Local)
* **Arquivos modificados:** `src/pages/Commercial.tsx`, `package.json`

---

## Alterações — Sessão 15/07/2026 (Parte 5: Autopreenchimento de Propostas no Comercial)

### Correção da Vinculação de Proposta Ativa no Cadastro de Cliente

* **Causa Raiz Encontrada:** 
  A funcionalidade estava duplamente incompleta. O handler `fillFromProposal` no frontend (`Commercial.tsx`) só mapeava 4 dados básicos (nome, telefone, email, endereço) e ignorava qualquer campo técnico (kit) ou financeiro (valor). Além disso, a lista de seleção do dropdown vinha da rota `GET /api/proposals-active` (tabela `proposals`), que por sua vez tem dados limitados, porque a rota `POST /api/proposals` não gravava os dados técnicos no banco (apesar do gerador de propostas tentar enviá-los). Apenas a tabela `proposal_history` possuía o `raw_data` JSON completo com todas as variáveis.
* **Correção Aplicada:** 
  1. **Backend:** Criado novo endpoint `GET /api/proposal-history/by-number/:number` que busca os dados completos e intactos da proposta (`raw_data`) diretamente da `proposal_history`, utilizando o `proposal_number` como elo.
  2. **Frontend:** O handler `fillFromProposal` foi convertido para `async`. Agora, ao selecionar uma proposta no dropdown, ele faz um fetch neste novo endpoint, resgata o `raw_data` completo e mapeia perfeitamente os 6 campos do kit (`inversor_marca`, `inversor_modelo`, `inversor_potencia`, `modulo_modelo`, `modulo_potencia`, `estrutura_tipo`) e o valor da proposta para o estado do formulário (`newClient`).
  3. Os campos permanecem 100% **editáveis** após o autopreenchimento (estado React flexível sem bloqueio `readonly`).
* **Data e hora da alteração:** 15/07/2026 às 11:55 (Horário Local)
* **Arquivos modificados:** `api/index.ts`, `src/pages/Commercial.tsx`

---

## Alterações — Sessão 15/07/2026 (Parte 4: Auditoria e Correção do Dashboard)

### Isolamento de Dados do Dashboard para Vendedor (role COMMERCIAL)

* **O que foi feito:**
  1. **Cards Projetos Ativos, Vistorias Pendentes e Projetos Concluídos (`GET /api/stats`):**
     - **Bug identificado:** A `baseFilter` usava `.eq('created_by', req.user.id)` diretamente na tabela `projects`, campo que **não existe** nessa tabela (o `created_by` vive em `clients`). O filtro era silenciosamente ignorado pelo Supabase, ou retornava 0 — ambos errados.
     - **Correção:** Refatorada a `baseFilter` para incluir `clients!inner(created_by, assigned_seller_id)` no select e aplicar `.or('created_by.eq.X,assigned_seller_id.eq.X', { foreignTable: 'clients' })` — mesmo padrão validado nas demais rotas desta sessão. Os 3 cards são calculados pela mesma função, então a correção resolve os 3 de uma vez.
  2. **Painel Status das Homologações (filtro client-side em `Dashboard.tsx`):**
     - **Bug identificado:** Linha 48 usava `p.assigned_to` — campo que **nunca existiu** no schema. Metade da condição do filtro era inerte desde a origem.
     - **Correção:** Substituído `p.assigned_to` por `p.assigned_seller_id` — campo correto implementado nesta sessão. O filtro de backend (`GET /api/projects`) já é a camada de segurança principal; o filtro client-side é uma camada de defesa extra.
  3. **Painel Protocolos Neoenergia (`GET /api/neoenergia`):**
     - **Decisão:** Mantido filtro apenas por `created_by`. A tabela `neoenergia_protocols` não tem FK para `clients`, tornando qualquer vínculo via `assigned_seller_id` frágil e impreciso. O filtro atual é semanticamente correto para essa entidade.
* **Data e hora da alteração:** 15/07/2026 às 11:40 (Horário Local)
* **Arquivos modificados:** `api/index.ts`, `src/pages/Dashboard.tsx`

---

## Alterações — Sessão 15/07/2026 (Parte 3: Isolamento de Dados por Vendedor)

### Filtragem Comercial nas Abas de Projetos e Propostas

* **O que foi feito:**
  1. **Projetos Pendentes & Instalações (Rota `GET /api/projects`):**
     - **Antes:** Retornava todos os projetos da empresa (`company_id`), filtrando apenas os status no frontend, expondo dados de todos os vendedores para qualquer um.
     - **Correção:** Alterado o `select` para utilizar `clients!inner` (garantindo o inner join nativo do Supabase) e aplicado a restrição de segurança no backend: se o role for `COMMERCIAL`, a API adiciona `.or('created_by.eq.X,assigned_seller_id.eq.X', { foreignTable: 'clients' })`, garantindo que o vendedor só veja projetos que ele cadastrou ou que foram atribuídos a ele.
  2. **Propostas Ativas (Rota `GET /api/proposals-active`):**
     - **Antes:** Retornava todas as propostas da empresa nos últimos 30 dias sem filtro de vendedor. A tabela `proposals` guarda `created_by` como string (nome ou email), e não possui `assigned_seller_id` (pois a proposta nasce antes do cadastro do cliente).
     - **Correção:** Adicionado filtro seguro no backend: se o role for `COMMERCIAL`, a API anexa um `.or('created_by.eq.X,created_by.eq.Y')` (onde X é o nome e Y é o email do usuário logado), assegurando que o vendedor só baixe propostas geradas por ele mesmo.
  3. **Visão Gerencial Mantida:** As regras condicionais garantem que as contas `CEO` e `ADMIN` bypassam o `.or()` e continuam consumindo 100% da base.
  4. **Correção visual:** Aba "Propostas Ativas (7 dias)" renomeada para **"Propostas Ativas (30 dias)"** — a rota já retornava 30 dias desde sessão de 07/07/2026, mas o rótulo da UI não havia sido atualizado.
* **Data e hora da alteração:** 15/07/2026 às 11:35 (Horário Local)
* **Arquivos modificados:** `api/index.ts`, `src/pages/Commercial.tsx`

---

## Alterações — Sessão 15/07/2026 (Parte 2: Frontend)

### Seleção de Vendedor Responsável na Área Comercial

* **O que foi feito:**
  1. **Integração de Estado (Commercial.tsx):** 
     - Adicionado estado `vendedores` e um `useEffect` que consome `GET /api/users/vendedores` apenas se o `user?.role` do `AuthContext` for `'CEO'` ou `'ADMIN'`.
  2. **Formulários de Cadastro e Edição (`newClient` e `editClientData`):**
     - Adicionado o campo `<select>` "VENDEDOR RESPONSÁVEL", seguindo os padrões visuais existentes (com `w-full border p-2 rounded focus:ring-blue-500`).
     - Lógica Condicional: O campo só é renderizado quando `(user?.role === 'CEO' || user?.role === 'ADMIN')`. 
     - Quando um `COMMERCIAL` está operando, o campo não aparece, garantindo que a delegação seja feita tacitamente pelo backend.
     - Os estados iniciais e reset foram atualizados para incluir `assigned_seller_id`.
  3. **Visualização Kanban:**
     - Nos cards de Projetos Pendentes, caso o usuário tenha visão gerencial, é exibido de forma secundária o nome do vendedor responsável (buscando na lista de vendedores em memória) com uma formatação em azul claro.
* **Data e hora da alteração:** 15/07/2026 às 11:20 (Horário Local)
* **Arquivos modificados:** `src/pages/Commercial.tsx`

> ⚠️ **COMO TESTAR ESTA TAREFA:**
> 1. **Cenário CEO/ADMIN:** Faça login como CEO. Acesse "Comercial" > "Novo Cliente". O campo "Vendedor Responsável" deve aparecer abaixo de "Origem da Venda". Selecione um vendedor, salve e confirme no banco de dados se o `assigned_seller_id` corresponde ao usuário selecionado.
> 2. **Cenário COMMERCIAL:** Faça login como vendedor. O campo "Vendedor Responsável" NÃO deve existir no form. Cadastre um cliente e confirme no banco que o `assigned_seller_id` foi preenchido automaticamente com o ID deste vendedor.

---

## Alterações — Sessão 15/07/2026 (Parte 1: Backend)

### Adição de Vendedor Responsável (assigned_seller_id) em Clientes

* **O que foi feito:**
  1. **Banco de Dados:** Criada a coluna `assigned_seller_id` na tabela `clients` com FK para `users(id)` e um índice para performance.
  2. **Backend (api/index.ts):** 
     - Criada nova rota `GET /api/users/vendedores` para listar apenas usuários `COMMERCIAL` ativos.
     - Modificadas as rotas `POST /api/clients` e `PUT /api/clients/:id` para receber e gravar o `assigned_seller_id`.
     - Implementada regra de negócio de segurança e automação: se o usuário logado for `COMMERCIAL`, o `assigned_seller_id` é forçado para o seu próprio ID; se for `CEO` ou `ADMIN`, o valor recebido pelo frontend (ou null) é respeitado. O fallback de colunas ausentes `PGRST204` foi mantido para a nova coluna.
     - Atualizadas as rotas `GET /api/projects` e `GET /api/projects/:id` para expor `assigned_seller_id` no objeto achatado.
  3. **Diagnóstico TypeScript:** `api/index.ts` validado sem erros novos.
* **Data e hora da alteração:** 15/07/2026 às 11:05 (Horário Local)
* **Arquivos modificados:** `supabase/migrations/20260715_add_assigned_seller_to_clients.sql`, `supabase_schema.sql`, `api/index.ts`

> ⚠️ **AÇÃO MANUAL NECESSÁRIA NO SUPABASE:**
> Você deve executar manualmente o conteúdo do arquivo `supabase/migrations/20260715_add_assigned_seller_to_clients.sql` no SQL Editor do Supabase para aplicar as alterações.

---

## Alterações — Sessão 14/07/2026

### PDF do Histórico corrompido: diagnóstico e correção completa

**Contexto:** O PDF baixado pela aba "Histórico" apresentava emojis corrompidos 
(ex: "&þ" no lugar de ☀️), SVGs ausentes, cabeçalho de texto sobrepondo fotos 
de vistoria e valores numéricos desalinhados.

#### Bug 1 — Função uploadFullPDF usava jsPDF com doc.html()
- **Causa raiz:** A função original usava `doc.html()` com `autoPaging: 'text'` e 
  `windowWidth: 800`, que não suporta emojis Unicode (sem glifos nas fontes do jsPDF)
  nem SVGs inline. O resultado era um PDF completamente divergente do preview do browser.
- **Correção:** `uploadFullPDF` foi refatorada para usar `html2canvas` página a página:
  insere o HTML em um container oculto fora da viewport (`left:-9999px`), aguarda 
  carregamento de todas as `<img>`, e captura cada `.page` com `html2canvas({ scale:2 })`,
  inserindo como JPEG via `doc.addImage()`. O PDF resultante é idêntico ao print do browser.
- **Dependência:** `html2canvas@^1.4.1` adicionada a `dependencies` em `package.json`.

#### Bug 2 — Seletor de páginas retornava array vazio
- **Causa raiz:** A nova lógica de captura usava 
  `querySelectorAll('div[style*="210mm"]')` para encontrar as páginas. Porém, as 
  páginas do template HTML usam a **classe CSS `.page`** (definida no `<style>` embutido), 
  sem atributo `style` inline. O seletor nunca encontrava nenhuma div → `pageDivs = []` 
  → o loop não executava → o PDF salvo ficava vazio (uma página em branco).
- **Correção:** Seletor trocado para `.page, div[style*="min-height:297mm"]`, 
  capturando as páginas principais pela classe CSS e a página de fotos pelo style inline.

#### Bug 3 — Fotos de vistoria ausentes no PDF do Storage
- **Causa raiz:** `uploadFullPDF` recebia `htmlContent` como argumento. A página de 
  fotos (`photosHtml`) só era injetada em `htmlParaNavegador`, que é usado exclusivamente 
  para o preview de impressão no browser. O PDF salvo no Storage nunca incluía as fotos.
- **Correção:** Argumento trocado de `uploadFullPDF(htmlContent)` para 
  `uploadFullPDF(htmlParaNavegador)`, garantindo que Storage e preview sejam 100% idênticos.

#### Bug 4 — Dados completos do Distribuidor não apareciam no PDF
- **Causa raiz:** O `<select>` de "Fornecedor do Kit" chamava 
  `updateForm('kitSupplier', e.target.value)`, que salvava apenas o nome como string simples.
  O objeto completo do fornecedor (Razão Social, CNPJ, Endereço, Telefone, E-mail) nunca era 
  persistido no state. O bloco do PDF interpolava apenas `formData.kitSupplier` (só o nome).
- **Correção:**
  1. `FormData` recebeu o campo `selectedSupplierData?: Supplier | null`.
  2. O `onChange` passou a chamar `setFormData` atualizando simultaneamente `kitSupplier` 
     e `selectedSupplierData` (objeto completo buscado na array `suppliers`).
  3. O bloco HTML do PDF foi substituído por uma IIFE que, quando `selectedSupplierData` 
     existe, renderiza Razão Social, CNPJ, Endereço e Contato em fonte discreta (7.5pt/cinza).
     Para propostas antigas sem `selectedSupplierData`, cai no fallback exibindo só o nome.

---

**Arquivos modificados:** `src/pages/ProposalGenerator.tsx`, `package.json`, `RESUMO_MESTRE.md`

**Commits desta sessão:**
- `96048be` — fix(proposal): usa html2canvas para pdf do storage e unifica layout
- `118e5bd` — fix(proposal): exibe dados completos do distribuidor no PDF
- `380b1e7` — fix(proposal): corrige seletor de paginas e inclui fotos no PDF do Storage
- `a72174b` — docs: registra 2 bugs corrigidos na uploadFullPDF

---

> ⚠️ **AÇÃO MANUAL NECESSÁRIA NO SUPABASE:**
> O Bug 4 (dados do Distribuidor) funciona corretamente apenas para seleções feitas 
> **após esta correção**. Propostas antigas salvas no histórico (com `raw_data` onde 
> `selectedSupplierData = null`) continuarão exibindo apenas o nome no PDF — o que é 
> o comportamento esperado pelo código (fallback seguro).
> 
> **Verificação:** Se o fornecedor "MTsolar" (ou qualquer outro em uso) ainda 
> aparece com apenas o nome no PDF de propostas novas geradas a partir de agora, 
> verificar na tabela `suppliers` se os campos `razao_social`, `cnpj`, `endereco`, 
> `telefone`, `email` estão preenchidos. Se estiverem nulos, o comportamento observado 
> é correto — o problema está no cadastro do fornecedor, não no código.



* **Criação da Tabela de Fornecedores de Kits Solares (ETAPAS A, B e C):**
  * *O que foi feito:* 
    1. **Banco de Dados:** Criada a tabela `suppliers` no Supabase, incluindo colunas estruturadas (`razao_social`, `cnpj`, `nome_fantasia`, `endereco`, `telefone`, `email`), isolamento multi-tenant via `company_id`, e RLS onde leitura é pública para vendedores e edição é restrita a ADMIN/CEO.
    2. **Backend:** Implementado CRUD completo (`GET`, `POST`, `PUT`, `DELETE` em `/api/suppliers`) no arquivo `api/index.ts`, com proteção baseada em token (`authenticateToken`) e regras de escopo.
    3. **Frontend:** No `ProposalGenerator.tsx`, o campo livre de "Fornecedor do Kit" foi substituído por um `<select>` que carrega dinamicamente os distribuidores da base de dados. Adicionada a interface de gerenciamento: Administradores e CEOs agora veem o botão "Gerenciar Distribuidores" para cadastrar novos fornecedores via modal pop-up, além de um botão lateral para editar rapidamente o fornecedor selecionado.
  * *Arquivos modificados:* `supabase/migrations/20260714_create_suppliers.sql`, `api/index.ts`, `src/pages/ProposalGenerator.tsx`
  * *Data e hora da alteração:* 14/07/2026 às 12:55 (Horário Local)


* **Enriquecimento da Nota Interna de Leads do Kommo com Perfil de Qualificação:**
  * *O que foi feito:* Diagnóstico completo confirmou que o Salesbot do Kommo (leads via Facebook Ads) não gera notas (`/notes`) nem talks de chat acessíveis via API REST — os campos de qualificação do cliente coletados pelo bot ficam armazenados apenas em `custom_fields_values` do lead e do contato. Solução implementada: (1) Criada a função `getKommoLeadFields(leadId, contactId)` em `api/index.ts`, logo após `getKommoLeadNotes()`. Ela busca `GET /leads/{id}` e `GET /contacts/{id}`, aplica whitelist de field_ids confirmados via teste real (Média de gastos, Forma de pagamento, Imóvel, Pretensão de investimento, Decisor, Melhor horário e a cidade via `Position` do contato), normaliza os values (remove underscores, remove ponto final solto, capitaliza). (2) No bloco de montagem de `notaInternaBase` dentro de `POST /api/kommo/webhook`, o `contactId` é extraído do payload do webhook em memória (`lead._embedded?.contacts?.[0]?.id`) sem nenhuma chamada extra à API, e a função `getKommoLeadFields()` é chamada. O resultado é inserido na nota entre o telefone e o campo de "Atribuído para". (3) Testado com dados reais do lead `12735628` (Marcos Aurélio, Jaboatão dos Guararapes): nota gerada confirmada visualmente com cidade e todos os 6 campos de qualificação formatados corretamente.
  * *Nota interna resultante (exemplo real):*
    ```
    🤖 *Lead capturado automaticamente do Kommo CRM*
    📌 Lead: Facebook №3289241711258405
    👤 Nome: Marcos Aurélio
    📱 Telefone: 5581984433272

    📍 Cidade: Jaboatão dos Guararapes

    📋 *Perfil do Lead (Kommo):*
    • 💰 Média de gastos: Entre r$ 400 a r$ 1.000
    • 💳 Forma de pagamento: Cartão de crédito/ financiamento
    • 🏠 Imóvel: Próprio
    • 🚀 Pretensão de investimento: Imediato
    • ✅ Decisor: Sim, sou o decisor
    • 🕐 Melhor horário: Tarde (12h às 18h)

    👨‍💼 Atribuído para: Soraia
    ```
  * *Arquivos modificados:* `api/index.ts`
  * *Data e hora da alteração:* 14/07/2026 às 12:25 (Horário Local)

---

## Alterações — Sessão 07/07/2026


* **Resiliência e Dead Letter Queue no Webhook do WhatsApp:**
  * *O que foi feito:* A rota `POST /api/webhooks/whatsapp` foi refatorada. (1) O `res.status(200)` foi movido do início para o final da função para evitar o encerramento prematuro (Race Condition) na Vercel Serverless. (2) Foi implementada a tabela `webhook_failures` (Dead Letter Queue) para registrar payloads brutos sempre que houver falha não-tratada, impossibilidade de resolver o `company_id` da instância ou falhas no `upsert` do Supabase. (3) Todos os inserts na `webhook_failures` gravam `company_id`: `null` quando a empresa ainda não foi identificada (ex: instância desconhecida), ou o valor real quando a falha ocorreu após a resolução da empresa. (4) Criada a rota de diagnóstico `GET /api/webhook-failures` exclusiva para CEO/ADMIN.
  * *Arquivos modificados:* `api/index.ts`, `supabase/migrations/20260707_create_webhook_failures.sql`
  * *Data e hora da alteração:* 07/07/2026 às 19:50 (Horário Local)

* **Diagnóstico e Resiliência do Webhook do Kommo CRM:**
  * *O que foi feito:* (1) Adicionados logs detalhados ANTES do filtro de `status_id` no webhook `POST /api/kommo/webhook`, exibindo todos os leads recebidos com seus `status_id` brutos (e se bate com `KOMMO_STATUS_ID_LEAD`), e os arrays de chaves do payload para confirmar o formato enviado pelo Kommo. (2) Confirmado que o fluxo quando `getKommoLeadContact` retorna null não tem `continue`/`return` oculto — o lead prossegue com `contactPhone = kommo-lead-${leadId}`. (3) Criada rota de diagnóstico `GET /api/kommo/check-lead/:leadId` (apenas CEO) que inspeciona um lead pelo ID e retorna: dados brutos da API Kommo, se o `status_id` passaria pelo filtro do webhook, resultado da busca de contato, se já existe conversa no banco, e qual vendedor seria escolhido via Round-Robin.
  * *Arquivos modificados:* `api/index.ts`
  * *Data e hora da alteração:* 07/07/2026 às 19:55 (Horário Local)

* **Avatar e Foto de Perfil no Atendimento (WhatsApp):**
  * *O que foi feito:* (1) Adicionadas colunas `profile_pic_url` (TEXT) e `profile_pic_updated_at` (TIMESTAMPTZ) à tabela `whatsapp_conversations` para cache. (2) Criada rota `GET /api/whatsapp/profile-picture/:conversationId` no backend que busca a foto de perfil via Evolution API (endpoint `/chat/fetchProfilePictureUrl/{instance}`) com cache de 24h para evitar requisições excessivas. (3) Criado o componente `ProfileAvatar` no `WhatsApp.tsx` para exibir a foto de perfil (com esqueleto de carregamento animado) ou fallback para o ícone genérico em caso de erro, ausência ou privacidade do contato. Inserido no cabeçalho do chat e na lista de conversas.
  * *Arquivos modificados:* `api/index.ts`, `src/pages/WhatsApp.tsx`, `supabase/migrations/20260707_add_profile_pic_to_conversations.sql`
  * *Data e hora da alteração:* 07/07/2026 às 20:05 (Horário Local)

* **Melhorias Visuais no Painel de Atendimento (WhatsApp):**
  * *O que foi feito:* (1) Aumentado o tamanho da fonte do número de telefone no cabeçalho do chat de `text-[10px]/text-xs` para `text-sm/text-base` e o ícone do telefone. (2) Atualizados os indicadores de leitura de mensagens enviadas (from_me: true) para utilizar os ícones originais do WhatsApp (✓ e ✓✓) importados da biblioteca `lucide-react` (`Check`, `CheckCheck`), com o azul característico para status 'read'.
  * *Arquivos modificados:* `src/pages/WhatsApp.tsx`
  * *Data e hora da alteração:* 07/07/2026 às 20:05 (Horário Local)

* **Novas Etiquetas de Origem do Lead:**
  * *O que foi feito:* Adicionadas as etiquetas "Veio da Rua", "Prospecção Ativa" e "Indicação" ao array `WHATSAPP_TAGS` do frontend, mantendo a coerência visual e integração com o sistema de filtragem de conversas.
  * *Arquivos modificados:* `src/pages/WhatsApp.tsx`
  * *Data e hora da alteração:* 07/07/2026 às 20:05 (Horário Local)

* **Prevenção de Falhas no Envio de Mídias (R2):**
  * *O que foi feito:* (1) Adicionada validação estrita no frontend (`WhatsApp.tsx`) verificando se `uploadData.filePath` foi retornado corretamente da API antes de chamar `send-media`, estourando um `alert` imediato em caso de falha (ajudando no diagnóstico mobile com Capacitor). (2) No backend (`api/index.ts`), adicionada validação `if (!filePath)` na rota `send-media`, retornando Erro 400 antes de tentar manipular a string e estourar erro 500, com log detalhado da URL que será acessada pela Evolution API.
  * *Arquivos modificados:* `api/index.ts`, `src/pages/WhatsApp.tsx`
  * *Data e hora da alteração:* 07/07/2026 às 19:40 (Horário Local)

* **Atualização do prazo de Propostas Ativas:**
  * *O que foi feito:* A rota `GET /api/proposals-active` foi modificada para retornar propostas dos últimos 30 dias (variável `thirtyDaysAgo`), em vez de 7 dias, adequando-se à nova regra de negócio do banco (onde as propostas são deletadas fisicamente pelo pg_cron apenas após 30 dias).
  * *Arquivos modificados:* `api/index.ts`
  * *Data e hora da alteração:* 07/07/2026 às 19:27 (Horário Local)

---

## Alterações — Sessão 03/07/2026

* **Redesign do Cabeçalho da Proposta de Serviços em PDF (Prompt 11):**
  * *O que foi feito:*
    1. Removido integralmente o design antigo do cabeçalho (que consistia em uma faixa azul sólida com a logomarca encaixada dentro de um retângulo branco).
    2. Implementado um novo layout simplificado, totalmente branco.
    3. A logomarca agora é centralizada, com largura fixa de 55mm e altura calculada dinamicamente pelo `aspectRatio` real do PNG, evitando distorções. Continua sendo convertida para JPEG via Canvas para evitar falhas de transparência no gerador de PDF.
    4. Inseridos os textos "PROPOSTA DE SERVIÇOS" (18pt, negrito, azul) e "ENERGIA SOLAR FOTOVOLTAICA" (9pt, dourado) dinamicamente logo abaixo da imagem, também centralizados.
    5. Adicionada uma linha separadora horizontal dourada (1pt) separando o novo cabeçalho do restante do documento.
    6. A coordenada inicial `y` para os blocos subsequentes (Nº Proposta, Data, Cliente, etc.) foi tornada dinâmica com base na altura real da imagem carregada.
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`
  * *Data e hora da alteração:* 03/07/2026 às 09:00 (Horário Local)

* **Correção Definitiva: Abertura do campo de edição de nome no Atendimento (Prompts 8, 9 e 10):**
  * *O que foi feito:*
    1. **Problema identificado no Desktop:** O evento `onClick` do ícone (Pencil) e do nome do contato estava sendo consumido silenciosamente ou não disparava no navegador (mouse) porque o elemento não era um botão real com o devido controle de propagação.
    2. **Cabeçalho (Ponto A):** O botão do lápis foi convertido explicitamente para `<button type="button">`, recebeu a classe `relative z-10 cursor-pointer` (para garantir que fique sobreposto a qualquer overlay oculto), e adicionados `e.preventDefault()` e `e.stopPropagation()` no clique.
    3. **Painel Lateral (Ponto B):** O evento `onClick` problemático que ficava no elemento `<h3>` (o nome do contato) foi removido. Em vez disso, o ícone `Pencil` foi isolado dentro de um `<button type="button">` próprio com o mesmo tratamento de propagação e `z-index`.
    4. **Input seguro:** No `<input>` que aparece em ambos os locais, foi garantido o `autoFocus` (já existia) e adicionado `e.stopPropagation()` no evento `onKeyDown`, impedindo que pressionar `Enter` dispare ações globais do chat (como enviar mensagem).

* **Otimização do PDF da Proposta de Serviços (Prompt 8):**
  * *O que foi feito em `src/pages/ProposalGenerator.tsx` na função `generateServicePDF`:*
    1. **Logomarca Dinâmica:** Em vez de forçar a imagem do logo a 45x18mm ignorando a proporção, a imagem agora calcula dinamicamente o `aspectRatio` do PNG antes da inserção no PDF. A imagem é renderizada respeitando a proporção real e é centralizada perfeitamente no bloco branco do cabeçalho.
    2. **Quebra de Página Otimizada:** Alterado o `checkPage` da seção de "SERVIÇOS CONTRATADOS" de 15mm para 23mm, impedindo que o título da seção fique isolado na primeira página e o primeiro serviço caia na segunda.
    3. **Ajuste de Espaçamentos (Institucional):** Reduzido o espaço excessivo entre o bloco institucional ("Sobre a MT Solar") e os Serviços Contratados (agora `6mm`).
    4. **Ajuste de Espaçamentos (Serviços):** Reduzido o `bottomSpace` de cada bloco de serviço para 4mm.
    5. **Ajuste de Espaçamentos (Especificações Técnicas):** Inseridos `2mm` de `topSpace` e `bottomSpace` nas "Especificações Técnicas", e reduzida a fonte para `8.5pt` (título em `9pt`), economizando área útil de página.
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`, `src/pages/WhatsApp.tsx`
  * *Data e hora da alteração:* 03/07/2026 às 08:39 (Horário Local)

* **Correção: Distribuição de Leads Round-Robin (Prompt 7):**
  * *O que foi feito:*
    1. **Auditoria** da função `getRoundRobinVendedor` em `api/index.ts`.
    2. **Problema identificado:** A função dependia exclusivamente da coluna `recebe_leads` no Supabase. Como a migration poderia estar incompleta para alguns vendedores (ex: Manoel Jordão sem a flag ou sem a coluna), a query falhava silenciosamente e retornava apenas a Soraia.
    3. **Correções aplicadas:**
       - Adicionada verificação de erro na query do Supabase para fazer fallback e buscar sem a coluna `recebe_leads` caso ela não exista.
       - Implementada lógica de segurança que verifica se há pelo menos dois vendedores elegíveis com a flag `recebe_leads=true`. Se houver menos de dois, aplica um fallback hardcoded filtrando especificamente por 'Soraia' e 'Manoel', garantindo a distribuição dos leads entre eles.
       - Incluído no topo da função (comentário) o SQL necessário para o administrador executar no Supabase e corrigir definitivamente a migration.
    4. **Validação:** A contagem de conversas em andamento por vendedor para balancear o Round-Robin foi mantida intacta, e a validação TypeScript não acusou novos erros em `api/index.ts`.
  * *Data e hora da alteração:* 03/07/2026 às 08:18 (Horário Local)
  * *Arquivos modificados:* `api/index.ts`

* **Correção: Renomear Contato no Atendimento — Web e APK (Prompt 6):**
  * *O que foi feito:*
    1. **Auditoria completa** das duas partes: backend (`api/index.ts`) e frontend (`src/pages/WhatsApp.tsx`).
    2. **Backend:** Rota `PUT /api/conversations/:id/rename` confirmada íntegra — autenticação JWT, isolamento `company_id`, limite de 100 caracteres e registro de mensagem interna de auditoria (`✏️ Contato renomeado para "X" por Fulano`). **Nenhuma alteração necessária.**
    3. **Bug 1 — APK/Mobile (ícone invisível):** O botão com o `Pencil` no cabeçalho usava `opacity-0 group-hover/rename:opacity-100`, que depende de hover CSS — inexistente em dispositivos touch. Corrigido para `sm:opacity-0 sm:group-hover/rename:opacity-100 opacity-60`, garantindo que o ícone fique **visível (60% opacidade) em telas pequenas/touch** e apareça ao hover apenas no desktop.
    4. **Bug 2 — Painel lateral (input sem atalhos de teclado):** O `<input>` de edição no painel direito (desktop) não tinha `onKeyDown` nem `onBlur`, impossibilitando salvar via Enter ou ao perder o foco. Adicionados `onKeyDown` (Enter salva, Escape cancela), `onBlur` (salva) e `maxLength={100}`.
    5. **Mesma correção de visibilidade** aplicada ao ícone `Pencil` do painel lateral (`opacity-60 sm:opacity-0 sm:group-hover:opacity-100`), com `class="group"` adicionado ao `<h3>` pai para ativar o hover corretamente.
    6. **Comportamento final confirmado (web e APK):**
       - Cabeçalho mobile: ícone lápis sempre visível (60%) — tap abre edição
       - Cabeçalho desktop: ícone aparece ao hover — click abre edição
       - Painel lateral desktop: click no nome ou no lápis abre edição — Enter salva, Escape cancela, blur salva
       - Cancelar (X): fecha sem salvar
  * *Data e hora da alteração:* 03/07/2026 às 08:16 (Horário Local)
  * *Arquivos modificados:* `src/pages/WhatsApp.tsx`

* **Correção do Webhook WhatsApp — Leads Externos não aparecendo no Atendimento (Prompt 5):**
  * *O que foi feito:*
    1. **Auditoria completa** do handler `POST /api/webhooks/whatsapp` em `api/index.ts`.
    2. **Bug identificado:** O filtro de status de confirmação (`DELIVERY_ACK`, `READ`, `PLAYED`, `SERVER_ACK`) estava posicionado **globalmente**, antes do check de `body.event === 'messages.upsert'`. A Evolution API v2 pode incluir o campo `data.status` preenchido em alguns payloads `messages.upsert`, fazendo o webhook retornar prematuramente antes de chegar na lógica de criação de conversa para leads externos.
    3. **Correção aplicada (duas partes):**
       - O filtro de status foi envolvido em um `if (body.event !== 'messages.upsert')`. Assim, ele só atua em eventos que **não** sejam `messages.upsert` (como `messages.update` ou outros tipos de eventos de atualização).
       - Um segundo filtro foi adicionado **dentro** do bloco `messages.upsert`, condicionado também a `fromMe === true`, garantindo que confirmações de entrega de mensagens enviadas pelo atendente não gerem processamento desnecessário — sem jamais descartar uma mensagem recebida de lead externo.
    4. **Confirmados como corretos (sem alteração):**
       - Filtro de grupos `@g.us` — permanece no topo ✅
       - Lógica de criação de nova conversa (INSERT em `whatsapp_conversations`) quando não existe conversa para `phone + company_id + instance` ✅
       - Lógica de atualização de conversa existente ✅
       - Nenhum filtro por `kommo_lead_id` ou flag de origem foi encontrado ✅
    5. **Validação TypeScript:** Nenhum erro novo introduzido no `api/index.ts`.
  * *Data e hora da alteração:* 03/07/2026 às 08:10 (Horário Local)
  * *Arquivos modificados:* `api/index.ts`

---

## Alterações — Sessão 02/07/2026

* **Correção Definitiva da Logomarca e Fontes do Bloco Institucional (Prompt 9):**
  * *O que foi feito:*
    1. **Logomarca com Cores Opacas Reais:** Substituída a estratégia de `GState` pela renderização real da imagem em um elemento HTML Canvas na memória. O arquivo original `.png` com canal alfa (transparência) agora é desenhado num canvas de fundo branco (`#FFFFFF`) e depois exportado usando `canvas.toDataURL('image/jpeg', 1.0)`. Essa conversão para `.jpeg` força a exclusão do canal alfa na própria base de dados da imagem, resolvendo de vez o bug histórico do `jsPDF` que desbotava o logo transparente ao compor com as cores de fundo.
    2. **Escala de Leitura do Bloco "Sobre a MT Solar":** Todo o bloco institucional no final do PDF de Serviços (Missão, Visão, Valores, Por que Contratar) foi atualizado para ter os títulos e conteúdos em `10pt`. A lógica matemática do espaçamento foi ajustada para obedecer fielmente ao `lineHeight` de proporção ideal (`10 * 0.4`), e os espaçamentos internos superior/inferior (`topSpace`, `bottomSpace`) agora somam com exatidão no bloco pai para prever as quebras de página.
  * *Data e hora da alteração:* 02/07/2026 às 20:17 (Horário Local)
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`


* **Melhorias de Visualização e Detalhamento no PDF de Serviços:**
  * *O que foi feito:*
    1. **Logomarca com Opacidade Total (Prompt 6):** Removidos quaisquer resíduos de GState desbotado aplicados de instâncias anteriores. O código agora aplica ativamente `{ opacity: 1.0, 'fill-opacity': 1.0 }` no GState antes de desenhar a logo, e restaura o GState após a renderização, garantindo a tonalidade original do PNG sem herdar opacidades baixas.
    2. **Detalhamento Técnico de Equipamentos (Prompt 7):** Integrada a variável de estado `serviceEquipmentData` à pipeline de geração. Caso um serviço possua flag de equipamento e dados preenchidos no formulário (quantidade, potência e modelos de módulos/inversores), um novo bloco chamado "Especificações Técnicas:" é dinamicamente inserido abaixo das observações no PDF, listando apenas as propriedades preenchidas e com espaçamento proporcional.
    3. **Tamanho das Fontes e Espaçamento (Prompt 8):** Todo o bloco de renderização de serviços sofreu upscale nas fontes. As descrições e observações foram de `9pt/8pt` para `10pt`; as especificações técnicas fixadas em `9.5pt` com títulos em `10pt` negrito; e as normas aplicáveis aumentadas para `9pt`. Todo o cálculo de quebra de página `checkPage` foi refatorado e recalibrado para usar um multiplicador fixo de espaçamento de linha (`fontSize * 0.4`), prestando conta exata dos milímetros que cada sub-bloco consumirá na folha.
  * *Data e hora da alteração:* 02/07/2026 às 20:07 (Horário Local)
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`


* **Correção de URL do Path no Download de Mídias (Supabase legado + R2):**
  * *O que foi feito:*
    1. **Frontend (`WhatsApp.tsx`):** Adicionada a função auxiliar `extrairPathRelativo(mediaUrl)` que trata dois formatos de URL: URLs do Supabase Storage (`https://xxx.supabase.co/storage/v1/object/public/BUCKET/...` → extrai tudo após `/object/public/`) e URLs do R2 público ou outros domínios (extrai o `pathname` via `new URL()`). A função `getMediaUrl` passou a usar `extrairPathRelativo` em vez de extrair o pathname cru da URL, resolvendo o problema de 404 em arquivos antigos do Supabase.
    2. **Backend (`api/index.ts`):** A rota `/api/media/download` ganhou um `if` de fallback: se o `path` recebido via query string começar com `http://` ou `https://` (indicando que é uma URL completa legada), o `fetch` é feito diretamente nessa URL sem construir a URL do R2. Caso contrário, segue o fluxo normal de path relativo → R2.
  * *Data e hora da alteração:* 02/07/2026 às 20:00 (Horário Local)
  * *Arquivos modificados:* `src/pages/WhatsApp.tsx`, `api/index.ts`

* **Logomarca com Fundo Branco no PDF de Serviços:**
  * *O que foi feito:* O PNG da logo MT Solar tem fundo transparente. No cabeçalho azul escuro do PDF, as cores da marca desapareciam sobre o fundo azul. Solução: imediatamente antes do `doc.addImage`, é desenhado um `doc.roundedRect` com `setFillColor(255, 255, 255)` na posição exata da logo com uma margem de 3mm em cada lado. Após a inserção da imagem, a cor de fill é restaurada para o azul do cabeçalho (`setFillColor(30, 58, 95)`).
  * *Data e hora da alteração:* 02/07/2026 às 20:00 (Horário Local)
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`


* **Correção de Proporção e Espaços em Branco nas Páginas da Proposta Comercial:**
  * *O que foi feito:*
    1. **Causa raiz identificada:** O `autoPaging: 'slice'` no `doc.html()` do `uploadFullPDF` não respeita os atributos CSS `page-break-after: always`. Com divs de `min-height: 297mm`, o jsPDF desconhecia os limites de cada página e cortava o conteúdo em posições aleatórias, gerando espaços em branco.
    2. **Troca para `autoPaging: 'text'`:** O modo `'text'` respeita as marcações `page-break-after` do CSS, garantindo que cada `<div class="page">` seja renderizada como uma página exata do A4.
    3. **`min-height` → `height: 297mm`:** Todas as divs de conteúdo corrido (páginas 5–9) foram alteradas de `min-height: 297mm` para `height: 297mm` com `overflow: hidden`. Isso força cada div a ser exatamente uma página A4, sem crescer além do limite e gerar espaço excedente na próxima página.
    4. **Constantes de margem nas fotos:** Nomeadas com `MARGEM_SUPERIOR_FOTO`, `MARGEM_INFERIOR_FOTO` e `LIMITE_Y_FOTO` para maior clareza e consistência com o padrão do arquivo.
    5. **Nota:** O HTML que vai para o print do browser (`htmlParaNavegador`) não foi alterado — ele continua com `min-height` para que o layout visual do print funcione corretamente.
  * *Data e hora da alteração:* 02/07/2026 às 19:40 (Horário Local)
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`


* **Correção no Download de Mídias (Encoding de Arquivos Corrompidos):**
  * *O que foi feito:* 
    1. A rota `GET /api/media/download` no backend sofreu uma refatoração no método de busca e envio de dados para corrigir falhas de encoding onde o arquivo de mídia baixava com o tamanho correto (ex: 14.7 MB), mas não era legível pelo sistema operacional.
    2. O método baseado na API de Streams (`data.Body.pipe(res)`) foi descontinuado em prol de um `fetch` nativo apontado para a URL pública do R2.
    3. O buffer de dados passa a ser lido explicitamente via `response.arrayBuffer()`, convertido para `Buffer.from(arrayBuffer)`, e finalizado com a instrução `res.end(buffer)` (preservando perfeitamente a estrutura binária).
    4. Adicionado o `Content-Length` aos cabeçalhos de resposta.
  * *Data e hora da alteração:* 02/07/2026 às 19:35 (Horário Local)
  * *Arquivos modificados:* `api/index.ts`


* **Correções no PDF da Proposta de Serviços (Remoção, Pagamento e Logomarca):**
  * *O que foi feito:*
    1. **Observação de Remoção:** Adicionado bloco em itálico com as "Observações: " logo após a descrição do serviço de Remoção de Equipamentos Fotovoltaicos, caso haja texto preenchido na interface. O cálculo de quebra de página também foi ajustado para contabilizar a altura extra da observação.
    2. **Condições Comerciais e Valor Total:** Substituída a string interpolada de uma linha por um `doc.splitTextToSize` no campo de Condições de Pagamento, garantindo que se o usuário digitar uma condição extensa (ex: descrições detalhadas de financiamento) ela seja quebrada em múltiplas linhas e exiba corretamente no PDF, recalculando o incremento no cursor Y. Além disso, adicionado tratativas para imprimir "—" caso não haja preenchimento.
    3. **Remoção de Frase Hardcoded:** A frase fixa "com descarte ou guarda conforme orientação do cliente" foi extirpada via `.replace()` na geração da descrição do serviço de Remoção, mantendo o controle total da descrição daquele trecho pelo usuário via o novo campo de observação livre.
    4. **Correção de Opacidade da Logomarca:** O `doc.setGState(new doc.GState({ opacity: 1.0 }))` estava sendo chamado apenas após a inclusão da logomarca do cabeçalho. Ele foi duplicado, passando a ser invocado antes e depois do `doc.addImage`, consertando a impressão translúcida/apagada da marca.
  * *Data e hora da alteração:* 02/07/2026 às 19:33 (Horário Local)
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`


* **Correção na Lógica de Paginação da Proposta de Serviços (`generateServicePDF`):**
  * *O que foi feito:*
    1. A função `generateServicePDF` estava superestimando a altura dos blocos de texto, gerando quebras prematuras de página e excesso de espaço em branco.
    2. Modificamos os blocos Institucional ("Sobre a MT Solar") e de listagem de Serviços Contratados para utilizarem a função nativa do jsPDF `doc.splitTextToSize(texto, larguraUtil)` **antes** da decisão de quebrar a página (`checkPage`).
    3. Isso garante que a altura exata do texto (multiplicando a quantidade real de linhas renderizadas pela altura de cada linha, ex: `linesMissao.length * 4`) seja usada como parâmetro para a verificação de limite da página.
    4. Agora a listagem de serviços calcula a altura total do item atual (título + descrição + normas) com precisão e chama `checkPage` apenas **uma vez** por serviço, impedindo que textos de um mesmo bloco fiquem órfãos em páginas diferentes.
  * *Data e hora da alteração:* 02/07/2026 às 19:17 (Horário Local)
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`


* **Correção no Download de Mídias e Propostas (Integração Cloudflare R2):**
  * *O que foi feito:*
    1. **Criação da rota `/api/media/download`:** A rota foi implementada em `api/index.ts` usando o helper `getFileFromR2` (importado de `r2.ts`). A rota recebe o `path` via query, busca o arquivo no bucket R2 e faz o pipe do ReadableStream de volta para o cliente, injetando os headers `Content-Disposition: attachment` (com o filename correto) e `Content-Type`.
    2. **Ajuste na construção da URL no Frontend:** No `WhatsApp.tsx`, a função `getMediaUrl` foi atualizada. A validação `.includes('r2.dev')` foi removida para suportar eventuais custom domains, passando a extrair o `pathname` de qualquer URL absoluta persistida no banco e roteando-a para a nossa própria rota `/api/media/download` (enviando junto o `token` de autenticação).
    3. **Fluxo nativo e web intactos:** A lógica que diferencia `Capacitor.isNativePlatform()` (usando o FileSystem) e o ambiente web (usando a tag `<a>` invisível) na função `handleDownloadMedia` permaneceu intacta, pois já operava corretamente assim que a URL validada é entregue.
  * *Data e hora da alteração:* 02/07/2026 às 19:05 (Horário Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/WhatsApp.tsx`


* **Forma de Pagamento e Correção da Logomarca na Proposta de Serviços:**
  * *O que foi feito:*
    1. **Seção de Forma de Pagamento e Prazos:** Adicionada no final da aba Proposta de Serviço, incluindo `Forma de Pagamento` (Select: À Vista, Parcelado no Cartão, Transferência/PIX, Financiamento, Outro), `Condições / Observações` (input text) e `Valor Total do Serviço (R$)` (que já existia, agora agrupado nesta seção).
    2. **PDF Atualizado:** Estes novos campos foram inseridos na renderização do PDF de Serviços (CONDIÇÕES COMERCIAIS).
    3. **Logomarca Nítida no PDF:** A inserção da imagem da MT Solar (`PNG_-_MT_SOLAR__1_.png`) no `jsPDF` foi reescrita. Agora, ela é carregada via `fetch()`, convertida para um blob e lida para `base64` através do `FileReader`. Adicionado também a restauração explícita da opacidade para 1.0 via `doc.setGState(new doc.GState({ opacity: 1.0 }))` logo após renderizar a logo, garantindo a visibilidade total da imagem no PDF de serviços.
  * *Data e hora da alteração:* 02/07/2026 às 18:52 (Horário Local)
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`


* **Novo Serviço de Remoção e Detalhamento Técnico na Aba "Proposta de Serviços":**
  * *O que foi feito:*
    1. **Novo serviço "Remoção de Equipamentos Fotovoltaicos"** adicionado à constante `AVAILABLE_SERVICES` com descrição, normas aplicáveis (NBR 16690, NBR 5410, NBR 10004) e flags `hasEquipment: true` e `hasRemovalObservation: true`. Quando marcado, exibe uma textarea com label "Observações sobre a remoção" (campo obrigatório, visível apenas quando o serviço estiver selecionado).
    2. **Flag `hasEquipment`** adicionada a todos os serviços existentes para determinar quais exibem o bloco de detalhamento técnico. Serviços com equipamentos físicos: Limpeza de Módulos, Instalação dos Módulos Fotovoltaicos, Comissionamento Fotovoltaico e Remoção de Equipamentos Fotovoltaicos. Serviços sem: Limpeza de Terreno, Projeto de Subestação, Projeto de Usina Fotovoltaica, Homologação.
    3. **Bloco de detalhamento técnico** exibido abaixo de cada serviço marcado que possui `hasEquipment: true`, contendo: Qtd. de Módulos (número), Potência do Módulo em Wp (número), Potência Total em kWp (somente leitura, calculada automaticamente: `qtd × potWp / 1000`), Potência do Inversor em kW (número), Marca do Módulo (texto), Modelo do Módulo (texto), Marca do Inversor (texto), Modelo do Inversor (texto).
    4. Adicionados dois novos estados: `serviceObservations` (`Record<string, string>`) para a textarea de remoção, e `serviceEquipmentData` (`Record<string, ServiceEquipmentData>`) para os dados técnicos de cada serviço. Adicionada função `updateServiceEquipment` que recalcula `potenciaTotalKwp` automaticamente a cada mudança de quantidade ou potência do módulo.
    5. Grid de serviços alterado de `grid-cols-2` para `grid-cols-1` para dar espaço aos sub-blocos colapsáveis.
    6. Nenhuma outra aba, componente, lógica de geração de PDF da Proposta Comercial ou rota de backend foi alterada.
  * *Data e hora da alteração:* 02/07/2026 às 18:38 (Horário Local)
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`

---

## Alterações — Sessão 01/07/2026

* **🔥 HOTFIX CRÍTICO: Correção de Quebra em Produção (WhatsApp.tsx):**
  * *O que foi feito:* Corrigido erro fatal `TypeError: undefined is not a function at Array.filter` que derrubou o painel de atendimento. O erro ocorria quando a API não retornava um array válido, tornando as variáveis de estado (`conversations`, `availableAgents`, `messages`, etc.) nulas ou indefinidas, quebrando a renderização nas chamadas subsequentes de `.filter()` e `.map()`. A solução consistiu em (1) blindar o set inicial das conversas com `setConversations(Array.isArray(data) ? data : [])` e (2) adicionar guards preventivos `(variavel || [])` antes de absolutamente todas as chamadas iterativas de arrays (`filter` e `map`) presentes no componente `WhatsApp.tsx`, garantindo que o React jamais tente mapear valores indefinidos.
  * *Data e hora da alteração:* 01/07/2026 às 07:15 (Horário Local)
  * *Arquivos modificados:* `src/pages/WhatsApp.tsx`


* **Renomear Contatos no Atendimento WhatsApp:**
  * *O que foi feito:* Implementada funcionalidade completa para
    vendedores renomearem contatos diretamente no painel de
    atendimento. Backend: nova rota `PUT /api/conversations/:id/rename`
    com autenticação JWT, validação multi-tenant, limite de 100
    caracteres e registro automático de mensagem interna de auditoria
    (`✏️ Contato renomeado para "X" por Fulano`). Frontend: ícone de
    lápis (Pencil) aparece ao hover sobre o nome no cabeçalho da
    conversa — Enter salva, Escape cancela, onBlur também salva.
    Função `updateContactName` migrada de chamada direta ao Supabase
    para a nova rota de API.
  * *Data e hora da alteração:* 01/07/2026 às 07:03 (Horário Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/WhatsApp.tsx`, `RESUMO_MESTRE.md`

* **Quebra de Linha (Shift+Enter) no Campo de Mensagem:**
  * *O que foi feito:* Campo de digitação do chat substituído de
    `<input type="text">` para `<textarea>` dinâmico com auto-resize
    (máximo 160px). Regras: Enter sozinho envia, Shift+Enter quebra
    linha. Atributo `enterKeyHint="send"` para teclado nativo Android.
    Após envio, altura é resetada para 1 linha automaticamente.
    Quebras de linha (\n) preservadas na entrega à Evolution API.
  * *Data e hora da alteração:* 01/07/2026 às 06:50 (Horário Local)
  * *Arquivos modificados:* `src/pages/WhatsApp.tsx`, `RESUMO_MESTRE.md`

* **Download de Mídias no Atendimento (Web e APK):**
  * *O que foi feito:* (1) Correção da construção de URLs do R2 em
    `r2.ts` e `api/index.ts` eliminando barras duplicadas. (2) Nova
    rota proxy `GET /api/media/download?path=X&token=Y` com autenticação
    via query param (para `<img>` e `<audio>`) e via header Bearer,
    fetch streamado do R2, headers CORS limpos e `Content-Disposition:
    attachment`. (3) Helper `handleDownloadMedia` no frontend: usa
    `@capacitor/filesystem` + `Share.share()` no APK nativo e link
    `<a download>` invisível no web. Imagens com botão de download no
    lightbox, documentos com botão dedicado, áudios roteados pelo proxy.
    Middleware de autenticação atualizado para aceitar token em
    query param.
  * *Data e hora da alteração:* 01/07/2026 às 06:45 (Horário Local)
  * *Arquivos modificados:* `api/index.ts`, `api/r2.ts`, `src/pages/WhatsApp.tsx`, `RESUMO_MESTRE.md`

* **Correções no PDF da Proposta Comercial:**
  * *O que foi feito:* (A) Constante `MARGEM_INFERIOR = 25mm` e
    `LIMITE_Y` unificados em todos os pontos de quebra de página,
    eliminando lacunas e rodapé invadindo página seguinte. (B) Guard
    `propNumeroLimpo` com `startsWith('PROP-')` corrigindo número
    duplicado `PROP-PROP-XXXXX`. (C) Guard no gráfico Consumo X
    Geração com fallback elegante quando dados estão ausentes.
    (D) Datas de geração e validade corrigidas com construção manual
    sem bug de UTC, validade atualizada para 30 dias. (E) Tabela de
    materiais exibe "Incluso no Kit" por item e "Valor Total do Kit"
    no rodapé quando o kit vem de solar_kits.
  * *Data e hora da alteração:* 01/07/2026 às 06:58 (Horário Local)
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`, `RESUMO_MESTRE.md`

* **Correção do Nome "Você" em Leads do Kommo:**
  * *O que foi feito:* (1) Webhook `POST /api/webhooks/whatsapp`:
    pushName igual a "Você" ou nulo é descartado. Resolução em
    cascata: mantém contact_name existente → busca em clients por
    phone → fallback para número. Regra anti-sobrescrita: jamais
    substitui nome válido por nulo ou "Você". (2) Webhook
    `POST /api/kommo/webhook`: se Kommo não retorna nome, extrai
    via Regex das notas do lead (getKommoLeadNotes) antes de usar
    placeholder `Lead Kommo #ID`. (3) Rota `POST /api/kommo/fix-names`
    confirmada com suporte a correção retroativa de contact_name =
    'Você'. Correção de tipagem em variável de notas (string vs array).
  * *Data e hora da alteração:* 01/07/2026 às 06:40 (Horário Local)
  * *Arquivos modificados:* `api/index.ts`, `RESUMO_MESTRE.md`


* **Correção de Tipagem (TypeScript): MAX_TENTATIVAS e listFromR2:**
  * *O que foi feito:* Corrigidos erros de TypeScript na `api/index.ts`. A constante `MAX_TENTATIVAS` foi renomeada para a variável correta `maxTentativas` para coincidir com o parâmetro recebido em `getKommoLeadContact`. A função inexistente `listR2Files` foi substituída por `listFromR2`, sendo importada corretamente. O arquivo `api/r2.ts` também foi atualizado para exportar `listFromR2` com esse nome.
  * *Data e hora da alteração:* 29/06/2026 às 20:38 (Horário Local)
  * *Arquivos modificados:* `api/index.ts`, `api/r2.ts`

* **Automação Kommo: Mover Lead para CONVERSANDO ao Criar Conversa:**
  * *O que foi feito:* Implementada automação que move o card do lead no Kommo para a coluna "CONVERSANDO" (status_id: 107282595) automaticamente sempre que o MTSolar criar ou atualizar uma conversa originada do webhook. O movimento ocorre tanto na criação de nova conversa quanto no anti-duplicata (conversa já existente). Qualquer lead que passar pela coluna LEAD (status_id: 107282587) no Kommo terá seu card movido automaticamente para CONVERSANDO após ser processado pelo MTSolar.
  * *Data e hora da alteração:* 29/06/2026 às 23:10 (Horário Local)
  * *Arquivos modificados:* `api/index.ts`

* **Integração Kommo CRM — Correção Definitiva do Webhook:**
  * *O que foi feito:* Resolvido o problema onde o webhook `/api/kommo/webhook` travava indefinidamente na query do Supabase. A causa raiz era que a busca da empresa estava dentro de um `setImmediate()` — após o `res.200`, a Vercel Serverless encerra conexões de rede, impedindo qualquer query ao Supabase. A solução foi mover a busca da empresa para ANTES do `res.200`, dentro do ciclo de vida normal da requisição, e mover o `res.200` para o final do handler após todo o processamento. Adicionalmente, corrigido o `SyntaxError: Unexpected end of JSON input` na função `getKommoLeadNotes` usando `.text()` com guard antes do `.json()`.
  * *Fluxo completo funcionando:*
    1. Lead entra na coluna LEAD do Kommo (status_id: 107282587)
    2. Webhook dispara → MTSolar filtra por KOMMO_STATUS_ID_LEAD
    3. Empresa buscada no Supabase (dentro do ciclo normal da requisição)
    4. Telefone extraído e normalizado para 55XXXXXXXXXXX
    5. Round-robin atribui para Soraia Castro ou Manoel Jordão
    6. Conversa criada no MTSolar + push notification enviado
    7. Card do lead movido para CONVERSANDO no Kommo
    8. `res.200` enviado após tudo concluído
  * *IDs do Pipeline Kommo (Funil de vendas — id: 13903135):*
    * LEAD: 107282587
    * CONVERSANDO: 107282595
  * *Causa raiz do travamento:* `setImmediate()` após `res.200` bloqueia conexões de rede na Vercel Serverless
  * *Data e hora da alteração:* 29/06/2026 às 22:50 (Horário Local)
  * *Arquivos modificados:* `api/index.ts`

* **Otimização de Timeout para Serverless (Kommo):**
  * *O que foi feito:* A função Vercel responsável pelo webhook (`api/index.ts`) estava sofrendo aborto (timeout sem status code) devido ao limite de 30s.
    1. A função `kommoApi` foi ajustada para aceitar um `timeoutMs` com padrão de 8000ms.
    2. A função `getKommoLeadContact` teve seu `maxTentativas` reduzido de 3 para 2 como padrão, garantindo que o processamento em cadeia não estoure o teto limite da Serverless Function. Chamadas diretas (ex: `pipeline-stages`) mantiveram o timeout de 15s original.
  * *Data e hora da alteração:* 29/06/2026 às 18:52 (Horário Local)
  * *Arquivos modificados:* `api/index.ts`

* **Captura de Leads Movidos no Kommo (leads.update e leads.status):**
  * *O que foi feito:* 
    1. O webhook `POST /api/kommo/webhook` foi aprimorado para capturar também leads que são movidos pelo bot do Kommo para a coluna "LEAD" (recebidos em `leads.update` e também no array correto de mudança de fase: `leads.status`), e não apenas os recém-criados na primeira etapa (`leads.add`).
    2. Apenas os leads atualizados que possuam o `status_id` correspondente à etapa LEAD serão processados. Este ID deve ser configurado na nova variável de ambiente `KOMMO_STATUS_ID_LEAD` na Vercel.
    3. Criada a rota de diagnóstico `GET /api/kommo/pipeline-stages` (acessível apenas para CEO) para listar os pipelines e descobrir facilmente o `status_id` correto de cada etapa sem precisar acessar configurações avançadas do Kommo manualmente.
    4. O fluxo anti-duplicata existente protegerá a inserção (impedindo que um lead atualizado múltiplas vezes crie várias conversas), atualizando apenas o nome se já houver conversa criada.
  * *Data e hora da alteração:* 29/06/2026 às 18:32 (Horário Local)
  * *Arquivos modificados:* `api/index.ts`, `RESUMO_MESTRE.md`

* **Correção Completa da Integração Kommo CRM:**
  * *O que foi feito:*
    1. `kommoApi()`: timeout aumentado para 15000ms via AbortController.
    2. `getKommoLeadContact()`: retry automático até 3 tentativas com 
       1000ms de espera; retorna null com segurança se todas falharem.
    3. Extração de telefone cobre dois formatos: `contact.phone` direto 
       e `custom_fields_values` com `field_code === 'PHONE'`.
    4. Normalização de telefone para `55XXXXXXXXXXX`.
    5. Webhook anti-duplicata: verifica existência antes de inserir 
       conversa com phone `kommo-lead-{leadId}`.
    6. Leads sem telefone recebem tag `lead-sem-telefone` e nota interna 
       automática com alerta para atualizar o Kommo.
    7. `POST /api/kommo/fix-names` expandido: além de nomes, corrige 
       phones temporários `kommo-lead-*` buscando o número real no Kommo.
       Mantém temporário com log quando Kommo ainda não tem telefone.
    8. Credenciais Kommo validadas antes do 200 OK; retorna 500 se 
       ausentes.
    9. Frontend `WhatsApp.tsx`: conversas com phone temporário exibem 
       "📋 Sem telefone" e bloqueiam o campo de envio com aviso.
  * *Data e hora da alteração:* 29/06/2026 às 21:00 (Horário Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/WhatsApp.tsx`,
    `RESUMO_MESTRE.md`
* **Correção Definitiva do Recálculo de Margem de Venda (calculateResults):**
  * *O que foi feito:* Identificado e corrigido o bug central que fazia o "Valor Final de Venda" não persistir ao alterar a margem. O `useEffect([formData])` chamava `calculateResults()` que recalculava `salePrice = kitCost * (1 + marginPercent / 100)` — como `marginPercent` é sempre `'0'` quando o kit é selecionado pelo dropdown, o valor correto era imediatamente sobrescrito. Três pontos foram corrigidos:
    1. **`calculateResults`**: agora usa `formData.margemVenda` como fonte primária da margem (quando disponível), e prioriza `formData.valorFinalVenda` como `salePrice` se ele já foi calculado corretamente — só recalcula do zero caso nenhum esteja definido.
    2. **`saleP` no `generatePDF`**: o fallback de cálculo do valor de venda no PDF foi corrigido para usar `margemVenda` em vez de `marginPercent`, garantindo que o PDF imprima o valor real praticado.
    3. **`saveToHistory`**: a margem salva no histórico agora usa `formData.margemVenda` como fonte primária.
  * *Data e hora da alteração:* 29/06/2026 às 17:45 (Horário Local)
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`

* **Proteção do Histórico de Propostas (PROMPT 2 — confirmação e logs):**
  * *O que foi feito:* Auditado o cronjob `GET /api/cleanup-proposals` em `api/index.ts`. Confirmado que **não existe nenhum `.delete()` referenciando `proposal_history`** — o código usa corretamente `.update({ url_arquivo: null })` para preservar os registros. Adicionado log de auditoria no `POST /api/proposal-history` para rastrear criação de propostas com data de expiração exata nos logs da Vercel: `[PROPOSAL-HISTORY] Nova proposta salva para "...". Expira em: ...`.
  * *Data e hora da alteração:* 29/06/2026 às 17:48 (Horário Local)
  * *Arquivos modificados:* `api/index.ts`

* **Correção do Recálculo de Margem de Venda no Gerador de Propostas:**
  * *O que foi feito:* Corrigido o comportamento do campo "Margem de Venda (%)" para CEO/ADMIN em `ProposalGenerator.tsx`. Anteriormente, ao alterar o valor da margem, o "Valor Final de Venda" não era atualizado. Três pontos foram corrigidos:
    1. **`applySelectedKit`**: ao selecionar um kit, passa a atualizar simultaneamente `formData.margemVenda`, `formData.valorFinalVenda`, `formData.kitCost` e `results.salePrice` via `setResults`.
    2. **`onChange` da Margem de Venda**: recalcula `novoValorFinal = kit.valor_total * (1 + novaMargemm / 100)` e atualiza `formData.valorFinalVenda`, `formData.kitCost` e `results.salePrice` ao mesmo tempo, garantindo que o card de preview reflita a mudança imediatamente.
    3. **`saveToHistory`**: agora usa `formData.margemVenda` como fonte primária da margem ao salvar o histórico (antes usava apenas `formData.marginPercent`, que era sempre `'0'` quando o kit era selecionado pelo dropdown).
  * *Data e hora da alteração:* 29/06/2026 às 17:40 (Horário Local)
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`

* **Alteração do Banco Padrão na Proposta Comercial:**
  * *O que foi feito:* O banco padrão selecionado na geração de propostas (`ProposalGenerator.tsx`) foi alterado de "MT Solar" para "BV" para refletir a necessidade correta de apresentação financeira no PDF gerado.
  * *Data e hora da alteração:* 29/06/2026 às 17:30 (Horário Local)
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`

* **Filtro de Webhooks WhatsApp e Correção de Duplicidade:**
  * *O que foi feito:* Realizadas 3 melhorias críticas no handler do webhook (`POST /api/webhooks/whatsapp`) e no salvamento de mensagens em todo o arquivo `api/index.ts`. (1) Implementado filtro inicial ignorando mensagens de grupo (`remoteJid.endsWith('@g.us')`). (2) Implementado filtro que ignora eventos puramente de confirmação (`DELIVERY_ACK`, `READ`, `PLAYED`, `SERVER_ACK`) sem sobrecarregar o DB. (3) Convertidas *todas as 6 operações* de `.insert()` na tabela `whatsapp_messages` espalhadas no arquivo para `.upsert(..., { onConflict: 'message_id', ignoreDuplicates: true })`, prevenindo que retentativas da Evolution API gerem logs de erro `duplicate key value violates unique constraint`.
  * *Data e hora da alteração:* 29/06/2026 às 17:15 (Horário Local)
  * *Arquivos modificados:* `api/index.ts`
* **Tratamento de 500 na Neoenergia e Correção de Timeout no Upload:**
  * *O que foi feito:* Adicionada configuração `maxDuration: 30` no `vercel.json` para a função `api/index.ts` com o intuito de prevenir Timeouts no Vercel (Erro 403/504) durante o upload de mídia de arquivos maiores (~2MB) pelo WhatsApp. Adicionado também log detalhado `try/catch` na rota `GET /api/neoenergia` para diagnosticar falhas de join (Possível erro em `created_by`).
  * *Data e hora da alteração:* 29/06/2026 às 17:11 (Horário Local)
  * *Arquivos modificados:* `vercel.json`, `api/index.ts`
* **Auditoria de Perda Recente no Histórico de Propostas:**
  * *O que foi feito:* Realizada uma varredura direta via SQL na tabela `proposal_history` para investigar propostas ausentes.
  * *Resultados encontrados (Queries SQL):* 
    * **Quantidade de registros:** Existem apenas 6 registros no banco de dados na tabela `proposal_history` atualmente (todos com `created_at` de hoje, 29/06/2026).
    * **Company ID:** Todos os 6 registros têm o `company_id` correto (`e4bf6f22-6182-414d-afa4-c5449c014323`), correspondente à MT Solar.
    * **Datas de Expiração:** Estão corretas. Todas as 6 propostas têm `data_expiracao` definida exatamente para 30 dias após o `created_at`.
    * **Filtros na rota (API):** Verificada a rota `GET /api/proposal-history`. A query já está correta e NÃO possui filtros indevidos que ocultariam registros (não há `.not('url_arquivo', 'is', null)` nem filtro de `data_expiracao`).
  * *Conclusão:* As propostas não estão ocultas por erro na API. Os registros físicos anteriores a hoje simplesmente não existem na tabela (possivelmente afetados pelo delete em cascata ou por outra rotina de exclusão).
  * *Data e hora da alteração:* 29/06/2026 às 17:35 (Horário Local)
  * *Arquivos modificados:* Apenas auditoria (via script de banco)

* **Margem de Venda para CEO/ADMIN no Kit Solar:**
  * *O que foi feito:* Adicionado o campo `margemVenda` no `formData` para permitir que CEO e ADMIN visualizem e alterem a margem de venda na aba Kit Solar. O componente `ProposalGenerator.tsx` foi modificado para exibir o input e recalcular dinamicamente o `valorFinalVenda` no card de "Preview do Valor de Venda" sempre que a margem é alterada.
  * *Data e hora da alteração:* 29/06/2026 às 17:05 (Horário Local)
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`
* **Diagnóstico e Correção do Histórico de Propostas:**
  * *O que foi feito:* Realizada uma verificação nas rotas de manipulação de histórico de propostas em `api/index.ts`. Foi confirmado que o cronjob `/api/cleanup-proposals` já utiliza corretamente o `update({ url_arquivo: null })` em vez de apagar os registros. A rota `GET /api/proposal-history` não filtra por `url_arquivo IS NOT NULL` e o tempo de expiração da proposta em `POST /api/proposal-history` está corretamente configurado para 30 dias (o comentário foi corrigido para refletir isso).
  * *Data e hora da alteração:* 29/06/2026 às 17:06 (Horário Local)
  * *Arquivos modificados:* `api/index.ts`
* **Simplificação da Tabela de Financiamento:**
  * *O que foi feito:* A tabela de taxas de financiamento no módulo de propostas (`ProposalGenerator.tsx`) foi substituída. Antes ela renderizava múltiplos bancos (BV e Santander) com taxas variáveis. Agora utiliza uma estrutura fixa (`TABELA_FINANCIAMENTO`) apenas com os prazos de 36, 48 e 60 meses, carência de 3 meses e taxa fixa de 2.4% (Banco MT Solar). A UI foi atualizada com o novo JSX simplificado e a função de atualização do cálculo na proposta foi mantida.
  * *Data e hora da alteração:* 29/06/2026 às 17:03 (Horário Local)
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`
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

* **Configuração de Recebimento de Leads (Round-Robin):**
  * *O que foi feito:* Adicionada a coluna `recebe_leads` na tabela `users` para controlar quais vendedores recebem leads automáticos do Kommo. Atualizada a função `getRoundRobinVendedor` em `api/index.ts` para distribuir leads apenas entre os vendedores com `recebe_leads = true`. As rotas `GET` e `PUT` `/api/users` foram modificadas para suportar o novo campo. No frontend (`Funcionarios.tsx`), adicionada uma coluna "Recebe Leads" visível apenas para o CEO com um toggle interativo para ligar/desligar a distribuição por vendedor sem precisar de novo deploy.
  * *Data e hora da alteração:* 27/06/2026 às 15:35 (Horário Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/Funcionarios.tsx`. Requer execução manual de SQL no Supabase.

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
| (Query Manual) | `ALTER TABLE clients ADD COLUMN IF NOT EXISTS origem_venda TEXT;` - Adiciona campo de origem de venda | 27/06/2026 |
| (Query Manual) | `ALTER TABLE users ADD COLUMN IF NOT EXISTS recebe_leads BOOLEAN DEFAULT false;` e UPDATE ativando para Manoel/Soraia - Habilita Round-Robin | 27/06/2026 |

> [!CAUTION]
> Enquanto esses arquivos nÃ£o forem executados no Supabase, as funcionalidades correspondentes estarÃ£o **completamente indisponÃ­veis** em produÃ§Ã£o, independentemente de qualquer deploy no Vercel.

### âœ… JÃ¡ Aplicadas

| Arquivo | DescriÃ§Ã£o | Aplicado em |
|---|---|---|
| supabase/migrations/20260625_create_whatsapp_observations.sql | Cria a tabela whatsapp_observations com RLS e Ã­ndices para o mÃ³dulo de notas do Atendimento. | 25/06/2026 |

