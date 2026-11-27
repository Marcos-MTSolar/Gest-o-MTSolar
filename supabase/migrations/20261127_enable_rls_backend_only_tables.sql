-- Migration: Habilitar RLS e revogar acesso anon/authenticated em tabelas acessadas apenas pelo backend (service_role)
-- Gerada em: 2026-11-27 (NÃO inclui tabelas do Grupo B nem tabelas que já possuem RLS habilitado)

-- clients: acessada exclusivamente pelo backend via service_role (sem uso direto em src/).
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.clients FROM anon, authenticated;

-- commercial_data: acessada exclusivamente pelo backend via service_role (sem uso direto em src/).
ALTER TABLE public.commercial_data ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.commercial_data FROM anon, authenticated;

-- companies_instances: acessada exclusivamente pelo backend via service_role (sem uso direto em src/).
ALTER TABLE public.companies_instances ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.companies_instances FROM anon, authenticated;

-- company_instances: acessada exclusivamente pelo backend via service_role (sem uso direto em src/).
ALTER TABLE public.company_instances ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.company_instances FROM anon, authenticated;

-- events: acessada exclusivamente pelo backend via service_role (sem uso direto em src/).
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.events FROM anon, authenticated;

-- homologation_documents: acessada exclusivamente pelo backend via service_role (frontend usa /api/homologation-documents).
ALTER TABLE public.homologation_documents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.homologation_documents FROM anon, authenticated;

-- logs: acessada exclusivamente pelo backend via service_role (sem uso direto em src/).
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.logs FROM anon, authenticated;

-- media: acessada exclusivamente pelo backend via service_role (sem uso direto em src/).
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.media FROM anon, authenticated;

-- messages: acessada exclusivamente pelo backend via service_role (SocketContext usa canal broadcast 'system' e rota /api/messages).
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.messages FROM anon, authenticated;

-- neoenergia_protocols: acessada exclusivamente pelo backend via service_role (sem uso direto em src/).
ALTER TABLE public.neoenergia_protocols ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.neoenergia_protocols FROM anon, authenticated;

-- proposal_history: acessada exclusivamente pelo backend via service_role (sem uso direto em src/).
ALTER TABLE public.proposal_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.proposal_history FROM anon, authenticated;

-- proposals: acessada exclusivamente pelo backend via service_role (sem uso direto em src/; Storage usa bucket 'propostas').
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.proposals FROM anon, authenticated;

-- settings: acessada exclusivamente pelo backend via service_role (sem uso direto em src/).
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.settings FROM anon, authenticated;

-- technical_data: acessada exclusivamente pelo backend via service_role (sem uso direto em src/).
ALTER TABLE public.technical_data ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.technical_data FROM anon, authenticated;

-- time_adjustments: acessada exclusivamente pelo backend via service_role (frontend usa /api/ponto/ajuste e /api/ponto/ajustes).
ALTER TABLE public.time_adjustments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.time_adjustments FROM anon, authenticated;

-- time_records: acessada exclusivamente pelo backend via service_role (frontend usa rotas /api/ponto/*).
ALTER TABLE public.time_records ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.time_records FROM anon, authenticated;

-- work_schedules: acessada exclusivamente pelo backend via service_role (frontend usa rotas /api/work-schedules).
ALTER TABLE public.work_schedules ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.work_schedules FROM anon, authenticated;
