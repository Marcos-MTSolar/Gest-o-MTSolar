-- Migration: Adiciona 'jornada_incompleta' ao CHECK constraint do hour_bank
-- e insere lançamentos retroativos corrigidos para Marcos Douglas (02/10/2026)
-- e Mariana Feliciano (03/09/2026).

-- 1. Remover a constraint antiga e criar a nova com o tipo 'jornada_incompleta'
ALTER TABLE public.hour_bank
  DROP CONSTRAINT IF EXISTS hour_bank_type_check;

ALTER TABLE public.hour_bank
  ADD CONSTRAINT hour_bank_type_check
  CHECK (type IN (
    'hora_extra_normal',
    'hora_extra_fds_feriado',
    'falta',
    'jornada_incompleta',
    'folga_abatida',
    'compensacao',
    'ajuste_manual',
    'atestado_abonado',
    'feriado_abonado'
  ));

-- 2. Inserir lançamento corrigido de Marcos Douglas (02/10/2026)
-- Registros de ponto: entrada 08:03 BRT / saída 12:12 BRT → 4.15h trabalhadas
-- Jornada esperada: 8.00h (ADMIN). Déficit: -3.85h
INSERT INTO public.hour_bank
  (company_id, user_id, reference_date, hours, type, multiplier, description, created_by)
VALUES
  (
    'e4bf6f22-6182-414d-afa4-c5449c014323',
    6,
    '2026-10-02',
    -3.85,
    'jornada_incompleta',
    1.0,
    'Jornada incompleta. Carga: 4.15h (Esperado: 8.00h). Saída antecipada confirmada pelo gestor em 06/10/2026. Batidas duplicadas 12:10/12:11 eram artefato do sistema de sequência fixa e foram removidas.',
    NULL
  );

-- 3. Inserir lançamento corrigido de Mariana Feliciano (03/09/2026)
-- Registros de ponto: entrada 07:01, almoço 12:18-13:03. Sem saída formal (entry extra 21:21 é batida errada)
-- 1º turno: 07:01-12:18 = 5.28h. Sem retorno após almoço = jornada parcial
-- Déficit: 8.00 - 5.28 = -2.72h
INSERT INTO public.hour_bank
  (company_id, user_id, reference_date, hours, type, multiplier, description, created_by)
VALUES
  (
    'e4bf6f22-6182-414d-afa4-c5449c014323',
    5,
    '2026-09-03',
    -2.72,
    'jornada_incompleta',
    1.0,
    'Jornada incompleta. Carga: 5.28h (Esperado: 8.00h). Batida de entry às 21:21 (ID 286) era artefato do bug de fuso horário — registrada no banco como se fosse do dia 04/09 pelo código antigo. Corrigido na sessão 06/10/2026.',
    NULL
  );

NOTIFY pgrst, 'reload schema';
