import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Upload, Image as ImageIcon, Lock, Save, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { user } = useAuth();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordMessage, setPasswordMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get('/api/settings');
      if (res.data.logo_url) {
        setLogoUrl(res.data.logo_url);
      }
    } catch (error) {
      console.error('Failed to fetch settings');
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('logo', file);

    setUploading(true);
    try {
      const res = await axios.post('/api/settings/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setLogoUrl(res.data.url);
      alert('Logomarca atualizada com sucesso!');
    } catch (error) {
      alert('Erro ao fazer upload da logomarca');
    } finally {
      setUploading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (passwords.new !== passwords.confirm) {
      setPasswordMessage({ type: 'error', text: 'As novas senhas não conferem' });
      return;
    }

    try {
      await axios.post('/api/auth/change-password', {
        currentPassword: passwords.current,
        newPassword: passwords.new
      });
      setPasswordMessage({ type: 'success', text: 'Senha alterada com sucesso!' });
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (error: any) {
      setPasswordMessage({ type: 'error', text: error.response?.data?.error || 'Erro ao alterar senha' });
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPassword(prev => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Configurações</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Change Password Section - Available to All */}
        <div className="bg-white p-6 rounded-xl shadow-sm h-fit">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Lock size={20} /> Alterar Senha
          </h2>
          
          {passwordMessage && (
            <div className={`mb-4 p-3 rounded-lg text-sm flex items-center gap-2 ${
              passwordMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {passwordMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              {passwordMessage.text}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha Atual</label>
              <div className="relative">
                <input 
                  type={showPassword.current ? "text" : "password"}
                  className="w-full border p-2 rounded pr-10"
                  value={passwords.current}
                  onChange={e => setPasswords({...passwords, current: e.target.value})}
                  required
                />
                <button 
                  type="button"
                  onClick={() => togglePasswordVisibility('current')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword.current ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
              <div className="relative">
                <input 
                  type={showPassword.new ? "text" : "password"}
                  className="w-full border p-2 rounded pr-10"
                  value={passwords.new}
                  onChange={e => setPasswords({...passwords, new: e.target.value})}
                  required
                />
                <button 
                  type="button"
                  onClick={() => togglePasswordVisibility('new')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword.new ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Nova Senha</label>
              <div className="relative">
                <input 
                  type={showPassword.confirm ? "text" : "password"}
                  className="w-full border p-2 rounded pr-10"
                  value={passwords.confirm}
                  onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                  required
                />
                <button 
                  type="button"
                  onClick={() => togglePasswordVisibility('confirm')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button 
              type="submit" 
              className="w-full bg-blue-900 text-white py-2 rounded hover:bg-blue-800 flex items-center justify-center gap-2"
            >
              <Save size={18} /> Salvar Nova Senha
            </button>
          </form>
        </div>

        {/* Logo Upload Section - CEO Only */}
        {user?.role === 'CEO' && (
          <div className="bg-white p-6 rounded-xl shadow-sm h-fit">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <ImageIcon size={20} /> Personalização
            </h2>
            
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-sm font-medium text-gray-700 mb-4">Logomarca do Sistema</h3>
              
              <div className="flex flex-col items-center gap-6">
                <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border border-gray-200 relative">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-4" />
                  ) : (
                    <ImageIcon className="w-16 h-16 text-gray-400" />
                  )}
                </div>
                
                <div className="w-full">
                  <p className="text-sm text-gray-500 mb-4 text-center">
                    Carregue uma imagem para substituir a logomarca padrão.
                    <br/>Recomendado: PNG fundo transparente.
                  </p>
                  
                  <label className="flex items-center justify-center w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors border border-gray-300">
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? 'Enviando...' : 'Carregar Nova Logo'}
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={uploading}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
