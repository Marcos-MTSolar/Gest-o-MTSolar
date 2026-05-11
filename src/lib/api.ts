import axios from 'axios';
import { Capacitor } from '@capacitor/core';

const isNative = typeof window !== 'undefined' && (Capacitor.isNativePlatform() || (window as any).Capacitor?.isNativePlatform?.());

const baseURL = isNative
  ? 'https://gest-o-mt-solar.vercel.app'
  : (typeof window !== 'undefined' ? window.location.origin : '');

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
