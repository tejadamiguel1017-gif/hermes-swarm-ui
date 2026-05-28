import fs from 'fs';
import path from 'path';
import os from 'os';
import chokidar from 'chokidar';
import type { AgentProfile } from './types.js';

const HERMES_HOME = process.env.HERMES_HOME ?? path.join(os.homedir(), '.hermes');
const PROFILES_DIR = process.env.HERMES_PROFILES_DIR ?? path.join(HERMES_HOME, 'profiles');
const HERMES_URL = process.env.HERMES_URL ?? 'http://localhost:8642';
const HERMES_WIN_HOME = path.dirname(PROFILES_DIR);

const CAPTAIN: AgentProfile = {
  id: 'captain',
  name: 'Captain',
  isCaptain: true,
  sessionId: 'agent-captain',
  url: HERMES_URL,
  status: 'running',
};

function readApiPort(profileDir: string): number | undefined {
  try {
    const raw = fs.readFileSync(path.join(profileDir, 'api-port'), 'utf8').trim();
    const port = parseInt(raw, 10);
    return isNaN(port) ? undefined : port;
  } catch {
    return undefined;
  }
}

export function getProfilePort(profileId: string): number | undefined {
  if (profileId === 'captain') return 8642;
  return readApiPort(path.join(PROFILES_DIR, profileId));
}

function soulPath(profileId: string): string {
  return profileId === 'captain'
    ? path.join(HERMES_WIN_HOME, 'SOUL.md')
    : path.join(PROFILES_DIR, profileId, 'SOUL.md');
}

function configPath(profileId: string): string {
  return profileId === 'captain'
    ? path.join(HERMES_WIN_HOME, 'config.yaml')
    : path.join(PROFILES_DIR, profileId, 'config.yaml');
}

export function readSoul(profileId: string): string | undefined {
  try { return fs.readFileSync(soulPath(profileId), 'utf8').trim() || undefined; }
  catch { return undefined; }
}

export function writeSoul(profileId: string, content: string): void {
  fs.writeFileSync(soulPath(profileId), content, 'utf8');
}

export function readConfig(profileId: string): string | undefined {
  try { return fs.readFileSync(configPath(profileId), 'utf8'); }
  catch { return undefined; }
}

export function scanProfiles(): AgentProfile[] {
  const profiles: AgentProfile[] = [CAPTAIN];
  try {
    const entries = fs.readdirSync(PROFILES_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const profileDir = path.join(PROFILES_DIR, entry.name);
        const port = readApiPort(profileDir);
        profiles.push({
          id: entry.name,
          name: toDisplayName(entry.name),
          isCaptain: false,
          sessionId: `agent-${entry.name}`,
          url: port ? `http://localhost:${port}` : HERMES_URL,
          status: 'stopped',
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
  try { fs.mkdirSync(PROFILES_DIR, { recursive: true }); } catch { /* ok */ }
  const watcher = chokidar.watch(PROFILES_DIR, {
    depth: 0,
    ignoreInitial: true,
    usePolling: true,
    interval: 2000,
  });
  watcher.on('addDir', () => onChange(scanProfiles()));
  watcher.on('unlinkDir', () => onChange(scanProfiles()));
  watcher.on('error', (err) => console.error('Profile watcher error:', err));
  return () => { watcher.close(); };
}
