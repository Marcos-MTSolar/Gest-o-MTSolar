import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Archive, CheckCircle, Search } from 'lucide-react';

export default function FinishedProjects() {
  const [projects, setProjects] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await axios.get('/api/projects');
      if (Array.isArray(res.data)) {
        setProjects(res.data.filter((p: any) => p.current_stage === 'completed'));
      } else {
        setProjects([]);
      }
    } catch {
      setProjects([]);
    }
  };

  const filteredProjects = projects.filter(p =>
    p.client_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Projetos Finalizados</h1>

      <div className="mb-6 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="Buscar por nome do cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-600 font-medium border-b">
            <tr>
              <th className="p-4">Cliente</th>
              <th className="p-4">Projeto</th>
              <th className="p-4">Data Conclusão</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredProjects.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-gray-500">
                  {searchTerm ? 'Nenhum projeto encontrado para a busca.' : 'Nenhum projeto finalizado.'}
                </td>
              </tr>
            )}
            {filteredProjects.map(p => (
              <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="p-4 font-medium">{p.client_name}</td>
                <td className="p-4">{p.title}</td>
                <td className="p-4 text-sm text-gray-500">{new Date(p.updated_at).toLocaleDateString()}</td>
                <td className="p-4">
                  <span className="flex items-center gap-1 text-green-700 bg-green-100 px-2 py-1 rounded-full text-xs font-bold w-fit">
                    <CheckCircle size={14} /> Finalizado
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
