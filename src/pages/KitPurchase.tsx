import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { ShoppingCart, Trash2, Package, Truck, Store, CheckCircle2, Clock } from 'lucide-react';

export default function KitPurchase() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [usingProposalData, setUsingProposalData] = useState(false);
  const [inverterModel, setInverterModel] = useState('');
  const [inverterPower, setInverterPower] = useState('');
  const [moduleModel, setModuleModel] = useState('');
  const [modulePower, setModulePower] = useState('');
  // Novos campos de compra e entrega
  const [dataCompraKit, setDataCompraKit] = useState('');
  const [dataPrevistaEntrega, setDataPrevistaEntrega] = useState('');
  const [distribuidora, setDistribuidora] = useState('');
  const [kitEntregue, setKitEntregue] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await api.get('/api/projects');
      if (Array.isArray(res.data)) {
        // Exibe projetos aprovados comercialmente ou em estágios avançados
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
      module_power: formData.get('module_power'),
      // Novos campos
      data_compra_kit: dataCompraKit || null,
      data_prevista_entrega: dataPrevistaEntrega || null,
      distribuidora: distribuidora || null,
      kit_entregue: kitEntregue
    };

    try {
      await api.put(`/api/projects/${selectedProject.id}/kit`, data);
      const updatedRes = await api.get(`/api/projects/${selectedProject.id}`);
      setSelectedProject(updatedRes.data);
      fetchProjects();
      alert('Dados de compra salvos com sucesso!');
    } catch (error) {
      alert('Erro ao atualizar dados de compra');
    }
  };

  const handleDelete = async (id: number, clientName: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o projeto de "${clientName}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await api.delete(`/api/projects/${id}`);
      fetchProjects();
    } catch (err) {
      alert('Erro ao excluir projeto. Tente novamente.');
    }
  };

  const resetForm = () => {
    setSelectedProject(null);
    setUsingProposalData(false);
    setInverterModel('');
    setInverterPower('');
    setModuleModel('');
    setModulePower('');
    setDataCompraKit('');
    setDataPrevistaEntrega('');
    setDistribuidora('');
    setKitEntregue(false);
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
              <div key={p.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-800">{p.client_name}</h3>
                    <p className="text-sm text-gray-500 mb-1">{p.title}</p>
                    <p className="text-xs text-gray-400">
                      Estrutura: <span className="font-semibold text-gray-600">
                        {structureMap[p.structure_type || p.technical_data?.structure_type || p.technical_data?.[0]?.structure_type] ||
                          p.structure_type || p.technical_data?.structure_type || p.technical_data?.[0]?.structure_type || 'Não definido'}
                      </span>
                    </p>

                    {/* Badges de status */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${p.kit_purchased ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                        {p.kit_purchased ? '✓ Kit Comprado' : '⏳ Pendente Compra'}
                      </span>

                      {/* Badge de entrega */}
                      {p.kit_entregue ? (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 flex items-center gap-1">
                          <CheckCircle2 size={12} /> Material Entregue
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 flex items-center gap-1">
                          <Clock size={12} /> Aguardando Entrega
                        </span>
                      )}
                    </div>

                    {/* Informações de compra (se preenchidas) */}
                    {(p.data_compra_kit || p.data_prevista_entrega || p.distribuidora) && (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-500">
                        {p.data_compra_kit && (
                          <span className="flex items-center gap-1">
                            <ShoppingCart size={11} />
                            Compra: <strong className="text-gray-700">{new Date(p.data_compra_kit + 'T00:00:00').toLocaleDateString('pt-BR')}</strong>
                          </span>
                        )}
                        {p.data_prevista_entrega && (
                          <span className="flex items-center gap-1">
                            <Truck size={11} />
                            Entrega prev.: <strong className="text-gray-700">{new Date(p.data_prevista_entrega + 'T00:00:00').toLocaleDateString('pt-BR')}</strong>
                          </span>
                        )}
                        {p.distribuidora && (
                          <span className="flex items-center gap-1">
                            <Store size={11} />
                            <strong className="text-gray-700">{p.distribuidora}</strong>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={async () => {
                        const res = await api.get(`/api/projects/${p.id}`);
                        const project = res.data;
                        let preFilled = false;

                        // Pré-preenche com dados da proposta se o kit ainda não foi definido
                        if (!project.inverter_model && project.proposal_inverter_model) {
                          project.inverter_model = project.proposal_inverter_model;
                          preFilled = true;
                        }
                        if (!project.inverter_power && project.proposal_inverter_power) {
                          project.inverter_power = project.proposal_inverter_power;
                          preFilled = true;
                        }
                        if (!project.module_model && project.proposal_module_model) {
                          project.module_model = project.proposal_module_model;
                          preFilled = true;
                        }
                        if (!project.module_power && project.proposal_module_power) {
                          project.module_power = project.proposal_module_power;
                          preFilled = true;
                        }

                        setUsingProposalData(preFilled);
                        setSelectedProject(project);
                        setInverterModel(project.inverter_model || project.proposal_inverter_model || '');
                        setInverterPower(project.inverter_power || project.proposal_inverter_power || '');
                        setModuleModel(project.module_model || project.proposal_module_model || '');
                        setModulePower(project.module_power || project.proposal_module_power || '');
                        // Pré-carrega novos campos
                        setDataCompraKit(project.data_compra_kit || '');
                        setDataPrevistaEntrega(project.data_prevista_entrega || '');
                        setDistribuidora(project.distribuidora || '');
                        setKitEntregue(project.kit_entregue === true || project.kit_entregue === 1);
                      }}
                      className="bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-800"
                    >
                      Gerenciar
                    </button>
                    <button
                      onClick={() => handleDelete(p.id, p.client_name)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Excluir projeto"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
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
            <button onClick={resetForm} className="text-gray-500 hover:text-gray-700 font-medium">Voltar</button>
          </div>

          <div className="p-6">
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
              <p className="text-sm text-gray-600 mb-1">Tipo de Estrutura Definido na Vistoria:</p>
              <p className="text-lg font-bold text-blue-900">
                {structureMap[selectedProject.structure_type || selectedProject.technical_data?.structure_type || selectedProject.technical_data?.[0]?.structure_type] ||
                  selectedProject.structure_type || selectedProject.technical_data?.structure_type || selectedProject.technical_data?.[0]?.structure_type || 'Não informado'}
              </p>
            </div>

            <form onSubmit={handleUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Dados do Inversor e Módulo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Modelo do Inversor</label>
                <input
                  name="inverter_model"
                  value={inverterModel}
                  onChange={e => setInverterModel(e.target.value)}
                  placeholder="Ex: Growatt 5kW"
                  className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Potência do Inversor</label>
                <input
                  name="inverter_power"
                  value={inverterPower}
                  onChange={e => setInverterPower(e.target.value)}
                  placeholder="Ex: 5000W"
                  className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Modelo do Módulo</label>
                <input
                  name="module_model"
                  value={moduleModel}
                  onChange={e => setModuleModel(e.target.value)}
                  placeholder="Ex: Canadian 550W"
                  className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Potência do Módulo</label>
                <input
                  name="module_power"
                  value={modulePower}
                  onChange={e => setModulePower(e.target.value)}
                  placeholder="Ex: 550W"
                  className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Novos campos: Dados de Compra e Entrega */}
              <div className="md:col-span-2 border-t pt-5 mt-2">
                <h3 className="text-sm font-black text-gray-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Package size={16} className="text-blue-900" /> Dados de Compra e Entrega
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <ShoppingCart size={14} className="inline mr-1 text-gray-500" />
                      Data de Compra do Kit
                    </label>
                    <input
                      type="date"
                      value={dataCompraKit}
                      onChange={e => setDataCompraKit(e.target.value)}
                      className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Truck size={14} className="inline mr-1 text-gray-500" />
                      Data Prevista de Entrega
                    </label>
                    <input
                      type="date"
                      value={dataPrevistaEntrega}
                      onChange={e => setDataPrevistaEntrega(e.target.value)}
                      className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Store size={14} className="inline mr-1 text-gray-500" />
                      Distribuidora / Fornecedor
                    </label>
                    <input
                      type="text"
                      value={distribuidora}
                      onChange={e => setDistribuidora(e.target.value)}
                      placeholder="Ex: Aldo Solar, WEG..."
                      className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* Confirmação de entrega do material */}
                <div className={`mt-4 p-4 rounded-xl border-2 flex items-center justify-between transition-colors ${kitEntregue ? 'bg-green-50 border-green-300' : 'bg-yellow-50 border-yellow-200'}`}>
                  <div className="flex items-center gap-3">
                    {kitEntregue
                      ? <CheckCircle2 size={22} className="text-green-600 shrink-0" />
                      : <Clock size={22} className="text-yellow-600 shrink-0" />
                    }
                    <div>
                      <p className={`font-bold text-sm ${kitEntregue ? 'text-green-800' : 'text-yellow-800'}`}>
                        {kitEntregue ? 'Material Entregue — pronto para avançar ao cronograma' : 'Aguardando Entrega do Material'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {kitEntregue
                          ? 'A proposta pode ser aprovada e o projeto avançará para vistoria.'
                          : 'A aprovação da proposta ficará bloqueada até que a entrega seja confirmada.'}
                      </p>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer ml-4">
                    <input
                      type="checkbox"
                      checked={kitEntregue}
                      onChange={e => setKitEntregue(e.target.checked)}
                      className="w-5 h-5 rounded text-green-600 focus:ring-green-500 border-gray-300"
                    />
                    <span className="text-sm font-bold text-gray-700">Material Entregue?</span>
                  </label>
                </div>
              </div>

              {(selectedProject.proposal_inverter_model || selectedProject.proposal_module_model) &&
                !selectedProject.inverter_model && !selectedProject.module_model && (
                  <div className="md:col-span-2 bg-amber-50 border border-amber-200 p-3 rounded-lg">
                    <p className="text-sm text-amber-800">
                      ⚠️ Dados pré-preenchidos com base na proposta comercial. Altere caso o kit não esteja mais disponível.
                    </p>
                  </div>
                )}

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
                  <button type="submit" className="bg-blue-900 text-white px-8 py-2 rounded-lg hover:bg-blue-800 font-bold shadow-sm">
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
