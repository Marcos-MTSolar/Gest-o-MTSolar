import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import jsPDF from 'jspdf';
import { supabase } from '../lib/supabase';
import { Trash2, MapPin } from 'lucide-react';

/**
 * BLOQUEAR_PONTO_SEM_LOCALIZACAO:
 *   true  → se a localização falhar após 2 tentativas, o ponto NÃO é registrado.
 *   false → o ponto é registrado com lat/lng nulos e um aviso é exibido ao gestor.
 * Altere para false se a empresa decidir permitir exceções (ex.: obras sem sinal).
 */
const BLOQUEAR_PONTO_SEM_LOCALIZACAO = true;



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

/**
 * capturarLocalizacao:
 *   - Em plataforma nativa (Android/iOS via Capacitor): usa o plugin @capacitor/geolocation.
 *   - Em navegador web (browser comum): usa a W3C Geolocation API (navigator.geolocation).
 * Retorna { latitude, longitude } ou lança um Error descritivo para o caller tratar.
 */
const capturarLocalizacao = async (): Promise<{ latitude: number; longitude: number }> => {
  if (Capacitor.isNativePlatform()) {
    // Fluxo nativo: usa plugin Capacitor
    const permissao = await Geolocation.requestPermissions();
    if (permissao.location !== 'granted') {
      throw new Error('Permissão de localização negada pelo usuário.');
    }
    const posicao = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 15000,
    });
    return {
      latitude: posicao.coords.latitude,
      longitude: posicao.coords.longitude,
    };
  } else {
    // Fluxo web: usa a API nativa do navegador (W3C Geolocation API)
    if (!navigator.geolocation) {
      throw new Error('Este navegador não suporta geolocalização.');
    }
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            reject(new Error('Permissão de localização negada pelo usuário. Verifique as configurações do seu navegador.'));
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            reject(new Error('Localização indisponível no momento. Verifique se o GPS/Wi-Fi estão ativos.'));
          } else if (err.code === err.TIMEOUT) {
            reject(new Error('Tempo esgotado ao obter localização. Tente novamente.'));
          } else {
            reject(new Error('Erro ao obter localização.'));
          }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });
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
  const [activeTab, setActiveTab] = useState<'ponto' | 'historico' | 'gestor' | 'ajustes' | 'fotos' | 'feriados' | 'folgas' | 'bancohoras'>('ponto');

  // Modal de erro de localização: mensagem de erro, tipo pendente (para continuar após tentativas) e contador
  const [geoErrorModal, setGeoErrorModal] = useState<{
    visible: boolean;
    mensagem: string;
    pendingType: string | null;
    pendingPhoto: string | null;
    tentativas: number;
  }>({ visible: false, mensagem: '', pendingType: null, pendingPhoto: null, tentativas: 0 });
  const [activeMedicalCertificate, setActiveMedicalCertificate] = useState<{ active: boolean; end_date: string | null } | null>(null);

  // Extrato de Banco de Horas (Funcionário logado)
  const [myHourBank, setMyHourBank] = useState<any[]>([]);
  const [myHourBankBalance, setMyHourBankBalance] = useState(0);
  const [loadingMyHB, setLoadingMyHB] = useState(false);

  // Solicitação de folga pelo funcionário
  const [timeOffForm, setTimeOffForm] = useState({ date: '', type: 'folga_abate_banco', hours: '8', notes: '' });
  const [submittingTimeOff, setSubmittingTimeOff] = useState(false);

  // Gestor: Aprovações de Folgas e Compensações
  const [pendingTimeOffRequests, setPendingTimeOffRequests] = useState<any[]>([]);
  const [loadingTimeOffRequests, setLoadingTimeOffRequests] = useState(false);

  // Gestor: Lançamento Manual no Banco de Horas
  const [manualHBForm, setManualHBForm] = useState({ user_id: '', reference_date: '', hours: '', type: 'ajuste_manual', description: '' });
  const [savingManualHB, setSavingManualHB] = useState(false);

  // Gestão de feriados
  const [holidays, setHolidays] = useState<any[]>([]);
  const [holidayForm, setHolidayForm] = useState({ date: '', name: '', type: 'nacional', recurring: true });
  const [holidayYear, setHolidayYear] = useState(() => String(new Date().getFullYear()));
  const [savingHoliday, setSavingHoliday] = useState(false);

  // Gestor
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [reportRecords, setReportRecords] = useState<TimeRecord[]>([]);
  // Banco de horas: lançamentos detalhados e resumo do período do relatório
  const [hourBankEntries, setHourBankEntries] = useState<any[]>([]);
  const [hourBankSummary, setHourBankSummary] = useState<{
    extraNormal: number; extraFds: number; devendo: number; abonados: number; balance: number;
  } | null>(null);
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

  // Estado do recálculo retroativo do banco de horas
  const [recalculating, setRecalculating] = useState(false);
  const [recalcResult, setRecalcResult] = useState<{
    faltasRemovidasIncorretas: number;
    novasFaltasRegistradas: number;
    novoSaldoPeriodo: number;
    nome: string;
  } | null>(null);
  const [showRecalcConfirmAll, setShowRecalcConfirmAll] = useState(false);

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
    fetchMyHourBank();
    if (isManager) {
      fetchAllUsers();
      fetchPendingAdjustments();
      fetchHolidays(String(new Date().getFullYear()));
      fetchPendingTimeOffRequests();
    }
    // Verifica se há atestado ativo para o usuário logado hoje
    api.get('/api/medical-certificates/active')
      .then(res => setActiveMedicalCertificate(res.data))
      .catch(() => {});
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

  async function fetchHolidays(year: string) {
    try {
      const res = await api.get(`/api/holidays?year=${year}`);
      setHolidays(res.data ?? []);
    } catch {
      setHolidays([]);
    }
  }

  async function fetchMyHourBank() {
    try {
      setLoadingMyHB(true);
      const res = await api.get('/api/hour-bank');
      setMyHourBank(res.data?.entries ?? []);
      setMyHourBankBalance(res.data?.balance ?? 0);
    } catch {
      setMyHourBank([]);
      setMyHourBankBalance(0);
    } finally {
      setLoadingMyHB(false);
    }
  }

  async function fetchPendingTimeOffRequests() {
    try {
      setLoadingTimeOffRequests(true);
      const res = await api.get('/api/time-off-requests?status=pending');
      setPendingTimeOffRequests(res.data ?? []);
    } catch {
      setPendingTimeOffRequests([]);
    } finally {
      setLoadingTimeOffRequests(false);
    }
  }

  async function fetchReport(userId: number) {
    if (!userId || !startDate || !endDate) {
      setReportRecords([]);
      setHourBankEntries([]);
      setHourBankSummary(null);
      return;
    }
    try {
      setLoading(true);
      const start = startDate;
      const end = `${endDate}T23:59:59`;
      const res = await api.get(`/api/ponto/relatorio/${userId}?start=${start}&end=${end}`);
      // Novo formato: { records: [...], hourBank: [...] }
      const data = res.data;
      const records = Array.isArray(data) ? data : (data?.records ?? []);
      const hb = Array.isArray(data) ? [] : (data?.hourBank ?? []);
      setReportRecords(records);
      setHourBankEntries(hb);

      // Calcula o resumo localmente a partir dos lançamentos retornados aplicando o multiplier da CLT
      let extraNormal = 0, extraFds = 0, devendo = 0, abonados = 0, balance = 0;
      hb.forEach((e: any) => {
        const hrs = parseFloat(e.hours);
        const mult = parseFloat(e.multiplier) || 1.0;
        const valueWithMultiplier = hrs * mult;
        balance += valueWithMultiplier;
        if (hrs > 0) {
          if (mult === 1.5) extraNormal += hrs * 1.5;
          else if (mult === 2.0) extraFds += hrs * 2.0;
        } else if (hrs < 0) {
          devendo += Math.abs(hrs);
        } else if (e.type === 'feriado_abonado' || e.type === 'atestado_abonado') {
          abonados += 1;
        }
      });
      setHourBankSummary({
        extraNormal: Math.round(extraNormal * 100) / 100,
        extraFds: Math.round(extraFds * 100) / 100,
        devendo: Math.round(devendo * 100) / 100,
        abonados,
        balance: Math.round(balance * 100) / 100,
      });
    } catch (err) {
      console.error(err);
      setReportRecords([]);
      setHourBankEntries([]);
      setHourBankSummary(null);
    } finally {
      setLoading(false);
    }
  }

  /**
   * handleRecalculate: chama POST /api/hour-bank/recalculate para corrigir
   * lançamentos automáticos incorretos de 'falta' no período selecionado.
   * @param recalcAllUsers - se true, recalcula todos os funcionários da empresa
   */
  async function handleRecalculate(recalcAllUsers = false) {
    if (!startDate || !endDate) return;
    if (!recalcAllUsers && !selectedUser) return;

    try {
      setRecalculating(true);
      setRecalcResult(null);
      setShowRecalcConfirmAll(false);

      const payload: any = { startDate, endDate };
      if (!recalcAllUsers && selectedUser) {
        payload.userId = selectedUser;
      }

      const res = await api.post('/api/hour-bank/recalculate', payload);
      const data = res.data;

      // Para exibição do resultado: usa o primeiro (e provavelmente único) usuário recalculado
      const resultadoUsuario = recalcAllUsers
        ? {
            faltasRemovidasIncorretas: data.totalFaltasInCorretasRemovidas,
            novasFaltasRegistradas: (data.resultadosPorUsuario ?? []).reduce((s: number, u: any) => s + u.novasFaltasRegistradas, 0),
            novoSaldoPeriodo: (data.resultadosPorUsuario ?? []).reduce((s: number, u: any) => s + u.novoSaldoPeriodo, 0),
            nome: `${data.usuariosRecalculados} funcionário(s)`,
          }
        : (data.resultadosPorUsuario ?? [])[0] ?? null;

      setRecalcResult(resultadoUsuario);

      // Recarrega o relatório automaticamente se havia um usuário selecionado
      if (selectedUser) {
        await fetchReport(selectedUser);
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.error ?? 'Erro ao recalcular banco de horas.';
      setMessage({ text: errMsg, type: 'error' });
    } finally {
      setRecalculating(false);
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


  /**
   * registrarPontoComLocalizacao: envia as batidas ao backend após a localização
   * ter sido capturada (ou após a decisão de excepcionalmente dispensá-la).
   */
  async function registrarPontoComLocalizacao(
    photo: { base64String?: string },
    latitude: number | null,
    longitude: number | null,
    type: string
  ) {
    await api.post('/api/ponto/registrar', {
      type,
      latitude,
      longitude,
      selfie_base64: `data:image/jpeg;base64,${photo.base64String}`,
    });
    setMessage({ text: `${TYPE_LABELS[type]} registrada com sucesso!${latitude === null ? ' ⚠️ Sem localização — gestor notificado.' : ''}`, type: latitude === null ? 'error' : 'success' });
    setGeoErrorModal({ visible: false, mensagem: '', pendingType: null, pendingPhoto: null, tentativas: 0 });
    fetchHistory();
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

      const todayStr = new Date().toISOString().slice(0, 10);
      const todayRecords = records.filter((r) => r.timestamp.slice(0, 10) === todayStr);
      const type = getNextPunchType(todayRecords);

      if (!type) {
        setMessage({ text: 'Todas as batidas do dia já foram registradas.', type: 'error' });
        return;
      }

      try {
        const localizacao = await capturarLocalizacao();
        // Localização capturada com sucesso → registra normalmente
        await registrarPontoComLocalizacao(photo, localizacao.latitude, localizacao.longitude, type);
      } catch (geoErr: any) {
        // Falha ao capturar localização: exibe modal com opção de tentar novamente
        setGeoErrorModal({
          visible: true,
          mensagem: geoErr?.message ?? 'Não foi possível obter a localização.',
          pendingType: type,
          pendingPhoto: photo.base64String ?? null,
          tentativas: 1,
        });
      }
    } catch (err: any) {
      // Erros de câmera ou de rede ao registrar ponto
      const msg = err?.response?.data?.error ?? err?.message ?? 'Erro ao registrar ponto.';
      setMessage({ text: msg, type: 'error' });
    } finally {
      setPunching(false);
    }
  }

  /**
   * handleGeoRetry: tentativa de nova captura de localização.
   * Após 2 tentativas, se BLOQUEAR_PONTO_SEM_LOCALIZACAO=true → bloqueia;
   * se false → permite registrar com lat/lng nulos (exceção controlada).
   */
  async function handleGeoRetry() {
    if (!geoErrorModal.pendingType || !geoErrorModal.pendingPhoto) return;
    const novasTentativas = geoErrorModal.tentativas + 1;

    try {
      const localizacao = await capturarLocalizacao();
      // Conseguiu na retentativa
      await registrarPontoComLocalizacao(
        { base64String: geoErrorModal.pendingPhoto },
        localizacao.latitude,
        localizacao.longitude,
        geoErrorModal.pendingType
      );
    } catch (geoErr: any) {
      if (novasTentativas >= 2 && !BLOQUEAR_PONTO_SEM_LOCALIZACAO) {
        // Exceção controlada: registra sem localização e notifica gestor via backend
        try {
          await registrarPontoComLocalizacao(
            { base64String: geoErrorModal.pendingPhoto },
            null,
            null,
            geoErrorModal.pendingType
          );
        } catch (apiErr: any) {
          setMessage({ text: apiErr?.response?.data?.error ?? 'Erro ao registrar ponto.', type: 'error' });
          setGeoErrorModal({ visible: false, mensagem: '', pendingType: null, pendingPhoto: null, tentativas: 0 });
        }
      } else {
        // Atualiza contagem de tentativas e mantém modal aberto
        setGeoErrorModal(prev => ({
          ...prev,
          mensagem: geoErr?.message ?? 'Localização indisponível.',
          tentativas: novasTentativas,
        }));
      }
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

    // Tabela de registros diários — com coluna Tipo do Dia
    let y = 74;
    doc.setFillColor(235, 238, 243);
    doc.rect(14, y - 6, 182, 8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('DIA/MÊS', 14, y - 1);
    doc.text('SEMANA', 28, y - 1);
    doc.text('ENTRADA', 50, y - 1);
    doc.text('S.ALM.', 66, y - 1);
    doc.text('R.ALM.', 80, y - 1);
    doc.text('SAÍDA', 94, y - 1);
    doc.text('TOTAL', 108, y - 1);
    doc.text('TIPO DO DIA', 120, y - 1);
    doc.text('OBSERVAÇÕES', 158, y - 1);

    doc.setFont('helvetica', 'normal');
    y += 7;

    // Mapa de lançamentos do banco de horas por data para cruzar com batidas
    const hbByDate: Record<string, any> = {};
    (hourBankEntries || []).forEach(e => {
      // Prioriza lançamento mais relevante (hora_extra_normal > falta > outros)
      const priority: Record<string, number> = {
        hora_extra_normal: 5, hora_extra_fds_feriado: 5,
        falta: 4, folga_abatida: 3,
        atestado_abonado: 2, feriado_abonado: 1,
        compensacao: 0, ajuste_manual: 0
      };
      const date = e.reference_date;
      if (!hbByDate[date] || (priority[e.type] ?? 0) > (priority[hbByDate[date]?.type] ?? -1)) {
        hbByDate[date] = e;
      }
    });

    const HB_TYPE_LABEL: Record<string, string> = {
      hora_extra_normal: 'H.Extra 50%',
      hora_extra_fds_feriado: 'H.Extra 100%',
      falta: 'Falta',
      folga_abatida: 'Folga',
      atestado_abonado: 'Atestado',
      feriado_abonado: 'Feriado',
      compensacao: 'Compensação',
      ajuste_manual: 'Ajuste Manual',
    };

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
      const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const dayOfWeekName = daysOfWeek[dateObj.getDay()];
      const dateStr = `${dateParts[2]}/${dateParts[1]}`;

      const hbEntry = hbByDate[day];
      const tipoDia = hbEntry ? (HB_TYPE_LABEL[hbEntry.type] ?? hbEntry.type) : (hours > 0 ? 'Normal' : '-');
      const hasMissingLocation = (recs ?? []).some((r) => r.latitude === null || r.longitude === null);
      const obs = hasMissingLocation ? 'Sem GPS' : 'Com GPS';

      // Colorir linha por tipo de dia
      if (hbEntry?.type === 'falta') {
        doc.setTextColor(200, 50, 50);
      } else if (hbEntry?.type === 'feriado_abonado' || hbEntry?.type === 'atestado_abonado') {
        doc.setTextColor(50, 130, 200);
      } else if (hbEntry?.type?.startsWith('hora_extra')) {
        doc.setTextColor(30, 140, 80);
      } else {
        doc.setTextColor(60, 60, 60);
      }

      doc.setFontSize(7.5);
      doc.text(dateStr, 14, y);
      doc.text(dayOfWeekName, 28, y);
      doc.text(byType['entry'] ?? '-', 50, y);
      doc.text(byType['lunch_start'] ?? '-', 66, y);
      doc.text(byType['lunch_end'] ?? '-', 80, y);
      doc.text(byType['exit'] ?? '-', 94, y);
      doc.text(hours > 0 ? `${hours.toFixed(1)}h` : '-', 108, y);
      doc.text(tipoDia, 120, y);
      doc.text(obs, 158, y);

      doc.setTextColor(60, 60, 60);

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
    if (y > 230) {
      doc.addPage();
      y = 20;
    }

    // Resumo de horas trabalhadas
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);
    doc.text(`Total de horas trabalhadas: ${totalHours.toFixed(1)}h`, 14, y);
    y += 8;

    // Resumo do banco de horas (se disponível)
    if (hourBankSummary) {
      doc.setFillColor(240, 248, 255);
      doc.rect(14, y - 4, 182, 30, 'F');
      doc.setDrawColor(190, 210, 240);
      doc.rect(14, y - 4, 182, 30, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 70, 140);
      doc.text('RESUMO DO BANCO DE HORAS', 105, y + 1, { align: 'center' });

      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 40, 40);

      const col1x = 18, col2x = 70, col3x = 122;

      doc.setFont('helvetica', 'bold');
      doc.text('H. Extras (50% — dia útil):', col1x, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 140, 80);
      doc.text(`+${hourBankSummary.extraNormal.toFixed(2)}h`, col1x + 45, y);
      doc.setTextColor(40, 40, 40);

      doc.setFont('helvetica', 'bold');
      doc.text('H. Extras (100% — Dom/Fer.):', col2x, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 140, 80);
      doc.text(`+${hourBankSummary.extraFds.toFixed(2)}h`, col2x + 50, y);
      doc.setTextColor(40, 40, 40);

      doc.setFont('helvetica', 'bold');
      doc.text('Faltas/Horas devendo:', col3x, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(200, 50, 50);
      doc.text(`-${hourBankSummary.devendo.toFixed(2)}h`, col3x + 38, y);
      doc.setTextColor(40, 40, 40);

      y += 7;
      doc.setFont('helvetica', 'bold');
      doc.text('Dias Abonados (Fer./Ates.):', col1x, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 130, 200);
      doc.text(`${hourBankSummary.abonados} dia(s)`, col1x + 45, y);
      doc.setTextColor(40, 40, 40);

      doc.setFont('helvetica', 'bold');
      const balanceColor = hourBankSummary.balance >= 0 ? [30, 140, 80] : [200, 50, 50];
      doc.text('Saldo do Banco de Horas:', col2x, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(balanceColor[0], balanceColor[1], balanceColor[2]);
      doc.text(`${hourBankSummary.balance >= 0 ? '+' : ''}${hourBankSummary.balance.toFixed(2)}h`, col2x + 46, y);
      doc.setTextColor(40, 40, 40);

      y += 3;

      // Nota sobre multiplicadores
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 100, 100);
      doc.text('* Mult. 1.5 = adicional mínimo de 50% em dia útil (Art. 7º, XVI CF/88). Mult. 2.0 = adicional 100% em dom./feriado (Lei 605/49 c/c Súmula 146 TST).', 14, y + 10);
      doc.text('  Percentuais podem ser ajustados por acordo/convenção coletiva.', 14, y + 15);
      y += 20;
    }

    y += 15;
    if (y > 265) {
      doc.addPage();
      y = 35;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
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
      <div className="flex gap-2 mb-6 border-b border-gray-200 overflow-x-auto">
        {[
          { key: 'ponto', label: 'Bater Ponto' },
          { key: 'historico', label: 'Meu Histórico' },
          { key: 'bancohoras', label: '📊 Extrato Banco' },
          { key: 'folgas', label: '✈️ Folgas/Compensações' },
          ...(isManager ? [
            { key: 'gestor', label: 'Relatórios' },
            { key: 'ajustes', label: 'Ajustes Pendentes' },
            { key: 'fotos', label: 'Verificar Fotos' },
            { key: 'feriados', label: '🗓️ Feriados' },
          ] : []),
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors shrink-0 ${activeTab === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
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

            {activeMedicalCertificate?.active ? (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 max-w-md mx-auto space-y-2">
                <p className="font-bold text-base">⚠️ Afastamento por Atestado Médico</p>
                <p className="text-sm">
                  Você está em atestado médico até{' '}
                  <strong className="font-semibold text-red-900">
                    {(() => {
                      const parts = activeMedicalCertificate.end_date!.split('-');
                      return `${parts[2]}/${parts[1]}/${parts[0]}`;
                    })()}
                  </strong>.
                </p>
                <p className="text-xs text-red-600 italic">Desejamos uma boa recuperação!</p>
              </div>
            ) : nextType ? (
              <button
                onClick={handlePunch}
                disabled={punching}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-4 px-10 rounded-2xl text-lg transition-all shadow-md"
              >
                {punching ? 'Aguarde...' : `Registrar ${TYPE_LABELS[nextType]}`}
              </button>
            ) : (
              <div className="text-green-600 font-semibold text-lg">✅ Todas as batidas do dia registradas!</div>
            )}

            {/* Aviso: localização obrigatória para web */}
            {!Capacitor.isNativePlatform() && nextType && !activeMedicalCertificate?.active && (
              <p className="text-xs text-gray-400 mt-2">
                📍 Sua localização será solicitada ao bater ponto. Certifique-se de permitir o acesso no navegador.
              </p>
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
            </div>

            {/* Botões de ação: Carregar, Recalcular, Excluir */}
            <div className="flex gap-2 flex-wrap items-center">
              <button
                onClick={() => selectedUser && fetchReport(selectedUser)}
                disabled={!selectedUser || loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {loading ? 'Carregando...' : 'Carregar'}
              </button>

              {/* Botão Recalcular Período — corrige lançamentos de falta incorretos */}
              <button
                type="button"
                onClick={() => {
                  if (!selectedUser) {
                    // Sem usuário selecionado: confirma antes de recalcular todos
                    setShowRecalcConfirmAll(true);
                  } else {
                    handleRecalculate(false);
                  }
                }}
                disabled={recalculating || loading}
                className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
                title={selectedUser ? 'Recalcular banco de horas deste funcionário no período' : 'Recalcular banco de horas de TODOS os funcionários no período'}
              >
                {recalculating ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Recalculando...
                  </>
                ) : '⟳ Recalcular Período'}
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

            {/* Modal de confirmação: recalcular TODOS os funcionários */}
            {showRecalcConfirmAll && (
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col gap-3">
                <p className="text-sm text-amber-800 font-semibold">
                  ⚠️ Nenhum funcionário selecionado.
                </p>
                <p className="text-sm text-amber-700">
                  Isso vai recalcular o banco de horas de <strong>TODOS os funcionários</strong> no período {startDate} a {endDate}.<br/>
                  Lançamentos manuais feitos por gestores <strong>não serão apagados</strong>.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRecalculate(true)}
                    disabled={recalculating}
                    className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                  >
                    Confirmar — Recalcular Todos
                  </button>
                  <button
                    onClick={() => setShowRecalcConfirmAll(false)}
                    className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Resultado do recálculo */}
            {recalcResult && (
              <div className="mt-3 bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-green-800 mb-2">✅ Recálculo concluído — {recalcResult.nome}</p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-white rounded-lg p-3 border border-green-100">
                    <p className="text-xs text-gray-500 mb-1">Faltas incorretas removidas</p>
                    <p className="text-lg font-bold text-red-600">{recalcResult.faltasRemovidasIncorretas}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-green-100">
                    <p className="text-xs text-gray-500 mb-1">Novas faltas reais</p>
                    <p className="text-lg font-bold text-orange-600">{recalcResult.novasFaltasRegistradas}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-green-100">
                    <p className="text-xs text-gray-500 mb-1">Novo saldo do período</p>
                    <p className={`text-lg font-bold ${recalcResult.novoSaldoPeriodo >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                      {recalcResult.novoSaldoPeriodo >= 0 ? '+' : ''}{recalcResult.novoSaldoPeriodo.toFixed(2)}h
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setRecalcResult(null)}
                  className="mt-3 text-xs text-green-600 hover:underline"
                >
                  Fechar
                </button>
              </div>
            )}

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

          {/* Cards de Resumo do Banco de Horas */}
          {hourBankSummary && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {/* Hora Extra Dia Útil 50% */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                <p className="text-xs text-emerald-600 font-medium mb-1">H. Extra 50%</p>
                <p className="text-xl font-bold text-emerald-700">+{hourBankSummary.extraNormal.toFixed(2)}h</p>
                <p className="text-xs text-emerald-500 mt-0.5">Dias úteis</p>
              </div>
              {/* Hora Extra Dom/Feriado 100% */}
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 text-center">
                <p className="text-xs text-teal-600 font-medium mb-1">H. Extra 100%</p>
                <p className="text-xl font-bold text-teal-700">+{hourBankSummary.extraFds.toFixed(2)}h</p>
                <p className="text-xs text-teal-500 mt-0.5">Dom / Feriado</p>
              </div>
              {/* Faltas / Horas devendo */}
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                <p className="text-xs text-red-600 font-medium mb-1">Faltas / Devendo</p>
                <p className="text-xl font-bold text-red-700">-{hourBankSummary.devendo.toFixed(2)}h</p>
                <p className="text-xs text-red-500 mt-0.5">Horas a compensar</p>
              </div>
              {/* Dias Abonados */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                <p className="text-xs text-blue-600 font-medium mb-1">Dias Abonados</p>
                <p className="text-xl font-bold text-blue-700">{hourBankSummary.abonados}</p>
                <p className="text-xs text-blue-500 mt-0.5">Feriados / Atestados</p>
              </div>
              {/* Saldo Final */}
              <div className={`border rounded-xl p-3 text-center ${hourBankSummary.balance >= 0 ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
                <p className={`text-xs font-medium mb-1 ${hourBankSummary.balance >= 0 ? 'text-green-600' : 'text-orange-600'}`}>Saldo Banco</p>
                <p className={`text-xl font-bold ${hourBankSummary.balance >= 0 ? 'text-green-700' : 'text-orange-700'}`}>
                  {hourBankSummary.balance >= 0 ? '+' : ''}{hourBankSummary.balance.toFixed(2)}h
                </p>
                <p className={`text-xs mt-0.5 ${hourBankSummary.balance >= 0 ? 'text-green-500' : 'text-orange-500'}`}>
                  {hourBankSummary.balance >= 0 ? 'Crédito' : 'Débito'}
                </p>
              </div>
            </div>
          )}

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

      {/* TAB: EXTRATO DO BANCO DE HORAS (FUNCIONÁRIO) */}
      {activeTab === 'bancohoras' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex justify-between items-center flex-wrap gap-3">
              <div>
                <p className="font-semibold text-gray-800 text-lg">Banco de Horas</p>
                <p className="text-xs text-gray-400 mt-0.5">Histórico pessoal de créditos e débitos acumulados.</p>
              </div>
              <div className={`px-5 py-3 rounded-xl border text-center ${myHourBankBalance >= 0 ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-0.5">Saldo Acumulado</p>
                <p className="text-2xl font-black">{myHourBankBalance >= 0 ? '+' : ''}{myHourBankBalance.toFixed(2)}h</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <p className="font-semibold text-gray-700 text-sm">Extrato Detalhado</p>
            </div>
            {loadingMyHB ? (
              <p className="text-center text-gray-400 py-10 text-sm">Carregando lançamentos...</p>
            ) : myHourBank.length === 0 ? (
              <p className="text-center text-gray-400 py-10 text-sm">Nenhum lançamento no banco de horas ainda.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase">Data</th>
                    <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase">Tipo</th>
                    <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase">Descrição</th>
                    <th className="text-right p-3 text-xs font-semibold text-gray-500 uppercase">Horas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {myHourBank.map((e: any) => {
                    const parts = e.reference_date.split('-');
                    const formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
                    const val = parseFloat(e.hours);
                    const labelMap: Record<string, string> = {
                      hora_extra_normal: 'H. Extra 50%',
                      hora_extra_fds_feriado: 'H. Extra 100%',
                      falta: 'Falta',
                      folga_abatida: 'Folga Abatida',
                      compensacao: 'Compensação',
                      ajuste_manual: 'Ajuste Manual',
                      atestado_abonado: 'Atestado',
                      feriado_abonado: 'Feriado',
                    };
                    return (
                      <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-3 text-gray-700 font-medium">{formattedDate}</td>
                        <td className="p-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            val > 0 ? 'bg-green-100 text-green-700' : val < 0 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {labelMap[e.type] ?? e.type}
                          </span>
                        </td>
                        <td className="p-3 text-gray-500 max-w-[250px] truncate" title={e.description}>{e.description || '—'}</td>
                        <td className={`p-3 text-right font-bold ${val > 0 ? 'text-green-600' : val < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                          {val > 0 ? '+' : ''}{val.toFixed(2)}h
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB: FOLGAS E COMPENSAÇÕES */}
      {activeTab === 'folgas' && (
        <div className="space-y-6">
          {/* Seção 1: Formulário de Solicitação (Para qualquer funcionário) */}
          <div className="bg-white rounded-xl shadow p-5 space-y-4">
            <div>
              <p className="font-semibold text-gray-800 text-base">Nova Solicitação de Folga ou Compensação</p>
              <p className="text-xs text-gray-400 mt-0.5">Sua solicitação passará por análise da gerência.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Data *</label>
                <input
                  type="date"
                  value={timeOffForm.date}
                  onChange={e => setTimeOffForm(p => ({ ...p, date: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full bg-white"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Tipo *</label>
                <select
                  value={timeOffForm.type}
                  onChange={e => setTimeOffForm(p => ({ ...p, type: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full bg-white bg-[image:none]"
                >
                  <option value="folga_abate_banco">Folga (Abater do banco)</option>
                  <option value="compensacao_horas">Compensar horas devendo/extras</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Horas *</label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={timeOffForm.hours}
                  onChange={e => setTimeOffForm(p => ({ ...p, hours: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full bg-white"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Justificativa / Observações *</label>
              <textarea
                placeholder="Explique o motivo da solicitação..."
                value={timeOffForm.notes}
                onChange={e => setTimeOffForm(p => ({ ...p, notes: e.target.value }))}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full min-h-[60px]"
              />
            </div>
            <button
              onClick={async () => {
                if (!timeOffForm.date || !timeOffForm.notes.trim()) {
                  alert('Data e justificativa são obrigatórios.');
                  return;
                }
                try {
                  setSubmittingTimeOff(true);
                  await api.post('/api/time-off-requests', timeOffForm);
                  alert('Solicitação enviada com sucesso!');
                  setTimeOffForm({ date: '', type: 'folga_abate_banco', hours: '8', notes: '' });
                  if (isManager) fetchPendingTimeOffRequests();
                } catch (err: any) {
                  alert(err.response?.data?.error || 'Erro ao enviar solicitação.');
                } finally {
                  setSubmittingTimeOff(false);
                }
              }}
              disabled={submittingTimeOff || !timeOffForm.date || !timeOffForm.notes.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-5 rounded-lg text-sm disabled:opacity-40"
            >
              {submittingTimeOff ? 'Enviando...' : 'Enviar Solicitação'}
            </button>
          </div>

          {/* Seção 2: Painel do Gestor — Aprovar / Rejeitar solicitações pendentes */}
          {isManager && (
            <div className="bg-white rounded-xl shadow p-5 space-y-4">
              <div>
                <p className="font-semibold text-gray-800 text-base">Painel do Gestor: Solicitações Pendentes</p>
                <p className="text-xs text-gray-400 mt-0.5">Aprovação ou reprovação de folgas e compensações de colaboradores.</p>
              </div>

              {loadingTimeOffRequests ? (
                <p className="text-center text-gray-400 py-6 text-sm">Carregando solicitações...</p>
              ) : pendingTimeOffRequests.length === 0 ? (
                <p className="text-center text-gray-400 py-6 text-sm italic">Nenhuma solicitação de folga ou compensação pendente.</p>
              ) : (
                <div className="space-y-3">
                  {pendingTimeOffRequests.map((req: any) => {
                    const parts = req.date.split('-');
                    const fmtDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
                    return (
                      <div key={req.id} className="border rounded-xl p-4 space-y-2 hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start flex-wrap gap-2 text-sm">
                          <div>
                            <p className="font-bold text-gray-800">{req.users?.name}</p>
                            <p className="text-xs text-gray-400">
                              Tipo:{' '}
                              <span className="font-semibold text-gray-700">
                                {req.type === 'folga_abate_banco' ? 'Folga (Abate do Banco)' : 'Compensação de Horas'}
                              </span>{' '}
                              | Horas: <span className="font-semibold text-gray-700">{req.hours}h</span>
                            </p>
                          </div>
                          <span className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1">
                            📅 {fmtDate}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded-lg italic">
                          <strong>Justificativa:</strong> {req.notes || '—'}
                        </p>
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={async () => {
                              if (!confirm('Aprovar esta solicitação?')) return;
                              try {
                                await api.put(`/api/time-off-requests/${req.id}`, { status: 'approved' });
                                alert('Aprovada com sucesso.');
                                fetchPendingTimeOffRequests();
                                fetchMyHourBank();
                              } catch {
                                alert('Erro ao aprovar.');
                              }
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg"
                          >
                            Aprovar
                          </button>
                          <button
                            onClick={async () => {
                              const notes = prompt('Motivo da rejeição:');
                              if (notes === null) return;
                              try {
                                await api.put(`/api/time-off-requests/${req.id}`, { status: 'rejected', notes });
                                alert('Solicitação rejeitada.');
                                fetchPendingTimeOffRequests();
                              } catch {
                                alert('Erro ao rejeitar.');
                              }
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg"
                          >
                            Rejeitar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Seção 3: Painel do Gestor — Lançamento Manual Direto (Excepcional) */}
          {isManager && (
            <div className="bg-white rounded-xl shadow p-5 space-y-4">
              <div>
                <p className="font-semibold text-gray-800 text-base">Painel do Gestor: Lançamento Manual Direto</p>
                <p className="text-xs text-gray-400 mt-0.5">Adicionar créditos positivos ou débitos negativos diretamente no banco de horas sem fluxo de aprovação.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Funcionário *</label>
                  <select
                    value={manualHBForm.user_id}
                    onChange={e => setManualHBForm(p => ({ ...p, user_id: e.target.value }))}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full bg-white bg-[image:none]"
                  >
                    <option value="">Selecione o colaborador</option>
                    {allUsers.map((u: any) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Data Referência *</label>
                  <input
                    type="date"
                    value={manualHBForm.reference_date}
                    onChange={e => setManualHBForm(p => ({ ...p, reference_date: e.target.value }))}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Horas (+ ou -) *</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ex: -4.5 ou 2.0"
                    value={manualHBForm.hours}
                    onChange={e => setManualHBForm(p => ({ ...p, hours: e.target.value }))}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Tipo Lançamento</label>
                  <select
                    value={manualHBForm.type}
                    onChange={e => setManualHBForm(p => ({ ...p, type: e.target.value }))}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full bg-white bg-[image:none]"
                  >
                    <option value="ajuste_manual">Ajuste Manual</option>
                    <option value="hora_extra_normal">H. Extra 50%</option>
                    <option value="hora_extra_fds_feriado">H. Extra 100%</option>
                    <option value="falta">Falta</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">Justificativa Obrigatória *</label>
                <textarea
                  placeholder="Informe a justificativa desse lançamento manual..."
                  value={manualHBForm.description}
                  onChange={e => setManualHBForm(p => ({ ...p, description: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full min-h-[50px]"
                />
              </div>

              <button
                onClick={async () => {
                  if (!manualHBForm.user_id || !manualHBForm.reference_date || !manualHBForm.hours || !manualHBForm.description.trim()) {
                    alert('Todos os campos são obrigatórios para o lançamento manual.');
                    return;
                  }
                  try {
                    setSavingManualHB(true);
                    await api.post('/api/hour-bank', {
                      ...manualHBForm,
                      multiplier: manualHBForm.type.startsWith('hora_extra') ? (manualHBForm.type === 'hora_extra_normal' ? 1.5 : 2.0) : 1.0
                    });
                    alert('Lançamento manual realizado com sucesso.');
                    setManualHBForm({ user_id: '', reference_date: '', hours: '', type: 'ajuste_manual', description: '' });
                    fetchMyHourBank();
                  } catch (err: any) {
                    alert(err.response?.data?.error || 'Erro ao realizar lançamento manual.');
                  } finally {
                    setSavingManualHB(false);
                  }
                }}
                disabled={savingManualHB || !manualHBForm.user_id || !manualHBForm.reference_date || !manualHBForm.hours || !manualHBForm.description.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-5 rounded-lg text-sm disabled:opacity-40"
              >
                {savingManualHB ? 'Salvando...' : 'Realizar Lançamento Manual'}
              </button>
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

      {/* TAB: GESTÃO DE FERIADOS (GESTOR) */}
      {activeTab === 'feriados' && isManager && (
        <div className="space-y-4">
          {/* Cabeçalho e filtro de ano */}
          <div className="bg-white rounded-xl shadow p-4 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="font-semibold text-gray-800 text-base">Gestão de Feriados</p>
                <p className="text-xs text-gray-400 mt-0.5">Feriados nacionais fixos se repetem todo ano automaticamente. Móveis e municipais devem ser recadastrados anualmente.</p>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">Ano:</label>
                <input
                  type="number"
                  value={holidayYear}
                  onChange={e => {
                    setHolidayYear(e.target.value);
                    api.get(`/api/holidays?year=${e.target.value}`)
                      .then(r => setHolidays(r.data ?? []))
                      .catch(() => {});
                  }}
                  min="2024" max="2030"
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-24"
                />
              </div>
            </div>

            {/* Formulário de novo feriado */}
            <div className="border-t pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Adicionar Feriado</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Data *</label>
                  <input
                    type="date"
                    value={holidayForm.date}
                    onChange={e => setHolidayForm(prev => ({ ...prev, date: e.target.value }))}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="text-xs text-gray-500 mb-1 block">Nome *</label>
                  <input
                    type="text"
                    value={holidayForm.name}
                    onChange={e => setHolidayForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Corpus Christi"
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Tipo</label>
                  <select
                    value={holidayForm.type}
                    onChange={e => setHolidayForm(prev => ({ ...prev, type: e.target.value }))}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full bg-white"
                  >
                    <option value="nacional">Nacional</option>
                    <option value="estadual">Estadual</option>
                    <option value="municipal">Municipal</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Recorrência</label>
                  <select
                    value={holidayForm.recurring ? 'true' : 'false'}
                    onChange={e => setHolidayForm(prev => ({ ...prev, recurring: e.target.value === 'true' }))}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full bg-white"
                  >
                    <option value="true">Fixo (repete todo ano)</option>
                    <option value="false">Móvel (apenas este ano)</option>
                  </select>
                </div>
              </div>
              <button
                onClick={async () => {
                  if (!holidayForm.date || !holidayForm.name.trim()) return;
                  try {
                    setSavingHoliday(true);
                    await api.post('/api/holidays', holidayForm);
                    setHolidayForm({ date: '', name: '', type: 'nacional', recurring: true });
                    const res = await api.get(`/api/holidays?year=${holidayYear}`);
                    setHolidays(res.data ?? []);
                  } catch (err: any) {
                    alert(err.response?.data?.error || 'Erro ao salvar feriado.');
                  } finally {
                    setSavingHoliday(false);
                  }
                }}
                disabled={savingHoliday || !holidayForm.date || !holidayForm.name.trim()}
                className="mt-3 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-40 transition-colors"
              >
                {savingHoliday ? 'Salvando...' : '+ Adicionar Feriado'}
              </button>
            </div>
          </div>

          {/* Lista de feriados do ano selecionado */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            {holidays.length === 0 ? (
              <p className="text-center text-gray-400 py-10 text-sm">Nenhum feriado cadastrado para {holidayYear}.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase">Data</th>
                    <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase">Nome</th>
                    <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase">Tipo</th>
                    <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase">Recorrência</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[...holidays]
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map((h) => {
                      const dateParts = (h.date as string).split('-');
                      const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
                      const typeColors: Record<string, string> = {
                        nacional: 'bg-blue-100 text-blue-700',
                        estadual: 'bg-purple-100 text-purple-700',
                        municipal: 'bg-green-100 text-green-700',
                      };
                      return (
                        <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                          <td className="p-3 font-medium text-gray-700">{formattedDate}</td>
                          <td className="p-3 text-gray-600">{h.name}</td>
                          <td className="p-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[h.type] ?? 'bg-gray-100 text-gray-600'}`}>
                              {h.type}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${h.recurring ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                              {h.recurring ? '🔁 Fixo' : '📅 Apenas ' + holidayYear}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={async () => {
                                if (!confirm(`Excluir o feriado "${h.name}"?`)) return;
                                try {
                                  await api.delete(`/api/holidays/${h.id}`);
                                  setHolidays(prev => prev.filter(x => x.id !== h.id));
                                } catch {
                                  alert('Erro ao excluir feriado.');
                                }
                              }}
                              className="text-red-400 hover:text-red-600 text-xs hover:underline"
                            >
                              Excluir
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            )}
          </div>

          {/* Aviso de verificação manual */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            <p className="font-semibold mb-1">⚠️ Verificação Manual Necessária</p>
            <ul className="list-disc pl-4 space-y-1 text-xs">
              <li><strong>Feriados móveis</strong> (Carnaval, Corpus Christi, Nossa Senhora dos Prazeres) mudam de data todo ano e devem ser recadastrados anualmente com <em>Recorrência = Móvel</em>.</li>
              <li><strong>São João (24/06)</strong>: confirmar se a empresa concede folga ou apenas ponto facultativo.</li>
              <li><strong>Carnaval e Corpus Christi</strong>: são pontos facultativos federais, não feriados nacionais oficiais. Adoção depende da política da empresa ou convenção coletiva.</li>
              <li>Consulte a <strong>Prefeitura de Jaboatão dos Guararapes</strong> e o <strong>SINDICOM</strong> para confirmar o calendário municipal de cada ano.</li>
            </ul>
          </div>
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
                          <span
                            className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-300"
                            title="Ponto registrado sem geolocalização"
                          >
                            🚫 SEM LOCALIZAÇÃO
                          </span>
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

      {/* Modal de erro de geolocalização */}
      {geoErrorModal.visible && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📍</span>
              <div>
                <h3 className="font-bold text-gray-800 text-base">Localização não obtida</h3>
                <p className="text-xs text-gray-500">Tentativa {geoErrorModal.tentativas} de 2</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 bg-red-50 border border-red-100 rounded-xl p-3">
              {geoErrorModal.mensagem}
            </p>

            <p className="text-xs text-gray-500">
              {BLOQUEAR_PONTO_SEM_LOCALIZACAO
                ? 'A localização é obrigatória para registrar o ponto. Verifique as permissões do navegador e tente novamente.'
                : geoErrorModal.tentativas >= 2
                  ? 'Após 2 tentativas sem sucesso, você pode registrar o ponto sem localização. Um aviso será enviado ao gestor.'
                  : 'A localização é necessária. Verifique as permissões do navegador e tente novamente.'}
            </p>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleGeoRetry}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors"
              >
                🔄 Tentar novamente
              </button>

              {/* Botão de exceção: só aparece após 2 tentativas e se BLOQUEAR=false */}
              {geoErrorModal.tentativas >= 2 && !BLOQUEAR_PONTO_SEM_LOCALIZACAO && (
                <button
                  onClick={() => {
                    if (!geoErrorModal.pendingType || !geoErrorModal.pendingPhoto) return;
                    registrarPontoComLocalizacao(
                      { base64String: geoErrorModal.pendingPhoto },
                      null,
                      null,
                      geoErrorModal.pendingType
                    ).catch((err: any) => {
                      setMessage({ text: err?.response?.data?.error ?? 'Erro ao registrar ponto.', type: 'error' });
                      setGeoErrorModal({ visible: false, mensagem: '', pendingType: null, pendingPhoto: null, tentativas: 0 });
                    });
                  }}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors"
                >
                  ⚠️ Registrar sem localização (gestor será avisado)
                </button>
              )}

              <button
                onClick={() => setGeoErrorModal({ visible: false, mensagem: '', pendingType: null, pendingPhoto: null, tentativas: 0 })}
                className="text-gray-500 hover:text-gray-700 text-sm py-1"
              >
                Cancelar
              </button>
            </div>
          </div>
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
