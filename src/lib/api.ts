import axios from 'axios';
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

// Em produção mobile, deve apontar para a URL pública da Vercel.
// Em desenvolvimento web, usa URL relativa (proxy do Vite).
// NUNCA deixar IPs de rede local aqui — o APK distribui esse valor embutido.
const baseURL = (window as any).Capacitor?.isNativePlatform()
  ? 'https://gest-o-mt-solar.vercel.app'
  : window.location.origin;

if (isNative && (baseURL.includes('192.168') || baseURL.includes('localhost'))) {
  console.error('[API] ATENÇÃO: baseURL aponta para IP local. O APK não vai funcionar fora da rede local.');
}

const api = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 15000,
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
