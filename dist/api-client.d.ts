import { Logger } from 'homebridge';
import { CameraConfig, FoscamCommandResult } from './types';
export declare class FoscamCommandError extends Error {
    readonly cmd: string;
    readonly code: number;
    constructor(cmd: string, code: number);
}
export declare class FoscamApiClient {
    private readonly config;
    private readonly log;
    private readonly baseUrl;
    constructor(config: CameraConfig, log: Logger);
    sendCommand(cmd: string, params?: Record<string, string | number>): Promise<FoscamCommandResult>;
    private buildUrl;
    private parseResponse;
}
