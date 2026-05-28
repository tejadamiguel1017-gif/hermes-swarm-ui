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

app.get('*' as string, (_req, res) => {
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
