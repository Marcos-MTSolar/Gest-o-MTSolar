import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { addDays, isSameDay, parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, Bell, CheckCircle2, RotateCcw, CheckSquare, XCircle, Clock3, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const [stats, setStats] = useState({ activeProjects: 0, pendingInspections: 0, completedProjects: 0, monthlyRevenue: 0 });
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [todayEvents, setTodayEvents] = useState<any[]>([]);
  const [tomorrowEvents, setTomorrowEvents] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [homologacoes, setHomologacoes] = useState<any[]>([]);
  const { user } = useAuth();

  const fetchEvents = useCallback(async () => {
    try {
      const res = await axios.get('/api/events');
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
    axios.get('/api/stats').then(res => setStats(res.data));
    fetchEvents();
    
    // Fetch homologações
    axios.get('/api/projects').then(res => {
      if (Array.isArray(res.data)) {
        setHomologacoes(res.data.filter((p: any) =>
          ['homologation', 'conclusion', 'completed'].includes(p.current_stage)
        ));
      }
    });
  }, [fetchEvents]);

  const toggleComplete = async (ev: any) => {
    try {
      await axios.put(`/api/events/${ev.id}/complete`, { completed: !ev.completed });
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
      pending:                   { label: 'Aguardando',        color: 'bg-gray-100 text-gray-600' },
      technical_analysis:        { label: 'Análise Técnica',   color: 'bg-blue-100 text-blue-700' },
      documentation_review:      { label: 'Rev. Documentos',   color: 'bg-amber-100 text-amber-700' },
      awaiting_approval:         { label: 'Aguard. Aprovação', color: 'bg-yellow-100 text-yellow-700' },
      rejected:                  { label: 'Reprovado',         color: 'bg-red-100 text-red-700' },
      connection_point_approved: { label: 'Finalizado ✓',      color: 'bg-green-100 text-green-700' },
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Cliente</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Status Homologação</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Documentos</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Previsão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {homologacoes.map(p => {
                  const s = statusHomologacao(p.homologation_status);
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800">{p.client_name}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${s.color}`}>
                          {s.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {p.homologacao_docs_path
                          ? <span className="flex items-center gap-1 text-green-600 text-xs font-medium"><CheckSquare size={14}/> Enviados</span>
                          : <span className="flex items-center gap-1 text-red-500 text-xs font-medium"><XCircle size={14}/> Pendente</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {p.homologation_expected_date
                          ? new Date(p.homologation_expected_date).toLocaleDateString('pt-BR')
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
