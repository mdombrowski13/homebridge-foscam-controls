"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FoscamApiClient = exports.FoscamCommandError = void 0;
class FoscamCommandError extends Error {
    constructor(cmd, code) {
        super(`Command '${cmd}' failed with error code ${code}`);
        this.cmd = cmd;
        this.code = code;
        this.name = 'FoscamCommandError';
    }
}
exports.FoscamCommandError = FoscamCommandError;
class FoscamApiClient {
    constructor(config, log) {
        this.config = config;
        this.log = log;
        const protocol = config.port === 443 ? 'https' : 'http';
        this.baseUrl = `${protocol}://${config.host}:${config.port}/cgi-bin/CGIProxy.fcgi`;
    }
    async sendCommand(cmd, params) {
        const url = this.buildUrl(cmd, params);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        let xml;
        try {
            const response = await fetch(url, {
                signal: controller.signal,
                headers: { Connection: 'close' },
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            xml = await response.text();
        }
        catch (err) {
            if (err.name === 'AbortError') {
                throw new Error(`${cmd}: request timed out`);
            }
            throw err;
        }
        finally {
            clearTimeout(timeoutId);
        }
        return this.parseResponse(xml, cmd);
    }
    buildUrl(cmd, params) {
        let url = `${this.baseUrl}?cmd=${cmd}&usr=${encodeURIComponent(this.config.username)}&pwd=${encodeURIComponent(this.config.password)}`;
        if (params) {
            for (const [key, value] of Object.entries(params)) {
                url += `&${key}=${encodeURIComponent(String(value))}`;
            }
        }
        return url;
    }
    parseResponse(xml, cmd) {
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
exports.FoscamApiClient = FoscamApiClient;
