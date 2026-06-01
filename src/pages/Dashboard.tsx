import React, { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import { addDays, isSameDay, parseISO, format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, Bell, CheckCircle2, RotateCcw, CheckSquare, XCircle, Clock3, Loader2, AlertTriangle, ClipboardList } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { checkAndNotify, createNotificationChannel } from '../lib/notifications';


export default function Dashboard() {
  const [stats, setStats] = useState({ activeProjects: 0, pendingInspections: 0, completedProjects: 0, monthlyRevenue: 0 });
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [todayEvents, setTodayEvents] = useState<any[]>([]);
  const [tomorrowEvents, setTomorrowEvents] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [homologacoes, setHomologacoes] = useState<any[]>([]);
  const [neoenergia, setNeoenergia] = useState<any[]>([]);
  const { user } = useAuth();

  const fetchEvents = useCallback(async () => {
    try {
      const res = await api.get('/api/events');
      if (Array.isArray(res.data)) {
        const all = res.data;
        setAllEvents(all);
        const today = new Date();
        const tomorrow = addDays(new Date(), 1);
        setTodayEvents(all.filter((e: any) => isSameDay(parseISO(e.event_date), today)));
        setTomorrowEvents(all.filter((e: any) => isSameDay(parseISO(e.event_date), tomorrow)));
      } else {
        setAllEvents([]);
        setTodayEvents([]);
        setTomorrowEvents([]);
      }
    } catch (err) {
      console.error('Error fetching events:', err);
    }
  }, []);

  useEffect(() => {
    api.get('/api/stats').then(res => setStats(res.data));
    fetchEvents();
    
    // Fetch homologações
    api.get('/api/projects').then(res => {
      if (Array.isArray(res.data)) {
        setHomologacoes(res.data.filter((p: any) =>
          ['homologation', 'conclusion', 'completed'].includes(p.current_stage) &&
          p.current_stage !== 'conclusion' &&
          p.status !== 'completed'
        ));
      }
    });

    // Fetch Neoenergia Protocols
    api.get('/api/neoenergia').then(res => {
      if (Array.isArray(res.data)) {
        setNeoenergia(res.data);
      }
    });
    
    createNotificationChannel();
  }, [fetchEvents]);

  useEffect(() => {
    if (homologacoes.length > 0 || neoenergia.length > 0) {
      checkAndNotify(homologacoes, neoenergia);
    }
  }, [homologacoes, neoenergia]);

  const sortByOverdue = (list: any[]) => {
    return [...list].sort((a, b) => {
      const aOver = !!a.homologation_expected_date || !!a.data_prevista
        ? new Date((a.homologation_expected_date || a.data_prevista)) < new Date(new Date().toISOString().split('T')[0])
        : false;
      const bOver = !!b.homologation_expected_date || !!b.data_prevista
        ? new Date((b.homologation_expected_date || b.data_prevista)) < new Date(new Date().toISOString().split('T')[0])
        : false;
      return (bOver ? 1 : 0) - (aOver ? 1 : 0);
    });
  };

  const toggleComplete = async (ev: any) => {
    try {
      await api.put(`/api/events/${ev.id}/complete`, { completed: !ev.completed });
      fetchEvents();
    } catch (err) {
      console.error('Erro ao atualizar compromisso:', err);
    }
  };

  const selectedDateFiltered = allEvents.filter((e: any) => {
    try {
      return format(parseISO(e.event_date), 'yyyy-MM-dd') === selectedDate;
    } catch {
      return false;
    }
  });

  const statusHomologacao = (status: string) => {
    const map: Record<string, { label: string; color: string }> = {
      pending:                   { label: 'Pendente',          color: 'bg-gray-100 text-gray-600' },
      technical_analysis:        { label: 'Análise Técnica',   color: 'bg-blue-100 text-blue-700' },
      documentation_review:      { label: 'Rev. Documentos',   color: 'bg-amber-100 text-amber-700' },
      awaiting_approval:         { label: 'Aguard. Aprovação', color: 'bg-yellow-100 text-yellow-700' },
      rejected:                  { label: 'Reprovado',         color: 'bg-red-100 text-red-700' },
      connection_point_approved: { label: 'Concluído ✓',       color: 'bg-green-100 text-green-700' },
    };
    return map[status] || { label: status || 'Sem status', color: 'bg-gray-100 text-gray-500' };
  };

  const renderEvent = (ev: any, accentBg: string, accentText: string) => (
    <li key={ev.id} className={`p-4 hover:bg-gray-50 transition-colors flex items-start gap-4 ${ev.completed ? 'opacity-60' : ''}`}>
      <div className={`${accentBg} ${accentText} p-3 rounded-lg flex flex-col items-center justify-center min-w-[70px] relative`}>
        <CalendarIcon size={20} className="mb-1" />
        <span className="text-xs font-bold">{format(parseISO(ev.event_date), 'HH:mm')}</span>
        {ev.completed && (
          <div className="absolute inset-0 flex items-center justify-center bg-green-600/80 rounded-lg">
            <CheckCircle2 size={28} className="text-white" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className={`font-bold text-gray-800 text-base flex flex-wrap items-center gap-2 ${ev.completed ? 'line-through text-gray-500' : ''}`}>
          {ev.title}
          {ev.is_reminder && !ev.completed && (
            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Lembrete</span>
          )}
          {ev.completed && (
            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold flex items-center gap-1">
              <CheckCircle2 size={12} /> Atendido
            </span>
          )}
        </h4>
        {ev.description && (
          <p className={`text-sm mt-0.5 ${ev.completed ? 'line-through text-gray-400' : 'text-gray-600'}`}>{ev.description}</p>
        )}
        <button
          onClick={() => toggleComplete(ev)}
          className={`mt-2 text-xs font-semibold flex items-center gap-1 px-3 py-1 rounded-full border transition-all ${ev.completed
              ? 'border-gray-300 text-gray-500 hover:border-red-300 hover:text-red-600 hover:bg-red-50'
              : 'border-green-400 text-green-700 hover:bg-green-50'
            }`}
        >
          {ev.completed ? (
            <><RotateCcw size={12} /> Desfazer</>
          ) : (
            <><CheckCircle2 size={12} /> Marcar como Atendido</>
          )}
        </button>
      </div>
    </li>
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Dashboard</h1>
      <p className="text-gray-600 mb-6">Bem-vindo, {user?.name} ({user?.role})</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-gray-500 text-sm font-medium">Projetos Ativos</h3>
          <p className="text-3xl font-bold text-blue-900 mt-2">{stats.activeProjects}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-gray-500 text-sm font-medium">Vistorias Pendentes</h3>
          <p className="text-3xl font-bold text-amber-500 mt-2">{stats.pendingInspections}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-gray-500 text-sm font-medium">Projetos Concluídos</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">{stats.completedProjects}</p>
        </div>
      </div>

      {/* PAINEL DE STATUS DE HOMOLOGAÇÕES */}
      {user?.role !== 'TECHNICAL' && (
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-900 to-blue-700 text-white p-4 flex items-center gap-2">
            <CheckSquare size={20} className="text-amber-400" />
            <h2 className="text-lg font-bold">Status das Homologações</h2>
            <span className="ml-auto text-sm bg-blue-800 px-3 py-1 rounded-full text-blue-100">
              {homologacoes.length} projeto{homologacoes.length !== 1 ? 's' : ''}
            </span>
          </div>

          {homologacoes.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <CheckSquare size={40} className="mx-auto mb-2 text-gray-200" />
              <p>Nenhum projeto em homologação no momento.</p>
            </div>
          ) : (
            <div className="p-4 overflow-y-auto max-h-[420px] space-y-3 pr-1 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
              {sortByOverdue(homologacoes).map(p => {
                const s = statusHomologacao(p.homologation_status);
                const isOverdue =
                  !!p.homologation_expected_date &&
                  ['technical_analysis', 'waiting_inspection', 'performing_inspection'].includes(p.homologation_status) &&
                  new Date(p.homologation_expected_date) < new Date(new Date().toISOString().split('T')[0]);

                return (
                  <div key={p.id} className={`p-4 rounded-lg border transition-colors flex items-center justify-between gap-4 ${isOverdue ? 'bg-red-50 border-red-200 hover:bg-red-100' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'}`}>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-800 truncate">{p.client_name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.color}`}>
                          {s.label}
                        </span>
                        {isOverdue && (
                          <span className="flex items-center gap-1 bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-[10px] font-bold border border-red-200">
                            <AlertTriangle size={12} /> PRAZO VENCIDO
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-right shrink-0">
                      {p.homologacao_docs_path
                        ? <span className="flex items-center gap-1 text-green-600 text-[10px] font-bold uppercase"><CheckSquare size={12}/> Docs OK</span>
                        : <span className="flex items-center gap-1 text-red-500 text-[10px] font-bold uppercase"><XCircle size={12}/> Docs Pendentes</span>
                      }
                      <span className="text-gray-500 text-[10px] font-bold">
                        {p.homologation_expected_date ? new Date(p.homologation_expected_date).toLocaleDateString('pt-BR') : '—'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* PAINEL DE PROTOCOLOS NEOENERGIA */}
      {user?.role !== 'TECHNICAL' && (
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white p-4 flex items-center gap-2">
            <ClipboardList size={20} className="text-white" />
            <h2 className="text-lg font-bold">Protocolos Neoenergia (Ativos)</h2>
            <span className="ml-auto text-sm bg-emerald-700 px-3 py-1 rounded-full text-emerald-100">
              {neoenergia.filter(p => p.status === 'em_andamento').length} ativo{neoenergia.filter(p => p.status === 'em_andamento').length !== 1 ? 's' : ''}
            </span>
          </div>

          {neoenergia.filter(p => p.status === 'em_andamento' || p.resolved_at).length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <ClipboardList size={40} className="mx-auto mb-2 text-gray-200" />
              <p>Nenhum protocolo ativo ou resolvido recentemente.</p>
            </div>
          ) : (
            <div className="p-4 overflow-y-auto max-h-[420px] space-y-3 pr-1 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
              {sortByOverdue(
                Object.values(
                  neoenergia.reduce((acc: any, p: any) => {
                    const key = `${p.client_name}-${p.cpf_cnpj || ''}`;
                    if (!acc[key] || new Date(p.created_at) > new Date(acc[key].created_at)) {
                      acc[key] = p;
                    }
                    return acc;
                  }, {})
                ).filter((p: any) => p.status === 'em_andamento' || p.resolved_at)
              ).map((p: any) => {
                const isOverdue =
                  !!p.data_prevista &&
                  p.status === 'em_andamento' &&
                  new Date(p.data_prevista) < new Date(new Date().toISOString().split('T')[0]);
                
                const isResolved = p.resolved_at !== null;
                const daysLeft = isResolved ? 5 - differenceInDays(new Date(), parseISO(p.resolved_at)) : null;

                return (
                  <div key={p.id} className={`p-4 rounded-lg border transition-colors flex items-center justify-between gap-4 ${isOverdue ? 'bg-red-50 border-red-200 hover:bg-red-100' : isResolved ? 'bg-green-50 border-green-100 hover:bg-green-200' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col">
                        <h4 className="font-bold text-gray-800 truncate">{p.client_name}</h4>
                        {p.parent_id && <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">Com Histórico</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          p.status === 'em_andamento' ? 'bg-blue-100 text-blue-800' : 
                          p.status === 'concluido' ? 'bg-green-100 text-green-800' : 
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {p.status === 'em_andamento' ? 'Em Andamento' : p.status === 'concluido' ? 'Concluído' : p.status}
                        </span>
                        {isOverdue && (
                          <span className="flex items-center gap-1 bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-[10px] font-bold border border-red-200">
                            <AlertTriangle size={12} /> PRAZO VENCIDO
                          </span>
                        )}
                        {isResolved && (
                          <span className="text-[10px] font-bold text-green-700 bg-green-200/50 px-2 py-0.5 rounded-full border border-green-200">
                            RESOLVIDO · {daysLeft}d
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-right shrink-0">
                      <span className="text-gray-600 font-bold text-[10px]">{p.numero_protocolo || '—'}</span>
                      <span className="text-gray-500 text-[10px] font-bold">
                        {p.data_prevista ? format(parseISO(p.data_prevista), 'dd/MM/yyyy') : '—'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Avisos de Hoje */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-amber-500 text-white p-4 flex items-center gap-2">
            <Bell size={20} className="text-white" />
            <h2 className="text-lg font-bold">Mural de Avisos (Hoje)</h2>
            <span className="ml-auto text-sm bg-amber-600 px-3 py-1 rounded-full text-amber-50">
              {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
            </span>
          </div>

          <div className="p-0 h-96 overflow-y-auto">
            {todayEvents.length > 0 ? (
              <ul className="divide-y divide-gray-100">
                {todayEvents.map((ev) => renderEvent(ev, 'bg-amber-100', 'text-amber-800'))}
              </ul>
            ) : (
              <div className="p-8 text-center text-gray-500 flex flex-col items-center justify-center h-full">
                <Bell size={40} className="mx-auto mb-3 text-gray-300" />
                <p>Nenhum evento letivo ou aviso agendado para hoje.</p>
              </div>
            )}
          </div>
        </div>

        {/* Avisos de Amanhã */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-blue-900 text-white p-4 flex items-center gap-2">
            <Bell size={20} className="text-amber-400" />
            <h2 className="text-lg font-bold">Mural de Avisos (Amanhã)</h2>
            <span className="ml-auto text-sm bg-blue-800 px-3 py-1 rounded-full text-blue-100">
              {format(addDays(new Date(), 1), "EEEE, d 'de' MMMM", { locale: ptBR })}
            </span>
          </div>

          <div className="p-0 h-96 overflow-y-auto">
            {tomorrowEvents.length > 0 ? (
              <ul className="divide-y divide-gray-100">
                {tomorrowEvents.map((ev) => renderEvent(ev, 'bg-blue-100', 'text-blue-800'))}
              </ul>
            ) : (
              <div className="p-8 text-center text-gray-500 flex flex-col items-center justify-center h-full">
                <Bell size={40} className="mx-auto mb-3 text-gray-300" />
                <p>Nenhum evento letivo ou aviso agendado para amanhã.</p>
              </div>
            )}
          </div>
        </div>

        {/* Avisos por Data (Mural) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
          <div className="bg-emerald-600 text-white p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarIcon size={20} className="text-emerald-100" />
                <h2 className="text-lg font-bold">Mural por Data</h2>
              </div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-2 py-1 rounded text-emerald-900 text-sm font-bold border-none outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>
          </div>

          <div className="p-0 h-96 overflow-y-auto">
            {selectedDateFiltered.length > 0 ? (
              <ul className="divide-y divide-gray-100">
                {selectedDateFiltered.map((ev) => renderEvent(ev, 'bg-emerald-100', 'text-emerald-800'))}
              </ul>
            ) : (
              <div className="p-8 text-center text-gray-500 flex flex-col items-center justify-center h-full">
                <CalendarIcon size={40} className="mx-auto mb-3 text-gray-300" />
                <p>Nenhum evento letivo ou aviso agendado para esta data.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
