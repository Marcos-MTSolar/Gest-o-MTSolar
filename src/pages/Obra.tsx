import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { supabase } from '../lib/supabase';
import { CheckCircle, AlertTriangle, Camera, X, Trash2, Loader2, FileText, Plus } from 'lucide-react';
import { sendUpdateNotification } from '../lib/notifications';
import { jsPDF } from 'jspdf';

const PHOTO_FIELDS = [
  { name: 'photo_modules', label: 'Módulos' },
  { name: 'photo_inverter', label: 'Inversor' },
  { name: 'photo_inverter_label', label: 'Etiqueta Inversor (Legível)' },
  { name: 'photo_roof_sealing', label: 'Vedação (Antes dos Módulos)' },
  { name: 'photo_grounding', label: 'Aterramento' },
  { name: 'photo_ac_voltage', label: 'Tensão CA' },
  { name: 'photo_dc_voltage', label: 'Tensão CC' },
  { name: 'photo_generation_plate', label: 'Placa Geração (Padrão Entrada)' },
  { name: 'photo_ac_stringbox', label: 'String Box CA' },
  { name: 'photo_connection_point', label: 'Ponto Conexão' },
  { name: 'photo_aterramento_padrao', label: 'Aterramento Padrão Entrada' },
];

type PhotoFieldName =
  | 'photo_modules'
  | 'photo_inverter'
  | 'photo_inverter_label'
  | 'photo_roof_sealing'
  | 'photo_grounding'
  | 'photo_ac_voltage'
  | 'photo_dc_voltage'
  | 'photo_generation_plate'
  | 'photo_ac_stringbox'
  | 'photo_connection_point'
  | 'photo_aterramento_padrao';

export default function Obra() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'photos' | 'pendencies'>('photos');
  const [pendencies, setPendencies] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Track selected files per photo field in state
  const [photoFiles, setPhotoFiles] = useState<Record<PhotoFieldName, File | null>>(
    {} as Record<PhotoFieldName, File | null>
  );
  // Track object URLs for preview
  const [photoPreviews, setPhotoPreviews] = useState<Record<PhotoFieldName, string | null>>(
    {} as Record<PhotoFieldName, string | null>
  );

  const [isTrifasico, setIsTrifasico] = useState(false);
  const [newPhotoFiles, setNewPhotoFiles] = useState<Record<string, File | null>>({
    photo_fase_a_b: null,
    photo_fase_a_c: null,
    photo_fase_b_c: null,
    photo_stringbox_cc: null,
  });
  const [newPhotoUrls, setNewPhotoUrls] = useState<Record<string, string | null>>({});
  const [mpptList, setMpptList] = useState<Array<{ label: string; file: File | null; url: string | null }>>([]);
  const [obraPhotosUploadedAt, setObraPhotosUploadedAt] = useState<Record<string, string>>({});

  const uploadNewPhoto = async (campo: string, file: File): Promise<{ url: string, uploadedAt: string } | null> => {
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('campo', campo);
      fd.append('project_id', String(selectedProject?.id));
      const res = await api.post('/api/obra/upload-foto', fd);
      return { url: res.data.url, uploadedAt: res.data.uploadedAt };
    } catch {
      return null;
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await api.get('/api/projects');
      if (Array.isArray(res.data)) {
        setProjects(res.data.filter((p: any) =>
          ['installation', 'homologation'].includes(p.current_stage)
        ));
      } else {
        setProjects([]);
      }
    } catch {
      setProjects([]);
    }
  };

  const openProject = async (p: any) => {
    const res = await api.get(`/api/projects/${p.id}`);
    setSelectedProject(res.data);
    setActiveTab('photos');
    setPendencies(res.data.pendencies || '');
    setError('');
    // Reset file selections
    setPhotoFiles({} as Record<PhotoFieldName, File | null>);
    setPhotoPreviews({} as Record<PhotoFieldName, string | null>);
    setIsTrifasico(res.data.is_trifasico || false);
    
    // Load existing URLs into state for previewing (we use the newPhotoUrls for existing URLs too)
    const existingNewUrls: Record<string, string | null> = {
      photo_fase_a_b: res.data.photo_fase_a_b || null,
      photo_fase_a_c: res.data.photo_fase_a_c || null,
      photo_fase_b_c: res.data.photo_fase_b_c || null,
      photo_stringbox_cc: res.data.photo_stringbox_cc || null,
    };
    setNewPhotoUrls(existingNewUrls);
    
    setNewPhotoFiles({
      photo_fase_a_b: null,
      photo_fase_a_c: null,
      photo_fase_b_c: null,
      photo_stringbox_cc: null,
    });
    setMpptList(res.data.mppt_photos || []);
    setObraPhotosUploadedAt(res.data.obra_photos_uploaded_at || {});
  };

  const handleFileChange = (fieldName: PhotoFieldName, file: File | null) => {
    setPhotoFiles(prev => ({ ...prev, [fieldName]: file }));
    if (file) {
      const url = URL.createObjectURL(file);
      setPhotoPreviews(prev => ({ ...prev, [fieldName]: url }));
    } else {
      setPhotoPreviews(prev => ({ ...prev, [fieldName]: null }));
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    setError('');
    setIsSaving(true);

    // Check which required photos are missing (no new file selected and no existing URL)
    const missingPhotos = PHOTO_FIELDS.filter(({ name }) => {
      const hasNewFile = !!photoFiles[name];
      const hasExistingUrl = !!selectedProject[name];
      return !hasNewFile && !hasExistingUrl;
    });

    if (missingPhotos.length > 0 && !pendencies.trim()) {
      setError(
        `Faltam ${missingPhotos.length} foto(s) obrigatória(s). Vá para "Pendências / Obs" e justifique a falta.`
      );
      setActiveTab('pendencies');
      setIsSaving(false);
      return;
    }

    try {
      const photoUrls: Record<string, string> = {};

      // 1. Upload new photos directly to Supabase Storage
      console.log(`Iniciando upload de ${Object.keys(photoFiles).length} fotos para o projeto ${selectedProject.id}...`);
      
      for (const { name, label } of PHOTO_FIELDS) {
        const file = photoFiles[name as PhotoFieldName];
        if (file) {
          console.log(`Fazendo upload: ${label} (${name})...`);
          const fileExt = file.name.split('.').pop();
          const fileName = `${selectedProject.id}/${name}-${Date.now()}.${fileExt}`;
          
          const { data, error: uploadError } = await supabase.storage
            .from('obras-fotos')
            .upload(fileName, file, { upsert: true });

          if (uploadError) {
            console.error(`[UPLOAD ERROR] Falha ao subir ${label}:`, uploadError);
            throw new Error(`Erro crítico no Storage: Não foi possível enviar a foto "${label}". O salvamento foi cancelado para evitar perda de dados.`);
          }

          const { data: publicUrlData } = supabase.storage
            .from('obras-fotos')
            .getPublicUrl(fileName);
          
          photoUrls[name] = publicUrlData.publicUrl;
          console.log(`Upload concluído: ${label}`);
        }
      }
      
      console.log('Todos os uploads concluídos com sucesso. Prosseguindo com o salvamento no banco de dados...');

      // Upload das novas fotos
      const extraUrls: Record<string, string | null> = { ...newPhotoUrls };
      const newUploadsAt = { ...obraPhotosUploadedAt };

      for (const [campo, file] of Object.entries(newPhotoFiles)) {
        if (file) {
          const result = await uploadNewPhoto(campo, file);
          if (result) {
            extraUrls[campo] = result.url;
            newUploadsAt[campo] = result.uploadedAt;
          }
        }
      }

      // MPPTs
      const uploadedMppts = [...mpptList];
      for (let i = 0; i < uploadedMppts.length; i++) {
        if (uploadedMppts[i].file) {
          const result = await uploadNewPhoto(`mppt_${i}`, uploadedMppts[i].file as File);
          if (result) {
            uploadedMppts[i].url = result.url;
            // clean up file object from array before saving to db
            uploadedMppts[i].file = null; 
            newUploadsAt[`mppt_${i}`] = result.uploadedAt;
          }
        }
      }

      // 2. Save metadata and URLs via API
      console.log('Enviando atualização de obra (JSON):', {
        projectId: selectedProject.id,
        pendencies,
        newPhotoCount: Object.keys(photoUrls).length
      });

      const payload = {
        status: 'approved',
        pendencies,
        is_trifasico: isTrifasico,
        mppt_photos: uploadedMppts,
        obra_photos_uploaded_at: newUploadsAt,
        ...extraUrls,
        ...photoUrls
      };

      const response = await api.put(`/api/projects/${selectedProject.id}/installation`, payload);
      console.log('Resposta do servidor:', response.data);

      await sendUpdateNotification('finished', selectedProject?.client_name || 'Cliente');
      setSelectedProject(null);
      setPhotoFiles({} as Record<PhotoFieldName, File | null>);
      setPhotoPreviews({} as Record<PhotoFieldName, string | null>);
      fetchProjects();
      alert('Obra registrada com sucesso!');
    } catch (err: any) {
      console.error('Erro detalhado ao atualizar obra:', err);
      const errorMsg = err.response?.data?.error || err.message;
      setError(`Erro ao atualizar obra: ${typeof errorMsg === 'string' ? errorMsg : 'Erro desconhecido'}. Tente novamente.`);
    } finally {
      setIsSaving(false);
    }
  };

  const PhotoUpload = ({ name, label }: { name: PhotoFieldName; label: string }) => {
    const existingUrl = selectedProject?.[name];
    const previewUrl = photoPreviews[name];
    const displayUrl = previewUrl || existingUrl;
    const hasFile = !!photoFiles[name];

    return (
      <div className={`border rounded-lg p-3 flex flex-col items-center text-center transition-colors ${hasFile ? 'border-green-400 bg-green-50' : existingUrl ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50 hover:bg-white'}`}>
        <p className="text-xs font-bold text-gray-700 mb-2 h-8 flex items-center justify-center">{label}</p>
        <div className="w-full aspect-video bg-gray-200 rounded mb-2 flex items-center justify-center overflow-hidden border border-gray-300 relative group">
          {displayUrl ? (
            <>
              <img src={displayUrl} alt={label} className="w-full h-full object-cover" />
              {hasFile && (
                <div className="absolute top-1 right-1">
                  <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">Nova</span>
                </div>
              )}
            </>
          ) : (
            <Camera className="text-gray-400 w-8 h-8" />
          )}
        </div>

        {existingUrl && !hasFile && (
          <span className="text-xs text-blue-600 font-semibold mb-1 flex items-center gap-1">
            <CheckCircle size={12} /> Foto já enviada
          </span>
        )}

        <label className="cursor-pointer w-full">
          <span className="block w-full text-center text-xs py-1.5 px-2 rounded border border-dashed border-gray-400 text-gray-600 hover:bg-gray-100 transition-colors">
            {displayUrl ? 'Substituir foto' : 'Selecionar foto'}
          </span>
          <input
            type="file"
            className="hidden"
            onChange={e => handleFileChange(name, e.target.files?.[0] ?? null)}
          />
        </label>

        {hasFile && (
          <button
            type="button"
            onClick={() => handleFileChange(name, null)}
            className="mt-1 text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
          >
            <X size={10} /> Remover
          </button>
        )}
      </div>
    );
  };

  const PhotoUploadExtra = ({ name, label, isRequired = false }: { name: string; label: string; isRequired?: boolean }) => {
    const existingUrl = newPhotoUrls[name];
    const hasFile = !!newPhotoFiles[name];
    const file = newPhotoFiles[name];
    const displayUrl = hasFile && file ? URL.createObjectURL(file) : existingUrl;

    return (
      <div className={`border rounded-lg p-3 flex flex-col items-center text-center transition-colors ${hasFile ? 'border-green-400 bg-green-50' : existingUrl ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50 hover:bg-white'}`}>
        <p className="text-xs font-bold text-gray-700 mb-2 h-8 flex items-center justify-center">
          {label} {isRequired && <span className="text-red-500 ml-1">*</span>}
        </p>
        <div className="w-full aspect-video bg-gray-200 rounded mb-2 flex items-center justify-center overflow-hidden border border-gray-300 relative group">
          {displayUrl ? (
            <>
              <img src={displayUrl} alt={label} className="w-full h-full object-cover" />
              {hasFile && (
                <div className="absolute top-1 right-1">
                  <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">Nova</span>
                </div>
              )}
            </>
          ) : (
            <Camera className="text-gray-400 w-8 h-8" />
          )}
        </div>

        {existingUrl && !hasFile && (
          <span className="text-xs text-blue-600 font-semibold mb-1 flex items-center gap-1">
            <CheckCircle size={12} /> Foto já enviada
          </span>
        )}

        <label className="cursor-pointer w-full">
          <span className="block w-full text-center text-xs py-1.5 px-2 rounded border border-dashed border-gray-400 text-gray-600 hover:bg-gray-100 transition-colors">
            {displayUrl ? 'Substituir foto' : 'Selecionar foto'}
          </span>
          <input
            type="file"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0] ?? null;
              setNewPhotoFiles(prev => ({ ...prev, [name]: f }));
            }}
          />
        </label>

        {hasFile && (
          <button
            type="button"
            onClick={() => setNewPhotoFiles(prev => ({ ...prev, [name]: null }))}
            className="mt-1 text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
          >
            <X size={10} /> Remover
          </button>
        )}
      </div>
    );
  };

  const generatePDF = async () => {
    if (!selectedProject) return;

    const hasPendingPhotoFiles = Object.values(photoFiles).some(file => file !== null);
    const hasPendingNewPhotoFiles = Object.values(newPhotoFiles).some(file => file !== null);
    const hasPendingMppt = mpptList.some(mppt => mppt.file !== null);

    if (hasPendingPhotoFiles || hasPendingNewPhotoFiles || hasPendingMppt) {
      alert("Existem fotos pendentes de salvar. Clique em 'Salvar Obra' antes de gerar o relatório.");
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 20;

    doc.addImage('/PNG_-_MT_SOLAR__1_.png', 'PNG', 14, 10, 40, 16);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('RELATÓRIO FINAL DE OBRA', pageWidth / 2, 20, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - 14, 20, { align: 'right' });
    y = 35;
    doc.setDrawColor(200);
    doc.line(14, y, pageWidth - 14, y);
    y += 10;

    doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
    doc.text('Dados do Cliente', 14, y); y += 6;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    doc.text(`Nome: ${selectedProject.client_name || 'N/A'}`, 14, y); y += 5;
    doc.text(`Endereço: ${selectedProject.client_address || ''}, ${selectedProject.client_city || ''} - ${selectedProject.client_state || ''}`, 14, y);
    y += 10;

    doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
    doc.text('Dados do Sistema', 14, y); y += 6;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    doc.text(`Inversor: ${selectedProject.inversor_modelo || 'N/A'} (${selectedProject.inversor_potencia || '-'})`, 14, y); y += 5;
    doc.text(`Módulo: ${selectedProject.modulo_modelo || 'N/A'} (${selectedProject.modulo_potencia || '-'}) - Qtd: ${selectedProject.module_quantity || '-'}`, 14, y); y += 5;
    doc.text(`Estrutura: ${selectedProject.structure_type || 'N/A'}`, 14, y); y += 5;
    doc.text(`Sistema: ${isTrifasico ? 'Trifásico' : 'Monofásico/Bifásico'}`, 14, y);
    y += 10;
    doc.line(14, y, pageWidth - 14, y);
    y += 10;

    doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
    doc.text('Registro Fotográfico', 14, y); y += 10;

    const allPhotos: { label: string; url: string }[] = [];
    PHOTO_FIELDS.forEach(f => { const url = selectedProject[f.name]; if (url) allPhotos.push({ label: f.label, url }); });
    const extraLabels: Record<string, string> = {
      photo_fase_a_b: 'Fase A x Fase B',
      photo_fase_a_c: 'Fase A x Fase C',
      photo_fase_b_c: 'Fase B x Fase C',
      photo_stringbox_cc: 'String Box CC'
    };
    Object.keys(newPhotoUrls).forEach(k => { const url = newPhotoUrls[k]; if (url) allPhotos.push({ label: extraLabels[k] || k, url }); });
    mpptList.forEach(mppt => { if (mppt.url) allPhotos.push({ label: mppt.label, url: mppt.url }); });

    let col = 0;
    const imgWidth = 80;
    const imgHeight = 60;

    const drawFooterAndNewPage = () => {
      doc.setDrawColor(200);
      doc.line(14, pageHeight - 20, pageWidth - 14, pageHeight - 20);
      doc.setFontSize(8);
      doc.text('MT Solar - Todos os direitos reservados', pageWidth / 2, pageHeight - 15, { align: 'center' });
      doc.addPage();
      y = 20;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
      doc.text(`Projeto: ${selectedProject.title}`, 14, y);
      doc.setFont('helvetica', 'normal');
      doc.text(new Date().toLocaleDateString('pt-BR'), pageWidth - 14, y, { align: 'right' });
      y += 10;
      doc.line(14, y, pageWidth - 14, y);
      y += 10;
    };

    for (const photo of allPhotos) {
      if (y + imgHeight + 15 > pageHeight - 25) { drawFooterAndNewPage(); col = 0; }
      const x = col === 0 ? 20 : 110;
      try {
        const response = await fetch(photo.url);
        if (!response.ok) throw new Error('Fetch failed');
        const blob = await response.blob();
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        doc.addImage(base64, 'JPEG', x, y, imgWidth, imgHeight);
      } catch {
        doc.setDrawColor(150); doc.rect(x, y, imgWidth, imgHeight); doc.text('(Imagem não carregou)', x + 5, y + 30);
      }
      doc.setFontSize(9);
      doc.text(photo.label, x + (imgWidth / 2), y + imgHeight + 5, { align: 'center' });
      if (col === 1) { col = 0; y += imgHeight + 15; } else { col = 1; }
    }
    if (col === 1) y += imgHeight + 15;

    if (pendencies) {
      if (y + 40 > pageHeight - 25) drawFooterAndNewPage();
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
      doc.text('Pendências / Observações', 14, y); y += 6;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
      doc.text(doc.splitTextToSize(pendencies, pageWidth - 28), 14, y);
    }

    doc.setDrawColor(200);
    doc.line(14, pageHeight - 20, pageWidth - 14, pageHeight - 20);
    doc.setFontSize(8);
    doc.text('MT Solar - Todos os direitos reservados', pageWidth / 2, pageHeight - 15, { align: 'center' });

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(`Página ${i} de ${pageCount}`, pageWidth - 14, pageHeight - 15, { align: 'right' });
    }

    doc.save(`relatorio-obra-${selectedProject.client_name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Count photos status
  const totalPhotos = PHOTO_FIELDS.length;
  const donePhotos = PHOTO_FIELDS.filter(({ name }) => photoFiles[name] || selectedProject?.[name]).length;
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
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Obra</h1>

      {selectedProject ? (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center bg-gray-50">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Obra: {selectedProject.client_name}</h2>
              <p className="text-sm text-gray-500">{selectedProject.title}</p>
            </div>
            <button onClick={() => setSelectedProject(null)} className="text-gray-500 hover:text-gray-700 font-medium">Voltar</button>
          </div>

          {error && (
            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
              <AlertTriangle size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleUpdate}>
            {/* Tabs Header */}
            <div className="flex border-b">
              <button
                type="button"
                onClick={() => setActiveTab('photos')}
                className={`flex-1 py-4 text-sm font-medium text-center border-b-2 transition-colors ${activeTab === 'photos' ? 'border-blue-900 text-blue-900 bg-blue-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                <span>1. Fotos da Obra</span>
                <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-bold ${donePhotos === totalPhotos ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {donePhotos}/{totalPhotos}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('pendencies')}
                className={`flex-1 py-4 text-sm font-medium text-center border-b-2 transition-colors ${activeTab === 'pendencies' ? 'border-blue-900 text-blue-900 bg-blue-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                <span>2. Pendências / Obs</span>
              </button>
            </div>

            <div className="p-6">
              {/* Section 1: Photos */}
              <div className={activeTab === 'photos' ? 'block' : 'hidden'}>
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6 text-sm text-blue-800">
                  <p className="font-bold flex items-center gap-2"><Camera size={16} /> Fotos Obrigatórias</p>
                  <p>Certifique-se de que todas as fotos estejam nítidas e mostrem claramente os detalhes solicitados.</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {PHOTO_FIELDS.map(({ name, label }) => (
                    <div key={name}>
                      <PhotoUpload name={name as PhotoFieldName} label={label} />
                    </div>
                  ))}
                </div>
                
                <hr className="my-8 border-gray-200" />
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <h3 className="text-sm font-bold text-yellow-800 flex items-center gap-2 mb-2">
                    ⚡ Medições Elétricas Adicionais
                  </h3>
                  <label className="flex items-center gap-2 mb-4 text-sm font-semibold text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={isTrifasico} onChange={e => setIsTrifasico(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" />
                    Sistema Trifásico (CA)
                  </label>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {isTrifasico && (
                      <>
                        <PhotoUploadExtra name="photo_fase_a_b" label="Tensão CA - Fase A x B" />
                        <PhotoUploadExtra name="photo_fase_a_c" label="Tensão CA - Fase A x C" />
                        <PhotoUploadExtra name="photo_fase_b_c" label="Tensão CA - Fase B x C" />
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                  <h3 className="text-sm font-bold text-purple-800 flex items-center gap-2 mb-4">
                    🔌 Medições CC (MPPTs)
                  </h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
                    {mpptList.map((mppt, idx) => {
                      const displayUrl = mppt.file ? URL.createObjectURL(mppt.file) : mppt.url;
                      return (
                        <div key={idx} className="border border-purple-200 bg-white rounded-lg p-3 flex flex-col items-center text-center">
                          <p className="text-xs font-bold text-gray-700 mb-2">{mppt.label}</p>
                          <div className="w-full aspect-video bg-gray-100 rounded mb-2 flex items-center justify-center overflow-hidden border border-gray-200">
                            {displayUrl ? <img src={displayUrl} className="w-full h-full object-cover" /> : <Camera className="text-gray-300 w-8 h-8" />}
                          </div>
                          <label className="cursor-pointer w-full mb-1">
                            <span className="block w-full text-center text-xs py-1 px-2 rounded border border-dashed border-gray-400 text-gray-600 hover:bg-gray-50">Selecionar foto</span>
                            <input type="file" className="hidden" onChange={e => {
                              const f = e.target.files?.[0];
                              if (f) {
                                const list = [...mpptList];
                                list[idx].file = f;
                                setMpptList(list);
                              }
                            }} />
                          </label>
                          <button type="button" onClick={() => setMpptList(prev => prev.filter((_, i) => i !== idx))} className="text-xs text-red-500 hover:text-red-700 mt-1">Remover MPPT</button>
                        </div>
                      )
                    })}
                  </div>
                  
                  <button type="button" onClick={() => setMpptList(prev => [...prev, { label: `MPPT 0${prev.length + 1}`, file: null, url: null }])} className="text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 px-3 py-1.5 rounded font-bold flex items-center gap-1">
                    <Plus size={14} /> Adicionar MPPT
                  </button>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-4">
                    📦 Opcionais Adicionais
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <PhotoUploadExtra name="photo_stringbox_cc" label="String Box CC (Se houver)" />
                  </div>
                </div>

              </div>

              {/* Section 2: Pendencies */}
              <div className={activeTab === 'pendencies' ? 'block' : 'hidden'}>
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-red-700 mb-1">Pendências / Observações</label>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-xs text-red-600 mb-2 font-bold uppercase">Obrigatório caso falte alguma foto</p>
                      <textarea
                        value={pendencies}
                        onChange={e => setPendencies(e.target.value)}
                        className="w-full border border-red-200 bg-white p-2 rounded focus:ring-2 focus:ring-red-500 outline-none"
                        rows={6}
                        placeholder="Descreva as pendências encontradas ou justifique a falta de fotos..."
                      />
                    </div>
                  </div>

                  {/* Summary of photo status */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Camera size={16} /> Resumo das Fotos ({donePhotos}/{totalPhotos} enviadas)
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {PHOTO_FIELDS.map(({ name, label }) => {
                        const done = !!(photoFiles[name] || selectedProject?.[name]);
                        return (
                          <div key={name} className={`flex items-center gap-2 text-xs p-2 rounded ${done ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                            {done ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                            <span className="truncate">{label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* PDF Generation Button */}
                  <div className="mt-6 border-t border-gray-200 pt-6">
                    <button
                      type="button"
                      onClick={generatePDF}
                      disabled={isTrifasico && (!(newPhotoUrls.photo_fase_a_b || newPhotoFiles.photo_fase_a_b) || !(newPhotoUrls.photo_fase_a_c || newPhotoFiles.photo_fase_a_c) || !(newPhotoUrls.photo_fase_b_c || newPhotoFiles.photo_fase_b_c))}
                      className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                      title="Preencha as fotos obrigatórias das Medições Elétricas para liberar o relatório."
                    >
                      <FileText size={18} /> Gerar Relatório Final de Obra (PDF)
                    </button>
                    <p className="text-center text-xs text-gray-500 mt-2">
                      O relatório só fica disponível quando todas as fotos obrigatórias (básicas e medições elétricas) estiverem carregadas ou prontas para envio.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-between items-center">
              <div className="text-xs text-gray-500">
                {activeTab === 'photos' && <span>Passo 1 de 2</span>}
                {activeTab === 'pendencies' && <span>Passo 2 de 2</span>}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('photos')}
                  className={`px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-100 ${activeTab === 'pendencies' ? 'block' : 'hidden'}`}
                >
                  Anterior
                </button>

                <button
                  type="button"
                  onClick={() => { setError(''); setActiveTab('pendencies'); }}
                  className={`px-4 py-2 bg-blue-900 text-white rounded hover:bg-blue-800 ${activeTab === 'photos' ? 'block' : 'hidden'}`}
                >
                  Próximo
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className={`px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-bold shadow-sm flex items-center gap-2 ${activeTab === 'pendencies' ? 'flex' : 'hidden'} ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isSaving ? (
                    <><Loader2 size={18} className="animate-spin" /> Salvando...</>
                  ) : (
                    <><CheckCircle size={18} /> Salvar Obra</>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {projects.length === 0 && (
            <p className="text-gray-500">Nenhum projeto pendente de obra.</p>
          )}
          {projects.map(p => (
            <div key={p.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-800">{p.client_name}</h3>
                <p className="text-sm text-gray-500">{p.title}</p>
                <div className="flex gap-2 mt-2">
                  <span className={`text-xs px-2 py-1 rounded ${p.installation_status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                    {p.installation_status === 'approved' ? 'Obra Concluída' : 'Obra Pendente'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openProject(p)}
                  className="bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-800"
                >
                  {p.installation_status === 'approved' ? 'Ver Detalhes' : 'Registrar Obra'}
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
      )}
    </div>
  );
}
