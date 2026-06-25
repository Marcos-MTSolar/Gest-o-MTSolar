import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Wrench,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  X,
  ShoppingCart,
  CheckSquare,
  Archive,
  Bell,
  Hammer,
  Calendar,
  Package,
  FileSpreadsheet,
  FileSignature,
  MessageCircle,
  ClipboardList,
  Zap,
  FileCheck,
  Clock,
  Table
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import api from '../lib/api';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { messages: socketMessages } = useSocket();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevMessagesLength = useRef(0);

  useEffect(() => {
    api.get('/api/settings').then(res => {
      if (res.data.logo_url) setLogoUrl(res.data.logo_url);
    }).catch(() => { });

    // Check for unread messages on mount
    checkUnreadMessages();

    // Check for unread messages on mount
    checkUnreadMessages();
  }, []);

  const checkUnreadMessages = async () => {
    try {
      const res = await api.get('/api/messages');
      if (res.data.length > 0) {
        const latestMsg = res.data[res.data.length - 1]; // Last message in the list (which is reversed in API? No, API returns reverse, so [0] is latest? Let's check API)
        // API: ORDER BY m.created_at DESC LIMIT 50. Then res.json(messages.reverse()). 
        // So the response is [oldest, ..., newest].
        // So the last element is the newest.

        const lastReadId = localStorage.getItem('lastReadMessageId');
        if (!lastReadId || latestMsg.id > parseInt(lastReadId)) {
          setUnreadCount(prev => prev + 1); // Just mark as having unread
        }
      }
    } catch (e) { }
  };

  useEffect(() => {
    if (location.pathname === '/messages') {
      setUnreadCount(0);
      // Update last read message ID
      api.get('/api/messages').then(res => {
        if (res.data.length > 0) {
          const latestMsg = res.data[res.data.length - 1];
          localStorage.setItem('lastReadMessageId', latestMsg.id.toString());
        }
      });
    }
  }, [location.pathname]);

  useEffect(() => {
    // If new socket message arrives
    if (socketMessages.length > prevMessagesLength.current) {
      const newMessages = socketMessages.slice(prevMessagesLength.current);
      const hasOtherUserMessage = newMessages.some(m => m.sender_id !== user?.id);

      if (hasOtherUserMessage && location.pathname !== '/messages') {
        setUnreadCount(prev => prev + 1);
      }
      prevMessagesLength.current = socketMessages.length;
    }
  }, [socketMessages, location.pathname, user?.id]);

  const toggleSidebar = () => setIsOpen(!isOpen);

  const handleNavClick = () => {
    if (window.innerWidth < 768) {
      setIsOpen(false);
    }
  };

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['CEO', 'ADMIN', 'COMMERCIAL', 'TECHNICAL'] },
    { name: 'Comercial', path: '/commercial', icon: Briefcase, roles: ['CEO', 'ADMIN', 'COMMERCIAL'] },
    { name: 'Atendimento', path: '/whatsapp', icon: MessageCircle, roles: ['CEO', 'ADMIN', 'COMMERCIAL'] },
    { name: 'Reg. Atendimentos', path: '/registro-atendimentos', icon: Table, roles: ['CEO', 'ADMIN', 'COMMERCIAL'] },
    { name: 'Agenda', path: '/agenda', icon: Calendar, roles: ['CEO', 'ADMIN', 'COMMERCIAL'] },
    { name: 'Cronograma', path: '/cronograma', icon: Calendar, roles: ['CEO', 'ADMIN', 'COMMERCIAL', 'TECHNICAL'] },
    { name: 'Protocolos Neoenergia', path: '/neoenergia', icon: ClipboardList, roles: ['CEO', 'ADMIN'] },
    { name: 'Gerador de Proposta', path: '/proposal-generator', icon: FileSpreadsheet, roles: ['CEO', 'ADMIN', 'COMMERCIAL'] },
    { name: 'Calculadora', path: '/calculadora', icon: Zap, roles: ['CEO', 'ADMIN', 'COMMERCIAL', 'TECHNICAL'] },
    { name: 'Ponto Eletrônico', path: '/ponto', icon: Clock, roles: ['CEO', 'ADMIN', 'COMMERCIAL', 'TECHNICAL'] },
    { name: 'Kit Solar', path: '/kit-purchase', icon: ShoppingCart, roles: ['CEO', 'ADMIN'] },
    { name: 'Contratos', path: '/contracts', icon: FileSignature, roles: ['CEO', 'ADMIN'] },
    { name: 'Técnica', path: '/technical', icon: Wrench, roles: ['CEO', 'ADMIN', 'TECHNICAL', 'COMMERCIAL'] },
    { name: 'Homologação', path: '/homologation', icon: FileCheck, roles: ['CEO', 'ADMIN', 'COMMERCIAL'] },
    { name: 'Obra', path: '/obra', icon: Hammer, roles: ['CEO', 'ADMIN', 'TECHNICAL'] },
    { name: 'Estoque', path: '/estoque', icon: Package, roles: ['CEO', 'ADMIN'] },
    { name: 'Finalizados', path: '/finished', icon: Archive, roles: ['CEO', 'ADMIN'] },
    { name: 'Mensagens', path: '/messages', icon: MessageSquare, roles: ['CEO', 'ADMIN', 'TECHNICAL'] },
    { name: 'Funcionários', path: '/funcionarios', icon: Users, roles: ['CEO', 'ADMIN'] },
    { name: 'Usuários', path: '/users', icon: Users, roles: ['CEO', 'ADMIN'] },
    { name: 'Configurações', path: '/settings', icon: Settings, roles: ['CEO', 'ADMIN'] },
  ];

  const isCommercial = user?.role?.toUpperCase() === 'COMMERCIAL';
  const filteredItems = menuItems.filter(item => {
    const hasRole = !item.roles || item.roles.includes(user?.role || '');
    if (isCommercial) {
      // Vendedor: Dashboard, Comercial, Atendimento, Agenda, Gerador de Proposta, Calculadora, Ponto Eletrônico e Técnica
      const allowedPaths = ['/', '/whatsapp', '/registro-atendimentos', '/agenda', '/proposal-generator', '/calculadora', '/ponto', '/commercial', '/technical'];
      return allowedPaths.includes(item.path);
    }
    return hasRole;
  });

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-blue-900 text-white transform transition-all duration-300 ease-in-out flex flex-col group overflow-hidden",
          "w-64 md:w-16 hover:md:w-64 lg:w-64",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "md:translate-x-0 md:static"
        )}
      >
        <div className="flex items-center h-20 bg-blue-950 px-4 gap-3 whitespace-nowrap overflow-hidden">
          {logoUrl && (
            <img src={logoUrl} alt="MT Solar" className="h-10 w-auto object-contain bg-white rounded p-1 shrink-0" />
          )}
          <span className="text-xl font-bold text-amber-400 transition-opacity duration-300 md:opacity-0 md:group-hover:opacity-100 lg:opacity-100">
            MT Solar
          </span>
          <button onClick={toggleSidebar} className="md:hidden absolute right-4 text-white shrink-0">
            <X size={24} />
          </button>
        </div>

        <div className="flex flex-col justify-between h-[calc(100%-5rem)] overflow-hidden">
          <nav className="flex-1 px-2 py-4 space-y-2 overflow-y-auto custom-scrollbar">
            {filteredItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors relative whitespace-nowrap overflow-hidden",
                  location.pathname === item.path
                    ? "bg-blue-800 text-amber-400"
                    : "text-gray-300 hover:bg-blue-800 hover:text-white"
                )}
                onClick={() => { if (window.innerWidth < 768) setIsOpen(false); }}
              >
                <item.icon className="w-5 h-5 mr-3 shrink-0" />
                <span className="transition-opacity duration-300 md:opacity-0 md:group-hover:opacity-100 lg:opacity-100">
                  {item.name}
                </span>
                {item.name === 'Mensagens' && unreadCount > 0 && (
                  <span className="absolute right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center transition-opacity duration-300 md:opacity-0 md:group-hover:opacity-100 lg:opacity-100">
                    {unreadCount}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t border-blue-800 whitespace-nowrap overflow-hidden">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center text-blue-900 font-bold shrink-0">
                {user?.name.charAt(0)}
              </div>
              <div className="ml-3 transition-opacity duration-300 md:opacity-0 md:group-hover:opacity-100 lg:opacity-100">
                <p className="text-sm font-medium text-white">{user?.name}</p>
                <p className="text-xs text-gray-400">
                  {user?.role === 'ADMIN' ? 'Administrador' :
                   user?.role === 'COMMERCIAL' ? 'Comercial' :
                   user?.role === 'TECHNICAL' ? 'Técnico' :
                   user?.role}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                if (window.innerWidth < 768) setIsOpen(false);
                logout();
              }}
              className="flex items-center w-full px-2 py-2 text-sm text-gray-300 hover:bg-blue-800 hover:text-white rounded-lg transition-colors overflow-hidden"
            >
              <LogOut className="w-5 h-5 mr-3 shrink-0" />
              <span className="transition-opacity duration-300 md:opacity-0 md:group-hover:opacity-100 lg:opacity-100">
                Sair
              </span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        <header className="flex items-center justify-between h-16 px-4 md:px-6 bg-white border-b border-gray-200">
          <div className="flex items-center md:hidden">
            <button onClick={toggleSidebar} className="text-gray-500 focus:outline-none mr-3">
              <Menu size={24} />
            </button>
            <div className="flex items-center gap-2">
              {logoUrl && <img src={logoUrl} alt="MT Solar" className="h-7 w-auto object-contain bg-white rounded p-1 shadow-sm border border-gray-100" />}
              <span className="text-base font-bold text-blue-900">MT Solar</span>
            </div>
          </div>

          <div className="flex items-center justify-end w-full gap-4">
            {/* Desktop Logo & User */}
            <div className="hidden md:flex items-center gap-3 mr-4 border-r pr-4">
              <div className="text-right">
                <p className="text-sm font-bold text-gray-800">{user?.name}</p>
                <p className="text-xs text-gray-500">
                  {user?.role === 'ADMIN' ? 'Administrador' :
                   user?.role === 'COMMERCIAL' ? 'Comercial' :
                   user?.role === 'TECHNICAL' ? 'Técnico' :
                   user?.role}
                </p>
              </div>
              {logoUrl ? (
                <img src={logoUrl} alt="MT Solar Logo" className="h-10 w-auto object-contain bg-white rounded-lg p-1 border border-gray-200 shadow-sm" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-900 font-bold">
                  {user?.name.charAt(0)}
                </div>
              )}
            </div>

            <button className="relative p-2 text-gray-500 hover:text-blue-900 transition-colors">
              <Bell size={24} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </button>
            <button
              onClick={logout}
              className="p-2 text-gray-500 hover:text-red-600 transition-colors flex items-center gap-2"
              title="Sair"
            >
              <LogOut size={24} />
              <span className="hidden md:inline text-sm font-medium">Sair</span>
            </button>
          </div>
        </header>

        <main id="main-scroll-container" className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-3 md:p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>

          <footer className="mt-8 border-t-2 border-amber-400 pt-3 pb-4 px-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-blue-900">MT SOLAR — ENERGIA RENOVÁVEL</p>
                <p className="text-xs text-gray-600">mtsolar.energia@gmail.com | @mtsolar_</p>
                <p className="text-xs text-gray-600">Rua Rossini Roosevelt de Albuquerque, nº10 - Piedade, Jaboatão dos Guararapes - PE</p>
                <p className="text-xs text-gray-600">(81) 99700-3260 | (81) 99951-7110</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Sistema de Gestão</p>
                <p className="text-sm font-bold text-blue-900">MT Solar © {new Date().getFullYear()}</p>
              </div>
            </div>
          </footer>
        </main>
      </div>

      {/* Overlay for mobile sidebar */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden"
          onClick={toggleSidebar}
        ></div>
      )}
    </div>
  );
}
