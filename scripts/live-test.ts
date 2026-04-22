/**
 * Live integration test — exercises the real FoscamApiClient against a physical camera.
 * Unlike probe-camera.ts (which uses raw fetch), this runs the actual production code path.
 *
 * Credentials are loaded from camera.local.json if present (never committed — see .gitignore).
 * CLI args override the file when provided.
 *
 * Usage: npm run live-test
 *    or: npm run live-test -- --host 10.0.1.248 --port 88 --username admin --password yourpassword
 */

import * as fs from 'fs';
import * as path from 'path';
import { FoscamApiClient, FoscamCommandError } from '../src/api-client';
import { CameraConfig } from '../src/types';
import { Logger } from 'homebridge';

interface CameraLocal {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
}

function loadLocalConfig(): CameraLocal {
  const filePath = path.resolve(__dirname, '../camera.local.json');
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as CameraLocal;
  } catch {
    return {};
  }
}

function resolveConfig(argv: string[]): { host?: string; port: string; username?: string; password?: string } {
  const local = loadLocalConfig();
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) { args[argv[i].slice(2)] = argv[i + 1]; i++; }
  }
  return {
    host:     args['host']     ?? local.host,
    port:     args['port']     ?? String(local.port ?? 88),
    username: args['username'] ?? local.username,
    password: args['password'] ?? local.password,
  };
}

// --- Minimal console logger satisfying the Homebridge Logger interface ---

const log: Logger = {
  info:    (msg: string) => console.log(`  [info]  ${msg}`),
  warn:    (msg: string) => console.warn(`  [warn]  ${msg}`),
  error:   (msg: string) => console.error(`  [error] ${msg}`),
  debug:   (msg: string) => console.log(`  [debug] ${msg}`),
  success: (msg: string) => console.log(`  [ok]    ${msg}`),
  log:     (msg: string) => console.log(msg),
} as unknown as Logger;


// --- Test runner ---

let passed = 0;
let failed = 0;

function ok(label: string): void {
  console.log(`  ✓  ${label}`);
  passed++;
}

function fail(label: string, reason: string): void {
  console.error(`  ✗  ${label}`);
  console.error(`     ${reason}`);
  failed++;
}

async function main(): Promise<void> {
  const { host, port, username, password } = resolveConfig(process.argv.slice(2));

  if (!host || !username || !password) {
    console.error('Credentials missing. Either fill in camera.local.json or pass CLI args:');
    console.error('  npm run live-test -- --host <ip> [--port <port>] --username <user> --password <pass>');
    process.exit(1);
  }

  const config: CameraConfig = {
    name: 'Live Test Camera',
    host,
    port: parseInt(port, 10),
    username,
    password,
    pollIntervalSeconds: 30,
    modules: { spotlight: true },
  };

  const client = new FoscamApiClient(config, log);
  console.log(`\nLive test against http://${host}:${port}\n`);

  // --- 1. GET initial state ---
  console.log('[1] GET getWhiteLightBrightness');
  try {
    const result = await client.sendCommand('getWhiteLightBrightness');
    console.log(`     result=${result.result}, enable=${result.enable}, brightness=${result.brightness}, lightInterval=${result.lightInterval}`);
    if (typeof result.enable === 'boolean') ok('result field parsed correctly');
    else fail('enable field parsed correctly', `expected boolean, got ${typeof result.enable}`);
    if (typeof result.brightness === 'number') ok('brightness field parsed correctly');
    else fail('brightness field parsed correctly', `expected number, got ${typeof result.brightness}`);
    if (typeof result.lightInterval === 'number') ok('lightInterval field parsed correctly');
    else fail('lightInterval field parsed correctly', `expected number, got ${typeof result.lightInterval}`);
  } catch (err) {
    fail('GET initial state', (err as Error).message);
  }

  // --- 2. SET ON ---
  console.log('\n[2] SET spotlight ON');
  let cachedBrightness = 100;
  let cachedLightInterval = 60;
  try {
    // Read current values first so we don't override them
    const current = await client.sendCommand('getWhiteLightBrightness');
    cachedBrightness = current.brightness ?? 100;
    cachedLightInterval = current.lightInterval ?? 60;

    const result = await client.sendCommand('setWhiteLightBrightness', {
      enable: 1,
      brightness: cachedBrightness,
      lightinterval: cachedLightInterval,
    });
    console.log(`     result=${result.result}`);
    ok('set command returned result=0');
  } catch (err) {
    fail('SET spotlight ON', (err as Error).message);
  }

  // --- 3. GET confirm ON ---
  console.log('\n[3] GET getWhiteLightBrightness (confirm ON)');
  try {
    const result = await client.sendCommand('getWhiteLightBrightness');
    console.log(`     enable=${result.enable}`);
    if (result.enable === true) ok('spotlight confirmed ON');
    else fail('spotlight confirmed ON', `expected enable=true, got ${result.enable}`);
  } catch (err) {
    fail('GET confirm ON', (err as Error).message);
  }

  // --- 4. SET OFF ---
  console.log('\n[4] SET spotlight OFF');
  try {
    const result = await client.sendCommand('setWhiteLightBrightness', {
      enable: 0,
      brightness: cachedBrightness,
      lightinterval: cachedLightInterval,
    });
    console.log(`     result=${result.result}`);
    ok('set command returned result=0');
  } catch (err) {
    fail('SET spotlight OFF', (err as Error).message);
  }

  // --- 5. GET confirm OFF ---
  console.log('\n[5] GET getWhiteLightBrightness (confirm OFF)');
  try {
    const result = await client.sendCommand('getWhiteLightBrightness');
    console.log(`     enable=${result.enable}`);
    if (result.enable === false) ok('spotlight confirmed OFF');
    else fail('spotlight confirmed OFF', `expected enable=false, got ${result.enable}`);
  } catch (err) {
    fail('GET confirm OFF', (err as Error).message);
  }

  // --- 6. Error handling: bad command ---
  console.log('\n[6] Error handling — send unsupported command');
  try {
    await client.sendCommand('getWhiteLightStatus'); // old command, should fail
    fail('bad command throws FoscamCommandError', 'expected error, got none');
  } catch (err) {
    if (err instanceof FoscamCommandError) {
      console.log(`     FoscamCommandError: cmd=${err.cmd}, code=${err.code}`);
      ok('unsupported command throws FoscamCommandError with error code');
    } else {
      // Non-zero result from an unknown command is also acceptable
      console.log(`     Threw: ${(err as Error).message}`);
      ok('unsupported command throws an error');
    }
  }

  // --- Summary ---
  console.log(`\n${'─'.repeat(40)}`);
  console.log(`  ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log('  All checks passed. Plugin code works correctly against this camera.\n');
    process.exit(0);
  } else {
    console.log('  Some checks failed. Review output above before proceeding to integration testing.\n');
    process.exit(1);
  }
}

main();
