import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig } from 'homebridge';
export declare class FoscamControlsPlatform implements DynamicPlatformPlugin {
    readonly log: Logger;
    private readonly config;
    readonly api: API;
    readonly accessories: PlatformAccessory[];
    constructor(log: Logger, config: PlatformConfig, api: API);
    configureAccessory(accessory: PlatformAccessory): void;
    private discoverDevices;
    private enforcePollInterval;
}
