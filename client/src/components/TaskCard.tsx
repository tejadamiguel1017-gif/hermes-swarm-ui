import type { AgentProfile, ParsedTask } from '../types';

interface Props {
  task: ParsedTask;
  profiles: AgentProfile[];
  onChange: (profileId: string) => void;
}

export function TaskCard({ task, profiles, onChange }: Props) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg border border-gray-700">
      <span className="text-gray-400 text-sm font-mono w-5 text-right flex-shrink-0">
        {task.index + 1}.
      </span>
      <span className="flex-1 text-sm text-gray-200">{task.text}</span>
      <select
        value={task.assignedProfileId}
        onChange={(e) => onChange(e.target.value)}
        className="bg-gray-700 text-gray-200 text-xs rounded px-2 py-1 outline-none focus:ring-1 focus:ring-violet-500"
      >
        <option value="">Assign to…</option>
        {profiles.filter((p) => !p.isCaptain).map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
    </div>
  );
}
