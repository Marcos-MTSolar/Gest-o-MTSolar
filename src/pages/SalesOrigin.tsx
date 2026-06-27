import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BarChart2, TrendingUp, Users } from 'lucide-react';
import api from '../lib/api';

export default function SalesOrigin() {
  const { user } = useAuth();
  const [data, setData] = useState<{ origem: string; total: number }[]>([]);
  const [totalClientes, setTotalClientes] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'CEO') return;
    api.get('/api/relatorio/origem-vendas')
      .then(res => {
        setData(res.data.data || []);
        setTotalClientes(res.data.total_clientes || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (user?.role !== 'CEO') {
    return <div className="p-8 text-center text-gray-400">Acesso restrito ao CEO.</div>;
  }

  const maxTotal = Math.max(...data.map(d => d.total), 1);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white">
          <TrendingUp size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Origem das Vendas</h1>
          <p className="text-sm text-gray-500">Análise de canais de aquisição de clientes</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <Users size={20} className="text-blue-600" />
            <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total com Origem</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalClientes}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <BarChart2 size={20} className="text-green-600" />
            <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Canais Ativos</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{data.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp size={20} className="text-purple-600" />
            <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Principal Canal</span>
          </div>
          <p className="text-lg font-bold text-gray-900 truncate">{data[0]?.origem || '—'}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">Distribuição por Canal</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400">Carregando...</div>
        ) : data.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            Nenhum dado disponível. Cadastre clientes informando a origem da venda.
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {data.map((item, index) => (
              <div key={item.origem}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-bold text-gray-700">{item.origem}</span>
                  <span className="text-sm font-bold text-gray-500">
                    {item.total} ({Math.round((item.total / totalClientes) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div
                    className="h-3 rounded-full transition-all duration-500"
                    style={{
                      width: `${(item.total / maxTotal) * 100}%`,
                      backgroundColor: [
                        '#3B82F6','#10B981','#F59E0B','#EF4444',
                        '#8B5CF6','#EC4899','#14B8A6','#F97316','#6B7280'
                      ][index % 9]
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
