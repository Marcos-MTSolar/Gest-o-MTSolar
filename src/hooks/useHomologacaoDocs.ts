import { supabase } from '../lib/supabase';
import JSZip from 'jszip';

const BUCKET_NAME = 'homologacao-docs';

// Lista de documentos para homologação
export const DOCS_OBRIGATORIOS = [
  { id: 'rg_cpf', label: 'RG/CPF ou CNH do titular' },
  { id: 'comprovante_endereco', label: 'Comprovante de endereço' },
];

export const DOCS_OPCIONAIS = [
  { id: 'conta_energia', label: 'Conta de energia (últimos 3 meses)' },
  { id: 'iptu', label: 'IPTU ou escritura do imóvel' },
  { id: 'procuracao', label: 'Procuração (se aplicável)' },
];

export async function uploadDocsHomologacao(
  projectId: number,
  clientName: string,
  files: { [docId: string]: File }
): Promise<string> {
  const zip = new JSZip();
  const pasta = `docs_${clientName.replace(/\s+/g, '_')}`;

  for (const [docId, file] of Object.entries(files)) {
    const docLabel = [...DOCS_OBRIGATORIOS, ...DOCS_OPCIONAIS].find(d => d.id === docId)?.label || docId;
    const ext = file.name.split('.').pop();
    zip.file(`${pasta}/${docLabel}.${ext}`, file);
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const filePath = `projeto_${projectId}/${pasta}_homologacao.zip`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, zipBlob, { contentType: 'application/zip', upsert: true });

  if (error) throw new Error(`Erro no upload: ${error.message}`);
  return filePath;
}

export async function uploadIndividualDocs(
  projectId: number,
  userId: string,
  files: { [docId: string]: File }
): Promise<void> {
  const token = localStorage.getItem('token');

  for (const [docId, file] of Object.entries(files)) {
    const docLabel = [...DOCS_OBRIGATORIOS, ...DOCS_OPCIONAIS].find(d => d.id === docId)?.label || docId;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('project_id', String(projectId));
    formData.append('title', docLabel);
    formData.append('type', docId);

    const response = await fetch('/api/documents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`Erro ao enviar documento "${docLabel}": ${err.error || response.statusText}`);
    }
  }
}

export async function deleteDocsHomologacao(filePath: string): Promise<void> {
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([filePath]);
  if (error) throw new Error(`Erro ao deletar: ${error.message}`);
}

export async function getDownloadUrl(filePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(filePath, 3600); // válido por 1h
  if (error || !data) throw new Error('Erro ao gerar URL de download');
  return data.signedUrl;
}
