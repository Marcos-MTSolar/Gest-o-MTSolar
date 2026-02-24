import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import axios from 'axios';

interface SocketContextType {
  messages: any[];
  sendMessage: (content: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    const channel = supabase.channel('system')
      .on('broadcast', { event: 'NEW_MESSAGE' }, (payload) => {
        setMessages((prev) => [...prev, payload.payload]);
      })
      .on('broadcast', { event: 'USER_CREATED' }, (payload) => {
        console.log('User created:', payload.payload);
      })
      .on('broadcast', { event: 'PROJECT_UPDATED' }, (payload) => {
        console.log('Project updated:', payload.payload);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const sendMessage = async (content: string) => {
    try {
      await axios.post('/api/messages', { content });
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  return (
    <SocketContext.Provider value={{ messages, sendMessage }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
