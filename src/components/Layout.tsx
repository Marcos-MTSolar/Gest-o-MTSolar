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
  FileText,
  ShoppingCart,
  CheckSquare,
  Archive,
  Bell,
  Hammer,
  Calendar
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import axios from 'axios';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { messages: socketMessages } = useSocket();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevMessagesLength = useRef(0);

  useEffect(() => {
    axios.get('/api/settings').then(res => {
      if (res.data.logo_url) setLogoUrl(res.data.logo_url);
    }).catch(() => {});
    
    // Check for unread messages on mount
    checkUnreadMessages();
  }, []);

  const checkUnreadMessages = async () => {
    try {
      const res = await axios.get('/api/messages');
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
    } catch (e) {}
  };

  useEffect(() => {
    if (location.pathname === '/messages') {
      setUnreadCount(0);
      // Update last read message ID
      axios.get('/api/messages').then(res => {
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

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['CEO', 'ADMIN', 'COMMERCIAL', 'TECHNICAL'] },
    { name: 'Agenda', path: '/agenda', icon: Calendar, roles: ['CEO', 'ADMIN', 'COMMERCIAL', 'TECHNICAL'] },
    { name: 'Usuários', path: '/users', icon: Users, roles: ['CEO', 'ADMIN'] },
    { name: 'Comercial', path: '/commercial', icon: Briefcase, roles: ['CEO', 'ADMIN', 'COMMERCIAL'] },
    { name: 'Técnica', path: '/technical', icon: Wrench, roles: ['CEO', 'ADMIN', 'TECHNICAL'] },
    { name: 'Obra Finalizada', path: '/installation', icon: Hammer, roles: ['CEO', 'ADMIN', 'TECHNICAL'] },
    { name: 'Documentação', path: '/documents', icon: FileText, roles: ['CEO', 'ADMIN'] },
    { name: 'Kit Solar', path: '/kit-purchase', icon: ShoppingCart, roles: ['CEO', 'ADMIN'] },
    { name: 'Homologação', path: '/homologation', icon: CheckSquare, roles: ['CEO', 'ADMIN'] },
    { name: 'Finalizados', path: '/finished', icon: Archive, roles: ['CEO', 'ADMIN'] },
    { name: 'Mensagens', path: '/messages', icon: MessageSquare, roles: ['CEO', 'ADMIN', 'COMMERCIAL', 'TECHNICAL'] },
    { name: 'Configurações', path: '/settings', icon: Settings, roles: ['CEO', 'ADMIN', 'COMMERCIAL', 'TECHNICAL'] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(user?.role || ''));

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-blue-900 text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-center h-20 bg-blue-950 px-4 gap-3">
          {logoUrl && (
            <img src={logoUrl} alt="MT Solar" className="h-10 w-auto object-contain bg-white rounded p-1" />
          )}
          <span className="text-xl font-bold text-amber-400">MT Solar</span>
          <button onClick={toggleSidebar} className="lg:hidden absolute right-4 text-white">
            <X size={24} />
          </button>
        </div>
        
        <div className="flex flex-col justify-between h-[calc(100%-5rem)]">
          <nav className="flex-1 px-2 py-4 space-y-2">
            {filteredItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors relative",
                  location.pathname === item.path 
                    ? "bg-blue-800 text-amber-400" 
                    : "text-gray-300 hover:bg-blue-800 hover:text-white"
                )}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
                {item.name === 'Mensagens' && unreadCount > 0 && (
                  <span className="absolute right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t border-blue-800">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center text-blue-900 font-bold">
                {user?.name.charAt(0)}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-white">{user?.name}</p>
                <p className="text-xs text-gray-400">{user?.role}</p>
              </div>
            </div>
            <button 
              onClick={logout}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-blue-800 hover:text-white rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Sair
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between h-16 px-6 bg-white border-b border-gray-200">
          <div className="flex items-center lg:hidden">
            <button onClick={toggleSidebar} className="text-gray-500 focus:outline-none mr-4">
              <Menu size={24} />
            </button>
            <div className="flex items-center gap-2">
              {logoUrl && <img src={logoUrl} alt="MT Solar" className="h-8 w-auto object-contain" />}
              <span className="text-lg font-semibold text-blue-900">MT Solar</span>
            </div>
          </div>
          
          <div className="flex items-center justify-end w-full gap-4">
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

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
      
      {/* Overlay for mobile sidebar */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={toggleSidebar}
        ></div>
      )}
    </div>
  );
}
