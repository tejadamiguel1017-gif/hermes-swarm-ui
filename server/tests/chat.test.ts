import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebSocket } from 'ws';

const mockSend = vi.fn();
const mockWs = { send: mockSend, readyState: 1 } as unknown as WebSocket;

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function makeStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      if (i < chunks.length) controller.enqueue(encoder.encode(chunks[i++]));
      else controller.close();
    },
  });
}

describe('streamChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends token messages for each SSE chunk', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      body: makeStream([
        'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
        'data: [DONE]\n\n',
      ]),
    });

    const { streamChat } = await import('../src/chat.js');
    await streamChat('ads', 'agent-ads', 'hi', mockWs);

    expect(mockSend).toHaveBeenCalledWith(
      JSON.stringify({ type: 'token', profileId: 'ads', content: 'Hello' })
    );
    expect(mockSend).toHaveBeenCalledWith(
      JSON.stringify({ type: 'token', profileId: 'ads', content: ' world' })
    );
    expect(mockSend).toHaveBeenCalledWith(
      JSON.stringify({ type: 'done', profileId: 'ads' })
    );
  });

  it('sends error message when Hermes returns non-ok status', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 503, body: null });

    const { streamChat } = await import('../src/chat.js');
    await streamChat('ads', 'agent-ads', 'hi', mockWs);

    expect(mockSend).toHaveBeenCalledWith(
      JSON.stringify({ type: 'error', profileId: 'ads', message: 'Hermes error: 503' })
    );
  });

  it('sends correct X-Hermes-Session-Id header', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      body: makeStream(['data: [DONE]\n\n']),
    });

    const { streamChat } = await import('../src/chat.js');
    await streamChat('ads', 'agent-ads', 'hello', mockWs);

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers['X-Hermes-Session-Id']).toBe('agent-ads');
  });
});
