const EVOLUTION_URL = import.meta.env.VITE_EVOLUTION_URL;
const EVOLUTION_KEY = import.meta.env.VITE_EVOLUTION_KEY;
const INSTANCE_NAME = import.meta.env.VITE_EVOLUTION_INSTANCE;

export const evolutionApi = {
  sendMessage: async (phone: string, message: string) => {
    const response = await fetch(`${EVOLUTION_URL}/message/sendText/${INSTANCE_NAME}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_KEY },
      body: JSON.stringify({ number: phone, text: message })
    });
    return response.json();
  },

  getQRCode: async () => {
    const response = await fetch(`${EVOLUTION_URL}/instance/connect/${INSTANCE_NAME}`, {
      headers: { 'apikey': EVOLUTION_KEY }
    });
    return response.json();
  }
};
