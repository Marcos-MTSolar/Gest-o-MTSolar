import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { evolutionApi } from '../lib/whatsapp';
import { useAuth } from '../context/AuthContext';
import { 
  Send, 
  User, 
  Phone, 
  Clock, 
  MessageCircle, 
  Search, 
  MoreVertical, 
  CheckCircle2, 
  Timer, 
  Lock,
  ArrowLeft,
  Settings,
  LogOut,
  UserPlus,
  RefreshCcw,
  Check,
  Pencil,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import api from '../lib/api';

interface Message {
  id: string;
  conversation_id: string;
  phone: string;
  message: string;
  from_me: boolean;
  timestamp: string;
  status: string;
}

interface Conversation {
  id: string;
  phone: string;
  contact_name: string;
  last_message: string;
  last_message_at: string;
  status: 'waiting' | 'in_progress' | 'closed';
  assigned_to: number | null;
  assigned_name: string | null;
  assigned_at: string | null;
  token?: string;
}

export default function WhatsApp() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [availableAgents, setAvailableAgents] = useState<any[]>([]);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [isSending, setIsSending] = useState(false);
  const isAdmin = user?.role?.toUpperCase() === 'CEO' || user?.role?.toUpperCase() === 'ADMIN';
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
    fetchAgents();

    const conversationSubscription = supabase
      .channel('whatsapp_conversations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_conversations' }, (payload) => {
        fetchConversations();
        
        // Se a conversa selecionada mudou e no  mais autorizada, desceleciona
        if (selectedConversation && payload.new && (payload.new as any).id === selectedConversation.id) {
          const newConv = payload.new as Conversation;

          if (newConv.status === 'in_progress' && Number(newConv.assigned_to) !== Number(user?.id) && !isAdmin) {
            setSelectedConversation(null);
            alert("Este atendimento foi assumido por outro agente.");
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(conversationSubscription);
    };
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      const hasAccess =
        selectedConversation.status === 'waiting' ||
        selectedConversation.status === 'closed' ||
        Number(selectedConversation.assigned_to) === Number(user?.id) ||
        isAdmin;

      if (!hasAccess) {
        setSelectedConversation(null);
        return;
      }

      fetchMessages(selectedConversation.id);

      const messageSubscription = supabase
        .channel(`whatsapp_messages:${selectedConversation.id}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'whatsapp_messages',
          filter: `conversation_id=eq.${selectedConversation.id}`
        }, (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(messageSubscription);
      };
    } else {
      setMessages([]);
    }
  }, [selectedConversation?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  const fetchConversations = async () => {
    const { data, error } = await supabase
      .from('whatsapp_conversations')
      .select('*')
      .eq('company_id', user?.company_id)
      .order('last_message_at', { ascending: false });

    if (!error && data) {
      setConversations(data);
    }
    setLoading(false);
  };

  const fetchAgents = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, name')
      .eq('company_id', user?.company_id)
      .neq('id', user?.id);
    
    if (!error && data) {
      setAvailableAgents(data);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('timestamp', { ascending: true });

    if (!error && data) {
      setMessages(data);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || !user) return;

    if (selectedConversation.status !== 'in_progress' || (Number(selectedConversation.assigned_to) !== Number(user.id) && !isAdmin)) {
      alert("Você precisa assumir este atendimento para enviar mensagens.");
      return;
    }

    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      // 1. Enviar via Evolution API
      const result = await evolutionApi.sendMessage(selectedConversation.phone, messageText);
      
      // 2. Salvar no Supabase
      const { error } = await supabase.from('whatsapp_messages').insert({
        conversation_id: selectedConversation.id,
        phone: selectedConversation.phone,
        message: messageText,
        from_me: true,
        message_id: result.key?.id || `sent-${Date.now()}`,
        timestamp: new Date().toISOString()
      });

      if (error) throw error;

      // 3. Atualizar última mensagem na conversa
      await supabase.from('whatsapp_conversations').update({
        last_message: messageText,
        last_message_at: new Date().toISOString()
      })
      .eq('id', selectedConversation.id)
      .eq('company_id', user.company_id);

    } catch (error: any) {
      console.error("Erro ao enviar mensagem:", error);
      const msg = error?.response?.data?.error || error?.message || "Falha ao enviar mensagem.";
      alert(msg);
    }
  };

  const updateContactName = async () => {
    if (!selectedConversation || !tempName.trim()) return;

    const { error } = await supabase
      .from('whatsapp_conversations')
      .update({ contact_name: tempName.trim() })
      .eq('id', selectedConversation.id)
      .eq('company_id', user?.company_id);

    if (!error) {
      setSelectedConversation({ ...selectedConversation, contact_name: tempName.trim() });
      setIsEditingName(false);
      fetchConversations();
    }
  };

  const transferTicket = async (agentId: number | string, agentName: string) => {
    if (!selectedConversation) return;

    const { error } = await supabase
      .from('whatsapp_conversations')
      .update({
        assigned_to: agentId,
        assigned_name: agentName,
        assigned_at: new Date().toISOString()
      })
      .eq('id', selectedConversation.id)
      .eq('company_id', user?.company_id);

    if (!error) {
      setSelectedConversation(null);
      setShowTransferModal(false);
      fetchConversations();
      alert(`Ticket transferido para ${agentName}`);
    }
  };

  const assumeConversation = async (conversation: Conversation) => {
    if (!user) return;
    
    if (window.confirm("Deseja assumir este atendimento?")) {
      try {
        await api.post('/api/whatsapp/assume', {
          conversationId: conversation.id,
          userId: user.id
        });

        // Buscar conversa atualizada direto do Supabase com todos os campos
        const { data, error } = await supabase
          .from('whatsapp_conversations')
          .select('*')
          .eq('id', conversation.id)
          .eq('company_id', user.company_id)
          .single();

        if (!error && data) {
          setSelectedConversation(data);
          fetchConversations();
        }
      } catch (error: any) {
        console.error("Erro ao assumir conversa:", error);
        alert(error.response?.data?.error || "Não foi possível assumir este atendimento.");
        fetchConversations();
      }
    }
  };

  const closeConversation = async () => {
    if (!selectedConversation) return;
    
    if (window.confirm("Deseja encerrar este atendimento?")) {
      const { error } = await supabase
        .from('whatsapp_conversations')
        .update({
          status: 'closed',
          assigned_to: null,
          assigned_name: null,
          assigned_at: null
        })
        .eq('id', selectedConversation.id)
        .eq('company_id', user?.company_id);

      if (!error) {
        setSelectedConversation(null);
        fetchConversations();
      }
    }
  };

  const reopenConversation = async () => {
    if (!selectedConversation) return;
    
    const { error } = await supabase
      .from('whatsapp_conversations')
      .update({
        status: 'waiting'
      })
      .eq('id', selectedConversation.id)
      .eq('company_id', user?.company_id);

    if (!error) {
      const { data } = await supabase.from('whatsapp_conversations').select('*').eq('id', selectedConversation.id).eq('company_id', user?.company_id).single();
      setSelectedConversation(data);
      fetchConversations();
    }
  };



  const allFiltered = conversations.filter(conv =>
    (conv.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     conv.phone.includes(searchQuery))
  );

  // Fila de espera — aparece para todos
  const waitingConversations = allFiltered.filter(c => c.status === 'waiting');

  // Meus atendimentos — só os que eu assumi
  const myConversations = allFiltered.filter(
    c => c.status === 'in_progress' && Number(c.assigned_to) === Number(user?.id)
  );

  // Outros em atendimento — visível mas bloqueado (exceto CEO/ADMIN que veem tudo)
  const othersConversations = allFiltered.filter(
    c => c.status === 'in_progress' && Number(c.assigned_to) !== Number(user?.id)
  );

  // Encerrados
  const closedConversations = allFiltered.filter(c => c.status === 'closed');

  const renderConversationItem = (conv: Conversation) => {
    const isAssignedToOther = conv.status === 'in_progress' && Number(conv.assigned_to) !== Number(user?.id);
    const isBlocked = isAssignedToOther && !isAdmin;

    return (
      <div
        key={conv.id}
        onClick={() => {
          if (conv.status === 'waiting') {
            assumeConversation(conv);
          } else if (isBlocked) {
            return;
          } else {
            setSelectedConversation(conv);
          }
        }}
        className={cn(
          "p-4 border-b border-gray-100 transition-all hover:bg-white relative",
          selectedConversation?.id === conv.id ? "bg-white border-l-4 border-l-blue-600 shadow-sm" : "",
          isBlocked ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
        )}
      >
        <div className="flex justify-between items-start mb-1">
          <div className="flex flex-col">
            <span className="font-bold text-gray-800 truncate">
              {conv.contact_name || conv.phone}
            </span>
            {conv.token && (
              <span className="text-[10px] font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 w-fit mt-0.5">
                {conv.token}
              </span>
            )}
          </div>
          <span className="text-[10px] text-gray-400">
            {format(new Date(conv.last_message_at), 'HH:mm', { locale: ptBR })}
          </span>
        </div>

        {/* Prévia da última mensagem — esconder se bloqueado */}
        {!isBlocked && (
          <p className="text-xs text-gray-500 line-clamp-1 mb-2">
            {conv.last_message || "Sem mensagens"}
          </p>
        )}
        {isBlocked && (
          <p className="text-xs text-gray-400 italic mb-2 flex items-center gap-1">
            <Lock size={9} /> Conteúdo restrito
          </p>
        )}

        <div className="flex items-center gap-2">
          {conv.status === 'waiting' && (
            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-bold uppercase tracking-wider">
              Aguardando
            </span>
          )}
          {conv.status === 'in_progress' && (
            <span className={cn(
              "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1",
              Number(conv.assigned_to) === Number(user?.id) ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-600"
            )}>
              {Number(conv.assigned_to) === Number(user?.id) ? <Check size={10} /> : <Lock size={10} />}
              {Number(conv.assigned_to) === Number(user?.id) ? "Em atendimento" : conv.assigned_name}
            </span>
          )}
          {conv.status === 'closed' && (
            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-bold uppercase tracking-wider">
              Encerrado
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-[calc(100vh-140px)] bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
      {/* Painel Esquerdo - Lista de Conversas */}
      <div className="w-80 flex-shrink-0 border-r border-gray-200 flex flex-col bg-gray-50">
        <div className="p-4 bg-white border-b border-gray-200">
          <h1 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
            <MessageCircle className="text-blue-600" />
            WhatsApp
          </h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Buscar conversa..." 
              className="w-full pl-9 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Carregando...</div>
          ) : (
            <>
              {/* FILA DE ESPERA */}
              {waitingConversations.length > 0 && (
                <>
                  <div className="px-4 py-2 text-[10px] font-bold text-amber-600 uppercase tracking-widest bg-amber-50 border-b border-amber-100">
                    Aguardando — {waitingConversations.length}
                  </div>
                  {waitingConversations.map((conv) => renderConversationItem(conv))}
                </>
              )}

              {/* MEUS ATENDIMENTOS */}
              {myConversations.length > 0 && (
                <>
                  <div className="px-4 py-2 text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 border-b border-blue-100">
                    Meus atendimentos — {myConversations.length}
                  </div>
                  {myConversations.map((conv) => renderConversationItem(conv))}
                </>
              )}

              {/* OUTROS EM ATENDIMENTO */}
              {othersConversations.length > 0 && (
                <>
                  <div className="px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-gray-100 border-b border-gray-200">
                    {isAdmin ? 'Todos os atendimentos' : 'Em atendimento'} — {othersConversations.length}
                  </div>
                  {othersConversations.map((conv) => renderConversationItem(conv))}
                </>
              )}

              {/* ENCERRADOS */}
              {closedConversations.length > 0 && (
                <>
                  <div className="px-4 py-2 text-[10px] font-bold text-green-600 uppercase tracking-widest bg-green-50 border-b border-green-100">
                    Encerrados — {closedConversations.length}
                  </div>
                  {closedConversations.map((conv) => renderConversationItem(conv))}
                </>
              )}

              {allFiltered.length === 0 && (
                <div className="p-4 text-center text-gray-500 text-sm">Nenhuma conversa encontrada.</div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Painel Central - Chat */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedConversation ? (
          <>
            {/* Header do Chat */}
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white shadow-sm z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">
                  <User size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-gray-800">{selectedConversation.contact_name || selectedConversation.phone}</h2>
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <Phone size={10} /> {selectedConversation.phone}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                  <MoreVertical size={20} />
                </button>
              </div>
            </div>

            {/* Mensagens */}
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f0f2f5] custom-scrollbar"
            >
              {messages.map((msg) => (
                <div 
                  key={msg.id}
                  className={cn(
                    "flex flex-col max-w-[80%] break-words",
                    msg.from_me ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  <div className={cn(
                    "px-3 py-2 rounded-lg text-sm shadow-sm relative",
                    msg.from_me 
                      ? "bg-[#dcf8c6] text-gray-800 rounded-tr-none" 
                      : "bg-white text-gray-800 rounded-tl-none border border-gray-100"
                  )}>
                    {msg.message}
                    <div className="text-[9px] text-gray-400 mt-1 text-right">
                      {format(new Date(msg.timestamp), 'HH:mm', { locale: ptBR })}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Campo de Envio */}
            <div className="p-4 bg-white border-t border-gray-200">
              {selectedConversation.status === 'in_progress' && (Number(selectedConversation.assigned_to) === Number(user?.id) || isAdmin) ? (
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Digite uma mensagem..." 
                    className="flex-1 px-4 py-2 bg-gray-100 border-none rounded-full text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                  <button 
                    type="submit" 
                    disabled={!newMessage.trim()}
                    className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
                  >
                    <Send size={18} />
                  </button>
                </form>
              ) : (
                <div className="text-center p-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100 flex items-center justify-center gap-2">
                  {selectedConversation.status === 'in_progress' ? (
                    <><Lock size={16} /> Este atendimento está sendo realizado por {selectedConversation.assigned_name}</>
                  ) : selectedConversation.status === 'closed' ? (
                    <><CheckCircle2 size={16} /> Este atendimento foi encerrado.</>
                  ) : (
                    <><ArrowLeft size={16} /> Assuma este atendimento para enviar mensagens.</>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
            <MessageCircle size={64} className="mb-4 opacity-20" />
            <p className="text-sm font-medium">Selecione uma conversa para começar</p>
          </div>
        )}
      </div>

      {/* Painel Direito - Ações do Ticket */}
      {selectedConversation && (
        <div className="w-72 flex-shrink-0 border-l border-gray-200 bg-white flex flex-col">
          <div className="p-6 border-b border-gray-200 text-center relative group">
            <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mx-auto mb-4 border-2 border-blue-100">
              <User size={32} />
            </div>
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  value={tempName} 
                  onChange={(e) => setTempName(e.target.value)}
                  className="w-full text-sm font-bold border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  autoFocus
                />
                <button onClick={updateContactName} className="text-green-600 hover:text-green-700">
                  <Check size={16} />
                </button>
                <button onClick={() => setIsEditingName(false)} className="text-red-600 hover:text-red-700">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <h3 
                className="font-bold text-gray-800 text-lg mb-1 flex items-center justify-center gap-2 cursor-pointer hover:text-blue-600 transition-colors"
                onClick={() => {
                  setTempName(selectedConversation.contact_name || '');
                  setIsEditingName(true);
                }}
              >
                {selectedConversation.contact_name || "Sem Nome"}
                <Pencil size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
            )}
            <p className="text-xs text-gray-500">{selectedConversation.phone}</p>
          </div>

          <div className="p-6 space-y-6 flex-1 overflow-y-auto">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Status do Ticket</label>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-3 h-3 rounded-full",
                  selectedConversation.status === 'waiting' ? "bg-amber-400" :
                  selectedConversation.status === 'in_progress' ? "bg-blue-500" : "bg-green-500"
                )}></div>
                <span className="text-sm font-bold text-gray-700">
                  {selectedConversation.status === 'waiting' ? "Aguardando" :
                   selectedConversation.status === 'in_progress' ? "Em Atendimento" : "Encerrado"}
                </span>
              </div>
            </div>

            {selectedConversation.status === 'in_progress' && (
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Agente Responsável</label>
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                    {selectedConversation.assigned_name?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-blue-900">{selectedConversation.assigned_name}</p>
                    <p className="text-[9px] text-blue-600 flex items-center gap-1">
                      <Clock size={8} /> Desde {format(new Date(selectedConversation.assigned_at!), 'HH:mm')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2 pt-4">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Ações</label>
              
              {selectedConversation.status === 'waiting' ? (
                <button 
                  onClick={() => assumeConversation(selectedConversation)}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-md"
                >
                  <UserPlus size={16} /> Assumir Atendimento
                </button>
              ) : selectedConversation.status === 'in_progress' && (Number(selectedConversation.assigned_to) === Number(user?.id) || isAdmin) ? (
                <>
                  <button 
                    onClick={() => setShowTransferModal(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200 transition-all"
                  >
                    <RefreshCcw size={16} /> Transferir Ticket
                  </button>
                  <button 
                    onClick={closeConversation}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-700 transition-all shadow-md"
                  >
                    <CheckCircle2 size={16} /> Encerrar Atendimento
                  </button>
                </>
              ) : selectedConversation.status === 'closed' ? (
                <button 
                  onClick={reopenConversation}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600 transition-all shadow-md"
                >
                  <RefreshCcw size={16} /> Reabrir Atendimento
                </button>
              ) : null}
            </div>

            <div className="pt-6 border-t border-gray-100">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Histórico</label>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5"></div>
                  <div>
                    <p className="text-[10px] text-gray-500">Criado em</p>
                    <p className="text-[11px] font-medium text-gray-700">
                      {format(new Date(selectedConversation.last_message_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Transferência */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-blue-900 text-white">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <RefreshCcw size={20} />
                Transferir Atendimento
              </h3>
              <button onClick={() => setShowTransferModal(false)} className="hover:bg-white/10 p-1 rounded-lg transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-gray-500 mb-6">Selecione um agente para assumir esta conversa:</p>
              
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {availableAgents.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    Nenhum outro agente disponível no momento.
                  </div>
                ) : (
                  availableAgents.map((agent) => (
                    <button
                      key={agent.id}
                      onClick={() => transferTicket(agent.id, agent.name)}
                      className="w-full flex items-center gap-3 p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all text-left group"
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        {agent.name?.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-800 text-sm">{agent.name}</p>
                        <p className="text-[10px] text-gray-400">Clique para transferir</p>
                      </div>
                      <UserPlus size={18} className="text-gray-300 group-hover:text-blue-600 transition-colors" />
                    </button>
                  ))
                )}
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button 
                onClick={() => setShowTransferModal(false)}
                className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
