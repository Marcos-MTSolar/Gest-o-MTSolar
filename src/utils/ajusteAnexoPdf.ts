import jsPDF from 'jspdf';

export type AjusteAnexoItem = {
  id: number;
  document_number?: string | null;
  reference_date?: string | null;
  punch_type?: string | null;
  adjustment_type?: string | null;
  original_timestamp?: string | null;
  requested_timestamp?: string | null;
  new_timestamp?: string | null;
  reason_category?: string | null;
  reason_text?: string | null;
  justification?: string | null;
  requested_ack_at?: string | null;
  requested_by?: number | null;
  requested_by_name?: string | null;
  user_id?: number | null;
  user_name?: string | null;
  reviewed_by_name?: string | null;
  reviewed_at?: string | null;
  review_note?: string | null;
  created_at?: string | null;
  status: string;
  time_records?: { type?: string; timestamp?: string } | null;
  users?: { name?: string } | null;
};

const PUNCH_LABELS: Record<string, string> = {
  entry: 'Entrada',
  lunch_start: 'S. Almoço',
  lunch_end: 'R. Almoço',
  exit: 'Saída',
};

const REASON_LABELS: Record<string, string> = {
  esqueci_de_bater: 'Esqueci de bater',
  falha_aplicativo: 'Falha do aplicativo',
  sem_sinal: 'Sem sinal',
  gps_ou_camera_falhou: 'GPS ou câmera falhou',
  outro: 'Outro',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
};

function fmtDateBR(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const clean = dateStr.split('T')[0];
  const parts = clean.split('-');
  if (parts.length !== 3) return clean;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function fmtTimeRecife(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('pt-BR', {
    timeZone: 'America/Recife',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtDateTimeRecife(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', {
    timeZone: 'America/Recife',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function appendAjustesAnexoToPdf(
  doc: jsPDF,
  params: {
    companyName: string;
    companyCnpj: string;
    periodStr: string;
    userName: string;
    userCpf: string;
    userCargo: string;
    adjustments: AjusteAnexoItem[];
  }
) {
  const { companyName, companyCnpj, periodStr, userName, userCpf, userCargo, adjustments } = params;
  if (!adjustments || adjustments.length === 0) return;

  doc.addPage();

  const drawAnexoHeader = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text(companyName, 14, 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    if (companyCnpj) doc.text(companyCnpj, 14, 18.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('ANEXO – AJUSTES E SOLICITAÇÕES DE REGISTRO DE PONTO', 14, 25);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Período: ${periodStr}`, 196, 14, { align: 'right' });
    doc.text(`Colaborador: ${userName} | CPF: ${userCpf} | Cargo: ${userCargo}`, 14, 30);

    doc.setDrawColor(210, 215, 225);
    doc.setLineWidth(0.2);
    doc.line(14, 32.5, 196, 32.5);
  };

  // Largura total: 182mm (x=14 até x=196)
  const cols = [
    { label: 'Nº', x: 14, w: 26 },
    { label: 'Data', x: 40, w: 14 },
    { label: 'Batida', x: 54, w: 14 },
    { label: 'Reg. orig.', x: 68, w: 13 },
    { label: 'Hor. solic.', x: 81, w: 13 },
    { label: 'Motivo', x: 94, w: 32 },
    { label: 'Solicitação', x: 126, w: 36 },
    { label: 'Situação', x: 162, w: 34 },
  ];

  const drawTableHeader = (yPos: number) => {
    doc.setFillColor(235, 238, 243);
    doc.rect(14, yPos - 4, 182, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(30, 30, 30);
    cols.forEach((c) => {
      doc.text(c.label, c.x + 0.5, yPos);
    });
    return yPos + 4.5;
  };

  drawAnexoHeader();
  let y = drawTableHeader(39);
  const lineH = 3.1;
  const pageBottomLimit = 276;

  adjustments.forEach((adj) => {
    const numStr = adj.document_number || `#${adj.id}`;
    const refDateStr = adj.reference_date
      ? fmtDateBR(adj.reference_date)
      : fmtDateBR(adj.new_timestamp || adj.requested_timestamp);
    const pTypeKey = adj.punch_type || adj.time_records?.type || '';
    const batidaStr = PUNCH_LABELS[pTypeKey] || pTypeKey || '—';
    const origStr = adj.original_timestamp ? fmtTimeRecife(adj.original_timestamp) : 'Inexistente';
    const reqTimeStr = fmtTimeRecife(adj.requested_timestamp || adj.new_timestamp);

    const reasonCat = REASON_LABELS[adj.reason_category || ''] || adj.reason_category || '';
    const reasonDesc = adj.reason_text || adj.justification || '';
    const motivoFull = reasonCat ? `${reasonCat}: ${reasonDesc}` : (reasonDesc || '—');

    const createdAtStr = fmtDateTimeRecife(adj.created_at);
    let solicText: string;
    if (adj.requested_ack_at) {
      solicText = `${fmtDateTimeRecife(adj.requested_ack_at)} – aceite eletrônico registrado`;
    } else if (adj.requested_by_name && adj.requested_by !== adj.user_id) {
      solicText = `${createdAtStr} — registrado por ${adj.requested_by_name} em nome do colaborador`;
    } else {
      solicText = `${createdAtStr} — registrado pelo próprio colaborador (sem aceite eletrônico)`;
    }

    const stLabel = STATUS_LABELS[adj.status] || adj.status;
    let sitText = stLabel;
    if (adj.reviewed_by_name && adj.reviewed_at) {
      sitText += ` — decidido por ${adj.reviewed_by_name} em ${fmtDateTimeRecife(adj.reviewed_at)}`;
    }
    if (adj.review_note) {
      sitText += ` | Obs.: ${adj.review_note}`;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.6);

    const numLines = doc.splitTextToSize(numStr, cols[0].w - 1);
    const dataLines = doc.splitTextToSize(refDateStr, cols[1].w - 1);
    const batidaLines = doc.splitTextToSize(batidaStr, cols[2].w - 1);
    const origLines = doc.splitTextToSize(origStr, cols[3].w - 1);
    const reqLines = doc.splitTextToSize(reqTimeStr, cols[4].w - 1);
    const motivoLines = doc.splitTextToSize(motivoFull, cols[5].w - 1.5);
    const solicLines = doc.splitTextToSize(solicText, cols[6].w - 1.5);
    const sitLines = doc.splitTextToSize(sitText, cols[7].w - 1.5);

    const maxLines = Math.max(
      numLines.length,
      dataLines.length,
      batidaLines.length,
      origLines.length,
      reqLines.length,
      motivoLines.length,
      solicLines.length,
      sitLines.length
    );
    const rowHeight = maxLines * lineH + 2.5;

    if (y + rowHeight > pageBottomLimit) {
      doc.addPage();
      drawAnexoHeader();
      y = drawTableHeader(39);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.6);
    }

    doc.setTextColor(50, 50, 50);
    doc.text(numLines, cols[0].x + 0.5, y);
    doc.text(dataLines, cols[1].x + 0.5, y);
    doc.text(batidaLines, cols[2].x + 0.5, y);
    doc.text(origLines, cols[3].x + 0.5, y);
    doc.text(reqLines, cols[4].x + 0.5, y);
    doc.text(motivoLines, cols[5].x + 0.5, y);
    doc.text(solicLines, cols[6].x + 0.5, y);

    if (adj.status === 'approved') doc.setTextColor(30, 140, 80);
    else if (adj.status === 'rejected') doc.setTextColor(200, 50, 50);
    else doc.setTextColor(180, 110, 20);
    doc.text(sitLines, cols[7].x + 0.5, y);

    doc.setDrawColor(225, 228, 234);
    doc.setLineWidth(0.1);
    doc.line(14, y + rowHeight - 1.8, 196, y + rowHeight - 1.8);

    y += rowHeight;
  });

  // Bloco final: declaração e assinaturas
  const declarationText =
    'Declaro que as informações acima são verdadeiras, que os ajustes decorrem dos motivos descritos e que estou ciente de que os horários ajustados integram meu controle de jornada e o cálculo do meu banco de horas. O responsável da empresa declara que analisou as justificativas e decidiu cada pedido conforme indicado.';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const declLines = doc.splitTextToSize(declarationText, 182);
  const footerBlockHeight = declLines.length * 3.5 + 32;

  if (y + footerBlockHeight > 282) {
    doc.addPage();
    y = 20;
  } else {
    y += 6;
  }

  doc.setTextColor(50, 50, 50);
  doc.text(declLines, 14, y);
  y += declLines.length * 3.5 + 16;

  doc.setDrawColor(80, 80, 80);
  doc.setLineWidth(0.25);

  // Assinatura Colaborador
  doc.line(20, y, 95, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Assinatura do Colaborador', 57.5, y + 4.5, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text(userName, 57.5, y + 8.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text('Data: ____/____/________', 57.5, y + 13, { align: 'center' });

  // Assinatura Responsável
  doc.line(115, y, 190, y);
  doc.text('Assinatura do Responsável – MT Solar', 152.5, y + 4.5, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text(companyName, 152.5, y + 8.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text('Data: ____/____/________', 152.5, y + 13, { align: 'center' });
}
