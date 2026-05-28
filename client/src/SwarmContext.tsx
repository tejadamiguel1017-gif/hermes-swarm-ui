import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import type { AgentProfile, AgentStatus, ChatMessage, WSServerMessage } from './types';
import { useWebSocket, type WSStatus } from './hooks/useWebSocket';

interface SwarmState {
  profiles: AgentProfile[];
  messages: Record<string, ChatMessage[]>;
  statuses: Record<string, AgentStatus>;
  wsStatus: WSStatus;
  sendMessage: (profileId: string, sessionId: string, text: string) => void;
}

const SwarmContext = createContext<SwarmState | null>(null);

export function SwarmProvider({ children }: { children: React.ReactNode }) {
  const [profiles, setProfiles] = useState<AgentProfile[]>([]);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [statuses, setStatuses] = useState<Record<string, AgentStatus>>({});
  const msgIdRef = useRef(0);

  const addMessage = useCallback((profileId: string, msg: ChatMessage) => {
    setMessages((prev) => ({
      ...prev,
      [profileId]: [...(prev[profileId] ?? []), msg],
    }));
  }, []);

  const appendToken = useCallback((profileId: string, content: string) => {
    setMessages((prev) => {
      const list = prev[profileId] ?? [];
      const last = list[list.length - 1];
      if (!last || last.role !== 'agent' || !last.streaming) {
        return {
          ...prev,
          [profileId]: [...list, {
            id: String(++msgIdRef.current),
            role: 'agent',
            content,
            streaming: true,
          }],
        };
      }
      return {
        ...prev,
        [profileId]: [
          ...list.slice(0, -1),
          { ...last, content: last.content + content },
        ],
      };
    });
  }, []);

  const finalizeStream = useCallback((profileId: string) => {
    setMessages((prev) => {
      const list = prev[profileId] ?? [];
      const last = list[list.length - 1];
      if (!last?.streaming) return prev;
      return {
        ...prev,
        [profileId]: [...list.slice(0, -1), { ...last, streaming: false }],
      };
    });
    setStatuses((prev) => ({ ...prev, [profileId]: 'idle' }));
  }, []);

  const handleRaw = useCallback((raw: string) => {
    let msg: WSServerMessage;
    try { msg = JSON.parse(raw) as WSServerMessage; }
    catch { return; }

    if (msg.type === 'profiles') {
      setProfiles(msg.profiles);
    } else if (msg.type === 'token') {
      setStatuses((prev) => ({ ...prev, [msg.profileId]: 'responding' }));
      appendToken(msg.profileId, msg.content);
    } else if (msg.type === 'done') {
      finalizeStream(msg.profileId);
    } else if (msg.type === 'error') {
      addMessage(msg.profileId, {
        id: String(++msgIdRef.current),
        role: 'agent',
        content: `⚠️ ${msg.message}`,
        streaming: false,
      });
      setStatuses((prev) => ({ ...prev, [msg.profileId]: 'idle' }));
    }
  }, [appendToken, finalizeStream, addMessage]);

  const { send, status: wsStatus } = useWebSocket(
    `ws://${window.location.host}`,
    handleRaw
  );

  const sendMessage = useCallback((profileId: string, sessionId: string, text: string) => {
    addMessage(profileId, {
      id: String(++msgIdRef.current),
      role: 'user',
      content: text,
      streaming: false,
    });
    setStatuses((prev) => ({ ...prev, [profileId]: 'thinking' }));
    send(JSON.stringify({ type: 'chat', profileId, sessionId, message: text }));
  }, [send, addMessage]);

  return (
    <SwarmContext.Provider value={{ profiles, messages, statuses, wsStatus, sendMessage }}>
      {children}
    </SwarmContext.Provider>
  );
}

export function useSwarm(): SwarmState {
  const ctx = useContext(SwarmContext);
  if (!ctx) throw new Error('useSwarm must be used within SwarmProvider');
  return ctx;
}
