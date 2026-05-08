import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export async function requestNotificationPermission() {
  if (!Capacitor.isNativePlatform()) return;
  const { display } = await LocalNotifications.requestPermissions();
  return display === 'granted';
}

export async function scheduleAgendaNotifications(events: any[]) {
  if (!Capacitor.isNativePlatform()) return;

  // Cancela todas as notificações de agenda antigas
  const pending = await LocalNotifications.getPending();
  const agendaIds = pending.notifications
    .filter(n => n.id >= 1000 && n.id < 2000)
    .map(n => ({ id: n.id }));
  if (agendaIds.length > 0) await LocalNotifications.cancel({ notifications: agendaIds });

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Filtra eventos de hoje
  const todayEvents = events.filter(e => e.event_date?.startsWith(todayStr) && !e.completed);
  if (todayEvents.length === 0) return;

  const resumo = todayEvents.map(e => `• ${e.title}`).join('\n');
  const corpo = `Você tem ${todayEvents.length} compromisso(s) hoje:\n${resumo}`;

  // Horários: 06:30, 07:30 e 09:30
  const horarios = [
    { hora: 6, minuto: 30, id: 1001 },
    { hora: 7, minuto: 30, id: 1002 },
    { hora: 9, minuto: 30, id: 1003 },
  ];

  const notificacoes = horarios.map(h => {
    const data = new Date();
    data.setHours(h.hora, h.minuto, 0, 0);
    // Se o horário já passou hoje, não agenda
    if (data <= new Date()) return null;
    return {
      id: h.id,
      title: '📅 Agenda do Dia — MT Solar',
      body: corpo,
      schedule: { at: data },
      sound: 'default',
      smallIcon: 'ic_notification',
      actionTypeId: '',
      extra: null,
    };
  }).filter(Boolean) as any[];

  if (notificacoes.length > 0) {
    await LocalNotifications.schedule({ notifications: notificacoes });
  }
}

export const sendUpdateNotification = async (aba: string, cliente: string) => {
  if (!Capacitor.isNativePlatform()) return;
  const titulos: { [key: string]: string } = {
    technical: '🔧 Aba Técnica atualizada',
    finished: '✅ Obra Finalizada',
    homologation: '📋 Homologação atualizada',
    commercial: '💼 Aba Comercial atualizada',
  };

  await LocalNotifications.schedule({
    notifications: [{
      id: Math.floor(Math.random() * 8000) + 2000,
      title: titulos[aba] || '🔔 Atualização MT Solar',
      body: `${cliente} teve status atualizado.`,
      schedule: { at: new Date(Date.now() + 1000) },
      sound: 'default',
      smallIcon: 'ic_notification',
      actionTypeId: '',
      extra: null,
    }]
  });
};

export const createNotificationChannel = async () => {
  await LocalNotifications.createChannel({
    id: 'mtsolar-alerts',
    name: 'Alertas MTSolar',
    importance: 5,
    visibility: 1,
    vibration: true,
    sound: 'default'
  });
};

export const checkAndNotify = async (
  homologacoes: any[],
  protocolos: any[]
) => {
  const today = new Date(new Date().toISOString().split('T')[0]);

  const overdueHomolog = homologacoes.filter(p =>
    p.homologation_expected_date &&
    ['technical_analysis','waiting_inspection','performing_inspection']
      .includes(p.homologation_status) &&
    new Date(p.homologation_expected_date) < today
  );

  const overdueProtocols = protocolos.filter(p =>
    p.data_prevista &&
    p.status === 'em_andamento' &&
    new Date(p.data_prevista) < today
  );

  const total = overdueHomolog.length + overdueProtocols.length;
  if (total === 0) return;

  const permission = await LocalNotifications.requestPermissions();
  if (permission.display !== 'granted') return;

  const notifications = [];

  if (overdueHomolog.length > 0) {
    notifications.push({
      id: 3001,
      title: '⚠️ Homologações com prazo vencido',
      body: `${overdueHomolog.length} projeto(s) precisam de atenção: ${overdueHomolog.map(p => p.client_name).join(', ')}`,
      schedule: { at: new Date(Date.now() + 1000) },
      sound: 'default',
      smallIcon: 'ic_notification',
      channelId: 'mtsolar-alerts'
    });
  }

  if (overdueProtocols.length > 0) {
    notifications.push({
      id: 3002,
      title: '⚠️ Protocolos Neoenergia vencidos',
      body: `${overdueProtocols.length} protocolo(s) com prazo vencido: ${overdueProtocols.map(p => p.client_name).join(', ')}`,
      schedule: { at: new Date(Date.now() + 2000) },
      sound: 'default',
      smallIcon: 'ic_notification',
      channelId: 'mtsolar-alerts'
    });
  }

  await LocalNotifications.schedule({ notifications });
};
