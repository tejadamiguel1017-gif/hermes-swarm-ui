import { useState } from 'react';
import type { ParsedTask } from '../types';
import { useSwarm } from '../SwarmContext';
import { TaskCard } from './TaskCard';

interface Props {
  tasks: ParsedTask[];
  onDispatch: (tasks: ParsedTask[]) => void;
}

export function CaptainPanel({ tasks: initialTasks, onDispatch }: Props) {
  const { profiles } = useSwarm();
  const [tasks, setTasks] = useState(initialTasks);

  const assign = (index: number, profileId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.index === index ? { ...t, assignedProfileId: profileId } : t))
    );
  };

  return (
    <div className="my-4 border border-violet-700 rounded-xl p-4 bg-gray-900">
      <div className="text-xs font-semibold text-violet-400 uppercase tracking-widest mb-3">
        Task Breakdown — assign agents and dispatch
      </div>
      <div className="space-y-2 mb-4">
        {tasks.map((task) => (
          <TaskCard
            key={task.index}
            task={task}
            profiles={profiles}
            onChange={(profileId) => assign(task.index, profileId)}
          />
        ))}
      </div>
      <button
        onClick={() => onDispatch(tasks)}
        className="w-full py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-lg transition-colors"
      >
        Dispatch
      </button>
    </div>
  );
}
