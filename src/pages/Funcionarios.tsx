import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Pencil, Clock, Plus, X, UserMinus, UserCheck, Search, Loader2, FileText, Download, Trash, FileSpreadsheet } from 'lucide-react';
import toast from 'react-hot-toast';

type UserProfile = {
  id: number;
  name: string;
  email: string;
  role: 'CEO' | 'ADMIN' | 'COMMERCIAL' | 'TECHNICAL';
  active: boolean;
  company_id: string;
  cpf?: string;
  cargo?: string;
  data_admissao?: string;
  recebe_leads?: boolean;
};

const ROLE_LABELS: Record<string, string> = {
  CEO: 'CEO',
  ADMIN: 'Administrador',
  COMMERCIAL: 'Vendedor',
  TECHNICAL: 'Técnico',
};

export default function Funcionarios() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'COMMERCIAL' as UserProfile['role'],
    active: true,
    cpf: '',
    cargo: '',
    data_admissao: '',
  });
  const [submitting, setSubmitting] = useState(false);
  
  // Atestados states
  const [isAtestadoModalOpen, setIsAtestadoModalOpen] = useState(false);
  const [selectedUserForCert, setSelectedUserForCert] = useState<UserProfile | null>(null);
  const [certsList, setCertsList] = useState<any[]>([]);
  const [loadingCerts, setLoadingCerts] = useState(false);
  const [certFormData, setCertFormData] = useState({
    start_date: '',
    days_off: '1',
    cid: '',
    notes: '',
  });
  const [certFile, setCertFile] = useState<File | null>(null);
  const [savingCert, setSavingCert] = useState(false);

  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setFormData(prev => ({ ...prev, cpf: formatted }));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/users');
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error('Erro ao buscar funcionários');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'COMMERCIAL',
      active: true,
      cpf: '',
      cargo: '',
      data_admissao: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: UserProfile) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '', // Leave empty for optional change
      role: user.role,
      active: user.active,
      cpf: user.cpf || '',
      cargo: user.cargo || user.role,
      data_admissao: user.data_admissao || '',
    });
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (user: UserProfile) => {
    const nextActive = !user.active;
    const actionText = nextActive ? 'reativar' : 'desativar';
    if (!confirm(`Deseja realmente ${actionText} o funcionário ${user.name}?`)) {
      return;
    }

    try {
      await api.put(`/api/users/${user.id}`, {
        name: user.name,
        email: user.email,
        role: user.role,
        active: nextActive,
        cpf: user.cpf || '',
        cargo: user.cargo || user.role,
        data_admissao: user.data_admissao || null,
      });
      toast.success(`Funcionário ${nextActive ? 'reativado' : 'desativado'} com sucesso!`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || `Erro ao ${actionText} funcionário.`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('O nome completo é obrigatório.');
      return;
    }
    if (!formData.email.trim()) {
      toast.error('O e-mail é obrigatório.');
      return;
    }
    if (!editingUser && !formData.password) {
      toast.error('A senha é obrigatória para novos cadastros.');
      return;
    }
    if (!formData.cpf.trim()) {
      toast.error('O CPF é obrigatório.');
      return;
    }
    if (!formData.cargo.trim()) {
      toast.error('O Cargo é obrigatório.');
      return;
    }

    try {
      setSubmitting(true);
      const payload: any = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        active: formData.active,
        cpf: formData.cpf,
        cargo: formData.cargo,
        data_admissao: formData.data_admissao || null,
      };

      if (editingUser) {
        // Edit mode
        if (formData.password) {
          payload.password = formData.password;
        }
        await api.put(`/api/users/${editingUser.id}`, payload);
        toast.success('Funcionário atualizado com sucesso!');
      } else {
        // Create mode
        payload.password = formData.password;
        await api.post('/api/users', payload);
        toast.success('Funcionário cadastrado com sucesso!');
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao salvar funcionário.');
    } finally {
      setSubmitting(false);
    }
  };

  // Exclui um atestado médico e atualiza a lista local
  const handleDeleteCert = async (certId: number) => {
    if (!confirm('Tem certeza que deseja excluir este atestado? Esta ação não pode ser desfeita.')) return;
    try {
      await api.delete(`/api/medical-certificates/${certId}`);
      setCertsList(prev => prev.filter(c => c.id !== certId));
      toast.success('Atestado excluído com sucesso.');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao excluir atestado.');
    }
  };

  // Filter users by search term
  const filteredUsers = users.filter((u) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      u.name.toLowerCase().includes(searchLower) ||
      u.email.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestão de Funcionários</h1>
          <p className="text-sm text-gray-500">Cadastre, edite e acompanhe os horários de jornada e ponto dos colaboradores da empresa.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="bg-blue-900 text-white px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-blue-800 transition-all shadow-sm"
        >
          <Plus size={18} /> Novo Funcionário
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3 border border-gray-200">
        <Search className="text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Buscar por nome ou e-mail..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full text-sm outline-none bg-transparent placeholder-gray-400 text-gray-700"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Users List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="animate-spin text-blue-900" size={32} />
            <p className="text-sm text-gray-500 font-medium">Carregando colaboradores...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-sm">Nenhum funcionário encontrado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-xs font-semibold uppercase tracking-wider">
                  <th className="p-4">Nome</th>
                  <th className="p-4">E-mail</th>
                  <th className="p-4">Cargo</th>
                  <th className="p-4">Status</th>
                  {currentUser?.role === 'CEO' && (
                    <th className="p-4 text-center">Recebe Leads</th>
                  )}
                  <th className="p-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 text-sm text-gray-700">
                {filteredUsers.map((u) => {
                  const initial = u.name ? u.name.charAt(0).toUpperCase() : 'F';
                  return (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-950 font-bold flex items-center justify-center text-sm shadow-inner">
                            {initial}
                          </div>
                          <span className="font-semibold text-gray-800">{u.name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-gray-600">{u.email}</td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            u.role === 'CEO'
                              ? 'bg-purple-100 text-purple-800'
                              : u.role === 'ADMIN'
                              ? 'bg-blue-100 text-blue-800'
                              : u.role === 'COMMERCIAL'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {ROLE_LABELS[u.role] || u.role}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${u.active ? 'bg-green-500 animate-pulse' : 'bg-red-400'}`} />
                          <span className={`font-medium ${u.active ? 'text-green-700' : 'text-red-500'}`}>
                            {u.active ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                      </td>
                      {currentUser?.role === 'CEO' && (
                        <td className="p-4 text-center">
                          <button
                            onClick={async () => {
                              try {
                                await api.put(`/api/users/${u.id}`, {
                                  ...u,
                                  recebe_leads: !u.recebe_leads
                                });
                                // Atualiza o estado local
                                setUsers(prev => prev.map((f: any) => 
                                  f.id === u.id 
                                    ? { ...f, recebe_leads: !f.recebe_leads }
                                    : f
                                ));
                              } catch (err) {
                                toast.error('Erro ao atualizar recebe_leads.');
                              }
                            }}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              u.recebe_leads ? 'bg-green-500' : 'bg-gray-300'
                            }`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                              u.recebe_leads ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                          </button>
                        </td>
                      )}
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2.5">
                          <button
                            onClick={() => navigate(`/ponto?userId=${u.id}`)}
                            className="p-2 text-gray-600 hover:text-blue-900 rounded-lg hover:bg-blue-50 transition-all border border-transparent hover:border-blue-100"
                            title="Ver ponto"
                          >
                            <Clock size={18} />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="p-2 text-gray-600 hover:text-indigo-900 rounded-lg hover:bg-indigo-50 transition-all border border-transparent hover:border-indigo-100"
                            title="Editar"
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUserForCert(u);
                              setCertFormData({
                                start_date: new Date().toISOString().split('T')[0],
                                days_off: '1',
                                cid: '',
                                notes: '',
                              });
                              setCertFile(null);
                              setIsAtestadoModalOpen(true);
                              // Carrega o histórico
                              setLoadingCerts(true);
                              api.get(`/api/medical-certificates?userId=${u.id}`)
                                .then((res) => setCertsList(res.data ?? []))
                                .catch(() => toast.error('Erro ao carregar atestados'))
                                .finally(() => setLoadingCerts(false));
                            }}
                            className="p-2 text-gray-600 hover:text-teal-900 rounded-lg hover:bg-teal-50 transition-all border border-transparent hover:border-teal-100"
                            title="Atestados Médicos"
                          >
                            <FileText size={18} />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(u)}
                            className={`p-2 rounded-lg border border-transparent transition-all ${
                              u.active 
                                ? 'text-red-600 hover:text-red-800 hover:bg-red-50 hover:border-red-100' 
                                : 'text-green-600 hover:text-green-800 hover:bg-green-50 hover:border-green-100'
                            }`}
                            title={u.active ? 'Desativar funcionário' : 'Reativar funcionário'}
                          >
                            {u.active ? <UserMinus size={18} /> : <UserCheck size={18} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Cadastro/Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-gray-100 overflow-hidden transform transition-all">
            <div className="flex justify-between items-center px-6 py-4 bg-gray-50 border-b border-gray-150">
              <h2 className="text-lg font-bold text-gray-800">
                {editingUser ? 'Editar Funcionário' : 'Novo Funcionário'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Nome Completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João Silva"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-900 focus:outline-none transition-all"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  E-mail de Acesso <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="Ex: joao.silva@mtsolar.com.br"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-900 focus:outline-none transition-all"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Senha {editingUser ? '(deixe em branco para não alterar)' : <span className="text-red-500">*</span>}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  placeholder={editingUser ? '••••••••' : 'Digite a senha inicial'}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-900 focus:outline-none transition-all"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  CPF <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-900 focus:outline-none transition-all"
                  value={formData.cpf}
                  onChange={handleCPFChange}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Cargo / Função <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:border-blue-900 focus:outline-none transition-all"
                  value={formData.cargo}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({
                      ...formData,
                      cargo: val,
                      role: val as UserProfile['role']
                    });
                  }}
                >
                  <option value="">Selecione o cargo</option>
                  <option value="COMMERCIAL">Vendedor</option>
                  <option value="TECHNICAL">Técnico</option>
                  <option value="ADMIN">Administrador</option>
                  {currentUser?.role === 'CEO' && <option value="CEO">CEO</option>}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Data de Admissão
                </label>
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-900 focus:outline-none transition-all"
                  value={formData.data_admissao ? formData.data_admissao.split('T')[0] : ''}
                  onChange={(e) => {
                    const dateVal = e.target.value; // YYYY-MM-DD
                    if (!dateVal) {
                      setFormData({ ...formData, data_admissao: '' });
                      return;
                    }
                    const parts = dateVal.split('-');
                    const year = parseInt(parts[0], 10);
                    const month = parseInt(parts[1], 10) - 1;
                    const day = parseInt(parts[2], 10);
                    const localDate = new Date(year, month, day);
                    const formatted = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;
                    setFormData({ ...formData, data_admissao: formatted });
                  }}
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="active-checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 text-blue-900 border-gray-300 rounded focus:ring-blue-900"
                />
                <label htmlFor="active-checkbox" className="text-sm font-semibold text-gray-700 cursor-pointer select-none">
                  Status Ativo (Permitir acesso ao sistema)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-150">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="animate-spin" size={16} /> Salvando...
                    </>
                  ) : (
                    'Salvar'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Atestados Médicos (CEO/ADMIN) */}
      {isAtestadoModalOpen && selectedUserForCert && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl border border-gray-100 overflow-hidden transform transition-all flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center px-6 py-4 bg-gray-50 border-b border-gray-150">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Atestados Médicos</h2>
                <p className="text-xs text-gray-500 mt-0.5">Colaborador(a): <strong className="text-gray-700">{selectedUserForCert.name}</strong></p>
              </div>
              <button
                onClick={() => setIsAtestadoModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Formulário Novo Atestado */}
              <div className="bg-gray-50 border rounded-xl p-4 space-y-4">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Lançar Novo Atestado / Afastamento</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Início Afastamento *</label>
                    <input
                      type="date"
                      required
                      value={certFormData.start_date}
                      onChange={e => setCertFormData(p => ({ ...p, start_date: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Dias Afastado *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={certFormData.days_off}
                      onChange={e => setCertFormData(p => ({ ...p, days_off: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">CID (Opcional)</label>
                    <input
                      type="text"
                      placeholder="Ex: M54.5"
                      maxLength={10}
                      value={certFormData.cid}
                      onChange={e => setCertFormData(p => ({ ...p, cid: e.target.value.toUpperCase() }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                    />
                  </div>
                </div>

                {/* Exibição automática do cálculo do término */}
                {certFormData.start_date && parseInt(certFormData.days_off, 10) > 0 && (
                  <div className="text-xs bg-teal-50 border border-teal-100 rounded-lg p-2 text-teal-800 font-medium">
                    🗓️ Período de Afastamento: {(() => {
                      const parts = certFormData.start_date.split('-');
                      const start = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                      const end = new Date(start);
                      end.setDate(end.getDate() + parseInt(certFormData.days_off, 10) - 1);
                      
                      const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                      return `${fmt(start)} até ${fmt(end)}`;
                    })()}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 font-mono">Upload do Documento (Imagem ou PDF) *</label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={e => {
                      const files = e.target.files;
                      if (files && files.length > 0) setCertFile(files[0]);
                    }}
                    className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-900 hover:file:bg-blue-100 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Observações</label>
                  <textarea
                    placeholder="Descrição opcional do afastamento..."
                    value={certFormData.notes}
                    onChange={e => setCertFormData(p => ({ ...p, notes: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[60px]"
                  />
                </div>

                <button
                  onClick={async () => {
                    if (!certFormData.start_date || !certFormData.days_off || !certFile) {
                      toast.error('Data de início, dias afastado e o arquivo são obrigatórios.');
                      return;
                    }

                    // Validação CID leve: se preenchido, valida formato Básico
                    if (certFormData.cid && !/^[A-Z]\d{2}(\.\d)?$/.test(certFormData.cid)) {
                      if (!confirm('O formato do CID parece fora do padrão (ex: A00.0). Deseja prosseguir assim mesmo?')) {
                        return;
                      }
                    }

                    try {
                      setSavingCert(true);
                      
                      const fd = new FormData();
                      fd.append('user_id', String(selectedUserForCert.id));
                      fd.append('start_date', certFormData.start_date);
                      fd.append('days_off', certFormData.days_off);
                      fd.append('cid', certFormData.cid);
                      fd.append('notes', certFormData.notes);
                      fd.append('document', certFile);

                      await api.post('/api/medical-certificates', fd, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                      });

                      toast.success('Atestado cadastrado com sucesso!');
                      
                      // Limpa formulário
                      setCertFormData({ start_date: new Date().toISOString().split('T')[0], days_off: '1', cid: '', notes: '' });
                      setCertFile(null);
                      
                      // Recarrega histórico
                      const res = await api.get(`/api/medical-certificates?userId=${selectedUserForCert.id}`);
                      setCertsList(res.data ?? []);
                    } catch (err: any) {
                      toast.error(err.response?.data?.error || 'Erro ao salvar atestado.');
                    } finally {
                      setSavingCert(false);
                    }
                  }}
                  disabled={savingCert || !certFormData.start_date || !certFile}
                  className="bg-blue-900 hover:bg-blue-800 text-white font-semibold py-2 px-4 rounded-lg text-xs disabled:opacity-50 flex items-center gap-2"
                >
                  {savingCert ? 'Salvando Atestado...' : 'Gravar Atestado'}
                </button>
              </div>

              {/* Histórico de Atestados */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Histórico de Atestados</p>
                {loadingCerts ? (
                  <p className="text-center text-xs text-gray-400 py-4">Carregando histórico...</p>
                ) : certsList.length === 0 ? (
                  <p className="text-center text-xs text-gray-400 py-6 italic border rounded-xl">Nenhum atestado registrado para este colaborador.</p>
                ) : (
                  <div className="border rounded-xl overflow-hidden divide-y">
                    {certsList.map((c: any) => {
                      const parts = c.start_date.split('-');
                      const eParts = c.end_date.split('-');
                      const fmt = (p: string[]) => `${p[2]}/${p[1]}/${p[0]}`;
                      return (
                        <div key={c.id} className="p-3 text-xs flex justify-between items-start gap-4 hover:bg-gray-50 transition-colors">
                          <div className="space-y-1">
                            <p className="font-semibold text-gray-800">
                              📅 Período: {fmt(parts)} a {fmt(eParts)} ({c.days_off} dia{c.days_off > 1 ? 's' : ''})
                            </p>
                            <p className="text-gray-500 font-medium">CID: <span className="text-gray-700 font-bold">{c.cid || 'Não informado'}</span></p>
                            {c.notes && <p className="text-gray-400 mt-1 italic">Obs: {c.notes}</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            {c.document_url && (
                              <a
                                href={c.document_url}
                                target="_blank"
                                rel="noreferrer"
                                className="bg-teal-50 border border-teal-100 hover:bg-teal-100 text-teal-800 font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                                title="Visualizar Atestado"
                              >
                                <Download size={14} /> Baixar
                              </a>
                            )}
                            <button
                              onClick={() => handleDeleteCert(c.id)}
                              className="bg-red-50 border border-red-100 hover:bg-red-100 text-red-700 font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                              title="Excluir Atestado"
                            >
                              <Trash size={14} /> Excluir
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end">
              <button
                onClick={() => setIsAtestadoModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
