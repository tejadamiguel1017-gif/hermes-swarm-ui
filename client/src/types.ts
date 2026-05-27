export interface AgentProfile {
  id: string;
  name: string;
  isCaptain: boolean;
  sessionId: string;
}

export type AgentStatus = 'idle' | 'thinking' | 'responding';

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  streaming: boolean;
}

export interface ParsedTask {
  index: number;
  text: string;
  assignedProfileId: string;
}

export type WSServerMessage =
  | { type: 'profiles'; profiles: AgentProfile[] }
  | { type: 'token'; profileId: string; content: string }
  | { type: 'done'; profileId: string }
  | { type: 'error'; profileId: string; message: string };
