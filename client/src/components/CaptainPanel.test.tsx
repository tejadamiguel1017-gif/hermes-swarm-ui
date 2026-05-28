import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CaptainPanel } from './CaptainPanel';
import type { ParsedTask } from '../types';

const tasks: ParsedTask[] = [
  { index: 0, text: 'Research pricing', assignedProfileId: '' },
  { index: 1, text: 'Write ad copy', assignedProfileId: '' },
];

const profiles = [
  { id: 'ads', name: 'Ads', isCaptain: false, sessionId: 'agent-ads' },
  { id: 'booksy', name: 'Booksy', isCaptain: false, sessionId: 'agent-booksy' },
];

vi.mock('../SwarmContext', () => ({
  useSwarm: () => ({ profiles }),
}));

describe('CaptainPanel', () => {
  it('renders each task', () => {
    render(<CaptainPanel tasks={tasks} onDispatch={vi.fn()} />);
    expect(screen.getByText('Research pricing')).toBeInTheDocument();
    expect(screen.getByText('Write ad copy')).toBeInTheDocument();
  });

  it('calls onDispatch with tasks including assigned profileId', () => {
    const onDispatch = vi.fn();
    render(<CaptainPanel tasks={tasks} onDispatch={onDispatch} />);
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'ads' } });
    fireEvent.change(selects[1], { target: { value: 'booksy' } });
    fireEvent.click(screen.getByRole('button', { name: /dispatch/i }));
    expect(onDispatch).toHaveBeenCalledWith([
      { index: 0, text: 'Research pricing', assignedProfileId: 'ads' },
      { index: 1, text: 'Write ad copy', assignedProfileId: 'booksy' },
    ]);
  });
});
