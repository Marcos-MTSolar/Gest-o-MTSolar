import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'motion/react';
import { Sun, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const [view, setView] = useState<'login' | 'forgot' | 'reset'>('login');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    axios.get('/api/settings').then(res => {
      if (res.data.logo_url) setLogoUrl(res.data.logo_url);
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await axios.post('/api/auth/login', { email, password });
      login(res.data.token, res.data.user);
      navigate('/');
    } catch (err: any) {
      if (err.response?.headers['content-type']?.includes('text/html')) {
        setError('Erro de conexão: O backend não está rodando ou a URL da API está incorreta.');
      } else {
        setError(err.response?.data?.error || 'Falha no login');
      }
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await axios.post('/api/auth/forgot-password', { email });
      alert(`${res.data.message}\n\n(Simulação de Email: Seu token é: ${res.data.token})`);
      if (res.data.token) {
        setResetToken(res.data.token);
        setView('reset');
      }
    } catch (err: any) {
      setError('Erro ao solicitar recuperação.');
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await axios.post('/api/auth/reset-password', { email, token: resetToken, newPassword });
      alert('Senha redefinida com sucesso! Faça login com sua nova senha.');
      setView('login');
      setPassword('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao redefinir senha.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-blue-900 p-8 text-center">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="mx-auto flex items-center justify-center mb-4"
          >
            {logoUrl ? (
              <div className="w-24 h-24 bg-white rounded-full p-2 flex items-center justify-center">
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-amber-400 rounded-full flex items-center justify-center">
                <Sun className="w-10 h-10 text-blue-900" />
              </div>
            )}
          </motion.div>
          <h2 className="text-3xl font-bold text-white mt-2">MT Solar</h2>
          <p className="text-blue-200 mt-2">
            {view === 'login' && 'Acesse sua conta'}
            {view === 'forgot' && 'Recuperar Senha'}
            {view === 'reset' && 'Redefinir Senha'}
          </p>
        </div>
        
        <div className="p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          {view === 'login' && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="seu@email.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all pr-10"
                    placeholder="••••••••"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <div className="flex justify-end mt-1">
                  <button 
                    type="button"
                    onClick={() => setView('forgot')}
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Esqueci minha senha
                  </button>
                </div>
              </div>
              
              <button
                type="submit"
                className="w-full bg-blue-900 text-white py-3 rounded-lg font-semibold hover:bg-blue-800 transition-colors shadow-md hover:shadow-lg"
              >
                Entrar
              </button>
            </form>
          )}

          {view === 'forgot' && (
            <form onSubmit={handleForgot} className="space-y-6">
              <p className="text-sm text-gray-600 mb-4">Digite seu email para receber um link de recuperação de senha.</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="seu@email.com"
                />
              </div>
              
              <button
                type="submit"
                className="w-full bg-blue-900 text-white py-3 rounded-lg font-semibold hover:bg-blue-800 transition-colors shadow-md hover:shadow-lg"
              >
                Enviar Link
              </button>
              <button
                type="button"
                onClick={() => setView('login')}
                className="w-full text-gray-600 py-2 hover:text-gray-800"
              >
                Voltar para Login
              </button>
            </form>
          )}

          {view === 'reset' && (
            <form onSubmit={handleReset} className="space-y-6">
              <p className="text-sm text-gray-600 mb-4">Defina sua nova senha.</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Token de Recuperação</label>
                <input
                  type="text"
                  required
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-gray-50"
                  placeholder="Token"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="Nova senha"
                />
              </div>
              
              <button
                type="submit"
                className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-md hover:shadow-lg"
              >
                Redefinir Senha
              </button>
              <button
                type="button"
                onClick={() => setView('login')}
                className="w-full text-gray-600 py-2 hover:text-gray-800"
              >
                Cancelar
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
