import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { 
  ClipboardList, 
  Search, 
  Filter, 
  AlertTriangle,
  Clock,
  MessageSquare,
  User,
  ArrowUpDown,
  Activity
} from 'lucide-react';
import { cn } from '../lib/utils';
import { differenceInDays, differenceInHours, differenceInMinutes, format } from 'date-fns';

const WHATSAPP_TAGS = [
  { id: 'Atendimento Iniciado', label: 'Atendimento Iniciado', color: '#3B82F6' },
  { id: 'Cuidar e Fechar', label: 'Cuidar e Fechar', color: '#F97316' },
  { id: 'Fechou Venda', label: 'Fechou Venda', color: '#16A34A' },
  { id: 'Lead Desqualificado', label: 'Lead Desqualificado', color: '#DC2626' },
  { id: 'Lead Qualificado', label: 'Lead Qualificado', color: '#22C55E' },
  { id: 'Não Fechou Venda', label: 'Não Fechou Venda', color: '#6B7280' },
  { id: 'Orçamento Enviado', label: 'Orçamento Enviado', color: '#9333EA' },
  { id: 'Visita Agendada', label: 'Visita Agendada', color: '#EAB308' },
  { id: 'Transferido', label: 'Transferido', color: '#1D4ED8' },
];

interface Observation {
  id: string;
  user_name: string;
  observation: string;
  created_at: string;
}

interface ConversationRecord {
  id: string;
  contact_name: string;
  phone: string;
  tags: string[];
  last_message_at: string;
  assigned_to: string;
  assigned_name: string;
  status: string;
  whatsapp_observations: Observation[];
}

interface KommoTrackingRecord {
  id: string;
  contact_name: string;
  phone: string;
  kommo_status_id_origem: string;
  kommo_status_id_atual: string;
  assigned_to: string;
  assigned_name: string;
  created_at: string;
}

export default function AttendanceRegistry() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'registry' | 'kommo'>('registry');

  const [records, setRecords] = useState<ConversationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [kommoRecords, setKommoRecords] = useState<KommoTrackingRecord[]>([]);
  const [loadingKommo, setLoadingKommo] = useState(false);

  // Filtros e Ordenação
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAgent, setFilterAgent] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const isAdmin = user?.role?.toUpperCase() === 'CEO' || user?.role?.toUpperCase() === 'ADMIN';

  useEffect(() => {
    fetchRecords();
    fetchKommoRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/api/attendance-registry');
      setRecords(data || []);
    } catch (error) {
      console.error('Erro ao buscar registros de atendimento:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchKommoRecords = async () => {
    try {
      setLoadingKommo(true);
      const { data } = await api.get('/api/attendance-registry/kommo-tracking');
      setKommoRecords(data || []);
    } catch (error) {
      console.error('Erro ao buscar rastreio kommo:', error);
    } finally {
      setLoadingKommo(false);
    }
  };

  const getKommoStatusLabel = (statusId: string) => {
    if (!statusId) return '-';
    if (statusId === '107282587') return 'LEAD';
    if (statusId === '107282595') return 'CONVERSANDO';
    return statusId;
  };

  const getIdleTime = (lastMessageAt: string) => {
    const lastMsgDate = new Date(lastMessageAt);
    const now = new Date();
    
    const days = differenceInDays(now, lastMsgDate);
    const hours = differenceInHours(now, lastMsgDate);
    const minutes = differenceInMinutes(now, lastMsgDate);

    if (days > 0) return `${days} dia${days > 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hora${hours > 1 ? 's' : ''}`;
    return `${minutes} minuto${minutes > 1 ? 's' : ''}`;
  };

  const isIdleWarning = (lastMessageAt: string) => {
    return differenceInDays(new Date(), new Date(lastMessageAt)) > 5;
  };

  const filteredRecords = records
    .filter(record => {
      const matchSearch = (record.contact_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (record.phone || '').includes(searchTerm);
      const matchAgent = filterAgent ? record.assigned_name === filterAgent : true;
      const matchTag = filterTag ? (record.tags || []).includes(filterTag) : true;
      return matchSearch && matchAgent && matchTag;
    })
    .sort((a, b) => {
      const timeA = new Date(a.last_message_at).getTime();
      const timeB = new Date(b.last_message_at).getTime();
      return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });

  // Extrair lista única de agentes para o filtro
  const uniqueAgents = Array.from(new Set(records.map(r => r.assigned_name).filter(Boolean)));

  return (
    <div className="space-y-6 animate-in fade-in zoom-in duration-300">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-3 rounded-xl shadow-lg shadow-blue-600/20">
            <ClipboardList className="text-white w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Registro de Atendimentos</h1>
            <p className="text-gray-500 font-medium">Acompanhamento e auditoria de clientes em atendimento</p>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('registry')}
          className={cn(
            "py-3 px-6 font-medium text-sm border-b-2 transition-colors outline-none",
            activeTab === 'registry' 
              ? "border-blue-600 text-blue-600" 
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
        >
          Atendimentos Ativos
        </button>
        <button
          onClick={() => setActiveTab('kommo')}
          className={cn(
            "py-3 px-6 font-medium text-sm border-b-2 transition-colors outline-none flex items-center gap-2",
            activeTab === 'kommo' 
              ? "border-blue-600 text-blue-600" 
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
        >
          <Activity size={16} />
          Rastreio Kommo
        </button>
      </div>

      {activeTab === 'registry' && (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por nome ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow"
              />
            </div>
            <div className="flex gap-2">
              {isAdmin && (
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <select
                    value={filterAgent}
                    onChange={(e) => setFilterAgent(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none bg-white min-w-[150px]"
                  >
                    <option value="">Todos Vendedores</option>
                    {uniqueAgents.map(agent => (
                      <option key={agent} value={agent}>{agent}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select
                  value={filterTag}
                  onChange={(e) => setFilterTag(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none bg-white min-w-[150px]"
                >
                  <option value="">Todas Etiquetas</option>
                  {WHATSAPP_TAGS.map(tag => (
                    <option key={tag.id} value={tag.id}>{tag.label}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors font-medium text-sm"
                title="Ordenar por tempo parado"
              >
                <ArrowUpDown size={16} />
                <span className="hidden sm:inline">Tempo Parado</span>
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 font-bold text-gray-600 text-sm">Cliente</th>
                <th className="px-6 py-4 font-bold text-gray-600 text-sm">Responsável</th>
                <th className="px-6 py-4 font-bold text-gray-600 text-sm">Etiquetas</th>
                <th className="px-6 py-4 font-bold text-gray-600 text-sm">
                  <div className="flex items-center gap-1 group relative">
                    Tempo sem Interação
                    <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-gray-800 text-white text-xs rounded shadow-lg w-48 text-center z-10">
                      Tempo desde a última mensagem na conversa (enviada ou recebida)
                    </div>
                  </div>
                </th>
                <th className="px-6 py-4 font-bold text-gray-600 text-sm">Última Observação</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Carregando atendimentos...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Nenhum atendimento encontrado.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => {
                  const isWarning = isIdleWarning(record.last_message_at);

                  return (
                    <tr 
                      key={record.id} 
                      className={cn(
                        "border-b border-gray-50 hover:bg-gray-50/50 transition-colors",
                        isWarning ? "bg-red-50/30 hover:bg-red-50/50" : ""
                      )}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm",
                            isWarning ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                          )}>
                            {(record.contact_name || 'S')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-gray-800">{record.contact_name || "Sem Nome"}</p>
                            <p className="text-xs text-gray-500">{record.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-gray-400" />
                          <span className="font-medium text-gray-700 text-sm">{record.assigned_name || 'Não Atribuído'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {(record.tags || []).length === 0 ? (
                            <span className="text-xs text-gray-400 italic">Sem etiquetas</span>
                          ) : (
                            record.tags.map(tid => {
                              const tagObj = WHATSAPP_TAGS.find(t => t.id === tid);
                              if (!tagObj) return null;
                              return (
                                <span 
                                  key={tagObj.id}
                                  className="px-2 py-1 text-white rounded text-[10px] font-bold uppercase"
                                  style={{ backgroundColor: tagObj.color }}
                                >
                                  {tagObj.label}
                                </span>
                              );
                            })
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {isWarning ? (
                            <AlertTriangle size={16} className="text-red-500" />
                          ) : (
                            <Clock size={16} className="text-gray-400" />
                          )}
                          <span className={cn(
                            "font-bold text-sm",
                            isWarning ? "text-red-600" : "text-gray-700"
                          )}>
                            {getIdleTime(record.last_message_at)}
                          </span>
                        </div>
                        {isWarning && (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-red-100 text-red-700 text-[9px] font-bold uppercase rounded">
                            Alerta de Inatividade
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {record.whatsapp_observations?.length > 0 ? (
                          <div className="space-y-3 max-w-xs">
                            {record.whatsapp_observations.slice(0, 2).map((obs) => (
                              <div key={obs.id} className="border-b border-gray-100 last:border-0 pb-2 last:pb-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                    {obs.user_name}
                                  </span>
                                  <span className="text-[10px] text-gray-400">
                                    {format(new Date(obs.created_at), 'dd/MM HH:mm')}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600" title={obs.observation}>
                                  {obs.observation}
                                </p>
                              </div>
                            ))}
                            {record.whatsapp_observations.length > 2 && (
                              <div className="pt-1">
                                <details className="group">
                                  <summary className="text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer list-none">
                                    Ver todas ({record.whatsapp_observations.length})
                                  </summary>
                                  <div className="mt-3 space-y-3">
                                    {record.whatsapp_observations.slice(2).map((obs) => (
                                      <div key={obs.id} className="border-b border-gray-100 last:border-0 pb-2 last:pb-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                            {obs.user_name}
                                          </span>
                                          <span className="text-[10px] text-gray-400">
                                            {format(new Date(obs.created_at), 'dd/MM HH:mm')}
                                          </span>
                                        </div>
                                        <p className="text-xs text-gray-600" title={obs.observation}>
                                          {obs.observation}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-gray-400 text-xs italic">
                            <MessageSquare size={14} /> Nenhuma nota
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {activeTab === 'kommo' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 font-bold text-gray-600 text-sm">Cliente</th>
                  <th className="px-6 py-4 font-bold text-gray-600 text-sm">Origem (Entrada)</th>
                  <th className="px-6 py-4 font-bold text-gray-600 text-sm">Status Atual (Kommo)</th>
                  <th className="px-6 py-4 font-bold text-gray-600 text-sm">Responsável (MTSolar)</th>
                  <th className="px-6 py-4 font-bold text-gray-600 text-sm">Data de Chegada</th>
                </tr>
              </thead>
              <tbody>
                {loadingKommo ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      Carregando rastreio Kommo...
                    </td>
                  </tr>
                ) : kommoRecords.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      Nenhum lead com origem no Kommo encontrado.
                    </td>
                  </tr>
                ) : (
                  kommoRecords.map((record) => (
                    <tr key={record.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-800">{record.contact_name || "Sem Nome"}</span>
                          <span className="text-xs text-gray-500">{record.phone}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded">
                          {getKommoStatusLabel(record.kommo_status_id_origem)}
                        </span>
                        <div className="text-[10px] text-gray-400 mt-1">ID: {record.kommo_status_id_origem || '-'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-1 text-xs font-bold rounded text-white",
                          record.kommo_status_id_atual === '107282595' ? "bg-blue-500" : "bg-purple-500"
                        )}>
                          {getKommoStatusLabel(record.kommo_status_id_atual)}
                        </span>
                        <div className="text-[10px] text-gray-400 mt-1">ID: {record.kommo_status_id_atual || '-'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-gray-400" />
                          <span className="font-medium text-gray-700 text-sm">{record.assigned_name || 'Fila de Espera'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock size={14} className="text-gray-400" />
                          {format(new Date(record.created_at), 'dd/MM/yyyy HH:mm')}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
