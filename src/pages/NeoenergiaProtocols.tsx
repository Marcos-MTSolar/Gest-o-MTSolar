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
  X
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

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTarget, setModalTarget] = useState<any>(null);
  const [modalFormData, setModalFormData] = useState({
    pendencia: '',
    observacoes: '',
    numero_protocolo: '',
    data_prevista: ''
  });

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

  const filteredProtocols = protocols.filter(p => 
    p.client_name.toLowerCase().includes(search.toLowerCase()) ||
    (p.cpf_cnpj && p.cpf_cnpj.includes(search)) ||
    (p.numero_protocolo && p.numero_protocolo.includes(search))
  );

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
          <div className="p-6 border-b border-gray-50 bg-gray-50/50">
            <h2 className="text-lg font-bold text-gray-800">{editingId ? 'Editar Protocolo Selecionado' : 'Novo Cadastro de Protocolo'}</h2>
            <p className="text-sm text-gray-500">Preencha as informações do cliente e da solicitação</p>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredProtocols.length > 0 ? filteredProtocols.map(p => {
              const isOverdue =
                !!p.data_prevista &&
                p.status === 'em_andamento' &&
                new Date(p.data_prevista) < new Date(new Date().toISOString().split('T')[0]);

              const isResolved = p.resolved_at !== null;
              const daysLeft = isResolved ? 5 - differenceInDays(new Date(), parseISO(p.resolved_at)) : null;

              return (
                <div 
                  key={p.id} 
                  className={`p-6 rounded-2xl border transition-all hover:shadow-md relative overflow-hidden ${
                    isOverdue ? 'bg-red-50 border-red-300' : 
                    isResolved ? 'bg-green-50 border-green-200' : 
                    'bg-white border-gray-100'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-800 text-lg">{p.client_name}</h3>
                        {p.parent_id && <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-[9px] font-black uppercase">Atualização</span>}
                      </div>
                      <p className="text-xs text-gray-500 font-medium">{p.numero_protocolo ? `Protocolo: ${p.numero_protocolo}` : 'Sem número de protocolo'}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {getStatusBadge(p)}
                      {isResolved && (
                        <span className="text-[9px] font-bold text-green-700 bg-green-100/50 px-2 py-0.5 rounded">
                          RESOLVIDO · {daysLeft} dias restantes
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm text-gray-700 font-bold mb-1">Pendência:</p>
                    <p className="text-sm text-gray-600 line-clamp-2 italic">"{p.pendencia}"</p>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-6 bg-gray-50/50 p-2 rounded-lg">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={14} className="text-gray-400" />
                      <span>Prev: {p.data_prevista ? format(parseISO(p.data_prevista), 'dd/MM/yyyy') : '—'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} className="text-gray-400" />
                      <span>Criado: {format(parseISO(p.created_at), 'dd/MM/yyyy')}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100/50">
                    <div className="flex gap-1.5">
                      <button 
                        onClick={() => handleEdit(p)}
                        className="p-2.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Editar"
                      >
                        <Pencil size={18} />
                      </button>
                      <button 
                        onClick={() => handleNewProtocol(p)}
                        className="p-2.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                        title="Novo Protocolo"
                      >
                        <FilePlus size={18} />
                      </button>
                    </div>
                    <div className="flex gap-1.5">
                      {!isResolved && (
                        <button 
                          onClick={() => handleResolve(p.id)}
                          className="p-2.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors"
                          title="Marcar como Resolvido"
                        >
                          <CheckCircle size={18} />
                        </button>
                      )}
                      <button 
                        onClick={() => handleDelete(p.id)}
                        className="p-2.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
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

      {/* Modal Novo Protocolo */}
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
    </div>
  );
}
