import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('chokidar', () => ({
  default: { watch: vi.fn(() => ({ on: vi.fn().mockReturnThis(), close: vi.fn() })) },
}));

const mockReaddirSync = vi.fn();
const mockMkdirSync = vi.fn();

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    default: {
      ...(actual as any),
      readdirSync: mockReaddirSync,
      mkdirSync: mockMkdirSync,
    },
    readdirSync: mockReaddirSync,
    mkdirSync: mockMkdirSync,
  };
});

describe('scanProfiles', () => {
  beforeEach(() => {
    vi.resetModules();
    mockReaddirSync.mockReset();
    mockMkdirSync.mockReset();
    mockReaddirSync.mockReturnValue([
      { name: 'ads', isDirectory: () => true },
      { name: 'booksy', isDirectory: () => true },
      { name: 'not-a-dir.txt', isDirectory: () => false },
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
    mockReaddirSync.mockImplementation(() => { throw new Error('ENOENT'); });
    const { scanProfiles } = await import('../src/profiles.js');
    const profiles = scanProfiles();
    expect(profiles).toHaveLength(1);
    expect(profiles[0].id).toBe('captain');
  });
});
