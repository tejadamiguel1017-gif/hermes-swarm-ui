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
}

export function ChatWindow({ profile, messages, onSend, wsConnected, onDispatch }: Props) {
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

  const lastAgentMsg = [...messages].reverse().find((m) => m.role === 'agent' && !m.streaming);
  const tasks = profile.isCaptain && lastAgentMsg ? parseTaskList(lastAgentMsg.content) : null;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-4 py-3 border-b border-gray-700 text-sm font-semibold text-gray-200">
        {profile.isCaptain ? '★' : '🤖'} {profile.name}
      </div>

      {!wsConnected && (
        <div className="px-4 py-2 bg-yellow-900 text-yellow-200 text-xs text-center">
          Reconnecting to server…
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.map((m) => <MessageBubble key={m.id} message={m} />)}
        {tasks && (
          <CaptainPanel tasks={tasks} onDispatch={onDispatch} />
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-gray-700 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!wsConnected}
          placeholder={wsConnected ? `Message ${profile.name}…` : 'Reconnecting…'}
          className="flex-1 bg-gray-800 text-gray-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-violet-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!wsConnected}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg disabled:opacity-50 transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}
