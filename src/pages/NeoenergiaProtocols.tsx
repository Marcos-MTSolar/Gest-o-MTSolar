import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { 
  ClipboardList, 
  Pencil, 
  FilePlus, 
  CheckCircle, 
  Trash2, 
  AlertTriangle, 
  Calendar,
  Search,
  Plus,
  ArrowRight,
  Clock,
  Check,
  X,
  Save,
  Users
} from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const inputStyle = "w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white text-gray-800 placeholder-gray-400";
const labelStyle = "block text-sm font-semibold text-gray-700 mb-1.5 ml-1";

export default function NeoenergiaProtocols() {
  const [activeTab, setActiveTab] = useState<'cadastrar' | 'pesquisar'>('cadastrar');
  const [protocols, setProtocols] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // Form State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    client_name: '',
    cpf_cnpj: '',
    phone: '',
    address: '',
    pendencia: '',
    observacoes: '',
    numero_protocolo: '',
    status: 'em_andamento',
    data_prevista: ''
  });

  // Modal Novo Protocolo (Chain)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTarget, setModalTarget] = useState<any>(null);
  const [modalFormData, setModalFormData] = useState({
    pendencia: '',
    observacoes: '',
    numero_protocolo: '',
    data_prevista: ''
  });

  // Modal Importar da Homologação
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importSearch, setImportSearch] = useState('');
  const [allProjects, setAllProjects] = useState<any[]>([]);

  useEffect(() => {
    fetchProtocols();
  }, []);

  const fetchProtocols = async () => {
    try {
      const res = await api.get('/api/neoenergia');
      setProtocols(res.data);
    } catch (err) {
      console.error('Erro ao buscar protocolos:', err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client_name || !formData.pendencia) {
      setMessage({ type: 'error', text: 'Nome do cliente e pendência são obrigatórios.' });
      return;
    }

    setIsSaving(true);
    try {
      if (editingId) {
        await api.put(`/api/neoenergia/${editingId}`, formData);
        setMessage({ type: 'success', text: 'Protocolo atualizado com sucesso!' });
      } else {
        await api.post('/api/neoenergia', formData);
        setMessage({ type: 'success', text: 'Protocolo cadastrado com sucesso!' });
      }
      
      clearForm();
      fetchProtocols();
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Erro ao salvar protocolo.' });
    } finally {
      setIsSaving(false);
    }
  };

  const clearForm = () => {
    setEditingId(null);
    setFormData({
      client_name: '',
      cpf_cnpj: '',
      phone: '',
      address: '',
      pendencia: '',
      observacoes: '',
      numero_protocolo: '',
      status: 'em_andamento',
      data_prevista: ''
    });
  };

  const handleEdit = (p: any) => {
    setEditingId(p.id);
    setFormData({
      client_name: p.client_name,
      cpf_cnpj: p.cpf_cnpj || '',
      phone: p.phone || '',
      address: p.address || '',
      pendencia: p.pendencia,
      observacoes: p.observacoes || '',
      numero_protocolo: p.numero_protocolo || '',
      status: p.status,
      data_prevista: p.data_prevista || ''
    });
    setActiveTab('cadastrar');
  };

  const handleResolve = async (id: number) => {
    if (!window.confirm('Marcar como resolvido? O registro será excluído automaticamente em 5 dias.')) return;
    try {
      await api.put(`/api/neoenergia/${id}/resolve`);
      fetchProtocols();
    } catch (err) {
      alert('Erro ao resolver protocolo.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Deseja realmente excluir este protocolo?')) return;
    try {
      await api.delete(`/api/neoenergia/${id}`);
      fetchProtocols();
    } catch (err) {
      alert('Erro ao excluir protocolo.');
    }
  };

  const handleNewProtocol = (p: any) => {
    setModalTarget(p);
    setModalFormData({
      pendencia: '',
      observacoes: '',
      numero_protocolo: '',
      data_prevista: ''
    });
    setIsModalOpen(true);
  };

  const submitNewProtocol = async () => {
    if (!modalFormData.pendencia) {
      alert('A pendência é obrigatória.');
      return;
    }
    try {
      await api.post(`/api/neoenergia/${modalTarget.id}/novo-protocolo`, {
        ...modalFormData,
        client_name: modalTarget.client_name,
        cpf_cnpj: modalTarget.cpf_cnpj,
        phone: modalTarget.phone,
        address: modalTarget.address
      });
      setIsModalOpen(false);
      fetchProtocols();
      alert('Novo protocolo adicionado. O protocolo anterior foi mantido no histórico.');
    } catch (err) {
      alert('Erro ao adicionar novo protocolo.');
    }
  };

  const openImportModal = async () => {
    setIsImportModalOpen(true);
    try {
      const res = await api.get('/api/projects');
      setAllProjects(res.data);
    } catch (err) {
      console.error('Erro ao buscar projetos:', err);
    }
  };

  const handleImportSelect = (project: any) => {
    setFormData({
      ...formData,
      client_name: project.client_name,
      address: project.address || project.endereco_instalacao || '',
      cpf_cnpj: project.cpf_cnpj || ''
    });
    setIsImportModalOpen(false);
  };

  // Grouping logic for Problem 2
  const groupedProtocols = protocols.reduce((acc: any, p: any) => {
    // Group by name + cpf/cnpj to ensure unique client cards
    const key = `${p.client_name}-${p.cpf_cnpj || ''}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  // Sort each group by created_at DESC (newest first)
  Object.keys(groupedProtocols).forEach(key => {
    groupedProtocols[key].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  });

  // Convert to array of groups and filter by search
  const filteredGroups = Object.values(groupedProtocols).filter((group: any) => {
    const latest = group[0];
    const matchesSearch = 
      latest.client_name.toLowerCase().includes(search.toLowerCase()) ||
      (latest.cpf_cnpj && latest.cpf_cnpj.includes(search)) ||
      (latest.numero_protocolo && latest.numero_protocolo.includes(search));
    return matchesSearch;
  }).sort((a: any, b: any) => {
    // Sort groups by the latest created_at of each group DESC
    return new Date(b[0].created_at).getTime() - new Date(a[0].created_at).getTime();
  });

  const getStatusBadge = (p: any) => {
    const isOverdue =
      !!p.data_prevista &&
      p.status === 'em_andamento' &&
      new Date(p.data_prevista) < new Date(new Date().toISOString().split('T')[0]);

    if (isOverdue) {
      return (
        <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-800 flex items-center gap-1 border border-red-200">
          <AlertTriangle size={10} /> PRAZO VENCIDO
        </span>
      );
    }

    switch (p.status) {
      case 'em_andamento':
        return <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 uppercase">Em Andamento</span>;
      case 'concluido':
        return <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-800 border border-green-200 uppercase">Concluído</span>;
      case 'cancelado':
        return <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200 uppercase">Cancelado</span>;
      default:
        return null;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-blue-900 p-3 rounded-xl shadow-lg shadow-blue-900/20">
          <ClipboardList className="text-white" size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Protocolos Neoenergia</h1>
          <p className="text-gray-500 text-sm">Gestão de solicitações e protocolos da concessionária</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('cadastrar')}
          className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'cadastrar' ? 'bg-white text-blue-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          {editingId ? 'Editar Protocolo' : 'Cadastrar'}
        </button>
        <button
          onClick={() => setActiveTab('pesquisar')}
          className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'pesquisar' ? 'bg-white text-blue-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Pesquisar Protocolos
        </button>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-100' : 'bg-red-50 text-red-800 border border-red-100'}`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {activeTab === 'cadastrar' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-gray-800">{editingId ? 'Editar Protocolo Selecionado' : 'Novo Cadastro de Protocolo'}</h2>
              <p className="text-sm text-gray-500">Preencha as informações do cliente e da solicitação</p>
            </div>
            {!editingId && (
              <button
                onClick={openImportModal}
                className="flex items-center gap-2 bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-800 transition-all shadow-md shadow-blue-900/10"
              >
                <Users size={18} /> Importar da Homologação
              </button>
            )}
          </div>
          
          <form onSubmit={handleSave} className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className={labelStyle}>Nome do Cliente *</label>
                <input
                  type="text"
                  className={inputStyle}
                  value={formData.client_name}
                  onChange={e => setFormData({ ...formData, client_name: e.target.value })}
                  placeholder="Nome completo do titular"
                  required
                />
              </div>

              <div>
                <label className={labelStyle}>CPF / CNPJ</label>
                <input
                  type="text"
                  className={inputStyle}
                  value={formData.cpf_cnpj}
                  onChange={e => setFormData({ ...formData, cpf_cnpj: e.target.value })}
                  placeholder="000.000.000-00"
                />
              </div>

              <div>
                <label className={labelStyle}>Telefone</label>
                <input
                  type="text"
                  className={inputStyle}
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="md:col-span-2">
                <label className={labelStyle}>Endereço</label>
                <input
                  type="text"
                  className={inputStyle}
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Rua, número, bairro..."
                />
              </div>

              <div className="md:col-span-2">
                <label className={labelStyle}>Pendência / Solicitação *</label>
                <textarea
                  className={`${inputStyle} h-24 resize-none`}
                  value={formData.pendencia}
                  onChange={e => setFormData({ ...formData, pendencia: e.target.value })}
                  placeholder="Descreva o motivo do protocolo..."
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className={labelStyle}>Observações</label>
                <textarea
                  className={`${inputStyle} h-20 resize-none`}
                  value={formData.observacoes}
                  onChange={e => setFormData({ ...formData, observacoes: e.target.value })}
                  placeholder="Informações adicionais..."
                />
              </div>

              <div>
                <label className={labelStyle}>Número do Protocolo</label>
                <input
                  type="text"
                  className={inputStyle}
                  value={formData.numero_protocolo}
                  onChange={e => setFormData({ ...formData, numero_protocolo: e.target.value })}
                  placeholder="Opcional"
                />
              </div>

              <div>
                <label className={labelStyle}>Status</label>
                <select
                  className={inputStyle}
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="em_andamento">Em Andamento</option>
                  <option value="concluido">Concluído</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>

              <div>
                <label className={labelStyle}>Data Prevista de Conclusão</label>
                <input
                  type="date"
                  className={inputStyle}
                  value={formData.data_prevista}
                  onChange={e => setFormData({ ...formData, data_prevista: e.target.value })}
                />
              </div>
            </div>

            <div className="mt-10 flex gap-4 border-t border-gray-100 pt-8">
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 bg-blue-900 text-white py-3 px-6 rounded-xl font-bold hover:bg-blue-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 disabled:opacity-50"
              >
                {isSaving ? 'Salvando...' : editingId ? <><Save className="inline-block" size={20}/> Atualizar Protocolo</> : <><Plus className="inline-block" size={20}/> Criar Protocolo</>}
              </button>
              <button
                type="button"
                onClick={clearForm}
                className="px-8 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-all"
              >
                {editingId ? 'Cancelar Edição' : 'Limpar'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
            <input
              type="text"
              placeholder="Buscar por cliente, CPF ou protocolo..."
              className={`${inputStyle} pl-12 h-14 text-base shadow-sm`}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredGroups.length > 0 ? filteredGroups.map((group: any, gIdx) => {
              const latest = group[0];
              const history = group.slice(1);
              
              const isOverdue =
                !!latest.data_prevista &&
                latest.status === 'em_andamento' &&
                new Date(latest.data_prevista) < new Date(new Date().toISOString().split('T')[0]);

              const isResolved = latest.resolved_at !== null;
              const daysLeft = isResolved ? 5 - differenceInDays(new Date(), parseISO(latest.resolved_at)) : null;

              return (
                <div 
                  key={latest.id} 
                  className={`rounded-2xl border transition-all hover:shadow-md relative overflow-hidden flex flex-col ${
                    isOverdue ? 'bg-red-50 border-red-300 shadow-red-100/50' : 
                    isResolved ? 'bg-green-50 border-green-200 shadow-green-100/50' : 
                    'bg-white border-gray-100'
                  }`}
                >
                  {/* Header (Client Info) */}
                  <div className="p-6 border-b border-gray-100/50">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-gray-800 text-lg mb-0.5">{latest.client_name}</h3>
                        <p className="text-xs text-gray-400 font-medium">{latest.cpf_cnpj ? `CPF/CNPJ: ${latest.cpf_cnpj}` : 'Sem documento'}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {getStatusBadge(latest)}
                        {isResolved && (
                          <span className="text-[9px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full border border-green-200 uppercase tracking-tighter">
                            RESOLVIDO · {daysLeft}d restantes
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Body (Current / Latest Protocol) */}
                  <div className="p-6 bg-white/40">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-1.5 py-0.5 rounded bg-blue-900 text-white text-[9px] font-black uppercase tracking-wider">Protocolo Atual</span>
                      {latest.numero_protocolo && <span className="text-xs text-gray-500 font-bold"># {latest.numero_protocolo}</span>}
                    </div>

                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-gray-400 font-bold uppercase mb-1">Pendência:</p>
                        <p className="text-sm text-gray-700 leading-relaxed font-medium">"{latest.pendencia}"</p>
                      </div>

                      {latest.observacoes && (
                        <div>
                          <p className="text-xs text-gray-400 font-bold uppercase mb-1">Observações:</p>
                          <p className="text-sm text-gray-600 italic leading-relaxed">{latest.observacoes}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-[11px] text-gray-500 mt-6 bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-blue-500" />
                        <span>Prev: <b className="text-gray-700">{latest.data_prevista ? format(parseISO(latest.data_prevista), 'dd/MM/yyyy') : '—'}</b></span>
                      </div>
                      <div className="flex items-center gap-1.5 ml-auto">
                        <Clock size={14} className="text-gray-400" />
                        <span>{format(parseISO(latest.created_at), 'dd/MM/yyyy')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions (Only for Latest) */}
                  <div className="px-6 py-4 bg-gray-50/50 flex items-center justify-between border-t border-gray-100/50">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleEdit(latest)}
                        className="p-2.5 rounded-xl bg-white border border-gray-200 text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm"
                        title="Editar"
                      >
                        <Pencil size={18} />
                      </button>
                      <button 
                        onClick={() => handleNewProtocol(latest)}
                        className="p-2.5 rounded-xl bg-white border border-gray-200 text-emerald-600 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all shadow-sm"
                        title="Novo Protocolo"
                      >
                        <FilePlus size={18} />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      {!isResolved && (
                        <button 
                          onClick={() => handleResolve(latest.id)}
                          className="p-2.5 rounded-xl bg-white border border-gray-200 text-green-600 hover:bg-green-600 hover:text-white hover:border-green-600 transition-all shadow-sm"
                          title="Marcar como Resolvido"
                        >
                          <CheckCircle size={18} />
                        </button>
                      )}
                      <button 
                        onClick={() => handleDelete(latest.id)}
                        className="p-2.5 rounded-xl bg-white border border-gray-200 text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all shadow-sm"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  {/* History Section (Older Protocols) */}
                  {history.length > 0 && (
                    <div className="border-t border-gray-100">
                      <div className="px-6 py-3 bg-gray-50/80 flex items-center gap-2">
                        <Clock size={14} className="text-gray-400" />
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Histórico de Atualizações</span>
                        <span className="ml-auto text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-black">{history.length}</span>
                      </div>
                      <div className="max-h-60 overflow-y-auto custom-scrollbar bg-gray-50/30">
                        {history.map((h: any, hIdx: number) => (
                          <div key={h.id} className={`p-5 ${hIdx !== history.length - 1 ? 'border-b border-gray-100' : ''}`}>
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-[10px] text-gray-400 font-bold uppercase">{format(parseISO(h.created_at), 'dd MMM yyyy', { locale: ptBR })}</span>
                              <div className="scale-75 origin-right">{getStatusBadge(h)}</div>
                            </div>
                            <p className="text-xs text-gray-600 mb-2 font-medium line-clamp-2 italic">"{h.pendencia}"</p>
                            <div className="flex items-center gap-3 text-[9px] text-gray-400 font-bold uppercase">
                              {h.numero_protocolo && <span>Protocolo: {h.numero_protocolo}</span>}
                              {h.data_prevista && <span>Previsão: {format(parseISO(h.data_prevista), 'dd/MM/yyyy')}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            }) : (
              <div className="md:col-span-2 py-20 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                <Search size={48} className="mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500 font-medium">Nenhum protocolo encontrado.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Novo Protocolo (Chain) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 p-8 text-white">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold mb-1">Novo Protocolo: {modalTarget?.client_name}</h3>
                  <p className="text-emerald-100 text-sm">Adicionar atualização ao histórico do cliente</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition-colors">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-8 space-y-6">
              <div>
                <label className={labelStyle}>Nova Pendência / Solicitação *</label>
                <textarea
                  className={`${inputStyle} h-28 resize-none`}
                  value={modalFormData.pendencia}
                  onChange={e => setModalFormData({ ...modalFormData, pendencia: e.target.value })}
                  placeholder="O que mudou ou qual a nova solicitação?"
                  required
                />
              </div>

              <div>
                <label className={labelStyle}>Novo Número de Protocolo</label>
                <input
                  type="text"
                  className={inputStyle}
                  value={modalFormData.numero_protocolo}
                  onChange={e => setModalFormData({ ...modalFormData, numero_protocolo: e.target.value })}
                  placeholder="Ex: 202400123456"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelStyle}>Nova Data Prevista</label>
                  <input
                    type="date"
                    className={inputStyle}
                    value={modalFormData.data_prevista}
                    onChange={e => setModalFormData({ ...modalFormData, data_prevista: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className={labelStyle}>Observações Adicionais</label>
                <textarea
                  className={`${inputStyle} h-20 resize-none`}
                  value={modalFormData.observacoes}
                  onChange={e => setModalFormData({ ...modalFormData, observacoes: e.target.value })}
                  placeholder="Algum detalhe importante?"
                />
              </div>
            </div>

            <div className="p-8 bg-gray-50 flex gap-4">
              <button
                onClick={submitNewProtocol}
                className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
              >
                <Check size={20} /> Salvar e Adicionar ao Histórico
              </button>
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-8 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-100 transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Importar da Homologação */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl animate-in slide-in-from-bottom-8 duration-300 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 bg-blue-900 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">Importar da Homologação</h3>
                <p className="text-blue-100 text-xs">Selecione um projeto para preencher os dados</p>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} className="hover:bg-white/20 p-2 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Buscar projeto por nome..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={importSearch}
                  onChange={e => setImportSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
              {allProjects.filter(p => p.client_name.toLowerCase().includes(importSearch.toLowerCase())).length > 0 ? (
                allProjects
                  .filter(p => p.client_name.toLowerCase().includes(importSearch.toLowerCase()))
                  .map(p => (
                    <div key={p.id} className="p-4 border border-gray-100 rounded-xl hover:bg-gray-50 flex justify-between items-center transition-colors">
                      <div>
                        <h4 className="font-bold text-gray-800">{p.client_name}</h4>
                        <p className="text-xs text-gray-500">{p.address || p.endereco_instalacao || 'Sem endereço cadastrado'}</p>
                        {p.cpf_cnpj && <p className="text-[10px] text-blue-600 font-bold mt-1">DOC: {p.cpf_cnpj}</p>}
                      </div>
                      <button
                        onClick={() => handleImportSelect(p)}
                        className="bg-blue-100 text-blue-900 px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-900 hover:text-white transition-all"
                      >
                        Selecionar
                      </button>
                    </div>
                  ))
              ) : (
                <div className="py-10 text-center text-gray-400">
                  <p>Nenhum projeto encontrado.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
