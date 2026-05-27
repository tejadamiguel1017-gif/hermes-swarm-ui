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
  const watcher = chokidar.watch(PROFILES_DIR, { depth: 0, ignoreInitial: true });
  watcher.on('addDir', () => onChange(scanProfiles()));
  watcher.on('unlinkDir', () => onChange(scanProfiles()));
  return () => { watcher.close(); };
}
