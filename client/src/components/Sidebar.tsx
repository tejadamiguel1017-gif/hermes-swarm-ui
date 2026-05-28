import type { AgentProfile, AgentStatus } from '../types';

const STATUS_DOT: Record<AgentStatus, string> = {
  idle: 'bg-gray-500',
  thinking: 'bg-yellow-400 animate-pulse',
  responding: 'bg-green-400 animate-pulse',
};

interface Props {
  profiles: AgentProfile[];
  statuses: Record<string, AgentStatus>;
  activeId: string;
  onSelect: (id: string) => void;
}

export function Sidebar({ profiles, statuses, activeId, onSelect }: Props) {
  return (
    <aside className="w-56 flex-shrink-0 bg-gray-900 border-r border-gray-700 flex flex-col">
      <div className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">
        Agents
      </div>
      <nav className="flex-1 overflow-y-auto px-2 space-y-1">
        {profiles.map((p) => {
          const status = statuses[p.id] ?? 'idle';
          const isActive = p.id === activeId;
          return (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                isActive
                  ? 'bg-violet-900 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <span className="text-base">{p.isCaptain ? '★' : '🤖'}</span>
              <span className="flex-1 text-sm font-medium truncate">{p.name}</span>
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[status]}`} />
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
