// import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import api from './api';

export const registerPushNotifications = async () => {
  // Desativado temporariamente para evitar erro de inicialização do Firebase
  console.log('Push Notifications: Desativado (Firebase não configurado)');
};

export const requestNotificationPermission = async () => {
  if (Capacitor.getPlatform() === 'web') return;
  await LocalNotifications.requestPermissions();
};

export const sendUpdateNotification = async (type: string, name: string) => {
  if (Capacitor.getPlatform() === 'web') return;

  const titles: Record<string, string> = {
    technical: 'Vistoria Atualizada',
    installation: 'Obra Atualizada',
    commercial: 'Proposta Atualizada'
  };

  await LocalNotifications.schedule({
    notifications: [
      {
        title: titles[type] || 'Atualização no Sistema',
        body: `O projeto de ${name} foi atualizado com sucesso.`,
        id: Math.floor(Math.random() * 10000),
        schedule: { at: new Date(Date.now() + 1000) },
        sound: 'default'
      }
    ]
  });
};

export const scheduleAgendaNotifications = async (events: any[]) => {
  if (Capacitor.getPlatform() === 'web') return;

  // Clear existing notifications first
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length > 0) {
    await LocalNotifications.cancel(pending);
  }

  const notifications = events
    .filter(event => !event.completed)
    .map(event => {
      const eventDate = new Date(event.event_date);
      const now = new Date();
      
      // Calculate schedule time: 1 hour before event
      const scheduleTime = new Date(eventDate.getTime() - 60 * 60 * 1000);
      
      if (scheduleTime > now) {
        return {
          title: `Lembrete: ${event.title}`,
          body: `Seu compromisso "${event.title}" começa em 1 hora.`,
          id: event.id,
          schedule: { at: scheduleTime },
          sound: 'default'
        };
      }
      return null;
    })
    .filter(n => n !== null);

  if (notifications.length > 0) {
    await LocalNotifications.schedule({ notifications: notifications as any });
  }
};

export const createNotificationChannel = async () => {
  if (Capacitor.getPlatform() !== 'android') return;
  
  await LocalNotifications.createChannel({
    id: 'default',
    name: 'Default',
    description: 'Canal padrão de notificações',
    importance: 5,
    visibility: 1,
    vibration: true
  });
};

export const checkAndNotify = async (homologacoes: any[], neoenergia: any[]) => {
  if (Capacitor.getPlatform() === 'web') return;

  const overdueHomolog = homologacoes.filter(p => 
    p.homologation_expected_date && 
    new Date(p.homologation_expected_date) < new Date() &&
    p.homologation_status !== 'connection_point_approved'
  );

  const overdueNeo = neoenergia.filter(p => 
    p.data_prevista && 
    new Date(p.data_prevista) < new Date() &&
    p.status === 'em_andamento'
  );

  if (overdueHomolog.length > 0 || overdueNeo.length > 0) {
    await LocalNotifications.schedule({
      notifications: [
        {
          title: 'Pendências Vencidas',
          body: `Existem ${overdueHomolog.length + overdueNeo.length} processos com prazo vencido.`,
          id: 999,
          schedule: { at: new Date(Date.now() + 1000) },
          sound: 'default'
        }
      ]
    });
  }
};
