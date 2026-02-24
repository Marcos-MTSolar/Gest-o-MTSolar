import React, { useEffect, useState, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

export default function Messages() {
  const { messages: socketMessages, sendMessage } = useSocket();
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    axios.get('/api/messages').then(res => setHistory(res.data));
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, socketMessages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    // Optimistic update
    const tempMsg = {
      id: Date.now(),
      sender_id: user?.id,
      sender_name: user?.name,
      content: input,
      created_at: new Date().toISOString()
    };
    
    // Send via API (which triggers socket broadcast)
    axios.post('/api/messages', { content: input });
    setInput('');
  };

  // Merge history and new socket messages
  // In a real app, we'd handle this more robustly to avoid duplicates
  const allMessages = [...history, ...socketMessages.filter(m => !history.find(h => h.id === m.id))];

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 border-b bg-gray-50">
        <h1 className="text-lg font-bold text-gray-800">Chat da Equipe</h1>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {allMessages.map((msg, i) => {
          const isMe = msg.sender_id === user?.id;
          return (
            <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] rounded-lg p-3 ${isMe ? 'bg-blue-900 text-white' : 'bg-gray-100 text-gray-800'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <p className={`text-xs font-bold ${isMe ? 'text-amber-400' : 'text-amber-600'}`}>
                    {msg.sender_name} {isMe && '(Você)'}
                  </p>
                  <span className={`text-[10px] px-1 rounded ${isMe ? 'bg-blue-800 text-blue-200' : 'bg-gray-200 text-gray-600'}`}>
                    {msg.sender_role}
                  </span>
                </div>
                <p>{msg.content}</p>
                <span className={`text-[10px] block mt-1 ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                  {new Date(msg.created_at).toLocaleTimeString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSend} className="p-4 border-t bg-gray-50 flex flex-col gap-2">
        <div className="text-xs text-gray-500 flex items-center gap-1 px-1">
          <span>Enviando como:</span>
          <span className="font-semibold text-blue-900">{user?.name}</span>
          <span className="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded text-[10px]">{user?.role}</span>
        </div>
        <div className="flex gap-2">
          <input 
            className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Digite sua mensagem..."
            value={input}
            onChange={e => setInput(e.target.value)}
          />
          <button className="bg-amber-400 text-blue-900 font-bold px-6 py-2 rounded-lg hover:bg-amber-500 transition-colors">
            Enviar
          </button>
        </div>
      </form>
    </div>
  );
}
