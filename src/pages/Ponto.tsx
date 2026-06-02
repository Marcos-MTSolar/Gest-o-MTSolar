import { useState, useEffect, useRef } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import jsPDF from 'jspdf';

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

const TYPE_ORDER = ['entry', 'lunch_start', 'lunch_end', 'exit'];

function getNextPunchType(todayRecords: TimeRecord[]): string | null {
  const done = todayRecords.map((r) => r.type);
  for (const t of TYPE_ORDER) {
    if (!done.includes(t as any)) return t;
  }
  return null;
}

function groupByDay(records: TimeRecord[]): Record<string, TimeRecord[]> {
  return records.reduce((acc, r) => {
    const day = r.timestamp.slice(0, 10);
    if (!acc[day]) acc[day] = [];
    acc[day].push(r);
    return acc;
  }, {} as Record<string, TimeRecord[]>);
}

function calcDayHours(records: TimeRecord[]): number {
  const sorted = [...records].sort(
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

export default function Ponto() {
  const { user } = useAuth();
  const isManager = ['CEO', 'ADMIN'].includes(user?.role ?? '');

  const [records, setRecords] = useState<TimeRecord[]>([]);
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [punching, setPunching] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<'ponto' | 'historico' | 'gestor' | 'ajustes'>('ponto');

  // Gestor
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [reportRecords, setReportRecords] = useState<TimeRecord[]>([]);
  const [reportMonth, setReportMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

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

  async function fetchSchedules() {
    try {
      const res = await api.get('/api/ponto/schedules');
      setSchedules(res.data);
    } catch {}
  }

  async function fetchHistory() {
    try {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
      const res = await api.get(`/api/ponto/historico?start=${start}&end=${end}`);
      setRecords(res.data);
    } catch {}
  }

  async function fetchAllUsers() {
    try {
      const res = await api.get('/api/users');
      setAllUsers(res.data.filter((u: any) => u.active));
    } catch {}
  }

  async function fetchPendingAdjustments() {
    try {
      const res = await api.get('/api/ponto/ajustes');
      setAdjustments(res.data);
    } catch {}
  }

  async function fetchReport(userId: number) {
    try {
      setLoading(true);
      const [year, month] = reportMonth.split('-');
      const start = new Date(Number(year), Number(month) - 1, 1).toISOString();
      const end = new Date(Number(year), Number(month), 0, 23, 59, 59).toISOString();
      const res = await api.get(`/api/ponto/relatorio/${userId}?start=${start}&end=${end}`);
      setReportRecords(res.data);
    } catch {} finally {
      setLoading(false);
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

      let latitude: number | null = null;
      let longitude: number | null = null;
      try {
        const pos = await Geolocation.getCurrentPosition({ timeout: 8000 });
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
      } catch {}

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

      setMessage({ text: `${TYPE_LABELS[type]} registrada com sucesso!`, type: 'success' });
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

  function generatePDF() {
    if (!reportRecords.length) return;
    const doc = new jsPDF();
    const userName = allUsers.find((u) => u.id === selectedUser)?.name ?? 'Funcionário';
    const [year, month] = reportMonth.split('-');
    const monthName = new Date(Number(year), Number(month) - 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

    doc.setFontSize(16);
    doc.text('ESPELHO DE PONTO', 105, 20, { align: 'center' });
    doc.setFontSize(11);
    doc.text(`Funcionário: ${userName}`, 14, 35);
    doc.text(`Período: ${monthName}`, 14, 43);
    doc.text(`Emitido em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 51);

    const grouped = groupByDay(reportRecords);
    let y = 65;
    let totalHours = 0;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Data', 14, y);
    doc.text('Entrada', 45, y);
    doc.text('Saída Alm.', 75, y);
    doc.text('Retorno', 107, y);
    doc.text('Saída', 137, y);
    doc.text('Total', 165, y);
    doc.setFont('helvetica', 'normal');
    y += 6;

    Object.entries(grouped).sort().forEach(([day, recs]) => {
      const byType: Record<string, string> = {};
      recs.forEach((r) => {
        byType[r.type] = new Date(r.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      });
      const hours = calcDayHours(recs);
      totalHours += hours;

      const dateStr = new Date(day + 'T12:00:00').toLocaleDateString('pt-BR');
      doc.text(dateStr, 14, y);
      doc.text(byType['entry'] ?? '-', 45, y);
      doc.text(byType['lunch_start'] ?? '-', 75, y);
      doc.text(byType['lunch_end'] ?? '-', 107, y);
      doc.text(byType['exit'] ?? '-', 137, y);
      doc.text(hours > 0 ? `${hours.toFixed(1)}h` : '-', 165, y);
      y += 7;

      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });

    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.text(`Total de horas trabalhadas no mês: ${totalHours.toFixed(1)}h`, 14, y);

    doc.save(`ponto-${userName.replace(/\s/g, '-')}-${reportMonth}.pdf`);
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRecords = records.filter((r) => r.timestamp.slice(0, 10) === todayStr);
  const nextType = getNextPunchType(todayRecords);
  const mySchedule = schedules.find((s) => s.role === user?.role);

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
          ...(isManager ? [{ key: 'gestor', label: 'Relatórios' }, { key: 'ajustes', label: 'Ajustes Pendentes' }] : []),
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
            {todayRecords.length === 0 ? (
              <p className="text-gray-400 text-sm">Nenhuma batida hoje.</p>
            ) : (
              <div className="space-y-2">
                {TYPE_ORDER.map((t) => {
                  const rec = todayRecords.find((r) => r.type === t);
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

          {Object.entries(groupByDay(records)).sort().reverse().map(([day, recs]) => {
            const hours = calcDayHours(recs);
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
                    const rec = recs.find((r) => r.type === t);
                    return (
                      <div key={t} className="flex justify-between text-sm py-1">
                        <span className="text-gray-500">{TYPE_LABELS[t]}</span>
                        {rec ? (
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${rec.status === 'adjustment_requested' ? 'text-orange-500' : 'text-gray-800'}`}>
                              {new Date(rec.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              {rec.status === 'adjustment_requested' && ' (ajuste pendente)'}
                            </span>
                            {rec.status !== 'adjustment_requested' && (
                              <button
                                onClick={() => setAdjustingRecord(rec)}
                                className="text-xs text-orange-400 hover:underline"
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

          {records.length === 0 && (
            <p className="text-center text-gray-400 py-8">Nenhum registro este mês.</p>
          )}
        </div>
      )}

      {/* TAB: RELATÓRIOS (GESTOR) */}
      {activeTab === 'gestor' && isManager && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow p-4 space-y-4">
            <p className="font-semibold text-gray-700">Gerar Relatório Mensal</p>
            <div className="flex gap-3 flex-wrap">
              <select
                value={selectedUser ?? ''}
                onChange={(e) => setSelectedUser(Number(e.target.value))}
                className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[180px]"
              >
                <option value="">Selecione o funcionário</option>
                {allUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                ))}
              </select>
              <input
                type="month"
                value={reportMonth}
                onChange={(e) => setReportMonth(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm"
              />
              <button
                onClick={() => selectedUser && fetchReport(selectedUser)}
                disabled={!selectedUser || loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {loading ? 'Carregando...' : 'Carregar'}
              </button>
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

          {reportRecords.length > 0 && (
            <div className="bg-white rounded-xl shadow p-4">
              <div className="flex justify-between items-center mb-4">
                <p className="font-semibold text-gray-700">
                  Resultado — {allUsers.find((u) => u.id === selectedUser)?.name}
                </p>
                <button
                  onClick={generatePDF}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
                >
                  Baixar PDF
                </button>
              </div>

              {Object.entries(groupByDay(reportRecords)).sort().map(([day, recs]) => {
                const hours = calcDayHours(recs);
                return (
                  <div key={day} className="flex justify-between items-center py-2 border-b border-gray-100 text-sm">
                    <span className="text-gray-600 w-32">
                      {new Date(day + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </span>
                    <div className="flex gap-4 flex-wrap text-gray-500">
                      {TYPE_ORDER.map((t) => {
                        const rec = recs.find((r) => r.type === t);
                        return (
                          <span key={t}>
                            {TYPE_LABELS[t].split(' ')[0]}: {rec ? new Date(rec.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </span>
                        );
                      })}
                    </div>
                    <span className="font-medium text-blue-600 w-12 text-right">{hours > 0 ? `${hours.toFixed(1)}h` : '—'}</span>
                  </div>
                );
              })}

              <div className="pt-3 text-right font-bold text-gray-800">
                Total: {Object.values(groupByDay(reportRecords)).reduce((sum, recs) => sum + calcDayHours(recs), 0).toFixed(1)}h
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: AJUSTES PENDENTES (GESTOR) */}
      {activeTab === 'ajustes' && isManager && (
        <div className="space-y-4">
          {adjustments.length === 0 ? (
            <p className="text-center text-gray-400 py-8">Nenhum ajuste pendente.</p>
          ) : (
            adjustments.map((adj) => (
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
    </div>
  );
}
