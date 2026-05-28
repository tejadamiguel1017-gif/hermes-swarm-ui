import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { scanProfiles, watchProfiles, readSoul, writeSoul, readConfig, getProfilePort } from './profiles.js';
import { streamChat } from './chat.js';
import * as gateway from './gateway.js';
import type { AgentProfile, WSClientMessage, WSServerMessage } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIST = path.resolve(__dirname, '../../client/dist');

const app = express();
app.use(express.json());
app.use(express.static(CLIENT_DIST));

// ── Profile state ────────────────────────────────────────────────────────────

let currentProfiles: AgentProfile[] = scanProfiles();

function broadcast(msg: WSServerMessage) {
  const data = JSON.stringify(msg);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(data);
  }
}

// ── Status polling ───────────────────────────────────────────────────────────

async function refreshStatuses() {
  for (const profile of currentProfiles) {
    if (profile.isCaptain) continue; // captain always running
    const port = getProfilePort(profile.id);
    const status = await gateway.getStatus(profile.id, port);
    const authUrl = status === 'starting' ? (await gateway.getOAuthUrl(profile.id)) ?? undefined : undefined;
    if (status !== profile.status || authUrl !== profile.authUrl) {
      profile.status = status;
      profile.authUrl = authUrl;
      broadcast({ type: 'profile_status', profileId: profile.id, status, authUrl });
    }
  }
}

setInterval(refreshStatuses, 5000);

// ── Profile watcher ──────────────────────────────────────────────────────────

const stopWatcher = watchProfiles((profiles) => {
  // Merge status from currentProfiles into new list
  const statusMap = new Map(currentProfiles.map(p => [p.id, { status: p.status, authUrl: p.authUrl }]));
  for (const p of profiles) {
    const s = statusMap.get(p.id);
    if (s) { p.status = s.status; p.authUrl = s.authUrl; }
  }
  currentProfiles = profiles;
  broadcast({ type: 'profiles', profiles });
});

// ── REST API ─────────────────────────────────────────────────────────────────

app.get('/api/profiles', (_req, res) => {
  res.json(currentProfiles);
});

app.post('/api/profiles/:id/start', async (req, res) => {
  const { id } = req.params;
  const profile = currentProfiles.find(p => p.id === id);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  if (profile.isCaptain) return res.status(400).json({ error: 'Captain is always running' });
  try {
    await gateway.start(id);
    profile.status = 'starting';
    broadcast({ type: 'profile_status', profileId: id, status: 'starting' });
    res.json({ status: 'starting' });
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

app.post('/api/profiles/:id/stop', async (req, res) => {
  const { id } = req.params;
  const profile = currentProfiles.find(p => p.id === id);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  if (profile.isCaptain) return res.status(400).json({ error: 'Captain cannot be stopped' });
  try {
    await gateway.stop(id);
    profile.status = 'stopping';
    broadcast({ type: 'profile_status', profileId: id, status: 'stopping' });
    res.json({ status: 'stopping' });
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

app.get('/api/profiles/:id/soul', (req, res) => {
  const { id } = req.params;
  const soul = readSoul(id) ?? '';
  res.json({ soul });
});

app.put('/api/profiles/:id/soul', (req, res) => {
  const { id } = req.params;
  const { soul } = req.body as { soul: string };
  if (typeof soul !== 'string') return res.status(400).json({ error: 'soul must be a string' });
  try {
    writeSoul(id, soul);
    res.json({ ok: true });
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

app.get('/api/profiles/:id/config', (req, res) => {
  const { id } = req.params;
  const config = readConfig(id) ?? '';
  res.json({ config });
});

app.get('*' as string, (_req, res) => {
  res.sendFile(path.join(CLIENT_DIST, 'index.html'));
});

// ── WebSocket ────────────────────────────────────────────────────────────────

const server = createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'profiles', profiles: currentProfiles }));

  ws.on('message', async (raw) => {
    let msg: WSClientMessage;
    try {
      msg = JSON.parse(raw.toString()) as WSClientMessage;
    } catch {
      ws.send(JSON.stringify({ type: 'error', profileId: '', message: 'Invalid message format' }));
      return;
    }
    if (msg.type === 'chat') {
      const profile = currentProfiles.find(p => p.id === msg.profileId);
      if (profile?.status !== 'running') {
        ws.send(JSON.stringify({ type: 'error', profileId: msg.profileId, message: 'Agent is offline — start it from the sidebar first.' }));
        return;
      }
      const soul = readSoul(msg.profileId);
      await streamChat(msg.profileId, msg.sessionId, profile.url, soul, msg.message, ws);
    }
  });
});

// ── Start ────────────────────────────────────────────────────────────────────

const PORT = Number(process.env.PORT ?? 3000);
server.listen(PORT, () => {
  console.log(`Hermes Swarm UI running at http://localhost:${PORT}`);
  // Initial status refresh after a short delay
  setTimeout(refreshStatuses, 2000);
});

process.on('SIGTERM', () => {
  stopWatcher();
  server.close();
});
