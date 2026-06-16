import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowUp, 
  ArrowDown, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Play, 
  MoreVertical,
  Save,
  MessageSquare,
  Search,
  ChevronDown,
  ChevronUp,
  Cpu,
  Hash,
  Zap,
  Home,
  MapPin
} from 'lucide-react';

interface ProjectSchedule {
  id: number;
  client_name: string;
  title: string;
  schedule_order: number;
  schedule_notes: string;
  schedule_status: 'pending' | 'in_progress' | 'completed' | 'issue';
  schedule_issue_notes: string;
  current_stage: string;
  // Campos do Kit Fotovoltaico (vindos da tabela clients)
  inversor_marca?: string | null;
  inversor_modelo?: string | null;
  inversor_potencia?: string | number | null;
  modulo_modelo?: string | null;
  modulo_potencia?: string | number | null;
  estrutura_tipo?: string | null;
  // Endereço do cliente (vindo da tabela clients)
  address?: string | null;
  city?: string | null;
  state?: string | null;
}

interface ScheduleDetails {
  disjuntor?: string;
  modulos?: number | string;
  inversor?: string;
  telhado?: string;
  endereco?: string;
}

const OrderInput = ({ currentIndex, totalItems, onMove }: { currentIndex: number; totalItems: number; onMove: (newPos: number) => void }) => {
  const [val, setVal] = useState<string | number>(currentIndex + 1);

  useEffect(() => {
    setVal(currentIndex + 1);
  }, [currentIndex]);

  const handleBlurOrSubmit = () => {
    let num = Number(val);
    if (isNaN(num) || num < 1) {
      num = 1;
    } else if (num > totalItems) {
      num = totalItems;
    }
    setVal(num);
    onMove(num);
  };

  return (
    <input
      type="number"
      min={1}
      max={totalItems}
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={handleBlurOrSubmit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          handleBlurOrSubmit();
        }
      }}
      className="w-14 text-center border border-gray-300 rounded-lg p-1 font-bold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900 shadow-sm text-sm"
    />
  );
};

export default function ObraSchedule() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProject, setEditingProject] = useState<ProjectSchedule | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const canReorder = user?.role === 'CEO' || user?.role === 'ADMIN';
  const canEdit = user?.role === 'CEO' || user?.role === 'ADMIN';

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/projects-schedule');
      setProjects(res.data);
    } catch (error) {
      console.error('Erro ao buscar cronograma:', error);
    } finally {
      setLoading(false);
    }
  };

  const parseScheduleNotes = (notes: string): { general: string, details: ScheduleDetails } => {
    try {
      if (!notes) return { general: '', details: {} };
      if (notes.startsWith('{')) {
        const parsed = JSON.parse(notes);
        return {
          general: parsed.general || '',
          details: {
            disjuntor: parsed.disjuntor || '',
            modulos: parsed.modulos || '',
            inversor: parsed.inversor || '',
            telhado: parsed.telhado || '',
            endereco: parsed.endereco || ''
          }
        };
      }
      return { general: notes, details: {} };
    } catch (e) {
      return { general: notes, details: {} };
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    if (!canReorder) return;
    
    const newProjects = [...projects];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newProjects.length) return;
    
    // Swap
    [newProjects[index], newProjects[targetIndex]] = [newProjects[targetIndex], newProjects[index]];
    
    // Update local state
    setProjects(newProjects);
    
    try {
      const orders = newProjects.map((p, i) => ({ id: p.id, schedule_order: i }));
      await api.put('/api/projects/schedule/reorder', { orders });
    } catch (error) {
      fetchSchedule();
    }
  };

  const handlePositionChange = async (currentIndex: number, newPosition: number) => {
    if (!canReorder) return;
    const targetIndex = newPosition - 1;
    if (targetIndex < 0 || targetIndex >= projects.length || targetIndex === currentIndex) return;

    const newProjects = [...projects];
    const [removed] = newProjects.splice(currentIndex, 1);
    newProjects.splice(targetIndex, 0, removed);

    // Update local state
    setProjects(newProjects);

    try {
      const orders = newProjects.map((p, i) => ({ id: p.id, schedule_order: i }));
      await api.put('/api/projects/schedule/reorder', { orders });
    } catch (error) {
      fetchSchedule();
    }
  };

  const handleSaveEdit = async () => {
    if (!editingProject) return;
    
    setIsSaving(true);
    try {
      const currentData = parseScheduleNotes(projects.find(p => p.id === editingProject.id)?.schedule_notes || '');
      const newNotes = JSON.stringify({
        ...currentData.details,
        general: editingProject.schedule_notes
      });

      await api.put(`/api/projects/${editingProject.id}/schedule`, {
        schedule_notes: newNotes,
        schedule_status: editingProject.schedule_status,
        schedule_issue_notes: editingProject.schedule_status === 'issue' ? editingProject.schedule_issue_notes : null
      });
      
      setEditingProject(null);
      fetchSchedule();
      alert('Alterações salvas com sucesso!');
    } catch (error) {
      alert('Erro ao salvar alterações.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateDetails = async (projectId: number, field: keyof ScheduleDetails, value: string | number) => {
    if (!canEdit) return;
    
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const { general, details } = parseScheduleNotes(project.schedule_notes);
    const newDetails = { ...details, [field]: value };
    const newNotes = JSON.stringify({ ...newDetails, general });

    try {
      await api.put(`/api/projects/${projectId}/schedule`, {
        schedule_notes: newNotes
      });
      
      // Update local state
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, schedule_notes: newNotes } : p));
    } catch (error) {
      alert('Erro ao salvar campo.');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in_progress': return <Play size={18} className="text-blue-500" />;
      case 'completed': return <CheckCircle size={18} className="text-green-500" />;
      case 'issue': return <AlertCircle size={18} className="text-red-500" />;
      default: return <Clock size={18} className="text-amber-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'in_progress': return 'Em Andamento';
      case 'completed': return 'Concluído';
      case 'issue': return 'Pendência';
      default: return 'Pendente';
    }
  };

  const filteredProjects = projects.filter(p => 
    p.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-12 w-12 border-4 border-blue-900 border-t-transparent rounded-full mb-4"
        />
        <p className="text-gray-500 font-medium">Carregando cronograma...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Cronograma de Obras</h1>
          <p className="text-gray-500 mt-1">Gerencie a ordem e o status das instalações em tempo real.</p>
        </div>
        
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text"
            placeholder="Buscar obra..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-900 focus:border-transparent outline-none transition-all shadow-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-4">
        {filteredProjects.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-12 rounded-2xl text-center border-2 border-dashed border-gray-200"
          >
            <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search size={24} className="text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">Nenhuma obra encontrada</h3>
            <p className="text-gray-500 max-w-xs mx-auto mt-2">Tente ajustar sua busca ou verifique se há projetos cadastrados no comercial.</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredProjects.map((project, index) => {
                const { general, details } = parseScheduleNotes(project.schedule_notes);
                const isExpanded = expandedId === project.id;

                return (
                  <motion.div 
                    key={project.id} 
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all"
                  >
                    <div className="p-5 flex flex-col md:flex-row md:items-center gap-5">
                      {/* Project Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          {canReorder && !searchTerm && (
                            <OrderInput 
                              currentIndex={index}
                              totalItems={projects.length}
                              onMove={(newPos) => handlePositionChange(index, newPos)}
                            />
                          )}
                          <h3 className="text-xl font-bold text-gray-900 truncate">{project.client_name}</h3>
                          <span className="text-[10px] bg-blue-900 text-white px-2.5 py-1 rounded-full uppercase font-black tracking-widest shadow-sm">
                            {project.current_stage}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 font-medium truncate">{project.title}</p>
                        <p className="text-sm text-gray-400 truncate">
                          {project.client_name ? (
                            project.city ? `${project.city}${project.state ? ` - ${project.state}` : ''}` : (project.address || 'Endereço não informado')
                          ) : ''}
                        </p>
                      </div>

                      {/* Status & Actions */}
                      <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-4 pt-4 md:pt-0 border-t md:border-t-0 border-gray-50">
                        <div className="flex flex-col items-start md:items-end">
                          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-bold text-xs shadow-sm ${
                            project.schedule_status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                            project.schedule_status === 'completed' ? 'bg-green-100 text-green-700' :
                            project.schedule_status === 'issue' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {getStatusIcon(project.schedule_status)}
                            {getStatusLabel(project.schedule_status)}
                          </div>
                          {!searchTerm && <span className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-widest px-1">Posição #{index + 1}</span>}
                        </div>
                        
                        <button 
                          onClick={() => setEditingProject({ ...project, schedule_notes: general })}
                          className="bg-white text-blue-900 border-2 border-blue-900 px-6 py-2.5 rounded-xl hover:bg-blue-900 hover:text-white font-black text-sm shadow-sm transition-all active:scale-95"
                        >
                          Alterar Status
                        </button>

                        <button 
                          onClick={() => setExpandedId(isExpanded ? null : project.id)}
                          className={`p-2 rounded-full transition-colors ${isExpanded ? 'bg-blue-50 text-blue-900' : 'bg-gray-50 text-gray-400 hover:text-blue-900'}`}
                        >
                          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Section */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-gray-50 bg-gray-50/30 overflow-hidden"
                        >
                          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Disjuntor */}
                            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                              <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                                <Zap size={14} className="text-amber-500" /> Disjuntor
                              </label>
                              <input 
                                type="text"
                                disabled={!canEdit}
                                className="w-full text-sm font-bold text-gray-800 bg-transparent outline-none focus:text-blue-900 disabled:opacity-70"
                                value={details.disjuntor || ''}
                                onChange={e => setProjects(prev => prev.map(p => p.id === project.id ? { ...p, schedule_notes: JSON.stringify({ ...details, disjuntor: e.target.value, general }) } : p))}
                                onBlur={e => handleUpdateDetails(project.id, 'disjuntor', e.target.value)}
                                placeholder="Padrão de entrada..."
                              />
                            </div>

                            {/* Módulos */}
                            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                              <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                                <Hash size={14} className="text-blue-500" /> Quantidade de Módulos
                              </label>
                              <input 
                                type="number"
                                disabled={!canEdit}
                                className="w-full text-sm font-bold text-gray-800 bg-transparent outline-none focus:text-blue-900 disabled:opacity-70"
                                value={details.modulos || ''}
                                onChange={e => setProjects(prev => prev.map(p => p.id === project.id ? { ...p, schedule_notes: JSON.stringify({ ...details, modulos: e.target.value, general }) } : p))}
                                onBlur={e => handleUpdateDetails(project.id, 'modulos', e.target.value)}
                                placeholder="0"
                              />
                            </div>

                            {/* Inversor */}
                            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                              <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                                <Cpu size={14} className="text-purple-500" /> Inversor
                              </label>
                              <input 
                                type="text"
                                disabled={!canEdit}
                                className="w-full text-sm font-bold text-gray-800 bg-transparent outline-none focus:text-blue-900 disabled:opacity-70"
                                value={details.inversor || ''}
                                onChange={e => setProjects(prev => prev.map(p => p.id === project.id ? { ...p, schedule_notes: JSON.stringify({ ...details, inversor: e.target.value, general }) } : p))}
                                onBlur={e => handleUpdateDetails(project.id, 'inversor', e.target.value)}
                                placeholder="Marca/Modelo..."
                              />
                            </div>

                            {/* Telhado */}
                            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                              <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                                <Home size={14} className="text-green-500" /> Tipo de Telhado
                              </label>
                              <input 
                                type="text"
                                disabled={!canEdit}
                                className="w-full text-sm font-bold text-gray-800 bg-transparent outline-none focus:text-blue-900 disabled:opacity-70"
                                value={details.telhado || ''}
                                onChange={e => setProjects(prev => prev.map(p => p.id === project.id ? { ...p, schedule_notes: JSON.stringify({ ...details, telhado: e.target.value, general }) } : p))}
                                onBlur={e => handleUpdateDetails(project.id, 'telhado', e.target.value)}
                                placeholder="Cerâmico, Fibrocimento..."
                              />
                            </div>



                            {/* Endereço do cliente (vindo da tabela clients) */}
                            {(project.address || project.city || project.state) && (
                              <div className="sm:col-span-2 lg:col-span-3 bg-gray-50 rounded-2xl border border-gray-100 p-4">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                  <MapPin size={13} className="text-red-400" /> Endereço da Instalação (Cadastro do Cliente)
                                </p>
                                <p className="text-sm font-bold text-gray-800">
                                  {project.address || '—'}{project.city ? `, ${project.city}` : ''}{project.state ? ` - ${project.state}` : ''}
                                </p>
                              </div>
                            )}

                            {/* Kit Negociado (Somente Leitura — dados da tabela clients) */}
                            {(project.inversor_modelo || project.modulo_modelo || project.inversor_potencia || project.modulo_potencia) && (
                              <div className="sm:col-span-2 lg:col-span-3">
                                <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                                  <Cpu size={13} className="text-amber-500" /> Kit Negociado (Proposta Comercial)
                                </p>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                  <div className="bg-amber-50 rounded-xl border border-amber-100 p-3">
                                    <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest mb-1">Inversor Modelo</p>
                                    <p className="text-sm font-bold text-gray-800">{project.inversor_modelo || '—'}</p>
                                  </div>
                                  <div className="bg-amber-50 rounded-xl border border-amber-100 p-3">
                                    <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest mb-1">Potência Inversor</p>
                                    <p className="text-sm font-bold text-gray-800">{project.inversor_potencia ? `${project.inversor_potencia} kW` : '—'}</p>
                                  </div>
                                  <div className="bg-amber-50 rounded-xl border border-amber-100 p-3">
                                    <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest mb-1">Módulo Modelo</p>
                                    <p className="text-sm font-bold text-gray-800">{project.modulo_modelo || '—'}</p>
                                  </div>
                                  <div className="bg-amber-50 rounded-xl border border-amber-100 p-3">
                                    <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest mb-1">Potência Módulo</p>
                                    <p className="text-sm font-bold text-gray-800">{project.modulo_potencia ? `${project.modulo_potencia} Wp` : '—'}</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Observações Gerais do Card */}
                            {general && (
                              <div className="sm:col-span-2 lg:col-span-3 bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex items-start gap-3">
                                <MessageSquare size={18} className="text-blue-500 mt-0.5 shrink-0" />
                                <div>
                                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Observações do Cronograma</p>
                                  <p className="text-sm text-blue-900 font-medium leading-relaxed">{general}</p>
                                </div>
                              </div>
                            )}

                            {project.schedule_status === 'issue' && project.schedule_issue_notes && (
                              <div className="sm:col-span-2 lg:col-span-3 bg-red-50 p-4 rounded-2xl border border-red-100 flex items-start gap-3">
                                <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
                                <div>
                                  <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Pendência Ativa</p>
                                  <p className="text-sm text-red-900 font-bold leading-relaxed">{project.schedule_issue_notes}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Edit Modal (Status and General Notes only) */}
      <AnimatePresence>
        {editingProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingProject(null)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="bg-gradient-to-r from-blue-900 to-blue-800 p-6 text-white">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-black tracking-tight">Alterar Status</h2>
                    <p className="text-blue-100 font-medium mt-1">{editingProject.client_name}</p>
                  </div>
                  <button 
                    onClick={() => setEditingProject(null)}
                    className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>
              
              <div className="p-8 space-y-8">
                {/* Status Selection */}
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Novo Status da Obra</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['pending', 'in_progress', 'completed', 'issue'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setEditingProject({...editingProject, schedule_status: s})}
                        className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all group ${
                          editingProject.schedule_status === s 
                            ? 'border-blue-900 bg-blue-50/50' 
                            : 'border-gray-50 hover:border-gray-200'
                        }`}
                      >
                        <div className={`p-2 rounded-lg transition-colors ${
                          editingProject.schedule_status === s ? 'bg-white shadow-sm' : 'bg-gray-50 group-hover:bg-gray-100'
                        }`}>
                          {getStatusIcon(s)}
                        </div>
                        <span className={`text-sm font-bold ${
                          editingProject.schedule_status === s ? 'text-blue-900' : 'text-gray-500'
                        }`}>
                          {getStatusLabel(s)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* General Notes */}
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Observações Internas (Opcional)</label>
                  <textarea 
                    className="w-full bg-gray-50 border-2 border-gray-50 rounded-2xl p-4 text-sm font-medium focus:bg-white focus:border-blue-900 outline-none transition-all h-28 resize-none shadow-inner"
                    placeholder="Notas para controle interno..."
                    value={editingProject.schedule_notes || ''}
                    onChange={e => setEditingProject({...editingProject, schedule_notes: e.target.value})}
                  />
                </div>

                {/* Issue Details (Mandatory when status is issue) */}
                <AnimatePresence>
                  {editingProject.schedule_status === 'issue' && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <label className="block text-[10px] font-black text-red-500 uppercase tracking-[0.2em] mb-3">Descrição da Pendência (Obrigatório)</label>
                      <textarea 
                        className="w-full bg-red-50/50 border-2 border-red-100 rounded-2xl p-4 text-sm font-bold text-red-900 placeholder:text-red-300 focus:bg-white focus:border-red-500 outline-none transition-all h-24 resize-none shadow-inner"
                        placeholder="Por que a obra está com pendência?"
                        value={editingProject.schedule_issue_notes || ''}
                        onChange={e => setEditingProject({...editingProject, schedule_issue_notes: e.target.value})}
                        required
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setEditingProject(null)}
                    className="flex-1 px-6 py-4 text-gray-500 font-black hover:bg-gray-100 rounded-2xl transition-colors uppercase text-xs tracking-widest"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSaveEdit}
                    disabled={isSaving || (editingProject.schedule_status === 'issue' && !editingProject.schedule_issue_notes)}
                    className="flex-[2] bg-blue-900 text-white font-black py-4 rounded-2xl hover:bg-blue-800 shadow-xl shadow-blue-900/20 disabled:opacity-50 flex items-center justify-center gap-3 transition-all active:scale-95 uppercase text-xs tracking-widest"
                  >
                    {isSaving ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <>
                        <Save size={18} />
                        Salvar Status
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Custom X icon component
const X = ({ size, className }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);
