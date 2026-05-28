import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ChatWindow } from './ChatWindow';
import type { ChatMessage, AgentProfile } from '../types';

// Mock SwarmContext so ChatWindow can import CaptainPanel which uses useSwarm
vi.mock('../SwarmContext', () => ({
  useSwarm: () => ({ profiles: [] }),
}));

const profile: AgentProfile = {
  id: 'ads', name: 'Ads', isCaptain: false, sessionId: 'agent-ads',
};
const messages: ChatMessage[] = [
  { id: '1', role: 'user', content: 'Hello', streaming: false },
  { id: '2', role: 'agent', content: 'Hi there', streaming: false },
];

describe('ChatWindow', () => {
  it('renders all messages', () => {
    render(
      <ChatWindow profile={profile} messages={messages}
        onSend={vi.fn()} wsConnected={true} onDispatch={vi.fn()} />
    );
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there')).toBeInTheDocument();
  });

  it('calls onSend with trimmed input when form submitted', () => {
    const onSend = vi.fn();
    render(
      <ChatWindow profile={profile} messages={[]}
        onSend={onSend} wsConnected={true} onDispatch={vi.fn()} />
    );
    const input = screen.getByPlaceholderText(/message/i);
    fireEvent.change(input, { target: { value: '  hello  ' } });
    fireEvent.submit(input.closest('form')!);
    expect(onSend).toHaveBeenCalledWith('hello');
  });

  it('disables input when ws is disconnected', () => {
    render(
      <ChatWindow profile={profile} messages={[]}
        onSend={vi.fn()} wsConnected={false} onDispatch={vi.fn()} />
    );
    expect(screen.getByPlaceholderText(/reconnecting/i)).toBeDisabled();
  });

  it('does not call onSend when input is empty', () => {
    const onSend = vi.fn();
    render(
      <ChatWindow profile={profile} messages={[]}
        onSend={onSend} wsConnected={true} onDispatch={vi.fn()} />
    );
    const input = screen.getByPlaceholderText(/message/i);
    fireEvent.submit(input.closest('form')!);
    expect(onSend).not.toHaveBeenCalled();
  });
});
