import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, Bell, Trash2, X, CheckCircle2 } from 'lucide-react';

interface Event {
  id: number;
  title: string;
  description: string;
  event_date: string;
  is_reminder: boolean;
  completed?: boolean;
}

export default function Agenda() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    time: '09:00',
    is_reminder: false,
    completed: false,
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await axios.get('/api/events');
      setEvents(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Error fetching events:', error);
      setEvents([]);
    }
  };

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setEditingEvent(null);
    setFormData({
      title: '',
      description: '',
      time: format(new Date(), 'HH:mm'),
      is_reminder: false,
      completed: false,
    });
    setShowModal(true);
  };

  const handleEventClick = (e: React.MouseEvent, event: Event) => {
    e.stopPropagation();
    setSelectedDate(parseISO(event.event_date));
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description || '',
      time: format(parseISO(event.event_date), 'HH:mm'),
      is_reminder: !!event.is_reminder,
      completed: !!event.completed,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) return;

    const [hours, minutes] = formData.time.split(':');
    const eventDate = new Date(selectedDate);
    eventDate.setHours(parseInt(hours), parseInt(minutes));

    const payload = {
      title: formData.title,
      description: formData.description,
      event_date: eventDate.toISOString(),
      is_reminder: formData.is_reminder,
    };

    try {
      if (editingEvent) {
        await axios.put(`/api/events/${editingEvent.id}`, payload);
        // Update completed status separately if changed
        if (formData.completed !== !!editingEvent.completed) {
          await axios.put(`/api/events/${editingEvent.id}/complete`, { completed: formData.completed });
        }
      } else {
        await axios.post('/api/events', payload);
      }
      fetchEvents();
      setShowModal(false);
    } catch (error) {
      alert('Erro ao salvar evento');
    }
  };

  const handleDelete = async () => {
    if (!editingEvent) return;
    if (confirm('Tem certeza que deseja excluir este evento?')) {
      try {
        await axios.delete(`/api/events/${editingEvent.id}`);
        fetchEvents();
        setShowModal(false);
      } catch (error) {
        alert('Erro ao excluir evento');
      }
    }
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <CalendarIcon className="text-blue-900" />
          Agenda
        </h1>
        <div className="flex items-center gap-4 bg-white p-2 rounded-lg shadow-sm">
          <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-100 rounded-full">
            <ChevronLeft size={24} />
          </button>
          <span className="text-lg font-semibold min-w-[150px] text-center capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </span>
          <button onClick={handleNextMonth} className="p-1 hover:bg-gray-100 rounded-full">
            <ChevronRight size={24} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm flex-1 flex flex-col overflow-hidden">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 border-b bg-gray-50">
          {weekDays.map(day => (
            <div key={day} className="py-3 text-center text-sm font-semibold text-gray-600">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 flex-1 auto-rows-fr">
          {calendarDays.map(day => {
            const dayEvents = events.filter(e => isSameDay(parseISO(e.event_date), day));
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isToday = isSameDay(day, new Date());
            const allDone = dayEvents.length > 0 && dayEvents.every(e => e.completed);

            return (
              <div
                key={day.toString()}
                onClick={() => handleDayClick(day)}
                className={`
                  border-b border-r p-2 min-h-[100px] cursor-pointer transition-colors hover:bg-gray-50
                  ${!isCurrentMonth ? 'bg-gray-50/50 text-gray-400' : 'bg-white'}
                  ${isToday ? 'bg-blue-50' : ''}
                `}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`
                    text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                    ${isToday ? 'bg-blue-600 text-white' : ''}
                  `}>
                    {format(day, 'd')}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className={`text-xs px-1.5 rounded-full ${allDone ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                      {allDone ? '✓' : dayEvents.length}
                    </span>
                  )}
                </div>

                <div className="space-y-1 overflow-y-auto max-h-[80px]">
                  {dayEvents.map(event => (
                    <div
                      key={event.id}
                      onClick={(e) => handleEventClick(e, event)}
                      className={`
                        text-xs p-1 rounded truncate flex items-center gap-1
                        ${event.completed
                          ? 'bg-green-50 text-green-700 border-l-2 border-green-500 line-through opacity-70'
                          : event.is_reminder
                            ? 'bg-amber-100 text-amber-800 border-l-2 border-amber-500'
                            : 'bg-blue-100 text-blue-800 border-l-2 border-blue-500'
                        }
                      `}
                    >
                      {event.completed
                        ? <CheckCircle2 size={10} />
                        : event.is_reminder
                          ? <Bell size={10} />
                          : null
                      }
                      <span className="truncate">{format(parseISO(event.event_date), 'HH:mm')} {event.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Event Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b bg-gray-50">
              <h3 className="font-bold text-lg text-gray-800">
                {editingEvent ? 'Editar Evento' : 'Novo Evento'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                <div className="text-gray-900 font-medium flex items-center gap-2">
                  <CalendarIcon size={18} className="text-gray-500" />
                  {selectedDate && format(selectedDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                <input
                  type="text"
                  required
                  className={`w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none ${formData.completed ? 'line-through text-gray-400' : ''}`}
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Reunião, Visita, etc."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Horário</label>
                  <div className="relative">
                    <Clock size={16} className="absolute left-3 top-3 text-gray-400" />
                    <input
                      type="time"
                      required
                      className="w-full border p-2 pl-9 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.time}
                      onChange={e => setFormData({ ...formData, time: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      checked={formData.is_reminder}
                      onChange={e => setFormData({ ...formData, is_reminder: e.target.checked })}
                    />
                    <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                      <Bell size={16} className={formData.is_reminder ? "text-amber-500" : "text-gray-400"} />
                      Lembrete
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                <textarea
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detalhes adicionais..."
                />
              </div>

              {/* Attended Toggle — only show when editing */}
              {editingEvent && (
                <div className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${formData.completed
                    ? 'bg-green-50 border-green-300'
                    : 'bg-gray-50 border-gray-200 hover:border-green-300'
                  }`}
                  onClick={() => setFormData(d => ({ ...d, completed: !d.completed }))}
                >
                  <CheckCircle2 size={20} className={formData.completed ? 'text-green-600' : 'text-gray-400'} />
                  <div>
                    <p className={`text-sm font-semibold ${formData.completed ? 'text-green-700' : 'text-gray-700'}`}>
                      {formData.completed ? 'Compromisso Atendido ✓' : 'Marcar como Atendido'}
                    </p>
                    {formData.completed && (
                      <p className="text-xs text-green-600">Clique para desfazer</p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                {editingEvent && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded font-medium flex items-center gap-2 mr-auto"
                  >
                    <Trash2 size={18} /> Excluir
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-900 text-white rounded hover:bg-blue-800 font-medium shadow-sm"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
