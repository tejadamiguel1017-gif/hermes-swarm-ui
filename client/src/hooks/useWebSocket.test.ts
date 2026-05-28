import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useWebSocket } from './useWebSocket';

class MockWebSocket {
  static OPEN = 1;
  readyState = MockWebSocket.OPEN;
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  send = vi.fn();
  close = vi.fn();
}

let mockInstance: MockWebSocket;
vi.stubGlobal('WebSocket', vi.fn(() => {
  mockInstance = new MockWebSocket();
  return mockInstance;
}));

describe('useWebSocket', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls onMessage when a message arrives', () => {
    const onMessage = vi.fn();
    renderHook(() => useWebSocket('ws://localhost:3000', onMessage));
    act(() => { mockInstance.onmessage?.({ data: '{"type":"profiles","profiles":[]}' }); });
    expect(onMessage).toHaveBeenCalledWith('{"type":"profiles","profiles":[]}');
  });

  it('send() calls ws.send when open', () => {
    const { result } = renderHook(() => useWebSocket('ws://localhost:3000', vi.fn()));
    act(() => { mockInstance.onopen?.(); });
    act(() => { result.current.send('hello'); });
    expect(mockInstance.send).toHaveBeenCalledWith('hello');
  });

  it('status transitions to open on ws.onopen', () => {
    const { result } = renderHook(() => useWebSocket('ws://localhost:3000', vi.fn()));
    expect(result.current.status).toBe('connecting');
    act(() => { mockInstance.onopen?.(); });
    expect(result.current.status).toBe('open');
  });

  it('status transitions to closed on ws.onclose', () => {
    const { result } = renderHook(() => useWebSocket('ws://localhost:3000', vi.fn()));
    act(() => { mockInstance.onopen?.(); });
    expect(result.current.status).toBe('open');
    // Prevent reconnect loop in test by nulling onclose before firing
    const savedOnClose = mockInstance.onclose;
    mockInstance.onclose = null;
    act(() => { savedOnClose?.(); });
    expect(result.current.status).toBe('closed');
  });
});
