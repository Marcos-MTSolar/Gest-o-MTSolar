import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Pencil, Clock, Plus, X, UserMinus, UserCheck, Search, Loader2 } from 'lucide-react';
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
                  onChange={(e) => setFormData({ ...formData, data_admissao: e.target.value })}
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
    </div>
  );
}
