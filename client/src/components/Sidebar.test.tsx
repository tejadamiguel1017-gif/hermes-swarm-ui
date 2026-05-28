import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Sidebar } from './Sidebar';
import type { AgentProfile, AgentStatus } from '../types';

const profiles: AgentProfile[] = [
  { id: 'captain', name: 'Captain', isCaptain: true, sessionId: 'agent-captain' },
  { id: 'ads', name: 'Ads', isCaptain: false, sessionId: 'agent-ads' },
];
const statuses: Record<string, AgentStatus> = { captain: 'idle', ads: 'responding' };

describe('Sidebar', () => {
  it('renders all profiles', () => {
    render(<Sidebar profiles={profiles} statuses={statuses} activeId="captain" onSelect={vi.fn()} />);
    expect(screen.getByText('Captain')).toBeInTheDocument();
    expect(screen.getByText('Ads')).toBeInTheDocument();
  });

  it('shows star icon for captain', () => {
    render(<Sidebar profiles={profiles} statuses={statuses} activeId="captain" onSelect={vi.fn()} />);
    expect(screen.getByText('★')).toBeInTheDocument();
  });

  it('calls onSelect with profile id when clicked', () => {
    const onSelect = vi.fn();
    render(<Sidebar profiles={profiles} statuses={statuses} activeId="captain" onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Ads'));
    expect(onSelect).toHaveBeenCalledWith('ads');
  });

  it('highlights the active profile', () => {
    render(<Sidebar profiles={profiles} statuses={statuses} activeId="ads" onSelect={vi.fn()} />);
    const adsItem = screen.getByText('Ads').closest('button');
    expect(adsItem?.className).toContain('bg-violet-900');
  });
});
