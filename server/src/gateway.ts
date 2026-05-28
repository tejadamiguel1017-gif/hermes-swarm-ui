import { exec } from 'child_process';
import { promisify } from 'util';
import type { GatewayStatus } from './types.js';

const execAsync = promisify(exec);
const HERMES_API_KEY = process.env.HERMES_API_KEY ?? '';

function svcName(profileId: string): string {
  return profileId === 'captain' ? 'hermes-gateway' : `hermes-gateway-${profileId}`;
}

async function isSvcActive(profileId: string): Promise<string> {
  const svc = svcName(profileId);
  try {
    const { stdout } = await execAsync(
      `wsl -u xdxd bash -lc "systemctl --user is-active ${svc}.service 2>/dev/null"`
    );
    return stdout.trim();
  } catch {
    return 'inactive';
  }
}

async function isPortReady(port: number): Promise<boolean> {
  try {
    const headers: Record<string, string> = {};
    if (HERMES_API_KEY) headers['Authorization'] = `Bearer ${HERMES_API_KEY}`;
    const res = await fetch(`http://localhost:${port}/v1/models`, {
      headers,
      signal: AbortSignal.timeout(2000),
    });
    return res.status < 500;
  } catch {
    return false;
  }
}

export async function getStatus(profileId: string, port?: number): Promise<GatewayStatus> {
  const state = await isSvcActive(profileId);
  if (state === 'deactivating') return 'stopping';
  if (state !== 'active' && state !== 'activating') return 'stopped';
  if (state === 'activating' || !port) return 'starting';
  return (await isPortReady(port)) ? 'running' : 'starting';
}

export async function start(profileId: string): Promise<void> {
  if (profileId === 'captain') return;
  const svc = svcName(profileId);
  await execAsync(`wsl -u xdxd bash -lc "systemctl --user start ${svc}.service 2>&1"`);
}

export async function stop(profileId: string): Promise<void> {
  if (profileId === 'captain') return;
  const svc = svcName(profileId);
  await execAsync(`wsl -u xdxd bash -lc "systemctl --user stop ${svc}.service 2>&1"`);
}

export async function getOAuthUrl(profileId: string): Promise<string | null> {
  const svc = svcName(profileId);
  try {
    const { stdout } = await execAsync(
      `wsl -u xdxd bash -lc "journalctl --user -u ${svc}.service -n 60 --no-pager 2>/dev/null"`
    );
    const match = stdout.match(/https?:\/\/\S+oauth2\/authorize\S*/);
    return match ? match[0] : null;
  } catch {
    return null;
  }
}
