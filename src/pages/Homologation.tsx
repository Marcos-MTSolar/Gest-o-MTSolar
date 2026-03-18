import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { CheckSquare, AlertTriangle, CheckCircle, FileText, ListChecks, Save, Lock, Unlock } from 'lucide-react';

export default function Homologation() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);

  const [statusModal, setStatusModal] = useState<{ projectId: number, status: string, isOpen: boolean }>({ projectId: 0, status: '', isOpen: false });
  const [statusNote, setStatusNote] = useState('');

  const [activeTab, setActiveTab] = useState<'observations' | 'process'>('observations');
  const [observationsText, setObservationsText] = useState('');
  const [checklist, setChecklist] = useState<{ id: string, label: string, completed: boolean }[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const defaultChecklist = [
    { id: 'docs_ok', label: 'Documentação do cliente verificada e completa', completed: false },
    { id: 'tech_viability', label: 'Viabilidade técnica confirmada na vistoria', completed: false },
    { id: 'concessionaire_req', label: 'Requisitos específicos da concessionária atendidos', completed: false }
  ];

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await axios.get('/api/projects');
      if (Array.isArray(res.data)) {
        setProjects(res.data.filter((p: any) =>
          ['homologation', 'conclusion', 'completed'].includes(p.current_stage)
        ));
      } else {
        setProjects([]);
      }
    } catch {
      setProjects([]);
    }
  };

  const handleUpdate = async (id: number, status: string | null, reason: string = '') => {
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

  const saveObservationsAndChecklist = async (obs: string, check: any[], showFeedback = false) => {
    try {
      if (!selectedProject) return;
      if (showFeedback) setIsSaving(true);
      await axios.put(`/api/projects/${selectedProject.id}/homologation`, {
        homologation_observations: obs,
        homologation_checklist: check
      });
      if (showFeedback) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (e) {
      console.error('Error saving checklist', e);
      alert('Erro ao salvar os dados.');
    } finally {
      if (showFeedback) setIsSaving(false);
    }
  };

  const manualSave = () => {
    saveObservationsAndChecklist(observationsText, checklist, true);
  };

  const handleChecklistItemToggle = async (id: string, completed: boolean) => {
    const newChecklist = checklist.map(item => item.id === id ? { ...item, completed } : item);
    setChecklist(newChecklist);
    await saveObservationsAndChecklist(observationsText, newChecklist, false);

    const allCompleted = newChecklist.every(item => item.completed);

    // Regra de Liberação
    if (allCompleted && (!selectedProject.homologation_status || selectedProject.homologation_status === 'none')) {
      alert('Checklist 100% concluído! A etapa de Análise Técnica foi habilitada.');
      handleUpdate(selectedProject.id, 'technical_analysis', selectedProject.rejection_reason);
    }
    // Regra de Regressão: Desmarcou e estava na Análise Técnica
    else if (!allCompleted && selectedProject.homologation_status === 'technical_analysis') {
      alert('Ops! Um item do checklist foi desmarcado. O processo "Análise Técnica" foi bloqueado novamente.');
      handleUpdate(selectedProject.id, null, selectedProject.rejection_reason); // Revoga status
      setActiveTab('observations');
    }
  };

  const statusOptions = [
    { value: 'technical_analysis', label: 'Análise Técnica' },
    { value: 'rejected', label: 'Reprovada na análise técnica' },
    { value: 'waiting_inspection', label: 'Aguardando Vistoria' },
    { value: 'performing_inspection', label: 'Realizando Vistoria' },
    { value: 'connection_point_approved', label: 'Ponto de Conexão Aprovado' },
  ];

  const isChecklistComplete = checklist.length > 0 && checklist.every(i => i.completed);
  const isProcessLocked = !isChecklistComplete;

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
                      p.homologation_status === 'rejected' ? 'bg-red-100 text-red-800' :
                        !p.homologation_status ? 'bg-gray-100 text-gray-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                      {statusOptions.find(o => o.value === p.homologation_status)?.label || 'Aguardando Checklist'}
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

                    const savedObs = res.data.homologation_observations || '';
                    setObservationsText(savedObs);

                    const savedChecklist = res.data.homologation_checklist;
                    const loadedChecklist = (Array.isArray(savedChecklist) && savedChecklist.length > 0) ? savedChecklist : defaultChecklist;
                    setChecklist(loadedChecklist);

                    const isComplete = loadedChecklist.every((item: any) => item.completed);
                    if (isComplete || res.data.homologation_status) {
                      setActiveTab('process');
                    } else {
                      setActiveTab('observations');
                    }
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
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
          <div className="p-6 border-b flex justify-between items-center bg-gray-50">
            <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">Homologação: {selectedProject.client_name}</h2>
              <p className="text-sm text-gray-500">{selectedProject.title}</p>
            </div>
            <button onClick={() => { setSelectedProject(null); fetchProjects(); }} className="text-gray-600 hover:bg-gray-200 font-medium px-4 py-2 rounded-lg transition-colors bg-white border border-gray-300 shadow-sm">Voltar para Lista</button>
          </div>

          <div className="flex border-b bg-white overflow-x-auto">
            <button onClick={() => setActiveTab('observations')} className={`px-6 py-4 font-semibold transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'observations' ? 'border-b-[3px] border-blue-600 text-blue-700 bg-blue-50/30' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'}`}>
              <FileText size={20} /> Observações Pré-Homologação
              {isChecklistComplete ? <CheckCircle size={16} className="text-green-500 ml-1" /> : <AlertTriangle size={16} className="text-amber-500 ml-1" />}
            </button>
            <button
              onClick={() => {
                if (!isProcessLocked) setActiveTab('process');
              }}
              disabled={isProcessLocked}
              className={`px-6 py-4 font-semibold flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === 'process' ? 'border-b-[3px] border-blue-600 text-blue-700 bg-blue-50/30' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'} ${isProcessLocked ? 'opacity-60 cursor-not-allowed bg-gray-50/50' : ''}`}>
              <ListChecks size={20} /> Processo de Homologação
              {isProcessLocked ? <Lock size={16} className="text-gray-400 ml-1" /> : <Unlock size={16} className="text-green-500 ml-1" />}
            </button>
          </div>

          {activeTab === 'observations' ? (
            <div className="p-6 flex flex-col xl:flex-row gap-8 bg-gray-50/30 relative">
              <div className="flex-1 flex flex-col">
                <h3 className="text-lg font-bold mb-2 text-gray-800 flex items-center gap-2">
                  <FileText size={20} className="text-blue-600" /> Notas e Pendências Geras
                </h3>
                <p className="text-sm text-gray-500 mb-4 tracking-tight">Registre informações relevantes antes do início formal da homologação. Todas as anotações e checklists precisam estar verificados.</p>
                <textarea
                  className="w-full border border-gray-300 p-4 rounded-xl flex-1 min-h-[250px] focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none shadow-sm bg-white"
                  value={observationsText}
                  onChange={e => setObservationsText(e.target.value)}
                  onBlur={() => saveObservationsAndChecklist(observationsText, checklist, false)}
                  placeholder="Digite as observações, pendências comerciais ou restrições técnicas..."
                />

                {/* Botão Salvar dedicado */}
                <div className="mt-4 flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <span className="text-sm text-gray-500 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-500" />
                    Certifique-se de salvar ao fazer grandes edições verbais.
                  </span>
                  <div className="flex items-center gap-3">
                    {saveSuccess && <span className="text-sm text-green-600 font-medium flex items-center gap-1"><CheckCircle size={16} /> Salvo com sucesso</span>}
                    <button
                      onClick={manualSave}
                      disabled={isSaving}
                      className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-md active:scale-95 disabled:bg-blue-400"
                    >
                      <Save size={18} /> {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-[1.2] flex flex-col">
                <h3 className="text-lg font-bold mb-2 text-gray-800 flex items-center gap-2">
                  <CheckSquare size={20} className="text-blue-600" /> Checklist Obrigatório
                </h3>
                <p className="text-sm text-gray-500 mb-4 tracking-tight">O fluxo de Análise Técnica só é liberado mediante 100% de conclusão nesta lista.</p>

                <div className="space-y-3 bg-white p-2 rounded-xl border border-gray-200 flex-1">
                  {checklist.map(item => (
                    <label key={item.id} className={`flex items-start space-x-4 p-4 rounded-lg cursor-pointer transition-all border ${item.completed ? 'bg-green-50/40 border-green-200' : 'bg-white border-gray-200 shadow-sm hover:border-blue-300 hover:shadow-md'}`}>
                      <div className="mt-0.5">
                        <input type="checkbox" className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer" checked={item.completed} onChange={(e) => handleChecklistItemToggle(item.id, e.target.checked)} />
                      </div>
                      <div>
                        <span className={`font-semibold block ${item.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>{item.label}</span>
                        {!item.completed && <span className="text-xs text-amber-600 font-medium mt-1 inline-block bg-amber-50 px-2 py-0.5 rounded border border-amber-100">Pendente</span>}
                        {item.completed && <span className="text-xs text-green-600 font-medium mt-1 inline-block bg-green-50 px-2 py-0.5 rounded border border-green-100">Concluído</span>}
                      </div>
                    </label>
                  ))}

                  <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100 flex items-start gap-3">
                    <AlertTriangle className="text-blue-600 shrink-0 mt-0.5" size={20} />
                    <div>
                      <h4 className="font-semibold text-blue-900 text-sm">Regras de Validação</h4>
                      <p className="text-xs text-blue-800 mt-1">O botão de salvar abaixo protege o texto. Os checkboxes do checklist disparam auto-salvamento imediato e recalibram as travas do sistema de homologação no backend.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 relative">
              {isProcessLocked && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center p-6">
                  <div className="bg-white p-8 rounded-2xl shadow-xl border border-red-100 max-w-md text-center">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Lock size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Etapa Bloqueada</h3>
                    <p className="text-gray-600 mb-6">Finalize todas as observações e marque 100% do checklist Pré-Homologação antes de avançar para a Análise Técnica.</p>
                    <button onClick={() => setActiveTab('observations')} className="bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg w-full hover:bg-blue-700 transition-colors shadow-md">
                      Ir para Checklist
                    </button>
                  </div>
                </div>
              )}

              <div className={isProcessLocked ? 'opacity-40 pointer-events-none filter blur-[2px] transition-all' : ''}>
                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">Documentação Obrigatória</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {['rg_cnh', 'art', 'bill_generator', 'bill_beneficiary'].map(type => {
                      const hasDoc = selectedProject.documents?.some((d: any) => d.type === type);
                      const label = {
                        'rg_cnh': 'RG ou CNH',
                        'art': 'ART',
                        'bill_generator': 'Conta Geradora',
                        'bill_beneficiary': 'Conta Beneficiária'
                      }[type as keyof typeof label];

                      return (
                        <div key={type} className={`p-4 rounded-xl border flex flex-col justify-between h-full gap-3 transition-colors ${hasDoc ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                          <div className="flex justify-between items-start">
                            <span className={`font-semibold text-sm ${hasDoc ? 'text-green-800' : 'text-red-800'}`}>{label}</span>
                            {hasDoc ? <CheckCircle size={20} className="text-green-600 shrink-0" /> : <AlertTriangle size={20} className="text-red-600 shrink-0" />}
                          </div>
                          {!hasDoc && <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded inline-block w-fit font-medium">Falta Arquivo</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">Gerenciar Status</h3>
                  <div className="flex flex-wrap gap-3">
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
                        className={`px-5 py-3 text-sm rounded-xl border transition-all font-semibold flex items-center gap-2 ${selectedProject.homologation_status === opt.value
                          ? 'bg-blue-900 text-white border-blue-900 shadow-md ring-2 ring-blue-900/20 ring-offset-2'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                          }`}
                      >
                        {selectedProject.homologation_status === opt.value && <CheckCircle size={16} />}
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedProject.homologation_status && !['connection_point_approved', 'technical_analysis'].includes(selectedProject.homologation_status) && selectedProject.rejection_reason && (
                  <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 flex items-start gap-4 shadow-sm">
                    <AlertTriangle size={24} className="mt-0.5 flex-shrink-0 text-amber-600" />
                    <div>
                      <h4 className="font-bold mb-1 text-amber-900">
                        Pendência Sinalizada: {statusOptions.find(o => o.value === selectedProject.homologation_status)?.label}
                      </h4>
                      <p className="text-sm text-amber-800 bg-amber-100/50 p-3 rounded-lg border border-amber-200 mt-2">{selectedProject.rejection_reason}</p>
                    </div>
                  </div>
                )}

                {selectedProject.homologation_status === 'connection_point_approved' && (
                  <div className="p-6 bg-green-50 border border-green-200 rounded-xl text-green-900 flex items-center gap-4 shadow-sm">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                      <CheckCircle size={28} className="text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">Homologação Concluída com Sucesso</h4>
                      <p className="text-sm text-green-700 mt-1">O ponto de conexão foi aprovado e o processo validado. O projeto prosseguirá para o arquivamento ou conclusão final.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {statusModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-lg shadow-2xl">
            <h2 className="text-xl font-bold mb-2 text-amber-600 flex items-center gap-2">
              <AlertTriangle /> Adicionar Pendência de Status
            </h2>
            <p className="text-gray-600 mb-6 text-sm">Por favor, informe uma observação ou motivo que justifique o status <strong>{statusOptions.find(o => o.value === statusModal.status)?.label}</strong>:</p>
            <textarea
              className="w-full border border-gray-300 p-4 rounded-xl mb-4 h-32 focus:ring-4 focus:ring-amber-500/20 outline-none resize-none transition-all"
              placeholder="Descreva a restrição ou motivo..."
              value={statusNote}
              onChange={e => setStatusNote(e.target.value)}
            ></textarea>
            <div className="flex justify-end gap-3 mt-2">
              <button
                onClick={() => setStatusModal({ projectId: 0, status: '', isOpen: false })}
                className="px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
              >
                Cancelar Operação
              </button>
              <button
                onClick={() => handleUpdate(statusModal.projectId, statusModal.status, statusNote)}
                className="px-6 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-semibold shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!statusNote.trim()}
              >
                Confirmar e Alterar Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
