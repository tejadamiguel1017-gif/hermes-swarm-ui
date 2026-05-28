import type { WebSocket } from 'ws';
import type { WSServerMessage } from './types.js';

const HERMES_URL_DEFAULT = process.env.HERMES_URL ?? 'http://localhost:8642';
const HERMES_API_KEY = process.env.HERMES_API_KEY ?? '';

export async function streamChat(
  profileId: string,
  sessionId: string,
  hermesUrl: string | undefined,
  soul: string | undefined,
  message: string,
  ws: WebSocket
): Promise<void> {
  const send = (msg: WSServerMessage) => ws.send(JSON.stringify(msg));
  const baseUrl = hermesUrl ?? HERMES_URL_DEFAULT;

  const messages = [
    ...(soul ? [{ role: 'system', content: soul }] : []),
    { role: 'user', content: message },
  ];

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hermes-Session-Id': sessionId,
        'X-Hermes-Session-Key': profileId,
        ...(HERMES_API_KEY && { 'Authorization': `Bearer ${HERMES_API_KEY}` }),
      },
      body: JSON.stringify({
        model: 'hermes',
        messages,
        stream: true,
      }),
    });
  } catch {
    send({ type: 'error', profileId, message: "Can't reach Hermes — is the gateway running?" });
    return;
  }

  if (!response.ok) {
    send({ type: 'error', profileId, message: `Hermes error: ${response.status}` });
    return;
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop()!;

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') {
        send({ type: 'done', profileId });
        return;
      }
      try {
        const chunk = JSON.parse(data);
        const content = chunk.choices?.[0]?.delta?.content;
        if (content) send({ type: 'token', profileId, content });
      } catch {
        // malformed SSE chunk — skip
      }
    }
  }
  send({ type: 'done', profileId });
}
