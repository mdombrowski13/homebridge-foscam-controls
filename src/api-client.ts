import { Logger } from 'homebridge';
import { CameraConfig, FoscamCommandResult } from './types';

export class FoscamCommandError extends Error {
  constructor(
    public readonly cmd: string,
    public readonly code: number,
  ) {
    super(`Command '${cmd}' failed with error code ${code}`);
    this.name = 'FoscamCommandError';
  }
}

export class FoscamApiClient {
  private readonly baseUrl: string;

  constructor(
    private readonly config: CameraConfig,
    private readonly log: Logger,
  ) {
    const protocol = config.port === 443 ? 'https' : 'http';
    this.baseUrl = `${protocol}://${config.host}:${config.port}/cgi-bin/CGIProxy.fcgi`;
  }

  async sendCommand(cmd: string, params?: Record<string, string | number>): Promise<FoscamCommandResult> {
    const url = this.buildUrl(cmd, params);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    let xml: string;
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Connection: 'close' },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      xml = await response.text();
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        throw new Error(`${cmd}: request timed out`);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }

    return this.parseResponse(xml, cmd);
  }

  private buildUrl(cmd: string, params?: Record<string, string | number>): string {
    let url = `${this.baseUrl}?cmd=${cmd}&usr=${encodeURIComponent(this.config.username)}&pwd=${encodeURIComponent(this.config.password)}`;
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url += `&${key}=${encodeURIComponent(String(value))}`;
      }
    }
    return url;
  }

  private parseResponse(xml: string, cmd: string): FoscamCommandResult {
    // Support both <result> (modern firmware) and <r> (legacy firmware)
    const resultMatch = xml.match(/<result>(-?\d+)<\/result>/) ?? xml.match(/<r>(-?\d+)<\/r>/);
    if (!resultMatch) {
      this.log.warn(`[${this.config.name}] Unexpected XML for ${cmd}: ${xml.trim()}`);
      throw new Error(`${cmd}: could not parse result field from response`);
    }

    const result = parseInt(resultMatch[1], 10);
    if (result !== 0) {
      throw new FoscamCommandError(cmd, result);
    }

    const enableMatch = xml.match(/<enable>(\d+)<\/enable>/);
    const statusMatch = xml.match(/<status>(\d+)<\/status>/);
    const brightnessMatch = xml.match(/<brightness>(\d+)<\/brightness>/);
    const lightIntervalMatch = xml.match(/<lightinterval>(\d+)<\/lightinterval>/);

    return {
      result,
      enable: enableMatch ? enableMatch[1] === '1' : undefined,
      status: statusMatch ? statusMatch[1] === '1' : undefined,
      brightness: brightnessMatch ? parseInt(brightnessMatch[1], 10) : undefined,
      lightInterval: lightIntervalMatch ? parseInt(lightIntervalMatch[1], 10) : undefined,
    };
  }
}
