const EVOLUTION_URL = import.meta.env.VITE_EVOLUTION_URL;
const EVOLUTION_KEY = import.meta.env.VITE_EVOLUTION_KEY;
const INSTANCE_NAME = import.meta.env.VITE_EVOLUTION_INSTANCE;

export const evolutionApi = {
  sendMessage: async (phone: string, message: string) => {
    // Normalize URL to remove trailing slash and prevent double slashes
    const baseUrl = EVOLUTION_URL.endsWith('/') ? EVOLUTION_URL.slice(0, -1) : EVOLUTION_URL;
    const urlFinal = `${baseUrl}/message/sendText/${INSTANCE_NAME}`;
    
    console.log('Evolution URL:', urlFinal);

    const response = await fetch(urlFinal, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_KEY },
      body: JSON.stringify({ number: phone, text: message })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Erro Evolution API: ${response.status} - ${text}`);
    }

    return response.json();
  },

  getQRCode: async () => {
    const baseUrl = EVOLUTION_URL.endsWith('/') ? EVOLUTION_URL.slice(0, -1) : EVOLUTION_URL;
    const response = await fetch(`${baseUrl}/instance/connect/${INSTANCE_NAME}`, {
      headers: { 'apikey': EVOLUTION_KEY }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Erro Evolution API: ${response.status} - ${text}`);
    }

    return response.json();
  }
};
