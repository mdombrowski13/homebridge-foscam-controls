import { API, Logger, PlatformAccessory } from 'homebridge';
import { FoscamApiClient } from '../api-client';
import { CameraConfig } from '../types';
export type SpotlightApiVariant = 'brightness' | 'status';
export declare class LightingModule {
    private readonly accessory;
    private readonly config;
    private readonly apiClient;
    private readonly log;
    private readonly api;
    private readonly service;
    private readonly stateManager;
    private pollTimer?;
    private apiVariant;
    private variantDetected;
    constructor(accessory: PlatformAccessory, config: CameraConfig, apiClient: FoscamApiClient, log: Logger, api: API);
    startPolling(): void;
    stopPolling(): void;
    private handleGet;
    private handleSet;
    private syncState;
    private getSpotlightState;
    private detectAndFetchState;
    private fetchState;
    private setSpotlightState;
}
