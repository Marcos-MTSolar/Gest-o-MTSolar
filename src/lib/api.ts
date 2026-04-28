import axios from 'axios';
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

const baseURL = isNative
  ? import.meta.env.VITE_API_URL || 'http://localhost:3000'
  : '';  // no browser, usa URL relativa normalmente

const api = axios.create({ 
  baseURL,
  withCredentials: true
});

// Injeta o token JWT em todas as requisições se existir
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
