import { loadConfig } from './config.js';
import { buildServer } from './server.js';
import * as path from 'node:path';
import * as os from 'node:os';
import { execFileSync } from 'node:child_process';

export function loadConfigForMain(filePath: string) {
  return loadConfig(filePath);
}

function defaultConfigPath(): string {
  const xdg = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  return path.join(xdg, 'tmux-agent', 'config.yaml');
}

function parseArgs(): { configPath: string } {
  const args = process.argv.slice(2);
  let configPath = defaultConfigPath();
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--config' && args[i + 1]) { configPath = args[i + 1]; i++; }
  }
  return { configPath };
}

export async function main() {
  const { configPath } = parseArgs();
  try { execFileSync('tmux', ['-V'], { stdio: 'ignore' }); }
  catch { console.error('tmux not found in PATH. Install tmux first.'); process.exit(1); }
  const cfg = loadConfigForMain(configPath);
  const app = await buildServer({ ...cfg, configPath } as any);
  await app.listen({ host: cfg.server.host, port: cfg.server.port });
  app.log.info(`tmux-agent listening on http://${cfg.server.host}:${cfg.server.port}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => { console.error(err); process.exit(1); });
}
