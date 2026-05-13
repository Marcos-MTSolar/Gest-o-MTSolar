const EVOLUTION_URL = import.meta.env.VITE_EVOLUTION_URL || '';
const EVOLUTION_KEY = import.meta.env.VITE_EVOLUTION_KEY || '';
const INSTANCE_ADMIN = import.meta.env.VITE_EVOLUTION_INSTANCE_ADMIN || import.meta.env.VITE_EVOLUTION_INSTANCE || 'mtsolar';
const INSTANCE_ATENDIMENTO = import.meta.env.VITE_EVOLUTION_INSTANCE_ATENDIMENTO || 'atendimento-cliente';
const TOKEN_ATENDIMENTO = import.meta.env.VITE_EVOLUTION_TOKEN_ATENDIMENTO || '';

export const evolutionApi = {
  sendMessage: async (phone: string, message: string, instanceName?: string) => {
    const instance = instanceName || INSTANCE_ATENDIMENTO;
    // Use instance specific token if it's atendimento-cliente, otherwise use global key
    const apikey = (instance === INSTANCE_ATENDIMENTO && TOKEN_ATENDIMENTO) ? TOKEN_ATENDIMENTO : EVOLUTION_KEY;

    if (!EVOLUTION_URL || !apikey || !instance) {
      throw new Error("Configuração da Evolution API incompleta.");
    }

    const baseUrl = EVOLUTION_URL.endsWith('/') ? EVOLUTION_URL.slice(0, -1) : EVOLUTION_URL;
    const urlFinal = `${baseUrl}/message/sendText/${instance}`;
    
    const response = await fetch(urlFinal, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': apikey },
      body: JSON.stringify({ number: phone, text: message })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Erro Evolution API: ${response.status} - ${text}`);
    }

    return response.json();
  },

  getQRCode: async (instanceName?: string) => {
    const instance = instanceName || INSTANCE_ADMIN;
    const apikey = (instance === INSTANCE_ATENDIMENTO && TOKEN_ATENDIMENTO) ? TOKEN_ATENDIMENTO : EVOLUTION_KEY;

    if (!EVOLUTION_URL || !apikey || !instance) {
      throw new Error("Configuração da Evolution API incompleta.");
    }

    const baseUrl = EVOLUTION_URL.endsWith('/') ? EVOLUTION_URL.slice(0, -1) : EVOLUTION_URL;
    const response = await fetch(`${baseUrl}/instance/connect/${instance}`, {
      headers: { 'apikey': apikey }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Erro Evolution API: ${response.status} - ${text}`);
    }

    return response.json();
  },

  sendAudio: async (phone: string, audioBase64: string, instanceName?: string) => {
    const instance = instanceName || INSTANCE_ATENDIMENTO;
    const apikey = (instance === INSTANCE_ATENDIMENTO && TOKEN_ATENDIMENTO) ? TOKEN_ATENDIMENTO : EVOLUTION_KEY;
    const baseUrl = EVOLUTION_URL.endsWith('/') ? EVOLUTION_URL.slice(0, -1) : EVOLUTION_URL;

    const response = await fetch(`${baseUrl}/message/sendWhatsAppAudio/${instance}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': apikey },
      body: JSON.stringify({
        number: phone,
        audio: audioBase64,
        delay: 1200,
        encoding: true
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Erro Evolution API: ${response.status} - ${text}`);
    }
    return response.json();
  },

  sendMedia: async (phone: string, mediaBase64: string, fileName: string, mediaType: 'image' | 'video' | 'document', caption?: string, instanceName?: string) => {
    const instance = instanceName || INSTANCE_ATENDIMENTO;
    const apikey = (instance === INSTANCE_ATENDIMENTO && TOKEN_ATENDIMENTO) ? TOKEN_ATENDIMENTO : EVOLUTION_KEY;
    const baseUrl = EVOLUTION_URL.endsWith('/') ? EVOLUTION_URL.slice(0, -1) : EVOLUTION_URL;

    const response = await fetch(`${baseUrl}/message/sendMedia/${instance}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': apikey },
      body: JSON.stringify({
        number: phone,
        mediaMessage: {
          mediatype: mediaType,
          caption: caption || '',
          media: mediaBase64,
          fileName: fileName
        }
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Erro Evolution API: ${response.status} - ${text}`);
    }
    return response.json();
  },

  instances: {
    ADMIN: INSTANCE_ADMIN,
    ATENDIMENTO: INSTANCE_ATENDIMENTO
  }
};
