-- =============================================================================
-- Seed: Feriados Nacionais Fixos, Móveis de 2026 e Municipais de Jaboatão/PE
-- Data: 2026-08-14
-- Projeto: Gestão MTSolar
-- Empresa alvo: Jaboatão dos Guararapes/PE
-- =============================================================================

DO $$
DECLARE
  v_company_id UUID := 'e4bf6f22-6182-414d-afa4-c5449c014323';
BEGIN

  -- =============================================================================
  -- BLOCO 1: FERIADOS NACIONAIS FIXOS (recurring = TRUE)
  -- Fonte: Art. 1º da Lei nº 662/1949, com alterações posteriores.
  -- 20/11 incluído via Lei Federal nº 14.759/2023 (Consciência Negra).
  -- =============================================================================

  INSERT INTO public.holidays (company_id, date, name, type, recurring) VALUES
    (v_company_id, '2026-01-01', 'Confraternização Universal',     'nacional', TRUE),
    (v_company_id, '2026-04-21', 'Tiradentes',                     'nacional', TRUE),
    (v_company_id, '2026-05-01', 'Dia do Trabalho',                'nacional', TRUE),
    (v_company_id, '2026-09-07', 'Independência do Brasil',        'nacional', TRUE),
    (v_company_id, '2026-10-12', 'Nossa Senhora Aparecida',        'nacional', TRUE),
    (v_company_id, '2026-11-02', 'Finados',                        'nacional', TRUE),
    (v_company_id, '2026-11-15', 'Proclamação da República',       'nacional', TRUE),
    (v_company_id, '2026-11-20', 'Consciência Negra (Zumbi dos Palmares)', 'nacional', TRUE),
    (v_company_id, '2026-12-25', 'Natal',                          'nacional', TRUE)
  ON CONFLICT (company_id, date) DO NOTHING;

  -- =============================================================================
  -- BLOCO 2: FERIADOS NACIONAIS MÓVEIS — 2026 (recurring = FALSE)
  -- Fonte: Calendário eclesiástico. Carnaval e Corpus Christi são pontos
  -- facultativos em âmbito federal, mas amplamente adotados. A Sexta-feira Santa
  -- é feriado nacional oficial (Lei nº 9.093/1995).
  -- ⚠️ VERIFICAR: Confirmar se a empresa adota Carnaval e Corpus Christi como
  --    folga ou apenas ponto facultativo. Ajustar conforme política interna.
  -- =============================================================================

  INSERT INTO public.holidays (company_id, date, name, type, recurring) VALUES
    -- Carnaval 2026: 16 e 17 de fevereiro (Seg/Ter antes da Quarta de Cinzas em 18/02)
    (v_company_id, '2026-02-16', 'Carnaval — Segunda-feira',       'nacional', FALSE),
    (v_company_id, '2026-02-17', 'Carnaval — Terça-feira',         'nacional', FALSE),

    -- Paixão de Cristo / Sexta-feira Santa: 03 de abril de 2026
    (v_company_id, '2026-04-03', 'Sexta-feira Santa (Paixão de Cristo)', 'nacional', FALSE),

    -- Corpus Christi 2026: 04 de junho (quinta-feira, 60 dias após Páscoa em 05/04)
    -- ⚠️ Ponto facultativo federal — comum em convenções coletivas e municípios
    (v_company_id, '2026-06-04', 'Corpus Christi',                 'nacional', FALSE)
  ON CONFLICT (company_id, date) DO NOTHING;

  -- =============================================================================
  -- BLOCO 3: FERIADOS ESTADUAIS DE PERNAMBUCO (recurring = TRUE/FALSE)
  -- Fonte: Lei Estadual de Pernambuco. Verificado via FIEPE e SINDILOJAS-Recife.
  -- =============================================================================

  INSERT INTO public.holidays (company_id, date, name, type, recurring) VALUES
    -- Data Magna de Pernambuco: 06 de março (Revolução Pernambucana de 1817)
    -- Feriado estadual oficial, confirmado anualmente em 06/03.
    (v_company_id, '2026-03-06', 'Data Magna de Pernambuco (Revolução Pernambucana)', 'estadual', TRUE),

    -- São João: 24 de junho — feriado estadual em Pernambuco
    -- ⚠️ Verificar se a empresa adota folga no dia ou apenas ponto facultativo.
    (v_company_id, '2026-06-24', 'São João (Feriado Estadual — PE)',                  'estadual', TRUE)
  ON CONFLICT (company_id, date) DO NOTHING;

  -- =============================================================================
  -- BLOCO 4: FERIADOS MUNICIPAIS — Jaboatão dos Guararapes/PE (recurring = TRUE/FALSE)
  -- Fonte: Lei Municipal nº 1.247/2015 e calendário do SINDICOM Jaboatão.
  -- ⚠️ VERIFICAR: Nossa Senhora dos Prazeres (13/04/2026) é MÓVEL (8 dias após
  --    Domingo de Páscoa). Para 2026 Páscoa = 05/04, então 13/04 = correto.
  --    Recadastrar todo ano com recurring = FALSE.
  -- =============================================================================

  INSERT INTO public.holidays (company_id, date, name, type, recurring) VALUES
    -- Santo Amaro: 15 de janeiro — Padroeiro da Cidade (fixo)
    (v_company_id, '2026-01-15', 'Santo Amaro — Padroeiro de Jaboatão dos Guararapes', 'municipal', TRUE),

    -- Aniversário da Cidade: 04 de maio — fixo (Lei Municipal)
    (v_company_id, '2026-05-04', 'Aniversário de Jaboatão dos Guararapes',              'municipal', TRUE),

    -- Nossa Senhora dos Prazeres: 8 dias após Domingo de Páscoa (móvel)
    -- Para 2026: Páscoa = 05/04 → Prazeres = 13/04/2026
    -- ⚠️ recurring = FALSE: recadastrar todo ano com a data correta
    (v_company_id, '2026-04-13', 'Nossa Senhora dos Prazeres (Padroeira de Prazeres)', 'municipal', FALSE)
  ON CONFLICT (company_id, date) DO NOTHING;

  RAISE NOTICE 'Seed de feriados concluído para company_id: %', v_company_id;
END $$;

-- Atualiza o schema cache do PostgREST
NOTIFY pgrst, 'reload schema';
