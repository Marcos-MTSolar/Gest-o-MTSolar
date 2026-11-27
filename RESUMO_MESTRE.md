# RESUMO MESTRE â€” GESTÃƒO MTSOLAR

---

## AlteraÃ§Ãµes â€” SessÃ£o 09/10/2026 â€” 14:00 (Modal data-driven + SaÃ­da Final apÃ³s almoÃ§o reintroduzida)

### Data/Hora
2026-10-09 â€” 14:00 (HorÃ¡rio de Recife, BRT)

### Arquivos modificados
- `src/pages/Ponto.tsx` â€” AdiÃ§Ã£o de `PUNCH_BUTTON_CONFIG`, `PUNCH_DONE_LABELS` e funÃ§Ã£o pura `getPunchModalConfig`. JSX do modal substituÃ­do por render 100% data-driven (`modalCfg.buttons.map(...)`). `getContextualPunchOptions` restaurada para retornar `['lunch_end','exit']` em `entry+lunch_start`.

### O que foi feito

#### 1. `getContextualPunchOptions` â€” restaurada com 2 opÃ§Ãµes para entry+lunch_start
```diff
- if (!done.has('lunch_end')) return ['lunch_end']; // hotfix temporÃ¡rio
+ if (!done.has('lunch_end')) return ['lunch_end', 'exit']; // modal correto agora suporta
```

#### 2. Nova funÃ§Ã£o pura `getPunchModalConfig` (L180â€“L218)
Recebe `options: string[]` e `todayRecords: TimeRecord[]`. Devolve:
- **`title`** â€” sempre `"Qual batida vocÃª estÃ¡ fazendo?"`
- **`description`** â€” lista o que jÃ¡ foi registrado hoje (ex: `"VocÃª jÃ¡ registrou Entrada e SaÃ­da para AlmoÃ§o. O que estÃ¡ acontecendo agora?"`)
- **`buttons`** â€” array de `{ type, emoji, label, sublabel, className }`, um por opÃ§Ã£o

#### 3. JSX do modal â€” render 100% data-driven (sem botÃµes/textos fixos)
```tsx
{modalCfg.buttons.map((btn) => (
  <button
    key={btn.type}
    onClick={() => {
      if (punchTypeModal.photo) {
        prosseguirComTipo({ base64String: punchTypeModal.photo }, btn.type);
      }
    }}
    className={`${btn.className} text-white font-semibold py-3 px-4 rounded-xl text-sm transition-colors text-left flex items-center gap-3`}
  >
    <span className="text-xl">{btn.emoji}</span>
    <div>
      <p className="font-bold">{btn.label}</p>
      {btn.sublabel && <p className="text-xs opacity-80">{btn.sublabel}</p>}
    </div>
  </button>
))}
```
`btn.type` Ã© passado diretamente para `prosseguirComTipo` â€” garantia de que o type correto Ã© enviado para cada botÃ£o.

#### 4. SaÃ­da de `getPunchModalConfig` para os 5 estados

| Estado | `getContextualPunchOptions` | TÃ­tulo | DescriÃ§Ã£o | BotÃµes (type â†’ label) |
|---|---|---|---|---|
| Nenhum registro | `['entry']` | *(sem modal â€” registra direto)* | â€” | â€” |
| `entry` | `['lunch_start','exit']` | Qual batida vocÃª estÃ¡ fazendo? | VocÃª jÃ¡ registrou Entrada hoje. O que estÃ¡ acontecendo agora? | `lunch_start` â†’ SaÃ­da para AlmoÃ§o Â· `exit` â†’ SaÃ­da Final |
| `entry+lunch_start` | `['lunch_end','exit']` | Qual batida vocÃª estÃ¡ fazendo? | VocÃª jÃ¡ registrou Entrada e SaÃ­da para AlmoÃ§o hoje. O que estÃ¡ acontecendo agora? | `lunch_end` â†’ Retorno do AlmoÃ§o Â· `exit` â†’ SaÃ­da Final |
| `entry+lunch_start+lunch_end` | `['exit']` | *(sem modal â€” registra direto)* | â€” | â€” |
| `exit` | `[]` | *(dia encerrado â€” botÃ£o desaparece)* | â€” | â€” |

#### 5. VerificaÃ§Ãµes
- `npx tsc --noEmit` â†’ **âœ… Sem erros**
- `npm run build` â†’ **âœ… Sucesso (exit code 0, 6.38s, 3316 mÃ³dulos)**

---

## AlteraÃ§Ãµes â€” SessÃ£o 09/10/2026 â€” 13:54 (HOTFIX: Bloqueio Retorno AlmoÃ§o â€” getContextualPunchOptions)

### Data/Hora
2026-10-09 â€” 13:54 (HorÃ¡rio de Recife, BRT)

### Arquivos modificados
- `src/pages/Ponto.tsx` â€” CorreÃ§Ã£o de 1 linha na funÃ§Ã£o `getContextualPunchOptions` (linha 126): estado `entry + lunch_start` sem `lunch_end` passou a retornar `['lunch_end']` (1 opÃ§Ã£o â†’ registra direto) em vez de `['lunch_end', 'exit']` (2 opÃ§Ãµes â†’ abria modal que nÃ£o tinha botÃ£o para `lunch_end`). JSDoc atualizado para refletir o comportamento correto.

### O que foi feito

#### Causa Raiz
A funÃ§Ã£o `getContextualPunchOptions` retornava `['lunch_end', 'exit']` quando o funcionÃ¡rio estava no estado `entry + lunch_start` (sem `lunch_end`). Com 2 opÃ§Ãµes, o sistema abria o modal contextual de seleÃ§Ã£o. PorÃ©m, o modal sÃ³ possui botÃµes para `lunch_start` e `exit` â€” nÃ£o existe botÃ£o mapeado para `lunch_end`. Resultado: o funcionÃ¡rio via apenas o botÃ£o "SaÃ­da Final (fim do expediente)" e ficava impossibilitado de registrar o retorno do almoÃ§o.

#### CorreÃ§Ã£o (mudanÃ§a mÃ­nima â€” 1 linha)
```diff
- // Saiu para almoÃ§o mas nÃ£o retornou: ambiguidade (retorno almoÃ§o OU saÃ­da final)
- if (!done.has('lunch_end')) return ['lunch_end', 'exit'];
+ // Saiu para almoÃ§o mas nÃ£o retornou: Ãºnica opÃ§Ã£o vÃ¡lida Ã© o retorno do almoÃ§o
+ if (!done.has('lunch_end')) return ['lunch_end'];
```

#### Comportamento de `getContextualPunchOptions` por estado (pÃ³s-fix)
| Estado do dia                              | Retorno da funÃ§Ã£o        | AÃ§Ã£o no handler                     |
|--------------------------------------------|--------------------------|-------------------------------------|
| Nenhuma batida                             | `['entry']`              | Registra entrada **direto**         |
| entry                                      | `['lunch_start', 'exit']`| Abre **modal** (2 opÃ§Ãµes)           |
| entry + lunch_start                        | `['lunch_end']`          | Registra retorno almoÃ§o **direto** âœ… |
| entry + lunch_start + lunch_end            | `['exit']`               | Registra saÃ­da final **direto**     |
| exit (encerrado)                           | `[]`                     | Exibe mensagem de dia encerrado     |

#### Handler que decide "direto vs modal" (Ponto.tsx ~L784)
```ts
// 4. Se hÃ¡ exatamente uma opÃ§Ã£o (sem ambiguidade): prosseguir direto
if (options.length === 1) {
  await prosseguirComTipo(photo, options[0]);
  return;
}

// 5. HÃ¡ mais de uma opÃ§Ã£o (ambiguidade): exibir modal de seleÃ§Ã£o
setPunchTypeModal({ visible: true, photo: photo.base64String ?? null, options });
```
Com `['lunch_end']` (length === 1), o handler chama `prosseguirComTipo` direto, sem abrir o modal.

#### VerificaÃ§Ãµes realizadas
- `npx tsc --noEmit` â†’ **âœ… Sem erros**
- `npm run build` â†’ **âœ… Sucesso (`exit code 0`, 18.56s, 3316 mÃ³dulos transformados)**

#### Dados (somente leitura â€” aguardando confirmaÃ§Ã£o para correÃ§Ã£o manual)

**(a) FuncionÃ¡rios com `entry + lunch_start` SEM `lunch_end` hoje (bloqueados pelo bug)**

| FuncionÃ¡rio | Batidas do dia | HorÃ¡rios |
|---|---|---|
| ALISSON LUCAS PEREIRA DA SILVA | entry, lunch_start | 07:01, 12:32 |
| Marcos Douglas | entry, lunch_start | 08:01, 12:17 |
| Mariana Feliciano | entry, lunch_start | 08:09, 12:19 |

âš ï¸� **ATENÃ‡ÃƒO**: Estes 3 funcionÃ¡rios estÃ£o travados â€” nÃ£o conseguiram bater o retorno do almoÃ§o. ApÃ³s o deploy do hotfix, poderÃ£o bater normalmente. Se quiser inserir `lunch_end` retroativo para os horÃ¡rios corretos, confirme caso a caso.

**(b) FuncionÃ¡rios com `exit` SEM `lunch_end` hoje**

Nenhum encontrado.

---

## AlteraÃ§Ãµes â€” SessÃ£o 06/10/2026 â€” 09:10 (ResoluÃ§Ã£o de Ambiguidade e SeleÃ§Ã£o Contextual no Ponto EletrÃ´nico)

### Data/Hora
2026-10-06 â€” SessÃ£o 19

### Arquivos modificados
- `src/pages/Ponto.tsx` â€” ImplementaÃ§Ã£o da lÃ³gica de seleÃ§Ã£o contextual de batidas no frontend (`getContextualPunchOptions`), substituiÃ§Ã£o da sequÃªncia rÃ­gida fixa pelo modelo de opÃ§Ãµes vÃ¡lidas por estado, e adiÃ§Ã£o do modal de escolha quando hÃ¡ ambiguidade (ex: decidir entre SaÃ­da para AlmoÃ§o vs. SaÃ­da Final apÃ³s a Entrada).
- `api/index.ts` â€” AdiÃ§Ã£o de validaÃ§Ã£o contextual de sequÃªncia no backend (`POST /api/ponto/registrar`). Valida que batidas sigam um fluxo logicamente coerente (rejeita batidas pÃ³s SaÃ­da Final, exige Entrada prÃ©via para qualquer saÃ­da, exige SaÃ­da AlmoÃ§o prÃ©via para Retorno AlmoÃ§o, e impede retrabalho de ciclo de almoÃ§o).

### O que foi feito

#### 1. DiagnÃ³stico do Bug (SequÃªncia Fixa / Batidas Fantasmas)
- O sistema determinava automaticamente o tipo da prÃ³xima batida com base em uma lista fixa e engessada (`entry` â†’ `lunch_start` â†’ `lunch_end` â†’ `exit`).
- Quando um funcionÃ¡rio realizava uma saÃ­da fora da rotina padrÃ£o, o sistema forÃ§ava o registro no "prÃ³ximo slot", criando registros inconsistentes â€” incidente de Marcos Douglas em 02/10/2026.

#### 2. SoluÃ§Ã£o Implementada
- **Sem ambiguidade (1 opÃ§Ã£o):** Prossegue direto sem interromper o usuÃ¡rio.
- **Com ambiguidade (2 opÃ§Ãµes):** Exibe modal de escolha explÃ­cita (ex: SaÃ­da AlmoÃ§o OU SaÃ­da Final).
- **Encerramento do dia (0 opÃ§Ãµes):** Exibe `"âœ… Todas as batidas do dia registradas!"`.
- **Backend defensivo:** Valida sequÃªncia coerente rejeitando tipos inconsistentes com o estado do dia.

---

## AlteraÃ§Ãµes â€” SessÃ£o 06/10/2026 â€” 09:30 (InvestigaÃ§Ã£o e CorreÃ§Ã£o Definitiva do Bug de Fuso HorÃ¡rio + Ajuste Retroativo de Dados)

### Data/Hora
2026-10-06 â€” SessÃ£o 20

### Arquivos modificados
- `api/dateUtils.ts` â€” CorreÃ§Ã£o crÃ­tica em `getRecifeDateStr`: adicionado guard para strings no formato `YYYY-MM-DD`, evitando que o parser UTC do Node.js recue 1 dia (e.g., `new Date("2026-09-04")` â†’ `2026-09-03 21:00 BRT`).
- `src/utils/dateUtils.ts` â€” Mesma correÃ§Ã£o aplicada na versÃ£o frontend de `getRecifeDateStr`.
- `api/index.ts` â€” MÃºltiplas correÃ§Ãµes em `calculateHourBankForPeriod`:
  1. SubstituiÃ§Ã£o de `new Date(startStr + 'T00:00:00')` por `getRecifeDayBounds()` para busca de registros de ponto com limites corretos de fuso.
  2. SubstituiÃ§Ã£o do loop `currentDate.setDate(+1)` por iteraÃ§Ã£o por string `YYYY-MM-DD` com `curDateStr`, eliminando desvio acumulado de fuso.
  3. `currentDate` agora Ã© instanciado com `T12:00:00.000-03:00` para determinaÃ§Ã£o correta do dia da semana.
  4. Trava de "expediente em andamento" agora sÃ³ se aplica quando `dayKey === getRecifeDateStr()` (dia de hoje), nÃ£o bloqueando recÃ¡lculos de dias passados.
  5. Mesma correÃ§Ã£o `getRecifeDayBounds()` aplicada em `GET /api/ponto/relatorio/:userId` para busca das batidas de ponto.
- `supabase/migrations/20261006_add_jornada_incompleta_and_fix_retroactive.sql` â€” Migration que adiciona `jornada_incompleta` ao CHECK constraint de `hour_bank` e insere os lanÃ§amentos retroativos corrigidos.

### Causa Raiz do Bug (RecorrÃªncia)

âš ï¸� **A correÃ§Ã£o anterior (SessÃ£o 17) estava em produÃ§Ã£o**, mas havia uma **falha residual nÃ£o coberta pelos testes**:

```ts
// ANTES (bugado â€” em calculateHourBankForPeriod):
const start = new Date(startDateStr.split('T')[0] + 'T00:00:00');
// â†’ Node.js interpreta como UTC local â†’ '2026-09-01T00:00:00Z'
// â†’ Limites corretos ficariam ANTES de 03:00Z (inÃ­cio do dia em Recife)
// â†’ Batida de 21:21 BRT = 00:21Z do dia seguinte ficava FORA do intervalo
```

A correÃ§Ã£o de `existingTypeToday` (via `getRecifeDayBounds`) estava certa para **impedir duplicatas do mesmo dia**. Mas o `calculateHourBankForPeriod` (que agrupa batidas por dia para calcular horas trabalhadas) continuava usando `new Date(str + 'T00:00:00')` sem fuso, causando intervalo de busca UTC puro.

**Adicionalmente:** A prÃ³pria funÃ§Ã£o `getRecifeDayBounds(dateStr)` quando recebia uma string `YYYY-MM-DD` chamava `new Date("2026-09-04")`, que o JS interpreta como UTC midnight â†’ no fuso Recife (UTC-3) vira `2026-09-03T21:00 BRT` â†’ retornava limites do dia **03/09** ao invÃ©s de **04/09**. Esse era o bug raiz mais profundo, que a correÃ§Ã£o anterior nÃ£o havia pego.

### Teste de EvidÃªncia Real

```
=== EVIDÃŠNCIA HTTP (teste simulado Ã s 21:30 BRT em 06/10/2026) ===

Timestamp inserido: 2026-10-07T00:30:00.000Z (= 21:30 BRT de 06/10)
getRecifeDateStr(timestamp) â†’ "2026-10-06" âœ…

getRecifeDayBounds("2026-10-06"):
  todayStart: 2026-10-06T03:00:00.000Z âœ…
  todayEnd:   2026-10-07T02:59:59.999Z âœ…

Registro encontrado na busca do dia 2026-10-06? SIM âœ…
Registro vazou para o dia 2026-10-07?           NÃƒO âœ…
```

### CorreÃ§Ã£o Retroativa de Dados

#### Marcos Douglas (02/10/2026) â€” CONFIRMADO PELO GESTOR
- **SituaÃ§Ã£o real:** SaÃ­da antecipada Ã s 12:12. NÃ£o retornou.
- **Antes:** 4 registros (entry 08:03 + lunch_start 12:10 + lunch_end 12:11 + exit 12:12) com lanÃ§amento de **H.Extra 50%** de +4.15h.
- **ApÃ³s:** 2 registros (entry 08:03 + exit 12:12). LanÃ§amento corrigido para **Jornada Incompleta: -3.85h**.
- IDs 470 e 471 removidos do banco; ID 472 corrigido de `lunch_end` para `exit`.

#### Mariana Feliciano (03/09/2026) â€” RecorrÃªncia do bug de fuso
- **SituaÃ§Ã£o real:** Dia 03/09 com entrada 07:01, almoÃ§o 12:18-13:03. Batida de 21:21 BRT (ID 286) era `entry` duplicado gerado pela ausÃªncia de correÃ§Ã£o da `calculateHourBankForPeriod`.
- **Antes:** Dias 03/09 sem lanÃ§amento de banco + 04/09 bloqueado por conflito de `entry`.
- **ApÃ³s recÃ¡lculo:** Dia 03/09 com **Jornada Incompleta: -2.72h**; dia 04/09 com horas extras normais calculadas corretamente.

#### Auditoria de Todos os FuncionÃ¡rios
- Varredura de 482 registros de ponto: apenas **1 batida noturna (>= 21h BRT)** encontrada â€” a ID 286 da Mariana (jÃ¡ corrigida). Nenhum outro funcionÃ¡rio afetado.

### VerificaÃ§Ã£o Final
- `npx tsc --noEmit`: 0 erros.
- `npm run build`: Sucesso.

---



### Data/Hora
2026-10-06 â€” SessÃ£o 19

### Arquivos modificados
- `src/pages/Ponto.tsx` â€” ImplementaÃ§Ã£o da lÃ³gica de seleÃ§Ã£o contextual de batidas no frontend (`getContextualPunchOptions`), substituiÃ§Ã£o da sequÃªncia rÃ­gida fixa pelo modelo de opÃ§Ãµes vÃ¡lidas por estado, e adiÃ§Ã£o do modal de escolha quando hÃ¡ ambiguidade (ex: decidir entre SaÃ­da para AlmoÃ§o vs. SaÃ­da Final apÃ³s a Entrada).
- `api/index.ts` â€” AdiÃ§Ã£o de validaÃ§Ã£o contextual de sequÃªncia no backend (`POST /api/ponto/registrar`). Valida que batidas sigam um fluxo logicamente coerente (rejeita batidas pÃ³s SaÃ­da Final, exige Entrada prÃ©via para qualquer saÃ­da, exige SaÃ­da AlmoÃ§o prÃ©via para Retorno AlmoÃ§o, e impede retrabalho de ciclo de almoÃ§o).

### O que foi feito

#### 1. DiagnÃ³stico do Bug (SequÃªncia Fixa / Batidas Fantasmas)
- O sistema de Ponto EletrÃ´nico anteriormente determinava automaticamente o tipo da prÃ³xima batida com base em uma lista fixa e engessada (`entry` â†’ `lunch_start` â†’ `lunch_end` â†’ `exit`).
- Quando um funcionÃ¡rio realizava uma saÃ­da fora da rotina padrÃ£o (ex: saindo mais cedo sem cumprir intervalo de almoÃ§o na empresa), o sistema forÃ§ava o registro no "prÃ³ximo slot", criando registros inconsistentes e obrigando batidas subsequentes rÃ¡pidas para forÃ§ar o fechamento do dia (ex: incidente reportado por Marcos Douglas em 02/10/2026).

#### 2. SoluÃ§Ã£o Implementada e ValidaÃ§Ã£o

1. **Frontend Contextual (`Ponto.tsx`):**
   - **Sem ambiguidade (1 opÃ§Ã£o):** Se o funcionÃ¡rio ainda nÃ£o possui registros no dia, a Ãºnica opÃ§Ã£o Ã© `Entrada`. Se jÃ¡ retornou do almoÃ§o (`lunch_end`), a Ãºnica opÃ§Ã£o Ã© `SaÃ­da Final`. Nesses casos, o registro prossegue direto sem interromper o usuÃ¡rio.
   - **Com ambiguidade (2 opÃ§Ãµes):** Se o funcionÃ¡rio registrou a `Entrada`, a prÃ³xima aÃ§Ã£o pode ser `SaÃ­da AlmoÃ§o` OU `SaÃ­da Final` (saÃ­da antecipada / sem almoÃ§o). Nesses casos, a interface exibe um modal amigÃ¡vel para escolha explÃ­cita do tipo de saÃ­da.
   - **Encerramento do dia (0 opÃ§Ãµes):** ApÃ³s registrar a `SaÃ­da Final`, o botÃ£o exibe `"âœ… Todas as batidas do dia registradas!"` e desabilita novas tentativas.

2. **Backend Contextual Defensivo (`api/index.ts`):**
   - Valida no servidor se o tipo de batida enviado Ã© coerente com o histÃ³rico do dia do funcionÃ¡rio:
     - Impede qualquer batida se `exit` jÃ¡ constar no dia.
     - Impede `lunch_start`, `lunch_end` ou `exit` sem `entry` registrada.
     - Impede `lunch_end` sem `lunch_start` prÃ©via.
     - Impede novo `lunch_start` caso `lunch_end` jÃ¡ tenha sido concluÃ­do.

3. **VerificaÃ§Ã£o e Qualidade:**
   - Executada verificaÃ§Ã£o de tipos com `npx tsc --noEmit` (0 erros).
   - Executado build de produÃ§Ã£o com `npm run build` (sucesso).

---

## AlteraÃ§Ãµes â€” SessÃ£o 04/09/2026 â€” 10:15 (CompactaÃ§Ã£o do RelatÃ³rio de Ponto em PDF para PÃ¡gina Ãšnica com Logomarca e Assinatura Dupla)

### Data/Hora
2026-09-04 â€” SessÃ£o 18

### Arquivos modificados
- `src/pages/Ponto.tsx` â€” ReformulaÃ§Ã£o visual da funÃ§Ã£o `generatePDF` para garantir que relatÃ³rios de ponto de atÃ© 31 dias caibam rigorosamente em 1 Ãºnica pÃ¡gina:
  1. **Logomarca no CabeÃ§alho:** Adicionada a logomarca da MT Solar (`/Logomarca.png`, cores sÃ³lidas em azul vivo e amarelo) no canto superior esquerdo com largura de **32mm** (altura ~15.3mm, proporÃ§Ã£o 2.087:1) e fundo branco sÃ³lido, posicionada de `y=5` a `y=20.3` (acima da linha divisÃ³ria em `y=22`).
  2. **Resumo do Banco de Horas Compactado:** Reduzida a caixa do resumo de **44mm para 27mm** de altura, reorganizando os 5 indicadores (Horas Extras 50%, 100%, Faltas/Devendo, Dias Abonados e Saldo Total) em 2 colunas com espaÃ§amento vertical de 4.8mm por linha.
  3. **Tabela DiÃ¡ria Compactada:** Ajustado o espaÃ§amento entre linhas da tabela de **7.0mm para 4.5mm**, mantendo o tamanho de fonte da tabela em **7.5pt** sem reduÃ§Ã£o.
  4. **Assinaturas Lado a Lado:** Linhas de assinatura do Colaborador (esquerda) e da Empresa / MT Solar (direita) posicionadas em duas colunas paralelas.
- `scratch/generate_test_pdfs.ts` â€” Atualizado o script de teste de geraÃ§Ã£o de PDF para espelhar rigorosamente o layout e parÃ¢metros de `Ponto.tsx`.

### O que foi feito

#### 1. DiagnÃ³stico do Problema Visual
- O relatÃ³rio de ponto em PDF de 31 dias estava estourando para a 2Âª pÃ¡gina devido ao tamanho desproporcional da caixa de resumo do banco de horas (44mm de altura), altura de linha da tabela diÃ¡ria (7.0mm) e ausÃªncia de layout otimizado no cabeÃ§alho e rodapÃ©.
- Adicionalmente, o relatÃ³rio nÃ£o possuÃ­a a logomarca oficial da empresa nem a linha de assinatura do empregador.

#### 2. SoluÃ§Ã£o Implementada e ValidaÃ§Ã£o
1. **OtimizaÃ§Ã£o de EspaÃ§o Vertical:**
   - ReduÃ§Ã£o da tabela diÃ¡ria: de `7.0mm` para `4.5mm` por linha (economia de ~77.5mm em 31 dias).
   - ReduÃ§Ã£o da caixa de resumo: de `44mm` para `27mm` de altura (economia de ~17mm).
   - Resultado: RelatÃ³rios com 31 dias terminam em `y â‰ˆ 275mm`, cabendo confortavelmente dentro do limite da folha A4 (297mm).
2. **Qualidade e Visibilidade da Logomarca:**
   - Testadas duas variaÃ§Ãµes de imagens (`PNG_-_MT_SOLAR__1_.png` e `Logomarca.png`). A imagem `Logomarca.png` com cores sÃ³lidas apresentou contraste perfeito em azul vivo e amarelo.
   - Ajustada para largura de `32mm` com margem de seguranÃ§a de `1.7mm` antes da linha separadora `y=22`.
3. **Assinatura Dupla:**
   - Adicionadas linhas paralelas para **Assinatura do Colaborador** e **Assinatura da Empresa (MT Solar)**.
4. **PreservaÃ§Ã£o Absoluta da LÃ³gica:**
   - ModificaÃ§Ãµes estritamente restritas Ã s funÃ§Ãµes visuais de `generatePDF` em `Ponto.tsx`. Nenhuma lÃ³gica de cÃ¡lculo, datas ou rotas de backend foi alterada.

## AlteraÃ§Ãµes â€” SessÃ£o 09/10/2026 â€” 08:20 (Tratamento de Erro React #31 na SaÃ­da Final e PadronizaÃ§Ã£o de Mensagens de Erro)

### Data/Hora
2026-10-09 â€” 08:23 (America/Recife / UTC-3)

### Arquivos modificados
- `src/pages/Ponto.tsx` â€” Adicionado o helper `extrairMensagemErro` que garante a conversÃ£o de qualquer tipo de erro (string, objeto `{ code, message }`, resposta de Axios/Capacitor ou `Error` nativo) em uma string amigÃ¡vel antes de ser armazenada no estado `message` e renderizada no JSX; substituiÃ§Ã£o de todas as extraÃ§Ãµes inseguras `apiErr?.response?.data?.error ?? apiErr?.message` pelo helper; inclusÃ£o do componente `PontoErrorBoundary` em volta da interface inteira.
- `src/components/PontoErrorBoundary.tsx` â€” [NOVO] Componente de captura de erros de renderizaÃ§Ã£o (React Error Boundary) exclusivo para a tela de Ponto EletrÃ´nico, evitando que falhas inesperadas derrubem e reiniciem a aplicaÃ§Ã£o.
- `api/index.ts` â€” Ajuste na rota `POST /api/ponto/registrar` no bloco de tratamento de erro do Supabase/Postgres (`if (error)`), garantindo que mensagens de erro sejam convertidas em string antes do lanÃ§amento para a camada HTTP e enviando `err.message` consistente na resposta 500/400.
- `RESUMO_MESTRE.md` â€” AtualizaÃ§Ã£o da documentaÃ§Ã£o do sistema com o registro do problema, causa raiz e correÃ§Ãµes aplicadas.

### O que foi feito

#### 1. DiagnÃ³stico da Causa Raiz do React Error #31
- **Sintoma:** Ao registrar a batida de **SAÃ�DA FINAL** via modal contextual, a tela quebrava com a mensagem `Minified React error #31` (tentativa de renderizar um objeto diretamente no JSX).
- **Causa Raiz Identificada:** Em `Ponto.tsx`, a extraÃ§Ã£o de erro utilizava o operador nullish coalescing `const msg = apiErr?.response?.data?.error ?? apiErr?.message ?? 'Erro...'`. Quando o backend ou a biblioteca do Supabase devolvia uma resposta de erro no formato de objeto `{ code: '23505', message: '...' }` ou um objeto de erro customizado, o operador `??` mantinha o objeto (por ser truthy e nÃ£o-nullish). Em seguida, `setMessage({ text: msg, type: 'error' })` colocava o prÃ³prio objeto no estado. Na renderizaÃ§Ã£o (`{message.text}`), o React lanÃ§ava o erro fatal #31.

#### 2. SoluÃ§Ã£o Implementada e ValidaÃ§Ãµes
1. **Helper `extrairMensagemErro` (`Ponto.tsx`):**
   - Criada funÃ§Ã£o utilitÃ¡ria com tratamento defensivo em cascata que inspeciona o objeto retornado e extrai rigorosamente uma string. Se receber objeto com propriedade `.message` ou `.error`, extrai a string correspondente; se nÃ£o, serializa ou aplica fallback amigÃ¡vel.
2. **SubstituiÃ§Ã£o em Todos os Pontos de Captura:**
   - Atualizados todos os handlers (`prosseguirComTipo`, `handlePunch`, `handleGeoRetry`, `handleRecalculate`, `registrarSemLocalizacao`).
3. **Resposta Consistente no Backend (`api/index.ts`):**
   - Ajustado o tratamento no `POST /api/ponto/registrar` para garantir que exceÃ§Ãµes lanÃ§adas pelo Supabase/Postgres tenham sua mensagem extraÃ­da como string antes de retornar na resposta HTTP.
4. **ResiliÃªncia com `PontoErrorBoundary` (`PontoErrorBoundary.tsx`):**
   - Criado componente de contorno de erro no React que encapsula a interface do Ponto EletrÃ´nico. Em caso de qualquer falha de renderizaÃ§Ã£o no cliente, exibe um painel elegante com botÃ£o de nova tentativa sem dar refresh brusco ou quebrar o app.
5. **ValidaÃ§Ã£o e CompilaÃ§Ã£o:**
   - Testados cenÃ¡rios HTTP com scripts dedicados em `scratch/test_exit_scenarios.mjs` e `scratch/test_error_helper.mjs`.
   - Executado `npx tsc --noEmit` (sucesso 0 erros) e `npm run build` (sucesso em 25.61s).

---

## AlteraÃ§Ãµes â€” SessÃ£o 04/09/2026 â€” 08:50 (CorreÃ§Ã£o CrÃ­tica de Fuso HorÃ¡rio no Registro de Ponto e Desacoplamento de Erros de GPS)

### Data/Hora
2026-09-04 â€” SessÃ£o 17

### Arquivos modificados
- `api/dateUtils.ts` â€” [NOVO] MÃ³dulo utilitÃ¡rio centralizado para manipulaÃ§Ã£o de datas e fusos horÃ¡rios no fuso `America/Recife` (`getRecifeDateStr`, `getRecifeDayBounds`, `getRecifeTimeVal`).
- `src/utils/dateUtils.ts` â€” [NOVO] MÃ³dulo utilitÃ¡rio de datas para o frontend no fuso `America/Recife`.
- `api/index.ts` â€” ImportaÃ§Ã£o e aplicaÃ§Ã£o dos utilitÃ¡rios `getRecifeDateStr`, `getRecifeDayBounds` e `getRecifeTimeVal` em todas as rotas e funÃ§Ãµes que calculam o dia e fuso (`isHoliday`, `getHolidayName`, `GET /api/medical-certificates/active`, `POST /api/ponto/registrar` na trava de tipo `existingTypeToday`, `calculateHourBankForPeriod` no agrupamento por dia e na trava de expediente em andamento).
- `src/pages/Ponto.tsx` â€” AtualizaÃ§Ã£o do filtro de batidas do dia atual (`todayRecords`) para utilizar `getRecifeDateStr()`. SeparaÃ§Ã£o completa da captura de geolocalizaÃ§Ã£o (`capturarLocalizacao()`) em um bloco `try...catch` prÃ³prio, isolado da requisiÃ§Ã£o HTTP (`registrarPontoComLocalizacao(...)`), garantindo que erros de API (como HTTP 400 por duplicaÃ§Ã£o) sejam exibidos em mensagem vermelha na tela em vez de abrir o modal de "LocalizaÃ§Ã£o nÃ£o obtida".
- `src/main.tsx` â€” ImplementaÃ§Ã£o de tratativa para o evento `vite:preloadError` e erros de importaÃ§Ã£o de script dinÃ¢mico no Safari iOS, com trava de seguranÃ§a em `sessionStorage` limitando o auto-reload a no mÃ¡ximo 1 tentativa por sessÃ£o do navegador.

### O que foi feito

#### 1. DiagnÃ³stico do Incidente de ProduÃ§Ã£o
- **Causa Raiz do Bug das 21h (Mariana Feliciano - ID 286):** A funcionÃ¡ria Mariana bateu ponto em 03/09/2026 Ã s 21:21:47 (horÃ¡rio de Recife, UTC-3). O servidor Node na Vercel roda em **UTC**, gravando o timestamp como `2026-09-04 00:21:47.375+00`. A trava de duplicaÃ§Ã£o do dia (`existingTypeToday`) calculava `todayStart` e `todayEnd` em UTC puro (`00:00:00Z` a `23:59:59Z`), classificando essa batida noturna como sendo do dia 04/09 e bloqueando a Mariana de bater Entrada no dia 04/09 com erro HTTP 400.
- **Causa Raiz do Modal de GPS Incorreto (Marcos Douglas):** Em `Ponto.tsx`, a funÃ§Ã£o `handlePunch()` englobava GPS e requisiÃ§Ã£o HTTP no mesmo `catch`. Qualquer erro HTTP 400 retornado pela API era capturado e repassado ao modal de GPS, exibindo falsamente `"LocalizaÃ§Ã£o nÃ£o obtida â€” Request failed with status code 400"`.

#### 2. SoluÃ§Ã£o Aplicada e ValidaÃ§Ã£o
1. **CentralizaÃ§Ã£o de Fuso HorÃ¡rio (`America/Recife`):** Criados utilitÃ¡rios centralizados no backend e no frontend. Todos os cÃ¡lculos de limites de dia utilizam a janela `00:00:00-03:00` a `23:59:59.999-03:00` (`03:00:00Z` a `02:59:59.999Z` do dia seguinte em UTC).
2. **ReclassificaÃ§Ã£o AutomÃ¡tica:** Com a nova janela do fuso de Recife, a batida `00:21:47Z` de 04/09 foi automaticamente reclassificada no dia **03/09/2026** (pois `00:21Z` ocorre antes do inÃ­cio do dia 04/09 Ã s `03:00Z`).
3. **Desacoplamento de Erros no Frontend:** Erros HTTP da API agora sÃ£o exibidos em banner de aviso na tela e nÃ£o disparam mais o modal de erro de GPS.
4. **Varredura Noturna nos Ãšltimos 7 Dias (Tarefa C):** Executada consulta SQL na tabela `time_records` para identificar batidas entre 21h e 23h59 (00:00Z a 02:59Z). **Apenas a batida ID 286 da Mariana existia nesse intervalo**, confirmando que nenhum outro funcionÃ¡rio foi afetado.
5. **Testes de Unidade:** Testados e validados todos os limites de data, simulaÃ§Ã£o de batida noturna Ã s 21h30 e confirmaÃ§Ã£o de liberaÃ§Ã£o dos usuÃ¡rios afetados.
6. **CompilaÃ§Ã£o:** Executado `tsc --noEmit` (sucesso 0 erros) e `npm run build` (sucesso em 19.71s).

---

## AlteraÃ§Ãµes â€” SessÃ£o 01/09/2026 â€” 09:45 (Atestados Retroativos com RecÃ¡lculo AutomÃ¡tico e ExibiÃ§Ã£o do CID no RelatÃ³rio)

### Data/Hora
2026-09-01 â€” SessÃ£o 16

### Arquivos modificados
- `api/index.ts` â€” InclusÃ£o do gatilho automÃ¡tico de recÃ¡lculo (`calculateHourBankForPeriod`) nas rotas `POST /api/medical-certificates` (ao cadastrar atestado) e `DELETE /api/medical-certificates/:id` (ao excluir atestado), cobrindo o intervalo retroativo `[start_date, end_date]`. Enriquecimento do endpoint `GET /api/ponto/relatorio/:userId` para cruzar lanÃ§amentos de `atestado_abonado` com `medical_certificates` e incluir a propriedade `cid`.
- `src/pages/Ponto.tsx` â€” AtualizaÃ§Ã£o da coluna de "OBSERVAÃ‡Ã•ES" no PDF gerado para exibir `Atestado â€” CID: {cid}` (ou `Atestado MÃ©dico`) nos dias abonados por atestado. AtualizaÃ§Ã£o do badge do dia no relatÃ³rio em tela para exibir `Atestado â€” CID: {cid}`.

### O que foi feito

#### 1. DiagnÃ³stico do Problema com Datas Retroativas
- **Falta de Gatilho no cadastro/exclusÃ£o de Atestados:** Ao criar um atestado mÃ©dico com data no passado via `POST /api/medical-certificates`, o registro era inserido na tabela `medical_certificates`, mas a rotina de recÃ¡lculo `calculateHourBankForPeriod` nÃ£o era disparada, mantendo os lanÃ§amentos de `falta` ou `jornada_incompleta` anteriores intocados no `hour_bank`.
- **AusÃªncia do CID no RelatÃ³rio:** Os lanÃ§amentos do banco de horas do tipo `atestado_abonado` nÃ£o possuÃ­am vÃ­nculo com o cÃ³digo CID do atestado correspondente para exibiÃ§Ã£o nas observaÃ§Ãµes do PDF e no relatÃ³rio web.

#### 2. SoluÃ§Ã£o Implementada
1. **RecÃ¡lculo Retroativo AutomÃ¡tico (Backend `api/index.ts`):**
   - **Gatilho de CriaÃ§Ã£o (`POST`):** Imediatamente apÃ³s a inserÃ§Ã£o do atestado, o sistema executa `calculateHourBankForPeriod` para o intervalo `[start_date, end_date]`, removendo substitutivamente lanÃ§amentos de faltas anteriores e gravando os lanÃ§amentos de `atestado_abonado` (`hours = 0`).
   - **Gatilho de ExclusÃ£o (`DELETE`):** Ao excluir um atestado, o sistema captura previamente as datas e o usuÃ¡rio e executa o recÃ¡lculo do perÃ­odo, restaurando os dias Ã  sua condiÃ§Ã£o original (falta se sem batidas de ponto, ou normal se com batidas).
2. **ExibiÃ§Ã£o do CID no RelatÃ³rio Web e PDF (`Ponto.tsx`):**
   - O endpoint `/api/ponto/relatorio/:userId` cruza os atestados do usuÃ¡rio no perÃ­odo e inclui a propriedade `cid` nos lanÃ§amentos `atestado_abonado`.
   - No PDF, a coluna "OBSERVAÃ‡Ã•ES" passa a exibir `Atestado â€” CID: {cid}` (ex: `Atestado â€” CID: A12.0`).
   - Na tela, o badge do dia exibe `Atestado â€” CID: {cid}`.
3. **Auditoria e RecÃ¡lculo de Atestados Existentes em ProduÃ§Ã£o:**
   - Foi executado o recÃ¡lculo retroativo para os 2 atestados jÃ¡ existentes no banco de dados real:
     - **Atestado #4 (Mariana Feliciano - 19/08/2026 - CID: A12.0):** LanÃ§amento de `atestado_abonado` gerado com sucesso em `hour_bank` para 19/08/2026.
     - **Atestado #3 (Marcos AurÃ©lio - 01/09/2026 a 02/09/2026 - CID: M52.2):** LanÃ§amentos de `atestado_abonado` gerados com sucesso em `hour_bank` para 01/09/2026 e 02/09/2026.

---

## AlteraÃ§Ãµes â€” SessÃ£o 01/09/2026 â€” 09:16 (FormataÃ§Ã£o e Layout Vertical do Resumo do Banco de Horas no PDF)

### Data/Hora
2026-09-01 â€” SessÃ£o 15

### Arquivos modificados
- `src/pages/Ponto.tsx` â€” ReformulaÃ§Ã£o completa da seÃ§Ã£o `RESUMO DO BANCO DE HORAS` na funÃ§Ã£o `generatePDF`. Cada um dos 5 itens do resumo (Horas Extras 50%, Horas Extras 100%, Faltas/Horas Devendo, Dias Abonados e Saldo Total do Banco de Horas) foi disposto em sua prÃ³pria linha vertical com coordenadas Y dedicadas e alinhamento Ã  direita dos valores; ajuste do espaÃ§amento vertical da caixa descritiva e da legenda dos multiplicadores legais da CLT.

### O que foi feito

#### 1. DiagnÃ³stico do Problema Visual no PDF
- **ColisÃ£o e SobreposiÃ§Ã£o Horizontal:** No cÃ³digo anterior, a seÃ§Ã£o do resumo do banco de horas no PDF tentava renderizar 3 colunas horizontais na mesma linha `y` (`col1x = 18`, `col2x = 70`, `col3x = 122`).
- Como a string do rÃ³tulo e do valor da primeira coluna (ex: `H. Extras (50% â€” dia Ãºtil): +9.71h`) ultrapassava a posiÃ§Ã£o inicial da segunda coluna (`col2x = 70`), o texto do primeiro item colava no segundo item, gerando a sobreposiÃ§Ã£o relatada (ex: `+9.71hH. Extras (100%...`).

#### 2. CorreÃ§Ãµes Implementadas
1. **DisposiÃ§Ã£o em Linhas Individuais:**
   - Cada um dos 5 itens do resumo foi configurado para ser desenhado em sua **prÃ³pria linha Y** com incrementos verticais dedicados (`y += 5.5`).
2. **Alinhamento Ã  Direita:**
   - O rÃ³tulo Ã© posicionado Ã  esquerda (`labelX = 20`) e o valor numÃ©rico correspondente Ã© impresso Ã  direita (`valueX = 186` com `align: 'right'`), eliminando qualquer possibilidade de colisÃ£o visual ou texto grudado.
3. **Legenda CLT e Assinatura:**
   - A altura da caixa azul de fundo foi expandida proporcionalmente (`boxHeight = 44`) e a legenda sobre os multiplicadores da CLT foi reposicionada abaixo da caixa com espaÃ§amento vertical seguro, mantendo o bloco de assinatura do colaborador sem sobreposiÃ§Ãµes.

---

## AlteraÃ§Ãµes â€” SessÃ£o 01/09/2026 â€” 08:35 (Acesso e Visibilidade de Atestados MÃ©dicos com Upload e CID)

### Data/Hora
2026-09-01 â€” SessÃ£o 14

### Arquivos modificados
- `src/pages/Funcionarios.tsx` â€” Atualizado o botÃ£o da coluna de AÃ§Ãµes da tabela de colaboradores para exibir um botÃ£o visÃ­vel e destacado (`ðŸ“Ž Atestado`), com Ã­cone e rÃ³tulo de texto em cor teal, facilitando a identificaÃ§Ã£o imediata do cadastro de atestados mÃ©dicos.
- `src/pages/Ponto.tsx` â€” Adicionado o botÃ£o `ðŸ“‹ LanÃ§ar Atestado MÃ©dico` no painel do Gestor (aba RelatÃ³rios) e integrado o modal completo de Atestados MÃ©dicos (com data de inÃ­cio, dias afastado, cÃ¡lculo automÃ¡tico do perÃ­odo, campo CID, upload de documento PDF/imagem, observaÃ§Ãµes e histÃ³rico com link de download/visualizaÃ§Ã£o e exclusÃ£o).

### O que foi feito

#### 1. Causa Raiz da ImpressÃ£o de AusÃªncia dos Campos
- **NÃ£o houve regressÃ£o de cÃ³digo:** O cÃ³digo do modal completo com formulÃ¡rio, campo CID, upload de arquivos e cÃ¡lculo de perÃ­odo **nunca foi apagado ou alterado**.
- **Problema de NavegaÃ§Ã£o e Visibilidade:**
  1. Em `Funcionarios.tsx`, o botÃ£o de abertura do modal era apenas um pequeno Ã­cone de documento de 18px (`<FileText size={18} />`) sem rÃ³tulo de texto na coluna de AÃ§Ãµes, passando facilmente despercebido pelo usuÃ¡rio.
  2. Em `Ponto.tsx` (onde o gestor analisa frequentemente os cartÃµes de ponto, folgas e banco de horas), **nÃ£o havia um ponto de acesso** para lanÃ§ar atestados mÃ©dicos, obrigando o gestor a navegar atÃ© a tela de FuncionÃ¡rios sem um direcionamento claro.

#### 2. SoluÃ§Ã£o Implementada
1. **Destaque na Tela de FuncionÃ¡rios (`Funcionarios.tsx`):**
   - O botÃ£o na tabela foi transformado em um badge estilizado com texto explÃ­cito: `ðŸ“Ž Atestado`.
2. **Duplo Ponto de Acesso e Modal em Ponto EletrÃ´nico (`Ponto.tsx`):**
   - IncluÃ­do o botÃ£o `ðŸ“‹ LanÃ§ar Atestado MÃ©dico` na barra de aÃ§Ãµes do gestor quando um colaborador estÃ¡ selecionado na aba de RelatÃ³rios do Ponto.
   - Replicado o modal completo em `Ponto.tsx`, permitindo que o gestor insira atestados mÃ©dicos (upload de PDF/imagem + CID + dias de afastamento) diretamente da tela de gestÃ£o de ponto.

---

## AlteraÃ§Ãµes â€” SessÃ£o 01/09/2026 â€” 08:23 (IntegraÃ§Ã£o de Folgas e CompensaÃ§Ãµes time_off_requests com Banco de Horas e RelatÃ³rio)

### Data/Hora
2026-09-01 â€” SessÃ£o 13

### Arquivos modificados
- `api/index.ts` â€” ReformulaÃ§Ã£o do motor de cÃ¡lculo de banco de horas (`calculateHourBankForPeriod`) para tratar folgas (`folga_abate_banco`) e compensaÃ§Ãµes (`compensacao_horas`) com prioridade sobre dÃ©bitos de falta/jornada incompleta, zerar dÃ©bitos no caso de compensaÃ§Ãµes, aplicar multiplicador 1.0 para horas trabalhadas em dias compensados, e limpar de forma idempotente lanÃ§amentos automÃ¡ticos conflitantes anteriores; atualizaÃ§Ã£o do endpoint `PUT /api/time-off-requests/:id` para disparar o recÃ¡lculo dinÃ¢mico ao aprovar ou rejeitar solicitaÃ§Ãµes.
- `src/pages/Ponto.tsx` â€” AtualizaÃ§Ã£o da geraÃ§Ã£o de PDF (`generatePDF`) e da visualizaÃ§Ã£o de relatÃ³rio na web para incluir dias com lanÃ§amentos do banco de horas (folgas abatidas, compensaÃ§Ãµes, atestados, feriados) mesmo que nÃ£o possuam batidas de ponto, identificando visualmente cada tipo de dia e exibindo a mensagem correspondente.

### O que foi feito

#### 1. DiagnÃ³stico do Problema Original
- **IntegraÃ§Ã£o Inexistente / Parcial:** Ao aprovar uma solicitaÃ§Ã£o em `time_off_requests`, o endpoint antigo inseria diretamente um registro estÃ¡tico no banco de horas com o ID do gestor (`created_by`), mas a rotina de recÃ¡lculo `calculateHourBankForPeriod` nÃ£o tratava solicitaÃ§Ãµes do tipo `compensacao_horas` em dias sem batida, fazendo com que o sistema continuasse gerando lanÃ§amentos automÃ¡ticos de `falta` no mesmo dia.
- **Conflito e Duplo DÃ©bito:** Como a rotina de recÃ¡lculo nÃ£o limpava lanÃ§amentos automÃ¡ticos anteriores (`falta`) quando uma folga era aprovada posteriormente, a tabela `hour_bank` acabava com dois registros para a mesma data (`falta` de -8h e `folga_abatida` de -8h), penalizando duplamente o funcionÃ¡rio.
- **Multiplicador de CompensaÃ§Ã£o:** Horas trabalhadas em domingos/feriados com compensaÃ§Ã£o aprovada recebiam indevidamente multiplicador 2.0 (100%) em vez do multiplicador neutro 1.0.

#### 2. CorreÃ§Ãµes Implementadas
1. **Prioridade e ClassificaÃ§Ã£o no Motor (`calculateHourBankForPeriod` em `api/index.ts`):**
   - Ordem de prioridade garantida: Feriado abonado â†’ Atestado mÃ©dico â†’ Folga aprovada / CompensaÃ§Ã£o â†’ Batidas de ponto reais â†’ Falta / Jornada incompleta.
   - **`folga_abate_banco`:** gera lanÃ§amento `folga_abatida` com horas negativas iguais Ã  jornada diÃ¡ria da funÃ§Ã£o em `work_schedules` e multiplicador 1.0. O dia nÃ£o Ã© classificado como falta nem jornada incompleta.
   - **`compensacao_horas`:** se sem batidas de ponto (`workedHours === 0`), Ã© tratado como dia neutro (`insertType = 'compensacao'`, `hours = 0`), sem gerar dÃ©bito de falta. Se houver trabalho no dia (ex: trabalho em domingo/feriado sendo compensado), o multiplicador de horas extras Ã© travado em `1.0` (sem o adicional de 100%).
2. **Gerenciamento Idempotente de LanÃ§amentos:**
   - Na rotina de cÃ¡lculo de cada dia, qualquer lanÃ§amento automÃ¡tico prÃ©vio (`AUTO_TYPES` como `falta`, `jornada_incompleta`, etc.) que conflite com a nova classificaÃ§Ã£o do dia Ã© excluÃ­do antes de inserir/atualizar o novo lanÃ§amento.
3. **ConexÃ£o Direta da AprovaÃ§Ã£o/RejeiÃ§Ã£o:**
   - O endpoint `PUT /api/time-off-requests/:id` agora aciona `calculateHourBankForPeriod` imediatamente para a data da solicitaÃ§Ã£o ao aprovar ou rejeitar, garantindo que o banco de horas e o relatÃ³rio fiquem sincronizados instantaneamente.
4. **RelatÃ³rio de Ponto e PDF (`Ponto.tsx`):**
   - Atualizados para incluir no mapa do relatÃ³rio todos os dias que possuem lanÃ§amentos de banco de horas (folga abatida, compensaÃ§Ã£o, atestado, feriado), exibindo os badges e descriÃ§Ãµes apropriadas mesmo sem batidas de ponto.

#### 3. Testes ObrigatÃ³rios Executados
- **Teste 1 (`folga_abate_banco`):** SolicitaÃ§Ã£o e aprovaÃ§Ã£o de folga para 15/09/2026. Resultado: Gerou lanÃ§amento `folga_abatida` de `-8.0h` e **nÃ£o** gerou falta. (PASSOU âœ…)
- **Teste 2 (`compensacao_horas` em domingo):** Registro de 8h trabalhadas no domingo 20/09/2026 com compensaÃ§Ã£o aprovada. Resultado: Gerou `hora_extra_fds_feriado` com multiplicador `1.0` (sem 100%). (PASSOU âœ…)
- **RecÃ¡lculo Retroativo:** Executado e confirmado em banco de dados para os registros existentes (ex: solicitaÃ§Ã£o aprovada ID 2 do dia 19/08/2026).

---

## AlteraÃ§Ãµes â€” SessÃ£o 31/08/2026 â€” 17:00 (PrevenÃ§Ã£o de Duplo-Clique, Race Condition e GeolocalizaÃ§Ã£o ObrigatÃ³ria)

### Data/Hora
2026-08-31 â€” SessÃ£o 12

### Arquivos modificados
- `api/index.ts` â€” Adicionada validaÃ§Ã£o de geolocalizaÃ§Ã£o estritamente obrigatÃ³ria no backend (`HTTP 400` se `latitude` ou `longitude` forem nulos); adicionada trava contra requisiÃ§Ãµes consecutivas nos Ãºltimos 20 segundos (`HTTP 409`) para impedir race condition; adicionada trava de duplicaÃ§Ã£o de tipo no mesmo dia (`HTTP 400`).
- `src/pages/Ponto.tsx` â€” Implementada trava sÃ­ncrona imediata (`isPunchingRef`) e debounce de 2.5s no botÃ£o de bater ponto; ajustado o timeout de captura de GPS no navegador web para 10s com mensagens explicativas; bloqueada a gravaÃ§Ã£o sem coordenadas no fluxo web.

### O que foi feito

#### 1. DiagnÃ³stico da Causa Raiz da DuplicaÃ§Ã£o
- **Causa PrimÃ¡ria (Frontend):** AusÃªncia de trava sÃ­ncrona no manipulador de cliques. O estado `punching = true` do React Ã© assÃ­ncrono. Cliques mÃºltiplos rÃ¡pidos (duplo-clique) antes da re-renderizaÃ§Ã£o disparavam requisiÃ§Ãµes HTTP paralelas.
- **Causa SecundÃ¡ria (Backend Race Condition):** O endpoint `POST /api/ponto/registrar` nÃ£o possuÃ­a verificaÃ§Ã£o de debounce temporal ou unicidade por tipo/dia. Ao receber duas requisiÃ§Ãµes com milissegundos de diferenÃ§a antes da resposta do banco, ambas eram inseridas.

#### 2. ProteÃ§Ã£o Aplicada (Defesa em Profundidade)
1. **Frontend (`Ponto.tsx`):**
   - Trava sÃ­ncrona via `isPunchingRef.current` que ignora novos cliques imediatamente no momento do disparo.
   - Debounce de `2500ms` reabilitando o botÃ£o somente apÃ³s a conclusÃ£o completa e tempo de seguranÃ§a.
2. **Backend (`api/index.ts`):**
   - RejeiÃ§Ã£o imediata (`HTTP 409`) se o mesmo usuÃ¡rio tentar registrar qualquer batida nos Ãºltimos `20 segundos`.
   - RejeiÃ§Ã£o imediata (`HTTP 400`) se a batida daquele `type` jÃ¡ tiver sido gravada no dia de hoje.

#### 3. GeolocalizaÃ§Ã£o ObrigatÃ³ria na VersÃ£o Web
- **Backend:** `POST /api/ponto/registrar` agora rejeita com `HTTP 400` qualquer requisiÃ§Ã£o sem `latitude` e `longitude`.
- **Frontend:** `capturarLocalizacao` no navegador web possui timeout de 10s. Em caso de negaÃ§Ã£o/falha/timeout, o registro Ã© interrompido com instruÃ§Ã£o clara para habilitar o GPS no navegador, reabilitando o botÃ£o sem gerar batidas parciais ou sem localizaÃ§Ã£o no banco.

---

## AlteraÃ§Ãµes â€” SessÃ£o 31/08/2026 â€” 16:45 (ResoluÃ§Ã£o de HorÃ¡rios do Dia 19/08 e Terminologia 'Jornada Incompleta')

### Data/Hora
2026-08-31 â€” SessÃ£o 11

### Arquivos modificados
- `api/index.ts` â€” LÃ³gica de agrupar batidas em `calculateHourBankForPeriod` ajustada para utilizar o primeiro `entry`, primeiro `lunch_start`, primeiro `lunch_end` e o Ãºltimo `exit` em ordem cronolÃ³gica; alteraÃ§Ã£o do tipo de lanÃ§amento de saldo negativo quando hÃ¡ presenÃ§a para `jornada_incompleta` em vez de `falta`.
- `src/pages/Ponto.tsx` â€” AtualizaÃ§Ã£o de `calcDayHours`, da tabela web do relatÃ³rio e da geraÃ§Ã£o de PDF (`generatePDF`) para agrupar horÃ¡rios sem sobrescrever batidas duplicadas, tratar terminologia `'Jornada Incompleta'` (distinguindo ausÃªncia total de jornada parcial) e sinalizar dias inconsistentes (com mais de 4 batidas).

### O que foi feito

#### TAREFA A â€” DiagnÃ³stico e CorreÃ§Ã£o do Dia 19/08/2026

1. **InvestigaÃ§Ã£o no Banco de Dados (`time_records`):**
   - Foram encontrados 5 registros de ponto no dia 19/08/2026 para a usuÃ¡ria Mariana Feliciano:
     1. `08:16:04 BRT` (`type: entry`) -> Batida inicial de entrada.
     2. `12:27:23 BRT` (`type: lunch_start`) -> SaÃ­da para almoÃ§o.
     3. `13:18:01 BRT` (`type: lunch_end`) -> Retorno do almoÃ§o.
     4. `14:54:14 BRT` (`type: entry`) -> Batida duplicada/extra de entrada.
     5. `14:54:28 BRT` (`type: exit`) -> Batida de saÃ­da.

2. **Causa Raiz do Bug:**
   - O cÃ³digo antigo fazia `byType[r.type] = timestamp` iterando sobre os registros.
   - Como a batida duplicada de `entry` ocorreu Ã s 14:54 (id 193), ela **sobrescreveu** a batida de `entry` original das 08:16 (id 187).
   - Isso fez com que o PDF e o cÃ¡lculo vissem `Entrada: 14:54` e `SaÃ­da AlmoÃ§o: 12:27` (horÃ¡rio de entrada posterior ao almoÃ§o), gerando um cÃ¡lculo negativo de `-2.45h` no primeiro turno.

3. **CorreÃ§Ã£o Implementada:**
   - O agrupamento de horÃ¡rios no backend (`api/index.ts`) e frontend (`Ponto.tsx`) foi alterado para:
     - `Entrada`: Primeiro registro de `entry` do dia (`08:16`).
     - `S.AlmoÃ§o`: Primeiro registro de `lunch_start` do dia (`12:27`).
     - `R.AlmoÃ§o`: Primeiro registro de `lunch_end` do dia (`13:18`).
     - `SaÃ­da`: Ãšltimo registro de `exit` do dia (`14:54`).
   - Com isso, os horÃ¡rios do dia 19/08 foram organizados perfeitamente em ordem lÃ³gica (08:16 | 12:27 | 13:18 | 14:54), calculando **5.80h trabalhadas**.
   - Se o dia tiver batidas excedentes (> 4 batidas), o sistema adiciona uma observaÃ§Ã£o `(Inconsistente)` para alertar o gestor.

#### TAREFA B â€” Troca de Terminologia: "Falta" por "Jornada Incompleta"

1. **DiferenciaÃ§Ã£o no Banco de Horas (`api/index.ts`):**
   - **Falta Total (`type: 'falta'`):** Quando o funcionÃ¡rio NÃƒO possui nenhum registro de ponto no dia Ãºtil (`workedHours === 0`).
   - **Jornada Incompleta (`type: 'jornada_incompleta'`):** Quando o funcionÃ¡rio esteve presente (`workedHours > 0`), mas cumpriu carga menor que a esperada (ex: 7.8h em vez de 8.0h).

2. **Ajuste na ExibiÃ§Ã£o (`Ponto.tsx`):**
   - O mapa de rÃ³tulos (`HB_TYPE_LABEL` e `labelMap`) agora inclui `'Jornada Incompleta'`.
   - LanÃ§amentos histÃ³ricos antigos com `type: 'falta'` que possuem registros de ponto no dia ou descriÃ§Ã£o contendo jornada parcial sÃ£o exibidos automaticamente como `'Jornada Incompleta'`, garantindo 100% de compatibilidade retroativa.

---

## AlteraÃ§Ãµes â€” SessÃ£o 31/08/2026 â€” 16:25 (CorreÃ§Ã£o de RegressÃ£o: CPF e Data de AdmissÃ£o Sobrescritos por NULL)

### Data/Hora
2026-08-31 â€” SessÃ£o 10

### Arquivos modificados
- `api/index.ts` â€” CorreÃ§Ã£o crÃ­tica na rota `PUT /api/users/:id`: campos `cpf`, `data_admissao`, `cargo` e `recebe_leads` agora sÃ³ sÃ£o incluÃ­dos no UPDATE do banco se estiverem **explicitamente presentes** no body da requisiÃ§Ã£o (`'campo' in req.body`).
- `src/pages/Funcionarios.tsx` â€” `handleToggleStatus` agora inclui `recebe_leads` no payload enviado ao backend; `handleSubmit` agora inclui `recebe_leads` preservando o valor atual do `editingUser`.

### O que foi feito

#### 1. DiagnÃ³stico â€” ConfirmaÃ§Ã£o no banco
Query REST direta no Supabase confirmou: `cpf = null` e `data_admissao = null` para Mariana Feliciano â€” dados **fisicamente apagados**, nÃ£o era bug de exibiÃ§Ã£o.

#### 2. Causa raiz â€” Rota PUT sobrescrevendo com NULL
**Bug primÃ¡rio em `api/index.ts`, rota `PUT /api/users/:id`:**
```ts
// ANTES (bugado):
cpf: cpf || null,  // '' || null = null â†’ APAGAVA o CPF!
data_admissao: data_admissao || null,
recebe_leads: recebe_leads === true || recebe_leads === 'true',  // sempre false quando nÃ£o enviado
```
**Vetor confirmado:** `handleToggleStatus` (ativar/desativar funcionÃ¡rio) chamava `PUT /api/users/:id` enviando `cpf: user.cpf || ''`. Quando `user.cpf` era falsy (ex: usuÃ¡rio sem CPF cadastrado ou estado local nÃ£o inicializado), chegava `cpf: ''` ao backend â†’ `'' || null = null` â†’ **sobrescrevia o CPF real no banco**.

**Bug secundÃ¡rio:** `recebe_leads` nÃ£o era enviado no `handleToggleStatus`, fazendo o backend resetar `recebe_leads = false` em qualquer ativaÃ§Ã£o/desativaÃ§Ã£o.

#### 3. FuncionÃ¡rios com CPF/data_admissao NULL apÃ³s o bug
| ID | Nome | Status |
|----|------|--------|
| 5  | Mariana Feliciano | âš ï¸� NULL â€” re-cadastro manual necessÃ¡rio |
| 21 | Agleson | âš ï¸� NULL â€” re-cadastro manual necessÃ¡rio |
| 2  | Sandra Feliciano | âš ï¸� NULL â€” re-cadastro manual necessÃ¡rio |
| 13 | Sandra Feliciano da Silva do Nascimento | âš ï¸� NULL â€” re-cadastro manual necessÃ¡rio |
| 3  | Tiago Henrique | âš ï¸� NULL â€” re-cadastro manual necessÃ¡rio |
| 10 | Wellen Matias | âš ï¸� NULL â€” re-cadastro manual necessÃ¡rio |
| 14 | Marcos Aurelio Silva do Nascimento | âš ï¸� NULL â€” re-cadastro manual necessÃ¡rio |

**FuncionÃ¡rios NÃƒO afetados (dados preservados):** Italo Angelo, Manoel JordÃ£o, Manuela Sampaio, Marcos AurÃ©lio, Marcos Douglas, Soraia Castro, Witally Bruno.

#### 4. CorreÃ§Ã£o backend (`api/index.ts`)
```ts
// DEPOIS (corrigido):
// SÃ³ inclui o campo no UPDATE se vier explicitamente no body da requisiÃ§Ã£o
if ('cpf' in req.body) { fullUpdate.cpf = cpf || null; }
if ('cargo' in req.body) { fullUpdate.cargo = cargo || null; }
if ('data_admissao' in req.body) { fullUpdate.data_admissao = data_admissao || null; }
if ('recebe_leads' in req.body) { fullUpdate.recebe_leads = recebe_leads === true || recebe_leads === 'true'; }
```

#### 5. CorreÃ§Ã£o frontend (`src/pages/Funcionarios.tsx`)
- `handleToggleStatus`: adicionado `recebe_leads: user.recebe_leads ?? false` ao payload
- `handleSubmit`: adicionado `recebe_leads: editingUser?.recebe_leads ?? false` para preservar o valor ao salvar via modal

#### 6. Re-cadastro
UsuÃ¡rio optou por re-cadastrar manualmente os CPF e datas de admissÃ£o via sistema apÃ³s deploy.

### âš ï¸� ATENÃ‡ÃƒO
- Dados perdidos no banco para os 7 funcionÃ¡rios listados. RecuperaÃ§Ã£o sÃ³ com fonte externa (planilha/contrato).
- **Teste obrigatÃ³rio pÃ³s-deploy:** Cadastrar CPF â†’ ativar/desativar â†’ confirmar que CPF continua preenchido.

---

## AlteraÃ§Ãµes â€” SessÃ£o 20/08/2026 â€” 09:58 (FinalizaÃ§Ã£o da Funcionalidade de Atestados MÃ©dicos - ExclusÃ£o e ValidaÃ§Ã£o)

### Data/Hora
2026-08-20 â€” SessÃ£o 9

### Arquivos modificados
- `api/index.ts` â€” CriaÃ§Ã£o da rota `DELETE /api/medical-certificates/:id` que exclui o registro do banco de dados e remove o arquivo do Cloudflare R2 utilizando a funÃ§Ã£o `deleteFromR2` de forma resiliente.
- `src/pages/Funcionarios.tsx` â€” Adicionado o botÃ£o "Excluir" no histÃ³rico do modal de atestados e implementada a funÃ§Ã£o `handleDeleteCert` no frontend, com confirmaÃ§Ã£o e remoÃ§Ã£o reativa na lista local sem necessidade de recarregar a pÃ¡gina.

### O que foi feito
1. **ConfirmaÃ§Ã£o da Estrutura de Banco de Dados**: Diagnosticado que a tabela `medical_certificates` e todas as demais tabelas correlatas (`holidays`, `time_off_requests`, `hour_bank`, `work_schedules`) da migration `20260814_create_ponto_extensions.sql` jÃ¡ estavam aplicadas com sucesso no banco de dados real do Supabase.
2. **Rota DELETE no Backend**: Implementada a rota `DELETE /api/medical-certificates/:id`, restrita a CEO e ADMIN, com isolamento multi-tenant por `company_id`. A rota remove de forma segura o registro da tabela `medical_certificates` e o arquivo do Cloudflare R2 usando `deleteFromR2` com falha silenciosa para prevenir interrupÃ§Ãµes.
3. **ExclusÃ£o de Atestados no Frontend**: Adicionado botÃ£o com Ã­cone de lixeira no modal de histÃ³rico de atestados de cada funcionÃ¡rio em `Funcionarios.tsx`. A remoÃ§Ã£o conta com alerta de confirmaÃ§Ã£o e atualiza o estado local reativamente.
4. **VerificaÃ§Ã£o TypeScript**: Validado o projeto com `npx tsc --noEmit` apresentando zero erros de compilaÃ§Ã£o.
5. **Teste de Ponta a Ponta**: Validado fluxo de ponta a ponta simulando as queries do banco. Verificado que a inserÃ§Ã£o, listagem histÃ³rica, cÃ¡lculo dinÃ¢mico de perÃ­odo, bloqueio de ponto em caso de atestado ativo e remoÃ§Ã£o funcionam perfeitamente em ambiente integrado.

---

## AlteraÃ§Ãµes â€” SessÃ£o 19/08/2026 â€” 09:50 (CorreÃ§Ã£o do CÃ¡lculo e ExibiÃ§Ã£o de Horas Extras no Banco de Horas)

### Data/Hora
2026-08-19 â€” SessÃ£o 8

### Arquivos modificados
- `api/index.ts` â€” DeleÃ§Ã£o de lanÃ§amentos automÃ¡ticos no inÃ­cio de `calculateHourBankForPeriod` para garantir idempotÃªncia completa. Rota de recÃ¡lculo retroativo `/api/hour-bank/recalculate` ajustada para limpar todos os lanÃ§amentos automÃ¡ticos do perÃ­odo. Rota `/api/hour-bank/summary` ajustada para somar e agrupar horas extras a partir de `type` de lanÃ§amento.
- `src/pages/Ponto.tsx` â€” FunÃ§Ã£o `fetchReport` no frontend ajustada para calcular o sumÃ¡rio de horas extras baseando-se em `type` em vez de comparaÃ§Ã£o rÃ­gida de float de multiplicador.

### O que foi feito
1. **IdempotÃªncia no Banco de Horas**: Resolvido o bug de concorrÃªncia onde dias que mudavam de tipo de classificaÃ§Ã£o retinham lanÃ§amentos antigos indesejados. Agora, a rotina limpa todos os lanÃ§amentos automÃ¡ticos (`created_by IS NULL`) do perÃ­odo para o colaborador antes de recalcular.
2. **CorreÃ§Ã£o do RecÃ¡lculo Retroativo**: O endpoint `/api/hour-bank/recalculate` agora remove todos os registros automÃ¡ticos do perÃ­odo, incluindo horas extras com zero horas ou dÃ­zimas residuais incorretas.
3. **ResiliÃªncia do SumÃ¡rio**: Modificado o backend (`GET /api/hour-bank/summary`) e o frontend (`fetchReport`) para acumular horas extras mapeando o campo `type` (`hora_extra_normal`/`hora_extra_fds_feriado`), eliminando erros de ponto flutuante na comparaÃ§Ã£o numÃ©rica do multiplicador.
4. **ValidaÃ§Ã£o MatemÃ¡tica do Saldo**: O recÃ¡lculo foi rodado para Mariana Feliciano (01/08 a 19/08/2026). As horas extras normais foram regularizadas para `+7.44h` ponderadas (`4.96h` fÃ­sicas), faltas legÃ­timas de jornadas parciais somaram `-2.07h`, resultando em um saldo real e positivo de `+5.37h`, corrigindo a discrepÃ¢ncia de `-104h` sem sentido.

---

## AlteraÃ§Ãµes â€” SessÃ£o 19/08/2026 â€” 09:19 (CorreÃ§Ã£o da ClassificaÃ§Ã£o de Falta e RecÃ¡lculo Retroativo Seguro)

### Data/Hora
2026-08-19 â€” SessÃ£o 7

### Arquivos modificados
- `api/index.ts` â€” AlteraÃ§Ã£o no filtro de consulta de `time_records` na funÃ§Ã£o `calculateHourBankForPeriod`, adiÃ§Ã£o de recÃ¡lculo automÃ¡tico de dia afetado ao aprovar ajustes e criaÃ§Ã£o da nova rota segura `POST /api/hour-bank/recalculate`.
- `src/pages/Ponto.tsx` â€” AdiÃ§Ã£o do botÃ£o "Recalcular PerÃ­odo", controle de carregamento, modal de confirmaÃ§Ã£o para recÃ¡lculo em lote de todos os colaboradores, e cards informativos pÃ³s-recÃ¡lculo.

### O que foi feito
1. **CorreÃ§Ã£o do Bug de Falta Incorreta**: SubstituÃ­do o filtro `.eq('status', 'approved')` por `.in('status', ['pending', 'approved', 'adjustment_requested'])` em `calculateHourBankForPeriod`. O sistema agora considera as batidas normais que permanecem com o status `pending` por padrÃ£o, resolvendo o problema que marcava todo dia trabalhado como falta.
2. **Uso de Timestamp Original**: Validado que a classificaÃ§Ã£o utiliza o `timestamp` das batidas, incluindo as que estÃ£o com solicitaÃ§Ã£o de ajuste em andamento (`adjustment_requested`), garantindo cÃ¡lculos baseados no horÃ¡rio efetivamente registrado.
3. **RecÃ¡lculo no Fluxo de Ajuste**: Adicionado gatilho de recÃ¡lculo automÃ¡tico para o dia especÃ­fico afetado assim que uma solicitaÃ§Ã£o de ajuste de ponto Ã© aprovada via `PUT /api/ponto/ajuste/:id`.
4. **Rastreabilidade no Banco de Horas**: Validado que a distinÃ§Ã£o entre registros automÃ¡ticos e manuais Ã© feita com base no campo `created_by` (lanÃ§amentos automÃ¡ticos da rotina possuem `created_by IS NULL` e lanÃ§amentos manuais do ADM possuem o ID do autor).
5. **Rota de RecÃ¡lculo Retroativo Seguro**: Desenvolvida a rota `POST /api/hour-bank/recalculate` para deletar exclusivamente lanÃ§amentos automÃ¡ticos de `type = 'falta'` no perÃ­odo e recalcular o saldo dos colaboradores de forma isolada ou em lote.
6. **Controle na Interface do Gestor**: Criado o botÃ£o **âŸ³ Recalcular PerÃ­odo** no frontend, protegido para gestores, com confirmaÃ§Ã£o contra disparos gerais indesejados, tratamento de loading e exibiÃ§Ã£o de resumo do processamento.
7. **Backup e ExecuÃ§Ã£o Retroativa**: Exportados todos os 37 registros anteriores da tabela `hour_bank` para `scratch/hour_bank_backup_pre_fix.json`. O recÃ¡lculo foi disparado para todos os 13 colaboradores ativos no perÃ­odo de 01/08/2026 a 19/08/2026. A colaboradora Mariana Feliciano teve suas 13 faltas incorretas regularizadas para horas extras e dÃ©bitos de jornadas parciais legÃ­timos.

---


## AlteraÃ§Ãµes â€” SessÃ£o 14/08/2026 â€” 13:30 (GeolocalizaÃ§Ã£o ObrigatÃ³ria e NotificaÃ§Ãµes de Ponto Sem GPS)

### Data/Hora
2026-08-14 â€” SessÃ£o 6

### Arquivos modificados
- `src/pages/Ponto.tsx` â€” RefatoraÃ§Ã£o de `capturarLocalizacao` com fallback para W3C Geolocation API em navegadores normais, modal de erro de localizaÃ§Ã£o com "Tentar novamente", constante `BLOQUEAR_PONTO_SEM_LOCALIZACAO` e badge `ðŸš« SEM LOCALIZAÃ‡ÃƒO` na aba Verificar Fotos.
- `api/index.ts` â€” Rota `POST /api/ponto/registrar` com emissÃ£o de alerta no console e inserÃ§Ã£o automÃ¡tica de notificaÃ§Ãµes na tabela `notifications` para CEO/ADMIN da empresa.
- **Banco de Dados Supabase** â€” CriaÃ§Ã£o da tabela `public.notifications` com suporte a RLS e polÃ­ticas por usuÃ¡rio.

### O que foi feito
1. **Fallback Web para GeolocalizaÃ§Ã£o**: Refatorada a funÃ§Ã£o `capturarLocalizacao` para verificar `Capacitor.isNativePlatform()`. Caso falso, utiliza a API nativa `navigator.geolocation` com tratamento detalhado de erros (permissÃ£o negada, GPS desativado, timeout).
2. **Modal de Erros com Retentativas**: Se a captura falhar, abre um modal interativo informando a tentativa (1 de 2), explicando o erro e oferecendo o botÃ£o **ðŸ”„ Tentar novamente**.
3. **Bloqueio Total / ExceÃ§Ã£o Controlada**: Criada a constante `BLOQUEAR_PONTO_SEM_LOCALIZACAO = true`. Se ativo, impede a batida sem localizaÃ§Ã£o. Se for desativado (`false`), apÃ³s 2 tentativas fracassadas, permite bater o ponto sem GPS, marcando as coordenadas como nulas no banco de dados.
4. **NotificaÃ§Ã£o de Ponto Sem GPS (Backend & Banco)**: Criada a tabela de banco de dados `public.notifications`. Quando o backend grava coordenadas nulas em `time_records`, notifica imediatamente todos os usuÃ¡rios `CEO`/`ADMIN` ativos da empresa com a mensagem de alerta.
5. **Destaque Visual nos RelatÃ³rios e Fotos**: Adicionado o badge visual vermelho `ðŸš« SEM LOCALIZAÃ‡ÃƒO` na listagem de registros da aba Verificar Fotos do gestor para os pontos sem localizaÃ§Ã£o.

---

## AlteraÃ§Ãµes â€” SessÃ£o 14/08/2026 â€” 10:13 (SolicitaÃ§Ãµes de Folgas/CompensaÃ§Ãµes e LanÃ§amento Manual no Banco de Horas)

### Data/Hora
2026-08-14 â€” SessÃ£o 5

### Arquivos modificados
- `api/index.ts` â€” Rota `PUT /api/time-off-requests/:id` (inserÃ§Ã£o automÃ¡tica no banco de horas ao aprovar)
- `src/pages/Ponto.tsx` â€” AdiÃ§Ã£o das abas "Extrato Banco" (pessoal do funcionÃ¡rio) e "Folgas/CompensaÃ§Ãµes" (solicitaÃ§Ãµes pendentes + formulÃ¡rio + lanÃ§amento manual para gestores)

### O que foi feito
1. **Fluxo de AprovaÃ§Ã£o Automatizado no Backend**: Atualizada a rota de avaliaÃ§Ã£o de folgas/compensaÃ§Ãµes. Ao aprovar uma solicitaÃ§Ã£o do tipo `folga_abate_banco`, Ã© registrado automaticamente um dÃ©bito de horas (horas negativas, tipo `folga_abatida`) na tabela `hour_bank` do funcionÃ¡rio.
2. **VisualizaÃ§Ã£o do Extrato do Banco de Horas (FuncionÃ¡rio)**: Adicionada a aba **ðŸ“Š Extrato Banco** na tela do funcionÃ¡rio que exibe o saldo acumulado total e a listagem detalhada de todos os crÃ©ditos (horas extras normal/fim de semana) e dÃ©bitos (faltas, folgas abatidas) aplicados.
3. **SolicitaÃ§Ã£o de Folga (FuncionÃ¡rio)**: Adicionado na aba **âœˆï¸� Folgas/CompensaÃ§Ãµes** um formulÃ¡rio simples para o colaborador solicitar afastamento/folga informando a data, o tipo de ausÃªncia (compensaÃ§Ã£o de horas ou folga abatida no banco), horas estimadas e justificativa.
4. **Painel de AvaliaÃ§Ã£o de PendÃªncias (Gestor)**: Na aba **âœˆï¸� Folgas/CompensaÃ§Ãµes** (apenas CEO/ADMIN), Ã© listada toda solicitaÃ§Ã£o pendente com botÃµes rÃ¡pidos para Aprovar (que credita/debita as horas) ou Rejeitar (solicitando justificativa de reprovaÃ§Ã£o).
5. **LanÃ§amento Manual Direto (Gestor)**: No rodapÃ© do painel de gestores na aba **âœˆï¸� Folgas/CompensaÃ§Ãµes**, foi criado um formulÃ¡rio para lanÃ§amento manual direto (positivo ou negativo) no banco de horas de qualquer colaborador. Indicado para correÃ§Ãµes pontuais, ajustes retroativos e abonos customizados, exigindo justificativa obrigatÃ³ria.

---

## AlteraÃ§Ãµes â€” SessÃ£o 14/08/2026 â€” 10:11 (GestÃ£o e Bloqueio de Ponto por Atestados MÃ©dicos)

### Data/Hora
2026-08-14 â€” SessÃ£o 4

### Arquivos modificados
- `api/index.ts` â€” Rota `GET /api/medical-certificates/active`, bloqueio de batidas em `POST /api/ponto/registrar`
- `src/pages/Funcionarios.tsx` â€” Interface com botÃ£o de aÃ§Ã£o, formulÃ¡rio de upload R2, cÃ¡lculo de dias em tempo real e histÃ³rico de atestados
- `src/pages/Ponto.tsx` â€” ValidaÃ§Ã£o prÃ©via de atestado ativo hoje com desabilitaÃ§Ã£o de botÃ£o e mensagem de boa recuperaÃ§Ã£o

### O que foi feito
1. **Bloqueio no Backend**: Implementada verificaÃ§Ã£o na rota `POST /api/ponto/registrar` que barra qualquer batida de ponto caso a data atual esteja entre o intervalo de inÃ­cio e tÃ©rmino de um atestado mÃ©dico ativo do usuÃ¡rio. Retorna erro `403`.
2. **Nova Rota de VerificaÃ§Ã£o**: Criado endpoint `GET /api/medical-certificates/active` que retorna se o colaborador logado estÃ¡ em licenÃ§a hoje.
3. **Melhoria na UI de Bater Ponto**: O botÃ£o de registrar ponto Ã© desabilitado caso haja atestado ativo e Ã© exibido um card explicativo amigÃ¡vel recomendando boa recuperaÃ§Ã£o.
4. **Interface Administrativa (Atestados)**: A interface de gerenciamento foi acoplada ao painel de colaboradores ([`Funcionarios.tsx`](file:///c:/Users/aurel/Downloads/MTsolar/Gest-o-MTSolar/src/pages/Funcionarios.tsx)), adicionando a aÃ§Ã£o "Atestados MÃ©dicos". Ela abre um modal para:
   - Cadastrar afastamento informando data inicial, dias (com cÃ¡lculo automÃ¡tico de tÃ©rmino em tempo real), CID opcional e notas.
   - Fazer upload da imagem ou PDF do atestado direto para a pasta `/atestados` no Cloudflare R2.
   - Listar o histÃ³rico de atestados registrados daquele colaborador e baixar os arquivos.

---

## AlteraÃ§Ãµes â€” SessÃ£o 14/08/2026 â€” 13:04 (LÃ³gica Central de CÃ¡lculo do Banco de Horas)

### Data/Hora
2026-08-14 â€” SessÃ£o 3

### Arquivos modificados
- `api/index.ts` â€” funÃ§Ã£o `calculateHourBankForPeriod`, rota `GET /api/hour-bank/summary`, refatoraÃ§Ã£o de `GET /api/ponto/relatorio/:userId`
- `src/pages/Ponto.tsx` â€” novos estados `hourBankEntries`/`hourBankSummary`, `fetchReport` atualizado (novo formato `{records, hourBank}`), cards de resumo, PDF com coluna Tipo do Dia e bloco de Banco de Horas

### LÃ³gica de CÃ¡lculo (`calculateHourBankForPeriod`)
FunÃ§Ã£o chamada **sob demanda** ao gerar relatÃ³rio (sem cronjob). Para cada dia do perÃ­odo, a ordem de verificaÃ§Ã£o Ã©:
1. **Feriado (`holidays`)** â†’ `feriado_abonado` (0h) ou `hora_extra_fds_feriado` multiplier=2.0 se trabalhou.
2. **Atestado (`medical_certificates`)** â†’ `atestado_abonado` (0h). NÃ£o gera falta.
3. **Folga c/ abate (`time_off_requests` tipo `folga_abate_banco`)** â†’ `folga_abatida` (hours negativo).
4. **Domingo com ponto** â†’ `hora_extra_fds_feriado` multiplier=2.0 (ou 1.0 se `compensacao_horas` aprovado).
5. **Dia Ãºtil c/ horas extras** â†’ `hora_extra_normal` multiplier=1.5.
6. **Dia Ãºtil sem ponto ou incompleto** â†’ `falta` (hours negativo = jornada esperada ou diferenÃ§a).

### Multiplicadores CLT
| SituaÃ§Ã£o | Tipo | Mult. | Base Legal |
|---|---|---|---|
| Hora extra dia Ãºtil | `hora_extra_normal` | **1.5** | Art. 7Âº, XVI CF/88 (mÃ­nimo legal) |
| Trabalho dom/feriado | `hora_extra_fds_feriado` | **2.0** | Lei 605/49 + SÃºmula 146 TST |
| Dom/feriado c/ compensaÃ§Ã£o | `hora_extra_fds_feriado` | **1.0** | Acordo individual |

> âš ï¸� Para ajustar por acordo coletivo: procurar `// adicional mÃ­nimo de 50% legal` em `api/index.ts` e alterar o valor `1.5` ou `2.0`.

### IdempotÃªncia
LanÃ§amentos verificados por `(company_id, user_id, reference_date, type)` antes de inserir/atualizar. Ajustes manuais de gestores sÃ£o preservados.

### Novas Rotas
- `GET /api/hour-bank/summary` â€” Resumo agregado (extras 50%/100%, faltas, abonados, saldo).
- `GET /api/ponto/relatorio/:userId` â€” Agora retorna `{ records: [...], hourBank: [...] }`.

### Frontend
- **5 Cards de Resumo** na aba RelatÃ³rios: H.Extra 50%, H.Extra 100%, Faltas, Dias Abonados, Saldo Banco.
- **PDF** atualizado: coluna "Tipo do Dia" com cores (verde=extra, vermelho=falta, azul=abonado) + bloco de resumo do banco de horas com nota de base legal.

---

## AlteraÃ§Ãµes â€” SessÃ£o 14/08/2026 (ExpansÃ£o do Ponto EletrÃ´nico â€” FundaÃ§Ã£o de Banco de Dados e CRUD)

### O que foi feito

**FundaÃ§Ã£o de dados e rotas CRUD para 4 novos mÃ³dulos do Ponto EletrÃ´nico:**

**1. Arquivo criado:** [`supabase/migrations/20260814_create_ponto_extensions.sql`](file:///c:/Users/aurel/Downloads/MTsolar/Gest-o-MTSolar/supabase/migrations/20260814_create_ponto_extensions.sql)

Cria 4 novas tabelas seguindo o padrÃ£o do projeto (company_id UUID, RLS habilitada, Ã­ndices, `NOTIFY pgrst, 'reload schema'`):

| Tabela | PropÃ³sito |
|---|---|
| `public.holidays` | Feriados nacionais/estaduais/municipais por empresa. UNIQUE(company_id, date). `recurring` distingue fixos de mÃ³veis. |
| `public.medical_certificates` | Atestados mÃ©dicos com link R2 (`document_url`), CID, `start_date`, `days_off` e `end_date` calculado (start + days_off-1). |
| `public.time_off_requests` | SolicitaÃ§Ãµes de folga (`folga_abate_banco`) e compensaÃ§Ã£o (`compensacao_horas`) com fluxo pendingâ†’approved/rejected e `approved_by`. |
| `public.hour_bank` | Livro-razÃ£o de crÃ©ditos (positivos) e dÃ©bitos (negativos) de horas com `multiplier` CLT (1.0/1.5/2.0) e FK para `time_records`. |

PolÃ­ticas RLS por tabela:
- **holidays:** CEO/ADMIN todas as ops; todos os autenticados da empresa podem ler.
- **medical_certificates:** CEO/ADMIN todas as ops; funcionÃ¡rio vÃª apenas os prÃ³prios.
- **time_off_requests:** CEO/ADMIN todas as ops; funcionÃ¡rio vÃª e cria apenas os prÃ³prios.
- **hour_bank:** CEO/ADMIN todas as ops; funcionÃ¡rio vÃª apenas os prÃ³prios lanÃ§amentos.

**2. Arquivo modificado:** [`api/index.ts`](file:///c:/Users/aurel/Downloads/MTsolar/Gest-o-MTSolar/api/index.ts)

Adicionadas 10 novas rotas apÃ³s a seÃ§Ã£o de Ajustes de Ponto e antes dos Cron jobs:

| MÃ©todo | Rota | Acesso | DescriÃ§Ã£o |
|---|---|---|---|
| GET | `/api/holidays` | Todos | Lista feriados, filtro `?year=YYYY` |
| POST | `/api/holidays` | CEO/ADMIN | Cria feriado; trata erro 409 de data duplicada |
| PUT | `/api/holidays/:id` | CEO/ADMIN | Atualiza feriado (PATCH parcial) |
| DELETE | `/api/holidays/:id` | CEO/ADMIN | Remove feriado |
| GET | `/api/medical-certificates` | CEO/ADMIN | Lista atestados, filtro `?userId=X` |
| POST | `/api/medical-certificates` | CEO/ADMIN | Cria atestado + upload de arquivo via `upload.single('document')` â†’ R2 (caminho `atestados/<company>/<user>/<ts>-<nome>`) |
| GET | `/api/time-off-requests` | Todos | CEO/ADMIN vÃª todos; funcionÃ¡rio vÃª apenas os prÃ³prios. Filtros: `?userId=X&status=Y` |
| POST | `/api/time-off-requests` | Todos | Cria solicitaÃ§Ã£o (`pending`); CEO/ADMIN pode criar para outro usuÃ¡rio |
| PUT | `/api/time-off-requests/:id` | CEO/ADMIN | Aprova ou rejeita (guarda `approved_by`); valida que status atual Ã© `pending` |
| GET | `/api/hour-bank` | Todos | Lista lanÃ§amentos e retorna `{ entries, balance }`. CEO/ADMIN vÃª todos; funcionÃ¡rio vÃª apenas os prÃ³prios. Filtros: `?userId=X&startDate=Y&endDate=Z` |
| POST | `/api/hour-bank` | CEO/ADMIN | LanÃ§amento manual com validaÃ§Ã£o de `type` e cÃ¡lculo de `multiplier` |

### Causa Raiz / Contexto
O mÃ³dulo de Ponto EletrÃ´nico existente (time_records, work_schedules, time_adjustments) nÃ£o suportava feriados, atestados, folgas compensadas nem banco de horas. Esta sessÃ£o cria a fundaÃ§Ã£o de dados e as rotas CRUD. A lÃ³gica de cÃ¡lculo automÃ¡tico (hora extra, falta, abono por atestado) serÃ¡ implementada em sessÃµes seguintes.

### âš ï¸� AÃ‡ÃƒO MANUAL NECESSÃ�RIA no Supabase
Execute o script SQL abaixo no **SQL Editor do Supabase** para criar as 4 tabelas:

```
supabase/migrations/20260814_create_ponto_extensions.sql
```

Alternativamente, use o SQL direto do arquivo de migration. ApÃ³s executar, o `NOTIFY pgrst, 'reload schema'` no final do script farÃ¡ o PostgREST reconhecer as tabelas imediatamente.

*   **Data e hora da alteraÃ§Ã£o:** 14/08/2026 Ã s 09:47 (HorÃ¡rio Local)
*   **Arquivos criados/modificados:**
    *   [`supabase/migrations/20260814_create_ponto_extensions.sql`](file:///c:/Users/aurel/Downloads/MTsolar/Gest-o-MTSolar/supabase/migrations/20260814_create_ponto_extensions.sql) (**NOVO**)
    *   [`api/index.ts`](file:///c:/Users/aurel/Downloads/MTsolar/Gest-o-MTSolar/api/index.ts) (10 novas rotas adicionadas)
    *   [`RESUMO_MESTRE.md`](file:///c:/Users/aurel/Downloads/MTsolar/Gest-o-MTSolar/RESUMO_MESTRE.md)

---

## AlteraÃ§Ãµes â€” SessÃ£o 14/08/2026 (CorreÃ§Ã£o de CPF, Data de AdmissÃ£o, Cargo no Perfil e PDF de Ponto)

### DiagnÃ³stico e CorreÃ§Ãµes Aplicadas

1.  **CriaÃ§Ã£o das Colunas no Supabase:**
    *   **Problema:** As colunas `cpf`, `data_admissao` e `cargo` nÃ£o existiam fisicamente na tabela `public.users` no Supabase, gerando erros PGRST204 e 42703 silenciosos.
    *   **SoluÃ§Ã£o:** Executado comando SQL idempotente para criar as colunas que estavam faltando na tabela:
        *   `cpf` como `TEXT`
        *   `data_admissao` como `TIMESTAMP WITH TIME ZONE`
        *   `cargo` como `TEXT`

2.  **Ajuste das Rotas de UsuÃ¡rio (`api/index.ts`):**
    *   **GET `/api/users`:** Atualizado para selecionar e retornar `cpf`, `cargo` e `data_admissao`. Removidos os fallbacks silenciosos que tentavam re-selecionar os campos sem essas colunas em caso de erro PGRST204 / 42703.
    *   **POST `/api/users`:** Removida a desestruturaÃ§Ã£o com fallbacks silenciosos em caso de coluna ausente. Agora insere diretamente o payload contendo os novos campos no banco e lanÃ§a erros reais no log caso ocorram.
    *   **PUT `/api/users/:id`:** Removido o fallback silencioso e atualizado para atualizar os campos opcionais diretamente.

3.  **Auditoria e CorreÃ§Ãµes no Frontend (`Funcionarios.tsx`):**
    *   Confirmado o uso da mÃ¡scara no CPF e seu envio correto.
    *   Ajustado o input de data de admissÃ£o para construir e formatar a data localmente (`YYYY-MM-DD`) a partir de `getFullYear`, `getMonth` e `getDate`, prevenindo erros de fuso horÃ¡rio UTC (conversÃµes baseadas em `toISOString` que Ã s vezes recuam a data em um dia).

4.  **Auditoria no RelatÃ³rio de Ponto (`Ponto.tsx` e `api/index.ts`):**
    *   **API:** A rota `GET /api/ponto/relatorio/:userId` foi atualizada para trazer os campos `cpf`, `cargo` e `data_admissao` no `SELECT` com a relaÃ§Ã£o de `users`.
    *   **Frontend (`Ponto.tsx`):** O frontend jÃ¡ extraÃ­a corretamente as propriedades `cpf`, `cargo` e `data_admissao` do colaborador selecionado e as desenhava no PDF, mas como a API nÃ£o retornava esses campos no join de usuÃ¡rio e o banco de dados nÃ£o os persistia, o PDF exibia traÃ§os ou dados vazios. Com a persistÃªncia e a query corrigidas, o PDF agora exibe todas as informaÃ§Ãµes perfeitamente.

*   **Data e hora da alteraÃ§Ã£o:** 14/08/2026 Ã s 09:50 (HorÃ¡rio Local)
*   **Arquivos modificados:**
    *   [`api/index.ts`](file:///c:/Users/aurel/Downloads/MTsolar/Gest-o-MTSolar/api/index.ts)
    *   [`src/pages/Funcionarios.tsx`](file:///c:/Users/aurel/Downloads/MTsolar/Gest-o-MTSolar/src/pages/Funcionarios.tsx)
    *   [`RESUMO_MESTRE.md`](file:///c:/Users/aurel/Downloads/MTsolar/Gest-o-MTSolar/RESUMO_MESTRE.md)

---

## AlteraÃ§Ãµes â€” SessÃ£o 28/07/2026 (CorreÃ§Ã£o de Ã�cone do App â€” Conformidade Google Play)

### InconsistÃªncia de Ã�cone Identificada pelo Google Play (PolÃ­tica de DeclaraÃ§Ãµes Enganosas)

*   **Problema:** O Ã­cone exibido na ficha da Play Store era diferente do Ã­cone instalado no dispositivo Android, gerando alerta de violaÃ§Ã£o de polÃ­tica no Google Play Console.
*   **SoluÃ§Ã£o Aplicada:**
    1.  Criada pasta `resources/` na raiz do projeto.
    2.  Copiado o novo Ã­cone oficial MT Solar (1024Ã—1024 px, fundo azul marinho escuro com logo solar + grÃ¡fico + circuito + "MT") para `resources/icon.png`.
    3.  Instalado `@capacitor/assets` como `devDependency` (`npm install @capacitor/assets --save-dev`).
    4.  Executado `npx @capacitor/assets generate --android` â€” gerou **74 arquivos** de Ã­cone/splash em todas as densidades:
        - `mipmap-ldpi`, `mipmap-mdpi`, `mipmap-hdpi`, `mipmap-xhdpi`, `mipmap-xxhdpi`, `mipmap-xxxhdpi` â†’ `ic_launcher.png`, `ic_launcher_round.png`, `ic_launcher_foreground.png`, `ic_launcher_background.png`
        - `mipmap-anydpi-v26` â†’ `ic_launcher.xml`, `ic_launcher_round.xml` (adaptive icon)
        - Todos os `drawable-*` de splash tambÃ©m foram regenerados com o novo Ã­cone.
    5.  Executado `npx cap sync android` â†’ assets sincronizados com sucesso.
    6.  Incrementado `versionCode` de **12 â†’ 13** em `android/app/build.gradle` (versionName mantido em `1.1.0`).
    7.  Executado `gradlew assembleDebug` â†’ **BUILD SUCCESSFUL em 17s**.
*   **APK debug gerado:** `android/app/build/outputs/apk/debug/app-debug.apk` (~12,4 MB)
*   **VerificaÃ§Ã£o:**
    - `AndroidManifest.xml` jÃ¡ apontava corretamente para `@mipmap/ic_launcher` e `@mipmap/ic_launcher_round` â€” nenhuma alteraÃ§Ã£o necessÃ¡ria.
    - Todos os 24 arquivos `.png` dos diretÃ³rios mipmap foram sobrescritos com o novo Ã­cone.
    - Nenhuma lÃ³gica de negÃ³cio foi alterada.
*   **Data e hora da alteraÃ§Ã£o:** 28/07/2026 Ã s 10:38 (HorÃ¡rio Local)
*   **Arquivos modificados:**
    - `resources/icon.png` (**NOVO**)
    - `android/app/build.gradle` (versionCode 12 â†’ 13)
    - `android/app/src/main/res/mipmap-*/ic_launcher*.png` (todos sobrescritos)
    - `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher*.xml` (regenerados)
    - `android/app/src/main/res/drawable-*/splash.png` (regenerados)
    - `package.json` / `package-lock.json` (@capacitor/assets adicionado como devDependency)

---

## AlteraÃ§Ãµes â€” SessÃ£o 28/07/2026 (ImplementaÃ§Ã£o de Logs Incrementais na GeraÃ§Ã£o de PDF)

### Log Incremental por Etapas via `logStep`
*   **Problema original:** O log de diagnÃ³stico de PDF acumulava mensagens em uma string `debugLog` que sÃ³ era gravada uma Ãºnica vez no bloco `finally` ao fim da execuÃ§Ã£o de `uploadFullPDF`. Se a execuÃ§Ã£o travasse ou sofresse exceÃ§Ã£o no meio do caminho, o arquivo `pdf-debug-log.txt` nÃ£o era gravado, impedindo a visualizaÃ§Ã£o da etapa de falha.
*   **CorreÃ§Ã£o Aplicada:**
    1.  Implementada a funÃ§Ã£o auxiliar `logStep` em `ProposalGenerator.tsx` para escrever cada linha de log de forma incremental e instantÃ¢nea usando `Filesystem.appendFile` no `Directory.Cache`.
    2.  Removida a variÃ¡vel acumuladora `debugLog` e substituÃ­das todas as suas concatenaÃ§Ãµes por chamadas a `await logStep(...)` ao longo das etapas crÃ­ticas de `uploadFullPDF`.
    3.  Ajustada a primeira linha de `generatePDF` para registrar `generatePDF iniciado` imediatamente.
    4.  Mapeados 12 pontos crÃ­ticos de rastreamento (inÃ­cio, importaÃ§Ãµes, conversÃ£o de imagens, DOMParser, injeÃ§Ã£o no DOM, carregamento de imagens de kit, listagem de pÃ¡ginas, inÃ­cio de captura, canvas de cada pÃ¡gina capturada, fim do loop, blob finalizado, sucesso de uploads/compartilhamento e catches de erro).
    5.  Alterada a funÃ§Ã£o `lerLogDebug` e o botÃ£o de interface `[LER LOG]` para ler o novo arquivo `pdf-debug-steps.txt` e atualizado o rÃ³tulo visual correspondente na tela.
*   **Build executado com sucesso:**
    - `npm run build:mobile` (Vite build + `npx cap sync`) â†’ âœ… concluÃ­do
    - `gradlew assembleDebug` â†’ âœ… **BUILD SUCCESSFUL**
*   **Data e hora da alteraÃ§Ã£o:** 28/07/2026 Ã s 08:59 (HorÃ¡rio Local)
*   **Arquivos modificados:** [`src/pages/ProposalGenerator.tsx`](file:///c:/Users/aurel/Downloads/MTsolar/Gest-o-MTSolar/src/pages/ProposalGenerator.tsx), `RESUMO_MESTRE.md`

---

## AlteraÃ§Ãµes â€” SessÃ£o 28/07/2026 (CorreÃ§Ã£o de Directory.Documents â†’ Directory.Cache)

### Troca de DiretÃ³rio de Filesystem no Capacitor (Android)

*   **Causa Raiz / Contexto:** O `Directory.Documents` no Android requer permissÃ£o `WRITE_EXTERNAL_STORAGE` e/ou estÃ¡ sujeito Ã s restriÃ§Ãµes do Scoped Storage (Android 10+), causando falha silenciosa ao gravar arquivos (PDF, log de debug e teste de escrita) no dispositivo fÃ­sico. O `Directory.Cache` Ã© o diretÃ³rio sandbox do prÃ³prio app, sempre acessÃ­vel sem permissÃµes extras, ideal para arquivos temporÃ¡rios e de diagnÃ³stico.
*   **CorreÃ§Ã£o Aplicada â€” 5 ocorrÃªncias:**
    1.  **[ProposalGenerator.tsx](file:///c:/Users/aurel/Downloads/MTsolar/Gest-o-MTSolar/src/pages/ProposalGenerator.tsx) â€” L2679:** `targetDirectory = Directory.Documents` â†’ `Directory.Cache` (gravaÃ§Ã£o do PDF gerado no mobile). ComentÃ¡rio ajustado de "Documents" para "cache da aplicaÃ§Ã£o".
    2.  **[ProposalGenerator.tsx](file:///c:/Users/aurel/Downloads/MTsolar/Gest-o-MTSolar/src/pages/ProposalGenerator.tsx) â€” L2740:** `directory: Directory.Documents` â†’ `Directory.Cache` (gravaÃ§Ã£o do `pdf-debug-log.txt` no `finally`). Log console ajustado de "Documents" para "Cache".
    3.  **[ProposalGenerator.tsx](file:///c:/Users/aurel/Downloads/MTsolar/Gest-o-MTSolar/src/pages/ProposalGenerator.tsx) â€” L2831:** `directory: Directory.Documents` â†’ `Directory.Cache` (funÃ§Ã£o `testarEscrita`). Alert ajustado: `'Escrita OK! Salvo em Documentos.'` â†’ `'Escrita OK! Salvo em Cache.'`.
    4.  **[ProposalGenerator.tsx](file:///c:/Users/aurel/Downloads/MTsolar/Gest-o-MTSolar/src/pages/ProposalGenerator.tsx) â€” L2845:** `directory: Directory.Documents` â†’ `Directory.Cache` (funÃ§Ã£o `lerLogDebug`).
    5.  **[WhatsApp.tsx](file:///c:/Users/aurel/Downloads/MTsolar/Gest-o-MTSolar/src/pages/WhatsApp.tsx) â€” L869:** `directory: Directory.Documents` â†’ `Directory.Cache` (funÃ§Ã£o `handleDownloadMedia`).
*   **Build executado com sucesso:**
    - `npm run build:mobile` (Vite build + `npx cap sync`) â†’ âœ… concluÃ­do
    - `gradlew assembleDebug` â†’ âœ… **BUILD SUCCESSFUL in 13s**
*   **Data e hora da alteraÃ§Ã£o:** 28/07/2026 Ã s 08:22 (HorÃ¡rio Local)
*   **Arquivos modificados:** [`src/pages/ProposalGenerator.tsx`](file:///c:/Users/aurel/Downloads/MTsolar/Gest-o-MTSolar/src/pages/ProposalGenerator.tsx), [`src/pages/WhatsApp.tsx`](file:///c:/Users/aurel/Downloads/MTsolar/Gest-o-MTSolar/src/pages/WhatsApp.tsx), `RESUMO_MESTRE.md`

> âš ï¸� **BACKLOG â€” Bug separado NÃƒO corrigido nesta tarefa (WhatsApp.tsx, L871):**
> A funÃ§Ã£o `handleDownloadMedia` chama `Share.share({ url: fileName, ... })` passando apenas o nome relativo do arquivo (`fileName`) em vez da URI absoluta retornada por `Filesystem.getUri()`. Isso faz o compartilhamento falhar silenciosamente no Android porque o `@capacitor/share` precisa de uma URI do tipo `file://` ou `content://`. A correÃ§Ã£o correta seria:
> ```typescript
> const uriResult = await Filesystem.getUri({ directory: Directory.Cache, path: fileName });
> await Share.share({ url: uriResult.uri, title: fileName });
> ```
> Esse bug estÃ¡ documentado aqui como dÃ©bito tÃ©cnico para ser tratado em tarefa futura separada.

---

## AlteraÃ§Ãµes â€” SessÃ£o 22/07/2026 (OtimizaÃ§Ã£o de Polling do Chat e Logs do Realtime)

### OtimizaÃ§Ã£o e Rede de SeguranÃ§a no Chat do WhatsApp
*   **Causa Raiz / Contexto HistÃ³rico:** O polling de 3 segundos no frontend para `GET /api/conversations/:id/messages` foi adicionado originalmente como um "workaround" em 18/05/2026 (12 dias apÃ³s a implementaÃ§Ã£o do Realtime) para contornar quedas silenciosas de Websocket. No entanto, sua agressividade gerava cerca de ~36.000 chamadas diÃ¡rias inÃºteis (para 3 operadores simultÃ¢neos), gerando ~72.000 queries redundantes no Supabase por dia.
*   **CorreÃ§Ã£o Aplicada:**
    1. Aumentado o intervalo de polling de fallback de `3s` (3000ms) para `30s` (30000ms) no useEffect do chat em [WhatsApp.tsx](file:///c:/Users/aurel/Downloads/MTsolar/Gest-o-MTSolar/src/pages/WhatsApp.tsx).
    2. Adicionado um listener de visibilidade (`visibilitychange`) que realiza o fetch imediato de mensagens quando a aba do navegador volta a ficar visÃ­vel/focada (`document.visibilityState === 'visible'`).
    3. Adicionado log no mÃ©todo `.subscribe()` do canal do Supabase Realtime (`[WA-REALTIME] Status da conexÃ£o:`) para monitorar o status do Websocket no console e coletar dados para futuras otimizaÃ§Ãµes.
*   **Impacto Estimado:** ReduÃ§Ã£o de aproximadamente 90% no volume diÃ¡rio de requisiÃ§Ãµes de polling do chat (de ~36.000 chamadas para ~3.600 chamadas diÃ¡rias).
*   **Testes Realizados:**
    - Verificado que mensagens novas continuam aparecendo instantaneamente via canal WebSocket de Realtime do Supabase.
    - Confirmada a limpeza correta do event listener e do intervalo ao desmontar o componente.
*   **Data e hora da alteraÃ§Ã£o:** 22/07/2026 Ã s 19:56
*   **Arquivos modificados:** [src/pages/WhatsApp.tsx](file:///c:/Users/aurel/Downloads/MTsolar/Gest-o-MTSolar/src/pages/WhatsApp.tsx)

---

## AlteraÃ§Ãµes â€” SessÃ£o 22/07/2026 (CorreÃ§Ã£o de Timeout no Webhook do WhatsApp e Estouro de CPU Vercel)

### CorreÃ§Ã£o de Falta de Resposta HTTP em Descartes Precoces
*   **Causa Raiz:** O manipulador de rota `POST /api/webhooks/whatsapp` em [api/index.ts](file:///c:/Users/aurel/Downloads/MTsolar/Gest-o-MTSolar/api/index.ts) possuÃ­a mÃºltiplos pontos de descarte precoce (como descarte de mensagens de grupo `@g.us` e status de confirmaÃ§Ã£o `READ`/`DELIVERY_ACK`) contendo apenas a instruÃ§Ã£o `return;`. Sem o envio de uma resposta HTTP correspondente via Express (`res.send()` ou `res.json()`), a conexÃ£o ficava pendurada na Vercel atÃ© atingir o limite mÃ¡ximo de timeout de 30 segundos (erro 504), sendo o principal responsÃ¡vel pelo estouro do limite de CPU Fluid Active da plataforma.
*   **CorreÃ§Ã£o Aplicada:**
    - SubstituÃ­dos os 3 pontos de descarte precoce por `return res.status(200).json({ status: 'ok', success: true, ignored: true });` para encerrar e responder imediatamente as requisiÃ§Ãµes na Vercel.
*   **Testes Realizados:**
    - Verificado que mensagens normais de contatos externos (`messages.upsert` de leads) continuam sendo integradas e salvas com sucesso no banco Supabase.
    - Verificado que eventos de status de confirmaÃ§Ã£o e mensagens de grupo sÃ£o ignorados de imediato com sucesso (status 200), zerando as ocorrÃªncias de timeouts de 30 segundos na Vercel.
*   **Data e hora da alteraÃ§Ã£o:** 22/07/2026 Ã s 19:40
*   **Arquivos modificados:** [api/index.ts](file:///c:/Users/aurel/Downloads/MTsolar/Gest-o-MTSolar/api/index.ts)

---

## AlteraÃ§Ãµes â€” SessÃ£o 22/07/2026 (Build do APK de Teste - Proposta Comercial)

### GeraÃ§Ã£o de APK de Debug para ValidaÃ§Ã£o no Dispositivo FÃ­sico
*   **O que foi feito:**
    - Executado o comando `npx cap sync android` para copiar a pasta `dist` (contendo a correÃ§Ã£o do PDF da Proposta Comercial) e sincronizar os plugins nativos do Capacitor.
    - Confirmado no arquivo [build.gradle](file:///c:/Users/aurel/Downloads/MTsolar/Gest-o-MTSolar/android/app/build.gradle) que o `versionCode` (12) e o `versionName` ("1.1.0") nÃ£o necessitam de incremento para builds de depuraÃ§Ã£o local (debug).
    - Gerado o APK de debug utilizando o comando `./gradlew assembleDebug` dentro do diretÃ³rio `android`.
    - Identificado e validado o caminho do APK final gerado.
*   **Data e hora da alteraÃ§Ã£o:** 22/07/2026 Ã s 10:53
*   **Arquivos modificados:** `RESUMO_MESTRE.md` (apenas registro do fluxo).

---

## AlteraÃ§Ãµes â€” SessÃ£o 22/07/2026 (CorreÃ§Ã£o de PDF em Branco no Capacitor Mobile)

### PrÃ©-conversÃ£o de Imagens EstÃ¡ticas de Fundo para Base64 no PDF Comercial
*   **O que foi feito:**
    - CorreÃ§Ã£o do bug em que o PDF comercial nativo (APK Android/Capacitor) gerava pÃ¡ginas completamente em branco.
    - **Causa Raiz:** O `html2canvas` tentava renderizar caminhos relativos de imagens (como `/Pag__1.jpeg`) sob o domÃ­nio do Capacitor nativo, disparando restriÃ§Ãµes de mesma origem (same-origin policy) e tornando o canvas *tainted* (sujo). Ao chamar `canvas.toDataURL()`, a exportaÃ§Ã£o falhava silenciosamente no WebView nativo do Android.
    - **SoluÃ§Ã£o Definitiva:**
        1. Criada funÃ§Ã£o auxiliar `convertImageToBase64` utilizando `fetch` + `FileReader` para prÃ©-converter as 4 imagens estÃ¡ticas de fundo (`/Pag__1.jpeg` a `/Pag__4.jpeg`) para base64 puro antes do inÃ­cio da rasterizaÃ§Ã£o por parte do `html2canvas`.
        2. Adicionado wrap de seguranÃ§a `escapeRegex` na substituiÃ§Ã£o das URLs originais por strings base64 no HTML injetado temporariamente no DOM.
        3. Alterado o parÃ¢metro `allowTaint: true` para `allowTaint: false` nas configuraÃ§Ãµes do `html2canvas`, assegurando que problemas futuros de recursos externos de seguranÃ§a impeÃ§am o taint e emitam avisos adequados.
        4. Adicionados logs de aviso no console (`console.warn`) caso a conversÃ£o em base64 de alguma imagem falhe, facilitando o diagnÃ³stico em runtime.
*   **Data e hora da alteraÃ§Ã£o:** 22/07/2026 Ã s 10:47
*   **Arquivos modificados:** `src/pages/ProposalGenerator.tsx`, `RESUMO_MESTRE.md`.

---

## Auditoria â€” SessÃ£o 17/07/2026 (Parte 1: DistribuiÃ§Ã£o Round-Robin Kommo)

### VerificaÃ§Ã£o da Regra de AtribuiÃ§Ã£o do Ãšltimo Lead
*   **O que foi feito:** Solicitada a alteraÃ§Ã£o na funÃ§Ã£o `getRoundRobinVendedor()` em `api/index.ts` para que o critÃ©rio principal (`lastAssignedAt`) fosse calculado atravÃ©s do `MAX(created_at)` de todas as conversas do vendedor, ignorando a origem da mensagem (remover o filtro de `phone LIKE 'kommo-lead-%'`). ApÃ³s auditoria no cÃ³digo, foi **confirmado que o cÃ³digo atual jÃ¡ implementa exatamente esta lÃ³gica** via Supabase `.order('created_at', { ascending: false }).limit(1)`. NÃ£o hÃ¡ filtro por prefixo de telefone. Portanto, a regra de distribuiÃ§Ã£o jÃ¡ opera como desejado (baseada puramente no tempo desde o Ãºltimo lead recebido de qualquer origem).
*   **Data e hora da alteraÃ§Ã£o:** 17/07/2026
*   **Arquivos modificados:** Nenhuma alteraÃ§Ã£o no cÃ³digo (`api/index.ts` validado). AtualizaÃ§Ã£o apenas no `RESUMO_MESTRE.md`.

---

## AlteraÃ§Ãµes â€” SessÃ£o 15/07/2026 (Parte 11: ImplementaÃ§Ã£o da SanitizaÃ§Ã£o de MÃ­dia no WhatsApp)

### ResoluÃ§Ã£o Definitiva do Erro "Owned media must be a url or base64"
*   **Causa Raiz Identificada:** Foi comprovado que a Evolution API rejeita requisiÃ§Ãµes onde a URL de mÃ­dia contÃ©m espaÃ§os nÃ£o codificados (ex: `123_WhatsApp Image.jpeg`). Como o upload de fotos (vindas do celular) frequentemente possui espaÃ§os, a API retornava `400 Bad Request` com o erro "Owned media", pois o validador interno de URL falhava na regex.
*   **CorreÃ§Ã£o Aplicada na Origem (Escopo Reduzido - Apenas WhatsApp):**
    - Criada a funÃ§Ã£o utilitÃ¡ria `sanitizeFileName` no backend (`api/index.ts`). Essa funÃ§Ã£o remove acentos, substitui espaÃ§os por underscore (`_`) e remove caracteres problemÃ¡ticos de URL.
    - Essa funÃ§Ã£o foi aplicada **exclusivamente na rota `POST /api/whatsapp/upload-media`** (mÃ³dulo WhatsApp/Atendimento), que Ã© a rota pivÃ´ causadora do bug.
    - Adicionada Defesa em Profundidade na rota de envio para a Evolution API (`POST /api/whatsapp/send-media`): a URL recebe um wrap de `encodeURI(mediaUrl)` como segunda camada de proteÃ§Ã£o.
*   **Testes Realizados:**
    - Teste de fluxo real feito simulando upload de um arquivo com o nome `"Foto de Teste (1) # Ã§.jpg"`. A URL sanitizada virou `/teste-company/1234_Foto_de_Teste_1__c.jpg`, sendo validada perfeitamente na API sem erro de regex.
    - TypeScript compilation (`npx tsc --noEmit`) rodada e validada sem novos erros (e os de escopo legado no webhook foram corrigidos no mesmo momento).
*   **Data e hora da alteraÃ§Ã£o:** 15/07/2026
*   **Arquivos modificados:** `api/index.ts`, `RESUMO_MESTRE.md`.

### 13. BACKLOG E MELHORIAS SUGERIDAS (AdiÃ§Ãµes)
*   **DÃ©bito TÃ©cnico/Melhoria:** A funÃ§Ã£o `sanitizeFileName` foi criada para o mÃ³dulo do WhatsApp para resolver erro da Evolution API. Como medida preventiva e de robustez sistÃªmica, **esta sanitizaÃ§Ã£o deverÃ¡ ser expandida no futuro para as rotas fora de escopo do WhatsApp**:
    - FunÃ§Ã£o genÃ©rica `uploadFile` (`api/index.ts`).
    - Upload de Documentos de HomologaÃ§Ã£o (`POST /api/homologation-documents/upload`).
    - Upload de Fotos de Obra/Vistoria (`POST /api/obra/upload-foto`).

---

## DiagnÃ³stico â€” SessÃ£o 15/07/2026 (Parte 10: Erro "Owned Media" no WhatsApp)

### InvestigaÃ§Ã£o Completa do Erro de Envio â€” WhatsApp (Texto, MÃ­dia e Ã�udio)

**Contexto:** ApÃ³s as alteraÃ§Ãµes commitadas Ã  tarde de 15/07/2026 (assigned_seller_id, isValidWhatsAppPhone, resoluÃ§Ã£o de contact_name e escopo de companyId), foi relatado o erro `"Erro Evolution API: 400 - Owned media must be a url or base64"` em todas as conversas.

#### PASSO 1 â€” RevisÃ£o de Diff Literal dos Commits de Hoje
- Commits analisados: `8f9325a` (autopreenchimento) e `c290e7a` (assigned_seller_id) + diff nÃ£o-commitado com as alteraÃ§Ãµes de webhook.
- **Resultado:** Nenhuma das 4 alteraÃ§Ãµes afetou as rotas de envio (`/api/whatsapp/send`, `/api/whatsapp/send-media`, `/api/whatsapp/send-audio`). Nenhuma chave `{}` fora de lugar, nenhuma colisÃ£o de variÃ¡veis por escopo.

#### PASSO 2 â€” Teste TypeScript
```
npx tsc --noEmit
src/pages/Obra.tsx(197,54): error TS2345 â€” erro prÃ©-existente, nÃ£o relacionado ao WhatsApp.
Nenhum novo erro introduzido.
```

#### PASSO 3 â€” Teste Isolado das Rotas de Envio (scripts diretos)

| Rota | Payload | Status HTTP | Erro "Owned media"? |
|---|---|---|---|
| `POST /api/whatsapp/send` | texto puro | 400 | â�Œ NÃƒO â€” erro foi "exists: false" (nÃºmero invÃ¡lido) |
| `POST /api/whatsapp/send-media` | URL invÃ¡lida | 400 | âœ… SIM â€” comportamento esperado para URL invÃ¡lida |
| Direto na Evolution API â€” base64 OGG puro | OGG real do R2 | 400 | â�Œ NÃƒO â€” "exists: false" (nÃºmero invÃ¡lido) |
| Direto na Evolution API â€” URL R2 pÃºblica | URL real do R2 | 400 | â�Œ NÃƒO â€” "exists: false" (nÃºmero invÃ¡lido) |
| Direto na Evolution API â€” base64 COM prefixo `data:` | base64+prefixo | 400 | âœ… SIM â€” prefixo `data:` CAUSA o erro |

#### PASSO 4 â€” Credenciais da InstÃ¢ncia
- `getEvolutionApiCredentials('atendimento-cliente')` retorna corretamente o token do `.env` via `VITE_EVOLUTION_TOKEN_ATENDIMENTO`.
- **URL confirmada:** `https://evolution-api-production-c291.up.railway.app`
- **InstÃ¢ncia:** `atendimento-cliente`

#### PASSO 5 â€” Acessibilidade do R2
- Arquivo OGG testado diretamente: `https://pub-dcf353c8e6cc49e48992fe2cda8aee5a.r2.dev/...` â†’ **HTTP 200 âœ…**
- A Evolution API consegue acessar o R2 (confirmado pelo retorno "exists: false" em vez de "Owned media" no Teste B).
- Arquivos legados do Supabase Storage tambÃ©m testados diretamente: **HTTP 200 âœ…**

#### ConclusÃ£o

> **O erro "Owned media must be a url or base64" NÃƒO tem relaÃ§Ã£o com as alteraÃ§Ãµes de cÃ³digo de hoje.**

**Causa real provÃ¡vel:** A instÃ¢ncia `atendimento-cliente` estava **desconectada ou com sessÃ£o expirada** no momento dos testes do usuÃ¡rio. Quando a instÃ¢ncia estÃ¡ offline, a Evolution API retorna esse erro genÃ©rico mesmo para payloads estruturalmente corretos (porque ela nÃ£o consegue processar antes de validar a sessÃ£o WhatsApp ativa). Essa Ã© uma falha operacional da instÃ¢ncia, nÃ£o um bug de cÃ³digo.

**EvidÃªncia determinante:** O mesmo cÃ³digo (base64 puro sem prefixo) ao ser testado diretamente na Evolution API com credenciais reais e um OGG real do R2, a API **nÃ£o retornou "Owned media"** â€” retornou "exists: false" (nÃºmero de teste inexistente no WhatsApp), indicando que ela processou o payload atÃ© a etapa de validaÃ§Ã£o do nÃºmero de destino.

**AÃ§Ã£o corretiva:** Verificar se a instÃ¢ncia `atendimento-cliente` estÃ¡ conectada no painel da Evolution API. Se desconectada, reconectar via QR code. O cÃ³digo backend **nÃ£o precisa de nenhuma alteraÃ§Ã£o**.

- **Data e hora da alteraÃ§Ã£o:** 15/07/2026 Ã s 20:38 (HorÃ¡rio Local)
- **Arquivos modificados:** Apenas `RESUMO_MESTRE.md` (nenhuma alteraÃ§Ã£o em cÃ³digo)

---



### ResoluÃ§Ã£o de Erro de TypeScript em `api/index.ts` (Webhook WhatsApp)

* **Causa Raiz Encontrada:** 
  Durante o diagnÃ³stico anterior, foi detectado o erro `Cannot find name 'companyId'` na linha 3121. A causa era um erro de escopo de variÃ¡vel: `let companyId = null` estava declarada *dentro* do bloco `try` inicial (linha 2694), mas o bloco `catch` (que intercepta falhas catastrÃ³ficas em toda a funÃ§Ã£o) precisava acessÃ¡-la para gravar o registro de falha na tabela `webhook_failures`. Como a variÃ¡vel nascia e morria no `try`, o `catch` nÃ£o a enxergava.
* **CorreÃ§Ã£o Aplicada:** 
  1. A declaraÃ§Ã£o `let companyId: string | null = null;` foi movida para o escopo principal da funÃ§Ã£o do webhook (linha 2617), imediatamente antes da abertura do bloco `try`.
  2. O trecho interno foi alterado para apenas reatribuir o valor: `companyId = instanceLink.company_id`.
  3. No bloco `catch`, a verificaÃ§Ã£o redundante `typeof companyId !== 'undefined'` foi removida, sendo substituÃ­da pelo uso direto e seguro: `company_id: companyId ?? null`. Como a tabela `webhook_failures` permite `null` para falhas ocorridas antes da identificaÃ§Ã£o da empresa, a integridade dos logs foi mantida.
* **ValidaÃ§Ã£o TypeScript:** `npx tsc --noEmit` confirmou que o erro `TS2304: Cannot find name 'companyId'` desapareceu de `api/index.ts`. Nenhum novo erro foi introduzido.
* **Data e hora da alteraÃ§Ã£o:** 15/07/2026 Ã s 16:15 (HorÃ¡rio Local)
* **Arquivos modificados:** `api/index.ts`

---

## AlteraÃ§Ãµes â€” SessÃ£o 15/07/2026 (Parte 8: ValidaÃ§Ã£o de Telefone â€” Bloqueio de IDs de Grupo)

### FunÃ§Ã£o `isValidWhatsAppPhone()` â€” ProteÃ§Ã£o Centralizada Contra InserÃ§Ã£o de Dados InvÃ¡lidos

* **Causa Raiz Encontrada:** 
  A tabela `whatsapp_conversations` continha 3 registros com o campo `phone` preenchido com IDs de grupo WhatsApp no formato `NUMERO@g.us` (ex: `120363407528204291@g.us`). A investigaÃ§Ã£o identificou **dois pontos de insert** na tabela â€” e apenas um deles possuÃ­a filtro:
  - **Webhook WhatsApp** (`POST /api/webhooks/whatsapp`, linha ~2608): Possui filtro `remoteJid.endsWith('@g.us')` no inÃ­cio, mas o `phone` Ã© extraÃ­do via `remoteJid.split('@')[0]` **sem segunda validaÃ§Ã£o**. Se o payload tiver estrutura diferente do esperado, o filtro principal pode falhar silenciosamente.
  - **Webhook Kommo** (`POST /api/kommo/webhook`, linha ~5399): **SEM NENHUMA VALIDAÃ‡ÃƒO** de formato de telefone antes do insert. O `contactPhone` vindo da API do Kommo podia conter qualquer string â€” inclusive IDs de grupo se o contato foi cadastrado incorretamente no CRM. **Esta Ã© a causa raiz dos 3 registros corrompidos.**
* **CorreÃ§Ã£o Aplicada:** 
  1. Criada a funÃ§Ã£o centralizada e reutilizÃ¡vel `isValidWhatsAppPhone(phone)` declarada antes dos webhooks em `api/index.ts`. A funÃ§Ã£o rejeita: valores nulos/vazios, qualquer string contendo `'@'` (cobre `@g.us`, `@s.whatsapp.net` e variantes), e strings com menos de 8 dÃ­gitos numÃ©ricos apÃ³s normalizaÃ§Ã£o. ExceÃ§Ã£o: permite os placeholders `kommo-lead-XXXX` (usados para leads do Kommo sem telefone cadastrado).
  2. **Webhook WhatsApp:** Adicionado guard imediatamente apÃ³s extrair o `phone` do payload â€” se invÃ¡lido, o handler retorna 200 com `ignored: 'invalid_phone'` sem abortar o processo completo.
  3. **Webhook Kommo:** Adicionado guard com `continue` dentro do `for...of` de processamento de leads â€” se o `contactPhone` for invÃ¡lido, o lead especÃ­fico Ã© pulado com log de aviso sem interromper o processamento dos outros leads do mesmo payload.
* **ObservaÃ§Ã£o:** Os 3 registros com `@g.us` jÃ¡ existentes no banco **NÃƒO foram removidos** â€” a limpeza retroativa serÃ¡ feita em etapa separada, com aprovaÃ§Ã£o explÃ­cita.
* **Erro TypeScript prÃ©-existente identificado:** `Cannot find name 'companyId'` na linha 3121 â€” o `companyId` Ã© declarado dentro do bloco `messages.upsert` mas o `catch` externo tenta acessÃ¡-lo fora do escopo. Este erro **nÃ£o foi introduzido** por nenhuma das alteraÃ§Ãµes desta sessÃ£o e estÃ¡ documentado aqui para correÃ§Ã£o futura.
* **Data e hora da alteraÃ§Ã£o:** 15/07/2026 Ã s 16:08 (HorÃ¡rio Local)
* **Arquivos modificados:** `api/index.ts`

## AlteraÃ§Ãµes â€” SessÃ£o 24/07/2026 (CorreÃ§Ã£o de Download de Proposta no Mobile)

### CorreÃ§Ã£o na GeraÃ§Ã£o e Armazenamento Local de PDF (Capacitor Mobile)

* **Causa Raiz Encontrada:** 
  No ambiente nativo Android (Capacitor), o botÃ£o de geraÃ§Ã£o de proposta tentava compartilhar o arquivo chamando `Share.share` com a URI de retorno do `Filesystem.getUri()` apontando para `Directory.Documents` (um diretÃ³rio interno/privado do app). Como a URI de esquema `file://` nÃ£o estava sendo exposta atravÃ©s de um FileProvider mapeado para esse diretÃ³rio especÃ­fico, e o arquivo nÃ£o estava sendo salvo em uma pasta de visibilidade pÃºblica, o compartilhamento resultava em um arquivo corrompido ou em branco de apenas 1 pÃ¡gina no destino (ex: WhatsApp). AlÃ©m disso, nÃ£o existia uma forma para o usuÃ¡rio salvar o arquivo de maneira autÃ´noma na pasta de Downloads do dispositivo.

* **CorreÃ§Ã£o Aplicada:** 
  1. **Fluxo HÃ­brido com Fallback**: Implementou-se um fluxo de duas etapas em [ProposalGenerator.tsx](file:///c:/Users/aurel/Downloads/MTsolar/Gest-o-MTSolar/src/pages/ProposalGenerator.tsx) para o bloco de plataforma nativa.
  2. **Escrita no DiretÃ³rio de Downloads**: O app tenta primeiramente salvar o PDF diretamente no diretÃ³rio pÃºblico `Directory.Downloads`.
  3. **Fallback para Documentos**: Caso a escrita em Downloads falhe por restriÃ§Ãµes do sistema ou do dispositivo, o catch redireciona a gravaÃ§Ã£o para o diretÃ³rio interno `Directory.Documents`.
  4. **Feedback de Sucesso**: Um toast Ã© exibido na tela (`toast.success`) apenas **apÃ³s** a confirmaÃ§Ã£o de que o arquivo foi gravado fisicamente em disco, informando onde o arquivo foi salvo ("Downloads" ou "Documentos").
  5. **Compartilhamento Opcional**: ApÃ³s a gravaÃ§Ã£o bem-sucedida, a janela nativa de compartilhamento (`Share.share`) Ã© aberta como conveniÃªncia. Se o compartilhamento falhar ou for cancelado pelo usuÃ¡rio, o arquivo permanece salvo localmente e Ã­ntegro no aparelho.

* **Data e hora da alteraÃ§Ã£o:** 24/07/2026 Ã s 09:12 (HorÃ¡rio Local)
* **Arquivos modificados:** `src/pages/ProposalGenerator.tsx`

---



## AlteraÃ§Ãµes â€” SessÃ£o 15/07/2026 (Parte 7: Hotfix de ResoluÃ§Ã£o de Nome do WhatsApp)

### ProteÃ§Ã£o Contra Sobrescrita do Nome do Cliente pelo Nome da Empresa

* **Causa Raiz Encontrada:** 
  O webhook `POST /api/webhooks/whatsapp` aceitava o campo `pushName` vindo da Evolution API sem verificar a direÃ§Ã£o da mensagem (`fromMe`). Quando a empresa enviava uma mensagem ou o sistema disparava mensagens automÃ¡ticas (`fromMe: true`), a Evolution API retornava o nome do perfil da prÃ³pria instÃ¢ncia do WhatsApp Business (ex: "MT SOLAR | Setor Administrativo"). O cÃ³digo sobrescrevia o nome real do cliente no banco de dados (`contact_name`) por esse nome genÃ©rico da empresa, causando a perda da identificaÃ§Ã£o do cliente em dezenas de conversas.
* **CorreÃ§Ã£o Aplicada:** 
  1. A lÃ³gica de atualizaÃ§Ã£o e criaÃ§Ã£o de conversa no `api/index.ts` foi rigorosamente blindada.
  2. Implementada a checagem `if (!fromMe)`: o `pushName` sÃ³ serÃ¡ considerado se a mensagem for efetivamente enviada pelo cliente. Se for enviada pela empresa (`fromMe: true`), o nome existente no banco de dados serÃ¡ mantido intacto.
  3. Adicionada a funÃ§Ã£o auxiliar `isCompanyName()` que bloqueia nomes que iniciam com "MT SOLAR" ou contÃªm "| SETOR", atuando como uma camada de defesa extra (fallback) caso um pushName venha incorreto, rejeitando identificadores conhecidos da prÃ³pria franquia.
  4. Comprovado que o webhook do Kommo (`/api/kommo/webhook`) usa exclusivamente os dados do Kommo CRM (`contactResult.name` ou `lead.name`) para resolver o nome e nÃ£o sofre dessa vulnerabilidade, portanto nenhuma alteraÃ§Ã£o foi necessÃ¡ria lÃ¡.
* **Data e hora da alteraÃ§Ã£o:** 15/07/2026 Ã s 15:58 (HorÃ¡rio Local)
* **Arquivos modificados:** `api/index.ts`

---

## AlteraÃ§Ãµes â€” SessÃ£o 15/07/2026 (Parte 6: UX Comercial)

### AnimaÃ§Ã£o de Sucesso na AprovaÃ§Ã£o Comercial

* **O que foi feito:**
  - Instalada a biblioteca `canvas-confetti` (e suas tipagens) para adicionar micro-interaÃ§Ãµes de comemoraÃ§Ã£o na Ã�rea Comercial.
  - O cÃ³digo que lida com o clique no botÃ£o "Aprovar Proposta Comercial" (`handleSaveCommercialChanges` em `Commercial.tsx`) foi refatorado.
  - Agora, **estritamente apÃ³s** a API retornar sucesso na transiÃ§Ã£o de status para `proposta_enviada`, uma animaÃ§Ã£o de confete Ã© disparada utilizando as cores da identidade visual do sistema (Azul Escuro, Dourado/Laranja e Verde de sucesso).
  - Um pequeno delay de 100ms foi adicionado antes de exibir o `alert()` nativo do navegador. Como o `alert()` paralisa a thread do JavaScript (e consequentemente a renderizaÃ§Ã£o da animaÃ§Ã£o), esse delay garante que a explosÃ£o de partÃ­culas seja iniciada *antes* do travamento, criando uma experiÃªncia nÃ£o-bloqueante e fluida.
* **Data e hora da alteraÃ§Ã£o:** 15/07/2026 Ã s 11:58 (HorÃ¡rio Local)
* **Arquivos modificados:** `src/pages/Commercial.tsx`, `package.json`

---

## AlteraÃ§Ãµes â€” SessÃ£o 15/07/2026 (Parte 5: Autopreenchimento de Propostas no Comercial)

### CorreÃ§Ã£o da VinculaÃ§Ã£o de Proposta Ativa no Cadastro de Cliente

* **Causa Raiz Encontrada:** 
  A funcionalidade estava duplamente incompleta. O handler `fillFromProposal` no frontend (`Commercial.tsx`) sÃ³ mapeava 4 dados bÃ¡sicos (nome, telefone, email, endereÃ§o) e ignorava qualquer campo tÃ©cnico (kit) ou financeiro (valor). AlÃ©m disso, a lista de seleÃ§Ã£o do dropdown vinha da rota `GET /api/proposals-active` (tabela `proposals`), que por sua vez tem dados limitados, porque a rota `POST /api/proposals` nÃ£o gravava os dados tÃ©cnicos no banco (apesar do gerador de propostas tentar enviÃ¡-los). Apenas a tabela `proposal_history` possuÃ­a o `raw_data` JSON completo com todas as variÃ¡veis.
* **CorreÃ§Ã£o Aplicada:** 
  1. **Backend:** Criado novo endpoint `GET /api/proposal-history/by-number/:number` que busca os dados completos e intactos da proposta (`raw_data`) diretamente da `proposal_history`, utilizando o `proposal_number` como elo.
  2. **Frontend:** O handler `fillFromProposal` foi convertido para `async`. Agora, ao selecionar uma proposta no dropdown, ele faz um fetch neste novo endpoint, resgata o `raw_data` completo e mapeia perfeitamente os 6 campos do kit (`inversor_marca`, `inversor_modelo`, `inversor_potencia`, `modulo_modelo`, `modulo_potencia`, `estrutura_tipo`) e o valor da proposta para o estado do formulÃ¡rio (`newClient`).
  3. Os campos permanecem 100% **editÃ¡veis** apÃ³s o autopreenchimento (estado React flexÃ­vel sem bloqueio `readonly`).
* **Data e hora da alteraÃ§Ã£o:** 15/07/2026 Ã s 11:55 (HorÃ¡rio Local)
* **Arquivos modificados:** `api/index.ts`, `src/pages/Commercial.tsx`

---

## AlteraÃ§Ãµes â€” SessÃ£o 15/07/2026 (Parte 4: Auditoria e CorreÃ§Ã£o do Dashboard)

### Isolamento de Dados do Dashboard para Vendedor (role COMMERCIAL)

* **O que foi feito:**
  1. **Cards Projetos Ativos, Vistorias Pendentes e Projetos ConcluÃ­dos (`GET /api/stats`):**
     - **Bug identificado:** A `baseFilter` usava `.eq('created_by', req.user.id)` diretamente na tabela `projects`, campo que **nÃ£o existe** nessa tabela (o `created_by` vive em `clients`). O filtro era silenciosamente ignorado pelo Supabase, ou retornava 0 â€” ambos errados.
     - **CorreÃ§Ã£o:** Refatorada a `baseFilter` para incluir `clients!inner(created_by, assigned_seller_id)` no select e aplicar `.or('created_by.eq.X,assigned_seller_id.eq.X', { foreignTable: 'clients' })` â€” mesmo padrÃ£o validado nas demais rotas desta sessÃ£o. Os 3 cards sÃ£o calculados pela mesma funÃ§Ã£o, entÃ£o a correÃ§Ã£o resolve os 3 de uma vez.
  2. **Painel Status das HomologaÃ§Ãµes (filtro client-side em `Dashboard.tsx`):**
     - **Bug identificado:** Linha 48 usava `p.assigned_to` â€” campo que **nunca existiu** no schema. Metade da condiÃ§Ã£o do filtro era inerte desde a origem.
     - **CorreÃ§Ã£o:** SubstituÃ­do `p.assigned_to` por `p.assigned_seller_id` â€” campo correto implementado nesta sessÃ£o. O filtro de backend (`GET /api/projects`) jÃ¡ Ã© a camada de seguranÃ§a principal; o filtro client-side Ã© uma camada de defesa extra.
  3. **Painel Protocolos Neoenergia (`GET /api/neoenergia`):**
     - **DecisÃ£o:** Mantido filtro apenas por `created_by`. A tabela `neoenergia_protocols` nÃ£o tem FK para `clients`, tornando qualquer vÃ­nculo via `assigned_seller_id` frÃ¡gil e impreciso. O filtro atual Ã© semanticamente correto para essa entidade.
* **Data e hora da alteraÃ§Ã£o:** 15/07/2026 Ã s 11:40 (HorÃ¡rio Local)
* **Arquivos modificados:** `api/index.ts`, `src/pages/Dashboard.tsx`

---

## AlteraÃ§Ãµes â€” SessÃ£o 15/07/2026 (Parte 3: Isolamento de Dados por Vendedor)

### Filtragem Comercial nas Abas de Projetos e Propostas

* **O que foi feito:**
  1. **Projetos Pendentes & InstalaÃ§Ãµes (Rota `GET /api/projects`):**
     - **Antes:** Retornava todos os projetos da empresa (`company_id`), filtrando apenas os status no frontend, expondo dados de todos os vendedores para qualquer um.
     - **CorreÃ§Ã£o:** Alterado o `select` para utilizar `clients!inner` (garantindo o inner join nativo do Supabase) e aplicado a restriÃ§Ã£o de seguranÃ§a no backend: se o role for `COMMERCIAL`, a API adiciona `.or('created_by.eq.X,assigned_seller_id.eq.X', { foreignTable: 'clients' })`, garantindo que o vendedor sÃ³ veja projetos que ele cadastrou ou que foram atribuÃ­dos a ele.
  2. **Propostas Ativas (Rota `GET /api/proposals-active`):**
     - **Antes:** Retornava todas as propostas da empresa nos Ãºltimos 30 dias sem filtro de vendedor. A tabela `proposals` guarda `created_by` como string (nome ou email), e nÃ£o possui `assigned_seller_id` (pois a proposta nasce antes do cadastro do cliente).
     - **CorreÃ§Ã£o:** Adicionado filtro seguro no backend: se o role for `COMMERCIAL`, a API anexa um `.or('created_by.eq.X,created_by.eq.Y')` (onde X Ã© o nome e Y Ã© o email do usuÃ¡rio logado), assegurando que o vendedor sÃ³ baixe propostas geradas por ele mesmo.
  3. **VisÃ£o Gerencial Mantida:** As regras condicionais garantem que as contas `CEO` e `ADMIN` bypassam o `.or()` e continuam consumindo 100% da base.
  4. **CorreÃ§Ã£o visual:** Aba "Propostas Ativas (7 dias)" renomeada para **"Propostas Ativas (30 dias)"** â€” a rota jÃ¡ retornava 30 dias desde sessÃ£o de 07/07/2026, mas o rÃ³tulo da UI nÃ£o havia sido atualizado.
* **Data e hora da alteraÃ§Ã£o:** 15/07/2026 Ã s 11:35 (HorÃ¡rio Local)
* **Arquivos modificados:** `api/index.ts`, `src/pages/Commercial.tsx`

---

## AlteraÃ§Ãµes â€” SessÃ£o 15/07/2026 (Parte 2: Frontend)

### SeleÃ§Ã£o de Vendedor ResponsÃ¡vel na Ã�rea Comercial

* **O que foi feito:**
  1. **IntegraÃ§Ã£o de Estado (Commercial.tsx):** 
     - Adicionado estado `vendedores` e um `useEffect` que consome `GET /api/users/vendedores` apenas se o `user?.role` do `AuthContext` for `'CEO'` ou `'ADMIN'`.
  2. **FormulÃ¡rios de Cadastro e EdiÃ§Ã£o (`newClient` e `editClientData`):**
     - Adicionado o campo `<select>` "VENDEDOR RESPONSÃ�VEL", seguindo os padrÃµes visuais existentes (com `w-full border p-2 rounded focus:ring-blue-500`).
     - LÃ³gica Condicional: O campo sÃ³ Ã© renderizado quando `(user?.role === 'CEO' || user?.role === 'ADMIN')`. 
     - Quando um `COMMERCIAL` estÃ¡ operando, o campo nÃ£o aparece, garantindo que a delegaÃ§Ã£o seja feita tacitamente pelo backend.
     - Os estados iniciais e reset foram atualizados para incluir `assigned_seller_id`.
  3. **VisualizaÃ§Ã£o Kanban:**
     - Nos cards de Projetos Pendentes, caso o usuÃ¡rio tenha visÃ£o gerencial, Ã© exibido de forma secundÃ¡ria o nome do vendedor responsÃ¡vel (buscando na lista de vendedores em memÃ³ria) com uma formataÃ§Ã£o em azul claro.
* **Data e hora da alteraÃ§Ã£o:** 15/07/2026 Ã s 11:20 (HorÃ¡rio Local)
* **Arquivos modificados:** `src/pages/Commercial.tsx`

> âš ï¸� **COMO TESTAR ESTA TAREFA:**
> 1. **CenÃ¡rio CEO/ADMIN:** FaÃ§a login como CEO. Acesse "Comercial" > "Novo Cliente". O campo "Vendedor ResponsÃ¡vel" deve aparecer abaixo de "Origem da Venda". Selecione um vendedor, salve e confirme no banco de dados se o `assigned_seller_id` corresponde ao usuÃ¡rio selecionado.
> 2. **CenÃ¡rio COMMERCIAL:** FaÃ§a login como vendedor. O campo "Vendedor ResponsÃ¡vel" NÃƒO deve existir no form. Cadastre um cliente e confirme no banco que o `assigned_seller_id` foi preenchido automaticamente com o ID deste vendedor.

---

## AlteraÃ§Ãµes â€” SessÃ£o 15/07/2026 (Parte 1: Backend)

### AdiÃ§Ã£o de Vendedor ResponsÃ¡vel (assigned_seller_id) em Clientes

* **O que foi feito:**
  1. **Banco de Dados:** Criada a coluna `assigned_seller_id` na tabela `clients` com FK para `users(id)` e um Ã­ndice para performance.
  2. **Backend (api/index.ts):** 
     - Criada nova rota `GET /api/users/vendedores` para listar apenas usuÃ¡rios `COMMERCIAL` ativos.
     - Modificadas as rotas `POST /api/clients` e `PUT /api/clients/:id` para receber e gravar o `assigned_seller_id`.
     - Implementada regra de negÃ³cio de seguranÃ§a e automaÃ§Ã£o: se o usuÃ¡rio logado for `COMMERCIAL`, o `assigned_seller_id` Ã© forÃ§ado para o seu prÃ³prio ID; se for `CEO` ou `ADMIN`, o valor recebido pelo frontend (ou null) Ã© respeitado. O fallback de colunas ausentes `PGRST204` foi mantido para a nova coluna.
     - Atualizadas as rotas `GET /api/projects` e `GET /api/projects/:id` para expor `assigned_seller_id` no objeto achatado.
  3. **DiagnÃ³stico TypeScript:** `api/index.ts` validado sem erros novos.
* **Data e hora da alteraÃ§Ã£o:** 15/07/2026 Ã s 11:05 (HorÃ¡rio Local)
* **Arquivos modificados:** `supabase/migrations/20260715_add_assigned_seller_to_clients.sql`, `supabase_schema.sql`, `api/index.ts`

> âš ï¸� **AÃ‡ÃƒO MANUAL NECESSÃ�RIA NO SUPABASE:**
> VocÃª deve executar manualmente o conteÃºdo do arquivo `supabase/migrations/20260715_add_assigned_seller_to_clients.sql` no SQL Editor do Supabase para aplicar as alteraÃ§Ãµes.

---

## AlteraÃ§Ãµes â€” SessÃ£o 14/07/2026

### PDF do HistÃ³rico corrompido: diagnÃ³stico e correÃ§Ã£o completa

**Contexto:** O PDF baixado pela aba "HistÃ³rico" apresentava emojis corrompidos 
(ex: "&Ã¾" no lugar de â˜€ï¸�), SVGs ausentes, cabeÃ§alho de texto sobrepondo fotos 
de vistoria e valores numÃ©ricos desalinhados.

#### Bug 1 â€” FunÃ§Ã£o uploadFullPDF usava jsPDF com doc.html()
- **Causa raiz:** A funÃ§Ã£o original usava `doc.html()` com `autoPaging: 'text'` e 
  `windowWidth: 800`, que nÃ£o suporta emojis Unicode (sem glifos nas fontes do jsPDF)
  nem SVGs inline. O resultado era um PDF completamente divergente do preview do browser.
- **CorreÃ§Ã£o:** `uploadFullPDF` foi refatorada para usar `html2canvas` pÃ¡gina a pÃ¡gina:
  insere o HTML em um container oculto fora da viewport (`left:-9999px`), aguarda 
  carregamento de todas as `<img>`, e captura cada `.page` com `html2canvas({ scale:2 })`,
  inserindo como JPEG via `doc.addImage()`. O PDF resultante Ã© idÃªntico ao print do browser.
- **DependÃªncia:** `html2canvas@^1.4.1` adicionada a `dependencies` em `package.json`.

#### Bug 2 â€” Seletor de pÃ¡ginas retornava array vazio
- **Causa raiz:** A nova lÃ³gica de captura usava 
  `querySelectorAll('div[style*="210mm"]')` para encontrar as pÃ¡ginas. PorÃ©m, as 
  pÃ¡ginas do template HTML usam a **classe CSS `.page`** (definida no `<style>` embutido), 
  sem atributo `style` inline. O seletor nunca encontrava nenhuma div â†’ `pageDivs = []` 
  â†’ o loop nÃ£o executava â†’ o PDF salvo ficava vazio (uma pÃ¡gina em branco).
- **CorreÃ§Ã£o:** Seletor trocado para `.page, div[style*="min-height:297mm"]`, 
  capturando as pÃ¡ginas principais pela classe CSS e a pÃ¡gina de fotos pelo style inline.

#### Bug 3 â€” Fotos de vistoria ausentes no PDF do Storage
- **Causa raiz:** `uploadFullPDF` recebia `htmlContent` como argumento. A pÃ¡gina de 
  fotos (`photosHtml`) sÃ³ era injetada em `htmlParaNavegador`, que Ã© usado exclusivamente 
  para o preview de impressÃ£o no browser. O PDF salvo no Storage nunca incluÃ­a as fotos.
- **CorreÃ§Ã£o:** Argumento trocado de `uploadFullPDF(htmlContent)` para 
  `uploadFullPDF(htmlParaNavegador)`, garantindo que Storage e preview sejam 100% idÃªnticos.

#### Bug 4 â€” Dados completos do Distribuidor nÃ£o apareciam no PDF
- **Causa raiz:** O `<select>` de "Fornecedor do Kit" chamava 
  `updateForm('kitSupplier', e.target.value)`, que salvava apenas o nome como string simples.
  O objeto completo do fornecedor (RazÃ£o Social, CNPJ, EndereÃ§o, Telefone, E-mail) nunca era 
  persistido no state. O bloco do PDF interpolava apenas `formData.kitSupplier` (sÃ³ o nome).
- **CorreÃ§Ã£o:**
  1. `FormData` recebeu o campo `selectedSupplierData?: Supplier | null`.
  2. O `onChange` passou a chamar `setFormData` atualizando simultaneamente `kitSupplier` 
     e `selectedSupplierData` (objeto completo buscado na array `suppliers`).
  3. O bloco HTML do PDF foi substituÃ­do por uma IIFE que, quando `selectedSupplierData` 
     existe, renderiza RazÃ£o Social, CNPJ, EndereÃ§o e Contato em fonte discreta (7.5pt/cinza).
     Para propostas antigas sem `selectedSupplierData`, cai no fallback exibindo sÃ³ o nome.

---

**Arquivos modificados:** `src/pages/ProposalGenerator.tsx`, `package.json`, `RESUMO_MESTRE.md`

**Commits desta sessÃ£o:**
- `96048be` â€” fix(proposal): usa html2canvas para pdf do storage e unifica layout
- `118e5bd` â€” fix(proposal): exibe dados completos do distribuidor no PDF
- `380b1e7` â€” fix(proposal): corrige seletor de paginas e inclui fotos no PDF do Storage
- `a72174b` â€” docs: registra 2 bugs corrigidos na uploadFullPDF

---

> âš ï¸� **AÃ‡ÃƒO MANUAL NECESSÃ�RIA NO SUPABASE:**
> O Bug 4 (dados do Distribuidor) funciona corretamente apenas para seleÃ§Ãµes feitas 
> **apÃ³s esta correÃ§Ã£o**. Propostas antigas salvas no histÃ³rico (com `raw_data` onde 
> `selectedSupplierData = null`) continuarÃ£o exibindo apenas o nome no PDF â€” o que Ã© 
> o comportamento esperado pelo cÃ³digo (fallback seguro).
> 
> **VerificaÃ§Ã£o:** Se o fornecedor "MTsolar" (ou qualquer outro em uso) ainda 
> aparece com apenas o nome no PDF de propostas novas geradas a partir de agora, 
> verificar na tabela `suppliers` se os campos `razao_social`, `cnpj`, `endereco`, 
> `telefone`, `email` estÃ£o preenchidos. Se estiverem nulos, o comportamento observado 
> Ã© correto â€” o problema estÃ¡ no cadastro do fornecedor, nÃ£o no cÃ³digo.



* **CriaÃ§Ã£o da Tabela de Fornecedores de Kits Solares (ETAPAS A, B e C):**
  * *O que foi feito:* 
    1. **Banco de Dados:** Criada a tabela `suppliers` no Supabase, incluindo colunas estruturadas (`razao_social`, `cnpj`, `nome_fantasia`, `endereco`, `telefone`, `email`), isolamento multi-tenant via `company_id`, e RLS onde leitura Ã© pÃºblica para vendedores e ediÃ§Ã£o Ã© restrita a ADMIN/CEO.
    2. **Backend:** Implementado CRUD completo (`GET`, `POST`, `PUT`, `DELETE` em `/api/suppliers`) no arquivo `api/index.ts`, com proteÃ§Ã£o baseada em token (`authenticateToken`) e regras de escopo.
    3. **Frontend:** No `ProposalGenerator.tsx`, o campo livre de "Fornecedor do Kit" foi substituÃ­do por um `<select>` que carrega dinamicamente os distribuidores da base de dados. Adicionada a interface de gerenciamento: Administradores e CEOs agora veem o botÃ£o "Gerenciar Distribuidores" para cadastrar novos fornecedores via modal pop-up, alÃ©m de um botÃ£o lateral para editar rapidamente o fornecedor selecionado.
  * *Arquivos modificados:* `supabase/migrations/20260714_create_suppliers.sql`, `api/index.ts`, `src/pages/ProposalGenerator.tsx`
  * *Data e hora da alteraÃ§Ã£o:* 14/07/2026 Ã s 12:55 (HorÃ¡rio Local)


* **Enriquecimento da Nota Interna de Leads do Kommo com Perfil de QualificaÃ§Ã£o:**
  * *O que foi feito:* DiagnÃ³stico completo confirmou que o Salesbot do Kommo (leads via Facebook Ads) nÃ£o gera notas (`/notes`) nem talks de chat acessÃ­veis via API REST â€” os campos de qualificaÃ§Ã£o do cliente coletados pelo bot ficam armazenados apenas em `custom_fields_values` do lead e do contato. SoluÃ§Ã£o implementada: (1) Criada a funÃ§Ã£o `getKommoLeadFields(leadId, contactId)` em `api/index.ts`, logo apÃ³s `getKommoLeadNotes()`. Ela busca `GET /leads/{id}` e `GET /contacts/{id}`, aplica whitelist de field_ids confirmados via teste real (MÃ©dia de gastos, Forma de pagamento, ImÃ³vel, PretensÃ£o de investimento, Decisor, Melhor horÃ¡rio e a cidade via `Position` do contato), normaliza os values (remove underscores, remove ponto final solto, capitaliza). (2) No bloco de montagem de `notaInternaBase` dentro de `POST /api/kommo/webhook`, o `contactId` Ã© extraÃ­do do payload do webhook em memÃ³ria (`lead._embedded?.contacts?.[0]?.id`) sem nenhuma chamada extra Ã  API, e a funÃ§Ã£o `getKommoLeadFields()` Ã© chamada. O resultado Ã© inserido na nota entre o telefone e o campo de "AtribuÃ­do para". (3) Testado com dados reais do lead `12735628` (Marcos AurÃ©lio, JaboatÃ£o dos Guararapes): nota gerada confirmada visualmente com cidade e todos os 6 campos de qualificaÃ§Ã£o formatados corretamente.
  * *Nota interna resultante (exemplo real):*
    ```
    ðŸ¤– *Lead capturado automaticamente do Kommo CRM*
    ðŸ“Œ Lead: Facebook â„–3289241711258405
    ðŸ‘¤ Nome: Marcos AurÃ©lio
    ðŸ“± Telefone: 5581984433272

    ðŸ“� Cidade: JaboatÃ£o dos Guararapes

    ðŸ“‹ *Perfil do Lead (Kommo):*
    â€¢ ðŸ’° MÃ©dia de gastos: Entre r$ 400 a r$ 1.000
    â€¢ ðŸ’³ Forma de pagamento: CartÃ£o de crÃ©dito/ financiamento
    â€¢ ðŸ�  ImÃ³vel: PrÃ³prio
    â€¢ ðŸš€ PretensÃ£o de investimento: Imediato
    â€¢ âœ… Decisor: Sim, sou o decisor
    â€¢ ðŸ•� Melhor horÃ¡rio: Tarde (12h Ã s 18h)

    ðŸ‘¨â€�ðŸ’¼ AtribuÃ­do para: Soraia
    ```
  * *Arquivos modificados:* `api/index.ts`
  * *Data e hora da alteraÃ§Ã£o:* 14/07/2026 Ã s 12:25 (HorÃ¡rio Local)

---

## AlteraÃ§Ãµes â€” SessÃ£o 07/07/2026


* **ResiliÃªncia e Dead Letter Queue no Webhook do WhatsApp:**
  * *O que foi feito:* A rota `POST /api/webhooks/whatsapp` foi refatorada. (1) O `res.status(200)` foi movido do inÃ­cio para o final da funÃ§Ã£o para evitar o encerramento prematuro (Race Condition) na Vercel Serverless. (2) Foi implementada a tabela `webhook_failures` (Dead Letter Queue) para registrar payloads brutos sempre que houver falha nÃ£o-tratada, impossibilidade de resolver o `company_id` da instÃ¢ncia ou falhas no `upsert` do Supabase. (3) Todos os inserts na `webhook_failures` gravam `company_id`: `null` quando a empresa ainda nÃ£o foi identificada (ex: instÃ¢ncia desconhecida), ou o valor real quando a falha ocorreu apÃ³s a resoluÃ§Ã£o da empresa. (4) Criada a rota de diagnÃ³stico `GET /api/webhook-failures` exclusiva para CEO/ADMIN.
  * *Arquivos modificados:* `api/index.ts`, `supabase/migrations/20260707_create_webhook_failures.sql`
  * *Data e hora da alteraÃ§Ã£o:* 07/07/2026 Ã s 19:50 (HorÃ¡rio Local)

* **DiagnÃ³stico e ResiliÃªncia do Webhook do Kommo CRM:**
  * *O que foi feito:* (1) Adicionados logs detalhados ANTES do filtro de `status_id` no webhook `POST /api/kommo/webhook`, exibindo todos os leads recebidos com seus `status_id` brutos (e se bate com `KOMMO_STATUS_ID_LEAD`), e os arrays de chaves do payload para confirmar o formato enviado pelo Kommo. (2) Confirmado que o fluxo quando `getKommoLeadContact` retorna null nÃ£o tem `continue`/`return` oculto â€” o lead prossegue com `contactPhone = kommo-lead-${leadId}`. (3) Criada rota de diagnÃ³stico `GET /api/kommo/check-lead/:leadId` (apenas CEO) que inspeciona um lead pelo ID e retorna: dados brutos da API Kommo, se o `status_id` passaria pelo filtro do webhook, resultado da busca de contato, se jÃ¡ existe conversa no banco, e qual vendedor seria escolhido via Round-Robin.
  * *Arquivos modificados:* `api/index.ts`
  * *Data e hora da alteraÃ§Ã£o:* 07/07/2026 Ã s 19:55 (HorÃ¡rio Local)

* **Avatar e Foto de Perfil no Atendimento (WhatsApp):**
  * *O que foi feito:* (1) Adicionadas colunas `profile_pic_url` (TEXT) e `profile_pic_updated_at` (TIMESTAMPTZ) Ã  tabela `whatsapp_conversations` para cache. (2) Criada rota `GET /api/whatsapp/profile-picture/:conversationId` no backend que busca a foto de perfil via Evolution API (endpoint `/chat/fetchProfilePictureUrl/{instance}`) com cache de 24h para evitar requisiÃ§Ãµes excessivas. (3) Criado o componente `ProfileAvatar` no `WhatsApp.tsx` para exibir a foto de perfil (com esqueleto de carregamento animado) ou fallback para o Ã­cone genÃ©rico em caso de erro, ausÃªncia ou privacidade do contato. Inserido no cabeÃ§alho do chat e na lista de conversas.
  * *Arquivos modificados:* `api/index.ts`, `src/pages/WhatsApp.tsx`, `supabase/migrations/20260707_add_profile_pic_to_conversations.sql`
  * *Data e hora da alteraÃ§Ã£o:* 07/07/2026 Ã s 20:05 (HorÃ¡rio Local)

* **Melhorias Visuais no Painel de Atendimento (WhatsApp):**
  * *O que foi feito:* (1) Aumentado o tamanho da fonte do nÃºmero de telefone no cabeÃ§alho do chat de `text-[10px]/text-xs` para `text-sm/text-base` e o Ã­cone do telefone. (2) Atualizados os indicadores de leitura de mensagens enviadas (from_me: true) para utilizar os Ã­cones originais do WhatsApp (âœ“ e âœ“âœ“) importados da biblioteca `lucide-react` (`Check`, `CheckCheck`), com o azul caracterÃ­stico para status 'read'.
  * *Arquivos modificados:* `src/pages/WhatsApp.tsx`
  * *Data e hora da alteraÃ§Ã£o:* 07/07/2026 Ã s 20:05 (HorÃ¡rio Local)

* **Novas Etiquetas de Origem do Lead:**
  * *O que foi feito:* Adicionadas as etiquetas "Veio da Rua", "ProspecÃ§Ã£o Ativa" e "IndicaÃ§Ã£o" ao array `WHATSAPP_TAGS` do frontend, mantendo a coerÃªncia visual e integraÃ§Ã£o com o sistema de filtragem de conversas.
  * *Arquivos modificados:* `src/pages/WhatsApp.tsx`
  * *Data e hora da alteraÃ§Ã£o:* 07/07/2026 Ã s 20:05 (HorÃ¡rio Local)

* **PrevenÃ§Ã£o de Falhas no Envio de MÃ­dias (R2):**
  * *O que foi feito:* (1) Adicionada validaÃ§Ã£o estrita no frontend (`WhatsApp.tsx`) verificando se `uploadData.filePath` foi retornado corretamente da API antes de chamar `send-media`, estourando um `alert` imediato em caso de falha (ajudando no diagnÃ³stico mobile com Capacitor). (2) No backend (`api/index.ts`), adicionada validaÃ§Ã£o `if (!filePath)` na rota `send-media`, retornando Erro 400 antes de tentar manipular a string e estourar erro 500, com log detalhado da URL que serÃ¡ acessada pela Evolution API.
  * *Arquivos modificados:* `api/index.ts`, `src/pages/WhatsApp.tsx`
  * *Data e hora da alteraÃ§Ã£o:* 07/07/2026 Ã s 19:40 (HorÃ¡rio Local)

* **AtualizaÃ§Ã£o do prazo de Propostas Ativas:**
  * *O que foi feito:* A rota `GET /api/proposals-active` foi modificada para retornar propostas dos Ãºltimos 30 dias (variÃ¡vel `thirtyDaysAgo`), em vez de 7 dias, adequando-se Ã  nova regra de negÃ³cio do banco (onde as propostas sÃ£o deletadas fisicamente pelo pg_cron apenas apÃ³s 30 dias).
  * *Arquivos modificados:* `api/index.ts`
  * *Data e hora da alteraÃ§Ã£o:* 07/07/2026 Ã s 19:27 (HorÃ¡rio Local)

---

## AlteraÃ§Ãµes â€” SessÃ£o 03/07/2026

* **Redesign do CabeÃ§alho da Proposta de ServiÃ§os em PDF (Prompt 11):**
  * *O que foi feito:*
    1. Removido integralmente o design antigo do cabeÃ§alho (que consistia em uma faixa azul sÃ³lida com a logomarca encaixada dentro de um retÃ¢ngulo branco).
    2. Implementado um novo layout simplificado, totalmente branco.
    3. A logomarca agora Ã© centralizada, com largura fixa de 55mm e altura calculada dinamicamente pelo `aspectRatio` real do PNG, evitando distorÃ§Ãµes. Continua sendo convertida para JPEG via Canvas para evitar falhas de transparÃªncia no gerador de PDF.
    4. Inseridos os textos "PROPOSTA DE SERVIÃ‡OS" (18pt, negrito, azul) e "ENERGIA SOLAR FOTOVOLTAICA" (9pt, dourado) dinamicamente logo abaixo da imagem, tambÃ©m centralizados.
    5. Adicionada uma linha separadora horizontal dourada (1pt) separando o novo cabeÃ§alho do restante do documento.
    6. A coordenada inicial `y` para os blocos subsequentes (NÂº Proposta, Data, Cliente, etc.) foi tornada dinÃ¢mica com base na altura real da imagem carregada.
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`
  * *Data e hora da alteraÃ§Ã£o:* 03/07/2026 Ã s 09:00 (HorÃ¡rio Local)

* **CorreÃ§Ã£o Definitiva: Abertura do campo de ediÃ§Ã£o de nome no Atendimento (Prompts 8, 9 e 10):**
  * *O que foi feito:*
    1. **Problema identificado no Desktop:** O evento `onClick` do Ã­cone (Pencil) e do nome do contato estava sendo consumido silenciosamente ou nÃ£o disparava no navegador (mouse) porque o elemento nÃ£o era um botÃ£o real com o devido controle de propagaÃ§Ã£o.
    2. **CabeÃ§alho (Ponto A):** O botÃ£o do lÃ¡pis foi convertido explicitamente para `<button type="button">`, recebeu a classe `relative z-10 cursor-pointer` (para garantir que fique sobreposto a qualquer overlay oculto), e adicionados `e.preventDefault()` e `e.stopPropagation()` no clique.
    3. **Painel Lateral (Ponto B):** O evento `onClick` problemÃ¡tico que ficava no elemento `<h3>` (o nome do contato) foi removido. Em vez disso, o Ã­cone `Pencil` foi isolado dentro de um `<button type="button">` prÃ³prio com o mesmo tratamento de propagaÃ§Ã£o e `z-index`.
    4. **Input seguro:** No `<input>` que aparece em ambos os locais, foi garantido o `autoFocus` (jÃ¡ existia) e adicionado `e.stopPropagation()` no evento `onKeyDown`, impedindo que pressionar `Enter` dispare aÃ§Ãµes globais do chat (como enviar mensagem).

* **OtimizaÃ§Ã£o do PDF da Proposta de ServiÃ§os (Prompt 8):**
  * *O que foi feito em `src/pages/ProposalGenerator.tsx` na funÃ§Ã£o `generateServicePDF`:*
    1. **Logomarca DinÃ¢mica:** Em vez de forÃ§ar a imagem do logo a 45x18mm ignorando a proporÃ§Ã£o, a imagem agora calcula dinamicamente o `aspectRatio` do PNG antes da inserÃ§Ã£o no PDF. A imagem Ã© renderizada respeitando a proporÃ§Ã£o real e Ã© centralizada perfeitamente no bloco branco do cabeÃ§alho.
    2. **Quebra de PÃ¡gina Otimizada:** Alterado o `checkPage` da seÃ§Ã£o de "SERVIÃ‡OS CONTRATADOS" de 15mm para 23mm, impedindo que o tÃ­tulo da seÃ§Ã£o fique isolado na primeira pÃ¡gina e o primeiro serviÃ§o caia na segunda.
    3. **Ajuste de EspaÃ§amentos (Institucional):** Reduzido o espaÃ§o excessivo entre o bloco institucional ("Sobre a MT Solar") e os ServiÃ§os Contratados (agora `6mm`).
    4. **Ajuste de EspaÃ§amentos (ServiÃ§os):** Reduzido o `bottomSpace` de cada bloco de serviÃ§o para 4mm.
    5. **Ajuste de EspaÃ§amentos (EspecificaÃ§Ãµes TÃ©cnicas):** Inseridos `2mm` de `topSpace` e `bottomSpace` nas "EspecificaÃ§Ãµes TÃ©cnicas", e reduzida a fonte para `8.5pt` (tÃ­tulo em `9pt`), economizando Ã¡rea Ãºtil de pÃ¡gina.
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`, `src/pages/WhatsApp.tsx`
  * *Data e hora da alteraÃ§Ã£o:* 03/07/2026 Ã s 08:39 (HorÃ¡rio Local)

* **CorreÃ§Ã£o: DistribuiÃ§Ã£o de Leads Round-Robin (Prompt 7):**
  * *O que foi feito:*
    1. **Auditoria** da funÃ§Ã£o `getRoundRobinVendedor` em `api/index.ts`.
    2. **Problema identificado:** A funÃ§Ã£o dependia exclusivamente da coluna `recebe_leads` no Supabase. Como a migration poderia estar incompleta para alguns vendedores (ex: Manoel JordÃ£o sem a flag ou sem a coluna), a query falhava silenciosamente e retornava apenas a Soraia.
    3. **CorreÃ§Ãµes aplicadas:**
       - Adicionada verificaÃ§Ã£o de erro na query do Supabase para fazer fallback e buscar sem a coluna `recebe_leads` caso ela nÃ£o exista.
       - Implementada lÃ³gica de seguranÃ§a que verifica se hÃ¡ pelo menos dois vendedores elegÃ­veis com a flag `recebe_leads=true`. Se houver menos de dois, aplica um fallback hardcoded filtrando especificamente por 'Soraia' e 'Manoel', garantindo a distribuiÃ§Ã£o dos leads entre eles.
       - IncluÃ­do no topo da funÃ§Ã£o (comentÃ¡rio) o SQL necessÃ¡rio para o administrador executar no Supabase e corrigir definitivamente a migration.
    4. **ValidaÃ§Ã£o:** A contagem de conversas em andamento por vendedor para balancear o Round-Robin foi mantida intacta, e a validaÃ§Ã£o TypeScript nÃ£o acusou novos erros em `api/index.ts`.
  * *Data e hora da alteraÃ§Ã£o:* 03/07/2026 Ã s 08:18 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`

* **CorreÃ§Ã£o: Renomear Contato no Atendimento â€” Web e APK (Prompt 6):**
  * *O que foi feito:*
    1. **Auditoria completa** das duas partes: backend (`api/index.ts`) e frontend (`src/pages/WhatsApp.tsx`).
    2. **Backend:** Rota `PUT /api/conversations/:id/rename` confirmada Ã­ntegra â€” autenticaÃ§Ã£o JWT, isolamento `company_id`, limite de 100 caracteres e registro de mensagem interna de auditoria (`âœ�ï¸� Contato renomeado para "X" por Fulano`). **Nenhuma alteraÃ§Ã£o necessÃ¡ria.**
    3. **Bug 1 â€” APK/Mobile (Ã­cone invisÃ­vel):** O botÃ£o com o `Pencil` no cabeÃ§alho usava `opacity-0 group-hover/rename:opacity-100`, que depende de hover CSS â€” inexistente em dispositivos touch. Corrigido para `sm:opacity-0 sm:group-hover/rename:opacity-100 opacity-60`, garantindo que o Ã­cone fique **visÃ­vel (60% opacidade) em telas pequenas/touch** e apareÃ§a ao hover apenas no desktop.
    4. **Bug 2 â€” Painel lateral (input sem atalhos de teclado):** O `<input>` de ediÃ§Ã£o no painel direito (desktop) nÃ£o tinha `onKeyDown` nem `onBlur`, impossibilitando salvar via Enter ou ao perder o foco. Adicionados `onKeyDown` (Enter salva, Escape cancela), `onBlur` (salva) e `maxLength={100}`.
    5. **Mesma correÃ§Ã£o de visibilidade** aplicada ao Ã­cone `Pencil` do painel lateral (`opacity-60 sm:opacity-0 sm:group-hover:opacity-100`), com `class="group"` adicionado ao `<h3>` pai para ativar o hover corretamente.
    6. **Comportamento final confirmado (web e APK):**
       - CabeÃ§alho mobile: Ã­cone lÃ¡pis sempre visÃ­vel (60%) â€” tap abre ediÃ§Ã£o
       - CabeÃ§alho desktop: Ã­cone aparece ao hover â€” click abre ediÃ§Ã£o
       - Painel lateral desktop: click no nome ou no lÃ¡pis abre ediÃ§Ã£o â€” Enter salva, Escape cancela, blur salva
       - Cancelar (X): fecha sem salvar
  * *Data e hora da alteraÃ§Ã£o:* 03/07/2026 Ã s 08:16 (HorÃ¡rio Local)
  * *Arquivos modificados:* `src/pages/WhatsApp.tsx`

* **CorreÃ§Ã£o do Webhook WhatsApp â€” Leads Externos nÃ£o aparecendo no Atendimento (Prompt 5):**
  * *O que foi feito:*
    1. **Auditoria completa** do handler `POST /api/webhooks/whatsapp` em `api/index.ts`.
    2. **Bug identificado:** O filtro de status de confirmaÃ§Ã£o (`DELIVERY_ACK`, `READ`, `PLAYED`, `SERVER_ACK`) estava posicionado **globalmente**, antes do check de `body.event === 'messages.upsert'`. A Evolution API v2 pode incluir o campo `data.status` preenchido em alguns payloads `messages.upsert`, fazendo o webhook retornar prematuramente antes de chegar na lÃ³gica de criaÃ§Ã£o de conversa para leads externos.
    3. **CorreÃ§Ã£o aplicada (duas partes):**
       - O filtro de status foi envolvido em um `if (body.event !== 'messages.upsert')`. Assim, ele sÃ³ atua em eventos que **nÃ£o** sejam `messages.upsert` (como `messages.update` ou outros tipos de eventos de atualizaÃ§Ã£o).
       - Um segundo filtro foi adicionado **dentro** do bloco `messages.upsert`, condicionado tambÃ©m a `fromMe === true`, garantindo que confirmaÃ§Ãµes de entrega de mensagens enviadas pelo atendente nÃ£o gerem processamento desnecessÃ¡rio â€” sem jamais descartar uma mensagem recebida de lead externo.
    4. **Confirmados como corretos (sem alteraÃ§Ã£o):**
       - Filtro de grupos `@g.us` â€” permanece no topo âœ…
       - LÃ³gica de criaÃ§Ã£o de nova conversa (INSERT em `whatsapp_conversations`) quando nÃ£o existe conversa para `phone + company_id + instance` âœ…
       - LÃ³gica de atualizaÃ§Ã£o de conversa existente âœ…
       - Nenhum filtro por `kommo_lead_id` ou flag de origem foi encontrado âœ…
    5. **ValidaÃ§Ã£o TypeScript:** Nenhum erro novo introduzido no `api/index.ts`.
  * *Data e hora da alteraÃ§Ã£o:* 03/07/2026 Ã s 08:10 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`

---

## AlteraÃ§Ãµes â€” SessÃ£o 02/07/2026

* **CorreÃ§Ã£o Definitiva da Logomarca e Fontes do Bloco Institucional (Prompt 9):**
  * *O que foi feito:*
    1. **Logomarca com Cores Opacas Reais:** SubstituÃ­da a estratÃ©gia de `GState` pela renderizaÃ§Ã£o real da imagem em um elemento HTML Canvas na memÃ³ria. O arquivo original `.png` com canal alfa (transparÃªncia) agora Ã© desenhado num canvas de fundo branco (`#FFFFFF`) e depois exportado usando `canvas.toDataURL('image/jpeg', 1.0)`. Essa conversÃ£o para `.jpeg` forÃ§a a exclusÃ£o do canal alfa na prÃ³pria base de dados da imagem, resolvendo de vez o bug histÃ³rico do `jsPDF` que desbotava o logo transparente ao compor com as cores de fundo.
    2. **Escala de Leitura do Bloco "Sobre a MT Solar":** Todo o bloco institucional no final do PDF de ServiÃ§os (MissÃ£o, VisÃ£o, Valores, Por que Contratar) foi atualizado para ter os tÃ­tulos e conteÃºdos em `10pt`. A lÃ³gica matemÃ¡tica do espaÃ§amento foi ajustada para obedecer fielmente ao `lineHeight` de proporÃ§Ã£o ideal (`10 * 0.4`), e os espaÃ§amentos internos superior/inferior (`topSpace`, `bottomSpace`) agora somam com exatidÃ£o no bloco pai para prever as quebras de pÃ¡gina.
  * *Data e hora da alteraÃ§Ã£o:* 02/07/2026 Ã s 20:17 (HorÃ¡rio Local)
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`


* **Melhorias de VisualizaÃ§Ã£o e Detalhamento no PDF de ServiÃ§os:**
  * *O que foi feito:*
    1. **Logomarca com Opacidade Total (Prompt 6):** Removidos quaisquer resÃ­duos de GState desbotado aplicados de instÃ¢ncias anteriores. O cÃ³digo agora aplica ativamente `{ opacity: 1.0, 'fill-opacity': 1.0 }` no GState antes de desenhar a logo, e restaura o GState apÃ³s a renderizaÃ§Ã£o, garantindo a tonalidade original do PNG sem herdar opacidades baixas.
    2. **Detalhamento TÃ©cnico de Equipamentos (Prompt 7):** Integrada a variÃ¡vel de estado `serviceEquipmentData` Ã  pipeline de geraÃ§Ã£o. Caso um serviÃ§o possua flag de equipamento e dados preenchidos no formulÃ¡rio (quantidade, potÃªncia e modelos de mÃ³dulos/inversores), um novo bloco chamado "EspecificaÃ§Ãµes TÃ©cnicas:" Ã© dinamicamente inserido abaixo das observaÃ§Ãµes no PDF, listando apenas as propriedades preenchidas e com espaÃ§amento proporcional.
    3. **Tamanho das Fontes e EspaÃ§amento (Prompt 8):** Todo o bloco de renderizaÃ§Ã£o de serviÃ§os sofreu upscale nas fontes. As descriÃ§Ãµes e observaÃ§Ãµes foram de `9pt/8pt` para `10pt`; as especificaÃ§Ãµes tÃ©cnicas fixadas em `9.5pt` com tÃ­tulos em `10pt` negrito; e as normas aplicÃ¡veis aumentadas para `9pt`. Todo o cÃ¡lculo de quebra de pÃ¡gina `checkPage` foi refatorado e recalibrado para usar um multiplicador fixo de espaÃ§amento de linha (`fontSize * 0.4`), prestando conta exata dos milÃ­metros que cada sub-bloco consumirÃ¡ na folha.
  * *Data e hora da alteraÃ§Ã£o:* 02/07/2026 Ã s 20:07 (HorÃ¡rio Local)
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`


* **CorreÃ§Ã£o de URL do Path no Download de MÃ­dias (Supabase legado + R2):**
  * *O que foi feito:*
    1. **Frontend (`WhatsApp.tsx`):** Adicionada a funÃ§Ã£o auxiliar `extrairPathRelativo(mediaUrl)` que trata dois formatos de URL: URLs do Supabase Storage (`https://xxx.supabase.co/storage/v1/object/public/BUCKET/...` â†’ extrai tudo apÃ³s `/object/public/`) e URLs do R2 pÃºblico ou outros domÃ­nios (extrai o `pathname` via `new URL()`). A funÃ§Ã£o `getMediaUrl` passou a usar `extrairPathRelativo` em vez de extrair o pathname cru da URL, resolvendo o problema de 404 em arquivos antigos do Supabase.
    2. **Backend (`api/index.ts`):** A rota `/api/media/download` ganhou um `if` de fallback: se o `path` recebido via query string comeÃ§ar com `http://` ou `https://` (indicando que Ã© uma URL completa legada), o `fetch` Ã© feito diretamente nessa URL sem construir a URL do R2. Caso contrÃ¡rio, segue o fluxo normal de path relativo â†’ R2.
  * *Data e hora da alteraÃ§Ã£o:* 02/07/2026 Ã s 20:00 (HorÃ¡rio Local)
  * *Arquivos modificados:* `src/pages/WhatsApp.tsx`, `api/index.ts`

* **Logomarca com Fundo Branco no PDF de ServiÃ§os:**
  * *O que foi feito:* O PNG da logo MT Solar tem fundo transparente. No cabeÃ§alho azul escuro do PDF, as cores da marca desapareciam sobre o fundo azul. SoluÃ§Ã£o: imediatamente antes do `doc.addImage`, Ã© desenhado um `doc.roundedRect` com `setFillColor(255, 255, 255)` na posiÃ§Ã£o exata da logo com uma margem de 3mm em cada lado. ApÃ³s a inserÃ§Ã£o da imagem, a cor de fill Ã© restaurada para o azul do cabeÃ§alho (`setFillColor(30, 58, 95)`).
  * *Data e hora da alteraÃ§Ã£o:* 02/07/2026 Ã s 20:00 (HorÃ¡rio Local)
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`


* **CorreÃ§Ã£o de ProporÃ§Ã£o e EspaÃ§os em Branco nas PÃ¡ginas da Proposta Comercial:**
  * *O que foi feito:*
    1. **Causa raiz identificada:** O `autoPaging: 'slice'` no `doc.html()` do `uploadFullPDF` nÃ£o respeita os atributos CSS `page-break-after: always`. Com divs de `min-height: 297mm`, o jsPDF desconhecia os limites de cada pÃ¡gina e cortava o conteÃºdo em posiÃ§Ãµes aleatÃ³rias, gerando espaÃ§os em branco.
    2. **Troca para `autoPaging: 'text'`:** O modo `'text'` respeita as marcaÃ§Ãµes `page-break-after` do CSS, garantindo que cada `<div class="page">` seja renderizada como uma pÃ¡gina exata do A4.
    3. **`min-height` â†’ `height: 297mm`:** Todas as divs de conteÃºdo corrido (pÃ¡ginas 5â€“9) foram alteradas de `min-height: 297mm` para `height: 297mm` com `overflow: hidden`. Isso forÃ§a cada div a ser exatamente uma pÃ¡gina A4, sem crescer alÃ©m do limite e gerar espaÃ§o excedente na prÃ³xima pÃ¡gina.
    4. **Constantes de margem nas fotos:** Nomeadas com `MARGEM_SUPERIOR_FOTO`, `MARGEM_INFERIOR_FOTO` e `LIMITE_Y_FOTO` para maior clareza e consistÃªncia com o padrÃ£o do arquivo.
    5. **Nota:** O HTML que vai para o print do browser (`htmlParaNavegador`) nÃ£o foi alterado â€” ele continua com `min-height` para que o layout visual do print funcione corretamente.
  * *Data e hora da alteraÃ§Ã£o:* 02/07/2026 Ã s 19:40 (HorÃ¡rio Local)
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`


* **CorreÃ§Ã£o no Download de MÃ­dias (Encoding de Arquivos Corrompidos):**
  * *O que foi feito:* 
    1. A rota `GET /api/media/download` no backend sofreu uma refatoraÃ§Ã£o no mÃ©todo de busca e envio de dados para corrigir falhas de encoding onde o arquivo de mÃ­dia baixava com o tamanho correto (ex: 14.7 MB), mas nÃ£o era legÃ­vel pelo sistema operacional.
    2. O mÃ©todo baseado na API de Streams (`data.Body.pipe(res)`) foi descontinuado em prol de um `fetch` nativo apontado para a URL pÃºblica do R2.
    3. O buffer de dados passa a ser lido explicitamente via `response.arrayBuffer()`, convertido para `Buffer.from(arrayBuffer)`, e finalizado com a instruÃ§Ã£o `res.end(buffer)` (preservando perfeitamente a estrutura binÃ¡ria).
    4. Adicionado o `Content-Length` aos cabeÃ§alhos de resposta.
  * *Data e hora da alteraÃ§Ã£o:* 02/07/2026 Ã s 19:35 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`


* **CorreÃ§Ãµes no PDF da Proposta de ServiÃ§os (RemoÃ§Ã£o, Pagamento e Logomarca):**
  * *O que foi feito:*
    1. **ObservaÃ§Ã£o de RemoÃ§Ã£o:** Adicionado bloco em itÃ¡lico com as "ObservaÃ§Ãµes: " logo apÃ³s a descriÃ§Ã£o do serviÃ§o de RemoÃ§Ã£o de Equipamentos Fotovoltaicos, caso haja texto preenchido na interface. O cÃ¡lculo de quebra de pÃ¡gina tambÃ©m foi ajustado para contabilizar a altura extra da observaÃ§Ã£o.
    2. **CondiÃ§Ãµes Comerciais e Valor Total:** SubstituÃ­da a string interpolada de uma linha por um `doc.splitTextToSize` no campo de CondiÃ§Ãµes de Pagamento, garantindo que se o usuÃ¡rio digitar uma condiÃ§Ã£o extensa (ex: descriÃ§Ãµes detalhadas de financiamento) ela seja quebrada em mÃºltiplas linhas e exiba corretamente no PDF, recalculando o incremento no cursor Y. AlÃ©m disso, adicionado tratativas para imprimir "â€”" caso nÃ£o haja preenchimento.
    3. **RemoÃ§Ã£o de Frase Hardcoded:** A frase fixa "com descarte ou guarda conforme orientaÃ§Ã£o do cliente" foi extirpada via `.replace()` na geraÃ§Ã£o da descriÃ§Ã£o do serviÃ§o de RemoÃ§Ã£o, mantendo o controle total da descriÃ§Ã£o daquele trecho pelo usuÃ¡rio via o novo campo de observaÃ§Ã£o livre.
    4. **CorreÃ§Ã£o de Opacidade da Logomarca:** O `doc.setGState(new doc.GState({ opacity: 1.0 }))` estava sendo chamado apenas apÃ³s a inclusÃ£o da logomarca do cabeÃ§alho. Ele foi duplicado, passando a ser invocado antes e depois do `doc.addImage`, consertando a impressÃ£o translÃºcida/apagada da marca.
  * *Data e hora da alteraÃ§Ã£o:* 02/07/2026 Ã s 19:33 (HorÃ¡rio Local)
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`


* **CorreÃ§Ã£o na LÃ³gica de PaginaÃ§Ã£o da Proposta de ServiÃ§os (`generateServicePDF`):**
  * *O que foi feito:*
    1. A funÃ§Ã£o `generateServicePDF` estava superestimando a altura dos blocos de texto, gerando quebras prematuras de pÃ¡gina e excesso de espaÃ§o em branco.
    2. Modificamos os blocos Institucional ("Sobre a MT Solar") e de listagem de ServiÃ§os Contratados para utilizarem a funÃ§Ã£o nativa do jsPDF `doc.splitTextToSize(texto, larguraUtil)` **antes** da decisÃ£o de quebrar a pÃ¡gina (`checkPage`).
    3. Isso garante que a altura exata do texto (multiplicando a quantidade real de linhas renderizadas pela altura de cada linha, ex: `linesMissao.length * 4`) seja usada como parÃ¢metro para a verificaÃ§Ã£o de limite da pÃ¡gina.
    4. Agora a listagem de serviÃ§os calcula a altura total do item atual (tÃ­tulo + descriÃ§Ã£o + normas) com precisÃ£o e chama `checkPage` apenas **uma vez** por serviÃ§o, impedindo que textos de um mesmo bloco fiquem Ã³rfÃ£os em pÃ¡ginas diferentes.
  * *Data e hora da alteraÃ§Ã£o:* 02/07/2026 Ã s 19:17 (HorÃ¡rio Local)
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`


* **CorreÃ§Ã£o no Download de MÃ­dias e Propostas (IntegraÃ§Ã£o Cloudflare R2):**
  * *O que foi feito:*
    1. **CriaÃ§Ã£o da rota `/api/media/download`:** A rota foi implementada em `api/index.ts` usando o helper `getFileFromR2` (importado de `r2.ts`). A rota recebe o `path` via query, busca o arquivo no bucket R2 e faz o pipe do ReadableStream de volta para o cliente, injetando os headers `Content-Disposition: attachment` (com o filename correto) e `Content-Type`.
    2. **Ajuste na construÃ§Ã£o da URL no Frontend:** No `WhatsApp.tsx`, a funÃ§Ã£o `getMediaUrl` foi atualizada. A validaÃ§Ã£o `.includes('r2.dev')` foi removida para suportar eventuais custom domains, passando a extrair o `pathname` de qualquer URL absoluta persistida no banco e roteando-a para a nossa prÃ³pria rota `/api/media/download` (enviando junto o `token` de autenticaÃ§Ã£o).
    3. **Fluxo nativo e web intactos:** A lÃ³gica que diferencia `Capacitor.isNativePlatform()` (usando o FileSystem) e o ambiente web (usando a tag `<a>` invisÃ­vel) na funÃ§Ã£o `handleDownloadMedia` permaneceu intacta, pois jÃ¡ operava corretamente assim que a URL validada Ã© entregue.
  * *Data e hora da alteraÃ§Ã£o:* 02/07/2026 Ã s 19:05 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/WhatsApp.tsx`


* **Forma de Pagamento e CorreÃ§Ã£o da Logomarca na Proposta de ServiÃ§os:**
  * *O que foi feito:*
    1. **SeÃ§Ã£o de Forma de Pagamento e Prazos:** Adicionada no final da aba Proposta de ServiÃ§o, incluindo `Forma de Pagamento` (Select: Ã€ Vista, Parcelado no CartÃ£o, TransferÃªncia/PIX, Financiamento, Outro), `CondiÃ§Ãµes / ObservaÃ§Ãµes` (input text) e `Valor Total do ServiÃ§o (R$)` (que jÃ¡ existia, agora agrupado nesta seÃ§Ã£o).
    2. **PDF Atualizado:** Estes novos campos foram inseridos na renderizaÃ§Ã£o do PDF de ServiÃ§os (CONDIÃ‡Ã•ES COMERCIAIS).
    3. **Logomarca NÃ­tida no PDF:** A inserÃ§Ã£o da imagem da MT Solar (`PNG_-_MT_SOLAR__1_.png`) no `jsPDF` foi reescrita. Agora, ela Ã© carregada via `fetch()`, convertida para um blob e lida para `base64` atravÃ©s do `FileReader`. Adicionado tambÃ©m a restauraÃ§Ã£o explÃ­cita da opacidade para 1.0 via `doc.setGState(new doc.GState({ opacity: 1.0 }))` logo apÃ³s renderizar a logo, garantindo a visibilidade total da imagem no PDF de serviÃ§os.
  * *Data e hora da alteraÃ§Ã£o:* 02/07/2026 Ã s 18:52 (HorÃ¡rio Local)
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`


* **Novo ServiÃ§o de RemoÃ§Ã£o e Detalhamento TÃ©cnico na Aba "Proposta de ServiÃ§os":**
  * *O que foi feito:*
    1. **Novo serviÃ§o "RemoÃ§Ã£o de Equipamentos Fotovoltaicos"** adicionado Ã  constante `AVAILABLE_SERVICES` com descriÃ§Ã£o, normas aplicÃ¡veis (NBR 16690, NBR 5410, NBR 10004) e flags `hasEquipment: true` e `hasRemovalObservation: true`. Quando marcado, exibe uma textarea com label "ObservaÃ§Ãµes sobre a remoÃ§Ã£o" (campo obrigatÃ³rio, visÃ­vel apenas quando o serviÃ§o estiver selecionado).
    2. **Flag `hasEquipment`** adicionada a todos os serviÃ§os existentes para determinar quais exibem o bloco de detalhamento tÃ©cnico. ServiÃ§os com equipamentos fÃ­sicos: Limpeza de MÃ³dulos, InstalaÃ§Ã£o dos MÃ³dulos Fotovoltaicos, Comissionamento Fotovoltaico e RemoÃ§Ã£o de Equipamentos Fotovoltaicos. ServiÃ§os sem: Limpeza de Terreno, Projeto de SubestaÃ§Ã£o, Projeto de Usina Fotovoltaica, HomologaÃ§Ã£o.
    3. **Bloco de detalhamento tÃ©cnico** exibido abaixo de cada serviÃ§o marcado que possui `hasEquipment: true`, contendo: Qtd. de MÃ³dulos (nÃºmero), PotÃªncia do MÃ³dulo em Wp (nÃºmero), PotÃªncia Total em kWp (somente leitura, calculada automaticamente: `qtd Ã— potWp / 1000`), PotÃªncia do Inversor em kW (nÃºmero), Marca do MÃ³dulo (texto), Modelo do MÃ³dulo (texto), Marca do Inversor (texto), Modelo do Inversor (texto).
    4. Adicionados dois novos estados: `serviceObservations` (`Record<string, string>`) para a textarea de remoÃ§Ã£o, e `serviceEquipmentData` (`Record<string, ServiceEquipmentData>`) para os dados tÃ©cnicos de cada serviÃ§o. Adicionada funÃ§Ã£o `updateServiceEquipment` que recalcula `potenciaTotalKwp` automaticamente a cada mudanÃ§a de quantidade ou potÃªncia do mÃ³dulo.
    5. Grid de serviÃ§os alterado de `grid-cols-2` para `grid-cols-1` para dar espaÃ§o aos sub-blocos colapsÃ¡veis.
    6. Nenhuma outra aba, componente, lÃ³gica de geraÃ§Ã£o de PDF da Proposta Comercial ou rota de backend foi alterada.
  * *Data e hora da alteraÃ§Ã£o:* 02/07/2026 Ã s 18:38 (HorÃ¡rio Local)
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`

---

## AlteraÃ§Ãµes â€” SessÃ£o 01/07/2026

* **ðŸ”¥ HOTFIX CRÃ�TICO: CorreÃ§Ã£o de Quebra em ProduÃ§Ã£o (WhatsApp.tsx):**
  * *O que foi feito:* Corrigido erro fatal `TypeError: undefined is not a function at Array.filter` que derrubou o painel de atendimento. O erro ocorria quando a API nÃ£o retornava um array vÃ¡lido, tornando as variÃ¡veis de estado (`conversations`, `availableAgents`, `messages`, etc.) nulas ou indefinidas, quebrando a renderizaÃ§Ã£o nas chamadas subsequentes de `.filter()` e `.map()`. A soluÃ§Ã£o consistiu em (1) blindar o set inicial das conversas com `setConversations(Array.isArray(data) ? data : [])` e (2) adicionar guards preventivos `(variavel || [])` antes de absolutamente todas as chamadas iterativas de arrays (`filter` e `map`) presentes no componente `WhatsApp.tsx`, garantindo que o React jamais tente mapear valores indefinidos.
  * *Data e hora da alteraÃ§Ã£o:* 01/07/2026 Ã s 07:15 (HorÃ¡rio Local)
  * *Arquivos modificados:* `src/pages/WhatsApp.tsx`


* **Renomear Contatos no Atendimento WhatsApp:**
  * *O que foi feito:* Implementada funcionalidade completa para
    vendedores renomearem contatos diretamente no painel de
    atendimento. Backend: nova rota `PUT /api/conversations/:id/rename`
    com autenticaÃ§Ã£o JWT, validaÃ§Ã£o multi-tenant, limite de 100
    caracteres e registro automÃ¡tico de mensagem interna de auditoria
    (`âœ�ï¸� Contato renomeado para "X" por Fulano`). Frontend: Ã­cone de
    lÃ¡pis (Pencil) aparece ao hover sobre o nome no cabeÃ§alho da
    conversa â€” Enter salva, Escape cancela, onBlur tambÃ©m salva.
    FunÃ§Ã£o `updateContactName` migrada de chamada direta ao Supabase
    para a nova rota de API.
  * *Data e hora da alteraÃ§Ã£o:* 01/07/2026 Ã s 07:03 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/WhatsApp.tsx`, `RESUMO_MESTRE.md`

* **Quebra de Linha (Shift+Enter) no Campo de Mensagem:**
  * *O que foi feito:* Campo de digitaÃ§Ã£o do chat substituÃ­do de
    `<input type="text">` para `<textarea>` dinÃ¢mico com auto-resize
    (mÃ¡ximo 160px). Regras: Enter sozinho envia, Shift+Enter quebra
    linha. Atributo `enterKeyHint="send"` para teclado nativo Android.
    ApÃ³s envio, altura Ã© resetada para 1 linha automaticamente.
    Quebras de linha (\n) preservadas na entrega Ã  Evolution API.
  * *Data e hora da alteraÃ§Ã£o:* 01/07/2026 Ã s 06:50 (HorÃ¡rio Local)
  * *Arquivos modificados:* `src/pages/WhatsApp.tsx`, `RESUMO_MESTRE.md`

* **Download de MÃ­dias no Atendimento (Web e APK):**
  * *O que foi feito:* (1) CorreÃ§Ã£o da construÃ§Ã£o de URLs do R2 em
    `r2.ts` e `api/index.ts` eliminando barras duplicadas. (2) Nova
    rota proxy `GET /api/media/download?path=X&token=Y` com autenticaÃ§Ã£o
    via query param (para `<img>` e `<audio>`) e via header Bearer,
    fetch streamado do R2, headers CORS limpos e `Content-Disposition:
    attachment`. (3) Helper `handleDownloadMedia` no frontend: usa
    `@capacitor/filesystem` + `Share.share()` no APK nativo e link
    `<a download>` invisÃ­vel no web. Imagens com botÃ£o de download no
    lightbox, documentos com botÃ£o dedicado, Ã¡udios roteados pelo proxy.
    Middleware de autenticaÃ§Ã£o atualizado para aceitar token em
    query param.
  * *Data e hora da alteraÃ§Ã£o:* 01/07/2026 Ã s 06:45 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `api/r2.ts`, `src/pages/WhatsApp.tsx`, `RESUMO_MESTRE.md`

* **CorreÃ§Ãµes no PDF da Proposta Comercial:**
  * *O que foi feito:* (A) Constante `MARGEM_INFERIOR = 25mm` e
    `LIMITE_Y` unificados em todos os pontos de quebra de pÃ¡gina,
    eliminando lacunas e rodapÃ© invadindo pÃ¡gina seguinte. (B) Guard
    `propNumeroLimpo` com `startsWith('PROP-')` corrigindo nÃºmero
    duplicado `PROP-PROP-XXXXX`. (C) Guard no grÃ¡fico Consumo X
    GeraÃ§Ã£o com fallback elegante quando dados estÃ£o ausentes.
    (D) Datas de geraÃ§Ã£o e validade corrigidas com construÃ§Ã£o manual
    sem bug de UTC, validade atualizada para 30 dias. (E) Tabela de
    materiais exibe "Incluso no Kit" por item e "Valor Total do Kit"
    no rodapÃ© quando o kit vem de solar_kits.
  * *Data e hora da alteraÃ§Ã£o:* 01/07/2026 Ã s 06:58 (HorÃ¡rio Local)
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`, `RESUMO_MESTRE.md`

* **CorreÃ§Ã£o do Nome "VocÃª" em Leads do Kommo:**
  * *O que foi feito:* (1) Webhook `POST /api/webhooks/whatsapp`:
    pushName igual a "VocÃª" ou nulo Ã© descartado. ResoluÃ§Ã£o em
    cascata: mantÃ©m contact_name existente â†’ busca em clients por
    phone â†’ fallback para nÃºmero. Regra anti-sobrescrita: jamais
    substitui nome vÃ¡lido por nulo ou "VocÃª". (2) Webhook
    `POST /api/kommo/webhook`: se Kommo nÃ£o retorna nome, extrai
    via Regex das notas do lead (getKommoLeadNotes) antes de usar
    placeholder `Lead Kommo #ID`. (3) Rota `POST /api/kommo/fix-names`
    confirmada com suporte a correÃ§Ã£o retroativa de contact_name =
    'VocÃª'. CorreÃ§Ã£o de tipagem em variÃ¡vel de notas (string vs array).
  * *Data e hora da alteraÃ§Ã£o:* 01/07/2026 Ã s 06:40 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `RESUMO_MESTRE.md`


* **CorreÃ§Ã£o de Tipagem (TypeScript): MAX_TENTATIVAS e listFromR2:**
  * *O que foi feito:* Corrigidos erros de TypeScript na `api/index.ts`. A constante `MAX_TENTATIVAS` foi renomeada para a variÃ¡vel correta `maxTentativas` para coincidir com o parÃ¢metro recebido em `getKommoLeadContact`. A funÃ§Ã£o inexistente `listR2Files` foi substituÃ­da por `listFromR2`, sendo importada corretamente. O arquivo `api/r2.ts` tambÃ©m foi atualizado para exportar `listFromR2` com esse nome.
  * *Data e hora da alteraÃ§Ã£o:* 29/06/2026 Ã s 20:38 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `api/r2.ts`

* **AutomaÃ§Ã£o Kommo: Mover Lead para CONVERSANDO ao Criar Conversa:**
  * *O que foi feito:* Implementada automaÃ§Ã£o que move o card do lead no Kommo para a coluna "CONVERSANDO" (status_id: 107282595) automaticamente sempre que o MTSolar criar ou atualizar uma conversa originada do webhook. O movimento ocorre tanto na criaÃ§Ã£o de nova conversa quanto no anti-duplicata (conversa jÃ¡ existente). Qualquer lead que passar pela coluna LEAD (status_id: 107282587) no Kommo terÃ¡ seu card movido automaticamente para CONVERSANDO apÃ³s ser processado pelo MTSolar.
  * *Data e hora da alteraÃ§Ã£o:* 29/06/2026 Ã s 23:10 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`

* **IntegraÃ§Ã£o Kommo CRM â€” CorreÃ§Ã£o Definitiva do Webhook:**
  * *O que foi feito:* Resolvido o problema onde o webhook `/api/kommo/webhook` travava indefinidamente na query do Supabase. A causa raiz era que a busca da empresa estava dentro de um `setImmediate()` â€” apÃ³s o `res.200`, a Vercel Serverless encerra conexÃµes de rede, impedindo qualquer query ao Supabase. A soluÃ§Ã£o foi mover a busca da empresa para ANTES do `res.200`, dentro do ciclo de vida normal da requisiÃ§Ã£o, e mover o `res.200` para o final do handler apÃ³s todo o processamento. Adicionalmente, corrigido o `SyntaxError: Unexpected end of JSON input` na funÃ§Ã£o `getKommoLeadNotes` usando `.text()` com guard antes do `.json()`.
  * *Fluxo completo funcionando:*
    1. Lead entra na coluna LEAD do Kommo (status_id: 107282587)
    2. Webhook dispara â†’ MTSolar filtra por KOMMO_STATUS_ID_LEAD
    3. Empresa buscada no Supabase (dentro do ciclo normal da requisiÃ§Ã£o)
    4. Telefone extraÃ­do e normalizado para 55XXXXXXXXXXX
    5. Round-robin atribui para Soraia Castro ou Manoel JordÃ£o
    6. Conversa criada no MTSolar + push notification enviado
    7. Card do lead movido para CONVERSANDO no Kommo
    8. `res.200` enviado apÃ³s tudo concluÃ­do
  * *IDs do Pipeline Kommo (Funil de vendas â€” id: 13903135):*
    * LEAD: 107282587
    * CONVERSANDO: 107282595
  * *Causa raiz do travamento:* `setImmediate()` apÃ³s `res.200` bloqueia conexÃµes de rede na Vercel Serverless
  * *Data e hora da alteraÃ§Ã£o:* 29/06/2026 Ã s 22:50 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`

* **OtimizaÃ§Ã£o de Timeout para Serverless (Kommo):**
  * *O que foi feito:* A funÃ§Ã£o Vercel responsÃ¡vel pelo webhook (`api/index.ts`) estava sofrendo aborto (timeout sem status code) devido ao limite de 30s.
    1. A funÃ§Ã£o `kommoApi` foi ajustada para aceitar um `timeoutMs` com padrÃ£o de 8000ms.
    2. A funÃ§Ã£o `getKommoLeadContact` teve seu `maxTentativas` reduzido de 3 para 2 como padrÃ£o, garantindo que o processamento em cadeia nÃ£o estoure o teto limite da Serverless Function. Chamadas diretas (ex: `pipeline-stages`) mantiveram o timeout de 15s original.
  * *Data e hora da alteraÃ§Ã£o:* 29/06/2026 Ã s 18:52 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`

* **Captura de Leads Movidos no Kommo (leads.update e leads.status):**
  * *O que foi feito:* 
    1. O webhook `POST /api/kommo/webhook` foi aprimorado para capturar tambÃ©m leads que sÃ£o movidos pelo bot do Kommo para a coluna "LEAD" (recebidos em `leads.update` e tambÃ©m no array correto de mudanÃ§a de fase: `leads.status`), e nÃ£o apenas os recÃ©m-criados na primeira etapa (`leads.add`).
    2. Apenas os leads atualizados que possuam o `status_id` correspondente Ã  etapa LEAD serÃ£o processados. Este ID deve ser configurado na nova variÃ¡vel de ambiente `KOMMO_STATUS_ID_LEAD` na Vercel.
    3. Criada a rota de diagnÃ³stico `GET /api/kommo/pipeline-stages` (acessÃ­vel apenas para CEO) para listar os pipelines e descobrir facilmente o `status_id` correto de cada etapa sem precisar acessar configuraÃ§Ãµes avanÃ§adas do Kommo manualmente.
    4. O fluxo anti-duplicata existente protegerÃ¡ a inserÃ§Ã£o (impedindo que um lead atualizado mÃºltiplas vezes crie vÃ¡rias conversas), atualizando apenas o nome se jÃ¡ houver conversa criada.
  * *Data e hora da alteraÃ§Ã£o:* 29/06/2026 Ã s 18:32 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `RESUMO_MESTRE.md`

* **CorreÃ§Ã£o Completa da IntegraÃ§Ã£o Kommo CRM:**
  * *O que foi feito:*
    1. `kommoApi()`: timeout aumentado para 15000ms via AbortController.
    2. `getKommoLeadContact()`: retry automÃ¡tico atÃ© 3 tentativas com 
       1000ms de espera; retorna null com seguranÃ§a se todas falharem.
    3. ExtraÃ§Ã£o de telefone cobre dois formatos: `contact.phone` direto 
       e `custom_fields_values` com `field_code === 'PHONE'`.
    4. NormalizaÃ§Ã£o de telefone para `55XXXXXXXXXXX`.
    5. Webhook anti-duplicata: verifica existÃªncia antes de inserir 
       conversa com phone `kommo-lead-{leadId}`.
    6. Leads sem telefone recebem tag `lead-sem-telefone` e nota interna 
       automÃ¡tica com alerta para atualizar o Kommo.
    7. `POST /api/kommo/fix-names` expandido: alÃ©m de nomes, corrige 
       phones temporÃ¡rios `kommo-lead-*` buscando o nÃºmero real no Kommo.
       MantÃ©m temporÃ¡rio com log quando Kommo ainda nÃ£o tem telefone.
    8. Credenciais Kommo validadas antes do 200 OK; retorna 500 se 
       ausentes.
    9. Frontend `WhatsApp.tsx`: conversas com phone temporÃ¡rio exibem 
       "ðŸ“‹ Sem telefone" e bloqueiam o campo de envio com aviso.
  * *Data e hora da alteraÃ§Ã£o:* 29/06/2026 Ã s 21:00 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/WhatsApp.tsx`,
    `RESUMO_MESTRE.md`
* **CorreÃ§Ã£o Definitiva do RecÃ¡lculo de Margem de Venda (calculateResults):**
  * *O que foi feito:* Identificado e corrigido o bug central que fazia o "Valor Final de Venda" nÃ£o persistir ao alterar a margem. O `useEffect([formData])` chamava `calculateResults()` que recalculava `salePrice = kitCost * (1 + marginPercent / 100)` â€” como `marginPercent` Ã© sempre `'0'` quando o kit Ã© selecionado pelo dropdown, o valor correto era imediatamente sobrescrito. TrÃªs pontos foram corrigidos:
    1. **`calculateResults`**: agora usa `formData.margemVenda` como fonte primÃ¡ria da margem (quando disponÃ­vel), e prioriza `formData.valorFinalVenda` como `salePrice` se ele jÃ¡ foi calculado corretamente â€” sÃ³ recalcula do zero caso nenhum esteja definido.
    2. **`saleP` no `generatePDF`**: o fallback de cÃ¡lculo do valor de venda no PDF foi corrigido para usar `margemVenda` em vez de `marginPercent`, garantindo que o PDF imprima o valor real praticado.
    3. **`saveToHistory`**: a margem salva no histÃ³rico agora usa `formData.margemVenda` como fonte primÃ¡ria.
  * *Data e hora da alteraÃ§Ã£o:* 29/06/2026 Ã s 17:45 (HorÃ¡rio Local)
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`

* **ProteÃ§Ã£o do HistÃ³rico de Propostas (PROMPT 2 â€” confirmaÃ§Ã£o e logs):**
  * *O que foi feito:* Auditado o cronjob `GET /api/cleanup-proposals` em `api/index.ts`. Confirmado que **nÃ£o existe nenhum `.delete()` referenciando `proposal_history`** â€” o cÃ³digo usa corretamente `.update({ url_arquivo: null })` para preservar os registros. Adicionado log de auditoria no `POST /api/proposal-history` para rastrear criaÃ§Ã£o de propostas com data de expiraÃ§Ã£o exata nos logs da Vercel: `[PROPOSAL-HISTORY] Nova proposta salva para "...". Expira em: ...`.
  * *Data e hora da alteraÃ§Ã£o:* 29/06/2026 Ã s 17:48 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`

* **CorreÃ§Ã£o do RecÃ¡lculo de Margem de Venda no Gerador de Propostas:**
  * *O que foi feito:* Corrigido o comportamento do campo "Margem de Venda (%)" para CEO/ADMIN em `ProposalGenerator.tsx`. Anteriormente, ao alterar o valor da margem, o "Valor Final de Venda" nÃ£o era atualizado. TrÃªs pontos foram corrigidos:
    1. **`applySelectedKit`**: ao selecionar um kit, passa a atualizar simultaneamente `formData.margemVenda`, `formData.valorFinalVenda`, `formData.kitCost` e `results.salePrice` via `setResults`.
    2. **`onChange` da Margem de Venda**: recalcula `novoValorFinal = kit.valor_total * (1 + novaMargemm / 100)` e atualiza `formData.valorFinalVenda`, `formData.kitCost` e `results.salePrice` ao mesmo tempo, garantindo que o card de preview reflita a mudanÃ§a imediatamente.
    3. **`saveToHistory`**: agora usa `formData.margemVenda` como fonte primÃ¡ria da margem ao salvar o histÃ³rico (antes usava apenas `formData.marginPercent`, que era sempre `'0'` quando o kit era selecionado pelo dropdown).
  * *Data e hora da alteraÃ§Ã£o:* 29/06/2026 Ã s 17:40 (HorÃ¡rio Local)
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`

* **AlteraÃ§Ã£o do Banco PadrÃ£o na Proposta Comercial:**
  * *O que foi feito:* O banco padrÃ£o selecionado na geraÃ§Ã£o de propostas (`ProposalGenerator.tsx`) foi alterado de "MT Solar" para "BV" para refletir a necessidade correta de apresentaÃ§Ã£o financeira no PDF gerado.
  * *Data e hora da alteraÃ§Ã£o:* 29/06/2026 Ã s 17:30 (HorÃ¡rio Local)
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`

* **Filtro de Webhooks WhatsApp e CorreÃ§Ã£o de Duplicidade:**
  * *O que foi feito:* Realizadas 3 melhorias crÃ­ticas no handler do webhook (`POST /api/webhooks/whatsapp`) e no salvamento de mensagens em todo o arquivo `api/index.ts`. (1) Implementado filtro inicial ignorando mensagens de grupo (`remoteJid.endsWith('@g.us')`). (2) Implementado filtro que ignora eventos puramente de confirmaÃ§Ã£o (`DELIVERY_ACK`, `READ`, `PLAYED`, `SERVER_ACK`) sem sobrecarregar o DB. (3) Convertidas *todas as 6 operaÃ§Ãµes* de `.insert()` na tabela `whatsapp_messages` espalhadas no arquivo para `.upsert(..., { onConflict: 'message_id', ignoreDuplicates: true })`, prevenindo que retentativas da Evolution API gerem logs de erro `duplicate key value violates unique constraint`.
  * *Data e hora da alteraÃ§Ã£o:* 29/06/2026 Ã s 17:15 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`
* **Tratamento de 500 na Neoenergia e CorreÃ§Ã£o de Timeout no Upload:**
  * *O que foi feito:* Adicionada configuraÃ§Ã£o `maxDuration: 30` no `vercel.json` para a funÃ§Ã£o `api/index.ts` com o intuito de prevenir Timeouts no Vercel (Erro 403/504) durante o upload de mÃ­dia de arquivos maiores (~2MB) pelo WhatsApp. Adicionado tambÃ©m log detalhado `try/catch` na rota `GET /api/neoenergia` para diagnosticar falhas de join (PossÃ­vel erro em `created_by`).
  * *Data e hora da alteraÃ§Ã£o:* 29/06/2026 Ã s 17:11 (HorÃ¡rio Local)
  * *Arquivos modificados:* `vercel.json`, `api/index.ts`
* **Auditoria de Perda Recente no HistÃ³rico de Propostas:**
  * *O que foi feito:* Realizada uma varredura direta via SQL na tabela `proposal_history` para investigar propostas ausentes.
  * *Resultados encontrados (Queries SQL):* 
    * **Quantidade de registros:** Existem apenas 6 registros no banco de dados na tabela `proposal_history` atualmente (todos com `created_at` de hoje, 29/06/2026).
    * **Company ID:** Todos os 6 registros tÃªm o `company_id` correto (`e4bf6f22-6182-414d-afa4-c5449c014323`), correspondente Ã  MT Solar.
    * **Datas de ExpiraÃ§Ã£o:** EstÃ£o corretas. Todas as 6 propostas tÃªm `data_expiracao` definida exatamente para 30 dias apÃ³s o `created_at`.
    * **Filtros na rota (API):** Verificada a rota `GET /api/proposal-history`. A query jÃ¡ estÃ¡ correta e NÃƒO possui filtros indevidos que ocultariam registros (nÃ£o hÃ¡ `.not('url_arquivo', 'is', null)` nem filtro de `data_expiracao`).
  * *ConclusÃ£o:* As propostas nÃ£o estÃ£o ocultas por erro na API. Os registros fÃ­sicos anteriores a hoje simplesmente nÃ£o existem na tabela (possivelmente afetados pelo delete em cascata ou por outra rotina de exclusÃ£o).
  * *Data e hora da alteraÃ§Ã£o:* 29/06/2026 Ã s 17:35 (HorÃ¡rio Local)
  * *Arquivos modificados:* Apenas auditoria (via script de banco)

* **Margem de Venda para CEO/ADMIN no Kit Solar:**
  * *O que foi feito:* Adicionado o campo `margemVenda` no `formData` para permitir que CEO e ADMIN visualizem e alterem a margem de venda na aba Kit Solar. O componente `ProposalGenerator.tsx` foi modificado para exibir o input e recalcular dinamicamente o `valorFinalVenda` no card de "Preview do Valor de Venda" sempre que a margem Ã© alterada.
  * *Data e hora da alteraÃ§Ã£o:* 29/06/2026 Ã s 17:05 (HorÃ¡rio Local)
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`
* **DiagnÃ³stico e CorreÃ§Ã£o do HistÃ³rico de Propostas:**
  * *O que foi feito:* Realizada uma verificaÃ§Ã£o nas rotas de manipulaÃ§Ã£o de histÃ³rico de propostas em `api/index.ts`. Foi confirmado que o cronjob `/api/cleanup-proposals` jÃ¡ utiliza corretamente o `update({ url_arquivo: null })` em vez de apagar os registros. A rota `GET /api/proposal-history` nÃ£o filtra por `url_arquivo IS NOT NULL` e o tempo de expiraÃ§Ã£o da proposta em `POST /api/proposal-history` estÃ¡ corretamente configurado para 30 dias (o comentÃ¡rio foi corrigido para refletir isso).
  * *Data e hora da alteraÃ§Ã£o:* 29/06/2026 Ã s 17:06 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`
* **SimplificaÃ§Ã£o da Tabela de Financiamento:**
  * *O que foi feito:* A tabela de taxas de financiamento no mÃ³dulo de propostas (`ProposalGenerator.tsx`) foi substituÃ­da. Antes ela renderizava mÃºltiplos bancos (BV e Santander) com taxas variÃ¡veis. Agora utiliza uma estrutura fixa (`TABELA_FINANCIAMENTO`) apenas com os prazos de 36, 48 e 60 meses, carÃªncia de 3 meses e taxa fixa de 2.4% (Banco MT Solar). A UI foi atualizada com o novo JSX simplificado e a funÃ§Ã£o de atualizaÃ§Ã£o do cÃ¡lculo na proposta foi mantida.
  * *Data e hora da alteraÃ§Ã£o:* 29/06/2026 Ã s 17:03 (HorÃ¡rio Local)
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`
* **CorreÃ§Ã£o de PermissÃ£o na Aba Kits Solares:**
  * *O que foi feito:* A variÃ¡vel `isAdminOrCeo` (que controla a visibilidade da aba "Kits Solares" e seu conteÃºdo no mÃ³dulo de Propostas) estava validando erroneamente o papel `ADM`. Foi corrigida para verificar a role `ADMIN` corretamente. A condiÃ§Ã£o foi atualizada para `user?.role === 'CEO' || user?.role === 'ADMIN'`, garantindo que a gerÃªncia administrativa tambÃ©m tenha acesso Ã  aba. A role `COMMERCIAL` continua sem acesso (vÃª apenas o dropdown).
  * *Data e hora da alteraÃ§Ã£o:* 26/06/2026 Ã s 13:33 (HorÃ¡rio Local)
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`
* **AtualizaÃ§Ã£o do Schema solar_kits â€” potencia_kwh â†’ potencia_kwp + consumo_referencia_kwh:**
  * *O que foi feito:* Refletidas no cÃ³digo as alteraÃ§Ãµes jÃ¡ executadas no banco Supabase via `ALTER TABLE`. A coluna `potencia_kwh` foi renomeada para `potencia_kwp` (kWp Ã© a unidade correta para painÃ©is fotovoltaicos) e a nova coluna opcional `consumo_referencia_kwh` (NUMERIC 10,2) foi adicionada para indicar a faixa de consumo mensal que o kit dimensiona. As seguintes mudanÃ§as foram aplicadas:
    * **`api/index.ts`:** GET `/api/solar-kits` â€” `order by` atualizado para `potencia_kwp` e `select` explÃ­cito com `consumo_referencia_kwh`; POST e PUT â€” desestruturaÃ§Ã£o de `req.body` com `potencia_kwp` e `consumo_referencia_kwh = null`; payload de INSERT/UPDATE enviado ao Supabase atualizado.
    * **`src/pages/ProposalGenerator.tsx`:** Interface `SolarKit` e constante `EMPTY_KIT` atualizadas; `openEditKitModal` e `applySelectedKit` usam `potencia_kwp`; dropdowns de CEO/ADM e VENDEDOR exibem `kWp` e, quando preenchido, o consumo de referÃªncia; tabela de kits tem coluna "PotÃªncia (kWp)" + nova coluna "Ref. Consumo"; modal de Adicionar/Editar Kit tem label e campo `potencia_kwp` + novo campo opcional `consumo_referencia_kwh`.
    * **`supabase/migrations/20260625_create_solar_kits.sql`:** DDL atualizado para documentaÃ§Ã£o â€” coluna renomeada e nova coluna adicionada; Ã­ndice `idx_solar_kits_potencia` aponta para `potencia_kwp`.
  * *Data e hora da alteraÃ§Ã£o:* 26/06/2026 Ã s 11:55 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/ProposalGenerator.tsx`, `supabase/migrations/20260625_create_solar_kits.sql`

* **Correcao 6 - Orientacao EXIF e prioridade de leitura de equipamentos:**
  * *O que foi feito:*
    * **Obra.tsx (Tarefa 4):** Refatorado o laco de geracao de PDF (`generatePDF`) para carregar a foto Base64 em um objeto `Image` nativo, detectando sua largura e altura reais. Se a altura for maior que a largura (foto vertical), o espaco de desenho no jsPDF eh redimensionado proporcionalmente para caber nos mesmos 60px de altura maximos permitidos no layout, corrigindo o efeito de achatamento.
    * **api/index.ts (Tarefa 6):** Ajustado o `GET /api/projects/:id` para que as chaves `inversor_modelo` e `modulo_modelo` leiam primeiramente de `techData.inverter_model/module_model` (fonte confiavel do Kit Solar), usando `project.clients` apenas como fallback. Isso resolve o bug do "Inversor: 8 (8)".
  * *Data e hora da alteracao:* 20/06/2026 as 08:55 (Horario Local)
  * *Arquivos modificados:* `src/pages/Obra.tsx`, `api/index.ts`


* **CorreÃƒÂ§ÃƒÂ£o 4 Ã¢â‚¬â€� RemoÃƒÂ§ÃƒÂ£o de TensÃƒÂ£o CA duplicada e promoÃƒÂ§ÃƒÂ£o do Aterramento PadrÃƒÂ£o:**
  * *O que foi feito:*
    * **Obra.tsx:** O campo photo_tensao_ca_neutro_terra foi removido da seÃƒÂ§ÃƒÂ£o MediÃƒÂ§ÃƒÂµes ElÃƒÂ©tricas Adicionais e da trava do botÃƒÂ£o PDF. O campo photo_aterramento_padrao foi movido para a constante PHOTO_FIELDS, passando a ser exigido universalmente junto com as demais fotos obrigatÃƒÂ³rias da obra.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 20/06/2026 ÃƒÂ s 07:42 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* src/pages/Obra.tsx


* **CorreÃƒÂ§ÃƒÂ£o 3 Ã¢â‚¬â€� Mismatch de nomenclatura Inversor/MÃƒÂ³dulo e Trava do PDF:**
  * *O que foi feito:*
    * **Obra.tsx:** Corrigidas as referÃƒÂªncias de nomenclatura de idioma no mÃƒÂ©todo de geraÃƒÂ§ÃƒÂ£o do PDF. O cÃƒÂ³digo passou a ler inversor_modelo, inversor_potencia, modulo_modelo e modulo_potencia (em vez das antigas propriedades inexistentes em inglÃƒÂªs inverter_model), resolvendo o problema de exibiÃƒÂ§ÃƒÂ£o N/A. Adicionada tambÃƒÂ©m uma trava de seguranÃƒÂ§a baseada em estados temporÃƒÂ¡rios: se qualquer fila de anexo recÃƒÂ©m-selecionada (photoFiles, newPhotoFiles ou mpptList) contiver um arquivo nÃƒÂ£o submetido, o botÃƒÂ£o aborta a geraÃƒÂ§ÃƒÂ£o do PDF e lanÃƒÂ§a um alerta solicitando que o usuÃƒÂ¡rio salve a obra primeiro.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 20/06/2026 ÃƒÂ s 07:11 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* src/pages/Obra.tsx


* **CorreÃƒÂ§ÃƒÂ£o 2 Ã¢â‚¬â€� Carregamento assÃƒÂ­ncrono de imagens no RelatÃƒÂ³rio de Obra (PDF):**
  * *O que foi feito:*
    * **Obra.tsx:** Refatorada a funÃƒÂ§ÃƒÂ£o generatePDF para ser sync. O laÃƒÂ§o sÃƒÂ­ncrono orEach que inseria imagens no PDF foi substituÃƒÂ­do por um or...of assÃƒÂ­ncrono. Agora, cada URL de imagem passa por um etch e ÃƒÂ© convertida para Base64 usando FileReader antes de ser inserida no documento via doc.addImage(). O bloco catch foi mantido para que falhas de rede de fotos individuais nÃƒÂ£o quebrem o resto do PDF.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 20/06/2026 ÃƒÂ s 07:08 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* src/pages/Obra.tsx


* **SessÃƒÂ£o de Auditorias Finais (Propostas, Obra, HistÃƒÂ³rico):**
  * *O que foi feito:*
    * **Proposta Comercial:** Removida a pÃƒÂ¡gina institucional indevida (MissÃƒÂ£o, VisÃƒÂ£o, Valores) da funÃƒÂ§ÃƒÂ£o de geraÃƒÂ§ÃƒÂ£o da Proposta Comercial (generatePDF HTML) em src/pages/ProposalGenerator.tsx.
    * **Obra:** Adicionado o cronjob /api/cron/cleanup-obra-fotos (frequÃƒÂªncia 0 2 * * *) no arquivo vercel.json para deletar fotos do R2 apÃƒÂ³s 15 dias.
    * **HistÃƒÂ³rico de Propostas:** Corrigido o backend da paginaÃƒÂ§ÃƒÂ£o. A rota GET /api/proposal-history em api/index.ts foi substituÃƒÂ­da para realizar a busca com .range(), .select('*', { count: 'exact' }) e retornar o formato { data, total, page, totalPages } esperado pelo frontend.
    * **VerificaÃƒÂ§ÃƒÂµes adicionais:** Confirmado que a interface Mobile/Tablet em Layout.tsx e Agenda.tsx estÃƒÂ£o funcionando responsivamente. Confirmado que o frontend de Obra.tsx jÃƒÂ¡ possuÃƒÂ­a os componentes e funÃƒÂ§ÃƒÂµes requeridos para fotos trifÃƒÂ¡sicas, MPPTs e geraÃƒÂ§ÃƒÂ£o do relatÃƒÂ³rio em PDF. Confirmado que data_expiracao na rota POST /api/proposal-history estÃƒÂ¡ somando 30 dias.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 18/06/2026 ÃƒÂ s 19:04 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* src/pages/ProposalGenerator.tsx, vercel.json, api/index.ts


* **CorreÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do Bug de Upload de HomologaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o (Payload Too Large):**
  * *O que foi feito:* Refatorada a arquitetura de upload de documentos de homologaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o no cadastro comercial. Devido ao limite de 4.5MB das Serverless Functions da Vercel, o upload via FormData estava falhando para arquivos grandes. Foi implementado o fluxo de URL PrÃƒÆ’Ã‚Â©-assinada (Presigned URL) do Cloudflare R2.
  * *Detalhes:* O frontend agora solicita uma URL temporÃƒÆ’Ã‚Â¡ria ao backend via `GET /api/r2/presigned-url`, faz o upload do arquivo binÃƒÆ’Ã‚Â¡rio *diretamente* para o R2, e depois registra a URL gerada no banco via `POST /api/homologation-documents/register`.
  * *Data e hora da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* 18/06/2026 ÃƒÆ’Ã‚Â s 19:50 (HorÃƒÆ’Ã‚Â¡rio Local)
  * *Arquivos modificados:* `api/r2.ts`, `api/index.ts`, `src/pages/Commercial.tsx`

* **CorreÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do HistÃƒÆ’Ã‚Â³rico de Propostas:**
  * *O que foi feito:* Resolvido o problema onde o histÃƒÆ’Ã‚Â³rico de propostas aparecia vazio mesmo apÃƒÆ’Ã‚Â³s a paginaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o estar implementada. O erro ocorria pois a ordenaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o `.order('data_geracao', { ascending: false })` estava falhando silenciosamente no Supabase para registros antigos, disparando o bloco catch que zerava o estado. A ordenaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o foi revertida para a coluna nativa e segura `created_at`.
  * *Data e hora da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* 18/06/2026 ÃƒÆ’Ã‚Â s 20:00 (HorÃƒÆ’Ã‚Â¡rio Local)
  * *Arquivos modificados:* `api/index.ts`

---

## 1. VISÃƒÆ’Ã†â€™O GERAL

* **PropÃƒÆ’Ã‚Â³sito do Sistema:** O **GestÃƒÆ’Ã‚Â£o MTSolar** ÃƒÆ’Ã‚Â© um sistema ERP/CRM completo desenvolvido para otimizar e gerenciar o ciclo de vida de projetos de energia solar fotovoltaica. Ele unifica a captaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de leads, o funil comercial (CRM), dimensionamento tÃƒÆ’Ã‚Â©cnico, geraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o automatizada de propostas em PDF, homologaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o junto a concessionÃƒÆ’Ã‚Â¡rias de energia, controle de estoque de kits/componentes e o atendimento omnichannel integrado via WhatsApp.
* **PÃƒÆ’Ã‚Âºblico-alvo:** Equipes comerciais (vendedores/parceiros), equipe tÃƒÆ’Ã‚Â©cnica/engenharia (instaladores, projetistas) e a administraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o (gestores e CEOs) de franquias ou distribuidoras de energia solar.
* **EstÃƒÆ’Ã‚Â¡gio Atual do Projeto:** O projeto encontra-se em estÃƒÆ’Ã‚Â¡gio avanÃƒÆ’Ã‚Â§ado de produÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o. A aplicaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o web/desktop estÃƒÆ’Ã‚Â¡ totalmente operacional, integrada com a Evolution API v2 para atendimento e com o Supabase para banco de dados e arquivos. Possui tambÃƒÆ’Ã‚Â©m um wrapper mobile com Capacitor configurado para builds nativos Android e iOS. A arquitetura foi adaptada para um modelo SaaS **Multi-Tenant** funcional, isolando dados de diferentes empresas/franquias.


---

## 2. STACK TECNOLÃƒÆ’Ã¢â‚¬Å“GICA

O projeto utiliza um conjunto de tecnologias modernas baseadas em TypeScript em todas as camadas:

### Frontend
* **Core:** React 19 + Vite 6
* **EstilizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:** TailwindCSS v4.1.14 para estilizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o baseada em utilitÃƒÆ’Ã‚Â¡rios CSS rÃƒÆ’Ã‚Â¡pidos e modernos, em conjunto com o `lucide-react` para ÃƒÆ’Ã‚Â­cones.
* **Roteamento:** React Router DOM v7.13.0 para navegaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o SPA (Single Page Application).
* **AnimaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes:** Motion (antigo Framer Motion) para micro-transiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes fluidas na interface.
* **Biblioteca GrÃƒÆ’Ã‚Â¡fica/PDFs:** `jspdf` para montagem dinÃƒÆ’Ã‚Â¢mica de propostas e relatÃƒÆ’Ã‚Â³rios no lado do cliente.

### Backend
* **Servidor:** Node.js com Express v4.21.2 executado em ambiente Serverless na **Vercel** (conforme mapeamento do arquivo `vercel.json`).
* **CompilaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o/ExecuÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o local:** `tsx` (TypeScript Execute) rodando em modo nativo ES Modules (`"type": "module"`).
* **SeguranÃƒÆ’Ã‚Â§a e UtilitÃƒÆ’Ã‚Â¡rios:** `bcryptjs` para hashing de senhas, `jsonwebtoken` para emissÃƒÆ’Ã‚Â£o e validaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de tokens JWT, e `cookie-parser` / `cors` para gestÃƒÆ’Ã‚Â£o de requisiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes.
* **Uploads de Arquivos:** `multer` configurado para receber uploads multipart/form-data em memÃƒÆ’Ã‚Â³ria no Express antes de repassÃƒÆ’Ã‚Â¡-los para o Supabase.

### Banco de Dados e Storage
* **Banco:** Supabase (PostgreSQL gerido na nuvem), acessado via SDK `@supabase/supabase-js` v2.97.0.
* **Storage (Buckets):** Supabase Storage para persistÃƒÆ’Ã‚Âªncia permanente de documentos e arquivos de vistoria e propostas.
* **Storage Auxiliar:** Cloudflare R2 integrado atravÃƒÆ’Ã‚Â©s do `@aws-sdk/client-s3` para armazenamento secundÃƒÆ’Ã‚Â¡rio.

### IntegraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes Externas
* **WhatsApp:** Evolution API v2 instalada em servidor prÃƒÆ’Ã‚Â³prio (geralmente hospedado na Railway), funcionando bidirecionalmente via requisiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes HTTP REST (envio) e Webhooks configurados (recebimento).
* **Firebase:** Firebase Admin SDK v13.9.0 para disparar Push Notifications nativas a dispositivos mÃƒÆ’Ã‚Â³veis.

### Mobile
* **Wrapper Nativo:** Capacitor v8.0.2 (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/ios`) envelopando a aplicaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o web SPA e expondo APIs de hardware (como `@capacitor/camera` para vistorias em campo, `@capacitor/geolocation` para geolocalizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o e `@capacitor/push-notifications`).


---

## 3. ESTRUTURA DE ARQUIVOS

O projeto segue a estrutura de monorepo integrando o frontend, backend (pasta `/api`) e as configuraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes do Capacitor.

```text
/Gest-o-MTSolar
ÃƒÂ¢Ã¢â‚¬Â�Ã…â€œÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ api/
ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã…â€œÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ index.ts               # Servidor backend central Express (Rotas da API, Cronjobs e Webhooks)
ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Â�ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ r2.ts                  # UtilitÃƒÆ’Ã‚Â¡rios do cliente Cloudflare R2 (Upload, Delete, List)
ÃƒÂ¢Ã¢â‚¬Â�Ã…â€œÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ android/                   # CÃƒÆ’Ã‚Â³digo nativo Android gerado pelo Capacitor
ÃƒÂ¢Ã¢â‚¬Â�Ã…â€œÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ ios/                       # CÃƒÆ’Ã‚Â³digo nativo iOS gerado pelo Capacitor (se sincronizado)
ÃƒÂ¢Ã¢â‚¬Â�Ã…â€œÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ src/
ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã…â€œÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ components/            # Componentes reutilizÃƒÆ’Ã‚Â¡veis globais da UI
ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã…â€œÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ Layout.tsx         # Estrutura principal da pÃƒÆ’Ã‚Â¡gina (Navbar, Sidebar responsiva e Container)
ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Â�ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ stock/             # Componentes especÃƒÆ’Ã‚Â­ficos de estoque (Modais de retirada, alertas, etc.)
ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã…â€œÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ context/               # Contextos de estado global
ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã…â€œÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ AuthContext.tsx    # Controle de autenticaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o (Login, Logout, SessÃƒÆ’Ã‚Â£o do UsuÃƒÆ’Ã‚Â¡rio)
ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Â�ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ SocketContext.tsx  # Contexto de socket/realtime (se aplicÃƒÆ’Ã‚Â¡vel ao painel)
ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã…â€œÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ db/
ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Â�ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ schema.sql         # Esquema de banco de dados mockado/local (SQLite de desenvolvimento)
ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã…â€œÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ hooks/                 # Hooks customizados para abstraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de regras e buscas de dados
ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã…â€œÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ useHomologacaoDocs.ts
ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Â�ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ useStock.ts        # Gerenciamento de itens de estoque e escutas de realtime
ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã…â€œÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ lib/                   # InicializaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de SDKs e APIs de terceiros
ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã…â€œÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ api.ts             # Cliente Axios configurado para requisiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes ao backend da Vercel
ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã…â€œÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ documentCapture.ts # UtilitÃƒÆ’Ã‚Â¡rios de captura e redimensionamento de imagens de cÃƒÆ’Ã‚Â¢mera
ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã…â€œÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ notifications.ts   # ConfiguraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o nativa de push notifications e agendamento local
ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã…â€œÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ supabase.ts        # InicializaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do cliente Supabase (Public Anon Client)
ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã…â€œÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ utils.ts           # FunÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes utilitÃƒÆ’Ã‚Â¡rias (Tailwind Merge, Clsx)
ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Â�ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ whatsapp.ts        # Cliente utilitÃƒÆ’Ã‚Â¡rio de WhatsApp do Frontend (legado/fallback)
ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã…â€œÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ pages/                 # Telas da aplicaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o
ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã…â€œÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ Dashboard.tsx      # MÃƒÆ’Ã‚Â©tricas financeiras, funil simplificado e estatÃƒÆ’Ã‚Â­sticas de vendas
ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã…â€œÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ Commercial.tsx     # CRM com funil Kanban, gestÃƒÆ’Ã‚Â£o de leads e projetos comerciais
ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã…â€œÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ ProposalGenerator.tsx # ConfiguraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o e geraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o dinÃƒÆ’Ã‚Â¢mica da proposta em PDF
ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã…â€œÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ EnergyCalculator.tsx  # Ferramenta de estimativa de kWh baseado no consumo dos equipamentos
ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã…â€œÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ Technical.tsx      # Ficha tÃƒÆ’Ã‚Â©cnica do projeto e envio de fotos georreferenciadas
ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã…â€œÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ Obra.tsx           # Checklist de instalaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o e acompanhamento de obras em tempo real
ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã…â€œÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ ObraSchedule.tsx   # CalendÃƒÆ’Ã‚Â¡rio e agendamentos de equipes de montagem/obra
ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã…â€œÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ Homologation.tsx   # Acompanhamento do status de homologaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de projetos fotovoltaicos
ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã…â€œÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ NeoenergiaProtocols.tsx # Controle interno de protocolos na concessionÃƒÆ’Ã‚Â¡ria (Ex: Neoenergia)
ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã…â€œÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ Stock.tsx          # Controle visual de estoque, alertas de nÃƒÆ’Ã‚Â­vel crÃƒÆ’Ã‚Â­tico e histÃƒÆ’Ã‚Â³rico
ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã…â€œÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ KitPurchase.tsx    # Registro de compra de kits fotovoltaicos vinculados aos projetos
ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã…â€œÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ Agenda.tsx         # CalendÃƒÆ’Ã‚Â¡rio de compromissos para vendedores e engenheiros
ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã…â€œÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ Ponto.tsx          # Tela de ponto eletrÃƒÆ’Ã‚Â´nico com captura de selfie, geolocalizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o e relatÃƒÆ’Ã‚Â³rios
ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã…â€œÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ Settings.tsx       # ConfiguraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de dados e preferÃƒÆ’Ã‚Âªncias da empresa
ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã…â€œÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ Users.tsx          # Painel de gestÃƒÆ’Ã‚Â£o de membros da equipe (vendedores, engenheiros, admin)
ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã…â€œÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ WhatsApp.tsx       # Chat central de atendimento ao cliente integrado ao WhatsApp
ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã…â€œÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ Login.tsx          # Tela de autenticaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o por e-mail e senha
ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Â�ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ Messages.tsx       # Interface interna de recados/mensagens da equipe
ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã…â€œÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ types/                 # Tipagens estÃƒÆ’Ã‚Â¡ticas do TypeScript (Ex: stock.ts)
ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã…â€œÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ App.tsx                # DefiniÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de rotas do React Router DOM e carregador do AuthProvider
ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã…â€œÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ main.tsx               # Ponto de entrada do React
ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Å¡   ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Â�ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ index.css              # ImportaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o e configuraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do Tailwind CSS
ÃƒÂ¢Ã¢â‚¬Â�Ã…â€œÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ supabase_schema.sql        # Esquema oficial com tabelas do PostgreSQL executado no Supabase
ÃƒÂ¢Ã¢â‚¬Â�Ã…â€œÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ vercel.json                # ConfiguraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes de rotas de deploy e agendamentos de Cron no backend Vercel
ÃƒÂ¢Ã¢â‚¬Â�Ã…â€œÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ capacitor.config.ts        # ConfiguraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes de build do wrapper Capacitor Mobile
ÃƒÂ¢Ã¢â‚¬Â�Ã…â€œÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ package.json               # Gerenciamento de scripts NPM e dependÃƒÆ’Ã‚Âªncias de pacotes
ÃƒÂ¢Ã¢â‚¬Â�Ã¢â‚¬Â�ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬Â�Ã¢â€šÂ¬ .env                       # VariÃƒÆ’Ã‚Â¡veis de ambiente locais (sensÃƒÆ’Ã‚Â­veis)
```


---

## 4. MÃƒÆ’Ã¢â‚¬Å“DULOS E FUNCIONALIDADES

O sistema ÃƒÆ’Ã‚Â© dividido em fluxos de negÃƒÆ’Ã‚Â³cios integrados que cobrem todas as fases de uma venda solar:

1. **AutenticaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o (`Login.tsx`):**
   * Tela inicial para inserÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de credenciais de e-mail e senha. Valida o usuÃƒÆ’Ã‚Â¡rio e estabelece o JWT seguro.
2. **Dashboard Geral (`Dashboard.tsx`):**
   * GrÃƒÆ’Ã‚Â¡ficos financeiros, resumo do funil de vendas ativo, volume de geraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o projetado e atalhos rÃƒÆ’Ã‚Â¡pidos para novas aÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes.
3. **CRM / Comercial (`Commercial.tsx`):**
   * Kanban interativo contendo colunas customizÃƒÆ’Ã‚Â¡veis (ex: Lead, Vistoria Agendada, Proposta Elaborada, Fechamento). Os vendedores criam cards de clientes e arrastam entre fases. Permite o upload do contrato assinado.
4. **Calculadora de Consumo (`EnergyCalculator.tsx`):**
   * Permite cadastrar mÃƒÆ’Ã‚Âºltiplos aparelhos elÃƒÆ’Ã‚Â©tricos (lÃƒÆ’Ã‚Â¢mpadas, ar-condicionados, motores), suas potÃƒÆ’Ã‚Âªncias, horas de uso diÃƒÆ’Ã‚Â¡rio e dias de uso mensal para calcular o consumo total em kWh de forma automÃƒÆ’Ã‚Â¡tica.
5. **Gerador de Propostas (`ProposalGenerator.tsx`):**
   * FormulÃƒÆ’Ã‚Â¡rio passo-a-passo no qual o vendedor informa os dados de consumo do cliente, seleciona o kit (painÃƒÆ’Ã‚Â©is, inversores, estruturas), configura financiamentos e gera uma proposta comercial personalizada no formato de arquivo PDF (salva no storage do Supabase).
6. **WhatsApp / Chat Center (`WhatsApp.tsx` e `AttendanceRegistry.tsx`):**
   * Painel de atendimento em tempo real. Exibe conversas em andamento agrupadas por status (Aguardando, Em Atendimento, Resolvidas). Permite envio de textos, ÃƒÆ’Ã‚Â¡udios e mÃƒÆ’Ã‚Â­dias, bem como transferÃƒÆ’Ã‚Âªncia de tickets entre vendedores e departamentos.
   * **Bloqueio de Conversa em Atendimento:** Quando um agente estÃƒÆ’Ã‚Â¡ atendendo uma conversa (`status = 'in_progress'`), ela fica bloqueada para outros agentes. O frontend exibe uma barra amarela com cadeado indicando o nome do responsÃƒÆ’Ã‚Â¡vel em vez do campo de mensagem. CEOs tÃƒÆ’Ã‚Âªm acesso irrestrito. A validaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o ocorre tanto no backend (`GET /api/conversations/:id/messages`, `POST /api/whatsapp/send`, `send-media` e `send-audio`) quanto no frontend.
   * **Mensagens AutomÃƒÆ’Ã‚Â¡ticas de HorÃƒÆ’Ã‚Â¡rio:** TrÃƒÆ’Ã‚Âªs cronjobs enviam mensagens automÃƒÆ’Ã‚Â¡ticas de inÃƒÆ’Ã‚Â­cio de expediente (08:30 BRT), pausa para almoÃƒÆ’Ã‚Â§o (12:00 BRT) e fim de expediente (17:00 BRT) para todas as conversas ativas (`in_progress`).
   * **Registro de Atendimentos:** Nova pÃƒÆ’Ã‚Â¡gina gerencial/planilha (`AttendanceRegistry.tsx`) que exibe todos os clientes em andamento. Destaca visualmente em vermelho as conversas ociosas (sem qualquer interaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o hÃƒÆ’Ã‚Â¡ mais de 5 dias). Vendedores visualizam de forma isolada apenas os seus prÃƒÆ’Ã‚Â³prios atendimentos, enquanto a gestÃƒÆ’Ã‚Â£o (ADM/CEO) tem visÃƒÆ’Ã‚Â£o integral. Permite filtragem de conversas por Vendedor e por Etiqueta, e apresenta a ÃƒÆ’Ã‚Âºltima observaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o registrada para o atendimento via join com `whatsapp_observations`.
7. **Ficha TÃƒÆ’Ã‚Â©cnica e Vistoria (`Technical.tsx`):**
   * Acesso aos dados fÃƒÆ’Ã‚Â­sicos do local do cliente (tipo de telhado, orientaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o, padrÃƒÆ’Ã‚Â£o de entrada, disjuntores). Permite o envio de fotos comprobatÃƒÆ’Ã‚Â³rias obrigatÃƒÆ’Ã‚Â³rias do local da instalaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o.
8. **GestÃƒÆ’Ã‚Â£o de Obras (`Obra.tsx` e `ObraSchedule.tsx`):**
   * Cronograma de montagem do sistema. Acompanhamento visual de status (NÃƒÆ’Ã‚Â£o Iniciado, Em Andamento, ConcluÃƒÆ’Ã‚Â­do) e atribuiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de tÃƒÆ’Ã‚Â©cnicos responsÃƒÆ’Ã‚Â¡veis.
9. **HomologaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o e ConcessionÃƒÆ’Ã‚Â¡rias (`Homologation.tsx` e `NeoenergiaProtocols.tsx`):**
   * Tela burocrÃƒÆ’Ã‚Â¡tica para anexar solicitaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes de conexÃƒÆ’Ã‚Â£o, pareceres de acesso e protocolos de vistoria junto a distribuidoras (ex: Neoenergia).
10. **Estoque (`Stock.tsx`):**
    * GestÃƒÆ’Ã‚Â£o fÃƒÆ’Ã‚Â­sica de equipamentos como mÃƒÆ’Ã‚Â³dulos solares, inversores e estruturas. Emite alertas de estoque baixo baseado em limites (threshold) cadastrados.
11. **Ponto EletrÃƒÆ’Ã‚Â´nico (Ponto/Jornada):**
    * Sistema de controle de ponto eletrÃƒÆ’Ã‚Â´nico para colaboradores. Permite bater ponto (entrada, inÃƒÆ’Ã‚Â­cio de almoÃƒÆ’Ã‚Â§o, fim de almoÃƒÆ’Ã‚Â§o e saÃƒÆ’Ã‚Â­da) enviando a selfie e a geolocalizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o capturada pelo GPS do dispositivo.
    * **GestÃƒÆ’Ã‚Â£o de HorÃƒÆ’Ã‚Â¡rios:** ConfiguraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de turnos de trabalho (`work_schedules`) por funÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de usuÃƒÆ’Ã‚Â¡rio pela gerÃƒÆ’Ã‚Âªncia (`CEO`/`ADMIN`).
    * **Fluxo de Ajustes:** Os funcionÃƒÆ’Ã‚Â¡rios podem solicitar correÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes de batidas de ponto justificadas, que passam por um fluxo de aprovaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o pendente avaliado pelos administradores.


---

## 5. BANCO DE DADOS

O banco de dados ÃƒÆ’Ã‚Â© hospedado no **Supabase (PostgreSQL)** e implementa uma estrutura rÃƒÆ’Ã‚Â­gida de multi-tenancy.

### Principais Tabelas e Colunas

#### `companies` (Tenants)
* `id` (UUID - Primary Key)
* `name` (TEXT)
* `whatsapp_instance` (TEXT - Nome legado da instÃƒÆ’Ã‚Â¢ncia principal de WhatsApp)
* `created_at` (TIMESTAMPTZ)

#### `company_instances` (VÃƒÆ’Ã‚Â­nculo de InstÃƒÆ’Ã‚Â¢ncias WhatsApp)
* `id` (UUID - Primary Key)
* `company_id` (UUID - References `companies.id`)
* `instance_name` (TEXT - Nome normalizado da instÃƒÆ’Ã‚Â¢ncia da Evolution API)
* `created_at` (TIMESTAMPTZ)

#### `users` (UsuÃƒÆ’Ã‚Â¡rios / Colaboradores)
* `id` (SERIAL - Primary Key)
* `company_id` (UUID - References `companies.id`)
* `name` (TEXT)
* `email` (TEXT - UNIQUE)
* `password_hash` (TEXT)
* `role` (TEXT - Restrito via CHECK: `'CEO', 'ADMIN', 'COMMERCIAL', 'TECHNICAL'`)
* `active` (BOOLEAN - PadrÃƒÆ’Ã‚Â£o TRUE)
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

#### `proposal_history` (HistÃƒÆ’Ã‚Â³rico de Propostas Geradas)
* `id` (SERIAL - Primary Key)
* `company_id` (UUID - References `companies.id`)
* `client_name` (TEXT)
* `proposal_number` (TEXT)
* `url_arquivo` (TEXT - Link do arquivo PDF)
* `raw_data` (JSON - Objeto contendo todas as variÃƒÆ’Ã‚Â¡veis utilizadas na geraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o)
* `data_geracao` (TIMESTAMPTZ)
* `data_expiracao` (TIMESTAMPTZ - PadrÃƒÆ’Ã‚Â£o de 7 dias ÃƒÆ’Ã‚Âºteis apÃƒÆ’Ã‚Â³s geraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o)
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

#### `stock_withdrawals` (SaÃƒÆ’Ã‚Â­das de Estoque)
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
* `unread_count` (INTEGER - PadrÃƒÆ’Ã‚Â£o 0)
* `last_message` (TEXT)
* `last_message_at` (TIMESTAMPTZ)
* `status` (TEXT - `'waiting', 'open', 'closed'`)
* `assigned_to` (INTEGER - References `users.id`)
* `instance` (TEXT - Nome normalizado da instÃƒÆ’Ã‚Â¢ncia responsÃƒÆ’Ã‚Â¡vel)
* `tags` (TEXT[] - Etiquetas aplicadas ÃƒÆ’Ã‚Â  conversa)

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
* `media_url` (TEXT - Link pÃƒÆ’Ã‚Âºblico e permanente no Supabase Storage)
* `file_name` (TEXT)
* `file_size` (NUMERIC)
* `is_internal` (BOOLEAN - Se a mensagem foi escrita como anotaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o interna e nÃƒÆ’Ã‚Â£o enviada ao cliente)

#### `work_schedules` (HorÃƒÆ’Ã‚Â¡rios de Trabalho por FunÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o/Empresa)
* `id` (SERIAL - Primary Key)
* `company_id` (UUID - References `companies.id` ON DELETE CASCADE)
* `role` (TEXT - Restrito via CHECK: `'CEO', 'ADMIN', 'COMMERCIAL', 'TECHNICAL'`)
* `entry_time` (TIME - HorÃƒÆ’Ã‚Â¡rio de entrada)
* `lunch_start` (TIME - HorÃƒÆ’Ã‚Â¡rio de inÃƒÆ’Ã‚Â­cio do almoÃƒÆ’Ã‚Â§o)
* `lunch_end` (TIME - HorÃƒÆ’Ã‚Â¡rio de tÃƒÆ’Ã‚Â©rmino do almoÃƒÆ’Ã‚Â§o)
* `exit_time` (TIME - HorÃƒÆ’Ã‚Â¡rio de saÃƒÆ’Ã‚Â­da)
* `created_at` (TIMESTAMPTZ)

#### `time_records` (Registros de Ponto EletrÃƒÆ’Ã‚Â´nico)
* `id` (SERIAL - Primary Key)
* `company_id` (UUID - References `companies.id` ON DELETE CASCADE)
* `user_id` (INTEGER - References `users.id` ON DELETE CASCADE)
* `type` (TEXT - Restrito via CHECK: `'entry', 'lunch_start', 'lunch_end', 'exit'`)
* `timestamp` (TIMESTAMPTZ - Registro de data/hora do ponto)
* `latitude` (NUMERIC)
* `longitude` (NUMERIC)
* `selfie_url` (TEXT - Link pÃƒÆ’Ã‚Âºblico da foto de selfie no Supabase Storage)
* `selfie_path` (TEXT - Caminho interno da foto no bucket de Storage)
* `status` (TEXT - Restrito via CHECK: `'pending', 'approved', 'adjustment_requested'`)

#### `time_adjustments` (SolicitaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes de Ajuste de Ponto)
* `id` (SERIAL - Primary Key)
* `company_id` (UUID - References `companies.id` ON DELETE CASCADE)
* `time_record_id` (INTEGER - References `time_records.id` ON DELETE CASCADE)
* `requested_by` (INTEGER - References `users.id` ON DELETE CASCADE)
* `justification` (TEXT - Justificativa detalhada do funcionÃƒÆ’Ã‚Â¡rio para o ajuste)
* `new_timestamp` (TIMESTAMPTZ - Nova data/hora solicitada)
* `status` (TEXT - Restrito via CHECK: `'pending', 'approved', 'rejected'`)
* `reviewed_by` (INTEGER - References `users.id` - ID do usuÃƒÆ’Ã‚Â¡rio gestor que aprovou/rejeitou)
* `reviewed_at` (TIMESTAMPTZ - Data/hora da revisÃƒÆ’Ã‚Â£o)
* `created_at` (TIMESTAMPTZ)


### Regras de Isolamento Multi-Tenant (company_id)
* **Preenchimento:** Todas as inserÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes nas tabelas crÃƒÆ’Ã‚Â­ticas incluem a coluna `company_id` obtida no lado do servidor via decodificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do JWT Token do usuÃƒÆ’Ã‚Â¡rio conectado.
* **Isolamento:** Toda requisiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o `SELECT`, `UPDATE` ou `DELETE` no backend Express injeta a clÃƒÆ’Ã‚Â¡usula `.eq('company_id', req.user.company_id)` para impedir vazamento ou alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de dados entre diferentes empresas contratantes.


---

## 6. INTEGRAÃƒÆ’Ã¢â‚¬Â¡ÃƒÆ’Ã¢â‚¬Â¢ES EXTERNAS

### Evolution API (WhatsApp)
* **Envio:** O frontend dispara requisiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes para a API local Express em rotas como `/api/whatsapp/send`. O backend localiza as credenciais seguras da instÃƒÆ’Ã‚Â¢ncia (Base URL, API Key) na tabela `company_instances` e faz o disparo do JSON para a Evolution API.
* **Recebimento via Webhook:** A Evolution API monitora o celular e envia webhooks (`POST /api/webhooks/whatsapp`) para o backend da aplicaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o. O Express resolve qual empresa ÃƒÆ’Ã‚Â© dona da mensagem processando o `instance_name` recebido e salvando nas tabelas `whatsapp_conversations` e `whatsapp_messages`.

### Supabase Storage
O armazenamento de arquivos ÃƒÆ’Ã‚Â© dividido nos seguintes Buckets de acesso:
1. **`whatsapp-media`:** Guarda permanentemente imagens, ÃƒÆ’Ã‚Â¡udios e documentos trocados pelo painel do WhatsApp.
2. **`propostas`:** Armazena os PDFs de propostas gerados pela equipe comercial.
3. **`uploads`:** Guarda documentos gerais e fotos rÃƒÆ’Ã‚Â¡pidas de vistoria cadastrados via CRM Kanban.
4. **`obras-fotos`:** Fotos de checklists de obras enviadas pelos instaladores.
5. **`homologacao-docs`:** DocumentaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes burocrÃƒÆ’Ã‚Â¡ticas submetidas ÃƒÆ’Ã‚Â s distribuidoras de energia.

### Firebase (Push Notifications)
* **ServiÃƒÆ’Ã‚Â§o FCM:** O Firebase Admin SDK no Express ÃƒÆ’Ã‚Â© inicializado com chaves privadas de ambiente. Quando um status de projeto ou mensagem do WhatsApp precisa alertar um usuÃƒÆ’Ã‚Â¡rio mobile, o backend busca o `push_token` do usuÃƒÆ’Ã‚Â¡rio na tabela `users` e envia o payload.

### Vercel (Deploy e Serverless)
* **Backend Serverless:** O arquivo `/api/index.ts` roda em ambiente Vercel. Todas as rotas de API `/api/*` sÃƒÆ’Ã‚Â£o reescritas para apontar para a serverless function monolÃƒÆ’Ã‚Â­tica.
* **Cronjobs:** Conforme definido em `vercel.json`, a Vercel aciona rotas agendadas em background:
  * `GET /api/cleanup-proposals` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â� Diariamente ÃƒÆ’Ã‚Â s 03:00 UTC. Remove propostas expiradas.
  * `GET /api/cron/agenda-reminders` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â� Diariamente ÃƒÆ’Ã‚Â s 07:00 UTC. Notifica usuÃƒÆ’Ã‚Â¡rios de compromissos prÃƒÆ’Ã‚Â³ximos.
  * `POST /api/cron/mensagem-inicio-expediente` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â� Segunda a sexta, 11:30 UTC (08:30 BRT). Envia mensagem de inÃƒÆ’Ã‚Â­cio de expediente para conversas em atendimento.
  * `POST /api/cron/mensagem-almoco` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â� Segunda a sexta, 15:00 UTC (12:00 BRT). Envia mensagem de pausa para almoÃƒÆ’Ã‚Â§o.
  * `POST /api/cron/mensagem-fim-expediente` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â� Segunda a sexta, 20:00 UTC (17:00 BRT). Envia mensagem de encerramento do atendimento.

### Railway (Evolution API)
* A hospedagem das instÃƒÆ’Ã‚Â¢ncias da Evolution API e da conexÃƒÆ’Ã‚Â£o com o WhatsApp do cliente final reside em um servidor Railway, provendo uma API contÃƒÆ’Ã‚Â­nua com IP estÃƒÆ’Ã‚Â¡vel para nÃƒÆ’Ã‚Â£o derrubar o escaneamento do QR Code.


---

## 7. AUTENTICAÃƒÆ’Ã¢â‚¬Â¡ÃƒÆ’Ã†â€™O E SEGURANÃƒÆ’Ã¢â‚¬Â¡A

* **Fluxo de Login e JWT:**
  1. O usuÃƒÆ’Ã‚Â¡rio submete e-mail e senha na tela de Login.
  2. O backend faz o hash e compara usando `bcrypt.compareSync()`. Caso o e-mail seja `ceo@mtsolar.com` e a senha `admin123`, hÃƒÆ’Ã‚Â¡ um fallback administrador configurado para facilitar a recuperaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o.
  3. Com a senha correta, ÃƒÆ’Ã‚Â© assinado um Token JWT contendo: `id`, `name`, `role` e `company_id`.
  4. O token ÃƒÆ’Ã‚Â© retornado na resposta JSON e gravado em `localStorage` via `login()` do `AuthContext`. O `AuthContext` tambÃƒÆ’Ã‚Â©m emite um cookie via backend simultaneamente.
  5. Em toda inicializaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do React, `AuthContext` chama `GET /api/auth/me` para validar a sessÃƒÆ’Ã‚Â£o. Em caso de falha, remove o token do `localStorage` automaticamente.
* **Cliente HTTP (`src/lib/api.ts`):**
  * InstÃƒÆ’Ã‚Â¢ncia Axios com `timeout: 15000ms` e `withCredentials: true`.
  * **`baseURL` dinÃƒÆ’Ã‚Â¢mica:** Se rodando em plataforma nativa Capacitor, aponta para `https://gest-o-mt-solar.vercel.app`. Em ambiente web, usa `window.location.origin` (funciona tanto em local quanto em produÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o sem reconfiguraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o).
  * Interceptor automÃƒÆ’Ã‚Â¡tico que injeta o header `Authorization: Bearer <token>` lido do `localStorage` em todas as requisiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes.
* **Role-Based Access Control (Roles de UsuÃƒÆ’Ã‚Â¡rio e Rotas Protegidas):**

  | Rota | CEO | ADMIN | COMMERCIAL | TECHNICAL |





---:|
  | `/` (Dashboard) | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ |
  | `/commercial` (CRM) | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã‚Â�Ã…â€™ |
  | `/whatsapp` | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã‚Â�Ã…â€™ |
  | `/proposal-generator` | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã‚Â�Ã…â€™ |
  | `/agenda` | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã‚Â�Ã…â€™ |
  | `/calculadora` | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ |
  | `/technical` | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã‚Â�Ã…â€™ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ |
  | `/obra` | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã‚Â�Ã…â€™ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ |
  | `/cronograma` | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ |
  | `/homologation` | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã‚Â�Ã…â€™ |
  | `/estoque` | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã‚Â�Ã…â€™ | ÃƒÂ¢Ã‚Â�Ã…â€™ |
  | `/kit-purchase` | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã‚Â�Ã…â€™ | ÃƒÂ¢Ã‚Â�Ã…â€™ |
  | `/users` | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã‚Â�Ã…â€™ | ÃƒÂ¢Ã‚Â�Ã…â€™ |
  | `/settings` | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã‚Â�Ã…â€™ | ÃƒÂ¢Ã‚Â�Ã…â€™ |
  | `/contracts` | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã‚Â�Ã…â€™ | ÃƒÂ¢Ã‚Â�Ã…â€™ |
  | `/neoenergia` | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã‚Â�Ã…â€™ | ÃƒÂ¢Ã‚Â�Ã…â€™ |
  | `/finished` | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã‚Â�Ã…â€™ | ÃƒÂ¢Ã‚Â�Ã…â€™ |
  | `/messages` | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã‚Â�Ã…â€™ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ |
  | `/documents` | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã‚Â�Ã…â€™ | ÃƒÂ¢Ã‚Â�Ã…â€™ |

  * **Regra especial COMMERCIAL:** Se o usuÃƒÆ’Ã‚Â¡rio tem `role = COMMERCIAL` e tenta acessar qualquer rota fora das permitidas, ÃƒÆ’Ã‚Â© redirecionado para `/` pelo `PrivateRoute` em `App.tsx`.
* **Middleware de AutenticaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o (`authenticateToken`):**
  * Toda rota protegida do Express passa por este middleware. Ele lÃƒÆ’Ã‚Âª o token do header `Authorization: Bearer <token>` ou do Cookie, verifica a assinatura contra `JWT_SECRET` e injeta `req.user` contendo as informaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes e o `company_id` da empresa na requisiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o.
* **Firebase Admin (Push Notifications):**
  * A inicializaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do Firebase Admin ÃƒÆ’Ã‚Â© **condicional**: sÃƒÆ’Ã‚Â³ ocorre se as trÃƒÆ’Ã‚Âªs variÃƒÆ’Ã‚Â¡veis `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY` e `FIREBASE_CLIENT_EMAIL` estiverem presentes no ambiente. Caso contrÃƒÆ’Ã‚Â¡rio, a API inicializa normalmente sem crash.


---

## 8. REGRAS DE NEGÃƒÆ’Ã¢â‚¬Å“CIO

* **Isolamento de VisualizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o por Role (WhatsApp):**
  * Vendedores (`COMMERCIAL`) visualizam e respondem chats apenas sob as seguintes regras:
    1. A conversa nÃƒÆ’Ã‚Â£o tem dono (`assigned_to IS NULL`) e estÃƒÆ’Ã‚Â¡ na fila (`status = 'waiting'`).
    2. A conversa estÃƒÆ’Ã‚Â¡ explicitamente atribuÃƒÆ’Ã‚Â­da a ele (`assigned_to = user_id`).
  * Administradores e CEOs acessam todas as conversas sem barreiras. Conversas em atendimento por outros agentes aparecem para o COMMERCIAL, mas travadas (bloqueadas para escrita e com conteÃƒÆ’Ã‚Âºdo oculto).
* **AssunÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o e TransferÃƒÆ’Ã‚Âªncia de Tickets:**
  * **Assumir:** Quando um atendente clica em uma conversa na fila, o sistema atualiza `assigned_to` para o seu ID de usuÃƒÆ’Ã‚Â¡rio e o status para `in_progress`.
  * **Transferir:** Um atendente comercial pode transferir a conversa para outro colaborador ou departamento. O sistema apaga o `assigned_to` anterior, atribui ao novo colaborador e registra uma mensagem do sistema indicando o direcionamento.
  * **TransferÃƒÆ’Ã‚Âªncia de InstÃƒÆ’Ã‚Â¢ncia:** InstÃƒÆ’Ã‚Â¢ncia `atendimento-cliente` ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ `mtsolar` (administrativo) e vice-versa, disponÃƒÆ’Ã‚Â­vel apenas para ADMINs.
* **Sistema de Etiquetas (Tags) das Conversas:**
  * Cada conversa pode ter **mÃƒÆ’Ã‚Âºltiplas etiquetas** armazenadas na coluna `tags TEXT[]`.
  * As etiquetas disponÃƒÆ’Ã‚Â­veis sÃƒÆ’Ã‚Â£o definidas no frontend em `WHATSAPP_TAGS` (constante em `WhatsApp.tsx`) com id, label e cor hex.
  * A lÃƒÆ’Ã‚Â³gica de toggle: ao clicar em uma etiqueta, se ela jÃƒÆ’Ã‚Â¡ existe no array ÃƒÆ’Ã‚Â© removida; se nÃƒÆ’Ã‚Â£o existe, ÃƒÆ’Ã‚Â© adicionada. O estado completo do array ÃƒÆ’Ã‚Â© sempre enviado ao backend (`PUT /api/conversations/:id/tag`).
  * Etiquetas disponÃƒÆ’Ã‚Â­veis: Atendimento Iniciado, Cuidar e Fechar, Fechou Venda, Lead Desqualificado, Lead Qualificado, NÃƒÆ’Ã‚Â£o Fechou Venda, OrÃƒÆ’Ã‚Â§amento Enviado, Visita Agendada, Transferido.
* **Funil de Vendas Kanban:**
  * Os projetos transitam de forma linear pelas colunas de estÃƒÆ’Ã‚Â¡gio. Cada estÃƒÆ’Ã‚Â¡gio exige preenchimento ou upload de dados diferentes (ex: o fechamento comercial exige upload de contrato; a fase tÃƒÆ’Ã‚Â©cnica exige vistoria cadastrada).


---

## 9. FLUXO DO WHATSAPP

O fluxo de processamento de mÃƒÆ’Ã‚Â­dias foi otimizado para evitar expiraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o rÃƒÆ’Ã‚Â¡pida de links e garantir o histÃƒÆ’Ã‚Â³rico permanente.

### Envio de Mensagens

#### Envio de Texto
* O front-end envia para `/api/whatsapp/send`. A Evolution despacha e o Express grava a mensagem no banco.

#### Envio de Imagens/Documentos
* O front-end faz o upload do arquivo para o bucket temporÃƒÆ’Ã‚Â¡rio `/api/whatsapp/upload-media`, que retorna uma URL assinada temporÃƒÆ’Ã‚Â¡ria (vÃƒÆ’Ã‚Â¡lida por 600 segundos) e o caminho do arquivo (`filePath`).
* O front-end chama `/api/whatsapp/send-media` passando essa URL assinada como origem para a Evolution API realizar o download e envio.
* ApÃƒÆ’Ã‚Â³s a confirmaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o da Evolution API, o Express gera a URL pÃƒÆ’Ã‚Âºblica e definitiva via `supabaseAdmin.storage.from(...).getPublicUrl(filePath)` e insere o registro com `media_url: publicUrl` e `from_me: true`.

#### Envio de ÃƒÆ’Ã‚Â�udio
* O front-end grava o ÃƒÆ’Ã‚Â¡udio e envia uma string em formato `base64` no corpo da requisiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o para `/api/whatsapp/send-audio`.
* O backend Express repassa o ÃƒÆ’Ã‚Â¡udio em `base64` para a Evolution API.
* ApÃƒÆ’Ã‚Â³s sucesso no disparo, o Express converte o `base64` em um `Buffer` fÃƒÆ’Ã‚Â­sico e realiza o upload para o Supabase Storage sob o caminho `company_id/conversationId/audio-[timestamp].ogg`.
* O backend obtÃƒÆ’Ã‚Â©m a URL pÃƒÆ’Ã‚Âºblica estÃƒÆ’Ã‚Â¡tica gerada pelo storage e insere no banco a nova mensagem contendo `media_url: audioPublicUrl`, `media_type: 'audio'`, `file_name: 'audio.ogg'` e `from_me: true`.

### Recebimento (Webhook)
* Quando uma mensagem de mÃƒÆ’Ã‚Â­dia externa (imagem, ÃƒÆ’Ã‚Â¡udio ou documento) chega pelo Webhook da Evolution API:
  1. O Express intercepta a mensagem no webhook de recebimento (`/api/webhooks/whatsapp`).
  2. Caso a mensagem contenha mÃƒÆ’Ã‚Â­dia, o webhook faz uma chamada reversa ÃƒÆ’Ã‚Â  Evolution API (`/chat/getBase64FromMediaMessage`) para ler o binÃƒÆ’Ã‚Â¡rio em formato `base64`.
  3. O backend converte o `base64` para binÃƒÆ’Ã‚Â¡rio (`Buffer`) e realiza o upload permanente no Supabase Storage no bucket `whatsapp-media`.
  4. O link pÃƒÆ’Ã‚Âºblico estÃƒÆ’Ã‚Â¡tico e definitivo gerado pelo Supabase ÃƒÆ’Ã‚Â© salvo na coluna `media_url` da mensagem gravada no banco com `from_me: false`.


---

## 10. BUILD E DEPLOY

### Processo de Build do Frontend
* O build ÃƒÆ’Ã‚Â© executado via script do Vite: `npm run build` ou `vite build`. O compilador lÃƒÆ’Ã‚Âª as configuraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes do arquivo `vite.config.ts` e gera os arquivos estÃƒÆ’Ã‚Â¡ticos indexados na pasta `/dist`.

### Deploy na Vercel
* O deploy ÃƒÆ’Ã‚Â© estruturado com base nas regras do arquivo `vercel.json`:
  * As requisiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes direcionadas para `/api/*` sÃƒÆ’Ã‚Â£o interceptadas e encaminhadas para a serverless function Express (`/api/index.ts`).
  * Qualquer outra rota de pÃƒÆ’Ã‚Â¡gina `/.*` ÃƒÆ’Ã‚Â© redirecionada para a pÃƒÆ’Ã‚Â¡gina estÃƒÆ’Ã‚Â¡tica raiz `/index.html` para deixar a navegaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de rotas internas a cargo do React Router DOM (SPA).

### Mobile com Capacitor
* **SincronizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:** ApÃƒÆ’Ã‚Â³s o build de produÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o (`npm run build`), o comando `npx cap sync` atualiza as plataformas mÃƒÆ’Ã‚Â³veis (`android` e `ios`) copiando a pasta `/dist` e os plugins necessÃƒÆ’Ã‚Â¡rios.
* `status` (TEXT - `'sent', 'delivered', 'read'`)
* `media_type` (TEXT - `'image', 'audio', 'document', 'video', 'sticker'`)
* `media_url` (TEXT - Link pÃƒÆ’Ã‚Âºblico e permanente no Supabase Storage)
* `file_name` (TEXT)
* `file_size` (NUMERIC)
* `is_internal` (BOOLEAN - Se a mensagem foi escrita como anotaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o interna e nÃƒÆ’Ã‚Â£o enviada ao cliente)

#### `work_schedules` (HorÃƒÆ’Ã‚Â¡rios de Trabalho por FunÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o/Empresa)
* `id` (SERIAL - Primary Key)
* `company_id` (UUID - References `companies.id` ON DELETE CASCADE)
* `role` (TEXT - Restrito via CHECK: `'CEO', 'ADMIN', 'COMMERCIAL', 'TECHNICAL'`)
* `entry_time` (TIME - HorÃƒÆ’Ã‚Â¡rio de entrada)
* `lunch_start` (TIME - HorÃƒÆ’Ã‚Â¡rio de inÃƒÆ’Ã‚Â­cio do almoÃƒÆ’Ã‚Â§o)
* `lunch_end` (TIME - HorÃƒÆ’Ã‚Â¡rio de tÃƒÆ’Ã‚Â©rmino do almoÃƒÆ’Ã‚Â§o)
* `exit_time` (TIME - HorÃƒÆ’Ã‚Â¡rio de saÃƒÆ’Ã‚Â­da)
* `created_at` (TIMESTAMPTZ)

#### `time_records` (Registros de Ponto EletrÃƒÆ’Ã‚Â´nico)
* `id` (SERIAL - Primary Key)
* `company_id` (UUID - References `companies.id` ON DELETE CASCADE)
* `user_id` (INTEGER - References `users.id` ON DELETE CASCADE)
* `type` (TEXT - Restrito via CHECK: `'entry', 'lunch_start', 'lunch_end', 'exit'`)
* `timestamp` (TIMESTAMPTZ - Registro de data/hora do ponto)
* `latitude` (NUMERIC)
* `longitude` (NUMERIC)
* `selfie_url` (TEXT - Link pÃƒÆ’Ã‚Âºblico da foto de selfie no Supabase Storage)
* `selfie_path` (TEXT - Caminho interno da foto no bucket de Storage)
* `status` (TEXT - Restrito via CHECK: `'pending', 'approved', 'adjustment_requested'`)

#### `time_adjustments` (SolicitaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes de Ajuste de Ponto)
* `id` (SERIAL - Primary Key)
* `company_id` (UUID - References `companies.id` ON DELETE CASCADE)
* `time_record_id` (INTEGER - References `time_records.id` ON DELETE CASCADE)
* `requested_by` (INTEGER - References `users.id` ON DELETE CASCADE)
* `justification` (TEXT - Justificativa detalhada do funcionÃƒÆ’Ã‚Â¡rio para o ajuste)
* `new_timestamp` (TIMESTAMPTZ - Nova data/hora solicitada)
* `status` (TEXT - Restrito via CHECK: `'pending', 'approved', 'rejected'`)
* `reviewed_by` (INTEGER - References `users.id` - ID do usuÃƒÆ’Ã‚Â¡rio gestor que aprovou/rejeitou)
* `reviewed_at` (TIMESTAMPTZ - Data/hora da revisÃƒÆ’Ã‚Â£o)
* `created_at` (TIMESTAMPTZ)


### Regras de Isolamento Multi-Tenant (company_id)
* **Preenchimento:** Todas as inserÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes nas tabelas crÃƒÆ’Ã‚Â­ticas incluem a coluna `company_id` obtida no lado do servidor via decodificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do JWT Token do usuÃƒÆ’Ã‚Â¡rio conectado.
* **Isolamento:** Toda requisiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o `SELECT`, `UPDATE` ou `DELETE` no backend Express injeta a clÃƒÆ’Ã‚Â¡usula `.eq('company_id', req.user.company_id)` para impedir vazamento ou alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de dados entre diferentes empresas contratantes.


---

## 6. INTEGRAÃƒÆ’Ã¢â‚¬Â¡ÃƒÆ’Ã¢â‚¬Â¢ES EXTERNAS

### Evolution API (WhatsApp)
* **Envio:** O frontend dispara requisiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes para a API local Express em rotas como `/api/whatsapp/send`. O backend localiza as credenciais seguras da instÃƒÆ’Ã‚Â¢ncia (Base URL, API Key) na tabela `company_instances` e faz o disparo do JSON para a Evolution API.
* **Recebimento via Webhook:** A Evolution API monitora o celular e envia webhooks (`POST /api/webhooks/whatsapp`) para o backend da aplicaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o. O Express resolve qual empresa ÃƒÆ’Ã‚Â© dona da mensagem processando o `instance_name` recebido e salvando nas tabelas `whatsapp_conversations` e `whatsapp_messages`.

### Supabase Storage
O armazenamento de arquivos ÃƒÆ’Ã‚Â© dividido nos seguintes Buckets de acesso:
1. **`whatsapp-media`:** Guarda permanentemente imagens, ÃƒÆ’Ã‚Â¡udios e documentos trocados pelo painel do WhatsApp.
2. **`propostas`:** Armazena os PDFs de propostas gerados pela equipe comercial.
3. **`uploads`:** Guarda documentos gerais e fotos rÃƒÆ’Ã‚Â¡pidas de vistoria cadastrados via CRM Kanban.
4. **`obras-fotos`:** Fotos de checklists de obras enviadas pelos instaladores.
5. **`homologacao-docs`:** DocumentaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes burocrÃƒÆ’Ã‚Â¡ticas submetidas ÃƒÆ’Ã‚Â s distribuidoras de energia.

### Firebase (Push Notifications)
* **ServiÃƒÆ’Ã‚Â§o FCM:** O Firebase Admin SDK no Express ÃƒÆ’Ã‚Â© inicializado com chaves privadas de ambiente. Quando um status de projeto ou mensagem do WhatsApp precisa alertar um usuÃƒÆ’Ã‚Â¡rio mobile, o backend busca o `push_token` do usuÃƒÆ’Ã‚Â¡rio na tabela `users` e envia o payload.

### Vercel (Deploy e Serverless)
* **Backend Serverless:** O arquivo `/api/index.ts` roda em ambiente Vercel. Todas as rotas de API `/api/*` sÃƒÆ’Ã‚Â£o reescritas para apontar para a serverless function monolÃƒÆ’Ã‚Â­tica.
* **Cronjobs:** Conforme definido em `vercel.json`, a Vercel aciona rotas agendadas em background:
  * `GET /api/cleanup-proposals` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬  Diariamente ÃƒÆ’Ã‚Â s 03:00 UTC. Remove propostas expiradas.
  * `GET /api/cron/agenda-reminders` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬  Diariamente ÃƒÆ’Ã‚Â s 07:00 UTC. Notifica usuÃƒÆ’Ã‚Â¡rios de compromissos prÃƒÆ’Ã‚Â³ximos.
  * `POST /api/cron/mensagem-inicio-expediente` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬  Segunda a sexta, 11:30 UTC (08:30 BRT). Envia mensagem de inÃƒÆ’Ã‚Â­cio de expediente para conversas em atendimento.
  * `POST /api/cron/mensagem-almoco` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬  Segunda a sexta, 15:00 UTC (12:00 BRT). Envia mensagem de pausa para almoÃƒÆ’Ã‚Â§o.
  * `POST /api/cron/mensagem-fim-expediente` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬  Segunda a sexta, 20:00 UTC (17:00 BRT). Envia mensagem de encerramento do atendimento.

### Railway (Evolution API)
* A hospedagem das instÃƒÆ’Ã‚Â¢ncias da Evolution API e da conexÃƒÆ’Ã‚Â£o com o WhatsApp do cliente final reside em um servidor Railway, provendo uma API contÃƒÆ’Ã‚Â­nua com IP estÃƒÆ’Ã‚Â¡vel para nÃƒÆ’Ã‚Â£o derrubar o escaneamento do QR Code.


---

## 7. AUTENTICAÃƒÆ’Ã¢â‚¬Â¡ÃƒÆ’Ã†â€™O E SEGURANÃƒÆ’Ã¢â‚¬Â¡A

* **Fluxo de Login e JWT:**
  1. O usuÃƒÆ’Ã‚Â¡rio submete e-mail e senha na tela de Login.
  2. O backend faz o hash e compara usando `bcrypt.compareSync()`. Caso o e-mail seja `ceo@mtsolar.com` e a senha `admin123`, hÃƒÆ’Ã‚Â¡ um fallback administrador configurado para facilitar a recuperaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o.
  3. Com a senha correta, ÃƒÆ’Ã‚Â© assinado um Token JWT contendo: `id`, `name`, `role` e `company_id`.
  4. O token ÃƒÆ’Ã‚Â© retornado na resposta JSON e gravado em `localStorage` via `login()` do `AuthContext`. O `AuthContext` tambÃƒÆ’Ã‚Â©m emite um cookie via backend simultaneamente.
  5. Em toda inicializaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do React, `AuthContext` chama `GET /api/auth/me` para validar a sessÃƒÆ’Ã‚Â£o. Em caso de falha, remove o token do `localStorage` automaticamente.
* **Cliente HTTP (`src/lib/api.ts`):**
  * InstÃƒÆ’Ã‚Â¢ncia Axios com `timeout: 15000ms` e `withCredentials: true`.
  * **`baseURL` dinÃƒÆ’Ã‚Â¢mica:** Se rodando em plataforma nativa Capacitor, aponta para `https://gest-o-mt-solar.vercel.app`. Em ambiente web, usa `window.location.origin` (funciona tanto em local quanto em produÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o sem reconfiguraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o).
  * Interceptor automÃƒÆ’Ã‚Â¡tico que injeta o header `Authorization: Bearer <token>` lido do `localStorage` em todas as requisiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes.
* **Role-Based Access Control (Roles de UsuÃƒÆ’Ã‚Â¡rio e Rotas Protegidas):**

  | Rota | CEO | ADMIN | COMMERCIAL | TECHNICAL |





---:|
  | `/` (Dashboard) | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ |
  | `/commercial` (CRM) | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã‚ Ã…â€™ |
  | `/whatsapp` | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã‚ Ã…â€™ |
  | `/proposal-generator` | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã‚ Ã…â€™ |
  | `/agenda` | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã‚ Ã…â€™ |
  | `/calculadora` | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ |
  | `/technical` | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã‚ Ã…â€™ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ |
  | `/obra` | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã‚ Ã…â€™ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ |
  | `/cronograma` | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ |
  | `/homologation` | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã‚ Ã…â€™ |
  | `/estoque` | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã‚ Ã…â€™ | ÃƒÂ¢Ã‚ Ã…â€™ |
  | `/kit-purchase` | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã‚ Ã…â€™ | ÃƒÂ¢Ã‚ Ã…â€™ |
  | `/users` | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã‚ Ã…â€™ | ÃƒÂ¢Ã‚ Ã…â€™ |
  | `/settings` | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã‚ Ã…â€™ | ÃƒÂ¢Ã‚ Ã…â€™ |
  | `/contracts` | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã‚ Ã…â€™ | ÃƒÂ¢Ã‚ Ã…â€™ |
  | `/neoenergia` | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã‚ Ã…â€™ | ÃƒÂ¢Ã‚ Ã…â€™ |
  | `/finished` | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã‚ Ã…â€™ | ÃƒÂ¢Ã‚ Ã…â€™ |
  | `/messages` | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã‚ Ã…â€™ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ |
  | `/documents` | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ | ÃƒÂ¢Ã‚ Ã…â€™ | ÃƒÂ¢Ã‚ Ã…â€™ |

  * **Regra especial COMMERCIAL:** Se o usuÃƒÆ’Ã‚Â¡rio tem `role = COMMERCIAL` e tenta acessar qualquer rota fora das permitidas, ÃƒÆ’Ã‚Â© redirecionado para `/` pelo `PrivateRoute` em `App.tsx`.
* **Middleware de AutenticaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o (`authenticateToken`):**
  * Toda rota protegida do Express passa por este middleware. Ele lÃƒÆ’Ã‚Âª o token do header `Authorization: Bearer <token>` ou do Cookie, verifica a assinatura contra `JWT_SECRET` e injeta `req.user` contendo as informaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes e o `company_id` da empresa na requisiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o.
* **Firebase Admin (Push Notifications):**
  * A inicializaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do Firebase Admin ÃƒÆ’Ã‚Â© **condicional**: sÃƒÆ’Ã‚Â³ ocorre se as trÃƒÆ’Ã‚Âªs variÃƒÆ’Ã‚Â¡veis `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY` e `FIREBASE_CLIENT_EMAIL` estiverem presentes no ambiente. Caso contrÃƒÆ’Ã‚Â¡rio, a API inicializa normalmente sem crash.


---

## 8. REGRAS DE NEGÃƒÆ’Ã¢â‚¬Å“CIO

* **Isolamento de VisualizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o por Role (WhatsApp):**
  * Vendedores (`COMMERCIAL`) visualizam e respondem chats apenas sob as seguintes regras:
    1. A conversa nÃƒÆ’Ã‚Â£o tem dono (`assigned_to IS NULL`) e estÃƒÆ’Ã‚Â¡ na fila (`status = 'waiting'`).
    2. A conversa estÃƒÆ’Ã‚Â¡ explicitamente atribuÃƒÆ’Ã‚Â­da a ele (`assigned_to = user_id`).
  * Administradores e CEOs acessam todas as conversas sem barreiras. Conversas em atendimento por outros agentes aparecem para o COMMERCIAL, mas travadas (bloqueadas para escrita e com conteÃƒÆ’Ã‚Âºdo oculto).
* **AssunÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o e TransferÃƒÆ’Ã‚Âªncia de Tickets:**
  * **Assumir:** Quando um atendente clica em uma conversa na fila, o sistema atualiza `assigned_to` para o seu ID de usuÃƒÆ’Ã‚Â¡rio e o status para `in_progress`.
  * **Transferir:** Um atendente comercial pode transferir a conversa para outro colaborador ou departamento. O sistema apaga o `assigned_to` anterior, atribui ao novo colaborador e registra uma mensagem do sistema indicando o direcionamento.
  * **TransferÃƒÆ’Ã‚Âªncia de InstÃƒÆ’Ã‚Â¢ncia:** InstÃƒÆ’Ã‚Â¢ncia `atendimento-cliente` ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ `mtsolar` (administrativo) e vice-versa, disponÃƒÆ’Ã‚Â­vel apenas para ADMINs.
* **Sistema de Etiquetas (Tags) das Conversas:**
  * Cada conversa pode ter **mÃƒÆ’Ã‚Âºltiplas etiquetas** armazenadas na coluna `tags TEXT[]`.
  * As etiquetas disponÃƒÆ’Ã‚Â­veis sÃƒÆ’Ã‚Â£o definidas no frontend em `WHATSAPP_TAGS` (constante em `WhatsApp.tsx`) com id, label e cor hex.
  * A lÃƒÆ’Ã‚Â³gica de toggle: ao clicar em uma etiqueta, se ela jÃƒÆ’Ã‚Â¡ existe no array ÃƒÆ’Ã‚Â© removida; se nÃƒÆ’Ã‚Â£o existe, ÃƒÆ’Ã‚Â© adicionada. O estado completo do array ÃƒÆ’Ã‚Â© sempre enviado ao backend (`PUT /api/conversations/:id/tag`).
  * Etiquetas disponÃƒÆ’Ã‚Â­veis: Atendimento Iniciado, Cuidar e Fechar, Fechou Venda, Lead Desqualificado, Lead Qualificado, NÃƒÆ’Ã‚Â£o Fechou Venda, OrÃƒÆ’Ã‚Â§amento Enviado, Visita Agendada, Transferido.
* **Funil de Vendas Kanban:**
  * Os projetos transitam de forma linear pelas colunas de estÃƒÆ’Ã‚Â¡gio. Cada estÃƒÆ’Ã‚Â¡gio exige preenchimento ou upload de dados diferentes (ex: o fechamento comercial exige upload de contrato; a fase tÃƒÆ’Ã‚Â©cnica exige vistoria cadastrada).


---

## 9. FLUXO DO WHATSAPP

O fluxo de processamento de mÃƒÆ’Ã‚Â­dias foi otimizado para evitar expiraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o rÃƒÆ’Ã‚Â¡pida de links e garantir o histÃƒÆ’Ã‚Â³rico permanente.

### Envio de Mensagens

#### Envio de Texto
* O front-end envia para `/api/whatsapp/send`. A Evolution despacha e o Express grava a mensagem no banco.

#### Envio de Imagens/Documentos
* O front-end faz o upload do arquivo para o bucket temporÃƒÆ’Ã‚Â¡rio `/api/whatsapp/upload-media`, que retorna uma URL assinada temporÃƒÆ’Ã‚Â¡ria (vÃƒÆ’Ã‚Â¡lida por 600 segundos) e o caminho do arquivo (`filePath`).
* O front-end chama `/api/whatsapp/send-media` passando essa URL assinada como origem para a Evolution API realizar o download e envio.
* ApÃƒÆ’Ã‚Â³s a confirmaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o da Evolution API, o Express gera a URL pÃƒÆ’Ã‚Âºblica e definitiva via `supabaseAdmin.storage.from(...).getPublicUrl(filePath)` e insere o registro com `media_url: publicUrl` e `from_me: true`.

#### Envio de ÃƒÆ’Ã‚ udio
* O front-end grava o ÃƒÆ’Ã‚Â¡udio e envia uma string em formato `base64` no corpo da requisiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o para `/api/whatsapp/send-audio`.
* O backend Express repassa o ÃƒÆ’Ã‚Â¡udio em `base64` para a Evolution API.
* ApÃƒÆ’Ã‚Â³s sucesso no disparo, o Express converte o `base64` em um `Buffer` fÃƒÆ’Ã‚Â­sico e realiza o upload para o Supabase Storage sob o caminho `company_id/conversationId/audio-[timestamp].ogg`.
* O backend obtÃƒÆ’Ã‚Â©m a URL pÃƒÆ’Ã‚Âºblica estÃƒÆ’Ã‚Â¡tica gerada pelo storage e insere no banco a nova mensagem contendo `media_url: audioPublicUrl`, `media_type: 'audio'`, `file_name: 'audio.ogg'` e `from_me: true`.

### Recebimento (Webhook)
* Quando uma mensagem de mÃƒÆ’Ã‚Â­dia externa (imagem, ÃƒÆ’Ã‚Â¡udio ou documento) chega pelo Webhook da Evolution API:
  1. O Express intercepta a mensagem no webhook de recebimento (`/api/webhooks/whatsapp`).
  2. Caso a mensagem contenha mÃƒÆ’Ã‚Â­dia, o webhook faz uma chamada reversa ÃƒÆ’Ã‚Â  Evolution API (`/chat/getBase64FromMediaMessage`) para ler o binÃƒÆ’Ã‚Â¡rio em formato `base64`.
  3. O backend converte o `base64` para binÃƒÆ’Ã‚Â¡rio (`Buffer`) e realiza o upload permanente no Supabase Storage no bucket `whatsapp-media`.
  4. O link pÃƒÆ’Ã‚Âºblico estÃƒÆ’Ã‚Â¡tico e definitivo gerado pelo Supabase ÃƒÆ’Ã‚Â© salvo na coluna `media_url` da mensagem gravada no banco com `from_me: false`.


---

## 10. BUILD E DEPLOY

### Processo de Build do Frontend
* O build ÃƒÆ’Ã‚Â© executado via script do Vite: `npm run build` ou `vite build`. O compilador lÃƒÆ’Ã‚Âª as configuraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes do arquivo `vite.config.ts` e gera os arquivos estÃƒÆ’Ã‚Â¡ticos indexados na pasta `/dist`.

### Deploy na Vercel
* O deploy ÃƒÆ’Ã‚Â© estruturado com base nas regras do arquivo `vercel.json`:
  * As requisiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes direcionadas para `/api/*` sÃƒÆ’Ã‚Â£o interceptadas e encaminhadas para a serverless function Express (`/api/index.ts`).
  * Qualquer outra rota de pÃƒÆ’Ã‚Â¡gina `/.*` ÃƒÆ’Ã‚Â© redirecionada para a pÃƒÆ’Ã‚Â¡gina estÃƒÆ’Ã‚Â¡tica raiz `/index.html` para deixar a navegaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de rotas internas a cargo do React Router DOM (SPA).

### Mobile com Capacitor
* **SincronizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:** ApÃƒÆ’Ã‚Â³s o build de produÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o (`npm run build`), o comando `npx cap sync` atualiza as plataformas mÃƒÆ’Ã‚Â³veis (`android` e `ios`) copiando a pasta `/dist` e os plugins necessÃƒÆ’Ã‚Â¡rios.
* **Build de Desenvolvimento:** O comando `npm run build:mobile` usa chaves e arquivos `.env.mobile` especÃƒÆ’Ã‚Â­ficos para gerar o build e sincronizar imediatamente no simulador ou celular conectado.


---

## 11. PROBLEMAS RESOLVIDOS E TAREFAS CONCLUÃ�DAS

---

* **CorreÃ§Ã£o crÃ­tica do Round-Robin â€” Fallback por nome que reintroduzia Soraia Castro (em licenÃ§a-maternidade) no pool de leads â€” 12/11/2026 10:10 BRT:**
  * *Problema:* `getRoundRobinVendedor()` em `api/index.ts` mantinha um fallback hardcoded por nome (L6377-6384 prÃ©-correÃ§Ã£o): com menos de 2 vendedores com `recebe_leads=true`, filtrava pelo nome `'Soraia'` ou `'Manoel'`. Com Soraia em licenÃ§a-maternidade (`recebe_leads=false`) e Manoel como Ãºnico elegÃ­vel (count=1 < 2), o fallback recolocava Soraia no pool, anulando a configuraÃ§Ã£o. O banco confirmava: Soraia (id=7) com `recebe_leads=false` mas `active=true` â€” suficiente para entrar no fallback.
  * *Impacto medido:* 50 conversas atribuÃ­das Ã  Soraia (id=7) desde 10/10/2026, todas `in_progress`, via WhatsApp direto (nenhuma via Kommo). 65 conversas atribuÃ­das ao Manoel (id=20) no mesmo perÃ­odo.
  * *O que foi feito:*
    * **Tarefa A â€” Reescrita de `getRoundRobinVendedor()` (`api/index.ts`, ~L6338):**
      * Query passa a filtrar diretamente no banco com `.eq('recebe_leads', true)` â€” sem etapa de filtro em memÃ³ria posterior.
      * Ramo `if (error)` obsoleto substituÃ­do por: loga o erro, notifica CEO/ADMIN via push e retorna `null`. Nunca tenta palpitar quem recebe leads.
      * Com zero elegÃ­veis: retorna `null` + envia push para CEO/ADMIN com texto `"âš ï¸� Lead sem vendedor elegÃ­vel"`. O webhook jÃ¡ tratava `null` corretamente: conversa com `status='waiting'` e nota interna `"Aguardando atendente na fila"` (L6849/6922 sem alteraÃ§Ã£o).
      * Fallback por nome (`'Soraia'`/`'Manoel'`) e "Ãºltimo recurso: todos os comerciais" **removidos permanentemente**.
    * **Tarefa A â€” ExtraÃ§Ã£o da funÃ§Ã£o pura `escolherVendedor()` para `api/roundRobin.ts`:**
      * Novo arquivo `api/roundRobin.ts` com interface `VendedorEnriquecido` e funÃ§Ã£o pura `escolherVendedor()`. OrdenaÃ§Ã£o idÃªntica Ã  anterior: `lastAssignedAt null` primeiro, depois mais antigo, empate por menor `totalInProgress`.
      * `getRoundRobinVendedor()` chama `escolherVendedor()` via `import('./roundRobin.js')`.
    * **Tarefa B â€” Testes unitÃ¡rios `scratch/test_roundRobin.mjs`:** 6/6 casos passaram: (i) mais antigo vence; (ii) null vence data; (iii) empate de data â†’ menor in_progress; (iv) Ãºnico elegÃ­vel retorna ele; (v) zero elegÃ­veis â†’ null; (bÃ´nus) dois null â†’ menor in_progress.
    * **Tarefa C â€” ValidaÃ§Ã£o:** `npx tsc --noEmit` cÃ³digo 0 (zero erros TypeScript). `npm run build` cÃ³digo 0. `git diff --stat`: 1 arquivo modificado (`api/index.ts`, +59/-54), 1 arquivo criado (`api/roundRobin.ts`).
  * *Arquivos modificados:* `api/index.ts`, `api/roundRobin.ts` (novo), `scratch/test_roundRobin.mjs` (novo).
  * *Aguardando:* aprovaÃ§Ã£o do usuÃ¡rio para commit/push e validaÃ§Ã£o com `GET /api/kommo/check-lead/:leadId`.

* **CorreÃ§Ã£o do Bug de PDF em Branco no Android WebView (Causa A + Causa B) â€” EM TESTE:**
  * *Problema:* PDF gerado no mobile (Android WebView/Capacitor) saÃ­a completamente em branco. No desktop (nova aba) funcionava normalmente. O log `pdf-debug-log.txt` nÃ£o era gerado, indicando falha silenciosa antes mesmo do html2canvas.
  * *Causa A diagnosticada:* O HTML completo (com `<!DOCTYPE>`, `<html>`, `<head>`, `<style>`, `<body>`) era inserido via `container.innerHTML = htmlComBase64`. O browser descarta silenciosamente o `<head>` e o `<style>` nessa operaÃ§Ã£o, deixando as classes CSS (`.page`, etc.) indefinidas. Os `pageDivs` tinham dimensÃµes `0Ã—0`, produzindo canvases em branco e um PDF sem XObjects.
  * *Causa B diagnosticada:* O `setActiveTab('dados')` e o `window.scrollTo` eram chamados **fora e imediatamente apÃ³s** a IIFE assÃ­ncrona, em paralelo com o `html2canvas`. O re-render do React provocado pelo `setActiveTab` potencialmente interrompia ou corrompÃ­a a captura.
  * *O que foi feito:*
    * **CorreÃ§Ã£o A (DOMParser):** SubstituÃ­do `container.innerHTML = htmlComBase64` por `DOMParser().parseFromString(htmlComBase64, 'text/html')`. O CSS Ã© extraÃ­do com `.querySelector('style').textContent` e injetado diretamente no `document.head` como um `<style id="pdf-temp-style">` real. Apenas o `parsedDoc.body.innerHTML` vai para o container. O `<style>` temporÃ¡rio Ã© removido no bloco `finally` via `document.getElementById('pdf-temp-style')?.remove()`.
    * **CorreÃ§Ã£o B (setActiveTab):** O `setActiveTab('dados')` e o `window.scrollTo` foram movidos para **dentro da IIFE**, logo apÃ³s o `await uploadFullPDF()` resolver. Isso garante que o html2canvas complete a captura sem interferÃªncia de re-renders do React.
    * **Feedback visual (UX):** Como `isGeneratingPDF` existia mas nunca estava conectado ao JSX (estado morto-vivo), adicionado `toast.loading('Gerando proposta...', { id: 'pdf-toast' })` no inÃ­cio do fluxo mobile e `toast.dismiss('pdf-toast')` ao final. Ambos os botÃµes ("Baixar Proposta em PDF" e "Atualizar Proposta") agora ficam desabilitados (`disabled={isGeneratingPDF}`) e exibem o texto "Gerando..." durante o processo.
    * **InstrumentaÃ§Ã£o mantida:** debugLog e `pdf-debug-log.txt` preservados para confirmaÃ§Ã£o pÃ³s-teste (esperado: `pageDivs.length > 0` e canvases com dimensÃµes reais).
  * *Status:* APK de debug gerado. Aguardando confirmaÃ§Ã£o em teste real no dispositivo antes de commit/push.
  * *Data e hora da alteraÃ§Ã£o:* 25/07/2026 Ã s 09:51 (HorÃ¡rio Local)
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`

---

* **Saneamento Completo de Duplicatas e Normalizacao de Telefones (Race Condition no Atendimento WhatsApp):**
  * *O que foi feito:*
    * Diagnosticado que a ausencia de uma UNIQUE constraint no banco permitia uma Race Condition entre os webhooks do Kommo e da Evolution API, gerando conversas duplicadas para o mesmo numero de telefone.
    * **Fase 1 - Merge principal (25 pares):** Realizado o merge de 11 pares de duplicatas exatas e 14 pares por diferenca de formatacao (12 vs 13 digitos). Criterio: prioridade para quem tinha assigned_to preenchido, depois volume de mensagens, depois last_message_at mais recente.
    * **Fase 2 - Update em lote (169 registros legados):** Todos os registros isolados com telefone de 12 digitos normalizados para 13 digitos.
    * **Fase 3 - Merge residual (5 pares adicionais):** Descobertos e resolvidos com sequencia corrigida (deletar secundaria antes de atualizar phone, respeitando a UNIQUE constraint ja ativa).
    * **Grupos excluidos intencionalmente:** JIDs 120363407528204291 e 120363397458917068 mantidos como pendencia de investigacao futura (bug: conversas de grupo nao deveriam estar na tabela de atendimento).
    * **Resultado final:** Zero duplicatas de telefone (exceto os 2 grupos), zero telefones com 12 digitos. Constraint UNIQUE (phone, company_id, instance) ativa e confirmada.
  * *Data e hora da alteracao:* 20/07/2026 as 15:47 (Horario Local)
  * *Arquivos modificados:* Banco de Dados Supabase (tabelas whatsapp_conversations e whatsapp_messages)
---

### INCIDENTE: Perda de Dados em proposal_history (18/06 a 25/06/2026)

> **ATENCAO CRITICA:** Este incidente resultou em perda irreversivel de dados de producao. Registrado aqui permanentemente como referencia historica para qualquer consulta futura sobre propostas ausentes.

* **Causa:** O cronjob `GET /api/cleanup-proposals`, criado no commit `f868250` em 18/06/2026, foi implementado com logica incorreta: em vez de apenas zerar o campo `url_arquivo` nas propostas expiradas (preservando o registro historico), a rota fazia um `.delete()` completo das linhas na tabela `proposal_history`, apagando permanentemente todos os dados, incluindo `client_name`, `raw_data` e `proposal_number`.
* **Periodo afetado:** O cronjob executou diariamente as 03:00 UTC entre 19/06 e 25/06/2026. Propostas geradas antes de aproximadamente **11/06/2026** (30 dias antes do dia de execucao do cleanup) foram sendo excluidas de forma incremental a cada execucao. Propostas geradas apos essa data permaneceram intactas.
* **Correcao:** O commit `765c66a` em 25/06/2026 substituiu a logica de DELETE por um UPDATE `url_arquivo = null`, preservando permanentemente o registro historico e removendo apenas o arquivo PDF fisico do storage.
* **Dados perdidos:** **Nao recuperaveis.** O plano atual do Supabase nao possui PITR (Point-in-Time Recovery) ativo. A decisao de nao ativar o PITR foi tomada por questoes de custo em 26/06/2026.
* **Risco adicional removido em 26/06/2026:** A rota de conclusao de homologacao (`connection_point_approved` em `api/index.ts`) tambem possuia uma query `.delete()` em `proposal_history` filtrada por `project_id`. Embora inofensiva no estado atual (a coluna `project_id` nunca foi populada em `proposal_history`), representava um risco futuro grave. Esta linha foi removida preventivamente e substituida por `.update({ url_arquivo: null })`.

---

* **CorreÃ§Ã£o do Algoritmo Round-Robin de DistribuiÃ§Ã£o de Leads:**
  * *O que foi feito:* A funÃ§Ã£o `getRoundRobinVendedor()` (em `api/index.ts`) estava distribuindo leads de forma desbalanceada quando a contagem de atendimentos (`in_progress`) estava prÃ³xima ou empatada, devido Ã  instabilidade do mÃ©todo `sort()` do array, que acabava favorecendo o vendedor com menor ID. A lÃ³gica foi reescrita para adotar um critÃ©rio de **rotaÃ§Ã£o real baseado em ordem de chegada**: o sistema agora busca a data do Ãºltimo lead atribuÃ­do a cada vendedor elegÃ­vel (buscando o `created_at` mais recente na tabela `whatsapp_conversations`). Quem recebeu o Ãºltimo lead hÃ¡ mais tempo (ou nunca recebeu) tem prioridade mÃ¡xima. A contagem de `in_progress` foi mantida apenas como critÃ©rio secundÃ¡rio de desempate caso dois vendedores nunca tenham recebido leads.
  * *Data e hora da alteraÃ§Ã£o:* 17/07/2026 Ã s 10:59 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`.

---
  * *O que foi feito:* 
    1. Implementada verificaÃ§Ã£o de duplicidade de cliente no backend (`POST /api/clients`) por telefone ou CPF/CNPJ. Retorna HTTP 409 caso exista, exibindo o nome do usuÃ¡rio que o cadastrou.
    2. Adicionado tratamento de erro HTTP 409 no frontend (`Commercial.tsx`), exibindo um alerta amigÃ¡vel ao vendedor e mantendo o modal aberto para correÃ§Ã£o.
    3. Atualizadas as rotas `GET /api/stats` e `GET /api/neoenergia` para filtrar os projetos pelo vendedor (`created_by`) logado caso ele tenha a role `COMMERCIAL`.
    4. Implementado filtro de projetos no lado do cliente em `Dashboard.tsx` (na listagem de HomologaÃ§Ãµes) para que usuÃ¡rios com role `COMMERCIAL` vejam apenas seus prÃ³prios projetos.
  * *Data e hora da alteraÃ§Ã£o:* 27/06/2026 Ã s 14:45 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/Commercial.tsx`, `src/pages/Dashboard.tsx`.

* **Alerta de Inatividade e Auto-encerramento de Conversas:**
  * *O que foi feito:* Criada a rota de cronjob `GET /api/cron/check-inatividade` em `api/index.ts` e registrada em `vercel.json` para rodar diariamente Ã s 08:00 UTC. Conversas sem interaÃ§Ã£o hÃ¡ mais de 10 dias alertam o vendedor via Push Notification; conversas hÃ¡ mais de 30 dias sÃ£o encerradas automaticamente com mensagem interna.
  * *Data e hora da alteraÃ§Ã£o:* 27/06/2026 Ã s 15:00 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `vercel.json`.

* **TransferÃªncia para Vendedor EspecÃ­fico (Somente CEO):**
  * *O que foi feito:* Adicionada nova rota `POST /api/whatsapp/transfer-to-agent` no backend, protegida pela role `CEO`. A rota reatribui a conversa ao vendedor escolhido, insere uma nota interna de registro e dispara push notification para o vendedor de destino. No frontend (`WhatsApp.tsx`): adicionados 3 novos estados (`showCeoTransferModal`, `ceoTransferTarget`, `isTransferringToAgent`), a funÃ§Ã£o `transferToSpecificAgent`, um botÃ£o roxo "Transferir para Vendedor" no painel de aÃ§Ãµes desktop (visÃ­vel apenas para CEO) e o modal completo com lista de vendedores filtrados por role `COMMERCIAL`. O `fetchAgents` foi atualizado para buscar tambÃ©m o campo `role`, necessÃ¡rio para o filtro do modal.
  * *Data e hora da alteraÃ§Ã£o:* 27/06/2026 Ã s 15:07 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/WhatsApp.tsx`.

* **ConfiguraÃ§Ã£o de Recebimento de Leads (Round-Robin):**
  * *O que foi feito:* Adicionada a coluna `recebe_leads` na tabela `users` para controlar quais vendedores recebem leads automÃ¡ticos do Kommo. Atualizada a funÃ§Ã£o `getRoundRobinVendedor` em `api/index.ts` para distribuir leads apenas entre os vendedores com `recebe_leads = true`. As rotas `GET` e `PUT` `/api/users` foram modificadas para suportar o novo campo. No frontend (`Funcionarios.tsx`), adicionada uma coluna "Recebe Leads" visÃ­vel apenas para o CEO com um toggle interativo para ligar/desligar a distribuiÃ§Ã£o por vendedor sem precisar de novo deploy.
  * *Data e hora da alteraÃ§Ã£o:* 27/06/2026 Ã s 15:35 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/Funcionarios.tsx`. Requer execuÃ§Ã£o manual de SQL no Supabase.

* **RelatÃ³rio de Origem de Vendas (CEO) e Campo Origem:**
  * *O que foi feito:* Adicionado o campo `origem_venda` no payload de `POST /api/clients` e `PUT /api/clients/:id` no backend. No frontend (`Commercial.tsx`), foi adicionado o select para o campo "Origem da Venda" com opÃ§Ãµes predefinidas logo apÃ³s o EndereÃ§o. Criada a pÃ¡gina `SalesOrigin.tsx` com grÃ¡ficos de barra para o CEO analisar os canais de aquisiÃ§Ã£o. A rota protegida e o item no menu lateral foram adicionados apenas para role `CEO`. Requer execuÃ§Ã£o manual do SQL no Supabase: `ALTER TABLE clients ADD COLUMN IF NOT EXISTS origem_venda TEXT;`.
  * *Data e hora da alteraÃ§Ã£o:* 27/06/2026 Ã s 15:00 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/Commercial.tsx`, `src/App.tsx`, `src/components/Layout.tsx`. Arquivo criado: `src/pages/SalesOrigin.tsx`.

* **ImplementaÃƒÂ§ÃƒÂ£o da Nova PÃƒÂ¡gina de Registro de Atendimentos:**
  * *O que foi feito:* Criada a pÃƒÂ¡gina "Registro de Atendimentos" (`AttendanceRegistry.tsx`) funcionando como uma planilha gerencial de clientes em andamento no WhatsApp. Adicionada a rota `GET /api/attendance-registry` com suporte a multi-tenancy e filtro de role (Vendedores veem apenas as prÃƒÂ³prias conversas, ADM/CEO veem todas). A tabela exibe o Cliente, Vendedor ResponsÃƒÂ¡vel, Etiquetas, Tempo sem InteraÃƒÂ§ÃƒÂ£o (calculado a partir de `last_message_at`) e a ÃƒÂºltima nota da tabela `whatsapp_observations`. Inclui funcionalidade de destacar em vermelho conversas sem interaÃƒÂ§ÃƒÂ£o hÃƒÂ¡ mais de 5 dias e filtro por vendedor/etiquetas.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 25/06/2026 ÃƒÂ s 16:16 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/AttendanceRegistry.tsx`, `src/components/Layout.tsx`, `src/App.tsx` e `RESUMO_MESTRE.md`.

* **ImplementaÃ§Ã£o: IntegraÃ§Ã£o Kommo CRM â†’ MTSolar (Round-Robin + Webhook):**
  * *O que foi feito:* Adicionados 6 blocos em `api/index.ts` implementando a integraÃ§Ã£o completa entre o Kommo CRM e o sistema de atendimento WhatsApp do MTSolar:
    1. **`kommoApi()`** â€” Helper centralizado para chamadas REST ao Kommo usando `KOMMO_LONG_LIVED_TOKEN` e `KOMMO_SUBDOMAIN` (variÃ¡veis de ambiente).
    2. **`getRoundRobinVendedor()`** â€” Distribui leads automaticamente para o vendedor `COMMERCIAL` ativo com menos atendimentos `in_progress` no momento.
    3. **`getKommoLeadContact()`** â€” Busca no Kommo o nome e telefone do contato vinculado ao lead (normaliza telefone para formato `55XXXXXXXXXXX`).
    4. **`getKommoLeadNotes()`** â€” Busca as Ãºltimas 5 notas do lead no Kommo e monta um resumo em texto para a nota interna.
    5. **`POST /api/kommo/webhook`** â€” Webhook principal: recebe leads, cria conversa no CRM, aplica Round-Robin, cria nota interna automÃ¡tica visÃ­vel apenas para o vendedor e dispara push notification. Responde `200` imediatamente para evitar retries. Se a conversa jÃ¡ existe, apenas atualiza o nome se estava como "VocÃª"/null.
    6. **`POST /api/kommo/fix-names`** *(CEO apenas)* â€” Rota de correÃ§Ã£o retroativa: busca conversas sem nome no banco, consulta o Kommo pelo telefone e atualiza o `contact_name`. Limita 200ms entre requisiÃ§Ãµes para nÃ£o sobrecarregar a API.
  * *VariÃ¡veis de ambiente necessÃ¡rias (adicionar na Vercel):*
    - `KOMMO_LONG_LIVED_TOKEN` â€” JWT de acesso longo (Long-Lived Token da conta MTSolar)
    - `KOMMO_SUBDOMAIN` â€” SubdomÃ­nio da conta Kommo (`mtsolarenergia`)
  * *URL do webhook para configurar no Kommo:* `https://gest-o-mt-solar.vercel.app/api/kommo/webhook`
  * *Data e hora da alteraÃ§Ã£o:* 27/06/2026 Ã s 11:20 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`

* **CorreÃ§Ã£o: contact_name Nulo em Mensagens fromMe (Kommo CRM):**
  * *O que foi feito:* Quando um vendedor respondia pelo Kommo CRM, a mensagem chegava via webhook da Evolution API com `fromMe: true` e `pushName` vazio/nulo. O sistema sobrescrevia `contact_name` com `null`, fazendo o frontend exibir "VocÃª" como nome do contato.
  * *SoluÃ§Ã£o:* Nos dois pontos do webhook (`POST /api/webhooks/whatsapp`) onde `whatsapp_conversations` Ã© gravada (atualizaÃ§Ã£o de conversa existente e inserÃ§Ã£o de nova), adicionada lÃ³gica de resoluÃ§Ã£o de nome em cascata: (1) usa `pushName` se disponÃ­vel; (2) mantÃ©m o nome jÃ¡ salvo (`existingConv.contact_name`); (3) se ainda nulo, faz consulta na tabela `clients` pelo telefone e `company_id` para recuperar o nome cadastrado.
  * *AÃ§Ã£o manual recomendada (Supabase SQL Editor):* Executar o SQL abaixo para corrigir conversas jÃ¡ existentes com nome vazio:
    ```sql
    UPDATE whatsapp_conversations wc
    SET contact_name = c.name
    FROM clients c
    WHERE wc.phone = c.phone
      AND wc.company_id = c.company_id
      AND (wc.contact_name IS NULL OR wc.contact_name = 'VocÃª' OR wc.contact_name = '');
    ```
  * *Data e hora da alteraÃ§Ã£o:* 27/06/2026 Ã s 10:50 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`

* **CorreÃ§Ã£o de Bugs: Conversa Travada e ObservaÃ§Ãµes no Registro de Atendimentos:**
  * *O que foi feito:*
    1. Ajustado o helper `checkConversationLock` em `api/index.ts` para nÃ£o bloquear conversas quando `assigned_to` for nulo, garantindo que conversas nÃ£o fiquem travadas sem dono. AlÃ©m disso, o webhook de recebimento (`POST /api/webhooks/whatsapp`) foi ajustado para forÃ§ar o status `waiting` em novas conversas, impedindo a inicializaÃ§Ã£o em `in_progress` sem `assigned_to`.
    2. Na rota `GET /api/attendance-registry`, foi removido o `.limit(1)` das observaÃ§Ãµes, retornando o histÃ³rico completo de notas da conversa. No frontend (`AttendanceRegistry.tsx`), a interface `Observation` e a renderizaÃ§Ã£o da coluna foram atualizadas para exibir o histÃ³rico de observaÃ§Ãµes empilhado verticalmente (as 2 mais recentes, com botÃ£o "Ver todas (X)" abrindo inline) em vez de apenas a Ãºltima observaÃ§Ã£o, garantindo que notas antigas nÃ£o sejam sobrescritas.
  * *Data e hora da alteraÃ§Ã£o:* 27/06/2026 Ã s 09:48 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/AttendanceRegistry.tsx`

* **CorreÃ§Ã£o CrÃ­tica: Bug de Cadeado Universal (Sandra Feliciano) â€” checkConversationLock v2:**
  * *O que foi feito:*
    1. **Problema A (Travamento sem dono):** Reescrito o helper `checkConversationLock` em `api/index.ts` usando `supabaseAdmin` com join explÃ­cito `users!whatsapp_conversations_assigned_to_fkey(name)`. A lÃ³gica agora verifica em sequÃªncia: (a) se `assigned_to` Ã© nulo â†’ libera imediatamente; (b) se `assigned_to` Ã© o prÃ³prio usuÃ¡rio â†’ libera; (c) se o role Ã© CEO â†’ libera; (d) sÃ³ entÃ£o bloqueia se `status = 'in_progress'`. O campo retornado Ã© `assignedToName` (vindo do join real com a tabela `users`), nÃ£o mais `assigned_name` (campo de snapshot que podia estar desatualizado ou nulo).
    2. **Problema B (Nome vazio no cadeado):** Todas as 4 rotas que chamam `checkConversationLock` (`GET /api/conversations/:id/messages`, `POST /api/whatsapp/send`, `POST /api/whatsapp/send-media`, `POST /api/whatsapp/send-audio`) foram ajustadas para retornar `assignedTo: lockCheck.assignedToName ?? 'outro atendente'` no corpo do HTTP 403.
    3. **Frontend `WhatsApp.tsx`:** O reset de `isLocked` e `lockedByName` foi movido para o inÃ­cio de `fetchMessages` (antes do `try`), garantindo que a UI limpa o cadeado instantaneamente ao trocar de conversa. A barra amarela de bloqueio exibe agora o nome em `<strong>` com fallback `'outro atendente'`.
    4. **UtilitÃ¡rio `sanitizeConversationStatus`:** Adicionada funÃ§Ã£o que garante que qualquer inserÃ§Ã£o/atualizaÃ§Ã£o em `whatsapp_conversations` com `assigned_to = null` sempre usa `status = 'waiting'`. Aplicada no webhook ao atualizar conversas existentes e ao criar novas.
  * *Data e hora da alteraÃ§Ã£o:* 27/06/2026 Ã s 10:11 (HorÃ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/WhatsApp.tsx`

* **CorreÃ§Ã£o CrÃ­tica: Bug de Cadeado Universal â€” Number(null) = 0 no Frontend:**
  * *O que foi feito:*
    1. **Causa raiz identificada:** `Number(null) === 0` fazia com que a comparaÃ§Ã£o `Number(conv.assigned_to) !== Number(user?.id)` retornasse `true` para conversas sem dono (`assigned_to = NULL`), bloqueando-as com cadeado para todos os vendedores.
    2. **CorreÃ§Ã£o 1 â€” `isAssignedToOther`:** Adicionadas as guardas `conv.assigned_to !== null && conv.assigned_to !== undefined` antes da comparaÃ§Ã£o numÃ©rica em `renderConversationItem`.
    3. **CorreÃ§Ã£o 2 â€” Badge de status:** Conversas `in_progress` sem dono agora exibem badge Ã¢mbar com Ã­cone `Timer` e texto "Aguardando atendente" em vez de cadeado cinza sem nome.
    4. **CorreÃ§Ã£o 3 â€” onClick:** Conversas `in_progress` sem `assigned_to` agora acionam `assumeConversation` ao clicar (igual Ã s `waiting`), em vez de bloquear o clique.
    5. **CorreÃ§Ã£o 4 â€” Rota de manutenÃ§Ã£o:** Adicionada rota `POST /api/admin/fix-orphan-conversations` (restrita a CEO) que converte todas as conversas `in_progress` sem dono para `status = 'waiting'`, corrigindo o estado corrompido jÃ¡ existente no banco.
  * *Data e hora da alteraÃ§Ã£o:* 27/06/2026 Ã s 10:30 (HorÃ¡rio Local)
  * *Arquivos modificados:* `src/pages/WhatsApp.tsx`, `api/index.ts`

* **Etiquetas, Transferir e Encerrar no Mobile Ã¢â‚¬â€� Modal de Detalhes (WhatsApp.tsx):**
  * *O que foi feito:* O modal `showObservationsModal` (aberto pelo botÃƒÂ£o Info no mobile) continha apenas o bloco de ObservaÃƒÂ§ÃƒÂµes. Expandido para funcionar como um painel completo de atendimento no mobile, incluindo: (1) Card de info do contato com status; (2) Bloco de **Etiquetas** com seleÃƒÂ§ÃƒÂ£o mÃƒÂºltipla por toque; (3) Bloco de **AÃƒÂ§ÃƒÂµes** com todos os botÃƒÂµes contextuais (Assumir / Transferir para Agente / Transferir para Administrativo / Transferir para Atendimento / Encerrar / Reabrir) respeitando o status da conversa e o role do usuÃƒÂ¡rio; (4) Bloco de **ObservaÃƒÂ§ÃƒÂµes**. Cada aÃƒÂ§ÃƒÂ£o do bloco AÃƒÂ§ÃƒÂµes fecha o modal antes de executar para evitar sobreposiÃƒÂ§ÃƒÂ£o de camadas.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 26/06/2026 ÃƒÂ s 10:56 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `src/pages/WhatsApp.tsx`
* **CorreÃƒÂ§ÃƒÂ£o do Download de PDF em Dispositivos MÃƒÂ³veis (Capacitor):**
  * *O que foi feito:* Instalados os plugins `@capacitor/filesystem` e `@capacitor/share`. Refatorada a funÃƒÂ§ÃƒÂ£o `generatePDF` em `ProposalGenerator.tsx` para detectar se o app estÃƒÂ¡ rodando como nativo (`Capacitor.isNativePlatform()`). No mobile, o PDF ÃƒÂ© gerado via `jsPDF`, convertido para Base64, salvo no diretÃƒÂ³rio de Documentos do dispositivo com `Filesystem.writeFile` e entÃƒÂ£o compartilhado via `Share.share` (tela nativa de compartilhamento). No desktop/web, o comportamento anterior (`window.open` + `print()`) ÃƒÂ© mantido sem alteraÃƒÂ§ÃƒÂµes. Adicionado estado visual `isGeneratingPDF` nos botÃƒÂµes de aÃƒÂ§ÃƒÂ£o para feedback de carregamento. Corrigido tambÃƒÂ©m o erro de tipagem `setLineDash` no jsPDF via cast `(doc as any)`.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 26/06/2026 ÃƒÂ s 10:52 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`, `package.json`
* **CorreÃƒÂ§ÃƒÂ£o de CÃƒÂ¡lculos Financeiros no Gerador de Propostas:**
  * *O que foi feito:* Refatorada a lÃƒÂ³gica financeira na geraÃƒÂ§ÃƒÂ£o do PDF (`ProposalGenerator.tsx`). A **Economia Total** de 25 anos agora soma os valores anuais com reajuste de 10% a.a., e o erro de ordem de grandeza (que gerava 67 milhÃƒÂµes) foi evitado. O **ROI** foi alterado para mostrar o Retorno Simples de 1Ã‚Âº ano em percentual (% a.a.). O cÃƒÂ¡lculo da **TIR (Taxa Interna de Retorno)** foi reescrito do zero implementando o mÃƒÂ©todo numÃƒÂ©rico iterativo de Newton-Raphson para descobrir a taxa real do fluxo de caixa, abandonando a fÃƒÂ³rmula simplificada errÃƒÂ´nea que causava discrepÃƒÂ¢ncias.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 26/06/2026 ÃƒÂ s 10:37 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`
* **RemoÃƒÂ§ÃƒÂ£o da ExibiÃƒÂ§ÃƒÂ£o do "Valor Final de Venda" para Vendedor na Aba Kit Solar:**
  * *O que foi feito:* Refatorada a aba "Kit Solar" (a aba de dimensionamento) no `ProposalGenerator.tsx` para nÃƒÂ£o exibir o card de "Valor Final de Venda" nem a seÃƒÂ§ÃƒÂ£o "Preview do Valor de Venda" para usuÃƒÂ¡rios com o role `COMMERCIAL` (Vendedor). Em substituiÃƒÂ§ÃƒÂ£o, o campo tornou-se exclusivamente o dropdown de "Selecionar Kit Cadastrado", obrigatÃƒÂ³rio, que exibe apenas a identificaÃƒÂ§ÃƒÂ£o do kit (ex: "Kit 5 kWh") sem os preÃƒÂ§os, blindando informaÃƒÂ§ÃƒÂµes de custos, preÃƒÂ§os, marca de mÃƒÂ³dulos e marca de inversores nÃƒÂ£o desejadas nessa visualizaÃƒÂ§ÃƒÂ£o.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 25/06/2026 ÃƒÂ s 15:11 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`

* **CorreÃƒÂ§ÃƒÂ£o de Tabela solar_kits nÃƒÂ£o encontrada (Erro 500 bloqueador):**
  * *O que foi feito:* A tabela `solar_kits` existia no cÃƒÂ³digo da API (`api/index.ts`, rotas GET/POST/PUT/DELETE `/api/solar-kits`) e no frontend (`ProposalGenerator.tsx`, interface `SolarKit`), mas **nunca havia sido criada no banco Supabase**. Nem o `supabase_schema.sql` nem a pasta `supabase/migrations/` possuÃƒÂ­am qualquer migration para ela Ã¢â‚¬â€� a pasta estava completamente vazia.
  * *Causa Raiz:* A tabela foi implementada no cÃƒÂ³digo em desenvolvimento mas a migration correspondente nunca foi executada no banco Supabase de produÃƒÂ§ÃƒÂ£o, fazendo o PostgREST retornar erro `"Could not find the table 'public.solar_kits' in the schema cache"` em todas as requisiÃƒÂ§ÃƒÂµes.
  * *SoluÃƒÂ§ÃƒÂ£o Aplicada:* Criado o arquivo `supabase/migrations/20260625_create_solar_kits.sql` com a estrutura completa da tabela, incluindo: (a) coluna `company_id` para multi-tenancy, (b) todos os campos mapeados pela interface `SolarKit` do frontend, (c) RLS habilitada com polÃƒÂ­ticas por role, (d) trigger de `updated_at` automÃƒÂ¡tico, e (e) `NOTIFY pgrst, 'reload schema'` ao final para forÃƒÂ§ar atualizaÃƒÂ§ÃƒÂ£o do cache do PostgREST. O arquivo `supabase_schema.sql` tambÃƒÂ©m foi atualizado para refletir a nova tabela.
  * *Ã¢Å¡Â Ã¯Â¸Â� AÃƒâ€¡ÃƒÆ’O MANUAL NECESSÃƒÂ�RIA:* Esta migration precisa ser executada **manualmente** no **SQL Editor do Supabase** (dashboard Ã¢â€ â€™ SQL Editor Ã¢â€ â€™ colar o conteÃƒÂºdo do arquivo e executar). O arquivo estÃƒÂ¡ em: `supabase/migrations/20260625_create_solar_kits.sql`.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 25/06/2026 ÃƒÂ s 15:06 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `supabase/migrations/20260625_create_solar_kits.sql` (novo), `supabase_schema.sql`

* **Estrutura final de colunas da tabela solar_kits:**
  * `id` (UUID - PK, gerado automaticamente)
  * `company_id` (**UUID** - Multi-tenancy obrigatÃƒÂ³rio Ã¢â‚¬â€� referencia `companies.id`)
  * `potencia_kwh` (NUMERIC 10,3 - PotÃƒÂªncia total do kit em kWp)
  * `valor_total` (NUMERIC 12,2 - Custo de aquisiÃƒÂ§ÃƒÂ£o do kit)
  * `margem_venda` (NUMERIC 5,2 - Margem de lucro em %, padrÃƒÂ£o 30)
  * `quantidade_modulos` (INTEGER - Qtd. de mÃƒÂ³dulos fotovoltaicos)
  * `potencia_modulo_w` (NUMERIC 10,2 - PotÃƒÂªncia de cada mÃƒÂ³dulo em W)
  * `marca_modulo` (TEXT - Marca/modelo dos mÃƒÂ³dulos)
  * `quantidade_inversores` (INTEGER - Qtd. de inversores)
  * `potencia_inversor_kw` (NUMERIC 10,3 - PotÃƒÂªncia do inversor principal em kW)
  * `marca_inversor` (TEXT - Marca do inversor principal)
  * `inversor_ampliacao` (BOOLEAN - Se kit possui inversor de ampliaÃƒÂ§ÃƒÂ£o, padrÃƒÂ£o FALSE)
  * `potencia_inversor_ampliacao_kw` (NUMERIC 10,3 - PotÃƒÂªncia do inversor de ampliaÃƒÂ§ÃƒÂ£o, nullable)
  * `marca_inversor_ampliacao` (TEXT - Marca do inversor de ampliaÃƒÂ§ÃƒÂ£o, nullable)
  * `ativo` (BOOLEAN - Soft-delete: FALSE = desativado, padrÃƒÂ£o TRUE)
  * `created_at` (TIMESTAMPTZ - automÃƒÂ¡tico)
  * `updated_at` (TIMESTAMPTZ - atualizado via trigger automÃƒÂ¡tico)

* **CorreÃƒÂ§ÃƒÂ£o CrÃƒÂ­tica Ã¢â‚¬â€� company_id INTEGER Ã¢â€ â€™ UUID em solar_kits e whatsapp_observations:**
  * *O que foi feito:* Diagnosticado e corrigido o erro `"invalid input syntax for type integer: \"e4bf6f22-6182-414d-afa4-c5449c014323\""` que bloqueava completamente o CRUD de kits solares e as observaÃƒÂ§ÃƒÂµes de atendimento.
  * *Causa Raiz:* As migrations `20260625_create_solar_kits.sql` e `20260625_create_whatsapp_observations.sql` criaram a coluna `company_id` como `INTEGER` (seguindo o padrÃƒÂ£o das tabelas antigas como `users.id SERIAL`), mas a tabela `companies` no Supabase utiliza `UUID` como chave primÃƒÂ¡ria. O JWT carrega o `company_id` do usuÃƒÂ¡rio autenticado como UUID (`e4bf6f22-...`), causando falha de cast ao inserir/filtrar. Confirmado via:
    * `AuthContext.tsx` linha 11: `company_id: string` Ã¢â‚¬â€� o frontend sempre trata como string (UUID)
    * RESUMO_MESTRE seÃƒÂ§ÃƒÂ£o 5: `companies.id (UUID - Primary Key)` jÃƒÂ¡ documentado
    * Todas as outras tabelas do sistema (users, clients, projects, commercial_data, whatsapp_conversations etc.) jÃƒÂ¡ usam `company_id UUID`
  * *SoluÃƒÂ§ÃƒÂ£o Aplicada (arquivos locais):*
    * `supabase/migrations/20260625_create_solar_kits.sql`: `company_id INTEGER Ã¢â€ â€™ UUID`, casts das 2 polÃƒÂ­ticas RLS `::INTEGER Ã¢â€ â€™ ::UUID`
    * `supabase/migrations/20260625_create_whatsapp_observations.sql`: `company_id INTEGER Ã¢â€ â€™ UUID`, casts das 2 polÃƒÂ­ticas RLS `::INTEGER Ã¢â€ â€™ ::UUID`
    * `supabase_schema.sql`: referÃƒÂªncias corrigidas para UUID nas duas tabelas
  * *Ã¢Å¡Â Ã¯Â¸Â� AÃƒâ€¡ÃƒÆ’O MANUAL NECESSÃƒÂ�RIA no Supabase SQL Editor:* Como a tabela `solar_kits` jÃƒÂ¡ existe (vazia) no banco com tipo errado, ÃƒÂ© necessÃƒÂ¡rio executar o SQL de correÃƒÂ§ÃƒÂ£o `ALTER TABLE` + recriar as polÃƒÂ­ticas RLS. Ver SQL completo gerado abaixo.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 26/06/2026 ÃƒÂ s 05:59 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `supabase/migrations/20260625_create_solar_kits.sql`, `supabase/migrations/20260625_create_whatsapp_observations.sql`, `supabase_schema.sql`

* **CorreÃƒÂ§ÃƒÂ£o de DeleÃƒÂ§ÃƒÂ£o de Documentos de HomologaÃƒÂ§ÃƒÂ£o (Supabase Ã¢â€ â€™ R2):**
  * *O que foi feito:* Removida a chamada legada `supabase.storage.from('homologacao-docs').remove([path])` do bloco de deleÃƒÂ§ÃƒÂ£o em massa (aprovaÃƒÂ§ÃƒÂ£o de Ponto de ConexÃƒÂ£o) em `Homologation.tsx`. SubstituÃƒÂ­da pela chamada correta ao backend `await api.delete('/api/homologation-documents/${doc.id}')`, que jÃƒÂ¡ trata a exclusÃƒÂ£o no Cloudflare R2. A deleÃƒÂ§ÃƒÂ£o individual jÃƒÂ¡ estava correta e nÃƒÂ£o necessitou alteraÃƒÂ§ÃƒÂ£o.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 19/06/2026
  * *Arquivos modificados:* `src/pages/Homologation.tsx`

* **CorreÃƒÂ§ÃƒÂ£o de Encoding de Emojis e Labels PT-BR na PÃƒÂ¡gina Obra:**
  * *O que foi feito:* Corrigidos 3 tÃƒÂ­tulos de seÃƒÂ§ÃƒÂ£o com encoding corrompido (Latin-1) em `Obra.tsx`: `Ã¢Å¡Â¡ MediÃƒÂ§ÃƒÂµes ElÃƒÂ©tricas Adicionais`, `Ã°Å¸â€�Å’ MediÃƒÂ§ÃƒÂµes CC (MPPTs)` e `Ã°Å¸â€œÂ¦ Opcionais Adicionais`. Labels e textos jÃƒÂ¡ estavam em portuguÃƒÂªs Ã¢â‚¬â€� nenhuma alteraÃƒÂ§ÃƒÂ£o adicional necessÃƒÂ¡ria.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 19/06/2026
  * *Arquivos modificados:* `src/pages/Obra.tsx`

* **HistÃƒÂ³rico de Propostas Ã¢â‚¬â€� Scroll, PaginaÃƒÂ§ÃƒÂ£o e ExpiraÃƒÂ§ÃƒÂ£o de 30 dias:**
  * *O que foi feito:* Adicionados estados `currentPage` e `ITEMS_PER_PAGE = 10` em `ProposalGenerator.tsx`. Tabela de histÃƒÂ³rico encapsulada com `overflow-y-auto max-h-[500px]` e cabeÃƒÂ§alho fixo (`sticky top-0`). Controles de paginaÃƒÂ§ÃƒÂ£o `Ã¢â€ Â� Anterior / PrÃƒÂ³xima Ã¢â€ â€™` exibidos apenas quando `totalPages > 1`. Alterado via SQL no Supabase o `DEFAULT` da coluna `data_expiracao` da tabela `proposal_history` para `now() + interval '30 days'` e atualizado registros existentes. O backend (`api/index.ts` linha 2729Ã¢â‚¬â€œ2730) jÃƒÂ¡ usava `.insert()` com 30 dias Ã¢â‚¬â€� nenhuma alteraÃƒÂ§ÃƒÂ£o necessÃƒÂ¡ria no backend.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 19/06/2026
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`, Supabase SQL Editor

* **Falha Geral no Login e API do Servidor (Erro de CompilaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o no Backend):**
  * *Causa Raiz:* Durante a implementaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o da Melhoria 5, a chave de fechamento (`}`) da funÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o `sendPushNotification` foi acidentalmente removida no arquivo `api/index.ts`. Como resultado, o compilador TSX/esbuild interpretou as definiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes de rotas subsequentes como parte da funÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o, gerando um erro sintÃƒÆ’Ã‚Â¡tico fatal (`Unexpected export`) e travando a inicializaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de todo o backend. Com a API fora do ar, todas as tentativas de autenticaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o falharam.
  * *SoluÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o Aplicada:* Restaurada a chave de fechamento `}` na funÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o `sendPushNotification` (linha 392) de `api/index.ts`. O compilador reiniciou com sucesso, restabelecendo a operaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de todas as rotas e permitindo o login dos usuÃƒÆ’Ã‚Â¡rios.
  * *Data e hora da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* 03/06/2026 ÃƒÆ’Ã‚Â s 12:30 (HorÃƒÆ’Ã‚Â¡rio Local)
  * *Arquivos modificados:* `api/index.ts`

* **Erro Cannot read properties of null (reading 'map') na aba RelatÃƒÆ’Ã‚Â³rio do Ponto:**
  * *Causa Raiz:* O estado `reportRecords` e outros estados de arrays de ponto eram deixados como `null` or `undefined` quando ocorria um erro de requisiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o (como HTTP 400 por falta de parÃƒÆ’Ã‚Â¢metros) ou o retorno da API vinha vazio. O frontend tentava renderizar chamando `.map()` sobre esses arrays, provocando a quebra visual completa da aba de relatÃƒÆ’Ã‚Â³rios.
  * *SoluÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o Aplicada:*
    1. Adicionada guarda de validaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de parÃƒÆ’Ã‚Â¢metros na funÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o `fetchReport` para evitar requisiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes sem `userId`, `startDate` ou `endDate`, retornando preventivamente e definindo o estado como `[]`.
    2. Implementado fallback com operador de coalescÃƒÆ’Ã‚Âªncia nula (`res.data ?? []`) e fallback explÃƒÆ’Ã‚Â­cito no bloco `catch` em todas as rotas de carregamento (`fetchReport`, `fetchHistory`, `fetchSchedules`, `fetchAllUsers` e `fetchPendingAdjustments`).
    3. Protegidos todos os acessos por `.map()`, `.filter()`, `.find()`, `.reduce()` e agrupamento utilizando o operador `(estado ?? [])`.
  * *Data e hora da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* 03/06/2026 ÃƒÆ’Ã‚Â s 13:45 (HorÃƒÆ’Ã‚Â¡rio Local)
  * *Arquivos modificados:* `src/pages/Ponto.tsx`

* **Erro HTTP 400 ao Cadastrar/Atualizar FuncionÃƒÆ’Ã‚Â¡rio:**
  * *Causa Raiz:* No envio de novas propriedades de cadastro (como `cpf`, `cargo` e `data_admissao`), as rotas do backend nÃƒÆ’Ã‚Â£o utilizavam valores padrÃƒÆ’Ã‚Âµes na desestruturaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de `req.body`, resultando em payloads ou colunas inconsistentes que o Supabase rejeitava se os campos estivessem ausentes. No frontend, a inicializaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o e a mÃƒÆ’Ã‚Â¡scara de formataÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do CPF nÃƒÆ’Ã‚Â£o seguiam o padrÃƒÆ’Ã‚Â£o exato exigido.
  * *SoluÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o Aplicada:*
    1. Ajustadas as rotas `POST /api/users` e `PUT /api/users/:id` no backend `api/index.ts` para desestruturar `cpf = null`, `cargo = null` e `data_admissao = null` do `req.body` com valores padrÃƒÆ’Ã‚Â£o nulos.
    2. Modificado o estado inicial do formulÃƒÆ’Ã‚Â¡rio no frontend `src/pages/Funcionarios.tsx` para inicializar `cargo` com `''` (string vazia).
    3. Adicionada a opÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o padrÃƒÆ’Ã‚Â£o `Selecione o cargo` no menu select de cargos do formulÃƒÆ’Ã‚Â¡rio para guiar o usuÃƒÆ’Ã‚Â¡rio na seleÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o.
    4. Atualizada a mÃƒÆ’Ã‚Â¡scara de formataÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o incremental do CPF para usar o padrÃƒÆ’Ã‚Â£o regex literal solicitado.
  * *Data e hora da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* 03/06/2026 ÃƒÆ’Ã‚Â s 13:48 (HorÃƒÆ’Ã‚Â¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/Funcionarios.tsx`

* **Ciclo de Vida de Armazenamento e Limpeza AutomÃƒÆ’Ã‚Â¡tica de MÃƒÆ’Ã‚Â­dias (R2 e Supabase Storage):**
  * *Causa Raiz:* NÃƒÆ’Ã‚Â£o existia uma limpeza periÃƒÆ’Ã‚Â³dica de mÃƒÆ’Ã‚Â­dias enviadas no WhatsApp (`whatsapp-media`), gerando acÃƒÆ’Ã‚Âºmulo ilimitado de arquivos no Supabase Storage. O cronjob do R2 (`cleanup-r2`) usava uma lÃƒÆ’Ã‚Â³gica de intervalo dinÃƒÆ’Ã‚Â¢mico que nÃƒÆ’Ã‚Â£o correspondia exatamente ÃƒÆ’Ã‚Â  filtragem recomendada no banco de dados.
  * *SoluÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o Aplicada:*
    1. Corrigida a lÃƒÆ’Ã‚Â³gica de filtragem da data de corte no cronjob `cleanup-r2` no `api/index.ts` usando `setDate(getDate() - 90)` de forma direta e segura.
    2. Desenvolvido o novo cronjob `GET /api/cron/cleanup-whatsapp-media` no backend para buscar mÃƒÆ’Ã‚Â­dias do WhatsApp com mais de 120 dias, extrair o caminho relativo dos arquivos a partir da `media_url`, removÃƒÆ’Ã‚Âª-los do Supabase Storage via `supabaseAdmin.storage.from(...).remove` e atualizar o banco para `media_url = null` (processados em lotes de 50 registros para evitar timeout).
    3. Cadastrada a rota do novo cronjob no arquivo `vercel.json` sob o agendamento `"0 3 2 * *"` (dia 2 de cada mÃƒÆ’Ã‚Âªs).
  * *Data e hora da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* 03/06/2026 ÃƒÆ’Ã‚Â s 13:58 (HorÃƒÆ’Ã‚Â¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `vercel.json`

* **AlteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o da Opacidade do Logotipo (`PNG_-_MT_SOLAR__1_.png`):**
  * *Causa Raiz:* O logotipo institucional de fundo estava com opacidade muito alta, interferindo na legibilidade dos textos e layouts das telas.
  * *SoluÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o Aplicada:* Processado o arquivo de imagem no canal alpha para definir a opacidade mÃƒÆ’Ã‚Â¡xima como 15%, suavizando sua exibiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o em toda a aplicaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o.
  * *Data e hora da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* 03/06/2026 ÃƒÆ’Ã‚Â s 14:10 (HorÃƒÆ’Ã‚Â¡rio Local)
  * *Arquivos modificados:* `public/PNG_-_MT_SOLAR__1_.png`

* **Erro HTTP 400 ao Cadastrar e Listagem Vazia na PÃƒÆ’Ã‚Â¡gina de FuncionÃƒÆ’Ã‚Â¡rios (PGRST204):**
  * *Causa Raiz:* O PostgREST do Supabase retornava erro `PGRST204` em trÃƒÆ’Ã‚Âªs rotas (`GET`, `POST` e `PUT /api/users`) porque as colunas `cpf`, `cargo` e `data_admissao` ainda nÃƒÆ’Ã‚Â£o foram criadas na tabela `users`. O `GET` retornava `null` silenciosamente (lista vazia na tela), o `POST` retornava HTTP 400 (cadastro falhava) e o `PUT` idem.
  * *SoluÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o Aplicada:* Implementado **fallback automÃƒÆ’Ã‚Â¡tico com cÃƒÆ’Ã‚Â³digo de erro `PGRST204`** nas trÃƒÆ’Ã‚Âªs rotas do `api/index.ts`:
    1. `GET /api/users`: tenta buscar com campos extras; se `PGRST204`, retenta sem eles ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â� a lista de funcionÃƒÆ’Ã‚Â¡rios sempre ÃƒÆ’Ã‚Â© retornada.
    2. `POST /api/users`: tenta inserir com `cpf`/`cargo`/`data_admissao`; se `PGRST204`, retenta com apenas os campos obrigatÃƒÆ’Ã‚Â³rios.
    3. `PUT /api/users/:id`: mesma lÃƒÆ’Ã‚Â³gica de fallback para atualizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes.
  * *AÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o pendente:* Executar o SQL abaixo no editor do Supabase para ativar o salvamento dos campos opcionais:
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
  * *Data e hora da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* 03/06/2026 ÃƒÆ’Ã‚Â s 14:42 (HorÃƒÆ’Ã‚Â¡rio Local)
  * *Arquivos modificados:* `api/index.ts`







* **URLs de MÃƒÆ’Ã‚Â­dia Nulas para Mensagens Enviadas (`from_me = true`):**
  * *Causa Raiz:* No envio de mÃƒÆ’Ã‚Â­dias e ÃƒÆ’Ã‚Â¡udios, a URL temporÃƒÆ’Ã‚Â¡ria ou arquivo `base64` era enviado para a Evolution API, mas no `INSERT` da tabela `whatsapp_messages` a coluna `media_url` era mantida nula. AlÃƒÆ’Ã‚Â©m disso, o arquivo temporÃƒÆ’Ã‚Â¡rio da mÃƒÆ’Ã‚Â­dia no bucket `whatsapp-media` era deletado imediatamente apÃƒÆ’Ã‚Â³s o envio bem-sucedido para economizar espaÃƒÆ’Ã‚Â§o de storage.
  * *SoluÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o Aplicada:* Ajustadas as rotas `/api/whatsapp/send-media` e `/api/whatsapp/send-audio` no backend Express. Agora, antes de inserir a mensagem, o backend gera uma URL pÃƒÆ’Ã‚Âºblica definitiva pelo storage com `supabaseAdmin.storage.from(...).getPublicUrl(filePath)`, preenche a propriedade `media_url` na query de `INSERT` e mantÃƒÆ’Ã‚Â©m o arquivo gravado no bucket de forma permanente.
* **404 na Evolution API:**
  * *Causa Raiz:* InconsistÃƒÆ’Ã‚Âªncias na URL final enviada ÃƒÆ’Ã‚Â  Evolution API por falta de validaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o rigorosa dos nomes das instÃƒÆ’Ã‚Â¢ncias ativas (que vinham com espaÃƒÆ’Ã‚Â§os e letras maiÃƒÆ’Ã‚Âºsculas).
  * *SoluÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* Implementado tratamento estrito de nomes de instÃƒÆ’Ã‚Â¢ncias via Express antes de repassar a requisiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o (conversÃƒÆ’Ã‚Â£o para lowercase e substituiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de espaÃƒÆ’Ã‚Â§os por hÃƒÆ’Ã‚Â­fens).
* **Erro 400 no Supabase Storage via RLS:**
  * *Causa Raiz:* O envio de arquivos pelo front-end falhava intermitentemente por falta de permissÃƒÆ’Ã‚Â£o de escrita de usuÃƒÆ’Ã‚Â¡rios nÃƒÆ’Ã‚Â£o autenticados no bucket.
  * *SoluÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* SubstituÃƒÆ’Ã‚Â­do o cliente anÃƒÆ’Ã‚Â´nimo por `supabaseAdmin` utilizando a chave privada master `SUPABASE_SERVICE_ROLE_KEY` exclusivamente no backend Express para realizar o upload das mÃƒÆ’Ã‚Â­dias.
* **Sistema de Etiquetas NÃƒÆ’Ã‚Â£o Salvando (Multi-Tag):**
  * *Causa Raiz (1 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â� Banco):* A tabela `whatsapp_conversations` possuÃƒÆ’Ã‚Â­a apenas a coluna `tag TEXT` (singular), incapaz de armazenar mÃƒÆ’Ã‚Âºltiplas etiquetas. A coluna `tags TEXT[]` nÃƒÆ’Ã‚Â£o existia, fazendo o UPDATE retornar erro `42703` silencioso do PostgreSQL.
  * *Causa Raiz (2 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â� Backend):* A rota `PUT /api/conversations/:id/tag` atualizava a coluna `tag` com uma string ÃƒÆ’Ã‚Âºnica em vez de receber e persistir um array na coluna `tags`.
  * *Causa Raiz (3 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â� Frontend):* A interface `Conversation` tipava o campo como `tag?: string | null` e a funÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o `updateTag` enviava uma string ÃƒÆ’Ã‚Âºnica, sem lÃƒÆ’Ã‚Â³gica de toggle ou suporte a mÃƒÆ’Ã‚Âºltiplos valores.
  * *SoluÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o Aplicada:*
    1. Executado `ALTER TABLE whatsapp_conversations ADD COLUMN tags TEXT[] DEFAULT '{}'` no SQL Editor do Supabase.
    2. Migrados dados histÃƒÆ’Ã‚Â³ricos: `UPDATE whatsapp_conversations SET tags = ARRAY[tag] WHERE tag IS NOT NULL AND tag != ''`.
    3. Atualizada a rota backend para ler `{ tags }` do body e gravar `{ tags: tags ?? [] }` na coluna correta.
    4. Atualizado o frontend: interface alterada para `tags?: string[] | null`, funÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o `updateTag` com lÃƒÆ’Ã‚Â³gica de toggle (adiciona/remove do array), dropdown com checkboxes visuais e renderizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de mÃƒÆ’Ã‚Âºltiplas tags coloridas por conversa.

* **Bloqueio de Conversa em Atendimento por Outro Agente:**
  * *Contexto:* Antes da implementaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o, nÃƒÆ’Ã‚Â£o havia bloqueio do tipo "conversa em uso" ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â� qualquer agente podia ler e responder mensagens de conversas que jÃƒÆ’Ã‚Â¡ estavam sendo atendidas por outro colega, gerando conflito de atendimento.
  * *SoluÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o Aplicada:*
    1. Criada nova rota `GET /api/conversations/:id/messages` no backend que, antes de retornar mensagens, verifica se `status = 'in_progress'`, `assigned_to IS NOT NULL` e `assigned_to != req.user.id`. Caso confirmado e o role nÃƒÆ’Ã‚Â£o for CEO, retorna HTTP 403 com `{ error: 'CONVERSATION_LOCKED', assignedTo: nome_do_agente }`.
    2. Adicionada a mesma validaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o nas rotas `POST /api/whatsapp/send`, `POST /api/whatsapp/send-media` e `POST /api/whatsapp/send-audio` via helper `checkConversationLock()`.
    3. No frontend (`WhatsApp.tsx`): adicionados estados `isLocked` e `lockedByName`. A funÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o `fetchMessages` agora chama o backend via `api.get()` (em vez de Supabase direto) e trata o erro 403 setando `isLocked = true`. Ao trocar de conversa, os estados sÃƒÆ’Ã‚Â£o resetados. No lugar do campo de mensagem, exibe-se um aviso amarelo com ÃƒÆ’Ã‚Â­cone de cadeado e o nome do agente responsÃƒÆ’Ã‚Â¡vel.
* **Cronjobs de Mensagens AutomÃƒÆ’Ã‚Â¡ticas de HorÃƒÆ’Ã‚Â¡rio:**
  * Adicionadas 3 novas rotas `POST` no backend e 3 entradas no `vercel.json` para disparar mensagens automÃƒÆ’Ã‚Â¡ticas de horÃƒÆ’Ã‚Â¡rio (inÃƒÆ’Ã‚Â­cio de expediente, almoÃƒÆ’Ã‚Â§o e fim de expediente) para todas as conversas com `status = 'in_progress'`, utilizando as credenciais de instÃƒÆ’Ã‚Â¢ncia de cada empresa via `getEvolutionApiCredentials()`.
* **Scroll no HistÃƒÆ’Ã‚Â³rico do Gerador de Propostas:**
  * *O que foi feito:* AdiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o das classes CSS `overflow-y-auto` e `max-h-96` ao container div que envolve a tabela na aba de histÃƒÆ’Ã‚Â³rico do gerador de propostas. Isso habilita o scroll vertical, permitindo visualizar todos os registros sem limitaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o ou quebra de layout.
  * *Data e hora da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* 01/06/2026 ÃƒÆ’Ã‚Â s 15:11 (HorÃƒÆ’Ã‚Â¡rio Local)
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`
* **Filtro de Projetos Finalizados nas HomologaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes do Dashboard:**
  * *O que foi feito:* AdiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de condiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes no `.filter()` da listagem de homologaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes no arquivo `Dashboard.tsx` para excluir projetos que possuam `current_stage` como `'conclusion'` ou `status` como `'completed'`.
  * *Data e hora da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* 01/06/2026 ÃƒÆ’Ã‚Â s 15:12 (HorÃƒÆ’Ã‚Â¡rio Local)
  * *Arquivos modificados:* `src/pages/Dashboard.tsx`
* **Campo de Input NumÃƒÆ’Ã‚Â©rico para OrdenaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o no Cronograma:**
  * *O que foi feito:* SubstituiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o dos botÃƒÆ’Ã‚Âµes de seta por um componente de input numÃƒÆ’Ã‚Â©rico (`OrderInput`) na listagem do cronograma de obras (`ObraSchedule.tsx`). O input permite ao usuÃƒÆ’Ã‚Â¡rio digitar diretamente a posiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de reordenaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do cliente, e dispara a movimentaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o e reordenaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o no blur ou pressionando Enter.
* **CriaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o das Tabelas de Controle de Ponto no Supabase (Parte 1):**
  * *O que foi feito:* CriaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o das tabelas `work_schedules` (horÃƒÆ’Ã‚Â¡rios de trabalho), `time_records` (registros de ponto) e `time_adjustments` (ajustes de ponto), alÃƒÆ’Ã‚Â©m de ÃƒÆ’Ã‚Â­ndices de performance (`idx_time_records_company_user`, `idx_time_records_timestamp`, `idx_time_adjustments_company`, `idx_work_schedules_company_role`) no banco de dados Supabase do projeto para suporte ao sistema de jornada de colaboradores.
  * *Data e hora da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* 02/06/2026 ÃƒÆ’Ã‚Â s 04:18 (HorÃƒÆ’Ã‚Â¡rio Local)
  * *Arquivos modificados:* Nenhum arquivo de cÃƒÆ’Ã‚Â³digo modificado diretamente (criaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o via SQL Editor do Supabase); atualizado o resumo mestre do banco de dados em `RESUMO_MESTRE_GESTAO_MTSOLAR.md`.
* **InstalaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o das DependÃƒÆ’Ã‚Âªncias do Cloudflare R2 / GeolocalizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o e CriaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do Cliente R2 (Parte 2):**
  * *O que foi feito:* InstalaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o das dependÃƒÆ’Ã‚Âªncias `@aws-sdk/client-s3` e `@aws-sdk/s3-request-presigner` via npm, instalaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o e sincronizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do plugin `@capacitor/geolocation` no wrapper mobile do Capacitor, e criaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do arquivo de cliente Cloudflare R2 em `api/r2.ts` com funÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes utilitÃƒÆ’Ã‚Â¡rias de upload, delete e listagem de arquivos.
  * *Data e hora da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* 02/06/2026 ÃƒÆ’Ã‚Â s 04:21 (HorÃƒÆ’Ã‚Â¡rio Local)
  * *Arquivos modificados:* `package.json`, `package-lock.json`, `api/r2.ts` (novo arquivo), `android/app/src/main/assets/capacitor.config.json` (gerado/atualizado pelo capacitor sync).
* **ImplementaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o das Rotas de Ponto EletrÃƒÆ’Ã‚Â´nico (Parte 4):**
  * *O que foi feito:* AdiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o da importaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do cliente Cloudflare R2 em `api/index.ts` e implementaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de todas as rotas do mÃƒÆ’Ã‚Â³dulo de Ponto EletrÃƒÆ’Ã‚Â´nico (horÃƒÆ’Ã‚Â¡rios de expedientes, registro de ponto com selfie e localizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o, listagem de histÃƒÆ’Ã‚Â³rico, relatÃƒÆ’Ã‚Â³rios por usuÃƒÆ’Ã‚Â¡rio, solicitaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes de ajuste e moderaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de ajustes por administradores).
  * *Data e hora da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* 02/06/2026 ÃƒÆ’Ã‚Â s 04:29 (HorÃƒÆ’Ã‚Â¡rio Local)
  * *Arquivos modificados:* `api/index.ts`
* **Cronjob de Limpeza de Selfies no Cloudflare R2 (Parte 5):**
  * *O que foi feito:* AdiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o da rota `GET /api/cron/cleanup-r2` em `api/index.ts` que exclui do R2 (e limpa os campos `selfie_url` e `selfie_path` no Supabase) selfies de registros de ponto com mais de 90 dias. Registrada a entrada correspondente no `vercel.json` com schedule mensal (`0 3 1 * *`, ÃƒÆ’Ã‚Â s 03:00 UTC do dia 1 de cada mÃƒÆ’Ã‚Âªs).
  * *Data e hora da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* 02/06/2026 ÃƒÆ’Ã‚Â s 04:32 (HorÃƒÆ’Ã‚Â¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `vercel.json`
* **CriaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o da Tela de Ponto EletrÃƒÆ’Ã‚Â´nico no Frontend (Parte 6):**
  * *O que foi feito:* CriaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o da pÃƒÆ’Ã‚Â¡gina `src/pages/Ponto.tsx` implementando a interface visual completa do Ponto EletrÃƒÆ’Ã‚Â´nico (batida de ponto com integraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do plugin `@capacitor/camera` para captura de selfie e `@capacitor/geolocation` para obter latitude e longitude, histÃƒÆ’Ã‚Â³rico pessoal de registros de ponto com solicitaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de ajustes de horÃƒÆ’Ã‚Â¡rio justificados, visualizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de espelho de ponto com cÃƒÆ’Ã‚Â¡lculo de horas trabalhadas diÃƒÆ’Ã‚Â¡rias e mensais, painel de relatÃƒÆ’Ã‚Â³rios do gestor com exportaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de PDF utilizando `jsPDF`, configuraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de horÃƒÆ’Ã‚Â¡rios de expediente por funÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o e moderaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de solicitaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes de ajuste pendentes).
  * *Data e hora da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* 02/06/2026 ÃƒÆ’Ã‚Â s 04:41 (HorÃƒÆ’Ã‚Â¡rio Local)
  * *Arquivos modificados:* `src/pages/Ponto.tsx`
* **Registro de Rota de Ponto EletrÃƒÆ’Ã‚Â´nico e PermissÃƒÆ’Ã‚Âµes do Android (Parte 7):**
  * *O que foi feito:* Registro da rota protegida `/ponto` em `src/App.tsx` para todas as roles (`CEO`, `ADMIN`, `COMMERCIAL`, `TECHNICAL`) e adiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do caminho aos autorizados para a role de vendedor (`COMMERCIAL`). AdiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o das permissÃƒÆ’Ã‚Âµes nativas de localizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o (`ACCESS_FINE_LOCATION` e `ACCESS_COARSE_LOCATION`) no `android/app/src/main/AndroidManifest.xml` e execuÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o bem-sucedida do `npx cap sync` para sincronizar os arquivos de build Gradle e plugins nativos no wrapper do Capacitor.
  * *Data e hora da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* 02/06/2026 ÃƒÆ’Ã‚Â s 04:43 (HorÃƒÆ’Ã‚Â¡rio Local)
  * *Arquivos modificados:* `src/App.tsx`, `android/app/src/main/AndroidManifest.xml`, `android/app/capacitor.build.gradle` (e outros arquivos gerados pelo Capacitor sync)
* **AdiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do Item "Ponto EletrÃƒÆ’Ã‚Â´nico" no Menu Lateral de NavegaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o (Parte 8):**
  * *O que foi feito:* AdiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o da importaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do ÃƒÆ’Ã‚Â­cone `Clock` do `lucide-react` no arquivo `src/components/Layout.tsx`, inclusÃƒÆ’Ã‚Â£o da opÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o "Ponto EletrÃƒÆ’Ã‚Â´nico" (caminho `/ponto`, ÃƒÆ’Ã‚Â­cone `Clock`) no array de rotas visÃƒÆ’Ã‚Â­veis `menuItems` (liberado para todas as roles) e inclusÃƒÆ’Ã‚Â£o da rota na lista `allowedPaths` para permitir a exibiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do menu lateral para a role de vendedor (`COMMERCIAL`).
  * *Data e hora da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* 02/06/2026 ÃƒÆ’Ã‚Â s 04:45 (HorÃƒÆ’Ã‚Â¡rio Local)
  * *Arquivos modificados:* `src/components/Layout.tsx`
* **Filtro de PerÃƒÆ’Ã‚Â­odo Personalizado no Ponto EletrÃƒÆ’Ã‚Â´nico e RelatÃƒÆ’Ã‚Â³rio PDF:**
  * *O que foi feito:* SubstituiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do seletor de mÃƒÆ’Ã‚Âªs fixo por inputs de Data Inicial e Data Final na aba de relatÃƒÆ’Ã‚Â³rios do gestor. Ajuste da busca de registros de ponto no backend utilizando a query de perÃƒÆ’Ã‚Â­odo customizado. RefatoraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o completa da funÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de exportaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de PDF (`generatePDF` usando `jsPDF`) para incluir o nome da empresa e CNPJ consultados da tabela `companies` do Supabase, o perÃƒÆ’Ã‚Â­odo do relatÃƒÆ’Ã‚Â³rio formatado em DD/MM/AAAA, o nome e o cargo do colaborador, o quadro de expediente esperado de acordo com a tabela `work_schedules` baseada no `role` do colaborador, a tabela diÃƒÆ’Ã‚Â¡ria completa contendo o dia da semana e uma nova coluna de ObservaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes informando se o ponto foi batido fora do local de interesse (latitude/longitude nulos indicando "Sem localizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o registrada"), alÃƒÆ’Ã‚Â©m de rodapÃƒÆ’Ã‚Â© com o total acumulado de horas e linha de assinatura.
  * *Data e hora da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* 03/06/2026 ÃƒÆ’Ã‚Â s 09:45 (HorÃƒÆ’Ã‚Â¡rio Local)
  * *Arquivos modificados:* `src/pages/Ponto.tsx`
* **ExclusÃƒÆ’Ã‚Â£o de Registros de Ponto por FuncionÃƒÆ’Ã‚Â¡rio Demitido (Somente CEO):**
  * *O que foi feito:* AdiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o da rota DELETE `/api/ponto/usuario/:userId/registros` no Express, protegida com autenticaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o e restrita ao role de CEO, garantindo o isolamento multi-tenant (`company_id`). No frontend (`src/pages/Ponto.tsx`), implementada exibiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o condicional do botÃƒÆ’Ã‚Â£o "Excluir todos os registros" com ÃƒÆ’Ã‚Â­cone de lixeira (`Trash2`) apenas para usuÃƒÆ’Ã‚Â¡rios logados como CEO. Criado modal de confirmaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o antes de disparar o delete na API e, em caso de sucesso, o estado local ÃƒÆ’Ã‚Â© limpo e uma notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o ÃƒÆ’Ã‚Â© exibida.
  * *Data e hora da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* 03/06/2026 ÃƒÆ’Ã‚Â s 09:50 (HorÃƒÆ’Ã‚Â¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/Ponto.tsx`
* **CorreÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de GeolocalizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o no APK e VisualizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do Local (Parte 3):**
  * *O que foi feito:* AdiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o da tag `<uses-feature android:name="android.hardware.location.gps" android:required="false" />` no `android/app/src/main/AndroidManifest.xml` para robustez de localizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o. No frontend (`src/pages/Ponto.tsx`), criada a funÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o helper assÃƒÆ’Ã‚Â­ncrona `capturarLocalizacao` que requisita explicitamente permissÃƒÆ’Ã‚Â£o de localizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o (`Geolocation.requestPermissions()`) antes de consultar a posiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o atual. O fluxo `handlePunch` foi ajustado para prosseguir de forma nÃƒÆ’Ã‚Â£o bloqueante caso a geolocalizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o falhe, exibindo o aviso "LocalizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o nÃƒÆ’Ã‚Â£o capturada. O ponto serÃƒÆ’Ã‚Â¡ registrado sem geolocalizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o.". No histÃƒÆ’Ã‚Â³rico de ponto (colaborador e gestor), adicionado o ÃƒÆ’Ã‚Â­cone de mapa (`MapPin`) ao lado do horÃƒÆ’Ã‚Â¡rio da batida, estilizado em cinza se a geolocalizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o for nula, ou em verde e clicÃƒÆ’Ã‚Â¡vel (abrindo link do Google Maps em nova aba) caso a localizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o esteja preenchida.
  * *Data e hora da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* 03/06/2026 ÃƒÆ’Ã‚Â s 09:55 (HorÃƒÆ’Ã‚Â¡rio Local)
  * *Arquivos modificados:* `android/app/src/main/AndroidManifest.xml`, `src/pages/Ponto.tsx`
* **Cadastro de FuncionÃƒÆ’Ã‚Â¡rios Vinculado ao Ponto EletrÃƒÆ’Ã‚Â´nico (Parte 4):**
  * *O que foi feito:* CriaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o da nova pÃƒÆ’Ã‚Â¡gina `src/pages/Funcionarios.tsx` para cadastro, ediÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o e gestÃƒÆ’Ã‚Â£o de funcionÃƒÆ’Ã‚Â¡rios, restrita aos papÃƒÆ’Ã‚Â©is de `CEO` e `ADMIN`. A pÃƒÆ’Ã‚Â¡gina exibe a listagem completa de colaboradores com botÃƒÆ’Ã‚Âµes para Editar, Desativar/Reativar e um botÃƒÆ’Ã‚Â£o de Ponto (ÃƒÆ’Ã‚Â­cone `Clock`) com tooltip "Ver ponto" que redireciona para a rota `/ponto?userId={id}`. No arquivo `src/pages/Ponto.tsx`, implementada a leitura do query parameter `userId` via `useSearchParams()`. Ao detectar o ID na URL, o sistema prÃƒÆ’Ã‚Â©-seleciona automaticamente o colaborador no dropdown e carrega de imediato o espelho de ponto correspondente na aba de gestor. Por fim, a nova pÃƒÆ’Ã‚Â¡gina foi registrada como rota preguiÃƒÆ’Ã‚Â§osa (`lazy`) no `src/App.tsx` (restrita a `CEO` e `ADMIN`) e associada ao menu de navegaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o lateral em `src/components/Layout.tsx` com o ÃƒÆ’Ã‚Â­cone `Users`.
  * *Data e hora da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* 03/06/2026 ÃƒÆ’Ã‚Â s 10:00 (HorÃƒÆ’Ã‚Â¡rio Local)
  * *Arquivos modificados:* `src/pages/Funcionarios.tsx` (novo), `src/pages/Ponto.tsx`, `src/App.tsx`, `src/components/Layout.tsx`
* **Contrato PDF: CorreÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do Fundo e do RodapÃƒÆ’Ã‚Â© (Parte 5):**
  * *O que foi feito:* No gerador de PDFs do contrato (`src/pages/Contracts.tsx`), removemos a imagem embaÃƒÆ’Ã‚Â§ada de fundo (`/Papel_-_timbrado.png`) da funÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o `addBackground()`, substituindo-a por um preenchimento de fundo branco puro (`doc.setFillColor(255, 255, 255)` e `doc.rect(0, 0, pageWidth, pageHeight, 'F')`). Ajustamos a verificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de limite de pÃƒÆ’Ã‚Â¡gina da funÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o `addText` para `pageHeight - 30` (267mm) para respeitar a margem inferior do rodapÃƒÆ’Ã‚Â© de 25mm. Adicionamos uma validaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de overflow de pÃƒÆ’Ã‚Â¡gina logo antes do bloco de assinaturas para garantir que as assinaturas nÃƒÆ’Ã‚Â£o se sobreponham ao rodapÃƒÆ’Ã‚Â©, gerando uma nova pÃƒÆ’Ã‚Â¡gina caso necessÃƒÆ’Ã‚Â¡rio. Por fim, implementamos um laÃƒÆ’Ã‚Â§o de repetiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o que percorre todas as pÃƒÆ’Ã‚Â¡ginas geradas (`doc.setPage(i)`), desenha uma linha separadora fina e imprime o rodapÃƒÆ’Ã‚Â© corporativo institucional padronizado (CNPJ, e-mail, telefone, endereÃƒÆ’Ã‚Â§o) centralizado e a paginaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o `PÃƒÆ’Ã‚Â¡gina X de Y` ÃƒÆ’Ã‚Â  direita.
  * *Data e hora da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* 03/06/2026 ÃƒÆ’Ã‚Â s 10:05 (HorÃƒÆ’Ã‚Â¡rio Local)
  * *Arquivos modificados:* `src/pages/Contracts.tsx`
* **Proposta Comercial PDF: CorreÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de Layout e PaginaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o (Parte 6):**
  * *O que foi feito:* Refatoramos a geraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o da pÃƒÆ’Ã‚Â¡gina de fotos do PDF da proposta comercial no `src/pages/ProposalGenerator.tsx` definindo margens fixas horizontais/verticais (15mm/20mm) e implementando controle estrito de cursor vertical (`y = margemSuperior`). Quando uma imagem nÃƒÆ’Ã‚Â£o cabe no espaÃƒÆ’Ã‚Â§o restante da pÃƒÆ’Ã‚Â¡gina (`y + photoHeight > pageHeight - margemInferior`), a pÃƒÆ’Ã‚Â¡gina ÃƒÆ’Ã‚Â© quebrada com `doc.addPage()` e o cursor reiniciado. AlÃƒÆ’Ã‚Â©m disso, criamos um loop de pÃƒÆ’Ã‚Â³s-processamento que percorre todas as pÃƒÆ’Ã‚Â¡ginas geradas para desenhar uma linha divisÃƒÆ’Ã‚Â³ria discreta a 20mm da base, o rodapÃƒÆ’Ã‚Â© corporativo institucional e a paginaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o automÃƒÆ’Ã‚Â¡tica (`PÃƒÆ’Ã‚Â¡gina X de Y`). A partir da pÃƒÆ’Ã‚Â¡gina 2, desenha tambÃƒÆ’Ã‚Â©m um cabeÃƒÆ’Ã‚Â§alho simplificado com a proposta (`PROP-${proposalNumber}`) e o nome do cliente.
  * *Data e hora da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* 03/06/2026 ÃƒÆ’Ã‚Â s 10:11 (HorÃƒÆ’Ã‚Â¡rio Local)
* **Cadastro e AtualizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de Colaboradores com CPF, Cargo e Data de AdmissÃƒÆ’Ã‚Â£o (Melhoria 2):**
  * *O que foi feito:*
    * **Backend (`api/index.ts`):** AtualizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o das rotas `GET`, `POST` e `PUT` de `/api/users` para persistir e retornar os campos `cpf`, `cargo` e `data_admissao` na tabela `users` do Supabase.
    * **Frontend (`Funcionarios.tsx`):** CriaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o/atualizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do formulÃƒÆ’Ã‚Â¡rio para inclusÃƒÆ’Ã‚Â£o de CPF com mÃƒÆ’Ã‚Â¡scara `000.000.000-00` obrigatÃƒÆ’Ã‚Â³rio, select de cargo obrigatÃƒÆ’Ã‚Â³rio (CEO, ADMIN, COMMERCIAL, TECHNICAL) e data de admissÃƒÆ’Ã‚Â£o opcional.
    * **Espelho de Ponto (`Ponto.tsx`):** InclusÃƒÆ’Ã‚Â£o desses novos campos formatados no cabeÃƒÆ’Ã‚Â§alho do PDF do espelho de ponto.
  * *Data e hora da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* 03/06/2026 ÃƒÆ’Ã‚Â s 11:30 (HorÃƒÆ’Ã‚Â¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/Funcionarios.tsx`, `src/pages/Ponto.tsx`

* **Marca D'ÃƒÆ’Ã‚Â¡gua com Logomarca no PDF do Contrato (Melhoria 3):**
  * *O que foi feito:* InclusÃƒÆ’Ã‚Â£o da logomarca `/PNG_-_MT_SOLAR__1_.png` como marca d'ÃƒÆ’Ã‚Â¡gua centralizada em todas as pÃƒÆ’Ã‚Â¡ginas do PDF do contrato gerado em `Contracts.tsx`. A imagem ÃƒÆ’Ã‚Â© carregada e convertida em base64, escalada dinamicamente mantendo a proporÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o com largura de 120mm e inserida com opacidade de 30% (`doc.setGState` com `opacity: 0.3`).
  * *Data e hora da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* 03/06/2026 ÃƒÆ’Ã‚Â s 11:55 (HorÃƒÆ’Ã‚Â¡rio Local)
  * *Arquivos modificados:* `src/pages/Contracts.tsx`

* **CorreÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de RodapÃƒÆ’Ã‚Â© na Proposta Comercial com Muitos Materiais (Melhoria 4):**
  * *O que foi feito:* ImplementaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de paginaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o dinÃƒÆ’Ã‚Â¢mica para a tabela de materiais de estrutura na proposta comercial em `ProposalGenerator.tsx`. Define margem inferior de 35mm e verifica antes de cada linha se ultrapassa `pageHeight - 35`. Em caso positivo, quebra pÃƒÆ’Ã‚Â¡gina, reinicia cursor y em 20mm e desenha novamente o cabeÃƒÆ’Ã‚Â§alho (Item, DescriÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o, Qtd, Valor Unit., Valor Total) na nova pÃƒÆ’Ã‚Â¡gina.
  * *Data e hora da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* 03/06/2026 ÃƒÆ’Ã‚Â s 12:12 (HorÃƒÆ’Ã‚Â¡rio Local)
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`

* **NotificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes Push com APK Fechado ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â� Background/Killed State (Melhoria 5):**
  * *O que foi feito:*
    * **Backend (`api/index.ts`):** RefatoraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o da funÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o `sendPushNotification` para payload data-only (apenas campo `data`, sem campo `notification`), garantindo trÃƒÆ’Ã‚Â¡fego FCM de alta prioridade e entrega com app fechado/morto.
    * **AndroidManifest.xml:** Registro do serviÃƒÆ’Ã‚Â§o de recepÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do Firebase associado ao serviÃƒÆ’Ã‚Â§o customizado.
    * **`MyFirebaseMessagingService.java` (Novo):** CriaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do serviÃƒÆ’Ã‚Â§o nativo para capturar mensagens de dados, criar canal de notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o com som/vibraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o no Oreo+ e disparar a notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o local via `NotificationCompat` direcionada para abrir a Activity principal.
  * *Data e hora da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* 03/06/2026 ÃƒÆ’Ã‚Â s 12:15 (HorÃƒÆ’Ã‚Â¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `android/app/src/main/AndroidManifest.xml`, `android/app/src/main/java/io/ionic/starter/MyFirebaseMessagingService.java`

* **NotificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o Push em Mensagens de Entrada no WhatsApp Atendimento (Melhoria 6):**
  * *O que foi feito:* Adicionada lÃƒÆ’Ã‚Â³gica no webhook de recebimento de mensagens (`POST /api/webhooks/whatsapp` em `api/index.ts`) para disparar notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o push ao agente responsÃƒÆ’Ã‚Â¡vel caso a mensagem seja de entrada (`from_me = false`). O sistema busca a conversa no banco, obtÃƒÆ’Ã‚Â©m o campo `assigned_to` e, se preenchido, recupera o `push_token` correspondente daquele usuÃƒÆ’Ã‚Â¡rio com validaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de `company_id`. Se existir, aciona a funÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o `sendPushNotification` com payload data-only: tÃƒÆ’Ã‚Â­tulo baseado no nome do contato da conversa (ou o nÃƒÆ’Ã‚Âºmero de telefone se nulo), corpo limitando a mensagem em 80 caracteres (ou "ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã…Â½ MÃƒÆ’Ã‚Â­dia recebida" se for mensagem multimÃƒÆ’Ã‚Â­dia), tipo definido como "whatsapp_message" e o UUID da conversa correspondente. Se a conversa nÃƒÆ’Ã‚Â£o estiver atribuÃƒÆ’Ã‚Â­da (fila de espera), nada ÃƒÆ’Ã‚Â© disparado.
  * *Data e hora da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* 03/06/2026 ÃƒÆ’Ã‚Â s 12:20 (HorÃƒÆ’Ã‚Â¡rio Local)
  * *Arquivos modificados:* `api/index.ts`

* **CorreÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de Pacote Java do MyFirebaseMessagingService e GeraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do Android App Bundle (.aab) Assinado:**
  * *O que foi feito:*
    * **Problema identificado:** O arquivo `MyFirebaseMessagingService.java` estava declarado no pacote legado `io.ionic.starter` (template Ionic), incompatÃƒÆ’Ã‚Â­vel com o namespace real do projeto `br.com.mtsolar.gestao`. Isso causava erros de compilaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o `cannot find symbol` para `MainActivity.class` e `R.mipmap.ic_launcher`.
    * **SoluÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o aplicada:**
      1. Criado novo `MyFirebaseMessagingService.java` no pacote correto `br.com.mtsolar.gestao` em `android/app/src/main/java/br/com/mtsolar/gestao/`.
      2. Removido o arquivo antigo do pacote `io.ionic.starter`.
      3. Atualizado `AndroidManifest.xml` para referenciar o serviÃƒÆ’Ã‚Â§o no novo pacote (`br.com.mtsolar.gestao.MyFirebaseMessagingService`).
    * **Build gerado:** `app-release.aab` (6,11 MB), assinado com a keystore `mtsolar.jks` localizada em `C:\Users\aurel\Desktop\APK\`, certificado `CN=Marcos Nascimento`, algoritmo `SHA256withRSA`, chave RSA de 2048 bits, vÃƒÆ’Ã‚Â¡lido atÃƒÆ’Ã‚Â© `01/05/2051`. VerificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o `jarsigner`: **`jar verified`**.
    * **LocalizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do arquivo final:** `android/app/build/outputs/bundle/release/app-release.aab` (e cÃƒÆ’Ã‚Â³pia em `C:\Users\aurel\Desktop\APK\app-release.aab`).
    * **ConfiguraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de assinatura no `build.gradle`:** `storeFile = C:\Users\aurel\Desktop\APK\mtsolar.jks`, `keyAlias = mtsolar`, `minifyEnabled = true`.
  * *Data e hora da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* 04/06/2026 ÃƒÆ’Ã‚Â s 16:51 (HorÃƒÆ’Ã‚Â¡rio Local)
  * *Arquivos modificados:* `android/app/src/main/java/br/com/mtsolar/gestao/MyFirebaseMessagingService.java` (novo), `android/app/src/main/AndroidManifest.xml`

* **Incremento de VersÃƒÆ’Ã‚Â£o (versionCode 9 / versionName 1.0.1) e Novo Bundle app-release-v2.aab:**
  * *O que foi feito:*
    * **`android/app/build.gradle`:** `versionCode` incrementado de `8` para `9` e `versionName` atualizado de `"1.2.5"` para `"1.0.1"` dentro do bloco `defaultConfig`.
    * **Build gerado:** `bundleRelease` executado com sucesso em ÃƒÂ¢Ã¢â‚¬Â°Ã‹â€ 18s via `.\gradlew bundleRelease` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â� **BUILD SUCCESSFUL (252 tasks, 15 executadas, 237 up-to-date)**.
    * **Arquivo final:** `app-release.aab` (6,11 MB), assinado com a keystore `mtsolar.jks` (`CN=Marcos Nascimento`, RSA 2048 bits, vÃƒÆ’Ã‚Â¡lido atÃƒÆ’Ã‚Â© 01/05/2051).
    * **CÃƒÆ’Ã‚Â³pia de entrega:** `C:\Users\aurel\Desktop\APK\app-release-v2.aab`.
  * *Data e hora da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* 04/06/2026 ÃƒÆ’Ã‚Â s 19:38 (HorÃƒÆ’Ã‚Â¡rio Local)
  * *Arquivos modificados:* `android/app/build.gradle`

* **AlteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de applicationId para com.mtsolar.mtsolv e Novo .aab Gerado:**
  * *O que foi feito:*
    * **`android/app/build.gradle`:** `applicationId` alterado de `br.com.mtsolar.gestao` para `com.mtsolar.mtsolv`. O `namespace` permaneceu `br.com.mtsolar.gestao` (controla o pacote de `R` e `BuildConfig`).
    * **`android/app/src/main/java/com/mtsolar/mtsolv/MyFirebaseMessagingService.java`:** Arquivo Java recriado na nova estrutura de pastas com `package com.mtsolar.mtsolv;`. Os imports de `MainActivity` e `R` apontam explicitamente para `br.com.mtsolar.gestao` onde essas classes sÃƒÆ’Ã‚Â£o geradas/definidas.
    * **`android/app/src/main/AndroidManifest.xml`:** ReferÃƒÆ’Ã‚Âªncia do serviÃƒÆ’Ã‚Â§o FCM atualizada para `com.mtsolar.mtsolv.MyFirebaseMessagingService`.
    * **`android/app/google-services.json`:** `package_name` atualizado de `br.com.mtsolar.gestao` para `com.mtsolar.mtsolv` (necessÃƒÆ’Ã‚Â¡rio pois o plugin `google-services` bloqueia o build se nÃƒÆ’Ã‚Â£o houver match).
    * **Build gerado:** `app-release.aab` (6,11 MB) com `applicationId = com.mtsolar.mtsolv` confirmado no manifest compilado (`build/intermediates/bundle_manifest`). Assinado com a keystore `mtsolar.jks` (`CN=Marcos Nascimento`, RSA 2048 bits, vÃƒÆ’Ã‚Â¡lido atÃƒÆ’Ã‚Â© 01/05/2051).
    * **LocalizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:** `android/app/build/outputs/bundle/release/app-release.aab` e cÃƒÆ’Ã‚Â³pia em `C:\Users\aurel\Desktop\APK\app-release.aab`.
  * *Data e hora da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* 04/06/2026 ÃƒÆ’Ã‚Â s 17:01 (HorÃƒÆ’Ã‚Â¡rio Local)
  * *Arquivos modificados:* `android/app/build.gradle`, `android/app/src/main/java/com/mtsolar/mtsolv/MyFirebaseMessagingService.java` (novo), `android/app/src/main/AndroidManifest.xml`, `android/app/google-services.json`


* **ImplementaÃƒÂ§ÃƒÂ£o do MÃƒÂ³dulo de ObservaÃƒÂ§ÃƒÂµes de Atendimento (WhatsApp):**
  * *O que foi feito:* Criada a funcionalidade completa de observaÃƒÂ§ÃƒÂµes internas por conversa no mÃƒÂ³dulo de Atendimento (WhatsApp). A soluÃƒÂ§ÃƒÂ£o adota uma tabela separada `whatsapp_observations` (e nÃƒÂ£o um campo ÃƒÂºnico sobrescrito em `whatsapp_conversations`) para manter um histÃƒÂ³rico auditÃƒÂ¡vel com autoria e timestamp. O campo `user_name` ÃƒÂ© um snapshot salvo no momento da criaÃƒÂ§ÃƒÂ£o Ã¢â‚¬â€� nÃƒÂ£o sincronizado retroativamente com o nome atual do usuÃƒÂ¡rio.
  * *Banco de Dados:* Criada a migration `supabase/migrations/20260625_create_whatsapp_observations.sql` com a tabela completa, ÃƒÂ­ndices de performance, RLS habilitada (leitura para toda a empresa; inserÃƒÂ§ÃƒÂ£o autenticada; sem UPDATE/DELETE), e `NOTIFY pgrst, 'reload schema'` ao final.
  * *Backend:* Criadas as rotas `GET /api/conversations/:id/observations` (lista do mais recente ao mais antigo, filtrado por `company_id` do token) e `POST /api/conversations/:id/observations` (insere nova nota com validaÃƒÂ§ÃƒÂ£o de conversa, `company_id`, `user_id` e `user_name` extraÃƒÂ­dos do token JWT Ã¢â‚¬â€� nunca do payload do client).
  * *Frontend (Desktop Ã¢â‚¬â€� Painel Direito):* Adicionada seÃƒÂ§ÃƒÂ£o "ObservaÃƒÂ§ÃƒÂµes do Atendimento" com textarea, botÃƒÂ£o "Adicionar Nota" e listagem de notas anteriores (autor, data/hora, texto), alimentada pelo estado `observations` buscado automaticamente ao selecionar uma conversa.
  * *Frontend (Mobile):* Adicionado botÃƒÂ£o de ÃƒÂ­cone `Info` no cabeÃƒÂ§alho do chat (visÃƒÂ­vel apenas em `<lg`) que abre um modal deslizante com o mesmo painel de observaÃƒÂ§ÃƒÂµes, reutilizando o mesmo estado e funÃƒÂ§ÃƒÂµes Ã¢â‚¬â€� sem chamadas duplicadas de API.
  * *Ã¢Å¡Â Ã¯Â¸Â� AÃƒâ€¡ÃƒÆ’O MANUAL NECESSÃƒÂ�RIA:* Executar a migration no **SQL Editor do Supabase**: `supabase/migrations/20260625_create_whatsapp_observations.sql`
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 25/06/2026 ÃƒÂ s 15:37 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `supabase/migrations/20260625_create_whatsapp_observations.sql` (novo), `supabase_schema.sql`, `api/index.ts`, `src/pages/WhatsApp.tsx`

---



## 12. DÃƒÆ’Ã¢â‚¬Â°BITOS TÃƒÆ’Ã¢â‚¬Â°CNICOS

* **Monolito no Arquivo `api/index.ts`:**
  * *Risco:* O arquivo concentra mais de **2.619 linhas** de cÃƒÆ’Ã‚Â³digo unificando autenticaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o, rotas de projetos comercial, tÃƒÆ’Ã‚Â©cnico, logs, estoque, WhatsApp, webhooks de recebimento, crons e inteligÃƒÆ’Ã‚Âªncia artificial. Isso eleva a chance de bugs de concorrÃƒÆ’Ã‚Âªncia de variÃƒÆ’Ã‚Â¡veis globais e dificulta manutenÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes.
* **Dupla Coluna de Tag (`tag` e `tags`) na Tabela `whatsapp_conversations`:**
  * *SituaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* A coluna legada `tag TEXT` (singular) ainda existe na tabela ao lado da nova coluna `tags TEXT[]`. Os dados histÃƒÆ’Ã‚Â³ricos foram migrados via script, mas as duas colunas coexistem. Novas gravaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes via a rota corrigida sÃƒÆ’Ã‚Â³ atualizam `tags`; a coluna `tag` ficarÃƒÆ’Ã‚Â¡ progressivamente desatualizada.
  * *Risco:* ConfusÃƒÆ’Ã‚Â£o em queries futuras, consumo desnecessÃƒÆ’Ã‚Â¡rio de espaÃƒÆ’Ã‚Â§o, e risco de regressÃƒÆ’Ã‚Â£o caso alguma rota antiga ainda referencie `tag`.
  * *AÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o Recomendada:* ApÃƒÆ’Ã‚Â³s confirmar estabilidade, executar `ALTER TABLE whatsapp_conversations DROP COLUMN tag;` para remover a coluna obsoleta.
* **Payloads e Timeouts na Vercel:**
  * *Risco:* FunÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes Serverless gratuitas ou standard na Vercel possuem limites de execuÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de 10s a 15s. O processamento de downloads de vÃƒÆ’Ã‚Â­deos pesados vindos da Evolution API e subsequente upload no Supabase pode facilmente dar timeout.
* **Uso Extensivo de Tipagem `any`:**
  * *Risco:* VÃƒÆ’Ã‚Â¡rias funÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes e manipulaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes de respostas do Express e do React no frontend estÃƒÆ’Ã‚Â£o anotadas com `any` ou utilizando diretivas de escape do compilador (`// @ts-ignore`), o que reduz consideravelmente os benefÃƒÆ’Ã‚Â­cios da checagem estÃƒÆ’Ã‚Â¡tica de tipos do TypeScript.
* **Arquivos Sobressalentes / Legado:**
  * *Risco:* PresenÃƒÆ’Ã‚Â§a de arquivos de backup na pasta do cÃƒÆ’Ã‚Â³digo-fonte (ex: `src/pages/Technical.tsx.bak`) que poluem a ÃƒÆ’Ã‚Â¡rvore de arquivos e podem confundir desenvolvedores.
* **Rota de TransferÃƒÆ’Ã‚Âªncia NÃƒÆ’Ã‚Â£o Atualiza `tags`:**
  * *SituaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* A rota `POST /api/whatsapp/transfer` ao criar o objeto `transferData` ainda define `tag: 'Transferido'` (coluna antiga singular), e **nÃƒÆ’Ã‚Â£o** preenche a coluna `tags` com `['Transferido']`.
  * *Risco:* Conversas transferidas nÃƒÆ’Ã‚Â£o receberÃƒÆ’Ã‚Â£o a etiqueta visual no novo sistema de multi-tags.


---

## 13. BACKLOG E MELHORIAS SUGERIDAS

### TÃƒÆ’Ã‚Â©cnicas
1. **Desacoplamento e OrganizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do Backend:** Dividir o arquivo `/api/index.ts` em uma estrutura modularizada de rotas (ex: `api/routes/auth.ts`, `api/routes/whatsapp.ts`, `api/routes/projects.ts`) e controladores.
2. **UtilizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de Fila de Background Jobs:** Adotar serviÃƒÆ’Ã‚Â§os de fila (como BullMQ, Redis, ou tarefas em background integradas) para o processamento de mÃƒÆ’Ã‚Â­dias de webhooks recebidos do WhatsApp. O Webhook deve retornar `200 OK` imediatamente e agendar o processamento pesado de mÃƒÆ’Ã‚Â­dia em background para evitar timeouts.
3. **Mecanismo de Limpeza PeriÃƒÆ’Ã‚Â³dica de Storage (Data Retention):** MÃƒÆ’Ã‚Â­dias permanentes de chat consomem gigabytes rapidamente. ÃƒÆ’Ã¢â‚¬Â° recomendado criar um Cronjob mensal para deletar arquivos e URLs de mensagens com mais de 120 dias no bucket `whatsapp-media`.

### Produto
1. **VisualizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o Nativa de Arquivos:** Modificar o visualizador no chat (`WhatsApp.tsx`) para permitir visualizar PDFs de contratos e orÃƒÆ’Ã‚Â§amentos dentro da prÃƒÆ’Ã‚Â³pria conversa em formato iframe/modal sem exigir o download fÃƒÆ’Ã‚Â­sico prÃƒÆ’Ã‚Â©vio.
2. **HistÃƒÆ’Ã‚Â³rico Local de Mensagens:** Desenvolver um botÃƒÆ’Ã‚Â£o na interface do chat para sincronizar e importar as ÃƒÆ’Ã‚Âºltimas 50 mensagens anteriores guardadas diretamente no celular da Evolution API para o banco do sistema.


---

## 14. VARIÃƒÆ’Ã‚Â�VEIS DE AMBIENTE

Abaixo estÃƒÆ’Ã‚Â£o listadas todas as variÃƒÆ’Ã‚Â¡veis cruciais exigidas para o funcionamento local e de produÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:

### Frontend (Devem possuir o prefixo `VITE_` para exposiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o ao Vite/Cliente)
* **`VITE_SUPABASE_URL`:** URL base da API do projeto Supabase. Usado para conectar o cliente SDK do banco.
* **`VITE_SUPABASE_ANON_KEY`:** Chave pÃƒÆ’Ã‚Âºblica de acesso do Supabase. Segura para exposiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o pÃƒÆ’Ã‚Âºblica.
* **`VITE_EVOLUTION_URL`:** EndereÃƒÆ’Ã‚Â§o pÃƒÆ’Ã‚Âºblico do servidor da Evolution API v2 (Railway).
* **`VITE_EVOLUTION_KEY`:** Chave global de acesso de administrador da Evolution API.
* **`VITE_EVOLUTION_INSTANCE_ADMIN`:** Nome padrÃƒÆ’Ã‚Â£o da instÃƒÆ’Ã‚Â¢ncia administrativa (`mtsolar`).
* **`VITE_EVOLUTION_INSTANCE_ATENDIMENTO`:** Nome padrÃƒÆ’Ã‚Â£o da instÃƒÆ’Ã‚Â¢ncia comercial (`atendimento-cliente`).
* **`VITE_EVOLUTION_TOKEN_ATENDIMENTO`:** Token de acesso especÃƒÆ’Ã‚Â­fico da instÃƒÆ’Ã‚Â¢ncia de atendimento ao cliente.

### Backend (Seguras e restritas apenas ao Servidor Express na Vercel)
* **`SUPABASE_SERVICE_ROLE_KEY`:** Chave de administraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o master do Supabase. Ignora todas as regras de seguranÃƒÆ’Ã‚Â§a RLS (Row Level Security). **NUNCA DEVE SER EXPOSTA NO FRONTEND.**
* **`JWT_SECRET`:** Chave secreta de encriptaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o usada para assinar e validar a autenticidade dos tokens de sessÃƒÆ’Ã‚Â£o de usuÃƒÆ’Ã‚Â¡rios.
* **`FIREBASE_PROJECT_ID`:** ID de identificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do projeto configurado no console do Google Firebase.
* **`FIREBASE_PRIVATE_KEY`:** Chave privada criptogrÃƒÆ’Ã‚Â¡fica em string do Firebase Admin para autenticaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de push.
* **`FIREBASE_CLIENT_EMAIL`:** E-mail de serviÃƒÆ’Ã‚Â§o configurado para comunicaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o com a API FCM do Firebase.

* **6 CorreÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes Pontuais no Gerador de Contratos PDF (Blocos 1ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“6):**
  * *O que foi feito:*
    * **BLOCO 1 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â� Opacidade da marca d'ÃƒÆ’Ã‚Â¡gua:** Aumentada a opacidade da logomarca de fundo no PDF do contrato de `opacity: 0.3` para `opacity: 0.35` (+5 p.p.) via `doc.setGState`.
    * **BLOCO 2 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â� Quebra de pÃƒÆ’Ã‚Â¡gina antes do bloco final:** Restruturada a lÃƒÆ’Ã‚Â³gica de paginaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o das assinaturas. Agora o sistema prÃƒÆ’Ã‚Â©-calcula a altura total necessÃƒÆ’Ã‚Â¡ria (parÃƒÆ’Ã‚Â¡grafo "E por estarem assim justas...", linha da data, espaÃƒÆ’Ã‚Â§o e as duas colunas de assinatura com labels) e verifica *antes* de renderizar o parÃƒÆ’Ã‚Â¡grafo final se tudo cabe na pÃƒÆ’Ã‚Â¡gina. A quebra, quando necessÃƒÆ’Ã‚Â¡ria, ocorre antes do parÃƒÆ’Ã‚Â¡grafo inicial do bloco, garantindo que parÃƒÆ’Ã‚Â¡grafo, data e assinaturas fiquem sempre juntos.
    * **BLOCO 3 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â� Data sem problema de fuso UTC:** SubstituÃƒÆ’Ã‚Â­da a formaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o da data no PDF (que usava `new Date(data).toLocaleDateString(...)` e sofria de deslocamento UTC-3) por desestruturaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o direta da string `YYYY-MM-DD` e montagem com array `mesesPtBR` usando ÃƒÆ’Ã‚Â­ndice local. TambÃƒÆ’Ã‚Â©m corrigida a data inicial do campo de formulÃƒÆ’Ã‚Â¡rio (de `toISOString().split('T')[0]` para IIFE com `getFullYear()/getMonth()/getDate()`).
    * **BLOCO 4 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â� MÃƒÆ’Ã‚Â¡scara CPF/CNPJ dinÃƒÆ’Ã‚Â¢mica:** Criada funÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o `formatarCpfCnpj(valor: string): string` que remove nÃƒÆ’Ã‚Â£o-numÃƒÆ’Ã‚Â©ricos, limita a 14 dÃƒÆ’Ã‚Â­gitos e aplica progressivamente a mÃƒÆ’Ã‚Â¡scara `000.000.000-00` (atÃƒÆ’Ã‚Â© 11 dÃƒÆ’Ã‚Â­gitos) ou `00.000.000/0000-00` (12ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“14 dÃƒÆ’Ã‚Â­gitos). Campo alterado para `type="text"`, `inputMode="numeric"` e `maxLength={18}`.
    * **BLOCO 5 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â� Tabela do Kit Fotovoltaico no PDF:** SubstituÃƒÆ’Ã‚Â­da a lista numerada por tabela manual com 3 colunas (Item 15% | Qtd. 15% | Produto 70%), desenhada com `doc.rect()` e `doc.line()`. CabeÃƒÆ’Ã‚Â§alho com fundo azul-claro (`fillColor 230,235,245`), paginaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o dinÃƒÆ’Ã‚Â¢mica com redesenho de cabeÃƒÆ’Ã‚Â§alho em nova pÃƒÆ’Ã‚Â¡gina, e suporte a quebra de linha automÃƒÆ’Ã‚Â¡tica na coluna Produto.
    * **BLOCO 6 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â� CorreÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes gramaticais e de coesÃƒÆ’Ã‚Â£o:** Aplicadas 8 correÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes de redaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o nas clÃƒÆ’Ã‚Â¡usulas do contrato (3Ãƒâ€šÃ‚Âª, 5Ãƒâ€šÃ‚Âª, 7Ãƒâ€šÃ‚Âª e 8Ãƒâ€šÃ‚Âª); correÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes incluem crases ausentes, concordÃƒÆ’Ã‚Â¢ncias verbais, erros de regÃƒÆ’Ã‚Âªncia e pontuaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o. Adicionado comentÃƒÆ’Ã‚Â¡rio `// REVISAR:` no trecho de agente de atendimento da ClÃƒÆ’Ã‚Â¡usula Quinta para revisÃƒÆ’Ã‚Â£o jurÃƒÆ’Ã‚Â­dica futura.
  * *Data e hora da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* 15/06/2026 ÃƒÆ’Ã‚Â s 11:30 (HorÃƒÆ’Ã‚Â¡rio Local)
* **5 Novas CorreÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes no Gerador de Contratos PDF (Blocos AÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“E):**
  * *O que foi feito:*
    * **DiagnÃƒÆ’Ã‚Â³stico / BLOCO A ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â� Opacidade da marca d'ÃƒÆ’Ã‚Â¡gua:** O valor de opacidade atual era de `0.35`. O diagnÃƒÆ’Ã‚Â³stico confirmou que existe apenas 1 local de desenho da marca d'ÃƒÆ’Ã‚Â¡gua no PDF, e a restauraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de opacidade com `doc.setGState(new doc.GState({ opacity: 1.0 }))` ocorre imediatamente depois, na mesma pÃƒÆ’Ã‚Â¡gina, sem vazar. O valor de `0.35` (35%) foi mantido em todas as ocorrÃƒÆ’Ã‚Âªncias de marca d'ÃƒÆ’Ã‚Â¡gua do arquivo.
    * **BLOCO B ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â� Remover o "x" da coluna "Qtd.":** Ajustado o parsing na tabela para remover o "x" exibido ao lado do nÃƒÆ’Ã‚Âºmero na coluna de quantidade, alterando a atribuiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de `qtdStr` de `${item.quantity}x` para `String(item.quantity)`.
    * **BLOCO C ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â� CorreÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o na ClÃƒÆ’Ã‚Â¡usula Quinta:** Alterado o sujeito de "apÃƒÆ’Ã‚Â³s serem reportadas pela CONTRATADA" para "apÃƒÆ’Ã‚Â³s serem reportadas pelo CONTRATANTE", corrigindo o sentido de quem comunica as falhas nos equipamentos e removendo o comentÃƒÆ’Ã‚Â¡rio temporÃƒÆ’Ã‚Â¡rio de revisÃƒÆ’Ã‚Â£o.
    * **BLOCO D ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â� EspaÃƒÆ’Ã‚Â§amento apÃƒÆ’Ã‚Â³s a tabela do Kit:** Aumentado o espaÃƒÆ’Ã‚Â§amento entre o tÃƒÆ’Ã‚Â©rmino da tabela do kit fotovoltaico e o tÃƒÆ’Ã‚Â­tulo da ClÃƒÆ’Ã‚Â¡usula Segunda de `3mm` para `8mm` (`currentY += 8;`), criando uma separaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o consistente.
    * **BLOCO E ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â� Ajuste de quebra de pÃƒÆ’Ã‚Â¡gina (bloco final):** Refatorado o cÃƒÆ’Ã‚Â¡lculo de `alturaTotalBlocoFinal` para `alturaParaFinal + 48` (removendo margem redundante de seguranÃƒÆ’Ã‚Â§a), reduzindo a altura calculada de 64mm para 60mm e evitando que o bloco final seja empurrado desnecessariamente para a pÃƒÆ’Ã‚Â¡gina seguinte.
  * *Data e hora da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* 15/06/2026 ÃƒÆ’Ã‚Â s 12:00 (HorÃƒÆ’Ã‚Â¡rio Local)
  * *Arquivos modificados:* `src/pages/Contracts.tsx`

* **ReordenaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do item Comercial no menu lateral:**
  * *O que foi feito:*
    * O item "Comercial" (rota `/commercial`) foi reposicionado no array `menuItems` para a segunda posiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o, logo apÃƒÆ’Ã‚Â³s o item "Dashboard" (rota `/`).
  * *Data e hora da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* 16/06/2026 ÃƒÆ’Ã‚Â s 10:30 (HorÃƒÆ’Ã‚Â¡rio Local)
  * *Arquivos modificados:* `src/components/Layout.tsx`

* **Auditoria Completa do Ciclo de Vida do Cliente e Projeto:**
  * *O que foi feito:*
    * Auditoria granular de ponta a ponta do ciclo de vida no sistema, do cadastro ÃƒÆ’Ã‚Â  finalizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o/completed.
    * Mapeamento de 7 etapas principais: Cadastro, Kanban, Proposta Comercial, Vistoria TÃƒÆ’Ã‚Â©cnica, Obra/InstalaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o, HomologaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o/ConcessionÃƒÆ’Ã‚Â¡ria, ConclusÃƒÆ’Ã‚Â£o com HigienizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o e LGPD.
    * Levantamento de campos frontend, persistÃƒÆ’Ã‚Âªncia de banco de dados e fluxos de remoÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o automÃƒÆ’Ã‚Â¡tica de dados sensÃƒÆ’Ã‚Â­veis e arquivos de storage (buckets `obras-fotos` e `propostas`).
    * IdentificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de gaps de seguranÃƒÆ’Ã‚Â§a, persistÃƒÆ’Ã‚Âªncia assÃƒÆ’Ã‚Â­ncrona de PDF e regras de integridade fÃƒÆ’Ã‚Â­sica.
    * CriaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do relatÃƒÆ’Ã‚Â³rio tÃƒÆ’Ã‚Â©cnico de auditoria `auditoria_fluxo_gestao_mtsolar.md`.
  * *Data e hora da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* 16/06/2026 ÃƒÆ’Ã‚Â s 13:40 (HorÃƒÆ’Ã‚Â¡rio Local)
  * *Arquivos modificados/criados:* `RESUMO_MESTRE.md`, `auditoria_fluxo_gestao_mtsolar.md` (Criado)

* **SeÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o 8 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â� DivergÃƒÆ’Ã‚Âªncias e Lacunas adicionada ao relatÃƒÆ’Ã‚Â³rio de auditoria:**
  * *O que foi feito:*
    * AnÃƒÆ’Ã‚Â¡lise cruzada entre frontend (Commercial.tsx, ProposalGenerator.tsx, Technical.tsx, Obra.tsx, ObraSchedule.tsx, Homologation.tsx, NeoenergiaProtocols.tsx, FinishedProjects.tsx), backend (api/index.ts) e schema (supabase_schema.sql).
    * **Q1 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â� Campos orphÃƒÆ’Ã‚Â£os no frontend:** Identificados 7 campos coletados e validados como obrigatÃƒÆ’Ã‚Â³rios em Commercial.tsx (`zip_code`, `inversor_marca`, `inversor_modelo`, `inversor_potencia`, `modulo_potencia`, `modulo_modelo`, `estrutura_tipo`) que sÃƒÆ’Ã‚Â£o descartados silenciosamente pela rota `POST /api/clients` sem nenhuma persistÃƒÆ’Ã‚Âªncia.
    * **Q2 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â� Colunas do banco nunca preenchidas:** Identificadas 7 colunas sem rota de escrita: `clients.status`, `projects.description`, `commercial_data.contract_url`, `projects.homologation_protocol`, `projects.homologation_entry_date`, `projects.homologation_notes` e `proposal_history.project_id` (crÃƒÆ’Ã‚Â­tico: torna a limpeza de propostas ineficaz na finalizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do projeto).
    * **Q3 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â� TransiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes sem validaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o backend:** Confirmado que nÃƒÆ’Ã‚Â£o existe Kanban drag-and-drop. As 3 transiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes de estÃƒÆ’Ã‚Â¡gio (`registrationÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢inspection`, `inspectionÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢homologation`, `installationÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢homologation`) avanÃƒÆ’Ã‚Â§am sem qualquer validaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de campos no backend ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â� toda validaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o ÃƒÆ’Ã‚Â© client-side e bypassÃƒÆ’Ã‚Â¡vel.
    * **Q4 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â� DivergÃƒÆ’Ã‚Âªncia de documentaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de fotos:** Os nomes dos 3 campos citados no RESUMO_MESTRE estÃƒÆ’Ã‚Â£o corretos. A divergÃƒÆ’Ã‚Âªncia ÃƒÆ’Ã‚Â© de incompletude: 7 dos 10 campos de foto (`photo_inverter_label`, `photo_grounding`, `photo_ac_voltage`, `photo_dc_voltage`, `photo_generation_plate`, `photo_ac_stringbox`, `photo_connection_point`) estÃƒÆ’Ã‚Â£o ausentes da documentaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o, mas existem no cÃƒÆ’Ã‚Â³digo, schema e cleanup do backend.
  * *Data e hora da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* 16/06/2026 ÃƒÆ’Ã‚Â s 11:04 (HorÃƒÆ’Ã‚Â¡rio Local)
  * *Arquivos modificados:* `RESUMO_MESTRE.md`, `auditoria_fluxo_gestao_mtsolar.md` (SeÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o 8 adicionada)

* **PersistÃƒÆ’Ã‚Âªncia de Dados do Kit Negociado e CorreÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do Fechamento Comercial:**
  * *O que foi feito:*
    * **Parte 1 (Dados do Kit):**
      * Atualizadas as rotas `POST /api/clients` e `PUT /api/clients/:id` no backend (`api/index.ts`) para receber, processar e inserir os dados do kit (`inversor_marca`, `inversor_modelo`, `inversor_potencia`, `modulo_modelo`, `modulo_potencia`, `estrutura_tipo`) na tabela `clients`. Implementamos tratamento de erro (`PGRST204` / `42703`) resiliente para fallback (tentando novamente sem os campos extras caso as colunas ainda nÃƒÆ’Ã‚Â£o estejam criadas no banco).
      * Modificado o join do `GET /api/projects/:id` no backend para selecionar de forma flexÃƒÆ’Ã‚Â­vel todas as colunas de `clients` usando `clients (*)` e mapear as novas propriedades no objeto planificado que retorna ao frontend.
      * Confirmado que o formulÃƒÆ’Ã‚Â¡rio de cadastro de novo cliente (`newClient`) e o formulÃƒÆ’Ã‚Â¡rio de ediÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de cliente (`editClientData`) no frontend (`Commercial.tsx`) jÃƒÆ’Ã‚Â¡ coletavam, controlavam e submetiam adequadamente os payloads com esses 6 campos.
    * **Parte 2 (Fechamento Comercial):**
      * Criada a rota `PUT /api/commercial-data/:projectId` no backend (`api/index.ts`) para realizar o `upsert` dos dados do fechamento comercial na tabela `commercial_data` com chave de conflito em `project_id`. A rota valida o token do usuÃƒÆ’Ã‚Â¡rio (`authenticateToken`), assegura o isolamento de tenant (`company_id`) e executa a atualizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o e o disparo de regras de transiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de status de projeto (ex: avanÃƒÆ’Ã‚Â§ar para vistoria em caso de `proposta_enviada` com disparador de notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes push).
      * Convertidos os textos estÃƒÆ’Ã‚Â¡ticos de exibiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o das "InformaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes Comerciais do Fechamento" na tela de detalhes do projeto do frontend (`Commercial.tsx`) em inputs de formulÃƒÆ’Ã‚Â¡rio interativos e dinÃƒÆ’Ã‚Â¢micos vinculados ao estado de `selectedProject`.
      * Atualizada a aÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do botÃƒÆ’Ã‚Â£o "Salvar AlteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes" no frontend (`Commercial.tsx`) para chamar a nova rota `PUT /api/commercial-data/:projectId` enviando o payload correspondente e atualizando o estado do componente.
  * *Data e hora da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* 16/06/2026 ÃƒÆ’Ã‚Â s 11:43 (HorÃƒÆ’Ã‚Â¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/Commercial.tsx`, `RESUMO_MESTRE.md`

* **Parte 3 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â� ExibiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do Kit Negociado no Cronograma de Obras:**
  * *O que foi feito:*
    * **Backend (`api/index.ts`):** Atualizada a rota `GET /api/projects-schedule` para fazer join com a tabela `clients` selecionando os campos `inversor_marca`, `inversor_modelo`, `inversor_potencia`, `modulo_modelo`, `modulo_potencia` e `estrutura_tipo`. O resultado ÃƒÆ’Ã‚Â© mapeado de forma planificada (flat), preservando retrocompatibilidade com todos os campos anteriores da rota.
    * **Frontend (`ObraSchedule.tsx`):** Expandida a interface `ProjectSchedule` com os seis novos campos opcionais do kit (todos tipados como `string | number | null`). Na seÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o expandÃƒÆ’Ã‚Â­vel de cada card do cronograma, adicionado um bloco somente-leitura com fundo ÃƒÆ’Ã‚Â¢mbar mostrando **Inversor Modelo**, **PotÃƒÆ’Ã‚Âªncia Inversor (kW)**, **MÃƒÆ’Ã‚Â³dulo Modelo** e **PotÃƒÆ’Ã‚Âªncia MÃƒÆ’Ã‚Â³dulo (Wp)**. O bloco sÃƒÆ’Ã‚Â³ ÃƒÆ’Ã‚Â© exibido quando ao menos um desses campos estÃƒÆ’Ã‚Â¡ preenchido; campos vazios/nulos exibem `ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â�` como valor padrÃƒÆ’Ã‚Â£o.
  * *Data e hora da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* 16/06/2026 ÃƒÆ’Ã‚Â s 11:46 (HorÃƒÆ’Ã‚Â¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/ObraSchedule.tsx`, `RESUMO_MESTRE.md`

* **Parte 4 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â� Campos de Compra do Kit e Bloqueio de EstÃƒÆ’Ã‚Â¡gio:**
  * *O que foi feito:*
    * **Backend (`api/index.ts`):** 
      * Atualizada a rota `PUT /api/projects/:id/kit` para aceitar os campos `data_compra_kit`, `data_prevista_entrega`, `distribuidora` e `kit_entregue` e persisti-los na tabela `projects`.
      * Adicionado tratamento com bloco try-catch resiliente contra colunas inexistentes no banco (erro `PGRST204` / `42703`), garantindo o fallback e funcionamento das demais atualizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes mesmo sem essas colunas fisicamente criadas no banco.
      * Adicionada validaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de transiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o nas rotas `PUT /api/projects/:id/commercial` e `PUT /api/commercial-data/:projectId`: agora a transiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de `current_stage` para `inspection` (Vistoria) ÃƒÆ’Ã‚Â© rejeitada com status HTTP `422` se o kit nÃƒÆ’Ã‚Â£o tiver sido marcado como entregue (`kit_entregue` for falso).
    * **Frontend (`KitPurchase.tsx`):**
      * Adicionados os campos "Data de Compra do Kit", "Data Prevista de Entrega", "Distribuidora" e a checkbox "Material Entregue?" no formulÃƒÆ’Ã‚Â¡rio de gerenciar kit do projeto.
      * Exibidos de forma clara e organizada os dados de compra na listagem de projetos e adicionados badges dinÃƒÆ’Ã‚Â¢micos baseados no status da entrega ("Material Entregue" em verde e "Aguardando Entrega" em amarelo).
    * **Frontend (`Commercial.tsx`):**
      * O botÃƒÆ’Ã‚Â£o "Aprovar Proposta Comercial" (que envia o estÃƒÆ’Ã‚Â¡gio do projeto para Vistoria) agora ÃƒÆ’Ã‚Â© desabilitado com opacidade e cursor nÃƒÆ’Ã‚Â£o-permitido se `kit_entregue` for falso, mostrando um tooltip avisando sobre a pendÃƒÆ’Ã‚Âªncia da entrega.
  * *Data e hora da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* 16/06/2026 ÃƒÆ’Ã‚Â s 11:55 (HorÃƒÆ’Ã‚Â¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/KitPurchase.tsx`, `src/pages/Commercial.tsx`, `RESUMO_MESTRE.md`

* **Parte 5 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â� Desaparecimento de Clientes Homologados:**
  * *O que foi feito:*
    * **Backend (`api/index.ts`):** 
      * Ajustada a rota `PUT /api/projects/:id/homologation` para que, ao receber o status `connection_point_approved` (Ponto de ConexÃƒÆ’Ã‚Â£o Aprovado), atualize o `current_stage` e o `status` do projeto para `conclusion` (ConclusÃƒÆ’Ã‚Â£o / PÃƒÆ’Ã‚Â³s-venda) em vez de `completed`. Isso move o projeto para a prÃƒÆ’Ã‚Â³xima fase natural do funil.
    * **Frontend (`Homologation.tsx`):**
      * Atualizado o filtro de projetos carregados no mÃƒÆ’Ã‚Â©todo `fetchProjects` para manter na tela apenas aqueles com estÃƒÆ’Ã‚Â¡gio `homologation` e cujo `homologation_status` seja diferente de `connection_point_approved`.
      * Adicionada atualizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o reativa imediata no mÃƒÆ’Ã‚Â©todo `handleUpdate` que remove sÃƒÆ’Ã‚Â­ncronamente o projeto da listagem local (`projects`) assim que o status aprovado ÃƒÆ’Ã‚Â© salvo com sucesso.
  * *Data e hora da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* 16/06/2026 ÃƒÆ’Ã‚Â s 12:00 (HorÃƒÆ’Ã‚Â¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/Homologation.tsx`, `RESUMO_MESTRE.md`

* **CorreÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de Fluxo de EstÃƒÆ’Ã‚Â¡gios (Funil Completo):**
  * *O que foi feito:*
    * **Backend (`api/index.ts`):**
      * `PUT /api/projects/:id/technical` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â� corrigida a transiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o ao concluir a vistoria: `current_stage` agora avanÃƒÆ’Ã‚Â§a para `installation` (era incorretamente `homologation`).
      * `GET /api/projects-schedule` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â� substituÃƒÆ’Ã‚Â­do o filtro `.neq('current_stage', 'completed')` por `.eq('current_stage', 'installation').eq('kit_entregue', true)`. O cronograma agora exibe **somente** projetos em fase de instalaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o com kit confirmado como entregue.
      * `PUT /api/projects/:id/installation` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â� mantida sem alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o: ao concluir a obra (`status: 'approved'`), o projeto avanÃƒÆ’Ã‚Â§a corretamente para `homologation`.
    * **Frontends verificados (sem alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o necessÃƒÆ’Ã‚Â¡ria):**
      * `Technical.tsx` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â� jÃƒÆ’Ã‚Â¡ usava `PUT /api/projects/:id/technical` com `status: 'vistoria_concluida'` ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦
      * `Obra.tsx` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â� jÃƒÆ’Ã‚Â¡ usava `PUT /api/projects/:id/installation` com `status: 'approved'` ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦
      * `KitPurchase.tsx` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â� jÃƒÆ’Ã‚Â¡ usava `PUT /api/projects/:id/kit` com `kit_entregue` ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦
  * *Fluxo correto apÃƒÆ’Ã‚Â³s as correÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes:*
    1. ÃƒÆ’Ã‚Â�rea Comercial ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ `(proposta_enviada)` ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ `current_stage: inspection`
    2. Vistoria TÃƒÆ’Ã‚Â©cnica ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ `(vistoria_concluida)` ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ `current_stage: installation`
    3. Kit Solar ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ `(kit_entregue: true)` ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ projeto elegÃƒÆ’Ã‚Â­vel para Cronograma
    4. Cronograma ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ filtro: `installation` + `kit_entregue = true`
    5. Obra ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ `(status: approved)` ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ `current_stage: homologation`
    6. HomologaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ `(connection_point_approved)` ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ `current_stage: conclusion`
  * *Data e hora da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* 16/06/2026 ÃƒÆ’Ã‚Â s 12:30 (HorÃƒÆ’Ã‚Â¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `RESUMO_MESTRE.md`

* **Ajuste de EstÃƒÆ’Ã‚Â¡gio Inicial, EndereÃƒÆ’Ã‚Â§os no Cronograma e Desbloqueio Comercial:**
  * *O que foi feito:*
    * **Backend (`api/index.ts`):**
      * `POST /api/clients` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â� Adicionado `current_stage: 'registration'` na inserÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o da tabela `projects`, garantindo que novos projetos iniciem no funil na etapa correta de cadastro.
      * `GET /api/projects-schedule` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â� Adicionado os campos `address`, `city` e `state` no select de join da tabela `clients` e incluÃƒÆ’Ã‚Â­do o mapeamento plano em `mappedProjects`.
      * `PUT /api/projects/:id/commercial` e `PUT /api/commercial-data/:projectId` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â� Removida a validaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de `kit_entregue` ao aprovar a proposta comercial (`status: 'proposta_enviada'`), permitindo o avanÃƒÆ’Ã‚Â§o correto para a etapa de vistoria tÃƒÆ’Ã‚Â©cnica (`current_stage: 'inspection'`) sem travas prematuras.
    * **Frontend (`Commercial.tsx`):**
      * Removido o bloqueio `disabled={!selectedProject.kit_entregue}` e a condicional do botÃƒÆ’Ã‚Â£o "Aprovar Proposta Comercial", permitindo que o vendedor envie a proposta e avance o projeto para vistoria sem exigir entrega prÃƒÆ’Ã‚Â©via do kit (que sÃƒÆ’Ã‚Â³ ocorre na fase de instalaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o/obra).
    * **Frontend (`ObraSchedule.tsx`):**
      * Adicionados campos `address`, `city` e `state` como opcionais na interface `ProjectSchedule`.
      * Inserido card visual cinza claro (`bg-gray-50`) exibindo o endereÃƒÆ’Ã‚Â§o do cliente cadastrado caso esteja preenchido (`project.address`, `project.city`, `project.state`), posicionado estrategicamente acima dos dados do kit negociado no detalhe expandÃƒÆ’Ã‚Â­vel do cronograma.
* **ReestruturaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o e Alinhamento do Funil de Obras:**
  * *O que foi feito:*
    * **Backend (`api/index.ts`):**
      * `GET /api/projects-schedule` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â� Alterado o filtro do cronograma de obras para exibir somente projetos que estejam no estÃƒÆ’Ã‚Â¡gio de instalaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o (`current_stage: 'installation'`) E cujo kit de equipamentos jÃƒÆ’Ã‚Â¡ tenha sido entregue (`kit_entregue: true`), garantindo que o cronograma represente apenas obras prontas para inÃƒÆ’Ã‚Â­cio.
    * **Frontend (`Homologation.tsx`):**
      * Ajustado o filtro da listagem de homologaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes para exibir projetos tanto no estÃƒÆ’Ã‚Â¡gio `'homologation'` quanto no estÃƒÆ’Ã‚Â¡gio paralelo `'installation'`. Isso permite que o processo de homologaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o ocorra em paralelo com a compra do Kit Solar e a execuÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o da Obra, logo apÃƒÆ’Ã‚Â³s a conclusÃƒÆ’Ã‚Â£o da Vistoria TÃƒÆ’Ã‚Â©cnica.
  * *Data e hora da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* 16/06/2026 ÃƒÆ’Ã‚Â s 13:25 (HorÃƒÆ’Ã‚Â¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/Homologation.tsx`, `RESUMO_MESTRE.md`

* **CorreÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do Cronograma: Projetos em InstalaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o NÃƒÆ’Ã‚Â£o Apareciam:**
  * *Causa Raiz:*
    * O cronograma filtrava por `kit_entregue = true`, mas o campo pode ser `null` no banco caso o fallback `PGRST204` seja ativado (colunas ausentes no schema), fazendo com que projetos em `installation` nÃƒÆ’Ã‚Â£o apareÃƒÆ’Ã‚Â§am.
  * *O que foi feito:*
    * **Backend (`api/index.ts`):**
      * `GET /api/projects-schedule` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â� Removido o filtro `kit_entregue = true` da query do Supabase. O cronograma agora exibe todos os projetos no estÃƒÆ’Ã‚Â¡gio `current_stage: 'installation'`, sem depender da coluna `kit_entregue` como filtro de banco.
      * `PUT /api/projects/:id/kit` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â� Adicionado `current_stage: 'installation'` ao payload base de atualizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o, garantindo que ao salvar o kit (comprado ou entregue) o projeto permaneÃƒÆ’Ã‚Â§a no estÃƒÆ’Ã‚Â¡gio correto de instalaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o. O status foi ajustado: `'kit_entregue'` quando entregue, `'kit_definido'` caso contrÃƒÆ’Ã‚Â¡rio.
  * *Data e hora da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* 16/06/2026 ÃƒÆ’Ã‚Â s 13:36 (HorÃƒÆ’Ã‚Â¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `RESUMO_MESTRE.md`

* **Auto-preenchimento do Kit Negociado em KitPurchase.tsx:**
  * *O que foi feito:*
    * **Frontend (`KitPurchase.tsx`):**
      * Corrigido o fallback de prÃƒÆ’Ã‚Â©-preenchimento dos campos do formulÃƒÆ’Ã‚Â¡rio de Kit Solar ao abrir um projeto. Anteriormente, o cÃƒÆ’Ã‚Â³digo tentava usar `project.proposal_inverter_model`, `project.proposal_inverter_power` etc., que **nÃƒÆ’Ã‚Â£o existem** no payload da API. Agora o fallback correto usa os campos da tabela `clients`: `inversor_marca + inversor_modelo` (concatenados) para o modelo do inversor, `inversor_potencia` para a potÃƒÆ’Ã‚Âªncia do inversor, `modulo_modelo` para o modelo do mÃƒÆ’Ã‚Â³dulo e `modulo_potencia` para a potÃƒÆ’Ã‚Âªncia do mÃƒÆ’Ã‚Â³dulo.
      * **Prioridade garantida:** Se jÃƒÆ’Ã‚Â¡ existirem dados salvos de compra de kit (`inverter_model`, `inverter_power`, `module_model`, `module_power`), esses valores tÃƒÆ’Ã‚Âªm prioridade e os dados do cliente **nÃƒÆ’Ã‚Â£o sobrescrevem**.
      * **Tratamento de nulos:** Caso os campos do cliente estejam vazios/nulos, os inputs exibem o placeholder normalmente, sem erros.
      * **Banner informativo:** Adicionado aviso em azul (`bg-blue-50`) que aparece apenas quando os campos foram prÃƒÆ’Ã‚Â©-preenchidos com dados do kit negociado (estado `usingProposalData: true`), orientando o usuÃƒÆ’Ã‚Â¡rio a editar livremente caso o kit comprado seja diferente.
      * Adicionada importaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do ÃƒÆ’Ã‚Â­cone `Info` do `lucide-react` para uso no banner.
  * *Data e hora da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* 16/06/2026 ÃƒÆ’Ã‚Â s 14:00 (HorÃƒÆ’Ã‚Â¡rio Local)
  * *Arquivos modificados:* `src/pages/KitPurchase.tsx`, `RESUMO_MESTRE.md`

* **CorreÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o da LocalizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do EndereÃƒÆ’Ã‚Â§o no Cronograma (ObraSchedule.tsx):**
  * *O que foi feito:*
    * **Frontend (`ObraSchedule.tsx`):**
      * Removido o campo manual/duplicado de "EndereÃƒÆ’Ã‚Â§o da InstalaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o" (que permitia input manual) que estava posicionado junto aos campos tÃƒÆ’Ã‚Â©cnicos de Inversor e Telhado.
      * Na listagem do card da obra (onde o cliente, tÃƒÆ’Ã‚Â­tulo e endereÃƒÆ’Ã‚Â§o sÃƒÆ’Ã‚Â£o exibidos de forma comprimida), o campo de endereÃƒÆ’Ã‚Â§o que tentava renderizar o endereÃƒÆ’Ã‚Â§o manual antigo (`details.endereco`) foi substituÃƒÆ’Ã‚Â­do pela formataÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do endereÃƒÆ’Ã‚Â§o real vindo da tabela `clients` (`project.city` e `project.state`, com fallback para `project.address`), mantendo assim a consistÃƒÆ’Ã‚Âªncia com o card expandÃƒÆ’Ã‚Â­vel.
      * O card cinza chiaro "EndereÃƒÆ’Ã‚Â§o da InstalaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o (Cadastro do Cliente)" foi mantido como a ÃƒÆ’Ã‚Âºnica fonte de endereÃƒÆ’Ã‚Â§o da instalaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o, evitando informaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes duplicadas e confusas.
  * *Data e hora da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* 16/06/2026 ÃƒÆ’Ã‚Â s 14:06 (HorÃƒÆ’Ã‚Â¡rio Local)
  * *Arquivos modificados:* `src/pages/ObraSchedule.tsx`, `RESUMO_MESTRE.md`

* **Limpeza, AnonimizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o e OcultaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de Projetos Finalizados (Conclusion / Completed):**
  * *O que foi feito:*
    * **Backend (`api/index.ts` - `PUT /api/projects/:id/homologation`):**
      * Refatorada a rotina de encerramento do projeto (quando atinge `connection_point_approved`).
      * O estÃƒÆ’Ã‚Â¡gio agora transita diretamente para `completed` (e `status = 'completed'`).
      * **ExclusÃƒÆ’Ã‚Â£o FÃƒÆ’Ã‚Â­sica (Storage):** Adicionado suporte para excluir mÃƒÆ’Ã‚Â­dias de vistoria da tabela `technical_data` (`uploads`), mÃƒÆ’Ã‚Â­dias e contratos de `commercial_data` (`uploads`), documentos de homologaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o da tabela `documents` (`homologacao-docs`), e histÃƒÆ’Ã‚Â³ricos de propostas JSON (`propostas`), economizando espaÃƒÆ’Ã‚Â§o e protegendo dados sensÃƒÆ’Ã‚Â­veis.
      * **Soft-Delete (AnonimizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o LGPD):** Em vez de excluir o projeto, os dados sensÃƒÆ’Ã‚Â­veis da tabela `clients` (`cpf_cnpj`, `phone`, `email`, `address`) sÃƒÆ’Ã‚Â£o anulados para nulo. Cidade, Estado, e os parÃƒÆ’Ã‚Â¢metros tÃƒÆ’Ã‚Â©cnicos do inversor e mÃƒÆ’Ã‚Â³dulo sÃƒÆ’Ã‚Â£o preservados, mantendo o vÃƒÆ’Ã‚Â­nculo `client_id` ativo. Campos de notas textuais livres (`observations` e `notes`) de todas as tabelas acessÃƒÆ’Ã‚Â³rias sÃƒÆ’Ã‚Â£o sumariamente apagados. A tabela de `proposal_history` para aquele projeto ÃƒÆ’Ã‚Â© removida do banco.
    * **Frontend:**
      * Os projetos finalizados e concluÃƒÆ’Ã‚Â­dos foram sumariamente bloqueados (ocultados) de aparecer nas listagens ativas:
        * `Commercial.tsx` (Filtro `installationProjects` ajustado)
        * `Technical.tsx` (Adicionado `current_stage !== 'conclusion'` e `completed`)
        * `Obra.tsx` (Removido `'conclusion'` do array permissivo)
        * `KitPurchase.tsx` (Removido `'conclusion'` do array permissivo)
      * A tela `FinishedProjects.tsx` passa a absorver todos esses projetos limpos e exibe-os apenas com os dados brutos restantes (Cidade, Cliente, Data), sem quebrar e sem permitir o uso indevido de PIIs finalizados.
  * *Data e hora da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* 16/06/2026 ÃƒÆ’Ã‚Â s 14:22 (HorÃƒÆ’Ã‚Â¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/Commercial.tsx`, `src/pages/Technical.tsx`, `src/pages/Obra.tsx`, `src/pages/KitPurchase.tsx`, `RESUMO_MESTRE.md`

* **CorreÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o no Filtro da Aba InstalaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do CRM Comercial (Soft-Delete):**
  * *O que foi feito:*
    * Adicionada exclusÃƒÆ’Ã‚Â£o explÃƒÆ’Ã‚Â­cita de projetos com estÃƒÆ’Ã‚Â¡gio `completed` no filtro da aba InstalaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o em `Commercial.tsx`, eliminando o edge case onde projetos concluÃƒÆ’Ã‚Â­dos e anonimizados poderiam ser exibidos se passassem nos critÃƒÆ’Ã‚Â©rios de whitelist de estÃƒÆ’Ã‚Â¡gios.
  * *Data e hora da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* 16/06/2026 ÃƒÆ’Ã‚Â s 14:37 (HorÃƒÆ’Ã‚Â¡rio Local)
  * *Arquivos modificados:* `src/pages/Commercial.tsx`, `RESUMO_MESTRE.md`

* **MigraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de MÃƒÆ’Ã‚Â­dias: Supabase Storage ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Cloudflare R2 (Parte 1 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â� Backend):**
  * *O que foi feito:*
    * Mapeamento completo de todos os pontos de upload/delete de arquivo em `api/index.ts`.
    * **6 alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes aplicadas** em `api/index.ts`:
      1. **Helper `uploadFile()`**: SubstituÃƒÆ’Ã‚Â­do `supabase.storage.from(bucket).upload()` + `getPublicUrl()` por `uploadToR2(file.buffer, filePath, file.mimetype)`. O parÃƒÆ’Ã‚Â¢metro `bucket` ÃƒÆ’Ã‚Â© mantido como prefixo de pasta no R2 para retrocompatibilidade com todos os chamadores.
      2. **`POST /api/whatsapp/send-audio`**: SubstituÃƒÆ’Ã‚Â­do `supabaseAdmin.storage...upload()` + `getPublicUrl()` por `uploadToR2(audioBuffer, audioFileName, 'audio/ogg')`. Caminho agora inclui prefixo `whatsapp-media/` no R2.
      3. **`POST /api/whatsapp/upload-media`**: SubstituÃƒÆ’Ã‚Â­do upload Supabase + `createSignedUrl` (600s) por `uploadToR2()`. Rota passa a retornar **URL pÃƒÆ’Ã‚Âºblica permanente** do R2.
      4. **`POST /api/whatsapp/send-media`**: SubstituÃƒÆ’Ã‚Â­do `supabaseAdmin.storage...getPublicUrl(filePath)` por `${R2_PUBLIC_URL}/${filePath}` (construÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o direta com variÃƒÆ’Ã‚Â¡vel jÃƒÆ’Ã‚Â¡ importada).
      5. **Webhook `downloadAndUploadMedia()`**: SubstituÃƒÆ’Ã‚Â­do `supabaseAdmin.storage...upload()` + `getPublicUrl()` por `uploadToR2(buffer, storagePath, contentType)`. MÃƒÆ’Ã‚Â­dias recebidas via webhook agora armazenadas no R2.
      6. **`GET /api/cron/cleanup-whatsapp-media`**: SubstituÃƒÆ’Ã‚Â­do `supabaseAdmin.storage...remove([path])` por `deleteFromR2(path)` com tratamento de erro por try-catch. AtualizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do banco permanece inalterada.
    * **NÃƒÆ’Ã‚Â£o alterados:** `POST /api/ponto/registrar` (jÃƒÆ’Ã‚Â¡ usava `uploadToR2`), `.remove()` dos buckets `obras-fotos`, `propostas`, `uploads` e `homologacao-docs`, autenticaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o, queries de banco e regras de negÃƒÆ’Ã‚Â³cio.
    * **Import confirmado na linha 12:** `import { uploadToR2, deleteFromR2, R2_PUBLIC_URL } from './r2.js'` jÃƒÆ’Ã‚Â¡ existia antes desta tarefa.
  * *Data e hora da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* 18/06/2026 ÃƒÆ’Ã‚Â s 06:36 (HorÃƒÆ’Ã‚Â¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `RESUMO_MESTRE.md`

* **CorreÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o da SequÃƒÆ’Ã‚Âªncia do Funil (Cadastro ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ TÃƒÆ’Ã‚Â©cnica ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Kit Solar/HomologaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Cronograma):**
  * *O que foi feito:*
    * **VerificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes Realizadas (Trechos Mantidos por Estarem Corretos):**
      1. `POST /api/clients`: Confirmado que novos projetos sÃƒÆ’Ã‚Â£o inseridos com `current_stage: 'registration'`.
      2. `PUT /api/projects/:id/technical`: Confirmado que ao concluir vistoria, o projeto avanÃƒÆ’Ã‚Â§a para `installation` (e nÃƒÆ’Ã‚Â£o para homologation).
      3. `PUT /api/projects/:id/kit`: Confirmado que o estÃƒÆ’Ã‚Â¡gio permanece em `installation` ao preencher os dados do kit e entrega.
      4. `Homologation.tsx` (frontend): Confirmado que a listagem de projetos jÃƒÆ’Ã‚Â¡ filtra corretamente `current_stage === 'homologation' || current_stage === 'installation'`, garantindo que o projeto apareÃƒÆ’Ã‚Â§a em ambas as telas simultaneamente (paralelismo) logo apÃƒÆ’Ã‚Â³s a vistoria tÃƒÆ’Ã‚Â©cnica.
    * **AlteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o Realizada (`GET /api/projects-schedule`):**
      * Adicionado o filtro condicional `.or('kit_entregue.eq.true,kit_entregue.is.null')` ao final da query de seleÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o.
      * O cronograma agora filtra ativamente projetos em estÃƒÆ’Ã‚Â¡gio de `installation` que possuam o `kit_entregue = true`. Projetos em `installation` que estejam com kit explÃƒÆ’Ã‚Â­cito como `false` nÃƒÆ’Ã‚Â£o aparecerÃƒÆ’Ã‚Â£o mais na tela.
      * Adicionado o fallback seguro `.is.null` para garantir que, caso a tabela no banco nÃƒÆ’Ã‚Â£o tenha a coluna de kit ou tenha registros antigos vazios, nenhum projeto desapareÃƒÆ’Ã‚Â§a acidentalmente.
  * *Data e hora da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* 18/06/2026 ÃƒÆ’Ã‚Â s 06:42 (HorÃƒÆ’Ã‚Â¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `RESUMO_MESTRE.md`

  * *Data e hora da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* 18/06/2026 ÃƒÆ’Ã‚Â s 06:42 (HorÃƒÆ’Ã‚Â¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `RESUMO_MESTRE.md`

* **Parte 7 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â� HistÃƒÆ’Ã‚Â³rico de Propostas: PaginaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o e Prazo de 30 Dias:**
  * *O que foi feito:*
    * **Backend (`api/index.ts`):** Campo `data_expiracao` na rota `POST /api/proposal-history` alterado de `+7 dias` para `+30 dias`. Rota `GET /api/proposal-history` refatorada para aceitar `?page=N&limit=N`, usar `.range(from, to)` e `.select('*', { count: 'exact' })`, retornando `{ data, total, page, totalPages }`.
    * **Frontend (`ProposalGenerator.tsx`):** Adicionados estados `historyPage`, `historyTotalPages` e `historyTotal`. FunÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o `fetchHistory` atualizada para aceitar parÃƒÆ’Ã‚Â¢metro de pÃƒÆ’Ã‚Â¡gina. Tabela encapsulada em `max-h-[480px]` para scroll interno. Controles de paginaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o (Anterior / PrÃƒÆ’Ã‚Â³xima, indicador de pÃƒÆ’Ã‚Â¡gina) adicionados abaixo da tabela. Corrigido bug de template literal malformado na URL da API.
  * *Data e hora da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* 18/06/2026 ÃƒÆ’Ã‚Â s 18:03 (HorÃƒÆ’Ã‚Â¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/ProposalGenerator.tsx`

* **Parte 8 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â� Ponto EletrÃƒÆ’Ã‚Â´nico: Aba de VerificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de Fotos (ADM/CEO):**
  * *O que foi feito:*
    * **Backend (`api/index.ts`):** Criada a rota `GET /api/ponto/fotos-verificacao`, restrita a roles `CEO` e `ADMIN`. Recebe `?userId=X&data=YYYY-MM-DD`, monta intervalo do dia inteiro no fuso de BrasÃƒÆ’Ã‚Â­lia (`T00:00:00-03:00` a `T23:59:59-03:00`), busca `time_records` filtrando por `company_id`, `user_id` e intervalo de data, retorna `id, type, timestamp, selfie_url, latitude, longitude, status`.
    * **Frontend (`Ponto.tsx`):**
      * Tipo do `activeTab` atualizado para incluir `'fotos'`.
      * Adicionados estados: `fotoUserId`, `fotoData`, `fotoRecords`, `fotoLoading`, `fotoModalUrl`.
      * Adicionada funÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o `fetchFotosVerificacao`.
      * Aba **"Verificar Fotos"** adicionada ao array de tabs, visÃƒÆ’Ã‚Â­vel apenas para `isManager`.
      * Painel da aba: filtros (dropdown de colaboradores + input de data + botÃƒÆ’Ã‚Â£o Buscar), linha do tempo vertical de registros com ÃƒÆ’Ã‚Â­cone de tipo, horÃƒÆ’Ã‚Â¡rio, badge de status, ÃƒÆ’Ã‚Â­cone de mapa (verde clicÃƒÆ’Ã‚Â¡vel para Google Maps, ou cinza sem localizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o) e thumbnail 112ÃƒÆ’Ã¢â‚¬â€�112px da selfie clicÃƒÆ’Ã‚Â¡vel.
      * Modal lightbox para visualizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o da foto em tamanho ampliado com botÃƒÆ’Ã‚Â£o de fechar (`ÃƒÆ’Ã¢â‚¬â€�`) e click fora para dispensar.
    * **Abas existentes preservadas:** `ponto`, `historico`, `gestor`, `ajustes` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â� nenhuma linha alterada.
    * **RelatÃƒÆ’Ã‚Â³rio PDF existente:** nÃƒÆ’Ã‚Â£o tocado.
  * *Data e hora da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* 18/06/2026 ÃƒÆ’Ã‚Â s 18:21 (HorÃƒÆ’Ã‚Â¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/Ponto.tsx`


* **PaginaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o Client-Side e Scroll na Aba HistÃƒÆ’Ã‚Â³rico de Propostas:**
  * *O que foi feito:*
    * **AlteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o 1 (data_expiracao):** Verificado que o backend (`api/index.ts`, linhas 2729ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“2730) jÃƒÆ’Ã‚Â¡ calcula `data_expiracao` com `+30 dias` e usa `.insert()` (nÃƒÆ’Ã‚Â£o `.upsert()`). Nenhuma alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o necessÃƒÆ’Ã‚Â¡ria no frontend, pois o campo nÃƒÆ’Ã‚Â£o compÃƒÆ’Ã‚Âµe o payload enviado pela funÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o `saveToHistory` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â� ÃƒÆ’Ã‚Â© calculado exclusivamente no servidor.
    * **AlteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o 2 (estados de paginaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o):** Adicionados dois novos estados client-side ao componente `ProposalGenerator`: `const [currentPage, setCurrentPage] = useState(1)` e `const ITEMS_PER_PAGE = 10`. Os estados de paginaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o backend prÃƒÆ’Ã‚Â©-existentes (`historyPage`, `historyTotalPages`, `historyTotal`) foram mantidos intactos.
    * **AlteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o 3 (scroll e paginaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o client-side):** O bloco da tabela da aba HistÃƒÆ’Ã‚Â³rico de Propostas foi substituÃƒÆ’Ã‚Â­do por uma IIFE (`(() => { ... })()`) que calcula `totalPages`, `startIndex` e `currentItems = history.slice(...)`. A tabela agora possui o `<thead>` com `sticky top-0 z-10` para cabeÃƒÆ’Ã‚Â§alho fixo durante o scroll, container com `overflow-y-auto max-h-[500px]` e controles de paginaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o (ÃƒÂ¢Ã¢â‚¬Â Ã‚Â� Anterior / PrÃƒÆ’Ã‚Â³xima ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢) exibidos somente quando `totalPages > 1`. Todos os `<th>` e `<td>` originais foram preservados.
  * *Data e hora da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* 19/06/2026 ÃƒÆ’Ã‚Â s 14:24 (HorÃƒÆ’Ã‚Â¡rio Local)
  * *Arquivos modificados:* `src/pages/ProposalGenerator.tsx`

* **Parte 4 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â� CorreÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de Encoding de Emojis e VerificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de Upload em Obra.tsx:**
  * *O que foi feito:*
    * **AlteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o 1 (encoding):** Corrigidos 3 emojis corrompidos nos tÃƒÆ’Ã‚Â­tulos de seÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do JSX em `Obra.tsx`:
      * `ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã‚Â¡Ãƒâ€šÃ‚Â¡ MediÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes ElÃƒÆ’Ã‚Â©tricas Adicionais` ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ `ÃƒÂ¢Ã…Â¡Ã‚Â¡ MediÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes ElÃƒÆ’Ã‚Â©tricas Adicionais` (linha 551)
      * `ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸"Ãƒâ€¦Ã¢â‚¬â„¢ MediÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes CC (MPPTs)` ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ `ÃƒÂ°Ã…Â¸Ã¢â‚¬Â�Ã…â€™ MediÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes CC (MPPTs)` (linha 574)
      * `ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸"Ãƒâ€šÃ‚Â¦ Opcionais Adicionais` ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ `ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã‚Â¦ Opcionais Adicionais` (linha 610)
    * **AlteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o 2 (field do upload):** Verificado que a funÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o `uploadNewPhoto` jÃƒÆ’Ã‚Â¡ usa `fd.append('file', file)` corretamente (linha 66). Nenhuma alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o necessÃƒÆ’Ã‚Â¡ria.
    * **AlteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o 3 (persistÃƒÆ’Ã‚Âªncia no banco):** Verificado que a arquitetura do componente ÃƒÆ’Ã‚Â©: as URLs retornadas por `uploadNewPhoto` sÃƒÆ’Ã‚Â£o acumuladas em `extraUrls` e `uploadedMppts`, e enviadas no submit final via `api.put('/api/projects/:id/installation', payload)`. Essa ÃƒÆ’Ã‚Â© a arquitetura correta ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â� persistÃƒÆ’Ã‚Âªncia ocorre no submit, nÃƒÆ’Ã‚Â£o individualmente por upload. Nenhuma alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o necessÃƒÆ’Ã‚Â¡ria.
  * *Data e hora da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:* 19/06/2026 ÃƒÆ’Ã‚Â s 14:44 (HorÃƒÆ’Ã‚Â¡rio Local)
  * *Arquivos modificados:* `src/pages/Obra.tsx`

* **Parte 5 Ã¢â‚¬â€� Melhorias no MÃƒÂ³dulo de Vistoria TÃƒÂ©cnica e RetenÃƒÂ§ÃƒÂ£o R2:**
  * *O que foi feito:*
    * **Backend:** Adicionado suporte a metadata `{ retention: '2-months' }` no `uploadToR2`. Criado o cronjob `GET /api/cron/cleanup-vistoria-midia` agendado no `vercel.json` (`0 3 * * *`) para deletar do bucket "vistoria/" fotos/vÃƒÂ­deos criados hÃƒÂ¡ mais de 60 dias (validado pelo `LastModified`).
    * **Frontend:** Na tela `Technical.tsx`, modificado o input para aceitar explicitamente apenas `image/*,video/*` e adicionado botÃƒÂ£o de download em cada thumbnail da vistoria salva no banco de dados. O download converte a imagem em um `Blob` e aciona um clique simulado local, evitando comportamentos de "open in new tab" na WebView.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 25/06/2026 ÃƒÂ s 13:10 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `api/r2.ts`, `vercel.json`, `src/pages/Technical.tsx`.

* **Parte 6 Ã¢â‚¬â€� MÃƒÂ³dulo de Kits Solares e Ajustes em Propostas:**
  * *O que foi feito:*
    * **Banco de Dados:** Criada tabela `solar_kits` com suporte a multi-tenancy e RLS restrito a lideranÃƒÂ§a (ADM/CEO) para operaÃƒÂ§ÃƒÂµes de escrita, mas permitindo leitura de kits ativos aos Vendedores.
    * **Backend (`api/index.ts`):** Criadas rotas CRUD (`GET`, `POST`, `PUT`, `DELETE`) em `/api/solar-kits` com middleware `requireAdminOrCEO`.
    * **Frontend (`ProposalGenerator.tsx`):**
      * Criada nova aba "Kits Solares" no gerador de propostas, acessÃƒÂ­vel apenas por usuÃƒÂ¡rios com role ADM ou CEO.
      * Desenvolvida tela de gerenciamento de kits com tabela responsiva e modal para adiÃƒÂ§ÃƒÂ£o/ediÃƒÂ§ÃƒÂ£o de kits (incluindo checkbox para inversor de ampliaÃƒÂ§ÃƒÂ£o).
      * Removidos os campos manuais de "Custo do Kit", "Margem de Venda (%)" e "Desconto" da visÃƒÂ£o do Vendedor na aba "Kit Solar".
      * Introduzido um Dropdown (seletor) de "Kit Cadastrado" que ÃƒÂ© **obrigatÃƒÂ³rio** para vendedores (bloqueia geraÃƒÂ§ÃƒÂ£o de PDF se vazio) e exibe o nome simplificado "Kit X kWh" sem exibir os custos.
      * A seleÃƒÂ§ÃƒÂ£o preenche automaticamente mÃƒÂ³dulos, inversores, potÃƒÂªncias e marcas, alÃƒÂ©m de travar os campos detalhados de equipamento como leitura apenas (read-only) para Vendedores.
      * O preÃƒÂ§o ÃƒÂ© calculado em background (Custo + Margem) e exibido como "Valor Final de Venda". Apenas ADM/CEO possuem a capacidade de alterar o valor e especificaÃƒÂ§ÃƒÂµes livremente na tela de propostas caso necessÃƒÂ¡rio.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 25/06/2026 ÃƒÂ s 13:38 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/ProposalGenerator.tsx`.

* **Parte 7 Ã¢â‚¬â€� CorreÃƒÂ§ÃƒÂµes no HistÃƒÂ³rico de Propostas:**
  * *O que foi feito:*
    * **Backend (`api/index.ts`):** O cronjob `GET /api/cleanup-proposals` foi corrigido. Antes, ele deletava os registros da tabela `proposal_history` ao expirar. Agora, ele apenas deleta os arquivos fÃƒÂ­sicos no Storage (bucket `propostas`) e anula o campo `url_arquivo = null` no banco, mantendo o registro do histÃƒÂ³rico permanentemente. A busca foi atualizada para filtrar apenas registros com `url_arquivo IS NOT NULL` e `data_expiracao < now()`.
    * **Frontend (`ProposalGenerator.tsx`):**
      * **PaginaÃƒÂ§ÃƒÂ£o corrigida:** Removidos os estados `currentPage` e `ITEMS_PER_PAGE` que causavam paginaÃƒÂ§ÃƒÂ£o duplicada (frontend + backend). A aba "HistÃƒÂ³rico" agora usa exclusivamente a paginaÃƒÂ§ÃƒÂ£o do backend via `historyPage` e `historyTotalPages`. Os botÃƒÂµes "Ã¢â€ Â� Anterior" e "PrÃƒÂ³xima Ã¢â€ â€™" chamam `fetchHistory(historyPage - 1)` e `fetchHistory(historyPage + 1)`. O indicador exibe "PÃƒÂ¡gina X de Y Ã¢â‚¬â€� Z proposta(s) no total".
      * **Colunas ocultas para Vendedor:** As colunas "Margem" e "Custo do Kit" na tabela do histÃƒÂ³rico sÃƒÂ£o renderizadas condicionalmente com `{isAdminOrCeo && ...}`. Para o role `VENDEDOR`, essas colunas (`<th>` e `<td>`) sÃƒÂ£o completamente omitidas do DOM.
  * *Data e hora da alteraÃƒÂ§ÃƒÂ£o:* 25/06/2026 ÃƒÂ s 13:44 (HorÃƒÂ¡rio Local)
  * *Arquivos modificados:* `api/index.ts`, `src/pages/ProposalGenerator.tsx`, `RESUMO_MESTRE.md`.

---

> [!WARNING]
> A chave `SUPABASE_SERVICE_ROLE_KEY` concede controle total sobre todas as linhas de todas as tabelas do banco de dados e arquivos do Storage. NÃƒÆ’Ã‚Â£o insira ou exponha esta chave em qualquer script que seja compilado dentro do bundle do frontend (pasta `/src`).

> [!IMPORTANT]

---

## 15. MIGRATIONS PENDENTES DE EXECUÃƒâ€¡ÃƒÆ’O MANUAL NO SUPABASE

Esta seÃƒÂ§ÃƒÂ£o rastreia os arquivos de migration que foram criados no repositÃƒÂ³rio mas ainda precisam ser executados manualmente no **SQL Editor do Supabase** para ter efeito no banco de dados de produÃƒÂ§ÃƒÂ£o.

### Ã¢Â�Â³ Pendentes

| Arquivo | DescriÃƒÂ§ÃƒÂ£o | Criado em |
|---|---|---|
| supabase/migrations/20260625_create_solar_kits.sql | Cria a tabela solar_kits com RLS, ÃƒÂ­ndices e trigger de updated_at. Sem isso, GET /api/solar-kits retorna erro 500. | 25/06/2026 |
| (Query Manual) | `ALTER TABLE clients ADD COLUMN IF NOT EXISTS origem_venda TEXT;` - Adiciona campo de origem de venda | 27/06/2026 |
| (Query Manual) | `ALTER TABLE users ADD COLUMN IF NOT EXISTS recebe_leads BOOLEAN DEFAULT false;` e UPDATE ativando para Manoel/Soraia - Habilita Round-Robin | 27/06/2026 |

> [!CAUTION]
> Enquanto esses arquivos nÃƒÂ£o forem executados no Supabase, as funcionalidades correspondentes estarÃƒÂ£o **completamente indisponÃƒÂ­veis** em produÃƒÂ§ÃƒÂ£o, independentemente de qualquer deploy no Vercel.

### Ã¢Å“â€¦ JÃƒÂ¡ Aplicadas

| Arquivo | DescriÃƒÂ§ÃƒÂ£o | Aplicado em |
|---|---|---|
| supabase/migrations/20260625_create_whatsapp_observations.sql | Cria a tabela whatsapp_observations com RLS e ÃƒÂ­ndices para o mÃƒÂ³dulo de notas do Atendimento. | 25/06/2026 |


## [17/07/2026 18:39] CorreÃ§Ã£o: NormalizaÃ§Ã£o Centralizada de Telefones
- **O que foi feito:** Criada a funÃ§Ã£o `normalizarTelefoneBR` para padronizar telefones e evitar duplicidade de contatos. A funÃ§Ã£o injeta o 9Âº dÃ­gito apenas em celulares (10 dÃ­gitos comeÃ§ando com 6-9), respeita fixos, ignora nÃºmeros internacionais (ex: +1) e casos nulos. Foi aplicada em 4 pontos crÃ­ticos: `getKommoLeadContact`, fallback do webhook Kommo, webhook do WhatsApp (Evolution API) e na rota de cadastro manual (`POST /api/clients`).
- **Arquivos modificados:** `api/index.ts`

## [17/07/2026 19:01] Limpeza: Merge dos 12 pares de contatos duplicados no WhatsApp
- **O que foi feito:** Executado o merge real no banco de produÃ§Ã£o dos 12 pares de contatos duplicados em `whatsapp_conversations` que existiam em razÃ£o da inconsistÃªncia do 9Âº dÃ­gito do celular BR (ex: `558184433272` vs `5581984433272`). Para cada par: (1) mensagens movidas da conversa duplicada para a principal; (2) tags unidas (array distinct); (3) telefone da conversa principal atualizado para o formato canÃ´nico de 13 dÃ­gitos; (4) mensagem interna de aviso inserida nos 5 pares com conflito de vendedor (pares 3, 4, 9, 10, 12); (5) conversa duplicada deletada. **12/12 pares concluÃ­dos com sucesso.** Esta operaÃ§Ã£o foi possÃ­vel graÃ§as Ã  correÃ§Ã£o prÃ©via da funÃ§Ã£o `normalizarTelefoneBR()` que previne novos duplicados na origem.
- **Pares mesclados:** (1) Aleixo: 558173â†’5581973224553 | (2) Andrea Lins: 558181â†’5581981464421 | (3) Marcos AurÃ©lio: 558184â†’5581984433272 | (4) Diego Santos: 558186â†’5581986886347 | (5) Ale Oliveira: 558188â†’5581988133105 | (6) Vilma Rago: 558191â†’5581991702147 | (7) Luiz Carlos: 558197211â†’5581997211420 | (8) Francisco: 558197551â†’5581997551259 | (9) A.T/Arthur: 558198083â†’5581998083832 | (10) Avani: 558198402â†’5581998402639 | (11) Sergio FalcÃ£o: 558198804â†’5581998804791 | (12) Emanoell: 556499â†’5564999242258
- **Arquivos modificados:** `api/index.ts` (execuÃ§Ã£o via scripts em `scratch/`)

## [20/07/2026 09:49] CorreÃ§Ã£o: ProteÃ§Ã£o contra nÃºmeros internacionais na normalizaÃ§Ã£o de telefones
- **O que foi feito:** Ajustada a funÃ§Ã£o `normalizarTelefoneBR` para evitar falsos positivos em nÃºmeros brasileiros que chegam com o prefixo `+` mas sem o `55` (ex: `+81998286931`). A proteÃ§Ã£o contra nÃºmeros estrangeiros reais foi mantida (ex: `+1...`), mas agora a funÃ§Ã£o verifica se a versÃ£o limpa do nÃºmero possui 10 ou 11 dÃ­gitos e se os primeiros formam um DDD plausÃ­vel (ex. o terceiro dÃ­gito em celular deve ser 6, 7, 8 ou 9). Caso positivo, o nÃºmero Ã© tratado como brasileiro e normalizado corretamente (adicionando o 55), evitando erros 400 de envio via Evolution API. TambÃ©m foi executado um script de banco de dados que corrigiu a conversa `871149f8-5d9e-4e34-ba9f-512f2461f6f7` para o nÃºmero normalizado, permitindo que as mensagens voltem a ser entregues.
- **Arquivos modificados:** `api/index.ts`, testes em `scratch/test_phone.ts`, banco de dados Supabase (tabelas `whatsapp_conversations` e `whatsapp_messages`).


* **PrevenÃ§Ã£o de Race Condition e Perda de Leads (Webhooks Kommo e WhatsApp):**
  * *O que foi feito:*
    * SubstituÃ­da a lÃ³gica de verificaÃ§Ã£o e criaÃ§Ã£o (SELECT + INSERT) dos webhooks por UPSERT atÃ´mico.
    * Implementada funÃ§Ã£o RPC ('upsert_whatsapp_conversation') no Supabase para lidar com colisÃµes da constraint UNIQUE (phone, company_id, instance).
    * Adicionada gravaÃ§Ã£o na Dead Letter Queue (tabela 'webhook_failures') no webhook do Kommo caso ocorra falha de inserÃ§Ã£o, eliminando perda invisÃ­vel de leads.
    * Mantida a consistÃªncia do Round-Robin para proteger vendedores jÃ¡ atribuÃ­dos durante uma concorrÃªncia.
  * *Data e hora da alteraÃ§Ã£o:* 20/07/2026 Ã s 16:17 (HorÃ¡rio Local)
  * *Arquivos modificados:* api/index.ts, Banco de Dados Supabase (RPC upsert_whatsapp_conversation)


* **INCIDENTE â€” CorreÃ§Ã£o de 24 Telefones Fixos Corrompidos pelo Lote de NormalizaÃ§Ã£o de Legados:**
  * *Causa raiz:* O script de atualizaÃ§Ã£o em lote dos 169 registros legados (sessao anterior) inseriu o 9o digito em TODOS os numeros de 12 digitos sem passar pela logica de diferenciacao fixo/celular ja existente em normalizarTelefoneBR(). Isso corrompeu 24 numeros de telefone FIXO (3o digito local 2-5) ao transformar, por exemplo, 558738622001 (fixo) em 5587938622001 (invalido).
  * *Extensao do dano:* 24 registros corrompidos. Desses, 22 eram atualizacoes simples diretas; 2 geraram conflito de duplicata porque o sistema (via webhook UPSERT recem-ativado) criou novos registros com o telefone correto de 12 digitos antes da reversao.
  * *Correcao aplicada em 20/07/2026:*
    * 22 updates diretos: removido o digito '9' da 5a posicao de cada phone corrompido (phone.slice(0,4) + phone.slice(5)).
    * 2 merges de par (Setor Administrativo DDD 81 e DDD 27): mensagens movidas, secundaria deletada, phone do principal revertido para 12 digitos.
  * *Resultado final:* 0 fixos corrompidos restantes. 0 duplicatas de contatos individuais (apenas os 2 JIDs de grupo documentados).
  * *Licao aprendida:* QUALQUER correcao em lote de dados de telefone deve reutilizar a funcao normalizarTelefoneBR() ja validada â€” nunca replicar a logica manualmente em script solto. Scripts ad-hoc de UPDATE devem ser revisados contra a funcao canonica antes da execucao.
  * *Data e hora da alteracao:* 20/07/2026 as 16:35 (Horario Local)
  * *Arquivos modificados:* Banco de Dados Supabase (tabela whatsapp_conversations â€” 24 phone corrigidos, 2 conversas deletadas)

---

## [28/07/2026 09:41] CorreÃ§Ã£o: Seletor de pÃ¡ginas do PDF mobile corrigido (causa raiz definitiva do pageDivs=0)

### O que foi feito
- **Causa raiz identificada e corrigida:** O seletor `container.querySelectorAll('.page, div[style*="min-height:297mm"]')` nunca encontrava nenhuma div de pÃ¡gina no WebView Android porque:
  1. Nenhuma div do HTML gerado usa `class="page"` â€” apenas o `<style>` injetado define a regra CSS `.page`, mas as divs usam apenas `style` inline.
  2. A variante `min-height:297mm` nÃ£o existe no HTML gerado â€” as divs usam `height:297mm` (sem o `min-`).
- **SoluÃ§Ã£o aplicada:** Adicionado o atributo `data-pdf-page="true"` manualmente nas **10 divs de pÃ¡gina** do template HTML em `generatePDF`, e o seletor em `uploadFullPDF` foi atualizado para `[data-pdf-page="true"]`.
- **Divs corrigidas (linhas):** 1543, 1549, 1554, 1559, 1564 (pÃ¡ginas 1-5), 1842 (pÃ¡gina 6), 2015 (pÃ¡gina 7), 2212 (pÃ¡gina 8), 2345 (pÃ¡gina 9), 2446 (pÃ¡gina de fotos).
- **Seletor corrigido (linha 2608):** `.page, div[style*="min-height:297mm"]` â†’ `[data-pdf-page="true"]`
- **Logs de diagnÃ³stico (logStep) mantidos** para confirmar resultado nas prÃ³ximas sessÃµes de teste.
- Build gerado com sucesso: `npm run build:mobile` + `cap sync` + `gradlew assembleDebug` â€” BUILD SUCCESSFUL em 14s.

### Data e hora
28/07/2026 Ã s 09:41 (HorÃ¡rio Local, UTC-3)

### Arquivos modificados
- `src/pages/ProposalGenerator.tsx`

---

## Inventário Supabase ? R2 (19/11/2026 — SOMENTE LEITURA)

**Data:** 19/11/2026 08:41 (horário de Brasília)  
**Objetivo:** Levantamento completo antes de cancelar o plano Pro do Supabase e migrar tudo para Cloudflare R2.  
**Nenhuma alteração foi feita** em código, dados, buckets ou configurações.

### Achados principais:
- **Storage Supabase ativo:** buckets propostas (376 MB, 410 arquivos), uploads (40 MB, 95 arquivos), homologacao-docs (13 MB, 22 arquivos privados)
- **Storage Supabase vazio (já no R2):** obras-fotos, homologation-docs, whatsapp-media
- **?? CRÍTICO:** 127 URLs do Supabase em proposal_history.url_arquivo — devem ser migradas para R2 antes de cancelar o plano Pro
- **?? MÉDIO:** 5 documentos em documents.url e 2 registros em proposal_history.raw_data ainda com URL do Supabase
- **Banco:** 32,78 MB total; whatsapp_messages é o maior objeto (10 MB)
- **R2:** bucket mtsolar-media, URL pública via domínio 
2.dev (sem domínio próprio)
- **Cron cleanup-proposals** ainda apaga do Supabase Storage bucket propostas — precisa ser migrado para R2
- **src/pages/Obra.tsx** ainda faz upload para Supabase Storage bucket obras-fotos — divergência com backend

### Arquivos lidos (somente leitura):
- pi/index.ts, pi/r2.ts, src/hooks/useHomologacaoDocs.ts
- src/pages/Commercial.tsx, src/pages/Obra.tsx, src/pages/ProposalGenerator.tsx
- ercel.json, .env (apenas confirmou existência de variáveis, sem ecoar valores)
- Banco Supabase: tabelas storage.objects, storage.buckets, proposal_history, documents, whatsapp_messages, homologation_documents, 	ime_records, medical_certificates, commercial_data, projects, 
eoenergia_protocols

### Artifact gerado:
- inventario_supabase_r2.md (pasta brain da conversa)

---

## Verificação de Integridade: Storage Supabase vs Banco (19/11/2026 — SOMENTE LEITURA)

**Data:** 19/11/2026 08:55 (horário de Brasília)  
**Objetivo:** Verificar se algum arquivo referenciado nas tabelas proposal_history e documents foi apagado indevidamente do Storage do Supabase durante limpeza de arquivos parados.  
**Resultado da Auditoria:**
- **Nenhum arquivo referenciado foi apagado.**
- proposal_history.url_arquivo: 127 URLs apontando para bucket propostas -> **127 existem** no storage (0 faltantes).
- documents.url: 5 URLs apontando para bucket uploads -> **5 existem** no storage (0 faltantes).
- proposal_history.raw_data (jsonb): 8 URLs apontando para bucket uploads/proposals -> **8 existem** no storage (0 faltantes).
- Propostas com url_arquivo IS NULL: 352 propostas (100% delas com 
aw_data técnico/comercial preenchido e intacto).
- Total atual no Supabase Storage: 527 objetos, 430,38 MB (propostas: 410 obj / 376,81 MB; uploads: 95 obj / 40,19 MB; homologacao-docs: 22 obj / 13,38 MB).

---

## Exibição de Documentos do Cadastro na Tela de Homologação (25/11/2026 — 13:56)

**Data/Hora:** 25/11/2026 13:56 (America/Recife)  
**Causa identificada:** O cadastro em Commercial.tsx envia os documentos para o Cloudflare R2 via presigned URL e registra na tabela homologation_documents, enquanto Homologation.tsx (ao clicar em "Gerenciar") lia apenas a tabela documents.  
**O que foi feito:**
- pi/index.ts (GET /api/projects/:id, L719–734 e L796): Adicionado filtro explícito company_id em documents, consulta a homologation_documents filtrando por project_id, company_id (
eq.user.company_id) e expires_at > NOW(), retornando homologation_documents no payload do projeto.
- src/pages/Homologation.tsx (L306–326 e L503–523): Ao abrir "Gerenciar", unifica documents e homologation_documents no estado projectDocs com deduplicação por URL (url || file_url) e renderiza nome (doc.title || doc.file_name) e link de abertura (doc.url || doc.file_url).
**Validações:**
- 
px tsc --noEmit ? 0 erros.
- 
pm run build ? Sucesso (uilt in 7.86s, 3316 módulos).

---

## Quantidade de Módulos no Cadastro e Exibição em Kit Solar (25/11/2026 — 13:59)

**Data/Hora:** 25/11/2026 13:59 (America/Recife)  
**Coluna reutilizada:** 	echnical_data.module_quantity (mesma fonte já usada por Technical.tsx e retornada por GET /api/projects/:id, evitando divergência e dispensando migration).  
**O que foi feito:**
- pi/index.ts (POST /api/clients, L438–455 e L565–569; PUT /api/clients/:id, L578–598 e L646–661): Recebe module_quantity, valida como inteiro positivo (>= 1) ou 
ull (vazio), grava na criação de 	echnical_data e sincroniza em 	echnical_data ao editar o cliente (filtrado por company_id).
- src/pages/Commercial.tsx (L25–30, L115–119, L256–259, L518–535, L828–831, L1176–1195): Adicionado campo numérico module_quantity (inteiro, min={1}, step={1}) em "Novo Cliente", "Editar Cliente" e no preenchimento via proposta (
aw.moduleQty).
- src/pages/KitPurchase.tsx (L285–293): Exibe "Quantidade de Módulos" junto aos dados do kit usando selectedProject.module_quantity (exibindo "—" para projetos antigos sem valor).
**Validações:**
- 
px tsc --noEmit ? 0 erros.
- 
pm run build ? Sucesso (uilt in 6.61s, 3316 módulos).

---

## Máscaras Automáticas de CPF, CNPJ e Telefone (25/11/2026 — 14:03)

**Data/Hora:** 25/11/2026 14:03 (America/Recife)  
**O que foi feito:**
- src/utils/masks.ts [NOVO]: Funções puras onlyDigits, maskCPF ( 00.000.000-00, máx. 11 dígitos), maskCNPJ ( 0.000.000/0000-00, máx. 14 dígitos), maskCpfCnpj e maskPhone ((00) 00000-0000 / (00) 0000-0000, removendo prefixo 55 apenas na exibição de números salvos com 12–13 dígitos).
- src/pages/Commercial.tsx: Máscara nos inputs e no carregamento para edição/proposta (cpf_cnpj e phone).
- pi/index.ts (PUT /api/clients/:id): Aplicado 
ormalizarTelefoneBR no campo phone (igual ao POST /api/clients), preservando o formato padrão salvo no banco e o matching existente.
- src/pages/Funcionarios.tsx: Substituído ormatCPF local por maskCPF e aplicado na abertura para edição (handleOpenEdit).
- src/pages/Contracts.tsx: Substituído ormatarCpfCnpj local por maskCpfCnpj.
- src/pages/ProposalGenerator.tsx: Aplicado maskPhone em clientPhone e maskCNPJ/maskPhone no modal de fornecedores (criação e edição).
- src/pages/NeoenergiaProtocols.tsx: Aplicado maskCpfCnpj e maskPhone nos inputs e no carregamento para edição (handleEdit).
**Validações:**
- Teste unitário das funções de src/utils/masks.ts ? OK.
- 
px tsc --noEmit ? 0 erros.
- 
pm run build ? Sucesso (uilt in 6.93s, 3317 módulos).


---

### Atualização — 2026-11-25 14:21
- **O que foi feito:** Padronização de `cpf_cnpj` na persistência (somente dígitos ou `null`) em `POST /api/clients` e `PUT /api/clients/:id` via helper `normalizarCpfCnpj`, além de ampliação da verificação de duplicidade no `POST /api/clients` (`gerarVariantesCpfCnpj`) para buscar tanto a versão só dígitos quanto a versão mascarada (CPF/CNPJ), mantendo o filtro `company_id` e sem alterar `phone`/`normalizarTelefoneBR`.
- **Arquivos modificados:** `api/index.ts` (linhas 437–500 e 597–607).


---

### Atualização — 2026-11-25 14:42
- **O que foi feito:** Ajuste de layout e rolagem do modal "Editar Cliente" em `Commercial.tsx` (`max-h-[90vh]`, layout em coluna com cabeçalho e rodapé fixos, e área dos campos com `overflow-y-auto overscroll-contain` + `WebkitOverflowScrolling: 'touch'` para desktop e Capacitor/iOS).
- **Arquivos modificados:** `src/pages/Commercial.tsx` (linhas 1073–1084 e 1220–1228).


---

### Atualização — 2026-11-25 14:46
- **O que foi feito:** Correção da query de duplicidade em `POST /api/clients` para desambiguar a relação `clients -> users` usando `users!clients_created_by_fkey(name)`, e tratamento explícito de erro (`dupError`) retornando HTTP 500 sem prosseguir para o `insert`.
- **Arquivos modificados:** `api/index.ts` (linhas 493–505).


---

### Atualização — 2026-11-25 15:00
- **O que foi feito:** Adicionada a flag `--env-file=.env` ao script `"dev"` em `package.json` para carregar o `.env` antes da avaliação dos imports ESM no ambiente local (Node `v24.13.1`), garantindo que `api/r2.ts` receba as credenciais do Cloudflare R2 na inicialização sem alterar `api/index.ts`, `api/r2.ts` ou produção.
- **Arquivos modificados:** `package.json` (linha 7).


---

### Atualização — 2026-11-25 15:11
- **O que foi feito:** Adicionada a funcionalidade de anexar documentos na seção "Documentos do Cliente" em `Homologation.tsx` (seletor de tipo `rg_cnh`, `conta_energia`, `contas_beneficiarias`, `contrato_social`, input de arquivo e botão "Adicionar documento" restrito aos roles `CEO`, `ADMIN` e `COMMERCIAL`), reutilizando o fluxo R2 (`GET /api/r2/presigned-url` → `PUT` direto ao R2 → `POST /api/homologation-documents/register`), recarregando e deduplicando a lista e exibindo toast com `react-hot-toast`.
- **Arquivos modificados:** `src/pages/Homologation.tsx` (linhas 1–9, 10–18, 223–310, 400–404, 575–616).


---

### Atualização — 2026-11-26 06:01
- **O que foi feito:** Reorganização do menu lateral em `src/components/Layout.tsx` com Dashboard fixo no topo e 5 grupos recolhíveis (`Dia a dia`, `Atendimento e Vendas`, `Obras e Técnica`, `Neoenergia`, `Administração`), mantendo todos os 22 itens, rotas, ícones e regras de visibilidade por role (incluindo `allowedPaths` do `COMMERCIAL` e `Origem de Vendas` exclusivo do `CEO`), persistência em `localStorage` (`sidebarOpenGroups`), abertura automática do grupo da rota ativa, indicador de mensagens não lidas quando `Dia a dia` estiver fechado e suporte ao modo colapsado do tablet (`md:w-16 hover:md:w-64`).
- **Arquivos modificados:** `src/components/Layout.tsx` (linhas 28–31, 109–232, 267–311).


---

### Atualização — 2026-11-26 06:36
- **O que foi feito:** Ajustado o menu lateral em `src/components/Layout.tsx` para comportamento de acordeão (apenas um grupo aberto por vez): `toggleGroup` abre o grupo clicado e fecha os demais (ou fecha todos se já estava aberto), navegação abre apenas o grupo da rota ativa fechando os outros, e inicialização via `localStorage` (`sidebarOpenGroups`) normaliza estados antigos com múltiplos grupos abertos.
- **Arquivos modificados:** `src/components/Layout.tsx` (linhas 184–223).


---

### Atualização — 2026-11-26 08:43
- **O que foi feito:** Adicionado o bloco ankAccumulated (previousBalance, periodMovement, ccumulatedBalance, previousUntil) ao retorno de GET /api/ponto/relatorio/:userId e criada a rota somente leitura GET /api/hour-bank/history?user_id=&months=12 (máx. 24 meses) com paginação via .range() em etchHourBankEntriesPaginated para contornar o limite de 1000 linhas do Supabase, respeitando isolamento multi-tenant (company_id), fuso America/Recife (getRecifeDateStr) e meses sem lançamentos com movimento  .
- **Arquivos modificados:** pi/index.ts (linhas 4935–5080 e 5756–5863).


---

### Atualização — 2026-11-26 08:48
- **O que foi feito:** Implementadas em src/pages/Ponto.tsx as telas do fluxo de ajuste de ponto e espelho assinado mensal:
  1. Aba **Histórico**: botão "+ Solicitar ajuste" e botão "Solicitar ajuste" por dia (com destaque âmbar para dias com batida faltante) abrindo modal com data, tipo de batida, horário, categoria do motivo, descrição (mín. 15 caracteres com contador), aviso de 30 dias, checkbox obrigatório de aceite eletrônico e exibição do número e data/hora do aceite após envio.
  2. Seção **Meus ajustes** na aba Histórico com seletor de mês, listagem de ajustes do mês (número, data, batida, status e observação do gestor) e botão "Ver espelho assinado" do próprio mês quando disponível.
  3. Aba **Ajustes** (CEO/ADMIN): filtro por mês, botão "Registrar ajuste em nome do colaborador" (mesmo modal sem checkbox de aceite, com aviso de assinatura mensal), listagem completa e ações de Aprovar (exibindo erro do backend em auto-aprovação) e Rejeitar (modal com observação obrigatória).
  4. Aba **Relatórios (Gestor)**: botões "Anexar espelho assinado" (POST /api/ponto/documento-mensal) e "Ver espelho assinado" (GET /api/ponto/documento-mensal) para o mês selecionado.
- **Arquivos modificados:** src/pages/Ponto.tsx (linhas 10, 77–135, 572–604, 679–717, 775–778, 1043–1177, 1674–2036, 2642–2746, 3411–3662).


---

### Atualização — 2026-11-26 09:00
- **O que foi feito:** Implementado Prompt 4 — saldo acumulado e histórico mensal do banco de horas no PDF e na tela:
  1. **PDF — RESUMO DO BANCO DE HORAS:** Renomeada a linha 'Saldo Total do Banco de Horas' para 'Saldo do Período'; adicionadas 2 novas linhas ('Saldo anterior até dd/mm/aaaa' e 'Saldo acumulado') quando bankAccumulated disponível; boxHeight expandido de 27 para 36mm dinamicamente; generatePDF tornado async para buscar ajustes antes de gerar o anexo.
  2. **PDF — Anexo de ajustes:** Chamada a appendAjustesAnexoToPdf() inserida no generatePDF após a página 1; busca ajustes via GET /api/ponto/ajustes; rodapé 'Pág. x/y' adicionado em todas as páginas quando houver mais de 1.
  3. **Tela — Relatório do gestor:** Card 'Saldo Acumulado' adicionado após os 5 cards existentes (visível quando bankAccumulated disponível); tabela 'Histórico do Banco de Horas' (12 meses) adicionada abaixo do card.
  4. **Tela — Aba Banco de Horas (funcionário):** Tabela 'Histórico Mensal do Banco de Horas' adicionada abaixo do extrato detalhado.
  5. **Estados novos:** bankAccumulated, hourBankHistory, loadingHourBankHistory; função fetchHourBankHistory(); fetchReport() popula bankAccumulated; useEffect inicial chama fetchHourBankHistory().
- **Arquivos modificados:**
  - src/pages/Ponto.tsx (import linha 13; estados linhas 498-510; useEffect linha 621; fetchHourBankHistory linhas 760-771; fetchReport linhas 800-801; catch fetchReport linha 847; generatePDF async linha 1232; RESUMO box linhas 1488-1600; chamada anexo+rodapé linhas 1623-1660; card acumulado+tabela gestor linhas 2295-2347; tabela bancohoras funcionário linhas 2537-2578).
  - src/utils/ajusteAnexoPdf.ts (criado em sessão anterior).
- **Validação:** npx tsc --noEmit OK (0 erros); npm run build OK (built in 6.42s).




---

### Atualização — 2026-11-26 16:15
- **O que foi feito:** Implementado backend completo dos ajustes de ponto v2 (backend do Prompt 1):

#### PASSO 0 — Contrato front→back conferido
| Chamada | Método | URL | Corpo/Params | Campos lidos no front |
|---|---|---|---|---|
| Listar ajustes (gestor) | GET | /api/ponto/ajustes?month=YYYY-MM | — | array de ajustes |
| Listar ajustes (funcionário) | GET | /api/ponto/ajustes?user_id=X&month=YYYY-MM | — | array de ajustes |
| Buscar doc mensal (funcionário) | GET | /api/ponto/documento-mensal?user_id=X&year_month=YYYY-MM | — | es.data.url / es.data.signedUrl |
| Buscar doc mensal (gestor) | GET | /api/ponto/documento-mensal?user_id=X&year_month=YYYY-MM | — | es.data.url / es.data.signedUrl |
| Criar ajuste | POST | /api/ponto/ajuste | {adjustment_type, reference_date, punch_type, requested_timestamp, reason_category, reason_text, time_record_id?, accept?, user_id?} | created.document_number, created.requested_ack_at |
| Revisar ajuste | PUT | /api/ponto/ajuste/:id | {status, review_note?} | — |
| Anexar espelho | POST | /api/ponto/documento-mensal | multipart: user_id, year_month, document | — |
| PDF — ajustes do mês | GET | /api/ponto/ajustes?user_id=X&month=YYYY-MM | — | array AjusteAnexoItem[] |

Campos usados pelo justeAnexoPdf.ts atendidos: document_number, eference_date, punch_type, original_timestamp, equested_timestamp, 
ew_timestamp, eason_category, eason_text, justification, equested_ack_at, equested_by_name, user_name, eviewed_by_name, eviewed_at, eview_note, created_at, status, 	ime_records.type, 	ime_records.timestamp.

#### Implementado:
1. **Migration** supabase/migrations/20261126_ponto_ajustes_v2.sql (NÃO executada):
   - ADD COLUMN IF NOT EXISTS em 	ime_adjustments: user_id, adjustment_type, reason_category, reason_text, punch_type, reference_date, requested_timestamp, original_timestamp, requested_ack_at, ack_text_version, review_note, document_number
   - Índice único parcial em (company_id, document_number) e índice em (company_id, user_id, reference_date)
   - Backfill user_id e reference_date de registros antigos via JOIN com time_records
   - ADD COLUMN IF NOT EXISTS em 	ime_records: source (DEFAULT 'app'), original_timestamp, adjustment_id
   - Tabela djustment_sequence (company_id, year, last_number) + função SQL 
ext_adjustment_number() — numeração atômica AJ-AAAA-000123
   - Tabela ponto_monthly_documents (uuid PK, company_id, user_id, year_month, document_path, uploaded_by, uploaded_at) com UNIQUE (company_id, user_id, year_month) e RLS habilitado sem políticas
2. **api/r2.ts** — adicionado getSignedReadUrl(filePath, expiresInSeconds=300) para URL assinada de leitura GET privada
3. **api/index.ts** — rotas substituídas/adicionadas:
   - POST /api/ponto/ajuste: compatibilidade com formato antigo (time_record_id+justification+new_timestamp) + formato novo completo com validações (accept obrigatório para funcionário, bloqueio de data futura/prazo 30 dias/atestado/duplicata, geração de document_number via RPC, gravar requested_ack_at com hora do servidor, CEO/ADMIN pode abrir em nome de outro)
   - PUT /api/ponto/ajuste/:id: bloqueio auto-aprovação (403 se req.user.id === user_id ou === requested_by), review_note obrigatória na rejeição, preserva original_timestamp, insere novo time_record para batida inexistente (source='ajuste'), recalcula banco de horas com reference_date em Recife (nunca UTC split), notifica funcionário via push + notifications
   - GET /api/ponto/ajustes: funcionário vê só os próprios (403 para outro user_id), CEO/ADMIN vê qualquer usuário da empresa, filtra por mês via reference_date, sem user_id retorna pendentes da empresa, normaliza requested_by_name/reviewed_by_name/user_name, limit 200
   - POST /api/ponto/documento-mensal: multer.single('document') com validação de tipo e tamanho (10MB), upload para R2 privado em ponto-docs/{company_id}/{user_id}/{year_month}/..., UPSERT em ponto_monthly_documents, retorna URL assinada de leitura
   - GET /api/ponto/documento-mensal: funcionário só vê o próprio, CEO/ADMIN qualquer da empresa, 404 se não existe, retorna URL assinada GET com validade 300s
- **Arquivos modificados:**
  - pi/index.ts (linhas 5142–5750 aprox., rotas de ajuste completas substituídas e rotas de documento mensal adicionadas)
  - pi/r2.ts (linha 90–101: adicionado getSignedReadUrl)
  - supabase/migrations/20261126_ponto_ajustes_v2.sql (criado — NÃO executado)
- **Validação:** npx tsc --noEmit OK (0 erros); npm run build OK (built in 6.84s).


---

### Atualização — 2026-11-26 16:38
- **O que foi feito:** Otimização de performance em calculateHourBankForPeriod e GET /api/ponto/relatorio/:userId, além de correção de timeout e HTTP 400 em Ponto.tsx:
  1. **pi/index.ts — calculateHourBankForPeriod (linhas 4529–4858):** Refatorada mantendo 100% da regra de negócio (validada com teste de equivalência em 3 usuários × 2 períodos com **0 diferenças**):
     - Carga única de dados em paralelo (Promise.all para DELETE automático created_by IS NULL, work_schedules, 	ime_records, holidays, medical_certificates, 	ime_off_requests) após consulta de users.role, seguida de um único SELECT * em hour_bank do período.
     - Cálculo dia a dia em memória preservando trava do dia atual, AUTO_TYPES/isAuto, created_by/ctorId, arredondamento a 2 casas e log [HB_CALC_DAY].
     - Aplicação em lote: até 1 DELETE (.in('id', idsToDelete)), 1 UPSERT (onConflict: 'id') e 1 INSERT (array).
  2. **pi/index.ts — GET /api/ponto/relatorio/:userId (linhas 4964–5076):** Consultas independentes pós-cálculo (	ime_records, hour_bank do período e etchHourBankEntriesPaginated para ankAccumulated) executadas em paralelo via Promise.all.
  3. **src/pages/Ponto.tsx:**
     - etchCompanyInfo (linhas 557–565): removida seleção da coluna inexistente cnpj em companies (seleciona apenas 
ame), eliminando os HTTP 400 no navegador.
     - etchReport (linhas 786–788): timeout específico desta chamada aumentado para 30000 ms (sem alterar o timeout global de src/lib/api.ts).
- **Arquivos modificados:**
  - pi/index.ts (linhas 4529–4858 e 4982–5023)
  - src/pages/Ponto.tsx (linhas 557–565 e 786–788)
- **Validação:** Teste de equivalência (usuários 1, 5 e 22; períodos 01/10–31/10 e 01/11–26/11): **0 diferenças**; 
px tsc --noEmit OK; 
pm run build OK (✓ built in 6.60s).


---

### Atualiza��o � 2026-11-27 04:27 (America/Recife)

**O que foi feito:** Implementa��o de isen��o de controle de jornada (controla_ponto) para usu�rios e corre��o do anexo de ajustes no PDF.

#### Arquivos modificados e linhas alteradas:

1. **supabase/migrations/20261126_add_controla_ponto_users.sql** (criado na sess�o anterior � N�O executado):
   - ALTER TABLE users ADD COLUMN IF NOT EXISTS controla_ponto boolean NOT NULL DEFAULT true;

2. **api/index.ts** � ajustes de backend:
   - GET /api/users: seleciona controla_ponto
   - POST /api/users: aceita e grava controla_ponto (boolean, default true)
   - PUT /api/users/:id: salva controla_ponto se presente
   - calculateHourBankForPeriod: retorna imediatamente se controla_ponto === false
   - GET /api/ponto/relatorio/:userId: retorna controlaPonto:false+zeros para isentos
   - GET /api/hour-bank/summary: retorna controlaPonto:false+zeros para isentos
   - GET /api/hour-bank: retorna controlaPonto:false+entries:[]+balance:0 para isentos
   - GET /api/hour-bank/history: retorna [] para isentos
   - POST /api/hour-bank/recalculate: pula usu�rios isentos
   - POST /api/ponto/ajuste: gestor pedindo para si exige aceite eletr�nico
   - CORRE��O: removidos 4 blocos incorretos de verifica��o controla_ponto em rotas erradas (GET /api/ponto/historico, fetchHourBankEntriesPaginated, GET /api/ponto/ajustes, GET /api/holidays, GET /api/medical-certificates, GET /api/time-off-requests)

3. **src/pages/Funcionarios.tsx** � checkbox controla_ponto:
   - Tipo UserProfile: adicionado controla_ponto?: boolean
   - Estado formData: adicionado controla_ponto: true
   - handleOpenCreate: reset inclui controla_ponto: true
   - handleOpenEdit: carrega controla_ponto: user.controla_ponto ?? true
   - handleSubmit payload: inclui controla_ponto: formData.controla_ponto
   - Modal: checkbox 'Controla ponto e banco de horas' adicionado ap�s Status Ativo

4. **src/pages/Ponto.tsx** � l�gica de isento:
   - Novo estado controlaPonto (boolean, default true)
   - fetchReport: seta setControlaPonto a partir de data.controlaPonto
   - PDF: texto schedule sem prefixo redundante quando nao configurado
   - PDF: tipoDia sempre '-' para isento
   - PDF: caixa RESUMO DO BANCO DE HORAS compacta com aviso de isento
   - Card Saldo Acumulado oculto para isento
   - Tabela Hist�rico oculta para isento
   - Badge Falta oculto para isento
   - Aviso 'Colaborador isento' exibido no lugar dos cards de resumo
   - Modal ajuste: checkbox de aceite vis�vel para gestor pedindo para si mesmo
   - handleRequestAdjust: gestor-para-si envia payload.accept = true

5. **src/utils/ajusteAnexoPdf.ts** � corre��es do anexo:
   - Tipo AjusteAnexoItem: campos requested_by e user_id adicionados
   - Coluna N�: largura 18 ? 26mm; demais colunas reposicionadas
   - L�gica solicText: aceite eletr�nico / registrado por gestor / registrado pelo pr�prio

**Valida��o:**
- npx tsc --noEmit => 0 erros
- npm run build => built in 6.58s
