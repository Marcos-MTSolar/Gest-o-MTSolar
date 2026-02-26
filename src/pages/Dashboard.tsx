import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { addDays, isSameDay, parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const [stats, setStats] = useState({ activeProjects: 0, pendingInspections: 0, completedProjects: 0, monthlyRevenue: 0 });
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [todayEvents, setTodayEvents] = useState<any[]>([]);
  const [tomorrowEvents, setTomorrowEvents] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const { user } = useAuth();

  useEffect(() => {
    // Fetch stats
    axios.get('/api/stats').then(res => setStats(res.data));

    // Fetch events and filter for today and tomorrow
    axios.get('/api/events').then(res => {
      if (Array.isArray(res.data)) {
        setAllEvents(res.data);
        const today = new Date();
        const tomorrow = addDays(new Date(), 1);

        const todayFiltered = res.data.filter((e: any) =>
          isSameDay(parseISO(e.event_date), today)
        );
        const tomorrowFiltered = res.data.filter((e: any) =>
          isSameDay(parseISO(e.event_date), tomorrow)
        );

        setTodayEvents(todayFiltered);
        setTomorrowEvents(tomorrowFiltered);
      } else {
        setAllEvents([]);
        setTodayEvents([]);
        setTomorrowEvents([]);
      }
    }).catch(err => console.error("Error fetching events:", err));
  }, []);

  const selectedDateFiltered = allEvents.filter((e: any) => {
    try {
      return format(parseISO(e.event_date), 'yyyy-MM-dd') === selectedDate;
    } catch {
      return false;
    }
  });

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
                {todayEvents.map((ev, idx) => (
                  <li key={idx} className="p-4 hover:bg-gray-50 transition-colors flex items-start gap-4">
                    <div className="bg-amber-100 text-amber-800 p-3 rounded-lg flex flex-col items-center justify-center min-w-[70px]">
                      <CalendarIcon size={20} className="mb-1" />
                      <span className="text-xs font-bold">{format(parseISO(ev.event_date), 'HH:mm')}</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                        {ev.title}
                        {ev.is_reminder && <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Lembrete</span>}
                      </h4>
                      {ev.description && <p className="text-gray-600 mt-1">{ev.description}</p>}
                    </div>
                  </li>
                ))}
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
                {tomorrowEvents.map((ev, idx) => (
                  <li key={idx} className="p-4 hover:bg-gray-50 transition-colors flex items-start gap-4">
                    <div className="bg-blue-100 text-blue-800 p-3 rounded-lg flex flex-col items-center justify-center min-w-[70px]">
                      <CalendarIcon size={20} className="mb-1" />
                      <span className="text-xs font-bold">{format(parseISO(ev.event_date), 'HH:mm')}</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                        {ev.title}
                        {ev.is_reminder && <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Lembrete</span>}
                      </h4>
                      {ev.description && <p className="text-gray-600 mt-1">{ev.description}</p>}
                    </div>
                  </li>
                ))}
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
            </div>
            <div className="flex items-center justify-between gap-2 mt-2">
              <button
                onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))}
                className="text-xs bg-emerald-500 hover:bg-emerald-400 text-white px-3 py-1.5 rounded border border-emerald-400 font-bold transition-colors shadow-sm"
              >
                Visualizar Fixados Hoje
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-2 py-1 flex-1 max-w-[140px] rounded text-emerald-900 text-sm font-bold border-none outline-none focus:ring-2 focus:ring-emerald-300 ml-2"
              />
            </div>
          </div>

          <div className="p-0 h-96 overflow-y-auto">
            {selectedDateFiltered.length > 0 ? (
              <ul className="divide-y divide-gray-100">
                {selectedDateFiltered.map((ev, idx) => (
                  <li key={idx} className="p-4 hover:bg-gray-50 transition-colors flex items-start gap-4">
                    <div className="bg-emerald-100 text-emerald-800 p-3 rounded-lg flex flex-col items-center justify-center min-w-[70px]">
                      <CalendarIcon size={20} className="mb-1" />
                      <span className="text-xs font-bold">{format(parseISO(ev.event_date), 'HH:mm')}</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                        {ev.title}
                        {ev.is_reminder && <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Lembrete</span>}
                      </h4>
                      {ev.description && <p className="text-gray-600 mt-1">{ev.description}</p>}
                    </div>
                  </li>
                ))}
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
