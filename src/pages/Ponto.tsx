import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

import { Geolocation } from '@capacitor/geolocation';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import jsPDF from 'jspdf';
import { supabase } from '../lib/supabase';
import { Trash2, MapPin } from 'lucide-react';



type TimeRecord = {
  id: number;
  type: 'entry' | 'lunch_start' | 'lunch_end' | 'exit';
  timestamp: string;
  latitude: number | null;
  longitude: number | null;
  selfie_url: string | null;
  status: 'pending' | 'approved' | 'adjustment_requested';
};

type WorkSchedule = {
  id: number;
  role: string;
  entry_time: string;
  lunch_start: string;
  lunch_end: string;
  exit_time: string;
};

type TimeAdjustment = {
  id: number;
  time_record_id: number;
  justification: string;
  new_timestamp: string;
  status: string;
  created_at: string;
  users: { name: string; role: string };
  time_records: TimeRecord;
};

const TYPE_LABELS: Record<string, string> = {
  entry: 'Entrada',
  lunch_start: 'Saída Almoço',
  lunch_end: 'Retorno Almoço',
  exit: 'Saída',
};

const ROLE_LABELS: Record<string, string> = {
  CEO: 'CEO',
  ADMIN: 'Administrador',
  COMMERCIAL: 'Vendedor',
  TECHNICAL: 'Técnico',
};

const TYPE_ORDER = ['entry', 'lunch_start', 'lunch_end', 'exit'];

function getNextPunchType(todayRecords: TimeRecord[]): string | null {
  const done = todayRecords.map((r) => r.type);
  for (const t of TYPE_ORDER) {
    if (!done.includes(t as any)) return t;
  }
  return null;
}

function groupByDay(records: TimeRecord[]): Record<string, TimeRecord[]> {
  return (records ?? []).reduce((acc, r) => {
    const day = r.timestamp.slice(0, 10);
    if (!acc[day]) acc[day] = [];
    acc[day].push(r);
    return acc;
  }, {} as Record<string, TimeRecord[]>);
}

function calcDayHours(records: TimeRecord[]): number {
  const sorted = [...(records ?? [])].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const byType: Record<string, Date> = {};
  sorted.forEach((r) => {
    byType[r.type] = new Date(r.timestamp);
  });

  let total = 0;
  if (byType['entry'] && byType['lunch_start']) {
    total += (byType['lunch_start'].getTime() - byType['entry'].getTime()) / 3600000;
  }
  if (byType['lunch_end'] && byType['exit']) {
    total += (byType['exit'].getTime() - byType['lunch_end'].getTime()) / 3600000;
  }
  if (byType['entry'] && byType['exit'] && !byType['lunch_start']) {
    total = (byType['exit'].getTime() - byType['entry'].getTime()) / 3600000;
  }
  return total;
}

const capturarLocalizacao = async (): Promise<{ latitude: number; longitude: number } | null> => {
  try {
    const permissao = await Geolocation.requestPermissions();
    if (permissao.location !== 'granted') {
      console.warn('Permissão de localização negada');
      return null;
    }
    const posicao = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
    });
    return {
      latitude: posicao.coords.latitude,
      longitude: posicao.coords.longitude,
    };
  } catch (err) {
    console.error('Erro ao capturar localização:', err);
    return null;
  }
};

// ─── Componente de exibição de endereço via geocodificação reversa ───────────
type AddressDisplayProps = {
  latitude: number | null;
  longitude: number | null;
  cache: Record<string, string>;
  onAddressFetched: (key: string, address: string) => void;
};

function AddressDisplay({ latitude, longitude, cache, onAddressFetched }: AddressDisplayProps) {
  const [localAddress, setLocalAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const key =
    latitude !== null && longitude !== null ? `${latitude},${longitude}` : null;

  useEffect(() => {
    if (!key) return;
    // Verificar cache do componente pai
    if (cache[key] !== undefined) {
      setLocalAddress(cache[key]);
      return;
    }
    // Buscar endereço na API Nominatim
    setLoading(true);
    fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
      { headers: { 'Accept-Language': 'pt-BR' } }
    )
      .then((res) => res.json())
      .then((data) => {
        const addr: string = data.display_name ?? '';
        setLocalAddress(addr);
        onAddressFetched(key, addr);
      })
      .catch(() => {
        setLocalAddress('');
        onAddressFetched(key, '');
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!key) {
    return (
      <span className="block text-xs text-gray-400 mt-0.5">
        Sem localização registrada
      </span>
    );
  }

  const addr = localAddress ?? cache[key] ?? '';

  if (loading) {
    return (
      <span className="block text-xs text-gray-400 mt-0.5">Carregando...</span>
    );
  }

  if (!addr) {
    return (
      <span className="block text-xs text-gray-400 mt-0.5">
        Sem localização registrada
      </span>
    );
  }

  const truncated = addr.length > 60 ? addr.slice(0, 60) + '…' : addr;
  return (
    <span className="block text-xs text-gray-500 mt-0.5" title={addr}>
      {truncated}
    </span>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export default function Ponto() {

  const { user } = useAuth();
  const isManager = ['CEO', 'ADMIN'].includes(user?.role ?? '');

  const [searchParams] = useSearchParams();
  const userIdParam = searchParams.get('userId');


  const [records, setRecords] = useState<TimeRecord[]>([]);
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  // Cache de endereços: chave = "lat,lon", valor = display_name truncado
  const [geocodeCache, setGeocodeCache] = useState<Record<string, string>>({});
  const handleAddressFetched = (key: string, address: string) =>
    setGeocodeCache((prev) => ({ ...prev, [key]: address }));
  const [loading, setLoading] = useState(false);
  const [punching, setPunching] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<'ponto' | 'historico' | 'gestor' | 'ajustes' | 'fotos'>('ponto');

  // Gestor
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [reportRecords, setReportRecords] = useState<TimeRecord[]>([]);
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${day}`;
  });
  const [companyInfo, setCompanyInfo] = useState<{ name: string; cnpj?: string | null } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingRecords, setDeletingRecords] = useState(false);
  const [fotoUserId, setFotoUserId] = useState('');
  const [fotoData, setFotoData] = useState('');
  const [fotoRecords, setFotoRecords] = useState<any[]>([]);
  const [fotoLoading, setFotoLoading] = useState(false);
  const [fotoModalUrl, setFotoModalUrl] = useState<string | null>(null);


  useEffect(() => {
    async function fetchCompanyInfo() {
      if (user?.company_id) {
        try {
          const { data } = await supabase
            .from('companies')
            .select('name, cnpj')
            .eq('id', user.company_id)
            .maybeSingle();

          if (data) {
            setCompanyInfo(data);
          } else {
            const { data: fallbackData } = await supabase
              .from('companies')
              .select('name')
              .eq('id', user.company_id)
              .maybeSingle();
            if (fallbackData) {
              setCompanyInfo({ name: fallbackData.name });
            }
          }
        } catch (err) {
          console.error('Error fetching company info:', err);
        }
      }
    }
    fetchCompanyInfo();
  }, [user?.company_id]);

  // Ajuste
  const [adjustments, setAdjustments] = useState<TimeAdjustment[]>([]);
  const [adjustingRecord, setAdjustingRecord] = useState<TimeRecord | null>(null);
  const [adjustJustification, setAdjustJustification] = useState('');
  const [adjustNewTime, setAdjustNewTime] = useState('');

  // Schedules editor
  const [editSchedule, setEditSchedule] = useState<WorkSchedule | null>(null);

  useEffect(() => {
    fetchSchedules();
    fetchHistory();
    if (isManager) {
      fetchAllUsers();
      fetchPendingAdjustments();
    }
  }, []);

  useEffect(() => {
    if (userIdParam && isManager) {
      const uId = Number(userIdParam);
      setSelectedUser(uId);
      setActiveTab('gestor');
      fetchReport(uId);
    }
  }, [userIdParam, isManager]);


  async function fetchSchedules() {
    try {
      const res = await api.get('/api/ponto/schedules');
      setSchedules(res.data ?? []);
    } catch {
      setSchedules([]);
    }
  }

  const fetchFotosVerificacao = async () => {
    if (!fotoUserId || !fotoData) return;
    setFotoLoading(true);
    try {
      const res = await api.get(`/api/ponto/fotos-verificacao?userId=${fotoUserId}&data=${fotoData}`);
      setFotoRecords(res.data ?? []);
    } catch {
      setFotoRecords([]);
    } finally {
      setFotoLoading(false);
    }
  };

  async function fetchHistory() {
    try {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
      const res = await api.get(`/api/ponto/historico?start=${start}&end=${end}`);
      setRecords(res.data ?? []);
    } catch {
      setRecords([]);
    }
  }

  async function fetchAllUsers() {
    try {
      const res = await api.get('/api/users');
      setAllUsers(res.data ?? []);
    } catch {
      setAllUsers([]);
    }
  }


  async function fetchPendingAdjustments() {
    try {
      const res = await api.get('/api/ponto/ajustes');
      setAdjustments(res.data ?? []);
    } catch {
      setAdjustments([]);
    }
  }

  async function fetchReport(userId: number) {
    if (!userId || !startDate || !endDate) {
      setReportRecords([]);
      return;
    }
    try {
      setLoading(true);
      const start = startDate;
      const end = `${endDate} 23:59:59`;
      const res = await api.get(`/api/ponto/relatorio/${userId}?start=${start}&end=${end}`);
      setReportRecords(res.data ?? []);
    } catch (err) {
      console.error(err);
      setReportRecords([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteAllRecords() {
    if (!selectedUser) return;
    try {
      setDeletingRecords(true);
      await api.delete(`/api/ponto/usuario/${selectedUser}/registros`);
      
      setReportRecords([]);
      setMessage({ text: 'Registros excluídos com sucesso.', type: 'success' });
      setTimeout(() => setMessage(null), 5000);
      
      setShowDeleteModal(false);
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Erro ao excluir registros.';
      setMessage({ text: errMsg, type: 'error' });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setDeletingRecords(false);
    }
  }


  async function handlePunch() {
    try {
      setPunching(true);
      setMessage(null);

      const photo = await Camera.getPhoto({
        quality: 60,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        width: 640,
      });

      const localizacao = await capturarLocalizacao();
      const latitude = localizacao ? localizacao.latitude : null;
      const longitude = localizacao ? localizacao.longitude : null;

      if (!localizacao) {
        setMessage({ text: 'Localização não capturada. O ponto será registrado sem geolocalização.', type: 'error' });
      }

      const todayStr = new Date().toISOString().slice(0, 10);
      const todayRecords = records.filter((r) => r.timestamp.slice(0, 10) === todayStr);
      const type = getNextPunchType(todayRecords);

      if (!type) {
        setMessage({ text: 'Todas as batidas do dia já foram registradas.', type: 'error' });
        return;
      }

      await api.post('/api/ponto/registrar', {
        type,
        latitude,
        longitude,
        selfie_base64: `data:image/jpeg;base64,${photo.base64String}`,
      });

      if (localizacao) {
        setMessage({ text: `${TYPE_LABELS[type]} registrada com sucesso!`, type: 'success' });
      }
      fetchHistory();
    } catch (err: any) {
      setMessage({ text: err?.response?.data?.error ?? 'Erro ao registrar ponto.', type: 'error' });
    } finally {
      setPunching(false);
    }
  }

  async function handleRequestAdjust() {
    if (!adjustingRecord || !adjustJustification || !adjustNewTime) return;
    try {
      await api.post('/api/ponto/ajuste', {
        time_record_id: adjustingRecord.id,
        justification: adjustJustification,
        new_timestamp: new Date(adjustNewTime).toISOString(),
      });
      setMessage({ text: 'Solicitação de ajuste enviada.', type: 'success' });
      setAdjustingRecord(null);
      setAdjustJustification('');
      setAdjustNewTime('');
      fetchHistory();
    } catch {
      setMessage({ text: 'Erro ao solicitar ajuste.', type: 'error' });
    }
  }

  async function handleReviewAdjust(id: number, status: 'approved' | 'rejected') {
    try {
      await api.put(`/api/ponto/ajuste/${id}`, { status });
      fetchPendingAdjustments();
      if (selectedUser) fetchReport(selectedUser);
    } catch {}
  }

  async function handleSaveSchedule() {
    if (!editSchedule) return;
    try {
      await api.put('/api/ponto/schedules', editSchedule);
      setMessage({ text: 'Horário salvo com sucesso.', type: 'success' });
      setEditSchedule(null);
      fetchSchedules();
    } catch {
      setMessage({ text: 'Erro ao salvar horário.', type: 'error' });
    }
  }

  function formatDate(dateStr: string) {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  }

  function generatePDF() {
    if (!(reportRecords ?? []).length) return;
    const doc = new jsPDF();
    const colab = (allUsers ?? []).find((u) => u.id === selectedUser);
    const userName = colab?.name ?? 'Funcionário';
    const userRole = colab?.role ?? '';
    const userCpf = colab?.cpf ?? '—';
    const userCargo = colab?.cargo ?? userRole;
    
    let userAdmissao = '—';
    if (colab?.data_admissao) {
      const clean = colab.data_admissao.split('T')[0];
      const parts = clean.split('-');
      if (parts.length === 3) {
        userAdmissao = `${parts[2]}/${parts[1]}/${parts[0]}`;
      } else {
        userAdmissao = colab.data_admissao;
      }
    }
    
    // Período formatado
    const periodStr = `${formatDate(startDate)} a ${formatDate(endDate)}`;

    // Nome e CNPJ da empresa
    const companyName = companyInfo?.name ?? 'MT Solar';
    const companyCnpj = companyInfo?.cnpj ? `CNPJ: ${companyInfo.cnpj}` : '';

    // Cabeçalho do PDF
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(companyName, 14, 20);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    if (companyCnpj) {
      doc.text(companyCnpj, 14, 26);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('ESPELHO DE PONTO', 196, 20, { align: 'right' });
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Período: ${periodStr}`, 196, 26, { align: 'right' });

    // Informações do Colaborador
    doc.setFont('helvetica', 'bold');
    doc.text('Colaborador:', 14, 35);
    doc.setFont('helvetica', 'normal');
    doc.text(userName, 42, 35);

    doc.setFont('helvetica', 'bold');
    doc.text('CPF:', 120, 35);
    doc.setFont('helvetica', 'normal');
    doc.text(userCpf, 131, 35);

    doc.setFont('helvetica', 'bold');
    doc.text('Cargo:', 14, 41);
    doc.setFont('helvetica', 'normal');
    const roleTranslated = ROLE_LABELS[userCargo] || userCargo;
    doc.text(roleTranslated, 28, 41);

    doc.setFont('helvetica', 'bold');
    doc.text('Admissão:', 120, 41);
    doc.setFont('helvetica', 'normal');
    doc.text(userAdmissao, 142, 41);

    doc.text(`Emitido em: ${new Date().toLocaleDateString('pt-BR')}`, 196, 47, { align: 'right' });

    // Quadro de horários de expediente esperado
    const colabSchedule = (schedules ?? []).find((s) => s.role === userRole);
    const scheduleStr = colabSchedule
      ? `Entrada: ${colabSchedule.entry_time} | Almoço: ${colabSchedule.lunch_start} às ${colabSchedule.lunch_end} | Saída: ${colabSchedule.exit_time}`
      : 'Horário esperado: Não configurado';

    doc.setFillColor(245, 247, 250);
    doc.rect(14, 50, 182, 12, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('Expediente Esperado:', 18, 57);
    doc.setFont('helvetica', 'normal');
    doc.text(scheduleStr, 60, 57);

    // Tabela de registros diários
    let y = 74;
    doc.setFillColor(235, 238, 243);
    doc.rect(14, y - 6, 182, 8, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('DIA/MÊS', 14, y - 1);
    doc.text('DIA SEMANA', 29, y - 1);
    doc.text('ENTRADA', 54, y - 1);
    doc.text('SAÍDA ALM.', 72, y - 1);
    doc.text('RETORNO', 92, y - 1);
    doc.text('SAÍDA', 112, y - 1);
    doc.text('TOTAL', 130, y - 1);
    doc.text('OBSERVAÇÕES', 152, y - 1);

    doc.setFont('helvetica', 'normal');
    y += 7;

    const grouped = groupByDay(reportRecords ?? []);
    let totalHours = 0;

    Object.entries(grouped).sort().forEach(([day, recs]) => {
      const byType: Record<string, string> = {};
      (recs ?? []).forEach((r) => {
        byType[r.type] = new Date(r.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      });
      
      const hours = calcDayHours(recs);
      totalHours += hours;

      const dateParts = day.split('-');
      const dateObj = new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]), 12, 0, 0);
      const daysOfWeek = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
      const dayOfWeekName = daysOfWeek[dateObj.getDay()];
      const dateStr = `${dateParts[2]}/${dateParts[1]}`;

      const hasMissingLocation = (recs ?? []).some((r) => r.latitude === null || r.longitude === null);
      const obs = hasMissingLocation ? 'Sem localização registrada' : 'Localização registrada';

      doc.text(dateStr, 14, y);
      doc.text(dayOfWeekName, 29, y);
      doc.text(byType['entry'] ?? '-', 54, y);
      doc.text(byType['lunch_start'] ?? '-', 72, y);
      doc.text(byType['lunch_end'] ?? '-', 92, y);
      doc.text(byType['exit'] ?? '-', 112, y);
      doc.text(hours > 0 ? `${hours.toFixed(1)}h` : '-', 130, y);
      doc.text(obs, 152, y);

      // Linha separadora
      doc.setDrawColor(220, 224, 230);
      doc.setLineWidth(0.1);
      doc.line(14, y + 2, 196, y + 2);

      y += 7;

      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });

    y += 5;
    if (y > 250) {
      doc.addPage();
      y = 30;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`Total de horas trabalhadas no período: ${totalHours.toFixed(1)}h`, 14, y);

    y += 25;
    if (y > 265) {
      doc.addPage();
      y = 35;
    }

    doc.setFont('helvetica', 'normal');
    doc.line(55, y, 155, y);
    y += 5;
    doc.text('Assinatura do Colaborador', 105, y, { align: 'center' });
    y += 5;
    doc.text(userName, 105, y, { align: 'center' });

    doc.save(`ponto-${userName.replace(/\s/g, '-')}-${startDate}-a-${endDate}.pdf`);
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRecords = (records ?? []).filter((r) => r.timestamp.slice(0, 10) === todayStr);
  const nextType = getNextPunchType(todayRecords);
  const mySchedule = (schedules ?? []).find((s) => s.role === user?.role);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Ponto Eletrônico</h1>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {[
          { key: 'ponto', label: 'Bater Ponto' },
          { key: 'historico', label: 'Meu Histórico' },
          ...(isManager ? [
            { key: 'gestor', label: 'Relatórios' },
            { key: 'ajustes', label: 'Ajustes Pendentes' },
            { key: 'fotos', label: 'Verificar Fotos' },
          ] : []),
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB: BATER PONTO */}
      {activeTab === 'ponto' && (
        <div className="space-y-6">
          {mySchedule && (
            <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800">
              <p className="font-semibold mb-1">Seu horário de trabalho:</p>
              <p>Entrada: {mySchedule.entry_time} | Almoço: {mySchedule.lunch_start}–{mySchedule.lunch_end} | Saída: {mySchedule.exit_time}</p>
            </div>
          )}

          <div className="bg-white rounded-xl shadow p-6 text-center">
            <p className="text-gray-500 text-sm mb-1">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p>
            <p className="text-4xl font-bold text-gray-800 mb-4">{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>

            {nextType ? (
              <button
                onClick={handlePunch}
                disabled={punching}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-4 px-10 rounded-2xl text-lg transition-all shadow-md"
              >
                {punching ? 'Registrando...' : `Registrar ${TYPE_LABELS[nextType]}`}
              </button>
            ) : (
              <div className="text-green-600 font-semibold text-lg">✅ Todas as batidas do dia registradas!</div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <p className="font-semibold text-gray-700 mb-3">Registros de hoje</p>
            {(todayRecords ?? []).length === 0 ? (
              <p className="text-gray-400 text-sm">Nenhuma batida hoje.</p>
            ) : (
              <div className="space-y-2">
                {TYPE_ORDER.map((t) => {
                  const rec = (todayRecords ?? []).find((r) => r.type === t);
                  return (
                    <div key={t} className="flex justify-between items-center text-sm py-2 border-b border-gray-100 last:border-0">
                      <span className="text-gray-600">{TYPE_LABELS[t]}</span>
                      {rec ? (
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-gray-800">
                            {new Date(rec.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <button
                            onClick={() => { setAdjustingRecord(rec); setActiveTab('historico'); }}
                            className="text-xs text-orange-500 hover:underline"
                          >
                            Solicitar ajuste
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: MEU HISTÓRICO */}
      {activeTab === 'historico' && (
        <div className="space-y-4">
          {adjustingRecord && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-3">
              <p className="font-semibold text-orange-800">Solicitar ajuste: {TYPE_LABELS[adjustingRecord.type]}</p>
              <p className="text-sm text-orange-600">Horário atual: {new Date(adjustingRecord.timestamp).toLocaleString('pt-BR')}</p>
              <input
                type="datetime-local"
                value={adjustNewTime}
                onChange={(e) => setAdjustNewTime(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
              <textarea
                placeholder="Justificativa obrigatória..."
                value={adjustJustification}
                onChange={(e) => setAdjustJustification(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm min-h-[80px]"
              />
              <div className="flex gap-2">
                <button onClick={handleRequestAdjust} className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium">Enviar solicitação</button>
                <button onClick={() => setAdjustingRecord(null)} className="text-gray-500 px-4 py-2 rounded-lg text-sm border">Cancelar</button>
              </div>
            </div>
          )}

          {Object.entries(groupByDay(records ?? [])).sort().reverse().map(([day, recs]) => {
            const hours = calcDayHours(recs ?? []);
            return (
              <div key={day} className="bg-white rounded-xl shadow p-4">
                <div className="flex justify-between items-center mb-3">
                  <p className="font-semibold text-gray-700">
                    {new Date(day + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                  </p>
                  {hours > 0 && <span className="text-sm text-blue-600 font-medium">{hours.toFixed(1)}h</span>}
                </div>
                <div className="space-y-1">
                  {TYPE_ORDER.map((t) => {
                    const rec = (recs ?? []).find((r) => r.type === t);
                    return (
                      <div key={t} className="flex justify-between text-sm py-1">
                        <span className="text-gray-500">{TYPE_LABELS[t]}</span>
                        {rec ? (
                          <div className="flex items-start gap-2">
                            {rec.latitude !== null && rec.longitude !== null ? (
                              <a
                                href={`https://www.google.com/maps?q=${rec.latitude},${rec.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-500 hover:text-green-600 inline-flex items-center mt-0.5"
                                title="Ver localização no mapa"
                              >
                                <MapPin size={16} />
                              </a>
                            ) : (
                              <span className="text-gray-400 inline-flex items-center mt-0.5" title="Sem geolocalização">
                                <MapPin size={16} />
                              </span>
                            )}
                            <div className="flex flex-col">
                              <span className={`font-medium ${rec.status === 'adjustment_requested' ? 'text-orange-500' : 'text-gray-800'}`}>
                                {new Date(rec.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                {rec.status === 'adjustment_requested' && ' (ajuste pendente)'}
                              </span>
                              <AddressDisplay
                                latitude={rec.latitude}
                                longitude={rec.longitude}
                                cache={geocodeCache}
                                onAddressFetched={handleAddressFetched}
                              />
                            </div>
                            {rec.status !== 'adjustment_requested' && (
                              <button
                                onClick={() => setAdjustingRecord(rec)}
                                className="text-xs text-orange-400 hover:underline mt-0.5"
                              >
                                Ajustar
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {(records ?? []).length === 0 && (
            <p className="text-center text-gray-400 py-8">Nenhum registro este mês.</p>
          )}
        </div>
      )}

      {/* TAB: RELATÓRIOS (GESTOR) */}
      {activeTab === 'gestor' && isManager && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow p-4 space-y-4">
            <p className="font-semibold text-gray-700">Gerar Relatório por Período</p>
            <div className="flex gap-3 flex-wrap items-end">
              <div className="flex-1 min-w-[180px]">
                <label className="block text-xs text-gray-500 mb-1">Funcionário</label>
                <select
                  value={selectedUser ?? ''}
                  onChange={(e) => setSelectedUser(Number(e.target.value))}
                  className="border rounded-lg px-3 py-2 text-sm w-full"
                >
                  <option value="">Selecione o funcionário</option>
                  {(allUsers ?? []).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role === 'ADMIN' ? 'Administrador' : u.role === 'COMMERCIAL' ? 'Vendedor' : u.role === 'TECHNICAL' ? 'Técnico' : u.role}){!u.active ? ' (Inativo)' : ''}
                    </option>
                  ))}

                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Data Inicial</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Data Final</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <button
                onClick={() => selectedUser && fetchReport(selectedUser)}
                disabled={!selectedUser || loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {loading ? 'Carregando...' : 'Carregar'}
              </button>
              {user?.role === 'CEO' && selectedUser && (
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  disabled={loading || deletingRecords}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  <Trash2 size={16} /> Excluir todos os registros
                </button>
              )}
            </div>

            {/* Configurar horários */}
            <div className="border-t pt-4">
              <p className="font-semibold text-gray-700 mb-3">Horários por Função</p>
              <div className="space-y-2">
                {['CEO', 'ADMIN', 'COMMERCIAL', 'TECHNICAL'].map((role) => {
                  const s = schedules.find((sc) => sc.role === role);
                  return (
                    <div key={role} className="flex justify-between items-center text-sm py-2 border-b border-gray-100">
                      <span className="text-gray-600 font-medium w-28">{role}</span>
                      <span className="text-gray-500 flex-1">
                        {s ? `${s.entry_time} → ${s.lunch_start}–${s.lunch_end} → ${s.exit_time}` : 'Não configurado'}
                      </span>
                      <button
                        onClick={() => setEditSchedule(s ?? { id: 0, role, entry_time: '08:00', lunch_start: '12:00', lunch_end: '13:00', exit_time: '17:00' })}
                        className="text-blue-500 text-xs hover:underline ml-2"
                      >
                        Editar
                      </button>
                    </div>
                  );
                })}
              </div>

              {editSchedule && (
                <div className="mt-4 bg-blue-50 rounded-xl p-4 space-y-3">
                  <p className="font-semibold text-blue-800">Editando horário: {editSchedule.role}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'entry_time', label: 'Entrada' },
                      { key: 'lunch_start', label: 'Saída Almoço' },
                      { key: 'lunch_end', label: 'Retorno Almoço' },
                      { key: 'exit_time', label: 'Saída' },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <label className="text-xs text-blue-700">{label}</label>
                        <input
                          type="time"
                          value={(editSchedule as any)[key]}
                          onChange={(e) => setEditSchedule({ ...editSchedule, [key]: e.target.value })}
                          className="w-full border rounded-lg px-2 py-1 text-sm mt-1"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSaveSchedule} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Salvar</button>
                    <button onClick={() => setEditSchedule(null)} className="border px-4 py-2 rounded-lg text-sm text-gray-600">Cancelar</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {(reportRecords ?? []).length > 0 && (
            <div className="bg-white rounded-xl shadow p-4">
              <div className="flex justify-between items-center mb-4">
                <p className="font-semibold text-gray-700">
                  Resultado — {(allUsers ?? []).find((u) => u.id === selectedUser)?.name}
                </p>
                <button
                  onClick={generatePDF}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
                >
                  Baixar PDF
                </button>
              </div>

              {Object.entries(groupByDay(reportRecords ?? [])).sort().map(([day, recs]) => {
                const hours = calcDayHours(recs ?? []);
                return (
                  <div key={day} className="flex justify-between items-center py-2 border-b border-gray-100 text-sm">
                    <span className="text-gray-600 w-32">
                      {new Date(day + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </span>
                    <div className="flex gap-4 flex-wrap text-gray-500">
                      {TYPE_ORDER.map((t) => {
                        const rec = (recs ?? []).find((r) => r.type === t);
                        return (
                          <span key={t} className="flex items-start gap-1">
                            {TYPE_LABELS[t].split(' ')[0]}: {rec ? (
                              <>
                                <div className="flex flex-col">
                                  <span>{new Date(rec.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                  <AddressDisplay
                                    latitude={rec.latitude}
                                    longitude={rec.longitude}
                                    cache={geocodeCache}
                                    onAddressFetched={handleAddressFetched}
                                  />
                                </div>
                                {rec.latitude !== null && rec.longitude !== null ? (
                                  <a
                                    href={`https://www.google.com/maps?q=${rec.latitude},${rec.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-green-500 hover:text-green-600 inline-flex items-center"
                                    title="Ver localização no mapa"
                                  >
                                    <MapPin size={14} />
                                  </a>
                                ) : (
                                  <span className="text-gray-400 inline-flex items-center" title="Sem geolocalização">
                                    <MapPin size={14} />
                                  </span>
                                )}
                              </>
                            ) : (
                              '—'
                            )}
                          </span>
                        );
                      })}
                    </div>
                    <span className="font-medium text-blue-600 w-12 text-right">{hours > 0 ? `${hours.toFixed(1)}h` : '—'}</span>
                  </div>
                );
              })}

              <div className="pt-3 text-right font-bold text-gray-800">
                Total: {Object.values(groupByDay(reportRecords ?? [])).reduce((sum, recs) => sum + calcDayHours(recs ?? []), 0).toFixed(1)}h
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: AJUSTES PENDENTES (GESTOR) */}
      {activeTab === 'ajustes' && isManager && (
        <div className="space-y-4">
          {(adjustments ?? []).length === 0 ? (
            <p className="text-center text-gray-400 py-8">Nenhum ajuste pendente.</p>
          ) : (
            (adjustments ?? []).map((adj) => (
              <div key={adj.id} className="bg-white rounded-xl shadow p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-gray-800">{adj.users?.name}</p>
                    <p className="text-sm text-gray-500">
                      Batida: {TYPE_LABELS[adj.time_records?.type ?? '']} em{' '}
                      {new Date(adj.time_records?.timestamp).toLocaleString('pt-BR')}
                    </p>
                    <p className="text-sm text-gray-500">
                      Novo horário: {new Date(adj.new_timestamp).toLocaleString('pt-BR')}
                    </p>
                    <p className="text-sm text-gray-700 mt-1">Justificativa: {adj.justification}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleReviewAdjust(adj.id, 'approved')}
                    className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
                  >
                    Aprovar
                  </button>
                  <button
                    onClick={() => handleReviewAdjust(adj.id, 'rejected')}
                    className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
                  >
                    Rejeitar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB: VERIFICAR FOTOS (GESTOR) */}
      {activeTab === 'fotos' && isManager && (
        <div className="space-y-6">
          {/* Filtros */}
          <div className="bg-white rounded-xl shadow p-4">
            <p className="font-semibold text-gray-700 mb-4">Verificar Registros de Ponto com Foto</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={fotoUserId}
                onChange={e => setFotoUserId(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Selecione o colaborador</option>
                {allUsers.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              <input
                type="date"
                value={fotoData}
                onChange={e => setFotoData(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <button
                onClick={fetchFotosVerificacao}
                disabled={!fotoUserId || !fotoData || fotoLoading}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-40"
              >
                {fotoLoading ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
          </div>

          {/* Linha do tempo */}
          {fotoRecords.length === 0 && !fotoLoading && (
            <p className="text-center text-gray-400 italic text-sm py-8">
              Nenhum registro encontrado para o filtro selecionado.
            </p>
          )}

          {fotoRecords.length > 0 && (
            <div className="bg-white rounded-xl shadow p-4 space-y-4">
              {fotoRecords.map((rec) => {
                const tipoLabel: Record<string, string> = {
                  entry: '🟢 Entrada',
                  lunch_start: '🟡 Início Almoço',
                  lunch_end: '🔵 Fim Almoço',
                  exit: '🔴 Saída',
                };
                const horario = new Date(rec.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                const temLocalizacao = rec.latitude && rec.longitude;
                const mapsUrl = `https://www.google.com/maps?q=${rec.latitude},${rec.longitude}`;

                return (
                  <div key={rec.id} className="flex gap-4 items-start border-b border-gray-100 pb-4 last:border-0">
                    {/* Linha do tempo — indicador */}
                    <div className="flex flex-col items-center pt-1">
                      <div className="w-3 h-3 rounded-full bg-blue-500 mt-1" />
                      <div className="w-0.5 flex-1 bg-gray-200 mt-1" />
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-gray-800 text-sm">
                          {tipoLabel[rec.type] || rec.type}
                        </span>
                        <span className="text-gray-500 text-sm">{horario}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          rec.status === 'approved' ? 'bg-green-100 text-green-700'
                          : rec.status === 'adjustment_requested' ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-500'
                        }`}>
                          {rec.status === 'approved' ? 'Aprovado' : rec.status === 'adjustment_requested' ? 'Ajuste solicitado' : 'Pendente'}
                        </span>
                        {temLocalizacao ? (
                          <a href={mapsUrl} target="_blank" rel="noreferrer" title="Ver no mapa" className="text-green-600 hover:text-green-800">
                            📍
                          </a>
                        ) : (
                          <span className="text-gray-300" title="Sem localização">📍</span>
                        )}
                      </div>

                      {/* Foto */}
                      {rec.selfie_url ? (
                        <img
                          src={rec.selfie_url}
                          alt="Selfie do ponto"
                          className="w-28 h-28 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setFotoModalUrl(rec.selfie_url)}
                        />
                      ) : (
                        <p className="text-xs text-gray-400 italic">Foto não disponível</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal de foto ampliada */}
      {fotoModalUrl && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setFotoModalUrl(null)}
        >
          <div className="relative max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <img src={fotoModalUrl} alt="Selfie ampliada" className="w-full rounded-xl shadow-2xl" />
            <button
              onClick={() => setFotoModalUrl(null)}
              className="absolute top-2 right-2 bg-white text-gray-800 rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold shadow"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-gray-800">Confirmar Exclusão</h2>
            <p className="text-gray-600 text-sm">
              Tem certeza que deseja excluir TODOS os registros de ponto de{' '}
              <strong className="text-gray-800">
                {(allUsers ?? []).find((u) => u.id === selectedUser)?.name}
              </strong>
              ? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deletingRecords}
                className="border rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteAllRecords}
                disabled={deletingRecords}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {deletingRecords ? 'Excluindo...' : 'Confirmar Exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
