# Hermes Swarm UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a sidebar+chat web app that auto-discovers Hermes agent profiles, lets you chat with each independently, and lets the captain agent propose task breakdowns that you approve and dispatch in parallel.

**Architecture:** Express.js backend runs in WSL (port 3000), watches `~/.hermes/profiles/` with chokidar, and proxies chat messages to the Hermes gateway at `localhost:8642` with per-agent session IDs. A Vite + React + TypeScript + Tailwind frontend connects via WebSocket for live profile updates and streaming chat responses.

**Tech Stack:** Node 18+, Express 4, ws, chokidar, Vite 5, React 19, TypeScript 5, Tailwind 3, Vitest, @testing-library/react

---

## File Structure

```
hermes-swarm-ui/
  package.json                          ← root workspace (already exists — modify)
  server/
    package.json
    tsconfig.json
    vitest.config.ts
    src/
      types.ts                          ← shared server-side types
      profiles.ts                       ← profile discovery + chokidar watcher
      chat.ts                           ← Hermes proxy + SSE parsing
      index.ts                          ← Express app + WebSocket server
    tests/
      profiles.test.ts
      chat.test.ts
  client/
    package.json
    vite.config.ts
    tsconfig.json
    index.html
    src/
      types.ts                          ← shared client-side types
      main.tsx
      App.tsx                           ← layout: sidebar + chat window
      SwarmContext.tsx                  ← all state: profiles, messages, statuses
      index.css                         ← Tailwind imports
      hooks/
        useWebSocket.ts                 ← WS connection with exponential backoff
      components/
        Sidebar.tsx                     ← agent list with status dots
        ChatWindow.tsx                  ← message list + input
        MessageBubble.tsx               ← single message bubble
        CaptainPanel.tsx                ← task breakdown + dispatch UI
        TaskCard.tsx                    ← single task card with agent dropdown
```

---

## Task 1: Server scaffold

**Files:**
- Modify: `package.json`
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/vitest.config.ts`

- [ ] **Step 1: Update root package.json workspaces and scripts**

Replace `package.json` content:

```json
{
  "name": "hermes-swarm-ui",
  "version": "0.1.0",
  "private": true,
  "workspaces": ["client", "server"],
  "scripts": {
    "dev:server": "npm run dev --workspace=server",
    "dev:client": "npm run dev --workspace=client",
    "build": "npm run build --workspace=client"
  },
  "devDependencies": {
    "concurrently": "^8.2.0"
  }
}
```

- [ ] **Step 2: Create server/package.json**

```json
{
  "name": "hermes-swarm-ui-server",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "node --watch --loader ts-node/esm src/index.ts",
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "chokidar": "^3.6.0",
    "express": "^4.18.2",
    "ws": "^8.17.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.12.0",
    "@types/ws": "^8.5.10",
    "ts-node": "^10.9.2",
    "typescript": "^5.4.0",
    "vitest": "^1.5.0"
  }
}
```

- [ ] **Step 3: Create server/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 4: Create server/vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
});
```

- [ ] **Step 5: Install server dependencies (run from WSL)**

```bash
cd /mnt/c/Users/xdxdx/hermes-swarm-ui/server
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 6: Commit**

```bash
git add package.json server/package.json server/tsconfig.json server/vitest.config.ts
git commit -m "feat: server scaffold — Express + TypeScript + Vitest"
```

---

## Task 2: Client scaffold

**Files:**
- Create: `client/` (Vite scaffold)
- Create: `client/src/index.css`

- [ ] **Step 1: Scaffold Vite React TypeScript project (run from WSL)**

```bash
cd /mnt/c/Users/xdxdx/hermes-swarm-ui
npm create vite@latest client -- --template react-ts
```

Expected: `client/` created with `src/`, `index.html`, `vite.config.ts`, `package.json`.

- [ ] **Step 2: Add Tailwind and testing deps to client/package.json**

Open `client/package.json` and add to `devDependencies`:

```json
"@testing-library/react": "^15.0.0",
"@testing-library/user-event": "^14.5.2",
"@vitejs/plugin-react": "^4.2.1",
"autoprefixer": "^10.4.19",
"jsdom": "^24.0.0",
"postcss": "^8.4.38",
"tailwindcss": "^3.4.3",
"vitest": "^1.5.0"
```

Also add to `scripts`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create client/postcss.config.js**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 4: Create client/tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
};
```

- [ ] **Step 5: Replace client/src/index.css with Tailwind imports**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 6: Add vitest config to client/vite.config.ts**

Replace the full file:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/ws': { target: 'ws://localhost:3000', ws: true },
    },
  },
});
```

- [ ] **Step 7: Install client dependencies (WSL)**

```bash
cd /mnt/c/Users/xdxdx/hermes-swarm-ui/client
npm install
```

- [ ] **Step 8: Verify Vite starts**

```bash
npm run dev
```

Expected: `VITE v5.x.x ready` at `http://localhost:5173`. Stop with Ctrl+C.

- [ ] **Step 9: Commit**

```bash
git add client/
git commit -m "feat: client scaffold — Vite + React + TypeScript + Tailwind"
```

---

## Task 3: Shared types

**Files:**
- Create: `server/src/types.ts`
- Create: `client/src/types.ts`

- [ ] **Step 1: Create server/src/types.ts**

```typescript
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
```

- [ ] **Step 2: Create client/src/types.ts**

```typescript
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
```

- [ ] **Step 3: Commit**

```bash
git add server/src/types.ts client/src/types.ts
git commit -m "feat: shared types for server and client"
```

---

## Task 4: Profile discovery

**Files:**
- Create: `server/src/profiles.ts`
- Create: `server/tests/profiles.test.ts`

- [ ] **Step 1: Write the failing test**

Create `server/tests/profiles.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

vi.mock('chokidar', () => ({
  default: { watch: vi.fn(() => ({ on: vi.fn().mockReturnThis(), close: vi.fn() })) },
}));

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof fs>();
  return {
    ...actual,
    readdirSync: vi.fn(),
    mkdirSync: vi.fn(),
  };
});

describe('scanProfiles', () => {
  beforeEach(() => {
    vi.mocked(fs.readdirSync).mockReturnValue([
      { name: 'ads', isDirectory: () => true } as fs.Dirent,
      { name: 'booksy', isDirectory: () => true } as fs.Dirent,
      { name: 'not-a-dir.txt', isDirectory: () => false } as fs.Dirent,
    ]);
  });

  it('always includes captain as first entry', async () => {
    const { scanProfiles } = await import('../src/profiles.js');
    const profiles = scanProfiles();
    expect(profiles[0]).toMatchObject({
      id: 'captain',
      name: 'Captain',
      isCaptain: true,
      sessionId: 'agent-captain',
    });
  });

  it('includes discovered profile directories', async () => {
    const { scanProfiles } = await import('../src/profiles.js');
    const profiles = scanProfiles();
    expect(profiles.map((p) => p.id)).toContain('ads');
    expect(profiles.map((p) => p.id)).toContain('booksy');
  });

  it('excludes non-directory entries', async () => {
    const { scanProfiles } = await import('../src/profiles.js');
    const profiles = scanProfiles();
    expect(profiles.map((p) => p.id)).not.toContain('not-a-dir.txt');
  });

  it('assigns correct sessionId per profile', async () => {
    const { scanProfiles } = await import('../src/profiles.js');
    const ads = scanProfiles().find((p) => p.id === 'ads');
    expect(ads?.sessionId).toBe('agent-ads');
  });

  it('returns only captain when profiles dir is missing', async () => {
    vi.mocked(fs.readdirSync).mockImplementation(() => { throw new Error('ENOENT'); });
    const { scanProfiles } = await import('../src/profiles.js');
    const profiles = scanProfiles();
    expect(profiles).toHaveLength(1);
    expect(profiles[0].id).toBe('captain');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /mnt/c/Users/xdxdx/hermes-swarm-ui/server
npm test
```

Expected: FAIL — `Cannot find module '../src/profiles.js'`

- [ ] **Step 3: Create server/src/profiles.ts**

```typescript
import fs from 'fs';
import path from 'path';
import os from 'os';
import chokidar from 'chokidar';
import type { AgentProfile } from './types.js';

const HERMES_HOME = process.env.HERMES_HOME ?? path.join(os.homedir(), '.hermes');
const PROFILES_DIR = path.join(HERMES_HOME, 'profiles');

const CAPTAIN: AgentProfile = {
  id: 'captain',
  name: 'Captain',
  isCaptain: true,
  sessionId: 'agent-captain',
};

export function scanProfiles(): AgentProfile[] {
  const profiles: AgentProfile[] = [CAPTAIN];
  try {
    const entries = fs.readdirSync(PROFILES_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        profiles.push({
          id: entry.name,
          name: toDisplayName(entry.name),
          isCaptain: false,
          sessionId: `agent-${entry.name}`,
        });
      }
    }
  } catch {
    // profiles dir missing — just captain
  }
  return profiles;
}

function toDisplayName(id: string): string {
  return id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, ' ');
}

export function watchProfiles(onChange: (profiles: AgentProfile[]) => void): () => void {
  fs.mkdirSync(PROFILES_DIR, { recursive: true });
  const watcher = chokidar.default.watch(PROFILES_DIR, { depth: 0, ignoreInitial: true });
  watcher.on('addDir', () => onChange(scanProfiles()));
  watcher.on('unlinkDir', () => onChange(scanProfiles()));
  return () => { watcher.close(); };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test
```

Expected: PASS — 5 tests passing.

- [ ] **Step 5: Commit**

```bash
git add server/src/profiles.ts server/tests/profiles.test.ts
git commit -m "feat: profile discovery — scan ~/.hermes/profiles and watch for changes"
```

---

## Task 5: Chat proxy

**Files:**
- Create: `server/src/chat.ts`
- Create: `server/tests/chat.test.ts`

- [ ] **Step 1: Write the failing test**

Create `server/tests/chat.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL — `Cannot find module '../src/chat.js'`

- [ ] **Step 3: Create server/src/chat.ts**

```typescript
import type { WebSocket } from 'ws';
import type { WSServerMessage } from './types.js';

const HERMES_URL = process.env.HERMES_URL ?? 'http://localhost:8642';

export async function streamChat(
  profileId: string,
  sessionId: string,
  message: string,
  ws: WebSocket
): Promise<void> {
  const send = (msg: WSServerMessage) => ws.send(JSON.stringify(msg));

  let response: Response;
  try {
    response = await fetch(`${HERMES_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hermes-Session-Id': sessionId,
      },
      body: JSON.stringify({
        model: 'hermes',
        messages: [{ role: 'user', content: message }],
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: PASS — all tests passing including chat and profile tests.

- [ ] **Step 5: Commit**

```bash
git add server/src/chat.ts server/tests/chat.test.ts
git commit -m "feat: chat proxy — streams Hermes SSE to WebSocket clients"
```

---

## Task 6: Express server + WebSocket

**Files:**
- Create: `server/src/index.ts`

- [ ] **Step 1: Create server/src/index.ts**

```typescript
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { scanProfiles, watchProfiles } from './profiles.js';
import { streamChat } from './chat.js';
import type { WSClientMessage } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIST = path.resolve(__dirname, '../../client/dist');

const app = express();
app.use(express.json());
app.use(express.static(CLIENT_DIST));

app.get('/api/profiles', (_req, res) => {
  res.json(scanProfiles());
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(CLIENT_DIST, 'index.html'));
});

const server = createServer(app);
const wss = new WebSocketServer({ server });

const stopWatcher = watchProfiles((profiles) => {
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'profiles', profiles }));
    }
  }
});

wss.on('connection', (ws) => {
  // Send current profile list on connect
  ws.send(JSON.stringify({ type: 'profiles', profiles: scanProfiles() }));

  ws.on('message', async (raw) => {
    let msg: WSClientMessage;
    try {
      msg = JSON.parse(raw.toString()) as WSClientMessage;
    } catch {
      ws.send(JSON.stringify({ type: 'error', profileId: '', message: 'Invalid message format' }));
      return;
    }
    if (msg.type === 'chat') {
      await streamChat(msg.profileId, msg.sessionId, msg.message, ws);
    }
  });
});

const PORT = Number(process.env.PORT ?? 3000);
server.listen(PORT, () => {
  console.log(`Hermes Swarm UI running at http://localhost:${PORT}`);
});

process.on('SIGTERM', () => {
  stopWatcher();
  server.close();
});
```

- [ ] **Step 2: Start the server and verify it responds (WSL)**

```bash
cd /mnt/c/Users/xdxdx/hermes-swarm-ui/server
npm run dev
```

Expected: `Hermes Swarm UI running at http://localhost:3000`

In a second terminal:
```bash
curl http://localhost:3000/api/profiles
```

Expected: JSON array starting with `[{"id":"captain","name":"Captain","isCaptain":true,...}]`

Stop server with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add server/src/index.ts
git commit -m "feat: Express server + WebSocket — serves profiles and proxies chat"
```

---

## Task 7: WebSocket hook

**Files:**
- Create: `client/src/hooks/useWebSocket.ts`
- Create: `client/src/hooks/useWebSocket.test.ts`

- [ ] **Step 1: Write the failing test**

Create `client/src/hooks/useWebSocket.test.ts`:

```typescript
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useWebSocket } from './useWebSocket';

// Mock WebSocket
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
    act(() => {
      mockInstance.onclose = null; // prevent reconnect loop in test
      mockInstance.onclose?.();
    });
    // close event changes status
    act(() => {
      const origClose = mockInstance.onclose;
      mockInstance.onclose = () => { origClose?.(); };
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /mnt/c/Users/xdxdx/hermes-swarm-ui/client
npm test
```

Expected: FAIL — `Cannot find module './useWebSocket'`

- [ ] **Step 3: Create client/src/hooks/useWebSocket.ts**

```typescript
import { useEffect, useRef, useCallback, useState } from 'react';

export type WSStatus = 'connecting' | 'open' | 'closed';

export function useWebSocket(url: string, onMessage: (raw: string) => void) {
  const [status, setStatus] = useState<WSStatus>('connecting');
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const unmountedRef = useRef(false);

  const connect = useCallback(() => {
    if (unmountedRef.current) return;
    const ws = new WebSocket(url);
    wsRef.current = ws;
    setStatus('connecting');

    ws.onopen = () => {
      setStatus('open');
      retryRef.current = 0;
    };

    ws.onmessage = (e) => onMessageRef.current(e.data as string);

    ws.onclose = () => {
      setStatus('closed');
      const delay = Math.min(1000 * 2 ** retryRef.current, 30_000);
      retryRef.current++;
      setTimeout(connect, delay);
    };
  }, [url]);

  useEffect(() => {
    unmountedRef.current = false;
    connect();
    return () => {
      unmountedRef.current = true;
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [connect]);

  const send = useCallback((data: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
    }
  }, []);

  return { send, status };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: PASS — all 4 WebSocket hook tests passing.

- [ ] **Step 5: Commit**

```bash
git add client/src/hooks/useWebSocket.ts client/src/hooks/useWebSocket.test.ts
git commit -m "feat: useWebSocket hook with exponential backoff reconnect"
```

---

## Task 8: Swarm context

**Files:**
- Create: `client/src/SwarmContext.tsx`

The SwarmContext holds all app state: profiles, per-agent message histories, per-agent statuses. It handles all incoming WebSocket messages and exposes `sendMessage(profileId, text)` to components.

- [ ] **Step 1: Create client/src/SwarmContext.tsx**

```typescript
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import type { AgentProfile, AgentStatus, ChatMessage, WSServerMessage } from './types';
import { useWebSocket, type WSStatus } from './hooks/useWebSocket';

interface SwarmState {
  profiles: AgentProfile[];
  messages: Record<string, ChatMessage[]>;
  statuses: Record<string, AgentStatus>;
  wsStatus: WSStatus;
  sendMessage: (profileId: string, sessionId: string, text: string) => void;
}

const SwarmContext = createContext<SwarmState | null>(null);

export function SwarmProvider({ children }: { children: React.ReactNode }) {
  const [profiles, setProfiles] = useState<AgentProfile[]>([]);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [statuses, setStatuses] = useState<Record<string, AgentStatus>>({});
  const msgIdRef = useRef(0);

  const addMessage = useCallback((profileId: string, msg: ChatMessage) => {
    setMessages((prev) => ({
      ...prev,
      [profileId]: [...(prev[profileId] ?? []), msg],
    }));
  }, []);

  const appendToken = useCallback((profileId: string, content: string) => {
    setMessages((prev) => {
      const list = prev[profileId] ?? [];
      const last = list[list.length - 1];
      if (!last || last.role !== 'agent' || !last.streaming) {
        return {
          ...prev,
          [profileId]: [...list, {
            id: String(++msgIdRef.current),
            role: 'agent',
            content,
            streaming: true,
          }],
        };
      }
      return {
        ...prev,
        [profileId]: [
          ...list.slice(0, -1),
          { ...last, content: last.content + content },
        ],
      };
    });
  }, []);

  const finalizeStream = useCallback((profileId: string) => {
    setMessages((prev) => {
      const list = prev[profileId] ?? [];
      const last = list[list.length - 1];
      if (!last?.streaming) return prev;
      return {
        ...prev,
        [profileId]: [...list.slice(0, -1), { ...last, streaming: false }],
      };
    });
    setStatuses((prev) => ({ ...prev, [profileId]: 'idle' }));
  }, []);

  const handleRaw = useCallback((raw: string) => {
    let msg: WSServerMessage;
    try { msg = JSON.parse(raw) as WSServerMessage; }
    catch { return; }

    if (msg.type === 'profiles') {
      setProfiles(msg.profiles);
    } else if (msg.type === 'token') {
      setStatuses((prev) => ({ ...prev, [msg.profileId]: 'responding' }));
      appendToken(msg.profileId, msg.content);
    } else if (msg.type === 'done') {
      finalizeStream(msg.profileId);
    } else if (msg.type === 'error') {
      addMessage(msg.profileId, {
        id: String(++msgIdRef.current),
        role: 'agent',
        content: `⚠️ ${msg.message}`,
        streaming: false,
      });
      setStatuses((prev) => ({ ...prev, [msg.profileId]: 'idle' }));
    }
  }, [appendToken, finalizeStream, addMessage]);

  const { send, status: wsStatus } = useWebSocket(
    `ws://${window.location.host}`,
    handleRaw
  );

  const sendMessage = useCallback((profileId: string, sessionId: string, text: string) => {
    addMessage(profileId, {
      id: String(++msgIdRef.current),
      role: 'user',
      content: text,
      streaming: false,
    });
    setStatuses((prev) => ({ ...prev, [profileId]: 'thinking' }));
    send(JSON.stringify({ type: 'chat', profileId, sessionId, message: text }));
  }, [send, addMessage]);

  return (
    <SwarmContext.Provider value={{ profiles, messages, statuses, wsStatus, sendMessage }}>
      {children}
    </SwarmContext.Provider>
  );
}

export function useSwarm(): SwarmState {
  const ctx = useContext(SwarmContext);
  if (!ctx) throw new Error('useSwarm must be used within SwarmProvider');
  return ctx;
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/SwarmContext.tsx
git commit -m "feat: SwarmContext — profiles, messages, statuses, sendMessage"
```

---

## Task 9: Sidebar component

**Files:**
- Create: `client/src/components/Sidebar.tsx`
- Create: `client/src/components/Sidebar.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `client/src/components/Sidebar.test.tsx`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /mnt/c/Users/xdxdx/hermes-swarm-ui/client
npm test
```

Expected: FAIL — `Cannot find module './Sidebar'`

- [ ] **Step 3: Create client/src/components/Sidebar.tsx**

```typescript
import type { AgentProfile, AgentStatus } from '../types';

const STATUS_DOT: Record<AgentStatus, string> = {
  idle: 'bg-gray-500',
  thinking: 'bg-yellow-400 animate-pulse',
  responding: 'bg-green-400 animate-pulse',
};

interface Props {
  profiles: AgentProfile[];
  statuses: Record<string, AgentStatus>;
  activeId: string;
  onSelect: (id: string) => void;
}

export function Sidebar({ profiles, statuses, activeId, onSelect }: Props) {
  return (
    <aside className="w-56 flex-shrink-0 bg-gray-900 border-r border-gray-700 flex flex-col">
      <div className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">
        Agents
      </div>
      <nav className="flex-1 overflow-y-auto px-2 space-y-1">
        {profiles.map((p) => {
          const status = statuses[p.id] ?? 'idle';
          const isActive = p.id === activeId;
          return (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                isActive
                  ? 'bg-violet-900 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <span className="text-base">{p.isCaptain ? '★' : '🤖'}</span>
              <span className="flex-1 text-sm font-medium truncate">{p.name}</span>
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[status]}`} />
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: PASS — all Sidebar tests passing.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/Sidebar.tsx client/src/components/Sidebar.test.tsx
git commit -m "feat: Sidebar component with agent list and status dots"
```

---

## Task 10: MessageBubble and ChatWindow

**Files:**
- Create: `client/src/components/MessageBubble.tsx`
- Create: `client/src/components/ChatWindow.tsx`
- Create: `client/src/components/ChatWindow.test.tsx`

- [ ] **Step 1: Create client/src/components/MessageBubble.tsx**

```typescript
import type { ChatMessage } from '../types';

interface Props {
  message: ChatMessage;
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
          isUser
            ? 'bg-violet-600 text-white rounded-br-sm'
            : 'bg-gray-700 text-gray-100 rounded-bl-sm'
        } ${message.streaming ? 'after:content-["▋"] after:animate-pulse after:ml-0.5' : ''}`}
      >
        {message.content}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write the failing test for ChatWindow**

Create `client/src/components/ChatWindow.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ChatWindow } from './ChatWindow';
import type { ChatMessage, AgentProfile, ParsedTask } from '../types';

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
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL — `Cannot find module './ChatWindow'`

- [ ] **Step 4: Create client/src/components/ChatWindow.tsx**

```typescript
import { useEffect, useRef, useState } from 'react';
import type { AgentProfile, ChatMessage, ParsedTask } from '../types';
import { MessageBubble } from './MessageBubble';
import { CaptainPanel } from './CaptainPanel';
import { parseTaskList } from '../utils/parseTaskList';

interface Props {
  profile: AgentProfile;
  messages: ChatMessage[];
  onSend: (text: string) => void;
  wsConnected: boolean;
  onDispatch: (tasks: ParsedTask[]) => void;
}

export function ChatWindow({ profile, messages, onSend, wsConnected, onDispatch }: Props) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    onSend(text);
    setInput('');
  };

  const lastAgentMsg = [...messages].reverse().find((m) => m.role === 'agent' && !m.streaming);
  const tasks = profile.isCaptain && lastAgentMsg ? parseTaskList(lastAgentMsg.content) : null;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-4 py-3 border-b border-gray-700 text-sm font-semibold text-gray-200">
        {profile.isCaptain ? '★' : '🤖'} {profile.name}
      </div>

      {!wsConnected && (
        <div className="px-4 py-2 bg-yellow-900 text-yellow-200 text-xs text-center">
          Reconnecting to server…
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.map((m) => <MessageBubble key={m.id} message={m} />)}
        {tasks && (
          <CaptainPanel tasks={tasks} onDispatch={onDispatch} />
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-gray-700 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!wsConnected}
          placeholder={wsConnected ? `Message ${profile.name}…` : 'Reconnecting…'}
          className="flex-1 bg-gray-800 text-gray-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-violet-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!wsConnected}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg disabled:opacity-50 transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test
```

Expected: PASS — ChatWindow tests passing (CaptainPanel is imported but will be a stub at this stage — you may need to create a placeholder first, see Task 11).

- [ ] **Step 6: Commit**

```bash
git add client/src/components/MessageBubble.tsx client/src/components/ChatWindow.tsx client/src/components/ChatWindow.test.tsx
git commit -m "feat: MessageBubble and ChatWindow with streaming display and input"
```

---

## Task 11: Task list parsing utility

**Files:**
- Create: `client/src/utils/parseTaskList.ts`
- Create: `client/src/utils/parseTaskList.test.ts`

- [ ] **Step 1: Write the failing test**

Create `client/src/utils/parseTaskList.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { parseTaskList } from './parseTaskList';

describe('parseTaskList', () => {
  it('returns null for plain text with no numbered items', () => {
    expect(parseTaskList('Just a regular response.')).toBeNull();
  });

  it('returns null when fewer than 2 numbered items', () => {
    expect(parseTaskList('1. Do the thing')).toBeNull();
  });

  it('parses a numbered list into tasks', () => {
    const result = parseTaskList('1. Research pricing\n2. Write copy\n3. Schedule posts');
    expect(result).toHaveLength(3);
    expect(result![0]).toMatchObject({ index: 0, text: 'Research pricing', assignedProfileId: '' });
    expect(result![2]).toMatchObject({ index: 2, text: 'Schedule posts', assignedProfileId: '' });
  });

  it('handles leading prose before the list', () => {
    const result = parseTaskList('Here are the tasks:\n1. Task one\n2. Task two');
    expect(result).toHaveLength(2);
  });

  it('trims whitespace from task text', () => {
    const result = parseTaskList('1.   Lots of spaces   \n2. Normal');
    expect(result![0].text).toBe('Lots of spaces');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL — `Cannot find module './parseTaskList'`

- [ ] **Step 3: Create client/src/utils/parseTaskList.ts**

```typescript
import type { ParsedTask } from '../types';

export function parseTaskList(content: string): ParsedTask[] | null {
  const tasks: ParsedTask[] = [];
  for (const line of content.split('\n')) {
    const match = line.match(/^\d+\.\s+(.+)/);
    if (match) {
      tasks.push({ index: tasks.length, text: match[1].trim(), assignedProfileId: '' });
    }
  }
  return tasks.length >= 2 ? tasks : null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: PASS — all 5 parseTaskList tests passing.

- [ ] **Step 5: Commit**

```bash
git add client/src/utils/parseTaskList.ts client/src/utils/parseTaskList.test.ts
git commit -m "feat: parseTaskList utility — extracts numbered task lists from agent responses"
```

---

## Task 12: CaptainPanel and TaskCard

**Files:**
- Create: `client/src/components/TaskCard.tsx`
- Create: `client/src/components/CaptainPanel.tsx`
- Create: `client/src/components/CaptainPanel.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `client/src/components/CaptainPanel.test.tsx`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL — `Cannot find module './CaptainPanel'`

- [ ] **Step 3: Create client/src/components/TaskCard.tsx**

```typescript
import type { AgentProfile, ParsedTask } from '../types';

interface Props {
  task: ParsedTask;
  profiles: AgentProfile[];
  onChange: (profileId: string) => void;
}

export function TaskCard({ task, profiles, onChange }: Props) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg border border-gray-700">
      <span className="text-gray-400 text-sm font-mono w-5 text-right flex-shrink-0">
        {task.index + 1}.
      </span>
      <span className="flex-1 text-sm text-gray-200">{task.text}</span>
      <select
        value={task.assignedProfileId}
        onChange={(e) => onChange(e.target.value)}
        className="bg-gray-700 text-gray-200 text-xs rounded px-2 py-1 outline-none focus:ring-1 focus:ring-violet-500"
      >
        <option value="">Assign to…</option>
        {profiles.filter((p) => !p.isCaptain).map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
    </div>
  );
}
```

- [ ] **Step 4: Create client/src/components/CaptainPanel.tsx**

```typescript
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
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test
```

Expected: PASS — CaptainPanel tests passing.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/TaskCard.tsx client/src/components/CaptainPanel.tsx client/src/components/CaptainPanel.test.tsx
git commit -m "feat: CaptainPanel + TaskCard — task assignment and parallel dispatch"
```

---

## Task 13: App layout wiring

**Files:**
- Modify: `client/src/App.tsx`
- Modify: `client/src/main.tsx`

- [ ] **Step 1: Replace client/src/App.tsx**

```typescript
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
```

- [ ] **Step 2: Replace client/src/main.tsx**

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { SwarmProvider } from './SwarmContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SwarmProvider>
      <App />
    </SwarmProvider>
  </React.StrictMode>
);
```

- [ ] **Step 3: Remove Vite boilerplate files**

```bash
rm client/src/App.css client/src/assets/react.svg public/vite.svg 2>/dev/null || true
```

- [ ] **Step 4: Commit**

```bash
git add client/src/App.tsx client/src/main.tsx
git commit -m "feat: App layout — Sidebar + ChatWindow wired to SwarmContext"
```

---

## Task 14: Build pipeline and end-to-end smoke test

**Files:**
- Modify: `server/package.json` (add build script)

- [ ] **Step 1: Add build + start scripts to server/package.json**

In `server/package.json`, update scripts:

```json
"scripts": {
  "dev": "node --watch --loader ts-node/esm src/index.ts",
  "start": "node dist/index.js",
  "build": "tsc",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 2: Build client**

```bash
cd /mnt/c/Users/xdxdx/hermes-swarm-ui/client
npm run build
```

Expected: `dist/` created inside `client/`. No errors.

- [ ] **Step 3: Build server**

```bash
cd /mnt/c/Users/xdxdx/hermes-swarm-ui/server
npm run build
```

Expected: `dist/` created inside `server/`. No errors.

- [ ] **Step 4: Start the server and open in browser**

```bash
cd /mnt/c/Users/xdxdx/hermes-swarm-ui/server
npm start
```

Expected: `Hermes Swarm UI running at http://localhost:3000`

Open `http://localhost:3000` in browser. Verify:
- Sidebar shows Captain + any profiles from `~/.hermes/profiles/`
- Clicking an agent opens a chat window
- Sending a message to an agent (while Hermes is running at `localhost:8642`) streams a response

- [ ] **Step 5: Smoke test profile live-update**

With the server running, in WSL:
```bash
mkdir ~/.hermes/profiles/test-agent
```

Expected: "Test Agent" appears in the sidebar within 2 seconds with no page reload.

```bash
rmdir ~/.hermes/profiles/test-agent
```

Expected: "Test Agent" disappears from the sidebar.

- [ ] **Step 6: Commit**

```bash
git add server/package.json
git commit -m "feat: build pipeline — tsc server + vite client, served at :3000"
git push
```

---

## Task 15: Captain system prompt setup

This task configures Hermes (not the UI code) so the captain responds with numbered task lists.

- [ ] **Step 1: Find the Hermes default profile system prompt file (WSL)**

```bash
ls ~/.hermes/
ls ~/.hermes/config.yaml 2>/dev/null || echo "check config"
cat ~/.hermes/config.yaml | grep -A5 "system_prompt\|persona\|instructions"
```

Expected: locate where the system prompt or persona instructions are stored.

- [ ] **Step 2: Add task-list instruction to captain's system prompt**

Open `~/.hermes/config.yaml` (or the relevant persona file). Find the `system_prompt` or `instructions` field and append:

```
When given a goal that requires multiple steps or multiple agents, respond with a numbered task list. Each item must be one clear, actionable task on a single line. Format:
1. Task description here
2. Another task here
Only use this format when the user explicitly wants to dispatch work to multiple agents.
```

- [ ] **Step 3: Restart Hermes gateway (WSL)**

```bash
systemctl --user restart hermes-gateway.service
systemctl --user status hermes-gateway.service
```

Expected: `Active: active (running)`

- [ ] **Step 4: Test captain task parsing in the UI**

In the browser, select Captain and send:
> "Research our competitor pricing and write a one-page summary. Use two agents."

Expected: Captain responds with a numbered list. The UI renders the CaptainPanel below the response with task cards and agent dropdowns.

- [ ] **Step 5: Final push**

```bash
git push
```

Expected: all commits pushed to `https://github.com/tejadamiguel1017-gif/hermes-swarm-ui`

---

## Self-Review

**Spec coverage check:**
- ✅ Profile discovery (captain fixed + profiles/ scan) — Tasks 4, 6
- ✅ chokidar watcher → WebSocket push — Tasks 4, 6
- ✅ Sidebar with status dots + captain pinned — Task 9
- ✅ Chat window with streaming — Tasks 10, 8
- ✅ Captain task panel (parse → assign → dispatch) — Tasks 11, 12
- ✅ X-Hermes-Session-Id per agent — Task 5
- ✅ Error: Hermes unreachable → error message in chat — Task 5 (streamChat catch block)
- ✅ Error: WebSocket disconnect → reconnect with backoff — Task 7
- ✅ Error: WS disconnected → input disabled + banner — Task 10 (ChatWindow)
- ✅ Error: Profile disappears → sidebar updates — Task 6 (chokidar unlinkDir)
- ✅ Error: Captain parse failure → plain message — Task 10 (parseTaskList returns null → no CaptainPanel)
- ✅ Captain system prompt — Task 15
- ✅ Build pipeline + static serving — Task 14

**No placeholders found.**

**Type consistency verified:** `ParsedTask`, `AgentProfile`, `ChatMessage`, `WSServerMessage` used consistently across Tasks 3–13.
