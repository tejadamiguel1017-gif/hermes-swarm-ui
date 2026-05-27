export interface AgentProfile {
  id: string;
  name: string;
  isCaptain: boolean;
  sessionId: string;
}

export type WSClientMessage = {
  type: 'chat';
  profileId: string;
  sessionId: string;
  message: string;
};

export type WSServerMessage =
  | { type: 'profiles'; profiles: AgentProfile[] }
  | { type: 'token'; profileId: string; content: string }
  | { type: 'done'; profileId: string }
  | { type: 'error'; profileId: string; message: string };
