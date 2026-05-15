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
  Repeat,
  Check,
  Pencil,
  X,
  Mic,
  MicOff,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Download,
  Trash2,
  File as FileIcon
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
  media_type?: string | null;
  media_url?: string | null;
  file_name?: string | null;
  file_size?: number | null;
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
  instance?: string;
  tag?: string | null;
}

const WHATSAPP_TAGS = [
  { id: 'Atendimento Iniciado', label: 'Atendimento Iniciado', color: '#3B82F6' },
  { id: 'Cuidar e Fechar', label: 'Cuidar e Fechar', color: '#F97316' },
  { id: 'Fechou Venda', label: 'Fechou Venda', color: '#16A34A' },
  { id: 'Lead Desqualificado', label: 'Lead Desqualificado', color: '#DC2626' },
  { id: 'Lead Qualificado', label: 'Lead Qualificado', color: '#22C55E' },
  { id: 'Não Fechou Venda', label: 'Não Fechou Venda', color: '#6B7280' },
  { id: 'Orçamento Enviado', label: 'Orçamento Enviado', color: '#9333EA' },
  { id: 'Visita Agendada', label: 'Visita Agendada', color: '#EAB308' },
  { id: 'Transferido', label: 'Transferido', color: '#1D4ED8' },
];

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file; // só comprime imagens
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 1280;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        resolve(new File([blob!], file.name, { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.82);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
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
  const isAgent = isAdmin || user?.role?.toUpperCase() === 'COMMERCIAL';
  const isCommercial = user?.role?.toUpperCase() === 'COMMERCIAL';
  const [activeInstance, setActiveInstance] = useState<'admin' | 'atendimento'>('atendimento');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [showTransferInstanceModal, setShowTransferInstanceModal] = useState(false);
  const [transferObservation, setTransferObservation] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  // Media State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [showChat, setShowChat] = useState(false);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedConversation) {
      setShowChat(true);
    } else {
      setShowChat(false);
    }
  }, [selectedConversation?.id]);

  useEffect(() => {
    fetchConversations();
    fetchAgents();
  }, [activeInstance]);

  useEffect(() => {
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
    try {
      const instance = activeInstance === 'admin' 
        ? evolutionApi.instances.ADMIN 
        : evolutionApi.instances.ATENDIMENTO;

      const { data } = await api.get(`/api/conversations?instance=${instance}`);
      
      if (data) {
        console.log('[CONVERSAS] Total recebido:', data.length);
        setConversations(data);
      }
    } catch (error) {
      console.error("Erro ao buscar conversas:", error);
    } finally {
      setLoading(false);
    }
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

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result as string;
        // Evolution API expects just the base64 data, without the data:image/png;base64, prefix
        resolve(base64String.split(',')[1]);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !selectedConversation || !user) return;

    if (selectedConversation.status !== 'in_progress' || (Number(selectedConversation.assigned_to) !== Number(user.id) && !isAdmin)) {
      alert("Você precisa assumir este atendimento para enviar mensagens.");
      return;
    }

    const messageText = newMessage.trim();
    const currentFile = selectedFile;
    
    setNewMessage('');
    setSelectedFile(null);
    setFilePreview(null);
    setIsSending(true);

    try {
      if (currentFile) {
        // 1. Comprimir imagem se necessário
        const fileToSend = await compressImage(currentFile);
        
        // 2. Upload para o backend (bypass RLS via service_role no servidor)
        const formData = new FormData();
        formData.append('file', fileToSend);
        
        console.log(`[WA MEDIA UPLOAD] Enviando arquivo para o backend (Original: ${currentFile.size}, Comprimido: ${fileToSend.size})...`);
        const { data: uploadData } = await api.post('/api/whatsapp/upload-media', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        // 2. Enviar a URL assinada para o backend para disparo via Evolution API
        await api.post('/api/whatsapp/send-media', {
          phone: selectedConversation.phone,
          mediaUrl: uploadData.mediaUrl,
          filePath: uploadData.filePath,
          mimetype: currentFile.type,
          filename: currentFile.name,
          caption: messageText,
          conversationId: selectedConversation.id
        });
      } else {
        await api.post('/api/whatsapp/send', {
          phone: selectedConversation.phone,
          text: messageText,
          conversationId: selectedConversation.id
        });
      }
      
      fetchMessages(selectedConversation.id);

    } catch (error: any) {
      console.error("Erro ao enviar mensagem:", error);
      alert(error?.response?.data?.error || error?.message || "Falha ao enviar mensagem.");
    } finally {
      setIsSending(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/ogg; codecs=opus') 
        ? 'audio/ogg; codecs=opus' 
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(',')[1];
          await sendAudioMessage(base64, audioBlob.size);
        };
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Erro ao acessar microfone:", err);
      alert("Não foi possível acessar o microfone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const sendAudioMessage = async (base64: string, _size: number) => {
    if (!selectedConversation || !user) return;

    try {
      await api.post('/api/whatsapp/send-audio', {
        phone: selectedConversation.phone,
        audio: base64,
        conversationId: selectedConversation.id
      });
      
      // O backend já salva no banco e atualiza a conversa
      fetchMessages(selectedConversation.id); 
    } catch (error: any) {
      console.error("Erro ao enviar áudio:", error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => setFilePreview(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }
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

  const updateTag = async (tag: string | null) => {
    if (!selectedConversation) return;

    const { error } = await supabase
      .from('whatsapp_conversations')
      .update({ tag })
      .eq('id', selectedConversation.id)
      .eq('company_id', user?.company_id);

    if (!error) {
      setSelectedConversation({ ...selectedConversation, tag });
      setShowTagDropdown(false);
      fetchConversations();
    }
  };

  const transferToAdministrative = async () => {
    if (!selectedConversation || !user) return;
    
    setIsTransferring(true);
    try {
      await api.post('/api/whatsapp/transfer', {
        conversationId: selectedConversation.id,
        targetInstance: evolutionApi.instances.ADMIN,
        internalNote: transferObservation
      });

      alert("Conversa transferida com sucesso para o Administrativo!");
      setSelectedConversation(null);
      setShowTransferInstanceModal(false);
      setTransferObservation('');
      fetchConversations();
    } catch (err: any) {
      console.error("Erro na transferência:", err);
      alert(err.response?.data?.error || "Falha ao transferir conversa.");
    } finally {
      setIsTransferring(false);
    }
  };


  const allFiltered = conversations.filter(conv => {
    const matchesSearch = (conv.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           conv.phone.includes(searchQuery));
    const matchesTag = !activeTag || conv.tag === activeTag;
    return matchesSearch && matchesTag;
  });

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
    const currentTag = WHATSAPP_TAGS.find(t => t.id === conv.tag);

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
            setShowChat(true);
          }
        }}
        className={cn(
          "p-4 border-b border-gray-100 transition-all hover:bg-white relative",
          selectedConversation?.id === conv.id ? "bg-white border-l-4 border-l-blue-600 shadow-sm" : "",
          isBlocked ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
        )}
      >
        <div className="flex justify-between items-start mb-1">
          <div className="flex flex-col gap-1">
            <span className="font-bold text-gray-800 truncate">
              {conv.contact_name || conv.phone}
            </span>
            <div className="flex flex-wrap gap-1">
              {conv.instance === 'atendimento-cliente' ? (
                <span className="text-[9px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded border border-green-200 w-fit uppercase tracking-tighter">
                  Atendimento
                </span>
              ) : (
                <span className="text-[9px] font-bold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 w-fit uppercase tracking-tighter">
                  Administrativo
                </span>
              )}
              {currentTag && (
                <span 
                  className="text-[9px] font-bold text-white px-1.5 py-0.5 rounded w-fit uppercase tracking-tighter"
                  style={{ backgroundColor: currentTag.color }}
                >
                  {currentTag.label}
                </span>
              )}
            </div>
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
  return (
    <div className="flex h-[calc(100vh-140px)] lg:h-[calc(100vh-140px)] w-full max-w-full overflow-hidden bg-white lg:rounded-2xl lg:shadow-xl lg:border border-gray-200">
      {/* Painel Esquerdo - Lista de Conversas */}
      <div className={cn(
        "w-full lg:w-80 flex-shrink-0 border-r border-gray-200 flex flex-col bg-gray-50",
        showChat ? "hidden lg:flex" : "flex"
      )}>
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
          
          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mt-3">
            <button 
              onClick={() => setActiveInstance('atendimento')}
              className={cn(
                "flex-1 text-[10px] font-bold py-1.5 rounded-md transition-all",
                activeInstance === 'atendimento' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:bg-gray-200"
              )}
            >
              Atendimento
            </button>
            {!isCommercial && (
              <button 
                onClick={() => setActiveInstance('admin')}
                className={cn(
                  "flex-1 text-[10px] font-bold py-1.5 rounded-md transition-all",
                  activeInstance === 'admin' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:bg-gray-200"
                )}
              >
                Administrativo
              </button>
            )}
          </div>

          <div className="mt-3 overflow-x-auto no-scrollbar flex gap-2 pb-1">

            {WHATSAPP_TAGS.map(tag => (
              <button
                key={tag.id}
                onClick={() => setActiveTag(activeTag === tag.id ? null : tag.id)}
                className={cn(
                  "whitespace-nowrap px-3 py-1 rounded-full text-[10px] font-bold border transition-all",
                  activeTag === tag.id ? "border-transparent text-white shadow-sm" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                )}
                style={{ 
                  backgroundColor: activeTag === tag.id ? tag.color : 'white',
                  borderColor: activeTag === tag.id ? 'transparent' : '#e5e7eb'
                }}
              >
                {tag.label}
              </button>
            ))}
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
             {/* Painel Central - Chat */}
      <div className={cn(
        "flex-1 flex flex-col bg-white w-full overflow-hidden",
        !showChat ? "hidden lg:flex" : "flex"
      )}>
        {selectedConversation ? (
          <>
            {/* Header do Chat */}
            <div className="p-3 lg:p-4 border-b border-gray-200 bg-white shadow-sm z-10">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <button 
                    onClick={() => {
                      setShowChat(false);
                      setSelectedConversation(null);
                    }}
                    className="lg:hidden p-1 -ml-1 text-gray-500 hover:text-blue-600"
                  >
                    <ArrowLeft size={24} />
                  </button>
                  <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-blue-100 flex-shrink-0 flex items-center justify-center text-blue-700">
                    <User size={18} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-bold text-gray-800 text-sm lg:text-base truncate">
                      {selectedConversation.contact_name || selectedConversation.phone}
                    </h2>
                    <p className="text-[10px] lg:text-xs text-gray-400 truncate flex items-center gap-1">
                      <Phone size={10} /> {selectedConversation.phone}
                    </p>
                  </div>
                </div>

                {/* Ações Desktop */}
                <div className="hidden lg:flex items-center gap-2">
                  <button 
                    onClick={() => setShowTransferInstanceModal(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-all border border-blue-100"
                  >
                    <Repeat size={12} /> Transferir
                  </button>
                  <button 
                    onClick={() => setShowTagDropdown(!showTagDropdown)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-all"
                  >
                    Etiqueta
                  </button>
                  <button className="p-2 text-gray-400 hover:text-blue-600">
                    <MoreVertical size={20} />
                  </button>
                </div>
              </div>

              {/* Barra de Ações Mobile */}
              <div className="lg:hidden flex items-center gap-2 mt-3 pt-2 border-t border-gray-50 overflow-x-auto no-scrollbar">
                {selectedConversation.status === 'in_progress' && (Number(selectedConversation.assigned_to) === Number(user?.id) || isAdmin) ? (
                  <>
                    <button 
                      onClick={() => setShowTransferModal(true)}
                      className="flex-1 whitespace-nowrap flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-[10px] font-bold"
                    >
                      <RefreshCcw size={12} /> Transferir
                    </button>
                    <button 
                      onClick={closeConversation}
                      className="flex-1 whitespace-nowrap flex items-center justify-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-[10px] font-bold shadow-sm"
                    >
                      <CheckCircle2 size={12} /> Encerrar
                    </button>
                  </>
                ) : selectedConversation.status === 'waiting' ? (
                  <button 
                    onClick={() => assumeConversation(selectedConversation)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-lg text-xs font-bold"
                  >
                    <UserPlus size={16} /> Assumir Atendimento
                  </button>
                ) : null}
                
                {selectedConversation.tag && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-[9px] font-bold uppercase whitespace-nowrap">
                    {selectedConversation.tag}
                  </span>
                )}
              </div>
            </div>

            {/* Mensagens */}
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f0f2f5] custom-scrollbar w-full overflow-x-hidden"
            >
              {messages.map((msg) => (
                <div 
                  key={msg.id}
                  className={cn(
                    "flex flex-col max-w-[85%] lg:max-w-[80%] break-words",
                    msg.from_me ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  <div className={cn(
                    "px-3 py-2 rounded-lg text-sm shadow-sm relative overflow-hidden",
                    msg.from_me 
                      ? (msg.is_internal ? "bg-amber-100 text-amber-900 border border-amber-200" : "bg-[#dcf8c6] text-gray-800")
                      : "bg-white text-gray-800 rounded-tl-none border border-gray-100",
                    msg.from_me && !msg.is_internal ? "rounded-tr-none" : ""
                  )}>
                    {msg.is_internal && (
                      <div className="text-[10px] font-bold text-amber-600 mb-1 flex items-center gap-1">
                        <Lock size={10} /> NOTA INTERNA
                      </div>
                    )}
                    {/* Media Rendering */}
                    {msg.media_type === 'image' && (
                      <div className="mb-2 max-w-full">
                        <img 
                          src={msg.media_url || ''} 
                          alt="Imagem" 
                          className="rounded-lg max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setLightboxImage(msg.media_url || null)}
                          onError={(e) => {
                            // If media_url is missing or broken, we can't show it easily without proxying
                            // but for now we just hide it or show a placeholder
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}

                    {msg.media_type === 'audio' && (
                      <div className="mb-2 min-w-[240px]">
                        <audio 
                          src={msg.media_url || ''} 
                          controls 
                          className="w-full h-10 accent-blue-600"
                        />
                      </div>
                    )}

                    {msg.media_type === 'document' && (
                      <div className="mb-2 p-3 bg-black/5 rounded-lg border border-black/10 flex items-center gap-3 min-w-[200px]">
                        <div className="w-10 h-10 rounded bg-white flex items-center justify-center text-blue-600 border border-gray-200">
                          <FileText size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate text-gray-800">{msg.file_name || 'Documento'}</p>
                          <p className="text-[10px] text-gray-500">
                            {msg.file_size ? `${(msg.file_size / 1024 / 1024).toFixed(2)} MB` : 'Arquivo'}
                          </p>
                        </div>
                        {msg.media_url && (
                          <a 
                            href={msg.media_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                            title="Baixar"
                          >
                            <Download size={16} />
                          </a>
                        )}
                      </div>
                    )}

                    {msg.message && msg.message !== '[Áudio]' && msg.message !== '[image]' && msg.message !== '[document]' && (
                      <div className="whitespace-pre-wrap">{msg.message}</div>
                    )}
                    
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-[9px] text-gray-400">
                        {format(new Date(msg.timestamp), 'HH:mm', { locale: ptBR })}
                      </span>
                      {msg.from_me && !msg.is_internal && (
                        <span className={cn(
                          "text-[10px] font-bold",
                          msg.status === 'read' ? "text-blue-500" : "text-gray-400"
                        )}>
                          {msg.status === 'read' ? '✓✓' : 
                           msg.status === 'delivered' ? '✓✓' : 
                           msg.status === 'sent' ? '✓' : '🕐'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Preview de Arquivo */}
            {selectedFile && (
              <div className="px-4 py-3 bg-white border-t border-gray-100 flex items-center gap-4 animate-in slide-in-from-bottom-2">
                {filePreview ? (
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                    <img src={filePreview} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center text-blue-600">
                    <FileText size={24} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                </div>
                <button 
                  onClick={() => {
                    setSelectedFile(null);
                    setFilePreview(null);
                  }}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            )}

            {/* Campo de Envio */}
            <div className="p-3 lg:p-4 bg-white border-t border-gray-200 pb-10 lg:pb-4">
              {selectedConversation.status === 'in_progress' && (Number(selectedConversation.assigned_to) === Number(user?.id) || isAdmin) ? (
                <div className="flex items-end gap-2">
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
                    onChange={handleFileSelect}
                  />
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 text-gray-400 hover:text-blue-600 transition-colors bg-gray-50 rounded-full"
                  >
                    <Paperclip size={20} />
                  </button>
                  
                  <form onSubmit={handleSendMessage} className="flex-1 flex gap-2 items-center bg-gray-100 rounded-[24px] px-4 py-1">
                    {isRecording ? (
                      <div className="flex-1 flex items-center gap-3 py-2">
                        <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                        <span className="text-sm font-bold text-red-600">Gravando {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}</span>
                        <button 
                          type="button"
                          onClick={stopRecording}
                          className="ml-auto text-[10px] font-bold text-gray-500 hover:text-red-600 transition-colors uppercase tracking-wider"
                        >
                          Parar e Enviar
                        </button>
                      </div>
                    ) : (
                      <input 
                        type="text" 
                        placeholder="Digite uma mensagem..." 
                        className="flex-1 bg-transparent border-none py-2 text-sm focus:ring-0 transition-all"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                      />
                    )}
                  </form>

                  <div className="flex items-center gap-2">
                    <button 
                      type="button"
                      onClick={isRecording ? stopRecording : startRecording}
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm",
                        isRecording ? "bg-red-100 text-red-600 animate-pulse" : "bg-gray-100 text-gray-400 hover:bg-blue-600 hover:text-white"
                      )}
                    >
                      {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>
                    
                    {(newMessage.trim() || selectedFile) && !isRecording && (
                      <button 
                        type="button"
                        onClick={handleSendMessage}
                        disabled={isSending || (!newMessage.trim() && !selectedFile)}
                        className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
                      >
                        <Send size={18} />
                      </button>
                    )}
                  </div>
                </div>
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
        <div className="w-72 flex-shrink-0 border-l border-gray-200 bg-white flex flex-col hidden lg:flex">
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

                  {selectedConversation.instance === 'atendimento-cliente' && isAdmin && (
                    <button 
                      onClick={() => setShowTransferInstanceModal(true)}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-blue-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all shadow-md"
                    >
                      <RefreshCcw size={16} /> Transferir para Administrativo
                    </button>
                  )}
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

      {/* Modal de Transferência de Instância */}
      {showTransferInstanceModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-blue-900 text-white">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <RefreshCcw size={20} />
                Transferir Instância
              </h3>
              <button onClick={() => setShowTransferInstanceModal(false)} className="hover:bg-white/10 p-1 rounded-lg transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-blue-900 text-sm">
                <p>Você está transferindo este atendimento para a instância <strong>Administrativo (mtsolar)</strong>.</p>
                <p className="mt-2 text-xs opacity-80">O cliente receberá uma mensagem automática informando a transferência.</p>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Observação Interna (Opcional)</label>
                <textarea 
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all h-24 resize-none"
                  placeholder="Ex: Cliente solicita alteração no contrato financeiro..."
                  value={transferObservation}
                  onChange={(e) => setTransferObservation(e.target.value)}
                />
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button 
                onClick={() => setShowTransferInstanceModal(false)}
                className="px-6 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={transferToAdministrative}
                disabled={isTransferring}
                className="px-6 py-2 bg-blue-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
              >
                {isTransferring ? 'Transferindo...' : 'Confirmar Transferência'}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Lightbox para Imagens */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setLightboxImage(null)}
        >
          <button 
            className="absolute top-6 right-6 p-2 text-white/70 hover:text-white transition-colors bg-white/10 hover:bg-white/20 rounded-full"
            onClick={(e) => { e.stopPropagation(); setLightboxImage(null); }}
          >
            <X size={24} />
          </button>
          <img 
            src={lightboxImage} 
            alt="Lightbox" 
            className="max-w-[95vw] max-h-[95vh] object-contain shadow-2xl rounded-sm"
            onClick={(e) => e.stopPropagation()}
          />
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
