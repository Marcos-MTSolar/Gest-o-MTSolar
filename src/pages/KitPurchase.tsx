import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ShoppingCart, Check, X } from 'lucide-react';

export default function KitPurchase() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await axios.get('/api/projects');
      if (Array.isArray(res.data)) {
        // Show projects that are commercially approved OR have advanced past commercial stage
        const KIT_STAGES = ['inspection', 'installation', 'homologation', 'conclusion', 'completed'];
        setProjects(res.data.filter((p: any) =>
          p.commercial_status === 'approved' ||
          p.commercial_status === 'proposta_enviada' ||
          KIT_STAGES.includes(p.current_stage)
        ));
      } else {
        setProjects([]);
      }
    } catch {
      setProjects([]);
    }
  };

  const structureMap: Record<string, string> = {
    ceramico: 'Telhado Cerâmico',
    fibrocimento: 'Telhado Fibrocimento',
    metalico: 'Telhado Metálico',
    laje: 'Laje',
    solo: 'Solo',
    outros: 'Outros'
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    const formData = new FormData(e.target as HTMLFormElement);
    const data = {
      kit_purchased: formData.get('kit_purchased') === 'true',
      inverter_model: formData.get('inverter_model'),
      inverter_power: formData.get('inverter_power'),
      module_model: formData.get('module_model'),
      module_power: formData.get('module_power')
    };

    try {
      await axios.put(`/api/projects/${selectedProject.id}/kit`, data);
      // Refresh both the project detail and the list
      const updatedRes = await axios.get(`/api/projects/${selectedProject.id}`);
      setSelectedProject(updatedRes.data);
      fetchProjects();
    } catch (error) {
      alert('Erro ao atualizar dados de compra');
    }
  };

  return (
    <div className="p-6">
      {!selectedProject ? (
        <>
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Kit Solar</h1>
          <div className="grid grid-cols-1 gap-6">
            {projects.length === 0 && (
              <p className="text-gray-500">Nenhum projeto aprovado comercialmente para compra de kit.</p>
            )}
            {projects.map(p => (
              <div key={p.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{p.client_name}</h3>
                  <p className="text-sm text-gray-500">{p.title}</p>
                  <p className="text-xs text-gray-400 mt-1">Tipo de Estrutura: <span className="font-semibold text-gray-600">{structureMap[p.structure_type || p.technical_data?.structure_type || p.technical_data?.[0]?.structure_type] || p.structure_type || p.technical_data?.structure_type || p.technical_data?.[0]?.structure_type || 'Não definido'}</span></p>
                  <div className="mt-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${p.kit_purchased ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                      {p.kit_purchased ? 'Kit Comprado' : 'Pendente Compra'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const res = await axios.get(`/api/projects/${p.id}`);
                    setSelectedProject(res.data);
                  }}
                  className="bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-800"
                >
                  Gerenciar
                </button>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center bg-gray-50">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Kit Solar: {selectedProject.client_name}</h2>
              <p className="text-sm text-gray-500">{selectedProject.title}</p>
            </div>
            <button onClick={() => setSelectedProject(null)} className="text-gray-500 hover:text-gray-700 font-medium">Voltar</button>
          </div>

          <div className="p-6">
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
              <p className="text-sm text-gray-600 mb-1">Tipo de Estrutura Definido na Vistoria:</p>
              <p className="text-lg font-bold text-blue-900">{structureMap[selectedProject.structure_type || selectedProject.technical_data?.structure_type || selectedProject.technical_data?.[0]?.structure_type] || selectedProject.structure_type || selectedProject.technical_data?.structure_type || selectedProject.technical_data?.[0]?.structure_type || 'Não informado'}</p>
            </div>

            <form onSubmit={handleUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Modelo do Inversor</label>
                <input
                  name="inverter_model"
                  defaultValue={selectedProject.inverter_model}
                  placeholder="Ex: Growatt 5kW"
                  className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Potência do Inversor</label>
                <input
                  name="inverter_power"
                  defaultValue={selectedProject.inverter_power}
                  placeholder="Ex: 5000W"
                  className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Modelo do Módulo</label>
                <input
                  name="module_model"
                  defaultValue={selectedProject.module_model}
                  placeholder="Ex: Canadian 550W"
                  className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Potência do Módulo</label>
                <input
                  name="module_power"
                  defaultValue={selectedProject.module_power}
                  placeholder="Ex: 550W"
                  className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="md:col-span-2 mt-4 pt-4 border-t">
                <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-gray-700">Status da Compra:</span>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="kit_purchased"
                          value="true"
                          defaultChecked={selectedProject.kit_purchased}
                          className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700 font-medium">Kit Comprado</span>
                      </label>
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="kit_purchased"
                          value="false"
                          defaultChecked={!selectedProject.kit_purchased}
                          className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700 font-medium">Pendente</span>
                      </label>
                    </div>
                  </div>
                  <button className="bg-blue-900 text-white px-8 py-2 rounded-lg hover:bg-blue-800 font-bold shadow-sm">
                    Salvar Alterações
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
