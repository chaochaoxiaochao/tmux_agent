import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'yaml';
import { Config, DEFAULT_CONFIG, mergeConfig, validateConfig, Button } from './config.schema.js';

export function loadConfig(filePath: string): Config {
  let cfg: Config;
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, yaml.stringify(DEFAULT_CONFIG));
    cfg = DEFAULT_CONFIG;
  } else {
    const text = fs.readFileSync(filePath, 'utf8');
    let parsed: any;
    try { parsed = yaml.parse(text) ?? {}; }
    catch (e: any) { throw new Error(`config yaml parse error in ${filePath}: ${e.message}`); }
    cfg = mergeConfig(parsed);
  }
  validateConfig(cfg);
  return cfg;
}

export function saveButtons(filePath: string, buttons: Button[]): void {
  const text = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  const doc = yaml.parseDocument(text || yaml.stringify(DEFAULT_CONFIG));
  doc.set('buttons', buttons);
  fs.writeFileSync(filePath, doc.toString());
}

export function expandHome(p: string): string {
  if (p === '~' || p.startsWith('~/')) return path.join(process.env.HOME || '', p.slice(1));
  return p;
}
