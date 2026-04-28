import { supabase } from '../lib/supabase';
import JSZip from 'jszip';

// Lista de documentos para homologaÃ§Ã£o
export const DOCS_OBRIGATORIOS = [
  { id: 'rg_cpf', label: 'RG/CPF ou CNH do titular' },
  { id: 'comprovante_endereco', label: 'Comprovante de endereÃ§o' },
];

export const DOCS_OPCIONAIS = [
  { id: 'conta_energia', label: 'Conta de energia (Ãºltimos 3 meses)' },
  { id: 'iptu', label: 'IPTU ou escritura do imÃ³vel' },
  { id: 'procuracao', label: 'ProcuraÃ§Ã£o (se aplicÃ¡vel)' },
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
    .from('homologacao-docs')
    .upload(filePath, zipBlob, { contentType: 'application/zip', upsert: true });

  if (error) throw new Error(`Erro no upload: ${error.message}`);
  return filePath;
}

export async function uploadIndividualDocs(
  projectId: number,
  userId: string,
  files: { [docId: string]: File }
): Promise<void> {
  for (const [docId, file] of Object.entries(files)) {
    const filename = `proj_${projectId}/${Date.now()}_${file.name}`;
    const { data, error: uploadErr } = await supabase.storage
      .from('homologacao-docs')
      .upload(filename, file, { upsert: true });
    
    if (uploadErr) throw uploadErr;

    const { data: { publicUrl } } = supabase.storage.from('homologacao-docs').getPublicUrl(filename);
    const docLabel = [...DOCS_OBRIGATORIOS, ...DOCS_OPCIONAIS].find(d => d.id === docId)?.label || docId;

    await supabase.from('documents').insert({
      project_id: projectId,
      title: docLabel,
      url: publicUrl,
      uploaded_by: userId,
      type: docId
    });
  }
}

export async function deleteDocsHomologacao(filePath: string): Promise<void> {
  const { error } = await supabase.storage
    .from('homologacao-docs')
    .remove([filePath]);
  if (error) throw new Error(`Erro ao deletar: ${error.message}`);
}

export async function getDownloadUrl(filePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('homologacao-docs')
    .createSignedUrl(filePath, 3600); // vÃ¡lido por 1h
  if (error || !data) throw new Error('Erro ao gerar URL de download');
  return data.signedUrl;
}
