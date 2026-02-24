import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const [stats, setStats] = useState({ activeProjects: 0, pendingInspections: 0, completedProjects: 0, monthlyRevenue: 0 });
  const { user } = useAuth();

  useEffect(() => {
    axios.get('/api/stats').then(res => setStats(res.data));
  }, []);

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
    </div>
  );
}
