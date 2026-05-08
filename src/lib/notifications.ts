import { LocalNotifications } from '@capacitor/local-notifications';

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
      id: 1001,
      title: '⚠️ Homologações com prazo vencido',
      body: `${overdueHomolog.length} projeto(s) precisam de atenção: ${overdueHomolog.map(p => p.client_name).join(', ')}`,
      schedule: { at: new Date(Date.now() + 1000) },
      sound: 'default',
      smallIcon: 'ic_stat_icon_config_sample',
      channelId: 'mtsolar-alerts'
    });
  }

  if (overdueProtocols.length > 0) {
    notifications.push({
      id: 1002,
      title: '⚠️ Protocolos Neoenergia vencidos',
      body: `${overdueProtocols.length} protocolo(s) com prazo vencido: ${overdueProtocols.map(p => p.client_name).join(', ')}`,
      schedule: { at: new Date(Date.now() + 2000) },
      sound: 'default',
      smallIcon: 'ic_stat_icon_config_sample',
      channelId: 'mtsolar-alerts'
    });
  }

  await LocalNotifications.schedule({ notifications });
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
