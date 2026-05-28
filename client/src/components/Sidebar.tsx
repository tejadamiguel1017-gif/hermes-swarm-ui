import type { AgentProfile, AgentStatus, GatewayStatus } from '../types';

const CHAT_DOT: Record<AgentStatus, string> = {
  idle: 'bg-gray-500',
  thinking: 'bg-yellow-400 animate-pulse',
  responding: 'bg-green-400 animate-pulse',
};

const GATEWAY_COLORS: Record<GatewayStatus, string> = {
  running: 'text-green-400',
  stopped: 'text-gray-600',
  starting: 'text-yellow-400 animate-pulse',
  stopping: 'text-red-400 animate-pulse',
};

const GATEWAY_LABEL: Record<GatewayStatus, string> = {
  running: 'Online',
  stopped: 'Offline',
  starting: 'Starting…',
  stopping: 'Stopping…',
};

interface Props {
  profiles: AgentProfile[];
  statuses: Record<string, AgentStatus>;
  activeId: string;
  onSelect: (id: string) => void;
  onToggle: (profile: AgentProfile) => void;
  onEdit: (profileId: string) => void;
}

export function Sidebar({ profiles, statuses, activeId, onSelect, onToggle, onEdit }: Props) {
  return (
    <aside className="w-60 flex-shrink-0 bg-gray-900 border-r border-gray-700 flex flex-col">
      <div className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">
        Agents
      </div>
      <nav className="flex-1 overflow-y-auto px-2 space-y-1">
        {profiles.map((p) => {
          const chatStatus = statuses[p.id] ?? 'idle';
          const isActive = p.id === activeId;
          const isRunning = p.status === 'running';
          const isTransitioning = p.status === 'starting' || p.status === 'stopping';

          return (
            <div
              key={p.id}
              className={`group flex items-center gap-2 px-2 py-2 rounded-lg transition-colors ${
                isActive ? 'bg-violet-900' : 'hover:bg-gray-800'
              } ${!isRunning && !p.isCaptain ? 'opacity-60' : ''}`}
            >
              {/* Main clickable row */}
              <button
                onClick={() => onSelect(p.id)}
                className="flex items-center gap-2 flex-1 min-w-0 text-left"
              >
                <span className="text-base flex-shrink-0">{p.isCaptain ? '★' : '🤖'}</span>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium truncate ${isActive ? 'text-white' : 'text-gray-300'}`}>
                    {p.name}
                  </div>
                  <div className={`text-xs ${GATEWAY_COLORS[p.status]}`}>
                    {GATEWAY_LABEL[p.status]}
                  </div>
                </div>
                {isRunning && (
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${CHAT_DOT[chatStatus]}`} />
                )}
              </button>

              {/* Controls (visible on hover or when active) */}
              <div className={`flex items-center gap-1 flex-shrink-0 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                {/* Edit button */}
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(p.id); }}
                  title="Edit profile"
                  className="p-1 rounded text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-colors text-xs"
                >
                  ⚙
                </button>

                {/* Power toggle (non-captain only) */}
                {!p.isCaptain && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggle(p); }}
                    disabled={isTransitioning}
                    title={isRunning ? 'Stop agent' : 'Start agent'}
                    className={`p-1 rounded text-xs transition-colors disabled:opacity-40 ${
                      isRunning
                        ? 'text-red-400 hover:text-red-300 hover:bg-gray-700'
                        : 'text-green-400 hover:text-green-300 hover:bg-gray-700'
                    }`}
                  >
                    {isRunning ? '■' : '▶'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
