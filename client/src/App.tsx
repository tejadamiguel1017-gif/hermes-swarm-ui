import { useState } from 'react';
import { useSwarm } from './SwarmContext';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import type { ParsedTask } from './types';

export function App() {
  const { profiles, messages, statuses, wsStatus, sendMessage } = useSwarm();
  const [activeId, setActiveId] = useState<string>('captain');

  const activeProfile = profiles.find((p) => p.id === activeId) ?? profiles[0];

  const handleDispatch = (tasks: ParsedTask[]) => {
    for (const task of tasks) {
      if (!task.assignedProfileId) continue;
      const profile = profiles.find((p) => p.id === task.assignedProfileId);
      if (profile) sendMessage(profile.id, profile.sessionId, task.text);
    }
  };

  if (!activeProfile) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-gray-400">
        Connecting…
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 overflow-hidden">
      <Sidebar
        profiles={profiles}
        statuses={statuses}
        activeId={activeId}
        onSelect={setActiveId}
      />
      <main className="flex flex-col flex-1 min-w-0">
        <ChatWindow
          profile={activeProfile}
          messages={messages[activeId] ?? []}
          onSend={(text) => sendMessage(activeProfile.id, activeProfile.sessionId, text)}
          wsConnected={wsStatus === 'open'}
          onDispatch={handleDispatch}
        />
      </main>
    </div>
  );
}
