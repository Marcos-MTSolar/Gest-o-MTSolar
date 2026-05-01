import React, { useEffect, useState, Component } from 'react';
import api from '../lib/api';
import { CheckSquare, AlertTriangle, CheckCircle, FileText, ListChecks, Save, Lock, Unlock, Calendar, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { deleteDocsHomologacao, getDownloadUrl } from '../hooks/useHomologacaoDocs';

export default function Homologation() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);

  const [statusModal, setStatusModal] = useState<{ projectId: number, status: string, isOpen: boolean }>({ projectId: 0, status: '', isOpen: false });
  const [statusNote, setStatusNote] = useState('');
  const [statusDate, setStatusDate] = useState('');

  const [activeTab, setActiveTab] = useState<'observations' | 'process'>('observations');
  const [observationsText, setObservationsText] = useState('');
  const [checklist, setChecklist] = useState<{ id: string, label: string, completed: boolean }[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

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
      const res = await api.get('/api/projects');
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

  const handleUpdate = async (id: number, status: string | null, reason: string = '', expectedDate: string | null = null) => {
    try {
      const payload: any = { homologation_status: status };
      if (reason) payload.rejection_reason = reason;
      if (expectedDate !== null) payload.homologation_expected_date = expectedDate;

      await api.put(`/api/projects/${id}/homologation`, payload);

      if (status === 'connection_point_approved') {
        // Exclui documentos do Supabase Storage ao finalizar
        try {
          const res = await api.get(`/api/projects/${id}`);
          if (res.data?.homologacao_docs_path) {
            await deleteDocsHomologacao(res.data.homologacao_docs_path);
            await supabase
              .from('projects')
              .update({ homologacao_docs_path: null, homologacao_docs_uploaded_at: null })
              .eq('id', id);
          }
        } catch (e) {
          console.warn('Não foi possível excluir documentos:', e);
        }

        alert('Ponto de conexão aprovado! Projeto finalizado com sucesso.');
        setStatusModal({ projectId: 0, status: '', isOpen: false });
        setStatusNote('');
        setStatusDate('');
        await fetchProjects();
        setSelectedProject(null);
        return;
      }

      setStatusModal({ projectId: 0, status: '', isOpen: false });
      setStatusNote('');
      setStatusDate('');
      await fetchProjects();

      // Recarrega o projeto selecionado para atualizar UI
      const updatedRes = await api.get(`/api/projects/${id}`);
      setSelectedProject(updatedRes.data);
    } catch (error) {
      console.error(error);
      alert('Erro ao atualizar status da homologação');
    }
  };

  const manualSave = async () => {
    if (!selectedProject) return;
    setIsSaving(true);
    setSaveMessage(null);

    try {
      // Faz a requisição PUT explicitamente com os dados atuais do state
      console.log('Enviando PUT request para salvar:', { observationsText, checklist });
      await api.put(`/api/projects/${selectedProject.id}/homologation`, {
        homologation_observations: observationsText,
        homologation_checklist: checklist
      });

      setSaveMessage({ type: 'success', text: 'Dados salvos com sucesso!' });

      // Limpa a mensagem após 3 segundos
      setTimeout(() => setSaveMessage(null), 3000);

      // Atualiza a lista por trás
      fetchProjects();
    } catch (error) {
      console.error('Erro no manualSave:', error);
      setSaveMessage({ type: 'error', text: 'Erro ao salvar, tente novamente.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChecklistItemToggle = async (id: string, completed: boolean) => {
    const newChecklist = checklist.map(item => item.id === id ? { ...item, completed } : item);
    setChecklist(newChecklist);

    // Auto-save no toggle para evitar perder por desatenção, enviamos diretamente a nova lista
    try {
      await api.put(`/api/projects/${selectedProject.id}/homologation`, {
        homologation_observations: observationsText,
        homologation_checklist: newChecklist
      });
      fetchProjects();
    } catch (e) { console.error('auto-save falhou', e); }

    const allCompleted = newChecklist.every(item => item.completed);

    // Regra de Liberação
    if (allCompleted && (!selectedProject.homologation_status || selectedProject.homologation_status === 'none')) {
      alert('Checklist 100% concluído! A etapa de Análise Técnica foi habilitada.');
      handleUpdate(selectedProject.id, 'technical_analysis');
    }
    // Regra de Regressão: Desmarcou e estava na Análise Técnica
    else if (!allCompleted && selectedProject.homologation_status === 'technical_analysis') {
      alert('Ops! Um item do checklist foi desmarcado. O processo "Análise Técnica" foi bloqueado novamente.');
      handleUpdate(selectedProject.id, null); // Revoga status
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

  const expectsDateStatus = ['technical_analysis', 'waiting_inspection', 'performing_inspection'];

  const isChecklistComplete = checklist.length > 0 && checklist.every(i => i.completed);
  const isProcessLocked = !isChecklistComplete;

  const handleDelete = async (id: number, clientName: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o projeto de "${clientName}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await api.delete(`/api/projects/${id}`);
      fetchProjects();
    } catch (err) {
      alert('Erro ao excluir projeto. Tente novamente.');
    }
  };

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
              <div key={p.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center transition hover:shadow-md">
                <div className="flex-1 mr-4">
                  <h3 className="text-lg font-bold text-gray-800">{p.client_name}</h3>
                  <p className="text-sm text-gray-500">{p.title}</p>

                  {/* Snippet de Observações na View Externa */}
                  {typeof p.homologation_observations === 'string' && p.homologation_observations.trim() !== '' && (
                    <div className="mt-2 text-sm text-gray-600 bg-amber-50/50 p-2.5 rounded-lg border border-amber-100/50 flex items-start gap-2 max-w-2xl">
                      <FileText size={16} className="text-amber-500 mt-0.5 shrink-0" />
                      <span className="line-clamp-2 italic">"{p.homologation_observations}"</span>
                    </div>
                  )}

                  <div className="mt-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${p.homologation_status === 'connection_point_approved' ? 'bg-green-100 text-green-800 border border-green-200' :
                      p.homologation_status === 'rejected' ? 'bg-red-100 text-red-800 border border-red-200' :
                        !p.homologation_status ? 'bg-gray-100 text-gray-600 border border-gray-200' : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}>
                      {statusOptions.find(o => o.value === p.homologation_status)?.label || 'Aguardando Checklist de Pré-Homologação'}
                    </span>

                    {/* Exibe a data nas tags da tela inicial */}
                    {p.homologation_expected_date && expectsDateStatus.includes(p.homologation_status) && (
                      <span className="ml-2 px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 bg-purple-100 text-purple-800 border border-purple-200">
                        <Calendar size={12} /> Prev: {new Date(p.homologation_expected_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      const res = await api.get(`/api/projects/${p.id}`);
                      setSelectedProject(res.data);

                      const savedObs = res.data.homologation_observations || '';
                      setObservationsText(savedObs);

                      const savedChecklist = res.data.homologation_checklist;
                      
                      // Parse if the backend returns as a string, or use directly if array
                      let parsedChecklist: any[] = defaultChecklist;
                      if (Array.isArray(savedChecklist) && savedChecklist.length > 0) {
                        parsedChecklist = savedChecklist;
                      } else if (typeof savedChecklist === 'string') {
                        try {
                          const arr = JSON.parse(savedChecklist);
                          if (Array.isArray(arr) && arr.length > 0) {
                            parsedChecklist = arr;
                          }
                        } catch (e) {
                          console.error('Failed to parse homologation_checklist string', e);
                        }
                      }

                      // Merging DB state with default checklist to cover dynamic additions or missing values
                      const loadedChecklist = defaultChecklist.map(defaultItem => {
                        const found = parsedChecklist.find((i: any) => i.id === defaultItem.id);
                        return found ? { ...defaultItem, completed: Boolean(found.completed && found.completed !== 'false') } : defaultItem;
                      });

                      console.log('Checklist merged from DB for project', p.id, ':', loadedChecklist);
                      setChecklist(loadedChecklist);

                      const isComplete = loadedChecklist.every((item: any) => item.completed);
                      if (isComplete || res.data.homologation_status) {
                        setActiveTab('process');
                      } else {
                        setActiveTab('observations');
                      }
                    }}
                    className="bg-blue-900 text-white px-5 py-2.5 rounded-lg hover:bg-blue-800 shadow shadow-blue-900/20 font-medium shrink-0"
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
            ))}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
          <div className="p-6 border-b flex justify-between items-center bg-gray-50/80">
            <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">Homologação: {selectedProject.client_name}</h2>
              <p className="text-sm text-gray-500">{selectedProject.title}</p>
            </div>
            <div className="flex gap-2">
              {selectedProject?.homologacao_docs_path && (
                <button
                  onClick={async () => {
                    try {
                      const url = await getDownloadUrl(selectedProject.homologacao_docs_path);
                      window.open(url, '_blank');
                    } catch {
                      alert('Erro ao gerar link de download');
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 text-sm"
                >
                  <FileText size={16} /> Baixar/Ver Documentos
                </button>
              )}
              <button onClick={() => { setSelectedProject(null); fetchProjects(); }} className="text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow font-medium px-4 py-2 rounded-lg transition-all border border-gray-300 shadow-sm bg-gray-50">Voltar para Lista</button>
            </div>
          </div>

          <div className="flex border-b bg-white overflow-x-auto select-none">
            <button onClick={() => setActiveTab('observations')} className={`px-6 py-4 font-semibold transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'observations' ? 'border-b-[3px] border-blue-600 text-blue-800 bg-blue-50/40' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'}`}>
              <FileText size={20} /> Observações Pré-Homologação
              {isChecklistComplete ? <CheckCircle size={16} className="text-green-500 ml-1" /> : <AlertTriangle size={16} className="text-amber-500 ml-1" />}
            </button>
            <button
              onClick={() => {
                if (!isProcessLocked) setActiveTab('process');
              }}
              disabled={isProcessLocked}
              className={`px-6 py-4 font-semibold flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === 'process' ? 'border-b-[3px] border-blue-600 text-blue-800 bg-blue-50/40' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'} ${isProcessLocked ? 'opacity-60 cursor-not-allowed bg-gray-50/50' : ''}`}>
              <ListChecks size={20} /> Processo de Homologação
              {isProcessLocked ? <Lock size={16} className="text-gray-400 ml-1" /> : <Unlock size={16} className="text-green-500 ml-1" />}
            </button>
          </div>

          {activeTab === 'observations' ? (
            <div className="p-6 flex flex-col xl:flex-row gap-8 bg-gray-50/30 relative">
              <div className="flex-1 flex flex-col">
                <h3 className="text-lg font-bold mb-2 text-gray-800 flex items-center gap-2">
                  <FileText size={20} className="text-blue-600" /> Notas e Pendências Gerais
                </h3>
                <p className="text-sm text-gray-500 mb-4 tracking-tight">Registre informações relevantes antes do início formal da homologação. Esta anotação fica exposta na tela principal de listagem.</p>
                <textarea
                  className="w-full border border-gray-300 p-4 rounded-xl flex-1 min-h-[250px] focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none shadow-sm bg-white text-gray-700"
                  value={observationsText}
                  onChange={e => setObservationsText(e.target.value)}
                  placeholder="Digite as observações, pendências comerciais ou restrições técnicas..."
                />

                {/* Botão Salvar dedicado com ação explícita exigida pelo usuário */}
                <div className="mt-4 flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex-wrap gap-4">
                  <span className="text-sm text-gray-500 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                    Clique em Salvar para garantir a gravação das notas.
                  </span>
                  <div className="flex items-center gap-3">
                    {saveMessage && (
                      <span className={`text-sm font-bold flex items-center gap-1.5 ${saveMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                        {saveMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                        {saveMessage.text}
                      </span>
                    )}
                    <button
                      onClick={manualSave}
                      disabled={isSaving}
                      className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-md active:scale-95 disabled:bg-blue-400 whitespace-nowrap"
                    >
                      <Save size={18} /> {isSaving ? 'Gravando dados...' : 'Salvar Alterações'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-[1.2] flex flex-col">
                <h3 className="text-lg font-bold mb-2 text-gray-800 flex items-center gap-2">
                  <CheckSquare size={20} className="text-blue-600" /> Checklist Obrigatório
                </h3>
                <p className="text-sm text-gray-500 mb-4 tracking-tight">O fluxo de Análise Técnica só é liberado mediante 100% de conclusão nesta verificação.</p>

                <div className="space-y-3 bg-white p-3 rounded-xl border border-gray-200 flex-1 shadow-sm">
                  {checklist.map(item => (
                    <label key={item.id} className={`flex items-start space-x-4 p-4 rounded-lg cursor-pointer transition-all border ${item.completed ? 'bg-green-50/60 border-green-200' : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'}`}>
                      <div className="mt-0.5">
                        <input type="checkbox" className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer" checked={item.completed} onChange={(e) => handleChecklistItemToggle(item.id, e.target.checked)} />
                      </div>
                      <div>
                        <span className={`font-semibold block transition-colors ${item.completed ? 'text-gray-400' : 'text-gray-800'}`}>{item.label}</span>
                        {!item.completed && <span className="text-xs text-amber-600 font-bold mt-1 inline-block bg-amber-50 px-2.5 py-0.5 rounded border border-amber-100 uppercase tracking-wide">Pendente</span>}
                        {item.completed && <span className="text-xs text-green-600 font-bold mt-1 inline-block bg-green-50 px-2.5 py-0.5 rounded border border-green-100 uppercase tracking-wide">Resolvido</span>}
                      </div>
                    </label>
                  ))}
                </div>

                {/* SeÃ§Ã£o de Documentos do Cliente (ExibiÃ§Ã£o Apenas) */}
                {selectedProject.documents && selectedProject.documents.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-bold mb-3 text-gray-800 flex items-center gap-2">
                      <FileText size={20} className="text-blue-600" /> Documentos do Cliente
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedProject.documents.map((doc: any) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:border-blue-200 transition-all">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <FileText size={16} className="text-blue-500 shrink-0" />
                            <div className="overflow-hidden">
                              <p className="text-xs font-bold text-gray-700 truncate">{doc.title || 'Documento'}</p>
                              <p className="text-[10px] text-gray-400 truncate">{new Date(doc.created_at).toLocaleDateString('pt-BR')}</p>
                            </div>
                          </div>
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 p-1.5 hover:bg-blue-50 rounded-md transition-colors"
                            title="Ver documento"
                          >
                            <Unlock size={16} />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
                    <p className="text-gray-600 mb-6 font-medium">Finalize todas as observações e marque 100% do checklist Pré-Homologação antes de avançar para a Análise Técnica.</p>
                    <button onClick={() => setActiveTab('observations')} className="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg w-full hover:bg-blue-700 transition-colors shadow-lg active:scale-95">
                      Ir para Checklist
                    </button>
                  </div>
                </div>
              )}

              <div className={isProcessLocked ? 'opacity-40 pointer-events-none filter blur-[2px] transition-all' : ''}>

                <div className="mb-6">
                  <h3 className="text-lg font-bold mb-4 text-gray-800 border-b border-gray-200 pb-2">Linha do Tempo / Status do Processo</h3>

                  {selectedProject.homologation_expected_date && expectsDateStatus.includes(selectedProject.homologation_status) && (
                    <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-xl flex items-center gap-3 w-fit pr-8">
                      <div className="bg-purple-100 text-purple-700 p-2 rounded-lg"><Calendar size={24} /></div>
                      <div>
                        <p className="text-xs text-purple-800 font-bold uppercase tracking-wider">Data Prevista para Conclusão</p>
                        <p className="text-lg font-black text-purple-900">{new Date(selectedProject.homologation_expected_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3">
                    {statusOptions.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          if (['rejected', 'waiting_inspection', 'performing_inspection', 'technical_analysis'].includes(opt.value)) {
                            setStatusNote(selectedProject.rejection_reason || '');
                            // Set default date to today to help UI if empty
                            setStatusDate(typeof selectedProject.homologation_expected_date === 'string' ? selectedProject.homologation_expected_date.split('T')[0] : new Date().toISOString().split('T')[0]);
                            setStatusModal({ projectId: selectedProject.id, status: opt.value, isOpen: true });
                          } else {
                            handleUpdate(selectedProject.id, opt.value, '');
                          }
                        }}
                        className={`px-5 py-3 text-sm rounded-xl border transition-all font-semibold flex items-center gap-2 ${selectedProject.homologation_status === opt.value
                          ? 'bg-blue-900 text-white border-blue-900 shadow-lg ring-2 ring-blue-900/20 ring-offset-2'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400 hover:bg-blue-50 shadow-sm hover:shadow'
                          }`}
                      >
                        {selectedProject.homologation_status === opt.value && <CheckCircle size={18} />}
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedProject.homologation_status === 'rejected' && selectedProject.rejection_reason && (
                  <div className="p-5 bg-red-50 border border-red-200 rounded-xl text-red-800 flex items-start gap-4 shadow-sm mb-6">
                    <AlertTriangle size={24} className="mt-0.5 flex-shrink-0 text-red-600" />
                    <div>
                      <h4 className="font-bold mb-1 text-red-900">
                        Motivo da Reprovação
                      </h4>
                      <p className="text-sm text-red-800 bg-red-100/50 p-3 rounded-lg border border-red-200 mt-2 font-medium whitespace-pre-line">{selectedProject.rejection_reason}</p>
                    </div>
                  </div>
                )}

                {selectedProject.homologation_status === 'connection_point_approved' && (
                  <div className="p-6 bg-green-50 border border-green-200 rounded-xl text-green-900 flex items-center gap-4 shadow-sm mb-6">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                      <CheckCircle size={28} className="text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">Homologação Concluída com Sucesso</h4>
                      <p className="text-sm text-green-700 mt-1 font-medium">O ponto de conexão foi aprovado e o processo validado. O projeto prosseguirá para a conclusão final.</p>
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
          <div className="bg-white p-8 rounded-2xl w-full max-w-lg shadow-2xl">
            {expectsDateStatus.includes(statusModal.status) ? (
              <>
                <h2 className="text-xl font-bold mb-3 text-blue-900 flex items-center gap-2">
                  <Calendar /> Definir Data Prevista
                </h2>
                <p className="text-gray-600 mb-6 text-sm">Por favor, informe a <strong>Data prevista para conclusão</strong> da etapa <strong>{statusOptions.find(o => o.value === statusModal.status)?.label}</strong>:</p>
                <input
                  type="date"
                  className="w-full border border-gray-300 p-4 rounded-xl mb-6 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-gray-700"
                  value={statusDate}
                  onChange={e => setStatusDate(e.target.value)}
                />
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold mb-3 text-red-600 flex items-center gap-2">
                  <AlertTriangle /> Reprovar Análise
                </h2>
                <p className="text-gray-600 mb-6 text-sm">Por favor, informe detalhadamente o motivo da reprovação para o status <strong>{statusOptions.find(o => o.value === statusModal.status)?.label}</strong>:</p>
                <textarea
                  className="w-full border border-gray-300 p-4 rounded-xl mb-6 h-32 focus:ring-4 focus:ring-red-500/20 focus:border-red-500 outline-none resize-none transition-all"
                  placeholder="Descreva a restrição..."
                  value={statusNote}
                  onChange={e => setStatusNote(e.target.value)}
                ></textarea>
              </>
            )}

            <div className="flex justify-end gap-3 border-t pt-4">
              <button
                onClick={() => setStatusModal({ projectId: 0, status: '', isOpen: false })}
                className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg font-bold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const reason = expectsDateStatus.includes(statusModal.status) ? '' : statusNote;
                  const targetDate = expectsDateStatus.includes(statusModal.status) ? statusDate : null;
                  handleUpdate(statusModal.projectId, statusModal.status, reason, targetDate);
                }}
                className={`px-6 py-2.5 text-white rounded-lg font-bold shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${expectsDateStatus.includes(statusModal.status) ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}`}
                disabled={expectsDateStatus.includes(statusModal.status) ? !statusDate : !statusNote.trim()}
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
