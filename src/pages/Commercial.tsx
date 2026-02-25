import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Search, FileText, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Commercial() {
  const [projects, setProjects] = useState<any[]>([]);
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', phone: '', email: '', address: '', city: '', state: '', cpf_cnpj: '' });
  const { user } = useAuth();

  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [submitAction, setSubmitAction] = useState<'pending' | 'approved'>('pending');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    const res = await axios.get('/api/projects');
    console.log('[DEBUG] Projects fetched in Commercial:', res.data.map((p: any) => ({
      id: p.id, title: p.title, commercial_status: p.commercial_status
    })));
    // Hide projects that have already been finalized in the commercial stage
    setProjects(res.data.filter((p: any) => p.commercial_status !== 'approved'));
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/clients', newClient);
      setShowNewClient(false);
      fetchProjects();
      setNewClient({ name: '', phone: '', email: '', address: '', city: '', state: '', cpf_cnpj: '' });
    } catch (error) {
      alert('Erro ao criar cliente');
    }
  };

  const updateCommercial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    const formData = new FormData(e.target as HTMLFormElement);
    const proposal_value = formData.get('proposal_value') as string;
    const payment_method = formData.get('payment_method') as string;

    if (!proposal_value || !payment_method) {
      alert("Por favor, preencha o Valor da Proposta e a Forma de Pagamento antes de salvar.");
      return;
    }

    try {
      console.log("Comercial API payload:", {
        proposal_value,
        payment_method,
        notes: formData.get('notes'),
        pendencies: formData.get('pendencies'),
        status: submitAction
      });

      await axios.put(`/api/projects/${selectedProject.id}/commercial`, {
        proposal_value,
        payment_method,
        notes: formData.get('notes'),
        pendencies: formData.get('pendencies'),
        status: submitAction
      });
      alert("Dados comerciais salvos com sucesso!");
      await fetchProjects();
      setSelectedProject(null);
    } catch (error) {
      alert('Erro ao atualizar projeto');
    }
  };

  const translateStage = (stage: string) => {
    const stages: { [key: string]: string } = {
      'pending': 'Pendente',
      'inspection': 'Vistoria',
      'homologation': 'Homologação',
      'conclusion': 'Conclusão',
      'completed': 'Finalizado'
    };
    return stages[stage] || stage;
  };

  const translateTechnicalStatus = (status: string) => {
    const statuses: { [key: string]: string } = {
      'pending': 'Pendente',
      'approved': 'Aprovada',
      'rejected': 'Reprovada',
      'in_progress': 'Em Andamento'
    };
    return statuses[status] || 'Não iniciada';
  };

  return (
    <div className="p-6">
      {!selectedProject ? (
        <>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Área Comercial</h1>
            <button
              onClick={() => setShowNewClient(true)}
              className="bg-blue-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-800"
            >
              <Plus size={20} /> Novo Cliente
            </button>
          </div>

          {showNewClient && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-xl w-full max-w-2xl">
                <h2 className="text-xl font-bold mb-4">Cadastro de Cliente</h2>
                <form onSubmit={handleCreateClient} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input placeholder="Nome Completo" className="border p-2 rounded" required value={newClient.name} onChange={e => setNewClient({ ...newClient, name: e.target.value })} />
                  <input placeholder="CPF/CNPJ" className="border p-2 rounded" value={newClient.cpf_cnpj} onChange={e => setNewClient({ ...newClient, cpf_cnpj: e.target.value })} />
                  <input placeholder="Telefone" className="border p-2 rounded" value={newClient.phone} onChange={e => setNewClient({ ...newClient, phone: e.target.value })} />
                  <input placeholder="Email" className="border p-2 rounded" value={newClient.email} onChange={e => setNewClient({ ...newClient, email: e.target.value })} />
                  <input placeholder="Endereço" className="border p-2 rounded md:col-span-2" value={newClient.address} onChange={e => setNewClient({ ...newClient, address: e.target.value })} />
                  <input placeholder="Cidade" className="border p-2 rounded" value={newClient.city} onChange={e => setNewClient({ ...newClient, city: e.target.value })} />
                  <input placeholder="Estado" className="border p-2 rounded" value={newClient.state} onChange={e => setNewClient({ ...newClient, state: e.target.value })} />

                  <div className="md:col-span-2 flex justify-end gap-2 mt-4">
                    <button type="button" onClick={() => setShowNewClient(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                    <button type="submit" className="px-4 py-2 bg-blue-900 text-white rounded hover:bg-blue-800">Salvar</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6">
            {projects.map(p => (
              <div key={p.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{p.client_name}</h3>
                  <p className="text-sm text-gray-500">{p.title}</p>

                  {p.commercial_status === 'pending' && p.commercial_pendencies && (
                    <p className="text-xs text-amber-700 mt-1 bg-amber-50 p-1 rounded inline-block border border-amber-200">
                      <strong>Pendência:</strong> {p.commercial_pendencies}
                    </p>
                  )}

                  <div className="flex gap-2 mt-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${p.commercial_status === 'approved' ? 'bg-green-100 text-green-800' :
                      p.commercial_status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                      {p.commercial_status === 'approved' ? 'Finalizado' : 'Pendente'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const res = await axios.get(`/api/projects/${p.id}`);
                    setSelectedProject(res.data);
                  }}
                  className={`px-4 py-2 rounded text-white ${p.commercial_status === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-900 hover:bg-blue-800'}`}
                >
                  {p.commercial_status === 'approved' ? 'Ver Detalhes' : 'Gerenciar'}
                </button>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center bg-gray-50">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Comercial: {selectedProject.client_name}</h2>
              <p className="text-sm text-gray-500">{selectedProject.title}</p>
            </div>
            <button onClick={() => setSelectedProject(null)} className="text-gray-500 hover:text-gray-700 font-medium">Voltar</button>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg border">
                <p className="text-xs text-gray-500 uppercase font-bold">Status Geral</p>
                <p className="text-lg font-semibold text-blue-900">{translateStage(selectedProject.current_stage)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border">
                <p className="text-xs text-gray-500 uppercase font-bold">Vistoria Técnica</p>
                <p className="text-lg font-semibold">{translateTechnicalStatus(selectedProject.technical_status)}</p>
              </div>
            </div>

            <form onSubmit={updateCommercial} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor da Proposta (R$)</label>
                  <input name="proposal_value" defaultValue={selectedProject.proposal_value} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pagamento</label>
                  <select name="payment_method" defaultValue={selectedProject.payment_method} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="cash">À Vista</option>
                    <option value="financing">Financiamento</option>
                    <option value="card">Cartão de Crédito</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pendências (Restrições para fechar a venda)</label>
                  <input name="pendencies" defaultValue={selectedProject.commercial_pendencies} placeholder="Ex: Cliente aguardando aprovação de crédito num banco" className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none border-amber-200 bg-amber-50" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observações Comerciais</label>
                  <textarea name="notes" defaultValue={selectedProject.commercial_notes} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" rows={4}></textarea>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="submit" onClick={() => setSubmitAction('pending')} className="bg-amber-100 text-amber-800 border border-amber-300 px-6 py-3 rounded-lg hover:bg-amber-200 font-bold shadow-sm flex items-center gap-2">
                  Salvar como Pendente
                </button>
                <button type="submit" onClick={() => setSubmitAction('approved')} className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-bold shadow-sm flex items-center gap-2">
                  <CheckCircle size={20} /> Salvar e Aprovar Proposta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
