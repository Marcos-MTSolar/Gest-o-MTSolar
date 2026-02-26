import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Pencil, Trash2, X, Check } from 'lucide-react';

export default function Users() {
  const [users, setUsers] = useState<any[]>([]);
  const { user } = useAuth();
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'COMMERCIAL' });
  const [editingUser, setEditingUser] = useState<any | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/api/users');
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch {
      setUsers([]);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/users', newUser);
      fetchUsers();
      setNewUser({ name: '', email: '', password: '', role: 'COMMERCIAL' });
    } catch (error) {
      alert('Erro ao criar usuário');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Tem certeza?')) {
      try {
        await axios.delete(`/api/users/${id}`);
        fetchUsers();
      } catch (error: any) {
        alert(error.response?.data?.error || 'Erro ao excluir usuário');
      }
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await axios.put(`/api/users/${editingUser.id}`, editingUser);
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      alert('Erro ao atualizar usuário');
    }
  };

  const canManageUsers = user?.role === 'CEO' || user?.role === 'ADMIN';

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Gerenciar Usuários</h1>

      {user?.role === 'CEO' && (
        <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
          <h2 className="text-lg font-semibold mb-4">Novo Usuário</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <input
              placeholder="Nome"
              className="border p-2 rounded"
              value={newUser.name}
              onChange={e => setNewUser({ ...newUser, name: e.target.value })}
            />
            <input
              placeholder="Email"
              className="border p-2 rounded"
              value={newUser.email}
              onChange={e => setNewUser({ ...newUser, email: e.target.value })}
            />
            <input
              placeholder="Senha"
              type="password"
              className="border p-2 rounded"
              value={newUser.password}
              onChange={e => setNewUser({ ...newUser, password: e.target.value })}
            />
            <select
              className="border p-2 rounded"
              value={newUser.role}
              onChange={e => setNewUser({ ...newUser, role: e.target.value })}
            >
              <option value="ADMIN">Admin</option>
              <option value="COMMERCIAL">Comercial</option>
              <option value="TECHNICAL">Técnica</option>
            </select>
            <button className="bg-blue-900 text-white p-2 rounded hover:bg-blue-800">Criar</button>
          </form>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">Editar Usuário</h2>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nome</label>
                <input
                  className="w-full border p-2 rounded"
                  value={editingUser.name}
                  onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  className="w-full border p-2 rounded"
                  value={editingUser.email}
                  onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Nova Senha (opcional)</label>
                <input
                  type="password"
                  className="w-full border p-2 rounded"
                  placeholder="Deixe em branco para manter"
                  onChange={e => setEditingUser({ ...editingUser, password: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Função</label>
                <select
                  className="w-full border p-2 rounded"
                  value={editingUser.role}
                  onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}
                >
                  <option value="ADMIN">Admin</option>
                  <option value="COMMERCIAL">Comercial</option>
                  <option value="TECHNICAL">Técnica</option>
                  {user?.role === 'CEO' && <option value="CEO">CEO</option>}
                </select>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={editingUser.active}
                  onChange={e => setEditingUser({ ...editingUser, active: e.target.checked })}
                  className="w-4 h-4 text-blue-600"
                />
                <label className="ml-2 text-sm text-gray-700">Ativo</label>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-900 text-white rounded hover:bg-blue-800">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-600 font-medium border-b">
            <tr>
              <th className="p-4">Nome</th>
              <th className="p-4">Email</th>
              <th className="p-4">Função</th>
              <th className="p-4">Status</th>
              {canManageUsers && <th className="p-4">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="p-4">{u.name}</td>
                <td className="p-4">{u.email}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold
                    ${u.role === 'CEO' ? 'bg-purple-100 text-purple-800' :
                      u.role === 'ADMIN' ? 'bg-blue-100 text-blue-800' :
                        u.role === 'COMMERCIAL' ? 'bg-green-100 text-green-800' :
                          'bg-amber-100 text-amber-800'
                    }`}>
                    {u.role}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`w-2 h-2 rounded-full inline-block mr-2 ${u.active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  {u.active ? 'Ativo' : 'Inativo'}
                </td>
                {canManageUsers && (
                  <td className="p-4 flex gap-2">
                    <button
                      onClick={() => setEditingUser(u)}
                      className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                      title="Editar"
                    >
                      <Pencil size={18} />
                    </button>
                    {user?.role === 'CEO' && (
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
