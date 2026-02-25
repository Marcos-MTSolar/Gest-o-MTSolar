import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { CheckSquare, AlertTriangle, CheckCircle } from 'lucide-react';

export default function Homologation() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);

  const [statusModal, setStatusModal] = useState<{ projectId: number, status: string, isOpen: boolean }>({ projectId: 0, status: '', isOpen: false });
  const [statusNote, setStatusNote] = useState('');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    const res = await axios.get('/api/projects');
    // Filter projects that are in homologation or ready for it (unlocked by documents)
    setProjects(res.data.filter((p: any) =>
      p.status !== 'completed' && (
        ['homologation', 'conclusion'].includes(p.current_stage) ||
        !!p.homologation_status
      )
    ));
  };

  const handleUpdate = async (id: number, status: string, reason: string = '') => {
    try {
      await axios.put(`/api/projects/${id}/homologation`, {
        homologation_status: status,
        rejection_reason: reason
      });

      if (status === 'connection_point_approved') {
        alert('Ponto de conexão aprovado! Projeto finalizado com sucesso.');
        setStatusModal({ projectId: 0, status: '', isOpen: false });
        setStatusNote('');
        await fetchProjects();
        setSelectedProject(null);
        return;
      }

      setStatusModal({ projectId: 0, status: '', isOpen: false });
      setStatusNote('');
      await fetchProjects();

      // Update selected project to reflect changes immediately or close detail view
      const updatedRes = await axios.get(`/api/projects/${id}`);
      setSelectedProject(updatedRes.data);
    } catch (error) {
      alert('Erro ao atualizar homologação');
    }
  };

  const statusOptions = [
    { value: 'technical_analysis', label: 'Análise Técnica' },
    { value: 'rejected', label: 'Reprovada na análise técnica' },
    { value: 'waiting_inspection', label: 'Aguardando Vistoria' },
    { value: 'performing_inspection', label: 'Realizando Vistoria' },
    { value: 'connection_point_approved', label: 'Ponto de Conexão Aprovado' },
  ];

  return (
    <div className="p-6">
      {!selectedProject ? (
        <>
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Homologação</h1>
          <div className="grid grid-cols-1 gap-6">
            {projects.length === 0 && (
              <p className="text-gray-500">Nenhum projeto em fase de homologação.</p>
            )}
            {projects.map(p => (
              <div key={p.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{p.client_name}</h3>
                  <p className="text-sm text-gray-500">{p.title}</p>
                  <div className="mt-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold inline-block mb-1 ${p.homologation_status === 'connection_point_approved' ? 'bg-green-100 text-green-800' :
                      p.homologation_status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                      {statusOptions.find(o => o.value === p.homologation_status)?.label || 'Pendente'}
                    </span>
                    {p.homologation_status && !['connection_point_approved', 'technical_analysis'].includes(p.homologation_status) && p.rejection_reason && (
                      <p className="text-xs text-amber-700 mt-1 bg-amber-50 p-2 rounded border border-amber-200 block w-fit">
                        <strong>Motivo / Pendência:</strong> {p.rejection_reason}
                      </p>
                    )}
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
              <h2 className="text-xl font-bold text-gray-800">Homologação: {selectedProject.client_name}</h2>
              <p className="text-sm text-gray-500">{selectedProject.title}</p>
            </div>
            <button onClick={() => setSelectedProject(null)} className="text-gray-500 hover:text-gray-700 font-medium">Voltar</button>
          </div>

          <div className="p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Documentação Obrigatória</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {['rg_cnh', 'art', 'bill_generator'].map(type => {
                  const hasDoc = selectedProject.documents?.some((d: any) => d.type === type);
                  const label = {
                    'rg_cnh': 'RG ou CNH',
                    'art': 'ART',
                    'bill_generator': 'Conta Geradora',
                    'bill_beneficiary': 'Conta Beneficiária'
                  }[type];

                  return (
                    <div key={type} className={`p-3 rounded-lg border flex items-center justify-between ${hasDoc ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                      <span className={`font-medium ${hasDoc ? 'text-green-800' : 'text-red-800'}`}>{label}</span>
                      {hasDoc ? <CheckCircle size={20} className="text-green-600" /> : <AlertTriangle size={20} className="text-red-600" />}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Status Atual</h3>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      if (['rejected', 'waiting_inspection', 'performing_inspection'].includes(opt.value)) {
                        setStatusNote(selectedProject.rejection_reason || '');
                        setStatusModal({ projectId: selectedProject.id, status: opt.value, isOpen: true });
                      } else {
                        handleUpdate(selectedProject.id, opt.value, '');
                      }
                    }}
                    className={`px-4 py-3 text-sm rounded-lg border transition-colors font-medium ${selectedProject.homologation_status === opt.value
                      ? 'bg-blue-900 text-white border-blue-900 shadow-md'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {selectedProject.homologation_status && !['connection_point_approved', 'technical_analysis'].includes(selectedProject.homologation_status) && selectedProject.rejection_reason && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 flex items-start gap-3">
                <AlertTriangle size={20} className="mt-0.5 flex-shrink-0 text-amber-600" />
                <div>
                  <h4 className="font-bold mb-1">
                    Pendência: {statusOptions.find(o => o.value === selectedProject.homologation_status)?.label}
                  </h4>
                  <p className="text-sm text-amber-900">{selectedProject.rejection_reason}</p>
                </div>
              </div>
            )}

            {selectedProject.homologation_status === 'connection_point_approved' && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 flex items-center gap-3">
                <CheckCircle size={24} />
                <div>
                  <h4 className="font-bold">Homologação Concluída</h4>
                  <p className="text-sm">O ponto de conexão foi aprovado. O projeto pode prosseguir para a conclusão.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {statusModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-amber-600 flex items-center gap-2">
              <AlertTriangle /> Adicionar Pendência
            </h2>
            <p className="text-gray-600 mb-4">Por favor, informe uma observação ou motivo da pendência <strong>{statusOptions.find(o => o.value === statusModal.status)?.label}</strong>:</p>
            <textarea
              className="w-full border p-3 rounded-lg mb-4 h-32 focus:ring-2 focus:ring-amber-500 outline-none"
              placeholder="Descreva a observação..."
              value={statusNote}
              onChange={e => setStatusNote(e.target.value)}
            ></textarea>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setStatusModal({ projectId: 0, status: '', isOpen: false })}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleUpdate(statusModal.projectId, statusModal.status, statusNote)}
                className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 font-medium"
                disabled={!statusNote.trim()}
              >
                Confirmar e Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
