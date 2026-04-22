#!/usr/bin/env ts-node
/**
 * Probe script — verifies CGI commands work against a real camera before plugin development.
 *
 * Credentials are loaded from camera.local.json if present (never committed — see .gitignore).
 * CLI args override the file when provided.
 *
 * Usage: npm run probe
 *    or: npm run probe -- --host 192.168.1.101 --port 88 --username admin --password yourpassword
 */

import * as fs from 'fs';
import * as path from 'path';

interface CameraLocal {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
}

interface Args {
  host?: string;
  port?: string;
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

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    const val = argv[i + 1];
    if (key === "--host") { args.host = val; i++; }
    else if (key === "--port") { args.port = val; i++; }
    else if (key === "--username") { args.username = val; i++; }
    else if (key === "--password") { args.password = val; i++; }
  }
  return args;
}

function resolveConfig(argv: string[]): { host?: string; port: string; username?: string; password?: string } {
  const local = loadLocalConfig();
  const args = parseArgs(argv);
  return {
    host:     args.host     ?? local.host,
    port:     args.port     ?? String(local.port ?? 88),
    username: args.username ?? local.username,
    password: args.password ?? local.password,
  };
}

function parseResult(xml: string): number {
  // Foscam firmware uses either <r> or <result> for the result code
  const match = xml.match(/<r>(-?\d+)<\/r>/) ?? xml.match(/<result>(-?\d+)<\/result>/);
  return match ? parseInt(match[1], 10) : -1;
}

function parseStatus(xml: string): boolean | undefined {
  // Try <enable> (setWhiteLightBrightness API) then fall back to <status>
  const match = xml.match(/<enable>(-?\d+)<\/enable>/) ?? xml.match(/<status>(-?\d+)<\/status>/);
  return match ? match[1] === "1" : undefined;
}

async function cgiRequest(
  baseUrl: string,
  username: string,
  password: string,
  cmd: string,
  extra?: string,
): Promise<string> {
  const url = `${baseUrl}?cmd=${cmd}&usr=${encodeURIComponent(username)}&pwd=${encodeURIComponent(password)}${extra ? `&${extra}` : ""}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Connection: 'close' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
    return await response.text();
  } catch (err) {
    if ((err as Error).name === "AbortError") throw new Error("Request timed out after 5 seconds");
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function probeStep(
  num: number,
  label: string,
  baseUrl: string,
  username: string,
  password: string,
  cmd: string,
  extra?: string,
  expectedStatus?: boolean,
): Promise<void> {
  console.log(`[${num}] ${label}`);
  const xml = await cgiRequest(baseUrl, username, password, cmd, extra);
  const rawCompact = xml.replace(/\s+/g, "");
  const result = parseResult(xml);
  const status = parseStatus(xml);

  console.log(`    Raw:    ${rawCompact}`);

  if (status !== undefined) {
    console.log(`    Parsed: result=${result}, isOn=${status} ${result === 0 ? "✓" : "✗"}`);
  } else {
    console.log(`    Parsed: result=${result} ${result === 0 ? "✓" : "✗"}`);
  }

  if (result === -1 && !xml.includes("<r>") && !xml.includes("<result>")) {
    throw new Error(`Could not parse result code from response — unexpected XML shape:\n    ${xml.replace(/\s+/g, "")}`);
  }
  if (result !== 0) {
    throw new Error(`Command '${cmd}' failed with result code ${result} — check Architecture.md for error code meanings`);
  }

  if (expectedStatus !== undefined && status !== expectedStatus) {
    throw new Error(`State mismatch after '${cmd}': expected isOn=${expectedStatus}, got isOn=${status}`);
  }

  console.log();
}

async function main(): Promise<void> {
  const { host, port, username, password } = resolveConfig(process.argv.slice(2));

  if (!host || !username || !password) {
    console.error("Credentials missing. Either fill in camera.local.json or pass CLI args:");
    console.error("  npm run probe -- --host <ip> [--port <port>] --username <user> --password <pass>");
    process.exit(1);
  }

  const baseUrl = `http://${host}:${port}/cgi-bin/CGIProxy.fcgi`;
  console.log(`Probing camera at ${baseUrl}\n`);

  try {
    await probeStep(1, "GET getWhiteLightBrightness",
      baseUrl, username, password, "getWhiteLightBrightness");

    await probeStep(2, "SET spotlight ON",
      baseUrl, username, password, "setWhiteLightBrightness", "enable=1&brightness=100&lightinterval=60");

    await probeStep(3, "GET getWhiteLightBrightness (confirm ON)",
      baseUrl, username, password, "getWhiteLightBrightness", undefined, true);

    await probeStep(4, "SET spotlight OFF",
      baseUrl, username, password, "setWhiteLightBrightness", "enable=0&brightness=100&lightinterval=60");

    await probeStep(5, "GET getWhiteLightBrightness (confirm OFF)",
      baseUrl, username, password, "getWhiteLightBrightness", undefined, false);

    console.log("All checks passed. Commands confirmed working on this camera.");
    process.exit(0);
  } catch (err) {
    console.error(`\nProbe failed: ${(err as Error).message}`);
    console.error("\nCommon causes:");
    console.error("  result=20  → authentication failure — check username/password");
    console.error("  result≠0   → command not supported on this firmware");
    console.error("  Timeout    → camera unreachable — check host, port, and LAN connectivity");
    console.error("  State mismatch → camera received command but did not apply it");
    process.exit(1);
  }
}

main();
