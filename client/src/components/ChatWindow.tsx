import { useEffect, useRef, useState } from 'react';
import type { AgentProfile, ChatMessage, ParsedTask } from '../types';
import { MessageBubble } from './MessageBubble';
import { CaptainPanel } from './CaptainPanel';
import { parseTaskList } from '../utils/parseTaskList';

interface Props {
  profile: AgentProfile;
  messages: ChatMessage[];
  onSend: (text: string) => void;
  wsConnected: boolean;
  onDispatch: (tasks: ParsedTask[]) => void;
  onStartAgent: () => void;
}

export function ChatWindow({ profile, messages, onSend, wsConnected, onDispatch, onStartAgent }: Props) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    onSend(text);
    setInput('');
  };

  const isOnline = profile.isCaptain || profile.status === 'running';
  const isStarting = profile.status === 'starting';
  const lastAgentMsg = [...messages].reverse().find((m) => m.role === 'agent' && !m.streaming);
  const tasks = profile.isCaptain && lastAgentMsg ? parseTaskList(lastAgentMsg.content) : null;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700 text-sm font-semibold text-gray-200 flex items-center gap-2">
        <span>{profile.isCaptain ? '★' : '🤖'}</span>
        <span>{profile.name}</span>
        {!profile.isCaptain && (
          <span className={`text-xs font-normal px-2 py-0.5 rounded-full ${
            profile.status === 'running' ? 'bg-green-900 text-green-300' :
            profile.status === 'starting' ? 'bg-yellow-900 text-yellow-300' :
            'bg-gray-800 text-gray-400'
          }`}>
            {profile.status === 'running' ? 'Online' : profile.status === 'starting' ? 'Starting…' : 'Offline'}
          </span>
        )}
      </div>

      {!wsConnected && (
        <div className="px-4 py-2 bg-yellow-900 text-yellow-200 text-xs text-center">
          Reconnecting to server…
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 relative">
        {messages.map((m) => <MessageBubble key={m.id} message={m} />)}
        {tasks && <CaptainPanel tasks={tasks} onDispatch={onDispatch} />}
        <div ref={bottomRef} />

        {/* Offline overlay */}
        {!isOnline && !isStarting && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm">
            <div className="text-center">
              <div className="text-4xl mb-3">🤖</div>
              <div className="text-gray-300 font-medium mb-1">{profile.name} is offline</div>
              <div className="text-gray-500 text-sm mb-4">Start this agent to begin chatting</div>
              <button
                onClick={onStartAgent}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg transition-colors"
              >
                ▶ Start Agent
              </button>
            </div>
          </div>
        )}

        {/* Starting overlay */}
        {isStarting && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm">
            <div className="text-center">
              <div className="text-yellow-400 animate-pulse text-2xl mb-2">⏳</div>
              <div className="text-gray-300 font-medium">Starting {profile.name}…</div>
              <div className="text-gray-500 text-sm mt-1">This may take a few seconds</div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-gray-700 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!wsConnected || !isOnline}
          placeholder={
            !wsConnected ? 'Reconnecting…' :
            !isOnline ? `${profile.name} is offline` :
            `Message ${profile.name}…`
          }
          className="flex-1 bg-gray-800 text-gray-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-violet-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!wsConnected || !isOnline}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg disabled:opacity-50 transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}
